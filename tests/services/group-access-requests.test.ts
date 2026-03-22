import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  groupAccessRequests,
  groupMemberships,
  groups,
  neighborhoodMemberships,
  neighborhoods,
  users,
} from "@/db/schema";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { db } from "@/db";
import {
  approveGroupAccessRequest,
  cancelGroupAccessRequest,
  createGroupAccessRequest,
  listGroupAccessRequests,
  listMyGroupAccessRequests,
  listRequestableGroupsForNeighborhood,
  lookupNeighborhoodForAccessRequest,
  rejectGroupAccessRequest,
} from "@/services/group-access-requests";
import {
  closeTestDatabase,
  ensureTestDatabase,
  resetTestDatabase,
} from "../helpers/test-database";

function createCtx(
  userId: string,
  role: ServiceContext["user"]["role"] = "user"
): ServiceContext {
  return {
    user: {
      id: userId,
      role,
      activeNeighborhoodId: null,
    },
  };
}

async function seedNeighborhoodWithGroup() {
  const managerId = randomUUID();
  const requesterId = randomUUID();
  const neighborhoodId = randomUUID();
  const groupId = randomUUID();
  const secondGroupId = randomUUID();

  await db.insert(users).values([
    {
      id: managerId,
      email: "manager@example.com",
      emailVerified: true,
      name: "Manager",
      status: "active",
    },
    {
      id: requesterId,
      email: "resident@example.com",
      emailVerified: true,
      name: "Resident",
      status: "active",
    },
  ]);

  await db.insert(neighborhoods).values({
    id: neighborhoodId,
    name: "Centro",
    slug: "centro",
    status: "active",
    createdBy: managerId,
  });

  await db.insert(neighborhoodMemberships).values({
    id: randomUUID(),
    neighborhoodId,
    userId: managerId,
    role: "neighbor",
    status: "active",
  });

  await db.insert(groups).values([
    {
      id: groupId,
      neighborhoodId,
      name: "Casa 101",
      address: "Main 101",
    },
    {
      id: secondGroupId,
      neighborhoodId,
      name: "Casa 102",
      address: "Main 102",
    },
  ]);

  await db.insert(groupMemberships).values({
    id: randomUUID(),
    groupId,
    userId: managerId,
    role: "group_admin",
    status: "active",
  });

  return {
    managerId,
    requesterId,
    neighborhoodId,
    groupId,
    secondGroupId,
  };
}

