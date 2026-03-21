"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function FundPaymentActions({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.funds.paymentActions");
  const [error, setError] = useState<string | null>(null);

  const confirmPayment = trpc.funds.confirmPayment.useMutation({
    onSuccess: () => {
      addToast(t("confirmed"), "success");
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });
  const rejectPayment = trpc.funds.rejectPayment.useMutation({
    onSuccess: () => {
      addToast(t("rejected"), "success");
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const isPending = confirmPayment.isPending || rejectPayment.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            setError(null);
            confirmPayment.mutate({ paymentId });
          }}
          disabled={isPending}
          data-testid={`fund-payment-confirm-${paymentId}`}
        >
          {t("confirm")}
        </button>
        <button
          type="button"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            setError(null);
            rejectPayment.mutate({ paymentId });
          }}
          disabled={isPending}
          data-testid={`fund-payment-reject-${paymentId}`}
        >
          {t("reject")}
        </button>
      </div>
      {error ? <p className="text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
