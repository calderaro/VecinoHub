import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { groupMemberships, groups, neighborhoodMemberships } from "@/db/schema";

type TransactionExecutor = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbExecutor = typeof db | TransactionExecutor;

async function getNeighborhoodMembershipRecord(
  executor: DbExecutor,
  neighborhoodId: string,
  userId: string
) {
  const rows = await executor
    .select({
      id: neighborhoodMemberships.id,
      role: neighborhoodMemberships.role,
      status: neighborhoodMemberships.status,
    })
    .from(neighborhoodMemberships)
    .where(
      and(
        eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
        eq(neighborhoodMemberships.userId, userId)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function countActiveGroupsInNeighborhood(
  executor: DbExecutor,
  neighborhoodId: string,
  userId: string
) {
  const rows = await executor
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(
      and(
        eq(groupMemberships.userId, userId),
        eq(groupMemberships.status, "active"),
        eq(groups.neighborhoodId, neighborhoodId)
      )
    );

  return rows.length;
}

export async function hasResidentNeighborhoodAccess(
  executor: DbExecutor,
  neighborhoodId: string,
  userId: string
) {
  return (await countActiveGroupsInNeighborhood(executor, neighborhoodId, userId)) > 0;
}

export async function listResidentNeighborhoodIdsForUser(
  executor: DbExecutor,
  userId: string,
  activeNeighborhoodId?: string | null
) {
  const rows = await executor
    .select({ neighborhoodId: groups.neighborhoodId })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(
      activeNeighborhoodId
        ? and(
            eq(groupMemberships.userId, userId),
            eq(groupMemberships.status, "active"),
            eq(groups.neighborhoodId, activeNeighborhoodId)
          )
        : and(eq(groupMemberships.userId, userId), eq(groupMemberships.status, "active"))
    );

  return [...new Set(rows.map((row) => row.neighborhoodId))];
}

export async function ensureResidentNeighborhoodMembership(
  executor: DbExecutor,
  neighborhoodId: string,
  userId: string
) {
  const existing = await getNeighborhoodMembershipRecord(executor, neighborhoodId, userId);

  if (!existing) {
    await executor.insert(neighborhoodMemberships).values({
      neighborhoodId,
      userId,
      role: "neighbor",
      status: "active",
    });
    return;
  }

  if (existing.role === "neighborhood_admin" && existing.status === "active") {
    return;
  }

  await executor
    .update(neighborhoodMemberships)
    .set({
      role: "neighbor",
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(neighborhoodMemberships.id, existing.id));
}

export async function syncResidentNeighborhoodMembership(
  executor: DbExecutor,
  neighborhoodId: string,
  userId: string
) {
  const activeGroupCount = await countActiveGroupsInNeighborhood(
    executor,
    neighborhoodId,
    userId
  );

  if (activeGroupCount > 0) {
    await ensureResidentNeighborhoodMembership(executor, neighborhoodId, userId);
    return;
  }

  const existing = await getNeighborhoodMembershipRecord(executor, neighborhoodId, userId);
  if (!existing || existing.role === "neighborhood_admin") {
    return;
  }

  if (existing.status === "inactive" && existing.role === "neighbor") {
    return;
  }

  await executor
    .update(neighborhoodMemberships)
    .set({
      role: "neighbor",
      status: "inactive",
      updatedAt: new Date(),
    })
    .where(eq(neighborhoodMemberships.id, existing.id));
}
