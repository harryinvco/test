import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/leads/queries";
import { getActivitiesByLead } from "@/lib/activities/queries";
import { getClientById } from "@/lib/clients/queries";
import { LeadDetailTabs } from "@/components/leads/LeadDetailTabs";
import { ActivityTimeline } from "@/components/activities/ActivityTimeline";
import { AddActivityForm } from "@/components/activities/AddActivityForm";
import { ConvertToClientButton } from "@/components/leads/ConvertToClientButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/money";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();
  const [activities, convertedClient] = await Promise.all([
    getActivitiesByLead(lead.id),
    lead.convertedClientId ? getClientById(lead.convertedClientId) : Promise.resolve(null),
  ]);

  const details = (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-2xl text-sm">
      <Dt label="Email">{lead.email}</Dt>
      <Dt label="Phone">{lead.phone ?? "—"}</Dt>
      <Dt label="Company">{lead.company ?? "—"}</Dt>
      <Dt label="Industry">{lead.industry.replace("_", " ")}</Dt>
      <Dt label="Source">{lead.source}</Dt>
      <Dt label="Estimated value">{formatEuros(lead.estimatedValueCents)}</Dt>
      <Dt label="Follow-up">{lead.followUpDate ?? "—"}</Dt>
      {convertedClient && (
        <Dt label="Converted to">
          <Link href={`/clients/${convertedClient.id}`} className="underline">{convertedClient.name}</Link>
        </Dt>
      )}
    </dl>
  );

  const activity = (
    <div className="space-y-6 max-w-2xl">
      <AddActivityForm leadId={lead.id} />
      <ActivityTimeline activities={activities} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
          <div className="text-sm text-muted-foreground">{lead.company ?? ""}</div>
          <div className="mt-2"><Badge>{lead.stage.replace("_", " ")}</Badge></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href={`/leads/${lead.id}/edit`}>Edit</Link>} />
          {lead.stage === "won" && !lead.convertedClientId && <ConvertToClientButton leadId={lead.id} />}
        </div>
      </div>
      <LeadDetailTabs details={details} activity={activity} />
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
