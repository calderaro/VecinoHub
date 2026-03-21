import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  groupMemberships,
  groups,
  neighborhoodMemberships,
  sessions,
  users,
} from "@/db/schema";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { db } from "@/db";
import { resetSecondaryStorage, secondaryStorage } from "@/server/secondary-storage";
import { getGroupById, listGroupMembers, updateGroup } from "@/services/groups";
import {
  getNeighborhoodById,
  removeNeighborhoodMember,
  setNeighborhoodMemberRole,
  updateNeighborhoodMembershipStatus,
} from "@/services/neighborhoods";
import { updateUserStatus } from "@/services/users";
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

async function seedGroupAdminFixtures() {
  const neighborhoodId = randomUUID();
  const userId = randomUUID();
  const groupId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: "group-admin@example.com",
    name: "Group Admin",
    status: "active",
  });

  await db.insert(neighborhoodMemberships).values({
    id: randomUUID(),
    neighborhoodId,
    userId,
    role: "neighbor",
    status: "active",
  });

  await db.insert(groups).values({
    id: groupId,
    neighborhoodId,
    name: "Managed Group",
  });

  await db.insert(groupMemberships).values({
    id: randomUUID(),
    groupId,
    userId,
    role: "group_admin",
    status: "active",
  });

  return { neighborhoodId, userId, groupId };
}

describe("service access-control regressions", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await resetSecondaryStorage();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("revokes all sessions when a user is deactivated", async () => {
    const userId = randomUUID();
    const token = "session-token";

    await db.insert(users).values({
      id: userId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });
    await db.insert(sessions).values({
      id: randomUUID(),
      token,
      userId,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
    await secondaryStorage.set(
      token,
      JSON.stringify({
        session: {
          token,
          userId,
          expiresAt: "2030-01-01T00:00:00.000Z",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        user: {
          id: userId,
          email: "resident@example.com",
          name: "Resident",
          status: "active",
          role: "user",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }),
      3600
    );
    await secondaryStorage.set(
      `active-sessions-${userId}`,
      JSON.stringify([{ token, expiresAt: new Date("2030-01-01T00:00:00.000Z").getTime() }]),
      3600
    );

    await updateUserStatus(createCtx(randomUUID(), "platform_admin"), {
      userId,
      status: "inactive",
    });

    const storedSessions = await db.select().from(sessions);
    const storedUsers = await db.select().from(users);
    const cachedSession = await secondaryStorage.get(token);
    const cachedSessionList = await secondaryStorage.get(`active-sessions-${userId}`);

    expect(storedSessions).toHaveLength(0);
    expect(storedUsers[0]?.status).toBe("inactive");
    expect(cachedSession).toBeNull();
    expect(cachedSessionList).toBeNull();
  });

  it("keeps sessions intact when a user stays active", async () => {
    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });
    await db.insert(sessions).values({
      id: randomUUID(),
      token: "session-token",
      userId,
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    await updateUserStatus(createCtx(randomUUID(), "platform_admin"), {
      userId,
      status: "active",
    });

    const storedSessions = await db.select().from(sessions);

    expect(storedSessions).toHaveLength(1);
    expect(storedSessions[0]?.userId).toBe(userId);
  });

  it("inactivates scoped group memberships and blocks stale group-admin access", async () => {
    const { neighborhoodId, userId, groupId } = await seedGroupAdminFixtures();

    await updateNeighborhoodMembershipStatus(createCtx(randomUUID(), "platform_admin"), {
      neighborhoodId,
      userId,
      status: "inactive",
    });

    const storedMemberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    expect(storedMemberships[0]?.status).toBe("inactive");

    await expect(
      updateGroup(createCtx(userId), { groupId, name: "Blocked Update" })
    ).rejects.toMatchObject({ message: "Neighborhood membership required" });
    await expect(
      getGroupById(createCtx(userId), { groupId })
    ).rejects.toMatchObject({ message: "Neighborhood membership required" });
    await expect(
      listGroupMembers(createCtx(userId), { groupId })
    ).rejects.toMatchObject({ message: "Neighborhood membership required" });
  });

  it("does not restore group access when neighborhood membership is re-added", async () => {
    const { neighborhoodId, userId, groupId } = await seedGroupAdminFixtures();
    const platformCtx = createCtx(randomUUID(), "platform_admin");

    await removeNeighborhoodMember(platformCtx, {
      neighborhoodId,
      userId,
    });

    let storedMemberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    expect(storedMemberships[0]?.status).toBe("inactive");

    await setNeighborhoodMemberRole(platformCtx, {
      neighborhoodId,
      userId,
      role: "neighbor",
    });

    storedMemberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    expect(storedMemberships[0]?.status).toBe("inactive");
    await expect(
      updateGroup(createCtx(userId), { groupId, name: "Still Blocked" })
    ).rejects.toMatchObject({ message: "Neighborhood membership required" });
  });

  it("does not grant resident neighborhood access from a stale standalone neighbor row", async () => {
    const neighborhoodId = randomUUID();
    const userId = randomUUID();

    await db.insert(users).values({
      id: userId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });

    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId,
      role: "neighbor",
      status: "active",
    });

    await db.insert(groups).values({
      id: randomUUID(),
      neighborhoodId,
      name: "Detached Group",
    });

    await expect(
      getNeighborhoodById(createCtx(userId), { neighborhoodId })
    ).rejects.toMatchObject({ message: "Neighborhood membership required" });
  });
});
