import { and, count, countDistinct, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { groupMemberships, groups, neighborhoods, pollOptions, polls, users, votes } from "@/db/schema";

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
import { idSchema } from "./validators";

async function getPollRecord(pollId: string) {
  const poll = await db
    .select({ status: polls.status, neighborhoodId: polls.neighborhoodId })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  return poll[0];
}

async function requirePollAdminScope(ctx: ServiceContext, pollId: string) {
  const poll = await getPollRecord(pollId);
  if (!poll.neighborhoodId) {
    requirePlatformAdmin(ctx);
    return poll;
  }

  await requireNeighborhoodAdminOrPlatform(ctx, poll.neighborhoodId);
  return poll;
}

async function requireDraftPoll(pollId: string) {
  const poll = await getPollRecord(pollId);

  if (poll.status !== "draft") {
    throw new ServiceError("Poll options can only be edited in draft", "INVALID");
  }
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

function combineFilters<T>(filters: Array<T | undefined>) {
  const filtered = filters.filter((filter): filter is T => Boolean(filter));
  if (filtered.length === 0) {
    return undefined;
  }

  const [first, ...rest] = filtered;
  return and(first as never, ...(rest as never[]));
}

const createPollSchema = z.object({
  neighborhoodId: idSchema.optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        description: z.string().optional(),
        amount: z.string().optional(),
      })
    )
    .optional(),
});

export async function createPoll(
  ctx: ServiceContext,
  input: z.input<typeof createPollSchema>
) {
  const { neighborhoodId, title, description, options } = createPollSchema.parse(input);
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

  return db.transaction(async (tx) => {
    const createdPoll = await tx
      .insert(polls)
      .values({
        neighborhoodId: resolvedNeighborhoodId,
        title,
        description,
        status: "draft",
        createdBy: ctx.user.id,
      })
      .returning();

    const poll = createdPoll[0];
    if (!poll) {
      throw new ServiceError("Failed to create poll", "INVALID");
    }

    if (options && options.length > 0) {
      await tx.insert(pollOptions).values(
        options.map((option, index) => ({
          pollId: poll.id,
          label: option.label.trim(),
          description: option.description?.trim() || null,
          amount: option.amount?.trim() || null,
          sortOrder: index + 1,
        }))
      );
    }

    return poll;
  });
}

const updatePollSchema = z.object({
  pollId: idSchema,
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
});

