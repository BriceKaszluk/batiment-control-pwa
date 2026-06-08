import { PageHeader } from "@/components/layout/page-header";
import { getAppAuthState } from "@/features/auth/session";
import { ControlsListSection } from "@/features/controls/components/controls-list-section";

export default async function ControlsPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Terrain"
        title="Controles"
        description="Brouillons en cours et controles termines ce jour."
      />
      <ControlsListSection
        title="Journee terrain"
        userId={authState.userId}
      />
    </div>
  );
}
