import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuros } from "@/lib/money";

type Row = {
  id: string;
  number: string;
  issueDate: string;
  dueDate: string;
  status: string;
  totalCents: number;
  clientId: string | null;
  clientName: string | null;
};

export function InvoicesTable({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No invoices yet. Create your first one.
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} className="cursor-pointer hover:bg-muted/40">
            <TableCell className="font-medium">
              <Link href={`/admin/invoices/${r.id}`} className="block">
                {r.number}
              </Link>
            </TableCell>
            <TableCell>{r.clientName ?? "—"}</TableCell>
            <TableCell className="tabular-nums">{r.issueDate}</TableCell>
            <TableCell className="tabular-nums">{r.dueDate}</TableCell>
            <TableCell>
              <StatusBadge status={r.status} />
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {formatEuros(r.totalCents)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid"
      ? "default"
      : status === "overdue"
        ? "destructive"
        : status === "sent"
          ? "secondary"
          : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}
