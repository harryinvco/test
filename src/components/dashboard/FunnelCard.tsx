import Link from "next/link";
import { Card } from "@/components/ui/card";

type Props = {
  counts: {
    new: number;
    contacted: number;
    qualified: number;
    proposal_sent: number;
  };
  href?: string;
};

const COLUMNS: { key: keyof Props["counts"]; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal_sent", label: "Proposal" },
];

export function FunnelCard({ counts, href }: Props) {
  const body = (
    <Card
      size="sm"
      className="h-full gap-3 px-4 transition-colors hover:bg-muted/40"
    >
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Leads by stage
      </div>
      <div className="grid grid-cols-4 gap-2">
        {COLUMNS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-0.5">
            <div className="font-heading text-xl font-semibold tabular-nums text-foreground">
              {counts[key]}
            </div>
            <div className="text-[11px] leading-tight text-muted-foreground">
              {label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
