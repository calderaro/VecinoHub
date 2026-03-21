import { and, count, eq, ilike, inArray, sql } from "drizzle-orm";
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
  requireGroupMember,
  requireNeighborhoodMember,
  requireNeighborhoodAdminOrPlatform,
  requirePlatformAdmin,
  resolveGroupAccess,
} from "./guards";
import {
  ensureResidentNeighborhoodMembership,
  syncResidentNeighborhoodMembership,
} from "./resident-neighborhoods";
import type { ServiceContext } from "./types";
import { groupRoleSchema, idSchema } from "./validators";

const createGroupSchema = z.object({
  neighborhoodId: idSchema.optional(),
  name: z.string().min(1),
  address: z.string().optional(),
  adminEmail: z.string().email().optional(),
  adminUserId: idSchema.optional(),
});

async function assertUserExists(userId: string) {
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }
}

async function resolveUserIdByEmail(email: string) {
  const normalizedEmail = email.trim();
  const user = await db
    .select({ id: users.id })
    .from(users)
    .where(ilike(users.email, normalizedEmail))
    .limit(1);

  if (!user[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return user[0].id;
}

async function listGroupAdminSummaries(groupIds: string[]) {
  const summaries = new Map<
    string,
    {
      adminUserIds: string[];
      adminNames: string[];
      adminLabel: string | null;
    }
  >();

  if (groupIds.length === 0) {
    return summaries;
  }

  const rows = await db
    .select({
      groupId: groupMemberships.groupId,
      userId: users.id,
      name: users.name,
    })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(
      and(
        inArray(groupMemberships.groupId, groupIds),
        eq(groupMemberships.role, "group_admin"),
        eq(groupMemberships.status, "active")
      )
    );

  for (const row of rows) {
    const current = summaries.get(row.groupId) ?? {
      adminUserIds: [],
      adminNames: [],
      adminLabel: null,
    };

    if (!current.adminUserIds.includes(row.userId)) {
      current.adminUserIds.push(row.userId);
    }

    if (row.name && !current.adminNames.includes(row.name)) {
      current.adminNames.push(row.name);
    }

    current.adminLabel =
      current.adminNames.length > 0
        ? current.adminNames.join(", ")
        : current.adminUserIds.join(", ");

    summaries.set(row.groupId, current);
  }

  return summaries;
}

async function getViewerGroupAccess(
  ctx: ServiceContext,
  groupId: string,
  neighborhoodId: string
) {
  if (!isPlatformAdmin(ctx)) {
    await requireNeighborhoodMember(ctx, neighborhoodId);
  }

  const membership = await db
    .select({
      role: groupMemberships.role,
      status: groupMemberships.status,
    })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, ctx.user.id),
        eq(groupMemberships.status, "active")
      )
    )
    .limit(1);

  const viewerMembershipRole = membership[0]?.role ?? null;

  if (isPlatformAdmin(ctx)) {
    return {
      viewerMembershipRole,
      viewerCanManage: true,
    };
  }

  const neighborhoodAdmin = await db
    .select({ id: neighborhoodMemberships.id })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.userId, ctx.user.id),
        eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
        eq(neighborhoodMemberships.role, "neighborhood_admin"),
        eq(neighborhoodMemberships.status, "active")
      )
    )
    .limit(1);

  if (!viewerMembershipRole && !neighborhoodAdmin[0]) {
    throw new ServiceError("Membership required", "FORBIDDEN");
  }

  return {
    viewerMembershipRole,
    viewerCanManage:
      Boolean(neighborhoodAdmin[0]) || viewerMembershipRole === "group_admin",
  };
}

