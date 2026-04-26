import { describe, it, expect } from "vitest";
import { signMobileToken, verifyMobileToken, readBearerToken } from "../auth";

const SECRET = "a".repeat(64);

describe("signMobileToken + verifyMobileToken", () => {
  it("round-trips a valid token", () => {
    const now = 1_700_000_000;
    const tok = signMobileToken({ sub: "admin", email: "a@b.co", secret: SECRET, now });
    const r = verifyMobileToken(tok, SECRET, now + 10);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.sub).toBe("admin");
      expect(r.payload.email).toBe("a@b.co");
      expect(r.payload.exp).toBe(now + 60 * 60 * 24 * 30);
    }
  });

  it("rejects a token signed with a different secret", () => {
    const tok = signMobileToken({ sub: "admin", email: "a@b.co", secret: SECRET });
    const r = verifyMobileToken(tok, "z".repeat(64));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_signature");
  });

  it("rejects a tampered payload", () => {
    const tok = signMobileToken({ sub: "admin", email: "a@b.co", secret: SECRET });
    const parts = tok.split(".");
    const tampered = [parts[0], Buffer.from('{"sub":"hacker","email":"h@x","iat":1,"exp":9999999999,"v":"v1"}').toString("base64url"), parts[2]].join(".");
    const r = verifyMobileToken(tampered, SECRET);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("bad_signature");
  });

  it("rejects expired tokens", () => {
    const now = 1_700_000_000;
    const tok = signMobileToken({ sub: "admin", email: "a@b.co", secret: SECRET, ttlSeconds: 10, now });
    const r = verifyMobileToken(tok, SECRET, now + 11);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("rejects malformed tokens", () => {
    expect(verifyMobileToken("not.a.token.extra", SECRET).ok).toBe(false);
    expect(verifyMobileToken("only.two", SECRET).ok).toBe(false);
    expect(verifyMobileToken("", SECRET).ok).toBe(false);
  });
});

describe("readBearerToken", () => {
  it.each([
    ["Bearer abc.def.ghi", "abc.def.ghi"],
    ["bearer xyz", "xyz"],
    ["Bearer   spacey", "spacey"],
    [null, null],
    ["", null],
    ["Basic abc", null],
    ["abc", null],
  ])("%s -> %s", (input, expected) => {
    expect(readBearerToken(input)).toBe(expected);
  });
});
