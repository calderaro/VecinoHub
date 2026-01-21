import { and, count, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, roleSchema, statusSchema } from "./validators";

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
  const filters = [
    search ? ilike(users.name, search) : undefined,
    role ? eq(users.role, role) : undefined,
    status ? eq(users.status, status) : undefined,
  ].filter(Boolean);

  const items = await db
    .select()
    .from(users)
    .where(filters.length ? and(...(filters as [typeof users.role, ...unknown[]])) : undefined)
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(users)
    .where(filters.length ? and(...(filters as [typeof users.role, ...unknown[]])) : undefined);

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
