"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { convertToClient } from "@/lib/leads/actions";

export function ConvertToClientButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      disabled={pending}
      onClick={() => startTransition(() => convertToClient(leadId))}
    >
      {pending ? "Converting…" : "Convert to Client"}
    </Button>
  );
}