export async function createGroup(
  ctx: ServiceContext,
  input: z.input<typeof createGroupSchema>
) {
  const { neighborhoodId, name, address, adminEmail, adminUserId } = createGroupSchema.parse(input);
  let resolvedNeighborhoodId = neighborhoodId ?? ctx.user.activeNeighborhoodId ?? undefined;
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

  let resolvedAdminUserId: string | undefined;
  if (adminUserId) {
    await assertUserExists(adminUserId);
    resolvedAdminUserId = adminUserId;
  } else if (adminEmail) {
    resolvedAdminUserId = await resolveUserIdByEmail(adminEmail);
  }

  return db.transaction(async (tx) => {
    const created = await tx
      .insert(groups)
      .values({ neighborhoodId: resolvedNeighborhoodId, name, address })
      .returning();

    const group = created[0];
    if (!group) {
      throw new ServiceError("Failed to create group", "INVALID");
    }

    if (resolvedAdminUserId) {
      await tx.insert(groupMemberships).values({
        groupId: group.id,
        userId: resolvedAdminUserId,
        role: "group_admin",
        status: "active",
      });

      await ensureResidentNeighborhoodMembership(
        tx,
        resolvedNeighborhoodId,
        resolvedAdminUserId
      );
    }

    return {
      ...group,
      adminUserIds: resolvedAdminUserId ? [resolvedAdminUserId] : [],
      adminNames: [],
      adminLabel: null,
      viewerMembershipRole: null,
      viewerCanManage: true,
    };
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
  await requireGroupAdminOrAdmin(ctx, groupId);

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
  await requireGroupAdminOrAdmin(ctx, groupId);

  const group = await resolveGroupAccess(ctx, groupId);

  const deleted = await db.transaction(async (tx) => {
    const memberships = await tx
      .select({ userId: groupMemberships.userId })
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));

    await tx.delete(groupMemberships).where(eq(groupMemberships.groupId, groupId));

    const deletedGroup = await tx
      .delete(groups)
      .where(eq(groups.id, groupId))
      .returning();

    for (const membership of memberships) {
      await syncResidentNeighborhoodMembership(
        tx,
        group.neighborhoodId,
        membership.userId
      );
    }

    return deletedGroup;
  });

  if (!deleted[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return deleted[0];
}

const setGroupMemberRoleSchema = z.object({
  groupId: idSchema,
  userId: idSchema,
  role: groupRoleSchema,
});

export async function setGroupMemberRole(
  ctx: ServiceContext,
  input: z.input<typeof setGroupMemberRoleSchema>
) {
  const { groupId, userId, role } = setGroupMemberRoleSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);

  const group = await resolveGroupAccess(ctx, groupId);
  await assertUserExists(userId);

  const existing = await db
    .select({
      id: groupMemberships.id,
      role: groupMemberships.role,
      status: groupMemberships.status,
    })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId)
      )
    )
    .limit(1);

  if (
    userId === ctx.user.id &&
    role !== "group_admin" &&
    existing[0]?.role === "group_admin" &&
    existing[0]?.status === "active"
  ) {
    const activeAdminCount = await countActiveGroupAdmins(groupId);
    if (activeAdminCount <= 1) {
      throw new ServiceError(
        "Assign another group admin before leaving the group",
        "FORBIDDEN"
      );
    }
  }

  const updated = existing[0]
    ? await db
        .update(groupMemberships)
        .set({ role, status: "active", updatedAt: new Date() })
        .where(eq(groupMemberships.id, existing[0].id))
        .returning()
    : await db
        .insert(groupMemberships)
        .values({ groupId, userId, role, status: "active" })
        .returning();

  if (group.neighborhoodId) {
    await ensureResidentNeighborhoodMembership(db, group.neighborhoodId, userId);
  }

  if (!updated[0]) {
    throw new ServiceError("Membership not found", "NOT_FOUND");
  }

  return updated[0];
}

const addMemberSchema = z
  .object({
    groupId: idSchema,
    userId: idSchema.optional(),
    email: z.string().email().optional(),
    role: groupRoleSchema.optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: "User id or email is required",
    path: ["userId"],
  });

