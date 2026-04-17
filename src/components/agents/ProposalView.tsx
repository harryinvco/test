"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Proposal, AgentRun } from "@/db/schema";

export function ProposalView({
  proposal,
  runs,
  monthlySpentUsd,
  monthlyCapUsd,
}: {
  proposal: Proposal;
  runs: AgentRun[];
  monthlySpentUsd: number;
  monthlyCapUsd: number;
}) {
  const [copied, setCopied] = useState(false);
  const latestRunCost = runs[0]?.costUsd ?? 0;

  async function copy() {
    await navigator.clipboard.writeText(proposal.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{proposal.title}</h1>
          <div className="text-xs text-muted-foreground">v{proposal.version} · {proposal.status}</div>
        </div>
        <Button variant="outline" onClick={copy}>{copied ? "Copied" : "Copy markdown"}</Button>
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert rounded-md border p-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{proposal.body}</ReactMarkdown>
      </div>
      <div className="text-xs text-muted-foreground">
        This run: ${latestRunCost.toFixed(3)} · This month: ${monthlySpentUsd.toFixed(2)} of ${monthlyCapUsd.toFixed(2)}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground">Run history ({runs.length})</summary>
        <ul className="mt-2 space-y-1">
          {runs.map((r) => (
            <li key={r.id} className="font-mono">
              {new Date(r.createdAt).toLocaleString()} — {r.agentType} · {r.status} · {r.inputTokens ?? 0}→{r.outputTokens ?? 0}t · ${(r.costUsd ?? 0).toFixed(3)}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
