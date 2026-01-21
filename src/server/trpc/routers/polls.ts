import { z } from "zod";

import {
  addOption,
  closePoll,
  createPoll,
  listPolls,
  reopenPoll,
  resetPoll,
  removeOption,
  updateOption,
  updatePoll,
  voteInPoll,
} from "@/services/polls";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const pollsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listPolls(getServiceContext(ctx));
    } catch (error) {
      handleServiceError(error);
    }
  }),
  create: protectedProcedure
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPoll(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        pollId: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "closed"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePoll(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  close: protectedProcedure
    .input(z.object({ pollId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await closePoll(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  reopen: protectedProcedure
    .input(z.object({ pollId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await reopenPoll(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  reset: protectedProcedure
    .input(z.object({ pollId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resetPoll(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  addOption: protectedProcedure
    .input(
      z.object({
        pollId: z.string().uuid(),
        label: z.string().min(1),
        description: z.string().optional(),
        amount: z.string().optional(),
        sortOrder: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addOption(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateOption: protectedProcedure
    .input(
      z.object({
        optionId: z.string().uuid(),
        label: z.string().min(1),
        description: z.string().optional(),
        amount: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateOption(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  removeOption: protectedProcedure
    .input(z.object({ optionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeOption(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  vote: protectedProcedure
    .input(z.object({ pollId: z.string().uuid(), groupId: z.string().uuid(), optionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await voteInPoll(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
