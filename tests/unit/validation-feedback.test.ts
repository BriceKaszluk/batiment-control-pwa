import { describe, expect, it } from "vitest";

import { getBlockingFormMessage } from "@/lib/forms/validation-feedback";

describe("validation feedback", () => {
  it("returns the first mapped field message", () => {
    const message = getBlockingFormMessage({
      fallback: "Champs invalides.",
      fieldErrors: {
        name: "String must contain at least 1 character(s)",
        sector: "String must contain at least 1 character(s)",
      },
      fieldMessages: {
        name: "Le nom du batiment est requis.",
      },
    });

    expect(message).toBe("Le nom du batiment est requis.");
  });

  it("returns the fallback when no field is invalid", () => {
    const message = getBlockingFormMessage({
      fallback: "Champs invalides.",
      fieldErrors: {},
    });

    expect(message).toBe("Champs invalides.");
  });
});
