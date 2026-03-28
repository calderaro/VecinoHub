import { formatPortDateKey, minuteOfDayToTimeValue } from "@/lib/port-time";

export function minuteToTimeLabel(minuteOfDay: number) {
  const safeMinute = Math.max(0, Math.min(1439, minuteOfDay));
  const { hour, minute } = minuteOfDayToTimeValue(safeMinute);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function timeLabelToMinute(value: string) {
  if (!value) {
    return 0;
  }

  const [hour, minute] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

export function minuteToTimeInput(minuteOfDay: number) {
  return minuteToTimeLabel(minuteOfDay);
}

export function formatDateKeyLabel(value: string, locale: string, timeZone: string) {
  return formatPortDateKey(value, timeZone, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getResourceStatusVariant(status: string) {
  switch (status) {
    case "active":
    case "approved":
    case "completed":
      return "success";
    case "cancelled":
    case "inactive":
      return "muted";
    case "expired":
      return "warning";
    default:
      return "muted";
  }
}
