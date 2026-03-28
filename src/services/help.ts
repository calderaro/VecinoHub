import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { helpEvents, helpFeedback } from "@/db/schema";

import type { ServiceContext } from "./types";
import {
  helpEventNameSchema,
  helpFeedbackResponseSchema,
  helpScreenKeySchema,
  preferredLanguageSchema,
} from "./validators";

const articleSlugSchema = z.string().trim().min(1).max(160);

const feedbackLookupSchema = z.object({
  articleSlug: articleSlugSchema,
});

const submitHelpFeedbackSchema = z.object({
  articleSlug: articleSlugSchema,
  response: helpFeedbackResponseSchema,
  comment: z.string().trim().max(600).optional().nullable(),
  locale: preferredLanguageSchema.default("es"),
});

const recordHelpEventSchema = z.object({
  eventName: helpEventNameSchema,
  locale: preferredLanguageSchema.default("es"),
  screenKey: helpScreenKeySchema.optional(),
  articleSlug: articleSlugSchema.optional(),
  source: z.string().trim().min(1).max(64).optional(),
  query: z.string().trim().min(1).max(160).optional(),
  resultCount: z.number().int().min(0).max(999).optional(),
  metadata: z.string().trim().max(2000).optional(),
});

export async function getHelpFeedbackForUser(
  ctx: ServiceContext,
  input: z.input<typeof feedbackLookupSchema>
) {
  const { articleSlug } = feedbackLookupSchema.parse(input);
  const existing = await db
    .select({
      response: helpFeedback.response,
      comment: helpFeedback.comment,
      updatedAt: helpFeedback.updatedAt,
    })
    .from(helpFeedback)
    .where(and(eq(helpFeedback.userId, ctx.user.id), eq(helpFeedback.articleSlug, articleSlug)))
    .limit(1);

  return existing[0] ?? null;
}

export async function submitHelpFeedback(
  ctx: ServiceContext,
  input: z.input<typeof submitHelpFeedbackSchema>
) {
  const parsed = submitHelpFeedbackSchema.parse(input);
  const comment = parsed.comment?.trim() ? parsed.comment.trim() : null;

  await db
    .insert(helpFeedback)
    .values({
      id: randomUUID(),
      userId: ctx.user.id,
      articleSlug: parsed.articleSlug,
      response: parsed.response,
      comment,
      locale: parsed.locale,
    })
    .onConflictDoUpdate({
      target: [helpFeedback.userId, helpFeedback.articleSlug],
      set: {
        response: parsed.response,
        comment,
        locale: parsed.locale,
        updatedAt: new Date(),
      },
    });

  await recordHelpEvent(ctx, {
    eventName: "help_feedback_submitted",
    articleSlug: parsed.articleSlug,
    locale: parsed.locale,
    source: "article_feedback",
    metadata: comment ? "comment_present" : "no_comment",
  });

  return {
    ok: true,
    articleSlug: parsed.articleSlug,
    response: parsed.response,
    comment,
  };
}

export async function recordHelpEvent(
  ctx: ServiceContext,
  input: z.input<typeof recordHelpEventSchema>
) {
  const parsed = recordHelpEventSchema.parse(input);

  await db.insert(helpEvents).values({
    id: randomUUID(),
    userId: ctx.user.id,
    eventName: parsed.eventName,
    locale: parsed.locale,
    screenKey: parsed.screenKey,
    articleSlug: parsed.articleSlug,
    source: parsed.source,
    query: parsed.query,
    resultCount: parsed.resultCount,
    metadata: parsed.metadata,
  });

  return { ok: true };
}
