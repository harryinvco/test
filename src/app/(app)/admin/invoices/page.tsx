import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getInvoices } from "@/lib/invoices/queries";
import { InvoicesTable } from "@/components/invoices/InvoicesTable";

export default async function InvoicesListPage() {
  const rows = await getInvoices();
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <Button render={<Link href="/admin/invoices/new">New invoice</Link>} />
      </div>
      <InvoicesTable rows={rows} />
    </div>
  );
}
