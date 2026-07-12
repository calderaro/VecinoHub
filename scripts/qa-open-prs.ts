import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { Pool } from "pg";

import { db } from "@/db";
import {
  fundChargePeriods,
  fundGroupCharges,
  fundMovements,
  fundPaymentSubmissions,
  fundraisingCampaigns,
  fundraisingContributions,
  groupAccessRequests,
  groupMemberships,
  groups,
  neighborhoodFunds,
  neighborhoods,
  resourceAvailabilityWindows,
  resourceReservations,
  resourceRules,
  resources,
  users,
} from "@/db/schema";
import { approveGroupAccessRequest } from "@/services/group-access-requests";
import { confirmFundPayment, waiveFundGroupCharge } from "@/services/funds";
import { confirmContribution, deleteContribution } from "@/services/fundraising";
import { createResourceReservation } from "@/services/resources";
import type { ServiceContext } from "@/services/types";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !connectionString.includes("qa")) {
  throw new Error("DATABASE_URL must point to a disposable QA database");
}

function context(userId: string, role: ServiceContext["user"]["role"] = "user"): ServiceContext {
  return { user: { id: userId, role, activeNeighborhoodId: null } };
}

function fulfilledCount(results: PromiseSettledResult<unknown>[]) {
  return results.filter((result) => result.status === "fulfilled").length;
}

async function requiredSeedData() {
  const [admin] = await db.select().from(users).where(eq(users.email, "admin@vecinohub.local"));
  const [ana] = await db.select().from(users).where(eq(users.email, "ana@vecinohub.local"));
  const [centro] = await db
    .select()
    .from(neighborhoods)
    .where(eq(neighborhoods.slug, "colonia-centro"));
  const [casa101] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.neighborhoodId, centro.id), eq(groups.name, "Casa 101")));
  const [fund] = await db
    .select()
    .from(neighborhoodFunds)
    .where(eq(neighborhoodFunds.neighborhoodId, centro.id));

  assert(admin && ana && centro && casa101 && fund, "Seed data is incomplete");
  return { admin, ana, centro, casa101, fund };
}

async function verifyConfirmWaiveRace() {
  const { admin, ana, centro, casa101, fund } = await requiredSeedData();
  const periodId = randomUUID();
  const chargeId = randomUUID();
  const paymentId = randomUUID();

  await db.insert(fundChargePeriods).values({
    id: periodId,
    fundId: fund.id,
    neighborhoodId: centro.id,
    title: `QA payment race ${periodId}`,
    amountPerGroup: "100.00",
    dueDate: "2030-01-01",
    status: "open",
    createdBy: admin.id,
  });
  await db.insert(fundGroupCharges).values({
    id: chargeId,
    periodId,
    groupId: casa101.id,
    amountDue: "100.00",
    amountPaid: "0.00",
    status: "unpaid",
  });
  await db.insert(fundPaymentSubmissions).values({
    id: paymentId,
    fundId: fund.id,
    neighborhoodId: centro.id,
    groupChargeId: chargeId,
    groupId: casa101.id,
    submittedBy: ana.id,
    method: "cash",
    amount: "100.00",
    paidAt: "2026-07-12",
    status: "submitted",
  });

  const results = await Promise.allSettled([
    confirmFundPayment(context(admin.id, "platform_admin"), { paymentId }),
    waiveFundGroupCharge(context(admin.id, "platform_admin"), { groupChargeId: chargeId }),
  ]);
  assert.equal(fulfilledCount(results), 1, "Exactly one of confirm or waive must succeed");

  const [charge] = await db.select().from(fundGroupCharges).where(eq(fundGroupCharges.id, chargeId));
  const movements = await db
    .select()
    .from(fundMovements)
    .where(and(eq(fundMovements.sourceId, paymentId), eq(fundMovements.type, "payment")));
  const validWaiver = charge.status === "waived" && Number(charge.amountPaid) === 0 && movements.length === 0;
  const validPayment = charge.status === "paid" && !charge.waivedBy && movements.length === 1;
  assert(validWaiver || validPayment, "Charge cannot be both credited and waived");
}

