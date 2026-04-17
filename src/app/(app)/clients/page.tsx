import Link from "next/link";
import { getClients } from "@/lib/clients/queries";
import { ClientsTable } from "@/components/clients/ClientsTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";

export default async function ClientsPage() {
  const clients = await getClients();

  if (clients.length === 0) {
    return (
      <EmptyState
        title="No clients yet"
        description="Convert a won lead, or add one directly."
        cta={{ label: "Add a client", href: "/clients/new" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <Button render={<Link href="/clients/new">New client</Link>} />
      </div>
      <ClientsTable clients={clients} />
    </div>
  );
}
