import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db as realDb } from "@/db/client";
import { leads, activities, proposals, agentRuns, type Lead, type Activity } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { env } from "@/lib/env";
import { priceFor, computeCost, type AnthropicUsage } from "@/lib/agents/pricing";
import { buildProposalPrompt, buildRevisePrompt, type BuiltPrompt } from "@/lib/agents/prompt";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

export type AnthropicLike = {
  messages: {
    stream: (params: {
      model: string;
      max_tokens: number;
      system: BuiltPrompt["system"];
      messages: BuiltPrompt["messages"];
    }, options?: { signal?: AbortSignal }) => AsyncIterable<unknown> & {
      finalMessage: () => Promise<{ usage: AnthropicUsage; content?: unknown }>;
    };
  };
};

const defaultAnthropic: AnthropicLike = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) as unknown as AnthropicLike;

type DraftInputT = { leadId: string; scopeBrief: string };
type ReviseInputT = { proposalId: string; instruction: string };
type RunResult = { proposalId: string; runId: string };

async function loadLeadAndActivities(db: AnyDb, leadId: string): Promise<{ lead: Lead; acts: Activity[] }> {
  const leadRows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  const lead = leadRows[0];
  if (!lead) throw new Error(`lead not found: ${leadId}`);
  const acts = await db.select().from(activities).where(eq(activities.leadId, leadId)).orderBy(desc(activities.occurredAt));
  return { lead, acts };
}

type StreamEvent = { type: string; delta?: { type: string; text?: string } };

async function* runAndPersist(
  db: AnyDb,
  anthropic: AnthropicLike,
  prompt: BuiltPrompt,
  rows: {
    proposalId: string;
    runId: string;
    updateProposalOnComplete: (body: string, now: number) => Promise<void>;
    markRunRow: (patch: Record<string, unknown>) => Promise<void>;
  },
  signal?: AbortSignal,
): AsyncGenerator<string, RunResult> {
  const buffer: string[] = [];
  try {
    const stream = anthropic.messages.stream({
      model: env.AGENT_MODEL,
      max_tokens: 4096,
      system: prompt.system,
      messages: prompt.messages,
    }, { signal });

    for await (const raw of stream) {
      const e = raw as StreamEvent;
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      if (e.type === "content_block_delta" && e.delta?.type === "text_delta" && typeof e.delta.text === "string") {
        buffer.push(e.delta.text);
        yield e.delta.text;
      }
    }

    const finalMsg = await stream.finalMessage();
    const body = buffer.join("");
    const usage = finalMsg.usage;
    const cost = computeCost(usage, priceFor(env.AGENT_MODEL));
    const completedAt = Date.now();

    await rows.updateProposalOnComplete(body, completedAt);
    await rows.markRunRow({
      outputText: body,
      status: "completed",
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      costUsd: cost,
      completedAt,
    });
    return { proposalId: rows.proposalId, runId: rows.runId };
  } catch (err: unknown) {
    const body = buffer.join("");
    const completedAt = Date.now();
    const aborted = (err as { name?: string })?.name === "AbortError";
    const message = err instanceof Error ? err.message : String(err);
    await rows.markRunRow({
      outputText: body,
      status: aborted ? "cancelled" : "failed",
      error: aborted ? null : message,
      completedAt,
    });
    throw err;
  }
}

export async function* _draftProposal(
  db: AnyDb,
  anthropic: AnthropicLike,
  input: DraftInputT,
  signal?: AbortSignal,
): AsyncGenerator<string, RunResult> {
  const { lead, acts } = await loadLeadAndActivities(db, input.leadId);
  const prompt = buildProposalPrompt(lead, acts, input.scopeBrief);

  const proposalId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const ts = Date.now();
  const title = `Proposal for ${lead.company ?? lead.name}`;

  await db.insert(proposals).values({
    id: proposalId, leadId: input.leadId,
    title, body: "", version: 1, status: "draft",
    createdAt: ts, updatedAt: ts,
  });
  await db.insert(agentRuns).values({
    id: runId, agentType: "proposal_draft",
    leadId: input.leadId, proposalId, parentRunId: null,
    inputJson: JSON.stringify({ scopeBrief: input.scopeBrief }),
    outputText: null, status: "streaming", model: env.AGENT_MODEL,
    inputTokens: null, outputTokens: null,
    cacheReadTokens: null, cacheCreationTokens: null,
    costUsd: null, error: null,
    createdAt: ts, completedAt: null,
  });

  return yield* runAndPersist(db, anthropic, prompt, {
    proposalId, runId,
    updateProposalOnComplete: async (body, now) => {
      await db.update(proposals).set({ body, updatedAt: now }).where(eq(proposals.id, proposalId));
    },
    markRunRow: async (patch) => {
      await db.update(agentRuns).set(patch).where(eq(agentRuns.id, runId));
    },
  }, signal);
}

export async function* _reviseProposal(
  db: AnyDb,
  anthropic: AnthropicLike,
  input: ReviseInputT,
  signal?: AbortSignal,
): AsyncGenerator<string, RunResult> {
  const propRows = await db.select().from(proposals).where(eq(proposals.id, input.proposalId)).limit(1);
  const proposal = propRows[0];
  if (!proposal) throw new Error(`proposal not found: ${input.proposalId}`);

  const { lead, acts } = await loadLeadAndActivities(db, proposal.leadId);

  // Find the draft run (parent) — the most recent run on this proposal.
  const [parentRun] = await db.select().from(agentRuns)
    .where(eq(agentRuns.proposalId, proposal.id))
    .orderBy(desc(agentRuns.createdAt))
    .limit(1);

  const prompt = buildRevisePrompt(lead, acts, proposal.body, input.instruction);

  const runId = crypto.randomUUID();
  const ts = Date.now();
  const newVersion = proposal.version + 1;

  await db.insert(agentRuns).values({
    id: runId, agentType: "proposal_revise",
    leadId: proposal.leadId, proposalId: proposal.id,
    parentRunId: parentRun?.id ?? null,
    inputJson: JSON.stringify({ instruction: input.instruction, fromVersion: proposal.version }),
    outputText: null, status: "streaming", model: env.AGENT_MODEL,
    inputTokens: null, outputTokens: null,
    cacheReadTokens: null, cacheCreationTokens: null,
    costUsd: null, error: null,
    createdAt: ts, completedAt: null,
  });

  return yield* runAndPersist(db, anthropic, prompt, {
    proposalId: proposal.id, runId,
    updateProposalOnComplete: async (body, now) => {
      await db.update(proposals)
        .set({ body, version: newVersion, updatedAt: now })
        .where(eq(proposals.id, proposal.id));
    },
    markRunRow: async (patch) => {
      await db.update(agentRuns).set(patch).where(eq(agentRuns.id, runId));
    },
  }, signal);
}

// Public wrappers use the real Anthropic client.
export function streamProposalDraft(input: DraftInputT, signal?: AbortSignal) {
  return _draftProposal(realDb, defaultAnthropic, input, signal);
}
export function streamProposalRevise(input: ReviseInputT, signal?: AbortSignal) {
  return _reviseProposal(realDb, defaultAnthropic, input, signal);
}
