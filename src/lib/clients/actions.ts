"use server";

import { db as realDb } from "@/db/client";
import { clients, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ClientCreate, ClientUpdate, type ClientCreateInput, type ClientUpdateInput } from "./schema";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() {
  return Date.now();
}

export async function _createClient(db: AnyDb, raw: ClientCreateInput): Promise<Client> {
  const input = ClientCreate.parse(raw);
  const id = crypto.randomUUID();
  const ts = now();
  const row: Client = {
    id,
    name: input.name,
    company: input.company ?? null,
    email: input.email,
    phone: input.phone ?? null,
    industry: input.industry,
    status: input.status,
    contractStartDate: input.contract_start_date,
    mrrCents: input.mrr_cents ?? null,
    fromLeadId: null,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(clients).values(row);
  return row;
}

export async function _updateClient(db: AnyDb, id: string, raw: ClientUpdateInput): Promise<Client | null> {
  const input = ClientUpdate.parse(raw);
  const ts = now();
  const patch: Partial<Client> = { updatedAt: ts };
  if (input.name !== undefined) patch.name = input.name;
  if (input.company !== undefined) patch.company = input.company ?? null;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.status !== undefined) patch.status = input.status;
  if (input.contract_start_date !== undefined) patch.contractStartDate = input.contract_start_date;
  if (input.mrr_cents !== undefined) patch.mrrCents = input.mrr_cents ?? null;

  const result = await db.update(clients).set(patch).where(eq(clients.id, id)).returning();
  return result[0] ?? null;
}

export async function _deleteClient(db: AnyDb, id: string): Promise<boolean> {
  const result = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  return result.length > 0;
}

// --- Public Server Actions ---------------------------------------------------

export async function createClient(raw: ClientCreateInput) {
  await requireAuth();
  const row = await _createClient(realDb, raw);
  revalidatePath("/clients");
  return row;
}

export async function updateClient(id: string, raw: ClientUpdateInput) {
  await requireAuth();
  const row = await _updateClient(realDb, id, raw);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return row;
}

export async function deleteClient(id: string) {
  await requireAuth();
  const ok = await _deleteClient(realDb, id);
  revalidatePath("/clients");
  if (ok) redirect("/clients");
  return ok;
}
