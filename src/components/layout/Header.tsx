import { UserMenu } from "./UserMenu";

export function Header({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="text-sm text-muted-foreground">Command Center</div>
      <UserMenu email={email} />
    </header>
  );
}
