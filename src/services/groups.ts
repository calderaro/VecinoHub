import { and, count, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { groupMemberships, groups, neighborhoodMemberships, neighborhoods, users } from "@/db/schema";

import { ServiceError } from "./errors";
import {
  applyNeighborhoodScopeToGroupIds,
  isPlatformAdmin,
  listNeighborhoodAdminIdsForUser,
  listNeighborhoodIdsForUser,
  requireGroupAdminOrAdmin,
  requireNeighborhoodAdminOrPlatform,
  requirePlatformAdmin,
  resolveGroupAccess,
} from "./guards";
import type { ServiceContext } from "./types";
import { idSchema } from "./validators";

const createGroupSchema = z.object({
  neighborhoodId: idSchema.optional(),
  name: z.string().min(1),
  address: z.string().optional(),
  adminUserId: idSchema,
});

export async function createGroup(
  ctx: ServiceContext,
  input: z.input<typeof createGroupSchema>
) {
  const { neighborhoodId, name, address, adminUserId } = createGroupSchema.parse(input);
  let resolvedNeighborhoodId = neighborhoodId ?? ctx.user.activeNeighborhoodId ?? undefined;
  if (!resolvedNeighborhoodId) {
    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    resolvedNeighborhoodId = neighborhoodAdminIds?.[0];
  }

  if (!resolvedNeighborhoodId) {
    if (isPlatformAdmin(ctx)) {
      const firstNeighborhood = await db.select({ id: neighborhoods.id }).from(neighborhoods).limit(1);
      resolvedNeighborhoodId = firstNeighborhood[0]?.id;
    }
  }

  if (!resolvedNeighborhoodId) {
    throw new ServiceError("Neighborhood is required", "INVALID");
  }

  await requireNeighborhoodAdminOrPlatform(ctx, resolvedNeighborhoodId);

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
      .values({ neighborhoodId: resolvedNeighborhoodId, name, address, adminUserId })
      .returning();

    const group = created[0];
    if (!group) {
      throw new ServiceError("Failed to create group", "INVALID");
    }

    await tx
      .insert(groupMemberships)
      .values({ groupId: group.id, userId: adminUserId })
      .onConflictDoNothing();

    await tx
      .insert(neighborhoodMemberships)
      .values({
        neighborhoodId: resolvedNeighborhoodId,
        userId: adminUserId,
        role: "neighbor",
        status: "active",
      })
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
  const { groupId, name, address } = updateGroupSchema.parse(input);
  const group = await resolveGroupAccess(ctx, groupId);
  if (!group.neighborhoodId) {
    requirePlatformAdmin(ctx);
  } else {
    await requireNeighborhoodAdminOrPlatform(ctx, group.neighborhoodId);
  }

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
  const { groupId } = deleteGroupSchema.parse(input);
  const group = await resolveGroupAccess(ctx, groupId);
  if (!group.neighborhoodId) {
    requirePlatformAdmin(ctx);
  } else {
    await requireNeighborhoodAdminOrPlatform(ctx, group.neighborhoodId);
  }

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
  const { groupId, adminUserId } = assignGroupAdminSchema.parse(input);
  const group = await resolveGroupAccess(ctx, groupId);
  if (!group.neighborhoodId) {
    requirePlatformAdmin(ctx);
  } else {
    await requireNeighborhoodAdminOrPlatform(ctx, group.neighborhoodId);
  }

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

  if (group.neighborhoodId) {
    await db
      .insert(neighborhoodMemberships)
      .values({
        neighborhoodId: group.neighborhoodId,
        userId: adminUserId,
        role: "neighbor",
        status: "active",
      })
      .onConflictDoNothing();
  }

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
  const group = await resolveGroupAccess(ctx, groupId);

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

  if (group.neighborhoodId) {
    await db
      .insert(neighborhoodMemberships)
      .values({
        neighborhoodId: group.neighborhoodId,
        userId: resolvedUserId,
        role: "neighbor",
        status: "active",
      })
      .onConflictDoNothing();
  }

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
  const neighborhoodFilter = ctx.user.activeNeighborhoodId
    ? eq(groups.neighborhoodId, ctx.user.activeNeighborhoodId)
    : undefined;

  return db
    .select({
      id: groups.id,
      neighborhoodId: groups.neighborhoodId,
      name: groups.name,
      address: groups.address,
      adminUserId: groups.adminUserId,
    })
    .from(groups)
    .innerJoin(
      groupMemberships,
      eq(groups.id, groupMemberships.groupId)
    )
    .where(
      and(
        eq(groupMemberships.userId, ctx.user.id),
        eq(groupMemberships.status, "active"),
        ...(neighborhoodFilter ? [neighborhoodFilter] : [])
      )
    );
}

export async function listAllGroups(ctx: ServiceContext) {
  requirePlatformAdmin(ctx);
  return db.select().from(groups);
}

const listGroupsPagedSchema = z.object({
  neighborhoodId: idSchema.optional(),
  query: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listGroupsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listGroupsPagedSchema>
) {
  const { neighborhoodId, query, limit, offset } = listGroupsPagedSchema.parse(input);
  const activeNeighborhoodId = ctx.user.activeNeighborhoodId ?? undefined;
  const neighborhoodScopeId = neighborhoodId ?? activeNeighborhoodId;
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search ? ilike(groups.name, search) : undefined;
  const neighborhoodFilter = neighborhoodScopeId
    ? eq(groups.neighborhoodId, neighborhoodScopeId)
    : undefined;
  const scopedFilters =
    searchFilter && neighborhoodFilter
      ? and(searchFilter, neighborhoodFilter)
      : (searchFilter ?? neighborhoodFilter);

  if (isPlatformAdmin(ctx)) {
    const rows = await db
      .select({
        group: groups,
        adminName: users.name,
      })
      .from(groups)
      .leftJoin(users, eq(groups.adminUserId, users.id))
      .where(scopedFilters)
      .limit(limit)
      .offset(offset);
    const items = rows.map((row) => ({
      ...row.group,
      adminName: row.adminName,
    }));
    const totalResult = await db
      .select({ value: count() })
      .from(groups)
      .where(scopedFilters);

    return { items, total: Number(totalResult[0]?.value ?? 0) };
  }

  const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
  if (!neighborhoodIds || neighborhoodIds.length === 0) {
    return { items: [], total: 0 };
  }
  const membershipFilter = inArray(groups.neighborhoodId, neighborhoodIds);
  const combinedFilter = scopedFilters
    ? and(membershipFilter, scopedFilters)
    : membershipFilter;

  const items = await db
    .select({
      group: groups,
      adminName: users.name,
    })
    .from(groups)
    .leftJoin(users, eq(groups.adminUserId, users.id))
    .where(combinedFilter)
    .limit(limit)
    .offset(offset);

  const normalizedItems = items.map((row) => ({
    ...row.group,
    adminName: row.adminName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(groups)
    .where(combinedFilter);

  return { items: normalizedItems, total: Number(totalResult[0]?.value ?? 0) };
}

const groupMemberCountsSchema = z.object({
  groupIds: z.array(idSchema).max(200),
});

export async function getGroupMemberCounts(
  ctx: ServiceContext,
  input: z.input<typeof groupMemberCountsSchema>
) {
  const { groupIds } = groupMemberCountsSchema.parse(input);
  const allowedGroupIds = await applyNeighborhoodScopeToGroupIds(ctx, groupIds);

  if (allowedGroupIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      groupId: groupMemberships.groupId,
      total: count(),
    })
    .from(groupMemberships)
    .where(inArray(groupMemberships.groupId, allowedGroupIds))
    .groupBy(groupMemberships.groupId);

  return new Map(rows.map((row) => [row.groupId, Number(row.total)]));
}

const listGroupMembersSchema = z.object({
  groupId: idSchema,
});

export async function listGroupMembers(
  ctx: ServiceContext,
  input: z.input<typeof listGroupMembersSchema>
) {
  const { groupId } = listGroupMembersSchema.parse(input);
  const group = await resolveGroupAccess(ctx, groupId);
  if (!isPlatformAdmin(ctx)) {
    if (group.neighborhoodId) {
      const neighborhoodAdmin = await db
        .select({ id: neighborhoodMemberships.id })
        .from(neighborhoodMemberships)
        .where(
          and(
            eq(neighborhoodMemberships.userId, ctx.user.id),
            eq(neighborhoodMemberships.neighborhoodId, group.neighborhoodId),
            eq(neighborhoodMemberships.role, "neighborhood_admin"),
            eq(neighborhoodMemberships.status, "active")
          )
        )
        .limit(1);

      if (!neighborhoodAdmin[0]) {
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
    } else {
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
  const group = await resolveGroupAccess(ctx, groupId);
  if (!isPlatformAdmin(ctx)) {
    if (group.neighborhoodId) {
      const neighborhoodMembership = await db
        .select({ id: neighborhoodMemberships.id })
        .from(neighborhoodMemberships)
        .where(
          and(
            eq(neighborhoodMemberships.userId, ctx.user.id),
            eq(neighborhoodMemberships.neighborhoodId, group.neighborhoodId),
            eq(neighborhoodMemberships.status, "active")
          )
        )
        .limit(1);

      if (!neighborhoodMembership[0]) {
        throw new ServiceError("Membership required", "FORBIDDEN");
      }
    } else {
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
  }

  const rows = await db
    .select({
      group: groups,
      adminName: users.name,
    })
    .from(groups)
    .leftJoin(users, eq(groups.adminUserId, users.id))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return {
    ...rows[0].group,
    adminName: rows[0].adminName,
  };
}
