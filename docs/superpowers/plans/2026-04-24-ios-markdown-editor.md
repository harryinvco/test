# iOS Markdown Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain `TextInput` note editor with an inline-rendering Markdown editor backed by CodeMirror 6 in a WebView — tappable checkboxes, 6-button toolbar, rendered read-only mode for historical notes.

**Architecture:** A tiny WebView hosts a pre-built CodeMirror 6 bundle (built via esbuild, checked into `mobile/assets/editor/`). A typed `postMessage` bridge carries content and toolbar events across RN ↔ WebView. A thin RN wrapper (`<MarkdownEditor>`) hides the WebView and plugs into the existing autosave/sync pipeline unchanged.

**Tech Stack:** CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-markdown`, `@codemirror/commands`), `@lezer/markdown`, `esbuild` (build-time), `react-native-webview` (runtime), `zod` (message schemas, already in `mobile/`), Vitest (test runner, new to `mobile/`).

**Reference spec:** `docs/superpowers/specs/2026-04-24-ios-markdown-editor-design.md`

**Branch:** `feature/notes-ios-app` (continue on the existing branch — no new worktree).

**Working directory convention:** every task assumes you're running commands from `mobile/` unless noted. Paths in "Files" blocks are relative to the repo root.

---

## Pre-reqs

- Node 20+
- The backend and mobile app already run (you've completed the initial setup in `mobile/README.md`).
- You are on the `feature/notes-ios-app` branch with a clean working tree (aside from this plan).

---

## Task 1: Install dependencies and set up Vitest in `mobile/`

CodeMirror ships as ESM modules we'll bundle with esbuild. They're **devDependencies** because only the build script needs them — Metro never bundles them. `react-native-webview` is a **dependency** because the RN app imports it at runtime. Vitest gets its own config inside `mobile/` since the repo-root Vitest only includes `src/**/*.test.ts`.

**Files:**
- Modify: `mobile/package.json`
- Create: `mobile/vitest.config.ts`

- [ ] **Step 1: Install runtime WebView dep**

From `mobile/`:
```sh
npx expo install react-native-webview
```
`expo install` picks the version compatible with Expo SDK 54.

- [ ] **Step 2: Install build-time + test deps**

```sh
npm install --save-dev \
  codemirror \
  @codemirror/state \
  @codemirror/view \
  @codemirror/lang-markdown \
  @codemirror/commands \
  @codemirror/language \
  @lezer/markdown \
  @lezer/common \
  esbuild \
  vitest
```

- [ ] **Step 3: Create `mobile/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add scripts to `mobile/package.json`**

Add to the `"scripts"` block:
```json
"test": "vitest run",
"test:watch": "vitest",
"build-editor": "node scripts/build-editor.mjs"
```

- [ ] **Step 5: Verify install and Vitest bootstraps**

