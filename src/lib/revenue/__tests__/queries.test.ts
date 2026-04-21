import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { clients, expenses, invoices, invoiceItems } from "@/db/schema";
import { getRevenueKpis, getRevenueByClient } from "@/lib/revenue/queries";

async function insertClient(db: TestDb, name: string) {
  const id = crypto.randomUUID();
  await db.insert(clients).values({
    id,
    name,
    company: null,
    email: `${id}@t.io`,
    phone: null,
    industry: "other",
    status: "active",
    contractStartDate: "2026-01-01",
    mrrCents: null,
    fromLeadId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return id;
}

async function insertInvoice(
  db: TestDb,
  {
    status,
    clientId = null,
    totalCents,
    paidAt = null,
    issueDate = "2026-04-01",
  }: {
    status: "draft" | "sent" | "paid" | "overdue";
    clientId?: string | null;
    totalCents: number;
    paidAt?: number | null;
    issueDate?: string;
  },
) {
  const id = crypto.randomUUID();
  await db.insert(invoices).values({
    id,
    clientId,
    number: `INV-${id.slice(0, 4)}`,
    issueDate,
    dueDate: issueDate,
    status,
    notes: null,
    subtotalCents: totalCents,
    taxCents: 0,
    totalCents,
    sentAt: status !== "draft" ? Date.now() : null,
    paidAt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  await db.insert(invoiceItems).values({
    id: crypto.randomUUID(),
    invoiceId: id,
    description: "x",
    quantity: 1,
    unitPriceCents: totalCents,
    totalCents,
    position: 0,
  });
  return id;
}

async function insertExpense(db: TestDb, amountCents: number, date = "2026-03-15") {
  await db.insert(expenses).values({
    id: crypto.randomUUID(),
    date,
    category: "software",
    amountCents,
    vendor: null,
    clientId: null,
    notes: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

describe("getRevenueKpis", () => {
  let db: TestDb;
  const NOW = new Date("2026-04-15T10:00:00Z");
  const YEAR_START_MS = Date.UTC(2026, 0, 1);

  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("empty db → all zeros", async () => {
    expect(await getRevenueKpis(db, NOW)).toEqual({
      revenueYtdCents: 0,
      outstandingCount: 0,
      outstandingCents: 0,
      expensesYtdCents: 0,
      netYtdCents: 0,
    });
  });

  it("sums paid invoices for current UTC year only", async () => {
    await insertInvoice(db, { status: "paid", totalCents: 50000, paidAt: YEAR_START_MS + 1 });
    await insertInvoice(db, { status: "paid", totalCents: 75000, paidAt: YEAR_START_MS + 1000 });
    await insertInvoice(db, { status: "paid", totalCents: 999, paidAt: YEAR_START_MS - 1 }); // prior year
    const k = await getRevenueKpis(db, NOW);
    expect(k.revenueYtdCents).toBe(125000);
  });

  it("counts sent and overdue as outstanding; draft and paid excluded", async () => {
    await insertInvoice(db, { status: "sent", totalCents: 10000 });
    await insertInvoice(db, { status: "overdue", totalCents: 25000 });
    await insertInvoice(db, { status: "paid", totalCents: 50000, paidAt: YEAR_START_MS + 1 });
    await insertInvoice(db, { status: "draft", totalCents: 9999 });
    const k = await getRevenueKpis(db, NOW);
    expect(k.outstandingCount).toBe(2);
    expect(k.outstandingCents).toBe(35000);
  });

  it("sums expenses from the start of the current year; net = revenue − expenses", async () => {
    await insertInvoice(db, { status: "paid", totalCents: 100000, paidAt: YEAR_START_MS + 1000 });
    await insertExpense(db, 30000, "2026-02-01");
    await insertExpense(db, 5000, "2026-03-20");
    await insertExpense(db, 99999, "2025-12-31"); // prior year
    const k = await getRevenueKpis(db, NOW);
    expect(k.expensesYtdCents).toBe(35000);
    expect(k.netYtdCents).toBe(65000);
  });
});

describe("getRevenueByClient", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("groups paid totals per client descending", async () => {
    const a = await insertClient(db, "Acme");
    const b = await insertClient(db, "Beta");
    await insertInvoice(db, { status: "paid", clientId: a, totalCents: 10000, paidAt: Date.now() });
    await insertInvoice(db, { status: "paid", clientId: a, totalCents: 5000, paidAt: Date.now() });
    await insertInvoice(db, { status: "paid", clientId: b, totalCents: 20000, paidAt: Date.now() });
    await insertInvoice(db, { status: "sent", clientId: a, totalCents: 999 }); // excluded

    const rows = await getRevenueByClient(db);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ clientName: "Beta", totalCents: 20000 });
    expect(rows[1]).toMatchObject({ clientName: "Acme", totalCents: 15000 });
  });
});
