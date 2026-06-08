import { describe, expect, it } from "vitest";

import { getControlNotice } from "@/features/controls/services/control-notices";

describe("control notices", () => {
  it("returns a notice for completed controls", () => {
    expect(getControlNotice("controle-termine")).toEqual({
      description:
        "Il reste disponible dans Controles aujourd'hui. A partir de demain, tu le retrouveras dans Historique.",
      title: "Controle enregistre",
    });
  });

  it("ignores unknown notice keys", () => {
    expect(getControlNotice(null)).toBeNull();
    expect(getControlNotice("hors-scope")).toBeNull();
  });
});
