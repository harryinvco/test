"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StreamingMarkdown } from "@/components/agents/StreamingMarkdown";

export function ReviseBox({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [instruction, setInstruction] = useState("");
  const [streaming, setStreaming] = useState(false);

  if (streaming) {
    return (
      <StreamingMarkdown
        endpoint={`/api/agents/proposal/${proposalId}/revise`}
        requestBody={{ instruction }}
        onComplete={() => {
          setStreaming(false);
          setInstruction("");
          router.refresh();
        }}
        onError={() => setStreaming(false)}
      />
    );
  }

  return (
    <div className="space-y-2 rounded-md border p-4">
      <Label>Revise</Label>
      <Textarea
        rows={3}
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="e.g. make it shorter, emphasise pricing, add a discovery phase"
        maxLength={1000}
      />
      <Button disabled={!instruction.trim()} onClick={() => setStreaming(true)}>
        Revise
      </Button>
    </div>
  );
}
