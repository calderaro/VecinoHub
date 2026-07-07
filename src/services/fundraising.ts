import { and, count, countDistinct, eq, ilike, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  groupMemberships,
  groups,
  fundraisingContributions,
  fundraisingCampaigns,
  neighborhoods,
  users,
} from "@/db/schema";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  listNeighborhoodAdminIdsForUser,
  listNeighborhoodIdsForUser,
  requireGroupMember,
  requireNeighborhoodAdminOrPlatform,
  requirePlatformAdmin,
} from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, contributionMethodSchema } from "./validators";

function combineFilters<T>(filters: Array<T | undefined>) {
  const filtered = filters.filter((filter): filter is T => Boolean(filter));
  if (filtered.length === 0) {
    return undefined;
  }

  const [first, ...rest] = filtered;
  return and(first as never, ...(rest as never[]));
}

async function getCampaignScope(campaignId: string) {
  const campaign = await db
    .select({
      id: fundraisingCampaigns.id,
      neighborhoodId: fundraisingCampaigns.neighborhoodId,
      status: fundraisingCampaigns.status,
    })
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.id, campaignId))
    .limit(1);

  if (!campaign[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  return campaign[0];
}

async function requireCampaignAdminScope(ctx: ServiceContext, campaignId: string) {
  const campaign = await getCampaignScope(campaignId);
  if (!campaign.neighborhoodId) {
    requirePlatformAdmin(ctx);
    return campaign;
  }

  await requireNeighborhoodAdminOrPlatform(ctx, campaign.neighborhoodId);
  return campaign;
}

async function requireNeighborhoodAdminScope(ctx: ServiceContext) {
  if (isPlatformAdmin(ctx)) {
    return null;
  }

  const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
  if (!neighborhoodAdminIds || neighborhoodAdminIds.length === 0) {
    throw new ServiceError("Admin access required", "FORBIDDEN");
  }

  return neighborhoodAdminIds;
}

const createCampaignSchema = z.object({
  neighborhoodId: idSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  goalAmount: z.string().min(1),
  dueDate: z.date().optional(),
});

export async function createCampaign(
  ctx: ServiceContext,
  input: z.input<typeof createCampaignSchema>
) {
  const { neighborhoodId, title, description, goalAmount, dueDate } =
    createCampaignSchema.parse(input);
  let resolvedNeighborhoodId = neighborhoodId;
  if (!resolvedNeighborhoodId) {
    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    resolvedNeighborhoodId = neighborhoodAdminIds?.[0];
  }
  if (!resolvedNeighborhoodId && isPlatformAdmin(ctx)) {
    const firstNeighborhood = await db.select({ id: neighborhoods.id }).from(neighborhoods).limit(1);
    resolvedNeighborhoodId = firstNeighborhood[0]?.id;
  }
  if (!resolvedNeighborhoodId) {
    throw new ServiceError("Neighborhood is required", "INVALID");
  }

  await requireNeighborhoodAdminOrPlatform(ctx, resolvedNeighborhoodId);

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(
      and(
        eq(groupMemberships.status, "active"),
        eq(groups.neighborhoodId, resolvedNeighborhoodId)
      )
    );
  const activeGroups = Number(activeGroupsResult[0]?.value ?? 0);
  const perGroupAmount =
    activeGroups > 0
      ? (Number(goalAmount) / activeGroups).toFixed(2)
      : goalAmount;

  const created = await db
    .insert(fundraisingCampaigns)
    .values({
      neighborhoodId: resolvedNeighborhoodId,
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
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  goalAmount: z.string().min(1).optional(),
  dueDate: z.date().optional(),
  status: z.enum(["open", "closed"]).optional(),
});

export async function updateCampaign(
  ctx: ServiceContext,
  input: z.input<typeof updateCampaignSchema>
) {
  const { campaignId, goalAmount, ...data } =
    updateCampaignSchema.parse(input);
  const campaign = await requireCampaignAdminScope(ctx, campaignId);

  let amount: string | undefined;
  if (goalAmount) {
    const activeGroupsResult = await db
      .select({ value: countDistinct(groupMemberships.groupId) })
      .from(groupMemberships)
      .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
      .where(
        campaign.neighborhoodId
          ? and(
              eq(groupMemberships.status, "active"),
              eq(groups.neighborhoodId, campaign.neighborhoodId)
            )
          : eq(groupMemberships.status, "active")
      );
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
  const { campaignId } = closeCampaignSchema.parse(input);
  await requireCampaignAdminScope(ctx, campaignId);

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
    amount: z
      .string()
      .trim()
      .refine((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0;
      }, "Amount must be a positive number"),
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
  const parsedResult = submitContributionSchema.safeParse(input);
  if (!parsedResult.success) {
    const message = parsedResult.error.issues[0]?.message ?? "Invalid contribution";
    throw new ServiceError(message, "INVALID");
  }
  const parsed = parsedResult.data;
  const groupScope = await requireGroupMember(ctx, parsed.groupId);

  const campaign = await db
    .select({
      status: fundraisingCampaigns.status,
      neighborhoodId: fundraisingCampaigns.neighborhoodId,
    })
    .from(fundraisingCampaigns)
    .where(eq(fundraisingCampaigns.id, parsed.campaignId))
    .limit(1);

  if (!campaign[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  if (campaign[0].status !== "open") {
    throw new ServiceError("Campaign is closed", "INVALID");
  }

  if (campaign[0].neighborhoodId && groupScope.neighborhoodId) {
    if (campaign[0].neighborhoodId !== groupScope.neighborhoodId) {
      throw new ServiceError(
        "Group and campaign belong to different neighborhoods",
        "FORBIDDEN"
      );
    }
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

  const campaignScope = await getCampaignScope(contribution[0].campaignId);
  const isOwner = contribution[0].submittedBy === ctx.user.id;

  if (!isOwner && !isPlatformAdmin(ctx)) {
    if (!campaignScope.neighborhoodId) {
      throw new ServiceError("Cannot delete this contribution", "FORBIDDEN");
    }

    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    if (!neighborhoodAdminIds || !neighborhoodAdminIds.includes(campaignScope.neighborhoodId)) {
      throw new ServiceError("Cannot delete this contribution", "FORBIDDEN");
    }
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

  await requireCampaignAdminScope(ctx, contribution[0].campaignId);

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
  const campaigns = isPlatformAdmin(ctx)
    ? await db.select().from(fundraisingCampaigns)
    : await (async () => {
        const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
        if (!neighborhoodIds || neighborhoodIds.length === 0) {
          return [];
        }

        return db
          .select()
          .from(fundraisingCampaigns)
          .where(inArray(fundraisingCampaigns.neighborhoodId, neighborhoodIds));
      })();

  if (campaigns.length === 0) {
    return [];
  }

  const contributions = isPlatformAdmin(ctx)
    ? await db.select().from(fundraisingContributions)
    : await (async () => {
        const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
        if (!neighborhoodIds || neighborhoodIds.length === 0) {
          return [];
        }

        const memberships = await db
          .select({ groupId: groupMemberships.groupId })
          .from(groupMemberships)
          .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
          .where(
            and(
              eq(groupMemberships.userId, ctx.user.id),
              eq(groupMemberships.status, "active"),
              inArray(groups.neighborhoodId, neighborhoodIds)
            )
          );

        const groupIds = memberships.map((membership) => membership.groupId);
        if (groupIds.length === 0) {
          return [];
        }

        return db
          .select()
          .from(fundraisingContributions)
          .where(inArray(fundraisingContributions.groupId, groupIds));
      })();

  return campaigns.map((campaign) => ({
    ...campaign,
    contributions: contributions.filter((c) => c.campaignId === campaign.id),
  }));
}

const listCampaignsPagedSchema = z.object({
  neighborhoodId: idSchema.optional(),
  query: z.string().optional(),
  status: z.enum(["open", "closed"]).optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listCampaignsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listCampaignsPagedSchema>
) {
  const { neighborhoodId, query, status, limit, offset } =
    listCampaignsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;

  const searchFilter = search ? ilike(fundraisingCampaigns.title, search) : undefined;
  const statusFilter = status ? eq(fundraisingCampaigns.status, status) : undefined;
  let scopeFilter = neighborhoodId
    ? eq(fundraisingCampaigns.neighborhoodId, neighborhoodId)
    : undefined;

  if (!isPlatformAdmin(ctx)) {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      return { items: [], total: 0 };
    }

    scopeFilter = scopeFilter
      ? and(scopeFilter, inArray(fundraisingCampaigns.neighborhoodId, neighborhoodIds))
      : inArray(fundraisingCampaigns.neighborhoodId, neighborhoodIds);
  }

  const combinedFilter = combineFilters([searchFilter, statusFilter, scopeFilter]);

  const rows = await db
    .select({
      campaign: fundraisingCampaigns,
      creatorName: users.name,
    })
    .from(fundraisingCampaigns)
    .leftJoin(users, eq(fundraisingCampaigns.createdBy, users.id))
    .where(combinedFilter)
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row.campaign,
    creatorName: row.creatorName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(fundraisingCampaigns)
    .where(combinedFilter);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const campaignProgressSchema = z.object({
  campaignIds: z.array(idSchema).max(200),
});

export async function getCampaignProgressByIds(
  ctx: ServiceContext,
  input: z.input<typeof campaignProgressSchema>
) {
  const { campaignIds } = campaignProgressSchema.parse(input);
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);

  if (campaignIds.length === 0) {
    return new Map<string, { raisedAmount: number; pendingCount: number }>();
  }

  let allowedCampaignIds = campaignIds;
  if (!isPlatformAdmin(ctx)) {
    const scopedCampaigns = await db
      .select({ id: fundraisingCampaigns.id })
      .from(fundraisingCampaigns)
      .where(
        and(
          inArray(fundraisingCampaigns.id, campaignIds),
          inArray(fundraisingCampaigns.neighborhoodId, neighborhoodAdminIds ?? [])
        )
      );
    allowedCampaignIds = scopedCampaigns.map((row) => row.id);
  }

  if (allowedCampaignIds.length === 0) {
    return new Map<string, { raisedAmount: number; pendingCount: number }>();
  }

  const rows = await db
    .select({
      campaignId: fundraisingContributions.campaignId,
      raisedAmount: sql<string>`COALESCE(SUM(CASE WHEN ${fundraisingContributions.status} = 'confirmed' THEN ${fundraisingContributions.amount}::numeric ELSE 0 END), 0)`,
      pendingCount: sql<number>`SUM(CASE WHEN ${fundraisingContributions.status} = 'submitted' THEN 1 ELSE 0 END)`,
    })
    .from(fundraisingContributions)
    .where(inArray(fundraisingContributions.campaignId, allowedCampaignIds))
    .groupBy(fundraisingContributions.campaignId);

  return new Map(
    rows.map((row) => [
      row.campaignId,
      {
        raisedAmount: Number(row.raisedAmount),
        pendingCount: Number(row.pendingCount),
      },
    ])
  );
}

const getCampaignSchema = z.object({ campaignId: idSchema });

const getResidentCampaignSchema = z.object({
  campaignId: idSchema,
  groupId: idSchema,
});

async function getCampaignDetailRow(campaignId: string) {
  const campaignRows = await db
    .select({
      campaign: fundraisingCampaigns,
      creatorName: users.name,
    })
    .from(fundraisingCampaigns)
    .leftJoin(users, eq(fundraisingCampaigns.createdBy, users.id))
    .where(eq(fundraisingCampaigns.id, campaignId))
    .limit(1);

  if (!campaignRows[0]) {
    throw new ServiceError("Campaign not found", "NOT_FOUND");
  }

  return {
    ...campaignRows[0].campaign,
    creatorName: campaignRows[0].creatorName,
  };
}

export async function getCampaignDetail(
  ctx: ServiceContext,
  input: z.input<typeof getCampaignSchema>
) {
  const { campaignId } = getCampaignSchema.parse(input);
  await requireCampaignAdminScope(ctx, campaignId);
  const campaign = await getCampaignDetailRow(campaignId);

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

  return { ...campaign, contributions };
}

export async function getResidentCampaignDetail(
  ctx: ServiceContext,
  input: z.input<typeof getResidentCampaignSchema>
) {
  const { campaignId, groupId } = getResidentCampaignSchema.parse(input);
  const groupScope = await requireGroupMember(ctx, groupId);
  const campaign = await getCampaignDetailRow(campaignId);

  if (!campaign.neighborhoodId || campaign.neighborhoodId !== groupScope.neighborhoodId) {
    throw new ServiceError("Group and campaign belong to different neighborhoods", "FORBIDDEN");
  }

  const contributions = await db
    .select({
      id: fundraisingContributions.id,
      campaignId: fundraisingContributions.campaignId,
      method: fundraisingContributions.method,
      amount: fundraisingContributions.amount,
      status: fundraisingContributions.status,
      createdAt: fundraisingContributions.createdAt,
      updatedAt: fundraisingContributions.updatedAt,
    })
    .from(fundraisingContributions)
    .where(
      and(
        eq(fundraisingContributions.campaignId, campaignId),
        eq(fundraisingContributions.groupId, groupId),
        eq(fundraisingContributions.submittedBy, ctx.user.id)
      )
    );

  return { ...campaign, contributions };
}

export async function listOpenCampaignsWithContributionCounts(ctx: ServiceContext) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const openCampaigns = await db
    .select()
    .from(fundraisingCampaigns)
    .where(
      isPlatformAdmin(ctx)
        ? eq(fundraisingCampaigns.status, "open")
        : and(
            eq(fundraisingCampaigns.status, "open"),
            inArray(fundraisingCampaigns.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    );

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
  const { campaignId } = campaignParticipationSchema.parse(input);
  const campaign = await requireCampaignAdminScope(ctx, campaignId);

  const activeGroupsResult = campaign.neighborhoodId
    ? await db
        .select({ value: countDistinct(groupMemberships.groupId) })
        .from(groupMemberships)
        .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
        .where(
          and(
            eq(groupMemberships.status, "active"),
            eq(groups.neighborhoodId, campaign.neighborhoodId)
          )
        )
    : await db
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
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const scopeFilter = isPlatformAdmin(ctx)
    ? undefined
    : inArray(fundraisingCampaigns.neighborhoodId, neighborhoodAdminIds ?? []);

  const openCampaignsResult = await db
    .select({ value: count() })
    .from(fundraisingCampaigns)
    .where(combineFilters([eq(fundraisingCampaigns.status, "open"), scopeFilter]));

  const contributionsScopeFilter = isPlatformAdmin(ctx)
    ? undefined
    : inArray(fundraisingContributions.campaignId,
        (
          await db
            .select({ id: fundraisingCampaigns.id })
            .from(fundraisingCampaigns)
            .where(inArray(fundraisingCampaigns.neighborhoodId, neighborhoodAdminIds ?? []))
        ).map((row) => row.id)
      );
  const pendingContributionsResult = await db
    .select({ value: count() })
    .from(fundraisingContributions)
    .where(
      combineFilters([
        eq(fundraisingContributions.status, "submitted"),
        contributionsScopeFilter,
      ])
    );

  return {
    openCampaigns: Number(openCampaignsResult[0]?.value ?? 0),
    pendingContributions: Number(pendingContributionsResult[0]?.value ?? 0),
  };
}

export async function listOpenCampaignsWithProgress(ctx: ServiceContext) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);

  const openCampaigns = await db
    .select()
    .from(fundraisingCampaigns)
    .where(
      isPlatformAdmin(ctx)
        ? eq(fundraisingCampaigns.status, "open")
        : and(
            eq(fundraisingCampaigns.status, "open"),
            inArray(fundraisingCampaigns.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    );

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
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);

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
    .where(
      isPlatformAdmin(ctx)
        ? eq(fundraisingContributions.status, "submitted")
        : and(
            eq(fundraisingContributions.status, "submitted"),
            inArray(fundraisingCampaigns.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    )
    .orderBy(fundraisingContributions.createdAt)
    .limit(limit);

  return rows.map((row) => ({
    ...row.contribution,
    groupName: row.groupName,
    submitterName: row.submitterName,
    campaignTitle: row.campaignTitle,
  }));
}
