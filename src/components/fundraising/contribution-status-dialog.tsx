"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(contribution.status);

  useEffect(() => {
    if (open) {
      setStatus(contribution.status);
    }
  }, [open, contribution.status]);

  const updateStatus = trpc.fundraising.updateContributionStatus.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <>
      <button
        className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canEdit}
      >
        Update status
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Update contribution
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Choose the new status for this contribution.
            </p>

            <label className="mt-4 block space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              Status
              <select
                className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Contribution["status"])
                }
              >
                <option value="submitted">Submitted</option>
                <option value="confirmed">Confirmed</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setOpen(false)}
                disabled={updateStatus.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  updateStatus.mutate({ contributionId: contribution.id, status })
                }
                disabled={updateStatus.isLoading}
              >
                {updateStatus.isLoading ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
