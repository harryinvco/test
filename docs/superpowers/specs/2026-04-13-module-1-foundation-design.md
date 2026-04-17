# Module 1 — Foundation (Design Spec)

**Date:** 2026-04-13
**Status:** Approved for implementation planning
**Project:** Innovaco Command Center

## Context

Innovaco is building an internal command center to run the agency with AI agents, central client visibility, ops dashboards, and admin/accounting. The full system is too large for a single spec, so work is decomposed into 5 modules:

1. **Foundation** (this spec) — scaffold, auth, app shell, empty navigable pages
2. Clients & Projects — CRM-lite system of record
3. AI Agent Runner — dispatch specialized Claude agents grounded in client data
4. Ops Dashboard — KPIs aggregated from modules 2–3 and external sources
5. Admin & Accounting — invoices, expenses, time, revenue

Each module ships independently with its own spec, plan, and implementation cycle. Module 1 exists to de-risk the stack, establish conventions, and produce a deployed-to-Vercel shell that subsequent modules slot features into. It intentionally ships with no feature functionality.

## Goal

A Next.js app deployed to a Vercel preview where the user (Harry) can log in with a password, land on a responsive app shell with sidebar navigation, and see empty placeholder pages for each future module. Logging out works. Routes are protected.

## Non-Goals (Module 1)

- Any CRUD on any entity
- Any AI / Claude integration
- Multi-user support, invites, password reset, or account settings
- Any real dashboard data
- Billing, time tracking, file uploads
- End-to-end or integration tests (unit tests for auth helpers only)

## Stack Decisions

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 App Router, TypeScript | One framework for UI + server; Vercel-native |
| Styling | Tailwind CSS v4 + shadcn/ui | Low-friction, good design defaults, user already familiar |
| Auth | Auth.js v5 (NextAuth) Credentials provider | Single-user password is all that's needed; Auth.js upgrades cleanly to multi-user later |
| DB | Drizzle ORM + Turso (libSQL) | SQLite semantics on a Vercel-compatible edge-friendly service; free tier sufficient |
| Deploy | Vercel | User's explicit choice |
| Package manager | pnpm | Faster, monorepo-friendly if modules 2+ need workspaces |

## Architecture

Single Next.js application (no separate client/server split). Server Components + Server Actions for data access; Client Components only where interactivity requires it (sidebar state, forms).

```
innovaco/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── components.json                     # shadcn config
├── middleware.ts                       # Auth gate for all app routes
├── .env.example
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root html/body, fonts, providers
│   │   ├── globals.css                 # Tailwind + theme tokens
│   │   ├── login/
│   │   │   └── page.tsx                # Login form (Client Component)
│   │   ├── (app)/                      # Route group — requires auth
│   │   │   ├── layout.tsx              # AppShell: Sidebar + Header + <main>
│   │   │   ├── dashboard/page.tsx      # Empty state: "Coming in Module 4"
│   │   │   ├── clients/page.tsx        # Empty state: "Coming in Module 2"
│   │   │   ├── agents/page.tsx         # Empty state: "Coming in Module 3"
│   │   │   ├── admin/page.tsx          # Empty state: "Coming in Module 5"
│   │   │   └── settings/page.tsx       # Empty state
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── auth.ts                         # Auth.js config + handlers export
│   ├── components/
│   │   ├── ui/                         # shadcn primitives (button, input, etc.)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── UserMenu.tsx
│   │   └── EmptyState.tsx              # Reused across all placeholder pages
│   ├── db/
│   │   ├── client.ts                   # Drizzle + libSQL client
│   │   └── schema.ts                   # Placeholder (users table stub)
│   └── lib/
│       ├── utils.ts                    # cn() helper
│       └── env.ts                      # Zod-validated env access
└── drizzle/                            # Generated migrations
```

### Auth Flow

1. `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` (bcrypt) configured as env vars. A one-time script (`pnpm hash-password`) helps generate the hash.
2. Auth.js Credentials provider: `authorize()` compares submitted email/password against env vars using `bcrypt.compare`. Returns a minimal user object `{ id: "admin", email, name: "Harry" }` on success.
3. Session strategy: JWT (no DB sessions table needed for Module 1).
4. `middleware.ts` calls `auth()` and redirects unauthenticated requests from `/(app)/*` to `/login`. `/login` redirects to `/dashboard` if already authenticated.
5. Sign-out via `signOut()` server action from `UserMenu`.

### App Shell

- `src/app/(app)/layout.tsx` — Server Component, fetches session, renders `<Sidebar />` + `<Header />` + `{children}` in a two-column grid.
- `Sidebar` — Client Component (active-link highlighting needs `usePathname`). Nav items: Dashboard, Clients, Agents, Admin, Settings. Collapsible on mobile via shadcn `Sheet`.
- `Header` — Server Component with `UserMenu` (Client Component dropdown) on the right.
- `EmptyState` — accepts `{ title, moduleLabel }` and renders a centered card: "Coming in Module N — <title>".

### Database

Drizzle configured against Turso with `@libsql/client`. `schema.ts` ships with a commented-out `users` table stub so migration tooling is wired up even though no queries run in Module 1. `drizzle.config.ts` points at `src/db/schema.ts` and outputs to `drizzle/`. Scripts: `pnpm db:generate`, `pnpm db:migrate`.

### Env Vars (documented in `.env.example`)

```
AUTH_SECRET=               # openssl rand -base64 32
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=       # bcrypt hash; generate via `pnpm hash-password`
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

`src/lib/env.ts` validates these with Zod at boot so missing vars fail fast.

## Testing

- **Unit:** `src/lib/env.ts` Zod schema; auth `authorize()` happy path + wrong password. Vitest.
- **Manual:** end-to-end dev-mode verification checklist (see below).
- **No Playwright/E2E in Module 1** — overkill for five placeholder pages. Add in Module 2 alongside first real CRUD.

## Verification

Implementation is complete when all of the following pass:

1. `pnpm install && pnpm dev` boots without errors on `http://localhost:3000`.
2. Visiting `/` when logged out redirects to `/login`.
3. Login with correct env creds redirects to `/dashboard`; wrong password shows an inline error.
4. Sidebar navigates between `/dashboard`, `/clients`, `/agents`, `/admin`, `/settings`; active link is visually indicated; each page shows its `EmptyState`.
5. Sign-out from `UserMenu` returns to `/login`.
6. Accessing any `/(app)/*` route after sign-out redirects to `/login`.
7. `pnpm build` succeeds with no type errors.
8. `pnpm lint` passes.
9. `pnpm test` (unit tests) passes.
10. `pnpm db:generate` produces a migration file from the stub schema without error.
11. A Vercel preview deploy of the branch loads and login works end-to-end with production env vars.

## Open Questions (resolve during planning, not blocking this spec)

- Turso free-tier region selection (pick closest to Cyprus: `fra` likely).
- Whether to add a light/dark theme toggle in Module 1 or defer — lean toward deferring to Module 4 (Dashboard) when it starts to matter visually.
