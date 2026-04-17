# Innovaco Command Center - Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundational internal platform for Innovaco digital transformation agency — a command center with AI agent dispatch, dashboard, client directory, and service catalog.

**Architecture:** Full-stack TypeScript monorepo. React SPA frontend with Tailwind CSS + shadcn/ui components, Express API backend, SQLite database via Drizzle ORM, and Anthropic Claude API integration for the AI agent system. The AI agent framework is the core feature — specialized agents for proposals, research, content, and client analysis that Innovaco staff can dispatch from the dashboard.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, React Router v6, Zustand, Express, Drizzle ORM, better-sqlite3, Anthropic SDK, Zod

---

## File Structure

```
innovaco/
├── package.json                          # Root workspace config
├── tsconfig.base.json                    # Shared TS config
├── .env.example                          # Environment variables template
│
├── client/                               # Frontend SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── components.json                   # shadcn/ui config
│   └── src/
│       ├── main.tsx                      # App entry
│       ├── App.tsx                       # Router + layout
│       ├── index.css                     # Tailwind imports + globals
│       ├── lib/
│       │   ├── api.ts                    # API client (fetch wrapper)
│       │   └── utils.ts                  # cn() helper for shadcn
│       ├── stores/
│       │   ├── agent-store.ts            # AI agent conversations state
│       │   └── client-store.ts           # Client directory state
│       ├── components/
│       │   ├── ui/                       # shadcn/ui primitives (auto-generated)
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx           # Main navigation sidebar
│       │   │   ├── Header.tsx            # Top bar with search + user
│       │   │   └── AppShell.tsx          # Layout wrapper
│       │   ├── dashboard/
│       │   │   ├── MetricCard.tsx         # KPI display card
│       │   │   ├── RecentActivity.tsx     # Activity feed
│       │   │   └── QuickActions.tsx       # Quick action buttons
│       │   ├── agents/
│       │   │   ├── AgentChat.tsx          # Chat interface for agents
│       │   │   ├── AgentSelector.tsx      # Agent type picker
│       │   │   ├── MessageBubble.tsx      # Chat message display
│       │   │   └── AgentTaskList.tsx      # Running/completed agent tasks
│       │   ├── clients/
│       │   │   ├── ClientTable.tsx        # Client list table
│       │   │   ├── ClientForm.tsx         # Add/edit client form
│       │   │   └── ClientDetail.tsx       # Client detail view
│       │   └── services/
│       │       ├── ServiceCatalog.tsx     # Service grid browser
│       │       └── ServiceCard.tsx        # Individual service card
│       └── pages/
│           ├── DashboardPage.tsx
│           ├── AgentsPage.tsx
│           ├── ClientsPage.tsx
│           └── ServicesPage.tsx
│
├── server/                               # Backend API
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                      # Express server entry
│       ├── db/
│       │   ├── schema.ts                 # Drizzle schema definitions
│       │   ├── index.ts                  # DB connection
│       │   └── seed.ts                   # Seed data (services catalog)
│       ├── routes/
│       │   ├── clients.ts                # Client CRUD endpoints
│       │   ├── agents.ts                 # AI agent endpoints
│       │   └── services.ts               # Service catalog endpoints
│       └── agents/
│           ├── types.ts                  # Agent type definitions
│           ├── runner.ts                 # Agent execution engine
│           └── prompts/
│               ├── proposal-agent.ts     # Proposal writing agent
│               ├── research-agent.ts     # Market/client research agent
│               ├── content-agent.ts      # Content generation agent
│               └── audit-agent.ts        # AI readiness audit agent
│
└── shared/                               # Shared types
    ├── package.json
    └── src/
        └── types.ts                      # Shared TypeScript types
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `.env.example`, `.gitignore`
- Create: `shared/package.json`, `shared/src/types.ts`
- Create: `client/package.json`, `client/tsconfig.json`, `client/vite.config.ts`, `client/index.html`
- Create: `client/tailwind.config.ts`, `client/postcss.config.js`, `client/components.json`
- Create: `client/src/main.tsx`, `client/src/index.css`, `client/src/App.tsx`, `client/src/lib/utils.ts`
- Create: `server/package.json`, `server/tsconfig.json`, `server/src/index.ts`

- [ ] **Step 1: Create root workspace config**

```bash
mkdir -p shared/src client/src server/src
```

Create `package.json`:
```json
{
  "name": "innovaco",
  "private": true,
  "workspaces": ["shared", "client", "server"],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "build": "npm run build --workspace=shared && npm run build --workspace=client"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.7.3"
  }
}
```

Create `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true
  }
}
```

Create `.env.example`:
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
DATABASE_URL=./data/innovaco.db
```

Create `.gitignore`:
```
node_modules/
dist/
.env
*.db
.DS_Store
```

- [ ] **Step 2: Create shared types package**

Create `shared/package.json`:
```json
{
  "name": "@innovaco/shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/types.ts",
  "types": "./src/types.ts"
}
```

Create `shared/src/types.ts`:
```typescript
// ---- Clients ----
export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  industry: string;
  status: "lead" | "active" | "completed" | "churned";
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ClientCreate = Omit<Client, "id" | "createdAt" | "updatedAt">;

// ---- Services ----
export interface Service {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  tier: "entry" | "core" | "high-ticket" | "scalable";
  tags: string[];
}

// ---- AI Agents ----
export type AgentType = "proposal" | "research" | "content" | "audit";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AgentConversation {
  id: string;
  agentType: AgentType;
  title: string;
  messages: AgentMessage[];
  status: "active" | "completed";
  createdAt: string;
}

export interface AgentConfig {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  systemPrompt: string;
}

// ---- Dashboard ----
export interface DashboardMetrics {
  totalClients: number;
  activeProjects: number;
  agentTasksToday: number;
  revenue: number;
}
```

- [ ] **Step 3: Create client package with Vite + React + Tailwind**

Create `client/package.json`:
```json
{
  "name": "@innovaco/client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@innovaco/shared": "*",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zustand": "^5.0.3",
    "lucide-react": "^0.468.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.6.0",
    "class-variance-authority": "^0.7.1",
    "react-markdown": "^9.0.3"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "vite": "^6.0.5"
  }
}
```

Create `client/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

Create `client/vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

Create `client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Innovaco Command Center</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `client/tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
```

Create `client/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Create `client/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "zinc",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 4: Create client entry files**

Create `client/src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Create `client/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

Create `client/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `client/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { AgentsPage } from "./pages/AgentsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ServicesPage } from "./pages/ServicesPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/services" element={<ServicesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Create server package**

Create `server/package.json`:
```json
{
  "name": "@innovaco/server",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "@innovaco/shared": "*",
    "@anthropic-ai/sdk": "^0.39.0",
    "better-sqlite3": "^11.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "drizzle-orm": "^0.38.3",
    "express": "^4.21.1",
    "nanoid": "^5.0.9",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "drizzle-kit": "^0.30.1",
    "tsx": "^4.19.2"
  }
}
```

Create `server/tsconfig.json`:
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

Create `server/src/index.ts`:
```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clientsRouter } from "./routes/clients.js";
import { agentsRouter } from "./routes/agents.js";
import { servicesRouter } from "./routes/services.js";
import { initDb } from "./db/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
initDb();

// Routes
app.use("/api/clients", clientsRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/services", servicesRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "innovaco-api" });
});

app.listen(PORT, () => {
  console.log(`Innovaco API running on http://localhost:${PORT}`);
});
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev:client
```

Expected: Vite dev server starts on port 5173 (will show errors for missing components — that's expected, we build those next).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Innovaco monorepo with Vite + React + Express"
```

---

## Task 2: App Shell — Sidebar + Header + Layout

**Files:**
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/layout/Header.tsx`
- Create: `client/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Create the Sidebar component**

