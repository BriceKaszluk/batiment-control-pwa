/* global self, caches, clients */

const CACHE_VERSION = "v3";
const APP_SHELL_CACHE = `batiment-control-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `batiment-control-runtime-${CACHE_VERSION}`;
const PDF_EXPORT_CACHE = `batiment-control-pdf-exports-${CACHE_VERSION}`;
const APP_SHELL_URLS = [
  "/",
  "/dashboard",
  "/login",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
  "/icons/maskable-icon-512.png",
  "/icons/maskable-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("batiment-control-") &&
                cacheName !== APP_SHELL_CACHE &&
                cacheName !== RUNTIME_CACHE &&
                cacheName !== PDF_EXPORT_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "PDF_EXPORT_SUPPORT") {
    event.ports[0]?.postMessage({
      supported: true,
      type: "PDF_EXPORT_SUPPORT_RESULT",
    });
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/pdf-exports/")) {
    event.respondWith(pdfExportFromCache(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/dashboard"));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

async function pdfExportFromCache(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  return new Response("PDF temporaire indisponible. Relance l'export depuis l'app.", {
    headers: { "content-type": "text/plain; charset=utf-8" },
    status: 404,
  });
}

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (fallbackUrl) {
      const fallbackResponse =
        (await cache.match(fallbackUrl)) ||
        (await caches.match(fallbackUrl)) ||
        (await caches.match("/"));

      if (fallbackResponse) {
        return fallbackResponse;
      }
    }

    return new Response("Application hors ligne", {
      headers: { "content-type": "text/plain; charset=utf-8" },
      status: 503,
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  const networkResponsePromise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });

  return cachedResponse || networkResponsePromise;
}
