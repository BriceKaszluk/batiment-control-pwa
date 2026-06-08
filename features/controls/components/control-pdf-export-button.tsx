"use client";

import { Download, Loader2, Share2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { LocalControlDetail } from "@/features/controls/services/local-control-detail";

type ControlPdfExportButtonProps = {
  detail: LocalControlDetail;
};

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

const pdfObjectUrlLifetimeMs = 60_000;

export function ControlPdfExportButton({
  detail,
}: Readonly<ControlPdfExportButtonProps>) {
  const [message, setMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (detail.control.status !== "completed") {
    return null;
  }

  return (
    <section className="surface-panel space-y-3 p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Share2 aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold">Synthese PDF</h2>
          <p className="text-sm leading-5 text-muted-foreground">
            Rapport complet du controle termine, avec observations et photos.
          </p>
        </div>
      </div>

      <Button
        className="h-12 w-full"
        disabled={isExporting}
        onClick={() => {
          setMessage(null);
          setIsExporting(true);

          void exportPdf(detail)
            .then((result) => {
              setMessage(result);
            })
            .catch((error: unknown) => {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Export PDF impossible.",
              );
            })
            .finally(() => {
              setIsExporting(false);
            });
        }}
        type="button"
      >
        {isExporting ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
        {isExporting ? "Preparation du PDF..." : "Exporter PDF"}
      </Button>

      {message ? (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}

async function exportPdf(detail: LocalControlDetail) {
  const { createControlPdfBlob, getControlPdfFileName } = await import(
    "@/features/controls/services/control-pdf-export"
  );
  const blob = await createControlPdfBlob(detail);
  const fileName = getControlPdfFileName(detail);
  const shareNavigator = navigator as ShareNavigator;
  const file = createPdfFile(blob, fileName);

  if (file && canSharePdfFile(shareNavigator, file)) {
    try {
      await shareNavigator.share({
        files: [file],
        text: "Synthese du controle batiment.",
        title: fileName,
      });

      return "PDF pret a partager ou enregistrer.";
    } catch (error: unknown) {
      if (isShareCanceled(error)) {
        return "Partage annule.";
      }
    }
  }

  downloadBlob(blob, fileName);
  return "PDF ouvert ou telecharge. Sur mobile, regarde aussi les telechargements.";
}

function createPdfFile(blob: Blob, fileName: string) {
  if (typeof File === "undefined") {
    return null;
  }

  return new File([blob], fileName, {
    lastModified: Date.now(),
    type: "application/pdf",
  });
}

function canSharePdfFile(shareNavigator: ShareNavigator, file: File) {
  if (!shareNavigator.share || !shareNavigator.canShare) {
    return false;
  }

  try {
    return shareNavigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function isShareCanceled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  link.target = "_blank";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, pdfObjectUrlLifetimeMs);
}
