"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

export function PaymentReportDeleteButton({
  reportId,
}: {
  reportId: string;
}) {
  const router = useRouter();
  const deleteReport = trpc.payments.deleteReport.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <button
      className="rounded-full border border-rose-400/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={() => deleteReport.mutate({ reportId })}
      disabled={deleteReport.isLoading}
    >
      {deleteReport.isLoading ? "Deleting" : "Delete"}
    </button>
  );
}
