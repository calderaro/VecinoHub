import { and, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { events, neighborhoods, users } from "@/db/schema";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  listNeighborhoodAdminIdsForUser,
  listNeighborhoodIdsForUser,
  requireNeighborhoodAdminOrPlatform,
  requirePlatformAdmin,
} from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, paginationSchema } from "./validators";

function combineFilters<T>(filters: Array<T | undefined>) {
  const filtered = filters.filter((filter): filter is T => Boolean(filter));
  if (filtered.length === 0) {
    return undefined;
  }

  const [first, ...rest] = filtered;
  return and(first as never, ...(rest as never[]));
}

async function requireNeighborhoodAdminScope(ctx: ServiceContext) {
  if (isPlatformAdmin(ctx)) {
    return null;
  }

  const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
  if (!neighborhoodAdminIds || neighborhoodAdminIds.length === 0) {
    throw new ServiceError("Admin access required", "FORBIDDEN");
  }

  return neighborhoodAdminIds;
}

async function getEventScope(eventId: string) {
  const event = await db
    .select({ neighborhoodId: events.neighborhoodId })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event[0]) {
    throw new ServiceError("Event not found", "NOT_FOUND");
  }

  return event[0];
}

async function requireEventAdminScope(ctx: ServiceContext, eventId: string) {
  const event = await getEventScope(eventId);
  if (!event.neighborhoodId) {
    requirePlatformAdmin(ctx);
    return event;
  }

  await requireNeighborhoodAdminOrPlatform(ctx, event.neighborhoodId);
  return event;
}

const createEventSchema = z
  .object({
    neighborhoodId: idSchema.optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    startsAt: z.date(),
    endsAt: z.date().optional(),
    location: z.string().optional(),
  })
  .refine((data) => !data.endsAt || data.endsAt >= data.startsAt, {
    message: "Event end time must be after the start time.",
    path: ["endsAt"],
  });

export async function createEvent(
  ctx: ServiceContext,
  input: z.input<typeof createEventSchema>
) {
  const { neighborhoodId, title, description, startsAt, endsAt, location } =
    createEventSchema.parse(input);
  let resolvedNeighborhoodId = neighborhoodId;
  if (!resolvedNeighborhoodId) {
    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    resolvedNeighborhoodId = neighborhoodAdminIds?.[0];
  }
  if (!resolvedNeighborhoodId && isPlatformAdmin(ctx)) {
    const firstNeighborhood = await db.select({ id: neighborhoods.id }).from(neighborhoods).limit(1);
    resolvedNeighborhoodId = firstNeighborhood[0]?.id;
  }
  if (!resolvedNeighborhoodId) {
    throw new ServiceError("Neighborhood is required", "INVALID");
  }

  await requireNeighborhoodAdminOrPlatform(ctx, resolvedNeighborhoodId);

  const created = await db
    .insert(events)
    .values({
      neighborhoodId: resolvedNeighborhoodId,
      title: title.trim(),
      description: description?.trim() || null,
      startsAt,
      endsAt: endsAt ?? null,
      location: location?.trim() || null,
      createdBy: ctx.user.id,
    })
    .returning();

  if (!created[0]) {
    throw new ServiceError("Failed to create event", "INVALID");
  }

  return created[0];
}

