import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  moduleLabel?: string;
  description?: string;
  cta?: { label: string; href: string };
};

export function EmptyState({ title, moduleLabel, description, cta }: Props) {
  return (
    <Card className="mx-auto mt-16 max-w-md text-center">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {description ?? (moduleLabel ? `Coming in ${moduleLabel}.` : null)}
        </div>
        {cta && (
          <Button render={<Link href={cta.href}>{cta.label}</Link>} />
        )}
      </CardContent>
    </Card>
  );
}
