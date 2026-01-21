import { headers } from "next/headers";

import { auth } from "./better-auth";

export type SessionUser = {
  id: string;
  role: "user" | "admin";
  username: string | null;
  image: string | null;
};

export type Session = {
  user: SessionUser;
} | null;

export async function getSession(): Promise<Session> {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie");

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
    },
  };
}
