import { getLogicalDate } from "@/lib/notes/date";
import { getTabsForDate, getNotesForTab } from "@/lib/notes/queries";
import { NotesWorkspace, type NotesByTab } from "@/components/notes/NotesWorkspace";
import type { Note } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NotesTodayPage() {
  const date = getLogicalDate();
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
        isToday
        readOnly={false}
        initialTabs={tabs}
        initialNotesByTab={notesByTab}
      />
    </div>
  );
}
