import type { ReactNode } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";

export default function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MobileShell>{children}</MobileShell>;
}
