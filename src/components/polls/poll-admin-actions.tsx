"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

export function PollAdminActions({
  pollId,
  status,
}: {
  pollId: string;
  status: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.pollActions");
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
          className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setLaunchOpen(true)}
          disabled={launchPoll.isPending}
          data-testid="poll-admin-launch"
        >
          {t("launch")}
        </button>
      ) : null}
      {status !== "draft" ? (
        <button
          className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent-strong)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setResetOpen(true)}
          disabled={resetPoll.isPending}
          data-testid="poll-admin-reset"
        >
          {t("reset")}
        </button>
      ) : null}
      {status !== "closed" ? (
        <button
          className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setOpen(true)}
          disabled={closePoll.isPending}
          data-testid="poll-admin-close"
        >
          {t("close")}
        </button>
      ) : (
        <button
          className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={() => setReopenOpen(true)}
          disabled={reopenPoll.isPending}
          data-testid="poll-admin-reopen"
        >
          {t("reopen")}
        </button>
      )}

      {launchOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("launchTitle")}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {t("launchBody")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setLaunchOpen(false)}
                disabled={launchPoll.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-admin-confirm"
                onClick={() => launchPoll.mutate({ pollId, status: "active" })}
                disabled={launchPoll.isPending}
              >
                {launchPoll.isPending ? t("launching") : t("launchConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resetOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("resetTitle")}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {t("resetBody")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setResetOpen(false)}
                disabled={resetPoll.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent-strong)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-admin-confirm"
                onClick={() => resetPoll.mutate({ pollId })}
                disabled={resetPoll.isPending}
              >
                {resetPoll.isPending ? t("resetting") : t("resetConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("closeTitle")}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {t("closeBody")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setOpen(false)}
                disabled={closePoll.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-admin-confirm"
                onClick={() => closePoll.mutate({ pollId })}
                disabled={closePoll.isPending}
              >
                {closePoll.isPending ? t("closing") : t("closeConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reopenOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("reopenTitle")}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {t("reopenBody")}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setReopenOpen(false)}
                disabled={reopenPoll.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-admin-confirm"
                onClick={() => reopenPoll.mutate({ pollId })}
                disabled={reopenPoll.isPending}
              >
                {reopenPoll.isPending ? t("reopening") : t("reopenConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
