import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Placeholder — Module 1 ships no queries. Module 2 replaces/extends this.
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
