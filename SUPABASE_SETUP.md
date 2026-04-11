# Configuration Supabase

## Vite + React (ce dépôt)

Ce projet **n’utilise pas Next.js** : inutile d’installer `@supabase/ssr`, ni de créer `middleware.ts` / cookies serveur. Le client navigateur est dans `src/lib/supabaseClient.js` ; les variables doivent être préfixées par **`VITE_`** (pas `NEXT_PUBLIC_`).

Créez un fichier **`.env.local`** à la racine (déjà ignoré par git via `*.local`) ou copiez depuis `.env.example`, puis `npm run dev`.

## 1. Projet et clés

1. Créez un projet sur [Supabase](https://supabase.com/).
2. Dans **Project Settings → API**, copiez **Project URL** et la clé publique (JWT **anon** ou clé **publishable** selon le tableau de bord) :

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` **ou** `VITE_SUPABASE_PUBLISHABLE_KEY` (une seule des deux)

## 2. Table `contributions`

Si vous voyez **`Could not find the table 'public.contributions' in the schema cache`**, la table n’existe pas encore dans **ce** projet Supabase : il faut lancer le script SQL ci-dessous.

**Fichier prêt à l’emploi** : [`supabase/sql/001_create_contributions.sql`](./supabase/sql/001_create_contributions.sql) — copiez tout le contenu.

Dans le dashboard Supabase : **SQL Editor** → **New query** → collez le script → **Run**.

Version raccourcie (équivalente) :

```sql
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  layer smallint not null check (layer in (1, 2)),
  cell_span smallint not null default 1,
  x double precision not null,
  y double precision not null,
  width double precision not null,
  height double precision not null,
  rotation double precision not null default 0,
  mask_type text not null default 'rect',
  image_url text not null,
  price_cents int not null,
  status text not null default 'pending',
  contributor_name text,
  contributor_email text,
  created_at timestamptz not null default now()
);

create index contributions_created_at_idx on public.contributions (created_at desc);
create index contributions_status_idx on public.contributions (status);

alter table public.contributions enable row level security;

create policy "contributions_select" on public.contributions for select using (true);
create policy "contributions_insert" on public.contributions for insert with check (true);
create policy "contributions_update" on public.contributions for update using (true);
create policy "contributions_delete" on public.contributions for delete using (true);
```

Pour la production, restreignez `insert` / `update` / `delete` (auth, clé service côté serveur, etc.).

## 3. Bucket Storage `mosaic-images`

Sans ce bucket, l’upload renvoie **`StorageApiError: Bucket not found`** ou **HTTP 400** sur `/storage/v1/object/...`.

**Étape obligatoire** : le bucket **`mosaic-images`** doit exister.

1. **SQL (recommandé)** — exécutez tout le fichier [`supabase/sql/002_create_storage_bucket.sql`](./supabase/sql/002_create_storage_bucket.sql) dans **SQL Editor** (crée le bucket **public** + politiques).

2. **Ou interface** — **Storage → New bucket** → nom exact **`mosaic-images`** → **Public** → Create. Puis exécutez **uniquement** la partie « Politiques » du même fichier SQL (les `create policy` sur `storage.objects`), sinon l’upload peut être refusé par RLS.

3. Vérifiez : **Storage** dans le dashboard → le bucket **`mosaic-images`** est listé. Sinon le script n’a pas été exécuté sur le bon projet.

Ajustez les politiques en production (auth, pas d’upload public anonyme, etc.).

## 4. Temps réel (optionnel)

L’app souscrit aux changements Postgres sur `contributions`. Dans **Database → Replication**, activez la réplication pour la table `contributions` si ce n’est pas fait par défaut.

## 5. Image de coque

Placez votre modèle dans `public/image_0.png` (même ratio portrait que l’iPad **2752×2064** : largeur × hauteur = `STAGE_WIDTH` × `STAGE_HEIGHT`, typ. 390×520 px), ou définissez `VITE_CASE_TEMPLATE_URL`.
