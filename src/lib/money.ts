const EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return EUR.format(cents / 100);
}

export function eurosToCents(euros: string): number | null {
  const trimmed = euros.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export function centsToEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}