describe("group access request services", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("looks up an active neighborhood by slug", async () => {
    const { requesterId, neighborhoodId } = await seedNeighborhoodWithGroup();

    const result = await lookupNeighborhoodForAccessRequest(createCtx(requesterId), {
      slug: "centro",
    });

    expect(result.id).toBe(neighborhoodId);
    expect(result.slug).toBe("centro");
  });

  it("lists requestable groups excluding active memberships and pending requests", async () => {
    const { requesterId, neighborhoodId, groupId, secondGroupId } =
      await seedNeighborhoodWithGroup();

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId: groupId,
      userId: requesterId,
      role: "group_member",
      status: "active",
    });

    await db.insert(groupAccessRequests).values({
      id: randomUUID(),
      groupId: secondGroupId,
      neighborhoodId,
      requestedBy: requesterId,
      status: "pending",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    const groupsForRequest = await listRequestableGroupsForNeighborhood(
      createCtx(requesterId),
      { neighborhoodId }
    );

    expect(groupsForRequest).toHaveLength(0);
  });

  it("creates a pending request", async () => {
    const { requesterId, groupId } = await seedNeighborhoodWithGroup();

    const request = await createGroupAccessRequest(createCtx(requesterId), {
      groupId,
      note: "I live at Main 101",
    });

    const storedRequests = await db
      .select()
      .from(groupAccessRequests)
      .where(eq(groupAccessRequests.id, request.id));

    expect(request.groupId).toBe(groupId);
    expect(request.note).toBe("I live at Main 101");
    expect(storedRequests).toHaveLength(1);
    expect(storedRequests[0]?.status).toBe("pending");
  });

  it("rejects duplicate pending requests for the same group", async () => {
    const { requesterId, groupId } = await seedNeighborhoodWithGroup();

    await createGroupAccessRequest(createCtx(requesterId), { groupId });

    await expect(
      createGroupAccessRequest(createCtx(requesterId), { groupId })
    ).rejects.toMatchObject({ message: "A pending request already exists for this group" });
  });

  it("allows the requester to cancel their own pending request", async () => {
    const { requesterId, groupId } = await seedNeighborhoodWithGroup();
    const request = await createGroupAccessRequest(createCtx(requesterId), { groupId });

    const result = await cancelGroupAccessRequest(createCtx(requesterId), {
      requestId: request.id,
    });

    const storedRequest = await db
      .select()
      .from(groupAccessRequests)
      .where(eq(groupAccessRequests.id, request.id));

    expect(result.status).toBe("cancelled");
    expect(storedRequest[0]?.status).toBe("cancelled");
  });

  it("approves a request and creates synchronized memberships", async () => {
    const { managerId, requesterId, groupId, neighborhoodId } =
      await seedNeighborhoodWithGroup();

    const createdRequest = await createGroupAccessRequest(createCtx(requesterId), {
      groupId,
    });

    const result = await approveGroupAccessRequest(createCtx(managerId), {
      requestId: createdRequest.id,
    });

    const storedRequest = await db
      .select()
      .from(groupAccessRequests)
      .where(eq(groupAccessRequests.id, createdRequest.id));
    const storedGroupMembership = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, requesterId)
        )
      );
    const storedNeighborhoodMembership = await db
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, requesterId)
        )
      );

    expect(result.status).toBe("approved");
    expect(storedRequest[0]?.status).toBe("approved");
    expect(storedGroupMembership[0]?.status).toBe("active");
    expect(storedGroupMembership[0]?.role).toBe("group_member");
    expect(storedNeighborhoodMembership[0]?.status).toBe("active");
  });

  it("rejects a request without creating memberships", async () => {
    const { managerId, requesterId, groupId } = await seedNeighborhoodWithGroup();
    const createdRequest = await createGroupAccessRequest(createCtx(requesterId), {
      groupId,
    });

    const result = await rejectGroupAccessRequest(createCtx(managerId), {
      requestId: createdRequest.id,
    });

    const storedMembership = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, requesterId)
        )
      );

    expect(result.status).toBe("rejected");
    expect(storedMembership).toHaveLength(0);
  });

  it("lists a requester's pending and historical requests", async () => {
    const { requesterId, groupId, secondGroupId } = await seedNeighborhoodWithGroup();

    const pendingRequest = await createGroupAccessRequest(createCtx(requesterId), {
      groupId,
    });

    await db.insert(groupAccessRequests).values({
      id: randomUUID(),
      groupId: secondGroupId,
      neighborhoodId: (
        await db.select({ neighborhoodId: groups.neighborhoodId }).from(groups).where(eq(groups.id, secondGroupId)).limit(1)
      )[0]!.neighborhoodId,
      requestedBy: requesterId,
      status: "rejected",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    const requests = await listMyGroupAccessRequests(createCtx(requesterId));

    expect(requests.pending.map((request) => request.id)).toEqual([pendingRequest.id]);
    expect(requests.history).toHaveLength(1);
  });

  it("treats expired pending requests as history instead of active pending work", async () => {
    const { managerId, requesterId, groupId, neighborhoodId } =
      await seedNeighborhoodWithGroup();
    const expiredRequestId = randomUUID();

    await db.insert(groupAccessRequests).values({
      id: expiredRequestId,
      groupId,
      neighborhoodId,
      requestedBy: requesterId,
      status: "pending",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const requesterView = await listMyGroupAccessRequests(createCtx(requesterId));
    const managerView = await listGroupAccessRequests(createCtx(managerId), { groupId });

    expect(requesterView.pending).toHaveLength(0);
    expect(requesterView.history[0]?.id).toBe(expiredRequestId);
    expect(requesterView.history[0]?.status).toBe("expired");
    expect(managerView.pending).toHaveLength(0);
    expect(managerView.history[0]?.status).toBe("expired");
  });

  it("refreshes an expired pending request when the user submits again", async () => {
    const { requesterId, groupId, neighborhoodId } = await seedNeighborhoodWithGroup();
    const expiredRequestId = randomUUID();

    await db.insert(groupAccessRequests).values({
      id: expiredRequestId,
      groupId,
      neighborhoodId,
      requestedBy: requesterId,
      status: "pending",
      note: "Old request",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const refreshed = await createGroupAccessRequest(createCtx(requesterId), {
      groupId,
      note: "New residency note",
    });

    const storedRequest = await db
      .select()
      .from(groupAccessRequests)
      .where(eq(groupAccessRequests.id, expiredRequestId));

    expect(refreshed.id).toBe(expiredRequestId);
    expect(refreshed.status).toBe("pending");
    expect(storedRequest[0]?.note).toBe("New residency note");
    expect(storedRequest[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
