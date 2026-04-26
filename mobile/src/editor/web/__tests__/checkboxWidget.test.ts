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
