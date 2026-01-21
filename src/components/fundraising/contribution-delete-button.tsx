"use client";

import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

export function ContributionDeleteButton({
  contributionId,
}: {
  contributionId: string;
}) {
  const router = useRouter();
  const deleteContribution = trpc.fundraising.deleteContribution.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <button
      className="rounded-full border border-rose-400/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={() => deleteContribution.mutate({ contributionId })}
      disabled={deleteContribution.isLoading}
    >
      {deleteContribution.isLoading ? "Deleting" : "Delete"}
    </button>
  );
}
