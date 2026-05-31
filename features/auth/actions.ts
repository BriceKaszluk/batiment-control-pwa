"use server";

import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type LoginFormState = {
  message: string | null;
  status: "idle" | "error";
};

export const initialLoginFormState: LoginFormState = {
  message: null,
  status: "idle",
};

export async function signInWithPassword(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");

  if (!email || !password) {
    return {
      message: "Email et mot de passe requis.",
      status: "error",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      message: "Configuration Supabase manquante.",
      status: "error",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      message: "Connexion impossible avec ces identifiants.",
      status: "error",
    };
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

function readRequiredString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}
