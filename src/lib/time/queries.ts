import "server-only";
import { db as realDb } from "@/db/client";
import { timeEntries, clients } from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

export async function getTimeEntries() {
  return realDb
    .select({
      id: timeEntries.id,
      date: timeEntries.date,
      hours: timeEntries.hours,
      description: timeEntries.description,
      billable: timeEntries.billable,
      clientId: timeEntries.clientId,
      clientName: clients.name,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(timeEntries.clientId, clients.id))
    .orderBy(desc(timeEntries.date), desc(timeEntries.createdAt));
}

function startOfWeekIsoDate(ref: Date = new Date()): string {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // back up to Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export async function weeklyTotalHours(
  db: AnyDb,
  ref: Date = new Date(),
): Promise<number> {
  const monday = startOfWeekIsoDate(ref);
  const rows = await db
    .select({ h: timeEntries.hours })
    .from(timeEntries)
    .where(gte(timeEntries.date, monday));
  return rows.reduce((s, r) => s + (r.h ?? 0), 0);
}

export { startOfWeekIsoDate };
