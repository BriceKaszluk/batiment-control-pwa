import {
  Building2,
  ClipboardCheck,
  History,
  Home,
  RotateCcw,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

export const navigationItems: readonly NavigationItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/batiments", label: "Batiments", icon: Building2 },
  { href: "/controles", label: "Controles", icon: ClipboardCheck },
  { href: "/reprises", label: "Reprises", icon: RotateCcw },
  { href: "/historique", label: "Historique", icon: History },
  { href: "/parametres", label: "Reglages", icon: Settings },
];

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getCurrentNavigationItem(pathname: string) {
  return (
    navigationItems.find((item) =>
      isNavigationItemActive(pathname, item.href),
    ) ?? navigationItems[0]
  );
}
