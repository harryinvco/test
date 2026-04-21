"use server";

import { db as realDb } from "@/db/client";
import { proposals, type Proposal } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { PROPOSAL_STATUS, type ProposalStatus } from "@/lib/enums";
import { isValidProposalTransition } from "./status";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

export async function _updateProposalStatus(
  db: AnyDb,
  id: string,
  nextStatus: ProposalStatus,
): Promise<Proposal | null> {
  if (!PROPOSAL_STATUS.includes(nextStatus)) {
    throw new Error("INVALID_STATUS");
  }
  const [existing] = await db
    .select()
    .from(proposals)
    .where(eq(proposals.id, id))
    .limit(1);
  if (!existing) return null;

  const current = existing.status as ProposalStatus;
  if (!isValidProposalTransition(current, nextStatus)) {
    throw new Error("INVALID_TRANSITION");
  }

  const ts = Date.now();
  const patch: Partial<Proposal> = {
    status: nextStatus,
    updatedAt: ts,
  };
  if (nextStatus === "sent") patch.sentAt = ts;
  if (nextStatus === "accepted" || nextStatus === "rejected") {
    patch.respondedAt = ts;
  }

  const [row] = await db
    .update(proposals)
    .set(patch)
    .where(eq(proposals.id, id))
    .returning();
  return row ?? null;
}

export async function updateProposalStatus(
  id: string,
  nextStatus: ProposalStatus,
) {
  await requireAuth();
  const row = await _updateProposalStatus(realDb, id, nextStatus);
  if (row) {
    revalidatePath(`/leads/${row.leadId}`);
    revalidatePath(`/leads/${row.leadId}/proposals/${id}`);
  }
  return row;
}
