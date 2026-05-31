"use client";

import { Camera, ImageIcon, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getPhotoUploadStatusLabel,
  maxLocalPhotoSizeBytes,
  saveControlPhoto,
} from "@/features/controls/services/local-control-photos";
import type { ControlPhoto } from "@/types/domain";

type ControlPhotosSectionProps = {
  controlId: string;
  photos: ControlPhoto[];
  userId: string | null;
};

export function ControlPhotosSection({
  controlId,
  photos,
  userId,
}: Readonly<ControlPhotosSectionProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const canSubmit = Boolean(selectedFile) && Boolean(userId) && !isSaving;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Photos</h2>
      </div>

      <form
        className="space-y-3 rounded-md border bg-background p-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();

          if (!selectedFile) {
            return;
          }

          setError(null);
          setIsSaving(true);

          void saveControlPhoto({
            blob: selectedFile,
            caption,
            controlId,
            fileName: selectedFile.name,
            userId,
          })
            .then(() => {
              setCaption("");
              setSelectedFile(null);

              if (inputRef.current) {
                inputRef.current.value = "";
              }
            })
            .catch((error: unknown) => {
              setError(
                error instanceof Error ? error.message : "Photo non enregistree",
              );
            })
            .finally(() => {
              setIsSaving(false);
            });
        }}
      >
        <input
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            setError(null);
            setSelectedFile(event.target.files?.[0] ?? null);
          }}
          ref={inputRef}
          type="file"
        />

        <Button
          className="h-12 w-full"
          disabled={!userId || isSaving}
          onClick={() => {
            inputRef.current?.click();
          }}
          type="button"
          variant="outline"
        >
          <Camera aria-hidden="true" className="size-5" />
          Choisir une photo
        </Button>

        {selectedFile ? (
          <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            <p className="truncate font-medium text-foreground">
              {selectedFile.name}
            </p>
            <p>
              {formatBytes(selectedFile.size)} /{" "}
              {formatBytes(maxLocalPhotoSizeBytes)} max
            </p>
          </div>
        ) : null}

        <label className="block space-y-2 text-sm font-medium">
          <span>Legende</span>
          <input
            className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            maxLength={500}
            onChange={(event) => {
              setCaption(event.target.value);
            }}
            placeholder="Ex: Hall entree"
            value={caption}
          />
        </label>

        <Button className="h-11 w-full" disabled={!canSubmit} type="submit">
          {isSaving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <ImageIcon aria-hidden="true" className="size-4" />
          )}
          Enregistrer localement
        </Button>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
      </form>

      {photos.length === 0 ? (
        <div className="flex min-h-24 items-center justify-center rounded-md border bg-muted px-4 text-center text-sm text-muted-foreground">
          Aucune photo locale
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <LocalPhotoPreview key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </section>
  );
}

function LocalPhotoPreview({ photo }: Readonly<{ photo: ControlPhoto }>) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(photo.blob);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo.blob]);

  return (
    <article className="overflow-hidden rounded-md border bg-background shadow-sm">
      <div className="relative aspect-[4/3] bg-muted">
        {objectUrl ? (
          <Image
            alt={photo.caption ?? photo.fileName}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 50vw, 320px"
            src={objectUrl}
            unoptimized
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <ImageIcon aria-hidden="true" className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium">
          {photo.caption ?? photo.fileName}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {getPhotoUploadStatusLabel(photo.uploadStatus)}
        </p>
      </div>
    </article>
  );
}

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  if (megabytes >= 1) {
    return `${megabytes.toFixed(1)} Mo`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}
