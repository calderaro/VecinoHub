"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { TimeField } from "@/components/date-time";
import { minuteOfDayToTimeValue, timeValueToMinuteOfDay, type PortTimeValue } from "@/lib/port-time";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2";

type DayWindowState = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: PortTimeValue;
  endTime: PortTimeValue;
};

type RuleInputField = {
  label: string;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  testId: string;
};

type ResourceFormProps = {
  mode: "create" | "edit";
  neighborhoodId: string;
  adminBasePath: string;
  resourceId?: string;
  initialResource?: {
    name: string;
    description?: string | null;
    type?: string | null;
    location?: string | null;
    capacity?: number | null;
    status?: "active" | "inactive";
    requiresDeposit?: boolean;
    depositAmount?: string | null;
    reservationFeeAmount?: string | null;
    usageRules?: string | null;
    termsText?: string | null;
  };
  initialAvailabilityWindows?: Array<{
    dayOfWeek: number;
    startMinute: number;
    endMinute: number;
  }>;
  initialRules?: {
    minAdvanceHours: number;
    maxAdvanceDays: number;
    maxReservationsPerMonth?: number | null;
    maxReservationsPerYear?: number | null;
    maxActiveReservations?: number | null;
    minDurationMinutes: number;
    maxDurationMinutes: number;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    maxConcurrentReservations: number;
    requireNoDebt: boolean;
    cancellationLimitHours?: number | null;
    lateCancellationCountsAsUsage: boolean;
    lateCancellationForfeitsDeposit: boolean;
  };
  timeZone: string;
};

function buildInitialWindows(
  initialAvailabilityWindows?: ResourceFormProps["initialAvailabilityWindows"]
) {
  return Array.from({ length: 7 }).map((_, dayOfWeek) => {
    const window = initialAvailabilityWindows?.find((item) => item.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      enabled: Boolean(window),
      startTime: window ? minuteOfDayToTimeValue(window.startMinute) : { hour: 10, minute: 0 },
      endTime: window ? minuteOfDayToTimeValue(window.endMinute) : { hour: 18, minute: 0 },
    };
  });
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return Number(trimmed);
}

