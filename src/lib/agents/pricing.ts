// USD per million tokens.
// Source: Anthropic pricing for claude-sonnet-4-6 as of implementation (2026-04).
// Verify current rates via the claude-api skill before relying on these for production cost tracking.
export type ModelPricing = {
  input: number;
  cacheCreation: number;
  cacheRead: number;
  output: number;
};

const RATES: Record<string, ModelPricing> = {
  "claude-sonnet-4-6": { input: 3, cacheCreation: 3.75, cacheRead: 0.3, output: 15 },
};

const FALLBACK: ModelPricing = RATES["claude-sonnet-4-6"];

export function priceFor(model: string): ModelPricing {
  return RATES[model] ?? FALLBACK;
}

export type AnthropicUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function computeCost(usage: AnthropicUsage, rate: ModelPricing): number {
  const inputT = usage.input_tokens ?? 0;
  const outputT = usage.output_tokens ?? 0;
  const cacheReadT = usage.cache_read_input_tokens ?? 0;
  const cacheCreationT = usage.cache_creation_input_tokens ?? 0;
  return (
    (inputT * rate.input +
      cacheCreationT * rate.cacheCreation +
      cacheReadT * rate.cacheRead +
      outputT * rate.output) /
    1_000_000
  );
}
