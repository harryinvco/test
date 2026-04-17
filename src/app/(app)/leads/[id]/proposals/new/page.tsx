"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StreamingMarkdown } from "@/components/agents/StreamingMarkdown";

export default function NewProposalPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const leadId = params.id;
  const [brief, setBrief] = useState<string | null>(null);

  useEffect(() => {
    const key = search.get("k");
    if (!key) {
      router.replace(`/leads/${leadId}`);
      return;
    }
    const value = sessionStorage.getItem(key);
    if (!value) {
      router.replace(`/leads/${leadId}`);
      return;
    }
    sessionStorage.removeItem(key);
    setBrief(value);
  }, [leadId, router, search]);

  if (!brief) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Drafting proposal…</h1>
      <StreamingMarkdown
        endpoint="/api/agents/proposal/draft"
        requestBody={{ leadId, scopeBrief: brief }}
        onComplete={(_body, result) => {
          if (result.proposalId) {
            router.replace(`/leads/${leadId}/proposals/${result.proposalId}`);
          }
        }}
      />
    </div>
  );
}
