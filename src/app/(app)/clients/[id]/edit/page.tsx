import { notFound } from "next/navigation";
import { getClientById } from "@/lib/clients/queries";
import { ClientForm } from "@/components/clients/ClientForm";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit client</h1>
      <ClientForm mode="edit" initial={client} />
    </div>
  );
}
