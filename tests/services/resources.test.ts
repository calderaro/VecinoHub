import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  groupMemberships,
  groups,
  neighborhoodMemberships,
  neighborhoods,
  resourceBlocks,
  resourceReservations,
  users,
} from "@/db/schema";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { db } from "@/db";
import {
  cancelResourceReservation,
  createResource,
  createResourceReservation,
} from "@/services/resources";
import {
  closeTestDatabase,
  ensureTestDatabase,
  resetTestDatabase,
} from "../helpers/test-database";

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

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function dayOfWeekForDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

async function seedResourceFixtures() {
  const neighborhoodId = randomUUID();
  const adminId = randomUUID();
  const residentId = randomUUID();
  const secondResidentId = randomUUID();
  const groupId = randomUUID();
  const secondGroupId = randomUUID();

  await db.insert(users).values([
    {
      id: adminId,
      email: "resources-admin@example.com",
      name: "Resource Admin",
      role: "user",
      status: "active",
    },
    {
      id: residentId,
      email: "resident@example.com",
      name: "Resident One",
      role: "user",
      status: "active",
    },
    {
      id: secondResidentId,
      email: "resident-two@example.com",
      name: "Resident Two",
      role: "user",
      status: "active",
    },
  ]);

  await db.insert(neighborhoods).values({
    id: neighborhoodId,
    name: "Resource Neighborhood",
    slug: "resource-neighborhood",
    timeZone: "America/Mexico_City",
    status: "active",
    createdBy: adminId,
  });

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
    {
      id: randomUUID(),
      neighborhoodId,
      userId: secondResidentId,
      role: "neighbor",
      status: "active",
    },
  ]);

  await db.insert(groups).values([
    {
      id: groupId,
      neighborhoodId,
      name: "Casa 101",
    },
    {
      id: secondGroupId,
      neighborhoodId,
      name: "Casa 202",
    },
  ]);

  await db.insert(groupMemberships).values([
    {
      id: randomUUID(),
      groupId,
      userId: residentId,
      role: "group_member",
      status: "active",
    },
    {
      id: randomUUID(),
      groupId: secondGroupId,
      userId: secondResidentId,
      role: "group_member",
      status: "active",
    },
  ]);

  const adminCtx = createCtx(adminId, {
    activeNeighborhoodId: neighborhoodId,
  });

  return {
    neighborhoodId,
    adminId,
    residentId,
    secondResidentId,
    groupId,
    secondGroupId,
    adminCtx,
    residentCtx: createCtx(residentId, { activeNeighborhoodId: neighborhoodId }),
    secondResidentCtx: createCtx(secondResidentId, { activeNeighborhoodId: neighborhoodId }),
  };
}

