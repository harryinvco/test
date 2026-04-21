import { db } from "@/db/client";
import { getTimeEntries, weeklyTotalHours } from "@/lib/time/queries";
import { getClients } from "@/lib/clients/queries";
import { TimeEntriesTable } from "@/components/time/TimeEntriesTable";
import { TimeInlineForm } from "@/components/time/TimeInlineForm";

export default async function TimePage() {
  const [rows, clients, weekHours] = await Promise.all([
    getTimeEntries(),
    getClients(),
    weeklyTotalHours(db),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Time</h1>
        <div className="text-sm text-muted-foreground">
          This week:{" "}
          <span className="font-medium tabular-nums text-foreground">
            {weekHours.toFixed(2)} h
          </span>
        </div>
      </div>
      <TimeInlineForm clients={clients.map((c) => ({ id: c.id, name: c.name }))} />
      <TimeEntriesTable rows={rows} />
    </div>
  );
}
