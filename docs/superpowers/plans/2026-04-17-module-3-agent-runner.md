# Module 3 — AI Agent Runner (Proposal Drafter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the proposal-drafter agent end-to-end inside the Innovaco Command Center: on a lead detail page, click "Draft proposal" → stream a markdown proposal grounded in the lead + activity log → save as a `proposals` record → revise in place. Infrastructure (`agent_runs` table, pricing/cost math, spend cap, `/agents` history) is generic enough to host future agents without schema churn; only the proposal agent ships in v1.

**Architecture:** Two new Drizzle tables (`proposals`, `agent_runs`). Direct `@anthropic-ai/sdk` client with prompt-cached system blocks. Next.js 16 Route Handlers (not Server Actions) for streaming, because Route Handlers return a `ReadableStream` natively. Same `_fn(db, …)` + public wrapper pattern as Module 2, extended with dependency-injected Anthropic client so runner unit tests mock the API surface. In-memory libSQL fixture (`src/db/__tests__/test-db.ts`) powers every test.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Drizzle ORM + Turso (libSQL), Auth.js v5, shadcn/ui (base-nova), Tailwind v4, React Hook Form, Vitest, pnpm. New: `@anthropic-ai/sdk`, `react-markdown`, `remark-gfm`.

**Spec:** `docs/superpowers/specs/2026-04-17-module-3-agent-runner-design.md`

---

## Pre-Task: Branch + Skill Check

- [ ] **Step 1:** Confirm we're on `feature/module-3-agent-runner` (branched from `main` after Module 2 merged):

```bash
git checkout feature/module-3-agent-runner
git status
```

Expected: clean tree, on `feature/module-3-agent-runner` with the spec already committed (`docs(m3): design spec for AI Agent Runner`).

- [ ] **Step 2:** Before writing any code in Tasks 6 (pricing) or 11 (runner), invoke the `claude-api` skill. It supplies current `@anthropic-ai/sdk` streaming API shape, current Anthropic pricing for `claude-sonnet-4-6`, and the correct `cache_control` syntax — these may have evolved since this plan was written.

---

## File Structure

```
src/
├── app/
│   ├── api/agents/proposal/
│   │   ├── draft/route.ts                       # POST, streaming (new)
│   │   └── [pid]/revise/route.ts                # POST, streaming (new)
│   └── (app)/
│       ├── agents/page.tsx                      # REPLACES placeholder
│       └── leads/[id]/
│           ├── page.tsx                         # MODIFIED — add Proposals tab
│           └── proposals/[pid]/page.tsx         # NEW — proposal view
├── components/
│   └── agents/
│       ├── AgentRunsTable.tsx                   # Shared run-history table
│       ├── DraftProposalSheet.tsx               # Drawer w/ scope-brief form
│       ├── ProposalsTab.tsx                     # Tab contents on lead detail
│       ├── ProposalView.tsx                     # Markdown + Copy + cost footer
│       ├── ReviseBox.tsx                        # Stream-consuming revise form
│       └── StreamingMarkdown.tsx                # Reads ReadableStream into md view
├── db/
│   └── schema.ts                                # MODIFIED — add proposals, agent_runs
└── lib/
    ├── agents/
    │   ├── pricing.ts                           # Cost math + pricing table
    │   ├── prompt.ts                            # buildProposalPrompt, buildRevisePrompt
    │   ├── spend.ts                             # Monthly spend + cap check
    │   ├── proposals/
    │   │   ├── schema.ts                        # Zod: DraftInput, ReviseInput, Proposal*
    │   │   ├── queries.ts                       # getProposalById, getProposalsByLead, getRecentRuns
    │   │   └── runner.ts                        # _draftProposal / _reviseProposal async generators
    │   └── __tests__/
    │       ├── pricing.test.ts
    │       ├── prompt.test.ts
    │       └── spend.test.ts
    ├── agents/proposals/__tests__/
    │   ├── schema.test.ts
    │   └── runner.test.ts
    ├── enums.ts                                 # MODIFIED — add agent enums
    └── env.ts                                   # MODIFIED — add ANTHROPIC_API_KEY etc.
```

---

## Task 1: Install Runtime Dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1:** Install deps

```bash
pnpm add @anthropic-ai/sdk react-markdown remark-gfm
```

- [ ] **Step 2:** Verify build still works

```bash
pnpm build
```

Expected: green, no new warnings beyond Module 2 baseline.

- [ ] **Step 3:** Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(m3): add @anthropic-ai/sdk, react-markdown, remark-gfm"
```

---

## Task 2: Extend Enums (TDD)

**Files:**
- Modify: `src/lib/enums.ts`
- Modify: `src/lib/__tests__/enums.test.ts`

- [ ] **Step 1:** Add failing assertions to `src/lib/__tests__/enums.test.ts`:

```ts
import { AGENT_TYPE, AGENT_STATUS, PROPOSAL_STATUS } from "@/lib/enums";

describe("agent enums", () => {
  it("AGENT_TYPE covers Module 3 v1 types", () => {
    expect(AGENT_TYPE).toEqual(["proposal_draft", "proposal_revise"]);
  });
  it("AGENT_STATUS covers the 4 terminal-ish states", () => {
    expect(AGENT_STATUS).toEqual(["streaming", "completed", "failed", "cancelled"]);
  });
  it("PROPOSAL_STATUS has only 'draft' in v1", () => {
    expect(PROPOSAL_STATUS).toEqual(["draft"]);
  });
});
```

Add this `describe` block at the bottom of the existing file; don't touch the existing blocks.

- [ ] **Step 2:** Run, expect fail

```bash
pnpm test -- src/lib/__tests__/enums.test.ts
```

Expected: FAIL (imports undefined).

- [ ] **Step 3:** Extend `src/lib/enums.ts`. Append:

```ts
export const AGENT_TYPE = ["proposal_draft", "proposal_revise"] as const;
export const AGENT_STATUS = ["streaming", "completed", "failed", "cancelled"] as const;
export const PROPOSAL_STATUS = ["draft"] as const;

