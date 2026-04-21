import { db } from "@/db/client";
import { env } from "@/lib/env";
import { getDashboardKpis } from "@/lib/dashboard/queries";
import { formatEuros } from "@/lib/money";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { FunnelCard } from "@/components/dashboard/FunnelCard";

export default async function DashboardPage() {
  const k = await getDashboardKpis(db);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Active leads" value={k.activeLeads} href="/leads" />
        <FunnelCard counts={k.leadsByStage} href="/leads" />
        <MetricCard
          label="Pipeline value"
          value={formatEuros(k.pipelineValueCents)}
          href="/leads"
        />
        <MetricCard
          label="Active clients"
          value={k.activeClients}
          href="/clients"
        />
        <MetricCard label="MRR" value={formatEuros(k.mrrCents)} href="/clients" />
        <MetricCard
          label="Agent spend"
          value={`$${k.agentSpendUsd.toFixed(2)}`}
          sub={`of $${env.AGENT_MONTHLY_BUDGET_USD.toFixed(2)} this month`}
          href="/agents"
        />
        <MetricCard
          label="Agent runs"
          value={k.agentRunsThisMonth}
          sub="this month"
          href="/agents"
        />
      </div>
    </div>
  );
}
