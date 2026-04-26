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
