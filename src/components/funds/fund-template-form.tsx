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

export function FundTemplateForm({ fundId, timeZone }: { fundId: string; timeZone: string }) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const t = useTranslations("admin.funds.templateForm");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "annual" | "one_off">("monthly");
  const [defaultAmount, setDefaultAmount] = useState("");
  const [dueDayOfMonth, setDueDayOfMonth] = useState("1");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createTemplate = trpc.funds.createChargeTemplate.useMutation({
    onSuccess: () => {
      addToast(t("created"), "success");
      setTitle("");
      setDescription("");
      setDefaultAmount("");
      setStartsOn("");
      setEndsOn("");
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const isPending = createTemplate.isPending;
  const requiresDueDay = frequency !== "one_off";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim() || !defaultAmount || !startsOn) {
      setError(t("validation"));
      return;
    }

    createTemplate.mutate({
      fundId,
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      defaultAmount,
      dueDayOfMonth: requiresDueDay ? Number(dueDayOfMonth) : undefined,
      startsOn: toStableUtcDateFromDateKey(startsOn),
      endsOn: endsOn ? toStableUtcDateFromDateKey(endsOn) : undefined,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("fields.title")}</span>
          <input
            className={inputBase}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            data-testid="fund-template-form-title"
            disabled={isPending}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("fields.frequency")}</span>
          <select
            className={inputBase}
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as "monthly" | "quarterly" | "annual" | "one_off")}
            data-testid="fund-template-form-frequency"
            disabled={isPending}
          >
            <option value="monthly">{t("frequency.monthly")}</option>
            <option value="quarterly">{t("frequency.quarterly")}</option>
            <option value="annual">{t("frequency.annual")}</option>
            <option value="one_off">{t("frequency.oneOff")}</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("fields.defaultAmount")}</span>
          <input
            className={inputBase}
            type="number"
            min="1"
            step="0.01"
            value={defaultAmount}
            onChange={(event) => setDefaultAmount(event.target.value)}
            data-testid="fund-template-form-amount"
            disabled={isPending}
          />
        </label>
        {requiresDueDay ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.dueDayOfMonth")}</span>
            <input
              className={inputBase}
              type="number"
              min="1"
              max="31"
              value={dueDayOfMonth}
              onChange={(event) => setDueDayOfMonth(event.target.value)}
              data-testid="fund-template-form-due-day"
              disabled={isPending}
            />
          </label>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("fields.startsOn")}</span>
          <DateField
            value={startsOn}
            onChange={setStartsOn}
            locale={locale}
            timeZone={timeZone}
            placeholder={t("placeholders.startsOn")}
            testId="fund-template-form-starts-on"
            disabled={isPending}
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("fields.endsOn")}</span>
          <DateField
            value={endsOn}
            onChange={setEndsOn}
            locale={locale}
            timeZone={timeZone}
            placeholder={t("placeholders.endsOn")}
            testId="fund-template-form-ends-on"
            disabled={isPending}
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-stone-700">{t("fields.description")}</span>
        <textarea
          className={`${inputBase} min-h-28 resize-y`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          data-testid="fund-template-form-description"
          disabled={isPending}
        />
      </label>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        data-testid="fund-template-form-submit"
      >
        {isPending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
