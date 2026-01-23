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
      <p className="text-sm text-[color:var(--muted)]">
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
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Options
        </p>
        <div className="space-y-2">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2 text-sm ${
                optionId === option.id
                  ? "border-[rgba(225,177,94,0.6)] bg-[rgba(225,177,94,0.15)] text-[color:var(--foreground)]"
                  : "border-white/10 bg-[rgba(18,26,26,0.5)] text-[color:var(--muted-strong)]"
              }`}
            >
              <input
                type="radio"
                name="poll-option"
                value={option.id}
                checked={optionId === option.id}
                onChange={() => setOptionId(option.id)}
                className="mt-1 accent-[color:var(--accent)]"
              />
              <div className="space-y-1">
                <div className="font-medium">{option.label}</div>
                {option.description ? (
                  <div className="text-xs text-[color:var(--muted)]">
                    {option.description}
                  </div>
                ) : null}
                {option.amount ? (
                  <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    Amount: ${option.amount}
                  </div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
      {existingVote ? (
        <p className="rounded-2xl border border-[rgba(225,177,94,0.4)] bg-[rgba(225,177,94,0.12)] px-3 py-2 text-xs text-[color:var(--accent-strong)]">
          This group already voted. Submitting will overwrite the previous
          selection.
          {existingOption ? (
            <span className="ml-2 text-[color:var(--foreground)]">
              Current selection: {existingOption.label}.
            </span>
          ) : null}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || vote.isPending}
      >
        {vote.isPending ? "Submitting" : "Cast vote"}
      </button>
    </form>
  );
}
