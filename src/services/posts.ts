import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { neighborhoods, posts, users } from "@/db/schema";

import { ServiceError } from "./errors";
import {
  isPlatformAdmin,
  listNeighborhoodAdminIdsForUser,
  listNeighborhoodIdsForUser,
  requireNeighborhoodAdminOrPlatform,
  requireNeighborhoodAdminScope,
  requirePlatformAdmin,
} from "./guards";
import type { ServiceContext } from "./types";
import { idSchema, paginationSchema } from "./validators";

const postStatusSchema = z.enum(["draft", "published"]);

async function getPostScope(postId: string) {
  const post = await db
    .select({ neighborhoodId: posts.neighborhoodId })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post[0]) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  return post[0];
}

async function requirePostAdminScope(ctx: ServiceContext, postId: string) {
  const post = await getPostScope(postId);
  if (!post.neighborhoodId) {
    requirePlatformAdmin(ctx);
    return post;
  }

  await requireNeighborhoodAdminOrPlatform(ctx, post.neighborhoodId);
  return post;
}

const createPostSchema = z.object({
  neighborhoodId: idSchema.optional(),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50000),
  status: postStatusSchema.optional(),
});

export async function createPost(
  ctx: ServiceContext,
  input: z.input<typeof createPostSchema>
) {
  const { neighborhoodId, title, content, status } = createPostSchema.parse(input);
  let resolvedNeighborhoodId = neighborhoodId;
  if (!resolvedNeighborhoodId) {
    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    resolvedNeighborhoodId = neighborhoodAdminIds?.[0];
  }
  if (!resolvedNeighborhoodId && isPlatformAdmin(ctx)) {
    const firstNeighborhood = await db.select({ id: neighborhoods.id }).from(neighborhoods).limit(1);
    resolvedNeighborhoodId = firstNeighborhood[0]?.id;
  }
  if (!resolvedNeighborhoodId) {
    throw new ServiceError("Neighborhood is required", "INVALID");
  }

  await requireNeighborhoodAdminOrPlatform(ctx, resolvedNeighborhoodId);
  const resolvedStatus = status ?? "draft";

  const created = await db
    .insert(posts)
    .values({
      neighborhoodId: resolvedNeighborhoodId,
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
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).max(50000).optional(),
  })
  .refine((data) => data.title !== undefined || data.content !== undefined, {
    message: "Post updates require at least one field.",
  });

export async function updatePost(
  ctx: ServiceContext,
  input: z.input<typeof updatePostSchema>
) {
  const { postId, title, content } = updatePostSchema.parse(input);
  await requirePostAdminScope(ctx, postId);

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
  neighborhoodId: idSchema.optional(),
  query: z.string().optional(),
  status: postStatusSchema.optional(),
});

export async function listPostsPaged(
  ctx: ServiceContext,
  input: z.input<typeof listPostsPagedSchema>
) {
  const { neighborhoodId, query, status, limit, offset } = listPostsPagedSchema.parse(input);
  const search = query ? `%${query}%` : undefined;
  const searchFilter = search
    ? or(ilike(posts.title, search), ilike(posts.content, search))
    : undefined;

  const neighborhoodFilter = neighborhoodId ? eq(posts.neighborhoodId, neighborhoodId) : undefined;
  let scopeFilter = neighborhoodFilter;
  let statusFilter;
  if (isPlatformAdmin(ctx)) {
    statusFilter = status ? eq(posts.status, status) : undefined;
  } else {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || neighborhoodIds.length === 0) {
      return { items: [], total: 0 };
    }
    const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
    const canViewDraft = Boolean(neighborhoodAdminIds && neighborhoodAdminIds.length > 0);
    scopeFilter = scopeFilter
      ? and(scopeFilter, inArray(posts.neighborhoodId, neighborhoodIds))
      : inArray(posts.neighborhoodId, neighborhoodIds);
    statusFilter = canViewDraft
      ? status
        ? eq(posts.status, status)
        : undefined
      : eq(posts.status, "published");
  }

  const combinedFilter = and(searchFilter, statusFilter, scopeFilter);

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

  const rows = await db
    .select({
      post: posts,
      creatorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdBy, users.id))
    .where(eq(posts.id, postId))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new ServiceError("Post not found", "NOT_FOUND");
  }

  if (!isPlatformAdmin(ctx)) {
    const neighborhoodIds = await listNeighborhoodIdsForUser(ctx);
    if (!neighborhoodIds || !row.post.neighborhoodId || !neighborhoodIds.includes(row.post.neighborhoodId)) {
      throw new ServiceError("Post not found", "NOT_FOUND");
    }

    if (row.post.status !== "published") {
      const neighborhoodAdminIds = await listNeighborhoodAdminIdsForUser(ctx);
      if (!neighborhoodAdminIds || !neighborhoodAdminIds.includes(row.post.neighborhoodId)) {
        throw new ServiceError("Post not found", "NOT_FOUND");
      }
    }
  }

  return {
    ...row.post,
    creatorName: row.creatorName,
  };
}

const publishPostSchema = z.object({
  postId: idSchema,
});

export async function publishPost(
  ctx: ServiceContext,
  input: z.input<typeof publishPostSchema>
) {
  const { postId } = publishPostSchema.parse(input);
  await requirePostAdminScope(ctx, postId);

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
  const { postId } = unpublishPostSchema.parse(input);
  await requirePostAdminScope(ctx, postId);

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
  const { postId } = removePostSchema.parse(input);
  await requirePostAdminScope(ctx, postId);

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
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);
  const scopeFilter = isPlatformAdmin(ctx)
    ? undefined
    : inArray(posts.neighborhoodId, neighborhoodAdminIds ?? []);

  const publishedResult = await db
    .select({ value: count() })
    .from(posts)
    .where(and(eq(posts.status, "published"), scopeFilter));

  const draftResult = await db
    .select({ value: count() })
    .from(posts)
    .where(and(eq(posts.status, "draft"), scopeFilter));

  return {
    published: Number(publishedResult[0]?.value ?? 0),
    drafts: Number(draftResult[0]?.value ?? 0),
  };
}

export async function listRecentPosts(ctx: ServiceContext, limit = 6) {
  const neighborhoodAdminIds = await requireNeighborhoodAdminScope(ctx);

  const rows = await db
    .select({
      post: posts,
      creatorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.createdBy, users.id))
    .where(
      isPlatformAdmin(ctx)
        ? undefined
        : inArray(posts.neighborhoodId, neighborhoodAdminIds ?? [])
    )
    .orderBy(desc(posts.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row.post,
    creatorName: row.creatorName,
  }));
}
