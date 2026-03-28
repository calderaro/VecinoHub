"use client";

import { CalendarIcon, Clock3Icon, XIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  buildDateKey,
  compareDateKeys,
  formatPortDateKey,
  formatPortDateTimeValue,
  formatTimeValue,
  getPortToday,
  parseDateKey,
  type PortDateTimeValue,
  type PortTimeValue,
} from "@/lib/port-time";

type PickerMode = "date" | "time" | "datetime";

type BaseFieldProps = {
  disabled?: boolean;
  id?: string;
  label?: string;
  locale: string;
  minuteStep?: number;
  placeholder?: string;
  timeZone: string;
  testId?: string;
};

type DateFieldProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  minDateKey?: string;
  maxDateKey?: string;
};

type TimeFieldProps = BaseFieldProps & {
  value: PortTimeValue | null;
  onChange: (value: PortTimeValue) => void;
};

type DateTimeFieldProps = BaseFieldProps & {
  value: PortDateTimeValue | null;
  onChange: (value: PortDateTimeValue) => void;
  minDateKey?: string;
  maxDateKey?: string;
};

type PickerDraft = {
  dateKey: string;
  hour: number;
  minute: number;
};

const inputBase =
  "w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-left text-sm text-stone-900 outline-none ring-teal-200 transition-colors hover:border-stone-300 focus:border-teal-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";

function clampMinuteStep(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return 5;
  }

  return Math.max(1, Math.min(60, Math.trunc(value)));
}

function resolveInitialDraft(
  mode: PickerMode,
  timeZone: string,
  value: string | PortTimeValue | PortDateTimeValue | null | undefined
): PickerDraft {
  const now = getPortToday(timeZone);

  if (mode === "date") {
    return {
      dateKey: typeof value === "string" && value ? value : now,
      hour: 12,
      minute: 0,
    };
  }

  if (mode === "time") {
    const timeValue = value as PortTimeValue | null | undefined;
    return {
      dateKey: now,
      hour: timeValue?.hour ?? 10,
      minute: timeValue?.minute ?? 0,
    };
  }

  const dateTimeValue = value as PortDateTimeValue | null | undefined;
  return {
    dateKey: dateTimeValue?.dateKey ?? now,
    hour: dateTimeValue?.hour ?? 10,
    minute: dateTimeValue?.minute ?? 0,
  };
}

