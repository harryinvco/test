import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ReceiptIcon, WalletIcon, ClockIcon, TrendingUpIcon } from "lucide-react";

type Tile = {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary: string;
  sub?: string;
};

export function AdminHubTiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.href} href={t.href} className="block h-full">
          <Card
            size="sm"
            className="h-full justify-between gap-3 px-4 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.label}
              </div>
              <div className="text-muted-foreground">{t.icon}</div>
            </div>
            <div className="font-heading text-2xl font-semibold tracking-tight">
              {t.primary}
            </div>
            {t.sub && <div className="text-xs text-muted-foreground">{t.sub}</div>}
          </Card>
        </Link>
      ))}
    </div>
  );
}

export const ADMIN_ICONS = {
  invoices: <ReceiptIcon />,
  expenses: <WalletIcon />,
  time: <ClockIcon />,
  revenue: <TrendingUpIcon />,
};
