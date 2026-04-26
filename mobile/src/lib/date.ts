export const NOTES_TIMEZONE = "Europe/Nicosia";
export const NOTES_CUTOFF_HOUR = 7;

/**
 * Mirrors the web's src/lib/notes/date.ts#getLogicalDate — the notion of "today"
 * rolls over at 07:00 Europe/Nicosia, not at local midnight.
 */
export function getLogicalDate(
  now: Date = new Date(),
  tz: string = NOTES_TIMEZONE,
  cutoffHour: number = NOTES_CUTOFF_HOUR,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hourStr = get("hour");
  const h = hourStr === "24" ? 0 : parseInt(hourStr, 10);

  if (h >= cutoffHour) return `${y}-${m}-${d}`;

  const midnight = new Date(`${y}-${m}-${d}T00:00:00Z`);
  midnight.setUTCDate(midnight.getUTCDate() - 1);
  return midnight.toISOString().slice(0, 10);
}

export function formatLogicalDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
