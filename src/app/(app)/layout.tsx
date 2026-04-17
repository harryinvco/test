import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      <aside className="border-r bg-muted/20">
        <Sidebar />
      </aside>
      <div className="flex flex-col">
        <Header email={session.user.email} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
