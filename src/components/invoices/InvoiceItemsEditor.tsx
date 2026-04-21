"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuros } from "@/lib/money";
import { PlusIcon, TrashIcon } from "lucide-react";

export type Row = {
  description: string;
  quantity: string; // kept as string while editing
  unit_price_euros: string;
};

type Props = {
  rows: Row[];
  onChange: (rows: Row[]) => void;
};

export function InvoiceItemsEditor({ rows, onChange }: Props) {
  function update(i: number, patch: Partial<Row>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rows, { description: "", quantity: "1", unit_price_euros: "" }]);
  }

  const subtotalCents = rows.reduce((s, r) => {
    const q = Number(r.quantity);
    const p = Number(r.unit_price_euros);
    if (!Number.isFinite(q) || !Number.isFinite(p)) return s;
    return s + Math.round(q * p * 100);
  }, 0);

  return (
    <div className="space-y-2">
      <Label>Line items</Label>
      <div className="space-y-2">
        {rows.map((row, i) => {
          const q = Number(row.quantity);
          const p = Number(row.unit_price_euros);
          const lineCents =
            Number.isFinite(q) && Number.isFinite(p)
              ? Math.round(q * p * 100)
              : 0;
          return (
            <div key={i} className="grid grid-cols-[1fr_5rem_6rem_6rem_2rem] items-center gap-2">
              <Input
                placeholder="Description"
                value={row.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Qty"
                value={row.quantity}
                onChange={(e) => update(i, { quantity: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="Unit €"
                value={row.unit_price_euros}
                onChange={(e) => update(i, { unit_price_euros: e.target.value })}
              />
              <div className="text-right text-sm tabular-nums text-muted-foreground">
                {formatEuros(lineCents)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(i)}
                aria-label="Remove line"
              >
                <TrashIcon />
              </Button>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <PlusIcon /> Add line
      </Button>
      <div className="flex justify-end pt-2 text-sm">
        Subtotal: <span className="ml-2 tabular-nums font-medium">{formatEuros(subtotalCents)}</span>
      </div>
    </div>
  );
}
