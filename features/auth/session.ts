import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AppAuthState = {
  isConfigured: boolean;
  userEmail: string | null;
};

export async function getAppAuthState(): Promise<AppAuthState> {
  if (!isSupabaseConfigured()) {
    return {
      isConfigured: false,
      userEmail: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return {
    isConfigured: true,
    userEmail: user.email ?? null,
  };
}

export async function redirectAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }
}
