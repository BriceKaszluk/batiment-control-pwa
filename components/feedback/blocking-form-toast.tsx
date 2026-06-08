"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

const toastDurationMs = 3_500;

type BlockingFormToastProps = {
  message: string | null;
  onDismiss: () => void;
};

export function BlockingFormToast({
  message,
  onDismiss,
}: Readonly<BlockingFormToastProps>) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, toastDurationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, onDismiss]);

  if (!message) {
    return null;
  }

  return (
    <div
      aria-live="assertive"
      className="motion-toast fixed inset-x-4 bottom-28 z-40 mx-auto max-w-screen-sm rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 shadow-lg shadow-amber-900/10"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-amber-700"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Champ requis</p>
          <p className="text-sm leading-5">{message}</p>
        </div>
        <button
          aria-label="Fermer la notification"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-amber-900 transition-[background-color,transform] duration-200 ease-out hover:bg-amber-100 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
