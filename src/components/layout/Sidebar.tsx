"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboardIcon,
  InboxIcon,
  UsersIcon,
  BotIcon,
  StickyNoteIcon,
  ReceiptIcon,
  SettingsIcon,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  section: "work" | "system";
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, section: "work" },
  { href: "/leads",     label: "Leads",     icon: InboxIcon,            section: "work" },
  { href: "/clients",   label: "Clients",   icon: UsersIcon,            section: "work" },
  { href: "/agents",    label: "Agents",    icon: BotIcon,              section: "work" },
  { href: "/notes",     label: "Notes",     icon: StickyNoteIcon,       section: "work" },
  { href: "/admin",     label: "Admin",     icon: ReceiptIcon,          section: "system" },
  { href: "/settings",  label: "Settings",  icon: SettingsIcon,         section: "system" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col">
      {/* Brand lockup */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-8">
        <div className="flex size-8 items-center justify-center rounded-sm border border-foreground/20">
          <span className="font-display text-lg leading-none">I</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-sm tracking-wide">Innovaco</span>
          <span className="text-[10px] tracking-widest text-muted-foreground uppercase">
            Command Center
          </span>
        </div>
      </div>

      <Section label="Work">
        {NAV.filter((n) => n.section === "work").map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </Section>

      <Section label="System">
        {NAV.filter((n) => n.section === "system").map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </Section>

      <div className="mt-auto px-6 pb-6 pt-8">
        <div className="rule mb-4" />
        <p className="font-mono text-[10px] leading-relaxed tracking-wider text-muted-foreground">
          CC-001 · Nicosia
          <br />
          Single-user instance
        </p>
      </div>
    </nav>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      <div className="eyebrow px-3 pb-2">{label}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + "/");
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors",
        active
          ? "nav-active font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-foreground" : "text-muted-foreground/70",
        )}
      />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}
