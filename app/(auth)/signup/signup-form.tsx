"use client";

import { useActionState, useCallback, useState } from "react";
import type { InvalidEvent } from "react";
import { useFormStatus } from "react-dom";

import { BlockingFormToast } from "@/components/feedback/blocking-form-toast";
import { signUpWithPassword } from "@/features/auth/actions";
import { initialSignUpFormState } from "@/features/auth/signup-form-state";
import { getNativeInputValidationMessage } from "@/lib/forms/validation-feedback";

export function SignUpForm() {
  const [state, formAction] = useActionState(
    signUpWithPassword,
    initialSignUpFormState,
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
          autoComplete="new-password"
          className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          id="password"
          minLength={8}
          name="password"
          onInput={dismissBlockingToast}
          onInvalid={(event) => {
            handleInvalidInput("Mot de passe", event);
          }}
          required
          type="password"
        />
        <p className="text-xs leading-5 text-muted-foreground">
          8 caracteres minimum.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="passwordConfirmation">
          Confirmer le mot de passe
        </label>
        <input
          autoComplete="new-password"
          className="h-12 w-full rounded-md border bg-background px-3 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          id="passwordConfirmation"
          minLength={8}
          name="passwordConfirmation"
          onInput={dismissBlockingToast}
          onInvalid={(event) => {
            handleInvalidInput("Confirmation du mot de passe", event);
          }}
          required
          type="password"
        />
      </div>

      {state.status === "error" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
          {state.message}
        </p>
      ) : null}

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
      {pending ? "Creation..." : "Creer le compte"}
    </button>
  );
}
