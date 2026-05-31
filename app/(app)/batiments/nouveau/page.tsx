import { PageHeader } from "@/components/layout/page-header";
import { BuildingForm } from "@/features/buildings/components/building-form";
import { getAppAuthState } from "@/features/auth/session";

export default async function NewBuildingPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Referentiel"
        title="Nouveau batiment"
        description="Creation locale d'un batiment (offline-first)."
      />
      <BuildingForm building={null} mode="create" userId={authState.userId} />
    </div>
  );
}

