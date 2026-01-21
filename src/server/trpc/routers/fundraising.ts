import { z } from "zod";

import {
  closeCampaign,
  confirmContribution,
  createCampaign,
  deleteContribution,
  listCampaigns,
  rejectContribution,
  submitContribution,
  updateContributionStatus,
  updateCampaign,
} from "@/services/fundraising";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const fundraisingRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listCampaigns(getServiceContext(ctx));
    } catch (error) {
      handleServiceError(error);
    }
  }),
  createCampaign: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        goalAmount: z.string().min(1),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createCampaign(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().uuid(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        goalAmount: z.string().min(1).optional(),
        dueDate: z.date().optional(),
        status: z.enum(["open", "closed"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateCampaign(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  closeCampaign: protectedProcedure
    .input(z.object({ campaignId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await closeCampaign(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  submitContribution: protectedProcedure
    .input(
      z.object({
        campaignId: z.string().uuid(),
        groupId: z.string().uuid(),
        method: z.enum(["cash", "wire_transfer"]),
        amount: z.string().min(1),
        wireReference: z.string().min(1).optional(),
        wireDate: z.date().optional(),
        wireAmount: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await submitContribution(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  deleteContribution: protectedProcedure
    .input(z.object({ contributionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteContribution(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateContributionStatus: protectedProcedure
    .input(
      z.object({
        contributionId: z.string().uuid(),
        status: z.enum(["submitted", "confirmed", "rejected"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateContributionStatus(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  confirmContribution: protectedProcedure
    .input(z.object({ contributionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await confirmContribution(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  rejectContribution: protectedProcedure
    .input(z.object({ contributionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectContribution(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
