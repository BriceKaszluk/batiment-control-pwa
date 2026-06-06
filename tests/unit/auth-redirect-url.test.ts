import { describe, expect, it } from "vitest";

import {
  createAuthConfirmUrl,
  getRequestOrigin,
  sanitizeAuthNextPath,
} from "@/features/auth/redirect-url";

describe("auth redirect urls", () => {
  it("creates an internal confirmation URL with a sanitized next path", () => {
    expect(
      createAuthConfirmUrl("https://batiment-control-pwa.vercel.app", "/batiments"),
    ).toBe(
      "https://batiment-control-pwa.vercel.app/auth/confirm?next=%2Fbatiments",
    );
  });

  it("rejects external next redirects", () => {
    expect(sanitizeAuthNextPath("https://example.com")).toBe("/dashboard");
    expect(sanitizeAuthNextPath("//example.com/path")).toBe("/dashboard");
  });

  it("prefers request origin and falls back to forwarded host", () => {
    expect(
      getRequestOrigin({
        get(name) {
          return name === "origin" ? "http://localhost:3000" : null;
        },
      }),
    ).toBe("http://localhost:3000");

    expect(
      getRequestOrigin({
        get(name) {
          const headers: Record<string, string> = {
            "x-forwarded-host": "batiment-control-pwa.vercel.app",
            "x-forwarded-proto": "https",
          };

          return headers[name] ?? null;
        },
      }),
    ).toBe("https://batiment-control-pwa.vercel.app");
  });
});
