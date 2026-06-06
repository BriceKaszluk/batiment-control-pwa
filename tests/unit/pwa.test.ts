import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

const projectRoot = process.cwd();

describe("PWA foundation", () => {
  it("declares an installable manifest for the field app", () => {
    const appManifest = manifest();

    expect(appManifest).toMatchObject({
      display: "standalone",
      id: "/",
      name: "Batiment Control",
      orientation: "portrait",
      scope: "/",
      short_name: "Batiment",
      start_url: "/dashboard",
      theme_color: "#12715d",
    });
    expect(appManifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          purpose: "any",
          sizes: "192x192",
          src: "/icons/icon-192.png",
          type: "image/png",
        }),
        expect.objectContaining({
          purpose: "any",
          sizes: "512x512",
          src: "/icons/icon-512.png",
          type: "image/png",
        }),
        expect.objectContaining({
          purpose: "maskable",
          sizes: "512x512",
          src: "/icons/maskable-icon-512.png",
          type: "image/png",
        }),
      ]),
    );
  });

  it("keeps the service worker scoped to same-origin GET requests", async () => {
    const serviceWorker = await readFile(
      path.join(projectRoot, "public", "sw.js"),
      "utf8",
    );

    expect(serviceWorker).toContain('request.method !== "GET"');
    expect(serviceWorker).toContain("url.origin !== self.location.origin");
    expect(serviceWorker).toContain("networkFirst(request, \"/dashboard\")");
    expect(serviceWorker).toContain("staleWhileRevalidate(request)");
    expect(serviceWorker).toContain("/apple-touch-icon.png");
    expect(serviceWorker).toContain("/icons/icon-192.png");
    expect(serviceWorker).toContain("/icons/icon-512.png");
    expect(serviceWorker).toContain("/icons/maskable-icon-512.png");
  });

  it("keeps installability assets public at the middleware layer", async () => {
    const middleware = await readFile(
      path.join(projectRoot, "middleware.ts"),
      "utf8",
    );

    expect(middleware).toContain("manifest.webmanifest");
    expect(middleware).toContain("sw.js");
  });

  it("cleans stale PWA registrations and caches during development", async () => {
    const serviceWorkerRegister = await readFile(
      path.join(projectRoot, "components/pwa/service-worker-register.tsx"),
      "utf8",
    );

    expect(serviceWorkerRegister).toContain(
      "process.env.NODE_ENV !== \"production\"",
    );
    expect(serviceWorkerRegister).toContain(
      "navigator.serviceWorker.getRegistrations()",
    );
    expect(serviceWorkerRegister).toContain(
      'cacheName.startsWith("batiment-control-")',
    );
  });
});
