"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void cleanupDevelopmentPwaState();
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

async function cleanupDevelopmentPwaState() {
  const registrations = await navigator.serviceWorker.getRegistrations();

  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  );

  if (!("caches" in window)) {
    return;
  }

  const cacheNames = await caches.keys();
  const appCacheNames = cacheNames.filter((cacheName) =>
    cacheName.startsWith("batiment-control-"),
  );

  await Promise.all(appCacheNames.map((cacheName) => caches.delete(cacheName)));
}
