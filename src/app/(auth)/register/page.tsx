"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();

    try {
      const { data } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (!data?.user) {
        setError("Unable to create account.");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">VecinoHub</p>
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="text-sm text-slate-400">
          Join your neighborhood workspace.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="name">
            Full name
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="email">
            Email
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-slate-300" htmlFor="password">
            Password
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-slate-400">
        Already have an account?{" "}
        <Link className="text-emerald-300 hover:text-emerald-200" href="/login">
          Sign in
        </Link>
      </p>
    </div>
  );
}
