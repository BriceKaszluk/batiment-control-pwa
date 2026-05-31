import { PageHeader } from "@/components/layout/page-header";
import { CorrectiveActionsListSection } from "@/features/corrective-actions/components/corrective-actions-list-section";
import { getAppAuthState } from "@/features/auth/session";

export default async function CorrectiveActionsPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Suivi"
        title="Reprises"
        description="Actions correctives a traiter apres controle."
      />
      <CorrectiveActionsListSection userId={authState.userId} />
    </div>
  );
}
