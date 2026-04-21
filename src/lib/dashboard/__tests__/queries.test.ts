import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { leads, clients, agentRuns } from "@/db/schema";
import { getDashboardKpis } from "@/lib/dashboard/queries";
import type { LeadStage, ClientStatus } from "@/lib/enums";

describe("getDashboardKpis", () => {
  let db: TestDb;
  const NOW = new Date("2026-04-17T13:00:00Z");
  const APRIL_1 = Date.UTC(2026, 3, 1);

  beforeEach(async () => {
    db = await makeTestDb();
  });

  function insertLead(
    stage: LeadStage,
    estimatedValueCents: number | null,
    createdAt = APRIL_1 + 1000,
  ) {
    return db.insert(leads).values({
      id: crypto.randomUUID(),
      name: "Lead " + stage,
      company: null,
      email: `${crypto.randomUUID()}@test.io`,
      phone: null,
      industry: "other",
      source: "inbound",
      stage,
      estimatedValueCents,
      followUpDate: null,
      convertedAt: null,
      convertedClientId: null,
      createdAt,
      updatedAt: createdAt,
    });
  }

  function insertClient(status: ClientStatus, mrrCents: number | null) {
    return db.insert(clients).values({
      id: crypto.randomUUID(),
      name: "Client " + status,
      company: null,
      email: `${crypto.randomUUID()}@test.io`,
      phone: null,
      industry: "other",
      status,
      contractStartDate: "2026-01-01",
      mrrCents,
      fromLeadId: null,
      createdAt: APRIL_1 + 1000,
      updatedAt: APRIL_1 + 1000,
    });
  }

  function insertRun(createdAt: number, costUsd: number | null) {
    return db.insert(agentRuns).values({
      id: crypto.randomUUID(),
      agentType: "proposal_draft",
      leadId: null,
      proposalId: null,
      parentRunId: null,
      inputJson: "{}",
      outputText: null,
      status: "completed",
      model: "claude-sonnet-4-6",
      inputTokens: null,
      outputTokens: null,
      cacheReadTokens: null,
      cacheCreationTokens: null,
      costUsd,
      error: null,
      createdAt,
      completedAt: createdAt,
    });
  }

  it("returns all zeros on an empty database", async () => {
    const k = await getDashboardKpis(db, NOW);
    expect(k).toEqual({
      activeLeads: 0,
      leadsByStage: { new: 0, contacted: 0, qualified: 0, proposal_sent: 0 },
      pipelineValueCents: 0,
      activeClients: 0,
      mrrCents: 0,
      agentSpendUsd: 0,
      agentRunsThisMonth: 0,
    });
  });

  it("counts active leads and excludes won/lost", async () => {
    await insertLead("new", 100000);
    await insertLead("contacted", 200000);
    await insertLead("qualified", null);
    await insertLead("won", 500000);
    await insertLead("lost", 10000);

    const k = await getDashboardKpis(db, NOW);
    expect(k.activeLeads).toBe(3);
    expect(k.leadsByStage).toEqual({
      new: 1,
      contacted: 1,
      qualified: 1,
      proposal_sent: 0,
    });
  });

  it("sums pipeline value only for active leads, null treated as 0", async () => {
    await insertLead("new", 150000);
    await insertLead("qualified", null);
    await insertLead("proposal_sent", 250000);
    await insertLead("won", 999999);

    const k = await getDashboardKpis(db, NOW);
    expect(k.pipelineValueCents).toBe(400000);
  });

  it("counts active clients and sums MRR excluding paused/churned", async () => {
    await insertClient("active", 50000);
    await insertClient("active", 75000);
    await insertClient("active", null);
    await insertClient("paused", 100000);
    await insertClient("churned", 200000);

    const k = await getDashboardKpis(db, NOW);
    expect(k.activeClients).toBe(3);
    expect(k.mrrCents).toBe(125000);
  });

  it("counts agent runs from the start of the current UTC month", async () => {
    await insertRun(APRIL_1 - 1, 99); // March — excluded
    await insertRun(APRIL_1, 1); // edge — included
    await insertRun(APRIL_1 + 1000, 2);
    await insertRun(APRIL_1 + 2000, null);

    const k = await getDashboardKpis(db, NOW);
    expect(k.agentRunsThisMonth).toBe(3);
    expect(k.agentSpendUsd).toBeCloseTo(3, 6);
  });
});
