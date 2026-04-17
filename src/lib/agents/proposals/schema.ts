import { z } from "zod";

export const DraftInput = z.object({
  leadId: z.string().min(1),
  scopeBrief: z.string().min(1).max(2000),
});

export const ReviseInput = z.object({
  instruction: z.string().min(1).max(1000),
});

export type DraftInputT = z.infer<typeof DraftInput>;
export type ReviseInputT = z.infer<typeof ReviseInput>;
