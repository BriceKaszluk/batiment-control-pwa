"use client";

import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  Loader2,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getControlQualityRatingLabel,
  getControlQualityRatingTone,
  type ControlQualityRatingTone,
} from "@/features/controls/services/control-labels";
import type { Control } from "@/types/domain";

type ControlQualityRating = NonNullable<Control["qualityRating"]>;

type ControlQualityRatingEditorProps = {
  control: Control;
  userId: string | null;
};

const qualityRatingOptions: Array<{
  icon: LucideIcon;
  qualityRating: ControlQualityRating;
}> = [
  { icon: CheckCircle2, qualityRating: "satisfying" },
  { icon: ThumbsUp, qualityRating: "acceptable" },
  { icon: CircleAlert, qualityRating: "to_improve" },
  { icon: CircleX, qualityRating: "unsatisfying" },
];

const selectedToneClasses: Record<ControlQualityRatingTone, string> = {
  danger: "border-red-600 bg-red-50 text-red-800 hover:bg-red-100",
  positive: "border-sky-600 bg-sky-50 text-sky-800 hover:bg-sky-100",
  success: "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  warning: "border-amber-600 bg-amber-50 text-amber-900 hover:bg-amber-100",
};

export function ControlQualityRatingEditor({
  control,
  userId,
}: Readonly<ControlQualityRatingEditorProps>) {
  const [error, setError] = useState<string | null>(null);
  const [savingRating, setSavingRating] =
    useState<ControlQualityRating | null>(null);

  function saveQualityRating(qualityRating: ControlQualityRating) {
    if (qualityRating === control.qualityRating || savingRating) {
      return;
    }

    setError(null);
    setSavingRating(qualityRating);

    void import("@/features/controls/services/local-control-detail")
      .then((localControlDetailModule) =>
        localControlDetailModule.saveControlQualityRating({
          controlId: control.id,
          qualityRating,
          userId,
        }),
      )
      .catch((error: unknown) => {
        setError(
          error instanceof Error ? error.message : "Etat global non enregistre",
        );
      })
      .finally(() => {
        setSavingRating(null);
      });
  }

  return (
    <section className="surface-panel space-y-3 p-4">
      <h2 className="text-lg font-semibold">Etat global</h2>

      <div
        aria-label="Etat global du controle"
        className="grid grid-cols-2 gap-2"
        role="group"
      >
        {qualityRatingOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = control.qualityRating === option.qualityRating;
          const isSaving = savingRating === option.qualityRating;
          const tone = getControlQualityRatingTone(option.qualityRating);

          return (
            <Button
              aria-pressed={isSelected}
              className={cn(
                "h-auto min-h-14 justify-start whitespace-normal px-3 py-3 text-left",
                isSelected && selectedToneClasses[tone],
              )}
              disabled={!userId || savingRating !== null}
              key={option.qualityRating}
              onClick={() => {
                saveQualityRating(option.qualityRating);
              }}
              type="button"
              variant="outline"
            >
              {isSaving ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Icon aria-hidden="true" className="size-4 shrink-0" />
              )}
              <span>{getControlQualityRatingLabel(option.qualityRating)}</span>
            </Button>
          );
        })}
      </div>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </section>
  );
}
