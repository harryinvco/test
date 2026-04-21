import Link from "next/link";
import { db } from "@/db/client";
import { getRevenueKpis, getRevenueByClient } from "@/lib/revenue/queries";
import { formatEuros } from "@/lib/money";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function RevenuePage() {
  const [k, byClient] = await Promise.all([
    getRevenueKpis(db),
    getRevenueByClient(db),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RevenueCard label="Revenue YTD" value={formatEuros(k.revenueYtdCents)} />
        <RevenueCard
          label="Outstanding"
          value={formatEuros(k.outstandingCents)}
          sub={`${k.outstandingCount} invoice${k.outstandingCount === 1 ? "" : "s"}`}
        />
        <RevenueCard label="Expenses YTD" value={formatEuros(k.expensesYtdCents)} />
        <RevenueCard label="Net YTD" value={formatEuros(k.netYtdCents)} />
      </div>

      <div className="space-y-2">
        <h2 className="font-heading text-base font-medium">Top clients (paid YTD)</h2>
        {byClient.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No paid invoices yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byClient.map((r, i) => (
                <TableRow key={r.clientId ?? `unassigned-${i}`}>
                  <TableCell>
                    {r.clientId ? (
                      <Link
                        href={`/clients/${r.clientId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {r.clientName ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatEuros(r.totalCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function RevenueCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card size="sm" className="gap-2 px-4">
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-heading text-2xl font-semibold tracking-tight">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}
