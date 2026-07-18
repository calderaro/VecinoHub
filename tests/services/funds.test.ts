import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  fundChargePeriods,
  fundGroupCharges,
  fundMovements,
  fundPaymentAllocations,
  fundPaymentSubmissions,
  groupMemberships,
  groups,
  neighborhoodFunds,
  neighborhoodMemberships,
  users,
} from "@/db/schema";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { db } from "@/db";
import {
  closeTestDatabase,
  ensureTestDatabase,
  resetTestDatabase,
} from "../helpers/test-database";
import {
  confirmFundPayment,
  createNeighborhoodFund,
  getGroupFundSummary,
  getResidentFundDashboard,
  rejectFundPayment,
  reverseFundMovement,
  submitFundPayment,
} from "@/services/funds";
import { positiveAmountSchema } from "@/services/validators";

function createCtx(
  userId: string,
  options?: Partial<ServiceContext["user"]>
): ServiceContext {
  return {
    user: {
      id: userId,
      role: "user",
      activeNeighborhoodId: null,
      ...options,
    },
  };
}

async function seedFundFixtures() {
  const neighborhoodId = randomUUID();
  const adminId = randomUUID();
  const residentId = randomUUID();
  const outsiderId = randomUUID();
  const groupId = randomUUID();
  const fundId = randomUUID();
  const periodId = randomUUID();
  const groupChargeId = randomUUID();

  await db.insert(users).values([
    {
      id: adminId,
      email: "fund-admin@example.com",
      name: "Fund Admin",
      role: "admin",
      status: "active",
    },
    {
      id: residentId,
      email: "resident@example.com",
      name: "Resident",
      role: "user",
      status: "active",
    },
    {
      id: outsiderId,
      email: "outsider@example.com",
      name: "Outsider",
      role: "user",
      status: "active",
    },
  ]);

  await db.insert(neighborhoodMemberships).values([
    {
      id: randomUUID(),
      neighborhoodId,
      userId: adminId,
      role: "neighborhood_admin",
      status: "active",
    },
    {
      id: randomUUID(),
      neighborhoodId,
      userId: residentId,
      role: "neighbor",
      status: "active",
    },
  ]);

  await db.insert(groups).values({
    id: groupId,
    neighborhoodId,
    name: "Casa 101",
  });

  await db.insert(groupMemberships).values({
    id: randomUUID(),
    groupId,
    userId: residentId,
    role: "group_member",
    status: "active",
  });

  await db.insert(neighborhoodFunds).values({
    id: fundId,
    neighborhoodId,
    name: "Maintenance Fund",
    currencyCode: "MXN",
    status: "active",
    createdBy: adminId,
  });

  await db.insert(fundChargePeriods).values({
    id: periodId,
    fundId,
    neighborhoodId,
    title: "March 2026",
    amountPerGroup: "100.00",
    dueDate: "2026-03-31",
    status: "open",
    createdBy: adminId,
  });

  await db.insert(fundGroupCharges).values({
    id: groupChargeId,
    periodId,
    groupId,
    amountDue: "100.00",
    amountPaid: "0.00",
    status: "unpaid",
  });

  return {
    neighborhoodId,
    adminId,
    residentId,
    outsiderId,
    groupId,
    fundId,
    periodId,
    groupChargeId,
  };
}

