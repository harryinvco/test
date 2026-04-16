# Module 2 — Leads & Clients Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a CRM-lite sales pipeline inside the Innovaco Command Center: `/leads` with table+Kanban+activity log, `/clients` with CRUD, and a one-click conversion flow from won lead to client.

**Architecture:** Three Drizzle tables (`leads`, `clients`, `activities`). Server Components render data; Server Actions handle writes. One canonical Zod schema per entity serves both client-side form validation and server-side runtime validation. Activity log is scoped to leads only in v1.

**Tech Stack:** Next.js 16, React 19, TS 5, Drizzle ORM + Turso (libSQL), Auth.js v5, shadcn/ui (base-nova), Tailwind v4, React Hook Form, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-04-16-module-2-leads-clients-design.md`

---

## Pre-Task: Branch Strategy

Check whether Module 1 has been merged to `main` before starting. If yes, branch from `main`:

```bash
git checkout main && git pull
git checkout -b feature/module-2-leads-clients
```

If Module 1 is still on `feature/module-1-foundation` and not merged, stack on top:

```bash
git checkout feature/module-1-foundation
git checkout -b feature/module-2-leads-clients
```

Either way, work happens on `feature/module-2-leads-clients`. Every task ends in a commit on this branch.

---

## File Structure

```
src/
├── app/(app)/
│   ├── leads/
│   │   ├── page.tsx                      # Table + Kanban toggle (new)
│   │   ├── new/page.tsx                  # Create form (new)
│   │   └── [id]/
│   │       ├── page.tsx                  # Detail with tabs (new)
│   │       └── edit/page.tsx             # Edit form (new)
│   └── clients/
│       ├── page.tsx                      # REPLACES placeholder
│       ├── new/page.tsx                  # Create form (new)
│       └── [id]/
│           ├── page.tsx                  # Detail (new)
│           └── edit/page.tsx             # Edit form (new)
├── components/
│   ├── EmptyState.tsx                    # MODIFIED — add optional `cta` prop
│   ├── layout/Sidebar.tsx                # MODIFIED — add Leads entry
│   ├── leads/
│   │   ├── LeadsTable.tsx
│   │   ├── LeadsKanban.tsx
│   │   ├── LeadForm.tsx
│   │   ├── LeadDetailTabs.tsx
│   │   └── ConvertToClientButton.tsx
│   ├── clients/
│   │   ├── ClientsTable.tsx
│   │   └── ClientForm.tsx
│   ├── activities/
│   │   ├── ActivityTimeline.tsx
│   │   └── AddActivityForm.tsx
│   └── ui/                               # shadcn primitives added via CLI
├── db/
│   ├── schema.ts                         # REPLACED — drop users, add 3 tables
│   └── __tests__/
│       └── test-db.ts                    # In-memory libSQL helper
└── lib/
    ├── enums.ts                          # Shared enum constants
    ├── money.ts                          # EUR Intl formatter + cents helpers
    ├── leads/
    │   ├── schema.ts                     # Zod LeadCreate / LeadUpdate
    │   ├── queries.ts                    # getLeads, getLeadById
    │   ├── actions.ts                    # createLead, updateLead, deleteLead, updateStage, convertToClient
    │   └── __tests__/
    │       ├── schema.test.ts
    │       └── actions.test.ts
    ├── clients/
    │   ├── schema.ts
    │   ├── queries.ts                    # getClients, getClientById
    │   ├── actions.ts                    # createClient, updateClient, deleteClient
    │   └── __tests__/
    │       ├── schema.test.ts
    │       └── actions.test.ts
    └── activities/
        ├── schema.ts
        ├── queries.ts                    # getActivitiesByLead
        ├── actions.ts                    # addActivity, deleteActivity
        └── __tests__/
            ├── schema.test.ts
            └── actions.test.ts
```

---

## Task 1: Install Runtime Dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1:** Install form + uuid deps

```bash
pnpm add react-hook-form @hookform/resolvers
```

`uuid` is not required — we use the platform `crypto.randomUUID()` which is available in both Node 24 and the browser.

- [ ] **Step 2:** Commit

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(m2): add react-hook-form for forms"
```

---

## Task 2: Add shadcn Primitives

**Files:** `src/components/ui/*`

- [ ] **Step 1:** Add primitives we'll need

```bash
pnpm dlx shadcn@latest add select table tabs badge textarea
```

Expected: five new files appear under `src/components/ui/` (select.tsx, table.tsx, tabs.tsx, badge.tsx, textarea.tsx). Module 2 uses native `<input type="date">` for date fields — no calendar/popover primitive needed until a richer picker is wanted in v1.1.

- [ ] **Step 2:** Verify build

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 3:** Commit

```bash
git add -A
git commit -m "feat(m2): add shadcn primitives (select, table, tabs, badge, textarea, popover, calendar)"
```

---

## Task 3: Shared Enums Module (TDD)

**Files:**
- Create: `src/lib/enums.ts`
- Test: `src/lib/__tests__/enums.test.ts`

- [ ] **Step 1:** Write failing test

Create `src/lib/__tests__/enums.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { INDUSTRY, SOURCE, LEAD_STAGE, CLIENT_STATUS, ACTIVITY_TYPE } from "@/lib/enums";

describe("enums", () => {
  it("INDUSTRY includes all 5 verticals + other", () => {
    expect(INDUSTRY).toEqual(["hospitality", "real_estate", "insurance", "healthcare", "retail", "other"]);
  });
  it("SOURCE has 5 values", () => {
    expect(SOURCE).toEqual(["referral", "inbound", "outbound", "event", "other"]);
  });
  it("LEAD_STAGE has the 6 pipeline stages (incl. lost)", () => {
    expect(LEAD_STAGE).toEqual(["new", "contacted", "qualified", "proposal_sent", "won", "lost"]);
  });
  it("CLIENT_STATUS has 3 states", () => {
    expect(CLIENT_STATUS).toEqual(["active", "paused", "churned"]);
  });
  it("ACTIVITY_TYPE has 4 kinds", () => {
    expect(ACTIVITY_TYPE).toEqual(["call", "email", "meeting", "note"]);
  });
});
```

- [ ] **Step 2:** Run test — expect fail

```bash
pnpm test
```

Expected: FAIL (module not found).

- [ ] **Step 3:** Implement `src/lib/enums.ts`

```ts
export const INDUSTRY = ["hospitality", "real_estate", "insurance", "healthcare", "retail", "other"] as const;
export const SOURCE = ["referral", "inbound", "outbound", "event", "other"] as const;
export const LEAD_STAGE = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;
export const CLIENT_STATUS = ["active", "paused", "churned"] as const;
export const ACTIVITY_TYPE = ["call", "email", "meeting", "note"] as const;

export type Industry = typeof INDUSTRY[number];
export type Source = typeof SOURCE[number];
export type LeadStage = typeof LEAD_STAGE[number];
export type ClientStatus = typeof CLIENT_STATUS[number];
export type ActivityType = typeof ACTIVITY_TYPE[number];
```

- [ ] **Step 4:** Run test — expect pass

```bash
pnpm test
```

Expected: 5 new tests pass, all existing pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/enums.ts src/lib/__tests__/enums.test.ts
git commit -m "feat(m2): shared enum constants"
```

---

## Task 4: Money Helpers (TDD)

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/__tests__/money.test.ts`

- [ ] **Step 1:** Write failing test

Create `src/lib/__tests__/money.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatEuros, eurosToCents, centsToEuros } from "@/lib/money";

describe("money", () => {
  it("formatEuros formats cents as EUR", () => {
    expect(formatEuros(125000)).toBe("€1,250.00");
    expect(formatEuros(0)).toBe("€0.00");
  });
  it("formatEuros returns em-dash on null/undefined", () => {
    expect(formatEuros(null)).toBe("—");
    expect(formatEuros(undefined)).toBe("—");
  });
  it("eurosToCents converts decimal euros", () => {
    expect(eurosToCents("1250")).toBe(125000);
    expect(eurosToCents("1250.50")).toBe(125050);
    expect(eurosToCents("")).toBeNull();
  });
  it("centsToEuros formats for input fields", () => {
    expect(centsToEuros(125050)).toBe("1250.50");
    expect(centsToEuros(null)).toBe("");
  });
});
```

- [ ] **Step 2:** Run — expect fail.

- [ ] **Step 3:** Implement `src/lib/money.ts`

```ts
const EUR = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return EUR.format(cents / 100);
}

export function eurosToCents(euros: string): number | null {
  const trimmed = euros.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export function centsToEuros(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}
```

