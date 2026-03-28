import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  fundChargePeriods,
  fundGroupCharges,
  groupMemberships,
  groups,
  neighborhoods,
  resourceAvailabilityWindows,
  resourceBlocks,
  resourceReservations,
  resourceRules,
  resources,
  users,
} from "@/db/schema";
import {
  addDaysToDateKey,
  getDayOfWeekFromDateKey,
  getPortDateKey,
  getPortMinuteOfDay,
  toUtcFromPortDateTime,
} from "@/lib/port-time";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  requireGroupMember,
  requireNeighborhoodAdminOrPlatform,
  requireNeighborhoodMember,
  resolveGroupAccess,
} from "./guards";
import type { ServiceContext } from "./types";
import {
  idSchema,
  nameSchema,
  resourceBlockReasonSchema,
  resourceReservationStatusSchema,
  resourceStatusSchema,
} from "./validators";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

const minuteSchema = z.number().int().min(0).max(1440);

const availabilityWindowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "Availability window end must be after start",
  });

const resourceRulesInputSchema = z
  .object({
    minAdvanceHours: z.number().int().min(0).max(24 * 365).default(0),
    maxAdvanceDays: z.number().int().min(0).max(365).default(30),
    maxReservationsPerMonth: z.number().int().positive().max(365).nullable().optional(),
    maxReservationsPerYear: z.number().int().positive().max(365).nullable().optional(),
    maxActiveReservations: z.number().int().positive().max(365).nullable().optional(),
    minDurationMinutes: z.number().int().min(15).max(24 * 60).default(60),
    maxDurationMinutes: z.number().int().min(15).max(24 * 60).default(360),
    bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).default(0),
    bufferAfterMinutes: z.number().int().min(0).max(24 * 60).default(0),
    maxConcurrentReservations: z.number().int().positive().max(25).default(1),
    requireNoDebt: z.boolean().default(false),
    cancellationLimitHours: z.number().int().min(0).max(24 * 365).nullable().optional(),
    lateCancellationCountsAsUsage: z.boolean().default(false),
    lateCancellationForfeitsDeposit: z.boolean().default(false),
  })
  .refine((value) => value.maxDurationMinutes >= value.minDurationMinutes, {
    message: "Maximum duration must be greater than or equal to minimum duration",
  });

const createResourceSchema = z.object({
  neighborhoodId: idSchema.optional(),
  name: nameSchema,
  description: z.string().trim().max(1000).optional(),
  type: z.string().trim().max(120).optional(),
  location: z.string().trim().max(240).optional(),
  capacity: z.number().int().positive().max(100000).nullable().optional(),
  status: resourceStatusSchema.default("active"),
  requiresApproval: z.boolean().default(false),
  requiresDeposit: z.boolean().default(false),
  depositAmount: z.string().trim().optional(),
  reservationFeeAmount: z.string().trim().optional(),
  usageRules: z.string().trim().max(5000).optional(),
  termsText: z.string().trim().max(5000).optional(),
  availabilityWindows: z.array(availabilityWindowSchema).min(1),
  rules: resourceRulesInputSchema,
});

const updateResourceSchema = createResourceSchema
  .omit({ neighborhoodId: true })
  .partial()
  .extend({
    resourceId: idSchema,
    availabilityWindows: z.array(availabilityWindowSchema).min(1).optional(),
    rules: resourceRulesInputSchema.optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.type !== undefined ||
      value.location !== undefined ||
      value.capacity !== undefined ||
      value.status !== undefined ||
      value.requiresApproval !== undefined ||
      value.requiresDeposit !== undefined ||
      value.depositAmount !== undefined ||
      value.reservationFeeAmount !== undefined ||
      value.usageRules !== undefined ||
      value.termsText !== undefined ||
      value.availabilityWindows !== undefined ||
      value.rules !== undefined,
    { message: "At least one field is required" }
  );

const listNeighborhoodResourcesSchema = z.object({
  neighborhoodId: idSchema,
});

const listResourcesForGroupSchema = z.object({
  groupId: idSchema,
});

const getResourceDetailSchema = z.object({
  resourceId: idSchema,
  groupId: idSchema.optional(),
  fromDate: dateKeySchema.optional(),
  days: z.number().int().min(1).max(31).default(14),
});

const listGroupReservationsSchema = z.object({
  groupId: idSchema,
  status: resourceReservationStatusSchema.optional(),
});

const listNeighborhoodReservationsSchema = z.object({
  neighborhoodId: idSchema,
  status: resourceReservationStatusSchema.optional(),
  resourceId: idSchema.optional(),
});

const blockInputSchema = z.object({
  resourceId: idSchema,
  date: dateKeySchema,
  startMinute: minuteSchema,
  endMinute: minuteSchema,
  reason: resourceBlockReasonSchema,
  reasonText: z.string().trim().max(500).optional(),
});

const updateBlockSchema = blockInputSchema.extend({
  blockId: idSchema,
});

const removeBlockSchema = z.object({
  blockId: idSchema,
});

const createReservationSchema = z
  .object({
    resourceId: idSchema,
    groupId: idSchema,
    date: dateKeySchema,
    startMinute: minuteSchema,
    endMinute: minuteSchema,
    title: z.string().trim().min(1).max(160),
    notes: z.string().trim().max(1000).optional(),
    attendeeCount: z.number().int().positive().max(100000).nullable().optional(),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "Reservation end must be after start",
  });

const cancelReservationSchema = z.object({
  reservationId: idSchema,
  reason: z.string().trim().max(500).optional(),
});

function toNumber(value: string | number | null | undefined) {
  return Number(value ?? 0);
}

function combineFilters<T>(filters: Array<T | undefined>) {
  const filtered = filters.filter((filter): filter is T => Boolean(filter));
  if (filtered.length === 0) {
    return undefined;
  }

  const [first, ...rest] = filtered;
  return and(first as never, ...(rest as never[]));
}

function normalizeAmount(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }
  return value.trim();
}

