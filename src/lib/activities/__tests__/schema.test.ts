import { describe, it, expect } from "vitest";
import { ActivityCreate } from "@/lib/activities/schema";

const valid = {
  lead_id: "l1",
  type: "call" as const,
  body: "rang",
  occurred_at_ms: 1700000000000,
};

describe("ActivityCreate", () => {
  it("accepts valid", () => expect(() => ActivityCreate.parse(valid)).not.toThrow());
  it("rejects empty body", () => expect(() => ActivityCreate.parse({ ...valid, body: "" })).toThrow());
  it("rejects invalid type", () => expect(() => ActivityCreate.parse({ ...valid, type: "tweet" })).toThrow());
  it("rejects non-integer timestamp", () => expect(() => ActivityCreate.parse({ ...valid, occurred_at_ms: 1.5 })).toThrow());
});