export async function updatePoll(
  ctx: ServiceContext,
  input: z.input<typeof updatePollSchema>
) {
  const { pollId, ...data } = updatePollSchema.parse(input);
  await requirePollAdminScope(ctx, pollId);

  // Draft is the only state where options are editable/deletable
  // (requireDraftPoll). Letting a voted poll return to draft would allow option
  // edits/removals that orphan existing votes. resetPoll is the sanctioned path
  // back to draft — it clears the votes first.
  if (data.status === "draft") {
    const [voteRow] = await db
      .select({ value: count() })
      .from(votes)
      .where(eq(votes.pollId, pollId));

    if ((voteRow?.value ?? 0) > 0) {
      throw new ServiceError(
        "Reset the poll to return it to draft; it still has votes",
        "INVALID"
      );
    }
  }

  const updated = await db
    .update(polls)
    .set(data)
    .where(eq(polls.id, pollId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  return updated[0];
}

const closePollSchema = z.object({
  pollId: idSchema,
});

export async function closePoll(
  ctx: ServiceContext,
  input: z.input<typeof closePollSchema>
) {
  const { pollId } = closePollSchema.parse(input);
  await requirePollAdminScope(ctx, pollId);

  const updated = await db
    .update(polls)
    .set({ status: "closed" })
    .where(eq(polls.id, pollId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  return updated[0];
}

const reopenPollSchema = z.object({
  pollId: idSchema,
});

export async function reopenPoll(
  ctx: ServiceContext,
  input: z.input<typeof reopenPollSchema>
) {
  const { pollId } = reopenPollSchema.parse(input);
  await requirePollAdminScope(ctx, pollId);

  const updated = await db
    .update(polls)
    .set({ status: "active" })
    .where(eq(polls.id, pollId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  return updated[0];
}

const resetPollSchema = z.object({
  pollId: idSchema,
});

export async function resetPoll(
  ctx: ServiceContext,
  input: z.input<typeof resetPollSchema>
) {
  const { pollId } = resetPollSchema.parse(input);
  await requirePollAdminScope(ctx, pollId);

  const poll = await db
    .select({ status: polls.status })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  if (poll[0].status === "draft") {
    throw new ServiceError("Poll is already in draft", "INVALID");
  }

  await db.delete(votes).where(eq(votes.pollId, pollId));

  const updated = await db
    .update(polls)
    .set({ status: "draft" })
    .where(eq(polls.id, pollId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  return updated[0];
}

const addOptionSchema = z.object({
  pollId: idSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().optional(),
  sortOrder: z.number().int().positive().optional(),
});

export async function addOption(
  ctx: ServiceContext,
  input: z.input<typeof addOptionSchema>
) {
  const { pollId, label, description, amount, sortOrder } =
    addOptionSchema.parse(input);
  await requirePollAdminScope(ctx, pollId);
  await requireDraftPoll(pollId);

  const created = await db
    .insert(pollOptions)
    .values({
      pollId,
      label: label.trim(),
      description: description?.trim() || null,
      amount: amount?.trim() || null,
      sortOrder: sortOrder ?? 1,
    })
    .returning();

  return created[0];
}

const updateOptionSchema = z.object({
  optionId: idSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  amount: z.string().optional(),
});

export async function updateOption(
  ctx: ServiceContext,
  input: z.input<typeof updateOptionSchema>
) {
  const { optionId, label, description, amount } =
    updateOptionSchema.parse(input);

  const optionPoll = await db
    .select({ pollId: pollOptions.pollId })
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);

  if (!optionPoll[0]) {
    throw new ServiceError("Option not found", "NOT_FOUND");
  }

  await requirePollAdminScope(ctx, optionPoll[0].pollId);
  await requireDraftPoll(optionPoll[0].pollId);

  const updated = await db
    .update(pollOptions)
    .set({
      label: label.trim(),
      description: description?.trim() || null,
      amount: amount?.trim() || null,
    })
    .where(eq(pollOptions.id, optionId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Option not found", "NOT_FOUND");
  }

  return updated[0];
}

const removeOptionSchema = z.object({
  optionId: idSchema,
});

export async function removeOption(
  ctx: ServiceContext,
  input: z.input<typeof removeOptionSchema>
) {
  const { optionId } = removeOptionSchema.parse(input);

  const optionPoll = await db
    .select({ pollId: pollOptions.pollId })
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);

  if (!optionPoll[0]) {
    throw new ServiceError("Option not found", "NOT_FOUND");
  }

  await requirePollAdminScope(ctx, optionPoll[0].pollId);
  await requireDraftPoll(optionPoll[0].pollId);

  const removed = await db
    .delete(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .returning();

  if (!removed[0]) {
    throw new ServiceError("Option not found", "NOT_FOUND");
  }

  return removed[0];
}

const voteSchema = z.object({
  pollId: idSchema,
  groupId: idSchema,
  optionId: idSchema,
});

export async function voteInPoll(
  ctx: ServiceContext,
  input: z.input<typeof voteSchema>
) {
  const { pollId, groupId, optionId } = voteSchema.parse(input);
  const groupScope = await requireGroupMember(ctx, groupId);

  const poll = await db
    .select({ status: polls.status, neighborhoodId: polls.neighborhoodId })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  if (poll[0].status !== "active") {
    throw new ServiceError("Poll is not active", "INVALID");
  }

  if (poll[0].neighborhoodId && groupScope.neighborhoodId) {
    if (poll[0].neighborhoodId !== groupScope.neighborhoodId) {
      throw new ServiceError("Group and poll belong to different neighborhoods", "FORBIDDEN");
    }
  }

  const option = await db
    .select({ id: pollOptions.id, pollId: pollOptions.pollId })
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);

  if (!option[0]) {
    throw new ServiceError("Option not found", "NOT_FOUND");
  }

  if (option[0].pollId !== pollId) {
    throw new ServiceError("Option does not belong to poll", "INVALID");
  }

  const existingVote = await db
    .select({ id: votes.id })
    .from(votes)
    .where(and(eq(votes.pollId, pollId), eq(votes.groupId, groupId)))
    .limit(1);

  if (existingVote[0]) {
    const updated = await db
      .update(votes)
      .set({ optionId, createdBy: ctx.user.id })
      .where(eq(votes.id, existingVote[0].id))
      .returning();

    return updated[0];
  }

  const created = await db
    .insert(votes)
    .values({
      pollId,
      groupId,
      optionId,
      createdBy: ctx.user.id,
    })
    .returning();

  return created[0];
}

export async function listPolls(ctx: ServiceContext) {
  if (isPlatformAdmin(ctx)) {
    return db.select().from(polls);
  }

  const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
  if (!neighborhoodIds || neighborhoodIds.length === 0) {
    return [];
  }

  const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
  const canViewAllStatuses = Boolean(neighborhoodAdminIds && neighborhoodAdminIds.length > 0);

  return db
    .select()
    .from(polls)
    .where(
      canViewAllStatuses
        ? inArray(polls.neighborhoodId, neighborhoodIds)
        : and(inArray(polls.neighborhoodId, neighborhoodIds), eq(polls.status, "active"))
    );
}

const listPollsPagedSchema = z.object({
  neighborhoodId: idSchema.optional(),
  query: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listPollsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listPollsPagedSchema>
) {
  const { neighborhoodId, query, status, limit, offset } = listPollsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;

  const searchFilter = search ? ilike(polls.title, search) : undefined;
  const neighborhoodFilter = neighborhoodId ? eq(polls.neighborhoodId, neighborhoodId) : undefined;

  let statusFilter;
  let scopeFilter = neighborhoodFilter;
  if (isPlatformAdmin(ctx)) {
    statusFilter = status ? eq(polls.status, status) : undefined;
  } else {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      return { items: [], total: 0 };
    }
    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    const canViewAllStatuses = Boolean(neighborhoodAdminIds && neighborhoodAdminIds.length > 0);
    scopeFilter = scopeFilter
      ? and(scopeFilter, inArray(polls.neighborhoodId, neighborhoodIds))
      : inArray(polls.neighborhoodId, neighborhoodIds);
    statusFilter = canViewAllStatuses
      ? status
        ? eq(polls.status, status)
        : undefined
      : eq(polls.status, "active");
  }

  const combinedFilter = combineFilters([searchFilter, statusFilter, scopeFilter]);

  const rows = await db
    .select({
      poll: polls,
      creatorName: users.name,
    })
    .from(polls)
    .leftJoin(users, eq(polls.createdBy, users.id))
    .where(combinedFilter)
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row.poll,
    creatorName: row.creatorName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(polls)
    .where(combinedFilter);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const pollVoteCountsSchema = z.object({
  pollIds: z.array(idSchema).max(200),
});

export async function getPollVoteCounts(
  ctx: ServiceContext,
  input: z.input<typeof pollVoteCountsSchema>
) {
  const { pollIds } = pollVoteCountsSchema.parse(input);

  if (pollIds.length === 0) {
    return new Map<string, number>();
  }

  let allowedPollIds = pollIds;
  if (!isPlatformAdmin(ctx)) {
    const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
    const scopedPollRows = await db
      .select({ id: polls.id })
      .from(polls)
      .where(
        and(
          inArray(polls.id, pollIds),
          inArray(polls.neighborhoodId, neighborhoodAdminIds ?? [])
        )
      );
    allowedPollIds = scopedPollRows.map((row) => row.id);
  }

  if (allowedPollIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await db
    .select({
      pollId: votes.pollId,
      total: count(),
    })
    .from(votes)
    .where(inArray(votes.pollId, allowedPollIds))
    .groupBy(votes.pollId);

  return new Map(rows.map((row) => [row.pollId, Number(row.total)]));
}

export async function listPollsWithOptions(ctx: ServiceContext) {
  const pollList = await listPolls(ctx);
  const pollIds = pollList.map((poll) => poll.id);

  if (pollIds.length === 0) {
    return [];
  }

  const options = await db
    .select()
    .from(pollOptions)
    .where(inArray(pollOptions.pollId, pollIds));

  return pollList.map((poll) => ({
    ...poll,
    options: options.filter((option) => option.pollId === poll.id),
  }));
}

const getPollSchema = z.object({ pollId: idSchema });

export async function getPollWithOptions(
  ctx: ServiceContext,
  input: z.input<typeof getPollSchema>
) {
  const { pollId } = getPollSchema.parse(input);
  const pollRows = await db
    .select({
      poll: polls,
      creatorName: users.name,
    })
    .from(polls)
    .leftJoin(users, eq(polls.createdBy, users.id))
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!pollRows[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }
  const poll = {
    ...pollRows[0].poll,
    creatorName: pollRows[0].creatorName,
  };

  if (!isPlatformAdmin(ctx)) {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      throw new ServiceError("Poll not available", "FORBIDDEN");
    }

    if (!poll.neighborhoodId || !neighborhoodIds.includes(poll.neighborhoodId)) {
      throw new ServiceError("Poll not available", "FORBIDDEN");
    }

    if (poll.status !== "active") {
      const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
      if (!neighborhoodAdminIds || !neighborhoodAdminIds.includes(poll.neighborhoodId)) {
        throw new ServiceError("Poll not available", "FORBIDDEN");
      }
    }
  }

  const options = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId));

  return { ...poll, options };
}

export async function getPollResults(
  ctx: ServiceContext,
  input: z.input<typeof getPollSchema>
) {
  const { pollId } = getPollSchema.parse(input);
  await requirePollAdminScope(ctx, pollId);

  const options = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId));

  const pollVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.pollId, pollId));

  const counts = pollVotes.reduce<Record<string, number>>((acc, vote) => {
    acc[vote.optionId] = (acc[vote.optionId] ?? 0) + 1;
    return acc;
  }, {});

  return options.map((option) => ({
    id: option.id,
    label: option.label,
    count: counts[option.id] ?? 0,
  }));
}

const pollParticipationSchema = z.object({ pollId: idSchema });

export async function getPollParticipation(
  ctx: ServiceContext,
  input: z.input<typeof pollParticipationSchema>
) {
  const { pollId } = pollParticipationSchema.parse(input);
  const poll = await requirePollAdminScope(ctx, pollId);

  const activeGroupsResult = poll.neighborhoodId
    ? await db
        .select({ value: countDistinct(groupMemberships.groupId) })
        .from(groupMemberships)
        .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
        .where(and(eq(groupMemberships.status, "active"), eq(groups.neighborhoodId, poll.neighborhoodId)))
    : await db
        .select({ value: countDistinct(groupMemberships.groupId) })
        .from(groupMemberships)
        .where(eq(groupMemberships.status, "active"));

  const votedGroupsResult = await db
    .select({ value: countDistinct(votes.groupId) })
    .from(votes)
    .where(eq(votes.pollId, pollId));

  return {
    activeGroups: Number(activeGroupsResult[0]?.value ?? 0),
    votedGroups: Number(votedGroupsResult[0]?.value ?? 0),
  };
}

export async function listOpenPollsWithVoteCounts(ctx: ServiceContext) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const openPolls = await db
    .select()
    .from(polls)
    .where(
      isPlatformAdmin(ctx)
        ? eq(polls.status, "active")
        : and(
            eq(polls.status, "active"),
            inArray(polls.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    );

  if (openPolls.length === 0) {
    return [];
  }

  const pollIds = openPolls.map((poll) => poll.id);
  const voteCounts = await db
    .select({ pollId: votes.pollId, total: count() })
    .from(votes)
    .where(inArray(votes.pollId, pollIds))
    .groupBy(votes.pollId);

  const counts = new Map(
    voteCounts.map((row) => [row.pollId, Number(row.total)])
  );

  return openPolls.map((poll) => ({
    ...poll,
    voteCount: counts.get(poll.id) ?? 0,
  }));
}

export async function getPollsStats(ctx: ServiceContext) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const scopeFilter = isPlatformAdmin(ctx)
    ? undefined
    : inArray(polls.neighborhoodId, neighborhoodAdminIds ?? []);

  const activeResult = await db
    .select({ value: count() })
    .from(polls)
    .where(combineFilters([eq(polls.status, "active"), scopeFilter]));

  const draftResult = await db
    .select({ value: count() })
    .from(polls)
    .where(combineFilters([eq(polls.status, "draft"), scopeFilter]));

  const closedResult = await db
    .select({ value: count() })
    .from(polls)
    .where(combineFilters([eq(polls.status, "closed"), scopeFilter]));

  return {
    active: Number(activeResult[0]?.value ?? 0),
    drafts: Number(draftResult[0]?.value ?? 0),
    closed: Number(closedResult[0]?.value ?? 0),
  };
}

export async function listDraftPolls(ctx: ServiceContext, limit = 6) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);

  const rows = await db
    .select({
      poll: polls,
      creatorName: users.name,
    })
    .from(polls)
    .leftJoin(users, eq(polls.createdBy, users.id))
    .where(
      isPlatformAdmin(ctx)
        ? eq(polls.status, "draft")
        : and(eq(polls.status, "draft"), inArray(polls.neighborhoodId, neighborhoodAdminIds ?? []))
    )
    .limit(limit);

  return rows.map((row) => ({
    ...row.poll,
    creatorName: row.creatorName,
  }));
}

