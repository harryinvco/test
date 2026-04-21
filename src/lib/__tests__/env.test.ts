import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  const valid = {
    AUTH_SECRET: "a".repeat(32),
    ADMIN_EMAIL: "harry@innovaco.cy",
    ADMIN_PASSWORD_HASH: "$2a$10$abcdefghijklmnopqrstuv",
    TURSO_DATABASE_URL: "libsql://example.turso.io",
    TURSO_AUTH_TOKEN: "token",
    ANTHROPIC_API_KEY: "sk-ant-xxxxxxxxxxxxxxxxxxxx",
  };

  it("parses valid env", () => {
    expect(() => parseEnv(valid)).not.toThrow();
  });

  it("throws on missing AUTH_SECRET", () => {
    const { AUTH_SECRET, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/AUTH_SECRET/);
  });

  it("throws on non-email ADMIN_EMAIL", () => {
    expect(() => parseEnv({ ...valid, ADMIN_EMAIL: "not-an-email" }))
      .toThrow(/ADMIN_EMAIL/);
  });
});

describe("agent env vars", () => {
  const baseValid = {
    AUTH_SECRET: "x".repeat(32),
    ADMIN_EMAIL: "a@b.co",
    ADMIN_PASSWORD_HASH: "h",
    TURSO_DATABASE_URL: "libsql://x.turso.io",
    TURSO_AUTH_TOKEN: "t",
    ANTHROPIC_API_KEY: "sk-ant-xxxxxxxxxxxxxxxxxxxx",
  };

  it("requires ANTHROPIC_API_KEY", () => {
    const { ANTHROPIC_API_KEY: _, ...rest } = baseValid;
    expect(() => parseEnv(rest)).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("defaults AGENT_MODEL to claude-sonnet-4-6", () => {
    const env = parseEnv(baseValid);
    expect(env.AGENT_MODEL).toBe("claude-sonnet-4-6");
  });

  it("defaults AGENT_MONTHLY_BUDGET_USD to 50", () => {
    const env = parseEnv(baseValid);
    expect(env.AGENT_MONTHLY_BUDGET_USD).toBe(50);
  });

  it("coerces AGENT_MONTHLY_BUDGET_USD from string (since env vars are strings)", () => {
    const env = parseEnv({ ...baseValid, AGENT_MONTHLY_BUDGET_USD: "25" });
    expect(env.AGENT_MONTHLY_BUDGET_USD).toBe(25);
  });
});
