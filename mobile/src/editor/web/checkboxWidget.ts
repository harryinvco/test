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
