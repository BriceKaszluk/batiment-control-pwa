import { describe, expect, it } from "vitest";

import {
  capitalizeWords,
  capitalizeWordStarts,
} from "@/lib/text/capitalize-words";

describe("capitalize words", () => {
  it("capitalizes word starts and normalizes spaces for saved values", () => {
    expect(capitalizeWords("  residence le roux  ")).toBe("Residence Le Roux");
    expect(capitalizeWords("secteur nord-ouest")).toBe("Secteur Nord-Ouest");
    expect(capitalizeWords("allee d'ormoy")).toBe("Allee D'Ormoy");
  });

  it("keeps typing spaces while capitalizing live input", () => {
    expect(capitalizeWordStarts("jean ")).toBe("Jean ");
    expect(capitalizeWordStarts("jean dupont")).toBe("Jean Dupont");
  });
});
