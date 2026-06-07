import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  groupAccessRequests,
  groupMemberships,
  groups,
  neighborhoods,
  users,
} from "@/db/schema";

import { ServiceError } from "./errors";
import { requireGroupAdminOrAdmin, requireNeighborhoodAdminOrPlatform } from "./guards";
import { ensureResidentNeighborhoodMembership } from "./resident-neighborhoods";
import type { ServiceContext } from "./types";
import { idSchema } from "./validators";

const groupAccessRequestExpiryDays = 30;
const groupAccessRequestNoteSchema = z.string().trim().min(1).max(500);

const lookupNeighborhoodSchema = z.object({
  slug: z.string().trim().min(1),
});

const listRequestableGroupsSchema = z.object({
  neighborhoodId: idSchema,
});

const createGroupAccessRequestSchema = z.object({
  groupId: idSchema,
  note: groupAccessRequestNoteSchema.optional(),
});

const requestIdSchema = z.object({
  requestId: idSchema,
});

const groupAccessRequestListSchema = z.object({
  groupId: idSchema,
});

const neighborhoodAccessRequestListSchema = z.object({
  neighborhoodId: idSchema,
});

type GroupAccessRequestRecord = typeof groupAccessRequests.$inferSelect;
type GroupAccessRequestStatus = GroupAccessRequestRecord["status"];

function buildGroupAccessRequestExpiryDate(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + groupAccessRequestExpiryDays);
  return expiresAt;
}

async function getRequesterProfile(userId: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("User not found", "NOT_FOUND");
  }

  return rows[0];
}

function getEffectiveGroupAccessRequestStatus(
  status: GroupAccessRequestStatus,
  expiresAt: Date,
  now = new Date()
) {
  if (status === "pending" && expiresAt < now) {
    return "expired" as const;
  }

  return status;
}

function mapEffectiveGroupAccessRequestStatus<
  T extends { status: GroupAccessRequestStatus; expiresAt: Date },
>(request: T, now = new Date()) {
  const status = getEffectiveGroupAccessRequestStatus(request.status, request.expiresAt, now);

  if (status === request.status) {
    return request;
  }

  return {
    ...request,
    status,
  };
}

async function getGroupAccessRequestById(requestId: string) {
  const rows = await db
    .select()
    .from(groupAccessRequests)
    .where(eq(groupAccessRequests.id, requestId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Request not found", "NOT_FOUND");
  }

  return rows[0];
}

async function ensureGroupAccessRequestIsActionable(request: GroupAccessRequestRecord) {
  const resolvedRequest = mapEffectiveGroupAccessRequestStatus(request);

  if (resolvedRequest.status === "expired") {
    throw new ServiceError("This request has expired", "INVALID");
  }

  if (resolvedRequest.status !== "pending") {
    throw new ServiceError("This request is no longer available", "INVALID");
  }

  return resolvedRequest;
}

async function loadGroupRequestTarget(groupId: string) {
  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      groupAddress: groups.address,
      neighborhoodId: neighborhoods.id,
      neighborhoodName: neighborhoods.name,
      neighborhoodSlug: neighborhoods.slug,
      neighborhoodStatus: neighborhoods.status,
    })
    .from(groups)
    .innerJoin(neighborhoods, eq(neighborhoods.id, groups.neighborhoodId))
    .where(eq(groups.id, groupId))
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return rows[0];
}

async function loadGroupAccessRequestContext(request: GroupAccessRequestRecord) {
  const target = await loadGroupRequestTarget(request.groupId);

  if (target.neighborhoodId !== request.neighborhoodId) {
    throw new ServiceError("Group not found", "NOT_FOUND");
  }

  return target;
}

async function hasActiveGroupMembership(groupId: string, userId: string) {
  const rows = await db
    .select({ id: groupMemberships.id })
    .from(groupMemberships)
    .where(
      and(
        eq(groupMemberships.groupId, groupId),
        eq(groupMemberships.userId, userId),
        eq(groupMemberships.status, "active")
      )
    )
    .limit(1);

  return Boolean(rows[0]);
}

