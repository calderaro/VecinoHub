import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { groupMemberships, groups, sessions, users } from "@/db/schema";
import { deleteUserSecondarySessions } from "@/server/secondary-storage";

import { ServiceError } from "./errors";
import { requireAdmin, requireNeighborhoodAdminOrPlatform } from "./guards";
import type { ServiceContext } from "./types";
import {
  idSchema,
  nameSchema,
  preferredLanguageSchema,
  roleSchema,
  statusSchema,
  usernameSchema,
} from "./validators";

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

const listNeighborhoodGroupUsersPagedSchema = z.object({
  neighborhoodId: idSchema,
  query: z.string().optional(),
  status: statusSchema.optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listNeighborhoodGroupUsersPaged(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodGroupUsersPagedSchema>
) {
  const { neighborhoodId, query, status, limit, offset } =
    listNeighborhoodGroupUsersPagedSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(
        ilike(users.name, search),
        ilike(users.email, search),
        ilike(users.username, search)
      )
    : undefined;
  const statusFilter = status ? eq(users.status, status) : undefined;
  const combinedFilter =
    searchFilter && statusFilter
      ? and(searchFilter, statusFilter)
      : (searchFilter ?? statusFilter);
  const scopedFilter = combinedFilter
    ? and(
        eq(groups.neighborhoodId, neighborhoodId),
        eq(groupMemberships.status, "active"),
        combinedFilter
      )
    : and(eq(groups.neighborhoodId, neighborhoodId), eq(groupMemberships.status, "active"));

  const items = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      image: users.image,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      groupCount: sql<number>`count(distinct ${groupMemberships.groupId})`,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .innerJoin(users, eq(groupMemberships.userId, users.id))
    .where(scopedFilter)
    .groupBy(
      users.id,
      users.name,
      users.username,
      users.email,
      users.image,
      users.status,
      users.createdAt,
      users.updatedAt
    )
    .orderBy(desc(users.updatedAt), desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const totalResult = await db
    .select({
      value: sql<number>`count(distinct ${users.id})`,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .innerJoin(users, eq(groupMemberships.userId, users.id))
    .where(scopedFilter);

  return {
    items: items.map((item) => ({
      ...item,
      groupCount: Number(item.groupCount ?? 0),
    })),
    total: Number(totalResult[0]?.value ?? 0),
  };
}

const userGroupCountsSchema = z.object({
  userIds: z.array(idSchema).max(200),
});

export async function getUserGroupCounts(
  ctx: ServiceContext,
  input: z.input<typeof userGroupCountsSchema>
) {
  requireAdmin(ctx);
  const { userIds } = userGroupCountsSchema.parse(input);

  if (userIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      userId: groupMemberships.userId,
      total: count(),
    })
    .from(groupMemberships)
    .where(inArray(groupMemberships.userId, userIds))
    .groupBy(groupMemberships.userId);

  return new Map(rows.map((row) => [row.userId, Number(row.total)]));
}

const getNeighborhoodUserByIdSchema = z.object({
  neighborhoodId: idSchema,
  userId: idSchema,
});

export async function getNeighborhoodUserById(
  ctx: ServiceContext,
  input: z.input<typeof getNeighborhoodUserByIdSchema>
) {
  const { neighborhoodId, userId } = getNeighborhoodUserByIdSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      username: users.username,
      image: users.image,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .innerJoin(users, eq(groupMemberships.userId, users.id))
    .where(and(eq(users.id, userId), eq(groups.neighborhoodId, neighborhoodId)))
    .groupBy(
      users.id,
      users.name,
      users.email,
      users.username,
      users.image,
      users.status,
      users.createdAt,
      users.updatedAt
    )
    .limit(1);
  const user = userRows[0];

  if (!user) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  const membershipTotals = await db
    .select({
      total: count(),
      active: sql<number>`coalesce(sum(case when ${groupMemberships.status} = 'active' then 1 else 0 end), 0)`,
      inactive: sql<number>`coalesce(sum(case when ${groupMemberships.status} = 'inactive' then 1 else 0 end), 0)`,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.userId, userId), eq(groups.neighborhoodId, neighborhoodId)));

  const managedTotals = await db
    .select({ total: count() })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(
      and(
        eq(groupMemberships.userId, userId),
        eq(groups.neighborhoodId, neighborhoodId),
        eq(groupMemberships.role, "group_admin"),
        eq(groupMemberships.status, "active")
      )
    );

  return {
    ...user,
    membershipsTotal: Number(membershipTotals[0]?.total ?? 0),
    membershipsActive: Number(membershipTotals[0]?.active ?? 0),
    membershipsInactive: Number(membershipTotals[0]?.inactive ?? 0),
    groupsManaged: Number(managedTotals[0]?.total ?? 0),
  };
}

const listNeighborhoodUserMembershipsSchema = z.object({
  neighborhoodId: idSchema,
  userId: idSchema,
  limit: z.number().int().positive().max(100).default(20),
});

export async function listNeighborhoodUserMemberships(
  ctx: ServiceContext,
  input: z.input<typeof listNeighborhoodUserMembershipsSchema>
) {
  const { neighborhoodId, userId, limit } = listNeighborhoodUserMembershipsSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  const rows = await db
    .select({
      membershipId: groupMemberships.id,
      membershipRole: groupMemberships.role,
      membershipStatus: groupMemberships.status,
      createdAt: groupMemberships.createdAt,
      groupId: groups.id,
      groupName: groups.name,
      groupAddress: groups.address,
    })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(and(eq(groupMemberships.userId, userId), eq(groups.neighborhoodId, neighborhoodId)))
    .orderBy(desc(groupMemberships.createdAt))
    .limit(limit);

  return rows;
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

  const updated = await db.transaction(async (tx) => {
    const userRows = await tx
      .update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();

    if (!userRows[0]) {
      return [];
    }

    if (status === "inactive") {
      await tx.delete(sessions).where(eq(sessions.userId, userId));
    }

    return userRows;
  });

  if (status === "inactive") {
    await deleteUserSecondarySessions(userId);
  }

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
      preferredLanguage: users.preferredLanguage,
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
    name: nameSchema.optional(),
    username: usernameSchema.optional(),
    image: z.string().url().max(2048).nullable().optional(),
    preferredLanguage: preferredLanguageSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.username !== undefined ||
      data.image !== undefined ||
      data.preferredLanguage !== undefined,
    {
      message: "Profile updates require a name, username, image, or language preference.",
    }
  );

export async function updateUserProfile(
  ctx: ServiceContext,
  input: z.input<typeof updateProfileSchema>
) {
  const { name, username, image, preferredLanguage } = updateProfileSchema.parse(input);

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
  if (name !== undefined) {
    updates.name = name;
  }
  if (username !== undefined) {
    updates.username = username;
  }
  if (image !== undefined) {
    updates.image = image;
  }
  if (preferredLanguage !== undefined) {
    updates.preferredLanguage = preferredLanguage;
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