export type AgentType = typeof AGENT_TYPE[number];
export type AgentStatus = typeof AGENT_STATUS[number];
export type ProposalStatus = typeof PROPOSAL_STATUS[number];
```

- [ ] **Step 4:** Run test, expect pass

```bash
pnpm test -- src/lib/__tests__/enums.test.ts
```

- [ ] **Step 5:** Commit

```bash
git add src/lib/enums.ts src/lib/__tests__/enums.test.ts
git commit -m "feat(m3): agent type/status and proposal status enums"
```

---

## Task 3: Extend Env Schema (TDD)

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/__tests__/env.test.ts`
- Modify: `.env.example`

- [ ] **Step 1:** Append failing tests to `src/lib/__tests__/env.test.ts`:

```ts
describe("agent env vars", () => {
  const baseValid = {
    AUTH_SECRET: "x".repeat(32),
    ADMIN_EMAIL: "a@b.co",
    ADMIN_PASSWORD_HASH: "h",
    TURSO_DATABASE_URL: "libsql://x.turso.io",
    TURSO_AUTH_TOKEN: "t",
    ANTHROPIC_API_KEY: "sk-ant-xxxxxxxxxxxxxxxxxxxx",
  };

  it("requires ANTHROPIC_API_KEY", () => {
    const { ANTHROPIC_API_KEY: _, ...rest } = baseValid;
    expect(() => parseEnv(rest)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("defaults AGENT_MODEL to claude-sonnet-4-6", () => {
    const env = parseEnv(baseValid);
    expect(env.AGENT_MODEL).toBe("claude-sonnet-4-6");
  });

  it("defaults AGENT_MONTHLY_BUDGET_USD to 50", () => {
    const env = parseEnv(baseValid);
    expect(env.AGENT_MONTHLY_BUDGET_USD).toBe(50);
  });

  it("coerces AGENT_MONTHLY_BUDGET_USD from string (since env vars are strings)", () => {
    const env = parseEnv({ ...baseValid, AGENT_MONTHLY_BUDGET_USD: "25" });
    expect(env.AGENT_MONTHLY_BUDGET_USD).toBe(25);
  });
});
```

Remove the `// eslint-disable` or existing unused-var warning only if it's in the way; do not rewrite the file.

- [ ] **Step 2:** Run, expect fail.

- [ ] **Step 3:** Edit `src/lib/env.ts`. Replace the schema object:

```ts
const EnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  TURSO_DATABASE_URL: z.string().url("TURSO_DATABASE_URL must be a URL"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  AGENT_MODEL: z.string().default("claude-sonnet-4-6"),
  AGENT_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(50),
});
```

- [ ] **Step 4:** Update `.env.example`:

```
AUTH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
ANTHROPIC_API_KEY=
# Optional — defaults shown
# AGENT_MODEL=claude-sonnet-4-6
# AGENT_MONTHLY_BUDGET_USD=50
```

- [ ] **Step 5:** Run tests, expect pass

```bash
pnpm test -- src/lib/__tests__/env.test.ts
```

- [ ] **Step 6:** Commit

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts .env.example
git commit -m "feat(m3): env schema for ANTHROPIC_API_KEY, AGENT_MODEL, AGENT_MONTHLY_BUDGET_USD"
```

- [ ] **Step 7:** Add your real key locally

Update `.env.local` with `ANTHROPIC_API_KEY=<your key>`. This file is gitignored; do not stage it. (Without this, the dev server will refuse to start because `env.ts` parses at import time.)

---

## Task 4: Drizzle Schema — proposals + agent_runs

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1:** Append to `src/db/schema.ts`:

```ts
export const proposals = sqliteTable(
  "proposals",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("draft"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    leadCreatedIdx: index("proposals_lead_created_idx").on(t.leadId, sql`${t.createdAt} DESC`),
  }),
);

export const agentRuns = sqliteTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    agentType: text("agent_type").notNull(),
    leadId: text("lead_id").references(() => leads.id, { onDelete: "set null" }),
    proposalId: text("proposal_id").references(() => proposals.id, { onDelete: "set null" }),
    parentRunId: text("parent_run_id"),
    inputJson: text("input_json").notNull(),
    outputText: text("output_text"),
    status: text("status").notNull().default("streaming"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cacheReadTokens: integer("cache_read_tokens"),
    cacheCreationTokens: integer("cache_creation_tokens"),
    costUsd: real("cost_usd"),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (t) => ({
    createdIdx: index("agent_runs_created_idx").on(sql`${t.createdAt} DESC`),
    leadCreatedIdx: index("agent_runs_lead_created_idx").on(t.leadId, sql`${t.createdAt} DESC`),
  }),
);

export type Proposal = typeof proposals.$inferSelect;
export type ProposalInsert = typeof proposals.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type AgentRunInsert = typeof agentRuns.$inferInsert;
```

Add `real` to the existing `drizzle-orm/sqlite-core` import at the top of the file:

```ts
import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core";
```

Note: SQLite doesn't enforce `ON DELETE SET NULL` for self-references like `parentRunId` without a pragma; we intentionally omit the FK on `parentRunId` and only use it as a soft link. This matches the spec's audit-trail intent (history survives even if a specific parent row is ever manually deleted — which we never do in v1).

- [ ] **Step 2:** Generate migration

```bash
pnpm db:generate
```

Expected: `drizzle/0002_*.sql` and `drizzle/meta/0002_snapshot.json` appear.

- [ ] **Step 3:** Inspect the generated migration and confirm:
  - `CREATE TABLE proposals` with `lead_id` FK `ON DELETE cascade`
  - `CREATE TABLE agent_runs` with `lead_id` and `proposal_id` FKs `ON DELETE set null`
  - Both indexes present
  - No other tables modified

If anything is wrong, edit `src/db/schema.ts` and re-run `pnpm db:generate` — delete the stale `0002_*.sql` + snapshot + journal entry first.

- [ ] **Step 4:** Run tests — the in-memory fixture will pick up the new migration file:

```bash
pnpm test
```

Expected: 49 previous tests still pass; no new tests yet.

- [ ] **Step 5:** Commit

```bash
git add src/db/schema.ts drizzle/0002_*.sql drizzle/meta/0002_snapshot.json drizzle/meta/_journal.json
git commit -m "feat(m3): drizzle schema for proposals + agent_runs"
```

---

## Task 5: Pricing Module (TDD)

**Files:**
- Create: `src/lib/agents/pricing.ts`
- Create: `src/lib/agents/__tests__/pricing.test.ts`

- [ ] **Step 1:** Write failing test at `src/lib/agents/__tests__/pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { priceFor, computeCost, type AnthropicUsage } from "@/lib/agents/pricing";

