import "server-only";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getLeads() {
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string) {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}
