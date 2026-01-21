import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { groupMemberships, groups } from "@/db/schema";

import { ServiceError } from "./errors";
import type { ServiceContext } from "./types";

export function requireAdmin(ctx: ServiceContext) {
  if (ctx.user.role !== "admin") {
    throw new ServiceError("Admin access required", "FORBIDDEN");
  }
}

export async function requireGroupAdminOrAdmin(
  ctx: ServiceContext,
  groupId: string
) {
  if (ctx.user.role === "admin") {
    return;
  }

  const group = await db
    .select({ adminUserId: groups.adminUserId })
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!group[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  if (group[0].adminUserId !== ctx.user.id) {
    throw new ServiceError("Group admin access required", "FORBIDDEN");
  }
}

export async function requireGroupMember(ctx: ServiceContext, groupId: string) {
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
