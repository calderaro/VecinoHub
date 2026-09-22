import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { groupMemberships, groups, neighborhoodMemberships, neighborhoods, users } from "@/db/schema";
import { createPost, getPostById, getPostsStats, listPostsPaged, listRecentPosts } from "@/services/posts";
import type { ServiceContext } from "@/services/types";

import { resetTestDatabase } from "../helpers/test-database";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

async function seedNeighborhoods() {
  const userId = randomUUID();
  const firstNeighborhoodId = randomUUID();
  const secondNeighborhoodId = randomUUID();
  await db.insert(users).values({
    id: userId,
    name: "Platform admin",
    email: "posts-admin@example.com",
    role: "platform_admin",
  });
  await db.insert(neighborhoods).values([
    { id: firstNeighborhoodId, name: "First", slug: "first", createdBy: userId },
    { id: secondNeighborhoodId, name: "Second", slug: "second", createdBy: userId },
  ]);

  const firstContext: ServiceContext = {
    user: { id: userId, role: "platform_admin", activeNeighborhoodId: firstNeighborhoodId },
  };
  const secondContext: ServiceContext = {
    user: { ...firstContext.user, activeNeighborhoodId: secondNeighborhoodId },
  };
  return { firstContext, secondContext, firstNeighborhoodId, secondNeighborhoodId };
}

async function seedPostPair() {
  const fixture = await seedNeighborhoods();
  const firstPost = await createPost(fixture.firstContext, {
    title: "First neighborhood news",
    content: "Only for the first neighborhood.",
    status: "published",
  });
  const secondPost = await createPost(fixture.secondContext, {
    title: "Second neighborhood draft",
    content: "Only for the second neighborhood.",
  });
  return { ...fixture, firstPost, secondPost };
}