- [ ] **Step 4:** Run — expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/money.ts src/lib/__tests__/money.test.ts
git commit -m "feat(m2): EUR formatter and cents helpers"
```

---

## Task 5: Drizzle Schema — Drop Users, Add Three Tables

**Files:**
- Modify: `src/db/schema.ts` (replace entirely)

- [ ] **Step 1:** Replace `src/db/schema.ts` with:

```ts
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    phone: text("phone"),
    industry: text("industry").notNull(),
    source: text("source").notNull(),
    stage: text("stage").notNull().default("new"),
    estimatedValueCents: integer("estimated_value_cents"),
    followUpDate: text("follow_up_date"),
    convertedAt: integer("converted_at"),
    convertedClientId: text("converted_client_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    createdIdx: index("leads_created_idx").on(sql`${t.createdAt} DESC`),
  }),
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    phone: text("phone"),
    industry: text("industry").notNull(),
    status: text("status").notNull().default("active"),
    contractStartDate: text("contract_start_date").notNull(),
    mrrCents: integer("mrr_cents"),
    fromLeadId: text("from_lead_id"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => ({
    createdIdx: index("clients_created_idx").on(sql`${t.createdAt} DESC`),
  }),
);

export const activities = sqliteTable(
  "activities",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    body: text("body").notNull(),
    occurredAt: integer("occurred_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    leadOccurredIdx: index("activities_lead_occurred_idx").on(t.leadId, sql`${t.occurredAt} DESC`),
  }),
);

export type Lead = typeof leads.$inferSelect;
export type LeadInsert = typeof leads.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type ClientInsert = typeof clients.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type ActivityInsert = typeof activities.$inferInsert;
```

- [ ] **Step 2:** Generate migration

```bash
pnpm db:generate
```

Expected: a new migration file under `drizzle/` that drops `users` and creates `leads`, `clients`, `activities` with indexes. Inspect the file — ensure the `activities.lead_id` FK has `ON DELETE CASCADE`.

If the generated SQL is missing the cascade, manually edit the migration SQL to add it. Drizzle-kit sometimes omits cascade in Turso mode — verify before committing.

- [ ] **Step 3:** Verify build

```bash
pnpm build
```

Expected: succeeds (types flow through).

- [ ] **Step 4:** Commit

```bash
git add src/db/schema.ts drizzle/
git commit -m "feat(m2): drizzle schema for leads, clients, activities"
```

**Note:** DO NOT run `pnpm db:migrate` yet. The schema is locked in but we migrate against real Turso at the end (Task 24) — the in-memory test DB runs its own migrations per-test.

---

## Task 6: In-Memory Test DB Helper

**Files:**
- Create: `src/db/__tests__/test-db.ts`

- [ ] **Step 1:** Create the helper

```ts
// src/db/__tests__/test-db.ts
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/db/schema";
import path from "node:path";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function makeTestDb(): Promise<TestDb> {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}
```

- [ ] **Step 2:** Sanity test the helper

Create `src/db/__tests__/test-db.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { makeTestDb } from "./test-db";
import { leads, clients, activities } from "@/db/schema";

