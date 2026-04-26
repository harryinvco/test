import { NextRequest } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { readBearerToken, verifyMobileToken } from "@/lib/mobile/auth";
import { runSyncWithRealDb } from "@/lib/mobile/sync";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = readBearerToken(req.headers.get("authorization"));
  if (!token) {
    return Response.json({ error: "missing_token" }, { status: 401 });
  }
  const verified = verifyMobileToken(token, env.AUTH_SECRET);
  if (!verified.ok) {
    return Response.json({ error: "invalid_token", reason: verified.reason }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const result = await runSyncWithRealDb(body);
    return Response.json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json(
        { error: "validation", issues: err.issues.map((i) => ({ path: i.path, message: i.message })) },
        { status: 400 },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: "server_error", message }, { status: 500 });
  }
}
