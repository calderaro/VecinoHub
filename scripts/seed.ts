import "dotenv/config";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  groupMemberships,
  groups,
  neighborhoodMemberships,
  neighborhoods,
  events,
  fundChargePeriods,
  fundChargeTemplates,
  fundGroupCharges,
  fundMovements,
  fundPaymentAllocations,
  fundPaymentSubmissions,
  posts,
  resourceAvailabilityWindows,
  resourceBlocks,
  resourceReservations,
  resourceRules,
  resources,
  fundraisingContributions,
  fundraisingCampaigns,
  neighborhoodFunds,
  pollOptions,
  polls,
  users,
  votes,
} from "@/db/schema";
import { auth } from "@/server/better-auth";

type SeedUser = {
  email: string;
  password: string;
  name: string;
  username: string;
  role: "user" | "admin" | "platform_admin";
};

const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;
const seedUserPassword = process.env.SEED_USER_PASSWORD;

if (!seedAdminPassword || !seedUserPassword) {
  throw new Error("SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD must be set to run the seed script.");
}

const seedUsers: SeedUser[] = [
  {
    email: "admin@vecinohub.local",
    password: seedAdminPassword,
    name: "Vecino Platform Admin",
    username: "vecino_admin",
    role: "platform_admin",
  },
  {
    email: "ana@vecinohub.local",
    password: seedUserPassword,
    name: "Ana Perez",
    username: "ana_perez",
    role: "user",
  },
  {
    email: "luis@vecinohub.local",
    password: seedUserPassword,
    name: "Luis Romero",
    username: "luis_romero",
    role: "user",
  },
];

async function ensureUser(user: SeedUser) {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (existing.length > 0) {
    if (!existing[0].username || !existing[0].emailVerified) {
      await db
        .update(users)
        .set({
          username: existing[0].username ?? user.username,
          emailVerified: true,
        })
        .where(eq(users.id, existing[0].id));
    }
    return existing[0];
  }

  await auth.api.signUpEmail({
    body: {
      email: user.email,
      password: user.password,
      name: user.name,
    },
  });

  const created = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (!created[0]) {
    throw new Error(`Failed to create user ${user.email}`);
  }

  await db
    .update(users)
    .set({
      username: created[0].username ?? user.username,
      emailVerified: true,
    })
    .where(eq(users.id, created[0].id));

  return created[0];
}

async function ensureNeighborhood(name: string, slug: string, createdBy: string) {
  const existing = await db
    .select()
    .from(neighborhoods)
    .where(eq(neighborhoods.slug, slug))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const created = await db
    .insert(neighborhoods)
    .values({
      name,
      slug,
      timeZone: "America/Mexico_City",
      createdBy,
      status: "active",
    })
    .returning();

  if (!created[0]) {
    throw new Error(`Failed to create neighborhood with slug ${slug}`);
  }

  return created[0];
}

