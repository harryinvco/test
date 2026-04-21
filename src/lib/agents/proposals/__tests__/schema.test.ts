import { describe, it, expect } from "vitest";
import { DraftInput, ReviseInput } from "@/lib/agents/proposals/schema";

describe("DraftInput", () => {
  it("requires leadId and non-empty scopeBrief", () => {
    expect(DraftInput.safeParse({ leadId: "l1", scopeBrief: "x" }).success).toBe(true);
    expect(DraftInput.safeParse({ leadId: "l1", scopeBrief: "" }).success).toBe(false);
    expect(DraftInput.safeParse({ leadId: "", scopeBrief: "x" }).success).toBe(false);
    expect(DraftInput.safeParse({ leadId: "l1" }).success).toBe(false);
  });

  it("caps scopeBrief at 2000 chars", () => {
    expect(DraftInput.safeParse({ leadId: "l1", scopeBrief: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("ReviseInput", () => {
  it("requires non-empty instruction", () => {
    expect(ReviseInput.safeParse({ instruction: "shorter" }).success).toBe(true);
    expect(ReviseInput.safeParse({ instruction: "" }).success).toBe(false);
  });

  it("caps instruction at 1000 chars", () => {
    expect(ReviseInput.safeParse({ instruction: "x".repeat(1001) }).success).toBe(false);
  });
});
