import "server-only";
import { db } from "@/db/client";
import { expenses, clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getExpenses() {
  return db
    .select({
      id: expenses.id,
      date: expenses.date,
      category: expenses.category,
      amountCents: expenses.amountCents,
      vendor: expenses.vendor,
      notes: expenses.notes,
      clientId: expenses.clientId,
      clientName: clients.name,
    })
    .from(expenses)
    .leftJoin(clients, eq(expenses.clientId, clients.id))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));
}
