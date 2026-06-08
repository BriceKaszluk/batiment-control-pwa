import { PageHeader } from "@/components/layout/page-header";
import { getAppAuthState } from "@/features/auth/session";
import { ControlDetailSection } from "@/features/controls/components/control-detail-section";

type ControlDetailPageProps = {
  params: Promise<{
    controlId: string;
  }>;
};

export default async function ControlDetailPage({
  params,
}: Readonly<ControlDetailPageProps>) {
  const [{ controlId }, authState] = await Promise.all([
    params,
    getAppAuthState(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Controle"
        title="Controle terrain"
        description="Reponses sauvegardees localement avant synchronisation."
      />
      <ControlDetailSection controlId={controlId} userId={authState.userId} />
    </div>
  );
}
