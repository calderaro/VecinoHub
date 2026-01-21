"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

type Contribution = {
  id: string;
  status: "submitted" | "confirmed" | "rejected";
  method: "cash" | "wire_transfer";
};

export function FundraisingAdminActions({ contribution }: { contribution: Contribution }) {
  const router = useRouter();

  const confirmContribution = trpc.fundraising.confirmContribution.useMutation({
    onSuccess: () => router.refresh(),
  });
  const rejectContribution = trpc.fundraising.rejectContribution.useMutation({
    onSuccess: () => router.refresh(),
  });

  if (contribution.status !== "submitted") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded-full border border-emerald-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => confirmContribution.mutate({ contributionId: contribution.id })}
        disabled={confirmContribution.isLoading}
      >
        {confirmContribution.isLoading ? "Confirming" : "Confirm"}
      </button>
      <button
        className="rounded-full border border-rose-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => rejectContribution.mutate({ contributionId: contribution.id })}
        disabled={rejectContribution.isLoading}
      >
        {rejectContribution.isLoading ? "Rejecting" : "Reject"}
      </button>
    </div>
  );
}
