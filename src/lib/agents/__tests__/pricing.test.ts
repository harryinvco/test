import { describe, it, expect } from "vitest";
import { priceFor, computeCost, type AnthropicUsage } from "@/lib/agents/pricing";

describe("priceFor", () => {
  it("returns the Sonnet 4.6 rate card", () => {
    const p = priceFor("claude-sonnet-4-6");
    expect(p).toEqual({ input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 });
  });
  it("falls back to sonnet pricing for unknown model", () => {
    const p = priceFor("some-future-model");
    expect(p.input).toBeGreaterThan(0);
  });
});

describe("computeCost", () => {
  const sonnet = { input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 };

  it("sums all four token buckets against the rate card", () => {
    const usage: AnthropicUsage = {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    };
    // 3 + 15 + 0.3 + 3.75 = 22.05
    expect(computeCost(usage, sonnet)).toBeCloseTo(22.05, 4);
  });

  it("handles missing cache counters (non-cached call)", () => {
    const usage: AnthropicUsage = { input_tokens: 1000, output_tokens: 500 };
    // (1000 * 3 + 500 * 15) / 1e6 = 0.0105
    expect(computeCost(usage, sonnet)).toBeCloseTo(0.0105, 6);
  });
});
