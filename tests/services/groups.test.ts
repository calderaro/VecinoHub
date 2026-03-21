import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
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
  leaveGroup,
  listGroupMembers,
  removeMember,
  setGroupMemberRole,
} from "@/services/groups";
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

async function seedGroupWithMembers(
  members: Array<{
    id: string;
    email: string;
    name: string;
    groupRole: "group_member" | "group_admin";
  }>
) {
  const neighborhoodId = randomUUID();
  const groupId = randomUUID();
  const creator = members[0];

  if (!creator) {
    throw new Error("At least one member is required");
  }

  for (const member of members) {
    await db.insert(users).values({
      id: member.id,
      email: member.email,
      name: member.name,
      status: "active",
    });
  }

  await db.insert(neighborhoods).values({
    id: neighborhoodId,
    name: "Centro",
    slug: `centro-${neighborhoodId.slice(0, 8)}`,
    createdBy: creator.id,
  });

  await db.insert(groups).values({
    id: groupId,
    neighborhoodId,
    name: "Casa 101",
  });

  for (const member of members) {
    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: member.id,
      role: "neighbor",
      status: "active",
    });

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId,
      userId: member.id,
      role: member.groupRole,
      status: "active",
    });
  }

  return {
    neighborhoodId,
    groupId,
  };
}

describe("group services", () => {
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

  it("inactivates the synchronized neighborhood membership when leaving the last group", async () => {
    const adminId = randomUUID();
    const memberId = randomUUID();
    const { groupId, neighborhoodId } = await seedGroupWithMembers([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Admin",
        groupRole: "group_admin",
      },
      {
        id: memberId,
        email: "member@example.com",
        name: "Member",
        groupRole: "group_member",
      },
    ]);

    await leaveGroup(createCtx(memberId), { groupId });

    const storedMembership = await db
      .select()
      .from(groupMemberships)
      .where(
        and(eq(groupMemberships.groupId, groupId), eq(groupMemberships.userId, memberId))
      );
    const storedNeighborhoodMembership = await db
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, memberId)
        )
      );

    expect(storedMembership[0]?.status).toBe("inactive");
    expect(storedNeighborhoodMembership[0]?.status).toBe("inactive");
  });

  it("does not include inactive memberships in the group roster after leaving", async () => {
    const adminId = randomUUID();
    const memberId = randomUUID();
    const { groupId } = await seedGroupWithMembers([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Admin",
        groupRole: "group_admin",
      },
      {
        id: memberId,
        email: "member@example.com",
        name: "Member",
        groupRole: "group_member",
      },
    ]);

    await leaveGroup(createCtx(memberId), { groupId });

    const roster = await listGroupMembers(createCtx(adminId), { groupId });

    expect(roster.map((member) => member.id)).toEqual([adminId]);
  });

  it("keeps the neighbor membership active when another group in the same neighborhood remains", async () => {
    const adminId = randomUUID();
    const memberId = randomUUID();
    const { groupId, neighborhoodId } = await seedGroupWithMembers([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Admin",
        groupRole: "group_admin",
      },
      {
        id: memberId,
        email: "member@example.com",
        name: "Member",
        groupRole: "group_member",
      },
    ]);
    const secondGroupId = randomUUID();

    await db.insert(groups).values({
      id: secondGroupId,
      neighborhoodId,
      name: "Casa 102",
    });

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId: secondGroupId,
      userId: memberId,
      role: "group_member",
      status: "active",
    });

    await leaveGroup(createCtx(memberId), { groupId });

    const neighborhoodMembership = await db
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, memberId)
        )
      );

    expect(neighborhoodMembership[0]?.status).toBe("active");
  });

  it("inactivates the synchronized neighborhood membership when an admin removes the last group member", async () => {
    const adminId = randomUUID();
    const memberId = randomUUID();
    const { groupId, neighborhoodId } = await seedGroupWithMembers([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Admin",
        groupRole: "group_admin",
      },
      {
        id: memberId,
        email: "member@example.com",
        name: "Member",
        groupRole: "group_member",
      },
    ]);

    await removeMember(createCtx(adminId), { groupId, userId: memberId });

    const neighborhoodMembership = await db
      .select()
      .from(neighborhoodMemberships)
      .where(
        and(
          eq(neighborhoodMemberships.neighborhoodId, neighborhoodId),
          eq(neighborhoodMemberships.userId, memberId)
        )
      );

    expect(neighborhoodMembership[0]?.status).toBe("inactive");
  });

  it("blocks the last active group admin from leaving", async () => {
    const adminId = randomUUID();
    const { groupId } = await seedGroupWithMembers([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Admin",
        groupRole: "group_admin",
      },
    ]);

    await expect(leaveGroup(createCtx(adminId), { groupId })).rejects.toMatchObject({
      message: "Assign another group admin before leaving the group",
    });
  });

  it("allows a group admin to leave when another active admin remains", async () => {
    const firstAdminId = randomUUID();
    const secondAdminId = randomUUID();
    const { groupId } = await seedGroupWithMembers([
      {
        id: firstAdminId,
        email: "first-admin@example.com",
        name: "First Admin",
        groupRole: "group_admin",
      },
      {
        id: secondAdminId,
        email: "second-admin@example.com",
        name: "Second Admin",
        groupRole: "group_admin",
      },
    ]);

    await leaveGroup(createCtx(firstAdminId), { groupId });

    const memberships = await db
      .select({
        userId: groupMemberships.userId,
        role: groupMemberships.role,
        status: groupMemberships.status,
      })
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));

    expect(
      memberships.find((membership) => membership.userId === firstAdminId)?.status
    ).toBe("inactive");
    expect(
      memberships.find((membership) => membership.userId === secondAdminId)?.status
    ).toBe("active");
  });

  it("blocks the last active group admin from demoting themselves", async () => {
    const adminId = randomUUID();
    const { groupId } = await seedGroupWithMembers([
      {
        id: adminId,
        email: "admin@example.com",
        name: "Admin",
        groupRole: "group_admin",
      },
    ]);

    await expect(
      setGroupMemberRole(createCtx(adminId), {
        groupId,
        userId: adminId,
        role: "group_member",
      })
    ).rejects.toMatchObject({
      message: "Assign another group admin before leaving the group",
    });
  });
});
