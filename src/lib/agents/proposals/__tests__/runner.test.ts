import { describe, it, expect, beforeEach, vi } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { leads, activities, proposals, agentRuns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { _draftProposal, _reviseProposal } from "@/lib/agents/proposals/runner";

function makeMockAnthropic(chunks: string[], usage = {
  input_tokens: 100, output_tokens: 200,
  cache_read_input_tokens: 0, cache_creation_input_tokens: 50,
}) {
  const finalMessage = { usage, content: [{ type: "text", text: chunks.join("") }] };
  return {
    messages: {
      stream: vi.fn(() => {
        const events = chunks.map((text) => ({
          type: "content_block_delta",
          delta: { type: "text_delta", text },
        }));
        const iter = {
          async *[Symbol.asyncIterator]() {
            for (const e of events) yield e;
            yield { type: "message_stop" };
          },
          finalMessage: async () => finalMessage,
        };
        return iter;
      }),
    },
  };
}

async function seedLead(db: TestDb) {
  const leadId = crypto.randomUUID();
  const ts = Date.now();
  await db.insert(leads).values({
    id: leadId, name: "Alice", company: "Acme", email: "a@acme.co", phone: null,
    industry: "hospitality", source: "inbound", stage: "won",
    estimatedValueCents: 500000, followUpDate: null,
    convertedAt: null, convertedClientId: null,
    createdAt: ts, updatedAt: ts,
  });
  await db.insert(activities).values({
    id: crypto.randomUUID(), leadId, type: "call",
    body: "Discovery", occurredAt: ts, createdAt: ts,
  });
  return leadId;
}

describe("_draftProposal", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("streams chunks, persists proposal + completed run, computes cost", async () => {
    const leadId = await seedLead(db);
    const anthropic = makeMockAnthropic(["# Summary\n", "Body text."]);

    const gen = _draftProposal(db, anthropic, { leadId, scopeBrief: "AI chatbot pilot" });
    const chunks: string[] = [];
    let step = await gen.next();
    while (!step.done) {
      chunks.push(step.value);
      step = await gen.next();
    }
    const { proposalId, runId } = step.value;

    expect(chunks.join("")).toBe("# Summary\nBody text.");

    const [p] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
    expect(p.body).toBe("# Summary\nBody text.");
    expect(p.leadId).toBe(leadId);
    expect(p.version).toBe(1);
    expect(p.status).toBe("draft");

    const [run] = await db.select().from(agentRuns).where(eq(agentRuns.id, runId));
    expect(run.status).toBe("completed");
    expect(run.agentType).toBe("proposal_draft");
    expect(run.inputTokens).toBe(100);
    expect(run.outputTokens).toBe(200);
    expect(run.cacheCreationTokens).toBe(50);
    expect(run.costUsd).toBeGreaterThan(0);
    expect(run.completedAt).toBeGreaterThanOrEqual(run.createdAt);
  });

  it("marks run 'failed' and preserves partial output when stream throws", async () => {
    const leadId = await seedLead(db);
    const anthropic = {
      messages: {
        stream: vi.fn(() => ({
          async *[Symbol.asyncIterator]() {
            yield { type: "content_block_delta", delta: { type: "text_delta", text: "partial" } };
            throw new Error("network boom");
          },
          finalMessage: async () => { throw new Error("never reached"); },
        })),
      },
    };

    const gen = _draftProposal(db, anthropic, { leadId, scopeBrief: "x" });
    const chunks: string[] = [];
    await expect((async () => {
      for await (const c of gen) chunks.push(c);
    })()).rejects.toThrow(/network boom/);

    expect(chunks).toEqual(["partial"]);
    const all = await db.select().from(agentRuns);
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe("failed");
    expect(all[0].outputText).toBe("partial");
    expect(all[0].error).toMatch(/network boom/);
  });

  it("throws if lead is missing (no run row created)", async () => {
    const anthropic = makeMockAnthropic(["x"]);
    const gen = _draftProposal(db, anthropic, { leadId: "does-not-exist", scopeBrief: "x" });
    await expect(gen.next()).rejects.toThrow(/lead not found/);

    expect(await db.select().from(proposals)).toEqual([]);
    expect(await db.select().from(agentRuns)).toEqual([]);
  });
});

describe("_reviseProposal", () => {
  let db: TestDb;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it("bumps version, overwrites body, links parent_run_id to the original draft", async () => {
    const leadId = await seedLead(db);

    // First run: draft. Consume the stream via for-await; the return value is
    // discarded, but the DB state gives us everything we need to identify the
    // original run.
    const anthropic1 = makeMockAnthropic(["v1 body"]);
    const draftGen = _draftProposal(db, anthropic1, { leadId, scopeBrief: "x" });
    for await (const _ of draftGen) { /* consume */ }

    const allRuns = await db.select().from(agentRuns);
    expect(allRuns).toHaveLength(1);
    const originalRunId = allRuns[0].id;
    const proposalId = allRuns[0].proposalId!;

    // Second run: revise
    const anthropic2 = makeMockAnthropic(["v2 shorter"]);
    const revGen = _reviseProposal(db, anthropic2, { proposalId, instruction: "shorter" });
    for await (const _ of revGen) { /* consume */ }

    const [p] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
    expect(p.body).toBe("v2 shorter");
    expect(p.version).toBe(2);

    const runs = await db.select().from(agentRuns).where(eq(agentRuns.proposalId, proposalId));
    expect(runs).toHaveLength(2);
    const revRun = runs.find((r) => r.agentType === "proposal_revise")!;
    expect(revRun.parentRunId).toBe(originalRunId);
  });
});
