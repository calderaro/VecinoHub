"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    try {
      const { data } = await authClient.signIn.email({
        email,
        password,
      });

      if (!data?.user) {
        setError("Invalid credentials.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">VecinoHub</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Sign in</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Access your neighborhood dashboard.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-[color:var(--muted-strong)]" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[color:var(--muted-strong)]" htmlFor="password">
            Password
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error ? (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-[color:var(--muted)]">
        New here?{" "}
        <Link className="text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]" href="/register">
          Create an account
        </Link>
      </p>
    </div>
  );
}
