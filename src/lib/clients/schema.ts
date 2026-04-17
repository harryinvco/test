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
