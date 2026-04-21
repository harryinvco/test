"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvoiceItemsEditor, type Row } from "@/components/invoices/InvoiceItemsEditor";
import { createInvoice, updateInvoice } from "@/lib/invoices/actions";
import { centsToEuros, eurosToCents } from "@/lib/money";
import type { Invoice, InvoiceItem } from "@/db/schema";

type ClientOption = { id: string; name: string };

type Props =
  | { mode: "create"; clients: ClientOption[] }
  | {
      mode: "edit";
      clients: ClientOption[];
      invoice: Invoice;
      items: InvoiceItem[];
    };

export function InvoiceForm(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const [clientId, setClientId] = useState<string>(
    props.mode === "edit" ? props.invoice.clientId ?? "" : "",
  );
  const [number, setNumber] = useState<string>(
    props.mode === "edit" ? props.invoice.number : "",
  );
  const [issueDate, setIssueDate] = useState<string>(
    props.mode === "edit" ? props.invoice.issueDate : today,
  );
  const [dueDate, setDueDate] = useState<string>(
    props.mode === "edit" ? props.invoice.dueDate : defaultDue,
  );
  const [notes, setNotes] = useState<string>(
    props.mode === "edit" ? props.invoice.notes ?? "" : "",
  );
  const [taxEuros, setTaxEuros] = useState<string>(
    props.mode === "edit" ? centsToEuros(props.invoice.taxCents) : "",
  );
  const [rows, setRows] = useState<Row[]>(
    props.mode === "edit"
      ? props.items.map((it) => ({
          description: it.description,
          quantity: String(it.quantity),
          unit_price_euros: centsToEuros(it.unitPriceCents),
        }))
      : [{ description: "", quantity: "1", unit_price_euros: "" }],
  );

  function submit() {
    setError(null);
    const items = rows
      .filter((r) => r.description.trim())
      .map((r) => ({
        description: r.description.trim(),
        quantity: Number(r.quantity),
        unit_price_cents: eurosToCents(r.unit_price_euros) ?? 0,
      }));
    if (!items.length) {
      setError("At least one line item is required");
      return;
    }
    const input = {
      client_id: clientId || null,
      number: number.trim() || undefined,
      issue_date: issueDate,
      due_date: dueDate,
      notes: notes.trim() || null,
      tax_cents: eurosToCents(taxEuros) ?? 0,
      items,
    };
    startTransition(async () => {
      try {
        if (props.mode === "create") {
          await createInvoice(input);
        } else {
          await updateInvoice(props.invoice.id, input);
          router.push(`/admin/invoices/${props.invoice.id}`);
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Client">
          <Select
            value={clientId || "__none"}
            onValueChange={(v) => {
              if (v !== null) setClientId(v === "__none" ? "" : v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="(optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">No client</SelectItem>
              {props.clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Invoice number (optional — auto-generated)">
          <Input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="INV-YYYY-NNNN"
          />
        </Field>
        <Field label="Issue date">
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </Field>
        <Field label="Due date">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </div>

      <InvoiceItemsEditor rows={rows} onChange={setRows} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tax (EUR)">
          <Input
            type="number"
            step="0.01"
            value={taxEuros}
            onChange={(e) => setTaxEuros(e.target.value)}
          />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : props.mode === "create" ? "Create invoice" : "Save changes"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
