import { getClients } from "@/lib/clients/queries";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

export default async function NewInvoicePage() {
  const clients = await getClients();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
      <InvoiceForm
        mode="create"
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
