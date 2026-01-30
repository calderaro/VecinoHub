"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

type Contribution = {
  id: string;
  status: "submitted" | "confirmed" | "rejected";
};

export function ContributionStatusDialog({
  contribution,
  canEdit,
}: {
  contribution: Contribution;
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("admin.contributionStatus");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(contribution.status);

  const updateStatus = trpc.fundraising.updateContributionStatus.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <>
      <button
        className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => {
          setStatus(contribution.status);
          setOpen(true);
        }}
        disabled={!canEdit}
        data-testid="contribution-status-open"
      >
        {t("trigger")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("title")}
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {t("subtitle")}
            </p>

            <label className="mt-4 block space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              {t("statusLabel")}
              <select
                className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Contribution["status"])
                }
              >
                <option value="submitted">{t("statuses.submitted")}</option>
                <option value="confirmed">{t("statuses.confirmed")}</option>
                <option value="rejected">{t("statuses.rejected")}</option>
              </select>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                data-testid="contribution-status-cancel"
                onClick={() => setOpen(false)}
                disabled={updateStatus.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="contribution-status-save"
                onClick={() =>
                  updateStatus.mutate({ contributionId: contribution.id, status })
                }
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
