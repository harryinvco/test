# Module 3 — AI Agent Runner (Design Spec)

**Date:** 2026-04-17
**Status:** Approved for implementation planning
**Project:** Innovaco Command Center
**Scope refinement:** The 2026-04-11 master plan described a broad "AI agent framework" with four agent types (proposal, research, content, audit). This module ships **one** agent — the proposal drafter — end-to-end. The runner, persistence, and cost/UI infrastructure are designed to accept more agent types later without rework; additional agents are deferred to later modules.

## Context

Modules 1–2 shipped the shell and the CRM-lite system of record (leads, clients, activities). Harry can run his sales motion inside the command center, but every won lead still requires ~30–60 minutes of manual proposal writing against the lead context and prior conversations. Module 3 replaces that with a one-click flow: click "Draft proposal" on a lead, type a short scope brief, Claude streams back a full proposal grounded in the lead's data and activity log. Revise in place via a natural-language instruction ("make it shorter", "add a discovery phase"). All runs persist so costs and history are visible.

## Goal

Ship a working proposal drafter on `/leads/[id]`: free-text scope brief → streamed markdown proposal → saved as a `proposals` record linked to the lead → revisable in place. Every Claude invocation logged in an `agent_runs` table that a future `research` / `audit` / `content` agent can reuse without schema changes. Monthly spend capped so a loose prompt loop can't drain the API budget unsupervised.

## Non-Goals (Module 3 v1)

- Other agent types (research, audit, content, outbound, client digest). Infra is generic; no second agent ships in v1.
- Tool-use loop. Grounding is **context-injected upfront**; the agent does not call `get_lead`/`get_activities` mid-generation. Tools land with agents that genuinely need to branch (web search, peer-proposal lookup, calendar) in later modules.
- PDF export, email send, rich-text editor, file attachments.
- Proposal status workflow beyond `draft` (no sent/accepted/rejected — Module 5 territory).
- Background jobs / queue. Generation runs during the user's open HTTP connection; navigating away cancels. Typical run is 30–60s; acceptable.
- Retry/resume on partial stream failure. On stream drop we mark the run `failed`, persist partial output, and show a "retry" button that starts a fresh run.
- Per-client proposals. Proposals belong to leads in v1; client-level agents land after Module 5.
- Multi-user visibility. Single-user like the rest of the app.
- CSV export of run history.
- Playwright / E2E. Unit tests + manual verification checklist only.

## Stack Additions

| Concern | Choice | Why |
|---|---|---|
| Claude API | `@anthropic-ai/sdk` (direct) | Single-shot generation with no tool-use loop — lower-level SDK is a natural fit. Prompt caching is first-class. Aligns with the project's existing claude-api skill guidance. |
| Markdown render | `react-markdown` + `remark-gfm` | Standard, small, supports GFM tables for pricing. |
| Streaming transport | Next.js 16 Route Handlers | Server Actions stream tokens awkwardly; Route Handlers return a `ReadableStream` natively. |

No other new dependencies.

## Data Model

Two Drizzle tables in `src/db/schema.ts`.

### `proposals`

The business entity Harry interacts with.

| column | type | notes |
|---|---|---|
| `id` | text PK | uuid v4 |
| `lead_id` | text NOT NULL | FK → `leads.id`, **ON DELETE CASCADE** |
| `title` | text NOT NULL | Defaults to `"Proposal for {lead.company or lead.name}"`, editable |
| `body` | text NOT NULL | Full markdown draft |
| `version` | integer NOT NULL DEFAULT 1 | Starts at 1; bumps on each revision |
| `status` | text NOT NULL DEFAULT 'draft' | `'draft'` only in v1 (enum kept for forward compat) |
| `created_at` | integer NOT NULL | timestamp ms |
| `updated_at` | integer NOT NULL | timestamp ms |

Index: `(lead_id, created_at DESC)`.

### `agent_runs`

System log of every Claude invocation. Generic enough for future agent types.