describe("post neighborhood isolation", () => {
  beforeEach(resetTestDatabase);

  it("does not show a newly published post after switching neighborhoods", async () => {
    const { firstContext, secondContext, firstNeighborhoodId } = await seedNeighborhoods();
    const post = await createPost(firstContext, {
      neighborhoodId: firstNeighborhoodId,
      title: "First neighborhood news",
      content: "Only for the first neighborhood.",
      status: "published",
    });

    const ownPosts = await listPostsPaged(firstContext, {});
    expect(ownPosts.items.map((item) => item.id)).toEqual([post.id]);
    expect(ownPosts.total).toBe(1);

    const otherPosts = await listPostsPaged(secondContext, {});
    expect(otherPosts.items).toEqual([]);
    expect(otherPosts.total).toBe(0);
  });

  it("creates posts in the active neighborhood when no explicit neighborhood is supplied", async () => {
    const { firstPost, secondPost, firstNeighborhoodId, secondNeighborhoodId } = await seedPostPair();
    expect(firstPost.neighborhoodId).toBe(firstNeighborhoodId);
    expect(secondPost.neighborhoodId).toBe(secondNeighborhoodId);
  });

  it.each(["platform_admin", "admin"] as const)("scopes recent posts for %s before applying the limit", async (role) => {
    const { firstContext, secondContext, firstPost, secondPost } = await seedPostPair();
    const firstPosts = await listRecentPosts({ user: { ...firstContext.user, role } }, 1);
    const secondPosts = await listRecentPosts({ user: { ...secondContext.user, role } }, 1);
    expect(firstPosts.map((post) => post.id)).toEqual([firstPost.id]);
    expect(secondPosts.map((post) => post.id)).toEqual([secondPost.id]);
  });

  it("counts only the selected neighborhood's published posts and drafts", async () => {
    const { firstContext, secondContext } = await seedPostPair();
    expect(await getPostsStats(firstContext)).toEqual({ published: 1, drafts: 0 });
    expect(await getPostsStats(secondContext)).toEqual({ published: 0, drafts: 1 });
  });

  it.each(["platform_admin", "admin"] as const)("hides foreign post details from %s in a scoped route", async (role) => {
    const { firstContext, secondContext, firstPost } = await seedPostPair();
    expect(await getPostById(firstContext, { postId: firstPost.id })).toMatchObject({ id: firstPost.id });
    await expect(getPostById({ user: { ...secondContext.user, role } }, { postId: firstPost.id }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("scopes search results and totals before pagination", async () => {
    const { secondContext, secondPost } = await seedPostPair();
    const result = await listPostsPaged(secondContext, { query: "neighborhood", limit: 1, offset: 0 });
    expect(result.items.map((post) => post.id)).toEqual([secondPost.id]);
    expect(result.total).toBe(1);
    expect(await listPostsPaged(secondContext, { limit: 1, offset: 1 })).toEqual({ items: [], total: 1 });
    expect(await listPostsPaged(secondContext, { status: "published" })).toEqual({ items: [], total: 0 });
  });

  it("preserves explicit neighborhood filtering and unscoped platform access", async () => {
    const { firstContext, firstPost, secondPost, secondNeighborhoodId } = await seedPostPair();
    const explicit = await listPostsPaged(firstContext, { neighborhoodId: secondNeighborhoodId });
    expect(explicit.items.map((post) => post.id)).toEqual([secondPost.id]);
    expect(explicit.total).toBe(1);

    const unscoped: ServiceContext = { user: { ...firstContext.user, activeNeighborhoodId: null } };
    expect((await listPostsPaged(unscoped, {})).total).toBe(2);
    expect((await listRecentPosts(unscoped)).map((post) => post.id).sort()).toEqual([firstPost.id, secondPost.id].sort());
    expect(await getPostsStats(unscoped)).toEqual({ published: 1, drafts: 1 });
    expect(await getPostById(unscoped, { postId: secondPost.id })).toMatchObject({ id: secondPost.id });
  });

  it.each(["neighbor", "neighborhood_admin"] as const)("keeps %s reads isolated with access to both neighborhoods", async (role) => {
    const { firstContext, secondContext, firstPost, secondPost, firstNeighborhoodId, secondNeighborhoodId } = await seedPostPair();
    const userId = randomUUID();
    await db.insert(users).values({ id: userId, name: "Member", email: "posts-member@example.com" });
    for (const neighborhoodId of [firstNeighborhoodId, secondNeighborhoodId]) {
      await db.insert(neighborhoodMemberships).values({ userId, neighborhoodId, role });
      const groupId = randomUUID();
      await db.insert(groups).values({ id: groupId, neighborhoodId, name: "Member group" });
      await db.insert(groupMemberships).values({ groupId, userId });
    }
    const memberFirst: ServiceContext = { user: { ...firstContext.user, id: userId, role: "user" } };
    const memberSecond: ServiceContext = { user: { ...secondContext.user, id: userId, role: "user" } };

    expect((await listPostsPaged(memberFirst, {})).items.map((post) => post.id)).toEqual([firstPost.id]);
    expect((await listPostsPaged(memberSecond, {})).items.map((post) => post.id))
      .toEqual(role === "neighborhood_admin" ? [secondPost.id] : []);
    expect(await listPostsPaged(memberSecond, { neighborhoodId: firstNeighborhoodId })).toEqual({ items: [], total: 0 });
    await expect(getPostById(memberSecond, { postId: firstPost.id })).rejects.toMatchObject({ code: "NOT_FOUND" });

    if (role === "neighbor") {
      await expect(getPostById(memberSecond, { postId: secondPost.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(getPostsStats(memberSecond)).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(listRecentPosts(memberSecond)).rejects.toMatchObject({ code: "FORBIDDEN" });
    } else {
      expect(await getPostsStats(memberSecond)).toEqual({ published: 0, drafts: 1 });
      expect((await listRecentPosts(memberSecond)).map((post) => post.id)).toEqual([secondPost.id]);
    }
  });
});
