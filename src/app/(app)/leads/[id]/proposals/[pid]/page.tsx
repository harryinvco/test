import { notFound } from "next/navigation";
import { getProposalById, getRunsByProposal } from "@/lib/agents/proposals/queries";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { db } from "@/db/client";
import { env } from "@/lib/env";
import { ProposalView } from "@/components/agents/ProposalView";
import { ReviseBox } from "@/components/agents/ReviseBox";
import { ProposalStatusSelect } from "@/components/proposals/ProposalStatusSelect";
import type { ProposalStatus } from "@/lib/enums";

export default async function ProposalPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id: leadId, pid } = await params;
  const proposal = await getProposalById(pid);
  if (!proposal || proposal.leadId !== leadId) notFound();
  const runs = await getRunsByProposal(pid);
  const spent = await monthlySpendUsd(db);
  const terminal = proposal.status === "accepted" || proposal.status === "rejected";

  return (
    <div className="space-y-6">
      <ProposalStatusSelect
        proposalId={pid}
        status={proposal.status as ProposalStatus}
        sentAt={proposal.sentAt}
        respondedAt={proposal.respondedAt}
      />
      <ProposalView proposal={proposal} runs={runs} monthlySpentUsd={spent} monthlyCapUsd={env.AGENT_MONTHLY_BUDGET_USD} />
      {!terminal && <ReviseBox proposalId={pid} />}
    </div>
  );
}