async function verifyConfirmDeleteRace() {
  const { admin, ana, centro, casa101 } = await requiredSeedData();
  const campaignId = randomUUID();
  const contributionId = randomUUID();

  await db.insert(fundraisingCampaigns).values({
    id: campaignId,
    neighborhoodId: centro.id,
    title: `QA contribution race ${campaignId}`,
    amount: "100.00",
    goalAmount: "100.00",
    status: "open",
    createdBy: admin.id,
  });
  await db.insert(fundraisingContributions).values({
    id: contributionId,
    campaignId,
    groupId: casa101.id,
    submittedBy: ana.id,
    method: "cash",
    amount: "100.00",
    status: "submitted",
  });

  const results = await Promise.allSettled([
    confirmContribution(context(admin.id, "platform_admin"), { contributionId }),
    deleteContribution(context(ana.id), { contributionId }),
  ]);
  assert.equal(fulfilledCount(results), 1, "Exactly one of confirm or owner-delete must succeed");
  const [contribution] = await db
    .select()
    .from(fundraisingContributions)
    .where(eq(fundraisingContributions.id, contributionId));
  assert(!contribution || contribution.status === "confirmed", "A confirmed contribution cannot disappear");
}

async function verifyReservationRace() {
  const { admin, ana, centro, casa101 } = await requiredSeedData();
  const residentId = randomUUID();
  const groupId = randomUUID();
  const resourceId = randomUUID();
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dayOfWeek = new Date(`${date}T12:00:00.000Z`).getUTCDay();

  await db.insert(users).values({ id: residentId, email: `qa-${residentId}@example.com`, name: "QA Resident" });
  await db.insert(groups).values({ id: groupId, neighborhoodId: centro.id, name: `QA Group ${groupId}` });
  await db.insert(groupMemberships).values({ groupId, userId: residentId, role: "group_member", status: "active" });
  await db.insert(resources).values({ id: resourceId, neighborhoodId: centro.id, name: `QA Resource ${resourceId}`, createdBy: admin.id });
  await db.insert(resourceAvailabilityWindows).values({ resourceId, dayOfWeek, startMinute: 600, endMinute: 1200 });
  await db.insert(resourceRules).values({
    resourceId,
    minAdvanceHours: 0,
    maxAdvanceDays: 30,
    minDurationMinutes: 60,
    maxDurationMinutes: 180,
    maxConcurrentReservations: 1,
    requireNoDebt: false,
  });

  const results = await Promise.allSettled([
    createResourceReservation(context(ana.id), { resourceId, groupId: casa101.id, date, startMinute: 720, endMinute: 780, title: "QA A" }),
    createResourceReservation(context(residentId), { resourceId, groupId, date, startMinute: 720, endMinute: 780, title: "QA B" }),
  ]);
  assert.equal(fulfilledCount(results), 1, "Exactly one competing reservation must succeed");
  const reservations = await db
    .select()
    .from(resourceReservations)
    .where(eq(resourceReservations.resourceId, resourceId));
  assert.equal(reservations.length, 1, "The resource concurrency limit must hold");
}

async function verifyDeactivationSerialization() {
  const { ana, centro } = await requiredSeedData();
  const requesterId = randomUUID();
  const groupId = randomUUID();
  const requestId = randomUUID();
  await db.insert(users).values({ id: requesterId, email: `qa-${requesterId}@example.com`, name: "QA Requester" });
  await db.insert(groups).values({ id: groupId, neighborhoodId: centro.id, name: `QA Request Group ${groupId}` });
  await db.insert(groupAccessRequests).values({
    id: requestId,
    groupId,
    neighborhoodId: centro.id,
    requestedBy: requesterId,
    status: "pending",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  });

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  await client.query("BEGIN");
  await client.query("UPDATE users SET status = 'inactive' WHERE id = $1", [requesterId]);
  const approval = approveGroupAccessRequest(context(ana.id), { requestId });
  await new Promise((resolve) => setTimeout(resolve, 100));
  await client.query("COMMIT");
  client.release();
  await pool.end();
  await assert.rejects(approval);
  const memberships = await db
    .select()
    .from(groupMemberships)
    .where(and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, requesterId)));
  assert.equal(memberships.length, 0, "Deactivated requester must not gain membership");
}

async function main() {
  const checks = [
    ["confirm vs waive", verifyConfirmWaiveRace],
    ["confirm vs owner-delete", verifyConfirmDeleteRace],
    ["reservation concurrency", verifyReservationRace],
    ["deactivation serialization", verifyDeactivationSerialization],
  ] as const;

  for (const [name, check] of checks) {
    await check();
    console.log(`PASS: ${name}`);
  }
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
