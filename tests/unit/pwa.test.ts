import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

const projectRoot = process.cwd();

describe("PWA foundation", () => {
  it("declares an installable manifest for the field app", () => {
    expect(manifest()).toMatchObject({
      display: "standalone",
      name: "Batiment Control",
      orientation: "portrait",
      scope: "/",
      short_name: "Batiment",
      start_url: "/dashboard",
      theme_color: "#12715d",
    });
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
  });
});
