import { formatPortDateKey, minuteOfDayToTimeValue } from "@/lib/port-time";

export function minuteToTimeLabel(minuteOfDay: number) {
  const safeMinute = Math.max(0, Math.min(1439, minuteOfDay));
  const { hour, minute } = minuteOfDayToTimeValue(safeMinute);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
