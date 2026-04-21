"use server";

import { db as realDb } from "@/db/client";
import {
  invoices,
  invoiceItems,
  type Invoice,
  type InvoiceItem,
} from "@/db/schema";
import { and, eq, like } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import {
  InvoiceCreate,
  InvoiceUpdate,
  type InvoiceCreateInput,
  type InvoiceUpdateInput,
} from "./schema";
import { computeInvoiceTotals } from "./totals";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() {
  return Date.now();
}

async function nextInvoiceNumber(db: AnyDb, year: string): Promise<string> {
  const existing = await db
    .select({ n: invoices.number })
    .from(invoices)
    .where(and(like(invoices.number, `INV-${year}-%`)));
  let max = 0;
  for (const { n } of existing) {
    const m = /^INV-\d{4}-(\d{4,})$/.exec(n);
    if (m) {
      const seq = Number(m[1]);
      if (seq > max) max = seq;
    }
  }
  return `INV-${year}-${String(max + 1).padStart(4, "0")}`;
}

export async function _createInvoice(
  db: AnyDb,
  raw: InvoiceCreateInput,
): Promise<{ invoice: Invoice; items: InvoiceItem[] }> {
  const input = InvoiceCreate.parse(raw);
  const ts = now();
  const id = crypto.randomUUID();
  const year = input.issue_date.slice(0, 4);
  const number = input.number ?? (await nextInvoiceNumber(db, year));

  const totals = computeInvoiceTotals(
    input.items.map((i) => ({
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
    })),
    input.tax_cents ?? 0,
  );

  const invoiceRow: Invoice = {
    id,
    clientId: input.client_id ?? null,
    number,
    issueDate: input.issue_date,
    dueDate: input.due_date,
    status: "draft",
    notes: input.notes ?? null,
    subtotalCents: totals.subtotalCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
    sentAt: null,
    paidAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(invoices).values(invoiceRow);

  const itemRows: InvoiceItem[] = input.items.map((it, position) => ({
    id: crypto.randomUUID(),
    invoiceId: id,
    description: it.description,
    quantity: it.quantity,
    unitPriceCents: it.unit_price_cents,
    totalCents: Math.round(it.quantity * it.unit_price_cents),
    position,
  }));
  if (itemRows.length) await db.insert(invoiceItems).values(itemRows);

  return { invoice: invoiceRow, items: itemRows };
}

export async function _updateInvoice(
  db: AnyDb,
  id: string,
  raw: InvoiceUpdateInput,
): Promise<Invoice | null> {
  const input = InvoiceUpdate.parse(raw);
  const [existing] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  if (!existing) return null;
  if (existing.status !== "draft") {
    throw new Error("INVOICE_NOT_EDITABLE");
  }
  const ts = now();
  const patch: Partial<Invoice> = { updatedAt: ts };
  if (input.client_id !== undefined) patch.clientId = input.client_id ?? null;
  if (input.number !== undefined) patch.number = input.number;
  if (input.issue_date !== undefined) patch.issueDate = input.issue_date;
  if (input.due_date !== undefined) patch.dueDate = input.due_date;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;

  if (input.items !== undefined) {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const itemRows: InvoiceItem[] = input.items.map((it, position) => ({
      id: crypto.randomUUID(),
      invoiceId: id,
      description: it.description,
      quantity: it.quantity,
      unitPriceCents: it.unit_price_cents,
      totalCents: Math.round(it.quantity * it.unit_price_cents),
      position,
    }));
    if (itemRows.length) await db.insert(invoiceItems).values(itemRows);
    const totals = computeInvoiceTotals(
      input.items.map((i) => ({
        quantity: i.quantity,
        unitPriceCents: i.unit_price_cents,
      })),
      input.tax_cents ?? existing.taxCents,
    );
    patch.subtotalCents = totals.subtotalCents;
    patch.taxCents = totals.taxCents;
    patch.totalCents = totals.totalCents;
  } else if (input.tax_cents !== undefined) {
    patch.taxCents = input.tax_cents;
    patch.totalCents = existing.subtotalCents + input.tax_cents;
  }

  const [row] = await db
    .update(invoices)
    .set(patch)
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

export async function _markInvoiceSent(
  db: AnyDb,
  id: string,
): Promise<Invoice | null> {
  const [existing] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  if (!existing) return null;
  if (existing.status !== "draft") throw new Error("INVALID_TRANSITION");
  const ts = now();
  const [row] = await db
    .update(invoices)
    .set({ status: "sent", sentAt: ts, updatedAt: ts })
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

export async function _markInvoicePaid(
  db: AnyDb,
  id: string,
): Promise<Invoice | null> {
  const [existing] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  if (!existing) return null;
  if (existing.status !== "sent" && existing.status !== "overdue") {
    throw new Error("INVALID_TRANSITION");
  }
  const ts = now();
  const [row] = await db
    .update(invoices)
    .set({ status: "paid", paidAt: ts, updatedAt: ts })
    .where(eq(invoices.id, id))
    .returning();
  return row ?? null;
}

export async function _deleteInvoice(db: AnyDb, id: string): Promise<boolean> {
  const result = await db
    .delete(invoices)
    .where(eq(invoices.id, id))
    .returning({ id: invoices.id });
  return result.length > 0;
}

// --- Public Server Actions ---------------------------------------------------

export async function createInvoice(raw: InvoiceCreateInput) {
  await requireAuth();
  const { invoice } = await _createInvoice(realDb, raw);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  redirect(`/admin/invoices/${invoice.id}`);
}

export async function updateInvoice(id: string, raw: InvoiceUpdateInput) {
  await requireAuth();
  const row = await _updateInvoice(realDb, id, raw);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  return row;
}

export async function markInvoiceSent(id: string) {
  await requireAuth();
  const row = await _markInvoiceSent(realDb, id);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/revenue");
  return row;
}

export async function markInvoicePaid(id: string) {
  await requireAuth();
  const row = await _markInvoicePaid(realDb, id);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/revenue");
  return row;
}

export async function deleteInvoice(id: string) {
  await requireAuth();
  const ok = await _deleteInvoice(realDb, id);
  revalidatePath("/admin/invoices");
  revalidatePath("/admin");
  if (ok) redirect("/admin/invoices");
  return ok;
}
