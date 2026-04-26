import { z } from "zod";

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const TabCreate = z.object({
  label: z.string().trim().min(1).max(60),
  date: IsoDate.optional(),
});

export const TabRename = z.object({
  label: z.string().trim().min(1).max(60),
});

export const TabReorder = z.object({
  date: IsoDate,
  orderedIds: z.array(z.string().uuid()).min(1),
});

export const NoteCreate = z.object({
  tabId: z.string().uuid(),
});

export const NoteUpdate = z.object({
  content: z.string().max(100_000),
});

export const NoteReorder = z.object({
  tabId: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1),
});

export type TabCreateInput = z.infer<typeof TabCreate>;
export type TabRenameInput = z.infer<typeof TabRename>;
export type TabReorderInput = z.infer<typeof TabReorder>;
export type NoteCreateInput = z.infer<typeof NoteCreate>;
export type NoteUpdateInput = z.infer<typeof NoteUpdate>;
export type NoteReorderInput = z.infer<typeof NoteReorder>;

export function deriveTitle(content: string): string {
  const line = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  const stripped = line.replace(/^#+\s*/, "").replace(/^[*_~`>\-]+\s*/, "").trim();
  return stripped.slice(0, 80);
}