export function ResourceForm({
  mode,
  neighborhoodId,
  adminBasePath,
  resourceId,
  initialResource,
  initialAvailabilityWindows,
  initialRules,
  timeZone,
}: ResourceFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("admin.resources.form");
  const tStatus = useTranslations("status");
  const { addToast } = useToast();
  const [name, setName] = useState(initialResource?.name ?? "");
  const [description, setDescription] = useState(initialResource?.description ?? "");
  const [type, setType] = useState(initialResource?.type ?? "");
  const [location, setLocation] = useState(initialResource?.location ?? "");
  const [capacity, setCapacity] = useState(initialResource?.capacity?.toString() ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(initialResource?.status ?? "active");
  const [requiresDeposit, setRequiresDeposit] = useState(initialResource?.requiresDeposit ?? false);
  const [depositAmount, setDepositAmount] = useState(initialResource?.depositAmount ?? "");
  const [reservationFeeAmount, setReservationFeeAmount] = useState(
    initialResource?.reservationFeeAmount ?? ""
  );
  const [usageRules, setUsageRules] = useState(initialResource?.usageRules ?? "");
  const [termsText, setTermsText] = useState(initialResource?.termsText ?? "");
  const [windows, setWindows] = useState<DayWindowState[]>(buildInitialWindows(initialAvailabilityWindows));
  const [minAdvanceHours, setMinAdvanceHours] = useState(
    initialRules?.minAdvanceHours?.toString() ?? "24"
  );
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(
    initialRules?.maxAdvanceDays?.toString() ?? "30"
  );
  const [maxReservationsPerMonth, setMaxReservationsPerMonth] = useState(
    initialRules?.maxReservationsPerMonth?.toString() ?? ""
  );
  const [maxReservationsPerYear, setMaxReservationsPerYear] = useState(
    initialRules?.maxReservationsPerYear?.toString() ?? ""
  );
  const [maxActiveReservations, setMaxActiveReservations] = useState(
    initialRules?.maxActiveReservations?.toString() ?? ""
  );
  const [minDurationMinutes, setMinDurationMinutes] = useState(
    initialRules?.minDurationMinutes?.toString() ?? "60"
  );
  const [maxDurationMinutes, setMaxDurationMinutes] = useState(
    initialRules?.maxDurationMinutes?.toString() ?? "360"
  );
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(
    initialRules?.bufferBeforeMinutes?.toString() ?? "0"
  );
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(
    initialRules?.bufferAfterMinutes?.toString() ?? "0"
  );
  const [maxConcurrentReservations, setMaxConcurrentReservations] = useState(
    initialRules?.maxConcurrentReservations?.toString() ?? "1"
  );
  const [requireNoDebt, setRequireNoDebt] = useState(initialRules?.requireNoDebt ?? false);
  const [cancellationLimitHours, setCancellationLimitHours] = useState(
    initialRules?.cancellationLimitHours?.toString() ?? ""
  );
  const [lateCancellationCountsAsUsage, setLateCancellationCountsAsUsage] = useState(
    initialRules?.lateCancellationCountsAsUsage ?? false
  );
  const [
    lateCancellationForfeitsDeposit,
    setLateCancellationForfeitsDeposit,
  ] = useState(initialRules?.lateCancellationForfeitsDeposit ?? false);
  const [error, setError] = useState<string | null>(null);

  const createResource = trpc.resources.create.useMutation({
    onSuccess: () => {
      addToast(t("created"), "success");
      router.push(`${adminBasePath}/resources`);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const updateResource = trpc.resources.update.useMutation({
    onSuccess: (resource) => {
      addToast(t("updated"), "success");
      router.push(`${adminBasePath}/resources/${resource.id}`);
      router.refresh();
    },
    onError: (mutationError) => setError(mutationError.message),
  });

  const isPending = createResource.isPending || updateResource.isPending;
  const dayLabels = Array.from({ length: 7 }).map((_, index) =>
    new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, 0, index + 7)))
  );
  const ruleInputFields: RuleInputField[] = [
    {
      label: t("rules.minAdvanceHours"),
      value: minAdvanceHours,
      setValue: setMinAdvanceHours,
      testId: "resource-form-min-advance",
    },
    {
      label: t("rules.maxAdvanceDays"),
      value: maxAdvanceDays,
      setValue: setMaxAdvanceDays,
      testId: "resource-form-max-advance",
    },
    {
      label: t("rules.minDurationMinutes"),
      value: minDurationMinutes,
      setValue: setMinDurationMinutes,
      testId: "resource-form-min-duration",
    },
    {
      label: t("rules.maxDurationMinutes"),
      value: maxDurationMinutes,
      setValue: setMaxDurationMinutes,
      testId: "resource-form-max-duration",
    },
    {
      label: t("rules.bufferBeforeMinutes"),
      value: bufferBeforeMinutes,
      setValue: setBufferBeforeMinutes,
      testId: "resource-form-buffer-before",
    },
    {
      label: t("rules.bufferAfterMinutes"),
      value: bufferAfterMinutes,
      setValue: setBufferAfterMinutes,
      testId: "resource-form-buffer-after",
    },
    {
      label: t("rules.maxReservationsPerMonth"),
      value: maxReservationsPerMonth,
      setValue: setMaxReservationsPerMonth,
      testId: "resource-form-max-monthly",
    },
    {
      label: t("rules.maxReservationsPerYear"),
      value: maxReservationsPerYear,
      setValue: setMaxReservationsPerYear,
      testId: "resource-form-max-yearly",
    },
    {
      label: t("rules.maxActiveReservations"),
      value: maxActiveReservations,
      setValue: setMaxActiveReservations,
      testId: "resource-form-max-active",
    },
    {
      label: t("rules.maxConcurrentReservations"),
      value: maxConcurrentReservations,
      setValue: setMaxConcurrentReservations,
      testId: "resource-form-max-concurrent",
    },
    {
      label: t("rules.cancellationLimitHours"),
      value: cancellationLimitHours,
      setValue: setCancellationLimitHours,
      testId: "resource-form-cancellation-limit",
    },
  ];

  function toggleWindow(dayOfWeek: number) {
    setWindows((current) =>
      current.map((window) =>
        window.dayOfWeek === dayOfWeek ? { ...window, enabled: !window.enabled } : window
      )
    );
  }

  function updateWindow(dayOfWeek: number, field: "startTime" | "endTime", value: PortTimeValue) {
    setWindows((current) =>
      current.map((window) =>
        window.dayOfWeek === dayOfWeek ? { ...window, [field]: value } : window
      )
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const availabilityWindows = windows
      .filter((window) => window.enabled)
      .map((window) => ({
        dayOfWeek: window.dayOfWeek,
        startMinute: timeValueToMinuteOfDay(window.startTime),
        endMinute: timeValueToMinuteOfDay(window.endTime),
      }))
      .filter((window) => window.endMinute > window.startMinute);

    if (!name.trim()) {
      setError(t("errors.nameRequired"));
      return;
    }

    if (availabilityWindows.length === 0) {
      setError(t("errors.availabilityRequired"));
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      type: type.trim() || undefined,
      location: location.trim() || undefined,
      capacity: numberOrNull(capacity),
      status,
      requiresApproval: false,
      requiresDeposit,
      depositAmount: depositAmount.trim(),
      reservationFeeAmount: reservationFeeAmount.trim(),
      usageRules: usageRules.trim() || undefined,
      termsText: termsText.trim() || undefined,
      availabilityWindows,
      rules: {
        minAdvanceHours: Number(minAdvanceHours || "0"),
        maxAdvanceDays: Number(maxAdvanceDays || "0"),
        maxReservationsPerMonth: numberOrNull(maxReservationsPerMonth),
        maxReservationsPerYear: numberOrNull(maxReservationsPerYear),
        maxActiveReservations: numberOrNull(maxActiveReservations),
        minDurationMinutes: Number(minDurationMinutes || "0"),
        maxDurationMinutes: Number(maxDurationMinutes || "0"),
        bufferBeforeMinutes: Number(bufferBeforeMinutes || "0"),
        bufferAfterMinutes: Number(bufferAfterMinutes || "0"),
        maxConcurrentReservations: Number(maxConcurrentReservations || "1"),
        requireNoDebt,
        cancellationLimitHours: numberOrNull(cancellationLimitHours),
        lateCancellationCountsAsUsage,
        lateCancellationForfeitsDeposit,
      },
    };

    if (mode === "create") {
      createResource.mutate({
        neighborhoodId,
        ...payload,
      });
      return;
    }

    if (!resourceId) {
      setError(t("errors.resourceIdRequired"));
      return;
    }

    updateResource.mutate({
      resourceId,
      ...payload,
    });
  }

  return (
    <form className="mx-auto flex w-full max-w-5xl flex-col gap-4" onSubmit={handleSubmit}>
      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
          {t("sections.basic")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.name")}</span>
            <input
              className={inputBase}
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-testid="resource-form-name"
              disabled={isPending}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.type")}</span>
            <input
              className={inputBase}
              value={type}
              onChange={(event) => setType(event.target.value)}
              data-testid="resource-form-type"
              disabled={isPending}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.location")}</span>
            <input
              className={inputBase}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              data-testid="resource-form-location"
              disabled={isPending}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.capacity")}</span>
            <input
              type="number"
              className={inputBase}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
              data-testid="resource-form-capacity"
              disabled={isPending}
            />
          </label>
          {mode === "edit" ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">{t("fields.status")}</span>
              <select
                className={inputBase}
                value={status}
                onChange={(event) => setStatus(event.target.value as "active" | "inactive")}
                data-testid="resource-form-status"
                disabled={isPending}
              >
                <option value="active">{tStatus("active")}</option>
                <option value="inactive">{tStatus("inactive")}</option>
              </select>
            </label>
          ) : null}
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.description")}</span>
            <textarea
              className={`${inputBase} min-h-28 resize-y`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              data-testid="resource-form-description"
              disabled={isPending}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
          {t("sections.availability")}
        </h2>
        <div className="mt-4 space-y-3" data-testid="resource-form-availability">
          {windows.map((window) => (
            <div
              key={window.dayOfWeek}
              className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-[160px_1fr_1fr]"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={window.enabled}
                  onChange={() => toggleWindow(window.dayOfWeek)}
                  data-testid={`resource-form-day-enabled-${window.dayOfWeek}`}
                  disabled={isPending}
                />
                {dayLabels[window.dayOfWeek]}
              </label>
              <TimeField
                value={window.startTime}
                onChange={(value) => updateWindow(window.dayOfWeek, "startTime", value)}
                locale={locale}
                timeZone={timeZone}
                minuteStep={5}
                disabled={isPending || !window.enabled}
                data-testid={`resource-form-day-start-${window.dayOfWeek}`}
              />
              <TimeField
                value={window.endTime}
                onChange={(value) => updateWindow(window.dayOfWeek, "endTime", value)}
                locale={locale}
                timeZone={timeZone}
                minuteStep={5}
                disabled={isPending || !window.enabled}
                data-testid={`resource-form-day-end-${window.dayOfWeek}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
          {t("sections.rules")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {ruleInputFields.map((field) => (
            <label key={field.testId} className="block space-y-2">
              <span className="text-sm font-medium text-stone-700">{field.label}</span>
              <input
                type="number"
                className={inputBase}
                value={field.value}
                onChange={(event) => field.setValue(event.target.value)}
                data-testid={field.testId}
                disabled={isPending}
              />
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={requireNoDebt}
              onChange={(event) => setRequireNoDebt(event.target.checked)}
              data-testid="resource-form-require-no-debt"
              disabled={isPending}
            />
            {t("rules.requireNoDebt")}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={lateCancellationCountsAsUsage}
              onChange={(event) => setLateCancellationCountsAsUsage(event.target.checked)}
              data-testid="resource-form-late-counts"
              disabled={isPending}
            />
            {t("rules.lateCancellationCountsAsUsage")}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={lateCancellationForfeitsDeposit}
              onChange={(event) => setLateCancellationForfeitsDeposit(event.target.checked)}
              data-testid="resource-form-late-forfeit"
              disabled={isPending}
            />
            {t("rules.lateCancellationForfeitsDeposit")}
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
          {t("sections.financial")}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-700 md:col-span-2">
            <input
              type="checkbox"
              checked={requiresDeposit}
              onChange={(event) => setRequiresDeposit(event.target.checked)}
              data-testid="resource-form-requires-deposit"
              disabled={isPending}
            />
            {t("fields.requiresDeposit")}
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.depositAmount")}</span>
            <input
              className={inputBase}
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              data-testid="resource-form-deposit-amount"
              disabled={isPending}
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.reservationFee")}</span>
            <input
              className={inputBase}
              value={reservationFeeAmount}
              onChange={(event) => setReservationFeeAmount(event.target.value)}
              data-testid="resource-form-reservation-fee"
              disabled={isPending}
            />
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.usageRules")}</span>
            <textarea
              className={`${inputBase} min-h-24 resize-y`}
              value={usageRules}
              onChange={(event) => setUsageRules(event.target.value)}
              data-testid="resource-form-usage-rules"
              disabled={isPending}
            />
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-stone-700">{t("fields.termsText")}</span>
            <textarea
              className={`${inputBase} min-h-24 resize-y`}
              value={termsText}
              onChange={(event) => setTermsText(event.target.value)}
              data-testid="resource-form-terms"
              disabled={isPending}
            />
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-50"
          onClick={() =>
            router.push(mode === "create" ? `${adminBasePath}/resources` : `${adminBasePath}/resources/${resourceId ?? ""}`)
          }
          disabled={isPending}
          data-testid="resource-form-cancel"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          data-testid="resource-form-submit"
        >
          {isPending ? t("saving") : mode === "create" ? t("submitCreate") : t("submitEdit")}
        </button>
      </div>
    </form>
  );
}
