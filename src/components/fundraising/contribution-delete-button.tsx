"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

export function ContributionDeleteButton({
  contributionId,
}: {
  contributionId: string;
}) {
  const router = useRouter();
  const t = useTranslations("admin.contributionDelete");
  const deleteContribution = trpc.fundraising.deleteContribution.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <button
      className="rounded-full border border-rose-400/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
      type="button"
      onClick={() => deleteContribution.mutate({ contributionId })}
      disabled={deleteContribution.isPending}
    >
      {deleteContribution.isPending ? t("deleting") : t("delete")}
    </button>
  );
}
