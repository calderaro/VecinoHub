import { z } from "zod";

import {
  listUsers,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
} from "@/services/users";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const usersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).optional() }).optional())
    .query(async ({ ctx, input }) => {
      try {
        return await listUsers(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateRole: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserRole(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateStatus: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), status: z.enum(["active", "inactive"]) }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserStatus(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateProfile: protectedProcedure
    .input(
      z
        .object({
          username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/).optional(),
          image: z.string().url().max(2048).nullable().optional(),
        })
        .refine((data) => data.username !== undefined || data.image !== undefined, {
          message: "Profile updates require a username or image.",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateUserProfile(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
