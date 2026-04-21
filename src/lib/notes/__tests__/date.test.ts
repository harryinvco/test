import { describe, it, expect } from "vitest";
import { getLogicalDate, isValidIsoDate } from "../date";

describe("getLogicalDate (Europe/Nicosia, 7am cutoff)", () => {
  it("returns today when local hour is exactly 07:00", () => {
    // 2026-04-21 07:00 Nicosia (EEST = UTC+3) == 04:00 UTC
    const now = new Date("2026-04-21T04:00:00Z");
    expect(getLogicalDate(now)).toBe("2026-04-21");
  });

  it("returns yesterday when local hour is 06:59", () => {
    // 2026-04-21 06:59 Nicosia (EEST = UTC+3) == 03:59 UTC
    const now = new Date("2026-04-21T03:59:00Z");
    expect(getLogicalDate(now)).toBe("2026-04-20");
  });

  it("returns today at noon local", () => {
    const now = new Date("2026-04-21T09:00:00Z"); // 12:00 Nicosia
    expect(getLogicalDate(now)).toBe("2026-04-21");
  });

  it("returns today at 23:59 local", () => {
    const now = new Date("2026-04-21T20:59:00Z"); // 23:59 Nicosia (EEST)
    expect(getLogicalDate(now)).toBe("2026-04-21");
  });

  it("returns today just after UTC midnight when local is still same day", () => {
    // 00:30 UTC in April is 03:30 Nicosia (EEST) — before cutoff, so yesterday
    const now = new Date("2026-04-21T00:30:00Z");
    expect(getLogicalDate(now)).toBe("2026-04-20");
  });

  it("winter EET (UTC+2): 05:00 UTC = 07:00 Nicosia -> today", () => {
    const now = new Date("2026-01-15T05:00:00Z");
    expect(getLogicalDate(now)).toBe("2026-01-15");
  });

  it("winter EET: 04:59 UTC = 06:59 Nicosia -> yesterday", () => {
    const now = new Date("2026-01-15T04:59:00Z");
    expect(getLogicalDate(now)).toBe("2026-01-14");
  });

  it("handles UTC date boundary cleanly (2025-12-31 23:00 UTC = 2026-01-01 01:00 Nicosia)", () => {
    const now = new Date("2025-12-31T23:00:00Z");
    // 01:00 Nicosia -> before cutoff, so logical date is 2025-12-31
    expect(getLogicalDate(now)).toBe("2025-12-31");
  });

  it("respects custom cutoff hour", () => {
    // 11:00 Nicosia, cutoff=12 -> yesterday
    const now = new Date("2026-04-21T08:00:00Z");
    expect(getLogicalDate(now, "Europe/Nicosia", 12)).toBe("2026-04-20");
    // 12:00 Nicosia, cutoff=12 -> today
    const later = new Date("2026-04-21T09:00:00Z");
    expect(getLogicalDate(later, "Europe/Nicosia", 12)).toBe("2026-04-21");
  });

  it("respects custom timezone (UTC)", () => {
    const now = new Date("2026-04-21T06:59:00Z");
    expect(getLogicalDate(now, "UTC")).toBe("2026-04-20");
    const later = new Date("2026-04-21T07:00:00Z");
    expect(getLogicalDate(later, "UTC")).toBe("2026-04-21");
  });
});

describe("isValidIsoDate", () => {
  it.each([
    ["2026-04-21", true],
    ["2025-12-31", true],
    ["2024-02-29", true], // leap year
    ["2025-02-29", false], // not leap
    ["2026-13-01", false],
    ["2026-04-32", false],
    ["26-04-21", false],
    ["2026/04/21", false],
    ["not a date", false],
    ["", false],
  ])("%s -> %s", (input, expected) => {
    expect(isValidIsoDate(input)).toBe(expected);
  });
});
