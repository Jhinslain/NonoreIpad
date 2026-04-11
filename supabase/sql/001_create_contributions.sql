-- Exécutez ce script UNE FOIS dans Supabase : SQL Editor → New query → Run
-- Erreur "Could not find the table 'public.contributions'" → la table n’a pas encore été créée.

create table if not exists public.contributions (
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

create index if not exists contributions_created_at_idx
  on public.contributions (created_at desc);
create index if not exists contributions_status_idx
  on public.contributions (status);

alter table public.contributions enable row level security;

-- Idempotent : supprime les anciennes politiques si vous ré-exécutez
drop policy if exists "contributions_select" on public.contributions;
drop policy if exists "contributions_insert" on public.contributions;
drop policy if exists "contributions_update" on public.contributions;
drop policy if exists "contributions_delete" on public.contributions;

-- Démo : accès public (à restreindre en production)
create policy "contributions_select" on public.contributions
  for select using (true);
create policy "contributions_insert" on public.contributions
  for insert with check (true);
create policy "contributions_update" on public.contributions
  for update using (true);
create policy "contributions_delete" on public.contributions
  for delete using (true);

-- Temps réel : Dashboard → Database → Publications → supabase_realtime → cocher `contributions`
-- (ou en SQL une seule fois : alter publication supabase_realtime add table public.contributions;)