export async function addMember(
  ctx: ServiceContext,
  input: z.input<typeof addMemberSchema>
) {
  const { groupId, userId, email, role } = addMemberSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);
  const group = await resolveGroupAccess(ctx, groupId);

  let resolvedUserId = userId;
  if (!resolvedUserId && email) {
    resolvedUserId = await resolveUserIdByEmail(email);
  }

  if (!resolvedUserId) {
    throw new ServiceError("User is required", "INVALID");
  }

  const existing = await db
    .select({ id: groupMemberships.id, role: groupMemberships.role })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, resolvedUserId)
      )
    )
    .limit(1);

  const membership = existing[0]
    ? await db
        .update(groupMemberships)
        .set({
          status: "active",
          role: role ?? existing[0].role,
          updatedAt: new Date(),
        })
        .where(eq(groupMemberships.id, existing[0].id))
        .returning()
    : await db
        .insert(groupMemberships)
        .values({
          groupId,
          userId: resolvedUserId,
          role: role ?? "group_member",
          status: "active",
        })
        .returning();

  if (group.neighborhoodId) {
    await ensureResidentNeighborhoodMembership(
      db,
      group.neighborhoodId,
      resolvedUserId
    );
  }

  return membership[0] ?? { groupId, userId: resolvedUserId };
}

const removeMemberSchema = z.object({
  groupId: idSchema,
  userId: idSchema,
});

async function countActiveGroupAdmins(groupId: string) {
  const rows = await db
    .select({ total: count() })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.role, "group_admin"),
        eq(groupMemberships.status, "active")
      )
    );

  return Number(rows[0]?.total ?? 0);
}

export async function removeMember(
  ctx: ServiceContext,
  input: z.input<typeof removeMemberSchema>
) {
  const { groupId, userId } = removeMemberSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);
  const group = await resolveGroupAccess(ctx, groupId);

  if (userId === ctx.user.id) {
    return leaveGroup(ctx, { groupId });
  }

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

  await syncResidentNeighborhoodMembership(db, group.neighborhoodId, userId);

  return removed[0];
}

const leaveGroupSchema = z.object({
  groupId: idSchema,
});

export async function leaveGroup(
  ctx: ServiceContext,
  input: z.input<typeof leaveGroupSchema>
) {
  const { groupId } = leaveGroupSchema.parse(input);
  await requireGroupMember(ctx, groupId);

  const membership = await db
    .select({
      id: groupMemberships.id,
      role: groupMemberships.role,
    })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, ctx.user.id),
        eq(groupMemberships.status, "active")
      )
    )
    .limit(1);

  if (!membership[0]) {
    throw new ServiceError("Membership not found", "NOT_FOUND");
  }

  if (membership[0].role === "group_admin") {
    const activeAdminCount = await countActiveGroupAdmins(groupId);
    if (activeAdminCount <= 1) {
      throw new ServiceError(
        "Assign another group admin before leaving the group",
        "FORBIDDEN"
      );
    }
  }

  const updated = await db
    .update(groupMemberships)
    .set({
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(groupMemberships.id, membership[0].id))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Membership not found", "NOT_FOUND");
  }

  const group = await resolveGroupAccess(ctx, groupId);
  await syncResidentNeighborhoodMembership(db, group.neighborhoodId, ctx.user.id);

  return updated[0];
}

