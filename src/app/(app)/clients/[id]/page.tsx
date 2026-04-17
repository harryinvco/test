import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientById } from "@/lib/clients/queries";
import { getLeadById } from "@/lib/leads/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();
  const originLead = client.fromLeadId ? await getLeadById(client.fromLeadId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <div className="text-sm text-muted-foreground">{client.company ?? ""}</div>
          <div className="mt-2"><Badge>{client.status}</Badge></div>
        </div>
        <Button variant="outline" render={<Link href={`/clients/${client.id}/edit`}>Edit</Link>} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-2xl text-sm">
        <Dt label="Email">{client.email}</Dt>
        <Dt label="Phone">{client.phone ?? "—"}</Dt>
        <Dt label="Industry">{client.industry.replace("_", " ")}</Dt>
        <Dt label="Contract start">{client.contractStartDate}</Dt>
        <Dt label="MRR">{formatEuros(client.mrrCents)}</Dt>
        {originLead && (
          <Dt label="Converted from lead">
            <Link href={`/leads/${originLead.id}`} className="underline">{originLead.name}</Link>
          </Dt>
        )}
      </dl>
    </div>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
