import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { clients, expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  _createExpense,
  _updateExpense,
  _deleteExpense,
} from "@/lib/expenses/actions";

describe("expense actions", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const base = {
    date: "2026-04-15",
    category: "software" as const,
    amount_cents: 9900,
  };

  it("_createExpense inserts row and returns it", async () => {
    const row = await _createExpense(db, base);
    expect(row.amountCents).toBe(9900);
    expect(row.vendor).toBeNull();
    expect(row.clientId).toBeNull();
  });

  it("rejects negative amounts via Zod", async () => {
    await expect(
      _createExpense(db, { ...base, amount_cents: -100 }),
    ).rejects.toThrow();
  });

  it("_updateExpense patches and bumps updatedAt", async () => {
    const row = await _createExpense(db, base);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateExpense(db, row.id, {
      vendor: "GitHub",
      amount_cents: 12000,
    });
    expect(updated!.vendor).toBe("GitHub");
    expect(updated!.amountCents).toBe(12000);
    expect(updated!.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("deleting a client nulls expenses.client_id", async () => {
    const clientId = crypto.randomUUID();
    await db.insert(clients).values({
      id: clientId,
      name: "C",
      company: null,
      email: "c@t.io",
      phone: null,
      industry: "other",
      status: "active",
      contractStartDate: "2026-01-01",
      mrrCents: null,
      fromLeadId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const row = await _createExpense(db, { ...base, client_id: clientId });
    await db.delete(clients).where(eq(clients.id, clientId));
    const [after] = await db.select().from(expenses).where(eq(expenses.id, row.id));
    expect(after.clientId).toBeNull();
  });

  it("_deleteExpense removes the row", async () => {
    const row = await _createExpense(db, base);
    expect(await _deleteExpense(db, row.id)).toBe(true);
    expect(await _deleteExpense(db, row.id)).toBe(false);
  });
});
