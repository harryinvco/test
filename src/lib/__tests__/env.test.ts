import { describe, it, expect } from "vitest";
import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  const valid = {
    AUTH_SECRET: "a".repeat(32),
    ADMIN_EMAIL: "harry@innovaco.cy",
    ADMIN_PASSWORD_HASH: "$2a$10$abcdefghijklmnopqrstuv",
    TURSO_DATABASE_URL: "libsql://example.turso.io",
    TURSO_AUTH_TOKEN: "token",
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