| column | type | notes |
|---|---|---|
| `id` | text PK | uuid v4 |
| `agent_type` | text NOT NULL | `'proposal_draft'` \| `'proposal_revise'` in v1 (enum in `src/lib/enums.ts`) |
| `lead_id` | text | FK → `leads.id`, nullable (future agents may not be lead-scoped) |
| `proposal_id` | text | FK → `proposals.id`, nullable |
| `parent_run_id` | text | FK → `agent_runs.id`, nullable — revisions link to the original draft run for audit |
| `input_json` | text NOT NULL | JSON blob: scope brief or revise instruction + any other inputs |
| `output_text` | text | Final assembled output; updated after stream completes. Partial output preserved on `failed`/`cancelled`. |
| `status` | text NOT NULL DEFAULT 'streaming' | `'streaming'` \| `'completed'` \| `'failed'` \| `'cancelled'` |
| `model` | text NOT NULL | e.g. `'claude-sonnet-4-6'` — pinned per run for debugging |
| `input_tokens` | integer | From `usage.input_tokens` — non-cached input only |
| `output_tokens` | integer | From `usage.output_tokens` |
| `cache_read_tokens` | integer | From `usage.cache_read_input_tokens` |
| `cache_creation_tokens` | integer | From `usage.cache_creation_input_tokens` — priced higher than regular input |
| `cost_usd` | real | Computed from token usage × pricing table |
| `error` | text | Populated when `status='failed'` |
| `created_at` | integer NOT NULL | |
| `completed_at` | integer | Null until terminal state |

Indexes: `created_at DESC`; `(lead_id, created_at DESC)`.

FK cascade behavior: deleting a lead cascades to its proposals; deleting a proposal sets `agent_runs.proposal_id = NULL` (SET NULL) so cost/usage history survives. Deleting an `agent_runs` parent sets `parent_run_id = NULL` on children.

## Claude API

### SDK + model

Direct `@anthropic-ai/sdk`. Model defaults to `claude-sonnet-4-6` (latest Sonnet), overridable per-call via `env.AGENT_MODEL`. Implementation verifies the current SDK streaming API at build time via the claude-api skill — SDK signatures may have evolved since this spec was written.

### Environment additions

| var | default | purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | — (required) | Added to `src/lib/env.ts` Zod schema |
| `AGENT_MODEL` | `claude-sonnet-4-6` | Model pin |
| `AGENT_MONTHLY_BUDGET_USD` | `50` | Hard spend cap (see below) |

### Prompt structure

Every run builds three message blocks:

1. **System block, cached** — three content parts, each marked `cache_control: { type: "ephemeral" }`:
   1. **Static preamble** — Innovaco role, services, Cyprus context, tone rules, output contract (markdown only; sections Summary / Background / Proposed Solution / Deliverables / Timeline / Pricing / Terms; English; no preamble or afterword).
   2. **Lead snapshot** — name, company, email, industry, source, stage, estimated value (in euros), follow-up date.
   3. **Activity log** — chronological markdown of every `activities` row for the lead: type, timestamp (local Cyprus time), body.

2. **User message** — for initial draft: the scope brief. For revision: the prior draft + revise instruction (`"Here is the current draft:\n\n{body}\n\nPlease revise it as follows: {instruction}"`).

3. **No tools.** `tools` param omitted.

The 5-minute ephemeral cache TTL means a user iterating on revisions within the same sitting consistently hits the cache on parts 1–3 of the system block; only the user message changes.

### Streaming

Route Handler calls `client.messages.stream(...)` and pipes the text deltas to a `ReadableStream` returned from the Response. The server-side handler also accumulates the full text in a buffer so the final `output_text` + token usage can be written to `agent_runs` on `message_stop`. Client consumes via `fetch()` + `response.body.getReader()` and renders incrementally into the markdown view.

