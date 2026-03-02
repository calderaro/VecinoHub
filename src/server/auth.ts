import { headers } from "next/headers";

import { auth } from "./better-auth";

export type SessionUser = {
  id: string;
  role: "user" | "admin" | "platform_admin";
  username: string | null;
  image: string | null;
  preferredLanguage: "es" | "en";
  activeNeighborhoodId: string | null;
};

export type Session = {
  user: SessionUser;
} | null;

export async function getSession(): Promise<Session> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie");
  const cookieNeighborhoodId =
    cookie
      ?.split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("vh_active_neighborhood="))
      ?.split("=")[1] ?? null;
  const referer = headerStore.get("referer");
  const refererNeighborhoodId =
    referer?.match(/\/admin\/([0-9a-fA-F-]{36})(?:\/|$)/)?.[1] ?? null;
  const activeNeighborhoodId = refererNeighborhoodId ?? cookieNeighborhoodId;

  const sessionResult = await auth.api
    .getSession({
      headers: cookie ? { cookie } : {},
    })
    .catch(() => null);

  if (!sessionResult) {
    return null;
  }

  return {
    user: {
      id: sessionResult.user.id,
      role: sessionResult.user.role as SessionUser["role"],
      username: (sessionResult.user as { username?: string }).username ?? null,
      image: sessionResult.user.image ?? null,
      preferredLanguage:
        (sessionResult.user as { preferredLanguage?: SessionUser["preferredLanguage"] })
          .preferredLanguage ?? "es",
      activeNeighborhoodId,
    },
  };
}
