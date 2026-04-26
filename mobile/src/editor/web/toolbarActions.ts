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