export async function lookupNeighborhoodForAccessRequest(
  _ctx: ServiceContext,
  input: z.input<typeof lookupNeighborhoodSchema>
) {
  const { slug } = lookupNeighborhoodSchema.parse(input);
  const rows = await db
    .select({
      id: neighborhoods.id,
      name: neighborhoods.name,
      slug: neighborhoods.slug,
    })
    .from(neighborhoods)
    .where(
      and(
        eq(neighborhoods.status, "active"),
        sql`lower(${neighborhoods.slug}) = lower(${slug})`
      )
    )
    .limit(1);

  if (!rows[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  return rows[0];
}

export async function listRequestableGroupsForNeighborhood(
  ctx: ServiceContext,
  input: z.input<typeof listRequestableGroupsSchema>
) {
  const { neighborhoodId } = listRequestableGroupsSchema.parse(input);
  const requester = await getRequesterProfile(ctx.user.id);
  const now = new Date();

  if (requester.status !== "active") {
    throw new ServiceError("User is inactive", "FORBIDDEN");
  }

  const neighborhoodRows = await db
    .select({ id: neighborhoods.id })
    .from(neighborhoods)
    .where(
      and(
        eq(neighborhoods.id, neighborhoodId),
        eq(neighborhoods.status, "active")
      )
    )
    .limit(1);

  if (!neighborhoodRows[0]) {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  const availableGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      address: groups.address,
    })
    .from(groups)
    .where(eq(groups.neighborhoodId, neighborhoodId))
    .orderBy(asc(groups.name));

  if (availableGroups.length === 0) {
    return [];
  }

  const groupIds = availableGroups.map((group) => group.id);

  const [memberships, pendingRequests] = await Promise.all([
    db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.userId, ctx.user.id),
          eq(groupMemberships.status, "active"),
          inArray(groupMemberships.groupId, groupIds)
        )
      ),
    db
      .select({
        groupId: groupAccessRequests.groupId,
        expiresAt: groupAccessRequests.expiresAt,
      })
      .from(groupAccessRequests)
      .where(
        and(
          eq(groupAccessRequests.requestedBy, ctx.user.id),
          eq(groupAccessRequests.status, "pending"),
          inArray(groupAccessRequests.groupId, groupIds)
        )
      ),
  ]);

  const activeMembershipGroupIds = new Set(memberships.map((membership) => membership.groupId));
  const pendingRequestGroupIds = new Set(
    pendingRequests
      .filter((request) => getEffectiveGroupAccessRequestStatus("pending", request.expiresAt, now) === "pending")
      .map((request) => request.groupId)
  );

  return availableGroups.filter(
    (group) =>
      !activeMembershipGroupIds.has(group.id) && !pendingRequestGroupIds.has(group.id)
  );
}

export async function listMyGroupAccessRequests(ctx: ServiceContext) {
  const requester = await getRequesterProfile(ctx.user.id);
  const now = new Date();

  const rows = await db
    .select({
      id: groupAccessRequests.id,
      groupId: groupAccessRequests.groupId,
      groupName: groups.name,
      neighborhoodId: groupAccessRequests.neighborhoodId,
      neighborhoodName: neighborhoods.name,
      status: groupAccessRequests.status,
      note: groupAccessRequests.note,
      expiresAt: groupAccessRequests.expiresAt,
      createdAt: groupAccessRequests.createdAt,
      updatedAt: groupAccessRequests.updatedAt,
      reviewedAt: groupAccessRequests.reviewedAt,
    })
    .from(groupAccessRequests)
    .innerJoin(groups, eq(groups.id, groupAccessRequests.groupId))
    .innerJoin(neighborhoods, eq(neighborhoods.id, groupAccessRequests.neighborhoodId))
    .where(eq(groupAccessRequests.requestedBy, requester.id))
    .orderBy(desc(groupAccessRequests.updatedAt), desc(groupAccessRequests.createdAt));

  const resolvedRows = rows.map((request) => mapEffectiveGroupAccessRequestStatus(request, now));
  const pending = resolvedRows
    .filter((request) => request.status === "pending")
    .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());
  const history = resolvedRows
    .filter((request) => request.status !== "pending")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return {
    pending,
    history,
  };
}

export async function listGroupAccessRequests(
  ctx: ServiceContext,
  input: z.input<typeof groupAccessRequestListSchema>
) {
  const { groupId } = groupAccessRequestListSchema.parse(input);
  await requireGroupAdminOrAdmin(ctx, groupId);
  const now = new Date();

  const rows = await db
    .select({
      id: groupAccessRequests.id,
      requestedBy: groupAccessRequests.requestedBy,
      requesterName: users.name,
      requesterEmail: users.email,
      status: groupAccessRequests.status,
      note: groupAccessRequests.note,
      expiresAt: groupAccessRequests.expiresAt,
      createdAt: groupAccessRequests.createdAt,
      updatedAt: groupAccessRequests.updatedAt,
      reviewedAt: groupAccessRequests.reviewedAt,
    })
    .from(groupAccessRequests)
    .innerJoin(users, eq(users.id, groupAccessRequests.requestedBy))
    .where(eq(groupAccessRequests.groupId, groupId))
    .orderBy(desc(groupAccessRequests.updatedAt), desc(groupAccessRequests.createdAt));

  const resolvedRows = rows.map((request) => mapEffectiveGroupAccessRequestStatus(request, now));
  const pending = resolvedRows
    .filter((request) => request.status === "pending")
    .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());
  const history = resolvedRows
    .filter((request) => request.status !== "pending")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return {
    pending,
    history,
  };
}

