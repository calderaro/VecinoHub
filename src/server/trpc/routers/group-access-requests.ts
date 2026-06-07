import { z } from "zod";

import {
  approveGroupAccessRequest,
  cancelGroupAccessRequest,
  createGroupAccessRequest,
  listGroupAccessRequests,
  listMyGroupAccessRequests,
  listNeighborhoodAccessRequests,
  listRequestableGroupsForNeighborhood,
  lookupNeighborhoodForAccessRequest,
  rejectGroupAccessRequest,
} from "@/services/group-access-requests";

import { getServiceContext, handleServiceError } from "../service";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const groupAccessRequestsRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listMyGroupAccessRequests(getServiceContext(ctx));
    } catch (error) {
      handleServiceError(error);
    }
  }),
  lookupNeighborhood: protectedProcedure
    .input(z.object({ slug: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        return await lookupNeighborhoodForAccessRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listRequestableGroups: protectedProcedure
    .input(z.object({ neighborhoodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listRequestableGroupsForNeighborhood(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        note: z.string().trim().min(1).max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createGroupAccessRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  cancel: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelGroupAccessRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listForGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupAccessRequests(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listForNeighborhood: protectedProcedure
    .input(z.object({ neighborhoodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listNeighborhoodAccessRequests(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  approve: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await approveGroupAccessRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  reject: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectGroupAccessRequest(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
