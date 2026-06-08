"use client";

import { useActionState, useCallback, useState } from "react";
import type { InvalidEvent } from "react";
import { useFormStatus } from "react-dom";

import { BlockingFormToast } from "@/components/feedback/blocking-form-toast";
import { signInWithPassword } from "@/features/auth/actions";
import { initialLoginFormState } from "@/features/auth/login-form-state";
import { getNativeInputValidationMessage } from "@/lib/forms/validation-feedback";

export function LoginForm() {
  const [state, formAction] = useActionState(
    signInWithPassword,
    initialLoginFormState,
  );
  const [blockingToastMessage, setBlockingToastMessage] = useState<
    string | null
  >(null);

  const dismissBlockingToast = useCallback(() => {
    setBlockingToastMessage(null);
  }, []);

  function handleInvalidInput(
    label: string,
    event: InvalidEvent<HTMLInputElement>,
  ) {
    event.preventDefault();
    setBlockingToastMessage(
      getNativeInputValidationMessage(label, event.currentTarget),
    );
    event.currentTarget.focus();
  }

  return (
    <form action={formAction} className="space-y-4">
      <BlockingFormToast
        message={blockingToastMessage}
        onDismiss={dismissBlockingToast}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          autoComplete="email"
          className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          id="email"
          name="email"
          onInput={dismissBlockingToast}
          onInvalid={(event) => {
            handleInvalidInput("Email", event);
          }}
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
          onInput={dismissBlockingToast}
          onInvalid={(event) => {
            handleInvalidInput("Mot de passe", event);
          }}
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
      className="h-12 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:scale-100 disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? "Connexion..." : "Se connecter"}
    </button>
  );
}
