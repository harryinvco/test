import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/leads/queries";
import { LeadForm } from "@/components/leads/LeadForm";

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit lead</h1>
      <LeadForm mode="edit" initial={lead} />
    </div>
  );
}
