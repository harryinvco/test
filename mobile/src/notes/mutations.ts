import { getDb } from "@/db/local";
import type { LocalNote, LocalTab } from "@/db/schema";
import { uuidv4 } from "@/lib/uuid";
import { deriveTitle } from "@/lib/title";
import { emitDirtyChange } from "@/sync/bus";

function now(): number {
  return Date.now();
}

async function nextTabPosition(date: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.getAllAsync<{ max: number | null }>(
    "SELECT MAX(position) AS max FROM note_tabs WHERE date = ? AND deleted_at IS NULL",
    [date],
  );
  return (row?.max ?? -1) + 1;
}

async function nextNotePosition(tabId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.getAllAsync<{ max: number | null }>(
    "SELECT MAX(position) AS max FROM notes WHERE tab_id = ? AND deleted_at IS NULL",
    [tabId],
  );
  return (row?.max ?? -1) + 1;
}

// --- Tabs -------------------------------------------------------------------

export async function createLocalTab(params: { date: string; label: string }): Promise<LocalTab> {
  const db = await getDb();
  const ts = now();
  const position = await nextTabPosition(params.date);
  const row: LocalTab = {
    id: uuidv4(),
    date: params.date,
    label: params.label.trim(),
    position,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
    dirty: 1,
  };
  await db.runAsync(
    `INSERT INTO note_tabs (id, date, label, position, created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 1)`,
    [row.id, row.date, row.label, row.position, row.createdAt, row.updatedAt],
  );
  emitDirtyChange();
  return row;
}

export async function renameLocalTab(id: string, label: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE note_tabs
     SET label = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [label.trim(), now(), id],
  );
  emitDirtyChange();
}

export async function deleteLocalTab(id: string): Promise<void> {
  const db = await getDb();
  const ts = now();
  await db.runAsync(
    `UPDATE note_tabs
     SET deleted_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [ts, ts, id],
  );
  // Cascade soft-delete to child notes.
  await db.runAsync(
    `UPDATE notes
     SET deleted_at = ?, updated_at = ?, dirty = 1
     WHERE tab_id = ? AND deleted_at IS NULL`,
    [ts, ts, id],
  );
  emitDirtyChange();
}

export async function reorderLocalTabs(date: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  const ts = now();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync(
      `UPDATE note_tabs
       SET position = ?, updated_at = ?, dirty = 1
       WHERE id = ? AND date = ? AND deleted_at IS NULL`,
      [i, ts, orderedIds[i], date],
    );
  }
  emitDirtyChange();
}

// --- Notes ------------------------------------------------------------------

export async function createLocalNote(params: { tabId: string; date: string }): Promise<LocalNote> {
  const db = await getDb();
  const ts = now();
  const position = await nextNotePosition(params.tabId);
  const row: LocalNote = {
    id: uuidv4(),
    tabId: params.tabId,
    date: params.date,
    titlePreview: "",
    content: "",
    position,
    createdAt: ts,
    updatedAt: ts,
    deletedAt: null,
    dirty: 1,
  };
  await db.runAsync(
    `INSERT INTO notes (id, tab_id, date, title_preview, content, position,
                        created_at, updated_at, deleted_at, dirty)
     VALUES (?, ?, ?, '', '', ?, ?, ?, NULL, 1)`,
    [row.id, row.tabId, row.date, row.position, row.createdAt, row.updatedAt],
  );
  emitDirtyChange();
  return row;
}

export async function updateLocalNote(id: string, content: string): Promise<void> {
  const db = await getDb();
  const title = deriveTitle(content);
  await db.runAsync(
    `UPDATE notes
     SET content = ?, title_preview = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [content, title, now(), id],
  );
  emitDirtyChange();
}

export async function deleteLocalNote(id: string): Promise<void> {
  const db = await getDb();
  const ts = now();
  await db.runAsync(
    `UPDATE notes
     SET deleted_at = ?, updated_at = ?, dirty = 1
     WHERE id = ? AND deleted_at IS NULL`,
    [ts, ts, id],
  );
  emitDirtyChange();
}

export async function reorderLocalNotes(tabId: string, orderedIds: string[]): Promise<void> {
  const db = await getDb();
  const ts = now();
  for (let i = 0; i < orderedIds.length; i++) {
    await db.runAsync(
      `UPDATE notes
       SET position = ?, updated_at = ?, dirty = 1
       WHERE id = ? AND tab_id = ? AND deleted_at IS NULL`,
      [i, ts, orderedIds[i], tabId],
    );
  }
  emitDirtyChange();
}
