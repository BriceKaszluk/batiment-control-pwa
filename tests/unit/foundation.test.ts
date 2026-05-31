import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("foundation", () => {
  it("merges Tailwind classes predictably", () => {
    expect(cn("px-2 text-sm", "px-4")).toBe("text-sm px-4");
  });
});
