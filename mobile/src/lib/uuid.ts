/**
 * UUID v4 — uses the platform crypto.randomUUID() when available (RN 0.76+ /
 * Hermes), falls back to a Math.random() implementation otherwise. Fine for the
 * collision resistance we need (single user, UUID PKs merged LWW by server).
 */
export function uuidv4(): string {
  const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
