import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { agentRuns } from "@/db/schema";
import { monthlySpendUsd, startOfMonthUtc } from "@/lib/agents/spend";

describe("startOfMonthUtc", () => {
  it("returns first-of-month 00:00 UTC for a mid-month date", () => {
    const ms = startOfMonthUtc(new Date("2026-04-17T13:00:00Z"));
    expect(new Date(ms).toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});

describe("monthlySpendUsd", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  function insertRun(createdAt: number, costUsd: number | null) {
    return db.insert(agentRuns).values({
      id: crypto.randomUUID(),
      agentType: "proposal_draft",
      leadId: null, proposalId: null, parentRunId: null,
      inputJson: "{}", outputText: null,
      status: "completed", model: "claude-sonnet-4-6",
      inputTokens: null, outputTokens: null,
      cacheReadTokens: null, cacheCreationTokens: null,
      costUsd, error: null,
      createdAt, completedAt: createdAt,
    });
  }

  it("sums costs of runs since the first of the current UTC month", async () => {
    const now = new Date("2026-04-17T13:00:00Z");
    const april1 = Date.UTC(2026, 3, 1);
    const march31 = april1 - 1;

    await insertRun(march31, 99); // excluded — prior month
    await insertRun(april1 + 1000, 1.5);
    await insertRun(april1 + 2000, 0.25);
    await insertRun(april1 + 3000, null); // null cost counted as 0

    expect(await monthlySpendUsd(db, now)).toBeCloseTo(1.75, 6);
  });

  it("returns 0 when no runs this month", async () => {
    expect(await monthlySpendUsd(db, new Date())).toBe(0);
  });
});
