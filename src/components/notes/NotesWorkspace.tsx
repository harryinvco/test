"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StickyNoteIcon, HistoryIcon, SunriseIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NoteTab, Note } from "@/db/schema";
import { formatLogicalDate } from "@/lib/notes/date";
import {
  createTab,
  renameTab,
  deleteTab,
  reorderTabs,
  createNote,
  updateNote,
  deleteNote,
  reorderNotes,
} from "@/lib/notes/actions";
import { TabsColumn } from "./TabsColumn";
import { NotesList } from "./NotesList";
import { NoteEditor, type EditorMode } from "./NoteEditor";

export type NotesByTab = Record<string, Note[]>;

type Props = {
  date: string;
  displayDate?: string;
  isToday: boolean;
  readOnly: boolean;
  initialTabs: NoteTab[];
  initialNotesByTab: NotesByTab;
};

export function NotesWorkspace({
  date,
  displayDate,
  isToday,
  readOnly,
  initialTabs,
  initialNotesByTab,
}: Props) {
  const router = useRouter();
  const [tabs, setTabs] = useState<NoteTab[]>(initialTabs);
  const [notesByTab, setNotesByTab] = useState<NotesByTab>(initialNotesByTab);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    initialTabs[0]?.id ?? null,
  );
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    initialTabs[0] ? initialNotesByTab[initialTabs[0].id]?.[0]?.id ?? null : null,
  );
  const [editorMode, setEditorMode] = useState<EditorMode>("edit");

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? null,
    [tabs, activeTabId],
  );
  const activeNotes = useMemo(
    () => (activeTabId ? notesByTab[activeTabId] ?? [] : []),
    [notesByTab, activeTabId],
  );
  const activeNote = useMemo(
    () => activeNotes.find((n) => n.id === activeNoteId) ?? null,
    [activeNotes, activeNoteId],
  );

  const handleSelectTab = useCallback(
    (tabId: string) => {
      setActiveTabId(tabId);
      const firstNote = notesByTab[tabId]?.[0];
      setActiveNoteId(firstNote?.id ?? null);
    },
    [notesByTab],
  );

  const handleCreateTab = useCallback(
    async (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      const row = await createTab({ label: trimmed, date });
      setTabs((prev) => [...prev, row]);
      setNotesByTab((prev) => ({ ...prev, [row.id]: [] }));
      setActiveTabId(row.id);
      setActiveNoteId(null);
    },
    [date],
  );

  const handleRenameTab = useCallback(async (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const row = await renameTab(id, { label: trimmed });
    if (row) setTabs((prev) => prev.map((t) => (t.id === id ? row : t)));
  }, []);

  const handleDeleteTab = useCallback(
    async (id: string) => {
      await deleteTab(id);
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setNotesByTab((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activeTabId === id) {
        const remaining = tabs.filter((t) => t.id !== id);
        const nextTab = remaining[0] ?? null;
        setActiveTabId(nextTab?.id ?? null);
        setActiveNoteId(nextTab ? notesByTab[nextTab.id]?.[0]?.id ?? null : null);
      }
    },
    [tabs, notesByTab, activeTabId],
  );

  const handleReorderTabs = useCallback(
    async (orderedIds: string[]) => {
      await reorderTabs({ date, orderedIds });
      setTabs((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]));
        return orderedIds.map((id, i) => ({ ...(byId.get(id) as NoteTab), position: i }));
      });
    },
    [date],
  );

  const handleCreateNote = useCallback(async () => {
    if (!activeTabId) return;
    const row = await createNote({ tabId: activeTabId });
    setNotesByTab((prev) => ({
      ...prev,
      [activeTabId]: [...(prev[activeTabId] ?? []), row],
    }));
    setActiveNoteId(row.id);
    setEditorMode("edit");
  }, [activeTabId]);

  const handleUpdateNote = useCallback(async (id: string, content: string): Promise<Note | null> => {
    const row = await updateNote(id, { content });
    if (row) {
      setNotesByTab((prev) => {
        const tabId = row.tabId;
        const list = prev[tabId] ?? [];
        return { ...prev, [tabId]: list.map((n) => (n.id === id ? row : n)) };
      });
    }
    return row;
  }, []);

  const handleDeleteNote = useCallback(
    async (id: string) => {
      const tabId = activeTabId;
      if (!tabId) return;
      await deleteNote(id);
      setNotesByTab((prev) => {
        const list = (prev[tabId] ?? []).filter((n) => n.id !== id);
        return { ...prev, [tabId]: list };
      });
      if (activeNoteId === id) {
        const remaining = (notesByTab[tabId] ?? []).filter((n) => n.id !== id);
        setActiveNoteId(remaining[0]?.id ?? null);
      }
    },
    [activeTabId, activeNoteId, notesByTab],
  );

  const handleReorderNotes = useCallback(
    async (orderedIds: string[]) => {
      if (!activeTabId) return;
      await reorderNotes({ tabId: activeTabId, orderedIds });
      setNotesByTab((prev) => {
        const list = prev[activeTabId] ?? [];
        const byId = new Map(list.map((n) => [n.id, n]));
        const next = orderedIds.map((id, i) => ({ ...(byId.get(id) as Note), position: i }));
        return { ...prev, [activeTabId]: next };
      });
    },
    [activeTabId],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      if (e.key.toLowerCase() === "n" && !e.shiftKey) {
        if (!activeTabId) return;
        e.preventDefault();
        void handleCreateNote();
      } else if (e.key.toLowerCase() === "t" && e.shiftKey) {
        e.preventDefault();
        const label = window.prompt("Tab name");
        if (label) void handleCreateTab(label);
      } else if (e.key === "/") {
        e.preventDefault();
        setEditorMode((m) => (m === "edit" ? "preview" : m === "preview" ? "split" : "edit"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, activeTabId, handleCreateNote, handleCreateTab]);

  // When landing on a day with tabs but all notes empty in the active tab, auto-create a first note in today's view — disabled by default, keep empty state.
  const flashRef = useRef(false);
  useEffect(() => {
    flashRef.current = false;
  }, [date]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <StickyNoteIcon className="size-4 text-muted-foreground" />
            <span className="font-display text-base">Notes</span>
          </div>
          <div className="mx-2 h-4 w-px bg-border" />
          <div className="text-sm">
            <span className={cn("font-medium", !isToday && "text-muted-foreground")}>
              {displayDate ?? formatLogicalDate(date)}
            </span>
            {isToday && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase text-primary">
                <SunriseIcon className="size-3" /> Today
              </span>
            )}
            {!isToday && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                Read-only
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <Button variant="outline" size="sm" render={<Link href="/notes">Back to today</Link>} />
          )}
          <Button variant="ghost" size="sm" render={<Link href="/notes/history"><HistoryIcon /> History</Link>} />
        </div>
      </div>

      {/* Three-column body */}
      <div className="grid min-h-0 flex-1 grid-cols-[200px_280px_1fr]">
        <TabsColumn
          tabs={tabs}
          activeTabId={activeTabId}
          readOnly={readOnly}
          onSelect={handleSelectTab}
          onCreate={handleCreateTab}
          onRename={handleRenameTab}
          onDelete={handleDeleteTab}
          onReorder={handleReorderTabs}
        />
        <NotesList
          tab={activeTab}
          notes={activeNotes}
          activeNoteId={activeNoteId}
          readOnly={readOnly}
          onSelect={setActiveNoteId}
          onCreate={handleCreateNote}
          onDelete={handleDeleteNote}
          onReorder={handleReorderNotes}
        />
        <NoteEditor
          note={activeNote}
          readOnly={readOnly}
          mode={editorMode}
          onModeChange={setEditorMode}
          onUpdate={handleUpdateNote}
          onRefresh={() => router.refresh()}
        />
      </div>
    </div>
  );
}
