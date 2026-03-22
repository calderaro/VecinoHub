"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { DateField, TimeField } from "@/components/date-time";
import {
  addDaysToDateKey,
  compareDateKeys,
  getPortParts,
  timeValueToMinuteOfDay,
  type PortTimeValue,
} from "@/lib/port-time";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2";

export function ResourceReservationForm({
  resourceId,
  groupId,
  resourceName,
  groupName,
  timeZone,
  minAdvanceHours,
  maxAdvanceDays,
}: {
  resourceId: string;
  groupId: string;
  resourceName: string;
  groupName: string;
  timeZone: string;
  minAdvanceHours: number;
  maxAdvanceDays: number;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard.resourceReservationForm");
  const { addToast } = useToast();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState<PortTimeValue>({ hour: 10, minute: 0 });
  const [endTime, setEndTime] = useState<PortTimeValue>({ hour: 12, minute: 0 });
  const [title, setTitle] = useState("");
  const [attendeeCount, setAttendeeCount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { minDateKey, maxDateKey, hasSelectableDate } = useMemo(() => {
    const now = new Date();
    const selectedStartMinute = timeValueToMinuteOfDay(startTime);

    const minAdvanceCutoff = getPortParts(
      new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000),
      timeZone
    );
    const minAdvanceMinute = minAdvanceCutoff.hour * 60 + minAdvanceCutoff.minute;
    const nextMinDateKey =
      selectedStartMinute >= minAdvanceMinute
        ? minAdvanceCutoff.dateKey
        : addDaysToDateKey(minAdvanceCutoff.dateKey, 1);

    const maxAdvanceCutoff = getPortParts(
      new Date(now.getTime() + maxAdvanceDays * 24 * 60 * 60 * 1000),
      timeZone
    );
    const maxAdvanceMinute = maxAdvanceCutoff.hour * 60 + maxAdvanceCutoff.minute;
    const nextMaxDateKey =
      selectedStartMinute <= maxAdvanceMinute
        ? maxAdvanceCutoff.dateKey
        : addDaysToDateKey(maxAdvanceCutoff.dateKey, -1);

    return {
      minDateKey: nextMinDateKey,
      maxDateKey: nextMaxDateKey,
      hasSelectableDate: compareDateKeys(nextMaxDateKey, nextMinDateKey) >= 0,
    };
  }, [maxAdvanceDays, minAdvanceHours, startTime, timeZone]);

  const hasValidSelectedDate =
    !!date &&
    hasSelectableDate &&
    compareDateKeys(date, minDateKey) >= 0 &&
    compareDateKeys(date, maxDateKey) <= 0;
  const effectiveDate = hasValidSelectedDate ? date : "";
  const derivedRangeError =
    date && !hasValidSelectedDate ? t("errors.dateOutOfRange") : null;

  const createReservation = trpc.resources.createReservation.useMutation({
    onSuccess: () => {
      addToast(t("created"), "success");
      router.push(`/dashboard/${groupId}/resources/reservations`);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!effectiveDate || !title.trim()) {
      setError(derivedRangeError ?? t("errors.required"));
      return;
    }

    createReservation.mutate({
      resourceId,
      groupId,
      date: effectiveDate,
      startMinute: timeValueToMinuteOfDay(startTime),
      endMinute: timeValueToMinuteOfDay(endTime),
      title: title.trim(),
      attendeeCount: attendeeCount.trim() ? Number(attendeeCount) : null,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-4"
      onSubmit={handleSubmit}
      data-testid="resource-reservation-form"
    >
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">
          {t("title", { resourceName })}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle", { groupName })}</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.date")}</span>
            <DateField
              value={effectiveDate}
              onChange={(nextDate) => {
                setDate(nextDate);
                setError(null);
              }}
              locale={locale}
              timeZone={timeZone}
              disabled={!hasSelectableDate}
              minDateKey={minDateKey}
              maxDateKey={maxDateKey}
              placeholder={t("placeholders.date")}
              testId="resource-reservation-date"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.title")}</span>
            <input
              className={inputBase}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              data-testid="resource-reservation-title"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.startTime")}</span>
            <TimeField
              value={startTime}
              onChange={(nextStartTime) => {
                setStartTime(nextStartTime);
                setError(null);
              }}
              locale={locale}
              timeZone={timeZone}
              minuteStep={5}
              placeholder={t("placeholders.startTime")}
              testId="resource-reservation-start"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.endTime")}</span>
            <TimeField
              value={endTime}
              onChange={setEndTime}
              locale={locale}
              timeZone={timeZone}
              minuteStep={5}
              placeholder={t("placeholders.endTime")}
              testId="resource-reservation-end"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.attendeeCount")}</span>
            <input
              type="number"
              className={inputBase}
              value={attendeeCount}
              onChange={(event) => setAttendeeCount(event.target.value)}
              data-testid="resource-reservation-attendees"
            />
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.notes")}</span>
            <textarea
              className={`${inputBase} min-h-28 resize-y`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              data-testid="resource-reservation-notes"
            />
          </label>
        </div>
      </section>

      {derivedRangeError || error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {derivedRangeError ?? error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          onClick={() => router.push(`/dashboard/${groupId}/resources/${resourceId}`)}
          data-testid="resource-reservation-cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={createReservation.isPending}
          data-testid="resource-reservation-submit"
        >
          {createReservation.isPending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
