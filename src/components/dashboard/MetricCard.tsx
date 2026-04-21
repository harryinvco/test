import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
};

export function MetricCard({ label, value, sub, href }: Props) {
  const body = (
    <Card
      size="sm"
      className={cn(
        "h-full justify-between gap-2 px-4",
        href && "transition-colors hover:bg-muted/40",
      )}
    >
      <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="font-heading text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  );
}
