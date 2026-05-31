import type { ReactNode } from "react";

import { MobileShell } from "@/components/layout/mobile-shell";
import { getAppAuthState } from "@/features/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const authState = await getAppAuthState();

  return (
    <MobileShell
      authConfigured={authState.isConfigured}
      userEmail={authState.userEmail}
      userId={authState.userId}
    >
      {children}
    </MobileShell>
  );
}