describe("resources service", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("rejects duplicate resource names within the same neighborhood", async () => {
    const fixtures = await seedResourceFixtures();

    await createResource(fixtures.adminCtx, {
      neighborhoodId: fixtures.neighborhoodId,
      name: "Clubhouse",
      location: "Main plaza",
      availabilityWindows: [
        {
          dayOfWeek: 6,
          startMinute: 600,
          endMinute: 1080,
        },
      ],
      rules: {
        minAdvanceHours: 24,
        maxAdvanceDays: 30,
        minDurationMinutes: 60,
        maxDurationMinutes: 240,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        maxConcurrentReservations: 1,
        requireNoDebt: false,
        lateCancellationCountsAsUsage: false,
        lateCancellationForfeitsDeposit: false,
      },
    });

    await expect(
      createResource(fixtures.adminCtx, {
        neighborhoodId: fixtures.neighborhoodId,
        name: "clubhouse",
        location: "North wing",
        availabilityWindows: [
          {
            dayOfWeek: 6,
            startMinute: 600,
            endMinute: 1080,
          },
        ],
        rules: {
          minAdvanceHours: 24,
          maxAdvanceDays: 30,
          minDurationMinutes: 60,
          maxDurationMinutes: 240,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          maxConcurrentReservations: 1,
          requireNoDebt: false,
          lateCancellationCountsAsUsage: false,
          lateCancellationForfeitsDeposit: false,
        },
      })
    ).rejects.toMatchObject({
      message: "A resource with that name already exists",
    });
  });

  it("rejects reservations that overlap an administrative block", async () => {
    const fixtures = await seedResourceFixtures();
    const reservationDate = formatDateKey(addDays(new Date(), 10));
    const dayOfWeek = dayOfWeekForDateKey(reservationDate);

    const resource = await createResource(fixtures.adminCtx, {
      neighborhoodId: fixtures.neighborhoodId,
      name: "Terrace",
      location: "Roof deck",
      availabilityWindows: [
        {
          dayOfWeek,
          startMinute: 600,
          endMinute: 1320,
        },
      ],
      rules: {
        minAdvanceHours: 24,
        maxAdvanceDays: 90,
        minDurationMinutes: 60,
        maxDurationMinutes: 360,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        maxConcurrentReservations: 1,
        requireNoDebt: false,
        lateCancellationCountsAsUsage: false,
        lateCancellationForfeitsDeposit: false,
      },
    });

    await db.insert(resourceBlocks).values({
      id: randomUUID(),
      resourceId: resource.id,
      neighborhoodId: fixtures.neighborhoodId,
      startAt: new Date(`${reservationDate}T16:00:00.000Z`),
      endAt: new Date(`${reservationDate}T18:00:00.000Z`),
      reason: "maintenance",
      reasonText: "Cleaning crew",
      createdBy: fixtures.adminId,
    });

    await expect(
      createResourceReservation(fixtures.residentCtx, {
        resourceId: resource.id,
        groupId: fixtures.groupId,
        date: reservationDate,
        startMinute: 600,
        endMinute: 720,
        title: "Birthday lunch",
        attendeeCount: 20,
      })
    ).rejects.toMatchObject({
      message: "The requested slot is blocked by administration",
    });
  });

  it("rejects reservations that overlap an approved reservation for the same resource", async () => {
    const fixtures = await seedResourceFixtures();
    const reservationDate = formatDateKey(addDays(new Date(), 12));
    const dayOfWeek = dayOfWeekForDateKey(reservationDate);

    const resource = await createResource(fixtures.adminCtx, {
      neighborhoodId: fixtures.neighborhoodId,
      name: "Grill",
      location: "Garden",
      availabilityWindows: [
        {
          dayOfWeek,
          startMinute: 540,
          endMinute: 1320,
        },
      ],
      rules: {
        minAdvanceHours: 24,
        maxAdvanceDays: 90,
        minDurationMinutes: 60,
        maxDurationMinutes: 360,
        bufferBeforeMinutes: 30,
        bufferAfterMinutes: 30,
        maxConcurrentReservations: 1,
        requireNoDebt: false,
        lateCancellationCountsAsUsage: false,
        lateCancellationForfeitsDeposit: false,
      },
    });

    await db.insert(resourceReservations).values({
      id: randomUUID(),
      resourceId: resource.id,
      neighborhoodId: fixtures.neighborhoodId,
      groupId: fixtures.secondGroupId,
      requestedBy: fixtures.secondResidentId,
      startAt: new Date(`${reservationDate}T17:00:00.000Z`),
      endAt: new Date(`${reservationDate}T19:00:00.000Z`),
      title: "Already booked",
      status: "approved",
    });

    await expect(
      createResourceReservation(fixtures.residentCtx, {
        resourceId: resource.id,
        groupId: fixtures.groupId,
        date: reservationDate,
        startMinute: 660,
        endMinute: 780,
        title: "Family barbecue",
        attendeeCount: 12,
      })
    ).rejects.toMatchObject({
      message: "The requested slot is no longer available",
    });
  });

  it("rejects resident cancellation once the cancellation limit has passed", async () => {
    const fixtures = await seedResourceFixtures();
    const reservationDate = formatDateKey(addDays(new Date(), 3));
    const dayOfWeek = dayOfWeekForDateKey(reservationDate);

    const resource = await createResource(fixtures.adminCtx, {
      neighborhoodId: fixtures.neighborhoodId,
      name: "Meeting room",
      location: "Admin building",
      availabilityWindows: [
        {
          dayOfWeek,
          startMinute: 540,
          endMinute: 1320,
        },
      ],
      rules: {
        minAdvanceHours: 1,
        maxAdvanceDays: 30,
        minDurationMinutes: 60,
        maxDurationMinutes: 180,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
        maxConcurrentReservations: 1,
        requireNoDebt: false,
        cancellationLimitHours: 96,
        lateCancellationCountsAsUsage: false,
        lateCancellationForfeitsDeposit: false,
      },
    });

    const reservation = await createResourceReservation(fixtures.residentCtx, {
      resourceId: resource.id,
      groupId: fixtures.groupId,
      date: reservationDate,
      startMinute: 600,
      endMinute: 720,
      title: "Planning session",
      attendeeCount: 6,
    });

    await expect(
      cancelResourceReservation(fixtures.residentCtx, {
        reservationId: reservation.id,
        reason: "Too late",
      })
    ).rejects.toMatchObject({
      message: "This reservation can no longer be cancelled online",
    });
  });
});
