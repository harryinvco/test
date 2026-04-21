import "server-only";
import { db as realDb } from "@/db/client";
import { invoices, expenses, clients } from "@/db/schema";
import { and, count, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

export function startOfYearIsoDate(ref: Date = new Date()): string {
  return `${ref.getUTCFullYear()}-01-01`;
}

export function startOfYearUtcMs(ref: Date = new Date()): number {
  return Date.UTC(ref.getUTCFullYear(), 0, 1);
}

export type RevenueKpis = {
  revenueYtdCents: number;
  outstandingCount: number;
  outstandingCents: number;
  expensesYtdCents: number;
  netYtdCents: number;
};

export async function getRevenueKpis(
  db: AnyDb,
  ref: Date = new Date(),
): Promise<RevenueKpis> {
  const yearStartMs = startOfYearUtcMs(ref);
  const yearStartIso = startOfYearIsoDate(ref);

  const [paidRow, outstandingRow, expensesRow] = await Promise.all([
    db
      .select({ s: sum(invoices.totalCents) })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, yearStartMs))),
    db
      .select({ n: count(), s: sum(invoices.totalCents) })
      .from(invoices)
      .where(inArray(invoices.status, ["sent", "overdue"])),
    db
      .select({ s: sum(expenses.amountCents) })
      .from(expenses)
      .where(gte(expenses.date, yearStartIso)),
  ]);

  const revenueYtdCents = Number(paidRow[0]?.s ?? 0);
  const outstandingCents = Number(outstandingRow[0]?.s ?? 0);
  const expensesYtdCents = Number(expensesRow[0]?.s ?? 0);

  return {
    revenueYtdCents,
    outstandingCount: outstandingRow[0]?.n ?? 0,
    outstandingCents,
    expensesYtdCents,
    netYtdCents: revenueYtdCents - expensesYtdCents,
  };
}

export async function getRevenueByClient(db: AnyDb, limit = 10) {
  const rows = await db
    .select({
      clientId: invoices.clientId,
      clientName: clients.name,
      totalCents: sql<number>`COALESCE(SUM(${invoices.totalCents}), 0)`,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.status, "paid"))
    .groupBy(invoices.clientId, clients.name)
    .orderBy(desc(sql`SUM(${invoices.totalCents})`))
    .limit(limit);
  return rows.map((r) => ({
    clientId: r.clientId,
    clientName: r.clientName,
    totalCents: Number(r.totalCents ?? 0),
  }));
}
