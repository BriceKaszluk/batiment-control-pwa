"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  initialLoginFormState,
  signInWithPassword,
} from "@/features/auth/actions";

export function LoginForm() {
  const [state, formAction] = useActionState(
    signInWithPassword,
    initialLoginFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          id="email"
          name="email"
          required
          type="email"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Mot de passe
        </label>
        <input
          autoComplete="current-password"
          className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      {state.status === "error" && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="h-12 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Connexion..." : "Se connecter"}
    </button>
  );
}
