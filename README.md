# Batiment Control PWA

PWA mobile-first de controle qualite de batiments pour un chef d'equipe proprete.

## Socle technique

- Next.js App Router
- TypeScript strict
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase PostgreSQL et Storage
- Dexie.js pour IndexedDB
- Zod
- Vitest

## Etat du MVP

Le MVP actuel couvre :

- consultation des batiments prioritaires depuis la base locale
- demarrage local d'un controle terrain
- checklist avec commentaires sauvegardes dans IndexedDB
- commentaire general de controle
- photos stockees localement, puis uploadables vers Supabase Storage par synchronisation
- reprises locales avec suivi de statut
- cloture locale d'un controle et historique
- PWA avec service worker
- synchronisation automatique au retour en ligne
- page Parametres avec diagnostics locaux et files de synchronisation

## Regles offline-first

Toute action terrain est sauvegardee localement avant toute tentative distante.

- Les donnees metier passent par Dexie.
- Les mutations synchronisables creent une operation outbox locale.
- Les photos restent dans IndexedDB tant que l'upload Storage n'est pas confirme.
- Les erreurs de synchronisation ne suppriment pas les donnees locales.
- La synchronisation distante utilise uniquement la cle publique Supabase cote client.

## Environnement

Copier `.env.example` vers `.env.local` puis renseigner :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Ne jamais exposer de cle `service_role` cote client.

## Supabase

Le schema initial est dans :

```bash
supabase/migrations/20260531030000_initial_quality_schema.sql
```

Il cree les tables metier, active et force RLS sur les tables publiques, cree le bucket prive `control-photos`, et ajoute les policies Storage necessaires aux membres d'organisation.

## Commandes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Une etape n'est consideree terminee que si ces quatre commandes passent.

## Regles projet

Les regles permanentes sont decrites dans `AGENTS.md`.
