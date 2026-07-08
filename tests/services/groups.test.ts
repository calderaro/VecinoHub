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
import { escapeCsv, rowsToCsv } from "@/lib/csv";
import {
  leaveGroup,
  listGroupMembers,
  listGroupsForExport,
  listGroupsPaged,
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

  async function seedActiveAndEmptyGroups() {
    const adminId = randomUUID();
    const { neighborhoodId, groupId: activeGroupId } =
      await seedGroupWithMembers([
        {
          id: adminId,
          email: "admin@example.com",
          name: "Admin",
          groupRole: "group_admin",
        },
      ]);

    const emptyGroupId = randomUUID();
    await db.insert(groups).values({
      id: emptyGroupId,
      neighborhoodId,
      name: "Empty House",
    });

    const ctx: ServiceContext = {
      user: {
        id: adminId,
        role: "platform_admin",
        activeNeighborhoodId: neighborhoodId,
      },
    };

    return { ctx, neighborhoodId, activeGroupId, emptyGroupId };
  }

  it("listGroupsPaged returns only groups with an active member when status is 'active'", async () => {
    const { ctx, activeGroupId } = await seedActiveAndEmptyGroups();

    const result = await listGroupsPaged(ctx, { status: "active" });

    expect(result.total).toBe(1);
    expect(result.items.map((group) => group.id)).toEqual([activeGroupId]);
  });

  it("listGroupsPaged returns only groups with no active member when status is 'inactive'", async () => {
    const { ctx, emptyGroupId } = await seedActiveAndEmptyGroups();

    const result = await listGroupsPaged(ctx, { status: "inactive" });

    expect(result.total).toBe(1);
    expect(result.items.map((group) => group.id)).toEqual([emptyGroupId]);
  });

  it("listGroupsPaged returns all groups when no status filter is provided", async () => {
    const { ctx, activeGroupId, emptyGroupId } = await seedActiveAndEmptyGroups();

    const result = await listGroupsPaged(ctx, {});

    expect(result.total).toBe(2);
    expect(new Set(result.items.map((group) => group.id))).toEqual(
      new Set([activeGroupId, emptyGroupId])
    );
  });

  it("listGroupsForExport returns the full filtered set without pagination", async () => {
    const { ctx, activeGroupId, emptyGroupId } = await seedActiveAndEmptyGroups();

    const all = await listGroupsForExport(ctx, {});
    expect(new Set(all.map((group) => group.id))).toEqual(
      new Set([activeGroupId, emptyGroupId])
    );

    const inactiveOnly = await listGroupsForExport(ctx, { status: "inactive" });
    expect(inactiveOnly.map((group) => group.id)).toEqual([emptyGroupId]);
  });
});

describe("csv helpers", () => {
  it("leaves plain fields untouched", () => {
    expect(escapeCsv("Casa 101")).toBe("Casa 101");
    expect(escapeCsv(7)).toBe("7");
    expect(escapeCsv(null)).toBe("");
    expect(escapeCsv(undefined)).toBe("");
  });

  it("quotes and doubles quotes for fields with commas, quotes, or newlines", () => {
    expect(escapeCsv("Smith, John")).toBe('"Smith, John"');
    expect(escapeCsv('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsv("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes leading formula/DDE characters (spreadsheet injection)", () => {
    expect(escapeCsv("=1+1")).toBe("'=1+1");
    expect(escapeCsv("+cmd")).toBe("'+cmd");
    expect(escapeCsv("-2")).toBe("'-2");
    expect(escapeCsv("@SUM(A1)")).toBe("'@SUM(A1)");
    // still quoted when it also contains a comma
    expect(escapeCsv("=HYPERLINK(1,2)")).toBe(`"'=HYPERLINK(1,2)"`);
    // a formula char not in the first position is left alone
    expect(escapeCsv("Casa=1")).toBe("Casa=1");
  });

  it("joins rows into CRLF-delimited CSV with escaped fields", () => {
    const csv = rowsToCsv([
      ["Group name", "Address", "Member count"],
      ["Casa, 1", 'Apt "A"', 3],
    ]);

    expect(csv).toBe(
      'Group name,Address,Member count\r\n"Casa, 1","Apt ""A""",3'
    );
  });
});
