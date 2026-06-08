import { PageHeader } from "@/components/layout/page-header";
import { getAppAuthState } from "@/features/auth/session";
import { LocalDiagnosticsSection } from "@/features/settings/components/local-diagnostics-section";

export default async function SettingsPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compte"
        title="Parametres"
        description="Resume de votre espace local."
      />
      <LocalDiagnosticsSection
        authConfigured={authState.isConfigured}
        userEmail={authState.userEmail}
        userId={authState.userId}
      />
    </div>
  );
}
