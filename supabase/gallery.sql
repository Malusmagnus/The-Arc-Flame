-- The Arc Flame: Galerie.
-- Voraussetzung: public.is_officer() und public.is_approved() aus schema.sql
-- oder approval.sql (Rolle officer oder admin gilt als freigeschaltet).
-- Erneut ausführbar. Dieselben Anweisungen stehen auch in schema.sql.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/gallery.sql

create extension if not exists pgcrypto;

-- Öffentlicher Bucket. INSERT lässt einen vorhandenen Bucket stehen.
-- UPDATE setzt danach Öffentlichkeit, Größenlimit und Dateitypen, damit ein
-- erneuter Lauf dieselben Werte hinterlässt.
insert into storage.buckets (id, name, "public", file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

update storage.buckets
set
  "public" = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'gallery';

-- storage.objects hat in Supabase bereits RLS. Nicht abschalten.
-- Bricht ab, bevor Richtlinien gelöscht werden, falls die Freischaltung fehlt.
do $need_approved$
begin
  if to_regprocedure('public.is_approved()') is null then
    raise exception 'public.is_approved() fehlt. Zuerst supabase/approval.sql oder schema.sql ausführen.';
  end if;
end
$need_approved$;

drop policy if exists gallery_objects_select on storage.objects;
create policy gallery_objects_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');

drop policy if exists gallery_objects_insert on storage.objects;
create policy gallery_objects_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gallery' and public.is_officer() and public.is_approved());

drop policy if exists gallery_objects_delete on storage.objects;
create policy gallery_objects_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and public.is_officer() and public.is_approved());

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  url text not null,
  caption text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.gallery_images drop constraint if exists gallery_images_path_check;
alter table public.gallery_images add constraint gallery_images_path_check check (
  char_length(path) between 1 and 160
  and path ~ '^[A-Za-z0-9][A-Za-z0-9._-]*$'
);

alter table public.gallery_images drop constraint if exists gallery_images_url_check;
alter table public.gallery_images add constraint gallery_images_url_check check (
  char_length(url) between 12 and 500
  and url ~ '^https://'
);

alter table public.gallery_images drop constraint if exists gallery_images_caption_check;
alter table public.gallery_images add constraint gallery_images_caption_check check (
  caption is null or char_length(caption) between 1 and 200
);

create unique index if not exists gallery_images_path_uidx on public.gallery_images (path);
create index if not exists gallery_images_created_idx on public.gallery_images (created_at desc);

create or replace function public.prepare_gallery_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op <> 'INSERT' then
    return new;
  end if;
  if auth.uid() is not null then
    if not public.is_approved() then
      raise exception 'Dein Konto ist noch nicht freigeschaltet.';
    end if;
    new.uploaded_by := auth.uid();
  elsif session_user not in ('postgres', 'supabase_admin') then
    raise exception 'Anmeldung erforderlich.';
  end if;
  new.path := btrim(new.path);
  new.url := btrim(new.url);
  if new.caption is not null then
    new.caption := nullif(btrim(new.caption), '');
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_images_prepare on public.gallery_images;
create trigger gallery_images_prepare
  before insert on public.gallery_images
  for each row execute function public.prepare_gallery_image();

alter function public.prepare_gallery_image() set row_security = off;

alter table public.gallery_images enable row level security;
alter table public.gallery_images force row level security;

drop policy if exists gallery_images_select on public.gallery_images;
create policy gallery_images_select on public.gallery_images
  for select to anon, authenticated
  using (true);

drop policy if exists gallery_images_insert on public.gallery_images;
create policy gallery_images_insert on public.gallery_images
  for insert to authenticated
  with check (public.is_officer() and public.is_approved());

drop policy if exists gallery_images_delete on public.gallery_images;
create policy gallery_images_delete on public.gallery_images
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

revoke all on table public.gallery_images from public, anon, authenticated;
grant select on table public.gallery_images to anon, authenticated;
grant insert, delete on table public.gallery_images to authenticated;

revoke all on function public.prepare_gallery_image() from public;