describe("makeTestDb", () => {
  it("creates a clean in-memory DB with all 3 tables", async () => {
    const db = await makeTestDb();
    const l = await db.select().from(leads);
    const c = await db.select().from(clients);
    const a = await db.select().from(activities);
    expect(l).toEqual([]);
    expect(c).toEqual([]);
    expect(a).toEqual([]);
  });

  it("each call returns a fresh DB", async () => {
    const db1 = await makeTestDb();
    await db1.insert(leads).values({
      id: "l1", name: "A", email: "a@b.co", industry: "retail", source: "inbound",
      stage: "new", createdAt: 0, updatedAt: 0,
    });
    const db2 = await makeTestDb();
    const rows = await db2.select().from(leads);
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 3:** Run — expect pass

```bash
pnpm test
```

Expected: new tests pass. If `migrate()` fails, the most likely cause is the migrations folder path. Verify `drizzle/` exists at repo root.

- [ ] **Step 4:** Commit

```bash
git add src/db/__tests__
git commit -m "test(m2): in-memory libsql helper for action tests"
```

---

## Task 7: Extend EmptyState with Optional CTA

**Files:**
- Modify: `src/components/EmptyState.tsx`

- [ ] **Step 1:** Replace `src/components/EmptyState.tsx` with:

```tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  moduleLabel?: string;
  description?: string;
  cta?: { label: string; href: string };
};

export function EmptyState({ title, moduleLabel, description, cta }: Props) {
  return (
    <Card className="mx-auto mt-16 max-w-md text-center">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {description ?? (moduleLabel ? `Coming in ${moduleLabel}.` : null)}
        </div>
        {cta && (
          <Button asChild>
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

Callsites from Module 1 (`dashboard/page.tsx`, `agents/page.tsx`, `admin/page.tsx`, `settings/page.tsx`) still work since `moduleLabel` remains the primary prop. The old `/clients/page.tsx` placeholder will be replaced in Task 20, so we don't need to update its call.

**If shadcn `base-nova` Button doesn't support `asChild`:** use `render` prop instead: `<Button render={<Link href={cta.href} />}>{cta.label}</Button>`. Test this during Step 2.

- [ ] **Step 2:** Verify build

```bash
pnpm build
```

Expected: succeeds. If a type error appears about `asChild`, switch to `render` per the note above.

- [ ] **Step 3:** Commit

```bash
git add src/components/EmptyState.tsx
git commit -m "feat(m2): extend EmptyState with optional CTA"
```

---

## Task 8: Add Leads to Sidebar

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1:** Open `src/components/layout/Sidebar.tsx` and modify the icon imports + NAV array.

Change the imports line from:
```tsx
import { LayoutDashboard, Users, Bot, Receipt, Settings } from "lucide-react";
```
to:
```tsx
import { LayoutDashboard, Inbox, Users, Bot, Receipt, Settings } from "lucide-react";
```

Change the NAV array from:
```tsx
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/admin", label: "Admin", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];
```
to:
```tsx
const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Inbox },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/admin", label: "Admin", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];
```

- [ ] **Step 2:** Commit

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(m2): add Leads to sidebar nav"
```

(We commit before the routes exist; visiting `/leads` will 404 until Task 11. That's fine — the sidebar just needs the entry.)

---

## Task 9: Lead Zod Schemas (TDD)

**Files:**
- Create: `src/lib/leads/schema.ts`
- Test: `src/lib/leads/__tests__/schema.test.ts`

- [ ] **Step 1:** Write failing test

```ts
// src/lib/leads/__tests__/schema.test.ts
import { describe, it, expect } from "vitest";
import { LeadCreate, LeadUpdate } from "@/lib/leads/schema";

const valid = {
  name: "Harry",
  company: "Innovaco",
  email: "harry@innovaco.cy",
  phone: "+357 99 000000",
  industry: "hospitality" as const,
  source: "referral" as const,
  stage: "new" as const,
  estimated_value_cents: 500000,
  follow_up_date: "2026-05-01",
};

describe("LeadCreate", () => {
  it("accepts valid input", () => {
    expect(LeadCreate.parse(valid)).toMatchObject({ name: "Harry", email: "harry@innovaco.cy" });
  });
  it("rejects empty name", () => {
    expect(() => LeadCreate.parse({ ...valid, name: "" })).toThrow();
  });
  it("rejects invalid email", () => {
    expect(() => LeadCreate.parse({ ...valid, email: "nope" })).toThrow();
  });
  it("rejects invalid industry", () => {
    expect(() => LeadCreate.parse({ ...valid, industry: "aerospace" })).toThrow();
  });
  it("rejects invalid stage", () => {
    expect(() => LeadCreate.parse({ ...valid, stage: "somewhere" })).toThrow();
  });
  it("accepts nullish company/phone/estimated_value/follow_up", () => {
    const minimal = {
      name: "Harry", email: "h@i.co",
      industry: "retail" as const, source: "inbound" as const, stage: "new" as const,
    };
    expect(() => LeadCreate.parse(minimal)).not.toThrow();
  });
  it("rejects negative estimated_value_cents", () => {
    expect(() => LeadCreate.parse({ ...valid, estimated_value_cents: -1 })).toThrow();
  });
  it("rejects malformed follow_up_date", () => {
    expect(() => LeadCreate.parse({ ...valid, follow_up_date: "next week" })).toThrow();
  });
});

describe("LeadUpdate", () => {
  it("accepts a partial update", () => {
    expect(LeadUpdate.parse({ stage: "won" })).toEqual({ stage: "won" });
  });
});
```

- [ ] **Step 2:** Run — expect fail.

- [ ] **Step 3:** Implement `src/lib/leads/schema.ts`

```ts
import { z } from "zod";
import { INDUSTRY, SOURCE, LEAD_STAGE } from "@/lib/enums";

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

export type LeadCreateInput = z.infer<typeof LeadCreate>;
export type LeadUpdateInput = z.infer<typeof LeadUpdate>;
```

- [ ] **Step 4:** Run — expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/leads/schema.ts src/lib/leads/__tests__/schema.test.ts
git commit -m "feat(m2): lead Zod schemas"
```

---

## Task 10: Lead Queries

**Files:**
- Create: `src/lib/leads/queries.ts`

- [ ] **Step 1:** Implement

```ts
// src/lib/leads/queries.ts
import "server-only";
import { db } from "@/db/client";
import { leads } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getLeads() {
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string) {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 2:** Build check

```bash
pnpm build
```

Expected: succeeds.

- [ ] **Step 3:** Commit

```bash
git add src/lib/leads/queries.ts
git commit -m "feat(m2): lead read queries"
```

Queries are exercised by pages; no dedicated unit tests. The schema and action tests cover correctness.

---

## Task 11: Lead Actions — create/update/delete/updateStage (TDD)

**Files:**
- Create: `src/lib/leads/actions.ts`
- Test: `src/lib/leads/__tests__/actions.test.ts`

The default `src/db/client.ts` builds its Drizzle client from `env`, which always points to Turso — not useful in tests. We need actions that can be tested against `makeTestDb()`. Pattern: expose internal functions that take a `db` parameter, plus thin public wrappers that use the real client.

- [ ] **Step 1:** Write failing test

```ts
// src/lib/leads/__tests__/actions.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { leads } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  _createLead, _updateLead, _deleteLead, _updateStage,
} from "@/lib/leads/actions";

describe("lead actions (core)", () => {
  let db: TestDb;
  beforeEach(async () => { db = await makeTestDb(); });

  const baseInput = {
    name: "Harry", email: "h@i.co",
    industry: "retail" as const, source: "inbound" as const, stage: "new" as const,
  };

  it("_createLead inserts and returns the new row with id + timestamps", async () => {
    const row = await _createLead(db, baseInput);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.stage).toBe("new");
    expect(row.createdAt).toBeGreaterThan(0);
    expect(row.updatedAt).toBe(row.createdAt);
  });

  it("_updateLead modifies fields and bumps updatedAt", async () => {
    const row = await _createLead(db, baseInput);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateLead(db, row.id, { name: "Harry R." });
    expect(updated.name).toBe("Harry R.");
    expect(updated.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("_updateLead returns null for unknown id", async () => {
    expect(await _updateLead(db, "missing", { name: "x" })).toBeNull();
  });

  it("_deleteLead removes the row", async () => {
    const row = await _createLead(db, baseInput);
    const deleted = await _deleteLead(db, row.id);
    expect(deleted).toBe(true);
    const remaining = await db.select().from(leads).where(eq(leads.id, row.id));
    expect(remaining).toEqual([]);
  });

  it("_updateStage changes stage and bumps updatedAt", async () => {
    const row = await _createLead(db, baseInput);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateStage(db, row.id, "qualified");
    expect(updated?.stage).toBe("qualified");
    expect(updated!.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("_updateStage rejects invalid stage", async () => {
    const row = await _createLead(db, baseInput);
    // @ts-expect-error - runtime check
    await expect(_updateStage(db, row.id, "garbage")).rejects.toThrow();
  });
});
```

- [ ] **Step 2:** Run — expect fail (module not found).

- [ ] **Step 3:** Implement `src/lib/leads/actions.ts`

```ts
"use server";

import { db as realDb } from "@/db/client";
import { leads, type Lead } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LeadCreate, LeadUpdate, type LeadCreateInput, type LeadUpdateInput } from "./schema";
import { LEAD_STAGE, type LeadStage } from "@/lib/enums";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() { return Date.now(); }

export async function _createLead(db: AnyDb, raw: LeadCreateInput): Promise<Lead> {
  const input = LeadCreate.parse(raw);
  const id = crypto.randomUUID();
  const ts = now();
  const row: Lead = {
    id, name: input.name, company: input.company ?? null,
    email: input.email, phone: input.phone ?? null,
    industry: input.industry, source: input.source, stage: input.stage,
    estimatedValueCents: input.estimated_value_cents ?? null,
    followUpDate: input.follow_up_date ?? null,
    convertedAt: null, convertedClientId: null,
    createdAt: ts, updatedAt: ts,
  };
  await db.insert(leads).values(row);
  return row;
}

export async function _updateLead(db: AnyDb, id: string, raw: LeadUpdateInput): Promise<Lead | null> {
  const input = LeadUpdate.parse(raw);
  const ts = now();
  const patch: Partial<Lead> = { updatedAt: ts };
  if (input.name !== undefined) patch.name = input.name;
  if (input.company !== undefined) patch.company = input.company ?? null;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.source !== undefined) patch.source = input.source;
  if (input.stage !== undefined) patch.stage = input.stage;
  if (input.estimated_value_cents !== undefined) patch.estimatedValueCents = input.estimated_value_cents ?? null;
  if (input.follow_up_date !== undefined) patch.followUpDate = input.follow_up_date ?? null;

  const result = await db.update(leads).set(patch).where(eq(leads.id, id)).returning();
  return result[0] ?? null;
}

export async function _deleteLead(db: AnyDb, id: string): Promise<boolean> {
  const result = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
  return result.length > 0;
}

export async function _updateStage(db: AnyDb, id: string, stage: LeadStage): Promise<Lead | null> {
  if (!LEAD_STAGE.includes(stage as LeadStage)) throw new Error(`invalid stage: ${stage}`);
  const ts = now();
  const result = await db.update(leads)
    .set({ stage, updatedAt: ts })
    .where(eq(leads.id, id))
    .returning();
  return result[0] ?? null;
}

// --- Public Server Actions (use real db + revalidate + auth) -----------------

export async function createLead(raw: LeadCreateInput) {
  await requireAuth();
  const row = await _createLead(realDb, raw);
  revalidatePath("/leads");
  return row;
}

export async function updateLead(id: string, raw: LeadUpdateInput) {
  await requireAuth();
  const row = await _updateLead(realDb, id, raw);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return row;
}

export async function deleteLead(id: string) {
  await requireAuth();
  const ok = await _deleteLead(realDb, id);
  revalidatePath("/leads");
  if (ok) redirect("/leads");
  return ok;
}

export async function updateStage(id: string, stage: LeadStage) {
  await requireAuth();
  const row = await _updateStage(realDb, id, stage);
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return row;
}
```

- [ ] **Step 4:** Run — expect all 6 tests pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/leads/actions.ts src/lib/leads/__tests__/actions.test.ts
git commit -m "feat(m2): lead create/update/delete/updateStage actions"
```

---

## Task 12: Client Zod Schemas (TDD)

**Files:**
- Create: `src/lib/clients/schema.ts`
- Test: `src/lib/clients/__tests__/schema.test.ts`

- [ ] **Step 1:** Write failing test

```ts
// src/lib/clients/__tests__/schema.test.ts
import { describe, it, expect } from "vitest";
import { ClientCreate, ClientUpdate } from "@/lib/clients/schema";

const valid = {
  name: "Acme", company: "Acme Ltd", email: "ops@acme.cy", phone: "+357",
  industry: "retail" as const, status: "active" as const,
  contract_start_date: "2026-04-01", mrr_cents: 200000,
};

describe("ClientCreate", () => {
  it("accepts valid", () => expect(() => ClientCreate.parse(valid)).not.toThrow());
  it("requires name + email + industry + contract_start_date", () => {
    expect(() => ClientCreate.parse({ ...valid, name: "" })).toThrow();
    expect(() => ClientCreate.parse({ ...valid, email: "bad" })).toThrow();
    expect(() => ClientCreate.parse({ ...valid, industry: "xyz" })).toThrow();
    expect(() => ClientCreate.parse({ ...valid, contract_start_date: "2026/04/01" })).toThrow();
  });
  it("rejects invalid status", () => {
    expect(() => ClientCreate.parse({ ...valid, status: "zombie" })).toThrow();
  });
  it("rejects negative mrr_cents", () => {
    expect(() => ClientCreate.parse({ ...valid, mrr_cents: -1 })).toThrow();
  });
});

describe("ClientUpdate", () => {
  it("accepts partial", () => expect(ClientUpdate.parse({ status: "paused" })).toEqual({ status: "paused" }));
});
```

- [ ] **Step 2:** Run — expect fail.

- [ ] **Step 3:** Implement `src/lib/clients/schema.ts`

```ts
import { z } from "zod";
import { INDUSTRY, CLIENT_STATUS } from "@/lib/enums";

export const ClientCreate = z.object({
  name: z.string().min(1).max(120),
  company: z.string().max(120).nullish(),
  email: z.string().email(),
  phone: z.string().max(40).nullish(),
  industry: z.enum(INDUSTRY),
  status: z.enum(CLIENT_STATUS).default("active"),
  contract_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mrr_cents: z.number().int().nonnegative().nullish(),
});

export const ClientUpdate = ClientCreate.partial();

export type ClientCreateInput = z.infer<typeof ClientCreate>;
export type ClientUpdateInput = z.infer<typeof ClientUpdate>;
```

- [ ] **Step 4:** Run — expect pass.

- [ ] **Step 5:** Commit

```bash
git add src/lib/clients/schema.ts src/lib/clients/__tests__/schema.test.ts
git commit -m "feat(m2): client Zod schemas"
```

---

## Task 13: Client Queries + Actions (TDD)

**Files:**
- Create: `src/lib/clients/queries.ts`
- Create: `src/lib/clients/actions.ts`
- Test: `src/lib/clients/__tests__/actions.test.ts`

- [ ] **Step 1:** Create `src/lib/clients/queries.ts`

```ts
import "server-only";
import { db } from "@/db/client";
import { clients } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getClients() {
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: string) {
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}
```

- [ ] **Step 2:** Write failing test

```ts
// src/lib/clients/__tests__/actions.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { _createClient, _updateClient, _deleteClient } from "@/lib/clients/actions";

describe("client actions (core)", () => {
  let db: TestDb;
  beforeEach(async () => { db = await makeTestDb(); });

  const input = {
    name: "Acme", email: "ops@acme.cy",
    industry: "retail" as const, status: "active" as const,
    contract_start_date: "2026-04-01",
  };

  it("_createClient inserts with id + timestamps", async () => {
    const row = await _createClient(db, input);
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.status).toBe("active");
  });

  it("_updateClient patches and bumps updatedAt", async () => {
    const row = await _createClient(db, input);
    await new Promise((r) => setTimeout(r, 5));
    const updated = await _updateClient(db, row.id, { mrr_cents: 300000 });
    expect(updated?.mrrCents).toBe(300000);
    expect(updated!.updatedAt).toBeGreaterThan(row.updatedAt);
  });

  it("_deleteClient removes the row", async () => {
    const row = await _createClient(db, input);
    expect(await _deleteClient(db, row.id)).toBe(true);
  });
});
```

- [ ] **Step 3:** Run — expect fail.

- [ ] **Step 4:** Implement `src/lib/clients/actions.ts`

```ts
"use server";

import { db as realDb } from "@/db/client";
import { clients, type Client } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ClientCreate, ClientUpdate, type ClientCreateInput, type ClientUpdateInput } from "./schema";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

function now() { return Date.now(); }

export async function _createClient(db: AnyDb, raw: ClientCreateInput): Promise<Client> {
  const input = ClientCreate.parse(raw);
  const id = crypto.randomUUID();
  const ts = now();
  const row: Client = {
    id, name: input.name, company: input.company ?? null,
    email: input.email, phone: input.phone ?? null,
    industry: input.industry, status: input.status,
    contractStartDate: input.contract_start_date,
    mrrCents: input.mrr_cents ?? null,
    fromLeadId: null,
    createdAt: ts, updatedAt: ts,
  };
  await db.insert(clients).values(row);
  return row;
}

export async function _updateClient(db: AnyDb, id: string, raw: ClientUpdateInput): Promise<Client | null> {
  const input = ClientUpdate.parse(raw);
  const ts = now();
  const patch: Partial<Client> = { updatedAt: ts };
  if (input.name !== undefined) patch.name = input.name;
  if (input.company !== undefined) patch.company = input.company ?? null;
  if (input.email !== undefined) patch.email = input.email;
  if (input.phone !== undefined) patch.phone = input.phone ?? null;
  if (input.industry !== undefined) patch.industry = input.industry;
  if (input.status !== undefined) patch.status = input.status;
  if (input.contract_start_date !== undefined) patch.contractStartDate = input.contract_start_date;
  if (input.mrr_cents !== undefined) patch.mrrCents = input.mrr_cents ?? null;

  const result = await db.update(clients).set(patch).where(eq(clients.id, id)).returning();
  return result[0] ?? null;
}

export async function _deleteClient(db: AnyDb, id: string): Promise<boolean> {
  const result = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  return result.length > 0;
}

// --- Public Server Actions -----------------

export async function createClient(raw: ClientCreateInput) {
  await requireAuth();
  const row = await _createClient(realDb, raw);
  revalidatePath("/clients");
  return row;
}

export async function updateClient(id: string, raw: ClientUpdateInput) {
  await requireAuth();
  const row = await _updateClient(realDb, id, raw);
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return row;
}

export async function deleteClient(id: string) {
  await requireAuth();
  const ok = await _deleteClient(realDb, id);
  revalidatePath("/clients");
  if (ok) redirect("/clients");
  return ok;
}
```

- [ ] **Step 5:** Run — expect pass.

- [ ] **Step 6:** Commit

```bash
git add src/lib/clients
git commit -m "feat(m2): client create/update/delete actions and queries"
```

---

## Task 14: Convert Lead → Client (TDD)

**Files:**
- Modify: `src/lib/leads/actions.ts` (add `_convertToClient` and `convertToClient`)
- Modify: `src/lib/leads/__tests__/actions.test.ts` (add tests)

- [ ] **Step 1:** Append tests to `src/lib/leads/__tests__/actions.test.ts` (inside the existing file, after the existing `describe` block):

```ts
import { clients } from "@/db/schema";
import { _convertToClient } from "@/lib/leads/actions";

describe("_convertToClient", () => {
  let db: TestDb;
  beforeEach(async () => { db = await makeTestDb(); });

  const base = {
    name: "Harry", email: "h@i.co",
    industry: "retail" as const, source: "inbound" as const, stage: "won" as const,
  };

  it("creates a client, links back on the lead, and is idempotent", async () => {
    const lead = await _createLead(db, base);

    const first = await _convertToClient(db, lead.id);
    expect(first.created).toBe(true);
    expect(first.client.fromLeadId).toBe(lead.id);
    expect(first.client.name).toBe(lead.name);
    expect(first.client.industry).toBe("retail");
    expect(first.client.status).toBe("active");

    const refreshed = await db.select().from(leads).where(eq(leads.id, lead.id));
    expect(refreshed[0].convertedClientId).toBe(first.client.id);
    expect(refreshed[0].convertedAt).not.toBeNull();

    const second = await _convertToClient(db, lead.id);
    expect(second.created).toBe(false);
    expect(second.client.id).toBe(first.client.id);

    const allClients = await db.select().from(clients);
    expect(allClients).toHaveLength(1);
  });

  it("throws if lead does not exist", async () => {
    await expect(_convertToClient(db, "missing")).rejects.toThrow(/not found/i);
  });
});
```

- [ ] **Step 2:** Run — expect fail (missing export).

- [ ] **Step 3:** Append to `src/lib/leads/actions.ts` (after `_updateStage`, before the `--- Public Server Actions` divider):

```ts
import { clients, type Client } from "@/db/schema";
import { _createClient } from "@/lib/clients/actions";

export type ConvertResult = { client: Client; created: boolean };

export async function _convertToClient(db: AnyDb, leadId: string): Promise<ConvertResult> {
  const leadRows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  const lead = leadRows[0];
  if (!lead) throw new Error(`lead not found: ${leadId}`);

  // Idempotency: already converted -> return existing client
  if (lead.convertedClientId) {
    const existing = await db.select().from(clients).where(eq(clients.id, lead.convertedClientId)).limit(1);
    if (existing[0]) return { client: existing[0], created: false };
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const client = await _createClient(db, {
    name: lead.name,
    company: lead.company ?? undefined,
    email: lead.email,
    phone: lead.phone ?? undefined,
    industry: lead.industry as Parameters<typeof _createClient>[1]["industry"],
    status: "active",
    contract_start_date: today,
  });

  // _createClient doesn't know about fromLeadId; patch it now.
  const ts = Date.now();
  const [linked] = await db.update(clients)
    .set({ fromLeadId: lead.id, updatedAt: ts })
    .where(eq(clients.id, client.id))
    .returning();

  await db.update(leads)
    .set({ convertedAt: ts, convertedClientId: client.id, updatedAt: ts })
    .where(eq(leads.id, lead.id));

  return { client: linked, created: true };
}
```

Then add the public wrapper (in the `--- Public Server Actions` block):

```ts
export async function convertToClient(leadId: string) {
  await requireAuth();
  const result = await _convertToClient(realDb, leadId);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients");
  revalidatePath(`/clients/${result.client.id}`);
  redirect(`/clients/${result.client.id}`);
}
```

- [ ] **Step 4:** Run — expect all lead action tests pass (8 total).

- [ ] **Step 5:** Commit

```bash
git add src/lib/leads
git commit -m "feat(m2): convertToClient action"
```

---

## Task 15: Activity Zod + Actions (TDD)

**Files:**
- Create: `src/lib/activities/schema.ts`
- Create: `src/lib/activities/queries.ts`
- Create: `src/lib/activities/actions.ts`
- Test: `src/lib/activities/__tests__/schema.test.ts`
- Test: `src/lib/activities/__tests__/actions.test.ts`

- [ ] **Step 1:** Schema test

```ts
// src/lib/activities/__tests__/schema.test.ts
import { describe, it, expect } from "vitest";
import { ActivityCreate } from "@/lib/activities/schema";

const valid = { lead_id: "l1", type: "call" as const, body: "rang", occurred_at_ms: 1700000000000 };

describe("ActivityCreate", () => {
  it("accepts valid", () => expect(() => ActivityCreate.parse(valid)).not.toThrow());
  it("rejects empty body", () => expect(() => ActivityCreate.parse({ ...valid, body: "" })).toThrow());
  it("rejects invalid type", () => expect(() => ActivityCreate.parse({ ...valid, type: "tweet" })).toThrow());
  it("rejects non-integer timestamp", () => expect(() => ActivityCreate.parse({ ...valid, occurred_at_ms: 1.5 })).toThrow());
});
```

- [ ] **Step 2:** Schema impl `src/lib/activities/schema.ts`

```ts
import { z } from "zod";
import { ACTIVITY_TYPE } from "@/lib/enums";

export const ActivityCreate = z.object({
  lead_id: z.string().min(1),
  type: z.enum(ACTIVITY_TYPE),
  body: z.string().min(1).max(10_000),
  occurred_at_ms: z.number().int().positive(),
});

export type ActivityCreateInput = z.infer<typeof ActivityCreate>;
```

- [ ] **Step 3:** Queries `src/lib/activities/queries.ts`

```ts
import "server-only";
import { db } from "@/db/client";
import { activities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getActivitiesByLead(leadId: string) {
  return db.select().from(activities)
    .where(eq(activities.leadId, leadId))
    .orderBy(desc(activities.occurredAt));
}
```

- [ ] **Step 4:** Actions test

```ts
// src/lib/activities/__tests__/actions.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { makeTestDb, type TestDb } from "@/db/__tests__/test-db";
import { _createLead, _deleteLead } from "@/lib/leads/actions";
import { _addActivity, _deleteActivity } from "@/lib/activities/actions";
import { activities } from "@/db/schema";

describe("activity actions (core)", () => {
  let db: TestDb;
  beforeEach(async () => { db = await makeTestDb(); });

  const leadInput = {
    name: "Harry", email: "h@i.co",
    industry: "retail" as const, source: "inbound" as const, stage: "new" as const,
  };

  it("_addActivity inserts for a lead", async () => {
    const lead = await _createLead(db, leadInput);
    const act = await _addActivity(db, {
      lead_id: lead.id, type: "call", body: "first call", occurred_at_ms: Date.now(),
    });
    expect(act.leadId).toBe(lead.id);
    expect(act.type).toBe("call");
  });

  it("_deleteActivity removes", async () => {
    const lead = await _createLead(db, leadInput);
    const act = await _addActivity(db, {
      lead_id: lead.id, type: "note", body: "x", occurred_at_ms: Date.now(),
    });
    expect(await _deleteActivity(db, act.id)).toBe(true);
  });

  it("cascade: deleting a lead deletes its activities", async () => {
    const lead = await _createLead(db, leadInput);
    await _addActivity(db, { lead_id: lead.id, type: "note", body: "a", occurred_at_ms: Date.now() });
    await _addActivity(db, { lead_id: lead.id, type: "note", body: "b", occurred_at_ms: Date.now() });
    await _deleteLead(db, lead.id);
    const rows = await db.select().from(activities);
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 5:** Actions impl `src/lib/activities/actions.ts`

```ts
"use server";

import { db as realDb } from "@/db/client";
import { activities, type Activity } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ActivityCreate, type ActivityCreateInput } from "./schema";
import type { TestDb } from "@/db/__tests__/test-db";

type AnyDb = typeof realDb | TestDb;

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) throw new Error("UNAUTHORIZED");
}

export async function _addActivity(db: AnyDb, raw: ActivityCreateInput): Promise<Activity> {
  const input = ActivityCreate.parse(raw);
  const ts = Date.now();
  const row: Activity = {
    id: crypto.randomUUID(),
    leadId: input.lead_id,
    type: input.type,
    body: input.body,
    occurredAt: input.occurred_at_ms,
    createdAt: ts,
  };
  await db.insert(activities).values(row);
  return row;
}

export async function _deleteActivity(db: AnyDb, id: string): Promise<boolean> {
  const result = await db.delete(activities).where(eq(activities.id, id)).returning({ id: activities.id });
  return result.length > 0;
}

export async function addActivity(raw: ActivityCreateInput) {
  await requireAuth();
  const row = await _addActivity(realDb, raw);
  revalidatePath(`/leads/${raw.lead_id}`);
  return row;
}

export async function deleteActivity(id: string, leadId: string) {
  await requireAuth();
  const ok = await _deleteActivity(realDb, id);
  revalidatePath(`/leads/${leadId}`);
  return ok;
}
```

- [ ] **Step 6:** Run — expect all pass.

- [ ] **Step 7:** Commit

```bash
git add src/lib/activities
git commit -m "feat(m2): activity schema, queries, actions with cascade"
```

---

## Task 16: LeadForm Component

**Files:**
- Create: `src/components/leads/LeadForm.tsx`

- [ ] **Step 1:** Implement

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LeadCreate, type LeadCreateInput } from "@/lib/leads/schema";
import { INDUSTRY, SOURCE, LEAD_STAGE } from "@/lib/enums";
import { createLead, updateLead } from "@/lib/leads/actions";
import { eurosToCents, centsToEuros } from "@/lib/money";
import type { Lead } from "@/db/schema";

type Props = {
  mode: "create" | "edit";
  initial?: Lead;
};

type FormValues = {
  name: string; company: string; email: string; phone: string;
  industry: LeadCreateInput["industry"]; source: LeadCreateInput["source"];
  stage: LeadCreateInput["stage"];
  estimated_value_euros: string;
  follow_up_date: string;
};

export function LeadForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      industry: (initial?.industry as FormValues["industry"]) ?? "other",
      source: (initial?.source as FormValues["source"]) ?? "inbound",
      stage: (initial?.stage as FormValues["stage"]) ?? "new",
      estimated_value_euros: centsToEuros(initial?.estimatedValueCents),
      follow_up_date: initial?.followUpDate ?? "",
    },
  });

  function onSubmit(data: FormValues) {
    const input: LeadCreateInput = {
      name: data.name, company: data.company || null, email: data.email,
      phone: data.phone || null, industry: data.industry, source: data.source, stage: data.stage,
      estimated_value_cents: eurosToCents(data.estimated_value_euros),
      follow_up_date: data.follow_up_date || null,
    };
    const parsed = LeadCreate.safeParse(input);
    if (!parsed.success) { console.error(parsed.error); return; }

    startTransition(async () => {
      if (mode === "create") {
        const row = await createLead(parsed.data);
        router.push(`/leads/${row.id}`);
      } else if (initial) {
        await updateLead(initial.id, parsed.data);
        router.push(`/leads/${initial.id}`);
        router.refresh();
      }
    });
  }

  const industry = watch("industry");
  const source = watch("source");
  const stage = watch("stage");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name", { required: "Required" })} autoFocus />
        </Field>
        <Field label="Company">
          <Input {...register("company")} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email", { required: "Required" })} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="Industry">
          <Select value={industry} onValueChange={(v) => setValue("industry", v as FormValues["industry"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Source">
          <Select value={source} onValueChange={(v) => setValue("source", v as FormValues["source"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCE.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Stage">
          <Select value={stage} onValueChange={(v) => setValue("stage", v as FormValues["stage"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STAGE.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estimated value (EUR)">
          <Input type="number" step="0.01" {...register("estimated_value_euros")} />
        </Field>
        <Field label="Follow-up date">
          <Input type="date" {...register("follow_up_date")} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create lead" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2:** Verify build.

```bash
pnpm build
```

Expected: succeeds. If shadcn `Select` primitive has a different API under base-nova (e.g., `render` prop), adjust the trigger accordingly. The `value` / `onValueChange` pattern is standard in shadcn's Select wrapper.

- [ ] **Step 3:** Commit

```bash
git add src/components/leads/LeadForm.tsx
git commit -m "feat(m2): lead create/edit form"
```

---

## Task 17: /leads — Table Page

**Files:**
- Create: `src/components/leads/LeadsTable.tsx`
- Create: `src/app/(app)/leads/page.tsx`

- [ ] **Step 1:** Table component

```tsx
// src/components/leads/LeadsTable.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LEAD_STAGE, INDUSTRY } from "@/lib/enums";
import { formatEuros } from "@/lib/money";
import type { Lead } from "@/db/schema";

type SortKey = "name" | "company" | "stage" | "estimatedValueCents" | "followUpDate" | "createdAt";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const qLower = q.toLowerCase();
    return leads
      .filter((l) => {
        if (stage !== "all" && l.stage !== stage) return false;
        if (industry !== "all" && l.industry !== industry) return false;
        if (!qLower) return true;
        return (
          l.name.toLowerCase().includes(qLower) ||
          (l.company ?? "").toLowerCase().includes(qLower) ||
          l.email.toLowerCase().includes(qLower)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return asc ? cmp : -cmp;
      });
  }, [leads, q, stage, industry, sortKey, asc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setAsc(!asc);
    else { setSortKey(k); setAsc(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input placeholder="Search name, company, email…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {LEAD_STAGE.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort("name")} className="cursor-pointer">Name</TableHead>
              <TableHead onClick={() => toggleSort("company")} className="cursor-pointer">Company</TableHead>
              <TableHead onClick={() => toggleSort("stage")} className="cursor-pointer">Stage</TableHead>
              <TableHead onClick={() => toggleSort("estimatedValueCents")} className="cursor-pointer text-right">Value</TableHead>
              <TableHead onClick={() => toggleSort("followUpDate")} className="cursor-pointer">Follow-up</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id} className="cursor-pointer">
                <TableCell><Link href={`/leads/${l.id}`} className="hover:underline">{l.name}</Link></TableCell>
                <TableCell>{l.company ?? "—"}</TableCell>
                <TableCell><Badge>{l.stage.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-right">{formatEuros(l.estimatedValueCents)}</TableCell>
                <TableCell>{l.followUpDate ?? "—"}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  No leads match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Page

```tsx
// src/app/(app)/leads/page.tsx
import Link from "next/link";
import { getLeads } from "@/lib/leads/queries";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

export default async function LeadsPage() {
  const leads = await getLeads();

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Capture your first lead to start tracking the pipeline."
        cta={{ label: "Add a lead", href: "/leads/new" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Button asChild><Link href="/leads/new">New lead</Link></Button>
      </div>
      <LeadsTable leads={leads} />
    </div>
  );
}
```

- [ ] **Step 3:** Verify build

```bash
pnpm build
```

Expected: succeeds. Route `/leads` should appear in build output.

- [ ] **Step 4:** Commit

```bash
git add src/components/leads/LeadsTable.tsx src/app/\(app\)/leads/page.tsx
git commit -m "feat(m2): /leads table view"
```

---

## Task 18: /leads/new — Create Page

**Files:**
- Create: `src/app/(app)/leads/new/page.tsx`

- [ ] **Step 1:** Page

```tsx
import { LeadForm } from "@/components/leads/LeadForm";

export default function NewLeadPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New lead</h1>
      <LeadForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 2:** Verify build.

- [ ] **Step 3:** Commit

```bash
git add src/app/\(app\)/leads/new
git commit -m "feat(m2): /leads/new create page"
```

---

## Task 19: /leads/[id] — Detail with Tabs + Activity

**Files:**
- Create: `src/components/activities/ActivityTimeline.tsx`
- Create: `src/components/activities/AddActivityForm.tsx`
- Create: `src/components/leads/ConvertToClientButton.tsx`
- Create: `src/components/leads/LeadDetailTabs.tsx`
- Create: `src/app/(app)/leads/[id]/page.tsx`
- Create: `src/app/(app)/leads/[id]/edit/page.tsx`

- [ ] **Step 1:** ActivityTimeline (Server Component)

```tsx
// src/components/activities/ActivityTimeline.tsx
import { Phone, Mail, Calendar, StickyNote } from "lucide-react";
import type { Activity } from "@/db/schema";

const ICONS = { call: Phone, email: Mail, meeting: Calendar, note: StickyNote } as const;

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet. Add the first one below.</p>;
  }
  return (
    <ol className="space-y-4">
      {activities.map((a) => {
        const Icon = ICONS[a.type as keyof typeof ICONS] ?? StickyNote;
        const when = new Date(a.occurredAt).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: "short" });
        return (
          <li key={a.id} className="flex gap-3">
            <div className="mt-1 h-8 w-8 shrink-0 rounded-full bg-muted grid place-items-center">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="text-xs text-muted-foreground">{a.type} · {when}</div>
              <div className="text-sm whitespace-pre-wrap">{a.body}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 2:** AddActivityForm (Client)

```tsx
// src/components/activities/AddActivityForm.tsx
"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_TYPE, type ActivityType } from "@/lib/enums";
import { addActivity } from "@/lib/activities/actions";

function nowLocalInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AddActivityForm({ leadId }: { leadId: string }) {
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocalInput());
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const ms = new Date(occurredAt).getTime();
    startTransition(async () => {
      await addActivity({ lead_id: leadId, type, body, occurred_at_ms: ms });
      setBody("");
      setOccurredAt(nowLocalInput());
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPE.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>When</Label>
          <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Note</Label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="What happened?" />
      </div>
      <Button type="submit" disabled={pending || !body.trim()}>{pending ? "Saving…" : "Add activity"}</Button>
    </form>
  );
}
```

- [ ] **Step 3:** ConvertToClientButton

```tsx
// src/components/leads/ConvertToClientButton.tsx
"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { convertToClient } from "@/lib/leads/actions";

export function ConvertToClientButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(() => convertToClient(leadId))}
    >
      {pending ? "Converting…" : "Convert to Client"}
    </Button>
  );
}
```

- [ ] **Step 4:** LeadDetailTabs — client boundary for the tab component

```tsx
// src/components/leads/LeadDetailTabs.tsx
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LeadDetailTabs({
  details, activity,
}: { details: React.ReactNode; activity: React.ReactNode }) {
  return (
    <Tabs defaultValue="details" className="space-y-4">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="details">{details}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 5:** Detail page

```tsx
// src/app/(app)/leads/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/leads/queries";
import { getActivitiesByLead } from "@/lib/activities/queries";
import { getClientById } from "@/lib/clients/queries";
import { LeadDetailTabs } from "@/components/leads/LeadDetailTabs";
import { ActivityTimeline } from "@/components/activities/ActivityTimeline";
import { AddActivityForm } from "@/components/activities/AddActivityForm";
import { ConvertToClientButton } from "@/components/leads/ConvertToClientButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();
  const [activities, convertedClient] = await Promise.all([
    getActivitiesByLead(lead.id),
    lead.convertedClientId ? getClientById(lead.convertedClientId) : Promise.resolve(null),
  ]);

  const details = (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-2xl text-sm">
      <Dt label="Email">{lead.email}</Dt>
      <Dt label="Phone">{lead.phone ?? "—"}</Dt>
      <Dt label="Company">{lead.company ?? "—"}</Dt>
      <Dt label="Industry">{lead.industry.replace("_", " ")}</Dt>
      <Dt label="Source">{lead.source}</Dt>
      <Dt label="Estimated value">{formatEuros(lead.estimatedValueCents)}</Dt>
      <Dt label="Follow-up">{lead.followUpDate ?? "—"}</Dt>
      {convertedClient && (
        <Dt label="Converted to">
          <Link href={`/clients/${convertedClient.id}`} className="underline">{convertedClient.name}</Link>
        </Dt>
      )}
    </dl>
  );

  const activity = (
    <div className="space-y-6 max-w-2xl">
      <AddActivityForm leadId={lead.id} />
      <ActivityTimeline activities={activities} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <div className="text-sm text-muted-foreground">{lead.company ?? ""}</div>
          <div className="mt-2"><Badge>{lead.stage.replace("_", " ")}</Badge></div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href={`/leads/${lead.id}/edit`}>Edit</Link></Button>
          {lead.stage === "won" && !lead.convertedClientId && <ConvertToClientButton leadId={lead.id} />}
        </div>
      </div>
      <LeadDetailTabs details={details} activity={activity} />
    </div>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
```

- [ ] **Step 6:** Edit page

```tsx
// src/app/(app)/leads/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/leads/queries";
import { LeadForm } from "@/components/leads/LeadForm";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit lead</h1>
      <LeadForm mode="edit" initial={lead} />
    </div>
  );
}
```

- [ ] **Step 7:** Verify build

```bash
pnpm build
```

Expected: `/leads/[id]` and `/leads/[id]/edit` appear.

- [ ] **Step 8:** Commit

```bash
git add src/components/activities src/components/leads src/app/\(app\)/leads/\[id\]
git commit -m "feat(m2): lead detail page with tabs, activity log, edit, convert"
```

---

## Task 20: /leads — Kanban Toggle

**Files:**
- Create: `src/components/leads/LeadsKanban.tsx`
- Modify: `src/app/(app)/leads/page.tsx` (wrap table in a view-switcher)

- [ ] **Step 1:** Kanban

```tsx
// src/components/leads/LeadsKanban.tsx
"use client";

import { useOptimistic, useTransition, useState } from "react";
import Link from "next/link";
import { LEAD_STAGE, type LeadStage } from "@/lib/enums";
import { updateStage } from "@/lib/leads/actions";
import { formatEuros } from "@/lib/money";
import type { Lead } from "@/db/schema";

const ACTIVE: readonly LeadStage[] = ["new", "contacted", "qualified", "proposal_sent", "won"];

export function LeadsKanban({ leads }: { leads: Lead[] }) {
  const [optimistic, setOptimistic] = useOptimistic(leads, (state, move: { id: string; stage: LeadStage }) =>
    state.map((l) => (l.id === move.id ? { ...l, stage: move.stage } : l)),
  );
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);

  function onDrop(stage: LeadStage) {
    if (!dragging) return;
    const id = dragging;
    setDragging(null);
    startTransition(async () => {
      setOptimistic({ id, stage });
      await updateStage(id, stage);
    });
  }

  const byStage = ACTIVE.map((s) => ({ stage: s, items: optimistic.filter((l) => l.stage === s) }));
  const lost = optimistic.filter((l) => l.stage === "lost");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-3">
        {byStage.map(({ stage, items }) => (
          <div
            key={stage}
            className="rounded-md border bg-muted/20 p-2 min-h-[300px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(stage)}
          >
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {stage.replace("_", " ")} · {items.length}
            </div>
            <div className="space-y-2">
              {items.map((l) => (
                <Link
                  key={l.id}
                  href={`/leads/${l.id}`}
                  draggable
                  onDragStart={() => setDragging(l.id)}
                  className="block rounded border bg-background p-3 text-sm shadow-sm hover:shadow"
                >
                  <div className="font-medium truncate">{l.name}</div>
                  {l.company && <div className="text-xs text-muted-foreground truncate">{l.company}</div>}
                  <div className="mt-1 flex justify-between text-xs">
                    <span>{formatEuros(l.estimatedValueCents)}</span>
                    {l.followUpDate && <span className="text-muted-foreground">{l.followUpDate}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <details className="rounded-md border p-3">
        <summary className="text-xs font-semibold uppercase tracking-wide text-muted-foreground cursor-pointer">
          Lost · {lost.length}
        </summary>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {lost.map((l) => (
            <Link key={l.id} href={`/leads/${l.id}`} className="rounded border bg-background p-2 text-xs hover:shadow">
              <div className="font-medium truncate">{l.name}</div>
              {l.company && <div className="text-muted-foreground truncate">{l.company}</div>}
            </Link>
          ))}
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 2:** Replace `src/app/(app)/leads/page.tsx` with a tabbed version

```tsx
// src/app/(app)/leads/page.tsx
import Link from "next/link";
import { getLeads } from "@/lib/leads/queries";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadsKanban } from "@/components/leads/LeadsKanban";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";

export default async function LeadsPage() {
  const leads = await getLeads();

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Capture your first lead to start tracking the pipeline."
        cta={{ label: "Add a lead", href: "/leads/new" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Button asChild><Link href="/leads/new">New lead</Link></Button>
      </div>
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="table"><LeadsTable leads={leads} /></TabsContent>
        <TabsContent value="kanban"><LeadsKanban leads={leads} /></TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 3:** Verify build.

- [ ] **Step 4:** Commit

```bash
git add src/components/leads/LeadsKanban.tsx src/app/\(app\)/leads/page.tsx
git commit -m "feat(m2): kanban view on /leads with optimistic drag-and-drop"
```

---

## Task 21: ClientForm Component

**Files:**
- Create: `src/components/clients/ClientForm.tsx`

- [ ] **Step 1:** Implement — mirrors LeadForm structure, fewer fields

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientCreate, type ClientCreateInput } from "@/lib/clients/schema";
import { INDUSTRY, CLIENT_STATUS } from "@/lib/enums";
import { createClient as createClientAction, updateClient } from "@/lib/clients/actions";
import { eurosToCents, centsToEuros } from "@/lib/money";
import type { Client } from "@/db/schema";

type Props = { mode: "create" | "edit"; initial?: Client };

type FormValues = {
  name: string; company: string; email: string; phone: string;
  industry: ClientCreateInput["industry"];
  status: ClientCreateInput["status"];
  contract_start_date: string;
  mrr_euros: string;
};

export function ClientForm({ mode, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      company: initial?.company ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      industry: (initial?.industry as FormValues["industry"]) ?? "other",
      status: (initial?.status as FormValues["status"]) ?? "active",
      contract_start_date: initial?.contractStartDate ?? today,
      mrr_euros: centsToEuros(initial?.mrrCents),
    },
  });

  function onSubmit(data: FormValues) {
    const input: ClientCreateInput = {
      name: data.name, company: data.company || null, email: data.email,
      phone: data.phone || null, industry: data.industry, status: data.status,
      contract_start_date: data.contract_start_date,
      mrr_cents: eurosToCents(data.mrr_euros),
    };
    const parsed = ClientCreate.safeParse(input);
    if (!parsed.success) { console.error(parsed.error); return; }
    startTransition(async () => {
      if (mode === "create") {
        const row = await createClientAction(parsed.data);
        router.push(`/clients/${row.id}`);
      } else if (initial) {
        await updateClient(initial.id, parsed.data);
        router.push(`/clients/${initial.id}`);
        router.refresh();
      }
    });
  }

  const industry = watch("industry");
  const status = watch("status");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" error={errors.name?.message}>
          <Input {...register("name", { required: "Required" })} autoFocus />
        </Field>
        <Field label="Company"><Input {...register("company")} /></Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register("email", { required: "Required" })} />
        </Field>
        <Field label="Phone"><Input {...register("phone")} /></Field>
        <Field label="Industry">
          <Select value={industry} onValueChange={(v) => setValue("industry", v as FormValues["industry"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={status} onValueChange={(v) => setValue("status", v as FormValues["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLIENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Contract start date">
          <Input type="date" {...register("contract_start_date", { required: "Required" })} />
        </Field>
        <Field label="MRR (EUR / month)">
          <Input type="number" step="0.01" {...register("mrr_euros")} />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Create client" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2:** Build + commit

```bash
pnpm build
git add src/components/clients/ClientForm.tsx
git commit -m "feat(m2): client create/edit form"
```

---

## Task 22: /clients — Table Page (Replaces Placeholder)

**Files:**
- Create: `src/components/clients/ClientsTable.tsx`
- Modify: `src/app/(app)/clients/page.tsx` (replace placeholder)

- [ ] **Step 1:** Table

```tsx
// src/components/clients/ClientsTable.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CLIENT_STATUS, INDUSTRY } from "@/lib/enums";
import { formatEuros } from "@/lib/money";
import type { Client } from "@/db/schema";

type SortKey = "name" | "company" | "status" | "mrrCents" | "contractStartDate" | "createdAt";

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [industry, setIndustry] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const qLower = q.toLowerCase();
    return clients
      .filter((c) => {
        if (status !== "all" && c.status !== status) return false;
        if (industry !== "all" && c.industry !== industry) return false;
        if (!qLower) return true;
        return (
          c.name.toLowerCase().includes(qLower) ||
          (c.company ?? "").toLowerCase().includes(qLower) ||
          c.email.toLowerCase().includes(qLower)
        );
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return asc ? cmp : -cmp;
      });
  }, [clients, q, status, industry, sortKey, asc]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setAsc(!asc);
    else { setSortKey(k); setAsc(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CLIENT_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={industry} onValueChange={setIndustry}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All industries</SelectItem>
            {INDUSTRY.map((i) => <SelectItem key={i} value={i}>{i.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort("name")} className="cursor-pointer">Name</TableHead>
              <TableHead onClick={() => toggleSort("company")} className="cursor-pointer">Company</TableHead>
              <TableHead onClick={() => toggleSort("status")} className="cursor-pointer">Status</TableHead>
              <TableHead onClick={() => toggleSort("mrrCents")} className="cursor-pointer text-right">MRR</TableHead>
              <TableHead onClick={() => toggleSort("contractStartDate")} className="cursor-pointer">Contract start</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Link href={`/clients/${c.id}`} className="hover:underline">{c.name}</Link></TableCell>
                <TableCell>{c.company ?? "—"}</TableCell>
                <TableCell><Badge>{c.status}</Badge></TableCell>
                <TableCell className="text-right">{formatEuros(c.mrrCents)}</TableCell>
                <TableCell>{c.contractStartDate}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No clients match.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Replace `src/app/(app)/clients/page.tsx` entirely

```tsx
import Link from "next/link";
import { getClients } from "@/lib/clients/queries";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

export default async function ClientsPage() {
  const clients = await getClients();

  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients yet"
        description="Convert a won lead, or add one directly."
        cta={{ label: "Add a client", href: "/clients/new" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button asChild><Link href="/clients/new">New client</Link></Button>
      </div>
      <ClientsTable clients={clients} />
    </div>
  );
}
```

- [ ] **Step 3:** Verify build + commit

```bash
pnpm build
git add src/components/clients/ClientsTable.tsx src/app/\(app\)/clients/page.tsx
git commit -m "feat(m2): /clients table (replaces placeholder)"
```

---

## Task 23: /clients/new, /clients/[id], /clients/[id]/edit

**Files:**
- Create: `src/app/(app)/clients/new/page.tsx`
- Create: `src/app/(app)/clients/[id]/page.tsx`
- Create: `src/app/(app)/clients/[id]/edit/page.tsx`

- [ ] **Step 1:** Create form page

```tsx
// src/app/(app)/clients/new/page.tsx
import { ClientForm } from "@/components/clients/ClientForm";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
      <ClientForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 2:** Detail page

```tsx
// src/app/(app)/clients/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientById } from "@/lib/clients/queries";
import { getLeadById } from "@/lib/leads/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  const originLead = client.fromLeadId ? await getLeadById(client.fromLeadId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <div className="text-sm text-muted-foreground">{client.company ?? ""}</div>
          <div className="mt-2"><Badge>{client.status}</Badge></div>
        </div>
        <Button asChild variant="outline"><Link href={`/clients/${client.id}/edit`}>Edit</Link></Button>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-2xl text-sm">
        <Dt label="Email">{client.email}</Dt>
        <Dt label="Phone">{client.phone ?? "—"}</Dt>
        <Dt label="Industry">{client.industry.replace("_", " ")}</Dt>
        <Dt label="Contract start">{client.contractStartDate}</Dt>
        <Dt label="MRR">{formatEuros(client.mrrCents)}</Dt>
        {originLead && (
          <Dt label="Converted from lead">
            <Link href={`/leads/${originLead.id}`} className="underline">{originLead.name}</Link>
          </Dt>
        )}
      </dl>
    </div>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
```

- [ ] **Step 3:** Edit page

```tsx
// src/app/(app)/clients/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import { getClientById } from "@/lib/clients/queries";
import { ClientForm } from "@/components/clients/ClientForm";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit client</h1>
      <ClientForm mode="edit" initial={client} />
    </div>
  );
}
```

- [ ] **Step 4:** Verify build — all client routes present.

- [ ] **Step 5:** Commit

```bash
git add src/app/\(app\)/clients
git commit -m "feat(m2): client new/detail/edit pages"
```

---

## Task 24: Apply Migrations to Turso + Manual Verification

This task requires a real Turso database. If Module 1's Turso hasn't been provisioned yet, do that first (see Module 1's Task 11 for the CLI commands).

- [ ] **Step 1:** Apply new migrations

```bash
pnpm db:migrate
```

Expected: applies the Module 2 migration. `leads`, `clients`, `activities` tables exist in Turso; `users` table dropped.

Verify via Turso shell if needed:

```bash
turso db shell innovaco ".tables"
# expect: activities  clients  leads
```

- [ ] **Step 2:** Run the app

```bash
pnpm dev
```

- [ ] **Step 3:** Manual flow checklist — sign in, then exercise each:

- [ ] `/leads` empty state shows "Add a lead" CTA.
- [ ] Click "Add a lead" → `/leads/new` form → submit with minimal fields → redirects to `/leads/[id]`.
- [ ] Back to `/leads` — new lead appears in table. Default stage "new".
- [ ] Sort by Value desc → leads with values bubble up.
- [ ] Filter by industry = hospitality → only matching leads.
- [ ] Switch to Kanban tab → 5 columns + collapsed Lost. Drag a card from "new" to "qualified" — visual moves; reload — still in qualified.
- [ ] Move a lead to "won" → detail page shows "Convert to Client" button → click → redirects to `/clients/[newId]`.
- [ ] Back on `/leads/[id]` for the converted lead — "Converted to" link visible.
- [ ] Re-clicking Convert to Client on the same lead → redirects to the existing client, no duplicate in `/clients` list.
- [ ] Create a client directly via `/clients/new` → appears in `/clients` table — no "Converted from lead" link on its detail page.
- [ ] On a lead detail, Activity tab → add 3 activities of different types (call, email, note) → timeline shows them newest-first with icons.
- [ ] Edit the lead → changes persist.
- [ ] Delete the lead via a DB shell (no UI delete button in v1 — add in v1.1) OR skip and proceed.
- [ ] Sidebar: "Leads" and "Clients" entries highlight correctly when active.

- [ ] **Step 4:** Note any issues. Fix + commit any blocking defects.

No commit required at the end of this task unless defects were found.

---

## Task 25: Final Verification + Deploy

- [ ] **Step 1:** Full test suite

```bash
pnpm test
```

Expected: all Module 1 tests (6) + Module 2 tests (~35) pass.

- [ ] **Step 2:** Lint + build

```bash
pnpm lint
pnpm build
```

Expected: lint passes (0 errors; warnings OK). Build succeeds with all expected routes.

- [ ] **Step 3:** Push

```bash
git push -u origin feature/module-2-leads-clients
```

- [ ] **Step 4:** Merge Module 1's Vercel project should auto-deploy the branch as a preview. Verify:
- Preview URL loads.
- Login works.
- `/leads` and `/clients` empty states render.
- Create a lead via the preview → appears in the list.
- Convert that lead to a client → appears in `/clients`.
- Sign out works.

- [ ] **Step 5:** Tag

```bash
git tag module-2-complete
git push --tags
```

---

## Notes for the implementing engineer

- **TDD discipline:** Tasks 3, 4, 6, 9, 11, 12, 13, 14, 15 follow RED → GREEN. Don't skip the RED step — paste the failing output in your report.
- **shadcn base-nova:** Module 1 used the `base-nova` style, which uses `@base-ui/react` instead of Radix. Some primitives differ from classic shadcn docs. If `asChild` fails on a trigger, try `render`. If a primitive API looks different, inspect the generated file in `src/components/ui/` before guessing.
- **Server Actions + `"use server"`:** Every action file has the `"use server"` pragma at the top. The `_` -prefixed functions are *not* Server Actions — they're unit-testable plain functions that take an explicit `db`. Don't call them from Client Components directly.
- **`crypto.randomUUID()`:** Available without imports in Node 24 and modern browsers.
- **Drizzle `returning()`:** libSQL supports `returning()`. Tests rely on this.
- **Auth in tests:** vitest config already mocks `next-auth`. The `_` functions don't call `auth()` so tests don't need the mock to do anything. The public wrappers DO call `auth()` — don't test the public wrappers directly; they're thin and covered by the integration flow.
- **Do not add features outside this plan.** Delete-lead UI button, bulk actions, CSV export, email sync — all deferred.
