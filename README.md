# Batiment Control PWA

PWA mobile-first de controle qualite de batiments pour un chef d'equipe proprete.

## Socle technique

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Vitest

## Environnement

Copier `.env.example` vers `.env.local` puis renseigner :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Ne jamais exposer de cle `service_role` cote client.

## Commandes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Regles projet

Les regles permanentes sont decrites dans `AGENTS.md`.