export async function listNeighborhoodAccessRequests(
  ctx: ServiceContext,
  input: z.input<typeof neighborhoodAccessRequestListSchema>
) {
  const { neighborhoodId } = neighborhoodAccessRequestListSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);
  const now = new Date();

  const rows = await db
    .select({
      id: groupAccessRequests.id,
      groupId: groupAccessRequests.groupId,
      groupName: groups.name,
      requestedBy: groupAccessRequests.requestedBy,
      requesterName: users.name,
      requesterEmail: users.email,
      status: groupAccessRequests.status,
      note: groupAccessRequests.note,
      expiresAt: groupAccessRequests.expiresAt,
      createdAt: groupAccessRequests.createdAt,
      updatedAt: groupAccessRequests.updatedAt,
      reviewedAt: groupAccessRequests.reviewedAt,
    })
    .from(groupAccessRequests)
    .innerJoin(groups, eq(groups.id, groupAccessRequests.groupId))
    .innerJoin(users, eq(users.id, groupAccessRequests.requestedBy))
    .where(eq(groupAccessRequests.neighborhoodId, neighborhoodId))
    .orderBy(desc(groupAccessRequests.updatedAt), desc(groupAccessRequests.createdAt));

  const resolvedRows = rows.map((request) => mapEffectiveGroupAccessRequestStatus(request, now));
  const pending = resolvedRows
    .filter((request) => request.status === "pending")
    .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime());
  const history = resolvedRows
    .filter((request) => request.status !== "pending")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  return {
    pending,
    history,
  };
}

export async function getNeighborhoodAccessRequestStats(
  ctx: ServiceContext,
  input: z.input<typeof neighborhoodAccessRequestListSchema>
) {
  const { neighborhoodId } = neighborhoodAccessRequestListSchema.parse(input);
  await requireNeighborhoodAdminOrPlatform(ctx, neighborhoodId);

  // Aggregate in SQL so the admin overview never loads request rows (and their
  // requester PII) just to render KPI counts. Pending excludes expired requests,
  // mirroring getEffectiveGroupAccessRequestStatus.
  const rows = await db
    .select({
      pending: sql<number>`count(*) filter (where ${groupAccessRequests.status} = 'pending' and ${groupAccessRequests.expiresAt} > now())`,
      approved: sql<number>`count(*) filter (where ${groupAccessRequests.status} = 'approved')`,
      rejected: sql<number>`count(*) filter (where ${groupAccessRequests.status} = 'rejected')`,
    })
    .from(groupAccessRequests)
    .where(eq(groupAccessRequests.neighborhoodId, neighborhoodId));

  const row = rows[0];

  return {
    pending: Number(row?.pending ?? 0),
    approved: Number(row?.approved ?? 0),
    rejected: Number(row?.rejected ?? 0),
  };
}

export async function createGroupAccessRequest(
  ctx: ServiceContext,
  input: z.input<typeof createGroupAccessRequestSchema>
) {
  const { groupId, note } = createGroupAccessRequestSchema.parse(input);
  const requester = await getRequesterProfile(ctx.user.id);
  const now = new Date();

  if (requester.status !== "active") {
    throw new ServiceError("User is inactive", "FORBIDDEN");
  }

  if (!requester.emailVerified) {
    throw new ServiceError("Verify your email before requesting access", "FORBIDDEN");
  }

  const target = await loadGroupRequestTarget(groupId);
  if (target.neighborhoodStatus !== "active") {
    throw new ServiceError("Neighborhood not found", "NOT_FOUND");
  }

  if (await hasActiveGroupMembership(groupId, ctx.user.id)) {
    throw new ServiceError("You are already an active member of this group", "INVALID");
  }

  const existingPending = await db
    .select({ id: groupAccessRequests.id })
    .from(groupAccessRequests)
    .where(
      and(
        eq(groupAccessRequests.groupId, groupId),
        eq(groupAccessRequests.requestedBy, ctx.user.id),
        eq(groupAccessRequests.status, "pending")
      )
    )
    .limit(1);

  if (existingPending[0]) {
    const existingRequest = await getGroupAccessRequestById(existingPending[0].id);

    if (getEffectiveGroupAccessRequestStatus(existingRequest.status, existingRequest.expiresAt, now) === "pending") {
      throw new ServiceError("A pending request already exists for this group", "INVALID");
    }

    const refreshed = await db
      .update(groupAccessRequests)
      .set({
        note: note?.trim() || null,
        reviewedBy: null,
        reviewedAt: null,
        approvedAt: null,
        rejectedAt: null,
        cancelledAt: null,
        expiresAt: buildGroupAccessRequestExpiryDate(now),
        createdAt: now,
        updatedAt: now,
      })
      .where(eq(groupAccessRequests.id, existingRequest.id))
      .returning();

    if (!refreshed[0]) {
      throw new ServiceError("Unable to create request", "INVALID");
    }

    return {
      id: refreshed[0].id,
      groupId: refreshed[0].groupId,
      neighborhoodId: refreshed[0].neighborhoodId,
      status: refreshed[0].status,
      note: refreshed[0].note,
      expiresAt: refreshed[0].expiresAt,
    };
  }

  const expiresAt = buildGroupAccessRequestExpiryDate(now);
  const created = await db
    .insert(groupAccessRequests)
    .values({
      id: randomUUID(),
      groupId,
      neighborhoodId: target.neighborhoodId,
      requestedBy: ctx.user.id,
      note: note?.trim() || null,
      expiresAt,
    })
    .returning();

  if (!created[0]) {
    throw new ServiceError("Unable to create request", "INVALID");
  }

  return {
    id: created[0].id,
    groupId: created[0].groupId,
    neighborhoodId: created[0].neighborhoodId,
    status: created[0].status,
    note: created[0].note,
    expiresAt: created[0].expiresAt,
  };
}