describe("funds service", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("rejects duplicate fund names within the same neighborhood", async () => {
    const neighborhoodId = randomUUID();
    const adminId = randomUUID();

    await db.insert(users).values({
      id: adminId,
      email: "admin@example.com",
      name: "Admin",
      role: "admin",
      status: "active",
    });
    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: adminId,
      role: "neighborhood_admin",
      status: "active",
    });

    const adminCtx = createCtx(adminId, { role: "admin", activeNeighborhoodId: neighborhoodId });

    await createNeighborhoodFund(adminCtx, {
      neighborhoodId,
      name: "Reserve Fund",
      currencyCode: "MXN",
    });

    await expect(
      createNeighborhoodFund(adminCtx, {
        neighborhoodId,
        name: "reserve fund",
        currencyCode: "MXN",
      })
    ).rejects.toMatchObject({
      message: "A fund with that name already exists",
    });
  });

  it("rejects resident dashboard access to a fund outside the caller neighborhood scope", async () => {
    const sourceNeighborhoodId = randomUUID();
    const targetNeighborhoodId = randomUUID();
    const residentId = randomUUID();
    const targetAdminId = randomUUID();
    const groupId = randomUUID();
    const fundId = randomUUID();

    await db.insert(users).values([
      {
        id: residentId,
        email: "resident@example.com",
        name: "Resident",
        role: "user",
        status: "active",
      },
      {
        id: targetAdminId,
        email: "target-admin@example.com",
        name: "Target Admin",
        role: "admin",
        status: "active",
      },
    ]);

    await db.insert(neighborhoodMemberships).values([
      {
        id: randomUUID(),
        neighborhoodId: sourceNeighborhoodId,
        userId: residentId,
        role: "neighbor",
        status: "active",
      },
      {
        id: randomUUID(),
        neighborhoodId: targetNeighborhoodId,
        userId: targetAdminId,
        role: "neighborhood_admin",
        status: "active",
      },
    ]);

    await db.insert(groups).values({
      id: groupId,
      neighborhoodId: sourceNeighborhoodId,
      name: "Casa 9",
    });
    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId,
      userId: residentId,
      role: "group_member",
      status: "active",
    });

    await db.insert(neighborhoodFunds).values({
      id: fundId,
      neighborhoodId: targetNeighborhoodId,
      name: "Security Fund",
      currencyCode: "MXN",
      status: "active",
      createdBy: targetAdminId,
    });

    await expect(
      getResidentFundDashboard(createCtx(residentId), { groupId, fundId })
    ).rejects.toMatchObject({
      message: "Neighborhood membership required",
    });
  });

  it("confirms a submitted payment, creates allocation and ledger movement, and updates the charge", async () => {
    const fixtures = await seedFundFixtures();
    const residentCtx = createCtx(fixtures.residentId);
    const adminCtx = createCtx(fixtures.adminId, {
      role: "admin",
      activeNeighborhoodId: fixtures.neighborhoodId,
    });

    const submission = await submitFundPayment(residentCtx, {
      fundId: fixtures.fundId,
      groupId: fixtures.groupId,
      groupChargeId: fixtures.groupChargeId,
      method: "wire_transfer",
      amount: "100.00",
      paidAt: new Date("2026-03-15T00:00:00.000Z"),
      reference: "WIRE-100",
      notes: "Bank transfer",
    });

    const confirmed = await confirmFundPayment(adminCtx, {
      paymentId: submission.id,
    });

    const [storedCharge] = await db.select().from(fundGroupCharges);
    const allocations = await db.select().from(fundPaymentAllocations);
    const movements = await db.select().from(fundMovements);
    const [storedPayment] = await db.select().from(fundPaymentSubmissions);

    expect(confirmed?.status).toBe("confirmed");
    expect(storedPayment?.status).toBe("confirmed");
    expect(storedPayment?.confirmedBy).toBe(fixtures.adminId);
    expect(Number(storedCharge?.amountPaid ?? 0)).toBe(100);
    expect(storedCharge?.status).toBe("paid");
    expect(allocations).toHaveLength(1);
    expect(allocations[0]?.paymentId).toBe(submission.id);
    expect(allocations[0]?.groupChargeId).toBe(fixtures.groupChargeId);
    expect(movements).toHaveLength(1);
    expect(movements[0]?.fundId).toBe(fixtures.fundId);
    expect(movements[0]?.type).toBe("payment");
    expect(movements[0]?.entrySide).toBe("credit");
    expect(movements[0]?.sourceId).toBe(submission.id);
  });

  it("rejects a submitted payment without changing balance or allocations", async () => {
    const fixtures = await seedFundFixtures();
    const residentCtx = createCtx(fixtures.residentId);
    const adminCtx = createCtx(fixtures.adminId, {
      role: "admin",
      activeNeighborhoodId: fixtures.neighborhoodId,
    });

    const submission = await submitFundPayment(residentCtx, {
      fundId: fixtures.fundId,
      groupId: fixtures.groupId,
      groupChargeId: fixtures.groupChargeId,
      method: "cash",
      amount: "40.00",
      paidAt: new Date("2026-03-16T00:00:00.000Z"),
    });

    const rejected = await rejectFundPayment(adminCtx, {
      paymentId: submission.id,
      rejectionReason: "Missing receipt",
    });

    const [storedCharge] = await db.select().from(fundGroupCharges);
    const allocations = await db.select().from(fundPaymentAllocations);
    const movements = await db.select().from(fundMovements);

    expect(rejected?.status).toBe("rejected");
    expect(rejected?.rejectionReason).toBe("Missing receipt");
    expect(Number(storedCharge?.amountPaid ?? 0)).toBe(0);
    expect(storedCharge?.status).toBe("unpaid");
    expect(allocations).toHaveLength(0);
    expect(movements).toHaveLength(0);
  });

  it("accumulates amountPaid across multiple confirmed payments on the same charge", async () => {
    const fixtures = await seedFundFixtures();
    const residentCtx = createCtx(fixtures.residentId);
    const adminCtx = createCtx(fixtures.adminId, {
      role: "admin",
      activeNeighborhoodId: fixtures.neighborhoodId,
    });

    const first = await submitFundPayment(residentCtx, {
      fundId: fixtures.fundId,
      groupId: fixtures.groupId,
      groupChargeId: fixtures.groupChargeId,
      method: "cash",
      amount: "40.00",
      paidAt: new Date("2026-03-10T00:00:00.000Z"),
    });
    await confirmFundPayment(adminCtx, { paymentId: first.id });

    let [charge] = await db.select().from(fundGroupCharges);
    expect(Number(charge?.amountPaid ?? 0)).toBe(40);

    const second = await submitFundPayment(residentCtx, {
      fundId: fixtures.fundId,
      groupId: fixtures.groupId,
      groupChargeId: fixtures.groupChargeId,
      method: "cash",
      amount: "60.00",
      paidAt: new Date("2026-03-12T00:00:00.000Z"),
    });
    await confirmFundPayment(adminCtx, { paymentId: second.id });

    [charge] = await db.select().from(fundGroupCharges);
    expect(Number(charge?.amountPaid ?? 0)).toBe(100);
    expect(charge?.status).toBe("paid");
  });

  it("rejects confirming a payment on a charge that was waived after submission", async () => {
    const fixtures = await seedFundFixtures();
    const residentCtx = createCtx(fixtures.residentId);
    const adminCtx = createCtx(fixtures.adminId, {
      role: "admin",
      activeNeighborhoodId: fixtures.neighborhoodId,
    });

    const submission = await submitFundPayment(residentCtx, {
      fundId: fixtures.fundId,
      groupId: fixtures.groupId,
      groupChargeId: fixtures.groupChargeId,
      method: "cash",
      amount: "100.00",
      paidAt: new Date("2026-03-15T00:00:00.000Z"),
    });

    await db
      .update(fundGroupCharges)
      .set({ status: "waived", waivedBy: fixtures.adminId })
      .where(eq(fundGroupCharges.id, fixtures.groupChargeId));

    await expect(
      confirmFundPayment(adminCtx, { paymentId: submission.id })
    ).rejects.toMatchObject({ message: "This charge has been waived" });

    // No credit movement should have been created.
    const movements = await db.select().from(fundMovements);
    expect(movements).toHaveLength(0);
  });

  it("reverses a movement once and rejects reversing it again or reversing a reversal", async () => {
    const fixtures = await seedFundFixtures();
    const residentCtx = createCtx(fixtures.residentId);
    const adminCtx = createCtx(fixtures.adminId, {
      role: "admin",
      activeNeighborhoodId: fixtures.neighborhoodId,
    });

    const submission = await submitFundPayment(residentCtx, {
      fundId: fixtures.fundId,
      groupId: fixtures.groupId,
      groupChargeId: fixtures.groupChargeId,
      method: "cash",
      amount: "100.00",
      paidAt: new Date("2026-03-15T00:00:00.000Z"),
    });
    await confirmFundPayment(adminCtx, { paymentId: submission.id });

    const [movement] = await db.select().from(fundMovements);

    const reversal = await reverseFundMovement(adminCtx, { movementId: movement.id });
    expect(reversal?.type).toBe("reversal");
    expect(reversal?.entrySide).toBe("debit");

    await expect(
      reverseFundMovement(adminCtx, { movementId: movement.id })
    ).rejects.toMatchObject({ message: "This movement has already been reversed" });

    await expect(
      reverseFundMovement(adminCtx, { movementId: reversal!.id })
    ).rejects.toMatchObject({ message: "A reversal cannot be reversed" });

    const movements = await db.select().from(fundMovements);
    expect(movements).toHaveLength(2);
  });

  it("does not net an overpaid charge against an unpaid one in the group summary", async () => {
    const fixtures = await seedFundFixtures();
    const residentCtx = createCtx(fixtures.residentId);

    // Overpay the seeded charge (due 100 / paid 150) and add a second, unpaid one.
    await db
      .update(fundGroupCharges)
      .set({ amountPaid: "150.00", status: "paid" })
      .where(eq(fundGroupCharges.id, fixtures.groupChargeId));

    const secondPeriodId = randomUUID();
    await db.insert(fundChargePeriods).values({
      id: secondPeriodId,
      fundId: fixtures.fundId,
      neighborhoodId: fixtures.neighborhoodId,
      title: "April 2026",
      amountPerGroup: "100.00",
      dueDate: "2026-04-30",
      status: "open",
      createdBy: fixtures.adminId,
    });
    await db.insert(fundGroupCharges).values({
      id: randomUUID(),
      periodId: secondPeriodId,
      groupId: fixtures.groupId,
      amountDue: "100.00",
      amountPaid: "0.00",
      status: "unpaid",
    });

    const summary = await getGroupFundSummary(residentCtx, {
      groupId: fixtures.groupId,
      fundId: fixtures.fundId,
    });

    // The 50 overpayment must not hide that the second charge is fully unpaid.
    expect(summary.outstandingAmount).toBe(100);
  });

  it("rejects non-finite fund amount strings at the validator boundary", async () => {
    expect(positiveAmountSchema.safeParse("10.00").success).toBe(true);
    expect(positiveAmountSchema.safeParse("Infinity").success).toBe(false);
    expect(positiveAmountSchema.safeParse("1e400").success).toBe(false);
    expect(positiveAmountSchema.safeParse("0").success).toBe(false);
  });
});
