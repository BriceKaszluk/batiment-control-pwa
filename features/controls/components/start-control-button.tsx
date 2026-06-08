"use client";

import { ClipboardCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { Building } from "@/types/domain";

type StartControlButtonProps = {
  building: Building;
  userId: string | null;
};

export function StartControlButton({
  building,
  userId,
}: Readonly<StartControlButtonProps>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  return (
    <div className="space-y-2">
      <Button
        className="h-11 w-full"
        disabled={!userId || isStarting}
        onClick={() => {
          setError(null);
          setIsStarting(true);

          void import("@/features/controls/services/local-controls")
            .then((localControlsModule) =>
              localControlsModule.startDraftControl({ building, userId }),
            )
            .then((result) => {
              router.push(`/controles/${result.record.id}`);
            })
            .catch((error: unknown) => {
              setError(
                error instanceof Error
                  ? error.message
                  : "Controle non enregistre",
              );
            })
            .finally(() => {
              setIsStarting(false);
            });
        }}
        type="button"
      >
        {isStarting ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ClipboardCheck aria-hidden="true" className="size-4" />
        )}
        Controler
      </Button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
