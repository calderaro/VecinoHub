"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2";

export function FundPaymentForm({
  fundId,
  groupId,
  groupChargeId,
  redirectTo,
  initialAmount = "",
}: {
  fundId: string;
  groupId: string;
  groupChargeId: string;
  redirectTo: string;
  initialAmount?: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("dashboard.funds.paymentForm");
  const [method, setMethod] = useState<"cash" | "wire_transfer">("cash");
  const [amount, setAmount] = useState(initialAmount);
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitPayment = trpc.funds.submitPayment.useMutation({
    onSuccess: () => {
      addToast(t("submitted"), "success");
      router.push(redirectTo);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const isPending = submitPayment.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!amount || Number(amount) <= 0 || !paidAt) {
      setError(t("validation"));
      return;
    }

    if (method === "wire_transfer" && !reference.trim()) {
      setError(t("referenceRequired"));
      return;
    }

    submitPayment.mutate({
      fundId,
      groupId,
      groupChargeId,
      method,
      amount,
      paidAt: new Date(`${paidAt}T00:00:00`),
      reference: method === "wire_transfer" ? reference.trim() : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form className="mx-auto flex w-full max-w-3xl flex-col gap-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.method")}</span>
            <select
              className={inputBase}
              value={method}
              onChange={(event) => setMethod(event.target.value as "cash" | "wire_transfer")}
              data-testid="fund-payment-form-method"
              disabled={isPending}
            >
              <option value="cash">{t("methods.cash")}</option>
              <option value="wire_transfer">{t("methods.wire_transfer")}</option>
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.amount")}</span>
            <input
              className={inputBase}
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              data-testid="fund-payment-form-amount"
              disabled={isPending}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.paidAt")}</span>
            <input
              className={inputBase}
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
              data-testid="fund-payment-form-paid-at"
              disabled={isPending}
            />
          </label>

          {method === "wire_transfer" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">{t("fields.reference")}</span>
              <input
                className={inputBase}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                data-testid="fund-payment-form-reference"
                disabled={isPending}
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.notes")}</span>
            <textarea
              className={`${inputBase} min-h-28 resize-y`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              data-testid="fund-payment-form-notes"
              disabled={isPending}
            />
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          onClick={() => router.push(redirectTo)}
          disabled={isPending}
          data-testid="fund-payment-form-cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          data-testid="fund-payment-form-submit"
        >
          {isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
