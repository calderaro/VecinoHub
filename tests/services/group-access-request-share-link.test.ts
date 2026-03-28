import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
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
  createGroupAccessRequest,
  listRequestableGroupsForNeighborhood,
  lookupNeighborhoodForAccessRequest,
} from "@/services/group-access-requests";
import { closeTestDatabase, ensureTestDatabase, resetTestDatabase } from "../helpers/test-database";

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

async function seedJoinLinkNeighborhood() {
  const adminId = randomUUID();
  const requesterId = randomUUID();
  const neighborhoodId = randomUUID();
  const alphaGroupId = randomUUID();
  const betaGroupId = randomUUID();

  await db.insert(users).values([
    {
      id: adminId,
      email: "admin@vecinohub.local",
      emailVerified: true,
      name: "Neighborhood Admin",
      status: "active",
      role: "platform_admin",
    },
    {
      id: requesterId,
      email: "requester@vecinohub.local",
      emailVerified: true,
      name: "Requester",
      status: "active",
      role: "user",
    },
  ]);

  await db.insert(neighborhoods).values({
    id: neighborhoodId,
    name: "Colonia Centro",
    slug: "colonia-centro",
    status: "active",
    createdBy: adminId,
  });

  await db.insert(neighborhoodMemberships).values({
    id: randomUUID(),
    neighborhoodId,
    userId: adminId,
    role: "neighborhood_admin",
    status: "active",
  });

  await db.insert(groups).values([
    {
      id: alphaGroupId,
      neighborhoodId,
      name: "Casa 101",
      address: "Calle Principal 101",
    },
    {
      id: betaGroupId,
      neighborhoodId,
      name: "Casa 202",
      address: "Calle Principal 202",
    },
  ]);

  await db.insert(groupMemberships).values({
    id: randomUUID(),
    groupId: alphaGroupId,
    userId: adminId,
    role: "group_admin",
    status: "active",
  });

  return {
    adminId,
    requesterId,
    neighborhoodId,
    alphaGroupId,
    betaGroupId,
  };
}

describe("group access request share-link flow", () => {
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

  it("supports resolving a shared slug to requestable groups and creating a request", async () => {
    const { requesterId, neighborhoodId, alphaGroupId, betaGroupId } =
      await seedJoinLinkNeighborhood();

    const neighborhood = await lookupNeighborhoodForAccessRequest(createCtx(requesterId), {
      slug: "colonia-centro",
    });

    expect(neighborhood.id).toBe(neighborhoodId);
    expect(neighborhood.slug).toBe("colonia-centro");

    const requestableGroups = await listRequestableGroupsForNeighborhood(
      createCtx(requesterId),
      { neighborhoodId: neighborhood.id }
    );

    expect(requestableGroups.map((group) => group.id)).toEqual([alphaGroupId, betaGroupId]);

    const request = await createGroupAccessRequest(createCtx(requesterId), {
      groupId: betaGroupId,
      note: "Shared link flow for Casa 202",
    });

    expect(request.neighborhoodId).toBe(neighborhoodId);
    expect(request.groupId).toBe(betaGroupId);
    expect(request.status).toBe("pending");

    const remainingGroups = await listRequestableGroupsForNeighborhood(
      createCtx(requesterId),
      { neighborhoodId: neighborhood.id }
    );

    expect(remainingGroups.map((group) => group.id)).toEqual([alphaGroupId]);
  });
});
