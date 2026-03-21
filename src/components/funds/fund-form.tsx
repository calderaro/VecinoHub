"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2";

type FundFormProps = {
  mode: "create" | "edit";
  neighborhoodId: string;
  adminBasePath: string;
  fundId?: string;
  initialName?: string;
  initialDescription?: string | null;
  initialCurrencyCode?: string;
  initialStatus?: "active" | "archived";
};

export function FundForm({
  mode,
  neighborhoodId,
  adminBasePath,
  fundId,
  initialName = "",
  initialDescription = "",
  initialCurrencyCode = "MXN",
  initialStatus = "active",
}: FundFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.funds.form");
  const tStatus = useTranslations("status");
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [currencyCode, setCurrencyCode] = useState(initialCurrencyCode);
  const [status, setStatus] = useState<"active" | "archived">(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const createFund = trpc.funds.createFund.useMutation({
    onSuccess: () => {
      addToast(t("created"), "success");
      router.push(`${adminBasePath}/fund`);
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });
  const updateFund = trpc.funds.updateFund.useMutation({
    onSuccess: (fund) => {
      addToast(t("updated"), "success");
      router.push(`${adminBasePath}/fund/${fund.id}`);
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const isPending = createFund.isPending || updateFund.isPending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("validation"));
      return;
    }

    if (mode === "create") {
      createFund.mutate({
        neighborhoodId,
        name: name.trim(),
        description: description.trim() || undefined,
        currencyCode: currencyCode.trim().toUpperCase(),
      });
      return;
    }

    if (!fundId) {
      setError(t("saveError"));
      return;
    }

    updateFund.mutate({
      fundId,
      name: name.trim(),
      description: description.trim() || undefined,
      currencyCode: currencyCode.trim().toUpperCase(),
      status,
    });
  }

  return (
    <form className="mx-auto flex w-full max-w-3xl flex-col gap-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.name")}</span>
            <input
              className={inputBase}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("fields.namePlaceholder")}
              data-testid="fund-form-name"
              disabled={isPending}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.description")}</span>
            <textarea
              className={`${inputBase} min-h-32 resize-y`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("fields.descriptionPlaceholder")}
              data-testid="fund-form-description"
              disabled={isPending}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.currency")}</span>
            <input
              className={inputBase}
              value={currencyCode}
              onChange={(event) => setCurrencyCode(event.target.value.toUpperCase())}
              maxLength={3}
              data-testid="fund-form-currency"
              disabled={isPending}
            />
          </label>

          {mode === "edit" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">{t("fields.status")}</span>
              <select
                className={inputBase}
                value={status}
                onChange={(event) => setStatus(event.target.value as "active" | "archived")}
                data-testid="fund-form-status"
                disabled={isPending}
              >
                <option value="active">{tStatus("active")}</option>
                <option value="archived">{tStatus("archived")}</option>
              </select>
            </label>
          ) : null}

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
          onClick={() => router.push(mode === "create" ? `${adminBasePath}/fund` : `${adminBasePath}/fund/${fundId ?? ""}`)}
          disabled={isPending}
          data-testid="fund-form-cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          data-testid="fund-form-submit"
        >
          {isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