function isOverlap(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

function getReservationEffectiveWindow(
  startAt: Date,
  endAt: Date,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number
) {
  return {
    start: new Date(startAt.getTime() - bufferBeforeMinutes * 60 * 1000),
    end: new Date(endAt.getTime() + bufferAfterMinutes * 60 * 1000),
  };
}

async function getResourceRecord(resourceId: string) {
  const rows = await db
    .select({
      resource: resources,
      neighborhoodName: neighborhoods.name,
      timeZone: neighborhoods.timeZone,
    })
    .from(resources)
    .innerJoin(neighborhoods, eq(resources.neighborhoodId, neighborhoods.id))
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Resource not found", "NOT_FOUND");
  }

  return rows[0];
}

async function requireResourceAccess(ctx: ServiceContext, resourceId: string) {
  const record = await getResourceRecord(resourceId);
  await requireNeighborhoodMember(ctx, record.resource.neighborhoodId);
  return record;
}

async function requireResourceAdminScope(ctx: ServiceContext, resourceId: string) {
  const record = await getResourceRecord(resourceId);
  await requireNeighborhoodAdminOrPlatform(ctx, record.resource.neighborhoodId);
  return record;
}

async function ensureResourceNameAvailable(
  neighborhoodId: string,
  name: string,
  excludeResourceId?: string
) {
  const normalizedName = name.trim().toLowerCase();
  const rows = await db
    .select({ id: resources.id })
    .from(resources)
    .where(
      combineFilters([
        eq(resources.neighborhoodId, neighborhoodId),
        sql`lower(${resources.name}) = ${normalizedName}`,
        excludeResourceId ? ne(resources.id, excludeResourceId) : undefined,
      ])
    )
    .limit(1);

  if (rows[0]) {
    throw new ServiceError("A resource with that name already exists", "INVALID");
  }
}

