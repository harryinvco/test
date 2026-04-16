import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EmptyState({ title, moduleLabel }: { title: string; moduleLabel: string }) {
  return (
    <Card className="mx-auto mt-16 max-w-md text-center">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Coming in {moduleLabel}.
      </CardContent>
    </Card>
  );
}
