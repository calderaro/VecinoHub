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
  getPlatformUserById,
  listPlatformUserGroupMemberships,
  listPlatformUserNeighborhoodMemberships,
} from "@/services/users";
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

async function seedPlatformUserFixtures() {
  const userId = randomUUID();
  const firstNeighborhoodId = randomUUID();
  const secondNeighborhoodId = randomUUID();
  const firstGroupId = randomUUID();
  const secondGroupId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: "resident@example.com",
    name: "Resident User",
    username: "resident.user",
    role: "user",
    status: "active",
  });

  await db.insert(neighborhoods).values([
    {
      id: firstNeighborhoodId,
      name: "North Side",
      slug: "north-side",
      status: "active",
      createdBy: userId,
    },
    {
      id: secondNeighborhoodId,
      name: "South Side",
      slug: "south-side",
      status: "active",
      createdBy: userId,
    },
  ]);

  await db.insert(neighborhoodMemberships).values([
    {
      id: randomUUID(),
      neighborhoodId: firstNeighborhoodId,
      userId,
      role: "neighborhood_admin",
      status: "active",
    },
    {
      id: randomUUID(),
      neighborhoodId: secondNeighborhoodId,
      userId,
      role: "neighbor",
      status: "inactive",
    },
  ]);

  await db.insert(groups).values([
    {
      id: firstGroupId,
      neighborhoodId: firstNeighborhoodId,
      name: "Tower A",
      address: "101 Main St",
    },
    {
      id: secondGroupId,
      neighborhoodId: secondNeighborhoodId,
      name: "Tower B",
      address: "202 Main St",
    },
  ]);

  await db.insert(groupMemberships).values([
    {
      id: randomUUID(),
      groupId: firstGroupId,
      userId,
      role: "group_admin",
      status: "active",
    },
    {
      id: randomUUID(),
      groupId: secondGroupId,
      userId,
      role: "group_member",
      status: "inactive",
    },
  ]);

  return { userId, firstNeighborhoodId, secondNeighborhoodId, firstGroupId, secondGroupId };
}

describe("platform user services", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("returns platform-level user counts across neighborhoods and groups", async () => {
    const { userId } = await seedPlatformUserFixtures();

    const user = await getPlatformUserById(createCtx(randomUUID(), "platform_admin"), {
      userId,
    });

    expect(user.id).toBe(userId);
    expect(user.groupMembershipsTotal).toBe(2);
    expect(user.groupMembershipsActive).toBe(1);
    expect(user.groupMembershipsInactive).toBe(1);
    expect(user.groupsManaged).toBe(1);
    expect(user.neighborhoodMembershipsTotal).toBe(2);
    expect(user.neighborhoodMembershipsActive).toBe(1);
    expect(user.neighborhoodMembershipsInactive).toBe(1);
    expect(user.neighborhoodsManaged).toBe(1);
  });

  it("lists platform memberships with neighborhood metadata", async () => {
    const { userId, firstNeighborhoodId, firstGroupId } = await seedPlatformUserFixtures();
    const ctx = createCtx(randomUUID(), "platform_admin");

    const [neighborhoodRows, groupRows] = await Promise.all([
      listPlatformUserNeighborhoodMemberships(ctx, { userId, limit: 10 }),
      listPlatformUserGroupMemberships(ctx, { userId, limit: 10 }),
    ]);

    expect(neighborhoodRows).toHaveLength(2);
    expect(
      neighborhoodRows.some(
        (membership) =>
          membership.neighborhoodId === firstNeighborhoodId &&
          membership.membershipRole === "neighborhood_admin"
      )
    ).toBe(true);

    expect(groupRows).toHaveLength(2);
    expect(
      groupRows.some(
        (membership) =>
          membership.groupId === firstGroupId && membership.membershipRole === "group_admin"
      )
    ).toBe(true);
  });

  it("blocks non-platform users from global user inspection", async () => {
    const { userId } = await seedPlatformUserFixtures();

    await expect(
      getPlatformUserById(createCtx(randomUUID(), "user"), { userId })
    ).rejects.toMatchObject({ message: "Admin access required" });
  });
});
