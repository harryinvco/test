import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/client";
import { DraftInput } from "@/lib/agents/proposals/schema";
import { streamProposalDraft } from "@/lib/agents/proposals/runner";
import { monthlySpendUsd } from "@/lib/agents/spend";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return new Response("UNAUTHORIZED", { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = DraftInput.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", issues: parsed.error.issues }, { status: 400 });
  }

  const spent = await monthlySpendUsd(db);
  if (spent >= env.AGENT_MONTHLY_BUDGET_USD) {
    return Response.json(
      { error: "monthly_cap", spent_usd: spent, cap_usd: env.AGENT_MONTHLY_BUDGET_USD },
      { status: 429 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const gen = streamProposalDraft(parsed.data, req.signal);
        let step = await gen.next();
        while (!step.done) {
          controller.enqueue(encoder.encode(step.value));
          step = await gen.next();
        }
        // Emit trailer: a marker + JSON with ids.
        controller.enqueue(encoder.encode(`\n\u0000__AGENT_TRAILER__${JSON.stringify(step.value)}`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        controller.enqueue(encoder.encode(`\n\u0000__AGENT_ERROR__${JSON.stringify({ error: msg })}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
