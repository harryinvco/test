"use client";

import {
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { NoteTab, Note } from "@/db/schema";

type Props = {
  tab: NoteTab | null;
  notes: Note[];
  activeNoteId: string | null;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
};

export function NotesList({
  tab,
  notes,
  activeNoteId,
  readOnly,
  onSelect,
  onCreate,
  onDelete,
  onReorder,
}: Props) {
  function moveNote(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= notes.length) return;
    const next = [...notes];
    [next[index], next[target]] = [next[target], next[index]];
    void onReorder(next.map((n) => n.id));
  }

  if (!tab) {
    return (
      <section className="flex min-h-0 flex-col items-center justify-center border-r bg-background px-6 text-center text-sm text-muted-foreground">
        Select or create a tab to start.
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col border-r bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <div className="eyebrow">Notes</div>
          <div className="truncate text-sm font-medium">{tab.label}</div>
        </div>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={() => void onCreate()}>
            <PlusIcon /> New
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="px-6 pt-10 text-center text-xs text-muted-foreground">
            {readOnly ? "No notes in this tab." : "No notes yet. Click New to start writing."}
          </div>
        ) : (
          <ul className="divide-y">
            {notes.map((n, i) => {
              const isActive = n.id === activeNoteId;
              const preview = previewLines(n.content);
              return (
                <li key={n.id} className="group/note">
                  <div
                    className={cn(
                      "relative flex flex-col gap-1 px-4 py-3 transition-colors",
                      isActive ? "bg-muted" : "hover:bg-muted/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(n.id)}
                      className="flex flex-col gap-1 text-left"
                    >
                      <div className="truncate text-sm font-medium">
                        {n.titlePreview || "New note"}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {new Date(n.updatedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="truncate">{preview}</span>
                      </div>
                    </button>
                    {!readOnly && (
                      <div className="absolute right-2 top-2 flex items-center opacity-0 transition-opacity group-hover/note:opacity-100">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => moveNote(i, -1)}
                          disabled={i === 0}
                          aria-label="Move up"
                        >
                          <ChevronUpIcon />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => moveNote(i, 1)}
                          disabled={i === notes.length - 1}
                          aria-label="Move down"
                        >
                          <ChevronDownIcon />
                        </Button>
                        <DeleteNoteButton
                          title={n.titlePreview || "New note"}
                          onConfirm={() => void onDelete(n.id)}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function previewLines(content: string): string {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.slice(1, 3).join(" · ").slice(0, 120);
}

function DeleteNoteButton({
  title,
  onConfirm,
}: {
  title: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="icon-xs" variant="ghost" aria-label="Delete note">
            <TrashIcon />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{title}&quot; will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
