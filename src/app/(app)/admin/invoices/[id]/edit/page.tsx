import { notFound, redirect } from "next/navigation";
import { getClients } from "@/lib/clients/queries";
import { getInvoiceById } from "@/lib/invoices/queries";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

type Params = { id: string };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const data = await getInvoiceById(id);
  if (!data) notFound();
  if (data.invoice.status !== "draft") redirect(`/admin/invoices/${id}`);

  const clients = await getClients();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit {data.invoice.number}
      </h1>
      <InvoiceForm
        mode="edit"
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        invoice={data.invoice}
        items={data.items}
      />
    </div>
  );
}
