"use server";

import { db as realDb } from "@/db/client";
import { activities, type Activity } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ActivityCreate, type ActivityCreateInput } from "./schema";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

export async function _addActivity(db: AnyDb, raw: ActivityCreateInput): Promise<Activity> {
  const input = ActivityCreate.parse(raw);
  const ts = Date.now();
  const row: Activity = {
    id: crypto.randomUUID(),
    leadId: input.lead_id,
    type: input.type,
    body: input.body,
    occurredAt: input.occurred_at_ms,
    createdAt: ts,
  };
  await db.insert(activities).values(row);
  return row;
}

export async function _deleteActivity(db: AnyDb, id: string): Promise<boolean> {
  const result = await db.delete(activities).where(eq(activities.id, id)).returning({ id: activities.id });
  return result.length > 0;
}

export async function addActivity(raw: ActivityCreateInput) {
  await requireAuth();
  const row = await _addActivity(realDb, raw);
  revalidatePath(`/leads/${raw.lead_id}`);
  return row;
}

export async function deleteActivity(id: string, leadId: string) {
  await requireAuth();
  const ok = await _deleteActivity(realDb, id);
  revalidatePath(`/leads/${leadId}`);
  return ok;
}
