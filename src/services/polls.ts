import { and, count, countDistinct, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { groupMemberships, pollOptions, polls, users, votes } from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin, requireGroupMember } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema } from "./validators";

async function requireDraftPoll(pollId: string) {
  const poll = await db
    .select({ status: polls.status })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  if (poll[0].status !== "draft") {
    throw new ServiceError("Poll options can only be edited in draft", "INVALID");
  }
}

const createPollSchema = z.object({
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
  requireAdmin(ctx);
  const { title, description, options } = createPollSchema.parse(input);

  return db.transaction(async (tx) => {
    const createdPoll = await tx
      .insert(polls)
      .values({
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
  requireAdmin(ctx);
  const { pollId, ...data } = updatePollSchema.parse(input);

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
  requireAdmin(ctx);
  const { pollId } = closePollSchema.parse(input);

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
  requireAdmin(ctx);
  const { pollId } = reopenPollSchema.parse(input);

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
  requireAdmin(ctx);
  const { pollId } = resetPollSchema.parse(input);

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
  requireAdmin(ctx);
  const { pollId, label, description, amount, sortOrder } =
    addOptionSchema.parse(input);
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
  requireAdmin(ctx);
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
  requireAdmin(ctx);
  const { optionId } = removeOptionSchema.parse(input);

  const optionPoll = await db
    .select({ pollId: pollOptions.pollId })
    .from(pollOptions)
    .where(eq(pollOptions.id, optionId))
    .limit(1);

  if (!optionPoll[0]) {
    throw new ServiceError("Option not found", "NOT_FOUND");
  }

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
  await requireGroupMember(ctx, groupId);

  const poll = await db
    .select({ status: polls.status })
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  if (poll[0].status !== "active") {
    throw new ServiceError("Poll is not active", "INVALID");
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
  if (ctx.user.role === "admin") {
    return db.select().from(polls);
  }

  return db
    .select()
    .from(polls)
    .where(eq(polls.status, "active"));
}

const listPollsPagedSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

export async function listPollsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listPollsPagedSchema>
) {
  const { query, status, limit, offset } = listPollsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;

  const filters = [
    search ? ilike(polls.title, search) : undefined,
    ctx.user.role === "admin"
      ? status
        ? eq(polls.status, status)
        : undefined
      : eq(polls.status, "active"),
  ].filter(Boolean);

  const rows = await db
    .select({
      poll: polls,
      creatorName: users.name,
    })
    .from(polls)
    .leftJoin(users, eq(polls.createdBy, users.id))
    .where(filters.length ? and(...(filters as [typeof polls.status, ...unknown[]])) : undefined)
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row.poll,
    creatorName: row.creatorName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(polls)
    .where(filters.length ? and(...(filters as [typeof polls.status, ...unknown[]])) : undefined);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
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
  const poll = await db
    .select()
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);

  if (!poll[0]) {
    throw new ServiceError("Poll not found", "NOT_FOUND");
  }

  if (ctx.user.role !== "admin" && poll[0].status !== "active") {
    throw new ServiceError("Poll not available", "FORBIDDEN");
  }

  const options = await db
    .select()
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId));

  return { ...poll[0], options };
}

export async function getPollResults(
  ctx: ServiceContext,
  input: z.input<typeof getPollSchema>
) {
  requireAdmin(ctx);
  const { pollId } = getPollSchema.parse(input);

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
  requireAdmin(ctx);
  const { pollId } = pollParticipationSchema.parse(input);

  const activeGroupsResult = await db
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
  requireAdmin(ctx);
  const openPolls = await db
    .select()
    .from(polls)
    .where(eq(polls.status, "active"));

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
  requireAdmin(ctx);

  const activeResult = await db
    .select({ value: count() })
    .from(polls)
    .where(eq(polls.status, "active"));

  const draftResult = await db
    .select({ value: count() })
    .from(polls)
    .where(eq(polls.status, "draft"));

  const closedResult = await db
    .select({ value: count() })
    .from(polls)
    .where(eq(polls.status, "closed"));

  return {
    active: Number(activeResult[0]?.value ?? 0),
    drafts: Number(draftResult[0]?.value ?? 0),
    closed: Number(closedResult[0]?.value ?? 0),
  };
}

export async function listDraftPolls(ctx: ServiceContext, limit = 6) {
  requireAdmin(ctx);

  const rows = await db
    .select({
      poll: polls,
      creatorName: users.name,
    })
    .from(polls)
    .leftJoin(users, eq(polls.createdBy, users.id))
    .where(eq(polls.status, "draft"))
    .limit(limit);

  return rows.map((row) => ({
    ...row.poll,
    creatorName: row.creatorName,
  }));
}

export async function listActivePollsWithParticipation(ctx: ServiceContext) {
  requireAdmin(ctx);

  const activePolls = await db
    .select()
    .from(polls)
    .where(eq(polls.status, "active"));

  if (activePolls.length === 0) {
    return [];
  }

  const activeGroupsResult = await db
    .select({ value: countDistinct(groupMemberships.groupId) })
    .from(groupMemberships)
    .where(eq(groupMemberships.status, "active"));
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
