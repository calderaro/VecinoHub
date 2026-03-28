import { describe, expect, it } from "vitest";

import {
  getPortDateKey,
  getPortToday,
  toPortDateTimeValue,
  toStableUtcDateFromDateKey,
  toUtcFromPortDateTime,
} from "@/lib/port-time";
import { findTimezoneOption, isValidTimezone, listTimezoneOptions } from "@/lib/timezones/catalog";

describe("port-time utilities", () => {
  it("accepts catalog-backed IANA timezones", () => {
    expect(isValidTimezone("America/Mexico_City")).toBe(true);
    expect(findTimezoneOption("America/Mexico_City")).not.toBeNull();
    expect(listTimezoneOptions().length).toBeGreaterThan(100);
  });

  it("rejects invalid timezones", () => {
    expect(isValidTimezone("America/Not_A_Real_City")).toBe(false);
  });

  it("converts neighborhood-local datetime selections to UTC", () => {
    const value = toUtcFromPortDateTime({
      dateKey: "2026-03-31",
      hour: 10,
      minute: 0,
      timeZone: "America/Mexico_City",
    });

    expect(value.toISOString()).toBe("2026-03-31T16:00:00.000Z");
  });

  it("extracts the same local neighborhood selection back from UTC", () => {
    const selection = toPortDateTimeValue("2026-03-31T16:00:00.000Z", "America/Mexico_City");

    expect(selection).toEqual({
      dateKey: "2026-03-31",
      hour: 10,
      minute: 0,
    });
  });

  it("keeps date-only values stable when converted for transport", () => {
    const value = toStableUtcDateFromDateKey("2026-04-05");
    expect(value.toISOString()).toBe("2026-04-05T12:00:00.000Z");
  });

  it("computes today in the target timezone instead of local browser semantics", () => {
    const fixedInstant = new Date("2026-04-01T03:00:00.000Z");
    expect(getPortDateKey(fixedInstant, "America/Mexico_City")).toBe("2026-03-31");
    expect(getPortDateKey(fixedInstant, "Europe/Madrid")).toBe("2026-04-01");
  });

  it("returns a valid port-time today key", () => {
    expect(getPortToday("America/Mexico_City")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
