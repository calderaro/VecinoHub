import { and, count, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { groupMemberships, groups, users } from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin, requireGroupAdminOrAdmin } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema } from "./validators";

const createGroupSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  adminUserId: idSchema,
});

export async function createGroup(
  ctx: ServiceContext,
  input: z.input<typeof createGroupSchema>
) {
  requireAdmin(ctx);
  const { name, address, adminUserId } = createGroupSchema.parse(input);

  const admin = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, adminUserId))
    .limit(1);

  if (!admin[0]) {
    throw new ServiceError("Admin user not found", "NOT_FOUND");
  }

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(groups)
      .values({ name, address, adminUserId })
      .returning();

    const group = created[0];
    if (!group) {
      throw new ServiceError("Failed to create group", "INVALID");
    }

    await tx
      .insert(groupMemberships)
      .values({ groupId: group.id, userId: adminUserId })
      .onConflictDoNothing();

    return group;
  });
}

const updateGroupSchema = z.object({
  groupId: idSchema,
  name: z.string().min(1).optional(),
  address: z.string().optional(),
});

export async function updateGroup(
  ctx: ServiceContext,
  input: z.input<typeof updateGroupSchema>
) {
  requireAdmin(ctx);
  const { groupId, name, address } = updateGroupSchema.parse(input);

  const updated = await db
    .update(groups)
    .set({ name, address })
    .where(eq(groups.id, groupId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return updated[0];
}

const deleteGroupSchema = z.object({
  groupId: idSchema,
});

export async function deleteGroup(
  ctx: ServiceContext,
  input: z.input<typeof deleteGroupSchema>
) {
  requireAdmin(ctx);
  const { groupId } = deleteGroupSchema.parse(input);

  const deleted = await db
    .delete(groups)
    .where(eq(groups.id, groupId))
    .returning();

  if (!deleted[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return deleted[0];
}

const assignGroupAdminSchema = z.object({
  groupId: idSchema,
  adminUserId: idSchema,
});

export async function assignGroupAdmin(
  ctx: ServiceContext,
  input: z.input<typeof assignGroupAdminSchema>
) {
  requireAdmin(ctx);
  const { groupId, adminUserId } = assignGroupAdminSchema.parse(input);

  const updated = await db
    .update(groups)
    .set({ adminUserId })
    .where(eq(groups.id, groupId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  await db
    .insert(groupMemberships)
    .values({ groupId, userId: adminUserId })
    .onConflictDoNothing();

  return updated[0];
}

const addMemberSchema = z
  .object({
    groupId: idSchema,
    userId: idSchema.optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "User id or email is required",
    path: ["userId"],
  });

export async function addMember(
  ctx: ServiceContext,
  input: z.input<typeof addMemberSchema>
) {
  const { groupId, userId, email } = addMemberSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(ilike(users.email, email))
      .limit(1);

    if (!user[0]) {
      throw new ServiceError("User not found", "NOT_FOUND");
    }
    resolvedUserId = user[0].id;
  }

  if (!resolvedUserId) {
    throw new ServiceError("User is required", "INVALID");
  }

  const membership = await db
    .insert(groupMemberships)
    .values({ groupId, userId: resolvedUserId })
    .onConflictDoNothing()
    .returning();

  if (!membership[0]) {
    return { groupId, userId: resolvedUserId };
  }

  return membership[0];
}

const removeMemberSchema = z.object({
  groupId: idSchema,
  userId: idSchema,
});

export async function removeMember(
  ctx: ServiceContext,
  input: z.input<typeof removeMemberSchema>
) {
  const { groupId, userId } = removeMemberSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);

  const removed = await db
    .delete(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      )
    )
    .returning();

  if (!removed[0]) {
    throw new ServiceError("Membership not found", "NOT_FOUND");
  }

  return removed[0];
}

export async function listUserGroups(ctx: ServiceContext) {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      address: groups.address,
      adminUserId: groups.adminUserId,
    })
    .from(groups)
    .innerJoin(
      groupMemberships,
      eq(groups.id, groupMemberships.groupId)
    )
    .where(eq(groupMemberships.userId, ctx.user.id));
}

export async function listAllGroups(ctx: ServiceContext) {
  requireAdmin(ctx);
  return db.select().from(groups);
}

const listGroupsPagedSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listGroupsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listGroupsPagedSchema>
) {
  const { query, limit, offset } = listGroupsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;

  if (ctx.user.role === "admin") {
    const filters = search ? ilike(groups.name, search) : undefined;
    const items = await db
      .select()
      .from(groups)
      .where(filters)
      .limit(limit)
      .offset(offset);
    const totalResult = await db
      .select({ value: count() })
      .from(groups)
      .where(filters);

    return { items, total: Number(totalResult[0]?.value ?? 0) };
  }

  const filters = [
    eq(groupMemberships.userId, ctx.user.id),
    search ? ilike(groups.name, search) : undefined,
  ].filter(Boolean);

  const items = await db
    .select({
      id: groups.id,
      name: groups.name,
      address: groups.address,
      adminUserId: groups.adminUserId,
    })
    .from(groups)
    .innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
    .where(and(...(filters as [typeof groupMemberships.userId, ...unknown[]])))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({ value: count() })
    .from(groups)
    .innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
    .where(and(...(filters as [typeof groupMemberships.userId, ...unknown[]])));

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const listGroupMembersSchema = z.object({
  groupId: idSchema,
});

export async function listGroupMembers(
  ctx: ServiceContext,
  input: z.input<typeof listGroupMembersSchema>
) {
  const { groupId } = listGroupMembersSchema.parse(input);

  if (ctx.user.role !== "admin") {
    const membership = await db
      .select({ id: groupMemberships.id })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!membership[0]) {
      throw new ServiceError("Membership required", "FORBIDDEN");
    }
  }

  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      image: users.image,
      role: users.role,
      status: users.status,
    })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(eq(groupMemberships.groupId, groupId));
}

const getGroupSchema = z.object({ groupId: idSchema });

export async function getGroupById(
  ctx: ServiceContext,
  input: z.input<typeof getGroupSchema>
) {
  const { groupId } = getGroupSchema.parse(input);

  if (ctx.user.role !== "admin") {
    const membership = await db
      .select({ id: groupMemberships.id })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, ctx.user.id)
        )
      )
      .limit(1);

    if (!membership[0]) {
      throw new ServiceError("Membership required", "FORBIDDEN");
    }
  }

  const group = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return group[0];
}
