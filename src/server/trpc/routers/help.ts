import { z } from "zod";

import {
  getHelpFeedbackForUser,
  recordHelpEvent,
  submitHelpFeedback,
} from "@/services/help";

import { getServiceContext, handleServiceError } from "../service";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const helpRouter = createTRPCRouter({
  getFeedback: protectedProcedure
    .input(
      z.object({
        articleSlug: z.string().trim().min(1).max(160),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getHelpFeedbackForUser(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  submitFeedback: protectedProcedure
    .input(
      z.object({
        articleSlug: z.string().trim().min(1).max(160),
        response: z.enum(["yes", "no"]),
        comment: z.string().trim().max(600).optional().nullable(),
        locale: z.enum(["es", "en"]).default("es"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitHelpFeedback(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  recordEvent: protectedProcedure
    .input(
      z.object({
        eventName: z.enum([
          "help_center_opened",
          "help_search_used",
          "help_search_zero_results",
          "help_article_opened",
          "help_article_cta_clicked",
          "help_context_opened",
          "help_context_article_clicked",
          "help_feedback_submitted",
        ]),
        locale: z.enum(["es", "en"]).default("es"),
        screenKey: z
          .enum([
            "dashboard-request-access",
            "dashboard-invites",
            "dashboard-members",
            "dashboard-funds",
            "dashboard-resources",
            "admin-funds",
            "admin-resources",
          ])
          .optional(),
        articleSlug: z.string().trim().min(1).max(160).optional(),
        source: z.string().trim().min(1).max(64).optional(),
        query: z.string().trim().min(1).max(160).optional(),
        resultCount: z.number().int().min(0).max(999).optional(),
        metadata: z.string().trim().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await recordHelpEvent(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
