import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { ServiceContext } from "@/services/types";
import {
  neighborhoodMemberships,
  pollOptions,
  polls,
  users,
  groups,
  groupMemberships,
  votes,
} from "@/db/schema";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { updatePoll, voteInPoll } from "@/services/polls";
import {
  closeTestDatabase,
  ensureTestDatabase,
  resetTestDatabase,
} from "../helpers/test-database";
import { db } from "@/db";

function createCtx(userId: string): ServiceContext {
  return {
    user: {
      id: userId,
      role: "user",
      activeNeighborhoodId: null,
    },
  };
}

async function seedVotingFixtures() {
  const neighborhoodId = randomUUID();
  const userId = randomUUID();
  const groupId = randomUUID();
  const pollId = randomUUID();
  const secondPollId = randomUUID();
  const validOptionId = randomUUID();
  const secondValidOptionId = randomUUID();
  const foreignOptionId = randomUUID();

  await db.insert(users).values({
    id: userId,
    email: "voter@example.com",
    name: "Voter",
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
    name: "Voting Group",
  });

  await db.insert(groupMemberships).values({
    id: randomUUID(),
    groupId,
    userId,
    role: "group_member",
    status: "active",
  });

  await db.insert(polls).values({
    id: pollId,
    neighborhoodId,
    title: "Primary Poll",
    status: "active",
    createdBy: userId,
  });
  await db.insert(polls).values({
    id: secondPollId,
    neighborhoodId,
    title: "Foreign Poll",
    status: "active",
    createdBy: userId,
  });

  await db.insert(pollOptions).values({
    id: validOptionId,
    pollId,
    label: "Yes",
    sortOrder: 1,
  });
  await db.insert(pollOptions).values({
    id: secondValidOptionId,
    pollId,
    label: "No",
    sortOrder: 2,
  });
  await db.insert(pollOptions).values({
    id: foreignOptionId,
    pollId: secondPollId,
    label: "Foreign",
    sortOrder: 1,
  });

  return {
    userId,
    groupId,
    pollId,
    validOptionId,
    secondValidOptionId,
    foreignOptionId,
  };
}

describe("poll vote integrity", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("accepts a valid option for the target poll", async () => {
    const { userId, groupId, pollId, validOptionId } = await seedVotingFixtures();

    const createdVote = await voteInPoll(createCtx(userId), {
      pollId,
      groupId,
      optionId: validOptionId,
    });

    expect(createdVote?.pollId).toBe(pollId);
    expect(createdVote?.optionId).toBe(validOptionId);
  });

  it("updates an existing vote when another valid option from the same poll is selected", async () => {
    const { userId, groupId, pollId, validOptionId, secondValidOptionId } =
      await seedVotingFixtures();

    await voteInPoll(createCtx(userId), {
      pollId,
      groupId,
      optionId: validOptionId,
    });

    const updatedVote = await voteInPoll(createCtx(userId), {
      pollId,
      groupId,
      optionId: secondValidOptionId,
    });

    const storedVotes = await db.select().from(votes);

    expect(updatedVote?.optionId).toBe(secondValidOptionId);
    expect(storedVotes).toHaveLength(1);
    expect(storedVotes[0]?.optionId).toBe(secondValidOptionId);
  });

  it("rejects an option id from a different poll and preserves the existing vote", async () => {
    const { userId, groupId, pollId, validOptionId, foreignOptionId } =
      await seedVotingFixtures();

    await voteInPoll(createCtx(userId), {
      pollId,
      groupId,
      optionId: validOptionId,
    });

    await expect(
      voteInPoll(createCtx(userId), {
        pollId,
        groupId,
        optionId: foreignOptionId,
      })
    ).rejects.toMatchObject({ message: "Option does not belong to poll" });

    const storedVotes = await db.select().from(votes);

    expect(storedVotes).toHaveLength(1);
    expect(storedVotes[0]?.optionId).toBe(validOptionId);
  });

  it("blocks returning a poll to draft while it still has votes", async () => {
    const { userId, groupId, pollId, validOptionId } = await seedVotingFixtures();
    const adminCtx: ServiceContext = {
      user: { id: randomUUID(), role: "admin", activeNeighborhoodId: null },
    };

    await voteInPoll(createCtx(userId), { pollId, groupId, optionId: validOptionId });

    await expect(
      updatePoll(adminCtx, { pollId, status: "draft" })
    ).rejects.toMatchObject({
      message: "Reset the poll to return it to draft; it still has votes",
    });

    const stored = (await db.select().from(polls)).find((p) => p.id === pollId);
    expect(stored?.status).toBe("active");
  });

  it("allows returning a poll to draft when it has no votes", async () => {
    const { pollId } = await seedVotingFixtures();
    const adminCtx: ServiceContext = {
      user: { id: randomUUID(), role: "admin", activeNeighborhoodId: null },
    };

    const updated = await updatePoll(adminCtx, { pollId, status: "draft" });
    expect(updated?.status).toBe("draft");
  });
});
