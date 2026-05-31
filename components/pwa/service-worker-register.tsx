"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let canceled = false;

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (canceled || !registration.waiting) {
        return;
      }

      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    });

    return () => {
      canceled = true;
    };
  }, []);

  return null;
}