Cancellation: if the client closes the connection (navigates away, clicks Cancel), the route handler's abort signal aborts the Anthropic stream and marks the `agent_runs` row `cancelled` with whatever partial output accumulated.

### Cost computation

Pricing table hard-coded in `src/lib/agents/pricing.ts`, keyed by model. Anthropic's `usage` response returns four disjoint token counts (regular input, cache-creation input, cache-read input, output); costs are the sum of each bucket × its per-million rate:

```ts
// USD per million tokens
"claude-sonnet-4-6": { input: 3, cache_creation: 3.75, cache_read: 0.3, output: 15 }
```

`cost_usd = input_tokens * input/1e6 + cache_creation_tokens * cache_creation/1e6 + cache_read_tokens * cache_read/1e6 + output_tokens * output/1e6`.

Rates are verified against current Anthropic pricing at implementation time via the claude-api skill.

## Authorization & Cost Controls

Every route handler:
1. `await auth()` — 401 if no session.
2. Zod-validate body.
3. **Spend gate**: `SELECT SUM(cost_usd) FROM agent_runs WHERE created_at >= <first-of-month-UTC>`. If ≥ `AGENT_MONTHLY_BUDGET_USD`, return 429 with `{ error: "monthly_cap", spent_usd, cap_usd }`.
4. Insert `agent_runs` row with `status='streaming'`.
5. Stream + persist as described.

UI footer on every proposal page: `"This run: $0.03 · This month: $4.17 of $50"`.

## UI / Routes

Sidebar (Module 1) already has a placeholder `Agents` entry. Module 3 activates it.

| Path | Purpose |
|---|---|
| `/leads/[id]` | Existing detail page gains a **Proposals** tab next to Details / Activity. Lists proposals for this lead (most recent first). Contains "Draft proposal" button. |
| `/leads/[id]/proposals/[pid]` | Per-proposal page. Markdown render of `body`, "Revise" textarea + submit, Copy button, collapsed run history (list of `agent_runs` for this proposal with timestamp/status/cost), cost footer. |
| `/agents` | Global run history. Table: `created_at`, `agent_type`, lead name (link), `status`, `cost_usd`. Click-through opens the proposal page. |
| `POST /api/agents/proposal/draft` | Route handler, streams. Body: `{ leadId, scopeBrief }`. Creates `proposals` row + first `agent_runs` row. |
| `POST /api/agents/proposal/[pid]/revise` | Route handler, streams. Body: `{ instruction }`. Updates `proposals.body` + bumps `version`; creates a new `agent_runs` row with `parent_run_id` set to the original draft. |

**Draft UX.** "Draft proposal" opens a drawer (shadcn `sheet`) with the scope-brief textarea and Submit. On submit, POST → receive stream → navigate to the new proposal's page (server supplies the new `pid` in the response's first chunk as a JSON preamble line, then streams tokens). The markdown view renders deltas live; a `pending` spinner stops when the stream closes.

**Revise UX.** Same streaming mechanics; replaces the current `body` live. A confirmation step guards accidental overwrites: "Replace current draft with revision?" (checkbox to skip next time, persisted in localStorage).

**Markdown render.** `react-markdown` + `remark-gfm`. Custom components for `h1..h3` and `table` match the existing Tailwind style.

## Architecture

Continues the Module 2 pattern:

```
src/lib/agents/
├── pricing.ts                        # Model→price table + cost calc
├── prompt.ts                         # Builds system/user blocks for proposal agent
├── proposals/
│   ├── schema.ts                     # Zod: ProposalCreate, ProposalUpdate, DraftInput, ReviseInput
│   ├── queries.ts                    # getProposalById, getProposalsByLead, getRecentRuns
│   ├── runner.ts                     # streamProposalDraft, streamProposalRevise — the Claude glue
│   └── __tests__/
│       ├── schema.test.ts
│       ├── pricing.test.ts
│       └── runner.test.ts            # with Anthropic client mocked
```

