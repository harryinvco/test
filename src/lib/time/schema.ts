import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const TimeEntryCreate = z.object({
  date: isoDate,
  hours: z.number().positive().max(24),
  client_id: z.string().min(1).nullish(),
  description: z.string().min(1).max(500),
  billable: z.boolean().default(true),
});

export const TimeEntryUpdate = TimeEntryCreate.partial();

export type TimeEntryCreateInput = z.infer<typeof TimeEntryCreate>;
export type TimeEntryUpdateInput = z.infer<typeof TimeEntryUpdate>;
