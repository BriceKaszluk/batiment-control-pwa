import { PageHeader } from "@/components/layout/page-header";
import { BuildingsListSection } from "@/features/buildings/components/buildings-list-section";
import { getAppAuthState } from "@/features/auth/session";

export default async function BuildingsPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Referentiel"
        title="Batiments"
        description="Liste des sites et batiments a controler."
      />
      <BuildingsListSection
        title="Liste locale"
        userId={authState.userId}
      />
    </div>
  );
}
