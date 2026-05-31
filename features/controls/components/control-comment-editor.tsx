"use client";

import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { saveControlComment } from "@/features/controls/services/local-control-detail";
import type { Control } from "@/types/domain";

type ControlCommentEditorProps = {
  control: Control;
  userId: string | null;
};

export function ControlCommentEditor({
  control,
  userId,
}: Readonly<ControlCommentEditorProps>) {
  const [comment, setComment] = useState(control.generalComment ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savedComment = control.generalComment ?? "";
  const hasChanged = comment.trim() !== savedComment;

  useEffect(() => {
    setComment(control.generalComment ?? "");
  }, [control.id, control.generalComment]);

  return (
    <section className="space-y-3 rounded-md border bg-background p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Commentaire general</h2>
      </div>

      <label className="block space-y-2 text-sm font-medium">
        <span>Note terrain</span>
        <textarea
          className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-base font-normal leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          maxLength={3000}
          onChange={(event) => {
            setComment(event.target.value);
          }}
          placeholder="Observation generale"
          value={comment}
        />
      </label>

      <Button
        className="h-11 w-full"
        disabled={!userId || isSaving || !hasChanged}
        onClick={() => {
          setError(null);
          setIsSaving(true);

          void saveControlComment({
            comment,
            controlId: control.id,
            userId,
          })
            .catch((error: unknown) => {
              setError(
                error instanceof Error
                  ? error.message
                  : "Commentaire non enregistre",
              );
            })
            .finally(() => {
              setIsSaving(false);
            });
        }}
        type="button"
      >
        {isSaving ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Save aria-hidden="true" className="size-4" />
        )}
        Enregistrer
      </Button>

      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
    </section>
  );
}
