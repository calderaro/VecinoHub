import { z } from "zod";

import {
  createEvent,
  getEventById,
  listEventsPaged,
  removeEvent,
  updateEvent,
} from "@/services/events";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const eventsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listEventsPaged(getServiceContext(ctx), input ?? {});
      } catch (error) {
        handleServiceError(error);
      }
    }),
  get: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getEventById(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        startsAt: z.date(),
        endsAt: z.date().optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createEvent(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  update: protectedProcedure
    .input(
      z
        .object({
          eventId: z.string().uuid(),
          title: z.string().min(1).optional(),
          description: z.string().optional(),
          startsAt: z.date().optional(),
          endsAt: z.date().nullable().optional(),
          location: z.string().optional(),
        })
        .refine(
          (data) =>
            data.title !== undefined ||
            data.description !== undefined ||
            data.startsAt !== undefined ||
            data.endsAt !== undefined ||
            data.location !== undefined,
          {
            message: "Event updates require at least one field.",
          }
        )
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updateEvent(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  remove: protectedProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removeEvent(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
