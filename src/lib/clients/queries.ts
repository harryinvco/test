import "server-only";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getClients() {
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: string) {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}
