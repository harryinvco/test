import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { noteTabs, notes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runSync, type SyncRequestInput } from "../sync";
import { _createTab, _createNote, _updateNote, _deleteTab } from "@/lib/notes/actions";

const DAY = "2026-04-21";

async function syncEmpty(db: TestDb, cursor: number | null = null) {
  return runSync(db, { cursor, changes: { tabs: [], notes: [] } } satisfies SyncRequestInput);
}

describe("runSync — pull", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("first sync (cursor=null) returns all rows and serverCursor = max updatedAt", async () => {
    const tab = await _createTab(db, { label: "T", date: DAY });
    await _createNote(db, { tabId: tab.id });

    const r = await syncEmpty(db);
    expect(r.tabs).toHaveLength(1);
    expect(r.notes).toHaveLength(1);
    expect(r.serverCursor).toBeGreaterThan(0);
    expect(r.applied).toEqual({ tabs: 0, notes: 0 });
  });

  it("second sync with cursor at max pulls nothing new", async () => {
    const tab = await _createTab(db, { label: "T", date: DAY });
    await _createNote(db, { tabId: tab.id });

    const first = await syncEmpty(db);
    const second = await syncEmpty(db, first.serverCursor);

    expect(second.tabs).toHaveLength(0);
    expect(second.notes).toHaveLength(0);
    expect(second.serverCursor).toBe(first.serverCursor);
  });

  it("picks up incremental changes after the cursor", async () => {
    const tab = await _createTab(db, { label: "T", date: DAY });
    const first = await syncEmpty(db);

    await new Promise((r) => setTimeout(r, 5));
    const note = await _createNote(db, { tabId: tab.id });

    const second = await syncEmpty(db, first.serverCursor);
    expect(second.tabs).toHaveLength(0);
    expect(second.notes).toHaveLength(1);
    expect(second.notes[0].id).toBe(note.id);
    expect(second.serverCursor).toBeGreaterThan(first.serverCursor);
  });

  it("returns tombstoned rows (deletedAt set) so clients can propagate deletes", async () => {
    const tab = await _createTab(db, { label: "T", date: DAY });
    const note = await _createNote(db, { tabId: tab.id });
    const first = await syncEmpty(db);

    await new Promise((r) => setTimeout(r, 5));
    await _deleteTab(db, tab.id);

    const second = await syncEmpty(db, first.serverCursor);
    expect(second.tabs).toHaveLength(1);
    expect(second.tabs[0].id).toBe(tab.id);
    expect(second.tabs[0].deletedAt).not.toBeNull();
    expect(second.notes).toHaveLength(1);
    expect(second.notes[0].id).toBe(note.id);
    expect(second.notes[0].deletedAt).not.toBeNull();
  });
});

