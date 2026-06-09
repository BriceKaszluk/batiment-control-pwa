"use client";

import { Download, Loader2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { LocalControlDetail } from "@/features/controls/services/local-control-detail";

type ControlPdfExportButtonProps = {
  detail: LocalControlDetail;
};

type ShareNavigator = Navigator & {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
};

type PreparedPdf = {
  blob: Blob;
  file: File | null;
  fileName: string;
};

type PdfPreparationStatus = "error" | "preparing" | "ready";

const pdfExportCacheName = "batiment-control-pdf-exports-v3";
const pdfExportPathPrefix = "/pdf-exports/";
const pdfObjectUrlLifetimeMs = 60_000;
const serviceWorkerResponseTimeoutMs = 700;

export function ControlPdfExportButton({
  detail,
}: Readonly<ControlPdfExportButtonProps>) {
  const [preparedPdf, setPreparedPdf] = useState<PreparedPdf | null>(null);
  const [preparationStatus, setPreparationStatus] =
    useState<PdfPreparationStatus>("preparing");
  const [message, setMessage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (detail.control.status !== "completed") {
      return;
    }

    let isCanceled = false;

    setPreparedPdf(null);
    setPreparationStatus("preparing");
    setMessage(null);

    void preparePdf(detail)
      .then((prepared) => {
        if (isCanceled) {
          return;
        }

        setPreparedPdf(prepared);
        setPreparationStatus("ready");
      })
      .catch((error: unknown) => {
        if (isCanceled) {
          return;
        }

        setPreparationStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Preparation PDF impossible.",
        );
      });

    return () => {
      isCanceled = true;
    };
  }, [detail, retryCount]);

  if (detail.control.status !== "completed") {
    return null;
  }

  const canSharePreparedPdf = preparedPdf
    ? canSharePdfFileWithCurrentNavigator(preparedPdf.file)
    : false;
  const isPreparing = preparationStatus === "preparing";
  const isDisabled = isPreparing || isSharing;
  const buttonLabel = getPdfButtonLabel({
    canSharePreparedPdf,
    isPreparing,
    isSharing,
    preparationStatus,
  });

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
        disabled={isDisabled}
        onClick={() => {
          if (preparationStatus === "error") {
            setRetryCount((current) => current + 1);
            return;
          }

          if (!preparedPdf) {
            setMessage("PDF en preparation.");
            return;
          }

          setMessage(null);
          setIsSharing(true);

          void exportPreparedPdf(preparedPdf)
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
              setIsSharing(false);
            });
        }}
        type="button"
      >
        {isPreparing || isSharing ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : canSharePreparedPdf ? (
          <Share2 aria-hidden="true" className="size-4" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
        {buttonLabel}
      </Button>

      {message ? (
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      ) : null}
    </section>
  );
}

async function preparePdf(detail: LocalControlDetail): Promise<PreparedPdf> {
  const { createControlPdfBlob, getControlPdfFileName } = await import(
    "@/features/controls/services/control-pdf-export"
  );
  const blob = await createControlPdfBlob(detail);
  const fileName = getControlPdfFileName(detail);
  const file = createPdfFile(blob, fileName);

  return { blob, file, fileName };
}

async function exportPreparedPdf(preparedPdf: PreparedPdf): Promise<string> {
  const shareResult = await sharePdfFile(preparedPdf);

  if (shareResult) {
    return shareResult;
  }

  const cachedPdfUrl = await createCachedPdfUrl(preparedPdf);

  if (cachedPdfUrl) {
    window.location.assign(cachedPdfUrl);
    return "PDF ouvert.";
  }

  downloadBlob(preparedPdf.blob, preparedPdf.fileName);
  return "PDF telecharge. Regarde les telechargements du telephone.";
}

async function sharePdfFile(preparedPdf: PreparedPdf): Promise<string | null> {
  const shareNavigator = navigator as ShareNavigator;

  if (!preparedPdf.file || !canSharePdfFile(shareNavigator, preparedPdf.file)) {
    return null;
  }

  try {
    await shareNavigator.share?.({
      files: [preparedPdf.file],
      text: "Synthese du controle batiment.",
      title: preparedPdf.fileName,
    });

    return "PDF pret a partager ou enregistrer.";
  } catch (error: unknown) {
    if (isShareCanceled(error)) {
      return "Partage annule.";
    }

    return null;
  }
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
  if (!shareNavigator.share) {
    return false;
  }

  if (!shareNavigator.canShare) {
    return true;
  }

  try {
    return shareNavigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function canSharePdfFileWithCurrentNavigator(file: File | null) {
  if (!file || typeof navigator === "undefined") {
    return false;
  }

  return canSharePdfFile(navigator as ShareNavigator, file);
}

function isShareCanceled(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function createCachedPdfUrl(preparedPdf: PreparedPdf) {
  if (!(await canServePdfFromCache())) {
    return null;
  }

  const cache = await caches.open(pdfExportCacheName);
  const previousExports = await cache.keys();
  const pdfUrl = new URL(
    `${pdfExportPathPrefix}${encodeURIComponent(preparedPdf.fileName)}`,
    window.location.origin,
  );

  pdfUrl.searchParams.set("t", Date.now().toString(36));

  await Promise.all(previousExports.map((request) => cache.delete(request)));
  await cache.put(
    pdfUrl.toString(),
    new Response(preparedPdf.blob, {
      headers: getPdfResponseHeaders(preparedPdf.fileName),
    }),
  );

  return pdfUrl.toString();
}

async function canServePdfFromCache() {
  if (
    typeof window === "undefined" ||
    !("caches" in window) ||
    !("serviceWorker" in navigator) ||
    !navigator.serviceWorker.controller
  ) {
    return false;
  }

  return await askServiceWorkerPdfSupport(navigator.serviceWorker.controller);
}

function askServiceWorkerPdfSupport(controller: ServiceWorker) {
  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timeoutId = window.setTimeout(() => {
      resolve(false);
    }, serviceWorkerResponseTimeoutMs);

    channel.port1.onmessage = (event: MessageEvent) => {
      window.clearTimeout(timeoutId);
      resolve(
        event.data?.type === "PDF_EXPORT_SUPPORT_RESULT" &&
          event.data.supported === true,
      );
    };

    controller.postMessage({ type: "PDF_EXPORT_SUPPORT" }, [channel.port2]);
  });
}

function getPdfResponseHeaders(fileName: string) {
  const safeFileName = fileName.replace(/["\\\r\n;]/g, "_");

  return new Headers({
    "cache-control": "no-store",
    "content-disposition": `inline; filename="${safeFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "content-type": "application/pdf",
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, pdfObjectUrlLifetimeMs);
}

function getPdfButtonLabel({
  canSharePreparedPdf,
  isPreparing,
  isSharing,
  preparationStatus,
}: {
  canSharePreparedPdf: boolean;
  isPreparing: boolean;
  isSharing: boolean;
  preparationStatus: PdfPreparationStatus;
}) {
  if (isPreparing) {
    return "Preparation du PDF...";
  }

  if (isSharing) {
    return "Ouverture du PDF...";
  }

  if (preparationStatus === "error") {
    return "Reessayer l'export PDF";
  }

  return canSharePreparedPdf ? "Partager / enregistrer le PDF" : "Ouvrir le PDF";
}
