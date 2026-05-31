import { LoginForm } from "@/app/(auth)/login/login-form";
import { redirectAuthenticatedUser } from "@/features/auth/session";

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-8">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Batiment Control</p>
          <h1 className="text-3xl font-semibold tracking-normal">Connexion</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Acces equipe reserve aux controles terrain.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
