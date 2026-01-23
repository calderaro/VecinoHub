import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { posts, users } from "@/db/schema";

import { ServiceError } from "./errors";
import { requireAdmin } from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, paginationSchema } from "./validators";

const postStatusSchema = z.enum(["draft", "published"]);

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  status: postStatusSchema.optional(),
});

export async function createPost(
  ctx: ServiceContext,
  input: z.input<typeof createPostSchema>
) {
  requireAdmin(ctx);
  const { title, content, status } = createPostSchema.parse(input);
  const resolvedStatus = status ?? "draft";

  const created = await db
    .insert(posts)
    .values({
      title: title.trim(),
      content: content.trim(),
      status: resolvedStatus,
      publishedAt: resolvedStatus === "published" ? new Date() : null,
      createdBy: ctx.user.id,
    })
    .returning();

  if (!created[0]) {
    throw new ServiceError("Failed to create post", "INVALID");
  }

  return created[0];
}

const updatePostSchema = z
  .object({
    postId: idSchema,
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "Post updates require at least one field.",
  });

export async function updatePost(
  ctx: ServiceContext,
  input: z.input<typeof updatePostSchema>
) {
  requireAdmin(ctx);
  const { postId, title, content } = updatePostSchema.parse(input);

  const updates: Partial<typeof posts.$inferInsert> = {};
  if (title !== undefined) {
    updates.title = title.trim();
  }
  if (content !== undefined) {
    updates.content = content.trim();
  }

  const updated = await db
    .update(posts)
    .set(updates)
    .where(eq(posts.id, postId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  return updated[0];
}

const listPostsPagedSchema = paginationSchema.unwrap().extend({
  query: z.string().optional(),
  status: postStatusSchema.optional(),
});

export async function listPostsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listPostsPagedSchema>
) {
  const { query, status, limit, offset } = listPostsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(ilike(posts.title, search), ilike(posts.content, search))
    : undefined;

  const statusFilter =
    ctx.user.role === "admin"
      ? status
        ? eq(posts.status, status)
        : undefined
      : eq(posts.status, "published");
  const combinedFilter =
    searchFilter && statusFilter
      ? and(searchFilter, statusFilter)
      : (searchFilter ?? statusFilter);

  const rows = await db
    .select({
      post: posts,
      creatorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdBy, users.id))
    .where(combinedFilter)
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row.post,
    creatorName: row.creatorName,
  }));

  const totalResult = await db
    .select({ value: count() })
    .from(posts)
    .where(combinedFilter);

  return { items, total: Number(totalResult[0]?.value ?? 0) };
}

const getPostSchema = z.object({
  postId: idSchema,
});

export async function getPostById(
  ctx: ServiceContext,
  input: z.input<typeof getPostSchema>
) {
  const { postId } = getPostSchema.parse(input);

  const post = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post[0]) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  if (ctx.user.role !== "admin" && post[0].status !== "published") {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  return post[0];
}

const publishPostSchema = z.object({
  postId: idSchema,
});

export async function publishPost(
  ctx: ServiceContext,
  input: z.input<typeof publishPostSchema>
) {
  requireAdmin(ctx);
  const { postId } = publishPostSchema.parse(input);

  const updated = await db
    .update(posts)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(posts.id, postId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  return updated[0];
}

const unpublishPostSchema = z.object({
  postId: idSchema,
});

export async function unpublishPost(
  ctx: ServiceContext,
  input: z.input<typeof unpublishPostSchema>
) {
  requireAdmin(ctx);
  const { postId } = unpublishPostSchema.parse(input);

  const updated = await db
    .update(posts)
    .set({ status: "draft", publishedAt: null })
    .where(eq(posts.id, postId))
    .returning();

  if (!updated[0]) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  return updated[0];
}

const removePostSchema = z.object({
  postId: idSchema,
});

export async function removePost(
  ctx: ServiceContext,
  input: z.input<typeof removePostSchema>
) {
  requireAdmin(ctx);
  const { postId } = removePostSchema.parse(input);

  const removed = await db
    .delete(posts)
    .where(eq(posts.id, postId))
    .returning();

  if (!removed[0]) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  return removed[0];
}

export async function getPostsStats(ctx: ServiceContext) {
  requireAdmin(ctx);

  const publishedResult = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.status, "published"));

  const draftResult = await db
    .select({ value: count() })
    .from(posts)
    .where(eq(posts.status, "draft"));

  return {
    published: Number(publishedResult[0]?.value ?? 0),
    drafts: Number(draftResult[0]?.value ?? 0),
  };
}

export async function listRecentPosts(ctx: ServiceContext, limit = 6) {
  requireAdmin(ctx);

  const rows = await db
    .select({
      post: posts,
      creatorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdBy, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row.post,
    creatorName: row.creatorName,
  }));
}

export async function listDraftPosts(ctx: ServiceContext, limit = 6) {
  requireAdmin(ctx);

  const rows = await db
    .select({
      post: posts,
      creatorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdBy, users.id))
    .where(eq(posts.status, "draft"))
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row.post,
    creatorName: row.creatorName,
  }));
}
