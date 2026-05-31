import { describe, expect, it } from "vitest";

import {
  getSupabasePublicConfig,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

describe("supabase public config", () => {
  it("is not configured when public values are missing", () => {
    expect(getSupabasePublicConfig({})).toBeNull();
    expect(isSupabaseConfigured({})).toBe(false);
  });

  it("is not configured with placeholder values", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "your-supabase-publishable-key",
      NEXT_PUBLIC_SUPABASE_URL: "your-supabase-project-url",
    };

    expect(getSupabasePublicConfig(env)).toBeNull();
    expect(isSupabaseConfigured(env)).toBe(false);
  });

  it("returns only the public Supabase config", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
    };

    expect(getSupabasePublicConfig(env)).toEqual({
      publishableKey: "sb_publishable_example",
      url: "https://project.supabase.co",
    });
    expect(isSupabaseConfigured(env)).toBe(true);
  });
});
