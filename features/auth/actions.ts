"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { loginFormSchema, signUpFormSchema } from "@/features/auth/auth-schemas";
import type { LoginFormState } from "@/features/auth/login-form-state";
import {
  createAuthConfirmUrl,
  getRequestOrigin,
} from "@/features/auth/redirect-url";
import type { SignUpFormState } from "@/features/auth/signup-form-state";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsedInput = loginFormSchema.safeParse({
    email: readFormString(formData, "email"),
    password: readFormString(formData, "password"),
  });

  if (!parsedInput.success) {
    return {
      message: getFirstIssueMessage(parsedInput.error, "Email et mot de passe requis."),
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
    email: parsedInput.data.email,
    password: parsedInput.data.password,
  });

  if (error) {
    return {
      message: "Connexion impossible avec ces identifiants.",
      status: "error",
    };
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(
  _previousState: SignUpFormState,
  formData: FormData,
): Promise<SignUpFormState> {
  const parsedInput = signUpFormSchema.safeParse({
    email: readFormString(formData, "email"),
    password: readFormString(formData, "password"),
    passwordConfirmation: readFormString(formData, "passwordConfirmation"),
  });

  if (!parsedInput.success) {
    return {
      message: getFirstIssueMessage(parsedInput.error, "Inscription invalide."),
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
  const { data, error } = await supabase.auth.signUp({
    email: parsedInput.data.email,
    options: {
      emailRedirectTo: await createEmailConfirmationUrl(),
    },
    password: parsedInput.data.password,
  });

  if (error) {
    return {
      message: "Creation de compte impossible pour le moment.",
      status: "error",
    };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    message:
      "Compte cree. Verifiez votre email pour confirmer votre inscription, puis connectez-vous.",
    status: "success",
  };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

async function createEmailConfirmationUrl(): Promise<string> {
  const headerStore = await headers();

  return createAuthConfirmUrl(getRequestOrigin(headerStore), "/dashboard");
}

function getFirstIssueMessage(
  error: { issues: Array<{ message: string }> },
  fallback: string,
): string {
  return error.issues[0]?.message ?? fallback;
}

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value;
}
