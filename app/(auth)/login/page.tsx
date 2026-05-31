import { Button } from "@/components/ui/button";

export default function LoginPage() {
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

        <Button className="h-12 w-full" disabled>
          Connexion a configurer
        </Button>
      </section>
    </main>
  );
}
