import { z } from "zod";

import {
  createPost,
  getPostById,
  listPostsPaged,
  publishPost,
  removePost,
  unpublishPost,
  updatePost,
} from "@/services/posts";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getServiceContext, handleServiceError } from "../service";

export const postsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          query: z.string().optional(),
          status: z.enum(["draft", "published"]).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        return await listPostsPaged(getServiceContext(ctx), input ?? {});
      } catch (error) {
        handleServiceError(error);
      }
    }),
  get: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await getPostById(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        content: z.string().min(1),
        status: z.enum(["draft", "published"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await createPost(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  update: protectedProcedure
    .input(
      z
        .object({
          postId: z.string().uuid(),
          title: z.string().min(1).optional(),
          content: z.string().min(1).optional(),
        })
        .refine((data) => data.title !== undefined || data.content !== undefined, {
          message: "Post updates require at least one field.",
        })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await updatePost(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  publish: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await publishPost(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  unpublish: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await unpublishPost(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
  remove: protectedProcedure
    .input(z.object({ postId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await removePost(getServiceContext(ctx), input);
      } catch (error) {
        handleServiceError(error);
      }
    }),
});
