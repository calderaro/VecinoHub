"use client";

import type { ComponentProps } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker";

import { cn } from "@/lib/utils";

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit p-2", className)}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("flex flex-col", defaultClassNames.months),
        month: cn("space-y-2", defaultClassNames.month),
        nav: cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between",
          defaultClassNames.nav
        ),
        button_previous: cn(
          "vh-v3-focus pointer-events-auto relative inline-flex size-8 touch-manipulation select-none items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          "vh-v3-focus pointer-events-auto relative inline-flex size-8 touch-manipulation select-none items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "relative flex h-8 items-center justify-center px-10",
          defaultClassNames.month_caption
        ),
        caption_label: cn("text-sm font-semibold text-stone-900 capitalize", defaultClassNames.caption_label),
        weekdays: cn("mt-2 flex", defaultClassNames.weekdays),
        weekday: cn(
          "w-8 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-400",
          defaultClassNames.weekday
        ),
        week: cn("mt-1 flex w-full", defaultClassNames.week),
        day: cn("size-8 p-0 text-center", defaultClassNames.day),
        today: cn("rounded-md bg-teal-50 text-teal-700", defaultClassNames.today),
        outside: cn("text-stone-300", defaultClassNames.outside),
        disabled: cn("text-stone-300 opacity-50", defaultClassNames.disabled),
        selected: cn("bg-teal-600 text-white", defaultClassNames.selected),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...componentProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon
              className={cn("pointer-events-none size-4", className)}
              {...componentProps}
            />
          ) : (
            <ChevronRightIcon
              className={cn("pointer-events-none size-4", className)}
              {...componentProps}
            />
          ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  modifiers,
  ...props
}: ComponentProps<typeof DayButton>) {
  return (
    <button
      className={cn(
        "vh-v3-focus flex size-8 items-center justify-center rounded-md text-sm font-medium text-stone-700 transition hover:bg-stone-100",
        "data-[selected=true]:bg-teal-600 data-[selected=true]:text-white data-[selected=true]:hover:bg-teal-600",
        modifiers.outside && "text-stone-300 hover:bg-transparent",
        modifiers.disabled && "cursor-not-allowed text-stone-300 hover:bg-transparent",
        className
      )}
      data-selected={modifiers.selected || undefined}
      {...props}
    />
  );
}
