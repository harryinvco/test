import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AgentRun } from "@/db/schema";

type Row = AgentRun & { leadName?: string | null };

export function AgentRunsTable({ runs }: { runs: Row[] }) {
  if (runs.length === 0) {
    return <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">No agent runs yet.</div>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
              <TableCell>{r.agentType}</TableCell>
              <TableCell>
                {r.leadId && r.proposalId
                  ? <Link className="hover:underline" href={`/leads/${r.leadId}/proposals/${r.proposalId}`}>{r.leadName ?? r.leadId}</Link>
                  : r.leadName ?? "—"}
              </TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell className="text-right">${(r.costUsd ?? 0).toFixed(3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
