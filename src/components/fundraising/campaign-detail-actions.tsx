"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function CampaignDetailActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: "open" | "closed";
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.campaignActions");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const closeCampaign = trpc.fundraising.closeCampaign.useMutation({
    onSuccess: () => {
      addToast(t("closedToast"), "success");
      setConfirmOpen(false);
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  if (status !== "open") {
    return null;
  }

  return (
    <>
      <button
        className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-50"
        type="button"
        onClick={() => setConfirmOpen(true)}
        data-testid="campaign-admin-close"
      >
        {t("close")}
      </button>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">{t("closeTitle")}</h3>
            <p className="mt-1 text-sm text-stone-500">{t("closeBody")}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-teal-300"
                type="button"
                data-testid="campaign-admin-close-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={closeCampaign.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-amber-300 px-4 py-2 text-sm text-amber-700 transition hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="campaign-admin-close-confirm"
                onClick={() => closeCampaign.mutate({ campaignId })}
                disabled={closeCampaign.isPending}
              >
                {closeCampaign.isPending ? t("closing") : t("close")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
