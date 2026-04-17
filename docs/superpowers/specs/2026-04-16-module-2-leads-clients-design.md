# Module 2 — Leads & Clients (Design Spec)

**Date:** 2026-04-16
**Status:** Approved for implementation planning
**Project:** Innovaco Command Center
**Supersedes naming in:** Foundation spec (Module 2 was named "Clients & Projects"; refocused to "Leads & Clients" — pipeline-first)

## Context

Module 1 shipped the deployed Next.js shell with auth, sidebar, and empty placeholder pages for `/clients` (and others). Module 2 fills the sales-pipeline side of the command center: a CRM-lite system of record for **Leads** (pre-sales contacts moving through a 5-stage pipeline) and **Clients** (the converted, paying side).

Projects, billing, time tracking, and AI agents remain out of scope — those land in Modules 3–5. The intent of Module 2 is that Harry can run his entire sales motion (capture lead → work it → convert to client → manage client account status) from inside the command center, with no spreadsheets or HubSpot involved.

## Goal

A working sales pipeline at `/leads` (table + Kanban) and a client account list at `/clients`, both with full CRUD. Leads carry a per-lead activity timeline (notes, calls, emails, meetings). Won leads convert to client records via a single action that copies relevant fields and links the records. Both lists are searchable and filterable client-side.

## Non-Goals (Module 2)