Create `client/src/components/layout/Sidebar.tsx`:
```tsx
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Bot,
  Users,
  BookOpen,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "AI Agents", icon: Bot },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/services", label: "Services", icon: BookOpen },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">Innovaco</h1>
          <p className="text-xs text-muted-foreground">Command Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-3">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create the Header component**

Create `client/src/components/layout/Header.tsx`:
```tsx
import { Search, Bell } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {/* Search */}
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients, services, agents..."
          className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        <button className="relative rounded-lg p-2 hover:bg-accent">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">IN</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium">Innovaco Team</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create the AppShell layout wrapper**

Create `client/src/components/layout/AppShell.tsx`:
```tsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/layout/
git commit -m "feat: add app shell with sidebar navigation and header"
```

---

## Task 3: Dashboard Page

**Files:**
- Create: `client/src/components/dashboard/MetricCard.tsx`
- Create: `client/src/components/dashboard/RecentActivity.tsx`
- Create: `client/src/components/dashboard/QuickActions.tsx`
- Create: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Create MetricCard component**

Create `client/src/components/dashboard/MetricCard.tsx`:
```tsx
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor = "bg-primary/10 text-primary",
}: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("rounded-lg p-2", iconColor)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold">{value}</p>
        {change && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              changeType === "positive" && "text-emerald-600",
              changeType === "negative" && "text-red-600",
              changeType === "neutral" && "text-muted-foreground"
            )}
          >
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create RecentActivity component**

Create `client/src/components/dashboard/RecentActivity.tsx`:
```tsx
import { Bot, Users, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "agent" | "client" | "proposal" | "automation";
  title: string;
  description: string;
  time: string;
}

const iconMap = {
  agent: { icon: Bot, color: "bg-violet-100 text-violet-600" },
  client: { icon: Users, color: "bg-blue-100 text-blue-600" },
  proposal: { icon: FileText, color: "bg-amber-100 text-amber-600" },
  automation: { icon: Zap, color: "bg-emerald-100 text-emerald-600" },
};

const mockActivities: Activity[] = [
  { id: "1", type: "agent", title: "AI Research Agent", description: "Completed market analysis for Limassol hospitality sector", time: "5 min ago" },
  { id: "2", type: "client", title: "New Lead", description: "Cyprus Hotels Group added to pipeline", time: "1 hour ago" },
  { id: "3", type: "proposal", title: "Proposal Generated", description: "AI chatbot proposal for RetailCo ready for review", time: "2 hours ago" },
  { id: "4", type: "automation", title: "Workflow Triggered", description: "Client onboarding automation completed for MedClinic", time: "3 hours ago" },
  { id: "5", type: "agent", title: "Content Agent", description: "Generated 5 LinkedIn posts for Q2 campaign", time: "5 hours ago" },
];

