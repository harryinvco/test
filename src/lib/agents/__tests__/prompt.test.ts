import { describe, it, expect } from "vitest";
import { buildProposalPrompt, buildRevisePrompt } from "@/lib/agents/prompt";
import type { Lead, Activity } from "@/db/schema";

const lead: Lead = {
  id: "l1", name: "Alice", company: "Acme", email: "a@acme.co", phone: null,
  industry: "hospitality", source: "inbound", stage: "won",
  estimatedValueCents: 500_000, followUpDate: null,
  convertedAt: null, convertedClientId: null,
  createdAt: 1_000_000, updatedAt: 1_000_000,
};
const activities: Activity[] = [
  { id: "a1", leadId: "l1", type: "call", body: "Discovery call. 3 locations.", occurredAt: 1_100_000, createdAt: 1_100_000 },
  { id: "a2", leadId: "l1", type: "note", body: "Wants a pilot.", occurredAt: 1_200_000, createdAt: 1_200_000 },
];

describe("buildProposalPrompt", () => {
  it("emits three cache_control system blocks (preamble, lead, activities)", () => {
    const p = buildProposalPrompt(lead, activities, "AI chatbot pilot, 3 months, €8k");
    expect(p.system).toHaveLength(3);
    for (const block of p.system) {
      expect(block.type).toBe("text");
      expect(block.cache_control).toEqual({ type: "ephemeral" });
    }
    // Preamble mentions Innovaco + output sections
    expect(p.system[0].text).toMatch(/Innovaco/);
    expect(p.system[0].text).toMatch(/Summary/);
    expect(p.system[0].text).toMatch(/Pricing/);
    // Lead block contains company and euro value
    expect(p.system[1].text).toMatch(/Acme/);
    expect(p.system[1].text).toMatch(/5000/); // 500_000 cents = €5,000
    // Activity block contains both activities chronologically
    expect(p.system[2].text).toMatch(/Discovery call/);
    expect(p.system[2].text).toMatch(/Wants a pilot/);
    expect(p.system[2].text.indexOf("Discovery")).toBeLessThan(p.system[2].text.indexOf("Wants a pilot"));
  });

  it("user message contains the scope brief verbatim", () => {
    const p = buildProposalPrompt(lead, [], "scope X");
    expect(p.messages).toEqual([{ role: "user", content: "scope X" }]);
  });
});

describe("buildRevisePrompt", () => {
  it("system blocks match the draft prompt shape", () => {
    const p = buildRevisePrompt(lead, activities, "previous draft body", "make it shorter");
    expect(p.system).toHaveLength(3);
  });

  it("user message embeds previous draft + instruction", () => {
    const p = buildRevisePrompt(lead, [], "PREV", "SHORTER");
    expect(p.messages).toHaveLength(1);
    expect(p.messages[0].content).toMatch(/PREV/);
    expect(p.messages[0].content).toMatch(/SHORTER/);
  });
});
