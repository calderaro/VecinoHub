"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

type Report = {
  id: string;
  status: "submitted" | "confirmed" | "rejected";
  method: "cash" | "wire_transfer";
};

export function PaymentAdminActions({ report }: { report: Report }) {
  const router = useRouter();

  const confirmReport = trpc.payments.confirmReport.useMutation({
    onSuccess: () => router.refresh(),
  });
  const rejectReport = trpc.payments.rejectReport.useMutation({
    onSuccess: () => router.refresh(),
  });

  if (report.status !== "submitted") {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded-full border border-emerald-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => confirmReport.mutate({ reportId: report.id })}
        disabled={confirmReport.isLoading}
      >
        {confirmReport.isLoading ? "Confirming" : "Confirm"}
      </button>
      <button
        className="rounded-full border border-rose-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => rejectReport.mutate({ reportId: report.id })}
        disabled={rejectReport.isLoading}
      >
        {rejectReport.isLoading ? "Rejecting" : "Reject"}
      </button>
    </div>
  );
}
