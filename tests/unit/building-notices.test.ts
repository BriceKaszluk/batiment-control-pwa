import { describe, expect, it } from "vitest";

import { getBuildingNotice } from "@/features/buildings/services/building-notices";

describe("building notices", () => {
  it("returns a notice for saved building edits", () => {
    expect(getBuildingNotice("batiment-enregistre")).toEqual({
      description: "Les modifications ont ete sauvegardees localement.",
      title: "Batiment enregistre",
    });
  });

  it("ignores unknown notice keys", () => {
    expect(getBuildingNotice(null)).toBeNull();
    expect(getBuildingNotice("hors-scope")).toBeNull();
  });
});
