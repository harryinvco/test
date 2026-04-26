"use client";

import { useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { NoteTab } from "@/db/schema";

type Props = {
  tabs: NoteTab[];
  activeTabId: string | null;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onCreate: (label: string) => void | Promise<void>;
  onRename: (id: string, label: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
};

export function TabsColumn({
  tabs,
  activeTabId,
  readOnly,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  function startCreate() {
    setCreating(true);
    setNewLabel("");
  }

  async function confirmCreate() {
    if (!newLabel.trim()) {
      setCreating(false);
      return;
    }
    await onCreate(newLabel);
    setCreating(false);
    setNewLabel("");
  }

  function startEdit(tab: NoteTab) {
    setEditingId(tab.id);
    setEditLabel(tab.label);
  }

  async function confirmEdit() {
    if (!editingId) return;
    if (editLabel.trim()) await onRename(editingId, editLabel);
    setEditingId(null);
  }

  function moveTab(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tabs.length) return;
    const next = [...tabs];
    [next[index], next[target]] = [next[target], next[index]];
    void onReorder(next.map((t) => t.id));
  }

  return (
    <aside className="flex min-h-0 flex-col border-r bg-muted/30">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="eyebrow">Tabs</div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={startCreate}
            aria-label="New tab"
          >
            <PlusIcon />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {tabs.length === 0 && !creating && (
          <div className="mt-8 flex flex-col items-center gap-3 px-4 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {readOnly
                ? "No tabs on this day."
                : "Start your day. Create a tab like Journal, Tasks, or Ideas."}
            </p>
            {!readOnly && (
              <Button size="sm" variant="outline" onClick={startCreate}>
                <PlusIcon /> New tab
              </Button>
            )}
          </div>
        )}

        <ul className="space-y-0.5">
          {tabs.map((tab, i) => {
            const isActive = tab.id === activeTabId;
            const isEditing = editingId === tab.id;
            return (
              <li key={tab.id} className="group/tab">
                {isEditing ? (
                  <div className="flex items-center gap-1 px-1 py-1">
                    <Input
                      autoFocus
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void confirmEdit();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-7 text-sm"
                    />
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => void confirmEdit()}
                      aria-label="Save"
                    >
                      <CheckIcon />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "group/row flex items-center gap-1 rounded-md px-1 py-0.5 transition-colors",
                      isActive ? "bg-background shadow-sm" : "hover:bg-background/60",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(tab.id)}
                      className={cn(
                        "flex-1 truncate rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                        isActive ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {tab.label}
                    </button>
                    {!readOnly && (
                      <div className="flex items-center opacity-0 transition-opacity group-hover/row:opacity-100">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => moveTab(i, -1)}
                          disabled={i === 0}
                          aria-label="Move up"
                        >
                          <ChevronUpIcon />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => moveTab(i, 1)}
                          disabled={i === tabs.length - 1}
                          aria-label="Move down"
                        >
                          <ChevronDownIcon />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => startEdit(tab)}
                          aria-label="Rename"
                        >
                          <PencilIcon />
                        </Button>
                        <DeleteTabButton
                          label={tab.label}
                          onConfirm={() => void onDelete(tab.id)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {creating && !readOnly && (
          <div className="mt-2 flex items-center gap-1 px-1">
            <Input
              autoFocus
              placeholder="Tab name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void confirmCreate();
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewLabel("");
                }
              }}
              onBlur={() => void confirmCreate()}
              className="h-7 text-sm"
            />
            <Button
              size="icon-xs"
              variant="ghost"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setCreating(false);
                setNewLabel("");
              }}
              aria-label="Cancel"
            >
              <XIcon />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}

function DeleteTabButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="icon-xs" variant="ghost" aria-label="Delete tab">
            <TrashIcon />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tab &ldquo;{label}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            All notes in this tab will be permanently removed.
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
