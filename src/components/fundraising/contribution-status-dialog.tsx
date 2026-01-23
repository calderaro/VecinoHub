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
        className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canEdit}
      >
        Update status
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Update contribution
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Choose the new status for this contribution.
            </p>

            <label className="mt-4 block space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Status
              <select
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
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
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setOpen(false)}
                disabled={updateStatus.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
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
