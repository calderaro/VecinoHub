import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { votes } from "@/db/schema";

import { requireGroupMember } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema } from "./validators";

const groupVoteSchema = z.object({
  pollId: idSchema,
  groupId: idSchema,
});

export async function getGroupVote(
  ctx: ServiceContext,
  input: z.input<typeof groupVoteSchema>
) {
  const { pollId, groupId } = groupVoteSchema.parse(input);
  await requireGroupMember(ctx, groupId);

  const existing = await db
    .select({ id: votes.id, optionId: votes.optionId })
    .from(votes)
    .where(and(eq(votes.pollId, pollId), eq(votes.groupId, groupId)))
    .limit(1);

  return existing[0] ?? null;
}
