import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { helpEvents, helpFeedback, users } from "@/db/schema";
import {
  getHelpFeedbackForUser,
  recordHelpEvent,
  submitHelpFeedback,
} from "@/services/help";
import type { ServiceContext } from "@/services/types";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { db } from "@/db";
import {
  closeTestDatabase,
  ensureTestDatabase,
  resetTestDatabase,
} from "../helpers/test-database";

function createCtx(userId: string): ServiceContext {
  return {
    user: {
      id: userId,
      role: "user",
      activeNeighborhoodId: null,
    },
  };
}

describe("help service", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("upserts article feedback and records a feedback event", async () => {
    const userId = randomUUID();
    const ctx = createCtx(userId);

    await db.insert(users).values({
      id: userId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });

    await submitHelpFeedback(ctx, {
      articleSlug: "como-un-residente-se-une-a-un-grupo",
      response: "no",
      comment: "Faltó el paso sobre qué pasa después.",
      locale: "es",
    });

    await submitHelpFeedback(ctx, {
      articleSlug: "como-un-residente-se-une-a-un-grupo",
      response: "yes",
      comment: null,
      locale: "es",
    });

    const storedFeedback = await db
      .select()
      .from(helpFeedback)
      .where(eq(helpFeedback.userId, userId));
    const storedEvents = await db
      .select()
      .from(helpEvents)
      .where(eq(helpEvents.userId, userId));

    expect(storedFeedback).toHaveLength(1);
    expect(storedFeedback[0]?.response).toBe("yes");
    expect(storedFeedback[0]?.comment).toBeNull();
    expect(storedEvents.filter((event) => event.eventName === "help_feedback_submitted")).toHaveLength(
      2
    );
  });

  it("returns the latest saved feedback for the current user", async () => {
    const userId = randomUUID();
    const ctx = createCtx(userId);

    await db.insert(users).values({
      id: userId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });

    await submitHelpFeedback(ctx, {
      articleSlug: "como-reservar-recursos-compartidos",
      response: "no",
      comment: "No encontré la parte sobre bloqueos.",
      locale: "es",
    });

    const feedback = await getHelpFeedbackForUser(ctx, {
      articleSlug: "como-reservar-recursos-compartidos",
    });

    expect(feedback).toMatchObject({
      response: "no",
      comment: "No encontré la parte sobre bloqueos.",
    });
  });

  it("records standalone help events", async () => {
    const userId = randomUUID();
    const ctx = createCtx(userId);

    await db.insert(users).values({
      id: userId,
      email: "resident@example.com",
      name: "Resident",
      status: "active",
    });

    await recordHelpEvent(ctx, {
      eventName: "help_search_used",
      locale: "es",
      source: "help_center",
      query: "unirme a grupo",
      resultCount: 3,
    });

    const events = await db
      .select()
      .from(helpEvents)
      .where(eq(helpEvents.userId, userId));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventName: "help_search_used",
      source: "help_center",
      query: "unirme a grupo",
      resultCount: 3,
    });
  });
});