- Projects, deliverables, milestones (deferred — possibly Module 3 or its own module)
- Billing, invoicing, contracts, payment tracking (Module 5)
- File uploads / attachments on activities
- AI integration (Module 3)
- Multi-user, per-record ownership, role-based access (deferred until Module 1's auth grows)
- Soft delete / undo. Hard delete only — `deleted_at` column not in schema.
- Per-client activity log (post-conversion activity belongs to v1.1; client detail page links back to original lead's activity for now)
- CSV import / export
- Email/calendar sync (Gmail/Google Calendar — deferred even though MCPs exist)
- Multi-currency. EUR-only, stored as integer cents.
- Server-side pagination. Tables are client-side filtered/sorted; we add server pagination if a list crosses ~500 rows.
- Playwright / E2E. Unit tests only; manual verification checklist for golden paths.

## Stack Additions

Builds on Module 1's stack (Next.js 16, Auth.js v5, Drizzle+Turso, shadcn `base-nova`). New runtime deps:

| Concern | Choice | Why |
|---|---|---|
| Forms | `react-hook-form` + `@hookform/resolvers` | Standard with shadcn; ergonomic with Zod schemas |
| Drag-and-drop (Kanban) | Native HTML5 DnD | 5 columns, low complexity — no library needed |
| Date picking | shadcn `calendar` + `popover` (adds `react-day-picker` transitively) | Minimal, matches existing UI |
| Select primitive | shadcn `select` | For enum dropdowns |
| Table primitive | shadcn `table` | Sort/filter logic stays in our components — no @tanstack/table required for v1 |
| Tabs / Badge / Textarea | shadcn `tabs`, `badge`, `textarea` | For detail pages, stage indicators, activity body |

No new dev deps beyond what Module 1 already installed.

## Data Model

Three Drizzle tables in `src/db/schema.ts`. SQLite has no native enums; enums are stored as text and constrained at the Zod layer.

### Enums (`src/lib/enums.ts`)

```ts
export const INDUSTRY = ["hospitality", "real_estate", "insurance", "healthcare", "retail", "other"] as const;
export const SOURCE = ["referral", "inbound", "outbound", "event", "other"] as const;
export const LEAD_STAGE = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;
export const CLIENT_STATUS = ["active", "paused", "churned"] as const;
export const ACTIVITY_TYPE = ["call", "email", "meeting", "note"] as const;
```

### `leads`

| column | type | notes |
|---|---|---|
| `id` | text PK | uuid v4 generated server-side |
| `name` | text NOT NULL | Person or company contact name |
| `company` | text | Nullable |
| `email` | text NOT NULL | Validated as email by Zod |
| `phone` | text | Nullable |
| `industry` | text NOT NULL | INDUSTRY enum |
| `source` | text NOT NULL | SOURCE enum |
| `stage` | text NOT NULL DEFAULT 'new' | LEAD_STAGE enum |
| `estimated_value_cents` | integer | Nullable; EUR cents |
| `follow_up_date` | text | Nullable; ISO date `YYYY-MM-DD` |
| `converted_at` | integer (timestamp ms) | Nullable; set when "Convert to Client" runs |
| `converted_client_id` | text | Nullable; FK → `clients.id`, no cascade |
| `created_at` | integer NOT NULL | timestamp ms |
| `updated_at` | integer NOT NULL | timestamp ms |

Index: `created_at DESC`.

### `clients`

| column | type | notes |
|---|---|---|
| `id` | text PK | uuid v4 |
| `name` | text NOT NULL | |
| `company` | text | Nullable |
| `email` | text NOT NULL | |
| `phone` | text | Nullable |
| `industry` | text NOT NULL | INDUSTRY enum |
| `status` | text NOT NULL DEFAULT 'active' | CLIENT_STATUS enum |
| `contract_start_date` | text NOT NULL | ISO date; defaults to conversion date but editable |
| `mrr_cents` | integer | Nullable; EUR cents/month |
| `from_lead_id` | text | Nullable FK → `leads.id`, no cascade |
| `created_at` | integer NOT NULL | |
| `updated_at` | integer NOT NULL | |

Index: `created_at DESC`.

### `activities`

| column | type | notes |
|---|---|---|
| `id` | text PK | uuid v4 |
| `lead_id` | text NOT NULL | FK → `leads.id`, **ON DELETE CASCADE** |
| `type` | text NOT NULL | ACTIVITY_TYPE enum |
| `body` | text NOT NULL | Free-form |
| `occurred_at` | integer NOT NULL | timestamp ms; user-entered (default "now") |
| `created_at` | integer NOT NULL | system-set |

Index: `(lead_id, occurred_at DESC)`.

**Module 1 retro-fit:** Drop the placeholder `users` table from `src/db/schema.ts` (it ships unused, no rows in any environment) and replace with these three tables. Migration is destructive but safe.

## UI / Routes

Sidebar (Module 1) currently has one "Clients" entry. Module 2 adds a "Leads" entry above it (lucide `Inbox` icon).

| Path | Purpose |
|---|---|
| `/leads` | Table (default) + Kanban toggle |
| `/leads/new` | Create form |
| `/leads/[id]` | Detail with Details/Activity tabs |
| `/leads/[id]/edit` | Edit form |
| `/clients` | Table |
| `/clients/new` | Create form |
| `/clients/[id]` | Detail |
| `/clients/[id]/edit` | Edit form |

**Tables**: shadcn `Table`. Header click sorts. Top filter row: text search across `name|company|email`, plus `Stage`/`Industry` dropdowns. State in `useState` (no URL sync v1).

**Kanban**: 5 columns (`new`, `contacted`, `qualified`, `proposal_sent`, `won`; `lost` shown as collapsed footer row). Cards: name, company, value, follow-up. Drag → `updateLeadStage(id, newStage)` with `useOptimistic`.

**Detail page header**: name, company, stage/status badge, "Edit" + (lead at `won` only) "Convert to Client" buttons. Tabs: **Details** (read-only summary) and **Activity** (leads only — chronological timeline + "Add activity" form).

**Convert to Client flow**: button → `convertToClient(leadId)` Server Action → creates client (copies name/company/email/phone/industry; defaults `status='active'`, `contract_start_date=today`, `mrr_cents=null`), updates lead with `converted_at` + `converted_client_id`, redirects to `/clients/[newId]`. Idempotent: if `lead.converted_client_id` already set, redirect to that existing client.

**Client detail "Original lead" link**: when `from_lead_id` is set, show "Converted from lead → [name]" link to `/leads/[id]`.

## Architecture

Continues Module 1's pattern: Server Components + Server Actions, no separate API layer. Per-domain organization under `src/lib/`:

```
src/lib/
├── enums.ts                          # Shared enum constants
├── leads/
│   ├── schema.ts                     # Zod (LeadCreate, LeadUpdate)
│   ├── queries.ts                    # getLeads, getLeadById — server-only
│   ├── actions.ts                    # createLead, updateLead, deleteLead, updateStage, convertToClient
│   └── __tests__/
│       ├── schema.test.ts
│       └── actions.test.ts
├── clients/
│   ├── schema.ts
│   ├── queries.ts
│   ├── actions.ts                    # createClient, updateClient, deleteClient
│   └── __tests__/
└── activities/
    ├── schema.ts
    ├── queries.ts                    # getActivitiesByLead
    ├── actions.ts                    # addActivity, deleteActivity
    └── __tests__/
```

```
src/components/
├── leads/
│   ├── LeadsTable.tsx                # Client Component, sort/filter state
│   ├── LeadsKanban.tsx               # Client Component, DnD
│   ├── LeadForm.tsx                  # Client Component, RHF + Zod
│   ├── LeadDetail.tsx                # Server Component (Details tab content)
│   └── ConvertToClientButton.tsx     # Client Component
├── clients/
│   ├── ClientsTable.tsx
│   ├── ClientForm.tsx
│   └── ClientDetail.tsx
├── activities/
│   ├── ActivityTimeline.tsx          # Server Component
│   └── AddActivityForm.tsx           # Client Component
└── ui/                               # shadcn primitives (existing + new: select, table, calendar, popover, textarea, tabs, badge)
```

**Every Server Action**:
1. `await auth()` — throws if no session.
2. Zod-validate input (the same schema the form uses).
3. Drizzle write inside a transaction where multiple rows are touched (`convertToClient`).
4. `revalidatePath()` for affected routes.
5. Returns `{ ok: true, data }` or `{ ok: false, errors: ZodIssue[] }`.

## Forms & Validation

`react-hook-form` + `@hookform/resolvers/zod` + shadcn primitives. Each entity has one canonical Zod schema in `src/lib/{entity}/schema.ts`, imported by both the form (inline error display) and the Server Action (runtime validation). Server-side is the source of truth.

```ts
// Example shape — src/lib/leads/schema.ts
export const LeadCreate = z.object({
  name: z.string().min(1).max(120),
  company: z.string().max(120).nullish(),
  email: z.string().email(),
  phone: z.string().max(40).nullish(),
  industry: z.enum(INDUSTRY),
  source: z.enum(SOURCE),
  stage: z.enum(LEAD_STAGE).default("new"),
  estimated_value_cents: z.number().int().nonnegative().nullish(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});
export const LeadUpdate = LeadCreate.partial();
```

Currency display: `Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" })`. Inputs accept decimal euros; convert to cents on submit.

## Authorization

Module 1's middleware gates all `/(app)/*` routes. Server Actions additionally call `auth()` and throw if no session — defense in depth. Single-user, no per-record ownership checks.

## Testing

**Unit (Vitest)**:
- `schema.test.ts` per entity: ~5 tests each covering required fields, enum boundaries, email format, integer constraints.
- `actions.test.ts` for high-judgment actions: `convertToClient` (creates client + links lead + idempotent), `updateStage` (writes new stage + bumps `updated_at`), `deleteLead` (cascade-deletes activities).

**In-memory DB for action tests**: `createClient({ url: ":memory:" })` from `@libsql/client`, run `migrate()` from `drizzle-orm/libsql/migrator` against the schema, fresh DB per test. Fall back to mocking the Drizzle client only if in-memory wiring proves brittle in CI.

**No E2E in M2**. Manual checklist below covers golden paths.

## Verification

Module 2 ships when:

1. `pnpm test` passes (Module 1's existing tests + new schema/action tests, ~25 tests total).
2. `pnpm build` and `pnpm lint` pass.
3. `pnpm db:generate` produces migrations replacing the placeholder `users` with `leads`, `clients`, `activities`. `pnpm db:migrate` applies cleanly to Turso.
4. Manual flow on `pnpm dev` against a real Turso DB:
   - Create a lead via `/leads/new` → appears in `/leads` table; default stage `new`.
   - Edit the lead → changes persist after reload.
   - Switch to Kanban tab → 5 columns visible (lost as collapsed footer); drag from `new` → `qualified`, DB updates, card moves visually.
   - Move lead to `won`; "Convert to Client" button appears on detail page; click → new client at `/clients/[newId]`, lead detail shows "Converted to [client name]".
   - Re-clicking "Convert to Client" on the same lead → redirects to existing client (idempotent), no duplicate.
   - Create a client directly via `/clients/new` → appears in `/clients`, no "Converted from lead" link.
   - Add 3 activities to a lead with different types → all appear in Activity timeline, sorted by `occurred_at` desc, type icons render.
   - Delete the lead → activities cascade-deleted (verify with a query); converted client (if any) remains.
   - Sort leads by `estimated_value_cents` desc → highest at top.
   - Filter by `industry='hospitality'` → only hospitality leads shown.
5. Vercel preview deploy works end-to-end with prod data.

## Open Questions (resolve during planning, not blocking spec)

- **Default sort**: `created_at DESC` everywhere — confirm during implementation.
- **Empty-state CTA**: extend Module 1's `EmptyState` component with optional `cta` prop linking to `/leads/new` and `/clients/new`.
- **Branch strategy**: continue on `feature/module-1-foundation` after Module 1 is merged, or branch fresh from main? Decide at the start of execution.
