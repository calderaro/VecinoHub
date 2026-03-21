import { z } from "zod";

import {
  acceptGroupInvite,
  cancelGroupInvite,
  createGroupInvite,
  listGroupInvites,
  listMyInvites,
  rejectGroupInvite,
  resendGroupInvite,
} from "@/services/group-invites";

import { getServiceContext, handleServiceError } from "../service";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const groupInvitesRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listMyInvites(getServiceContext(ctx));
    } catch (error) {
      handleServiceError(error);
    }
  }),
  listForGroup: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupInvites(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["group_member", "group_admin"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createGroupInvite(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  resend: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await resendGroupInvite(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  cancel: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelGroupInvite(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  accept: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await acceptGroupInvite(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  reject: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await rejectGroupInvite(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
