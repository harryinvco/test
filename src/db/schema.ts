import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core";
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
