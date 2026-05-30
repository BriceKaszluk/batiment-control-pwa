# Instructions projet

Tu développes une PWA mobile-first de contrôle qualité de bâtiments pour un chef d’équipe propreté.

## Objectif de l’application

L’application doit permettre de :
- gérer une liste de bâtiments
- voir les bâtiments à contrôler en priorité
- réaliser un contrôle terrain avec checklist
- ajouter des commentaires
- ajouter des photos
- créer des reprises à faire
- consulter l’historique des contrôles
- fonctionner hors ligne
- synchroniser automatiquement avec Supabase quand la connexion revient

## Stack technique

Utiliser :
- Next.js App Router
- TypeScript strict
- React
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Dexie.js pour IndexedDB
- Zod
- TanStack Query
- Workbox / Service Worker pour la PWA
- Vitest pour les tests unitaires

## Règles générales

- TypeScript strict obligatoire.
- Ne jamais utiliser `any` sauf justification claire.
- Ne jamais ajouter une dépendance sans expliquer pourquoi.
- Ne jamais stocker de secrets dans le code.
- Ne jamais utiliser la clé Supabase `service_role` côté client.
- Ne jamais désactiver Row Level Security pour aller plus vite.
- Ne jamais créer de fonctionnalité hors scope sans validation.
- Ne jamais continuer vers l’étape suivante sans validation utilisateur.
- Ne jamais considérer une étape terminée si lint, typecheck, tests ou build échouent.

## Règles offline-first

- L’application doit être offline-first.
- Toute action terrain doit être sauvegardée localement dans IndexedDB via Dexie avant toute synchronisation distante.
- Aucune mutation terrain directe vers Supabase depuis l’UI.
- Toute mutation synchronisable doit créer une opération dans l’outbox locale.
- Supabase est la source synchronisée, mais jamais la première sauvegarde d’une action terrain.
- L’utilisateur doit pouvoir créer un contrôle complet sans connexion.
- Les données locales ne doivent jamais être supprimées tant que la synchronisation distante n’est pas confirmée.
- Les statuts de synchronisation doivent être visibles : `pending`, `processing`, `synced`, `error`.
- Prévoir un bouton manuel “Synchroniser maintenant”.
- Écouter les événements `online` et `offline`.

## Identifiants et synchronisation

- Utiliser des UUID générés côté client pour les entités synchronisées.
- Éviter les mappings fragiles `local_id` vers `server_id`.
- Chaque opération outbox doit être idempotente.
- Prévoir `created_at`, `updated_at` et si utile `deleted_at`.
- Pour le MVP, utiliser une stratégie simple de conflit : la version avec le `updated_at` le plus récent gagne.
- En cas de conflit ou d’erreur critique, marquer l’élément en erreur et ne pas perdre la donnée locale.

## Supabase et sécurité

- Utiliser Supabase Auth pour l’authentification.
- Utiliser Supabase PostgreSQL comme base distante.
- Utiliser Supabase Storage pour les photos.
- Activer Row Level Security sur toutes les tables exposées.
- Les policies RLS doivent empêcher un utilisateur d’accéder aux données d’une autre organisation.
- Aucune clé `service_role` ne doit être présente côté client.
- Les uploads photo doivent être limités en taille.
- Autoriser uniquement les formats image nécessaires : jpg, jpeg, png, webp.
- Les données doivent être validées avec Zod avant écriture.

## Photos

- Les photos doivent être stockées localement avant upload.
- Les photos doivent pouvoir être affichées même hors ligne.
- L’upload vers Supabase Storage doit passer par la file de synchronisation.
- Une erreur d’upload ne doit jamais supprimer la photo locale.
- Compresser les images côté client si nécessaire.

## UX mobile terrain

- Interface mobile-first.
- L’app doit être utilisable sur téléphone, sur le terrain.
- Gros boutons.
- Navigation simple.
- Peu de champs obligatoires.
- Pas plus de 2 ou 3 taps pour démarrer un contrôle.
- Afficher clairement l’état réseau : en ligne / hors ligne.
- Afficher clairement le nombre d’éléments en attente de synchronisation.
- Prévoir les états loading, empty et error.
- Éviter les formulaires longs et lourds.

## Architecture recommandée

Utiliser une structure proche de celle-ci :

```txt
app/
  (auth)/
  (app)/
    batiments/
    controles/
    reprises/
    historique/
    parametres/
  layout.tsx
  page.tsx

components/
  ui/
  layout/
  feedback/

features/
  buildings/
    components/
    hooks/
    services/
  controls/
    components/
    hooks/
    services/
  corrective-actions/
  history/
  sync/
    components/
    services/

lib/
  db/
    dexie.ts
    schema.ts
    repositories/
  supabase/
    client.ts
    server.ts
    middleware.ts
  sync/
    outbox.ts
    sync-engine.ts
    conflicts.ts
  validation/
    schemas.ts
  utils/

types/
  domain.ts
  sync.ts

supabase/
  migrations/
  seed.sql

tests/
  unit/