```
src/app/api/agents/proposal/
├── draft/route.ts                    # POST, streaming
└── [pid]/revise/route.ts             # POST, streaming
```

```
src/app/(app)/
├── agents/page.tsx                   # Replaces placeholder
└── leads/[id]/
    ├── page.tsx                      # MODIFIED — add Proposals tab
    └── proposals/
        └── [pid]/
            └── page.tsx              # New
```

```
src/components/
└── agents/
    ├── ProposalsTab.tsx              # List + "Draft proposal" button, opens Sheet
    ├── DraftProposalSheet.tsx        # Scope brief form
    ├── ProposalView.tsx              # Markdown render + Copy + cost footer
    ├── ReviseBox.tsx                 # Textarea + submit, consumes stream
    ├── AgentRunsTable.tsx            # Used on /agents and inside ProposalView
    └── StreamingMarkdown.tsx         # Reads ReadableStream, accumulates, renders
```

`proposals` domain code sits under `src/lib/agents/proposals/` (not `src/lib/proposals/`) because the runner is the load-bearing piece; keeping the module namespace flags "agent concern" to future modules.

## Testing

**Unit (Vitest):**
- `pricing.test.ts` — cost math across all four token buckets (input, cache-creation, cache-read, output), unknown-model fallback.
- `schema.test.ts` — Zod shapes for `proposals`, `agent_runs`, `DraftInput`, `ReviseInput`.
- `runner.test.ts` — Anthropic client mocked with `vi.mock("@anthropic-ai/sdk")`. Tests:
  - Draft run creates `proposals` + `agent_runs`, `version=1`, both rows populated.
  - Revise run bumps `version`, links `parent_run_id`, overwrites `body`, inserts a new `agent_runs` row.
  - Stream yielding 3 text chunks + final `message_stop` reassembles correctly in `output_text`.
  - Stream aborting mid-flight marks row `cancelled`, preserves partial output.
  - Monthly cap query blocks when over, allows when under — using the `src/db/__tests__/test-db.ts` fixture.

No live Anthropic calls in tests; no Playwright.

## Verification

Module 3 ships when:

1. `pnpm test` passes (Modules 1–2 tests + ~15 new tests).
2. `pnpm build` and `pnpm lint` pass.
3. `pnpm db:generate` produces `drizzle/0002_*.sql` adding `proposals` and `agent_runs`; `pnpm db:migrate` applies cleanly to Turso.
4. Manual flow on `pnpm dev` against a real Turso DB + real `ANTHROPIC_API_KEY`:
   - Open a lead with 2+ activities on it.
   - Click "Draft proposal" → drawer opens → type scope brief → submit → navigate to proposal page → markdown streams in live.
   - Final draft has all seven sections and references facts from the lead/activities.
   - `agent_runs` row shows `status='completed'`, non-zero tokens + cost.
   - Click "Revise", type "make it shorter and emphasise pricing" → body streams and replaces; `version` = 2; a second `agent_runs` row exists with `parent_run_id` linking to the first.
   - Copy button puts clean markdown on the clipboard.
   - Navigate to `/agents` → both runs visible with correct costs.
   - Delete the lead → its proposals cascade-delete; `agent_runs` rows survive with `proposal_id=NULL`.
   - Temporarily set `AGENT_MONTHLY_BUDGET_USD=0.01` in `.env.local` → next run returns 429 with the spend-cap error; UI shows the message.
5. Vercel preview deploy with `ANTHROPIC_API_KEY` set works end-to-end.

## Open Questions (resolve during planning)

- **Drawer vs inline form**: `sheet` is cleanest but if the scope-brief area feels cramped on mobile, fall back to a dedicated `/leads/[id]/proposals/new` page.
- **Markdown theme**: default `react-markdown` output vs Tailwind typography plugin. If `@tailwindcss/typography` isn't already present, defer.
- **Run history location**: inside `ProposalView` (collapsed) vs a separate tab on the proposal page. Decide based on how noisy it feels at 3+ revisions.
