export const NOTES_TIMEZONE = "Europe/Nicosia";
export const NOTES_CUTOFF_HOUR = 7;

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

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
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
