import Link from "next/link";
import { getLeads } from "@/lib/leads/queries";
import { LeadsTable } from "@/components/leads/LeadsTable";
import { LeadsKanban } from "@/components/leads/LeadsKanban";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/EmptyState";

export default async function LeadsPage() {
  const leads = await getLeads();

  if (leads.length === 0) {
    return (
      <EmptyState
        title="No leads yet"
        description="Capture your first lead to start tracking the pipeline."
        cta={{ label: "Add a lead", href: "/leads/new" }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <Button render={<Link href="/leads/new">New lead</Link>} />
      </div>
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
        <TabsContent value="table"><LeadsTable leads={leads} /></TabsContent>
        <TabsContent value="kanban"><LeadsKanban leads={leads} /></TabsContent>
      </Tabs>
    </div>
  );
}
