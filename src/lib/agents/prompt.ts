import type { Lead, Activity } from "@/db/schema";
import { formatEuros } from "@/lib/money";

type TextBlock = {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
};

export type BuiltPrompt = {
  system: TextBlock[];
  messages: Array<{ role: "user"; content: string }>;
};

const PREAMBLE = `You are a proposal drafter for **Innovaco**, a digital transformation agency based in Cyprus offering AI chatbots, consulting, development, implementation, and training. Industry focus: hospitality, real estate, insurance, healthcare, retail.

Output rules:
- Markdown only. No preamble or afterword.
- Use these exact H2 section headings in this order: Summary, Background, Proposed Solution, Deliverables, Timeline, Pricing, Terms.
- British English. Concise, direct, warm-professional tone.
- Currency: euros (€).
- If facts are unknown, write a short plausible placeholder the reader can edit — never fabricate specifics like dates or client quotes.`;

function block(text: string): TextBlock {
  return { type: "text", text, cache_control: { type: "ephemeral" } };
}

function leadSnapshot(lead: Lead): string {
  const value = formatEuros(lead.estimatedValueCents);
  return [
    `## Lead snapshot`,
    `- Name: ${lead.name}`,
    `- Company: ${lead.company ?? "—"}`,
    `- Email: ${lead.email}`,
    `- Industry: ${lead.industry.replace("_", " ")}`,
    `- Source: ${lead.source}`,
    `- Stage: ${lead.stage}`,
    `- Estimated value: ${value}`,
    lead.followUpDate ? `- Follow-up date: ${lead.followUpDate}` : null,
  ].filter(Boolean).join("\n");
}

function activityLog(activities: Activity[]): string {
  if (activities.length === 0) return "## Activity log\n\n_(no recorded activities)_";
  const sorted = [...activities].sort((a, b) => a.occurredAt - b.occurredAt);
  const lines = sorted.map((a) => {
    const when = new Date(a.occurredAt).toISOString().replace("T", " ").slice(0, 16);
    return `- **${a.type}** — ${when}\n  ${a.body.replace(/\n/g, "\n  ")}`;
  });
  return `## Activity log\n\n${lines.join("\n")}`;
}

export function buildProposalPrompt(lead: Lead, activities: Activity[], scopeBrief: string): BuiltPrompt {
  return {
    system: [block(PREAMBLE), block(leadSnapshot(lead)), block(activityLog(activities))],
    messages: [{ role: "user", content: scopeBrief }],
  };
}

export function buildRevisePrompt(lead: Lead, activities: Activity[], previousBody: string, instruction: string): BuiltPrompt {
  return {
    system: [block(PREAMBLE), block(leadSnapshot(lead)), block(activityLog(activities))],
    messages: [
      {
        role: "user",
        content: `Here is the current proposal draft. Revise it per the instruction that follows. Keep the same seven H2 sections, markdown-only, no preamble.\n\n--- CURRENT DRAFT ---\n${previousBody}\n--- END DRAFT ---\n\nRevision instruction: ${instruction}`,
      },
    ],
  };
}
