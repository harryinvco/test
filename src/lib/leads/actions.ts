"use server";

import { db as realDb } from "@/db/client";
import { leads, clients, type Lead, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LeadCreate, LeadUpdate, type LeadCreateInput, type LeadUpdateInput } from "./schema";
import { LEAD_STAGE, type LeadStage } from "@/lib/enums";
import type { TestDb } from "@/db/__tests__/test-db";
import { _createClient } from "@/lib/clients/actions";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() {
  return Date.now();
}

export async function _createLead(db: AnyDb, raw: LeadCreateInput): Promise<Lead> {
  const input = LeadCreate.parse(raw);
  const id = crypto.randomUUID();
  const ts = now();
  const row: Lead = {
    id,
    name: input.name,
    company: input.company ?? null,
    email: input.email,
    phone: input.phone ?? null,
    industry: input.industry,
    source: input.source,
    stage: input.stage,
    estimatedValueCents: input.estimated_value_cents ?? null,
    followUpDate: input.follow_up_date ?? null,
    convertedAt: null,
    convertedClientId: null,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.insert(leads).values(row);
  return row;
}

export async function _updateLead(db: AnyDb, id: string, raw: LeadUpdateInput): Promise<Lead | null> {
  const input = LeadUpdate.parse(raw);
  const ts = now();
  const patch: Partial<Lead> = { updatedAt: ts };
  if (input.name !== undefined) patch.name = input.name;
  if (input.company !== undefined) patch.company = input.company ?? null;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.source !== undefined) patch.source = input.source;
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.estimated_value_cents !== undefined) patch.estimatedValueCents = input.estimated_value_cents ?? null;
  if (input.follow_up_date !== undefined) patch.followUpDate = input.follow_up_date ?? null;

  const result = await db.update(leads).set(patch).where(eq(leads.id, id)).returning();
  return result[0] ?? null;
}

export async function _deleteLead(db: AnyDb, id: string): Promise<boolean> {
  const result = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
  return result.length > 0;
}

export async function _updateStage(db: AnyDb, id: string, stage: LeadStage): Promise<Lead | null> {
  if (!LEAD_STAGE.includes(stage as LeadStage)) throw new Error(`invalid stage: ${stage}`);
  const ts = now();
  const result = await db.update(leads)
    .set({ stage, updatedAt: ts })
    .where(eq(leads.id, id))
    .returning();
  return result[0] ?? null;
}

export type ConvertResult = { client: Client; created: boolean };

export async function _convertToClient(db: AnyDb, leadId: string): Promise<ConvertResult> {
  const leadRows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  const lead = leadRows[0];
  if (!lead) throw new Error(`lead not found: ${leadId}`);

  if (lead.convertedClientId) {
    const existing = await db.select().from(clients).where(eq(clients.id, lead.convertedClientId)).limit(1);
    if (existing[0]) return { client: existing[0], created: false };
  }

  const today = new Date().toISOString().slice(0, 10);
  const client = await _createClient(db, {
    name: lead.name,
    company: lead.company ?? undefined,
    email: lead.email,
    phone: lead.phone ?? undefined,
    industry: lead.industry as Parameters<typeof _createClient>[1]["industry"],
    status: "active",
    contract_start_date: today,
  });

  const ts = Date.now();
  const [linked] = await db.update(clients)
    .set({ fromLeadId: lead.id, updatedAt: ts })
    .where(eq(clients.id, client.id))
    .returning();

  await db.update(leads)
    .set({ convertedAt: ts, convertedClientId: client.id, updatedAt: ts })
    .where(eq(leads.id, lead.id));

  return { client: linked, created: true };
}

// --- Public Server Actions ---------------------------------------------------

export async function createLead(raw: LeadCreateInput) {
  await requireAuth();
  const row = await _createLead(realDb, raw);
  revalidatePath("/leads");
  return row;
}

export async function updateLead(id: string, raw: LeadUpdateInput) {
  await requireAuth();
  const row = await _updateLead(realDb, id, raw);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return row;
}

export async function deleteLead(id: string) {
  await requireAuth();
  const ok = await _deleteLead(realDb, id);
  revalidatePath("/leads");
  if (ok) redirect("/leads");
  return ok;
}

export async function updateStage(id: string, stage: LeadStage) {
  await requireAuth();
  const row = await _updateStage(realDb, id, stage);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return row;
}

export async function convertToClient(leadId: string) {
  await requireAuth();
  const result = await _convertToClient(realDb, leadId);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients");
  revalidatePath(`/clients/${result.client.id}`);
  redirect(`/clients/${result.client.id}`);
}
