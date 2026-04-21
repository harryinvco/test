import { db } from "@/db/client";
import { agentRuns, leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { AgentRunsTable } from "@/components/agents/AgentRunsTable";

export default async function AgentsPage() {
  const runs = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(100);
  const spent = await monthlySpendUsd(db);

  // Decorate with lead names via a simple follow-up query per run — naive for v1 (<= 100 runs).
  const withLeads = await Promise.all(runs.map(async (r) => {
    if (!r.leadId) return { ...r, leadName: null };
    const [lead] = await db.select({ name: leads.name }).from(leads).where(eq(leads.id, r.leadId)).limit(1);
    return { ...r, leadName: lead?.name ?? null };
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <div className="text-xs text-muted-foreground">This month: ${spent.toFixed(2)} of ${env.AGENT_MONTHLY_BUDGET_USD.toFixed(2)}</div>
      </div>
      <AgentRunsTable runs={withLeads} />
    </div>
  );
}
