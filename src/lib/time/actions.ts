"use server";

import { db as realDb } from "@/db/client";
import { timeEntries, type TimeEntry } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  TimeEntryCreate,
  TimeEntryUpdate,
  type TimeEntryCreateInput,
  type TimeEntryUpdateInput,
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

export async function _createTimeEntry(
  db: AnyDb,
  raw: TimeEntryCreateInput,
): Promise<TimeEntry> {
  const input = TimeEntryCreate.parse(raw);
  const ts = now();
  const row: TimeEntry = {
    id: crypto.randomUUID(),
    date: input.date,
    hours: input.hours,
    clientId: input.client_id ?? null,
    description: input.description,
    billable: input.billable ? 1 : 0,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(timeEntries).values(row);
  return row;
}

export async function _updateTimeEntry(
  db: AnyDb,
  id: string,
  raw: TimeEntryUpdateInput,
): Promise<TimeEntry | null> {
  const input = TimeEntryUpdate.parse(raw);
  const ts = now();
  const patch: Partial<TimeEntry> = { updatedAt: ts };
  if (input.date !== undefined) patch.date = input.date;
  if (input.hours !== undefined) patch.hours = input.hours;
  if (input.client_id !== undefined) patch.clientId = input.client_id ?? null;
  if (input.description !== undefined) patch.description = input.description;
  if (input.billable !== undefined) patch.billable = input.billable ? 1 : 0;

  const [row] = await db
    .update(timeEntries)
    .set(patch)
    .where(eq(timeEntries.id, id))
    .returning();
  return row ?? null;
}

export async function _deleteTimeEntry(
  db: AnyDb,
  id: string,
): Promise<boolean> {
  const result = await db
    .delete(timeEntries)
    .where(eq(timeEntries.id, id))
    .returning({ id: timeEntries.id });
  return result.length > 0;
}

// --- Public Server Actions ---------------------------------------------------

export async function createTimeEntry(raw: TimeEntryCreateInput) {
  await requireAuth();
  const row = await _createTimeEntry(realDb, raw);
  revalidatePath("/admin/time");
  revalidatePath("/admin");
  return row;
}

export async function updateTimeEntry(id: string, raw: TimeEntryUpdateInput) {
  await requireAuth();
  const row = await _updateTimeEntry(realDb, id, raw);
  revalidatePath("/admin/time");
  return row;
}

export async function deleteTimeEntry(id: string) {
  await requireAuth();
  const ok = await _deleteTimeEntry(realDb, id);
  revalidatePath("/admin/time");
  revalidatePath("/admin");
  return ok;
}
