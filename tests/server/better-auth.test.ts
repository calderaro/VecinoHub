import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", async () => {
  const { testDb } = await import("../helpers/test-database");
  return { db: testDb };
});

import { users } from "@/db/schema";

const originalEnv = { ...process.env };

function baseEnv() {
  process.env.BETTER_AUTH_SECRET = "test-secret";
  process.env.DATABASE_URL = "postgres://vecinohub:vecinohub@localhost:5432/vecinohub";
}

describe("better-auth security configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    baseEnv();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("enables rate limiting, database-backed sessions, and protected token storage", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_USER = "mailer";
    process.env.SMTP_PASS = "secret";

    const { auth } = await import("@/server/better-auth");
    const magicPlugin = (auth as typeof auth & { options: { plugins: Array<{ id: string; options?: Record<string, unknown> }> } }).options.plugins.find(
      (plugin) => plugin.id === "magic-link"
    );
    const emailOtpPlugin = (auth as typeof auth & { options: { plugins: Array<{ id: string; options?: Record<string, unknown> }> } }).options.plugins.find(
      (plugin) => plugin.id === "email-otp"
    );

    expect((auth as typeof auth & { options: { rateLimit: Record<string, unknown> } }).options.rateLimit).toMatchObject({
      enabled: true,
      window: 60,
      max: 10,
    });
    expect(
      (auth as typeof auth & { options: { secondaryStorage?: unknown } }).options.secondaryStorage
    ).toBeUndefined();
    expect(magicPlugin?.options?.storeToken).toBe("hashed");
    expect(magicPlugin?.options?.rateLimit).toEqual({ window: 60, max: 5 });
    expect(emailOtpPlugin?.options?.storeOTP).toBe("hashed");
    expect(emailOtpPlugin?.options?.allowedAttempts).toBe(5);
    expect(
      (auth as typeof auth & {
        options: {
          account: { encryptOAuthTokens?: boolean };
        };
      }).options.account.encryptOAuthTokens
    ).toBe(true);
  });

  it("fails closed without logging auth secrets when SMTP is missing", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { auth } = await import("@/server/better-auth");
    const plugins = (auth as typeof auth & {
      options: {
        plugins: Array<{
          id: string;
          options?: {
            sendMagicLink?: (data: { email: string; url: string; token: string }) => Promise<void>;
            sendVerificationOTP?: (data: {
              email: string;
              otp: string;
              type: "sign-in" | "email-verification" | "forget-password";
            }) => Promise<void>;
          };
        }>;
      };
    }).options.plugins;
    const magicPlugin = plugins.find((plugin) => plugin.id === "magic-link");
    const emailOtpPlugin = plugins.find((plugin) => plugin.id === "email-otp");

    await expect(
      magicPlugin?.options?.sendMagicLink?.({
        email: "resident@example.com",
        url: "https://example.com/magic?token=topsecret",
        token: "topsecret",
      })
    ).rejects.toThrow("Auth email delivery is not configured.");
    await expect(
      emailOtpPlugin?.options?.sendVerificationOTP?.({
        email: "resident@example.com",
        otp: "654321",
        type: "forget-password",
      })
    ).rejects.toThrow("Auth email delivery is not configured.");

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    const warningText = warnSpy.mock.calls
      .flat()
      .map((value) => String(value))
      .join(" ");

    expect(warningText).toContain("SMTP");
    expect(warningText).not.toContain("topsecret");
    expect(warningText).not.toContain("654321");
  });

  it("blocks session creation for inactive users", async () => {
    const activeUserId = "00000000-0000-4000-8000-000000000001";
    const inactiveUserId = "00000000-0000-4000-8000-000000000002";

    const { auth } = await import("@/server/better-auth");
    const { db } = await import("@/db");

    await db.insert(users).values({
      id: activeUserId,
      email: "active@example.com",
      name: "Active User",
      status: "active",
    });
    await db.insert(users).values({
      id: inactiveUserId,
      email: "inactive@example.com",
      name: "Inactive User",
      status: "inactive",
    });

    const beforeCreate = (
      auth as typeof auth & {
        options: {
          databaseHooks: {
            session: {
              create: {
                before: (session: { userId: string }) => Promise<void>;
              };
            };
          };
        };
      }
    ).options.databaseHooks.session.create.before;

    await expect(beforeCreate({ userId: activeUserId })).resolves.toBeUndefined();
    await expect(beforeCreate({ userId: inactiveUserId })).rejects.toThrow("Account is inactive");
  });
});
