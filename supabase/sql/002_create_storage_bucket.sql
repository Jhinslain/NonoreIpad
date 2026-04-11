-- =============================================================================
-- Bucket « mosaic-images » — corrige : StorageApiError: Bucket not found (400)
-- =============================================================================
-- 1) Supabase Dashboard → SQL Editor → collez ce script → Run
-- 2) Storage → vous devez voir le bucket « mosaic-images » (icône monde = public)
--
-- Alternative UI : Storage → New bucket → nom exact : mosaic-images → Public → Create
--    puis exécutez seulement la partie « Politiques » ci-dessous (sans le INSERT).
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('mosaic-images', 'mosaic-images', true)
on conflict (id) do update set public = true;

-- Contrôle : une ligne doit s’afficher
-- select id, name, public from storage.buckets where id = 'mosaic-images';

-- Politiques (accès anon pour la démo — à resserrer en prod)
drop policy if exists "mosaic_images_public_read" on storage.objects;
drop policy if exists "mosaic_images_public_upload" on storage.objects;
drop policy if exists "mosaic_images_public_update" on storage.objects;
drop policy if exists "mosaic_images_public_delete" on storage.objects;

create policy "mosaic_images_public_read"
  on storage.objects for select
  using (bucket_id = 'mosaic-images');

create policy "mosaic_images_public_upload"
  on storage.objects for insert
  with check (bucket_id = 'mosaic-images');

create policy "mosaic_images_public_update"
  on storage.objects for update
  using (bucket_id = 'mosaic-images');

create policy "mosaic_images_public_delete"
  on storage.objects for delete
  using (bucket_id = 'mosaic-images');
