"use client";

import { CheckCircle2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getControlNotice,
  type ControlNotice,
} from "@/features/controls/services/control-notices";

const noticeParam = "notice";
const toastDurationMs = 4_500;

export function ControlSaveToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<ControlNotice | null>(null);

  useEffect(() => {
    const currentNotice = getControlNotice(searchParams.get(noticeParam));

    if (!currentNotice) {
      return;
    }

    setNotice(currentNotice);

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete(noticeParam);
    const nextQuery = nextSearchParams.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, toastDurationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  if (!notice) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="motion-toast fixed inset-x-4 bottom-28 z-40 mx-auto max-w-screen-sm rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 shadow-lg shadow-emerald-900/10"
      role="status"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-emerald-700"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{notice.title}</p>
          <p className="text-sm leading-5">{notice.description}</p>
        </div>
        <button
          aria-label="Fermer la notification"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-emerald-900 transition-[background-color,transform] duration-200 ease-out hover:bg-emerald-100 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          onClick={() => {
            setNotice(null);
          }}
          type="button"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