export async function listActivePollsWithParticipation(ctx: ServiceContext) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);

  const activePolls = await db
    .select()
    .from(polls)
    .where(
      isPlatformAdmin(ctx)
        ? eq(polls.status, "active")
        : and(eq(polls.status, "active"), inArray(polls.neighborhoodId, neighborhoodAdminIds ?? []))
    );

  if (activePolls.length === 0) {
    return [];
  }

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .innerJoin(groups, eq(groupMemberships.groupId, groups.id))
    .where(
      isPlatformAdmin(ctx)
        ? eq(groupMemberships.status, "active")
        : and(
            eq(groupMemberships.status, "active"),
            inArray(groups.neighborhoodId, neighborhoodAdminIds ?? [])
          )
    );
  const totalGroups = Number(activeGroupsResult[0]?.value ?? 0);

  const pollIds = activePolls.map((poll) => poll.id);

  const voteStats = await db
    .select({
      pollId: votes.pollId,
      voteCount: count(),
      groupCount: countDistinct(votes.groupId),
    })
    .from(votes)
    .where(inArray(votes.pollId, pollIds))
    .groupBy(votes.pollId);

  const statsMap = new Map(
    voteStats.map((s) => [
      s.pollId,
      {
        voteCount: Number(s.voteCount),
        groupCount: Number(s.groupCount),
      },
    ])
  );

  return activePolls.map((poll) => {
    const stats = statsMap.get(poll.id) ?? { voteCount: 0, groupCount: 0 };
    const participation =
      totalGroups > 0 ? (stats.groupCount / totalGroups) * 100 : 0;

    return {
      ...poll,
      voteCount: stats.voteCount,
      groupsVoted: stats.groupCount,
      totalGroups,
      participation: Math.round(participation),
    };
  });
}
