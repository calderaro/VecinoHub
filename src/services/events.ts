import { count, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { events, users } from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, paginationSchema } from "./validators";

const createEventSchema = z
  .object({
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
  requireAdmin(ctx);
  const { title, description, startsAt, endsAt, location } =
    createEventSchema.parse(input);

  const created = await db
    .insert(events)
    .values({
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
  requireAdmin(ctx);
  const { eventId, title, description, startsAt, endsAt, location } =
    updateEventSchema.parse(input);

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
  query: z.string().optional(),
});

export async function listEventsPaged(
  _ctx: ServiceContext,
  input: z.input<typeof listEventsPagedSchema>
) {
  const { query, limit, offset } = listEventsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(
        ilike(events.title, search),
        ilike(events.description, search),
        ilike(events.location, search)
      )
    : undefined;

  const rows = await db
    .select({
      event: events,
      creatorName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(searchFilter)
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
    .where(searchFilter);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const getEventSchema = z.object({
  eventId: idSchema,
});

export async function getEventById(
  _ctx: ServiceContext,
  input: z.input<typeof getEventSchema>
) {
  const { eventId } = getEventSchema.parse(input);

  const event = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event[0]) {
    throw new ServiceError("Event not found", "NOT_FOUND");
  }

  return event[0];
}

const removeEventSchema = z.object({
  eventId: idSchema,
});

export async function removeEvent(
  ctx: ServiceContext,
  input: z.input<typeof removeEventSchema>
) {
  requireAdmin(ctx);
  const { eventId } = removeEventSchema.parse(input);

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
  requireAdmin(ctx);
  const now = new Date();

  const rows = await db
    .select({
      event: events,
      creatorName: users.name,
    })
    .from(events)
    .leftJoin(users, eq(events.createdBy, users.id))
    .where(sql`${events.startsAt} >= ${now}`)
    .orderBy(events.startsAt)
    .limit(limit);

  return rows.map((row) => ({
    ...row.event,
    creatorName: row.creatorName,
  }));
}

export async function getEventsStats(ctx: ServiceContext) {
  requireAdmin(ctx);
  const now = new Date();

  const upcomingResult = await db
    .select({ value: count() })
    .from(events)
    .where(sql`${events.startsAt} >= ${now}`);

  const totalResult = await db.select({ value: count() }).from(events);

  return {
    upcoming: Number(upcomingResult[0]?.value ?? 0),
    total: Number(totalResult[0]?.value ?? 0),
  };
}
