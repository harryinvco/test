import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { clients, invoices, invoiceItems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  _createInvoice,
  _updateInvoice,
  _markInvoiceSent,
  _markInvoicePaid,
  _deleteInvoice,
} from "@/lib/invoices/actions";

async function insertClient(db: TestDb, name = "Acme") {
  const id = crypto.randomUUID();
  await db.insert(clients).values({
    id,
    name,
    company: null,
    email: `${id}@test.io`,
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

describe("invoice actions", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  const base = {
    issue_date: "2026-04-01",
    due_date: "2026-04-30",
    items: [
      { description: "Consulting", quantity: 10, unit_price_cents: 10000 },
      { description: "Retainer", quantity: 1, unit_price_cents: 50000 },
    ],
    tax_cents: 0,
  };

  it("_createInvoice inserts invoice + items with computed totals", async () => {
    const clientId = await insertClient(db);
    const { invoice, items } = await _createInvoice(db, { ...base, client_id: clientId });
    expect(invoice.status).toBe("draft");
    expect(invoice.subtotalCents).toBe(150000);
    expect(invoice.totalCents).toBe(150000);
    expect(items).toHaveLength(2);
    expect(items[0].position).toBe(0);
    expect(items[0].totalCents).toBe(100000);
  });

  it("auto-generates INV-YYYY-NNNN, incrementing per year", async () => {
    const a = await _createInvoice(db, base);
    const b = await _createInvoice(db, base);
    const c = await _createInvoice(db, { ...base, issue_date: "2027-01-01", due_date: "2027-01-31" });
    expect(a.invoice.number).toBe("INV-2026-0001");
    expect(b.invoice.number).toBe("INV-2026-0002");
    expect(c.invoice.number).toBe("INV-2027-0001");
  });

  it("_createInvoice respects user-supplied number", async () => {
    const { invoice } = await _createInvoice(db, { ...base, number: "CUSTOM-1" });
    expect(invoice.number).toBe("CUSTOM-1");
  });

  it("_updateInvoice replaces items + recomputes totals; only on draft", async () => {
    const { invoice } = await _createInvoice(db, base);
    const updated = await _updateInvoice(db, invoice.id, {
      items: [{ description: "New", quantity: 1, unit_price_cents: 20000 }],
      tax_cents: 5000,
    });
    expect(updated!.subtotalCents).toBe(20000);
    expect(updated!.taxCents).toBe(5000);
    expect(updated!.totalCents).toBe(25000);
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id)).orderBy(asc(invoiceItems.position));
    expect(items).toHaveLength(1);
    expect(items[0].description).toBe("New");
  });

  it("_updateInvoice rejects non-draft", async () => {
    const { invoice } = await _createInvoice(db, base);
    await _markInvoiceSent(db, invoice.id);
    await expect(
      _updateInvoice(db, invoice.id, { notes: "x" }),
    ).rejects.toThrow("INVOICE_NOT_EDITABLE");
  });

  it("markSent sets sent_at + status; only from draft", async () => {
    const { invoice } = await _createInvoice(db, base);
    const sent = await _markInvoiceSent(db, invoice.id);
    expect(sent!.status).toBe("sent");
    expect(sent!.sentAt).toBeGreaterThan(0);
    await expect(_markInvoiceSent(db, invoice.id)).rejects.toThrow("INVALID_TRANSITION");
  });

  it("markPaid sets paid_at + status; only from sent/overdue", async () => {
    const { invoice } = await _createInvoice(db, base);
    await expect(_markInvoicePaid(db, invoice.id)).rejects.toThrow("INVALID_TRANSITION");
    await _markInvoiceSent(db, invoice.id);
    const paid = await _markInvoicePaid(db, invoice.id);
    expect(paid!.status).toBe("paid");
    expect(paid!.paidAt).toBeGreaterThan(0);
  });

  it("deleting a client sets invoices.client_id to NULL (history preserved)", async () => {
    const clientId = await insertClient(db);
    const { invoice } = await _createInvoice(db, { ...base, client_id: clientId });
    await db.delete(clients).where(eq(clients.id, clientId));
    const [row] = await db.select().from(invoices).where(eq(invoices.id, invoice.id));
    expect(row.clientId).toBeNull();
  });

  it("_deleteInvoice removes the row (items cascade)", async () => {
    const { invoice } = await _createInvoice(db, base);
    const ok = await _deleteInvoice(db, invoice.id);
    expect(ok).toBe(true);
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    expect(items).toEqual([]);
  });
});