export async function listUserGroups(ctx: ServiceContext) {
  const neighborhoodFilter = ctx.user.activeNeighborhoodId
    ? eq(groups.neighborhoodId, ctx.user.activeNeighborhoodId)
    : undefined;

  return db
    .select({
      id: groups.id,
      neighborhoodId: groups.neighborhoodId,
      neighborhoodName: neighborhoods.name,
      name: groups.name,
      address: groups.address,
      membershipRole: groupMemberships.role,
    })
    .from(groups)
    .innerJoin(neighborhoods, eq(groups.neighborhoodId, neighborhoods.id))
    .innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
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

const getGroupsStatsSchema = z.object({
  neighborhoodId: idSchema.optional(),
});

export async function getGroupsStats(
  ctx: ServiceContext,
  input?: z.input<typeof getGroupsStatsSchema>
) {
  const { neighborhoodId } = getGroupsStatsSchema.parse(input ?? {});
  const activeNeighborhoodId = ctx.user.activeNeighborhoodId ?? undefined;
  const neighborhoodScopeId = neighborhoodId ?? activeNeighborhoodId;
  const neighborhoodFilter = neighborhoodScopeId
    ? eq(groups.neighborhoodId, neighborhoodScopeId)
    : undefined;

  let scopedFilter = neighborhoodFilter;

  if (!isPlatformAdmin(ctx)) {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      return { active: 0, inactive: 0, total: 0 };
    }

    const membershipFilter = inArray(groups.neighborhoodId, neighborhoodIds);
    scopedFilter = neighborhoodFilter
      ? and(membershipFilter, neighborhoodFilter)
      : membershipFilter;
  }

  const totalResult = await db.select({ value: count() }).from(groups).where(scopedFilter);
  const activeResult = await db
    .select({
      value: sql<number>`count(distinct case when ${groupMemberships.userId} is not null then ${groups.id} end)`,
    })
    .from(groups)
    .leftJoin(
      groupMemberships,
      and(
        eq(groupMemberships.groupId, groups.id),
        eq(groupMemberships.status, "active")
      )
    )
    .where(scopedFilter);

  const total = Number(totalResult[0]?.value ?? 0);
  const active = Number(activeResult[0]?.value ?? 0);

  return {
    active,
    inactive: Math.max(total - active, 0),
    total,
  };
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

  let rows:
    | Array<{
        id: string;
        neighborhoodId: string;
        name: string;
        address: string | null;
        createdAt: Date;
        updatedAt: Date;
      }>
    | [];
  let total = 0;

  if (isPlatformAdmin(ctx)) {
    rows = await db.select().from(groups).where(scopedFilters).limit(limit).offset(offset);
    const totalResult = await db
      .select({ value: count() })
      .from(groups)
      .where(scopedFilters);
    total = Number(totalResult[0]?.value ?? 0);
  } else {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      return { items: [], total: 0 };
    }

    const membershipFilter = inArray(groups.neighborhoodId, neighborhoodIds);
    const combinedFilter = scopedFilters
      ? and(membershipFilter, scopedFilters)
      : membershipFilter;

    rows = await db
      .select()
      .from(groups)
      .where(combinedFilter)
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ value: count() })
      .from(groups)
      .where(combinedFilter);
    total = Number(totalResult[0]?.value ?? 0);
  }

  const adminSummaries = await listGroupAdminSummaries(rows.map((row) => row.id));

  return {
    items: rows.map((row) => {
      const summary = adminSummaries.get(row.id);
      return {
        ...row,
        adminUserIds: summary?.adminUserIds ?? [],
        adminNames: summary?.adminNames ?? [],
        adminLabel: summary?.adminLabel ?? null,
      };
    }),
    total,
  };
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
    .where(
      and(
        inArray(groupMemberships.groupId, allowedGroupIds),
        eq(groupMemberships.status, "active")
      )
    )
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
  await getViewerGroupAccess(ctx, groupId, group.neighborhoodId);

  return db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      image: users.image,
      systemRole: users.role,
      userStatus: users.status,
      membershipRole: groupMemberships.role,
      membershipStatus: groupMemberships.status,
    })
    .from(groupMemberships)
    .innerJoin(users, eq(users.id, groupMemberships.userId))
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.status, "active")
      )
    );
}

const getGroupSchema = z.object({ groupId: idSchema });

export async function getGroupById(
  ctx: ServiceContext,
  input: z.input<typeof getGroupSchema>
) {
  const { groupId } = getGroupSchema.parse(input);
  const groupAccess = await resolveGroupAccess(ctx, groupId);
  const viewer = await getViewerGroupAccess(ctx, groupId, groupAccess.neighborhoodId);

  const rows = await db
    .select({
      id: groups.id,
      neighborhoodId: groups.neighborhoodId,
      neighborhoodName: neighborhoods.name,
      name: groups.name,
      address: groups.address,
      createdAt: groups.createdAt,
      updatedAt: groups.updatedAt,
    })
    .from(groups)
    .innerJoin(neighborhoods, eq(groups.neighborhoodId, neighborhoods.id))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  const adminSummary = (await listGroupAdminSummaries([groupId])).get(groupId);

  return {
    ...rows[0],
    adminUserIds: adminSummary?.adminUserIds ?? [],
    adminNames: adminSummary?.adminNames ?? [],
    adminLabel: adminSummary?.adminLabel ?? null,
    viewerMembershipRole: viewer.viewerMembershipRole,
    viewerCanManage: viewer.viewerCanManage,
  };
}
