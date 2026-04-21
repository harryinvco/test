import "server-only";
import { db } from "@/db/client";
import { invoices, invoiceItems, clients } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";

export async function getInvoices() {
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      status: invoices.status,
      totalCents: invoices.totalCents,
      clientId: invoices.clientId,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt));
}

export async function getInvoiceById(id: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);
  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.position));

  const client = invoice.clientId
    ? (
        await db
          .select()
          .from(clients)
          .where(eq(clients.id, invoice.clientId))
          .limit(1)
      )[0] ?? null
    : null;

  return { invoice, items, client };
}
