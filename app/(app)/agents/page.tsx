import { PageHeader } from "@/components/layout/page-header";
import { AgentsManagementSection } from "@/features/agents/components/agents-management-section";
import { getAppAuthState } from "@/features/auth/session";

export default async function AgentsPage() {
  const authState = await getAppAuthState();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Referentiel"
        title="Agents"
        description="Liste des agents affectables aux batiments."
      />
      <AgentsManagementSection userId={authState.userId} />
    </div>
  );
}
