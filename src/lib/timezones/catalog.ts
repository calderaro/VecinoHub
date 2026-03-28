import timezoneRecords from "timezones.json";

type TimezoneRecord = {
  abbr: string;
  isdst: boolean;
  offset: number;
  text: string;
  utc: string[];
  value: string;
};

export type TimezoneOption = {
  value: string;
  label: string;
  offsetLabel: string;
  searchText: string;
};

function extractOffsetLabel(text: string) {
  const match = text.match(/^\((UTC[^)]+)\)/);
  return match?.[1] ?? "UTC";
}

function buildLocationLabel(record: TimezoneRecord, timeZone: string) {
  const cleanedText = record.text.replace(/^\(UTC[^)]+\)\s*/, "").trim();
  const locationLabel =
    cleanedText.length > 0 && cleanedText !== timeZone ? cleanedText : record.value;

  return `${locationLabel} · ${timeZone}`;
}

function isValidIanaTimeZone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function buildTimezoneOptions() {
  const map = new Map<string, TimezoneOption>();

  for (const record of timezoneRecords as TimezoneRecord[]) {
    const offsetLabel = extractOffsetLabel(record.text);

    for (const utcValue of record.utc) {
      if (!isValidIanaTimeZone(utcValue) || map.has(utcValue)) {
        continue;
      }

      const label = buildLocationLabel(record, utcValue);
      const searchText = [
        utcValue,
        record.value,
        record.abbr,
        record.text,
        label,
        offsetLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      map.set(utcValue, {
        value: utcValue,
        label,
        offsetLabel,
        searchText,
      });
    }
  }

  return Array.from(map.values()).sort((left, right) =>
    left.label.localeCompare(right.label, "en", { sensitivity: "base" })
  );
}

const timezoneOptions = buildTimezoneOptions();
const timezoneMap = new Map(timezoneOptions.map((option) => [option.value, option] as const));

export function listTimezoneOptions() {
  return timezoneOptions;
}

export function findTimezoneOption(value: string) {
  return timezoneMap.get(value) ?? null;
}

export function isValidTimezone(value: string) {
  return timezoneMap.has(value);
}

export function getTimezoneLabel(value: string) {
  return findTimezoneOption(value)?.label ?? value;
}
