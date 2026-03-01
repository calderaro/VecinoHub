const avatarColorClasses = [
  "bg-teal-600",
  "bg-blue-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-emerald-600",
];

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

export function toPostSnippet(content: string, maxLength = 120) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function formatDashboardDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

export function formatDashboardDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatDashboardNumber(value: string | number, locale: string) {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function getEventBadgeDate(value: Date, locale: string) {
  const formatter = new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
  });
  const parts = formatter.formatToParts(value);

  return {
    month:
      parts.find((part) => part.type === "month")?.value.toUpperCase().slice(0, 3) ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

export function getDaysUntil(isoDate: string) {
  const now = new Date();
  const due = new Date(`${isoDate}T00:00:00`);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAvatarFallback(seed: string | null | undefined) {
  const value = (seed ?? "?").trim();
  const initial = value.charAt(0).toUpperCase() || "?";
  const hash = value
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);

  return {
    initial,
    colorClass: avatarColorClasses[hash % avatarColorClasses.length],
  };
}