describe("priceFor", () => {
  it("returns the Sonnet 4.6 rate card", () => {
    const p = priceFor("claude-sonnet-4-6");
    expect(p).toEqual({ input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 });
  });
  it("falls back to sonnet pricing for unknown model", () => {
    const p = priceFor("some-future-model");
    expect(p.input).toBeGreaterThan(0);
  });
});

describe("computeCost", () => {
  const sonnet = { input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 };

  it("sums all four token buckets against the rate card", () => {
    const usage: AnthropicUsage = {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    };
    // 3 + 15 + 0.3 + 3.75 = 22.05
    expect(computeCost(usage, sonnet)).toBeCloseTo(22.05, 4);
  });

  it("handles missing cache counters (non-cached call)", () => {
    const usage: AnthropicUsage = { input_tokens: 1000, output_tokens: 500 };
    // (1000 * 3 + 500 * 15) / 1e6 = 0.0105
    expect(computeCost(usage, sonnet)).toBeCloseTo(0.0105, 6);
  });
});
```

- [ ] **Step 2:** Run, expect fail.

- [ ] **Step 3:** Implement `src/lib/agents/pricing.ts`:

```ts
// USD per million tokens. Verify against current Anthropic pricing via claude-api skill at implementation time.
export type ModelPricing = {
  input: number;
  cacheCreation: number;
  cacheRead: number;
  output: number;
};

const RATES: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": { input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 },
};

const FALLBACK: ModelPricing = RATES["claude-sonnet-4-6"];

export function priceFor(model: string): ModelPricing {
  return RATES[model] ?? FALLBACK;
}

export type AnthropicUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function computeCost(usage: AnthropicUsage, rate: ModelPricing): number {
  const inputT = usage.input_tokens ?? 0;
  const outputT = usage.output_tokens ?? 0;
  const cacheReadT = usage.cache_read_input_tokens ?? 0;
  const cacheCreationT = usage.cache_creation_input_tokens ?? 0;
  return (
    (inputT * rate.input +
      cacheCreationT * rate.cacheCreation +
      cacheReadT * rate.cacheRead +
      outputT * rate.output) /
    1_000_000
  );
}
```

- [ ] **Step 4:** Run tests, expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/agents/pricing.ts src/lib/agents/__tests__/pricing.test.ts
git commit -m "feat(m3): model pricing table + cost math"
```

---

## Task 6: Prompt Builder (TDD)

**Files:**
- Create: `src/lib/agents/prompt.ts`
- Create: `src/lib/agents/__tests__/prompt.test.ts`

- [ ] **Step 1:** Failing test at `src/lib/agents/__tests__/prompt.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildProposalPrompt, buildRevisePrompt } from "@/lib/agents/prompt";
import type { Lead, Activity } from "@/db/schema";

const lead: Lead = {
  id: "l1", name: "Alice", company: "Acme", email: "a@acme.co", phone: null,
  industry: "hospitality", source: "inbound", stage: "won",
  estimatedValueCents: 500_000, followUpDate: null,
  convertedAt: null, convertedClientId: null,
  createdAt: 1_000_000, updatedAt: 1_000_000,
};
const activities: Activity[] = [
  { id: "a1", leadId: "l1", type: "call", body: "Discovery call. 3 locations.", occurredAt: 1_100_000, createdAt: 1_100_000 },
  { id: "a2", leadId: "l1", type: "note", body: "Wants a pilot.", occurredAt: 1_200_000, createdAt: 1_200_000 },
];

describe("buildProposalPrompt", () => {
  it("emits three cache_control system blocks (preamble, lead, activities)", () => {
    const p = buildProposalPrompt(lead, activities, "AI chatbot pilot, 3 months, €8k");
    expect(p.system).toHaveLength(3);
    for (const block of p.system) {
      expect(block.type).toBe("text");
      expect(block.cache_control).toEqual({ type: "ephemeral" });
    }
    // Preamble mentions Innovaco + output sections
    expect(p.system[0].text).toMatch(/Innovaco/);
    expect(p.system[0].text).toMatch(/Summary/);
    expect(p.system[0].text).toMatch(/Pricing/);
    // Lead block contains company and euro value
    expect(p.system[1].text).toMatch(/Acme/);
    expect(p.system[1].text).toMatch(/5000/); // 500_000 cents = €5,000
    // Activity block contains both activities chronologically
    expect(p.system[2].text).toMatch(/Discovery call/);
    expect(p.system[2].text).toMatch(/Wants a pilot/);
    expect(p.system[2].text.indexOf("Discovery")).toBeLessThan(p.system[2].text.indexOf("Wants a pilot"));
  });

  it("user message contains the scope brief verbatim", () => {
    const p = buildProposalPrompt(lead, [], "scope X");
    expect(p.messages).toEqual([{ role: "user", content: "scope X" }]);
  });
});

describe("buildRevisePrompt", () => {
  it("system blocks match the draft prompt shape", () => {
    const p = buildRevisePrompt(lead, activities, "previous draft body", "make it shorter");
    expect(p.system).toHaveLength(3);
  });

  it("user message embeds previous draft + instruction", () => {
    const p = buildRevisePrompt(lead, [], "PREV", "SHORTER");
    expect(p.messages).toHaveLength(1);
    expect(p.messages[0].content).toMatch(/PREV/);
    expect(p.messages[0].content).toMatch(/SHORTER/);
  });
});
```

- [ ] **Step 2:** Run, expect fail.

- [ ] **Step 3:** Implement `src/lib/agents/prompt.ts`:

```ts
import type { Lead, Activity } from "@/db/schema";
import { formatEuros } from "@/lib/money";

type TextBlock = {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
};

export type BuiltPrompt = {
  system: TextBlock[];
  messages: Array<{ role: "user"; content: string }>;
};

const PREAMBLE = `You are a proposal drafter for **Innovaco**, a digital transformation agency based in Cyprus offering AI chatbots, consulting, development, implementation, and training. Industry focus: hospitality, real estate, insurance, healthcare, retail.

