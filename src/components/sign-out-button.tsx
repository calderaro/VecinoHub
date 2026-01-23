"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out" : "Sign out"}
    </button>
  );
}
