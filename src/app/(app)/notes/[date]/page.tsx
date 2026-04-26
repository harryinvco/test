import { notFound, redirect } from "next/navigation";
import { getLogicalDate, isValidIsoDate, formatLogicalDate } from "@/lib/notes/date";
import { getTabsForDate, getNotesForTab } from "@/lib/notes/queries";
import { NotesWorkspace, type NotesByTab } from "@/components/notes/NotesWorkspace";
import type { Note } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NotesByDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidIsoDate(date)) notFound();

  const today = getLogicalDate();
  if (date === today) redirect("/notes");

  const tabs = await getTabsForDate(date);
  const notesByTab: NotesByTab = {};
  await Promise.all(
    tabs.map(async (tab) => {
      notesByTab[tab.id] = (await getNotesForTab(tab.id)) as Note[];
    }),
  );

  return (
    <div className="-m-8 lg:-m-10 h-[calc(100vh-3.5rem)] overflow-hidden">
      <NotesWorkspace
        date={date}
        displayDate={formatLogicalDate(date)}
        isToday={false}
        readOnly
        initialTabs={tabs}
        initialNotesByTab={notesByTab}
      />
    </div>
  );
}
