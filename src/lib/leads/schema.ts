import { z } from "zod";
import { INDUSTRY, SOURCE, LEAD_STAGE } from "@/lib/enums";

export const LeadCreate = z.object({
  name: z.string().min(1).max(120),
  company: z.string().max(120).nullish(),
  email: z.string().email(),
  phone: z.string().max(40).nullish(),
  industry: z.enum(INDUSTRY),
  source: z.enum(SOURCE),
  stage: z.enum(LEAD_STAGE).default("new"),
  estimated_value_cents: z.number().int().nonnegative().nullish(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

export const LeadUpdate = LeadCreate.partial();

export type LeadCreateInput = z.infer<typeof LeadCreate>;
export type LeadUpdateInput = z.infer<typeof LeadUpdate>;
