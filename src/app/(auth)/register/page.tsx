"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { normalizeLanguage, setLocaleCookie } from "@/lib/locale";
import { trpc } from "@/lib/trpc";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateProfile = trpc.users.updateProfile.useMutation();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const preferredLanguage = normalizeLanguage(
      typeof navigator !== "undefined" ? navigator.language : undefined
    );

    try {
      const { data } = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (!data?.user) {
        setError(t("errors.createAccount"));
        return;
      }

      try {
        await updateProfile.mutateAsync({ preferredLanguage });
      } catch {
        // Best-effort update; user can adjust in profile.
      }

      setLocaleCookie(preferredLanguage);

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.registration"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">VecinoHub</p>
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">{t("title")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("subtitle")}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm text-[color:var(--muted-strong)]" htmlFor="name">
            {t("fullName")}
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            id="name"
            name="name"
            data-testid="auth-register-name"
            type="text"
            autoComplete="name"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[color:var(--muted-strong)]" htmlFor="email">
            {t("email")}
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            id="email"
            name="email"
            data-testid="auth-register-email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-[color:var(--muted-strong)]" htmlFor="password">
            {t("password")}
          </label>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            id="password"
            name="password"
            data-testid="auth-register-password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        {error ? (
          <p
            className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-200"
            data-testid="auth-register-error"
          >
            {error}
          </p>
        ) : null}

        <button
          className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[#0d1515] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={isSubmitting}
          data-testid="auth-register-submit"
        >
          {isSubmitting ? t("creating") : t("action")}
        </button>
      </form>

      <p className="text-sm text-[color:var(--muted)]">
        {t("existing")}{" "}
        <Link className="text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]" href="/login">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
