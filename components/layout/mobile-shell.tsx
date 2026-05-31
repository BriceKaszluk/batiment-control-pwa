"use client";

import {
  Building2,
  ClipboardCheck,
  History,
  Home,
  LogOut,
  RotateCcw,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const navigationItems: NavigationItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/batiments", label: "Batiments", icon: Building2 },
  { href: "/controles", label: "Controles", icon: ClipboardCheck },
  { href: "/reprises", label: "Reprises", icon: RotateCcw },
  { href: "/historique", label: "Historique", icon: History },
  { href: "/parametres", label: "Reglages", icon: Settings },
];

type MobileShellProps = {
  authConfigured: boolean;
  children: ReactNode;
  userEmail: string | null;
};

export function MobileShell({
  authConfigured,
  children,
  userEmail,
}: Readonly<MobileShellProps>) {
  const pathname = usePathname();
  const currentItem =
    navigationItems.find((item) => pathname.startsWith(item.href)) ??
    navigationItems[0];

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              Batiment Control
            </p>
            <p className="text-lg font-semibold">{currentItem.label}</p>
          </div>
          {authConfigured ? (
            <form action={signOut}>
              <button
                aria-label="Deconnexion"
                className="flex size-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={userEmail ?? "Deconnexion"}
                type="submit"
              >
                <LogOut aria-hidden="true" className="size-5" />
              </button>
            </form>
          ) : (
            <div className="rounded-md bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              Config
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto min-h-[calc(100svh-8rem)] max-w-screen-sm px-4 pb-28 pt-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-screen-sm gap-1 overflow-x-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-w-20 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive && "bg-primary text-primary-foreground",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
