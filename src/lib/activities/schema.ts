import { z } from "zod";
import { ACTIVITY_TYPE } from "@/lib/enums";

export const ActivityCreate = z.object({
  lead_id: z.string().min(1),
  type: z.enum(ACTIVITY_TYPE),
  body: z.string().min(1).max(10_000),
  occurred_at_ms: z.number().int().positive(),
});

export type ActivityCreateInput = z.infer<typeof ActivityCreate>;
