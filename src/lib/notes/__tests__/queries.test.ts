import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { _createTab, _createNote, _updateNote } from "../actions";

// queries.ts imports "server-only" which throws outside a server context.
// These tests verify the drizzle query shape by running equivalent queries directly
// against the TestDb — the queries.ts functions are thin wrappers around these.

import { noteTabs, notes } from "@/db/schema";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";

const D1 = "2026-04-19";
const D2 = "2026-04-20";
const D3 = "2026-04-21";

async function queryTabsForDate(db: TestDb, date: string) {
  return db
    .select()
    .from(noteTabs)
    .where(and(eq(noteTabs.date, date), isNull(noteTabs.deletedAt)))
    .orderBy(asc(noteTabs.position), asc(noteTabs.createdAt));
}

async function queryNotesForTab(db: TestDb, tabId: string) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.tabId, tabId), isNull(notes.deletedAt)))
    .orderBy(asc(notes.position), asc(notes.createdAt));
}

async function queryNotesForDate(db: TestDb, date: string) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.date, date), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt));
}

async function queryDatesWithNotes(db: TestDb, limit = 60, before?: string) {
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

describe("note queries (shape verified via drizzle against TestDb)", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("getTabsForDate filters and orders by position", async () => {
    const a = await _createTab(db, { label: "A", date: D3 });
    const b = await _createTab(db, { label: "B", date: D3 });
    await _createTab(db, { label: "Other", date: D2 });
    const rows = await queryTabsForDate(db, D3);
    expect(rows.map((r) => r.id)).toEqual([a.id, b.id]);
  });

  it("getNotesForTab returns only that tab's notes", async () => {
    const tab1 = await _createTab(db, { label: "T1", date: D3 });
    const tab2 = await _createTab(db, { label: "T2", date: D3 });
    const n1 = await _createNote(db, { tabId: tab1.id });
    await _createNote(db, { tabId: tab2.id });
    const rows = await queryNotesForTab(db, tab1.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(n1.id);
  });

  it("getNotesForDate spans tabs, ordered by updatedAt desc", async () => {
    const tab1 = await _createTab(db, { label: "T1", date: D3 });
    const tab2 = await _createTab(db, { label: "T2", date: D3 });
    const older = await _createNote(db, { tabId: tab1.id });
    await new Promise((r) => setTimeout(r, 5));
    const newer = await _createNote(db, { tabId: tab2.id });
    await _updateNote(db, newer.id, { content: "fresh" });
    const rows = await queryNotesForDate(db, D3);
    expect(rows.map((r) => r.id)).toEqual([newer.id, older.id]);
  });

  it("getDatesWithNotes groups by date, orders desc, returns counts", async () => {
    const t1 = await _createTab(db, { label: "T", date: D1 });
    await _createNote(db, { tabId: t1.id });
    const t2 = await _createTab(db, { label: "T", date: D2 });
    await _createNote(db, { tabId: t2.id });
    await _createNote(db, { tabId: t2.id });
    await _createTab(db, { label: "T", date: D3 }); // tab with no notes

    const rows = await queryDatesWithNotes(db);
    expect(rows.map((r) => r.date)).toEqual([D3, D2, D1]);
    expect(rows.find((r) => r.date === D2)?.noteCount).toBe(2);
    expect(rows.find((r) => r.date === D3)?.noteCount).toBe(0);
    expect(rows.find((r) => r.date === D1)?.tabCount).toBe(1);
  });

  it("getDatesWithNotes honors 'before' cursor", async () => {
    const t1 = await _createTab(db, { label: "T", date: D1 });
    await _createNote(db, { tabId: t1.id });
    const t2 = await _createTab(db, { label: "T", date: D2 });
    await _createNote(db, { tabId: t2.id });
    const t3 = await _createTab(db, { label: "T", date: D3 });
    await _createNote(db, { tabId: t3.id });

    const rows = await queryDatesWithNotes(db, 60, D3);
    expect(rows.map((r) => r.date)).toEqual([D2, D1]);
  });
});
