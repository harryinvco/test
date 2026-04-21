import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getInvoiceById } from "@/lib/invoices/queries";
import { formatEuros } from "@/lib/money";
import { StatusBadge } from "@/components/invoices/InvoicesTable";
import { InvoiceStatusActions } from "@/components/invoices/InvoiceStatusActions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Params = { id: string };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const data = await getInvoiceById(id);
  if (!data) notFound();
  const { invoice, items, client } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Invoice</div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {invoice.number}
          </h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StatusBadge status={invoice.status} />
            {client ? (
              <Link
                href={`/clients/${client.id}`}
                className="underline-offset-2 hover:underline"
              >
                {client.name}
              </Link>
            ) : (
              <span>No client</span>
            )}
            <span>· Issued {invoice.issueDate} · Due {invoice.dueDate}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {invoice.status === "draft" && (
            <Button
              render={
                <Link href={`/admin/invoices/${invoice.id}/edit`}>Edit</Link>
              }
              variant="outline"
            />
          )}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell>{it.description}</TableCell>
              <TableCell className="text-right tabular-nums">
                {it.quantity}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatEuros(it.unitPriceCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatEuros(it.totalCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <Row label="Subtotal" value={formatEuros(invoice.subtotalCents)} />
        <Row label="Tax" value={formatEuros(invoice.taxCents)} />
        <Row label="Total" value={formatEuros(invoice.totalCents)} bold />
      </div>

      {invoice.notes && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Notes</div>
          <div className="whitespace-pre-wrap text-sm">{invoice.notes}</div>
        </div>
      )}

      <div className="space-y-2">
        <InvoiceStatusActions id={invoice.id} status={invoice.status} />
        <div className="text-xs text-muted-foreground">
          {invoice.sentAt && (
            <span>Sent {new Date(invoice.sentAt).toLocaleString()} </span>
          )}
          {invoice.paidAt && (
            <span>· Paid {new Date(invoice.paidAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={bold ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={"tabular-nums " + (bold ? "font-semibold" : "")}>
        {value}
      </span>
    </div>
  );
}
