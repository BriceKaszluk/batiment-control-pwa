import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

type PackageJson = {
  dependencies?: Record<string, string>;
};

describe("TanStack Query provider", () => {
  it("keeps TanStack Query declared as an application dependency", async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, "package.json"), "utf8"),
    ) as PackageJson;

    expect(packageJson.dependencies).toHaveProperty("@tanstack/react-query");
  });

  it("keeps conservative query defaults ready for future remote query screens", async () => {
    const provider = await readFile(
      path.join(projectRoot, "components", "providers", "query-provider.tsx"),
      "utf8",
    );

    expect(provider).toContain("QueryClientProvider");
    expect(provider).toContain("refetchOnReconnect: true");
    expect(provider).toContain("refetchOnWindowFocus: false");
  });

  it("does not mount TanStack Query globally before query screens need it", async () => {
    const rootLayout = await readFile(
      path.join(projectRoot, "app", "layout.tsx"),
      "utf8",
    );

    expect(rootLayout).not.toContain("QueryProvider");
  });
});
