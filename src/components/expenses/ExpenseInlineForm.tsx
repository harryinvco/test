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
import { EXPENSE_CATEGORY, type ExpenseCategory } from "@/lib/enums";
import { createExpense } from "@/lib/expenses/actions";
import { eurosToCents } from "@/lib/money";

type ClientOption = { id: string; name: string };

export function ExpenseInlineForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenseCategory>("software");
  const [amountEuros, setAmountEuros] = useState("");
  const [vendor, setVendor] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const cents = eurosToCents(amountEuros);
    if (cents === null || cents <= 0) {
      setError("Enter an amount");
      return;
    }
    startTransition(async () => {
      await createExpense({
        date,
        category,
        amount_cents: cents,
        vendor: vendor.trim() || null,
        client_id: clientId || null,
        notes: notes.trim() || null,
      });
      setAmountEuros("");
      setVendor("");
      setNotes("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border p-3">
      <div className="grid grid-cols-[7rem_8rem_7rem_10rem_10rem_1fr_6rem] items-center gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select value={category} onValueChange={(v) => v && setCategory(v as ExpenseCategory)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPENSE_CATEGORY.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder="Amount €"
          value={amountEuros}
          onChange={(e) => setAmountEuros(e.target.value)}
        />
        <Input placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        <Select value={clientId || "__none"} onValueChange={(v) => setClientId(v === "__none" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="Client (optional)" />
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
        <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button onClick={submit} disabled={pending}>
          {pending ? "…" : "Add"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
