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
    let refreshed = false;

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (canceled) {
        return;
      }

      activateWaitingServiceWorker(registration);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;

        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (canceled || refreshed) {
        return;
      }

      refreshed = true;
      window.location.reload();
    });

    return () => {
      canceled = true;
    };
  }, []);

  return null;
}

function activateWaitingServiceWorker(registration: ServiceWorkerRegistration) {
  if (!registration.waiting) {
    return;
  }

  registration.waiting.postMessage({ type: "SKIP_WAITING" });
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
