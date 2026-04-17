import { describe, it, expect } from "vitest";
import { INDUSTRY, SOURCE, LEAD_STAGE, CLIENT_STATUS, ACTIVITY_TYPE } from "@/lib/enums";

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
