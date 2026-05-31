import { PageHeader } from "@/components/layout/page-header";
import { BuildingsListSection } from "@/features/buildings/components/buildings-list-section";
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
      <BuildingsListSection
        limit={5}
        title="Batiments prioritaires"
        userId={authState.userId}
      />
    </div>
  );
}
