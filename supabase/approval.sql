-- The Arc Flame: Freischaltung neuer Registrierungen.
-- Erneut ausführbar. Dieselben Regeln stehen auch in schema.sql.
-- Bestehende Profile haben nach dem ersten Anlegen der Spalte status NULL
-- und werden dann auf 'approved' gesetzt. Spätere Läufe lassen
-- pending, approved und rejected stehen.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/approval.sql

alter table public.profiles add column if not exists status text;

update public.profiles
set status = 'approved'
where status is null;

alter table public.profiles alter column status set default 'pending';
alter table public.profiles alter column status set not null;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected'));

alter table public.profiles add column if not exists approved_by uuid;
alter table public.profiles add column if not exists approved_at timestamptz;

do $fk$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_approved_by_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_approved_by_fkey
      foreign key (approved_by) references auth.users (id) on delete set null;
  end if;
end
$fk$;

create index if not exists profiles_status_idx on public.profiles (status);

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role in ('officer', 'admin')
        or status = 'approved'
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen text;
begin
  chosen := nullif(btrim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  if chosen is null then
    chosen := split_part(coalesce(new.email, 'mitglied'), '@', 1);
  end if;
  if char_length(chosen) > 40 then
    chosen := left(chosen, 40);
  end if;
  if chosen = '' then
    chosen := 'Mitglied';
  end if;
  insert into public.profiles (id, display_name, role, email, status)
  values (new.id, chosen, 'member', coalesce(new.email, ''), 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Die Profil-ID kann nicht geändert werden.';
  end if;
  if new.email is distinct from old.email then
    raise exception 'Die E-Mail kann hier nicht geändert werden.';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'Das Registrierungsdatum kann nicht geändert werden.';
  end if;
  if new.display_name is distinct from old.display_name and auth.uid() is distinct from old.id then
    if auth.uid() is null then
      if session_user not in ('postgres', 'supabase_admin') then
        raise exception 'Der Name kann so nicht geändert werden.';
      end if;
    elsif not public.is_admin() then
      raise exception 'Nur Administratoren dürfen fremde Namen ändern.';
    end if;
  end if;
  if new.role is distinct from old.role then
    if auth.uid() is null then
      if session_user not in ('postgres', 'supabase_admin') then
        raise exception 'Rollenwechsel ohne Anmeldung ist nicht erlaubt.';
      end if;
    elsif auth.uid() = old.id then
      raise exception 'Die eigene Rolle kann nicht geändert werden.';
    elsif not public.is_admin() then
      raise exception 'Nur Administratoren dürfen Rollen ändern.';
    elsif new.role not in ('member', 'officer', 'admin') then
      raise exception 'Ungültige Rolle.';
    end if;
  end if;
  if new.status is distinct from old.status then
    if auth.uid() is null then
      if session_user not in ('postgres', 'supabase_admin') then
        raise exception 'Statuswechsel ohne Anmeldung ist nicht erlaubt.';
      end if;
    elsif auth.uid() = old.id then
      raise exception 'Der eigene Status kann nicht geändert werden.';
    elsif not public.is_officer() then
      raise exception 'Nur Offiziere dürfen den Status ändern.';
    elsif new.status not in ('pending', 'approved', 'rejected') then
      raise exception 'Ungültiger Status.';
    else
      new.approved_by := auth.uid();
      new.approved_at := case when new.status = 'pending' then null else now() end;
    end if;
  elsif auth.uid() is not null and (
    new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
  ) then
    raise exception 'Freigabe-Zeitpunkt kann nicht allein geändert werden.';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name text;
begin
  if current_setting('arc.application_note', true) = '1' then
    new.user_id := null;
    new.author := btrim(new.author);
    new.body := btrim(new.body);
    if new.author !~ '^Bewerbung \(' then
      raise exception 'Nur Bewerbungsnotizen sind hier erlaubt.';
    end if;
    return new;
  end if;
  if auth.uid() is null then
    if new.user_id is not null or session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Zum Schreiben bitte anmelden.';
    end if;
    new.author := btrim(new.author);
    new.body := btrim(new.body);
    return new;
  end if;
  if not public.is_approved() then
    raise exception 'Dein Konto ist noch nicht freigeschaltet.';
  end if;
  new.user_id := auth.uid();
  select display_name into name from public.profiles where id = auth.uid();
  if name is null or btrim(name) = '' then
    raise exception 'Profil fehlt.';
  end if;
  new.author := btrim(name);
  new.body := btrim(new.body);
  if char_length(new.body) > 2000 then
    raise exception 'Die Nachricht ist zu lang.';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_mplus_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      if not public.is_approved() then
        raise exception 'Dein Konto ist noch nicht freigeschaltet.';
      end if;
      new.created_by := auth.uid();
    elsif session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Anmeldung erforderlich.';
    end if;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'Der Ersteller kann nicht geändert werden.';
  elsif auth.uid() is not null and not public.is_approved() and not public.is_officer() then
    raise exception 'Dein Konto ist noch nicht freigeschaltet.';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_classic_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_approved() then
    raise exception 'Dein Konto ist noch nicht freigeschaltet.';
  end if;
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    elsif session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Anmeldung erforderlich.';
    end if;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'Der Ersteller kann nicht geändert werden.';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_mplus_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  name text;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich.';
  end if;
  if not public.is_approved() then
    raise exception 'Dein Konto ist noch nicht freigeschaltet.';
  end if;
  new.user_id := auth.uid();
  select display_name into name from public.profiles where id = auth.uid();
  if name is null or btrim(name) = '' then
    raise exception 'Profil fehlt.';
  end if;
  new.character_name := btrim(name);
  return new;
end;
$$;

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

alter function public.is_approved() set row_security = off;
alter function public.handle_new_user() set row_security = off;
alter function public.guard_profile_update() set row_security = off;
alter function public.prepare_chat_message() set row_security = off;
alter function public.prepare_mplus_group() set row_security = off;
alter function public.prepare_classic_run() set row_security = off;
alter function public.prepare_mplus_signup() set row_security = off;
alter function public.prepare_gallery_image() set row_security = off;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_officer());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
    and approved_by is not distinct from (select p.approved_by from public.profiles p where p.id = auth.uid())
    and approved_at is not distinct from (select p.approved_at from public.profiles p where p.id = auth.uid())
  );

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin() and id <> auth.uid())
  with check (public.is_admin() and id <> auth.uid());

