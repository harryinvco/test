import { z } from "zod";
import { EXPENSE_CATEGORY } from "@/lib/enums";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const ExpenseCreate = z.object({
  date: isoDate,
  category: z.enum(EXPENSE_CATEGORY),
  amount_cents: z.number().int().nonnegative(),
  vendor: z.string().max(120).nullish(),
  client_id: z.string().min(1).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const ExpenseUpdate = ExpenseCreate.partial();

export type ExpenseCreateInput = z.infer<typeof ExpenseCreate>;
export type ExpenseUpdateInput = z.infer<typeof ExpenseUpdate>;
