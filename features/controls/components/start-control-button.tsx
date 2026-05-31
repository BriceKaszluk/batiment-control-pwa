"use client";

import { ClipboardCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { startDraftControl } from "@/features/controls/services/local-controls";
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

          void startDraftControl({ building, userId })
            .then(() => {
              router.push("/controles");
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
        Demarrer
      </Button>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
