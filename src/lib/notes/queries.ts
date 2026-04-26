import "server-only";
import { db } from "@/db/client";
import { noteTabs, notes } from "@/db/schema";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";

export async function getTabsForDate(date: string) {
  return db
    .select()
    .from(noteTabs)
    .where(and(eq(noteTabs.date, date), isNull(noteTabs.deletedAt)))
    .orderBy(asc(noteTabs.position), asc(noteTabs.createdAt));
}

export async function getNotesForTab(tabId: string) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.tabId, tabId), isNull(notes.deletedAt)))
    .orderBy(asc(notes.position), asc(notes.createdAt));
}

export async function getNotesForDate(date: string) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.date, date), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt));
}

export async function getTabById(id: string) {
  const rows = await db
    .select()
    .from(noteTabs)
    .where(and(eq(noteTabs.id, id), isNull(noteTabs.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getNoteById(id: string) {
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), isNull(notes.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export type DateWithCount = { date: string; noteCount: number; tabCount: number };

export async function getDatesWithNotes(
  limit: number = 60,
  before?: string,
): Promise<DateWithCount[]> {
  const conditions = [isNull(noteTabs.deletedAt)];
  if (before) conditions.push(lt(noteTabs.date, before));
  const rows = await db
    .select({
      date: noteTabs.date,
      tabCount: sql<number>`count(distinct ${noteTabs.id})`.as("tab_count"),
      noteCount: sql<number>`count(case when ${notes.deletedAt} is null then ${notes.id} end)`.as(
        "note_count",
      ),
    })
    .from(noteTabs)
    .leftJoin(notes, eq(notes.tabId, noteTabs.id))
    .where(and(...conditions))
    .groupBy(noteTabs.date)
    .orderBy(desc(noteTabs.date))
    .limit(limit);

  return rows.map((r) => ({
    date: r.date,
    tabCount: Number(r.tabCount ?? 0),
    noteCount: Number(r.noteCount ?? 0),
  }));
}
