import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  fundraisingCampaigns,
  fundraisingContributions,
  groupMemberships,
  groups,
  neighborhoodMemberships,
  users,
} from "@/db/schema";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { getCampaignDetail, listCampaigns } from "@/services/fundraising";
import {
  closeTestDatabase,
  ensureTestDatabase,
  resetTestDatabase,
} from "../helpers/test-database";
import { db } from "@/db";

function createCtx(
  userId: string,
  options?: Partial<ServiceContext["user"]>
): ServiceContext {
  return {
    user: {
      id: userId,
      role: "user",
      activeNeighborhoodId: null,
      ...options,
    },
  };
}

describe("fundraising service authorization", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("returns campaign detail for an active resident and only includes their active group contributions", async () => {
    const neighborhoodId = randomUUID();
    const viewerId = randomUUID();
    const otherUserId = randomUUID();
    const viewerGroupId = randomUUID();
    const otherGroupId = randomUUID();
    const campaignId = randomUUID();

    await db.insert(users).values({
      id: viewerId,
      email: "viewer@example.com",
      name: "Viewer",
    });
    await db.insert(users).values({
      id: otherUserId,
      email: "other@example.com",
      name: "Other",
    });

    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: viewerId,
      role: "neighbor",
      status: "active",
    });

    await db.insert(groups).values({
      id: viewerGroupId,
      neighborhoodId,
      name: "Viewer Group",
    });
    await db.insert(groups).values({
      id: otherGroupId,
      neighborhoodId,
      name: "Other Group",
    });

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId: viewerGroupId,
      userId: viewerId,
      role: "group_member",
      status: "active",
    });
    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId: otherGroupId,
      userId: otherUserId,
      role: "group_member",
      status: "active",
    });

    await db.insert(fundraisingCampaigns).values({
      id: campaignId,
      neighborhoodId,
      title: "Security Gate Campaign",
      amount: "50.00",
      goalAmount: "100.00",
      dueDate: null,
      createdBy: otherUserId,
    });

    await db.insert(fundraisingContributions).values({
      id: randomUUID(),
      campaignId,
      groupId: viewerGroupId,
      submittedBy: viewerId,
      method: "cash",
      amount: "50.00",
      status: "submitted",
      wireDate: null,
      wireAmount: null,
      confirmedBy: null,
    });
    await db.insert(fundraisingContributions).values({
      id: randomUUID(),
      campaignId,
      groupId: otherGroupId,
      submittedBy: otherUserId,
      method: "cash",
      amount: "50.00",
      status: "submitted",
      wireDate: null,
      wireAmount: null,
      confirmedBy: null,
    });

    const campaign = await getCampaignDetail(createCtx(viewerId), { campaignId });

    expect(campaign.id).toBe(campaignId);
    expect(campaign.contributions).toHaveLength(1);
    expect(campaign.contributions[0]?.groupId).toBe(viewerGroupId);
  });

  it("rejects campaign access outside the caller neighborhood membership scope", async () => {
    const neighborhoodId = randomUUID();
    const viewerId = randomUUID();
    const creatorId = randomUUID();
    const campaignId = randomUUID();

    await db.insert(users).values({
      id: viewerId,
      email: "viewer@example.com",
      name: "Viewer",
    });
    await db.insert(users).values({
      id: creatorId,
      email: "creator@example.com",
      name: "Creator",
    });

    await db.insert(fundraisingCampaigns).values({
      id: campaignId,
      neighborhoodId,
      title: "Restricted Campaign",
      amount: "10.00",
      goalAmount: "100.00",
      dueDate: null,
      createdBy: creatorId,
    });

    await expect(
      getCampaignDetail(createCtx(viewerId), { campaignId })
    ).rejects.toMatchObject({ message: "Neighborhood membership required" });
  });

  it("rejects former or inactive group memberships for resident campaign detail access", async () => {
    const neighborhoodId = randomUUID();
    const viewerId = randomUUID();
    const creatorId = randomUUID();
    const groupId = randomUUID();
    const campaignId = randomUUID();

    await db.insert(users).values({
      id: viewerId,
      email: "viewer@example.com",
      name: "Viewer",
    });
    await db.insert(users).values({
      id: creatorId,
      email: "creator@example.com",
      name: "Creator",
    });

    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: viewerId,
      role: "neighbor",
      status: "active",
    });

    await db.insert(groups).values({
      id: groupId,
      neighborhoodId,
      name: "Former Group",
    });

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId,
      userId: viewerId,
      role: "group_member",
      status: "inactive",
    });

    await db.insert(fundraisingCampaigns).values({
      id: campaignId,
      neighborhoodId,
      title: "Inactive Membership Campaign",
      amount: "25.00",
      goalAmount: "250.00",
      dueDate: null,
      createdBy: creatorId,
    });

    await expect(
      getCampaignDetail(createCtx(viewerId), { campaignId })
    ).rejects.toMatchObject({ message: "Membership required" });
  });

  it("returns all contributions for a neighborhood admin in the campaign neighborhood", async () => {
    const neighborhoodId = randomUUID();
    const adminId = randomUUID();
    const otherUserId = randomUUID();
    const groupOneId = randomUUID();
    const groupTwoId = randomUUID();
    const campaignId = randomUUID();

    await db.insert(users).values({
      id: adminId,
      email: "admin@example.com",
      name: "Admin",
    });
    await db.insert(users).values({
      id: otherUserId,
      email: "other@example.com",
      name: "Other",
    });

    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: adminId,
      role: "neighborhood_admin",
      status: "active",
    });

    await db.insert(groups).values({
      id: groupOneId,
      neighborhoodId,
      name: "Group One",
    });
    await db.insert(groups).values({
      id: groupTwoId,
      neighborhoodId,
      name: "Group Two",
    });

    await db.insert(fundraisingCampaigns).values({
      id: campaignId,
      neighborhoodId,
      title: "Admin Campaign",
      amount: "100.00",
      goalAmount: "500.00",
      dueDate: null,
      createdBy: adminId,
    });

    await db.insert(fundraisingContributions).values({
      id: randomUUID(),
      campaignId,
      groupId: groupOneId,
      submittedBy: adminId,
      method: "cash",
      amount: "100.00",
      status: "submitted",
      wireDate: null,
      wireAmount: null,
      confirmedBy: null,
    });
    await db.insert(fundraisingContributions).values({
      id: randomUUID(),
      campaignId,
      groupId: groupTwoId,
      submittedBy: otherUserId,
      method: "cash",
      amount: "120.00",
      status: "confirmed",
      wireDate: null,
      wireAmount: null,
      confirmedBy: adminId,
    });

    const campaign = await getCampaignDetail(createCtx(adminId), { campaignId });

    expect(campaign.contributions).toHaveLength(2);
  });

  it("filters listCampaigns contribution summaries to active in-scope group memberships", async () => {
    const neighborhoodId = randomUUID();
    const viewerId = randomUUID();
    const activeGroupId = randomUUID();
    const inactiveGroupId = randomUUID();
    const creatorId = randomUUID();
    const campaignId = randomUUID();

    await db.insert(users).values({
      id: viewerId,
      email: "viewer@example.com",
      name: "Viewer",
    });
    await db.insert(users).values({
      id: creatorId,
      email: "creator@example.com",
      name: "Creator",
    });

    await db.insert(neighborhoodMemberships).values({
      id: randomUUID(),
      neighborhoodId,
      userId: viewerId,
      role: "neighbor",
      status: "active",
    });

    await db.insert(groups).values({
      id: activeGroupId,
      neighborhoodId,
      name: "Active Group",
    });
    await db.insert(groups).values({
      id: inactiveGroupId,
      neighborhoodId,
      name: "Inactive Group",
    });

    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId: activeGroupId,
      userId: viewerId,
      role: "group_member",
      status: "active",
    });
    await db.insert(groupMemberships).values({
      id: randomUUID(),
      groupId: inactiveGroupId,
      userId: viewerId,
      role: "group_member",
      status: "inactive",
    });

    await db.insert(fundraisingCampaigns).values({
      id: campaignId,
      neighborhoodId,
      title: "Campaign List Scope",
      amount: "50.00",
      goalAmount: "200.00",
      dueDate: null,
      createdBy: creatorId,
    });

    await db.insert(fundraisingContributions).values({
      id: randomUUID(),
      campaignId,
      groupId: activeGroupId,
      submittedBy: viewerId,
      method: "cash",
      amount: "50.00",
      status: "submitted",
      wireDate: null,
      wireAmount: null,
      confirmedBy: null,
    });
    await db.insert(fundraisingContributions).values({
      id: randomUUID(),
      campaignId,
      groupId: inactiveGroupId,
      submittedBy: viewerId,
      method: "cash",
      amount: "75.00",
      status: "submitted",
      wireDate: null,
      wireAmount: null,
      confirmedBy: null,
    });

    const campaigns = await listCampaigns(createCtx(viewerId));

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0]?.contributions).toHaveLength(1);
    expect(campaigns[0]?.contributions[0]?.groupId).toBe(activeGroupId);
  });
});
