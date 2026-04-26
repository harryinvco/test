/** Mirrors web's src/lib/notes/schema.ts#deriveTitle. */
export function deriveTitle(content: string): string {
  const line = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  const stripped = line.replace(/^#+\s*/, "").replace(/^[*_~`>\-]+\s*/, "").trim();
  return stripped.slice(0, 80);
}
