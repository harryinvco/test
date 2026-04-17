import { describe, it, expect } from "vitest";
import { LeadCreate, LeadUpdate } from "@/lib/leads/schema";

const valid = {
  name: "Harry",
  company: "Innovaco",
  email: "harry@innovaco.cy",
  phone: "+357 99 000000",
  industry: "hospitality" as const,
  source: "referral" as const,
  stage: "new" as const,
  estimated_value_cents: 500000,
  follow_up_date: "2026-05-01",
};

describe("LeadCreate", () => {
  it("accepts valid input", () => {
    expect(LeadCreate.parse(valid)).toMatchObject({ name: "Harry", email: "harry@innovaco.cy" });
  });
  it("rejects empty name", () => {
    expect(() => LeadCreate.parse({ ...valid, name: "" })).toThrow();
  });
  it("rejects invalid email", () => {
    expect(() => LeadCreate.parse({ ...valid, email: "nope" })).toThrow();
  });
  it("rejects invalid industry", () => {
    expect(() => LeadCreate.parse({ ...valid, industry: "aerospace" })).toThrow();
  });
  it("rejects invalid stage", () => {
    expect(() => LeadCreate.parse({ ...valid, stage: "somewhere" })).toThrow();
  });
  it("accepts nullish company/phone/estimated_value/follow_up", () => {
    const minimal = {
      name: "Harry",
      email: "h@i.co",
      industry: "retail" as const,
      source: "inbound" as const,
      stage: "new" as const,
    };
    expect(() => LeadCreate.parse(minimal)).not.toThrow();
  });
  it("rejects negative estimated_value_cents", () => {
    expect(() => LeadCreate.parse({ ...valid, estimated_value_cents: -1 })).toThrow();
  });
  it("rejects malformed follow_up_date", () => {
    expect(() => LeadCreate.parse({ ...valid, follow_up_date: "next week" })).toThrow();
  });
});

describe("LeadUpdate", () => {
  it("accepts a partial update", () => {
    expect(LeadUpdate.parse({ stage: "won" })).toEqual({ stage: "won" });
  });
});
