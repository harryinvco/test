# Module 4 — Ops Dashboard (Design Spec)

**Date:** 2026-04-21
**Status:** Approved for implementation
**Project:** Innovaco Command Center

## Context

Modules 1–3 shipped the shell, the CRM-lite system of record, and the AI proposal agent. Data now lives in `leads`, `clients`, `activities`, `proposals`, and `agent_runs`. The sidebar `/dashboard` entry has been a placeholder since Module 1. Module 4 activates it with an at-a-glance view so Harry can open the command center and see the state of the business in one glance instead of clicking across three tabs.

## Goal

A `/dashboard` landing page showing seven KPI cards computed directly from existing tables on every request. No new data model. No external integrations. No charts, filters, or trends.

## Non-Goals (v1)

- Charts, sparklines, trend lines.
- Time-period filters (week/month/quarter/ytd). "This month" cards use UTC month-start, matching the spend gate from Module 3.
- External integrations (Stripe, Google Analytics, email providers). The master plan mentions "external sources"; we defer until one is concrete.
- Alerts, thresholds, colour-coded warnings.
- Per-industry / per-source breakdowns.
- Activity feed. Lead-detail already covers recent activity; dashboard stays metrics-only.
- Snapshots table / nightly aggregation jobs.
- Playwright / E2E.

## Cards

Seven cards in a responsive grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`). Each card: muted-small title, large number, optional sub-label. Cards link to the relevant list view.

| # | Card | Query | Format | Links to |
|---|---|---|---|---|
| 1 | Active leads | `count(leads)` where `stage NOT IN ('won','lost')` | integer | `/leads` |
| 2 | Leads by stage | grouped count for `new`, `contacted`, `qualified`, `proposal_sent` | 4 mini-counters in one card | `/leads` |
| 3 | Pipeline value | `SUM(estimated_value_cents)` where `stage NOT IN ('won','lost')` | `formatEuros()` | `/leads` |
| 4 | Active clients | `count(clients)` where `status='active'` | integer | `/clients` |
| 5 | MRR | `SUM(mrr_cents)` where `status='active'` | `formatEuros()` | `/clients` |
| 6 | Agent spend this month | `monthlySpendUsd(db)` (existing) | `$X.XX of $YY.YY` | `/agents` |
| 7 | Agent runs this month | `count(agent_runs)` where `created_at >= startOfMonthUtc()` | integer | `/agents` |

## Architecture

- `src/lib/dashboard/queries.ts` — single exported `getDashboardKpis(db)`. Fires all seven aggregations in parallel via `Promise.all`. Returns a typed object. Mirrors Module 3's `monthlySpendUsd(db)` convention.
- `src/components/dashboard/MetricCard.tsx` — reusable `{ label, value, sub?, href? }`. Wraps existing shadcn `Card`. Whole card is a `<Link>` when `href` set.
- `src/components/dashboard/FunnelCard.tsx` — the leads-by-stage card; takes grouped counts, renders 4 labeled counters horizontally.
- `src/app/(app)/dashboard/page.tsx` — async RSC. Replaces `<EmptyState>` with the grid. Blocking server-render; no client component.

Reused:
- `src/lib/agents/spend.ts` — `monthlySpendUsd`, `startOfMonthUtc`.
- `src/lib/money.ts` — `formatEuros`.
- `src/lib/env.ts` — `env.AGENT_MONTHLY_BUDGET_USD`.
- `src/components/ui/card.tsx` — shadcn primitive.
- `src/db/__tests__/test-db.ts` — test fixture.

No DB migration, no new env vars, no new deps.

## Testing

Unit (Vitest), one file `src/lib/dashboard/__tests__/queries.test.ts`:

- Active-leads count excludes `won`/`lost`.
- Leads-by-stage groups correctly; zero-count stages return 0.
- Pipeline value sums active leads only; null `estimated_value_cents` treated as 0.
- Active-clients count + MRR exclude `paused`/`churned`.
- Runs-this-month count respects `startOfMonthUtc` boundary (`start-1ms` excluded, `start+1ms` included).
- Empty DB → all zeros.

## Verification

1. `pnpm test` — 75 existing + ~6 new tests all pass.
2. `pnpm lint` — 0 errors, no new warnings.
3. `pnpm build` — clean; `/dashboard` registered as dynamic.
4. Manual on `pnpm dev` against real Turso:
   - Log in → `/dashboard` → seven cards populate.
   - Numbers match `/leads`, `/clients`, `/agents` individually.
   - Pipeline value and MRR render in euros.
   - Agent spend card matches `/agents` header.
   - Clicking each card navigates to the relevant list view.
   - Empty DB shows zeros, no errors.
