"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <p className="text-sm text-slate-500">
        Voting unavailable for this poll.
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
          setError("Voting is disabled for this poll.");
          return;
        }
        vote.mutate({ pollId, groupId, optionId });
      }}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Options
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                optionId === option.id
                  ? "border-emerald-300/60 bg-emerald-400/10 text-emerald-100"
                  : "border-slate-800 bg-slate-950/40 text-slate-200"
              }`}
            >
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={optionId === option.id}
                onChange={() => setOptionId(option.id)}
                className="mt-1 accent-emerald-300"
              />
              <div className="space-y-1">
                <div className="font-medium">{option.label}</div>
                {option.description ? (
                  <div className="text-xs text-slate-400">
                    {option.description}
                  </div>
                ) : null}
                {option.amount ? (
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Amount: ${option.amount}
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
      {existingVote ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          This group already voted. Submitting will overwrite the previous
          selection.
          {existingOption ? (
            <span className="ml-2 text-amber-100">
              Current selection: {existingOption.label}.
            </span>
          ) : null}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || vote.isLoading}
      >
        {vote.isLoading ? "Submitting" : "Cast vote"}
      </button>
    </form>
  );
}
