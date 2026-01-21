"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

export function PollCreateForm() {
  const router = useRouter();
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
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!isValid) {
          setError("Title is required.");
          return;
        }
        createPoll.mutate({
          title,
          description: description || undefined,
        });
      }}
    >
      <h2 className="text-lg font-semibold">Create poll</h2>
      <div className="mt-4 space-y-4">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Title</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Description</span>
          <textarea
            className="min-h-[96px] w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || createPoll.isLoading}
      >
        {createPoll.isLoading ? "Creating..." : "Create poll"}
      </button>
    </form>
  );
}
