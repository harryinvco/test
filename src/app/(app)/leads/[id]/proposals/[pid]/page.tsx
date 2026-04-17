import { notFound } from "next/navigation";
import { getProposalById, getRunsByProposal } from "@/lib/agents/proposals/queries";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { ProposalView } from "@/components/agents/ProposalView";
import { ReviseBox } from "@/components/agents/ReviseBox";

export default async function ProposalPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id: leadId, pid } = await params;
  const proposal = await getProposalById(pid);
  if (!proposal || proposal.leadId !== leadId) notFound();
  const runs = await getRunsByProposal(pid);
  const spent = await monthlySpendUsd(db);

  return (
    <div className="space-y-6">
      <ProposalView proposal={proposal} runs={runs} monthlySpentUsd={spent} monthlyCapUsd={env.AGENT_MONTHLY_BUDGET_USD} />
      <ReviseBox proposalId={pid} />
    </div>
  );
}
