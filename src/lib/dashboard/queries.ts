import "server-only";
import { db as realDb } from "@/db/client";
import { leads, clients, agentRuns } from "@/db/schema";
import { count, eq, gte, notInArray, sum } from "drizzle-orm";
import { monthlySpendUsd, startOfMonthUtc } from "@/lib/agents/spend";
import type { TestDb } from "@/db/__tests__/test-db";
import type { LeadStage } from "@/lib/enums";

type AnyDb = typeof realDb | TestDb;

const INACTIVE_STAGES: LeadStage[] = ["won", "lost"];
const FUNNEL_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal_sent"];

export type DashboardKpis = {
  activeLeads: number;
  leadsByStage: Record<(typeof FUNNEL_STAGES)[number], number>;
  pipelineValueCents: number;
  activeClients: number;
  mrrCents: number;
  agentSpendUsd: number;
  agentRunsThisMonth: number;
};

export async function getDashboardKpis(
  db: AnyDb,
  ref: Date = new Date(),
): Promise<DashboardKpis> {
  const monthStart = startOfMonthUtc(ref);

  const [
    activeLeadsRow,
    stageRows,
    pipelineRow,
    activeClientsRow,
    mrrRow,
    agentSpendUsd,
    runsRow,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(leads)
      .where(notInArray(leads.stage, INACTIVE_STAGES)),
    db
      .select({ stage: leads.stage, n: count() })
      .from(leads)
      .where(notInArray(leads.stage, INACTIVE_STAGES))
      .groupBy(leads.stage),
    db
      .select({ s: sum(leads.estimatedValueCents) })
      .from(leads)
      .where(notInArray(leads.stage, INACTIVE_STAGES)),
    db
      .select({ n: count() })
      .from(clients)
      .where(eq(clients.status, "active")),
    db
      .select({ s: sum(clients.mrrCents) })
      .from(clients)
      .where(eq(clients.status, "active")),
    monthlySpendUsd(db, ref),
    db
      .select({ n: count() })
      .from(agentRuns)
      .where(gte(agentRuns.createdAt, monthStart)),
  ]);

  const leadsByStage = Object.fromEntries(
    FUNNEL_STAGES.map((s) => [s, 0]),
  ) as DashboardKpis["leadsByStage"];
  for (const row of stageRows) {
    if ((FUNNEL_STAGES as string[]).includes(row.stage)) {
      leadsByStage[row.stage as (typeof FUNNEL_STAGES)[number]] = row.n;
    }
  }

  return {
    activeLeads: activeLeadsRow[0]?.n ?? 0,
    leadsByStage,
    pipelineValueCents: Number(pipelineRow[0]?.s ?? 0),
    activeClients: activeClientsRow[0]?.n ?? 0,
    mrrCents: Number(mrrRow[0]?.s ?? 0),
    agentSpendUsd,
    agentRunsThisMonth: runsRow[0]?.n ?? 0,
  };
}
