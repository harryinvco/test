import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { buildToolbarTransaction } from "./toolbarActions";

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
    const spec = buildToolbarTransaction(view.state, msg.action);
    view.dispatch(spec);
    view.focus();
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
