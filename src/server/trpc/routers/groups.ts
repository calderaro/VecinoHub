import { z } from "zod";

import {
  addMember,
  createGroup,
  deleteGroup,
  leaveGroup,
  listGroupMembers,
  listUserGroups,
  removeMember,
  setGroupMemberRole,
  updateGroup,
} from "@/services/groups";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const groupsRouter = createTRPCRouter({
  listMy: protectedProcedure.query(async ({ ctx }) => {
    try {
      return await listUserGroups(getServiceContext(ctx));
    } catch (error) {
      handleServiceError(error);
    }
  }),
  listMembers: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await listGroupMembers(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid().optional(),
        name: z.string().min(1),
        address: z.string().optional(),
        adminEmail: z.string().email().optional(),
        adminUserId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createGroup(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateGroup(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  remove: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await deleteGroup(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  setMemberRole: protectedProcedure
    .input(
      z.object({
        groupId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["group_member", "group_admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await setGroupMemberRole(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  addMember: protectedProcedure
    .input(
      z
        .object({
          groupId: z.string().uuid(),
          userId: z.string().uuid().optional(),
          email: z.string().email().optional(),
          role: z.enum(["group_member", "group_admin"]).optional(),
        })
        .refine((data) => data.userId || data.email, {
          message: "User id or email is required",
          path: ["userId"],
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addMember(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  removeMember: protectedProcedure
    .input(z.object({ groupId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeMember(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  leave: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await leaveGroup(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
