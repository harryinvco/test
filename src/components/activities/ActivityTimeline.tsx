import { Phone, Mail, Calendar, StickyNote } from "lucide-react";
import type { Activity } from "@/db/schema";

const ICONS = { call: Phone, email: Mail, meeting: Calendar, note: StickyNote } as const;

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet. Add the first one below.</p>;
  }
  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ICONS[a.type as keyof typeof ICONS] ?? StickyNote;
        const when = new Date(a.occurredAt).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-muted grid place-items-center">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs text-muted-foreground">{a.type} · {when}</div>
              <div className="text-sm whitespace-pre-wrap">{a.body}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
