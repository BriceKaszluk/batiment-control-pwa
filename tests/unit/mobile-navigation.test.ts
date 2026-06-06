import { describe, expect, it } from "vitest";

import {
  getCurrentNavigationItem,
  isNavigationItemActive,
  navigationItems,
} from "@/components/layout/navigation-items";

describe("mobile navigation", () => {
  it("defines the terrain navigation entries", () => {
    expect(navigationItems.map((item) => item.href)).toEqual([
      "/dashboard",
      "/batiments",
      "/agents",
      "/controles",
      "/reprises",
      "/historique",
      "/parametres",
    ]);
  });

  it("matches nested routes without matching partial siblings", () => {
    expect(isNavigationItemActive("/batiments/controle-a", "/batiments")).toBe(
      true,
    );
    expect(isNavigationItemActive("/batiments-archives", "/batiments")).toBe(
      false,
    );
  });

  it("falls back to the dashboard entry for unknown routes", () => {
    expect(getCurrentNavigationItem("/inconnu").href).toBe("/dashboard");
  });
});
