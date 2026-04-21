"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LeadDetailTabs({
  details,
  activity,
  proposals,
}: {
  details: React.ReactNode;
  activity: React.ReactNode;
  proposals?: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="details" className="space-y-4">
      <TabsList>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        {proposals && <TabsTrigger value="proposals">Proposals</TabsTrigger>}
      </TabsList>
      <TabsContent value="details">{details}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
      {proposals && <TabsContent value="proposals">{proposals}</TabsContent>}
    </Tabs>
  );
}
