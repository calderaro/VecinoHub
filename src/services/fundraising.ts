import { and, count, countDistinct, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  groupMemberships,
  groups,
  fundraisingContributions,
  fundraisingCampaigns,
  users,
} from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin, requireGroupMember } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, contributionMethodSchema } from "./validators";

const createCampaignSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  goalAmount: z.string().min(1),
  dueDate: z.date().optional(),
});

export async function createCampaign(
  ctx: ServiceContext,
  input: z.input<typeof createCampaignSchema>
) {
  requireAdmin(ctx);
  const { title, description, goalAmount, dueDate } =
    createCampaignSchema.parse(input);

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .where(eq(groupMemberships.status, "active"));
  const activeGroups = Number(activeGroupsResult[0]?.value ?? 0);
  const perGroupAmount =
    activeGroups > 0
      ? (Number(goalAmount) / activeGroups).toFixed(2)
      : goalAmount;

  const created = await db
    .insert(fundraisingCampaigns)
    .values({
      title,
      description,
      amount: perGroupAmount,
      goalAmount,
      dueDate: dueDate ? dueDate.toISOString().split("T")[0] : undefined,
      status: "open",
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

const updateCampaignSchema = z.object({
  campaignId: idSchema,
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  goalAmount: z.string().min(1).optional(),
  dueDate: z.date().optional(),
  status: z.enum(["open", "closed"]).optional(),
});

export async function updateCampaign(
  ctx: ServiceContext,
  input: z.input<typeof updateCampaignSchema>
) {
  requireAdmin(ctx);
  const { campaignId, goalAmount, ...data } =
    updateCampaignSchema.parse(input);

  let amount: string | undefined;
  if (goalAmount) {
    const activeGroupsResult = await db
      .select({ value: countDistinct(groupMemberships.groupId) })
      .from(groupMemberships)
      .where(eq(groupMemberships.status, "active"));
    const activeGroups = Number(activeGroupsResult[0]?.value ?? 0);
    amount =
      activeGroups > 0
        ? (Number(goalAmount) / activeGroups).toFixed(2)
        : goalAmount;
  }

  const { dueDate, ...restData } = data;
  const updated = await db
    .update(fundraisingCampaigns)
    .set({
      ...restData,
      goalAmount: goalAmount ?? undefined,
      amount: amount ?? undefined,
      dueDate: dueDate ? dueDate.toISOString().split("T")[0] : undefined,
    })
    .where(eq(fundraisingCampaigns.id, campaignId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  return updated[0];
}

const closeCampaignSchema = z.object({
  campaignId: idSchema,
});

export async function closeCampaign(
  ctx: ServiceContext,
  input: z.input<typeof closeCampaignSchema>
) {
  requireAdmin(ctx);
  const { campaignId } = closeCampaignSchema.parse(input);

  const updated = await db
    .update(fundraisingCampaigns)
    .set({ status: "closed" })
    .where(eq(fundraisingCampaigns.id, campaignId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  return updated[0];
}

const submitContributionSchema = z
  .object({
    campaignId: idSchema,
    groupId: idSchema,
    method: contributionMethodSchema,
    amount: z.string().min(1),
    wireReference: z.string().min(1).optional(),
    wireDate: z.date().optional(),
    wireAmount: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.method === "wire_transfer") {
      if (!value.wireReference || !value.wireDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Wire transfer details are required",
        });
      }
    }
  });

export async function submitContribution(
  ctx: ServiceContext,
  input: z.input<typeof submitContributionSchema>
) {
  const parsed = submitContributionSchema.parse(input);
  await requireGroupMember(ctx, parsed.groupId);

  const campaign = await db
    .select({ status: fundraisingCampaigns.status })
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.id, parsed.campaignId))
    .limit(1);

  if (!campaign[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  if (campaign[0].status !== "open") {
    throw new ServiceError("Campaign is closed", "INVALID");
  }

  const created = await db
    .insert(fundraisingContributions)
    .values({
      campaignId: parsed.campaignId,
      groupId: parsed.groupId,
      submittedBy: ctx.user.id,
      method: parsed.method,
      amount: parsed.amount,
      wireReference: parsed.wireReference,
      wireDate: parsed.wireDate ? parsed.wireDate.toISOString().split("T")[0] : undefined,
      wireAmount: parsed.method === "wire_transfer" ? parsed.amount : undefined,
      status: "submitted",
    })
    .returning({ id: fundraisingContributions.id });

  return created[0];
}

const deleteContributionSchema = z.object({
  contributionId: idSchema,
});

export async function deleteContribution(
  ctx: ServiceContext,
  input: z.input<typeof deleteContributionSchema>
) {
  const { contributionId } = deleteContributionSchema.parse(input);

  const contribution = await db
    .select({
      id: fundraisingContributions.id,
      submittedBy: fundraisingContributions.submittedBy,
      campaignId: fundraisingContributions.campaignId,
    })
    .from(fundraisingContributions)
    .where(eq(fundraisingContributions.id, contributionId))
    .limit(1);

  if (!contribution[0]) {
    throw new ServiceError("Contribution not found", "NOT_FOUND");
  }

  if (ctx.user.role !== "admin" && contribution[0].submittedBy !== ctx.user.id) {
    throw new ServiceError("Cannot delete this contribution", "FORBIDDEN");
  }

  const campaign = await db
    .select({ status: fundraisingCampaigns.status })
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.id, contribution[0].campaignId))
    .limit(1);

  if (!campaign[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  if (campaign[0].status !== "open") {
    throw new ServiceError("Campaign is closed", "INVALID");
  }

  const deleted = await db
    .delete(fundraisingContributions)
    .where(eq(fundraisingContributions.id, contributionId))
    .returning({ id: fundraisingContributions.id });

  if (!deleted[0]) {
    throw new ServiceError("Contribution not found", "NOT_FOUND");
  }

  return deleted[0];
}

const updateContributionStatusSchema = z.object({
  contributionId: idSchema,
  status: z.enum(["submitted", "confirmed", "rejected"]),
});

export async function updateContributionStatus(
  ctx: ServiceContext,
  input: z.input<typeof updateContributionStatusSchema>
) {
  requireAdmin(ctx);
  const { contributionId, status } = updateContributionStatusSchema.parse(input);

  const contribution = await db
    .select({
      id: fundraisingContributions.id,
      campaignId: fundraisingContributions.campaignId,
    })
    .from(fundraisingContributions)
    .where(eq(fundraisingContributions.id, contributionId))
    .limit(1);

  if (!contribution[0]) {
    throw new ServiceError("Contribution not found", "NOT_FOUND");
  }

  const campaign = await db
    .select({ status: fundraisingCampaigns.status })
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.id, contribution[0].campaignId))
    .limit(1);

  if (!campaign[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  if (campaign[0].status !== "open") {
    throw new ServiceError("Campaign is closed", "INVALID");
  }

  const updated = await db
    .update(fundraisingContributions)
    .set({
      status,
      confirmedBy: status === "confirmed" ? ctx.user.id : null,
    })
    .where(eq(fundraisingContributions.id, contributionId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Contribution not found", "NOT_FOUND");
  }

  return updated[0];
}

const confirmContributionSchema = z.object({
  contributionId: idSchema,
});

export async function confirmContribution(
  ctx: ServiceContext,
  input: z.input<typeof confirmContributionSchema>
) {
  const { contributionId } = confirmContributionSchema.parse(input);
  return updateContributionStatus(ctx, {
    contributionId,
    status: "confirmed",
  });
}

const rejectContributionSchema = z.object({
  contributionId: idSchema,
});

export async function rejectContribution(
  ctx: ServiceContext,
  input: z.input<typeof rejectContributionSchema>
) {
  const { contributionId } = rejectContributionSchema.parse(input);
  return updateContributionStatus(ctx, {
    contributionId,
    status: "rejected",
  });
}

export async function listCampaigns(ctx: ServiceContext) {
  if (ctx.user.role === "admin") {
    return db.select().from(fundraisingCampaigns);
  }

  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, ctx.user.id));

  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  const campaigns = await db.select().from(fundraisingCampaigns);
  const contributions = await db
    .select()
    .from(fundraisingContributions)
    .where(inArray(fundraisingContributions.groupId, groupIds));

  return campaigns.map((campaign) => ({
    ...campaign,
    contributions: contributions.filter((c) => c.campaignId === campaign.id),
  }));
}

const listCampaignsPagedSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["open", "closed"]).optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listCampaignsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listCampaignsPagedSchema>
) {
  const { query, status, limit, offset } = listCampaignsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;

  const filters = [
    search ? ilike(fundraisingCampaigns.title, search) : undefined,
    status ? eq(fundraisingCampaigns.status, status) : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      campaign: fundraisingCampaigns,
      creatorName: users.name,
    })
    .from(fundraisingCampaigns)
    .leftJoin(users, eq(fundraisingCampaigns.createdBy, users.id))
    .where(filters.length ? and(...(filters as [typeof fundraisingCampaigns.status, ...unknown[]])) : undefined)
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row.campaign,
    creatorName: row.creatorName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(fundraisingCampaigns)
    .where(filters.length ? and(...(filters as [typeof fundraisingCampaigns.status, ...unknown[]])) : undefined);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const getCampaignSchema = z.object({ campaignId: idSchema });

export async function getCampaignDetail(
  ctx: ServiceContext,
  input: z.input<typeof getCampaignSchema>
) {
  const { campaignId } = getCampaignSchema.parse(input);

  const campaign = await db
    .select()
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.id, campaignId))
    .limit(1);

  if (!campaign[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  if (ctx.user.role === "admin") {
    const contributions = await db
      .select({
        id: fundraisingContributions.id,
        campaignId: fundraisingContributions.campaignId,
        groupId: fundraisingContributions.groupId,
        groupName: groups.name,
        submittedBy: fundraisingContributions.submittedBy,
        submittedByName: users.name,
        submittedByEmail: users.email,
        method: fundraisingContributions.method,
        amount: fundraisingContributions.amount,
        wireReference: fundraisingContributions.wireReference,
        wireDate: fundraisingContributions.wireDate,
        wireAmount: fundraisingContributions.wireAmount,
        status: fundraisingContributions.status,
        confirmedBy: fundraisingContributions.confirmedBy,
        createdAt: fundraisingContributions.createdAt,
        updatedAt: fundraisingContributions.updatedAt,
      })
      .from(fundraisingContributions)
      .innerJoin(groups, eq(fundraisingContributions.groupId, groups.id))
      .innerJoin(users, eq(fundraisingContributions.submittedBy, users.id))
      .where(eq(fundraisingContributions.campaignId, campaignId));

    return { ...campaign[0], contributions };
  }

  const memberships = await db
    .select({ groupId: groupMemberships.groupId })
    .from(groupMemberships)
    .where(eq(groupMemberships.userId, ctx.user.id));

  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    throw new ServiceError("Membership required", "FORBIDDEN");
  }

  const contributions = await db
    .select()
    .from(fundraisingContributions)
    .where(
      and(
        eq(fundraisingContributions.campaignId, campaignId),
        inArray(fundraisingContributions.groupId, groupIds)
      )
    );

  return { ...campaign[0], contributions };
}