Output rules:
- Markdown only. No preamble or afterword.
- Use these exact H2 section headings in this order: Summary, Background, Proposed Solution, Deliverables, Timeline, Pricing, Terms.
- British English. Concise, direct, warm-professional tone.
- Currency: euros (€).
- If facts are unknown, write a short plausible placeholder the reader can edit — never fabricate specifics like dates or client quotes.`;

function block(text: string): TextBlock {
  return { type: "text", text, cache_control: { type: "ephemeral" } };
}

function leadSnapshot(lead: Lead): string {
  const value = formatEuros(lead.estimatedValueCents);
  return [
    `## Lead snapshot`,
    `- Name: ${lead.name}`,
    `- Company: ${lead.company ?? "—"}`,
    `- Email: ${lead.email}`,
    `- Industry: ${lead.industry.replace("_", " ")}`,
    `- Source: ${lead.source}`,
    `- Stage: ${lead.stage}`,
    `- Estimated value: ${value}`,
    lead.followUpDate ? `- Follow-up date: ${lead.followUpDate}` : null,
  ].filter(Boolean).join("\n");
}

function activityLog(activities: Activity[]): string {
  if (activities.length === 0) return "## Activity log\n\n_(no recorded activities)_";
  const sorted = [...activities].sort((a, b) => a.occurredAt - b.occurredAt);
  const lines = sorted.map((a) => {
    const when = new Date(a.occurredAt).toISOString().replace("T", " ").slice(0, 16);
    return `- **${a.type}** — ${when}\n  ${a.body.replace(/\n/g, "\n  ")}`;
  });
  return `## Activity log\n\n${lines.join("\n")}`;
}

export function buildProposalPrompt(lead: Lead, activities: Activity[], scopeBrief: string): BuiltPrompt {
  return {
    system: [block(PREAMBLE), block(leadSnapshot(lead)), block(activityLog(activities))],
    messages: [{ role: "user", content: scopeBrief }],
  };
}

export function buildRevisePrompt(lead: Lead, activities: Activity[], previousBody: string, instruction: string): BuiltPrompt {
  return {
    system: [block(PREAMBLE), block(leadSnapshot(lead)), block(activityLog(activities))],
    messages: [
      {
        role: "user",
        content: `Here is the current proposal draft. Revise it per the instruction that follows. Keep the same seven H2 sections, markdown-only, no preamble.\n\n--- CURRENT DRAFT ---\n${previousBody}\n--- END DRAFT ---\n\nRevision instruction: ${instruction}`,
      },
    ],
  };
}
```

- [ ] **Step 4:** Run tests, expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/agents/prompt.ts src/lib/agents/__tests__/prompt.test.ts
git commit -m "feat(m3): prompt builder for draft + revise"
```

---

## Task 7: Proposal Zod Schemas (TDD)

**Files:**
- Create: `src/lib/agents/proposals/schema.ts`
- Create: `src/lib/agents/proposals/__tests__/schema.test.ts`

- [ ] **Step 1:** Failing test:

```ts
import { describe, it, expect } from "vitest";
import { DraftInput, ReviseInput } from "@/lib/agents/proposals/schema";

describe("DraftInput", () => {
  it("requires leadId and non-empty scopeBrief", () => {
    expect(DraftInput.safeParse({ leadId: "l1", scopeBrief: "x" }).success).toBe(true);
    expect(DraftInput.safeParse({ leadId: "l1", scopeBrief: "" }).success).toBe(false);
    expect(DraftInput.safeParse({ leadId: "", scopeBrief: "x" }).success).toBe(false);
    expect(DraftInput.safeParse({ leadId: "l1" }).success).toBe(false);
  });

  it("caps scopeBrief at 2000 chars", () => {
    expect(DraftInput.safeParse({ leadId: "l1", scopeBrief: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("ReviseInput", () => {
  it("requires non-empty instruction", () => {
    expect(ReviseInput.safeParse({ instruction: "shorter" }).success).toBe(true);
    expect(ReviseInput.safeParse({ instruction: "" }).success).toBe(false);
  });

  it("caps instruction at 1000 chars", () => {
    expect(ReviseInput.safeParse({ instruction: "x".repeat(1001) }).success).toBe(false);
  });
});
```

- [ ] **Step 2:** Run, expect fail.

- [ ] **Step 3:** Implement `src/lib/agents/proposals/schema.ts`:

```ts
import { z } from "zod";

export const DraftInput = z.object({
  leadId: z.string().min(1),
  scopeBrief: z.string().min(1).max(2000),
});

export const ReviseInput = z.object({
  instruction: z.string().min(1).max(1000),
});

export type DraftInputT = z.infer<typeof DraftInput>;
export type ReviseInputT = z.infer<typeof ReviseInput>;
```