drop policy if exists profiles_update_officer on public.profiles;
create policy profiles_update_officer on public.profiles
  for update to authenticated
  using (public.is_officer() and id <> auth.uid())
  with check (public.is_officer() and id <> auth.uid());

drop policy if exists members_insert on public.members;
create policy members_insert on public.members
  for insert to authenticated
  with check (public.is_officer() and public.is_approved());

drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

drop policy if exists roster_insert on public.roster;
create policy roster_insert on public.roster
  for insert to authenticated
  with check (public.is_officer() and public.is_approved());

drop policy if exists roster_update on public.roster;
create policy roster_update on public.roster
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists roster_delete on public.roster;
create policy roster_delete on public.roster
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

drop policy if exists leadership_insert on public.leadership;
create policy leadership_insert on public.leadership
  for insert to authenticated
  with check (public.is_officer() and public.is_approved());

drop policy if exists leadership_update on public.leadership;
create policy leadership_update on public.leadership
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists leadership_delete on public.leadership;
create policy leadership_delete on public.leadership
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

drop policy if exists guild_info_update on public.guild_info;
create policy guild_info_update on public.guild_info
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists mplus_groups_insert on public.mplus_groups;
create policy mplus_groups_insert on public.mplus_groups
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_approved());

drop policy if exists mplus_groups_update on public.mplus_groups;
create policy mplus_groups_update on public.mplus_groups
  for update to authenticated
  using (created_by = auth.uid() and public.is_approved())
  with check (created_by = auth.uid() and public.is_approved());

drop policy if exists mplus_groups_delete on public.mplus_groups;
create policy mplus_groups_delete on public.mplus_groups
  for delete to authenticated
  using (
    (created_by = auth.uid() and public.is_approved())
    or public.is_officer()
  );

drop policy if exists mplus_signups_insert on public.mplus_signups;
create policy mplus_signups_insert on public.mplus_signups
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());

drop policy if exists mplus_signups_delete on public.mplus_signups;
create policy mplus_signups_delete on public.mplus_signups
  for delete to authenticated
  using (
    (user_id = auth.uid() and public.is_approved())
    or public.is_officer()
    or (
      public.is_approved()
      and exists (
        select 1 from public.mplus_groups g
        where g.id = group_id and g.created_by = auth.uid()
      )
    )
  );

drop policy if exists classic_runs_insert on public.classic_runs;
create policy classic_runs_insert on public.classic_runs
  for insert to authenticated
  with check (public.is_officer() and public.is_approved());

drop policy if exists classic_runs_update on public.classic_runs;
create policy classic_runs_update on public.classic_runs
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists classic_runs_delete on public.classic_runs;
create policy classic_runs_delete on public.classic_runs
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

-- Lesen bleibt für Besucher offen, außer beim Chat: der ist nur für
-- freigeschaltete Konten. Offiziere und Administratoren gelten dabei
-- immer als freigeschaltet.
drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (public.is_approved());

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());

drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages
  for delete to authenticated
  using (
    (user_id = auth.uid() and public.is_approved())
    or public.is_officer()
  );

do $gallery_policies$
begin
  if to_regclass('public.gallery_images') is null then
    return;
  end if;

  execute 'drop policy if exists gallery_objects_insert on storage.objects';
  execute $sql$
    create policy gallery_objects_insert on storage.objects
      for insert to authenticated
      with check (bucket_id = 'gallery' and public.is_officer() and public.is_approved())
  $sql$;

  execute 'drop policy if exists gallery_objects_delete on storage.objects';
  execute $sql$
    create policy gallery_objects_delete on storage.objects
      for delete to authenticated
      using (bucket_id = 'gallery' and public.is_officer() and public.is_approved())
  $sql$;

  execute 'drop policy if exists gallery_images_insert on public.gallery_images';
  execute $sql$
    create policy gallery_images_insert on public.gallery_images
      for insert to authenticated
      with check (public.is_officer() and public.is_approved())
  $sql$;

  execute 'drop policy if exists gallery_images_delete on public.gallery_images';
  execute $sql$
    create policy gallery_images_delete on public.gallery_images
      for delete to authenticated
      using (public.is_officer() and public.is_approved())
  $sql$;
end
$gallery_policies$;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, role, status, approved_by, approved_at) on table public.profiles to authenticated;

revoke all on function public.is_approved() from public;
grant execute on function public.is_approved() to anon, authenticated;