```sh
npm test
```
Expected: exit code 0, message "No test files found" (no tests yet — that's fine).

- [ ] **Step 6: Commit**

```sh
git add mobile/package.json mobile/package-lock.json mobile/vitest.config.ts
git commit -m "mobile: add codemirror/esbuild/vitest/webview deps for editor"
```

---

## Task 2: Bridge message schemas (pure types, full TDD)

The bridge is the one piece of shared contract between RN and the WebView bundle. Defining it first lets every later task lean on typed messages.

**Files:**
- Create: `mobile/src/editor/bridge.ts`
- Create: `mobile/src/editor/__tests__/bridge.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// mobile/src/editor/__tests__/bridge.test.ts
import { describe, expect, test } from "vitest";
import { HostMessage, WebMessage } from "../bridge";

describe("HostMessage", () => {
  test("parses init", () => {
    const m = HostMessage.parse({
      kind: "init",
      content: "hello",
      readOnly: false,
      theme: { bg: "#fff", fg: "#000", accent: "#07f" },
    });
    expect(m.kind).toBe("init");
  });

  test("parses insertMarkdown for each kind", () => {
    for (const kind of ["checkbox", "bullet", "heading", "bold", "italic", "link"] as const) {
      const m = HostMessage.parse({ kind: "insertMarkdown", action: kind });
      expect(m.kind).toBe("insertMarkdown");
    }
  });

  test("rejects unknown kind", () => {
    expect(() => HostMessage.parse({ kind: "nope" })).toThrow();
  });
});

describe("WebMessage", () => {
  test("parses ready", () => {
    expect(WebMessage.parse({ kind: "ready" }).kind).toBe("ready");
  });

  test("parses change", () => {
    const m = WebMessage.parse({ kind: "change", content: "x" });
    expect(m.kind).toBe("change");
  });

  test("parses log", () => {
    const m = WebMessage.parse({ kind: "log", level: "info", msg: "hi" });
    expect(m.kind).toBe("log");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```sh
npm test
```
Expected: FAIL with "Cannot find module '../bridge'".

- [ ] **Step 3: Implement `mobile/src/editor/bridge.ts`**

```ts
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
```

- [ ] **Step 4: Run tests, verify pass**

```sh
npm test
```
Expected: all bridge tests PASS.

- [ ] **Step 5: Commit**

```sh
git add mobile/src/editor/bridge.ts mobile/src/editor/__tests__/bridge.test.ts
git commit -m "mobile(editor): bridge message schemas (host ↔ webview)"
```

---

## Task 3: Editor bundle build pipeline (no CodeMirror logic yet)

Shrink-wrap the build before writing editor code. This lets you iterate on `web/main.ts` and see real output immediately. The script writes to `mobile/assets/editor/`, which we will commit as build artifacts so runtime doesn't need a build step.

**Files:**
- Create: `mobile/scripts/build-editor.mjs`
- Create: `mobile/src/editor/web/main.ts` (stub)
- Create: `mobile/assets/editor/` (generated)
- Modify: `mobile/.gitignore` (if present — confirm we commit the artifacts)

- [ ] **Step 1: Create the stub `mobile/src/editor/web/main.ts`**

```ts
// Minimal stub so build-editor.mjs has something to bundle.
// Replaced in Task 4.
window.addEventListener("DOMContentLoaded", () => {
  document.body.innerHTML = "<pre>editor not yet wired</pre>";
});
```

- [ ] **Step 2: Create `mobile/scripts/build-editor.mjs`**

```js
// Builds the WebView editor bundle from mobile/src/editor/web/main.ts
// into mobile/assets/editor/{editor.js,index.html}. Commit the outputs.

import { build } from "esbuild";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "assets/editor");
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "src/editor/web/main.ts")],
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  outfile: resolve(outDir, "editor.js"),
  logLevel: "info",
});

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body { font: 16px -apple-system, system-ui, sans-serif; }
    #root, .cm-editor { height: 100%; }
    .cm-editor { outline: none; }
    .cm-scroller { padding: 12px 14px 160px; }
    /* Checkbox widget */
    .md-checkbox {
      display: inline-block; width: 1.1em; height: 1.1em;
      border: 1.5px solid currentColor; border-radius: 4px;
      vertical-align: -2px; margin-right: 6px;
      position: relative; cursor: pointer; user-select: none;
    }
    .md-checkbox[data-checked="true"]::after {
      content: ""; position: absolute;
      left: 20%; top: 5%; width: 40%; height: 70%;
      border: solid currentColor; border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="./editor.js"></script>
</body>
</html>`;
writeFileSync(resolve(outDir, "index.html"), html, "utf8");
console.log("wrote", resolve(outDir, "index.html"));
```

- [ ] **Step 3: Run the build**

```sh
npm run build-editor
```
Expected: esbuild logs `editor.js  X kb` and the script prints `wrote .../index.html`. Files `mobile/assets/editor/editor.js` and `mobile/assets/editor/index.html` exist.

- [ ] **Step 4: Commit scripts + generated assets**

```sh
git add mobile/scripts/build-editor.mjs mobile/src/editor/web/main.ts mobile/assets/editor/
git commit -m "mobile(editor): editor bundle build pipeline (esbuild)"
```

---

## Task 4: Bootstrap CodeMirror in the WebView (no live-preview, no widgets)

Replace the stub with a real CodeMirror instance that handles `init`/`setContent` and emits `change`. Round-trips plain text — you can't see any formatting yet.

**Files:**
- Modify: `mobile/src/editor/web/main.ts`

- [ ] **Step 1: Replace `mobile/src/editor/web/main.ts` with real bootstrap**

```ts
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";

// Runtime-minimal copies of the shared schemas. We keep them inline (not
// imported) so the WebView bundle has zero deps on RN code.
type ToolbarAction =
  | "checkbox" | "bullet" | "heading" | "bold" | "italic" | "link";
type HostMessage =
  | { kind: "init"; content: string; readOnly: boolean; theme: { bg: string; fg: string; accent: string } }
  | { kind: "setContent"; content: string }
  | { kind: "setReadOnly"; readOnly: boolean }
  | { kind: "insertMarkdown"; action: ToolbarAction };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (s: string) => void };
  }
}

function post(msg: unknown) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(msg));
}

const readOnlyCompartment = new Compartment();
const themeCompartment = new Compartment();

let view: EditorView | null = null;
let lastEmitted = "";
let changeTimer: ReturnType<typeof setTimeout> | null = null;

function emitChangeDebounced(content: string) {
  if (content === lastEmitted) return;
  if (changeTimer) clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
    lastEmitted = content;
    post({ kind: "change", content });
  }, 100);
}

function buildTheme(t: { bg: string; fg: string; accent: string }) {
  return EditorView.theme({
    "&": { color: t.fg, backgroundColor: t.bg, height: "100%" },
    ".cm-content": { caretColor: t.accent, fontSize: "17px", lineHeight: "1.5" },
    ".cm-cursor": { borderLeftColor: t.accent },
  });
}

function mount(initial: HostMessage & { kind: "init" }) {
  const state = EditorState.create({
    doc: initial.content,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      EditorView.lineWrapping,
      themeCompartment.of(buildTheme(initial.theme)),
      readOnlyCompartment.of(EditorState.readOnly.of(initial.readOnly)),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) emitChangeDebounced(u.state.doc.toString());
      }),
    ],
  });
  view = new EditorView({ state, parent: document.getElementById("root")! });
  lastEmitted = initial.content;
}

function handle(msg: HostMessage) {
  if (msg.kind === "init") {
    if (!view) mount(msg);
    return;
  }
  if (!view) return;
  if (msg.kind === "setContent") {
    const cur = view.state.doc.toString();
    if (cur === msg.content) return;
    view.dispatch({
      changes: { from: 0, to: cur.length, insert: msg.content },
    });
    lastEmitted = msg.content;
    return;
  }
  if (msg.kind === "setReadOnly") {
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(msg.readOnly)),
    });
    return;
  }
  if (msg.kind === "insertMarkdown") {
    // handled in Task 5
    return;
  }
}

document.addEventListener("message", (e: any) => {
  try {
    handle(JSON.parse(e.data));
  } catch (err) {
    post({ kind: "log", level: "error", msg: String(err) });
  }
});
window.addEventListener("message", (e: any) => {
  try {
    handle(JSON.parse(e.data));
  } catch (err) {
    post({ kind: "log", level: "error", msg: String(err) });
  }
});

post({ kind: "ready" });
```

Note: both `document` and `window` `"message"` listeners are attached because `react-native-webview` dispatches to different targets depending on platform — one of them will be the live one, the other is a no-op.

- [ ] **Step 2: Rebuild the bundle**

```sh
npm run build-editor
```
Expected: bundle builds. Check `mobile/assets/editor/editor.js` size — should be ~150–200KB (unminified would be much larger).

- [ ] **Step 3: Commit**

```sh
git add mobile/src/editor/web/main.ts mobile/assets/editor/editor.js
git commit -m "mobile(editor): bootstrap codemirror in webview bundle"
```

---

## Task 5: Toolbar action transaction builders (pure TDD)

The 6 toolbar actions are pure transforms: given an `EditorState`, produce a `TransactionSpec`. Test in Node without a real EditorView.

**Files:**
- Create: `mobile/src/editor/web/toolbarActions.ts`
- Create: `mobile/src/editor/web/__tests__/toolbarActions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// mobile/src/editor/web/__tests__/toolbarActions.test.ts
import { describe, expect, test } from "vitest";
import { EditorState } from "@codemirror/state";
import { buildToolbarTransaction } from "../toolbarActions";

function apply(doc: string, selFrom: number, selTo: number, action: Parameters<typeof buildToolbarTransaction>[1]) {
  const state = EditorState.create({ doc, selection: { anchor: selFrom, head: selTo } });
  const spec = buildToolbarTransaction(state, action);
  const next = state.update(spec).state;
  return next.doc.toString();
}

describe("buildToolbarTransaction", () => {
  test("checkbox on empty line prefixes `- [ ] `", () => {
    expect(apply("", 0, 0, "checkbox")).toBe("- [ ] ");
  });

  test("checkbox on non-empty line inserts a new line below with `- [ ] `", () => {
    expect(apply("hello", 5, 5, "checkbox")).toBe("hello\n- [ ] ");
  });

  test("bullet on empty line prefixes `- `", () => {
    expect(apply("", 0, 0, "bullet")).toBe("- ");
  });

  test("heading on line without heading prefixes `# `", () => {
    expect(apply("hello", 0, 0, "heading")).toBe("# hello");
  });

  test("heading cycles H1 → H2", () => {
    expect(apply("# hello", 0, 0, "heading")).toBe("## hello");
  });

  test("heading cycles H3 → no heading", () => {
    expect(apply("### hello", 0, 0, "heading")).toBe("hello");
  });

  test("bold wraps selection", () => {
    expect(apply("hello world", 6, 11, "bold")).toBe("hello **world**");
  });

  test("bold inserts placeholder when no selection", () => {
    expect(apply("", 0, 0, "bold")).toBe("**bold**");
  });

  test("italic wraps selection", () => {
    expect(apply("hello", 0, 5, "italic")).toBe("*hello*");
  });

  test("link wraps selection into [text](url)", () => {
    expect(apply("site", 0, 4, "link")).toBe("[site](url)");
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

```sh
npm test
```
Expected: FAIL with "Cannot find module '../toolbarActions'".

- [ ] **Step 3: Implement `mobile/src/editor/web/toolbarActions.ts`**

```ts
import { EditorState, type TransactionSpec } from "@codemirror/state";

export type ToolbarAction =
  | "checkbox" | "bullet" | "heading" | "bold" | "italic" | "link";

function lineAt(state: EditorState, pos: number) {
  return state.doc.lineAt(pos);
}

function prefixLine(state: EditorState, prefix: string): TransactionSpec {
  const pos = state.selection.main.head;
  const line = lineAt(state, pos);
  if (line.length === 0) {
    return {
      changes: { from: line.from, insert: prefix },
      selection: { anchor: line.from + prefix.length },
    };
  }
  // Non-empty line: insert a new line below with the prefix.
  return {
    changes: { from: line.to, insert: `\n${prefix}` },
    selection: { anchor: line.to + 1 + prefix.length },
  };
}

function headingCycle(state: EditorState): TransactionSpec {
  const pos = state.selection.main.head;
  const line = lineAt(state, pos);
  const text = line.text;
  const m = /^(#{1,3})\s/.exec(text);
  if (!m) {
    return {
      changes: { from: line.from, insert: "# " },
      selection: { anchor: pos + 2 },
    };
  }
  const level = m[1].length;
  if (level < 3) {
    return {
      changes: { from: line.from, to: line.from + level, insert: "#".repeat(level + 1) },
      selection: { anchor: pos + 1 },
    };
  }
  // H3 → remove heading entirely
  return {
    changes: { from: line.from, to: line.from + level + 1, insert: "" },
    selection: { anchor: Math.max(line.from, pos - (level + 1)) },
  };
}

function wrap(state: EditorState, open: string, close: string, placeholder: string): TransactionSpec {
  const sel = state.selection.main;
  if (sel.empty) {
    const insert = `${open}${placeholder}${close}`;
    return {
      changes: { from: sel.from, insert },
      selection: {
        anchor: sel.from + open.length,
        head: sel.from + open.length + placeholder.length,
      },
    };
  }
  const text = state.sliceDoc(sel.from, sel.to);
  return {
    changes: { from: sel.from, to: sel.to, insert: `${open}${text}${close}` },
    selection: {
      anchor: sel.from + open.length + text.length + close.length,
    },
  };
}

function linkWrap(state: EditorState): TransactionSpec {
  const sel = state.selection.main;
  if (sel.empty) {
    const insert = `[text](url)`;
    return {
      changes: { from: sel.from, insert },
      selection: { anchor: sel.from + 7, head: sel.from + 10 },
    };
  }
  const text = state.sliceDoc(sel.from, sel.to);
  const insert = `[${text}](url)`;
  return {
    changes: { from: sel.from, to: sel.to, insert },
    // place cursor on "url" so user can replace it
    selection: { anchor: sel.from + text.length + 3, head: sel.from + text.length + 6 },
  };
}

export function buildToolbarTransaction(
  state: EditorState,
  action: ToolbarAction,
): TransactionSpec {
  switch (action) {
    case "checkbox": return prefixLine(state, "- [ ] ");
    case "bullet": return prefixLine(state, "- ");
    case "heading": return headingCycle(state);
    case "bold": return wrap(state, "**", "**", "bold");
    case "italic": return wrap(state, "*", "*", "italic");
    case "link": return linkWrap(state);
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

```sh
npm test
```
Expected: all 10 `buildToolbarTransaction` tests PASS (plus the 6 bridge tests from Task 2 still passing).

- [ ] **Step 5: Wire toolbar actions into `main.ts`**

In `mobile/src/editor/web/main.ts`, replace the `if (msg.kind === "insertMarkdown")` block (currently a stub) with:

```ts
if (msg.kind === "insertMarkdown") {
  const spec = buildToolbarTransaction(view.state, msg.action);
  view.dispatch(spec);
  view.focus();
  return;
}
```

Add the import at the top:
```ts
import { buildToolbarTransaction } from "./toolbarActions";
```

- [ ] **Step 6: Rebuild bundle**

```sh
npm run build-editor
```

- [ ] **Step 7: Commit**

```sh
git add mobile/src/editor/web/toolbarActions.ts \
        mobile/src/editor/web/__tests__/toolbarActions.test.ts \
        mobile/src/editor/web/main.ts \
        mobile/assets/editor/editor.js
git commit -m "mobile(editor): toolbar action transaction builders"
```

---

## Task 6: Live-preview decorations

Decorations transform the visible doc without changing the underlying text. This task adds: bold/italic/code-span styling, heading styling, and hiding of markup characters **when the cursor is not on that line**.

**Files:**
- Create: `mobile/src/editor/web/livePreview.ts`
- Modify: `mobile/src/editor/web/main.ts`

- [ ] **Step 1: Create `mobile/src/editor/web/livePreview.ts`**

```ts
import { syntaxTree } from "@codemirror/language";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Range } from "@codemirror/state";

const hideMark = Decoration.mark({ class: "cm-md-hidden", attributes: { "aria-hidden": "true" } });
const boldMark = Decoration.mark({ class: "cm-md-bold" });
const italicMark = Decoration.mark({ class: "cm-md-italic" });
const codeMark = Decoration.mark({ class: "cm-md-code" });
const headingMark = (level: number) =>
  Decoration.line({ class: `cm-md-h cm-md-h${level}` });

export const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) {
        this.decorations = this.build(u.view);
      }
    }
    build(view: EditorView): DecorationSet {
      const builder: Range<Decoration>[] = [];
      const cursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
      const tree = syntaxTree(view.state);

      for (const { from, to } of view.visibleRanges) {
        tree.iterate({
          from,
          to,
          enter: (node) => {
            const name = node.name;
            const lineNumber = view.state.doc.lineAt(node.from).number;
            const onCursorLine = lineNumber === cursorLine;

            // Headings (ATXHeading1..6)
            const hMatch = /^ATXHeading(\d)$/.exec(name);
            if (hMatch) {
              const level = Math.min(3, parseInt(hMatch[1], 10));
              const line = view.state.doc.lineAt(node.from);
              builder.push(headingMark(level).range(line.from));
              if (!onCursorLine) {
                // hide the leading "# " marker
                const markEnd = node.from + level + 1; // e.g. "## "
                builder.push(hideMark.range(node.from, Math.min(markEnd, line.to)));
              }
              return;
            }

            if (name === "StrongEmphasis") {
              builder.push(boldMark.range(node.from, node.to));
              if (!onCursorLine) {
                builder.push(hideMark.range(node.from, node.from + 2));
                builder.push(hideMark.range(node.to - 2, node.to));
              }
            }
            if (name === "Emphasis") {
              builder.push(italicMark.range(node.from, node.to));
              if (!onCursorLine) {
                builder.push(hideMark.range(node.from, node.from + 1));
                builder.push(hideMark.range(node.to - 1, node.to));
              }
            }
            if (name === "InlineCode") {
              builder.push(codeMark.range(node.from, node.to));
              if (!onCursorLine) {
                builder.push(hideMark.range(node.from, node.from + 1));
                builder.push(hideMark.range(node.to - 1, node.to));
              }
            }
          },
        });
      }

      // Sort by from, then size (required by CodeMirror).
      builder.sort((a, b) => a.from - b.from || a.to - b.to);
      return Decoration.set(builder);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

export const livePreviewCss = EditorView.theme({
  ".cm-md-hidden": { display: "none" },
  ".cm-md-bold": { fontWeight: "700" },
  ".cm-md-italic": { fontStyle: "italic" },
  ".cm-md-code": { fontFamily: "ui-monospace, Menlo, monospace", backgroundColor: "rgba(128,128,128,0.12)", padding: "1px 4px", borderRadius: "3px" },
  ".cm-md-h": { fontWeight: "700" },
  ".cm-md-h1": { fontSize: "1.6em", lineHeight: "1.25" },
  ".cm-md-h2": { fontSize: "1.3em", lineHeight: "1.3" },
  ".cm-md-h3": { fontSize: "1.1em", lineHeight: "1.35" },
});
```

- [ ] **Step 2: Wire into `main.ts`**

In `mobile/src/editor/web/main.ts`, update the `EditorState.create` extensions list by adding `livePreview` and `livePreviewCss`:

```ts
import { livePreview, livePreviewCss } from "./livePreview";
```

and in `extensions: [...]`:
```ts
history(),
keymap.of([...defaultKeymap, ...historyKeymap]),
markdown(),
livePreview,
livePreviewCss,
EditorView.lineWrapping,
// ...
```

- [ ] **Step 3: Rebuild and sanity-check size**

```sh
npm run build-editor
ls -lh assets/editor/editor.js
```
Expected: bundle still builds. Size probably 180–240KB. (We'll smoke-test rendering in Task 11.)

- [ ] **Step 4: Commit**

```sh
git add mobile/src/editor/web/livePreview.ts \
        mobile/src/editor/web/main.ts \
        mobile/assets/editor/editor.js
git commit -m "mobile(editor): live-preview decorations (headings, bold, italic, code)"
```

---

## Task 7: Tappable checkbox widget

Replaces `- [ ]` / `- [x]` with a real clickable widget. Suppressed when the cursor is on that line so the raw syntax is editable.

**Files:**
- Create: `mobile/src/editor/web/checkboxWidget.ts`
- Create: `mobile/src/editor/web/__tests__/checkboxWidget.test.ts`
- Modify: `mobile/src/editor/web/main.ts`

- [ ] **Step 1: Write failing tests for the pure toggle helper**

```ts
// mobile/src/editor/web/__tests__/checkboxWidget.test.ts
import { describe, expect, test } from "vitest";
import { toggleCheckboxInLine } from "../checkboxWidget";

describe("toggleCheckboxInLine", () => {
  test("`- [ ] todo` → `- [x] todo`", () => {
    expect(toggleCheckboxInLine("- [ ] todo")).toEqual({
      next: "- [x] todo",
      markerFrom: 2,
      markerTo: 5,
    });
  });
  test("`- [x] todo` → `- [ ] todo`", () => {
    expect(toggleCheckboxInLine("- [x] todo")).toEqual({
      next: "- [ ] todo",
      markerFrom: 2,
      markerTo: 5,
    });
  });
  test("`- [X] todo` (capital) → `- [ ] todo`", () => {
    expect(toggleCheckboxInLine("- [X] todo")).toEqual({
      next: "- [ ] todo",
      markerFrom: 2,
      markerTo: 5,
    });
  });
  test("leading spaces preserved", () => {
    expect(toggleCheckboxInLine("  - [ ] indented")).toEqual({
      next: "  - [x] indented",
      markerFrom: 4,
      markerTo: 7,
    });
  });
  test("no checkbox returns null", () => {
    expect(toggleCheckboxInLine("just text")).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify fail**

```sh
npm test
```

- [ ] **Step 3: Implement `mobile/src/editor/web/checkboxWidget.ts`**

```ts
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { Range } from "@codemirror/state";

const CHECKBOX_RE = /^(\s*- )\[([ xX])\] /;

export function toggleCheckboxInLine(line: string): { next: string; markerFrom: number; markerTo: number } | null {
  const m = CHECKBOX_RE.exec(line);
  if (!m) return null;
  const prefix = m[1];
  const current = m[2];
  const nextChar = current === " " ? "x" : " ";
  const markerFrom = prefix.length;
  const markerTo = markerFrom + 3; // "[x]"
  const next = `${prefix}[${nextChar}]${line.slice(prefix.length + 3)}`;
  return { next, markerFrom, markerTo };
}

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly readOnly: boolean,
    readonly onToggle: () => void,
  ) {
    super();
  }
  eq(other: CheckboxWidget) {
    return other.checked === this.checked && other.readOnly === this.readOnly;
  }
  toDOM() {
    const el = document.createElement("span");
    el.className = "md-checkbox";
    el.dataset.checked = String(this.checked);
    el.setAttribute("role", "checkbox");
    el.setAttribute("aria-checked", String(this.checked));
    if (!this.readOnly) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onToggle();
      });
    }
    return el;
  }
  ignoreEvent() {
    // We want our own click handler to run; tell CodeMirror to ignore.
    return true;
  }
}

export function checkboxPlugin(getReadOnly: () => boolean) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = this.build(view);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.selectionSet || u.viewportChanged) {
          this.decorations = this.build(u.view);
        }
      }
      build(view: EditorView): DecorationSet {
        const ranges: Range<Decoration>[] = [];
        const cursorLineNo = view.state.doc.lineAt(view.state.selection.main.head).number;
        const readOnly = getReadOnly();

        for (const { from, to } of view.visibleRanges) {
          let pos = from;
          while (pos <= to) {
            const line = view.state.doc.lineAt(pos);
            pos = line.to + 1;
            if (line.number === cursorLineNo) continue; // show raw on active line
            const m = CHECKBOX_RE.exec(line.text);
            if (!m) continue;
            const checked = m[2].toLowerCase() === "x";
            const markerStart = line.from + m[1].length;
            const markerEnd = markerStart + 3;
            ranges.push(
              Decoration.replace({
                widget: new CheckboxWidget(checked, readOnly, () => {
                  const result = toggleCheckboxInLine(line.text);
                  if (!result) return;
                  view.dispatch({
                    changes: {
                      from: markerStart,
                      to: markerEnd,
                      insert: result.next.slice(result.markerFrom, result.markerTo),
                    },
                  });
                }),
              }).range(markerStart, markerEnd),
            );
          }
        }
        ranges.sort((a, b) => a.from - b.from);
        return Decoration.set(ranges);
      }
    },
    { decorations: (v) => v.decorations },
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

```sh
npm test
```

- [ ] **Step 5: Wire into `main.ts`**

In `mobile/src/editor/web/main.ts`:

Add import:
```ts
import { checkboxPlugin } from "./checkboxWidget";
```

Add a module-level mutable `readOnlyFlag`:
```ts
let readOnlyFlag = false;
```

In `mount(initial)`: set `readOnlyFlag = initial.readOnly;` before constructing the state.

In the `setReadOnly` handler: `readOnlyFlag = msg.readOnly;`.

In the `extensions: [...]` array, add:
```ts
checkboxPlugin(() => readOnlyFlag),
```

- [ ] **Step 6: Rebuild and commit**

```sh
npm run build-editor
git add mobile/src/editor/web/checkboxWidget.ts \
        mobile/src/editor/web/__tests__/checkboxWidget.test.ts \
        mobile/src/editor/web/main.ts \
        mobile/assets/editor/editor.js
git commit -m "mobile(editor): tappable checkbox widget"
```

---

## Task 8: RN `<MarkdownEditor>` wrapper component

Owns the WebView, implements the bridge, exposes a simple API.

**Files:**
- Create: `mobile/src/editor/MarkdownEditor.tsx`

- [ ] **Step 1: Create `mobile/src/editor/MarkdownEditor.tsx`**

Exposes an imperative `insertMarkdown(action)` handle so the parent's toolbar can drive the WebView without threading a callback through context.

```tsx
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { HostMessage, WebMessage, type EditorTheme, type ToolbarAction } from "./bridge";

export type MarkdownEditorHandle = {
  insertMarkdown: (action: ToolbarAction) => void;
};

type Props = {
  content: string;
  readOnly: boolean;
  theme: EditorTheme;
  onChange: (content: string) => void;
  onError?: (msg: string) => void;
};

const editorHtml = require("../../assets/editor/index.html");

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(function MarkdownEditor(
  { content, readOnly, theme, onChange, onError },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const lastSentContentRef = useRef<string | null>(null);

  const send = useCallback((msg: HostMessage) => {
    const js = `(function(){
      var payload = ${JSON.stringify(JSON.stringify(msg))};
      window.dispatchEvent(new MessageEvent('message', { data: payload }));
      document.dispatchEvent(new MessageEvent('message', { data: payload }));
    })(); true;`;
    webviewRef.current?.injectJavaScript(js);
  }, []);

  useImperativeHandle(ref, () => ({
    insertMarkdown: (action) => send({ kind: "insertMarkdown", action }),
  }), [send]);

  useEffect(() => {
    if (!ready) return;
    send({ kind: "init", content, readOnly, theme });
    lastSentContentRef.current = content;
  }, [ready, send]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    if (lastSentContentRef.current === content) return;
    send({ kind: "setContent", content });
    lastSentContentRef.current = content;
  }, [content, ready, send]);

  useEffect(() => {
    if (!ready) return;
    send({ kind: "setReadOnly", readOnly });
  }, [readOnly, ready, send]);

  const onMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = WebMessage.parse(JSON.parse(event.nativeEvent.data));
      if (msg.kind === "ready") setReady(true);
      else if (msg.kind === "change") {
        lastSentContentRef.current = msg.content;
        onChange(msg.content);
      } else if (msg.kind === "log") {
        // eslint-disable-next-line no-console
        console.log(`[editor:${msg.level}]`, msg.msg);
      }
    } catch {
      // swallow malformed
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={editorHtml}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        onMessage={onMessage}
        onError={(e) => onError?.(String(e.nativeEvent.description))}
        onHttpError={(e) => onError?.(`http ${e.nativeEvent.statusCode}`)}
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
```

- [ ] **Step 2: Type-check**

```sh
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```sh
git add mobile/src/editor/MarkdownEditor.tsx
git commit -m "mobile(editor): RN <MarkdownEditor> wrapper with webview bridge"
```

---

## Task 9: RN `<EditorToolbar>` component

Purely presentational. 6 buttons, hidden when `readOnly`.

**Files:**
- Create: `mobile/src/editor/Toolbar.tsx`

- [ ] **Step 1: Create `mobile/src/editor/Toolbar.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/ui/theme";
import type { ToolbarAction } from "./bridge";

type Props = {
  onAction: (action: ToolbarAction) => void;
};

type Button = {
  action: ToolbarAction;
  render: () => React.ReactNode;
  label: string;
};

const BUTTONS: Button[] = [
  { action: "checkbox", label: "Checkbox", render: () => <Ionicons name="checkbox-outline" size={22} color={theme.ink} /> },
  { action: "bullet",   label: "Bullet",   render: () => <Ionicons name="list" size={22} color={theme.ink} /> },
  { action: "heading",  label: "Heading",  render: () => <Text style={styles.textIcon}>H</Text> },
  { action: "bold",     label: "Bold",     render: () => <Text style={[styles.textIcon, styles.bold]}>B</Text> },
  { action: "italic",   label: "Italic",   render: () => <Text style={[styles.textIcon, styles.italic]}>I</Text> },
  { action: "link",     label: "Link",     render: () => <Ionicons name="link" size={20} color={theme.ink} /> },
];

export function EditorToolbar({ onAction }: Props) {
  return (
    <View style={styles.bar}>
      {BUTTONS.map((b) => (
        <Pressable
          key={b.action}
          accessibilityRole="button"
          accessibilityLabel={b.label}
          onPress={() => onAction(b.action)}
          hitSlop={8}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          {b.render()}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 44,
    backgroundColor: theme.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  btn: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    backgroundColor: theme.surfacePressed ?? "rgba(0,0,0,0.05)",
  },
  textIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.ink,
  },
  bold: { fontWeight: "900" },
  italic: { fontStyle: "italic" },
});
```

If `theme.surfacePressed` is not defined in `mobile/src/ui/theme.ts`, read that file and either add the token or replace the reference with a hard-coded fallback (use whatever pattern the rest of the UI uses).

- [ ] **Step 2: Type-check**

```sh
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```sh
git add mobile/src/editor/Toolbar.tsx
# plus mobile/src/ui/theme.ts if you added a token
git commit -m "mobile(editor): 6-button toolbar"
```

---

## Task 10: Swap `<TextInput>` for `<MarkdownEditor>` + toolbar

Plug the new pieces into `mobile/app/(app)/note/[noteId].tsx`, keeping the existing autosave/read-only/title logic intact.

**Files:**
- Modify: `mobile/app/(app)/note/[noteId].tsx`

- [ ] **Step 1: Read the current file** (so you don't lose existing behavior):

```sh
cat "mobile/app/(app)/note/[noteId].tsx"
```

- [ ] **Step 2: Replace the `TextInput` + surrounding layout with `<MarkdownEditor>` + `<EditorToolbar>`**

Exact change: inside the `return` of `NoteEditorScreen`, replace the `<TextInput ... />` element with the block below. Keep the surrounding `<KeyboardAvoidingView>`, `<SafeAreaView>`, and title row unchanged.

```tsx
import { useRef } from "react";
import { MarkdownEditor, type MarkdownEditorHandle } from "@/editor/MarkdownEditor";
import { EditorToolbar } from "@/editor/Toolbar";
import type { EditorTheme as BridgeTheme } from "@/editor/bridge";

// inside NoteEditorScreen, near top-level refs:
const editorRef = useRef<MarkdownEditorHandle>(null);

// Build the theme payload from the existing theme tokens.
const editorTheme: BridgeTheme = {
  bg: theme.bg,
  fg: theme.ink,
  accent: theme.accent ?? theme.ink,
};
```

Replace the `<TextInput ... />` element with:

```tsx
<MarkdownEditor
  ref={editorRef}
  content={draft}
  readOnly={readOnly}
  theme={editorTheme}
  onChange={handleChange}
/>
{!readOnly && (
  <EditorToolbar onAction={(a) => editorRef.current?.insertMarkdown(a)} />
)}
```

If `theme.accent` is not defined, pick a sensible fallback color already in `theme.ts` (read the file and use whatever the current focus/selection color is).

- [ ] **Step 3: Remove unused imports**

`TextInput` is no longer used; delete it from the `react-native` import list. Any styles referenced only by the old TextInput (`styles.editor`, `styles.editorReadOnly`) can be removed.

- [ ] **Step 4: Type-check**

```sh
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```sh
git add "mobile/app/(app)/note/[noteId].tsx"
git commit -m "mobile(editor): swap TextInput for MarkdownEditor + toolbar"
```

---

## Task 11: Manual smoke on simulator + device

No automated test infra for RN + WebView in this repo. This task is a scripted manual check.

- [ ] **Step 1: Start the backend + Metro**

From repo root, terminal A:
```sh
npm run dev
```
From `mobile/`, terminal B:
```sh
IP=$(ipconfig getifaddr en0) && EXPO_PUBLIC_API_BASE_URL=http://$IP:3000 npm start
```
(On a machine without `ipconfig`, substitute your LAN IP manually.)

- [ ] **Step 2: Open the app on a physical iPhone via Expo Go and log in**

- [ ] **Step 3: Run this smoke checklist**

Walk through each in order; if any fails, stop and debug.

- [ ] Open today's note → editor loads within 1s, cursor appears on tap.
- [ ] Type a paragraph → "Saved" indicator appears; Metro shows `POST /api/mobile/notes/sync 200`.
- [ ] Tap the **☑** toolbar button → a real checkbox widget renders on the line (or on a new line below if mid-paragraph).
- [ ] Tap a rendered checkbox → state toggles, and on next sync the title preview still shows correctly on the history screen.
- [ ] Move the cursor onto a checkbox line → raw `- [ ] ` appears; widget goes away. Move away → widget returns.
- [ ] Tap **H** three times on a line → text cycles through `# ` `## ` `### ` and back to no heading.
- [ ] Select a word and tap **B**; verify `**word**`. Same for **I** → `*word*`. Same for **🔗** → `[word](url)` with `url` selected.
- [ ] Navigate to a historical day's note via History → content renders with formatting, no toolbar, tapping a checkbox does nothing.
- [ ] Airplane mode → edits still work; sync pill shows "pending". Restore network → syncs clean.
- [ ] Dark mode → editor bg/fg flip correctly.

- [ ] **Step 4: Document any deviations**

If any smoke item fails, file a task into this plan as a follow-up and either fix before the PR or leave an open item noted in the PR description.

---

## Task 12: README update

- [ ] **Step 1: Update `mobile/README.md`**

Add a new section "Editor" after "How sync works":

```markdown
## Editor

Notes are edited in a CodeMirror 6 instance running inside a `react-native-webview`. Content is plain GFM Markdown — the same format the web app stores — so notes round-trip cleanly between devices.

**Building the editor bundle:** the WebView loads `assets/editor/index.html` + `editor.js`, which are generated from `src/editor/web/` by `scripts/build-editor.mjs`. Regenerate after any change in `src/editor/web/`:

```sh
npm run build-editor
```

The outputs are committed to git so fresh clones don't need a build step.

**Features:**
- Live-preview: headings, bold/italic, inline code render as you type; raw syntax reappears on the cursor line.
- Tappable checkboxes: `- [ ] todo` renders a tap-toggleable box.
- Toolbar above the keyboard: ☑ • ⋮ list • H (cycles H1→H2→H3) • **B** • *I* • 🔗
- Historical (non-today) notes render read-only with toolbar hidden and checkboxes inert.
```

- [ ] **Step 2: Commit**

```sh
git add mobile/README.md
git commit -m "docs(mobile): document editor + build-editor pipeline"
```

---

## Task 13: Open PR

- [ ] **Step 1: Push**

```sh
git push origin feature/notes-ios-app
```

- [ ] **Step 2: Open PR with a clear test plan**

```sh
gh pr create --title "iOS: inline-rendering markdown editor with checkboxes + toolbar" --body "$(cat <<'EOF'
## Summary
- CodeMirror 6 in a WebView replaces the plain TextInput.
- Live-preview decorations for headings, bold/italic, code.
- Tappable `- [ ]` / `- [x]` checkbox widgets (inert on historical notes).
- 6-button toolbar above the keyboard: checkbox, bullet, heading-cycle, bold, italic, link.
- Build pipeline (`npm run build-editor`) produces `assets/editor/{index.html, editor.js}`, checked in.

Content stays as plain GFM markdown — no sync-protocol changes.

## Test plan
- [ ] Fresh simulator: editor loads, typing saves, checkboxes render and toggle
- [ ] Historical day: renders formatted, no toolbar, checkbox inert
- [ ] Offline + resync works
- [ ] Dark mode renders correctly

Spec: docs/superpowers/specs/2026-04-24-ios-markdown-editor-design.md
Plan: docs/superpowers/plans/2026-04-24-ios-markdown-editor.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist (completed by plan author)

- [x] Spec §Goal → Tasks 4–11 (CM in WebView, widgets, toolbar, integration, smoke)
- [x] Spec §Non-goals not implemented → verified
- [x] Spec §Architecture files → mapped to tasks:
  - `assets/editor/` → Task 3
  - `scripts/build-editor.mjs` → Task 3
  - `src/editor/MarkdownEditor.tsx` → Task 8
  - `src/editor/bridge.ts` → Task 2
  - `src/editor/Toolbar.tsx` → Task 9
  - `src/editor/web/main.ts` → Tasks 4 + 5 + 6 + 7
  - `src/editor/web/livePreview.ts` → Task 6
  - `src/editor/web/checkboxWidget.ts` → Task 7
  - `src/editor/web/toolbarActions.ts` → Task 5
  - Tests in `__tests__/` → Tasks 2, 5, 7
  - `app/(app)/note/[noteId].tsx` modification → Task 10
- [x] Spec §Bridge protocol → Tasks 2 + 4 (ready, change, log) + 8 (host-side handling)
- [x] Spec §Toolbar → Tasks 5 (actions) + 9 (component) + 10 (wired)
- [x] Spec §Read-only mode → Tasks 4 (state readOnly), 7 (widget inert), 9/10 (toolbar hidden)
- [x] Spec §Error handling → Task 8 (`onError`, `onHttpError`, `catch` in parse). Ready-timeout fallback explicitly deferred — call it out in the PR if you want it done; otherwise fine as follow-up.
- [x] Spec §Testing strategy → Tasks 2, 5, 7 (unit); Task 11 (manual smoke).
- [x] Spec §Build pipeline → Task 3.
- [x] No placeholders, all code blocks complete, all file paths exact.

## Known Deferred Items (caller's judgment)

- **Ready-timeout fallback to TextInput** — spec §Error handling calls for a 3s timeout → fallback. Not in the plan because it adds complexity before we know WebView init is actually flaky on a real device. Add if smoke (Task 11) reveals slow cold-mounts.
- **Bundle size measurement target (<300KB gz)** — Task 6 records the size but doesn't gate on it. If the bundle is >300KB gzipped after Task 7, pause and discuss — likely culprit is `@lezer/markdown` + GFM parsers.
