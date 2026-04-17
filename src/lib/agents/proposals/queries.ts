import "server-only";
import { db } from "@/db/client";
import { proposals, agentRuns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getProposalById(id: string) {
  const rows = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getProposalsByLead(leadId: string) {
  return db.select().from(proposals).where(eq(proposals.leadId, leadId)).orderBy(desc(proposals.createdAt));
}

export async function getRunsByProposal(proposalId: string) {
  return db.select().from(agentRuns).where(eq(agentRuns.proposalId, proposalId)).orderBy(desc(agentRuns.createdAt));
}

export async function getRecentRuns(limit = 50) {
  return db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(limit);
}
