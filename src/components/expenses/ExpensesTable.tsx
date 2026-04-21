"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { deleteExpense } from "@/lib/expenses/actions";
import { TrashIcon } from "lucide-react";

type Row = {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  vendor: string | null;
  notes: string | null;
  clientName: string | null;
};

export function ExpensesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No expenses yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="tabular-nums">{r.date}</TableCell>
            <TableCell>
              <Badge variant="outline">{r.category}</Badge>
            </TableCell>
            <TableCell>{r.vendor ?? "—"}</TableCell>
            <TableCell>{r.clientName ?? "—"}</TableCell>
            <TableCell className="max-w-[20ch] truncate text-muted-foreground">
              {r.notes ?? ""}
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {formatEuros(r.amountCents)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteExpense(r.id);
                    router.refresh();
                  })
                }
                aria-label="Delete expense"
              >
                <TrashIcon />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
