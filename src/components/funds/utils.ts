export function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

export function formatCurrency(amount: number, locale: string, currencyCode = "MXN") {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function getFundStatusVariant(status: string) {
  switch (status) {
    case "active":
    case "open":
    case "confirmed":
    case "paid":
      return "open";
    case "partial":
      return "partial";
    case "overdue":
    case "rejected":
      return "overdue";
    case "waived":
      return "waived";
    case "archived":
      return "archived";
    case "cancelled":
      return "cancelled";
    case "submitted":
      return "submitted";
    case "closed":
      return "closed";
    default:
      return "inactive";
  }
}
