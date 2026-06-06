import Link from "next/link";

import { SignUpForm } from "@/app/(auth)/signup/signup-form";
import { redirectAuthenticatedUser } from "@/features/auth/session";

export default async function SignUpPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Batiment Control</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Creer un compte
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Creez votre espace personnel pour gerer vos batiments et controles.
          </p>
        </div>

        <SignUpForm />

        <p className="text-center text-sm text-muted-foreground">
          Deja un compte ?{" "}
          <Link className="font-medium text-primary" href="/login">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  );
}
