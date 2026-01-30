"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

export function PollCreateForm() {
  const router = useRouter();
  const t = useTranslations("admin.pollForm");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isValid = title.trim().length > 0;

  const createPoll = trpc.polls.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <form
      className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!isValid) {
          setError(t("titleRequired"));
          return;
        }
        createPoll.mutate({
          title,
          description: description || undefined,
        });
      }}
    >
      <h2 className="text-lg font-semibold">{t("formTitle")}</h2>
      <div className="mt-4 space-y-4">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("fields.title")}</span>
          <input
            className="w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="poll-create-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>{t("fields.description")}</span>
          <textarea
            className="min-h-[96px] w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            data-testid="poll-create-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        className="mt-4 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#0d1515] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || createPoll.isPending}
        data-testid="poll-create-submit"
      >
        {createPoll.isPending ? t("creating") : t("createAction")}
      </button>
    </form>
  );
}
