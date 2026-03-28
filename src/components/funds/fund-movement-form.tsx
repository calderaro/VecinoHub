"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { DateField } from "@/components/date-time";
import { toStableUtcDateFromDateKey } from "@/lib/port-time";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2";

export function FundMovementForm({
  fundId,
  kind,
  redirectTo,
  timeZone,
}: {
  fundId: string;
  kind: "expense" | "income" | "adjustment";
  redirectTo: string;
  timeZone: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const t = useTranslations("admin.funds.movementForm");
  const [amount, setAmount] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [description, setDescription] = useState("");
  const [entrySide, setEntrySide] = useState<"credit" | "debit">("credit");
  const [error, setError] = useState<string | null>(null);

  const expenseMutation = trpc.funds.recordExpense.useMutation({
    onSuccess: () => {
      addToast(t("saved"), "success");
      router.push(redirectTo);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });
  const incomeMutation = trpc.funds.recordManualIncome.useMutation({
    onSuccess: () => {
      addToast(t("saved"), "success");
      router.push(redirectTo);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });
  const adjustmentMutation = trpc.funds.recordAdjustment.useMutation({
    onSuccess: () => {
      addToast(t("saved"), "success");
      router.push(redirectTo);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const isPending =
    expenseMutation.isPending || incomeMutation.isPending || adjustmentMutation.isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!amount || !description.trim()) {
      setError(t("validation"));
      return;
    }

    const payload = {
      fundId,
      amount,
      effectiveAt: effectiveAt ? toStableUtcDateFromDateKey(effectiveAt) : undefined,
      description: description.trim(),
    };

    if (kind === "expense") {
      expenseMutation.mutate(payload);
      return;
    }

    if (kind === "income") {
      incomeMutation.mutate(payload);
      return;
    }

    adjustmentMutation.mutate({
      ...payload,
      entrySide,
    });
  }

  return (
    <form className="mx-auto flex w-full max-w-3xl flex-col gap-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.amount")}</span>
            <input
              className={inputBase}
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              data-testid="fund-movement-form-amount"
              disabled={isPending}
            />
          </label>

          {kind === "adjustment" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">{t("fields.entrySide")}</span>
              <select
                className={inputBase}
                value={entrySide}
                onChange={(event) => setEntrySide(event.target.value as "credit" | "debit")}
                data-testid="fund-movement-form-entry-side"
                disabled={isPending}
              >
                <option value="credit">{t("entrySide.credit")}</option>
                <option value="debit">{t("entrySide.debit")}</option>
              </select>
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.effectiveAt")}</span>
            <DateField
              value={effectiveAt}
              onChange={setEffectiveAt}
              locale={locale}
              timeZone={timeZone}
              placeholder={t("placeholders.effectiveAt")}
              testId="fund-movement-form-effective-at"
              disabled={isPending}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.description")}</span>
            <textarea
              className={`${inputBase} min-h-28 resize-y`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              data-testid="fund-movement-form-description"
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
          data-testid="fund-movement-form-cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          data-testid="fund-movement-form-submit"
        >
          {isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
