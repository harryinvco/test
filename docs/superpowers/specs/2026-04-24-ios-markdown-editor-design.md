# iOS Markdown Editor — Design

**Date:** 2026-04-24
**Status:** Approved (design)
**Scope:** `mobile/` app, note editor screen
**Related:** Separate spec will cover navigation polish (day-switching / tab UX)

## Goal

Replace the current plain `<TextInput>` note editor with an inline-rendering Markdown editor that:

1. Shows rendered formatting (headings, bold/italic, links, checkboxes) as you type.
2. Makes `[ ]` / `[x]` tappable checkboxes that toggle in place.
3. Provides a 6-button formatting toolbar above the keyboard.
4. Renders historical (read-only) notes with the same formatting, inert.

All without breaking the shared Markdown storage format used by the web app.

## Non-goals

- Navigation polish (home/tabs/day-switching) — tracked as a separate spec.
- Image/attachment uploads (Markdown syntax still works, but no upload flow).
- Multi-level list indentation via toolbar (flat `- ` only; nesting via manual typing).
- Table editing UI.
- Replacing the web's textarea-based editor.
- Changes to the sync protocol or server.

## Constraints

- **Shared content format**: Notes are a single string column. The web renders with `react-markdown` + `remark-gfm`. Any new editor must round-trip clean GFM Markdown.
- **Offline-first**: Editor must work with no network (same as today).
- **No native rich-text in RN**: RN has no native rich-text primitive; a WebView-hosted editor is the pragmatic path.

## Approach

**CodeMirror 6 in a WebView, live-preview mode.**

A tiny WebView hosts CodeMirror 6 with `@codemirror/lang-markdown`, GFM, and a live-preview extension. Headings render larger/bolder, `**bold**` renders bold, `[ ]` becomes a tappable widget — *but* on the line the cursor sits on, raw syntax reappears so editing stays direct.

Storage stays plain Markdown. The WebView is an implementation detail hidden behind a `<MarkdownEditor>` RN component with the same surface area as the current `<TextInput>`.

### Rejected alternatives

- **Lexical / Milkdown WYSIWYG**: prettier (no visible syntax) but state is a rich tree, bigger bundle (~500KB+), trickier selection/keyboard handling. Not worth the cost given checkboxes are the headline feature.
- **Custom native overlay**: layer styled text over a transparent TextInput. Can't truly hide markers or draw inline widgets; checkbox tap targets on wrapping text are fragile. High effort, low ceiling.

## Architecture

### Files

```
mobile/
├── assets/editor/
│   ├── index.html                # generated, committed
│   └── editor.js                 # generated, committed
├── scripts/
│   └── build-editor.mjs          # dev tool, runs esbuild on src/editor/web/
└── src/editor/
    ├── MarkdownEditor.tsx        # RN wrapper component
    ├── Toolbar.tsx               # 6-button keyboard accessory
    ├── bridge.ts                 # typed message schemas (Zod)
    └── web/
        ├── main.ts               # bundle entry — CM config, widgets, bridge
        ├── livePreview.ts        # live-preview extension
        ├── checkboxWidget.ts     # tappable checkbox widget
        ├── toolbarActions.ts     # insertMarkdown handlers
        └── __tests__/            # Vitest, no WebView needed
```

### Modified files

- `mobile/app/(app)/note/[noteId].tsx` — swaps `<TextInput>` for `<MarkdownEditor>`. Autosave, title derivation, read-only logic remain unchanged.
- `mobile/package.json` — adds `codemirror`, `@codemirror/lang-markdown`, `@codemirror/view`, `@codemirror/state`, `@lezer/markdown`, `esbuild` (dev).

### Editor bundle

Built once at dev time by `mobile/scripts/build-editor.mjs`, producing `mobile/assets/editor/{index.html, editor.js}`, checked into git so runtime has no build step.

The bundle includes:

- CodeMirror 6 core (state + view)
- `@codemirror/lang-markdown` with GFM extensions
- **Live-preview extension**: decorations driven by the Markdown parse tree — hides syntax markers when the cursor is off the line, shows them when the cursor is on the line. Standard CM6 pattern.
- **Checkbox widget**: custom `WidgetType` replacing `- [ ]` / `- [x]` with an HTML span styled as a checkbox; click dispatches a transaction toggling the underlying text. Suppressed when cursor is on the same line.
- `EditorState.readOnly.of(readOnly)` bound from the `readOnly` prop.
- Minimal theme driven by colors from the RN side via the `init` message.

Size target: <300KB gzipped. Measured in the plan.

### Bridge protocol

`postMessage` both ways; messages are Zod-validated at both ends.

**Host → WebView** (via `webviewRef.current.injectJavaScript`):

| Message | Payload | When |
|---|---|---|
| `init` | `{ content, readOnly, theme }` | Once on mount, after `ready` |
| `setContent` | `{ content }` | When the note id changes (navigation) |
| `insertMarkdown` | `{ kind: "checkbox" \| "bullet" \| "heading" \| "bold" \| "italic" \| "link" }` | Toolbar taps |
| `setReadOnly` | `{ readOnly }` | Read-only state change |

