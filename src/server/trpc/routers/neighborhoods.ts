import { z } from "zod";
import { cookies } from "next/headers";

import {
  addNeighborhoodMemberByEmail,
  createNeighborhood,
  getNeighborhoodById,
  listNeighborhoodMembersPaged,
  listNeighborhoodsPaged,
  removeNeighborhoodMember,
  removeNeighborhood,
  setActiveNeighborhoodContext,
  setNeighborhoodMemberRole,
  updateNeighborhoodMember,
  updateNeighborhood,
  updateNeighborhoodMembershipStatus,
} from "@/services/neighborhoods";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const neighborhoodsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listNeighborhoodsPaged(getServiceContext(ctx), input ?? {});
      } catch (error) {
        handleServiceError(error);
      }
    }),
  getById: protectedProcedure
    .input(z.object({ neighborhoodId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getNeighborhoodById(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(3),
        timeZone: z.string().min(1).default("America/Mexico_City"),
        adminUserId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createNeighborhood(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  addMemberByEmail: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        email: z.string().email(),
        role: z.enum(["neighbor", "neighborhood_admin"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await addNeighborhoodMemberByEmail(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        name: z.string().min(1).optional(),
        slug: z.string().min(3).optional(),
        timeZone: z.string().min(1).optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateNeighborhood(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  remove: protectedProcedure
    .input(z.object({ neighborhoodId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeNeighborhood(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listMembers: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        query: z.string().optional(),
        role: z.enum(["neighbor", "neighborhood_admin"]).optional(),
        status: z.enum(["active", "inactive"]).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listNeighborhoodMembersPaged(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  setMemberRole: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum(["neighbor", "neighborhood_admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await setNeighborhoodMemberRole(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateMembershipStatus: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        userId: z.string().uuid(),
        status: z.enum(["active", "inactive"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateNeighborhoodMembershipStatus(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateMember: protectedProcedure
    .input(
      z
        .object({
          neighborhoodId: z.string().uuid(),
          userId: z.string().uuid(),
          role: z.enum(["neighbor", "neighborhood_admin"]).optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
        .refine((value) => value.role !== undefined || value.status !== undefined, {
          message: "At least one field is required.",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateNeighborhoodMember(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  removeMember: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        userId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeNeighborhoodMember(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  setActiveContext: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await setActiveNeighborhoodContext(getServiceContext(ctx), input);
        const cookieStore = await cookies();

        if (result.activeNeighborhoodId) {
          cookieStore.set("vh_active_neighborhood", result.activeNeighborhoodId, {
            path: "/",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 * 365,
          });
        } else {
          cookieStore.delete("vh_active_neighborhood");
        }

        return result;
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
