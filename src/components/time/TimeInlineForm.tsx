"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTimeEntry } from "@/lib/time/actions";

type ClientOption = { id: string; name: string };

export function TimeInlineForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [hours, setHours] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      setError("Enter hours between 0 and 24");
      return;
    }
    if (!description.trim()) {
      setError("Description required");
      return;
    }
    startTransition(async () => {
      await createTimeEntry({
        date,
        hours: h,
        client_id: clientId || null,
        description: description.trim(),
        billable,
      });
      setHours("");
      setDescription("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="grid grid-cols-[7rem_5rem_10rem_1fr_7rem_6rem] items-center gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input
          type="number"
          step="0.25"
          placeholder="Hrs"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <Select value={clientId || "__none"} onValueChange={(v) => setClientId(v === "__none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">No client</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="What did you do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={billable}
            onChange={(e) => setBillable(e.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Billable
        </label>
        <Button onClick={submit} disabled={pending}>
          {pending ? "…" : "Log"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
