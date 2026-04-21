export const INDUSTRY = ["hospitality", "real_estate", "insurance", "healthcare", "retail", "other"] as const;
export const SOURCE = ["referral", "inbound", "outbound", "event", "other"] as const;
export const LEAD_STAGE = ["new", "contacted", "qualified", "proposal_sent", "won", "lost"] as const;
export const CLIENT_STATUS = ["active", "paused", "churned"] as const;
export const ACTIVITY_TYPE = ["call", "email", "meeting", "note"] as const;

export type Industry = typeof INDUSTRY[number];
export type Source = typeof SOURCE[number];
export type LeadStage = typeof LEAD_STAGE[number];
export type ClientStatus = typeof CLIENT_STATUS[number];
export type ActivityType = typeof ACTIVITY_TYPE[number];

export const AGENT_TYPE = ["proposal_draft", "proposal_revise"] as const;
export const AGENT_STATUS = ["streaming", "completed", "failed", "cancelled"] as const;
export const PROPOSAL_STATUS = ["draft"] as const;

export type AgentType = typeof AGENT_TYPE[number];
export type AgentStatus = typeof AGENT_STATUS[number];
export type ProposalStatus = typeof PROPOSAL_STATUS[number];
