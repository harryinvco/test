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
