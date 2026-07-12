import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  groupInvites,
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

vi.mock("@/server/mail", () => ({
  getAppBaseUrl: () => "http://localhost:3000",
  sendGroupInviteEmail: vi.fn(async () => undefined),
}));

import { db } from "@/db";
import { sendGroupInviteEmail } from "@/server/mail";
import {
  acceptGroupInvite,
  createGroupInvite,
  rejectGroupInvite,
  resendGroupInvite,
} from "@/services/group-invites";
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

async function seedManagedGroup() {
  const neighborhoodId = randomUUID();
  const managerId = randomUUID();
  const groupId = randomUUID();

  await db.insert(users).values({
    id: managerId,
    email: "manager@example.com",
    name: "Manager",
    status: "active",
  });

  await db.insert(neighborhoods).values({
    id: neighborhoodId,
    name: "Centro",
    slug: "centro",
    createdBy: managerId,
  });

  await db.insert(neighborhoodMemberships).values({
    id: randomUUID(),
    neighborhoodId,
    userId: managerId,
    role: "neighbor",
    status: "active",
  });

  await db.insert(groups).values({
    id: groupId,
    neighborhoodId,
    name: "Casa 101",
  });

  await db.insert(groupMemberships).values({
    id: randomUUID(),
    groupId,
    userId: managerId,
    role: "group_admin",
    status: "active",
  });

  return {
    neighborhoodId,
    managerId,
    groupId,
  };
}

describe("group invite services", () => {
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

  it("creates an invite and sends the email", async () => {
    const { managerId, groupId } = await seedManagedGroup();

    const invite = await createGroupInvite(createCtx(managerId), {
      groupId,
      email: "invitee@example.com",
      role: "group_member",
    });

    const storedInvites = await db.select().from(groupInvites);

    expect(invite.email).toBe("invitee@example.com");
    expect(storedInvites).toHaveLength(1);
    expect(storedInvites[0]?.status).toBe("pending");
    expect(sendGroupInviteEmail).toHaveBeenCalledTimes(1);
  });

  it("rejects invite creation when the target user is already an active group member", async () => {
    const { managerId, groupId, neighborhoodId } = await seedManagedGroup();
    const residentId = randomUUID();

    await db.insert(users).values({
      id: residentId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });

    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: residentId,
      role: "neighbor",
      status: "active",
    });

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId,
      userId: residentId,
      role: "group_member",
      status: "active",
    });

    await expect(
      createGroupInvite(createCtx(managerId), {
        groupId,
        email: "resident@example.com",
      })
    ).rejects.toMatchObject({ message: "User is already an active group member" });
  });

  it("accepts an invite and creates the missing memberships", async () => {
    const { groupId, neighborhoodId } = await seedManagedGroup();
    const residentId = randomUUID();
    const inviteId = randomUUID();

    await db.insert(users).values({
      id: residentId,
      email: "invitee@example.com",
      name: "Invitee",
      status: "active",
    });

    await db.insert(groupInvites).values({
      id: inviteId,
      groupId,
      neighborhoodId,
      email: "invitee@example.com",
      role: "group_admin",
      status: "pending",
      tokenHash: "token-hash-1",
      invitedBy: randomUUID(),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    const result = await acceptGroupInvite(createCtx(residentId), { inviteId });

    const storedInvite = await db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.id, inviteId));
    const storedNeighborhoodMembership = await db
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, residentId)
        )
      );
    const storedGroupMembership = await db
      .select()
      .from(groupMemberships)
      .where(
        and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, residentId))
      );

    expect(result.groupId).toBe(groupId);
    expect(storedInvite[0]?.status).toBe("accepted");
    expect(storedNeighborhoodMembership[0]?.status).toBe("active");
    expect(storedGroupMembership[0]?.status).toBe("active");
    expect(storedGroupMembership[0]?.role).toBe("group_admin");
  });

  it("rejects an invite without creating memberships", async () => {
    const { groupId, neighborhoodId } = await seedManagedGroup();
    const residentId = randomUUID();
    const inviteId = randomUUID();

    await db.insert(users).values({
      id: residentId,
      email: "invitee@example.com",
      name: "Invitee",
      status: "active",
    });

    await db.insert(groupInvites).values({
      id: inviteId,
      groupId,
      neighborhoodId,
      email: "invitee@example.com",
      role: "group_member",
      status: "pending",
      tokenHash: "token-hash-2",
      invitedBy: randomUUID(),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    await rejectGroupInvite(createCtx(residentId), { inviteId });

    const storedInvite = await db
      .select()
      .from(groupInvites)
      .where(eq(groupInvites.id, inviteId));
    const storedGroupMembership = await db
      .select()
      .from(groupMemberships)
      .where(
        and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, residentId))
      );

    expect(storedInvite[0]?.status).toBe("rejected");
    expect(storedGroupMembership).toHaveLength(0);
  });

  it("blocks invite acceptance for a different signed-in email", async () => {
    const { groupId, neighborhoodId } = await seedManagedGroup();
    const wrongUserId = randomUUID();
    const inviteId = randomUUID();

    await db.insert(users).values({
      id: wrongUserId,
      email: "other@example.com",
      name: "Other User",
      status: "active",
    });

    await db.insert(groupInvites).values({
      id: inviteId,
      groupId,
      neighborhoodId,
      email: "invitee@example.com",
      role: "group_member",
      status: "pending",
      tokenHash: "token-hash-3",
      invitedBy: randomUUID(),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    await expect(
      acceptGroupInvite(createCtx(wrongUserId), { inviteId })
    ).rejects.toMatchObject({ message: "This invite was sent to a different email address" });
  });

  it("blocks an inactive user from accepting an invite without creating memberships", async () => {
    const { groupId, neighborhoodId } = await seedManagedGroup();
    const residentId = randomUUID();
    const inviteId = randomUUID();

    await db.insert(users).values({
      id: residentId,
      email: "inactive@example.com",
      name: "Inactive Invitee",
      status: "inactive",
    });
    await db.insert(groupInvites).values({
      id: inviteId,
      groupId,
      neighborhoodId,
      email: "inactive@example.com",
      role: "group_member",
      status: "pending",
      tokenHash: "token-hash-inactive-user",
      invitedBy: randomUUID(),
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    await expect(
      acceptGroupInvite(createCtx(residentId), { inviteId })
    ).rejects.toMatchObject({ message: "Your account is not active" });

    const memberships = await db
      .select()
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, residentId));
    expect(memberships).toHaveLength(0);
  });

  it("resends an expired invite by moving it back to pending", async () => {
    const { managerId, groupId, neighborhoodId } = await seedManagedGroup();
    const inviteId = randomUUID();

    await db.insert(groupInvites).values({
      id: inviteId,
      groupId,
      neighborhoodId,
      email: "invitee@example.com",
      role: "group_member",
      status: "expired",
      tokenHash: "token-hash-4",
      invitedBy: managerId,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
    });

    const result = await resendGroupInvite(createCtx(managerId), { inviteId });

    expect(result.status).toBe("pending");
    expect(sendGroupInviteEmail).toHaveBeenCalledTimes(1);
  });
});
