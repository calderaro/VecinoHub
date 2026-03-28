import { z } from "zod";

import {
  cancelResourceReservation,
  createResource,
  createResourceBlock,
  createResourceReservation,
  getResourceCalendar,
  listNeighborhoodBlocks,
  listNeighborhoodReservations,
  setResourceStatus,
  updateResource,
  updateResourceBlock,
  removeResourceBlock,
} from "@/services/resources";

import { getServiceContext, handleServiceError } from "../service";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const resourcesRouter = createTRPCRouter({
  getCalendar: protectedProcedure
    .input(
      z.object({
        resourceId: z.string().uuid(),
        groupId: z.string().uuid().optional(),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        days: z.number().int().min(1).max(31).default(14),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await getResourceCalendar(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listReservations: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        resourceId: z.string().uuid().optional(),
        status: z.enum(["approved", "cancelled", "completed", "expired"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listNeighborhoodReservations(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  listBlocks: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid(),
        resourceId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listNeighborhoodBlocks(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        neighborhoodId: z.string().uuid().optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(1000).optional(),
        type: z.string().max(120).optional(),
        location: z.string().max(240).optional(),
        capacity: z.number().int().positive().max(100000).nullable().optional(),
        status: z.enum(["active", "inactive"]).default("active"),
        requiresApproval: z.boolean().default(false),
        requiresDeposit: z.boolean().default(false),
        depositAmount: z.string().optional(),
        reservationFeeAmount: z.string().optional(),
        usageRules: z.string().max(5000).optional(),
        termsText: z.string().max(5000).optional(),
        availabilityWindows: z
          .array(
            z
              .object({
                dayOfWeek: z.number().int().min(0).max(6),
                startMinute: z.number().int().min(0).max(1440),
                endMinute: z.number().int().min(0).max(1440),
              })
              .refine((value) => value.endMinute > value.startMinute, {
                message: "Window end must be after start",
              })
          )
          .min(1),
        rules: z
          .object({
            minAdvanceHours: z.number().int().min(0).max(24 * 365).default(0),
            maxAdvanceDays: z.number().int().min(0).max(365).default(30),
            maxReservationsPerMonth: z.number().int().positive().max(365).nullable().optional(),
            maxReservationsPerYear: z.number().int().positive().max(365).nullable().optional(),
            maxActiveReservations: z.number().int().positive().max(365).nullable().optional(),
            minDurationMinutes: z.number().int().min(15).max(24 * 60).default(60),
            maxDurationMinutes: z.number().int().min(15).max(24 * 60).default(360),
            bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).default(0),
            bufferAfterMinutes: z.number().int().min(0).max(24 * 60).default(0),
            maxConcurrentReservations: z.number().int().positive().max(25).default(1),
            requireNoDebt: z.boolean().default(false),
            cancellationLimitHours: z.number().int().min(0).max(24 * 365).nullable().optional(),
            lateCancellationCountsAsUsage: z.boolean().default(false),
            lateCancellationForfeitsDeposit: z.boolean().default(false),
          })
          .refine((value) => value.maxDurationMinutes >= value.minDurationMinutes, {
            message: "Max duration must be greater than or equal to min duration",
          }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createResource(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  update: protectedProcedure
    .input(
      z
        .object({
          resourceId: z.string().uuid(),
          name: z.string().min(1).max(120).optional(),
          description: z.string().max(1000).optional(),
          type: z.string().max(120).optional(),
          location: z.string().max(240).optional(),
          capacity: z.number().int().positive().max(100000).nullable().optional(),
          status: z.enum(["active", "inactive"]).optional(),
          requiresApproval: z.boolean().optional(),
          requiresDeposit: z.boolean().optional(),
          depositAmount: z.string().optional(),
          reservationFeeAmount: z.string().optional(),
          usageRules: z.string().max(5000).optional(),
          termsText: z.string().max(5000).optional(),
          availabilityWindows: z
            .array(
              z
                .object({
                  dayOfWeek: z.number().int().min(0).max(6),
                  startMinute: z.number().int().min(0).max(1440),
                  endMinute: z.number().int().min(0).max(1440),
                })
                .refine((value) => value.endMinute > value.startMinute, {
                  message: "Window end must be after start",
                })
            )
            .min(1)
            .optional(),
          rules: z
            .object({
              minAdvanceHours: z.number().int().min(0).max(24 * 365).default(0),
              maxAdvanceDays: z.number().int().min(0).max(365).default(30),
              maxReservationsPerMonth: z.number().int().positive().max(365).nullable().optional(),
              maxReservationsPerYear: z.number().int().positive().max(365).nullable().optional(),
              maxActiveReservations: z.number().int().positive().max(365).nullable().optional(),
              minDurationMinutes: z.number().int().min(15).max(24 * 60).default(60),
              maxDurationMinutes: z.number().int().min(15).max(24 * 60).default(360),
              bufferBeforeMinutes: z.number().int().min(0).max(24 * 60).default(0),
              bufferAfterMinutes: z.number().int().min(0).max(24 * 60).default(0),
              maxConcurrentReservations: z.number().int().positive().max(25).default(1),
              requireNoDebt: z.boolean().default(false),
              cancellationLimitHours: z.number().int().min(0).max(24 * 365).nullable().optional(),
              lateCancellationCountsAsUsage: z.boolean().default(false),
              lateCancellationForfeitsDeposit: z.boolean().default(false),
            })
            .refine((value) => value.maxDurationMinutes >= value.minDurationMinutes, {
              message: "Max duration must be greater than or equal to min duration",
            })
            .optional(),
        })
        .refine(
          (value) =>
            value.name !== undefined ||
            value.description !== undefined ||
            value.type !== undefined ||
            value.location !== undefined ||
            value.capacity !== undefined ||
            value.status !== undefined ||
            value.requiresApproval !== undefined ||
            value.requiresDeposit !== undefined ||
            value.depositAmount !== undefined ||
            value.reservationFeeAmount !== undefined ||
            value.usageRules !== undefined ||
            value.termsText !== undefined ||
            value.availabilityWindows !== undefined ||
            value.rules !== undefined,
          { message: "At least one field is required" }
        )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateResource(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  setStatus: protectedProcedure
    .input(
      z.object({
        resourceId: z.string().uuid(),
        status: z.enum(["active", "inactive"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await setResourceStatus(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  createReservation: protectedProcedure
    .input(
      z
        .object({
          resourceId: z.string().uuid(),
          groupId: z.string().uuid(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startMinute: z.number().int().min(0).max(1440),
          endMinute: z.number().int().min(0).max(1440),
          title: z.string().min(1).max(160),
          notes: z.string().max(1000).optional(),
          attendeeCount: z.number().int().positive().max(100000).nullable().optional(),
        })
        .refine((value) => value.endMinute > value.startMinute, {
          message: "Reservation end must be after start",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createResourceReservation(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  cancelReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await cancelResourceReservation(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  createBlock: protectedProcedure
    .input(
      z
        .object({
          resourceId: z.string().uuid(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startMinute: z.number().int().min(0).max(1440),
          endMinute: z.number().int().min(0).max(1440),
          reason: z.enum([
            "maintenance",
            "cleaning",
            "repair",
            "neighborhood_event",
            "unavailable",
            "other",
          ]),
          reasonText: z.string().max(500).optional(),
        })
        .refine((value) => value.endMinute > value.startMinute, {
          message: "Block end must be after start",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createResourceBlock(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  updateBlock: protectedProcedure
    .input(
      z
        .object({
          blockId: z.string().uuid(),
          resourceId: z.string().uuid(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          startMinute: z.number().int().min(0).max(1440),
          endMinute: z.number().int().min(0).max(1440),
          reason: z.enum([
            "maintenance",
            "cleaning",
            "repair",
            "neighborhood_event",
            "unavailable",
            "other",
          ]),
          reasonText: z.string().max(500).optional(),
        })
        .refine((value) => value.endMinute > value.startMinute, {
          message: "Block end must be after start",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateResourceBlock(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  removeBlock: protectedProcedure
    .input(
      z.object({
        blockId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeResourceBlock(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
