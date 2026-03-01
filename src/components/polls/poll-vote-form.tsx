"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

type PollOption = {
  id: string;
  label: string;
  description?: string | null;
  amount?: string | null;
};

export function PollVoteForm({
  pollId,
  groupId,
  options,
  disabled,
  existingVote,
}: {
  pollId: string;
  groupId: string;
  options: PollOption[];
  disabled: boolean;
  existingVote?: { optionId: string } | null;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.pollVote");
  const [optionId, setOptionId] = useState(
    existingVote?.optionId ?? options[0]?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const existingOption = existingVote
    ? options.find((option) => option.id === existingVote.optionId)
    : null;
  const isValid = Boolean(groupId && optionId) && !disabled;

  const vote = trpc.polls.vote.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });

  if (!groupId || options.length === 0) {
    return (
      <p className="text-sm text-stone-500">
        {t("unavailable")}
      </p>
    );
  }

  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!isValid) {
          setError(t("disabledError"));
          return;
        }
        vote.mutate({ pollId, groupId, optionId });
      }}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">
          {t("optionsLabel")}
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                optionId === option.id
                  ? "border-teal-300 bg-white text-stone-900"
                  : "border-stone-200 bg-stone-50 text-stone-700"
              }`}
            >
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={optionId === option.id}
                onChange={() => setOptionId(option.id)}
                className="mt-1 accent-teal-600"
              />
              <div className="space-y-1">
                <div className="font-medium">{option.label}</div>
                {option.description ? (
                  <div className="text-xs text-stone-500">
                    {option.description}
                  </div>
                ) : null}
                {option.amount ? (
                  <div className="text-xs uppercase tracking-[0.3em] text-stone-500">
                    {t("amount", { amount: option.amount })}
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {existingVote ? (
        <p className="rounded-lg border border-teal-300 bg-stone-50 px-3 py-2 text-xs text-teal-600">
          {t("alreadyVoted")}
          {existingOption ? (
            <span className="ml-2 text-stone-900">
              {t("currentSelection", { label: existingOption.label })}
            </span>
          ) : null}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || vote.isPending}
      >
        {vote.isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