export async function listOpenCampaignsWithContributionCounts(ctx: ServiceContext) {
  requireAdmin(ctx);
  const openCampaigns = await db
    .select()
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.status, "open"));

  if (openCampaigns.length === 0) {
    return [];
  }

  const campaignIds = openCampaigns.map((campaign) => campaign.id);
  const contributionCounts = await db
    .select({ campaignId: fundraisingContributions.campaignId, total: count() })
    .from(fundraisingContributions)
    .where(inArray(fundraisingContributions.campaignId, campaignIds))
    .groupBy(fundraisingContributions.campaignId);

  const counts = new Map(
    contributionCounts.map((row) => [row.campaignId, Number(row.total)])
  );

  return openCampaigns.map((campaign) => ({
    ...campaign,
    contributionCount: counts.get(campaign.id) ?? 0,
  }));
}

const campaignParticipationSchema = z.object({ campaignId: idSchema });

export async function getCampaignParticipation(
  ctx: ServiceContext,
  input: z.input<typeof campaignParticipationSchema>
) {
  requireAdmin(ctx);
  const { campaignId } = campaignParticipationSchema.parse(input);

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .where(eq(groupMemberships.status, "active"));

  const contributingGroupsResult = await db
    .select({ value: countDistinct(fundraisingContributions.groupId) })
    .from(fundraisingContributions)
    .innerJoin(
      groupMemberships,
      and(
        eq(fundraisingContributions.groupId, groupMemberships.groupId),
        eq(groupMemberships.status, "active")
      )
    )
    .where(eq(fundraisingContributions.campaignId, campaignId));

  return {
    activeGroups: Number(activeGroupsResult[0]?.value ?? 0),
    contributingGroups: Number(contributingGroupsResult[0]?.value ?? 0),
  };
}

