import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: Props) {
  return (
    <header className={cn("flex items-end justify-between gap-8 pb-2", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1
          className="font-display text-4xl leading-tight tracking-tight text-foreground lg:text-5xl"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50' }}
        >
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