const updateEventSchema = z
  .object({
    eventId: idSchema,
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    startsAt: z.date().optional(),
    endsAt: z.date().nullable().optional(),
    location: z.string().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.startsAt !== undefined ||
      data.endsAt !== undefined ||
      data.location !== undefined,
    {
      message: "Event updates require at least one field.",
    }
  )
  .refine(
    (data) =>
      data.startsAt === undefined ||
      data.endsAt === undefined ||
      data.endsAt === null ||
      data.endsAt >= data.startsAt,
    {
      message: "Event end time must be after the start time.",
      path: ["endsAt"],
    }
  );

export async function updateEvent(
  ctx: ServiceContext,
  input: z.input<typeof updateEventSchema>
) {
  const { eventId, title, description, startsAt, endsAt, location } =
    updateEventSchema.parse(input);
  await requireEventAdminScope(ctx, eventId);

  const updates: Partial<typeof events.$inferInsert> = {};
  if (title !== undefined) {
    updates.title = title.trim();
  }
  if (description !== undefined) {
    updates.description = description.trim() || null;
  }
  if (startsAt !== undefined) {
    updates.startsAt = startsAt;
  }
  if (endsAt !== undefined) {
    updates.endsAt = endsAt ?? null;
  }
  if (location !== undefined) {
    updates.location = location.trim() || null;
  }

  const updated = await db
    .update(events)
    .set(updates)
    .where(eq(events.id, eventId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Event not found", "NOT_FOUND");
  }

  return updated[0];
}

const listEventsPagedSchema = paginationSchema.unwrap().extend({
  neighborhoodId: idSchema.optional(),
  query: z.string().optional(),
});

export async function listEventsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listEventsPagedSchema>
) {
  const { neighborhoodId, query, limit, offset } = listEventsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(
        ilike(events.title, search),
        ilike(events.description, search),
        ilike(events.location, search)
      )
    : undefined;

  let scopeFilter = neighborhoodId ? eq(events.neighborhoodId, neighborhoodId) : undefined;
  if (!isPlatformAdmin(ctx)) {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      return { items: [], total: 0 };
    }
    scopeFilter = scopeFilter
      ? and(scopeFilter, inArray(events.neighborhoodId, neighborhoodIds))
      : inArray(events.neighborhoodId, neighborhoodIds);
  }

  const combinedFilter = combineFilters([searchFilter, scopeFilter]);

  const rows = await db
    .select({
      event: events,
      creatorName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(combinedFilter)
    .orderBy(events.startsAt)
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row.event,
    creatorName: row.creatorName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(events)
    .where(combinedFilter);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const getEventSchema = z.object({
  eventId: idSchema,
});

export async function getEventById(
  ctx: ServiceContext,
  input: z.input<typeof getEventSchema>
) {
  const { eventId } = getEventSchema.parse(input);

  const rows = await db
    .select({
      event: events,
      creatorName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(eq(events.id, eventId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new ServiceError("Event not found", "NOT_FOUND");
  }

  if (!isPlatformAdmin(ctx)) {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || !row.event.neighborhoodId || !neighborhoodIds.includes(row.event.neighborhoodId)) {
      throw new ServiceError("Event not found", "NOT_FOUND");
    }
  }

  return {
    ...row.event,
    creatorName: row.creatorName,
  };
}

const removeEventSchema = z.object({
  eventId: idSchema,
});

export async function removeEvent(
  ctx: ServiceContext,
  input: z.input<typeof removeEventSchema>
) {
  const { eventId } = removeEventSchema.parse(input);
  await requireEventAdminScope(ctx, eventId);

  const removed = await db
    .delete(events)
    .where(eq(events.id, eventId))
    .returning();

  if (!removed[0]) {
    throw new ServiceError("Event not found", "NOT_FOUND");
  }

  return removed[0];
}

export async function listUpcomingEvents(ctx: ServiceContext, limit = 6) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const now = new Date();

  const rows = await db
    .select({
      event: events,
      creatorName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(
      isPlatformAdmin(ctx)
        ? sql`${events.startsAt} >= ${now}`
        : and(
            sql`${events.startsAt} >= ${now}`,
            inArray(events.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    )
    .orderBy(events.startsAt)
    .limit(limit);

  return rows.map((row) => ({
    ...row.event,
    creatorName: row.creatorName,
  }));
}

export async function getEventsStats(ctx: ServiceContext) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const now = new Date();

  const upcomingResult = await db
    .select({ value: count() })
    .from(events)
    .where(
      isPlatformAdmin(ctx)
        ? sql`${events.startsAt} >= ${now}`
        : and(
            sql`${events.startsAt} >= ${now}`,
            inArray(events.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    );

  const totalResult = await db
    .select({ value: count() })
    .from(events)
    .where(
      isPlatformAdmin(ctx)
        ? undefined
        : inArray(events.neighborhoodId, neighborhoodAdminIds ?? [])
    );

  return {
    upcoming: Number(upcomingResult[0]?.value ?? 0),
    total: Number(totalResult[0]?.value ?? 0),
  };
}
