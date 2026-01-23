"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc";

export function PollEditForm({
  pollId,
  initialTitle,
  initialDescription,
  initialStatus,
}: {
  pollId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialStatus: "draft" | "active" | "closed";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isValid = title.trim().length > 0;
  const { addToast } = useToast();

  const updatePoll = trpc.polls.update.useMutation({
    onSuccess: () => {
      addToast("Saved changes. Redirecting...", "success");
      redirectTimeout.current = setTimeout(() => {
        router.push(`/admin/polls/${pollId}`);
      }, 800);
    },
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current);
      }
    };
  }, []);

  return (
    <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <h2 className="text-lg font-semibold">Edit poll</h2>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (!isValid) {
            setError("Title is required.");
            return;
          }
          updatePoll.mutate({
            pollId,
            title,
            description: description || undefined,
            status,
          });
        }}
      >
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Title</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Description</span>
          <textarea
            className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Status</span>
          <select
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "draft" | "active" | "closed")
            }
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="closed">closed</option>
            </select>
          </label>
        {error ? (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          className="mt-4 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={!isValid || updatePoll.isPending}
        >
          {updatePoll.isPending ? "Saving..." : "Save changes"}
        </button>
      </form>

    </div>
  );
}