function toCalendarDate(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function fromCalendarDate(date: Date) {
  return buildDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function toTimeInputValue(value: PortTimeValue) {
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

function fromTimeInputValue(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

function DateTimePickerField({
  disabled = false,
  id,
  locale,
  maxDateKey,
  minDateKey,
  mode,
  onApply,
  placeholder,
  testId,
  timeZone,
  value,
  minuteStep,
}: BaseFieldProps & {
  mode: PickerMode;
  value: string | PortTimeValue | PortDateTimeValue | null | undefined;
  onApply: (value: PickerDraft) => void;
  minDateKey?: string;
  maxDateKey?: string;
}) {
  const t = useTranslations("dateTimePicker");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => resolveInitialDraft(mode, timeZone, value));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = resolveInitialDraft(mode, timeZone, value);
    return toCalendarDate(initial.dateKey);
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const effectiveStep = clampMinuteStep(minuteStep);
  const selectedLabel = useMemo(() => {
    if (mode === "date") {
      return value
        ? formatPortDateKey(value as string, timeZone, locale, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : placeholder ?? t("placeholders.date");
    }

    if (mode === "time") {
      return value
        ? formatTimeValue(value as PortTimeValue, locale)
        : placeholder ?? t("placeholders.time");
    }

    return value
      ? formatPortDateTimeValue(value as PortDateTimeValue, timeZone, locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        })
      : placeholder ?? t("placeholders.datetime");
  }, [locale, mode, placeholder, t, timeZone, value]);

  function openPanel() {
    if (disabled) {
      return;
    }
    const nextDraft = resolveInitialDraft(mode, timeZone, value);
    setDraft(nextDraft);
    setVisibleMonth(toCalendarDate(nextDraft.dateKey));
    setIsOpen(true);
  }

  function isDateDisabled(dateKey: string) {
    if (minDateKey && compareDateKeys(dateKey, minDateKey) < 0) {
      return true;
    }

    if (maxDateKey && compareDateKeys(dateKey, maxDateKey) > 0) {
      return true;
    }

    return false;
  }

  function applySelection() {
    onApply(draft);
    setIsOpen(false);
  }

  const selectedDate = useMemo(() => toCalendarDate(draft.dateKey), [draft.dateKey]);
  const minDate = useMemo(
    () => (minDateKey ? toCalendarDate(minDateKey) : undefined),
    [minDateKey]
  );
  const maxDate = useMemo(
    () => (maxDateKey ? toCalendarDate(maxDateKey) : undefined),
    [maxDateKey]
  );

  function renderDateCalendar() {
    return (
      <Calendar
        mode="single"
        month={visibleMonth}
        onMonthChange={setVisibleMonth}
        startMonth={minDate}
        endMonth={maxDate}
        selected={selectedDate}
        onSelect={(nextDate) => {
          if (!nextDate) {
            return;
          }

          const nextDateKey = fromCalendarDate(nextDate);
          if (isDateDisabled(nextDateKey)) {
            return;
          }

          if (mode === "date") {
            onApply({
              dateKey: nextDateKey,
              hour: draft.hour,
              minute: draft.minute,
            });
            setIsOpen(false);
            return;
          }

          setDraft((current) => ({
            ...current,
            dateKey: nextDateKey,
          }));
        }}
        disabled={(date) => isDateDisabled(fromCalendarDate(date))}
      />
    );
  }

  if (mode === "date") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            className={`${inputBase} ${!value ? "text-stone-400" : ""} inline-flex items-center justify-between gap-3`}
            onClick={openPanel}
            disabled={disabled}
            data-testid={testId}
          >
            <span className="truncate">{selectedLabel}</span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-1">{renderDateCalendar()}</div>
        </PopoverContent>
      </Popover>
    );
  }

  if (mode === "time") {
    return (
      <div className="relative">
        <input
          id={id}
          type="time"
          lang="en-GB"
          step={effectiveStep * 60}
          value={value ? toTimeInputValue(value as PortTimeValue) : ""}
          onChange={(event) => {
            const nextValue = fromTimeInputValue(event.target.value);
            if (!nextValue) {
              return;
            }

            onApply({
              dateKey: draft.dateKey,
              hour: nextValue.hour,
              minute: nextValue.minute,
            });
          }}
          disabled={disabled}
          className={`${inputBase} appearance-none bg-white pr-10 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
          data-testid={testId}
        />
        <Clock3Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
      </div>
    );
  }

  const panel = isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/45 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[620px] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
      >
        <div
          className={`grid ${
            "lg:grid-cols-[minmax(0,1fr)_220px]"
          }`}
        >
          <div className="border-b border-stone-100 px-3 py-3 lg:border-b-0 lg:border-r">
            <div className="rounded-xl border border-stone-200 bg-stone-50/30 p-1">
              {renderDateCalendar()}
            </div>
          </div>

          <div className="px-3 py-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {t("time24")}
                </p>
                <p className="mt-1 text-[10px] text-stone-400">{timeZone}</p>
              </div>
              <button
                type="button"
                className="vh-v3-focus rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
                onClick={() => setIsOpen(false)}
                aria-label={t("close")}
              >
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t("hour")}
              </label>
              <input
                type="time"
                lang="en-GB"
                step={effectiveStep * 60}
                value={toTimeInputValue({ hour: draft.hour, minute: draft.minute })}
                onChange={(event) => {
                  const nextValue = fromTimeInputValue(event.target.value);
                  if (!nextValue) {
                    return;
                  }

                  setDraft((current) => ({
                    ...current,
                    hour: nextValue.hour,
                    minute: nextValue.minute,
                  }));
                }}
                className={`${inputBase} appearance-none bg-white [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none`}
              />
            </div>

            <p className="mt-2 text-[10px] leading-4 text-stone-400">
              {timeZone}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-3 py-2.5">
          <button
            type="button"
            className="vh-v3-focus rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-stone-50"
            onClick={() => setIsOpen(false)}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="vh-v3-focus rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            onClick={applySelection}
          >
            {t("apply")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`${inputBase} ${!value ? "text-stone-400" : ""} inline-flex items-center justify-between gap-3`}
        onClick={openPanel}
        disabled={disabled}
        data-testid={testId}
      >
        <span className="truncate">{selectedLabel}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
      </button>
      {panel && typeof document !== "undefined" ? createPortal(panel, document.body) : null}
    </div>
  );
}

export function DateField({
  value,
  onChange,
  minDateKey,
  maxDateKey,
  ...props
}: DateFieldProps) {
  return (
    <DateTimePickerField
      {...props}
      mode="date"
      value={value}
      minDateKey={minDateKey}
      maxDateKey={maxDateKey}
      onApply={(draft) => onChange(draft.dateKey)}
    />
  );
}

export function TimeField({ value, onChange, ...props }: TimeFieldProps) {
  return (
    <DateTimePickerField
      {...props}
      mode="time"
      value={value}
      onApply={(draft) => onChange({ hour: draft.hour, minute: draft.minute })}
    />
  );
}

export function DateTimeField({
  value,
  onChange,
  minDateKey,
  maxDateKey,
  ...props
}: DateTimeFieldProps) {
  return (
    <DateTimePickerField
      {...props}
      mode="datetime"
      value={value}
      minDateKey={minDateKey}
      maxDateKey={maxDateKey}
      onApply={(draft) =>
        onChange({
          dateKey: draft.dateKey,
          hour: draft.hour,
          minute: draft.minute,
        })
      }
    />
  );
}
