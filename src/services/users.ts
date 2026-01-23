import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, roleSchema, statusSchema, usernameSchema } from "./validators";

const listUsersSchema = z
  .object({
    limit: z.number().int().positive().max(100).default(50),
    offset: z.number().int().min(0).default(0),
  })
  .default({ limit: 50, offset: 0 });

export async function listUsers(ctx: ServiceContext, input?: z.input<typeof listUsersSchema>) {
  requireAdmin(ctx);
  const { limit, offset } = listUsersSchema.parse(input ?? {});

  return db.select().from(users).limit(limit).offset(offset);
}

const listUsersPagedSchema = z.object({
  query: z.string().optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listUsersPaged(
  ctx: ServiceContext,
  input: z.input<typeof listUsersPagedSchema>
) {
  requireAdmin(ctx);
  const { query, role, status, limit, offset } = listUsersPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(
        ilike(users.name, search),
        ilike(users.email, search),
        ilike(users.username, search)
      )
    : undefined;
  const roleFilter = role ? eq(users.role, role) : undefined;
  const statusFilter = status ? eq(users.status, status) : undefined;
  const combinedFilter =
    searchFilter && roleFilter && statusFilter
      ? and(searchFilter, roleFilter, statusFilter)
      : searchFilter && roleFilter
        ? and(searchFilter, roleFilter)
        : searchFilter && statusFilter
          ? and(searchFilter, statusFilter)
          : roleFilter && statusFilter
            ? and(roleFilter, statusFilter)
            : (searchFilter ?? roleFilter ?? statusFilter);

  const items = await db
    .select()
    .from(users)
    .where(combinedFilter)
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(users)
    .where(combinedFilter);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const updateRoleSchema = z.object({
  userId: idSchema,
  role: roleSchema,
});

export async function updateUserRole(
  ctx: ServiceContext,
  input: z.input<typeof updateRoleSchema>
) {
  requireAdmin(ctx);
  const { userId, role } = updateRoleSchema.parse(input);

  const updated = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return updated[0];
}

const updateStatusSchema = z.object({
  userId: idSchema,
  status: statusSchema,
});

export async function updateUserStatus(
  ctx: ServiceContext,
  input: z.input<typeof updateStatusSchema>
) {
  requireAdmin(ctx);
  const { userId, status } = updateStatusSchema.parse(input);

  const updated = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, userId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return updated[0];
}

export async function getUserProfile(ctx: ServiceContext) {
  const profile = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      image: users.image,
      role: users.role,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, ctx.user.id))
    .limit(1);

  if (!profile[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return profile[0];
}

const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    image: z.string().url().max(2048).nullable().optional(),
  })
  .refine((data) => data.username !== undefined || data.image !== undefined, {
    message: "Profile updates require a username or image.",
  });

export async function updateUserProfile(
  ctx: ServiceContext,
  input: z.input<typeof updateProfileSchema>
) {
  const { username, image } = updateProfileSchema.parse(input);

  if (username) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`lower(${users.username}) = lower(${username})`,
          sql`${users.id} <> ${ctx.user.id}`
        )
      )
      .limit(1);

    if (existing[0]) {
      throw new ServiceError("Username already in use.", "INVALID");
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (username !== undefined) {
    updates.username = username;
  }
  if (image !== undefined) {
    updates.image = image;
  }

  const updated = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, ctx.user.id))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return updated[0];
}