- [ ] **Step 4:** Run, expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/agents/proposals/schema.ts src/lib/agents/proposals/__tests__/schema.test.ts
git commit -m "feat(m3): proposal draft/revise input schemas"
```

---

## Task 8: Proposal Queries

**Files:**
- Create: `src/lib/agents/proposals/queries.ts`

No tests — these are trivial Drizzle wrappers following the Module 2 pattern (same rationale used for `src/lib/leads/queries.ts`).

- [ ] **Step 1:** Create `src/lib/agents/proposals/queries.ts`:

```ts
import "server-only";
import { db } from "@/db/client";
import { proposals, agentRuns } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getProposalById(id: string) {
  const rows = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getProposalsByLead(leadId: string) {
  return db.select().from(proposals).where(eq(proposals.leadId, leadId)).orderBy(desc(proposals.createdAt));
}

export async function getRunsByProposal(proposalId: string) {
  return db.select().from(agentRuns).where(eq(agentRuns.proposalId, proposalId)).orderBy(desc(agentRuns.createdAt));
}

export async function getRecentRuns(limit = 50) {
  return db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(limit);
}
```

- [ ] **Step 2:** Commit

```bash
git add src/lib/agents/proposals/queries.ts
git commit -m "feat(m3): proposal + agent_runs read queries"
```

---

## Task 9: Monthly Spend Helper (TDD)

**Files:**
- Create: `src/lib/agents/spend.ts`
- Create: `src/lib/agents/__tests__/spend.test.ts`

- [ ] **Step 1:** Failing test:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
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
```

- [ ] **Step 2:** Run, expect fail.

- [ ] **Step 3:** Implement `src/lib/agents/spend.ts`:

```ts
import "server-only";
import { db as realDb } from "@/db/client";
import { agentRuns } from "@/db/schema";
import { gte } from "drizzle-orm";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

export function startOfMonthUtc(ref: Date = new Date()): number {
  return Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1);
}

export async function monthlySpendUsd(db: AnyDb, ref: Date = new Date()): Promise<number> {
  const start = startOfMonthUtc(ref);
  const rows = await db.select({ c: agentRuns.costUsd })
    .from(agentRuns)
    .where(gte(agentRuns.createdAt, start));
  return rows.reduce((total, r) => total + (r.c ?? 0), 0);
}
```

- [ ] **Step 4:** Run, expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/agents/spend.ts src/lib/agents/__tests__/spend.test.ts
git commit -m "feat(m3): monthly spend helper for cap enforcement"
```

---

## Task 10: Runner — Draft (TDD with mocked Anthropic)

**Files:**
- Create: `src/lib/agents/proposals/runner.ts`
- Create: `src/lib/agents/proposals/__tests__/runner.test.ts`

This task implements `_draftProposal`. The runner is an **async generator**: it yields text chunks (so the Route Handler can stream them to the client) and returns `{ proposalId, runId }` on completion. It owns all DB writes.

**Before coding:** Invoke the `claude-api` skill to confirm the current `@anthropic-ai/sdk` streaming API. The code below is based on the streaming API as of 2026-01 (`client.messages.stream(params)` returns an AsyncIterable of events + a `finalMessage()` method). If the SDK has changed, update the runner and this test's mock to match the current shape before proceeding.

- [ ] **Step 1:** Failing test at `src/lib/agents/proposals/__tests__/runner.test.ts`:

```ts
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
    let result: Awaited<ReturnType<typeof gen.next>> = await gen.next();
    while (!result.done) {
      chunks.push(result.value);
      result = await gen.next();
    }
    const { proposalId, runId } = result.value;

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
```

**Note on async-generator return values in tests.** `for await` does not expose the return value. If you need both chunks and the terminal return, use manual iteration:

```ts
const gen = _draftProposal(...);
const chunks: string[] = [];
let step = await gen.next();
while (!step.done) { chunks.push(step.value); step = await gen.next(); }
const { proposalId, runId } = step.value;
```

The `_reviseProposal` test uses the side-effect state (rows in DB) rather than the return value, so the simpler `for await` loop is fine there.

- [ ] **Step 2:** Run tests, expect fail.

- [ ] **Step 3:** Implement `src/lib/agents/proposals/runner.ts`:

```ts
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

  yield* runAndPersist(db, anthropic, prompt, {
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

  // Find the draft run (parent) — the most recent proposal_draft on this proposal.
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

  yield* runAndPersist(db, anthropic, prompt, {
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
```

- [ ] **Step 4:** Run tests, expect pass.

```bash
pnpm test -- src/lib/agents/proposals/__tests__/runner.test.ts
```

If the test "streams chunks, persists proposal + completed run" fails because of an SDK-shape mismatch, check the actual `@anthropic-ai/sdk` streaming API via the `claude-api` skill and adjust `AnthropicLike` + both the real code and the mock to match.

- [ ] **Step 5:** Commit

```bash
git add src/lib/agents/proposals/runner.ts src/lib/agents/proposals/__tests__/runner.test.ts
git commit -m "feat(m3): proposal runner (draft + revise) as streaming async generators"
```

---

## Task 11: Draft Route Handler

**Files:**
- Create: `src/app/api/agents/proposal/draft/route.ts`

Route handler behavior:
1. `auth()` guard (401 if no session).
2. Zod-validate body with `DraftInput`.
3. Check monthly cap — 429 if over.
4. Begin async generator; return a streaming `Response` whose body is:
   - First line: JSON `{ proposalId, runId }\n` — the client reads exactly one line then switches to markdown-accumulation mode.
   - Subsequent content: raw text deltas (no framing).

On abort (`req.signal`), the runner marks the row `cancelled`.

- [ ] **Step 1:** Create the route file:

```ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { DraftInput } from "@/lib/agents/proposals/schema";
import { streamProposalDraft } from "@/lib/agents/proposals/runner";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = DraftInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  }

  const spent = await monthlySpendUsd(db);
  if (spent >= env.AGENT_MONTHLY_BUDGET_USD) {
    return Response.json(
      { error: "monthly_cap", spent_usd: spent, cap_usd: env.AGENT_MONTHLY_BUDGET_USD },
      { status: 429 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const gen = streamProposalDraft(parsed.data, req.signal);
      let idsEmitted = false;

      try {
        let step = await gen.next();
        while (!step.done) {
          // Emit the id preamble exactly once, on the first delta.
          if (!idsEmitted) {
            // We don't know ids until after the runner has written rows,
            // but the runner writes rows BEFORE yielding — so we can peek.
            // For simplicity, we forward text first and send ids as a trailer. See below.
          }
          controller.enqueue(encoder.encode(step.value));
          step = await gen.next();
        }
        // Emit trailer: a marker line + JSON with ids.
        const ids = step.value;
        controller.enqueue(encoder.encode(`\n\u0000__AGENT_TRAILER__${JSON.stringify(ids)}`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        controller.enqueue(encoder.encode(`\n\u0000__AGENT_ERROR__${JSON.stringify({ error: msg })}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
```

**Framing rationale.** Embedding ids as a trailer is simpler than negotiating HTTP headers mid-stream. The `\u0000__AGENT_TRAILER__` and `\u0000__AGENT_ERROR__` sentinels are NUL-prefixed so they cannot appear inside legitimate markdown content. Client parses accordingly in Task 13 (`StreamingMarkdown`).

- [ ] **Step 2:** Smoke-test by build only:

```bash
pnpm build
```

Expected: builds cleanly; route appears in the routes table as `ƒ /api/agents/proposal/draft`.

- [ ] **Step 3:** Commit

```bash
git add src/app/api/agents/proposal/draft/route.ts
git commit -m "feat(m3): POST /api/agents/proposal/draft (streaming)"
```

---

## Task 12: Revise Route Handler

**Files:**
- Create: `src/app/api/agents/proposal/[pid]/revise/route.ts`

- [ ] **Step 1:** Create route:

```ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { ReviseInput } from "@/lib/agents/proposals/schema";
import { streamProposalRevise } from "@/lib/agents/proposals/runner";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ pid: string }> }) {
  const session = await auth();
  if (!session?.user?.email) return new Response("UNAUTHORIZED", { status: 401 });

  const { pid } = await params;
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = ReviseInput.safeParse(body);
  if (!parsed.success) return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });

  const spent = await monthlySpendUsd(db);
  if (spent >= env.AGENT_MONTHLY_BUDGET_USD) {
    return Response.json(
      { error: "monthly_cap", spent_usd: spent, cap_usd: env.AGENT_MONTHLY_BUDGET_USD },
      { status: 429 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const gen = streamProposalRevise({ proposalId: pid, instruction: parsed.data.instruction }, req.signal);
        let step = await gen.next();
        while (!step.done) {
          controller.enqueue(encoder.encode(step.value));
          step = await gen.next();
        }
        controller.enqueue(encoder.encode(`\n\u0000__AGENT_TRAILER__${JSON.stringify(step.value)}`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        controller.enqueue(encoder.encode(`\n\u0000__AGENT_ERROR__${JSON.stringify({ error: msg })}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
```

- [ ] **Step 2:** Build

```bash
pnpm build
```

- [ ] **Step 3:** Commit

```bash
git add src/app/api/agents/proposal/[pid]/revise/route.ts
git commit -m "feat(m3): POST /api/agents/proposal/[pid]/revise (streaming)"
```

---

## Task 13: Streaming Markdown Client Component

**Files:**
- Create: `src/components/agents/StreamingMarkdown.tsx`

This component is responsible for:
- Starting a `fetch()` POST against a streaming endpoint.
- Parsing the response: raw text deltas until the NUL sentinel; then JSON trailer with `{ proposalId, runId }` or `{ error }`.
- Rendering the accumulating body as markdown live via `react-markdown`.
- Calling a caller-supplied `onComplete` with the final body + ids.

- [ ] **Step 1:** Create component:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TRAILER = "\u0000__AGENT_TRAILER__";
const ERRMARK = "\u0000__AGENT_ERROR__";

type Result = { proposalId: string; runId: string };

type Props = {
  endpoint: string;
  requestBody: unknown;
  initialBody?: string;
  onComplete?: (body: string, result: Result) => void;
  onError?: (message: string, partialBody: string) => void;
};

export function StreamingMarkdown({ endpoint, requestBody, initialBody = "", onComplete, onError }: Props) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    (async () => {
      setStatus("streaming");
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(requestBody),
          signal: ac.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({ error: res.statusText }));
          setErrorMsg(payload.error ?? res.statusText);
          setStatus("error");
          onError?.(payload.error ?? res.statusText, "");
          return;
        }
        const reader = res.body!.getReader();
        const dec = new TextDecoder();
        let acc = "";
        let visible = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });

          const trailerAt = acc.indexOf(TRAILER);
          const errorAt = acc.indexOf(ERRMARK);
          const markerAt = [trailerAt, errorAt].filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? -1;

          if (markerAt === -1) {
            visible = acc;
            setBody(visible);
          } else {
            visible = acc.slice(0, markerAt).replace(/\n$/, "");
            setBody(visible);
          }
        }

        // Final parse (acc complete after reader.done).
        const trailerAt = acc.indexOf(TRAILER);
        const errorAt = acc.indexOf(ERRMARK);

        if (trailerAt >= 0) {
          const jsonStr = acc.slice(trailerAt + TRAILER.length);
          let result: Result | null = null;
          try { result = JSON.parse(jsonStr); } catch { /* ignore */ }
          const finalBody = acc.slice(0, trailerAt).replace(/\n$/, "");
          setBody(finalBody);
          setStatus("done");
          if (result) onComplete?.(finalBody, result);
        } else if (errorAt >= 0) {
          const jsonStr = acc.slice(errorAt + ERRMARK.length);
          let payload: { error?: string } = {};
          try { payload = JSON.parse(jsonStr); } catch { /* ignore */ }
          const partial = acc.slice(0, errorAt).replace(/\n$/, "");
          setBody(partial);
          setErrorMsg(payload.error ?? "stream error");
          setStatus("error");
          onError?.(payload.error ?? "stream error", partial);
        } else {
          setStatus("done");
          onComplete?.(acc, { proposalId: "", runId: "" });
        }
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "network error";
        setErrorMsg(msg);
        setStatus("error");
        onError?.(msg, body);
      }
    })();
    return () => ac.abort();
    // Body deliberately NOT in deps — we only want a single stream per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  return (
    <div className="space-y-3">
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body || "_streaming…_"}</ReactMarkdown>
      </div>
      {status === "streaming" && <div className="text-xs text-muted-foreground">Generating…</div>}
      {status === "error" && <div className="text-xs text-red-600">Error: {errorMsg}</div>}
    </div>
  );
}
```

If the project doesn't already have `@tailwindcss/typography`, `prose` classes are no-ops — the markdown will still render, just with basic defaults. That is acceptable for v1; revisit in polish.

- [ ] **Step 2:** Verify build

```bash
pnpm build
```

- [ ] **Step 3:** Commit

```bash
git add src/components/agents/StreamingMarkdown.tsx
git commit -m "feat(m3): StreamingMarkdown client component (fetch + trailer-framed stream)"
```

---

## Task 14: Draft Proposal Sheet + Proposals Tab + Lead Detail Wiring

**Files:**
- Create: `src/components/agents/DraftProposalSheet.tsx`
- Create: `src/components/agents/ProposalsTab.tsx`
- Modify: `src/app/(app)/leads/[id]/page.tsx`
- Modify: `src/components/leads/LeadDetailTabs.tsx` — extend to take an optional `proposals` tab.

- [ ] **Step 1:** Update `LeadDetailTabs.tsx` to accept a third tab:

```tsx
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LeadDetailTabs({
  details,
  activity,
  proposals,
}: {
  details: React.ReactNode;
  activity: React.ReactNode;
  proposals?: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="details" className="space-y-4">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        {proposals && <TabsTrigger value="proposals">Proposals</TabsTrigger>}
      </TabsList>
      <TabsContent value="details">{details}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
      {proposals && <TabsContent value="proposals">{proposals}</TabsContent>}
    </Tabs>
  );
}
```

- [ ] **Step 2:** Create `DraftProposalSheet.tsx`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function DraftProposalSheet({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scopeBrief, setScopeBrief] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const brief = scopeBrief.trim();
    if (!brief) return;
    startTransition(async () => {
      // Create-and-redirect: we kick off the stream from the NEXT page using the
      // saved brief. Simpler UX: save brief in sessionStorage, navigate, the
      // proposal page reads + starts streaming.
      const key = `m3:draft:${leadId}`;
      sessionStorage.setItem(key, brief);
      setOpen(false);
      router.push(`/leads/${leadId}/proposals/new?k=${encodeURIComponent(key)}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button>Draft proposal</Button>} />
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Draft proposal</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 py-4">
          <Label>Scope brief</Label>
          <Textarea
            rows={8}
            value={scopeBrief}
            onChange={(e) => setScopeBrief(e.target.value)}
            placeholder="e.g. AI chatbot for their front desk, 3-month pilot, €8k. Suggest discovery → build → launch phases."
            maxLength={2000}
          />
          <div className="text-xs text-muted-foreground">{scopeBrief.length}/2000</div>
          <Button onClick={submit} disabled={pending || !scopeBrief.trim()}>
            {pending ? "Opening…" : "Generate"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 3:** Create `ProposalsTab.tsx`:

```tsx
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
```

- [ ] **Step 4:** Modify `src/app/(app)/leads/[id]/page.tsx` to load proposals and pass a third tab. Make three edits:

  1. Add imports near the top:

```tsx
import { getProposalsByLead } from "@/lib/agents/proposals/queries";
import { ProposalsTab } from "@/components/agents/ProposalsTab";
```

  2. Extend the existing `Promise.all` to also fetch proposals:

```tsx
const [activities, convertedClient, proposalList] = await Promise.all([
  getActivitiesByLead(lead.id),
  lead.convertedClientId ? getClientById(lead.convertedClientId) : Promise.resolve(null),
  getProposalsByLead(lead.id),
]);
```

  3. Below the existing `activity` JSX block, add:

```tsx
const proposals = <ProposalsTab leadId={lead.id} proposals={proposalList} />;
```

  4. Update the `LeadDetailTabs` invocation at the bottom:

```tsx
<LeadDetailTabs details={details} activity={activity} proposals={proposals} />
```

- [ ] **Step 5:** Build + verify

```bash
pnpm build
```

- [ ] **Step 6:** Commit

```bash
git add src/components/agents/ src/app/\(app\)/leads/\[id\]/page.tsx src/components/leads/LeadDetailTabs.tsx
git commit -m "feat(m3): Proposals tab + Draft sheet on lead detail"
```

---

## Task 15: Proposal New + View Pages

Two pages:
- `/leads/[id]/proposals/new?k=<sessionStorageKey>` — reads the scope brief from sessionStorage, streams a draft, and on completion replaces the URL with `/leads/[id]/proposals/[pid]`.
- `/leads/[id]/proposals/[pid]` — server-renders the stored body + run history; mounts `ReviseBox` for follow-up revisions.

**Files:**
- Create: `src/app/(app)/leads/[id]/proposals/new/page.tsx`
- Create: `src/app/(app)/leads/[id]/proposals/[pid]/page.tsx`
- Create: `src/components/agents/ProposalView.tsx`
- Create: `src/components/agents/ReviseBox.tsx`

- [ ] **Step 1:** Create `new/page.tsx` (client component):

```tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StreamingMarkdown } from "@/components/agents/StreamingMarkdown";

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const leadId = params.id;
  const [brief, setBrief] = useState<string | null>(null);

  useEffect(() => {
    const key = search.get("k");
    if (!key) {
      router.replace(`/leads/${leadId}`);
      return;
    }
    const value = sessionStorage.getItem(key);
    if (!value) {
      router.replace(`/leads/${leadId}`);
      return;
    }
    sessionStorage.removeItem(key);
    setBrief(value);
  }, [leadId, router, search]);

  if (!brief) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Drafting proposal…</h1>
      <StreamingMarkdown
        endpoint="/api/agents/proposal/draft"
        requestBody={{ leadId, scopeBrief: brief }}
        onComplete={(_body, result) => {
          if (result.proposalId) {
            router.replace(`/leads/${leadId}/proposals/${result.proposalId}`);
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 2:** Create `ProposalView.tsx`:

```tsx
"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Proposal, AgentRun } from "@/db/schema";

export function ProposalView({
  proposal,
  runs,
  monthlySpentUsd,
  monthlyCapUsd,
}: {
  proposal: Proposal;
  runs: AgentRun[];
  monthlySpentUsd: number;
  monthlyCapUsd: number;
}) {
  const [copied, setCopied] = useState(false);
  const latestRunCost = runs[0]?.costUsd ?? 0;

  async function copy() {
    await navigator.clipboard.writeText(proposal.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{proposal.title}</h1>
          <div className="text-xs text-muted-foreground">v{proposal.version} · {proposal.status}</div>
        </div>
        <Button variant="outline" onClick={copy}>{copied ? "Copied" : "Copy markdown"}</Button>
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert rounded-md border p-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposal.body}</ReactMarkdown>
      </div>
      <div className="text-xs text-muted-foreground">
        This run: ${latestRunCost.toFixed(3)} · This month: ${monthlySpentUsd.toFixed(2)} of ${monthlyCapUsd.toFixed(2)}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Run history ({runs.length})</summary>
        <ul className="mt-2 space-y-1">
          {runs.map((r) => (
            <li key={r.id} className="font-mono">
              {new Date(r.createdAt).toLocaleString()} — {r.agentType} · {r.status} · {r.inputTokens ?? 0}→{r.outputTokens ?? 0}t · ${(r.costUsd ?? 0).toFixed(3)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
```

- [ ] **Step 3:** Create `ReviseBox.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StreamingMarkdown } from "@/components/agents/StreamingMarkdown";

export function ReviseBox({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [streaming, setStreaming] = useState(false);

  if (streaming) {
    return (
      <StreamingMarkdown
        endpoint={`/api/agents/proposal/${proposalId}/revise`}
        requestBody={{ instruction }}
        onComplete={() => {
          setStreaming(false);
          setInstruction("");
          router.refresh();
        }}
        onError={() => setStreaming(false)}
      />
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-4">
      <Label>Revise</Label>
      <Textarea
        rows={3}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="e.g. make it shorter, emphasise pricing, add a discovery phase"
        maxLength={1000}
      />
      <Button disabled={!instruction.trim()} onClick={() => setStreaming(true)}>
        Revise
      </Button>
    </div>
  );
}
```

- [ ] **Step 4:** Create `[pid]/page.tsx`:

```tsx
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
```

- [ ] **Step 5:** Build + verify

```bash
pnpm build
```

Expected: routes `/leads/[id]/proposals/new` and `/leads/[id]/proposals/[pid]` appear.

- [ ] **Step 6:** Commit

```bash
git add src/app/\(app\)/leads/\[id\]/proposals/ src/components/agents/
git commit -m "feat(m3): proposal new + view pages with streaming + revise"
```

---

## Task 16: Global /agents Run History

**Files:**
- Modify: `src/app/(app)/agents/page.tsx` (replaces placeholder)
- Create: `src/components/agents/AgentRunsTable.tsx`

- [ ] **Step 1:** Create `AgentRunsTable.tsx`:

```tsx
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AgentRun } from "@/db/schema";

type Row = AgentRun & { leadName?: string | null };

export function AgentRunsTable({ runs }: { runs: Row[] }) {
  if (runs.length === 0) {
    return <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">No agent runs yet.</div>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{new Date(r.createdAt).toLocaleString()}</TableCell>
              <TableCell>{r.agentType}</TableCell>
              <TableCell>
                {r.leadId && r.proposalId
                  ? <Link className="hover:underline" href={`/leads/${r.leadId}/proposals/${r.proposalId}`}>{r.leadName ?? r.leadId}</Link>
                  : r.leadName ?? "—"}
              </TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell className="text-right">${(r.costUsd ?? 0).toFixed(3)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2:** Replace `src/app/(app)/agents/page.tsx`:

```tsx
import { db } from "@/db/client";
import { agentRuns, leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { env } from "@/lib/env";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { AgentRunsTable } from "@/components/agents/AgentRunsTable";

export default async function AgentsPage() {
  const runs = await db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(100);
  const spent = await monthlySpendUsd(db);

  // Decorate with lead names via a simple follow-up query per run — kept naive for v1 (<= 100 runs).
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
```

- [ ] **Step 3:** Build + verify

```bash
pnpm build
```

- [ ] **Step 4:** Commit

```bash
git add src/app/\(app\)/agents/page.tsx src/components/agents/AgentRunsTable.tsx
git commit -m "feat(m3): /agents run history page"
```

---

## Task 17: Apply Migration to Turso

**Files:** none changed. Just applies the pending migration to the dev/prod Turso instance.

- [ ] **Step 1:** Ensure `.env.local` has `ANTHROPIC_API_KEY` + `TURSO_*` set.

- [ ] **Step 2:** Apply migration

```bash
pnpm db:migrate
```

Expected: one new migration applied (`0002_*.sql`). No errors.

- [ ] **Step 3:** (Optional) verify via Turso shell

```bash
turso db shell innovaco-cc ".schema proposals"
turso db shell innovaco-cc ".schema agent_runs"
```

Both tables should match the Drizzle schema. No commit (no file changes).

---

## Task 18: Manual End-to-End Verification

**Files:** none — this is the human QA pass that corresponds to the spec's "Verification" section.

Before marking Module 3 complete, run through this checklist on `pnpm dev` against a real Turso DB and a real `ANTHROPIC_API_KEY`.

- [ ] **Step 1:** Green checks:
  ```bash
  pnpm test && pnpm lint && pnpm build
  ```
  All pass.

- [ ] **Step 2:** Dev server + manual flow:

  ```bash
  pnpm dev
  ```

  1. Log in.
  2. Create or pick a lead at stage `won` with 2+ activities on it.
  3. Open the lead, switch to **Proposals** tab, click **Draft proposal**.
  4. Enter a scope brief: `"AI chatbot for their front desk, 3-month pilot starting May, ~€8k. Suggest discovery → build → launch phases."`
  5. Click **Generate** → navigates to `/leads/[id]/proposals/new?k=...` → markdown streams in live.
  6. On completion the URL replaces itself with `/leads/[id]/proposals/[pid]`.
  7. The final draft has all seven H2 sections (Summary / Background / Proposed Solution / Deliverables / Timeline / Pricing / Terms).
  8. **Copy markdown** → paste somewhere → confirm content.
  9. Type into the **Revise** box: `"make it shorter and emphasise pricing"` → click Revise → body streams in and replaces the previous one.
  10. Cost footer reads two different costs across reloads (`This run: $X · This month: $Y of $Z`). Monthly Y increased.
  11. Navigate to `/agents` → both runs listed, clickable, with correct cost/status.
  12. Back on `/leads/[id]/proposals/[pid]` → expand **Run history** → shows two runs with ascending timestamps.

- [ ] **Step 3:** Cascade + spend-cap tests:

  1. Delete the lead (`/leads/[id]/edit` → Delete, or wherever the UI exposes it). In SQL, verify its proposals cascade-delete but `agent_runs` rows survive with `proposal_id=NULL`.
  2. Temporarily set `AGENT_MONTHLY_BUDGET_USD=0.01` in `.env.local`, restart `pnpm dev`.
  3. Try to draft another proposal → response is 429, UI shows the monthly-cap error with your current spend + the (tiny) cap.
  4. Revert `AGENT_MONTHLY_BUDGET_USD` to 50.

- [ ] **Step 4:** Vercel preview:

  1. Push the branch: `git push -u origin feature/module-3-agent-runner`.
  2. Open a PR against `main`.
  3. In Vercel, set preview env vars: `ANTHROPIC_API_KEY`, `AGENT_MONTHLY_BUDGET_USD` (leave default 50 for `AGENT_MODEL`).
  4. Walk through Step 2 against the preview URL.

- [ ] **Step 5:** If everything passes, mark the PR ready for merge.

---

## Post-Implementation Self-Review

Before declaring Module 3 done, re-read:
- Spec: `docs/superpowers/specs/2026-04-17-module-3-agent-runner-design.md`
- Each spec requirement should point to at least one commit on `feature/module-3-agent-runner`.
- Non-goals list: confirm none of them snuck into the implementation.
- Token-usage columns in `agent_runs` are all populated for a real Sonnet run — especially `cache_creation_tokens` on the first request and `cache_read_tokens` on a quick revision (demonstrates the cache actually landed).
