# Module 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a deployed-to-Vercel Next.js app with single-user password auth, a responsive app shell, and empty placeholder pages for every future module — zero feature logic.

**Architecture:** Single Next.js 15 App Router application. Server Components by default; Client Components only for interactivity (sidebar active-link, login form, user menu). Auth.js v5 Credentials provider compares submitted password against a bcrypt hash stored in an env var — no users table used in Module 1. Drizzle ORM is wired to Turso (libSQL) with a placeholder schema so future modules inherit the plumbing. Route protection via `middleware.ts`. Deploys to Vercel.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui, Auth.js v5 (next-auth beta), bcryptjs, Drizzle ORM, @libsql/client, Zod, Vitest, pnpm

**Spec:** `docs/superpowers/specs/2026-04-13-module-1-foundation-design.md`

---

## Pre-Task: Clean Slate

The repo contains empty `client/`, `server/`, `shared/` directories from a previous plan iteration. They are not used by this design.

- [ ] **Step 1: Remove stale scaffolding directories**

```bash
rm -rf client server shared
git add -A
git commit -m "chore: remove stale scaffolding from previous plan"
```

---

## File Structure

```
innovaco/
├── package.json
├── pnpm-lock.yaml
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── drizzle.config.ts
├── components.json
├── middleware.ts
├── vitest.config.ts
├── .env.example
├── .env.local                          # gitignored
├── .gitignore
├── scripts/
│   └── hash-password.ts                # Generates ADMIN_PASSWORD_HASH
├── drizzle/                            # Generated migrations
└── src/
    ├── app/
    │   ├── layout.tsx                  # Root html/body
    │   ├── globals.css                 # Tailwind + tokens
    │   ├── page.tsx                    # Redirects to /dashboard
    │   ├── login/page.tsx              # Login form (Client Component)
    │   ├── (app)/
    │   │   ├── layout.tsx              # AppShell wrapper
    │   │   ├── dashboard/page.tsx
    │   │   ├── clients/page.tsx
    │   │   ├── agents/page.tsx
    │   │   ├── admin/page.tsx
    │   │   └── settings/page.tsx
    │   └── api/auth/[...nextauth]/route.ts
    ├── auth.ts                         # Auth.js config + exports
    ├── components/
    │   ├── ui/                         # shadcn primitives
    │   ├── layout/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   └── UserMenu.tsx
    │   ├── LoginForm.tsx
    │   └── EmptyState.tsx
    ├── db/
    │   ├── client.ts                   # Drizzle + libSQL
    │   └── schema.ts                   # Placeholder
    └── lib/
        ├── utils.ts                    # cn()
        ├── env.ts                      # Zod-validated env
        └── __tests__/
            └── env.test.ts
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `postcss.config.mjs`

- [ ] **Step 1: Scaffold Next.js app (non-interactive)**

```bash
pnpm dlx create-next-app@latest . \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm --no-turbopack --skip-install
```

Expected: files created in current directory. If prompt appears asking to overwrite files, accept.

- [ ] **Step 2: Install dependencies**

```bash
pnpm install
```

Expected: dependencies installed; no errors.

- [ ] **Step 3: Update `package.json` scripts**

Merge/replace the `scripts` block in `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "hash-password": "tsx scripts/hash-password.ts"
}
```

- [ ] **Step 4: Replace default landing page with redirect**

Replace `src/app/page.tsx` with:

```tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
```

- [ ] **Step 5: Verify dev server boots**

```bash
pnpm dev
```

Expected: `Ready in Xms` on http://localhost:3000. Stop with Ctrl+C. (`/` will 404 on `/dashboard` — that's fine; we build the app shell later.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 15 app with TS + Tailwind"
```

---

