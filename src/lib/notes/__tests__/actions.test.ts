import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { noteTabs, notes } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import {
  _createTab,
  _renameTab,
  _deleteTab,
  _reorderTabs,
  _createNote,
  _updateNote,
  _deleteNote,
  _reorderNotes,
} from "../actions";
import { deriveTitle } from "../schema";

const DAY = "2026-04-21";

describe("tab actions", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("_createTab inserts with position 0, then 1, then 2", async () => {
    const a = await _createTab(db, { label: "Tasks", date: DAY });
    const b = await _createTab(db, { label: "Ideas", date: DAY });
    const c = await _createTab(db, { label: "Journal", date: DAY });
    expect(a.position).toBe(0);
    expect(b.position).toBe(1);
    expect(c.position).toBe(2);
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.date).toBe(DAY);
  });

  it("_createTab isolates position per-date", async () => {
    const a = await _createTab(db, { label: "Tasks", date: "2026-04-20" });
    const b = await _createTab(db, { label: "Tasks", date: "2026-04-21" });
    expect(a.position).toBe(0);
    expect(b.position).toBe(0);
  });

  it("_createTab defaults date to today's logical date when omitted", async () => {
    const a = await _createTab(db, { label: "Tasks" });
    expect(a.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("_renameTab bumps updatedAt", async () => {
    const a = await _createTab(db, { label: "Tasks", date: DAY });
    await new Promise((r) => setTimeout(r, 5));
    const renamed = await _renameTab(db, a.id, { label: "Work" });
    expect(renamed?.label).toBe("Work");
    expect(renamed!.updatedAt).toBeGreaterThan(a.updatedAt);
  });

  it("_renameTab returns null for unknown id", async () => {
    expect(await _renameTab(db, "missing", { label: "x" })).toBeNull();
  });

  it("_deleteTab soft-deletes the tab and cascades soft-delete to its notes", async () => {
    const tab = await _createTab(db, { label: "Tasks", date: DAY });
    await _createNote(db, { tabId: tab.id });
    await _createNote(db, { tabId: tab.id });
    const ok = await _deleteTab(db, tab.id);
    expect(ok).toBe(true);
    const liveTabs = await db
      .select()
      .from(noteTabs)
      .where(and(eq(noteTabs.id, tab.id), isNull(noteTabs.deletedAt)));
    expect(liveTabs).toEqual([]);
    const liveNotes = await db
      .select()
      .from(notes)
      .where(and(eq(notes.tabId, tab.id), isNull(notes.deletedAt)));
    expect(liveNotes).toEqual([]);
    const allNotes = await db.select().from(notes).where(eq(notes.tabId, tab.id));
    expect(allNotes).toHaveLength(2);
    expect(allNotes.every((n) => n.deletedAt !== null)).toBe(true);
  });

  it("_deleteTab returns false for already-deleted tab (idempotent)", async () => {
    const tab = await _createTab(db, { label: "Tasks", date: DAY });
    await _deleteTab(db, tab.id);
    expect(await _deleteTab(db, tab.id)).toBe(false);
  });

  it("_reorderTabs sets positions atomically", async () => {
    const a = await _createTab(db, { label: "A", date: DAY });
    const b = await _createTab(db, { label: "B", date: DAY });
    const c = await _createTab(db, { label: "C", date: DAY });
    await _reorderTabs(db, { date: DAY, orderedIds: [c.id, a.id, b.id] });
    const rows = await db
      .select()
      .from(noteTabs)
      .where(eq(noteTabs.date, DAY))
      .orderBy(asc(noteTabs.position));
    expect(rows.map((r) => r.id)).toEqual([c.id, a.id, b.id]);
    expect(rows.map((r) => r.position)).toEqual([0, 1, 2]);
  });

  it("_reorderTabs rejects foreign ids", async () => {
    const a = await _createTab(db, { label: "A", date: DAY });
    const other = await _createTab(db, { label: "Other", date: "2026-04-20" });
    await expect(
      _reorderTabs(db, { date: DAY, orderedIds: [a.id, other.id] }),
    ).rejects.toThrow();
  });
});

describe("note actions", () => {
  let db: TestDb;
  let tabId: string;

  beforeEach(async () => {
    db = await makeTestDb();
    const tab = await _createTab(db, { label: "Tasks", date: DAY });
    tabId = tab.id;
  });

  it("_createNote inserts empty note at end, inherits tab date", async () => {
    const n1 = await _createNote(db, { tabId });
    const n2 = await _createNote(db, { tabId });
    expect(n1.position).toBe(0);
    expect(n2.position).toBe(1);
    expect(n1.date).toBe(DAY);
    expect(n1.content).toBe("");
    expect(n1.titlePreview).toBe("");
  });

  it("_createNote throws for missing tab", async () => {
    await expect(_createNote(db, { tabId: crypto.randomUUID() })).rejects.toThrow();
  });

  it("_updateNote recomputes titlePreview from content", async () => {
    const n = await _createNote(db, { tabId });
    const updated = await _updateNote(db, n.id, {
      content: "# Call w/ Maria\n\nShe asked about SSO.",
    });
    expect(updated?.content).toBe("# Call w/ Maria\n\nShe asked about SSO.");
    expect(updated?.titlePreview).toBe("Call w/ Maria");
  });

  it("_updateNote handles empty content", async () => {
    const n = await _createNote(db, { tabId });
    await _updateNote(db, n.id, { content: "some text" });
    const cleared = await _updateNote(db, n.id, { content: "" });
    expect(cleared?.titlePreview).toBe("");
  });

  it("_updateNote bumps updatedAt", async () => {
    const n = await _createNote(db, { tabId });
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateNote(db, n.id, { content: "hi" });
    expect(updated!.updatedAt).toBeGreaterThan(n.updatedAt);
  });

  it("_deleteNote soft-deletes a single note", async () => {
    const n1 = await _createNote(db, { tabId });
    const n2 = await _createNote(db, { tabId });
    await _deleteNote(db, n1.id);
    const live = await db
      .select()
      .from(notes)
      .where(and(eq(notes.tabId, tabId), isNull(notes.deletedAt)));
    expect(live).toHaveLength(1);
    expect(live[0].id).toBe(n2.id);
    const all = await db.select().from(notes).where(eq(notes.tabId, tabId));
    expect(all).toHaveLength(2);
  });

  it("_reorderNotes sets positions", async () => {
    const a = await _createNote(db, { tabId });
    const b = await _createNote(db, { tabId });
    const c = await _createNote(db, { tabId });
    await _reorderNotes(db, { tabId, orderedIds: [b.id, c.id, a.id] });
    const rows = await db
      .select()
      .from(notes)
      .where(eq(notes.tabId, tabId))
      .orderBy(asc(notes.position));
    expect(rows.map((r) => r.id)).toEqual([b.id, c.id, a.id]);
  });
});

describe("deriveTitle", () => {
  it("strips heading markers", () => {
    expect(deriveTitle("# Hello world")).toBe("Hello world");
    expect(deriveTitle("### Deep")).toBe("Deep");
  });
  it("skips leading blank lines", () => {
    expect(deriveTitle("\n\n  First meaningful\nBody")).toBe("First meaningful");
  });
  it("strips list markers", () => {
    expect(deriveTitle("- Todo one\n- Todo two")).toBe("Todo one");
    expect(deriveTitle("* star")).toBe("star");
  });
  it("truncates at 80 chars", () => {
    const long = "a".repeat(200);
    expect(deriveTitle(long)).toHaveLength(80);
  });
  it("returns empty for empty/whitespace content", () => {
    expect(deriveTitle("")).toBe("");
    expect(deriveTitle("   \n\n  ")).toBe("");
  });
});
