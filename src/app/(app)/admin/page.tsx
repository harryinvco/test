import { db } from "@/db/client";
import { getRevenueKpis } from "@/lib/revenue/queries";
import { weeklyTotalHours } from "@/lib/time/queries";
import { expenses } from "@/db/schema";
import { gte, sum } from "drizzle-orm";
import { formatEuros } from "@/lib/money";
import { AdminHubTiles, ADMIN_ICONS } from "@/components/admin/AdminHubTiles";

export default async function AdminHubPage() {
  const now = new Date();
  const firstOfMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

  const [kpis, expensesMtdRow, hoursThisWeek] = await Promise.all([
    getRevenueKpis(db),
    db.select({ s: sum(expenses.amountCents) }).from(expenses).where(gte(expenses.date, firstOfMonth)),
    weeklyTotalHours(db),
  ]);
  const expensesMtdCents = Number(expensesMtdRow[0]?.s ?? 0);

  const tiles = [
    {
      href: "/admin/invoices",
      icon: ADMIN_ICONS.invoices,
      label: "Invoices",
      primary: formatEuros(kpis.outstandingCents),
      sub: `${kpis.outstandingCount} outstanding`,
    },
    {
      href: "/admin/expenses",
      icon: ADMIN_ICONS.expenses,
      label: "Expenses",
      primary: formatEuros(expensesMtdCents),
      sub: "This month",
    },
    {
      href: "/admin/time",
      icon: ADMIN_ICONS.time,
      label: "Time",
      primary: `${hoursThisWeek.toFixed(1)} h`,
      sub: "This week",
    },
    {
      href: "/admin/revenue",
      icon: ADMIN_ICONS.revenue,
      label: "Revenue",
      primary: formatEuros(kpis.revenueYtdCents),
      sub: "YTD",
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <AdminHubTiles tiles={tiles} />
    </div>
  );
}
