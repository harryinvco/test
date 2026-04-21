import { syncNotes, type RemoteNote, type RemoteTab, type SyncResponse } from "@/api/client";
import {
  getServerCursor,
  setLastSyncAt,
  setServerCursor,
  upsertRemoteNote,
  upsertRemoteTab,
} from "@/db/local";
import { readDirtyNotes, readDirtyTabs } from "@/notes/queries";

export type SyncSummary = {
  at: number;
  cursorBefore: number;
  cursorAfter: number;
  pushed: { tabs: number; notes: number };
  applied: { tabs: number; notes: number };
  rejected: { tabs: number; notes: number };
  pulledTabs: number;
  pulledNotes: number;
};

export async function runSync(token: string): Promise<SyncSummary> {
  const cursorBefore = await getServerCursor();
  const [dirtyTabs, dirtyNotes] = await Promise.all([readDirtyTabs(), readDirtyNotes()]);

  const remoteTabs: RemoteTab[] = dirtyTabs.map((t) => ({
    id: t.id,
    date: t.date,
    label: t.label,
    position: t.position,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    deletedAt: t.deletedAt ?? null,
  }));
  const remoteNotes: RemoteNote[] = dirtyNotes.map((n) => ({
    id: n.id,
    tabId: n.tabId,
    date: n.date,
    titlePreview: n.titlePreview,
    content: n.content,
    position: n.position,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    deletedAt: n.deletedAt ?? null,
  }));

  const res: SyncResponse = await syncNotes(
    {
      cursor: cursorBefore || null,
      changes: { tabs: remoteTabs, notes: remoteNotes },
    },
    token,
  );

  // The response includes anything written since our cursor — which naturally
  // includes rows the server just accepted from our push (since those updatedAt
  // values are > cursorBefore). upsertRemote* clears `dirty` via ON CONFLICT.
  for (const t of res.tabs) await upsertRemoteTab(t);
  for (const n of res.notes) await upsertRemoteNote(n);

  if (res.serverCursor > cursorBefore) {
    await setServerCursor(res.serverCursor);
  }
  const at = Date.now();
  await setLastSyncAt(at);

  return {
    at,
    cursorBefore,
    cursorAfter: Math.max(res.serverCursor, cursorBefore),
    pushed: { tabs: remoteTabs.length, notes: remoteNotes.length },
    applied: res.applied,
    rejected: res.rejected,
    pulledTabs: res.tabs.length,
    pulledNotes: res.notes.length,
  };
}
