import { PageHeader } from "@/components/layout/page-header";
import { getAppAuthState } from "@/features/auth/session";
import { ControlHistoryListSection } from "@/features/history/components/control-history-list-section";

export default async function HistoryPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Archives"
        title="Historique"
        description="Consultation des controles deja realises."
      />
      <ControlHistoryListSection userId={authState.userId} />
    </div>
  );
}
