"use server";

import { db as realDb } from "@/db/client";
import { expenses, type Expense } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  ExpenseCreate,
  ExpenseUpdate,
  type ExpenseCreateInput,
  type ExpenseUpdateInput,
} from "./schema";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() {
  return Date.now();
}

export async function _createExpense(
  db: AnyDb,
  raw: ExpenseCreateInput,
): Promise<Expense> {
  const input = ExpenseCreate.parse(raw);
  const ts = now();
  const row: Expense = {
    id: crypto.randomUUID(),
    date: input.date,
    category: input.category,
    amountCents: input.amount_cents,
    vendor: input.vendor ?? null,
    clientId: input.client_id ?? null,
    notes: input.notes ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(expenses).values(row);
  return row;
}

export async function _updateExpense(
  db: AnyDb,
  id: string,
  raw: ExpenseUpdateInput,
): Promise<Expense | null> {
  const input = ExpenseUpdate.parse(raw);
  const ts = now();
  const patch: Partial<Expense> = { updatedAt: ts };
  if (input.date !== undefined) patch.date = input.date;
  if (input.category !== undefined) patch.category = input.category;
  if (input.amount_cents !== undefined) patch.amountCents = input.amount_cents;
  if (input.vendor !== undefined) patch.vendor = input.vendor ?? null;
  if (input.client_id !== undefined) patch.clientId = input.client_id ?? null;
  if (input.notes !== undefined) patch.notes = input.notes ?? null;

  const [row] = await db
    .update(expenses)
    .set(patch)
    .where(eq(expenses.id, id))
    .returning();
  return row ?? null;
}

export async function _deleteExpense(db: AnyDb, id: string): Promise<boolean> {
  const result = await db
    .delete(expenses)
    .where(eq(expenses.id, id))
    .returning({ id: expenses.id });
  return result.length > 0;
}

// --- Public Server Actions ---------------------------------------------------

export async function createExpense(raw: ExpenseCreateInput) {
  await requireAuth();
  const row = await _createExpense(realDb, raw);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  revalidatePath("/admin/revenue");
  return row;
}

export async function updateExpense(id: string, raw: ExpenseUpdateInput) {
  await requireAuth();
  const row = await _updateExpense(realDb, id, raw);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/revenue");
  return row;
}

export async function deleteExpense(id: string) {
  await requireAuth();
  const ok = await _deleteExpense(realDb, id);
  revalidatePath("/admin/expenses");
  revalidatePath("/admin");
  revalidatePath("/admin/revenue");
  return ok;
}
