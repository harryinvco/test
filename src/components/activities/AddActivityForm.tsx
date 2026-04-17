"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_TYPE, type ActivityType } from "@/lib/enums";
import { addActivity } from "@/lib/activities/actions";

function nowLocalInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddActivityForm({ leadId }: { leadId: string }) {
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocalInput());
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const ms = new Date(occurredAt).getTime();
    startTransition(async () => {
      await addActivity({ lead_id: leadId, type, body, occurred_at_ms: ms });
      setBody("");
      setOccurredAt(nowLocalInput());
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v as ActivityType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>When</Label>
          <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Note</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What happened?" />
      </div>
      <Button type="submit" disabled={pending || !body.trim()}>{pending ? "Saving…" : "Add activity"}</Button>
    </form>
  );
}
