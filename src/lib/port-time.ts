export type PortTimeValue = {
  hour: number;
  minute: number;
};

export type PortDateTimeValue = PortTimeValue & {
  dateKey: string;
};

type PortDateParts = PortDateTimeValue & {
  year: number;
  month: number;
  day: number;
};

type FormatOptions = Intl.DateTimeFormatOptions;

export function getDisplayLocale(locale: string) {
  if (locale === "en") {
    return "en-US";
  }

  if (locale === "es") {
    return "es-MX";
  }

  return locale;
}

export function parseDateKey(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function buildDateKey(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return buildDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function compareDateKeys(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function getDayOfWeekFromDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

function getFormatter(locale: string, timeZone: string, options: FormatOptions) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    timeZone,
    ...options,
  });
}

function resolveFormatOptions(defaultOptions: FormatOptions, options?: FormatOptions): FormatOptions {
  if (!options) {
    return defaultOptions;
  }

  // `dateStyle`/`timeStyle` cannot be combined with granular fields like `year` or `hour`.
  if (options.dateStyle !== undefined || options.timeStyle !== undefined) {
    return options;
  }

  return {
    ...defaultOptions,
    ...options,
  };
}

export function getPortParts(value: Date | string, timeZone: string): PortDateParts {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>;

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    dateKey: buildDateKey(values.year, values.month, values.day),
  };
}

export function getPortDateKey(value: Date | string, timeZone: string) {
  return getPortParts(value, timeZone).dateKey;
}

export function getPortMinuteOfDay(value: Date | string, timeZone: string) {
  const parts = getPortParts(value, timeZone);
  return parts.hour * 60 + parts.minute;
}

export function getPortToday(timeZone: string) {
  return getPortDateKey(new Date(), timeZone);
}

export function getPortNow(timeZone: string) {
  return getPortParts(new Date(), timeZone);
}

export function toUtcFromPortDateTime(value: PortDateTimeValue & { timeZone: string }) {
  const { dateKey, hour, minute, timeZone } = value;
  const { year, month, day } = parseDateKey(dateKey);
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getPortParts(new Date(timestamp), timeZone);
    const desired = Date.UTC(year, month - 1, day, hour, minute);
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute
    );
    const diffMinutes = Math.round((desired - actualUtc) / 60000);

    if (diffMinutes === 0) {
      break;
    }

    timestamp += diffMinutes * 60 * 1000;
  }

  return new Date(timestamp);
}

export function toStableUtcDateFromDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function toPortDateTimeValue(value: Date | string, timeZone: string): PortDateTimeValue {
  const parts = getPortParts(value, timeZone);
  return {
    dateKey: parts.dateKey,
    hour: parts.hour,
    minute: parts.minute,
  };
}

export function formatPortDateTime(
  value: Date | string,
  timeZone: string,
  locale: string,
  options?: FormatOptions
) {
  return getFormatter(
    locale,
    timeZone,
    resolveFormatOptions(
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
      options
    )
  ).format(value instanceof Date ? value : new Date(value));
}

export function formatPortDate(
  value: Date | string,
  timeZone: string,
  locale: string,
  options?: FormatOptions
) {
  return getFormatter(
    locale,
    timeZone,
    resolveFormatOptions(
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      },
      options
    )
  ).format(value instanceof Date ? value : new Date(value));
}

export function formatPortTime(
  value: Date | string,
  timeZone: string,
  locale: string,
  options?: FormatOptions
) {
  return getFormatter(
    locale,
    timeZone,
    resolveFormatOptions(
      {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      },
      options
    )
  ).format(value instanceof Date ? value : new Date(value));
}

export function formatPortDateKey(
  dateKey: string,
  timeZone: string,
  locale: string,
  options?: FormatOptions
) {
  return formatPortDate(
    toUtcFromPortDateTime({
      dateKey,
      hour: 12,
      minute: 0,
      timeZone,
    }),
    timeZone,
    locale,
    options
  );
}

export function formatPortDateTimeValue(
  value: PortDateTimeValue,
  timeZone: string,
  locale: string,
  options?: FormatOptions
) {
  return formatPortDateTime(toUtcFromPortDateTime({ ...value, timeZone }), timeZone, locale, options);
}

export function formatTimeValue(value: PortTimeValue, locale: string) {
  const displayLocale = getDisplayLocale(locale);
  return new Intl.DateTimeFormat(displayLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 1, value.hour, value.minute)));
}

export function minuteOfDayToTimeValue(minuteOfDay: number): PortTimeValue {
  const safeMinute = Math.max(0, Math.min(1439, minuteOfDay));
  return {
    hour: Math.floor(safeMinute / 60),
    minute: safeMinute % 60,
  };
}

export function timeValueToMinuteOfDay(value: PortTimeValue) {
  return value.hour * 60 + value.minute;
}
