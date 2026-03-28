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

type TemplateOption = {
  id: string;
  title: string;
};

export function FundPeriodForm({
  fundId,
  redirectTo,
  templates,
  timeZone,
}: {
  fundId: string;
  redirectTo: string;
  templates: TemplateOption[];
  timeZone: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const t = useTranslations("admin.funds.periodForm");
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amountPerGroup, setAmountPerGroup] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createPeriod = trpc.funds.createChargePeriod.useMutation({
    onSuccess: (period) => {
      addToast(t("created"), "success");
      router.push(`${redirectTo}/${period.id}`);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });
  const generatePeriod = trpc.funds.generateChargePeriod.useMutation({
    onSuccess: (period) => {
      addToast(t("created"), "success");
      router.push(`${redirectTo}/${period.id}`);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const isPending = createPeriod.isPending || generatePeriod.isPending;
  const usingTemplate = Boolean(templateId);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!dueDate) {
      setError(t("validationDueDate"));
      return;
    }

    if (usingTemplate) {
      generatePeriod.mutate({
        templateId,
        dueDate: toStableUtcDateFromDateKey(dueDate),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
      });
      return;
    }

    if (!title.trim() || Number(amountPerGroup) <= 0) {
      setError(t("validationManual"));
      return;
    }

    createPeriod.mutate({
      fundId,
      title: title.trim(),
      description: description.trim() || undefined,
      amountPerGroup,
      dueDate: toStableUtcDateFromDateKey(dueDate),
    });
  }

  return (
    <form className="mx-auto flex w-full max-w-3xl flex-col gap-4" onSubmit={handleSubmit}>
      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.template")}</span>
            <select
              className={inputBase}
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              data-testid="fund-period-form-template"
              disabled={isPending}
            >
              <option value="">{t("fields.manualOption")}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.title")}</span>
            <input
              className={inputBase}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={usingTemplate ? t("fields.titleOptional") : t("fields.titleRequired")}
              data-testid="fund-period-form-title"
              disabled={isPending}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.description")}</span>
            <textarea
              className={`${inputBase} min-h-28 resize-y`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("fields.descriptionPlaceholder")}
              data-testid="fund-period-form-description"
              disabled={isPending}
            />
          </label>

          {!usingTemplate ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">{t("fields.amountPerGroup")}</span>
              <input
                className={inputBase}
                type="number"
                min="1"
                step="0.01"
                value={amountPerGroup}
                onChange={(event) => setAmountPerGroup(event.target.value)}
                data-testid="fund-period-form-amount"
                disabled={isPending}
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.dueDate")}</span>
            <DateField
              value={dueDate}
              onChange={setDueDate}
              locale={locale}
              timeZone={timeZone}
              placeholder={t("placeholders.dueDate")}
              testId="fund-period-form-due-date"
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
          data-testid="fund-period-form-cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          data-testid="fund-period-form-submit"
        >
          {isPending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
