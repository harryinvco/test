"use client";

import { useOptimistic, useTransition, useState } from "react";
import Link from "next/link";
import { type LeadStage } from "@/lib/enums";
import { updateStage } from "@/lib/leads/actions";
import { formatEuros } from "@/lib/money";
import type { Lead } from "@/db/schema";

const ACTIVE: readonly LeadStage[] = ["new", "contacted", "qualified", "proposal_sent", "won"];

export function LeadsKanban({ leads }: { leads: Lead[] }) {
  const [optimistic, setOptimistic] = useOptimistic(leads, (state, move: { id: string; stage: LeadStage }) =>
    state.map((l) => (l.id === move.id ? { ...l, stage: move.stage } : l)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);

  function onDrop(stage: LeadStage) {
    if (!dragging) return;
    const id = dragging;
    setDragging(null);
    startTransition(async () => {
      setOptimistic({ id, stage });
      await updateStage(id, stage);
    });
  }

  const byStage = ACTIVE.map((s) => ({ stage: s, items: optimistic.filter((l) => l.stage === s) }));
  const lost = optimistic.filter((l) => l.stage === "lost");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {byStage.map(({ stage, items }) => (
          <div
            key={stage}
            className="rounded-md border bg-muted/20 p-2 min-h-[300px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(stage)}
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {stage.replace("_", " ")} · {items.length}
            </div>
            <div className="space-y-2">
              {items.map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  draggable
                  onDragStart={() => setDragging(l.id)}
                  className="block rounded border bg-background p-3 text-sm shadow-sm hover:shadow"
                >
                  <div className="font-medium truncate">{l.name}</div>
                  {l.company && <div className="text-xs text-muted-foreground truncate">{l.company}</div>}
                  <div className="mt-1 flex justify-between text-xs">
                    <span>{formatEuros(l.estimatedValueCents)}</span>
                    {l.followUpDate && <span className="text-muted-foreground">{l.followUpDate}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <details className="rounded-md border p-3">
        <summary className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
          Lost · {lost.length}
        </summary>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {lost.map((l) => (
            <Link key={l.id} href={`/leads/${l.id}`} className="rounded border bg-background p-2 text-xs hover:shadow">
              <div className="font-medium truncate">{l.name}</div>
              {l.company && <div className="text-muted-foreground truncate">{l.company}</div>}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
