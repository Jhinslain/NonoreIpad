-- À exécuter une fois après 001 (colonnes optionnelles pour lots multi-images, prix payé, heure Paris affichable).
-- created_at reste timestamptz UTC (instant correct) ; created_at_paris = heure civile à Paris au moment de l’insert.

alter table public.contributions
  add column if not exists paid_total_cents int,
  add column if not exists payment_batch_id uuid,
  add column if not exists created_at_paris timestamp without time zone;

comment on column public.contributions.price_cents is
  'Prix calculé pour cette image (nombre de cellules × tarif unitaire).';
comment on column public.contributions.paid_total_cents is
  'Montant payé pour tout le lot ; identique sur chaque ligne du même payment_batch_id.';
comment on column public.contributions.payment_batch_id is
  'Même UUID pour toutes les lignes créées dans un même envoi « J’ai payé ! ».';
comment on column public.contributions.created_at_paris is
  'Heure locale Europe/Paris au moment de l’insert (timestamp sans fuseau, affichage BDD).';
