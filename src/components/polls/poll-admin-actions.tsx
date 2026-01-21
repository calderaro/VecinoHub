"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

export function PollAdminActions({
  pollId,
  status,
}: {
  pollId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const closePoll = trpc.polls.close.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  const reopenPoll = trpc.polls.reopen.useMutation({
    onSuccess: () => {
      setReopenOpen(false);
      router.refresh();
    },
  });
  const launchPoll = trpc.polls.update.useMutation({
    onSuccess: () => {
      setLaunchOpen(false);
      router.refresh();
    },
  });
  const resetPoll = trpc.polls.reset.useMutation({
    onSuccess: () => {
      setResetOpen(false);
      router.refresh();
    },
  });

  return (
    <>
      {status === "draft" ? (
        <button
          className="rounded-full border border-emerald-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setLaunchOpen(true)}
          disabled={launchPoll.isLoading}
        >
          Launch poll
        </button>
      ) : null}
      {status !== "draft" ? (
        <button
          className="rounded-full border border-amber-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200 hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setResetOpen(true)}
          disabled={resetPoll.isLoading}
        >
          Reset to draft
        </button>
      ) : null}
      {status !== "closed" ? (
        <button
          className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setOpen(true)}
          disabled={closePoll.isLoading}
        >
          Close poll
        </button>
      ) : (
        <button
          className="rounded-full border border-emerald-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setReopenOpen(true)}
          disabled={reopenPoll.isLoading}
        >
          Re-open poll
        </button>
      )}

      {launchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Launch poll
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Launching a poll makes it active and locks the options. Continue?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setLaunchOpen(false)}
                disabled={launchPoll.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => launchPoll.mutate({ pollId, status: "active" })}
                disabled={launchPoll.isLoading}
              >
                {launchPoll.isLoading ? "Launching" : "Launch poll"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Reset poll to draft
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              This will remove all votes and move the poll back to draft. Continue?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setResetOpen(false)}
                disabled={resetPoll.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-amber-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-amber-200 hover:border-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => resetPoll.mutate({ pollId })}
                disabled={resetPoll.isLoading}
              >
                {resetPoll.isLoading ? "Resetting" : "Reset to draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Close poll
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Closing a poll prevents further votes and edits. Continue?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setOpen(false)}
                disabled={closePoll.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => closePoll.mutate({ pollId })}
                disabled={closePoll.isLoading}
              >
                {closePoll.isLoading ? "Closing" : "Close poll"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reopenOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Re-open poll
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Re-opening a poll allows groups to update their votes. Continue?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setReopenOpen(false)}
                disabled={reopenPoll.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() => reopenPoll.mutate({ pollId })}
                disabled={reopenPoll.isLoading}
              >
                {reopenPoll.isLoading ? "Re-opening" : "Re-open poll"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
