"use client";

import Link from "next/link";
import { ClockIcon, HomeIcon, LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

type NoGroupStateProps = {
  eyebrow: string;
  title: string;
  body: string;
  statusLabel: string;
  helpText: string;
  signOutLabel: string;
  signingOutLabel: string;
  actionHref?: string;
  actionLabel?: string;
  fullScreen?: boolean;
};

export function NoGroupState({
  eyebrow,
  title,
  body,
  statusLabel,
  helpText,
  signOutLabel,
  signingOutLabel,
  actionHref,
  actionLabel,
  fullScreen = true,
}: NoGroupStateProps) {
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
    <main
      className={`flex w-full items-center justify-center bg-stone-50 px-4 ${fullScreen ? "min-h-screen" : "min-h-[calc(100vh-56px)]"}`}
      data-testid="dashboard-no-group-state"
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-teal-100 bg-teal-50">
          <HomeIcon className="h-8 w-8 text-teal-600" aria-hidden="true" />
        </div>

        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-teal-600">{eyebrow}</p>

        <h1 className="mb-3 text-2xl font-bold text-stone-900">{title}</h1>

        <p className="mb-8 text-sm leading-relaxed text-stone-500">{body}</p>

        <div
          className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2"
          data-testid="dashboard-no-group-status"
        >
          <ClockIcon className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
          <span className="text-sm font-medium text-amber-700">{statusLabel}</span>
        </div>

        <p className="mt-6 text-xs text-stone-400">{helpText}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionHref && actionLabel ? (
            <Link
              href={actionHref}
              data-testid="dashboard-no-group-action"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              <HomeIcon className="h-4 w-4" aria-hidden="true" />
              {actionLabel}
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            disabled={isSigningOut}
            data-testid="dashboard-no-group-signout"
            className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOutIcon className="h-4 w-4" aria-hidden="true" />
            {isSigningOut ? signingOutLabel : signOutLabel}
          </button>
        </div>
      </div>
    </main>
  );
}