export async function getFundraisingStats(ctx: ServiceContext) {
  requireAdmin(ctx);

  const openCampaignsResult = await db
    .select({ value: count() })
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.status, "open"));

  const pendingContributionsResult = await db
    .select({ value: count() })
    .from(fundraisingContributions)
    .where(eq(fundraisingContributions.status, "submitted"));

  return {
    openCampaigns: Number(openCampaignsResult[0]?.value ?? 0),
    pendingContributions: Number(pendingContributionsResult[0]?.value ?? 0),
  };
}

export async function listOpenCampaignsWithProgress(ctx: ServiceContext) {
  requireAdmin(ctx);

  const openCampaigns = await db
    .select()
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.status, "open"));

  if (openCampaigns.length === 0) {
    return [];
  }

  const campaignIds = openCampaigns.map((c) => c.id);

  const contributions = await db
    .select({
      campaignId: fundraisingContributions.campaignId,
      totalAmount: sql<string>`COALESCE(SUM(CASE WHEN ${fundraisingContributions.status} = 'confirmed' THEN ${fundraisingContributions.amount}::numeric ELSE 0 END), 0)`,
      totalCount: count(),
      pendingCount: sql<number>`SUM(CASE WHEN ${fundraisingContributions.status} = 'submitted' THEN 1 ELSE 0 END)`,
      confirmedCount: sql<number>`SUM(CASE WHEN ${fundraisingContributions.status} = 'confirmed' THEN 1 ELSE 0 END)`,
    })
    .from(fundraisingContributions)
    .where(inArray(fundraisingContributions.campaignId, campaignIds))
    .groupBy(fundraisingContributions.campaignId);

  const contributionMap = new Map(
    contributions.map((c) => [
      c.campaignId,
      {
        totalAmount: Number(c.totalAmount),
        totalCount: Number(c.totalCount),
        pendingCount: Number(c.pendingCount),
        confirmedCount: Number(c.confirmedCount),
      },
    ])
  );

  return openCampaigns.map((campaign) => {
    const stats = contributionMap.get(campaign.id) ?? {
      totalAmount: 0,
      totalCount: 0,
      pendingCount: 0,
      confirmedCount: 0,
    };
    const goalAmount = Number(campaign.goalAmount);
    const progress = goalAmount > 0 ? (stats.totalAmount / goalAmount) * 100 : 0;

    return {
      ...campaign,
      collectedAmount: stats.totalAmount,
      contributionCount: stats.totalCount,
      pendingCount: stats.pendingCount,
      confirmedCount: stats.confirmedCount,
      progress: Math.min(progress, 100),
    };
  });
}

export async function listPendingContributions(ctx: ServiceContext, limit = 10) {
  requireAdmin(ctx);

  const rows = await db
    .select({
      contribution: fundraisingContributions,
      groupName: groups.name,
      submitterName: users.name,
      campaignTitle: fundraisingCampaigns.title,
    })
    .from(fundraisingContributions)
    .innerJoin(groups, eq(fundraisingContributions.groupId, groups.id))
    .innerJoin(users, eq(fundraisingContributions.submittedBy, users.id))
    .innerJoin(
      fundraisingCampaigns,
      eq(fundraisingContributions.campaignId, fundraisingCampaigns.id)
    )
    .where(eq(fundraisingContributions.status, "submitted"))
    .orderBy(fundraisingContributions.createdAt)
    .limit(limit);

  return rows.map((row) => ({
    ...row.contribution,
    groupName: row.groupName,
    submitterName: row.submitterName,
    campaignTitle: row.campaignTitle,
  }));
}
