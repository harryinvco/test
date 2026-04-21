import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyCredentials } from "@/auth";
import { env } from "@/lib/env";
import { signMobileToken } from "@/lib/mobile/auth";

export const runtime = "nodejs";

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = LoginInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation" }, { status: 400 });
  }

  const user = await verifyCredentials(parsed.data, {
    adminEmail: env.ADMIN_EMAIL,
    adminHash: env.ADMIN_PASSWORD_HASH,
  });
  if (!user) {
    return Response.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = signMobileToken({
    sub: user.id,
    email: user.email,
    secret: env.AUTH_SECRET,
  });

  const now = Math.floor(Date.now() / 1000);
  return Response.json({
    token,
    email: user.email,
    expiresAt: now + 60 * 60 * 24 * 30,
  });
}
