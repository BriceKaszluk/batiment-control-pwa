import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
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

      <Button asChild className="h-11 w-full">
        <Link href="/batiments/nouveau">
          <Plus aria-hidden="true" className="size-4" />
          Nouveau batiment
        </Link>
      </Button>

      <BuildingsListSection
        title="Liste locale"
        userId={authState.userId}
      />
    </div>
  );
}
