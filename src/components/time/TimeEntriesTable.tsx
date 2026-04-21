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
import { deleteTimeEntry } from "@/lib/time/actions";
import { TrashIcon } from "lucide-react";

type Row = {
  id: string;
  date: string;
  hours: number;
  description: string;
  billable: number;
  clientId: string | null;
  clientName: string | null;
};

export function TimeEntriesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No time entries yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Billable</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="tabular-nums">{r.date}</TableCell>
            <TableCell className="text-right tabular-nums font-medium">
              {r.hours.toFixed(2)}
            </TableCell>
            <TableCell>{r.clientName ?? "—"}</TableCell>
            <TableCell className="max-w-[30ch] truncate">
              {r.description}
            </TableCell>
            <TableCell>
              <Badge variant={r.billable ? "secondary" : "outline"}>
                {r.billable ? "Billable" : "Non-bill"}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteTimeEntry(r.id);
                    router.refresh();
                  })
                }
                aria-label="Delete entry"
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
