"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS, type ProposalStatus } from "@/lib/enums";
import { updateProposalStatus } from "@/lib/agents/proposals/actions";
import { isValidProposalTransition } from "@/lib/agents/proposals/status";

type Props = {
  proposalId: string;
  status: ProposalStatus;
  sentAt: number | null;
  respondedAt: number | null;
};

export function ProposalStatusSelect({
  proposalId,
  status,
  sentAt,
  respondedAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const terminal = status === "accepted" || status === "rejected";

  function onChange(next: string | null) {
    if (!next || next === status) return;
    setError(null);
    const nextStatus = next as ProposalStatus;
    if (!isValidProposalTransition(status, nextStatus)) {
      setError("Invalid transition");
      return;
    }
    startTransition(async () => {
      try {
        await updateProposalStatus(proposalId, nextStatus);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Status:</span>
      {terminal ? (
        <Badge variant={status === "accepted" ? "default" : "destructive"}>
          {status}
        </Badge>
      ) : (
        <Select value={status} onValueChange={onChange} disabled={pending}>
          <SelectTrigger className="h-8 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROPOSAL_STATUS.map((s) => (
              <SelectItem
                key={s}
                value={s}
                disabled={s !== status && !isValidProposalTransition(status, s)}
              >
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="text-xs text-muted-foreground">
        {sentAt && <span>Sent {new Date(sentAt).toLocaleString()} </span>}
        {respondedAt && (
          <span>· {status === "accepted" ? "Accepted" : "Rejected"}{" "}
            {new Date(respondedAt).toLocaleString()}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
