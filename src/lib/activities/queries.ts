import "server-only";
import { db } from "@/db/client";
import { activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getActivitiesByLead(leadId: string) {
  return db.select().from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.occurredAt));
}
