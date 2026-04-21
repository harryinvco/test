import { z } from "zod";
import { INVOICE_STATUS } from "@/lib/enums";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD");

export const InvoiceItemCreate = z.object({
  description: z.string().min(1).max(300),
  quantity: z.number().positive(),
  unit_price_cents: z.number().int().nonnegative(),
});

export const InvoiceCreate = z.object({
  client_id: z.string().min(1).nullish(),
  number: z.string().min(1).max(40).optional(),
  issue_date: isoDate,
  due_date: isoDate,
  notes: z.string().max(2000).nullish(),
  tax_cents: z.number().int().nonnegative().optional().default(0),
  items: z.array(InvoiceItemCreate).min(1, "at least one line item"),
});

export const InvoiceUpdate = z.object({
  client_id: z.string().min(1).nullish(),
  number: z.string().min(1).max(40).optional(),
  issue_date: isoDate.optional(),
  due_date: isoDate.optional(),
  notes: z.string().max(2000).nullish(),
  tax_cents: z.number().int().nonnegative().optional(),
  items: z.array(InvoiceItemCreate).min(1).optional(),
});

export const InvoiceStatusTransition = z.enum(INVOICE_STATUS);

export type InvoiceItemCreateInput = z.infer<typeof InvoiceItemCreate>;
export type InvoiceCreateInput = z.infer<typeof InvoiceCreate>;
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdate>;
