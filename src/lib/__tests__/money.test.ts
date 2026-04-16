import { describe, it, expect } from "vitest";
import { formatEuros, eurosToCents, centsToEuros } from "@/lib/money";

describe("money", () => {
  it("formatEuros formats cents as EUR", () => {
    expect(formatEuros(125000)).toBe("€1,250.00");
    expect(formatEuros(0)).toBe("€0.00");
  });
  it("formatEuros returns em-dash on null/undefined", () => {
    expect(formatEuros(null)).toBe("—");
    expect(formatEuros(undefined)).toBe("—");
  });
  it("eurosToCents converts decimal euros", () => {
    expect(eurosToCents("1250")).toBe(125000);
    expect(eurosToCents("1250.50")).toBe(125050);
    expect(eurosToCents("")).toBeNull();
  });
  it("centsToEuros formats for input fields", () => {
    expect(centsToEuros(125050)).toBe("1250.50");
    expect(centsToEuros(null)).toBe("");
  });
});
