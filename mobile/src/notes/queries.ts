import { getDb } from "@/db/local";
import type { LocalNote, LocalTab } from "@/db/schema";

export async function listTabsForDate(date: string): Promise<LocalTab[]> {
  const db = await getDb();
  return db.getAllAsync<LocalTab>(
    `SELECT id, date, label, position,
            created_at AS createdAt, updated_at AS updatedAt,
            deleted_at AS deletedAt, dirty
     FROM note_tabs
     WHERE date = ? AND deleted_at IS NULL
     ORDER BY position ASC, created_at ASC`,
    [date],
  );
}

export async function listNotesForTab(tabId: string): Promise<LocalNote[]> {
  const db = await getDb();
  return db.getAllAsync<LocalNote>(
    `SELECT id, tab_id AS tabId, date, title_preview AS titlePreview, content, position,
            created_at AS createdAt, updated_at AS updatedAt,
            deleted_at AS deletedAt, dirty
     FROM notes
     WHERE tab_id = ? AND deleted_at IS NULL
     ORDER BY position ASC, created_at ASC`,
    [tabId],
  );
}

export async function getTabById(id: string): Promise<LocalTab | null> {
  const db = await getDb();
  const [row] = await db.getAllAsync<LocalTab>(
    `SELECT id, date, label, position,
            created_at AS createdAt, updated_at AS updatedAt,
            deleted_at AS deletedAt, dirty
     FROM note_tabs WHERE id = ?`,
    [id],
  );
  return row ?? null;
}

export async function getNoteById(id: string): Promise<LocalNote | null> {
  const db = await getDb();
  const [row] = await db.getAllAsync<LocalNote>(
    `SELECT id, tab_id AS tabId, date, title_preview AS titlePreview, content, position,
            created_at AS createdAt, updated_at AS updatedAt,
            deleted_at AS deletedAt, dirty
     FROM notes WHERE id = ?`,
    [id],
  );
  return row ?? null;
}

export type DateRollup = { date: string; tabCount: number; noteCount: number };

export async function listDatesWithContent(excludeDate?: string): Promise<DateRollup[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ date: string; tabCount: number; noteCount: number }>(
    `SELECT nt.date AS date,
            COUNT(DISTINCT nt.id) AS tabCount,
            COUNT(CASE WHEN n.deleted_at IS NULL THEN n.id END) AS noteCount
     FROM note_tabs nt
     LEFT JOIN notes n ON n.tab_id = nt.id
     WHERE nt.deleted_at IS NULL ${excludeDate ? "AND nt.date != ?" : ""}
     GROUP BY nt.date
     ORDER BY nt.date DESC`,
    excludeDate ? [excludeDate] : [],
  );
  return rows;
}

export async function readDirtyTabs(): Promise<LocalTab[]> {
  const db = await getDb();
  return db.getAllAsync<LocalTab>(
    `SELECT id, date, label, position,
            created_at AS createdAt, updated_at AS updatedAt,
            deleted_at AS deletedAt, dirty
     FROM note_tabs WHERE dirty = 1`,
  );
}

export async function readDirtyNotes(): Promise<LocalNote[]> {
  const db = await getDb();
  return db.getAllAsync<LocalNote>(
    `SELECT id, tab_id AS tabId, date, title_preview AS titlePreview, content, position,
            created_at AS createdAt, updated_at AS updatedAt,
            deleted_at AS deletedAt, dirty
     FROM notes WHERE dirty = 1`,
  );
}
