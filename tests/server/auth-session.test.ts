import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();
const getSessionMock = vi.fn();
const dbLimitMock = vi.fn();
const dbWhereMock = vi.fn(() => ({ limit: dbLimitMock }));
const dbFromMock = vi.fn(() => ({ where: dbWhereMock }));
const dbSelectMock = vi.fn(() => ({ from: dbFromMock }));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/server/better-auth", () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: dbSelectMock,
  },
}));

describe("server auth session enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    headersMock.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "cookie") {
          return "session=abc; vh_active_neighborhood=00000000-0000-4000-8000-0000000000aa";
        }

        return null;
      }),
    });
  });

  it("returns null for inactive users in the auth session payload", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "00000000-0000-4000-8000-000000000001",
        role: "user",
        status: "inactive",
        username: "inactive-user",
        image: null,
        preferredLanguage: "es",
      },
    });

    const { getSession } = await import("@/server/auth");

    await expect(getSession()).resolves.toBeNull();
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("falls back to the database status when the auth payload omits status", async () => {
    getSessionMock.mockResolvedValue({
      user: {
        id: "00000000-0000-4000-8000-000000000002",
        role: "user",
        username: "active-user",
        image: null,
        preferredLanguage: "en",
      },
    });
    dbLimitMock.mockResolvedValue([{ status: "active" }]);

    const { getSession } = await import("@/server/auth");
    const session = await getSession();

    expect(session?.user.status).toBe("active");
    expect(session?.user.activeNeighborhoodId).toBe(
      "00000000-0000-4000-8000-0000000000aa"
    );
  });
});
