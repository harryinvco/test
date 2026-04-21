import { describe, it, expect } from "vitest";
import { INDUSTRY, SOURCE, LEAD_STAGE, CLIENT_STATUS, ACTIVITY_TYPE, AGENT_TYPE, AGENT_STATUS, PROPOSAL_STATUS } from "@/lib/enums";

describe("enums", () => {
  it("INDUSTRY includes all 5 verticals + other", () => {
    expect(INDUSTRY).toEqual(["hospitality", "real_estate", "insurance", "healthcare", "retail", "other"]);
  });
  it("SOURCE has 5 values", () => {
    expect(SOURCE).toEqual(["referral", "inbound", "outbound", "event", "other"]);
  });
  it("LEAD_STAGE has the 6 pipeline stages (incl. lost)", () => {
    expect(LEAD_STAGE).toEqual(["new", "contacted", "qualified", "proposal_sent", "won", "lost"]);
  });
  it("CLIENT_STATUS has 3 states", () => {
    expect(CLIENT_STATUS).toEqual(["active", "paused", "churned"]);
  });
  it("ACTIVITY_TYPE has 4 kinds", () => {
    expect(ACTIVITY_TYPE).toEqual(["call", "email", "meeting", "note"]);
  });
});

describe("agent enums", () => {
  it("AGENT_TYPE covers Module 3 v1 types", () => {
    expect(AGENT_TYPE).toEqual(["proposal_draft", "proposal_revise"]);
  });
  it("AGENT_STATUS covers the 4 terminal-ish states", () => {
    expect(AGENT_STATUS).toEqual(["streaming", "completed", "failed", "cancelled"]);
  });
  it("PROPOSAL_STATUS has only 'draft' in v1", () => {
    expect(PROPOSAL_STATUS).toEqual(["draft"]);
  });
});
