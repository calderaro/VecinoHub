"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

type Contribution = {
  id: string;
  status: "submitted" | "confirmed" | "rejected";
  method: "cash" | "wire_transfer";
};

export function FundraisingAdminActions({ contribution }: { contribution: Contribution }) {
  const router = useRouter();
  const t = useTranslations("admin.fundraisingActions");

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
        className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => confirmContribution.mutate({ contributionId: contribution.id })}
        disabled={confirmContribution.isPending}
        data-testid="fundraising-confirm-contribution"
      >
        {confirmContribution.isPending ? t("confirming") : t("confirm")}
      </button>
      <button
        className="rounded-full border border-rose-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        onClick={() => rejectContribution.mutate({ contributionId: contribution.id })}
        disabled={rejectContribution.isPending}
      >
        {rejectContribution.isPending ? t("rejecting") : t("reject")}
      </button>
    </div>
  );
}
