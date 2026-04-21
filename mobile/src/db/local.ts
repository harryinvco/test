import * as SQLite from "expo-sqlite";
import type { LocalNote, LocalTab } from "./schema";

const DB_NAME = "innovaco-notes.db";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await runMigrations(db);
      return db;
    });
  }
  return dbPromise;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY
    );
  `);
  const [row] = await db.getAllAsync<{ version: number }>(
    "SELECT COALESCE(MAX(version), 0) AS version FROM schema_version",
  );
  const current = row?.version ?? 0;

  if (current < 1) {
    await db.execAsync(`
      CREATE TABLE note_tabs (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        label TEXT NOT NULL,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        dirty INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX note_tabs_date_idx ON note_tabs(date);
      CREATE INDEX note_tabs_dirty_idx ON note_tabs(dirty) WHERE dirty = 1;

      CREATE TABLE notes (
        id TEXT PRIMARY KEY NOT NULL,
        tab_id TEXT NOT NULL REFERENCES note_tabs(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        title_preview TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        dirty INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX notes_tab_position_idx ON notes(tab_id, position);
      CREATE INDEX notes_date_idx ON notes(date);
      CREATE INDEX notes_dirty_idx ON notes(dirty) WHERE dirty = 1;

      CREATE TABLE sync_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    await db.runAsync("INSERT INTO schema_version (version) VALUES (?)", [1]);
  }
}

export async function getServerCursor(): Promise<number> {
  const db = await getDb();
  const [row] = await db.getAllAsync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = 'serverCursor'",
  );
  return row ? parseInt(row.value, 10) || 0 : 0;
}

export async function setServerCursor(cursor: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO sync_meta (key, value) VALUES ('serverCursor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(cursor)],
  );
}

export async function setLastSyncAt(ts: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO sync_meta (key, value) VALUES ('lastSyncAt', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [String(ts)],
  );
}

export async function countLocal(): Promise<{ tabs: number; notes: number; dirtyTabs: number; dirtyNotes: number }> {
  const db = await getDb();
  const [t] = await db.getAllAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM note_tabs WHERE deleted_at IS NULL",
  );
  const [n] = await db.getAllAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM notes WHERE deleted_at IS NULL",
  );
  const [dt] = await db.getAllAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM note_tabs WHERE dirty = 1",
  );
  const [dn] = await db.getAllAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM notes WHERE dirty = 1",
  );
  return {
    tabs: t?.c ?? 0,
    notes: n?.c ?? 0,
    dirtyTabs: dt?.c ?? 0,
    dirtyNotes: dn?.c ?? 0,
  };
}

/**
 * LWW upsert of a remote tab/note into the local cache. Clears `dirty` flag on apply.
 */
export async function upsertRemoteTab(t: {
  id: string;
  date: string;
  label: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO note_tabs (id, date, label, position, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date,
       label = excluded.label,
       position = excluded.position,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       dirty = 0
     WHERE excluded.updated_at > note_tabs.updated_at`,
    [t.id, t.date, t.label, t.position, t.createdAt, t.updatedAt, t.deletedAt],
  );
}

export async function upsertRemoteNote(n: {
  id: string;
  tabId: string;
  date: string;
  titlePreview: string;
  content: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO notes (id, tab_id, date, title_preview, content, position, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       tab_id = excluded.tab_id,
       date = excluded.date,
       title_preview = excluded.title_preview,
       content = excluded.content,
       position = excluded.position,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at,
       dirty = 0
     WHERE excluded.updated_at > notes.updated_at`,
    [
      n.id,
      n.tabId,
      n.date,
      n.titlePreview,
      n.content,
      n.position,
      n.createdAt,
      n.updatedAt,
      n.deletedAt,
    ],
  );
}

// Thin debug helpers for the smoke screen.
export async function dumpTabs(): Promise<LocalTab[]> {
  const db = await getDb();
  return db.getAllAsync<LocalTab>(
    "SELECT id, date, label, position, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt, dirty FROM note_tabs ORDER BY date DESC, position ASC",
  );
}

export async function dumpNotes(): Promise<LocalNote[]> {
  const db = await getDb();
  return db.getAllAsync<LocalNote>(
    "SELECT id, tab_id AS tabId, date, title_preview AS titlePreview, content, position, created_at AS createdAt, updated_at AS updatedAt, deleted_at AS deletedAt, dirty FROM notes ORDER BY updated_at DESC",
  );
}

export async function wipeLocal(): Promise<void> {
  const db = await getDb();
  await db.execAsync("DELETE FROM notes; DELETE FROM note_tabs; DELETE FROM sync_meta;");
}