async function getResourceRules(resourceId: string) {
  const rows = await db
    .select()
    .from(resourceRules)
    .where(eq(resourceRules.resourceId, resourceId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Resource rules not found", "NOT_FOUND");
  }

  return rows[0];
}

async function getResourceAvailabilityWindows(resourceId: string) {
  return db
    .select()
    .from(resourceAvailabilityWindows)
    .where(eq(resourceAvailabilityWindows.resourceId, resourceId))
    .orderBy(asc(resourceAvailabilityWindows.dayOfWeek), asc(resourceAvailabilityWindows.startMinute));
}

async function replaceAvailabilityWindows(
  tx: DbTransaction,
  resourceId: string,
  availabilityWindows: Array<z.infer<typeof availabilityWindowSchema>>
) {
  await tx
    .delete(resourceAvailabilityWindows)
    .where(eq(resourceAvailabilityWindows.resourceId, resourceId));

  await tx.insert(resourceAvailabilityWindows).values(
    availabilityWindows.map((window) => ({
      resourceId,
      dayOfWeek: window.dayOfWeek,
      startMinute: window.startMinute,
      endMinute: window.endMinute,
    }))
  );
}

async function upsertRules(
  tx: DbTransaction,
  resourceId: string,
  rules: z.infer<typeof resourceRulesInputSchema>
) {
  const existing = await tx
    .select({ id: resourceRules.id })
    .from(resourceRules)
    .where(eq(resourceRules.resourceId, resourceId))
    .limit(1);

  const payload = {
    resourceId,
    minAdvanceHours: rules.minAdvanceHours,
    maxAdvanceDays: rules.maxAdvanceDays,
    maxReservationsPerMonth: rules.maxReservationsPerMonth ?? null,
    maxReservationsPerYear: rules.maxReservationsPerYear ?? null,
    maxActiveReservations: rules.maxActiveReservations ?? null,
    minDurationMinutes: rules.minDurationMinutes,
    maxDurationMinutes: rules.maxDurationMinutes,
    bufferBeforeMinutes: rules.bufferBeforeMinutes,
    bufferAfterMinutes: rules.bufferAfterMinutes,
    maxConcurrentReservations: rules.maxConcurrentReservations,
    requireNoDebt: rules.requireNoDebt,
    cancellationLimitHours: rules.cancellationLimitHours ?? null,
    lateCancellationCountsAsUsage: rules.lateCancellationCountsAsUsage,
    lateCancellationForfeitsDeposit: rules.lateCancellationForfeitsDeposit,
    updatedAt: new Date(),
  };

  if (!existing[0]) {
    await tx.insert(resourceRules).values(payload);
    return;
  }

  await tx
    .update(resourceRules)
    .set(payload)
    .where(eq(resourceRules.resourceId, resourceId));
}

async function assertGroupMatchesNeighborhood(groupId: string, neighborhoodId: string) {
  const rows = await db
    .select({ neighborhoodId: groups.neighborhoodId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  if (rows[0].neighborhoodId !== neighborhoodId) {
    throw new ServiceError("Group does not belong to the resource neighborhood", "FORBIDDEN");
  }
}

async function ensureNoDebtIfRequired(
  groupId: string,
  neighborhoodId: string,
  requireNoDebt: boolean
) {
  if (!requireNoDebt) {
    return;
  }

  const overdueRows = await db
    .select({ id: fundGroupCharges.id })
    .from(fundGroupCharges)
    .innerJoin(fundChargePeriods, eq(fundGroupCharges.periodId, fundChargePeriods.id))
    .where(
      and(
        eq(fundGroupCharges.groupId, groupId),
        eq(fundChargePeriods.neighborhoodId, neighborhoodId),
        eq(fundGroupCharges.status, "overdue")
      )
    )
    .limit(1);

  if (overdueRows[0]) {
    throw new ServiceError("This group must be current on dues before reserving", "FORBIDDEN");
  }
}

async function validateAvailabilityAndRules(args: {
  resourceId: string;
  timeZone: string;
  date: string;
  startMinute: number;
  endMinute: number;
  rules: Awaited<ReturnType<typeof getResourceRules>>;
  groupId: string;
  requestedReservationId?: string;
}) {
  const { resourceId, timeZone, date, startMinute, endMinute, rules, groupId, requestedReservationId } =
    args;
  const durationMinutes = endMinute - startMinute;

  if (durationMinutes <= 0) {
    throw new ServiceError("Reservation end must be after start", "INVALID");
  }

  if (durationMinutes < rules.minDurationMinutes) {
    throw new ServiceError("Reservation is shorter than the minimum duration", "INVALID");
  }

  if (durationMinutes > rules.maxDurationMinutes) {
    throw new ServiceError("Reservation exceeds the maximum duration", "INVALID");
  }

  const dayOfWeek = getDayOfWeekFromDateKey(date);
  const windows = await getResourceAvailabilityWindows(resourceId);
  const matchingWindows = windows.filter((window) => window.dayOfWeek === dayOfWeek);

  if (
    matchingWindows.length === 0 ||
    !matchingWindows.some(
      (window) => startMinute >= window.startMinute && endMinute <= window.endMinute
    )
  ) {
    throw new ServiceError("Reservation is outside the resource availability window", "INVALID");
  }

  const startAt = toUtcFromPortDateTime({
    dateKey: date,
    hour: Math.floor(startMinute / 60),
    minute: startMinute % 60,
    timeZone,
  });
  const endAt = toUtcFromPortDateTime({
    dateKey: date,
    hour: Math.floor(endMinute / 60),
    minute: endMinute % 60,
    timeZone,
  });
  const now = new Date();

  if (startAt <= now) {
    throw new ServiceError("Reservations must be scheduled in the future", "INVALID");
  }

  const advanceHours = (startAt.getTime() - now.getTime()) / (60 * 60 * 1000);
  if (advanceHours < rules.minAdvanceHours) {
    throw new ServiceError("Reservation does not meet the minimum advance notice", "INVALID");
  }

  if (advanceHours > rules.maxAdvanceDays * 24) {
    throw new ServiceError("Reservation exceeds the maximum advance window", "INVALID");
  }

  const effectiveRequestedWindow = getReservationEffectiveWindow(
    startAt,
    endAt,
    rules.bufferBeforeMinutes,
    rules.bufferAfterMinutes
  );

  const reservationCandidates = await db
    .select({
      reservation: resourceReservations,
    })
    .from(resourceReservations)
    .where(
      combineFilters([
        eq(resourceReservations.resourceId, resourceId),
        eq(resourceReservations.status, "approved"),
        requestedReservationId ? ne(resourceReservations.id, requestedReservationId) : undefined,
        lte(resourceReservations.startAt, effectiveRequestedWindow.end),
        gte(resourceReservations.endAt, effectiveRequestedWindow.start),
      ])
    );

  const overlappingReservations = reservationCandidates.filter(({ reservation }) => {
    const effectiveExistingWindow = getReservationEffectiveWindow(
      reservation.startAt,
      reservation.endAt,
      rules.bufferBeforeMinutes,
      rules.bufferAfterMinutes
    );

    return isOverlap(
      effectiveRequestedWindow.start,
      effectiveRequestedWindow.end,
      effectiveExistingWindow.start,
      effectiveExistingWindow.end
    );
  });

  if (overlappingReservations.length >= rules.maxConcurrentReservations) {
    throw new ServiceError("The requested slot is no longer available", "INVALID");
  }

  const blockRows = await db
    .select()
    .from(resourceBlocks)
    .where(
      and(
        eq(resourceBlocks.resourceId, resourceId),
        lte(resourceBlocks.startAt, effectiveRequestedWindow.end),
        gte(resourceBlocks.endAt, effectiveRequestedWindow.start)
      )
    );

  const overlappingBlock = blockRows.find((block) =>
    isOverlap(
      effectiveRequestedWindow.start,
      effectiveRequestedWindow.end,
      block.startAt,
      block.endAt
    )
  );

  if (overlappingBlock) {
    throw new ServiceError("The requested slot is blocked by administration", "INVALID");
  }

  const quotaRows = await db
    .select()
    .from(resourceReservations)
    .where(
      and(
        eq(resourceReservations.resourceId, resourceId),
        eq(resourceReservations.groupId, groupId),
        requestedReservationId ? ne(resourceReservations.id, requestedReservationId) : sql`true`
      )
    );

  const reservationMonth = date.slice(0, 7);
  const reservationYear = date.slice(0, 4);

  const countsTowardUsage = (reservation: typeof resourceReservations.$inferSelect) => {
    if (reservation.status === "approved" || reservation.status === "completed") {
      return true;
    }

    if (reservation.status === "cancelled") {
      return rules.lateCancellationCountsAsUsage;
    }

    return false;
  };

  const monthlyCount = quotaRows.filter((reservation) => {
    if (!countsTowardUsage(reservation)) {
      return false;
    }

    return getPortDateKey(reservation.startAt, timeZone).startsWith(reservationMonth);
  }).length;

  const yearlyCount = quotaRows.filter((reservation) => {
    if (!countsTowardUsage(reservation)) {
      return false;
    }

    return getPortDateKey(reservation.startAt, timeZone).startsWith(reservationYear);
  }).length;

  const activeFutureCount = quotaRows.filter((reservation) => {
    if (reservation.status !== "approved") {
      return false;
    }
    return reservation.startAt > now;
  }).length;

  if (
    rules.maxReservationsPerMonth !== null &&
    monthlyCount >= toNumber(rules.maxReservationsPerMonth)
  ) {
    throw new ServiceError("This group has reached the monthly reservation limit", "INVALID");
  }

  if (
    rules.maxReservationsPerYear !== null &&
    yearlyCount >= toNumber(rules.maxReservationsPerYear)
  ) {
    throw new ServiceError("This group has reached the yearly reservation limit", "INVALID");
  }

  if (
    rules.maxActiveReservations !== null &&
    activeFutureCount >= toNumber(rules.maxActiveReservations)
  ) {
    throw new ServiceError("This group already has the maximum active future reservations", "INVALID");
  }

  return { startAt, endAt };
}

function buildCalendarEntries(args: {
  fromDate: string;
  days: number;
  timeZone: string;
  windows: Array<typeof resourceAvailabilityWindows.$inferSelect>;
  reservations: Array<{
    reservation: typeof resourceReservations.$inferSelect;
    groupName: string | null;
    requestedByName: string | null;
  }>;
  blocks: Array<typeof resourceBlocks.$inferSelect>;
}) {
  const { fromDate, days, timeZone, windows, reservations, blocks } = args;

  return Array.from({ length: days }).map((_, index) => {
    const date = addDaysToDateKey(fromDate, index);
    const dayOfWeek = getDayOfWeekFromDateKey(date);
    const dayWindows = windows
      .filter((window) => window.dayOfWeek === dayOfWeek)
      .map((window) => ({
        id: window.id,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
      }));

    const dayReservations = reservations.flatMap((item) => {
      const startDateKey = getPortDateKey(item.reservation.startAt, timeZone);
      const endDateKey = getPortDateKey(item.reservation.endAt, timeZone);

      if (date < startDateKey || date > endDateKey) {
        return [];
      }

      const startMinute =
        date === startDateKey ? getPortMinuteOfDay(item.reservation.startAt, timeZone) : 0;
      const endMinute =
        date === endDateKey ? getPortMinuteOfDay(item.reservation.endAt, timeZone) : 1440;

      return [
        {
          id: item.reservation.id,
          title: item.reservation.title,
          status: item.reservation.status,
          startMinute,
          endMinute,
          groupName: item.groupName,
          requestedByName: item.requestedByName,
        },
      ];
    });

    const dayBlocks = blocks.flatMap((block) => {
      const startDateKey = getPortDateKey(block.startAt, timeZone);
      const endDateKey = getPortDateKey(block.endAt, timeZone);

      if (date < startDateKey || date > endDateKey) {
        return [];
      }

      const startMinute = date === startDateKey ? getPortMinuteOfDay(block.startAt, timeZone) : 0;
      const endMinute = date === endDateKey ? getPortMinuteOfDay(block.endAt, timeZone) : 1440;

      return [
        {
          id: block.id,
          reason: block.reason,
          reasonText: block.reasonText,
          startMinute,
          endMinute,
        },
      ];
    });

    return {
      date,
      dayOfWeek,
      windows: dayWindows,
      reservations: dayReservations.sort((left, right) => left.startMinute - right.startMinute),
      blocks: dayBlocks.sort((left, right) => left.startMinute - right.startMinute),
    };
  });
}

export async function listNeighborhoodResources(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodResourcesSchema>
) {
  const { neighborhoodId } = listNeighborhoodResourcesSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const rows = await db
    .select({
      resource: resources,
      creatorName: users.name,
    })
    .from(resources)
    .leftJoin(users, eq(resources.createdBy, users.id))
    .where(eq(resources.neighborhoodId, neighborhoodId))
    .orderBy(asc(resources.name));

  const resourceIds = rows.map((row) => row.resource.id);
  if (resourceIds.length === 0) {
    return [];
  }

  const [upcomingReservationCounts, futureBlockCounts] = await Promise.all([
    db
      .select({
        resourceId: resourceReservations.resourceId,
        total: count(),
      })
      .from(resourceReservations)
      .where(
        and(
          inArray(resourceReservations.resourceId, resourceIds),
          eq(resourceReservations.status, "approved"),
          gte(resourceReservations.endAt, new Date())
        )
      )
      .groupBy(resourceReservations.resourceId),
    db
      .select({
        resourceId: resourceBlocks.resourceId,
        total: count(),
      })
      .from(resourceBlocks)
      .where(
        and(inArray(resourceBlocks.resourceId, resourceIds), gte(resourceBlocks.endAt, new Date()))
      )
      .groupBy(resourceBlocks.resourceId),
  ]);

  const reservationCountMap = new Map(
    upcomingReservationCounts.map((row) => [row.resourceId, Number(row.total)])
  );
  const blockCountMap = new Map(futureBlockCounts.map((row) => [row.resourceId, Number(row.total)]));

  return rows.map((row) => ({
    ...row.resource,
    creatorName: row.creatorName,
    upcomingReservations: reservationCountMap.get(row.resource.id) ?? 0,
    upcomingBlocks: blockCountMap.get(row.resource.id) ?? 0,
  }));
}

export async function listResourcesForGroup(
  ctx: ServiceContext,
  input: z.input<typeof listResourcesForGroupSchema>
) {
  const { groupId } = listResourcesForGroupSchema.parse(input);
  const group = await resolveGroupAccess(ctx, groupId);
  await requireGroupMember(ctx, groupId);

  const rows = await db
    .select({
      resource: resources,
    })
    .from(resources)
    .where(eq(resources.neighborhoodId, group.neighborhoodId))
    .orderBy(asc(resources.name));

  const resourceIds = rows.map((row) => row.resource.id);
  const upcomingCounts =
    resourceIds.length === 0
      ? []
      : await db
          .select({
            resourceId: resourceReservations.resourceId,
            total: count(),
          })
          .from(resourceReservations)
          .where(
            and(
              inArray(resourceReservations.resourceId, resourceIds),
              eq(resourceReservations.groupId, groupId),
              eq(resourceReservations.status, "approved"),
              gte(resourceReservations.endAt, new Date())
            )
          )
          .groupBy(resourceReservations.resourceId);

  const countMap = new Map(upcomingCounts.map((row) => [row.resourceId, Number(row.total)]));

  return rows.map((row) => ({
    ...row.resource,
    groupUpcomingReservations: countMap.get(row.resource.id) ?? 0,
  }));
}

export async function getResourceAdminDetail(
  ctx: ServiceContext,
  input: z.input<typeof getResourceDetailSchema>
) {
  const { resourceId, fromDate, days } = getResourceDetailSchema.parse(input);
  const record = await requireResourceAdminScope(ctx, resourceId);
  const [rules, windows, upcomingReservations, upcomingBlocks] = await Promise.all([
    getResourceRules(resourceId),
    getResourceAvailabilityWindows(resourceId),
    db
      .select({
        reservation: resourceReservations,
        groupName: groups.name,
        requestedByName: users.name,
      })
      .from(resourceReservations)
      .innerJoin(groups, eq(resourceReservations.groupId, groups.id))
      .innerJoin(users, eq(resourceReservations.requestedBy, users.id))
      .where(
        and(
          eq(resourceReservations.resourceId, resourceId),
          gte(resourceReservations.endAt, new Date())
        )
      )
      .orderBy(asc(resourceReservations.startAt))
      .limit(20),
    db
      .select()
      .from(resourceBlocks)
      .where(and(eq(resourceBlocks.resourceId, resourceId), gte(resourceBlocks.endAt, new Date())))
      .orderBy(asc(resourceBlocks.startAt))
      .limit(20),
  ]);

  const calendar = await getResourceCalendar(ctx, {
    resourceId,
    fromDate,
    days,
  });

  return {
    ...record.resource,
    neighborhoodName: record.neighborhoodName,
    timeZone: record.timeZone,
    rules,
    availabilityWindows: windows,
    upcomingReservations,
    upcomingBlocks,
    calendar,
  };
}

export async function getResourceDetailForGroup(
  ctx: ServiceContext,
  input: z.input<typeof getResourceDetailSchema>
) {
  const { resourceId, groupId, fromDate, days } = getResourceDetailSchema.parse(input);

  if (!groupId) {
    throw new ServiceError("Group is required", "INVALID");
  }

  await requireGroupMember(ctx, groupId);
  const record = await requireResourceAccess(ctx, resourceId);
  await assertGroupMatchesNeighborhood(groupId, record.resource.neighborhoodId);

  const [rules, windows, groupReservations] = await Promise.all([
    getResourceRules(resourceId),
    getResourceAvailabilityWindows(resourceId),
    db
      .select()
      .from(resourceReservations)
      .where(
        and(
          eq(resourceReservations.resourceId, resourceId),
          eq(resourceReservations.groupId, groupId),
          gte(resourceReservations.endAt, new Date())
        )
      )
      .orderBy(asc(resourceReservations.startAt))
      .limit(10),
  ]);

  const calendar = await getResourceCalendar(ctx, {
    resourceId,
    groupId,
    fromDate,
    days,
  });

  return {
    ...record.resource,
    neighborhoodName: record.neighborhoodName,
    timeZone: record.timeZone,
    rules,
    availabilityWindows: windows,
    groupReservations,
    calendar,
  };
}

export async function getResourceCalendar(
  ctx: ServiceContext,
  input: z.input<typeof getResourceDetailSchema>
) {
  const { resourceId, groupId, fromDate, days } = getResourceDetailSchema.parse(input);
  const record = await requireResourceAccess(ctx, resourceId);

  if (groupId) {
    await requireGroupMember(ctx, groupId);
    await assertGroupMatchesNeighborhood(groupId, record.resource.neighborhoodId);
  }

  const calendarFrom = fromDate ?? getPortDateKey(new Date(), record.timeZone);
  const calendarTo = addDaysToDateKey(calendarFrom, days - 1);
  const rangeStart = toUtcFromPortDateTime({
    dateKey: calendarFrom,
    hour: 0,
    minute: 0,
    timeZone: record.timeZone,
  });
  const rangeEnd = toUtcFromPortDateTime({
    dateKey: addDaysToDateKey(calendarTo, 1),
    hour: 0,
    minute: 0,
    timeZone: record.timeZone,
  });

  const [windows, reservations, blocks] = await Promise.all([
    getResourceAvailabilityWindows(resourceId),
    db
      .select({
        reservation: resourceReservations,
        groupName: groups.name,
        requestedByName: users.name,
      })
      .from(resourceReservations)
      .innerJoin(groups, eq(resourceReservations.groupId, groups.id))
      .innerJoin(users, eq(resourceReservations.requestedBy, users.id))
      .where(
        and(
          eq(resourceReservations.resourceId, resourceId),
          lte(resourceReservations.startAt, rangeEnd),
          gte(resourceReservations.endAt, rangeStart)
        )
      )
      .orderBy(asc(resourceReservations.startAt)),
    db
      .select()
      .from(resourceBlocks)
      .where(
        and(
          eq(resourceBlocks.resourceId, resourceId),
          lte(resourceBlocks.startAt, rangeEnd),
          gte(resourceBlocks.endAt, rangeStart)
        )
      )
      .orderBy(asc(resourceBlocks.startAt)),
  ]);

  return {
    resourceId,
    timeZone: record.timeZone,
    fromDate: calendarFrom,
    days,
    entries: buildCalendarEntries({
      fromDate: calendarFrom,
      days,
      timeZone: record.timeZone,
      windows,
      reservations,
      blocks,
    }),
  };
}

export async function listGroupReservations(
  ctx: ServiceContext,
  input: z.input<typeof listGroupReservationsSchema>
) {
  const { groupId, status } = listGroupReservationsSchema.parse(input);
  await requireGroupMember(ctx, groupId);

  return db
    .select({
      reservation: resourceReservations,
      resourceName: resources.name,
      resourceLocation: resources.location,
      timeZone: neighborhoods.timeZone,
    })
    .from(resourceReservations)
    .innerJoin(resources, eq(resourceReservations.resourceId, resources.id))
    .innerJoin(neighborhoods, eq(resourceReservations.neighborhoodId, neighborhoods.id))
    .where(
      combineFilters([
        eq(resourceReservations.groupId, groupId),
        status ? eq(resourceReservations.status, status) : undefined,
      ])
    )
    .orderBy(desc(resourceReservations.startAt));
}

export async function listNeighborhoodReservations(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodReservationsSchema>
) {
  const { neighborhoodId, status, resourceId } = listNeighborhoodReservationsSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  return db
    .select({
      reservation: resourceReservations,
      resourceName: resources.name,
      groupName: groups.name,
      requestedByName: users.name,
      timeZone: neighborhoods.timeZone,
    })
    .from(resourceReservations)
    .innerJoin(resources, eq(resourceReservations.resourceId, resources.id))
    .innerJoin(groups, eq(resourceReservations.groupId, groups.id))
    .innerJoin(users, eq(resourceReservations.requestedBy, users.id))
    .innerJoin(neighborhoods, eq(resourceReservations.neighborhoodId, neighborhoods.id))
    .where(
      combineFilters([
        eq(resourceReservations.neighborhoodId, neighborhoodId),
        status ? eq(resourceReservations.status, status) : undefined,
        resourceId ? eq(resourceReservations.resourceId, resourceId) : undefined,
      ])
    )
    .orderBy(desc(resourceReservations.startAt));
}

export async function listNeighborhoodBlocks(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodReservationsSchema>
) {
  const { neighborhoodId, resourceId } = listNeighborhoodReservationsSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  return db
    .select({
      block: resourceBlocks,
      resourceName: resources.name,
      creatorName: users.name,
      timeZone: neighborhoods.timeZone,
    })
    .from(resourceBlocks)
    .innerJoin(resources, eq(resourceBlocks.resourceId, resources.id))
    .innerJoin(users, eq(resourceBlocks.createdBy, users.id))
    .innerJoin(neighborhoods, eq(resourceBlocks.neighborhoodId, neighborhoods.id))
    .where(
      combineFilters([
        eq(resourceBlocks.neighborhoodId, neighborhoodId),
        resourceId ? eq(resourceBlocks.resourceId, resourceId) : undefined,
      ])
    )
    .orderBy(desc(resourceBlocks.startAt));
}

export async function createResource(
  ctx: ServiceContext,
  input: z.input<typeof createResourceSchema>
) {
  const parsed = createResourceSchema.parse(input);
  const neighborhoodId = parsed.neighborhoodId ?? ctx.user.activeNeighborhoodId;

  if (!neighborhoodId) {
    throw new ServiceError("Neighborhood is required", "INVALID");
  }

  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  if (parsed.requiresApproval) {
    throw new ServiceError("Manual approval workflows are not available in this MVP", "INVALID");
  }

  await ensureResourceNameAvailable(neighborhoodId, parsed.name);

  return db.transaction(async (tx) => {
    const createdRows = await tx
      .insert(resources)
      .values({
        neighborhoodId,
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        type: parsed.type?.trim() || null,
        location: parsed.location?.trim() || null,
        capacity: parsed.capacity ?? null,
        status: parsed.status,
        requiresApproval: false,
        requiresDeposit: parsed.requiresDeposit,
        depositAmount: normalizeAmount(parsed.depositAmount),
        reservationFeeAmount: normalizeAmount(parsed.reservationFeeAmount),
        usageRules: parsed.usageRules?.trim() || null,
        termsText: parsed.termsText?.trim() || null,
        createdBy: ctx.user.id,
      })
      .returning();

    const resource = createdRows[0];
    if (!resource) {
      throw new ServiceError("Failed to create resource", "INVALID");
    }

    await replaceAvailabilityWindows(tx, resource.id, parsed.availabilityWindows);
    await upsertRules(tx, resource.id, parsed.rules);

    return resource;
  });
}

export async function updateResource(
  ctx: ServiceContext,
  input: z.input<typeof updateResourceSchema>
) {
  const parsed = updateResourceSchema.parse(input);
  const record = await requireResourceAdminScope(ctx, parsed.resourceId);

  if (parsed.requiresApproval) {
    throw new ServiceError("Manual approval workflows are not available in this MVP", "INVALID");
  }

  if (parsed.name) {
    await ensureResourceNameAvailable(record.resource.neighborhoodId, parsed.name, parsed.resourceId);
  }

  return db.transaction(async (tx) => {
    const updates: Partial<typeof resources.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.name !== undefined) {
      updates.name = parsed.name.trim();
    }
    if (parsed.description !== undefined) {
      updates.description = parsed.description?.trim() || null;
    }
    if (parsed.type !== undefined) {
      updates.type = parsed.type?.trim() || null;
    }
    if (parsed.location !== undefined) {
      updates.location = parsed.location?.trim() || null;
    }
    if (parsed.capacity !== undefined) {
      updates.capacity = parsed.capacity ?? null;
    }
    if (parsed.status !== undefined) {
      updates.status = parsed.status;
    }
    if (parsed.requiresApproval !== undefined) {
      updates.requiresApproval = false;
    }
    if (parsed.requiresDeposit !== undefined) {
      updates.requiresDeposit = parsed.requiresDeposit;
    }
    if (parsed.depositAmount !== undefined) {
      updates.depositAmount = normalizeAmount(parsed.depositAmount);
    }
    if (parsed.reservationFeeAmount !== undefined) {
      updates.reservationFeeAmount = normalizeAmount(parsed.reservationFeeAmount);
    }
    if (parsed.usageRules !== undefined) {
      updates.usageRules = parsed.usageRules?.trim() || null;
    }
    if (parsed.termsText !== undefined) {
      updates.termsText = parsed.termsText?.trim() || null;
    }

    const updatedRows = await tx
      .update(resources)
      .set(updates)
      .where(eq(resources.id, parsed.resourceId))
      .returning();

    if (parsed.availabilityWindows) {
      await replaceAvailabilityWindows(tx, parsed.resourceId, parsed.availabilityWindows);
    }

    if (parsed.rules) {
      await upsertRules(tx, parsed.resourceId, parsed.rules);
    }

    if (!updatedRows[0]) {
      throw new ServiceError("Resource not found", "NOT_FOUND");
    }

    return updatedRows[0];
  });
}

export async function setResourceStatus(
  ctx: ServiceContext,
  input: { resourceId: string; status: z.infer<typeof resourceStatusSchema> }
) {
  const { resourceId, status } = z
    .object({ resourceId: idSchema, status: resourceStatusSchema })
    .parse(input);
  await requireResourceAdminScope(ctx, resourceId);

  const updatedRows = await db
    .update(resources)
    .set({ status, updatedAt: new Date() })
    .where(eq(resources.id, resourceId))
    .returning();

  if (!updatedRows[0]) {
    throw new ServiceError("Resource not found", "NOT_FOUND");
  }

  return updatedRows[0];
}

export async function createResourceReservation(
  ctx: ServiceContext,
  input: z.input<typeof createReservationSchema>
) {
  const parsed = createReservationSchema.parse(input);
  const resourceRecord = await requireResourceAccess(ctx, parsed.resourceId);
  await requireGroupMember(ctx, parsed.groupId);
  await assertGroupMatchesNeighborhood(parsed.groupId, resourceRecord.resource.neighborhoodId);

  if (resourceRecord.resource.status !== "active") {
    throw new ServiceError("This resource is not active", "INVALID");
  }

  if (resourceRecord.resource.requiresApproval) {
    throw new ServiceError("Manual approval workflows are not available in this MVP", "INVALID");
  }

  const rules = await getResourceRules(parsed.resourceId);
  await ensureNoDebtIfRequired(
    parsed.groupId,
    resourceRecord.resource.neighborhoodId,
    rules.requireNoDebt
  );

  const { startAt, endAt } = await validateAvailabilityAndRules({
    resourceId: parsed.resourceId,
    timeZone: resourceRecord.timeZone,
    date: parsed.date,
    startMinute: parsed.startMinute,
    endMinute: parsed.endMinute,
    rules,
    groupId: parsed.groupId,
  });

  const createdRows = await db
    .insert(resourceReservations)
    .values({
      resourceId: parsed.resourceId,
      neighborhoodId: resourceRecord.resource.neighborhoodId,
      groupId: parsed.groupId,
      requestedBy: ctx.user.id,
      startAt,
      endAt,
      title: parsed.title.trim(),
      notes: parsed.notes?.trim() || null,
      attendeeCount: parsed.attendeeCount ?? null,
      status: "approved",
    })
    .returning();

  if (!createdRows[0]) {
    throw new ServiceError("Failed to create reservation", "INVALID");
  }

  return createdRows[0];
}

export async function cancelResourceReservation(
  ctx: ServiceContext,
  input: z.input<typeof cancelReservationSchema>
) {
  const parsed = cancelReservationSchema.parse(input);

  const rows = await db
    .select({
      reservation: resourceReservations,
      resource: resources,
      neighborhoodTimeZone: neighborhoods.timeZone,
      rule: resourceRules,
    })
    .from(resourceReservations)
    .innerJoin(resources, eq(resourceReservations.resourceId, resources.id))
    .innerJoin(neighborhoods, eq(resourceReservations.neighborhoodId, neighborhoods.id))
    .innerJoin(resourceRules, eq(resourceRules.resourceId, resources.id))
    .where(eq(resourceReservations.id, parsed.reservationId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Reservation not found", "NOT_FOUND");
  }

  const { reservation, resource, rule } = rows[0];
  const activeMembershipRows = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, reservation.groupId),
        eq(groupMemberships.userId, ctx.user.id),
        eq(groupMemberships.status, "active")
      )
    )
    .limit(1);

  const isGroupMember = Boolean(activeMembershipRows[0]);
  const isPlatform = isPlatformAdmin(ctx);

  if (!isGroupMember && !isPlatform) {
    await requireResourceAdminScope(ctx, resource.id).catch(() => {
      throw new ServiceError("You cannot cancel this reservation", "FORBIDDEN");
    });
  }

  if (reservation.status !== "approved") {
    throw new ServiceError("Only approved reservations can be cancelled", "INVALID");
  }

  const now = new Date();

  if (isGroupMember && rule.cancellationLimitHours !== null) {
    const hoursUntilStart = (reservation.startAt.getTime() - now.getTime()) / (60 * 60 * 1000);

    if (hoursUntilStart < toNumber(rule.cancellationLimitHours)) {
      throw new ServiceError("This reservation can no longer be cancelled online", "INVALID");
    }
  }

  const updatedRows = await db
    .update(resourceReservations)
    .set({
      status: "cancelled",
      cancelledBy: ctx.user.id,
      cancelledAt: new Date(),
      cancellationReason: parsed.reason?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(resourceReservations.id, parsed.reservationId))
    .returning();

  if (!updatedRows[0]) {
    throw new ServiceError("Reservation not found", "NOT_FOUND");
  }

  return updatedRows[0];
}

export async function createResourceBlock(
  ctx: ServiceContext,
  input: z.input<typeof blockInputSchema>
) {
  const parsed = blockInputSchema.parse(input);
  const record = await requireResourceAdminScope(ctx, parsed.resourceId);

  const startAt = toUtcFromPortDateTime({
    dateKey: parsed.date,
    hour: Math.floor(parsed.startMinute / 60),
    minute: parsed.startMinute % 60,
    timeZone: record.timeZone,
  });
  const endAt = toUtcFromPortDateTime({
    dateKey: parsed.date,
    hour: Math.floor(parsed.endMinute / 60),
    minute: parsed.endMinute % 60,
    timeZone: record.timeZone,
  });

  if (endAt <= startAt) {
    throw new ServiceError("Block end must be after start", "INVALID");
  }

  const createdRows = await db
    .insert(resourceBlocks)
    .values({
      resourceId: parsed.resourceId,
      neighborhoodId: record.resource.neighborhoodId,
      startAt,
      endAt,
      reason: parsed.reason,
      reasonText: parsed.reasonText?.trim() || null,
      createdBy: ctx.user.id,
    })
    .returning();

  if (!createdRows[0]) {
    throw new ServiceError("Failed to create block", "INVALID");
  }

  return createdRows[0];
}

export async function updateResourceBlock(
  ctx: ServiceContext,
  input: z.input<typeof updateBlockSchema>
) {
  const parsed = updateBlockSchema.parse(input);

  const existingRows = await db
    .select()
    .from(resourceBlocks)
    .where(eq(resourceBlocks.id, parsed.blockId))
    .limit(1);

  if (!existingRows[0]) {
    throw new ServiceError("Block not found", "NOT_FOUND");
  }

  const record = await requireResourceAdminScope(ctx, existingRows[0].resourceId);

  if (parsed.resourceId !== existingRows[0].resourceId) {
    throw new ServiceError("Changing the block resource is not supported", "INVALID");
  }

  const startAt = toUtcFromPortDateTime({
    dateKey: parsed.date,
    hour: Math.floor(parsed.startMinute / 60),
    minute: parsed.startMinute % 60,
    timeZone: record.timeZone,
  });
  const endAt = toUtcFromPortDateTime({
    dateKey: parsed.date,
    hour: Math.floor(parsed.endMinute / 60),
    minute: parsed.endMinute % 60,
    timeZone: record.timeZone,
  });

  if (endAt <= startAt) {
    throw new ServiceError("Block end must be after start", "INVALID");
  }

  const updatedRows = await db
    .update(resourceBlocks)
    .set({
      startAt,
      endAt,
      reason: parsed.reason,
      reasonText: parsed.reasonText?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(resourceBlocks.id, parsed.blockId))
    .returning();

  if (!updatedRows[0]) {
    throw new ServiceError("Block not found", "NOT_FOUND");
  }

  return updatedRows[0];
}

export async function removeResourceBlock(
  ctx: ServiceContext,
  input: z.input<typeof removeBlockSchema>
) {
  const { blockId } = removeBlockSchema.parse(input);

  const existingRows = await db
    .select()
    .from(resourceBlocks)
    .where(eq(resourceBlocks.id, blockId))
    .limit(1);

  if (!existingRows[0]) {
    throw new ServiceError("Block not found", "NOT_FOUND");
  }

  await requireResourceAdminScope(ctx, existingRows[0].resourceId);
  await db.delete(resourceBlocks).where(eq(resourceBlocks.id, blockId));

  return { blockId };
}

export async function getResourcesStats(
  ctx: ServiceContext,
  input: { neighborhoodId?: string } = {}
) {
  const parsed = z.object({ neighborhoodId: idSchema.optional() }).parse(input);
  const neighborhoodId = parsed.neighborhoodId ?? ctx.user.activeNeighborhoodId ?? undefined;

  if (!neighborhoodId) {
    return { active: 0, inactive: 0, reserved: 0 };
  }

  await requireNeighborhoodMember(ctx, neighborhoodId);

  const [resourceRows, reservedRows] = await Promise.all([
    db
      .select({
        status: resources.status,
        total: count(),
      })
      .from(resources)
      .where(eq(resources.neighborhoodId, neighborhoodId))
      .groupBy(resources.status),
    db
      .select({ total: count() })
      .from(resourceReservations)
      .where(
        and(
          eq(resourceReservations.neighborhoodId, neighborhoodId),
          eq(resourceReservations.status, "approved"),
          gte(resourceReservations.endAt, new Date())
        )
      ),
  ]);

  return {
    active: Number(resourceRows.find((row) => row.status === "active")?.total ?? 0),
    inactive: Number(resourceRows.find((row) => row.status === "inactive")?.total ?? 0),
    reserved: Number(reservedRows[0]?.total ?? 0),
  };
}

export async function getNeighborhoodBlocksPageData(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodResourcesSchema>
) {
  const { neighborhoodId } = listNeighborhoodResourcesSchema.parse(input);
  const [resourceList, blocks] = await Promise.all([
    listNeighborhoodResources(ctx, { neighborhoodId }),
    listNeighborhoodBlocks(ctx, { neighborhoodId }),
  ]);

  return {
    resources: resourceList,
    blocks,
  };
}
