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
        className="rounded-lg border border-stone-200 px-3 py-1 text-sm text-stone-700 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              {t("title")}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {t("subtitle")}
            </p>

            <label className="mt-4 block space-y-2 text-sm text-stone-500">
              {t("statusLabel")}
              <select
                className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Contribution["status"])
                }
                data-testid="contribution-status-select"
              >
                <option value="submitted">{t("statuses.submitted")}</option>
                <option value="confirmed">{t("statuses.confirmed")}</option>
                <option value="rejected">{t("statuses.rejected")}</option>
              </select>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-teal-300"
                type="button"
                data-testid="contribution-status-cancel"
                onClick={() => setOpen(false)}
                disabled={updateStatus.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-teal-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
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
