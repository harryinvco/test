import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_VERSION = "v1";
const ALGORITHM = "HS256";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type TokenPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
  v: string;
};

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4 || 4);
  const normal = input.replace(/-/g, "+").replace(/_/g, "/") + (pad < 4 ? "=".repeat(pad) : "");
  return Buffer.from(normal, "base64");
}

function sign(secret: string, message: string): string {
  return base64UrlEncode(createHmac("sha256", secret).update(message).digest());
}

export function signMobileToken(
  params: { sub: string; email: string; secret: string; ttlSeconds?: number; now?: number },
): string {
  const iat = params.now ?? Math.floor(Date.now() / 1000);
  const ttl = params.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const header = base64UrlEncode(JSON.stringify({ alg: ALGORITHM, typ: "JWT" }));
  const payload: TokenPayload = {
    sub: params.sub,
    email: params.email,
    iat,
    exp: iat + ttl,
    v: TOKEN_VERSION,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(params.secret, `${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "unsupported_version" };

export function verifyMobileToken(
  token: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const [header, body, signature] = parts;

  let payload: TokenPayload;
  try {
    const headerObj = JSON.parse(base64UrlDecode(header).toString("utf-8"));
    if (headerObj?.alg !== ALGORITHM) return { ok: false, reason: "malformed" };
    payload = JSON.parse(base64UrlDecode(body).toString("utf-8")) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const expected = sign(secret, `${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }

  if (payload.v !== TOKEN_VERSION) return { ok: false, reason: "unsupported_version" };
  if (typeof payload.exp !== "number" || payload.exp < now) return { ok: false, reason: "expired" };

  return { ok: true, payload };
}

export function readBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
