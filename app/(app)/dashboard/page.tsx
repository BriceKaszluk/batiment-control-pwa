import { PageHeader } from "@/components/layout/page-header";
import { DashboardPriorityBuildingsSection } from "@/features/buildings/components/dashboard-priority-buildings-section";
import { getAppAuthState } from "@/features/auth/session";

export default async function DashboardPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accueil"
        title="Priorites terrain"
        description="Vue de depart pour les controles a organiser."
      />
      <DashboardPriorityBuildingsSection userId={authState.userId} />
    </div>
  );
}