## Task 2: Install Runtime + Dev Dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add next-auth@beta bcryptjs zod drizzle-orm @libsql/client
pnpm add lucide-react class-variance-authority clsx tailwind-merge
```

- [ ] **Step 2: Install dev deps**

```bash
pnpm add -D @types/bcryptjs drizzle-kit tsx vitest @vitest/ui
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add auth, db, and test dependencies"
```

---

## Task 3: Configure shadcn/ui

**Files:** `components.json`, `src/lib/utils.ts`, `src/components/ui/*`

- [ ] **Step 1: Initialize shadcn**

```bash
pnpm dlx shadcn@latest init -d -b neutral
```

Expected: `components.json` created; `src/lib/utils.ts` contains `cn()`; `src/app/globals.css` updated with theme tokens.

- [ ] **Step 2: Add the primitives we need**

```bash
pnpm dlx shadcn@latest add button input label card sheet dropdown-menu separator
```

Expected: files appear in `src/components/ui/`.

- [ ] **Step 3: Verify build still passes**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: configure shadcn/ui with base primitives"
```

---

## Task 4: Vitest Configuration

**Files:** `vitest.config.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 2: Verify empty run passes**

```bash
pnpm test
```

Expected: "No test files found" or 0 passed. Either is fine.

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: configure vitest"
```

---

## Task 5: Env Validation (TDD)

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/__tests__/env.test.ts`
- Create: `.env.example`, update `.gitignore`

- [ ] **Step 1: Write failing test**

Create `src/lib/__tests__/env.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  const valid = {
    AUTH_SECRET: "a".repeat(32),
    ADMIN_EMAIL: "harry@innovaco.cy",
    ADMIN_PASSWORD_HASH: "$2a$10$abcdefghijklmnopqrstuv",
    TURSO_DATABASE_URL: "libsql://example.turso.io",
    TURSO_AUTH_TOKEN: "token",
  };

  it("parses valid env", () => {
    expect(() => parseEnv(valid)).not.toThrow();
  });

  it("throws on missing AUTH_SECRET", () => {
    const { AUTH_SECRET, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/AUTH_SECRET/);
  });

  it("throws on non-email ADMIN_EMAIL", () => {
    expect(() => parseEnv({ ...valid, ADMIN_EMAIL: "not-an-email" }))
      .toThrow(/ADMIN_EMAIL/);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/env.ts`**

```ts
import { z } from "zod";

const EnvSchema = z.object({
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 chars"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),
  TURSO_DATABASE_URL: z.string().url("TURSO_DATABASE_URL must be a URL"),
  TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
```

- [ ] **Step 4: Run — expect pass**

```bash
pnpm test
```

Expected: 3 passed.

- [ ] **Step 5: Create `.env.example`**

```
AUTH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD_HASH=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

- [ ] **Step 6: Ensure `.env.local` ignored**

Append to `.gitignore` if missing:

```
.env.local
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts .env.example .gitignore
git commit -m "feat(env): zod-validated environment module"
```

---

## Task 6: Password Hash Script

**Files:** `scripts/hash-password.ts`

- [ ] **Step 1: Create `scripts/hash-password.ts`**

```ts
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const password = await rl.question("Password: ");
  rl.close();
  if (!password) {
    console.error("No password provided");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  console.log("\nADMIN_PASSWORD_HASH=" + hash);
}

main();
```

- [ ] **Step 2: Manually verify**

```bash
echo "testpass123" | pnpm hash-password
```

Expected: prints `ADMIN_PASSWORD_HASH=$2a$10$...`.

- [ ] **Step 3: Generate a local hash for dev and put it in `.env.local`**

Create `.env.local` with:

```
AUTH_SECRET=<output of: openssl rand -base64 32>
ADMIN_EMAIL=harry@innovaco.cy
ADMIN_PASSWORD_HASH=<hash from previous step>
TURSO_DATABASE_URL=libsql://placeholder.turso.io
TURSO_AUTH_TOKEN=placeholder
```

(Real Turso values come in Task 11. The app will not query the DB in Module 1, so placeholders are fine for local runs.)

- [ ] **Step 4: Commit**

```bash
git add scripts/hash-password.ts
git commit -m "feat: script to generate bcrypt password hash"
```

---

## Task 7: Auth.js Configuration (TDD)

**Files:**
- Create: `src/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Test: `src/__tests__/authorize.test.ts`

- [ ] **Step 1: Write failing test for credential verification**

Create `src/__tests__/authorize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
import { verifyCredentials } from "@/auth";

const EMAIL = "harry@innovaco.cy";
const PASSWORD = "correct-password";

describe("verifyCredentials", () => {
  it("returns user on correct email + password", async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await verifyCredentials(
      { email: EMAIL, password: PASSWORD },
      { adminEmail: EMAIL, adminHash: hash },
    );
    expect(user).toMatchObject({ id: "admin", email: EMAIL });
  });

  it("returns null on wrong password", async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await verifyCredentials(
      { email: EMAIL, password: "wrong" },
      { adminEmail: EMAIL, adminHash: hash },
    );
    expect(user).toBeNull();
  });

  it("returns null on wrong email", async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const user = await verifyCredentials(
      { email: "someone@else.com", password: PASSWORD },
      { adminEmail: EMAIL, adminHash: hash },
    );
    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
pnpm test
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { env } from "@/lib/env";

export interface Credentials {
  email: string;
  password: string;
}

export interface AdminConfig {
  adminEmail: string;
  adminHash: string;
}

export async function verifyCredentials(
  creds: Credentials,
  config: AdminConfig,
): Promise<{ id: string; email: string; name: string } | null> {
  if (creds.email.toLowerCase() !== config.adminEmail.toLowerCase()) {
    return null;
  }
  const ok = await bcrypt.compare(creds.password, config.adminHash);
  if (!ok) return null;
  return { id: "admin", email: config.adminEmail, name: "Admin" };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        if (!email || !password) return null;
        return verifyCredentials(
          { email, password },
          { adminEmail: env.ADMIN_EMAIL, adminHash: env.ADMIN_PASSWORD_HASH },
        );
      },
    }),
  ],
});
```

- [ ] **Step 4: Create Auth.js route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 5: Run — expect pass**

```bash
pnpm test
```

Expected: 3 passed (env tests still pass, 3 new authorize tests pass).

- [ ] **Step 6: Commit**

```bash
git add src/auth.ts src/app/api/auth src/__tests__/authorize.test.ts
git commit -m "feat(auth): credentials provider with bcrypt verification"
```

---

## Task 8: Middleware Route Protection

**Files:** `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default auth((req) => {
  const { nextUrl } = req;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const isLoggedIn = !!req.auth;

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 2: Verify build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): middleware route protection"
```

---

## Task 9: Login Page

**Files:**
- Create: `src/components/LoginForm.tsx`
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create `src/components/LoginForm.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: true,
        redirectTo: callbackUrl,
      });
      if (res && "error" in res && res.error) {
        setError("Invalid email or password");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

```tsx
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Innovaco Command Center</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/LoginForm.tsx src/app/login
git commit -m "feat(auth): login page"
```

---

## Task 10: App Shell + Empty Placeholder Pages

**Files:**
- Create: `src/components/EmptyState.tsx`
- Create: `src/components/layout/Sidebar.tsx`, `Header.tsx`, `UserMenu.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`, `clients/page.tsx`, `agents/page.tsx`, `admin/page.tsx`, `settings/page.tsx`

- [ ] **Step 1: Create `src/components/EmptyState.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, moduleLabel }: { title: string; moduleLabel: string }) {
  return (
    <Card className="mx-auto mt-16 max-w-md text-center">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Coming in {moduleLabel}.
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create `src/components/layout/Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Bot, Receipt, Settings } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/admin", label: "Admin", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="px-3 py-4 text-sm font-semibold tracking-tight">Innovaco</div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"
            )}>
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Create `src/components/layout/UserMenu.tsx`**

```tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ email }: { email: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">{email}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => signOut({ redirectTo: "/login" })}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Create `src/components/layout/Header.tsx`**

```tsx
import { UserMenu } from "./UserMenu";

export function Header({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="text-sm text-muted-foreground">Command Center</div>
      <UserMenu email={email} />
    </header>
  );
}
```

- [ ] **Step 5: Create `src/app/(app)/layout.tsx`**

```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r bg-muted/20">
        <Sidebar />
      </aside>
      <div className="flex flex-col">
        <Header email={session.user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create the five placeholder pages**

`src/app/(app)/dashboard/page.tsx`:
```tsx
import { EmptyState } from "@/components/EmptyState";
export default function Page() {
  return <EmptyState title="Dashboard" moduleLabel="Module 4" />;
}
```

`src/app/(app)/clients/page.tsx`:
```tsx
import { EmptyState } from "@/components/EmptyState";
export default function Page() {
  return <EmptyState title="Clients" moduleLabel="Module 2" />;
}
```

`src/app/(app)/agents/page.tsx`:
```tsx
import { EmptyState } from "@/components/EmptyState";
export default function Page() {
  return <EmptyState title="Agents" moduleLabel="Module 3" />;
}
```

`src/app/(app)/admin/page.tsx`:
```tsx
import { EmptyState } from "@/components/EmptyState";
export default function Page() {
  return <EmptyState title="Admin & Accounting" moduleLabel="Module 5" />;
}
```

`src/app/(app)/settings/page.tsx`:
```tsx
import { EmptyState } from "@/components/EmptyState";
export default function Page() {
  return <EmptyState title="Settings" moduleLabel="a future module" />;
}
```

- [ ] **Step 7: Verify build + dev**

```bash
pnpm build
```

Expected: build succeeds.

```bash
pnpm dev
```

Manually verify: visiting `http://localhost:3000` redirects to `/login`; after signing in with `.env.local` credentials, `/dashboard` shows the empty state; sidebar clicks navigate and highlight active link; "Sign out" returns to `/login`; direct-navigating to `/clients` while logged out redirects to `/login?callbackUrl=%2Fclients`. Stop server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(app): app shell with sidebar nav and placeholder pages"
```

---

## Task 11: Drizzle + Turso Wiring

**Files:** `drizzle.config.ts`, `src/db/schema.ts`, `src/db/client.ts`

- [ ] **Step 1: Create `src/db/schema.ts`**

```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Placeholder — Module 1 ships no queries. Module 2 replaces/extends this.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

- [ ] **Step 2: Create `src/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "@/lib/env";
import * as schema from "./schema";

const client = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

- [ ] **Step 4: Generate initial migration**

```bash
pnpm db:generate
```

Expected: `drizzle/0000_*.sql` created.

- [ ] **Step 5: Create Turso database (one-time)**

```bash
# If Turso CLI not installed: curl -sSfL https://get.tur.so/install.sh | bash
turso db create innovaco --location fra
turso db show innovaco --url          # -> paste into .env.local TURSO_DATABASE_URL
turso db tokens create innovaco       # -> paste into .env.local TURSO_AUTH_TOKEN
```

- [ ] **Step 6: Apply migration**

```bash
pnpm db:migrate
```

Expected: migration applied without error.

- [ ] **Step 7: Commit**

```bash
git add drizzle.config.ts src/db drizzle
git commit -m "feat(db): drizzle + turso wiring with placeholder schema"
```

---

## Task 12: Vercel Deployment

**Files:** `README.md` (deploy notes)

- [ ] **Step 1: Push branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Create Vercel project**

In Vercel dashboard: New Project → import this repo → framework auto-detected as Next.js → configure env vars:

- `AUTH_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Use a **fresh** bcrypt hash for production — do not reuse the local dev one.

- [ ] **Step 3: Deploy + manual verify**

Trigger deploy. Open the preview URL. Verify:
- `/` redirects to `/login`
- Login with prod creds → `/dashboard`
- Sidebar navigation works
- Sign-out returns to `/login`

- [ ] **Step 4: Add deploy notes to `README.md`**

Replace `README.md` content with:

```markdown
# Innovaco Command Center

Internal platform for running the agency.

## Local dev

```bash
pnpm install
cp .env.example .env.local    # fill values
pnpm hash-password            # generates ADMIN_PASSWORD_HASH
pnpm db:migrate               # applies schema to Turso
pnpm dev                      # http://localhost:3000
```

## Tests

```bash
pnpm test
```

## Deploy

Hosted on Vercel. Env vars required: `AUTH_SECRET`, `ADMIN_EMAIL`,
`ADMIN_PASSWORD_HASH`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: local dev + deploy instructions"
git push
```

---

## Task 13: Final Verification

Run the full spec verification checklist:

- [ ] **Step 1:** `pnpm install && pnpm dev` boots cleanly on `http://localhost:3000`.
- [ ] **Step 2:** `/` logged-out → redirects to `/login`.
- [ ] **Step 3:** Correct creds → redirect to `/dashboard`. Wrong password → inline error, stays on `/login`.
- [ ] **Step 4:** Sidebar navigates to all 5 pages; active link indicated; each page shows `EmptyState`.
- [ ] **Step 5:** Sign-out → back to `/login`.
- [ ] **Step 6:** Direct-navigating `/clients` while logged out → redirected to `/login?callbackUrl=...`.
- [ ] **Step 7:** `pnpm build` passes with no type errors.
- [ ] **Step 8:** `pnpm lint` passes.
- [ ] **Step 9:** `pnpm test` passes (6 tests: 3 env + 3 authorize).
- [ ] **Step 10:** `pnpm db:generate` produces a migration from stub schema without error.
- [ ] **Step 11:** Vercel preview loads and login works end-to-end.

If all checks pass, tag Module 1 complete:

```bash
git tag module-1-complete
git push --tags
```

---

## Notes for the implementing engineer

- **TDD discipline:** Tasks 5 and 7 follow RED → GREEN strictly. Don't write implementation before the failing test run.
- **One commit per task step boundary** is the minimum; smaller commits are welcome.
- **Auth.js v5 is in beta** — if API surface has shifted since this plan was written, check `next-auth@beta` release notes rather than guessing. The Credentials provider + JWT strategy + `auth()` wrapper is stable.
- **Do not add features not in this plan** — no clients CRUD, no AI integration, no dashboard widgets. Those are Modules 2+.
- **shadcn components** are pulled via `pnpm dlx shadcn@latest add <name>`; add any additional primitive you need without re-running `init`.
