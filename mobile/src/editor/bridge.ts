import { z } from "zod";

export const ToolbarAction = z.enum([
  "checkbox",
  "bullet",
  "heading",
  "bold",
  "italic",
  "link",
]);
export type ToolbarAction = z.infer<typeof ToolbarAction>;

export const EditorTheme = z.object({
  bg: z.string(),
  fg: z.string(),
  accent: z.string(),
});
export type EditorTheme = z.infer<typeof EditorTheme>;

// Host (RN) → WebView
export const HostMessage = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("init"),
    content: z.string(),
    readOnly: z.boolean(),
    theme: EditorTheme,
  }),
  z.object({ kind: z.literal("setContent"), content: z.string() }),
  z.object({ kind: z.literal("setReadOnly"), readOnly: z.boolean() }),
  z.object({ kind: z.literal("insertMarkdown"), action: ToolbarAction }),
]);
export type HostMessage = z.infer<typeof HostMessage>;

// WebView → Host (RN)
export const WebMessage = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ready") }),
  z.object({ kind: z.literal("change"), content: z.string() }),
  z.object({
    kind: z.literal("log"),
    level: z.enum(["info", "warn", "error"]),
    msg: z.string(),
  }),
]);
export type WebMessage = z.infer<typeof WebMessage>;
