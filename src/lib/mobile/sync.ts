import { db as realDb } from "@/db/client";
import { noteTabs, notes, type NoteTab, type Note } from "@/db/schema";
import { eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

const UUID = z.string().uuid();
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const UnixMs = z.number().int().nonnegative();

export const TabPayload = z.object({
  id: UUID,
  date: IsoDate,
  label: z.string().min(1).max(120),
  position: z.number().int().nonnegative(),
  createdAt: UnixMs,
  updatedAt: UnixMs,
  deletedAt: UnixMs.nullable(),
});

export const NotePayload = z.object({
  id: UUID,
  tabId: UUID,
  date: IsoDate,
  titlePreview: z.string().max(200),
  content: z.string().max(200_000),
  position: z.number().int().nonnegative(),
  createdAt: UnixMs,
  updatedAt: UnixMs,
  deletedAt: UnixMs.nullable(),
});

export const SyncRequest = z.object({
  cursor: UnixMs.nullable(),
  changes: z
    .object({
      tabs: z.array(TabPayload).default([]),
      notes: z.array(NotePayload).default([]),
    })
    .default({ tabs: [], notes: [] }),
});

export type SyncRequestInput = z.infer<typeof SyncRequest>;
export type TabPayloadT = z.infer<typeof TabPayload>;
export type NotePayloadT = z.infer<typeof NotePayload>;

export type SyncResponse = {
  serverCursor: number;
  tabs: NoteTab[];
  notes: Note[];
  applied: { tabs: number; notes: number };
  rejected: { tabs: number; notes: number };
};

function tabRowFromPayload(p: TabPayloadT): NoteTab {
  return {
    id: p.id,
    date: p.date,
    label: p.label,
    position: p.position,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt ?? null,
  };
}

function noteRowFromPayload(p: NotePayloadT): Note {
  return {
    id: p.id,
    tabId: p.tabId,
    date: p.date,
    titlePreview: p.titlePreview,
    content: p.content,
    position: p.position,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    deletedAt: p.deletedAt ?? null,
  };
}

/**
 * LWW upsert: incoming wins iff row doesn't exist OR incoming.updatedAt > existing.updatedAt.
 * Ties are broken by "keep existing" (client can retry if clocks are identical).
 */
async function lwwUpsertTab(db: AnyDb, incoming: NoteTab): Promise<boolean> {
  const [existing] = await db
    .select({ updatedAt: noteTabs.updatedAt })
    .from(noteTabs)
    .where(eq(noteTabs.id, incoming.id))
    .limit(1);

  if (!existing) {
    await db.insert(noteTabs).values(incoming);
    return true;
  }
  if (incoming.updatedAt > existing.updatedAt) {
    await db.update(noteTabs).set(incoming).where(eq(noteTabs.id, incoming.id));
    return true;
  }
  return false;
}

async function lwwUpsertNote(db: AnyDb, incoming: Note): Promise<boolean> {
  // Note must reference an existing tab (even if soft-deleted)
  const [parent] = await db
    .select({ id: noteTabs.id })
    .from(noteTabs)
    .where(eq(noteTabs.id, incoming.tabId))
    .limit(1);
  if (!parent) return false;

  const [existing] = await db
    .select({ updatedAt: notes.updatedAt })
    .from(notes)
    .where(eq(notes.id, incoming.id))
    .limit(1);

  if (!existing) {
    await db.insert(notes).values(incoming);
    return true;
  }
  if (incoming.updatedAt > existing.updatedAt) {
    await db.update(notes).set(incoming).where(eq(notes.id, incoming.id));
    return true;
  }
  return false;
}

export async function runSync(
  db: AnyDb,
  rawInput: unknown,
): Promise<SyncResponse> {
  const input = SyncRequest.parse(rawInput);

  // 1) Apply client changes with LWW. Tabs first so notes can reference them.
  let appliedTabs = 0;
  let rejectedTabs = 0;
  for (const p of input.changes.tabs) {
    const ok = await lwwUpsertTab(db, tabRowFromPayload(p));
    if (ok) appliedTabs++;
    else rejectedTabs++;
  }

  let appliedNotes = 0;
  let rejectedNotes = 0;
  for (const p of input.changes.notes) {
    const ok = await lwwUpsertNote(db, noteRowFromPayload(p));
    if (ok) appliedNotes++;
    else rejectedNotes++;
  }

  // 2) Pull all rows (including tombstones) with updatedAt > cursor.
  //    Client dedupes by id when merging LWW into local store, so equality at
  //    the boundary is handled upstream — using strict `>` is fine for single-user.
  const cursor = input.cursor ?? 0;
  const pulledTabs = await db
    .select()
    .from(noteTabs)
    .where(gt(noteTabs.updatedAt, cursor));
  const pulledNotes = await db
    .select()
    .from(notes)
    .where(gt(notes.updatedAt, cursor));

  // 3) New cursor = max updatedAt seen. If nothing pulled, keep the old cursor;
  //    advancing to `now` would risk skipping rows written concurrently.
  let maxTs = cursor;
  for (const t of pulledTabs) if (t.updatedAt > maxTs) maxTs = t.updatedAt;
  for (const n of pulledNotes) if (n.updatedAt > maxTs) maxTs = n.updatedAt;

  return {
    serverCursor: maxTs,
    tabs: pulledTabs,
    notes: pulledNotes,
    applied: { tabs: appliedTabs, notes: appliedNotes },
    rejected: { tabs: rejectedTabs, notes: rejectedNotes },
  };
}

// Exposed for the route handler — cleanly typed, uses real db.
export async function runSyncWithRealDb(rawInput: unknown) {
  return runSync(realDb, rawInput);
}

// Also exposed so tests can hit the primitive helpers
export const _internal = {
  lwwUpsertTab,
  lwwUpsertNote,
  tabRowFromPayload,
  noteRowFromPayload,
};
