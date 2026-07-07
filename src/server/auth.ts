import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import { auth } from "./better-auth";

export type SessionUser = {
  id: string;
  role: "user" | "admin" | "platform_admin";
  status: "active" | "inactive";
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
    (await cookies()).get("vh_active_neighborhood")?.value ?? null;
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

  const currentUser = (
    await db
      .select({
        role: users.role,
        status: users.status,
        username: users.username,
        image: users.image,
        preferredLanguage: users.preferredLanguage,
      })
      .from(users)
      .where(eq(users.id, sessionResult.user.id))
      .limit(1)
  )[0];

  if (!currentUser || currentUser.status !== "active") {
    return null;
  }

  return {
    user: {
      id: sessionResult.user.id,
      role: currentUser.role as SessionUser["role"],
      status: currentUser.status,
      username: currentUser.username ?? null,
      image: currentUser.image ?? null,
      preferredLanguage: currentUser.preferredLanguage as SessionUser["preferredLanguage"],
      activeNeighborhoodId,
    },
  };
}
