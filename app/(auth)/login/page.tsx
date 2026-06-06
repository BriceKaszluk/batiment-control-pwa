import Link from "next/link";

import { LoginForm } from "@/app/(auth)/login/login-form";
import { redirectAuthenticatedUser } from "@/features/auth/session";

type LoginPageProps = {
  searchParams?: Promise<{
    auth?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  await redirectAuthenticatedUser();
  const params = await searchParams;
  const authNotice = getAuthNotice(readFirstParam(params?.auth));

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Batiment Control</p>
          <h1 className="text-3xl font-semibold tracking-normal">Connexion</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Accedez a votre espace personnel de controle terrain.
          </p>
        </div>

        {authNotice ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {authNotice}
          </p>
        ) : null}

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link className="font-medium text-primary" href="/signup">
            Creer un compte
          </Link>
        </p>
      </section>
    </main>
  );
}

function getAuthNotice(value: string | null): string | null {
  if (value === "confirmation-error") {
    return "Lien de confirmation invalide ou expire. Reessayez de vous inscrire ou contactez le support.";
  }

  if (value === "missing-config") {
    return "Configuration Supabase manquante.";
  }

  return null;
}

function readFirstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
