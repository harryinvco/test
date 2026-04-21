# Module 5 — Admin & Accounting (Design Spec)

**Date:** 2026-04-21
**Status:** Approved for implementation
**Project:** Innovaco Command Center

## Context

Modules 1–4 shipped the shell, CRM-lite, AI proposal agent, and ops dashboard. Module 5 closes the master plan: the money side of the agency. It also clears an outstanding Module 3 debt — the proposal status workflow (`sent`/`accepted`/`rejected`) — which was explicitly deferred to this module.

## Goal

Ship four sub-areas under `/admin` plus the proposal status workflow:

- **Invoices** — create, list, detail, edit (draft-only), status transitions (draft → sent → paid).
- **Expenses** — lightweight CRUD with category enum.
- **Time tracking** — duration-based entries (hours decimal), optional client link, billable flag.
- **Revenue** — YTD revenue, outstanding invoices, YTD expenses, net revenue, revenue-by-client table.
- **Proposal status** — expand enum to `draft|sent|accepted|rejected`; add `sent_at` + `responded_at` timestamps; simple dropdown UI on proposal detail.

## Non-Goals (v1)

- Payment integrations (Stripe, bank sync).
- Invoice PDF export / email send (the user generates the PDF elsewhere).
- Recurring invoices (MRR is already tracked on `clients`).
- Per-line tax. Single tax amount per invoice.
- Currencies other than EUR.
- Multi-user / roles.
- Time-entry → invoice-line-item auto-generation.
- Expense receipt file uploads.
- Revenue trend charts.
- Overdue auto-promotion cron.

## Data Model

Four new tables plus two new columns on `proposals`. Single Drizzle migration `0003_*.sql`.

### `invoices`
`id` (text PK), `client_id` (text, FK → `clients.id`, SET NULL), `number` (text NOT NULL), `issue_date`, `due_date` (ISO date), `status` (default `'draft'`), `notes` (text), `subtotal_cents`, `tax_cents`, `total_cents` (all integer NOT NULL DEFAULT 0), `sent_at`, `paid_at` (integer ms, nullable), `created_at`, `updated_at` (integer NOT NULL).

Indexes: `(status, issue_date DESC)`, `(client_id, created_at DESC)`.

### `invoice_items`
`id` (text PK), `invoice_id` (text NOT NULL, FK → `invoices.id`, CASCADE), `description` (text NOT NULL), `quantity` (real NOT NULL), `unit_price_cents` (integer NOT NULL), `total_cents` (integer NOT NULL, stored as `round(quantity * unit_price_cents)` to avoid FP drift), `position` (integer NOT NULL).

Index: `(invoice_id, position)`.

### `expenses`
`id` (text PK), `date` (ISO), `category` (enum), `amount_cents` (integer NOT NULL), `vendor` (text), `client_id` (text, FK → `clients.id`, SET NULL), `notes`, `created_at`, `updated_at`.

Indexes: `date DESC`, `(category, date DESC)`.

### `time_entries`
`id` (text PK), `date` (ISO), `hours` (real NOT NULL), `client_id` (text, FK → `clients.id`, SET NULL), `description` (text NOT NULL), `billable` (integer NOT NULL DEFAULT 1 — SQLite 0/1), `created_at`, `updated_at`.

Indexes: `date DESC`, `(client_id, date DESC)`.

### `proposals` — expansion
Add columns `sent_at INTEGER`, `responded_at INTEGER` (both nullable).

### Enums (`src/lib/enums.ts`)
```ts
PROPOSAL_STATUS = ["draft", "sent", "accepted", "rejected"]
INVOICE_STATUS  = ["draft", "sent", "paid", "overdue"]
EXPENSE_CATEGORY = ["software", "travel", "marketing", "office", "contractor", "other"]
```

## Routes

| Path | Purpose |
|---|---|
| `/admin` | Hub: 4 tiles with live counts (Invoices outstanding, Expenses MTD, Hours MTD, Revenue YTD). |
| `/admin/invoices` | Table list + filter by status. |
| `/admin/invoices/new` | Create form with inline line-item editor. |
| `/admin/invoices/[id]` | Detail: items table + notes + status actions (Send, Mark Paid). |
| `/admin/invoices/[id]/edit` | Edit form (only when `status='draft'`). |
| `/admin/expenses` | List with inline-create row. |
| `/admin/time` | List with inline-create row + weekly total footer. |
| `/admin/revenue` | KPI cards + revenue-by-client table. |

## Architecture

Follows the M2/M3 pattern: `src/lib/<domain>/{schema,queries,actions}.ts` + `__tests__/`; `src/components/<domain>/*`; routes under `src/app/(app)/admin/<area>/`.

### Invoice numbering
Auto-generate `INV-YYYY-NNNN` in `createInvoice`: `count(*) from invoices where strftime('%Y', issue_date) = :year` + 1. User can override on the form.

### Proposal status transitions
Enforced in `updateProposalStatus(pid, status)`:
- `draft → sent` (sets `sent_at`)
- `sent → accepted | rejected` (sets `responded_at`)
- `accepted`/`rejected` are terminal.

Invalid transitions return `{ ok: false, error }`.

### Revenue queries
`src/lib/revenue/queries.ts` fires in parallel via `Promise.all`:
- `revenueYtd(db)` — sum `total_cents` where `status='paid'` and paid in current UTC year.
- `outstandingInvoices(db)` — `{ count, totalCents }` for `status IN ('sent','overdue')`.
- `expensesYtd(db)` — sum `amount_cents` for current UTC year.
- `netRevenueYtd(db)` — revenue − expenses.
- `revenueByClient(db, limit=10)` — grouped sum paid per client, DESC.

## Reused Pieces
- `src/lib/money.ts` — `formatEuros`, `eurosToCents`.
- `src/lib/leads/actions.ts`, `src/lib/clients/actions.ts` — auth → Zod → Drizzle → `revalidatePath` → `{ ok, data|errors }` pattern.
- `src/components/ui/*` — Card, Table, Select, Sheet, AlertDialog.
- `src/db/__tests__/test-db.ts` — in-memory fixture for all new tests.

## Testing

Unit tests (Vitest) per sub-area:
- `invoices/__tests__/totals.test.ts` — pure-function totals.
- `invoices/__tests__/schema.test.ts` — Zod validation.
- `invoices/__tests__/actions.test.ts` — create/update/markSent/markPaid, auto-numbering, client SET NULL on delete.
- `expenses/__tests__/{schema,actions}.test.ts`.
- `time/__tests__/{schema,actions}.test.ts`.
- `revenue/__tests__/queries.test.ts` — YTD boundaries, empty DB, net math.
- `agents/proposals/__tests__/actions.test.ts` (NEW) — status transitions.

No Playwright.

## Verification

1. `pnpm test`, `pnpm lint`, `pnpm build` — all green.
2. `pnpm db:generate` → `drizzle/0003_*.sql` adds 4 tables and alters `proposals`.
3. `pnpm db:migrate` applies cleanly to Turso.
4. Manual on `pnpm dev`:
   - `/admin` shows 4 tiles with live counts.
   - Create draft invoice → add 3 line items → save → detail page totals correct.
   - Mark sent → `sent_at` set; mark paid → `paid_at` set.
   - `/admin/revenue` YTD + outstanding update.
   - Log expenses (each category); `/admin/revenue` net updates.
   - Log time entries; weekly total shows.
   - Delete a client → invoices/expenses/time entries survive with `client_id=NULL`; proposals cascade-delete (existing behaviour).
   - Proposal detail: transition draft → sent → accepted; `accepted` is terminal.
