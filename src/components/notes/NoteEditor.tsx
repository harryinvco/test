"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EyeIcon, PencilIcon, ColumnsIcon, CheckIcon, CloudOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Note } from "@/db/schema";

export type EditorMode = "edit" | "preview" | "split";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type Props = {
  note: Note | null;
  readOnly: boolean;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  onUpdate: (id: string, content: string) => Promise<Note | null>;
  onRefresh?: () => void;
};

const AUTOSAVE_DEBOUNCE_MS = 600;

export function NoteEditor({ note, readOnly, mode, onModeChange, onUpdate }: Props) {
  if (!note) {
    return (
      <section className="flex min-h-0 flex-col items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          {readOnly ? "No note selected." : "Select or create a note to start writing."}
        </p>
      </section>
    );
  }
  return (
    <ActiveNoteEditor
      key={note.id}
      note={note}
      readOnly={readOnly}
      mode={mode}
      onModeChange={onModeChange}
      onUpdate={onUpdate}
    />
  );
}

function ActiveNoteEditor({
  note,
  readOnly,
  mode,
  onModeChange,
  onUpdate,
}: Props & { note: Note }) {
  const [draft, setDraft] = useState(note.content);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<string | null>(null);
  const noteId = note.id;

  // Flush any pending save when unmounting (note change triggers remount via key).
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const pending = pendingContentRef.current;
      if (pending !== null) {
        void onUpdate(noteId, pending);
        pendingContentRef.current = null;
      }
    };
  }, [noteId, onUpdate]);

  function scheduleSave(content: string) {
    pendingContentRef.current = content;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setStatus("saving");
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onUpdate(noteId, content);
        setStatus("saved");
        pendingContentRef.current = null;
      } catch {
        setStatus("error");
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setDraft(value);
    scheduleSave(value);
  }

  async function handleFlush() {
    if (pendingContentRef.current === null) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      setStatus("saving");
      await onUpdate(noteId, pendingContentRef.current);
      setStatus("saved");
      pendingContentRef.current = null;
    } catch {
      setStatus("error");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleFlush();
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.currentTarget.blur();
    }
  }

  const derivedTitle =
    note.titlePreview || draft.split("\n")[0].trim().replace(/^#+\s*/, "") || "New note";

  return (
    <section className="flex min-h-0 flex-col bg-background">
      {/* Editor toolbar */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b px-5">
        <div className="min-w-0 truncate text-sm font-medium">{derivedTitle}</div>
        <div className="flex items-center gap-3">
          <SaveIndicator status={status} readOnly={readOnly} />
          <div className="inline-flex items-center rounded-md border bg-background p-0.5">
            <ModeButton current={mode} value="edit" onChange={onModeChange} icon={<PencilIcon />} label="Edit" />
            <ModeButton current={mode} value="split" onChange={onModeChange} icon={<ColumnsIcon />} label="Split" />
            <ModeButton current={mode} value="preview" onChange={onModeChange} icon={<EyeIcon />} label="Preview" />
          </div>
        </div>
      </div>

      {/* Editor body */}
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden",
          mode === "split" ? "grid grid-cols-2 divide-x" : "flex",
        )}
      >
        {(mode === "edit" || mode === "split") && (
          <textarea
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => void handleFlush()}
            disabled={readOnly}
            spellCheck
            placeholder="Start typing…"
            className={cn(
              "h-full w-full resize-none bg-background px-8 py-6 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50",
              "disabled:cursor-not-allowed disabled:opacity-80",
            )}
          />
        )}
        {(mode === "preview" || mode === "split") && (
          <div className="h-full w-full overflow-y-auto bg-background px-8 py-6">
            <article className="prose prose-sm max-w-none dark:prose-invert">
              {draft.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">Nothing to preview yet.</p>
              )}
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

function ModeButton({
  current,
  value,
  onChange,
  icon,
  label,
}: {
  current: EditorMode;
  value: EditorMode;
  onChange: (v: EditorMode) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const active = current === value;
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="xs"
      onClick={() => onChange(value)}
      aria-label={label}
      aria-pressed={active}
      className="gap-1"
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </Button>
  );
}

function SaveIndicator({ status, readOnly }: { status: SaveStatus; readOnly: boolean }) {
  if (readOnly) {
    return <span className="text-xs text-muted-foreground">Read-only</span>;
  }
  if (status === "saving")
    return <span className="text-xs text-muted-foreground">Saving…</span>;
  if (status === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckIcon className="size-3" /> Saved
      </span>
    );
  if (status === "error")
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <CloudOffIcon className="size-3" /> Save failed
      </span>
    );
  return null;
}
