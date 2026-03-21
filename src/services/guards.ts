import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { groupMemberships, groups, neighborhoodMemberships } from "@/db/schema";

import { ServiceError } from "./errors";
import {
  hasResidentNeighborhoodAccess,
  listResidentNeighborhoodIdsForUser,
} from "./resident-neighborhoods";
import type { ServiceContext } from "./types";

export function isPlatformAdmin(ctx: ServiceContext) {
  return ctx.user.role === "admin" || ctx.user.role === "platform_admin";
}

export function requirePlatformAdmin(ctx: ServiceContext) {
  if (!isPlatformAdmin(ctx)) {
    throw new ServiceError("Admin access required", "FORBIDDEN");
  }
}

export function requireAdmin(ctx: ServiceContext) {
  requirePlatformAdmin(ctx);
}

export async function requireNeighborhoodMember(
  ctx: ServiceContext,
  neighborhoodId: string
) {
  if (isPlatformAdmin(ctx)) {
    return;
  }

  const adminMembership = await db
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

  if (adminMembership[0]) {
    return;
  }

  const residentAccess = await hasResidentNeighborhoodAccess(db, neighborhoodId, ctx.user.id);
  if (!residentAccess) {
    throw new ServiceError("Neighborhood membership required", "FORBIDDEN");
  }
}

export async function requireNeighborhoodAdminOrPlatform(
  ctx: ServiceContext,
  neighborhoodId: string
) {
  if (isPlatformAdmin(ctx)) {
    return;
  }

  const membership = await db
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

  if (!membership[0]) {
    throw new ServiceError("Neighborhood admin access required", "FORBIDDEN");
  }
}

export async function listNeighborhoodIdsForUser(ctx: ServiceContext) {
  if (ctx.user.activeNeighborhoodId) {
    if (isPlatformAdmin(ctx)) {
      return [ctx.user.activeNeighborhoodId];
    }

    const adminMembership = await db
      .select({ id: neighborhoodMemberships.id })
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.userId, ctx.user.id),
          eq(neighborhoodMemberships.neighborhoodId, ctx.user.activeNeighborhoodId),
          eq(neighborhoodMemberships.role, "neighborhood_admin"),
          eq(neighborhoodMemberships.status, "active")
        )
      )
      .limit(1);

    if (adminMembership[0]) {
      return [ctx.user.activeNeighborhoodId];
    }

    const residentNeighborhoodIds = await listResidentNeighborhoodIdsForUser(
      db,
      ctx.user.id,
      ctx.user.activeNeighborhoodId
    );

    return residentNeighborhoodIds;
  }

  if (isPlatformAdmin(ctx)) {
    return null;
  }

  const adminMemberships = await db
    .select({ neighborhoodId: neighborhoodMemberships.neighborhoodId })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.userId, ctx.user.id),
        eq(neighborhoodMemberships.role, "neighborhood_admin"),
        eq(neighborhoodMemberships.status, "active")
      )
    );

  const residentNeighborhoodIds = await listResidentNeighborhoodIdsForUser(db, ctx.user.id);

  return [
    ...new Set([
      ...adminMemberships.map((membership) => membership.neighborhoodId),
      ...residentNeighborhoodIds,
    ]),
  ].filter((id): id is string => Boolean(id));
}

export async function listNeighborhoodAdminIdsForUser(ctx: ServiceContext) {
  if (ctx.user.activeNeighborhoodId) {
    if (isPlatformAdmin(ctx)) {
      return [ctx.user.activeNeighborhoodId];
    }

    const membership = await db
      .select({ id: neighborhoodMemberships.id })
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.userId, ctx.user.id),
          eq(neighborhoodMemberships.neighborhoodId, ctx.user.activeNeighborhoodId),
          eq(neighborhoodMemberships.status, "active"),
          eq(neighborhoodMemberships.role, "neighborhood_admin")
        )
      )
      .limit(1);

    return membership[0] ? [ctx.user.activeNeighborhoodId] : [];
  }

  if (isPlatformAdmin(ctx)) {
    return null;
  }

  const memberships = await db
    .select({ neighborhoodId: neighborhoodMemberships.neighborhoodId })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.userId, ctx.user.id),
        eq(neighborhoodMemberships.status, "active"),
        eq(neighborhoodMemberships.role, "neighborhood_admin")
      )
    );

  return memberships
    .map((membership) => membership.neighborhoodId)
    .filter((id): id is string => Boolean(id));
}

export async function resolveGroupAccess(ctx: ServiceContext, groupId: string) {
  const group = await db
    .select({ neighborhoodId: groups.neighborhoodId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return group[0];
}

export async function requireGroupAdminOrAdmin(
  ctx: ServiceContext,
  groupId: string
) {
  if (isPlatformAdmin(ctx)) {
    return;
  }

  const group = await resolveGroupAccess(ctx, groupId);
  if (group.neighborhoodId) {
    await requireNeighborhoodMember(ctx, group.neighborhoodId);

    const neighborhoodAdminMembership = await db
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

    if (neighborhoodAdminMembership[0]) {
      return;
    }
  }

  const membership = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, ctx.user.id),
        eq(groupMemberships.role, "group_admin"),
        eq(groupMemberships.status, "active")
      )
    )
    .limit(1);

  if (!membership[0]) {
    throw new ServiceError("Group admin access required", "FORBIDDEN");
  }
}

export async function requireGroupMember(ctx: ServiceContext, groupId: string) {
  const group = await resolveGroupAccess(ctx, groupId);
  if (group.neighborhoodId) {
    await requireNeighborhoodMember(ctx, group.neighborhoodId);
  }

  const membership = await db
    .select({ id: groupMemberships.id })
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
    throw new ServiceError("Membership required", "FORBIDDEN");
  }

  return {
    groupId,
    neighborhoodId: group.neighborhoodId ?? null,
  };
}

export async function applyNeighborhoodScopeToGroupIds(
  ctx: ServiceContext,
  groupIds: string[]
) {
  if (groupIds.length === 0 || isPlatformAdmin(ctx)) {
    return groupIds;
  }

  const allowedNeighborhoodIds = await listNeighborhoodIdsForUser(ctx);
  if (!allowedNeighborhoodIds || allowedNeighborhoodIds.length === 0) {
    return [];
  }

  const allowedRows = await db
    .select({ id: groups.id })
    .from(groups)
    .where(
      and(
        inArray(groups.id, groupIds),
        inArray(groups.neighborhoodId, allowedNeighborhoodIds)
      )
    );

  return allowedRows.map((row) => row.id);
}
