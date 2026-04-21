"use server";

import { db as realDb } from "@/db/client";
import { noteTabs, notes, type NoteTab, type Note } from "@/db/schema";
import { and, asc, eq, isNull, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { TestDb } from "@/db/__tests__/test-db";
import {
  TabCreate,
  TabRename,
  TabReorder,
  NoteCreate,
  NoteUpdate,
  NoteReorder,
  deriveTitle,
  type TabCreateInput,
  type TabRenameInput,
  type TabReorderInput,
  type NoteCreateInput,
  type NoteUpdateInput,
  type NoteReorderInput,
} from "./schema";
import { getLogicalDate } from "./date";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() {
  return Date.now();
}

async function nextTabPosition(db: AnyDb, date: string): Promise<number> {
  const [row] = await db
    .select({ max: max(noteTabs.position) })
    .from(noteTabs)
    .where(and(eq(noteTabs.date, date), isNull(noteTabs.deletedAt)));
  return (row?.max ?? -1) + 1;
}

async function nextNotePosition(db: AnyDb, tabId: string): Promise<number> {
  const [row] = await db
    .select({ max: max(notes.position) })
    .from(notes)
    .where(and(eq(notes.tabId, tabId), isNull(notes.deletedAt)));
  return (row?.max ?? -1) + 1;
}

export async function _createTab(db: AnyDb, raw: TabCreateInput): Promise<NoteTab> {
  const input = TabCreate.parse(raw);
  const date = input.date ?? getLogicalDate();
  const id = crypto.randomUUID();
  const ts = now();
  const position = await nextTabPosition(db, date);
  const row: NoteTab = {
    id,
    date,
    label: input.label,
    position,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.insert(noteTabs).values(row);
  return row;
}

export async function _renameTab(
  db: AnyDb,
  id: string,
  raw: TabRenameInput,
): Promise<NoteTab | null> {
  const input = TabRename.parse(raw);
  const [row] = await db
    .update(noteTabs)
    .set({ label: input.label, updatedAt: now() })
    .where(and(eq(noteTabs.id, id), isNull(noteTabs.deletedAt)))
    .returning();
  return row ?? null;
}

export async function _deleteTab(db: AnyDb, id: string): Promise<boolean> {
  const ts = now();
  const result = await db
    .update(noteTabs)
    .set({ deletedAt: ts, updatedAt: ts })
    .where(and(eq(noteTabs.id, id), isNull(noteTabs.deletedAt)))
    .returning({ id: noteTabs.id });
  if (result.length === 0) return false;
  // Cascade soft-delete to notes
  await db
    .update(notes)
    .set({ deletedAt: ts, updatedAt: ts })
    .where(and(eq(notes.tabId, id), isNull(notes.deletedAt)));
  return true;
}

export async function _reorderTabs(db: AnyDb, raw: TabReorderInput): Promise<void> {
  const input = TabReorder.parse(raw);
  const existing = await db
    .select({ id: noteTabs.id })
    .from(noteTabs)
    .where(and(eq(noteTabs.date, input.date), isNull(noteTabs.deletedAt)))
    .orderBy(asc(noteTabs.position));
  const existingIds = new Set(existing.map((r) => r.id));
  for (const id of input.orderedIds) {
    if (!existingIds.has(id)) throw new Error(`tab not in date: ${id}`);
  }
  const ts = now();
  for (let i = 0; i < input.orderedIds.length; i++) {
    await db
      .update(noteTabs)
      .set({ position: i, updatedAt: ts })
      .where(eq(noteTabs.id, input.orderedIds[i]));
  }
}

export async function _createNote(db: AnyDb, raw: NoteCreateInput): Promise<Note> {
  const input = NoteCreate.parse(raw);
  const [tab] = await db
    .select()
    .from(noteTabs)
    .where(and(eq(noteTabs.id, input.tabId), isNull(noteTabs.deletedAt)))
    .limit(1);
  if (!tab) throw new Error(`tab not found: ${input.tabId}`);

  const id = crypto.randomUUID();
  const ts = now();
  const position = await nextNotePosition(db, tab.id);
  const row: Note = {
    id,
    tabId: tab.id,
    date: tab.date,
    titlePreview: "",
    content: "",
    position,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
  };
  await db.insert(notes).values(row);
  return row;
}

export async function _updateNote(
  db: AnyDb,
  id: string,
  raw: NoteUpdateInput,
): Promise<Note | null> {
  const input = NoteUpdate.parse(raw);
  const [row] = await db
    .update(notes)
    .set({
      content: input.content,
      titlePreview: deriveTitle(input.content),
      updatedAt: now(),
    })
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .returning();
  return row ?? null;
}

export async function _deleteNote(db: AnyDb, id: string): Promise<boolean> {
  const ts = now();
  const result = await db
    .update(notes)
    .set({ deletedAt: ts, updatedAt: ts })
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .returning({ id: notes.id });
  return result.length > 0;
}

export async function _reorderNotes(db: AnyDb, raw: NoteReorderInput): Promise<void> {
  const input = NoteReorder.parse(raw);
  const existing = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.tabId, input.tabId), isNull(notes.deletedAt)));
  const existingIds = new Set(existing.map((r) => r.id));
  for (const id of input.orderedIds) {
    if (!existingIds.has(id)) throw new Error(`note not in tab: ${id}`);
  }
  const ts = now();
  for (let i = 0; i < input.orderedIds.length; i++) {
    await db
      .update(notes)
      .set({ position: i, updatedAt: ts })
      .where(and(eq(notes.id, input.orderedIds[i]), eq(notes.tabId, input.tabId)));
  }
}

// --- Public Server Actions ---------------------------------------------------

export async function createTab(raw: TabCreateInput) {
  await requireAuth();
  const row = await _createTab(realDb, raw);
  revalidatePath("/notes");
  return row;
}

export async function renameTab(id: string, raw: TabRenameInput) {
  await requireAuth();
  const row = await _renameTab(realDb, id, raw);
  revalidatePath("/notes");
  return row;
}

export async function deleteTab(id: string) {
  await requireAuth();
  const ok = await _deleteTab(realDb, id);
  revalidatePath("/notes");
  return ok;
}

export async function reorderTabs(raw: TabReorderInput) {
  await requireAuth();
  await _reorderTabs(realDb, raw);
  revalidatePath("/notes");
}

export async function createNote(raw: NoteCreateInput) {
  await requireAuth();
  const row = await _createNote(realDb, raw);
  revalidatePath("/notes");
  return row;
}

export async function updateNote(id: string, raw: NoteUpdateInput) {
  await requireAuth();
  const row = await _updateNote(realDb, id, raw);
  revalidatePath("/notes");
  return row;
}

export async function deleteNote(id: string) {
  await requireAuth();
  const ok = await _deleteNote(realDb, id);
  revalidatePath("/notes");
  return ok;
}

export async function reorderNotes(raw: NoteReorderInput) {
  await requireAuth();
  await _reorderNotes(realDb, raw);
  revalidatePath("/notes");
}
