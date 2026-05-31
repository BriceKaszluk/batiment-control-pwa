import { PageHeader } from "@/components/layout/page-header";
import { BuildingEditor } from "@/features/buildings/components/building-editor";
import { getAppAuthState } from "@/features/auth/session";

type BuildingPageProps = {
  params: Promise<{ buildingId: string }>;
};

export default async function BuildingPage({ params }: Readonly<BuildingPageProps>) {
  const authState = await getAppAuthState();
  const { buildingId } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Referentiel"
        title="Batiment"
        description="Modification locale d'un batiment."
      />
      <BuildingEditor buildingId={buildingId} userId={authState.userId} />
    </div>
  );
}

