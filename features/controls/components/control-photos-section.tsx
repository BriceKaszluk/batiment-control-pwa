"use client";

import { Camera, ImageIcon, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  getPhotoUploadStatusLabel,
  maxLocalPhotoSizeBytes,
} from "@/features/controls/services/control-labels";
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
        className="surface-panel space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();

          if (!selectedFile) {
            return;
          }

          setError(null);
          setIsSaving(true);

          void import("@/features/controls/services/local-control-photos")
            .then((localControlPhotosModule) =>
              localControlPhotosModule.saveControlPhoto({
                blob: selectedFile,
                caption,
                controlId,
                fileName: selectedFile.name,
                userId,
              }),
            )
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
          Ajouter une photo
        </Button>

        {selectedFile ? (
          <div className="motion-reveal rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
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
        <div className="motion-list grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <LocalPhotoPreview key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </section>
  );
}

function LocalPhotoPreview({ photo }: Readonly<{ photo: ControlPhoto }>) {
  const photoLabel = photo.caption?.trim() || photo.fileName;
  const [isExpanded, setIsExpanded] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(photo.blob);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo.blob]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  return (
    <article className="surface-card overflow-hidden">
      <button
        aria-label={`Agrandir la photo ${photoLabel}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => {
          if (objectUrl) {
            setIsExpanded(true);
          }
        }}
        type="button"
      >
        {objectUrl ? (
          <Image
            alt={photoLabel}
            className="object-cover transition-transform duration-300 ease-out hover:scale-[1.03]"
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
      </button>
      <div className="space-y-1 p-3">
        <p className="truncate text-sm font-medium">
          {photoLabel}
        </p>
        <p className="text-xs font-medium text-muted-foreground">
          {getPhotoUploadStatusLabel(photo.uploadStatus)}
        </p>
      </div>

      {isExpanded && objectUrl && portalRoot ? createPortal(
        <div
          aria-label="Photo agrandie"
          aria-modal="true"
          className="motion-reveal fixed inset-0 z-50 flex flex-col bg-black text-white"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3 p-3">
            <p className="min-w-0 truncate text-sm font-medium">{photoLabel}</p>
            <Button
              aria-label="Fermer l'apercu photo"
              className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              onClick={() => {
                setIsExpanded(false);
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Image
              alt={photoLabel}
              className="object-contain"
              fill
              sizes="100vw"
              src={objectUrl}
              unoptimized
            />
          </div>
        </div>,
        portalRoot,
      ) : null}
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