export async function cancelGroupAccessRequest(
  ctx: ServiceContext,
  input: z.input<typeof requestIdSchema>
) {
  const { requestId } = requestIdSchema.parse(input);
  const request = await getGroupAccessRequestById(requestId);

  if (request.requestedBy !== ctx.user.id) {
    throw new ServiceError("You can only cancel your own requests", "FORBIDDEN");
  }

  const actionableRequest = await ensureGroupAccessRequestIsActionable(request);

  const updated = await db
    .update(groupAccessRequests)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(groupAccessRequests.id, actionableRequest.id))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Request not found", "NOT_FOUND");
  }

  return {
    requestId: updated[0].id,
    status: updated[0].status,
  };
}

export async function approveGroupAccessRequest(
  ctx: ServiceContext,
  input: z.input<typeof requestIdSchema>
) {
  const { requestId } = requestIdSchema.parse(input);
  const request = await getGroupAccessRequestById(requestId);
  const actionableRequest = await ensureGroupAccessRequestIsActionable(request);
  await requireGroupAdminOrAdmin(ctx, actionableRequest.groupId);
  const requestContext = await loadGroupAccessRequestContext(actionableRequest);

  await db.transaction(async (tx) => {
    const existingGroupMembership = await tx
      .select({
        id: groupMemberships.id,
        role: groupMemberships.role,
        status: groupMemberships.status,
      })
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, actionableRequest.groupId),
          eq(groupMemberships.userId, actionableRequest.requestedBy)
        )
      )
      .limit(1);

    if (!existingGroupMembership[0]) {
      await tx.insert(groupMemberships).values({
        groupId: actionableRequest.groupId,
        userId: actionableRequest.requestedBy,
        role: "group_member",
        status: "active",
      });
    } else {
      await tx
        .update(groupMemberships)
        .set({
          role:
            existingGroupMembership[0].status === "active"
              ? existingGroupMembership[0].role
              : "group_member",
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(groupMemberships.id, existingGroupMembership[0].id));
    }

    await ensureResidentNeighborhoodMembership(
      tx,
      actionableRequest.neighborhoodId,
      actionableRequest.requestedBy
    );

    await tx
      .update(groupAccessRequests)
      .set({
        status: "approved",
        reviewedBy: ctx.user.id,
        reviewedAt: new Date(),
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(groupAccessRequests.id, actionableRequest.id));
  });

  return {
    requestId: actionableRequest.id,
    groupId: requestContext.groupId,
    status: "approved" as const,
  };
}

export async function rejectGroupAccessRequest(
  ctx: ServiceContext,
  input: z.input<typeof requestIdSchema>
) {
  const { requestId } = requestIdSchema.parse(input);
  const request = await getGroupAccessRequestById(requestId);
  const actionableRequest = await ensureGroupAccessRequestIsActionable(request);
  await requireGroupAdminOrAdmin(ctx, actionableRequest.groupId);

  const updated = await db
    .update(groupAccessRequests)
    .set({
      status: "rejected",
      reviewedBy: ctx.user.id,
      reviewedAt: new Date(),
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(groupAccessRequests.id, actionableRequest.id))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Request not found", "NOT_FOUND");
  }

  return {
    requestId: updated[0].id,
    status: updated[0].status,
  };
}
