import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { getDatesWithNotes } from "@/lib/notes/queries";
import { getLogicalDate, formatLogicalDate } from "@/lib/notes/date";
import { StickyNoteIcon, FolderIcon, ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NotesHistoryPage() {
  const today = getLogicalDate();
  const rows = (await getDatesWithNotes(90)).filter((r) => r.date !== today);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notes"
        title="History"
        description="Every day you've written. Past days are read-only — a fresh slate starts each morning at 07:00."
        actions={
          <Button variant="outline" size="sm" render={<Link href="/notes">
            <ArrowLeftIcon /> Back to today
          </Link>} />
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          No past days yet. Come back tomorrow.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {rows.map((r) => (
            <li key={r.date}>
              <Link
                href={`/notes/${r.date}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted"
              >
                <div>
                  <div className="font-medium">{formatLogicalDate(r.date)}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.date}</div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FolderIcon className="size-3.5" /> {r.tabCount} {r.tabCount === 1 ? "tab" : "tabs"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <StickyNoteIcon className="size-3.5" /> {r.noteCount} {r.noteCount === 1 ? "note" : "notes"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