export function RecentActivity() {
  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold">Recent Activity</h3>
      </div>
      <div className="divide-y">
        {mockActivities.map((activity) => {
          const { icon: Icon, color } = iconMap[activity.type];
          return (
            <div key={activity.id} className="flex items-start gap-4 px-6 py-4">
              <div className={cn("rounded-lg p-2", color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.title}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {activity.time}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create QuickActions component**

Create `client/src/components/dashboard/QuickActions.tsx`:
```tsx
import { useNavigate } from "react-router-dom";
import { Bot, UserPlus, FileText, Sparkles } from "lucide-react";

const actions = [
  {
    label: "New AI Agent Task",
    description: "Dispatch an AI agent",
    icon: Bot,
    color: "bg-violet-100 text-violet-600 hover:bg-violet-200",
    to: "/agents",
  },
  {
    label: "Add Client",
    description: "Register a new lead",
    icon: UserPlus,
    color: "bg-blue-100 text-blue-600 hover:bg-blue-200",
    to: "/clients",
  },
  {
    label: "Generate Proposal",
    description: "AI-powered proposal",
    icon: FileText,
    color: "bg-amber-100 text-amber-600 hover:bg-amber-200",
    to: "/agents",
  },
  {
    label: "AI Audit",
    description: "Run AI readiness check",
    icon: Sparkles,
    color: "bg-emerald-100 text-emerald-600 hover:bg-emerald-200",
    to: "/agents",
  },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h3 className="font-semibold">Quick Actions</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.to)}
            className="flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
          >
            <div className={`rounded-lg p-2 ${action.color}`}>
              <action.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">{action.label}</p>
              <p className="text-xs text-muted-foreground">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create DashboardPage**

Create `client/src/pages/DashboardPage.tsx`:
```tsx
import { Users, Bot, FolderKanban, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back to Innovaco Command Center
        </p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Clients"
          value={24}
          change="+3 this month"
          changeType="positive"
          icon={Users}
          iconColor="bg-blue-100 text-blue-600"
        />
        <MetricCard
          title="Active Projects"
          value={8}
          change="2 due this week"
          changeType="neutral"
          icon={FolderKanban}
          iconColor="bg-amber-100 text-amber-600"
        />
        <MetricCard
          title="Agent Tasks Today"
          value={12}
          change="+40% vs yesterday"
          changeType="positive"
          icon={Bot}
          iconColor="bg-violet-100 text-violet-600"
        />
        <MetricCard
          title="Monthly Revenue"
          value="€32.4K"
          change="+12% vs last month"
          changeType="positive"
          icon={TrendingUp}
          iconColor="bg-emerald-100 text-emerald-600"
        />
      </div>

      {/* Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/dashboard/ client/src/pages/DashboardPage.tsx
git commit -m "feat: add dashboard page with metrics, activity feed, and quick actions"
```

---

## Task 4: Database Schema + Seed Data

**Files:**
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/index.ts`
- Create: `server/src/db/seed.ts`

- [ ] **Step 1: Create Drizzle schema**

Create `server/src/db/schema.ts`:
```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable("clients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  industry: text("industry").notNull(),
  status: text("status", { enum: ["lead", "active", "completed", "churned"] })
    .notNull()
    .default("lead"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agentConversations = sqliteTable("agent_conversations", {
  id: text("id").primaryKey(),
  agentType: text("agent_type", {
    enum: ["proposal", "research", "content", "audit"],
  }).notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["active", "completed"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
});

export const agentMessages = sqliteTable("agent_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => agentConversations.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory").notNull(),
  description: text("description").notNull(),
  tier: text("tier", {
    enum: ["entry", "core", "high-ticket", "scalable"],
  }).notNull(),
  tags: text("tags").notNull().default("[]"), // JSON array stored as text
});
```

- [ ] **Step 2: Create database connection**

Create `server/src/db/index.ts`:
```typescript
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import { mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DATABASE_URL || "./data/innovaco.db";

let db: ReturnType<typeof drizzle>;

export function initDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      industry TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lead',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_conversations (
      id TEXT PRIMARY KEY,
      agent_type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES agent_conversations(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      description TEXT NOT NULL,
      tier TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]'
    );
  `);

  db = drizzle(sqlite, { schema });
  return db;
}

export function getDb() {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
```

- [ ] **Step 3: Create seed data with the full Innovaco service catalog**

Create `server/src/db/seed.ts`:
```typescript
import { initDb, getDb } from "./index.js";
import { services, clients } from "./schema.js";
import { nanoid } from "nanoid";

initDb();
const db = getDb();

// Seed services — Innovaco's full offer stack
const serviceData = [
  // AI Innovation Services
  { name: "Lead Generation Chatbot", category: "AI Innovation", subcategory: "AI Chatbot Systems", description: "AI-powered chatbot that captures leads, qualifies prospects, and books meetings automatically.", tier: "core" as const, tags: ["chatbot", "lead-gen", "automation"] },
  { name: "Customer Support AI Agent", category: "AI Innovation", subcategory: "AI Chatbot Systems", description: "24/7 AI support agent that handles FAQs, tickets, and escalations across multiple channels.", tier: "core" as const, tags: ["chatbot", "support", "multi-channel"] },
  { name: "Appointment Booking Bot", category: "AI Innovation", subcategory: "AI Chatbot Systems", description: "Smart scheduling bot integrated with calendars for automated appointment management.", tier: "core" as const, tags: ["chatbot", "scheduling", "calendar"] },
  { name: "AI Sales Agent", category: "AI Innovation", subcategory: "AI Chatbot Systems", description: "Conversational AI that guides prospects through the sales funnel with personalized recommendations.", tier: "high-ticket" as const, tags: ["chatbot", "sales", "personalization"] },
  { name: "Hospitality AI Suite", category: "AI Innovation", subcategory: "Industry Solutions", description: "Complete AI system for hotels and restaurants: booking, concierge, room service, and guest feedback.", tier: "high-ticket" as const, tags: ["hospitality", "hotels", "restaurants"] },
  { name: "Real Estate AI System", category: "AI Innovation", subcategory: "Industry Solutions", description: "Property matching, virtual tours, lead nurturing, and market analysis powered by AI.", tier: "high-ticket" as const, tags: ["real-estate", "lead-nurturing", "market-analysis"] },
  { name: "Insurance AI Assistant", category: "AI Innovation", subcategory: "Industry Solutions", description: "Claims processing, policy recommendations, and customer service automation for insurance.", tier: "high-ticket" as const, tags: ["insurance", "claims", "automation"] },
  { name: "Healthcare AI Tools", category: "AI Innovation", subcategory: "Industry Solutions", description: "Patient intake, appointment scheduling, symptom checking, and medical FAQ automation.", tier: "high-ticket" as const, tags: ["healthcare", "clinic", "patient-intake"] },
  { name: "Retail & E-commerce AI", category: "AI Innovation", subcategory: "Industry Solutions", description: "Product recommendations, inventory insights, customer support, and personalized shopping experiences.", tier: "high-ticket" as const, tags: ["retail", "ecommerce", "recommendations"] },
  { name: "Workflow Automation", category: "AI Innovation", subcategory: "Internal Automation", description: "Custom Zapier/Make automation workflows to eliminate manual tasks and connect your tools.", tier: "core" as const, tags: ["automation", "zapier", "make", "workflow"] },
  { name: "Document Processing AI", category: "AI Innovation", subcategory: "Internal Automation", description: "Automated document extraction, classification, and processing using AI.", tier: "core" as const, tags: ["documents", "extraction", "processing"] },
  { name: "Email & Comms Automation", category: "AI Innovation", subcategory: "Internal Automation", description: "Smart email sequences, auto-responses, and communication workflow automation.", tier: "core" as const, tags: ["email", "communication", "sequences"] },
  { name: "AI Reporting & Analytics", category: "AI Innovation", subcategory: "Internal Automation", description: "Automated reporting dashboards with AI-driven insights and anomaly detection.", tier: "core" as const, tags: ["reporting", "analytics", "dashboards"] },

  // Consulting Services
  { name: "AI Readiness Assessment", category: "Consulting", subcategory: "Assessment", description: "Comprehensive evaluation of your organization's AI maturity, data infrastructure, and opportunities.", tier: "entry" as const, tags: ["assessment", "audit", "strategy"] },
  { name: "AI Strategy Development", category: "Consulting", subcategory: "Strategy", description: "Custom AI strategy aligned with business goals, including ROI projections and implementation roadmap.", tier: "core" as const, tags: ["strategy", "roadmap", "ROI"] },
  { name: "Digital Transformation Roadmap", category: "Consulting", subcategory: "Strategy", description: "30/60/90 day transformation plan covering technology, processes, and people.", tier: "core" as const, tags: ["transformation", "roadmap", "30-60-90"] },
  { name: "SaaS & Tool Consulting", category: "Consulting", subcategory: "Advisory", description: "Expert guidance on CRM, ERP, and automation tool selection and implementation.", tier: "entry" as const, tags: ["saas", "crm", "erp", "tools"] },
  { name: "Grant & Funding Consultation", category: "Consulting", subcategory: "Advisory", description: "Navigation of Cyprus and EU funding programs for digital transformation projects.", tier: "entry" as const, tags: ["grants", "funding", "cyprus", "EU"] },

  // Development Services
  { name: "Custom CRM System", category: "Development", subcategory: "Low-Code", description: "Tailored CRM built on low-code platforms, customized to your sales process.", tier: "core" as const, tags: ["crm", "low-code", "custom"] },
  { name: "Internal Dashboard", category: "Development", subcategory: "Low-Code", description: "Custom business intelligence dashboards for real-time operational visibility.", tier: "core" as const, tags: ["dashboard", "BI", "operations"] },
  { name: "Client Portal", category: "Development", subcategory: "Web Apps", description: "Branded client-facing portal for project tracking, communication, and deliverables.", tier: "core" as const, tags: ["portal", "client-facing", "web-app"] },
  { name: "SaaS MVP Development", category: "Development", subcategory: "Web Apps", description: "Rapid MVP development for SaaS products with AI integration capabilities.", tier: "high-ticket" as const, tags: ["saas", "mvp", "startup"] },
  { name: "Chatbot Dashboard", category: "Development", subcategory: "AI Platforms", description: "Management dashboard for monitoring and configuring deployed AI chatbots.", tier: "core" as const, tags: ["chatbot", "dashboard", "management"] },
  { name: "Custom AI Interface", category: "Development", subcategory: "AI Platforms", description: "Bespoke AI-powered interfaces tailored to specific business workflows.", tier: "high-ticket" as const, tags: ["ai", "custom", "interface"] },

  // Implementation Services
  { name: "AI System Deployment", category: "Implementation", subcategory: "Setup", description: "End-to-end setup and deployment of AI systems in your infrastructure.", tier: "core" as const, tags: ["deployment", "setup", "infrastructure"] },
  { name: "Staff Training & Onboarding", category: "Implementation", subcategory: "Training", description: "Hands-on training programs to get your team comfortable with new AI tools.", tier: "entry" as const, tags: ["training", "onboarding", "adoption"] },
  { name: "Ongoing Maintenance", category: "Implementation", subcategory: "Support", description: "Continuous monitoring, optimization, and support for deployed AI systems.", tier: "core" as const, tags: ["maintenance", "support", "optimization"] },
  { name: "BI Dashboard Setup", category: "Implementation", subcategory: "Analytics", description: "Setup and configuration of business intelligence and analytics dashboards.", tier: "core" as const, tags: ["BI", "analytics", "setup"] },

  // Seminars & Training
  { name: "SME AI Workshop", category: "Training", subcategory: "Workshops", description: "Half-day workshops introducing SMEs to practical AI applications for their business.", tier: "entry" as const, tags: ["workshop", "SME", "introduction"] },
  { name: "Corporate AI Training", category: "Training", subcategory: "Programs", description: "Multi-day corporate training programs on AI strategy, tools, and implementation.", tier: "core" as const, tags: ["corporate", "training", "multi-day"] },
  { name: "Department AI Training", category: "Training", subcategory: "Programs", description: "Targeted training for specific departments: Sales, Marketing, Operations.", tier: "core" as const, tags: ["department", "sales", "marketing", "operations"] },
  { name: "AI Bootcamp", category: "Training", subcategory: "Programs", description: "Intensive bootcamp covering AI fundamentals, tools, and hands-on projects.", tier: "entry" as const, tags: ["bootcamp", "intensive", "hands-on"] },

  // Productised Packages
  { name: "Starter Chatbot Package", category: "Packages", subcategory: "Chatbot", description: "FAQ automation chatbot with basic CRM integration. Perfect for getting started.", tier: "entry" as const, tags: ["package", "starter", "FAQ"] },
  { name: "Growth Chatbot Package", category: "Packages", subcategory: "Chatbot", description: "Lead capture chatbot with CRM integration, analytics, and multi-channel support.", tier: "core" as const, tags: ["package", "growth", "lead-capture"] },
  { name: "Pro AI Agent Package", category: "Packages", subcategory: "Chatbot", description: "Full sales AI agent with multi-channel automation, CRM sync, and advanced analytics.", tier: "high-ticket" as const, tags: ["package", "pro", "sales-agent"] },
  { name: "Automation-as-a-Service", category: "Packages", subcategory: "Automation", description: "Monthly automation setup, optimization, and management retainer.", tier: "core" as const, tags: ["package", "retainer", "automation"] },
  { name: "AI Marketing System", category: "Packages", subcategory: "Marketing", description: "Content generation, email funnels, and lead generation powered by AI.", tier: "core" as const, tags: ["package", "marketing", "content", "funnels"] },
  { name: "Restaurant AI Pack", category: "Packages", subcategory: "Industry", description: "Complete restaurant AI system: ordering, reservations, feedback, and marketing.", tier: "high-ticket" as const, tags: ["package", "restaurant", "industry"] },
  { name: "Real Estate AI Funnel", category: "Packages", subcategory: "Industry", description: "Property lead funnel with AI matching, nurturing, and virtual tour integration.", tier: "high-ticket" as const, tags: ["package", "real-estate", "funnel"] },
  { name: "Clinic Automation Pack", category: "Packages", subcategory: "Industry", description: "Healthcare practice automation: scheduling, patient comms, and intake forms.", tier: "high-ticket" as const, tags: ["package", "clinic", "healthcare"] },
  { name: "Hospitality AI Suite Pack", category: "Packages", subcategory: "Industry", description: "Full hotel/resort AI package: booking, concierge, upselling, and guest experience.", tier: "high-ticket" as const, tags: ["package", "hospitality", "hotel"] },

  // SaaS Products
  { name: "AI.cy Platform", category: "Products", subcategory: "SaaS", description: "Innovaco's AI Chatbot & Lead Generation SaaS platform for Cyprus businesses.", tier: "scalable" as const, tags: ["saas", "platform", "AI.cy"] },
  { name: "Chili Ordering System", category: "Products", subcategory: "SaaS", description: "Table ordering system with AI-powered menu recommendations and upselling.", tier: "scalable" as const, tags: ["saas", "ordering", "Chili"] },
  { name: "Schedex HR Platform", category: "Products", subcategory: "SaaS", description: "Employee management platform with AI-powered scheduling and workforce analytics.", tier: "scalable" as const, tags: ["saas", "HR", "scheduling", "Schedex"] },
];

// Seed clients
const clientData = [
  { name: "Maria Georgiou", company: "Cyprus Hotels Group", email: "maria@cyprushotels.com", phone: "+357 22 123456", industry: "Hospitality", status: "active" as const, notes: "Interested in full hospitality AI suite. Meeting scheduled for next week." },
  { name: "Andreas Christou", company: "Limassol Properties Ltd", email: "andreas@limassolprop.com", phone: "+357 25 654321", industry: "Real Estate", status: "lead" as const, notes: "Referred by Maria. Wants property matching AI." },
  { name: "Elena Papadopoulos", company: "MedClinic Nicosia", email: "elena@medclinic.cy", phone: "+357 22 789012", industry: "Healthcare", status: "active" as const, notes: "Implementing clinic automation pack. Phase 1 complete." },
  { name: "Nikos Stavrou", company: "RetailCo Cyprus", email: "nikos@retailco.cy", phone: "+357 24 345678", industry: "Retail", status: "lead" as const, notes: "Wants e-commerce AI chatbot for customer support." },
  { name: "Sofia Ioannou", company: "InsureSafe Ltd", email: "sofia@insuresafe.com", phone: "+357 22 901234", industry: "Insurance", status: "completed" as const, notes: "Delivered AI claims processing system. Maintenance retainer active." },
  { name: "Demetris Nicolaou", company: "Taverna Paphos", email: "demetris@tavernapaphos.cy", phone: "+357 26 567890", industry: "Hospitality", status: "active" as const, notes: "Using Chili ordering system. Wants to add chatbot." },
];

const now = new Date().toISOString();

console.log("Seeding services...");
for (const s of serviceData) {
  db.insert(services)
    .values({
      id: nanoid(),
      name: s.name,
      category: s.category,
      subcategory: s.subcategory,
      description: s.description,
      tier: s.tier,
      tags: JSON.stringify(s.tags),
    })
    .run();
}

console.log("Seeding clients...");
for (const c of clientData) {
  db.insert(clients)
    .values({
      id: nanoid(),
      name: c.name,
      company: c.company,
      email: c.email,
      phone: c.phone,
      industry: c.industry,
      status: c.status,
      notes: c.notes,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

console.log("Seed complete!");
```

- [ ] **Step 4: Run seed**

```bash
cd server && npm run seed
```

Expected: "Seed complete!" with no errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/db/
git commit -m "feat: add database schema, connection, and seed data with full service catalog"
```

---

## Task 5: API Routes — Clients + Services

**Files:**
- Create: `server/src/routes/clients.ts`
- Create: `server/src/routes/services.ts`
- Create: `client/src/lib/api.ts`

- [ ] **Step 1: Create clients API routes**

Create `server/src/routes/clients.ts`:
```typescript
import { Router } from "express";
import { getDb } from "../db/index.js";
import { clients } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const clientsRouter = Router();

// GET /api/clients
clientsRouter.get("/", (_req, res) => {
  const db = getDb();
  const allClients = db.select().from(clients).all();
  res.json(allClients);
});

// GET /api/clients/:id
clientsRouter.get("/:id", (req, res) => {
  const db = getDb();
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, req.params.id))
    .get();
  if (!client) return res.status(404).json({ error: "Client not found" });
  res.json(client);
});

// POST /api/clients
clientsRouter.post("/", (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  const newClient = {
    id: nanoid(),
    ...req.body,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(clients).values(newClient).run();
  res.status(201).json(newClient);
});

// PUT /api/clients/:id
clientsRouter.put("/:id", (req, res) => {
  const db = getDb();
  const now = new Date().toISOString();
  db.update(clients)
    .set({ ...req.body, updatedAt: now })
    .where(eq(clients.id, req.params.id))
    .run();
  const updated = db
    .select()
    .from(clients)
    .where(eq(clients.id, req.params.id))
    .get();
  res.json(updated);
});

// DELETE /api/clients/:id
clientsRouter.delete("/:id", (req, res) => {
  const db = getDb();
  db.delete(clients).where(eq(clients.id, req.params.id)).run();
  res.status(204).send();
});
```

- [ ] **Step 2: Create services API routes**

Create `server/src/routes/services.ts`:
```typescript
import { Router } from "express";
import { getDb } from "../db/index.js";
import { services } from "../db/schema.js";

export const servicesRouter = Router();

// GET /api/services
servicesRouter.get("/", (req, res) => {
  const db = getDb();
  let allServices = db.select().from(services).all();

  // Parse tags from JSON string
  const parsed = allServices.map((s) => ({
    ...s,
    tags: JSON.parse(s.tags),
  }));

  // Optional category filter
  const category = req.query.category as string | undefined;
  if (category) {
    return res.json(parsed.filter((s) => s.category === category));
  }

  res.json(parsed);
});

// GET /api/services/categories
servicesRouter.get("/categories", (_req, res) => {
  const db = getDb();
  const allServices = db.select().from(services).all();
  const categories = [...new Set(allServices.map((s) => s.category))];
  res.json(categories);
});
```

- [ ] **Step 3: Create API client for the frontend**

Create `client/src/lib/api.ts`:
```typescript
const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Clients
  getClients: () => request<any[]>("/clients"),
  getClient: (id: string) => request<any>(`/clients/${id}`),
  createClient: (data: any) =>
    request<any>("/clients", { method: "POST", body: JSON.stringify(data) }),
  updateClient: (id: string, data: any) =>
    request<any>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteClient: (id: string) =>
    request<void>(`/clients/${id}`, { method: "DELETE" }),

  // Services
  getServices: (category?: string) =>
    request<any[]>(`/services${category ? `?category=${category}` : ""}`),
  getCategories: () => request<string[]>("/services/categories"),

  // Agents
  sendAgentMessage: (conversationId: string, message: string, agentType: string) =>
    request<any>("/agents/chat", {
      method: "POST",
      body: JSON.stringify({ conversationId, message, agentType }),
    }),
  getConversations: () => request<any[]>("/agents/conversations"),
  getConversation: (id: string) => request<any>(`/agents/conversations/${id}`),
};
```

- [ ] **Step 4: Verify API with curl**

```bash
npm run dev:server &
sleep 2
curl http://localhost:3001/api/health
curl http://localhost:3001/api/services | head -c 200
```

Expected: Health check returns `{"status":"ok"}`, services returns JSON array.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/ client/src/lib/api.ts
git commit -m "feat: add client CRUD and services API routes with frontend API client"
```

---

## Task 6: AI Agent System — Backend

**Files:**
- Create: `server/src/agents/types.ts`
- Create: `server/src/agents/prompts/proposal-agent.ts`
- Create: `server/src/agents/prompts/research-agent.ts`
- Create: `server/src/agents/prompts/content-agent.ts`
- Create: `server/src/agents/prompts/audit-agent.ts`
- Create: `server/src/agents/runner.ts`
- Create: `server/src/routes/agents.ts`

- [ ] **Step 1: Define agent types and configs**

Create `server/src/agents/types.ts`:
```typescript
import type { AgentConfig } from "@innovaco/shared";

export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  proposal: {
    type: "proposal",
    name: "Proposal Writer",
    description: "Generates professional service proposals tailored to client needs and Innovaco's offerings.",
    icon: "FileText",
    color: "amber",
    systemPrompt: "", // Set in prompt files
  },
  research: {
    type: "research",
    name: "Market Researcher",
    description: "Analyzes markets, competitors, and industries to provide actionable intelligence.",
    icon: "Search",
    color: "blue",
    systemPrompt: "",
  },
  content: {
    type: "content",
    name: "Content Creator",
    description: "Creates marketing content, social posts, email campaigns, and blog articles.",
    icon: "PenTool",
    color: "emerald",
    systemPrompt: "",
  },
  audit: {
    type: "audit",
    name: "AI Readiness Auditor",
    description: "Evaluates organizations' AI maturity and recommends transformation steps.",
    icon: "ClipboardCheck",
    color: "violet",
    systemPrompt: "",
  },
};
```

- [ ] **Step 2: Create agent system prompts**

Create `server/src/agents/prompts/proposal-agent.ts`:
```typescript
export const PROPOSAL_SYSTEM_PROMPT = `You are the Innovaco Proposal Writer AI Agent. You work for Innovaco, a digital transformation agency based in Cyprus.

Your role is to generate professional, compelling service proposals for potential clients.

## Innovaco's Core Services:
- AI Chatbot Systems (Lead Gen, Support, Booking, Sales)
- Industry-Specific AI Solutions (Hospitality, Real Estate, Insurance, Healthcare, Retail)
- Internal AI Automation (Workflows, Document Processing, Email, Analytics)
- Consulting (AI Readiness, Strategy, Digital Transformation Roadmaps)
- Development (CRM, Dashboards, Client Portals, SaaS MVPs)
- Implementation & Training
- Productised Packages (Starter/Growth/Pro tiers)
- SaaS Products: AI.cy, Chili, Schedex

## When writing proposals:
1. Ask about the client's industry, pain points, and goals if not provided
2. Recommend specific Innovaco services that match their needs
3. Structure proposals with: Executive Summary, Proposed Solution, Deliverables, Timeline, Investment
4. Use professional but approachable language
5. Include clear ROI projections where possible
6. Reference relevant case studies or industry benchmarks
7. Always present tiered options (Basic, Growth, Enterprise) when appropriate

Format proposals in clean Markdown. Be specific about deliverables and timelines.`;
```

Create `server/src/agents/prompts/research-agent.ts`:
```typescript
export const RESEARCH_SYSTEM_PROMPT = `You are the Innovaco Market Research AI Agent. You work for Innovaco, a digital transformation agency based in Cyprus.

Your role is to provide market intelligence, competitor analysis, and industry insights.

## Research capabilities:
- Industry analysis (market size, trends, key players)
- Competitor analysis (strengths, weaknesses, positioning)
- Technology landscape assessment
- Cyprus and EU market specifics
- AI adoption trends by sector
- Customer persona development
- SWOT analysis

## When conducting research:
1. Ask clarifying questions about the specific market or industry
2. Provide structured, actionable insights
3. Include data points and statistics where relevant
4. Highlight opportunities for AI/digital transformation
5. Consider the Cyprus and broader EU context
6. Identify potential risks and challenges
7. Recommend next steps based on findings

Present findings in clear, structured Markdown with sections, bullet points, and tables where appropriate.`;
```

Create `server/src/agents/prompts/content-agent.ts`:
```typescript
export const CONTENT_SYSTEM_PROMPT = `You are the Innovaco Content Creator AI Agent. You work for Innovaco, a digital transformation agency based in Cyprus.

Your role is to create high-quality marketing and business content.

## Content types you create:
- LinkedIn posts and articles
- Blog posts and thought leadership pieces
- Email marketing campaigns and sequences
- Social media content calendars
- Case study drafts
- Website copy
- Presentation outlines
- Newsletter content

## Content guidelines:
1. Maintain Innovaco's brand voice: professional, innovative, approachable
2. Focus on digital transformation and AI topics
3. Include relevant calls-to-action
4. Optimize for the target platform (LinkedIn, email, blog, etc.)
5. Reference real industry trends and statistics
6. Keep content practical and actionable
7. Consider the Cyprus business market context

When asked to create content, ask about: target audience, platform, key message, and desired tone if not specified.`;
```

Create `server/src/agents/prompts/audit-agent.ts`:
```typescript
export const AUDIT_SYSTEM_PROMPT = `You are the Innovaco AI Readiness Auditor Agent. You work for Innovaco, a digital transformation agency based in Cyprus.

Your role is to assess organizations' readiness for AI adoption and digital transformation.

## Audit framework:
1. **Data Infrastructure** - Data collection, storage, quality, accessibility
2. **Technology Stack** - Current tools, integration capabilities, cloud readiness
3. **Process Maturity** - Automation level, documentation, standardization
4. **People & Skills** - AI literacy, training needs, change readiness
5. **Strategy & Leadership** - Vision, budget, executive sponsorship
6. **Compliance & Ethics** - Data privacy, regulatory requirements, AI governance

## Audit process:
1. Ask structured questions about each dimension
2. Score each area on a 1-5 maturity scale
3. Identify quick wins (high impact, low effort)
4. Highlight critical gaps that need addressing
5. Recommend a prioritized transformation roadmap
6. Map Innovaco services to identified needs
7. Provide a 30/60/90 day action plan

## Scoring guide:
- 1: No awareness or capability
- 2: Initial/ad-hoc efforts
- 3: Defined processes in place
- 4: Managed and measured
- 5: Optimized and innovative

Present the audit as a structured report with clear scores, findings, and recommendations.`;
```

- [ ] **Step 3: Create the agent runner engine**

Create `server/src/agents/runner.ts`:
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { PROPOSAL_SYSTEM_PROMPT } from "./prompts/proposal-agent.js";
import { RESEARCH_SYSTEM_PROMPT } from "./prompts/research-agent.js";
import { CONTENT_SYSTEM_PROMPT } from "./prompts/content-agent.js";
import { AUDIT_SYSTEM_PROMPT } from "./prompts/audit-agent.js";
import type { AgentType } from "@innovaco/shared";

const systemPrompts: Record<AgentType, string> = {
  proposal: PROPOSAL_SYSTEM_PROMPT,
  research: RESEARCH_SYSTEM_PROMPT,
  content: CONTENT_SYSTEM_PROMPT,
  audit: AUDIT_SYSTEM_PROMPT,
};

let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function runAgent(
  agentType: AgentType,
  messages: ChatMessage[]
): Promise<string> {
  const client = getClient();
  const systemPrompt = systemPrompts[agentType];

  if (!systemPrompt) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // If no API key, return a helpful mock response
  if (!process.env.ANTHROPIC_API_KEY) {
    return getMockResponse(agentType, messages[messages.length - 1]?.content || "");
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text || "I apologize, but I was unable to generate a response.";
}

function getMockResponse(agentType: AgentType, lastMessage: string): string {
  const responses: Record<AgentType, string> = {
    proposal: `## Proposal Draft

Based on your request: "${lastMessage.slice(0, 100)}"

**Note:** This is a demo response. Connect your Anthropic API key in \`.env\` to get AI-powered proposals.

### Proposed Solution
- Custom AI chatbot for lead generation
- Integration with existing CRM
- Multi-channel deployment (web, WhatsApp, email)

### Timeline
- Week 1-2: Discovery & Design
- Week 3-4: Development & Integration
- Week 5: Testing & Launch

### Investment
- Starter: €2,500/mo
- Growth: €4,500/mo
- Enterprise: €8,000/mo`,

    research: `## Market Research Report

**Query:** "${lastMessage.slice(0, 100)}"

**Note:** This is a demo response. Connect your Anthropic API key for real AI-powered research.

### Key Findings
- The Cyprus digital transformation market is growing at 15% annually
- AI adoption among SMEs is still below 20%
- Key opportunity areas: hospitality, real estate, healthcare

### Recommendations
1. Focus on hospitality sector — highest demand
2. Partner with local tech incubators
3. Leverage EU funding programs for client acquisition`,

    content: `## Content Generated

**Brief:** "${lastMessage.slice(0, 100)}"

**Note:** Connect your Anthropic API key for AI-powered content generation.

### LinkedIn Post Draft

🚀 Is your business ready for AI?

At Innovaco, we've helped 20+ Cyprus businesses transform their operations with AI-powered solutions.

Here's what we've learned:
✅ Start small — automate one process first
✅ Focus on ROI — measure everything
✅ Train your team — AI augments, doesn't replace

Ready to start your AI journey? Let's talk.

#DigitalTransformation #AI #Cyprus #Innovation`,

    audit: `## AI Readiness Assessment

**Organization:** Based on "${lastMessage.slice(0, 100)}"

**Note:** Connect your Anthropic API key for comprehensive AI-powered audits.

### Preliminary Assessment

| Dimension | Score | Status |
|-----------|-------|--------|
| Data Infrastructure | 2/5 | Needs Improvement |
| Technology Stack | 3/5 | Developing |
| Process Maturity | 2/5 | Needs Improvement |
| People & Skills | 2/5 | Needs Improvement |
| Strategy | 3/5 | Developing |
| Compliance | 3/5 | Developing |

### Quick Wins
1. Implement basic workflow automation (€500/mo savings)
2. Deploy FAQ chatbot for customer support
3. Set up analytics dashboard for key metrics

### Recommended Next Steps
→ Full AI Readiness Assessment with Innovaco team`,
  };

  return responses[agentType];
}
```

- [ ] **Step 4: Create agents API route**

Create `server/src/routes/agents.ts`:
```typescript
import { Router } from "express";
import { getDb } from "../db/index.js";
import { agentConversations, agentMessages } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runAgent, type ChatMessage } from "../agents/runner.js";
import { AGENT_CONFIGS } from "../agents/types.js";
import type { AgentType } from "@innovaco/shared";

export const agentsRouter = Router();

// GET /api/agents/types — list available agent types
agentsRouter.get("/types", (_req, res) => {
  res.json(Object.values(AGENT_CONFIGS));
});

// GET /api/agents/conversations
agentsRouter.get("/conversations", (_req, res) => {
  const db = getDb();
  const conversations = db.select().from(agentConversations).all();
  res.json(conversations);
});

// GET /api/agents/conversations/:id
agentsRouter.get("/conversations/:id", (req, res) => {
  const db = getDb();
  const conversation = db
    .select()
    .from(agentConversations)
    .where(eq(agentConversations.id, req.params.id))
    .get();

  if (!conversation) return res.status(404).json({ error: "Not found" });

  const messages = db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, req.params.id))
    .all();

  res.json({ ...conversation, messages });
});

// POST /api/agents/chat
agentsRouter.post("/chat", async (req, res) => {
  const db = getDb();
  const { conversationId, message, agentType } = req.body as {
    conversationId?: string;
    message: string;
    agentType: AgentType;
  };

  const now = new Date().toISOString();
  let convId = conversationId;

  // Create new conversation if needed
  if (!convId) {
    convId = nanoid();
    const title = message.slice(0, 80) + (message.length > 80 ? "..." : "");
    db.insert(agentConversations)
      .values({
        id: convId,
        agentType,
        title,
        status: "active",
        createdAt: now,
      })
      .run();
  }

  // Save user message
  db.insert(agentMessages)
    .values({
      id: nanoid(),
      conversationId: convId,
      role: "user",
      content: message,
      timestamp: now,
    })
    .run();

  // Get conversation history
  const history = db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.conversationId, convId))
    .all();

  const chatMessages: ChatMessage[] = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  try {
    // Run the agent
    const response = await runAgent(agentType, chatMessages);

    // Save assistant message
    const assistantMsg = {
      id: nanoid(),
      conversationId: convId,
      role: "assistant" as const,
      content: response,
      timestamp: new Date().toISOString(),
    };
    db.insert(agentMessages).values(assistantMsg).run();

    res.json({
      conversationId: convId,
      message: assistantMsg,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 5: Commit**

```bash
git add server/src/agents/ server/src/routes/agents.ts
git commit -m "feat: add AI agent system with 4 specialized agents and chat API"
```

---

## Task 7: AI Agents Page — Frontend

**Files:**
- Create: `client/src/stores/agent-store.ts`
- Create: `client/src/components/agents/AgentSelector.tsx`
- Create: `client/src/components/agents/MessageBubble.tsx`
- Create: `client/src/components/agents/AgentChat.tsx`
- Create: `client/src/components/agents/AgentTaskList.tsx`
- Create: `client/src/pages/AgentsPage.tsx`

- [ ] **Step 1: Create agent store with Zustand**

Create `client/src/stores/agent-store.ts`:
```typescript
import { create } from "zustand";
import { api } from "@/lib/api";
import type { AgentType, AgentMessage } from "@innovaco/shared";

interface AgentState {
  conversations: any[];
  activeConversationId: string | null;
  activeAgentType: AgentType;
  messages: AgentMessage[];
  isLoading: boolean;

  setAgentType: (type: AgentType) => void;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  loadConversations: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  newConversation: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  activeAgentType: "proposal",
  messages: [],
  isLoading: false,

  setAgentType: (type) => set({ activeAgentType: type }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  newConversation: () =>
    set({ activeConversationId: null, messages: [] }),

  loadConversations: async () => {
    const conversations = await api.getConversations();
    set({ conversations });
  },

  loadConversation: async (id) => {
    const conv = await api.getConversation(id);
    set({
      activeConversationId: id,
      activeAgentType: conv.agentType,
      messages: conv.messages,
    });
  },

  sendMessage: async (content) => {
    const { activeConversationId, activeAgentType, messages } = get();

    // Optimistically add user message
    const userMsg: AgentMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    set({ messages: [...messages, userMsg], isLoading: true });

    try {
      const response = await api.sendAgentMessage(
        activeConversationId || "",
        content,
        activeAgentType
      );

      set((state) => ({
        activeConversationId: response.conversationId,
        messages: [
          ...state.messages,
          {
            id: response.message.id,
            role: "assistant" as const,
            content: response.message.content,
            timestamp: response.message.timestamp,
          },
        ],
        isLoading: false,
      }));

      // Refresh conversation list
      get().loadConversations();
    } catch (error) {
      set({ isLoading: false });
      console.error("Agent error:", error);
    }
  },
}));
```

- [ ] **Step 2: Create AgentSelector component**

Create `client/src/components/agents/AgentSelector.tsx`:
```tsx
import {
  FileText,
  Search,
  PenTool,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentType } from "@innovaco/shared";

const agents: {
  type: AgentType;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}[] = [
  {
    type: "proposal",
    name: "Proposal Writer",
    description: "Generate client proposals",
    icon: FileText,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  {
    type: "research",
    name: "Market Researcher",
    description: "Analyze markets & competitors",
    icon: Search,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  {
    type: "content",
    name: "Content Creator",
    description: "Create marketing content",
    icon: PenTool,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
  },
  {
    type: "audit",
    name: "AI Readiness Auditor",
    description: "Assess AI readiness",
    icon: ClipboardCheck,
    color: "text-violet-600",
    bgColor: "bg-violet-100",
  },
];

interface AgentSelectorProps {
  selected: AgentType;
  onSelect: (type: AgentType) => void;
}

export function AgentSelector({ selected, onSelect }: AgentSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {agents.map((agent) => (
        <button
          key={agent.type}
          onClick={() => onSelect(agent.type)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
            selected === agent.type
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "hover:bg-accent"
          )}
        >
          <div className={cn("rounded-lg p-2", agent.bgColor)}>
            <agent.icon className={cn("h-5 w-5", agent.color)} />
          </div>
          <div>
            <p className="text-sm font-medium">{agent.name}</p>
            <p className="text-xs text-muted-foreground">
              {agent.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create MessageBubble component**

Create `client/src/components/agents/MessageBubble.tsx`:
```tsx
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-violet-100"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-violet-600" />
        )}
      </div>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        <p
          className={cn(
            "mt-1 text-xs",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AgentChat component**

Create `client/src/components/agents/AgentChat.tsx`:
```tsx
import { useState, useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";
import { MessageBubble } from "./MessageBubble";

export function AgentChat() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage, activeAgentType } = useAgentStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  };

  const placeholders: Record<string, string> = {
    proposal: "Describe the client and what they need...",
    research: "What market or industry would you like to research?",
    content: "What content would you like me to create?",
    audit: "Tell me about the organization to audit...",
  };

  return (
    <div className="flex h-[600px] flex-col rounded-xl border bg-card">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                Start a conversation
              </p>
              <p className="text-sm text-muted-foreground">
                {placeholders[activeAgentType]}
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
          />
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
            </div>
            <div className="rounded-2xl bg-muted px-4 py-3">
              <p className="text-sm text-muted-foreground">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholders[activeAgentType]}
            className="flex-1 rounded-lg border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-lg bg-primary px-4 py-2.5 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Create AgentTaskList component**

Create `client/src/components/agents/AgentTaskList.tsx`:
```tsx
import { useEffect } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { useAgentStore } from "@/stores/agent-store";
import { cn } from "@/lib/utils";

export function AgentTaskList() {
  const {
    conversations,
    activeConversationId,
    loadConversations,
    loadConversation,
    newConversation,
  } = useAgentStore();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Conversations</h3>
        <button
          onClick={newConversation}
          className="rounded-lg p-1.5 hover:bg-accent"
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No conversations yet. Start one above!
          </p>
        ) : (
          <div className="divide-y">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent",
                  activeConversationId === conv.id && "bg-accent"
                )}
              >
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{conv.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conv.agentType} &middot;{" "}
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create AgentsPage**

Create `client/src/pages/AgentsPage.tsx`:
```tsx
import { AgentSelector } from "@/components/agents/AgentSelector";
import { AgentChat } from "@/components/agents/AgentChat";
import { AgentTaskList } from "@/components/agents/AgentTaskList";
import { useAgentStore } from "@/stores/agent-store";

export function AgentsPage() {
  const { activeAgentType, setAgentType, newConversation } = useAgentStore();

  const handleSelectAgent = (type: typeof activeAgentType) => {
    setAgentType(type);
    newConversation();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Agents</h2>
        <p className="text-muted-foreground">
          Dispatch specialized AI agents for proposals, research, content, and audits
        </p>
      </div>

      {/* Agent Type Selector */}
      <AgentSelector selected={activeAgentType} onSelect={handleSelectAgent} />

      {/* Chat + History */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AgentChat />
        </div>
        <AgentTaskList />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/stores/agent-store.ts client/src/components/agents/ client/src/pages/AgentsPage.tsx
git commit -m "feat: add AI agents page with chat interface, agent selector, and conversation history"
```

---

## Task 8: Clients Page — Frontend

**Files:**
- Create: `client/src/stores/client-store.ts`
- Create: `client/src/components/clients/ClientTable.tsx`
- Create: `client/src/components/clients/ClientForm.tsx`
- Create: `client/src/components/clients/ClientDetail.tsx`
- Create: `client/src/pages/ClientsPage.tsx`

- [ ] **Step 1: Create client store**

Create `client/src/stores/client-store.ts`:
```typescript
import { create } from "zustand";
import { api } from "@/lib/api";
import type { Client, ClientCreate } from "@innovaco/shared";

interface ClientState {
  clients: Client[];
  selectedClient: Client | null;
  isLoading: boolean;
  showForm: boolean;
  editingClient: Client | null;

  loadClients: () => Promise<void>;
  selectClient: (client: Client | null) => void;
  createClient: (data: ClientCreate) => Promise<void>;
  updateClient: (id: string, data: Partial<ClientCreate>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  openForm: (client?: Client) => void;
  closeForm: () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  selectedClient: null,
  isLoading: false,
  showForm: false,
  editingClient: null,

  loadClients: async () => {
    set({ isLoading: true });
    const clients = await api.getClients();
    set({ clients, isLoading: false });
  },

  selectClient: (client) => set({ selectedClient: client }),

  createClient: async (data) => {
    await api.createClient(data);
    await get().loadClients();
    set({ showForm: false });
  },

  updateClient: async (id, data) => {
    await api.updateClient(id, data);
    await get().loadClients();
    set({ showForm: false, editingClient: null });
  },

  deleteClient: async (id) => {
    await api.deleteClient(id);
    set({ selectedClient: null });
    await get().loadClients();
  },

  openForm: (client) =>
    set({ showForm: true, editingClient: client || null }),

  closeForm: () => set({ showForm: false, editingClient: null }),
}));
```

- [ ] **Step 2: Create ClientTable component**

Create `client/src/components/clients/ClientTable.tsx`:
```tsx
import { useEffect } from "react";
import { useClientStore } from "@/stores/client-store";
import { cn } from "@/lib/utils";

const statusColors = {
  lead: "bg-yellow-100 text-yellow-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  churned: "bg-red-100 text-red-700",
};

export function ClientTable() {
  const { clients, selectedClient, isLoading, loadClients, selectClient } =
    useClientStore();

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
        <p className="text-muted-foreground">Loading clients...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              Company
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              Industry
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {clients.map((client) => (
            <tr
              key={client.id}
              onClick={() => selectClient(client)}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent",
                selectedClient?.id === client.id && "bg-accent"
              )}
            >
              <td className="px-4 py-3">
                <p className="text-sm font-medium">{client.name}</p>
                <p className="text-xs text-muted-foreground">{client.email}</p>
              </td>
              <td className="px-4 py-3 text-sm">{client.company}</td>
              <td className="px-4 py-3 text-sm">{client.industry}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                    statusColors[client.status as keyof typeof statusColors]
                  )}
                >
                  {client.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create ClientForm component**

Create `client/src/components/clients/ClientForm.tsx`:
```tsx
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useClientStore } from "@/stores/client-store";

const industries = [
  "Hospitality",
  "Real Estate",
  "Healthcare",
  "Insurance",
  "Retail",
  "Technology",
  "Finance",
  "Education",
  "Other",
];

export function ClientForm() {
  const { editingClient, createClient, updateClient, closeForm } =
    useClientStore();

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "Hospitality",
    status: "lead" as const,
    notes: "",
  });

  useEffect(() => {
    if (editingClient) {
      setForm({
        name: editingClient.name,
        company: editingClient.company,
        email: editingClient.email,
        phone: editingClient.phone,
        industry: editingClient.industry,
        status: editingClient.status,
        notes: editingClient.notes,
      });
    }
  }, [editingClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClient(editingClient.id, form);
    } else {
      createClient(form);
    }
  };

  const inputClass =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {editingClient ? "Edit Client" : "Add New Client"}
          </h3>
          <button onClick={closeForm} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Company</label>
              <input
                className={inputClass}
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Phone</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Industry</label>
              <select
                className={inputClass}
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
              >
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as any })
                }
              >
                <option value="lead">Lead</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="churned">Churned</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              className={inputClass + " h-20 resize-none"}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              {editingClient ? "Update" : "Add Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ClientDetail component**

Create `client/src/components/clients/ClientDetail.tsx`:
```tsx
import { Mail, Phone, Building2, Tag, Pencil, Trash2 } from "lucide-react";
import { useClientStore } from "@/stores/client-store";

export function ClientDetail() {
  const { selectedClient, openForm, deleteClient, selectClient } =
    useClientStore();

  if (!selectedClient) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
        <p className="text-sm text-muted-foreground">
          Select a client to view details
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{selectedClient.name}</h3>
          <p className="text-sm text-muted-foreground">
            {selectedClient.company}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openForm(selectedClient)}
            className="rounded-lg border p-2 hover:bg-accent"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this client?")) {
                deleteClient(selectedClient.id);
              }
            }}
            className="rounded-lg border p-2 text-destructive hover:bg-destructive/10"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-3 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{selectedClient.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{selectedClient.phone || "No phone"}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span>{selectedClient.industry}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <span className="capitalize">{selectedClient.status}</span>
        </div>
      </div>

      {selectedClient.notes && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-medium">Notes</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {selectedClient.notes}
          </p>
        </div>
      )}

      <div className="mt-6 text-xs text-muted-foreground">
        Added {new Date(selectedClient.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create ClientsPage**

Create `client/src/pages/ClientsPage.tsx`:
```tsx
import { UserPlus } from "lucide-react";
import { ClientTable } from "@/components/clients/ClientTable";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { useClientStore } from "@/stores/client-store";

export function ClientsPage() {
  const { showForm, openForm } = useClientStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client directory and pipeline
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <UserPlus className="h-4 w-4" />
          Add Client
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ClientTable />
        </div>
        <ClientDetail />
      </div>

      {showForm && <ClientForm />}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add client/src/stores/client-store.ts client/src/components/clients/ client/src/pages/ClientsPage.tsx
git commit -m "feat: add clients page with table, detail view, and CRUD form"
```

---

## Task 9: Services Catalog Page — Frontend

**Files:**
- Create: `client/src/components/services/ServiceCard.tsx`
- Create: `client/src/components/services/ServiceCatalog.tsx`
- Create: `client/src/pages/ServicesPage.tsx`

- [ ] **Step 1: Create ServiceCard component**

Create `client/src/components/services/ServiceCard.tsx`:
```tsx
import { cn } from "@/lib/utils";

const tierColors = {
  entry: "bg-green-100 text-green-700",
  core: "bg-blue-100 text-blue-700",
  "high-ticket": "bg-purple-100 text-purple-700",
  scalable: "bg-orange-100 text-orange-700",
};

interface ServiceCardProps {
  name: string;
  category: string;
  subcategory: string;
  description: string;
  tier: string;
  tags: string[];
}

export function ServiceCard({
  name,
  subcategory,
  description,
  tier,
  tags,
}: ServiceCardProps) {
  return (
    <div className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase">
            {subcategory}
          </p>
          <h3 className="mt-1 font-semibold">{name}</h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
            tierColors[tier as keyof typeof tierColors]
          )}
        >
          {tier}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {description}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ServiceCatalog component**

Create `client/src/components/services/ServiceCatalog.tsx`:
```tsx
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ServiceCard } from "./ServiceCard";
import { cn } from "@/lib/utils";

export function ServiceCatalog() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getServices().then(setServices);
    api.getCategories().then(setCategories);
  }, []);

  const filtered = services.filter((s) => {
    const matchesCategory =
      activeCategory === "all" || s.category === activeCategory;
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t: string) =>
        t.toLowerCase().includes(search.toLowerCase())
      );
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-lg border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((service) => (
          <ServiceCard key={service.id} {...service} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex h-32 items-center justify-center rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground">
            No services match your search
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ServicesPage**

Create `client/src/pages/ServicesPage.tsx`:
```tsx
import { ServiceCatalog } from "@/components/services/ServiceCatalog";

export function ServicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Service Catalog</h2>
        <p className="text-muted-foreground">
          Browse Innovaco's complete digital transformation offer stack
        </p>
      </div>
      <ServiceCatalog />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/services/ client/src/pages/ServicesPage.tsx
git commit -m "feat: add services catalog page with filtering and search"
```

---

## Task 10: Integration Testing + Final Verification

**Files:**
- Modify: `package.json` (no changes, just verify scripts)

- [ ] **Step 1: Install all dependencies**

```bash
npm install
```

- [ ] **Step 2: Seed the database**

```bash
cd server && npm run seed
```

Expected: "Seed complete!" with no errors.

- [ ] **Step 3: Start the full dev environment**

```bash
npm run dev
```

Expected: Both client (port 5173) and server (port 3001) start without errors.

- [ ] **Step 4: Test API endpoints**

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/clients
curl http://localhost:3001/api/services
curl http://localhost:3001/api/agents/types
```

Expected: All return valid JSON responses.

- [ ] **Step 5: Test client creation via API**

```bash
curl -X POST http://localhost:3001/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","company":"Test Corp","email":"test@test.com","phone":"+357 99 999999","industry":"Technology","status":"lead","notes":"API test"}'
```

Expected: Returns 201 with the created client object.

- [ ] **Step 6: Test agent chat (mock mode without API key)**

```bash
curl -X POST http://localhost:3001/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Write a proposal for a restaurant chatbot","agentType":"proposal"}'
```

Expected: Returns a mock proposal response with conversationId.

- [ ] **Step 7: Verify frontend loads in browser**

Open `http://localhost:5173` in a browser.

Expected:
- Sidebar with navigation (Dashboard, AI Agents, Clients, Services)
- Dashboard shows metrics cards, activity feed, quick actions
- AI Agents page shows 4 agent types and chat interface
- Clients page shows seeded clients in a table
- Services page shows all 40+ Innovaco services with category filters

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: Innovaco Command Center Phase 1 complete - dashboard, AI agents, clients, services"
```

---

## Future Phases (Not in this plan)

**Phase 2: Client Management CRM + Project Tracker**
- Full CRM with pipeline stages, deal tracking, activity logging
- Project management with Kanban boards and Gantt charts
- Client communication history and document storage

**Phase 3: Automation Hub + Workflow Builder**
- Visual workflow builder (drag-and-drop)
- Zapier/Make integration management
- Scheduled automation tasks and triggers

**Phase 4: Service Delivery Templates**
- Pre-configured service delivery workflows
- Industry pack deployment wizards
- Client onboarding automation flows

**Phase 5: SaaS Products Integration**
- AI.cy platform management dashboard
- Chili ordering system admin
- Schedex employee management portal
- Cross-product analytics and reporting