async function main() {
  const createdUsers = [];

  for (const user of seedUsers) {
    const dbUser = await ensureUser(user);
    if (dbUser.role !== user.role) {
      await db
        .update(users)
        .set({ role: user.role })
        .where(eq(users.id, dbUser.id));
    }
    createdUsers.push({ ...dbUser, role: user.role });
  }

  const [admin, ana, luis] = createdUsers;

  const [centroNeighborhood, surNeighborhood] = await Promise.all([
    ensureNeighborhood("Colonia Centro", "colonia-centro", admin.id),
    ensureNeighborhood("Jardines del Sur", "jardines-del-sur", admin.id),
  ]);

  await db
    .insert(neighborhoodMemberships)
    .values([
      {
        neighborhoodId: centroNeighborhood.id,
        userId: admin.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: surNeighborhood.id,
        userId: admin.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: centroNeighborhood.id,
        userId: ana.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: surNeighborhood.id,
        userId: luis.id,
        role: "neighborhood_admin",
      },
      {
        neighborhoodId: centroNeighborhood.id,
        userId: luis.id,
        role: "neighbor",
      },
      {
        neighborhoodId: surNeighborhood.id,
        userId: ana.id,
        role: "neighbor",
      },
    ])
    .onConflictDoNothing();

  const existingGroups = await db.select().from(groups).limit(1);
  if (existingGroups.length > 0) {
    console.log("Groups already exist, skipping group/poll/fundraising seed.");
    return;
  }

  const createdGroups = await db
    .insert(groups)
    .values([
      {
        name: "Casa 101",
        address: "Calle Principal 101",
        neighborhoodId: centroNeighborhood.id,
      },
      {
        name: "Casa 202",
        address: "Calle Principal 202",
        neighborhoodId: surNeighborhood.id,
      },
    ])
    .returning();

  const [casa101, casa202] = createdGroups;

  await db.insert(groupMemberships).values([
    { groupId: casa101.id, userId: admin.id, role: "group_member" },
    { groupId: casa101.id, userId: ana.id, role: "group_admin" },
    { groupId: casa202.id, userId: admin.id, role: "group_member" },
    { groupId: casa202.id, userId: luis.id, role: "group_admin" },
    { groupId: casa202.id, userId: ana.id, role: "group_member" },
  ]);

  const [poll] = await db
    .insert(polls)
    .values({
      title: "Mejora del parque",
      description: "Aprobar presupuesto para mejorar el parque",
      status: "active",
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    })
    .returning();

  const createdOptions = await db
    .insert(pollOptions)
    .values([
      { pollId: poll.id, label: "Si", sortOrder: 1 },
      { pollId: poll.id, label: "No", sortOrder: 2 },
    ])
    .returning();

  await db.insert(votes).values([
    {
      pollId: poll.id,
      groupId: casa101.id,
      optionId: createdOptions[0].id,
      createdBy: admin.id,
    },
  ]);

  const [campaign] = await db
    .insert(fundraisingCampaigns)
    .values({
      title: "Pago de seguridad",
      description: "Pago mensual de guardia",
      amount: "150.00",
      goalAmount: "300.00",
      status: "open",
      dueDate: new Date().toISOString().split("T")[0],
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    })
    .returning();

  await db.insert(fundraisingContributions).values([
    {
      campaignId: campaign.id,
      groupId: casa101.id,
      submittedBy: ana.id,
      method: "wire_transfer",
      amount: "150.00",
      wireReference: "TRX-0001",
      wireDate: new Date().toISOString().split("T")[0],
      wireAmount: "150.00",
      status: "submitted",
    },
    {
      campaignId: campaign.id,
      groupId: casa202.id,
      submittedBy: luis.id,
      method: "cash",
      amount: "150.00",
      status: "submitted",
    },
  ]);

  const today = new Date();
  const formatDate = (value: Date) => value.toISOString().split("T")[0] ?? "";
  const addDays = (value: Date, days: number) =>
    new Date(value.getTime() + 1000 * 60 * 60 * 24 * days);

  const [maintenanceFund, reserveFund] = await db
    .insert(neighborhoodFunds)
    .values([
      {
        name: "Maintenance Fund",
        description: "General maintenance, repairs, and common-area supplies.",
        currencyCode: "MXN",
        neighborhoodId: centroNeighborhood.id,
        createdBy: admin.id,
      },
      {
        name: "Security Fund",
        description: "Security service and neighborhood watch expenses.",
        currencyCode: "MXN",
        neighborhoodId: surNeighborhood.id,
        createdBy: luis.id,
      },
    ])
    .returning();

  const [maintenanceTemplate] = await db
    .insert(fundChargeTemplates)
    .values({
      fundId: maintenanceFund.id,
      neighborhoodId: centroNeighborhood.id,
      title: "Monthly maintenance fee",
      description: "Recurring common-area maintenance contribution.",
      status: "active",
      frequency: "monthly",
      defaultAmount: "250.00",
      dueDayOfMonth: 15,
      startsOn: formatDate(addDays(today, -30)),
      createdBy: admin.id,
    })
    .returning();

  const [maintenancePeriod, securityPeriod] = await db
    .insert(fundChargePeriods)
    .values([
      {
        fundId: maintenanceFund.id,
        templateId: maintenanceTemplate.id,
        neighborhoodId: centroNeighborhood.id,
        title: "Maintenance - current month",
        description: "Current month maintenance contribution.",
        amountPerGroup: "250.00",
        dueDate: formatDate(addDays(today, 7)),
        status: "open",
        createdBy: admin.id,
      },
      {
        fundId: reserveFund.id,
        neighborhoodId: surNeighborhood.id,
        title: "Security - current month",
        description: "Current month neighborhood security fee.",
        amountPerGroup: "180.00",
        dueDate: formatDate(addDays(today, 10)),
        status: "open",
        createdBy: luis.id,
      },
    ])
    .returning();

  const [maintenanceCharge, securityCharge] = await db
    .insert(fundGroupCharges)
    .values([
      {
        periodId: maintenancePeriod.id,
        groupId: casa101.id,
        amountDue: "250.00",
        amountPaid: "250.00",
        status: "paid",
      },
      {
        periodId: securityPeriod.id,
        groupId: casa202.id,
        amountDue: "180.00",
        amountPaid: "0.00",
        status: "unpaid",
      },
    ])
    .returning();

  const [confirmedPayment] = await db
    .insert(fundPaymentSubmissions)
    .values([
      {
        fundId: maintenanceFund.id,
        neighborhoodId: centroNeighborhood.id,
        groupChargeId: maintenanceCharge.id,
        groupId: casa101.id,
        submittedBy: ana.id,
        method: "wire_transfer",
        amount: "250.00",
        paidAt: formatDate(addDays(today, -2)),
        reference: "MNT-250",
        notes: "Paid in full by transfer.",
        status: "confirmed",
        confirmedBy: admin.id,
        confirmedAt: new Date(),
      },
      {
        fundId: reserveFund.id,
        neighborhoodId: surNeighborhood.id,
        groupChargeId: securityCharge.id,
        groupId: casa202.id,
        submittedBy: luis.id,
        method: "cash",
        amount: "180.00",
        paidAt: formatDate(addDays(today, -1)),
        notes: "Cash delivered to neighborhood admin.",
        status: "submitted",
      },
    ])
    .returning();

  await db.insert(fundPaymentAllocations).values({
    paymentId: confirmedPayment.id,
    groupChargeId: maintenanceCharge.id,
    amount: "250.00",
  });

  await db.insert(fundMovements).values([
    {
      fundId: maintenanceFund.id,
      neighborhoodId: centroNeighborhood.id,
      type: "payment",
      entrySide: "credit",
      amount: "250.00",
      effectiveAt: new Date(`${formatDate(addDays(today, -2))}T12:00:00.000Z`),
      description: "Confirmed maintenance payment for Casa 101",
      sourceType: "payment",
      sourceId: confirmedPayment.id,
      createdBy: admin.id,
    },
    {
      fundId: maintenanceFund.id,
      neighborhoodId: centroNeighborhood.id,
      type: "expense",
      entrySide: "debit",
      amount: "80.00",
      effectiveAt: new Date(`${formatDate(today)}T12:00:00.000Z`),
      description: "Garden supplies and common-area cleaning",
      sourceType: "expense",
      createdBy: admin.id,
    },
  ]);

  await db.insert(events).values([
    {
      title: "Neighborhood cleanup",
      description: "Monthly community cleanup and meet-up.",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7 + 1000 * 60 * 60 * 2),
      location: "Community hall",
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    },
    {
      title: "Neighborhood watch meeting",
      description: "Monthly neighborhood watch sync.",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14 + 1000 * 60 * 60 * 2),
      location: "South Clubhouse",
      neighborhoodId: surNeighborhood.id,
      createdBy: admin.id,
    },
  ]);

  await db.insert(posts).values([
    {
      title: "Community update",
      content:
        "Thanks for participating in the last cleanup. We will share next steps soon.",
      status: "published",
      publishedAt: new Date(),
      neighborhoodId: centroNeighborhood.id,
      createdBy: admin.id,
    },
    {
      title: "South district update",
      content:
        "Welcome to VecinoHub for Jardines del Sur. Watch this board for local updates.",
      status: "published",
      publishedAt: new Date(),
      neighborhoodId: surNeighborhood.id,
      createdBy: admin.id,
    },
  ]);

  const [grill, clubhouse, meetingRoom] = await db
    .insert(resources)
    .values([
      {
        neighborhoodId: centroNeighborhood.id,
        name: "Asador central",
        description: "Shared grill area for family gatherings.",
        type: "grill",
        location: "Central garden",
        capacity: 20,
        requiresApproval: false,
        requiresDeposit: false,
        usageRules: "Leave the area clean and respect the reservation end time.",
        termsText: "Noise must remain within neighborhood quiet hours.",
        createdBy: admin.id,
      },
      {
        neighborhoodId: centroNeighborhood.id,
        name: "Casa club",
        description: "Indoor common room for meetings and private events.",
        type: "clubhouse",
        location: "Community hall",
        capacity: 40,
        requiresApproval: false,
        requiresDeposit: true,
        depositAmount: "500.00",
        reservationFeeAmount: "250.00",
        usageRules: "No smoking. Furniture must be restored after use.",
        termsText: "Late cancellation may count against monthly limits.",
        createdBy: admin.id,
      },
      {
        neighborhoodId: surNeighborhood.id,
        name: "Sala de juntas",
        description: "Small meeting room for committee and resident sessions.",
        type: "meeting_room",
        location: "Admin office",
        capacity: 10,
        requiresApproval: false,
        requiresDeposit: false,
        usageRules: "Food is not allowed inside the room.",
        createdBy: luis.id,
      },
    ])
    .returning();

  await db.insert(resourceAvailabilityWindows).values([
    ...[1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      resourceId: grill.id,
      dayOfWeek,
      startMinute: 600,
      endMinute: 1320,
    })),
    ...[5, 6, 0].map((dayOfWeek) => ({
      resourceId: clubhouse.id,
      dayOfWeek,
      startMinute: 600,
      endMinute: 1380,
    })),
    ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({
      resourceId: meetingRoom.id,
      dayOfWeek,
      startMinute: 540,
      endMinute: 1080,
    })),
  ]);

  await db.insert(resourceRules).values([
    {
      resourceId: grill.id,
      minAdvanceHours: 24,
      maxAdvanceDays: 14,
      maxReservationsPerMonth: 2,
      maxReservationsPerYear: 12,
      maxActiveReservations: 1,
      minDurationMinutes: 60,
      maxDurationMinutes: 360,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 60,
      maxConcurrentReservations: 1,
      requireNoDebt: false,
      cancellationLimitHours: 12,
      lateCancellationCountsAsUsage: false,
      lateCancellationForfeitsDeposit: false,
    },
    {
      resourceId: clubhouse.id,
      minAdvanceHours: 72,
      maxAdvanceDays: 60,
      maxReservationsPerMonth: 1,
      maxReservationsPerYear: 6,
      maxActiveReservations: 1,
      minDurationMinutes: 120,
      maxDurationMinutes: 480,
      bufferBeforeMinutes: 60,
      bufferAfterMinutes: 60,
      maxConcurrentReservations: 1,
      requireNoDebt: false,
      cancellationLimitHours: 48,
      lateCancellationCountsAsUsage: true,
      lateCancellationForfeitsDeposit: true,
    },
    {
      resourceId: meetingRoom.id,
      minAdvanceHours: 12,
      maxAdvanceDays: 30,
      maxReservationsPerMonth: 4,
      maxReservationsPerYear: 24,
      maxActiveReservations: 2,
      minDurationMinutes: 30,
      maxDurationMinutes: 180,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
      maxConcurrentReservations: 1,
      requireNoDebt: false,
      cancellationLimitHours: 6,
      lateCancellationCountsAsUsage: false,
      lateCancellationForfeitsDeposit: false,
    },
  ]);

  const nextSaturday = addDays(today, ((6 - today.getDay() + 7) % 7) || 7);
  const nextSunday = addDays(today, ((7 - today.getDay()) % 7) || 7);

  await db.insert(resourceReservations).values([
    {
      resourceId: grill.id,
      neighborhoodId: centroNeighborhood.id,
      groupId: casa101.id,
      requestedBy: ana.id,
      startAt: new Date(`${formatDate(nextSaturday)}T18:00:00.000Z`),
      endAt: new Date(`${formatDate(nextSaturday)}T21:00:00.000Z`),
      title: "Comida familiar",
      notes: "Birthday lunch for family and close friends.",
      attendeeCount: 14,
      status: "approved",
    },
    {
      resourceId: meetingRoom.id,
      neighborhoodId: surNeighborhood.id,
      groupId: casa202.id,
      requestedBy: luis.id,
      startAt: new Date(`${formatDate(addDays(today, 3))}T16:00:00.000Z`),
      endAt: new Date(`${formatDate(addDays(today, 3))}T17:30:00.000Z`),
      title: "Budget review",
      attendeeCount: 6,
      status: "approved",
    },
  ]);

  await db.insert(resourceBlocks).values([
    {
      resourceId: clubhouse.id,
      neighborhoodId: centroNeighborhood.id,
      startAt: new Date(`${formatDate(nextSunday)}T18:00:00.000Z`),
      endAt: new Date(`${formatDate(nextSunday)}T23:00:00.000Z`),
      reason: "maintenance",
      reasonText: "Air conditioning maintenance window.",
      createdBy: admin.id,
    },
  ]);

  console.log("Seed completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
