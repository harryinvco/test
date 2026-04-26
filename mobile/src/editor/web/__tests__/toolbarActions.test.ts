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
