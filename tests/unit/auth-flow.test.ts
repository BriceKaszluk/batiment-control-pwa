import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

describe("auth flow", () => {
  it("keeps signup as a public auth route", async () => {
    const middleware = await readFile(
      path.join(projectRoot, "lib", "supabase", "middleware.ts"),
      "utf8",
    );

    expect(middleware).toContain('"/signup"');
    expect(middleware).toContain('pathname === "/signup"');
  });

  it("exposes signup links from the login screen", async () => {
    const loginPage = await readFile(
      path.join(projectRoot, "app", "(auth)", "login", "page.tsx"),
      "utf8",
    );

    expect(loginPage).toContain('href="/signup"');
    expect(loginPage).toContain("Creer un compte");
  });

  it("uses Supabase signup with an email confirmation callback", async () => {
    const actions = await readFile(
      path.join(projectRoot, "features", "auth", "actions.ts"),
      "utf8",
    );
    const confirmRoute = await readFile(
      path.join(projectRoot, "app", "auth", "confirm", "route.ts"),
      "utf8",
    );

    expect(actions).toContain("supabase.auth.signUp");
    expect(actions).toContain("emailRedirectTo");
    expect(confirmRoute).toContain("verifyOtp");
    expect(confirmRoute).toContain("exchangeCodeForSession");
  });
});