describe("runSync — push (LWW)", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("inserts a fresh tab/note from the client", async () => {
    const now = Date.now();
    const tabId = crypto.randomUUID();
    const noteId = crypto.randomUUID();
    const req: SyncRequestInput = {
      cursor: null,
      changes: {
        tabs: [
          {
            id: tabId,
            date: DAY,
            label: "From iPhone",
            position: 0,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        notes: [
          {
            id: noteId,
            tabId,
            date: DAY,
            titlePreview: "hello",
            content: "hello world",
            position: 0,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
      },
    };
    const r = await runSync(db, req);
    expect(r.applied).toEqual({ tabs: 1, notes: 1 });
    const [stored] = await db.select().from(noteTabs).where(eq(noteTabs.id, tabId));
    expect(stored.label).toBe("From iPhone");
  });

  it("server wins when server.updatedAt > client.updatedAt", async () => {
    const tab = await _createTab(db, { label: "Server wrote this", date: DAY });
    const stale: SyncRequestInput = {
      cursor: null,
      changes: {
        tabs: [
          {
            id: tab.id,
            date: DAY,
            label: "Stale client edit",
            position: 0,
            createdAt: tab.createdAt,
            updatedAt: tab.updatedAt - 1000, // older than server
            deletedAt: null,
          },
        ],
        notes: [],
      },
    };
    const r = await runSync(db, stale);
    expect(r.applied.tabs).toBe(0);
    expect(r.rejected.tabs).toBe(1);
    const [final] = await db.select().from(noteTabs).where(eq(noteTabs.id, tab.id));
    expect(final.label).toBe("Server wrote this");
  });

  it("client wins when client.updatedAt > server.updatedAt", async () => {
    const tab = await _createTab(db, { label: "Old label", date: DAY });
    const fresh: SyncRequestInput = {
      cursor: null,
      changes: {
        tabs: [
          {
            id: tab.id,
            date: DAY,
            label: "New label from phone",
            position: 3,
            createdAt: tab.createdAt,
            updatedAt: tab.updatedAt + 1000,
            deletedAt: null,
          },
        ],
        notes: [],
      },
    };
    const r = await runSync(db, fresh);
    expect(r.applied.tabs).toBe(1);
    const [final] = await db.select().from(noteTabs).where(eq(noteTabs.id, tab.id));
    expect(final.label).toBe("New label from phone");
    expect(final.position).toBe(3);
  });

  it("rejects notes whose tab does not exist", async () => {
    const now = Date.now();
    const req: SyncRequestInput = {
      cursor: null,
      changes: {
        tabs: [],
        notes: [
          {
            id: crypto.randomUUID(),
            tabId: crypto.randomUUID(), // unknown
            date: DAY,
            titlePreview: "",
            content: "orphan",
            position: 0,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
      },
    };
    const r = await runSync(db, req);
    expect(r.applied.notes).toBe(0);
    expect(r.rejected.notes).toBe(1);
  });

  it("accepts a note whose tab is created in the same request", async () => {
    const now = Date.now();
    const tabId = crypto.randomUUID();
    const req: SyncRequestInput = {
      cursor: null,
      changes: {
        tabs: [
          {
            id: tabId,
            date: DAY,
            label: "new",
            position: 0,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
        notes: [
          {
            id: crypto.randomUUID(),
            tabId,
            date: DAY,
            titlePreview: "",
            content: "ok",
            position: 0,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ],
      },
    };
    const r = await runSync(db, req);
    expect(r.applied).toEqual({ tabs: 1, notes: 1 });
  });

  it("propagates client-initiated soft delete", async () => {
    const tab = await _createTab(db, { label: "T", date: DAY });
    const note = await _createNote(db, { tabId: tab.id });
    const newer = note.updatedAt + 5000;
    const req: SyncRequestInput = {
      cursor: null,
      changes: {
        tabs: [],
        notes: [
          {
            id: note.id,
            tabId: note.tabId,
            date: note.date,
            titlePreview: note.titlePreview,
            content: note.content,
            position: note.position,
            createdAt: note.createdAt,
            updatedAt: newer,
            deletedAt: newer, // client says: I deleted this
          },
        ],
      },
    };
    const r = await runSync(db, req);
    expect(r.applied.notes).toBe(1);
    const [final] = await db.select().from(notes).where(eq(notes.id, note.id));
    expect(final.deletedAt).toBe(newer);
  });
});

describe("runSync — validation", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("rejects malformed UUIDs via Zod", async () => {
    await expect(
      runSync(db, {
        cursor: null,
        changes: {
          tabs: [
            {
              id: "not-a-uuid",
              date: DAY,
              label: "x",
              position: 0,
              createdAt: 1,
              updatedAt: 1,
              deletedAt: null,
            },
          ],
          notes: [],
        },
      }),
    ).rejects.toThrow();
  });

  it("accepts missing 'changes' (pull-only)", async () => {
    const r = await runSync(db, { cursor: null });
    expect(r.applied).toEqual({ tabs: 0, notes: 0 });
  });
});

describe("runSync — update recency via real actions", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("sees content edits on incremental pull", async () => {
    const tab = await _createTab(db, { label: "T", date: DAY });
    const note = await _createNote(db, { tabId: tab.id });
    const first = await syncEmpty(db);

    await new Promise((r) => setTimeout(r, 5));
    await _updateNote(db, note.id, { content: "edited" });

    const second = await syncEmpty(db, first.serverCursor);
    expect(second.notes).toHaveLength(1);
    expect(second.notes[0].content).toBe("edited");
    expect(second.tabs).toHaveLength(0);
  });
});
