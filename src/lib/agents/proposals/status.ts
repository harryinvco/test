import type { ProposalStatus } from "@/lib/enums";

const VALID_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected"],
  accepted: [],
  rejected: [],
};

export function isValidProposalTransition(
  from: ProposalStatus,
  to: ProposalStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
