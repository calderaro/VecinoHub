"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { DateField, TimeField } from "@/components/date-time";
import { getPortToday, timeValueToMinuteOfDay, type PortTimeValue } from "@/lib/port-time";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2";

export function ResourceBlockForm({
  resources,
  timeZone,
}: {
  resources: Array<{ id: string; name: string }>;
  timeZone: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.resources.blockForm");
  const tReasons = useTranslations("resourcesUi.blockReasons");
  const { addToast } = useToast();
  const minDateKey = getPortToday(timeZone);
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState<PortTimeValue>({ hour: 10, minute: 0 });
  const [endTime, setEndTime] = useState<PortTimeValue>({ hour: 12, minute: 0 });
  const [reason, setReason] = useState<
    "maintenance" | "cleaning" | "repair" | "neighborhood_event" | "unavailable" | "other"
  >("maintenance");
  const [reasonText, setReasonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createBlock = trpc.resources.createBlock.useMutation({
    onSuccess: () => {
      addToast(t("created"), "success");
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!resourceId || !date) {
      setError(t("errors.required"));
      return;
    }

    createBlock.mutate({
      resourceId,
      date,
      startMinute: timeValueToMinuteOfDay(startTime),
      endMinute: timeValueToMinuteOfDay(endTime),
      reason,
      reasonText: reasonText.trim() || undefined,
    });
  }

  return (
    <form
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
      data-testid="resource-block-form"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
        {t("title")}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("resource")}</span>
          <select
            className={inputBase}
            value={resourceId}
            onChange={(event) => setResourceId(event.target.value)}
            data-testid="resource-block-resource"
          >
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("date")}</span>
          <DateField
            value={date}
            onChange={setDate}
            locale={locale}
            timeZone={timeZone}
            minDateKey={minDateKey}
            placeholder={t("placeholders.date")}
            testId="resource-block-date"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("startTime")}</span>
          <TimeField
            value={startTime}
            onChange={setStartTime}
            locale={locale}
            timeZone={timeZone}
            minuteStep={5}
            placeholder={t("placeholders.startTime")}
            testId="resource-block-start"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("endTime")}</span>
          <TimeField
            value={endTime}
            onChange={setEndTime}
            locale={locale}
            timeZone={timeZone}
            minuteStep={5}
            placeholder={t("placeholders.endTime")}
            testId="resource-block-end"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-stone-700">{t("reason")}</span>
          <select
            className={inputBase}
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value as
                  | "maintenance"
                  | "cleaning"
                  | "repair"
                  | "neighborhood_event"
                  | "unavailable"
                  | "other"
              )
            }
            data-testid="resource-block-reason"
          >
            <option value="maintenance">{tReasons("maintenance")}</option>
            <option value="cleaning">{tReasons("cleaning")}</option>
            <option value="repair">{tReasons("repair")}</option>
            <option value="neighborhood_event">{tReasons("neighborhood_event")}</option>
            <option value="unavailable">{tReasons("unavailable")}</option>
            <option value="other">{tReasons("other")}</option>
          </select>
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-stone-700">{t("notes")}</span>
          <textarea
            className={`${inputBase} min-h-24 resize-y`}
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            data-testid="resource-block-notes"
          />
        </label>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={createBlock.isPending}
          data-testid="resource-block-submit"
        >
          {createBlock.isPending ? t("saving") : t("submit")}
        </button>
      </div>
    </form>
  );
}
