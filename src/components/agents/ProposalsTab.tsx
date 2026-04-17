import Link from "next/link";
import { DraftProposalSheet } from "@/components/agents/DraftProposalSheet";
import type { Proposal } from "@/db/schema";

export function ProposalsTab({ leadId, proposals }: { leadId: string; proposals: Proposal[] }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {proposals.length} proposal{proposals.length === 1 ? "" : "s"}
        </h2>
        <DraftProposalSheet leadId={leadId} />
      </div>
      {proposals.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No proposals yet.
        </div>
      ) : (
        <ul className="divide-y rounded-md border">
          {proposals.map((p) => (
            <li key={p.id}>
              <Link href={`/leads/${leadId}/proposals/${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-muted-foreground">v{p.version} · {new Date(p.updatedAt).toLocaleString()}</div>
                </div>
                <span className="text-xs text-muted-foreground">{p.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