**WebView → Host** (via `window.ReactNativeWebView.postMessage`):

| Message | Payload | When |
|---|---|---|
| `ready` | `{}` | After CM mounts; host queues `init` until this arrives |
| `change` | `{ content }` | On every CM doc change, debounced 100ms inside the WebView |
| `log` | `{ level, msg }` | Debug pipe; Metro prints it |

The wrapper is the source of truth for `content` at the RN layer *only* across note-id changes. Within a single note session the WebView owns cursor/selection; the host never pushes content back.

### Toolbar

Pinned above the keyboard via existing `KeyboardAvoidingView`. 44pt high, hidden when `readOnly = true`. Six icon buttons (~50pt targets, no horizontal scroll):

| Icon | Action |
|---|---|
| ☑ | Inserts `- [ ] ` at the start of the current line if the line is empty, otherwise inserts a new line below with `- [ ] ` and moves the cursor there |
| ⋮ list | Inserts `- ` at the start of the current line (same rule as checkbox for non-empty lines) |
| H | If the current line has no heading marker, prepends `# ` (H1). If it already starts with `#…`, cycles: H1 → H2 → H3 → (no heading) → H1. |
| **B** | Wraps selection (or `bold` placeholder) in `**…**` |
| *I* | Wraps selection (or `italic` placeholder) in `*…*` |
| 🔗 | Wraps selection in `[text](url)`; cursor lands inside `url` |

Each tap posts `insertMarkdown` to the WebView. CodeMirror handles line-start detection, selection wrapping, and cursor placement in the transaction handlers.

### Read-only mode

Historical notes (`note.date !== today`) pass `readOnly = true`:

- Editor renders fully (Markdown + widgets visible).
- `EditorState.readOnly` blocks any text mutation.
- Checkbox widgets render but click handler is a no-op.
- Toolbar is not mounted.

## Data flow & integration

```
user taps "B" in toolbar
  → Toolbar posts insertMarkdown { kind: "bold" } → WebView
  → CM transaction wraps selection in **...**
  → CM emits docChanged
  → WebView posts change { content } → RN
  → onChange(content) → scheduleSave (600ms debounce)
  → updateLocalNote → emitDirtyChange
  → SyncProvider debounced sync (2.5s)
  → server push → cleared dirty
```

Checkbox tap follows the exact same path — it's a text mutation as far as CM is concerned. No special wiring.

**Title derivation**: `deriveTitle()` already strips Markdown prefixes, keeps working unchanged.

## Error handling

- **Bundle fails to load**: WebView `onError` → render fallback `<TextInput>` with the raw content so editing still works. Log error.
- **`ready` never arrives after 3s**: same fallback.
- **Bridge message fails Zod validation**: drop it, log `level: "error"` via the `log` pipe, keep editor alive.
- **`init` arrives with `content: ""`**: explicitly handled as empty state (not undefined).

No retry loops. No user-facing error text for the happy path.

## Testing strategy

- **Editor bundle unit tests** (Vitest, `mobile/src/editor/web/__tests__/`): pure functions — `insertMarkdown` transaction builders, heading-cycle logic, checkbox-widget toggle logic. Take a CM `EditorState`, return a transaction. No WebView.
- **Bridge schema tests**: Zod parse round-trips for every message type.
- **RN wrapper**: manual smoke. Adding WebView + simulator integration testing is out of scope.

**Manual smoke checklist** (to include in the implementation plan):

1. Open today's note, type text — saves, syncs, title updates.
2. Tap each toolbar button — correct Markdown inserted, cursor placed sensibly.
3. Tap a rendered checkbox — toggles `[ ]` ↔ `[x]`, syncs.
4. Move cursor onto a line with a checkbox — raw `- [ ] ` reappears, edits work.
5. Navigate to a historical day — note renders, no toolbar, checkbox widgets inert.
6. Kill the app while mid-edit — on relaunch, last save is present.
7. Dark mode — editor theme matches, readable.
8. Offline — editor works, sync pill shows pending, syncs on reconnect.

## Build pipeline

`mobile/scripts/build-editor.mjs` uses esbuild:

```
esbuild src/editor/web/main.ts \
  --bundle --minify --format=iife \
  --outfile=assets/editor/editor.js
```

Plus a small Node script that emits `assets/editor/index.html` wrapping `editor.js`. Both outputs are committed.

A `pnpm mobile:build-editor` (or `npm run build-editor` inside `mobile/`) script triggers the rebuild. Not run at app-start; run manually when editor source changes, as part of the pre-commit flow for editor changes.

## Open questions

None blocking implementation.

## Future work (explicitly deferred)

- Image insertion + upload pipeline.
- Indented (nested) lists via toolbar.
- Tables.
- Porting this editor component to the web, retiring the textarea.
- WebView → native-module migration if a suitable RN rich-text primitive appears.
