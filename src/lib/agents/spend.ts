import "server-only";
import { db as realDb } from "@/db/client";
import { agentRuns } from "@/db/schema";
import { gte } from "drizzle-orm";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

export function startOfMonthUtc(ref: Date = new Date()): number {
  return Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1);
}

export async function monthlySpendUsd(db: AnyDb, ref: Date = new Date()): Promise<number> {
  const start = startOfMonthUtc(ref);
  const rows = await db.select({ c: agentRuns.costUsd })
    .from(agentRuns)
    .where(gte(agentRuns.createdAt, start));
  return rows.reduce((total, r) => total + (r.c ?? 0), 0);
}
