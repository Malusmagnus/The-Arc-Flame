-- The Arc Flame: Tabellen, Rechte und Startdaten.
-- Im Supabase-SQL-Editor ausführen. Die Datei ist erneut ausführbar:
-- vorhandene Tabellen, Richtlinien und gefüllte Starttabellen bleiben erhalten.
-- Neue Konten starten als Mitglied und warten auf Freischaltung (status pending).
-- Bestehende Profile werden beim ersten Anlegen der Status-Spalte freigeschaltet.
-- Die erste Admin-Rolle setzt die letzte Zeile. Offiziere und Administratoren
-- gelten immer als freigeschaltet. Dieselben Freischalt-Regeln liegen in approval.sql.
-- Die Galerie steht direkt vor der Admin-Zeile; dieselben Anweisungen liegen in gallery.sql.
-- Die Forever-Umfrage steht vor dem DKP-System; dieselben Anweisungen liegen in forever_poll.sql.
-- Das DKP-System steht am Ende; dieselben Anweisungen liegen in dkp.sql.
-- Die Spiel-Zuordnung steht dahinter und liegt in profile_game.sql.
-- Der Nachtrag für das Leserecht steht direkt dahinter und liegt in dkp_private.sql.
-- Die Raid-Planung steht ganz am Ende; dieselben Anweisungen liegen in raids.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  email text not null default '',
  status text not null default 'pending',
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  front text not null,
  name text not null,
  rank text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.roster (
  id uuid primary key default gen_random_uuid(),
  front text not null,
  name text not null,
  role text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.leadership (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text not null,
  accent text not null default 'red',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guild_info (
  id integer primary key,
  col1 text not null,
  col2 text not null,
  col3 text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.mplus_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dungeon text not null,
  meeting_time text not null,
  tank text not null,
  heal text not null,
  dds text[] not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.mplus_signups (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.mplus_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  character_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.classic_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size text not null,
  meeting_time text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  body text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

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

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'officer', 'admin'));
alter table public.profiles drop constraint if exists profiles_name_len;
alter table public.profiles add constraint profiles_name_len check (char_length(btrim(display_name)) between 1 and 40);

alter table public.members drop constraint if exists members_front_check;
alter table public.members add constraint members_front_check check (front in ('retail', 'forever'));
alter table public.members drop constraint if exists members_name_len;
alter table public.members add constraint members_name_len check (char_length(btrim(name)) between 1 and 80);
alter table public.members drop constraint if exists members_rank_len;
alter table public.members add constraint members_rank_len check (char_length(btrim(rank)) between 1 and 40);

alter table public.roster drop constraint if exists roster_front_check;
alter table public.roster add constraint roster_front_check check (front in ('retail', 'forever'));
alter table public.roster drop constraint if exists roster_name_len;
alter table public.roster add constraint roster_name_len check (char_length(btrim(name)) between 1 and 80);
alter table public.roster drop constraint if exists roster_role_len;
alter table public.roster add constraint roster_role_len check (char_length(btrim(role)) between 1 and 40);

alter table public.leadership drop constraint if exists leadership_accent_check;
alter table public.leadership add constraint leadership_accent_check check (accent in ('amber', 'red'));
alter table public.leadership drop constraint if exists leadership_name_len;
alter table public.leadership add constraint leadership_name_len check (char_length(btrim(name)) between 1 and 80);
alter table public.leadership drop constraint if exists leadership_subtitle_len;
alter table public.leadership add constraint leadership_subtitle_len check (char_length(btrim(subtitle)) between 1 and 80);

alter table public.guild_info drop constraint if exists guild_info_singleton;
alter table public.guild_info add constraint guild_info_singleton check (id = 1);

alter table public.mplus_groups drop constraint if exists mplus_groups_len;
alter table public.mplus_groups add constraint mplus_groups_len check (
  char_length(btrim(name)) between 1 and 80
  and char_length(btrim(dungeon)) between 1 and 80
  and char_length(btrim(meeting_time)) between 1 and 80
  and char_length(btrim(tank)) between 1 and 80
  and char_length(btrim(heal)) between 1 and 80
  and cardinality(dds) between 1 and 12
);

alter table public.mplus_signups drop constraint if exists mplus_signups_name_len;
alter table public.mplus_signups add constraint mplus_signups_name_len check (char_length(btrim(character_name)) between 1 and 80);
alter table public.mplus_signups drop constraint if exists mplus_signups_user_group;
alter table public.mplus_signups add constraint mplus_signups_user_group unique (group_id, user_id);

alter table public.classic_runs drop constraint if exists classic_runs_size_check;
alter table public.classic_runs add constraint classic_runs_size_check check (size in ('10', '20', '40'));
alter table public.classic_runs drop constraint if exists classic_runs_len;
alter table public.classic_runs add constraint classic_runs_len check (
  char_length(btrim(name)) between 1 and 80
  and char_length(btrim(meeting_time)) between 1 and 80
);

alter table public.chat_messages drop constraint if exists chat_messages_len;
alter table public.chat_messages add constraint chat_messages_len check (
  char_length(btrim(author)) between 1 and 80
  and char_length(btrim(body)) between 1 and 4000
);

create index if not exists members_front_sort_idx on public.members (front, sort_order);
create index if not exists roster_front_sort_idx on public.roster (front, sort_order);
create index if not exists leadership_sort_idx on public.leadership (sort_order);
create index if not exists chat_messages_created_idx on public.chat_messages (created_at);
create index if not exists mplus_signups_group_idx on public.mplus_signups (group_id);
create index if not exists profiles_status_idx on public.profiles (status);

create or replace function public.is_officer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('officer', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
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

create or replace function public.post_application_note(author text, body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if author is null or body is null then
    raise exception 'Leere Nachricht.';
  end if;
  author := btrim(author);
  body := btrim(body);
  if author !~ '^Bewerbung \(' or char_length(author) > 80 or char_length(body) < 1 or char_length(body) > 4000 then
    raise exception 'Diese Notiz ist nicht erlaubt.';
  end if;
  perform set_config('arc.application_note', '1', true);
  insert into public.chat_messages (author, body, user_id)
  values (author, body, null);
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
  elsif auth.uid() is not null and not public.is_approved() then
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

drop trigger if exists chat_messages_before_insert on public.chat_messages;
create trigger chat_messages_before_insert
  before insert on public.chat_messages
  for each row execute function public.prepare_chat_message();

drop trigger if exists mplus_groups_prepare on public.mplus_groups;
create trigger mplus_groups_prepare
  before insert or update on public.mplus_groups
  for each row execute function public.prepare_mplus_group();

drop trigger if exists classic_runs_prepare on public.classic_runs;
create trigger classic_runs_prepare
  before insert or update on public.classic_runs
  for each row execute function public.prepare_classic_run();

drop trigger if exists mplus_signups_prepare on public.mplus_signups;
create trigger mplus_signups_prepare
  before insert on public.mplus_signups
  for each row execute function public.prepare_mplus_signup();

alter function public.is_officer() set row_security = off;
alter function public.is_admin() set row_security = off;
alter function public.is_approved() set row_security = off;
alter function public.handle_new_user() set row_security = off;
alter function public.guard_profile_update() set row_security = off;
alter function public.prepare_chat_message() set row_security = off;
alter function public.post_application_note(text, text) set row_security = off;
alter function public.prepare_mplus_group() set row_security = off;
alter function public.prepare_classic_run() set row_security = off;
alter function public.prepare_mplus_signup() set row_security = off;

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.roster enable row level security;
alter table public.leadership enable row level security;
alter table public.guild_info enable row level security;
alter table public.mplus_groups enable row level security;
alter table public.mplus_signups enable row level security;
alter table public.classic_runs enable row level security;
alter table public.chat_messages enable row level security;

alter table public.profiles force row level security;
alter table public.members force row level security;
alter table public.roster force row level security;
alter table public.leadership force row level security;
alter table public.guild_info force row level security;
alter table public.mplus_groups force row level security;
alter table public.mplus_signups force row level security;
alter table public.classic_runs force row level security;
alter table public.chat_messages force row level security;

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

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to anon, authenticated
  using (true);

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

drop policy if exists roster_select on public.roster;
create policy roster_select on public.roster
  for select to anon, authenticated
  using (true);

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

drop policy if exists leadership_select on public.leadership;
create policy leadership_select on public.leadership
  for select to anon, authenticated
  using (true);

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

drop policy if exists guild_info_select on public.guild_info;
create policy guild_info_select on public.guild_info
  for select to anon, authenticated
  using (true);

drop policy if exists guild_info_update on public.guild_info;
create policy guild_info_update on public.guild_info
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists mplus_groups_select on public.mplus_groups;
create policy mplus_groups_select on public.mplus_groups
  for select to anon, authenticated
  using (true);

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

drop policy if exists mplus_signups_select on public.mplus_signups;
create policy mplus_signups_select on public.mplus_signups
  for select to anon, authenticated
  using (true);

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

drop policy if exists classic_runs_select on public.classic_runs;
create policy classic_runs_select on public.classic_runs
  for select to anon, authenticated
  using (true);

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
-- freigeschaltete Konten. Offiziere und Administratoren gelten immer
-- als freigeschaltet.
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

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, role, status, approved_by, approved_at) on table public.profiles to authenticated;

revoke all on table public.members from public, anon, authenticated;
grant select on table public.members to anon, authenticated;
grant insert, update, delete on table public.members to authenticated;

revoke all on table public.roster from public, anon, authenticated;
grant select on table public.roster to anon, authenticated;
grant insert, update, delete on table public.roster to authenticated;

revoke all on table public.leadership from public, anon, authenticated;
grant select on table public.leadership to anon, authenticated;
grant insert, update, delete on table public.leadership to authenticated;

revoke all on table public.guild_info from public, anon, authenticated;
grant select on table public.guild_info to anon, authenticated;
grant update on table public.guild_info to authenticated;

revoke all on table public.mplus_groups from public, anon, authenticated;
grant select on table public.mplus_groups to anon, authenticated;
grant insert, update, delete on table public.mplus_groups to authenticated;

revoke all on table public.mplus_signups from public, anon, authenticated;
grant select on table public.mplus_signups to anon, authenticated;
grant insert, delete on table public.mplus_signups to authenticated;

revoke all on table public.classic_runs from public, anon, authenticated;
grant select on table public.classic_runs to anon, authenticated;
grant insert, update, delete on table public.classic_runs to authenticated;

revoke all on table public.chat_messages from public, anon, authenticated;
grant select on table public.chat_messages to anon, authenticated;
grant insert, delete on table public.chat_messages to authenticated;

revoke all on function public.is_officer() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.is_approved() from public;
revoke all on function public.post_application_note(text, text) from public;
grant execute on function public.is_officer() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_approved() to anon, authenticated;
grant execute on function public.post_application_note(text, text) to anon, authenticated;

alter table public.chat_messages replica identity full;
alter table public.roster replica identity full;

do $pub$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
    ) then
      alter publication supabase_realtime add table public.chat_messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'roster'
    ) then
      alter publication supabase_realtime add table public.roster;
    end if;
  end if;
end
$pub$;

insert into public.members (front, name, rank, sort_order)
select v.front, v.name, v.rank, v.sort_order
from (values
  ('retail', 'Zángár 90', 'Flammenrat', 0),
  ('retail', 'Lexxtra 90', 'Flammenrat', 1),
  ('retail', 'Tuhan 90', 'Flammenrat', 2),
  ('retail', 'Lückog 90', 'Flammenrat', 3),
  ('retail', 'Kokô 90', 'Raidleitung', 4),
  ('retail', 'Ineeri 90', 'Raidleitung', 5),
  ('retail', 'Banette 90', 'Raidleitung', 6),
  ('retail', 'Snøxi 90', 'Schlachtflamme', 7),
  ('retail', 'Palaschlumpf 90', 'Schlachtflamme', 8),
  ('retail', 'Fabirion 90', 'Schlachtflamme', 9),
  ('retail', 'Zorgath 90', 'Schlachtflamme', 10),
  ('retail', 'Octávia 90', 'Schlachtflamme', 11),
  ('retail', 'Fabidingo 90', 'Schlachtflamme', 12),
  ('retail', 'Kokoswedel 90', 'Schlachtflamme', 13),
  ('retail', 'Mâlusmagnus 90', 'Flammenherz', 14),
  ('retail', 'Mâlûmágnus 81', 'Flammenherz', 15),
  ('retail', 'Dolvar 90', 'Flammenherz', 16),
  ('retail', 'Pirngri 90', 'Flammenherz', 17),
  ('retail', 'Malenya 80', 'Flammenherz', 18),
  ('retail', 'Lééxi 90', 'Flammenherz', 19),
  ('retail', 'Kokosboom 90', 'Flammenherz', 20),
  ('retail', 'Luther 90', 'Flammenherz', 21),
  ('retail', 'Láná 90', 'Flammenherz', 22),
  ('retail', 'Trust 90', 'Flammenherz', 23),
  ('retail', 'Sieránâniâ 88', 'Flammenherz', 24),
  ('retail', 'Myrá 90', 'Flammenherz', 25),
  ('retail', 'Siladrin 90', 'Flammenherz', 26),
  ('retail', 'Lücke 90', 'Flammenherz', 27),
  ('retail', 'Johnny 90', 'Flammenherz', 28),
  ('retail', 'Lonehammer 90', 'Flammenherz', 29),
  ('retail', 'Vitramon 90', 'Flammenherz', 30),
  ('retail', 'Malusmagnus 90', 'Funkenecho', 31),
  ('retail', 'Skargor 90', 'Funkenecho', 32),
  ('retail', 'Amnors 90', 'Frischefunke', 33),
  ('retail', 'Penzibär 90', 'Frischefunke', 34),
  ('retail', 'Vâlium 90', 'Frischefunke', 35),
  ('retail', 'Kokojoker 82', 'Frischefunke', 36),
  ('retail', 'Schamorcre 90', 'Frischefunke', 37),
  ('retail', 'Sethron 90', 'Frischefunke', 38),
  ('retail', 'Messerfuchs 80', 'Frischefunke', 39),
  ('retail', 'Magieplauze 90', 'Frischefunke', 40),
  ('retail', 'Hugoó 90', 'Frischefunke', 41),
  ('retail', 'Sprigen 90', 'Frischefunke', 42),
  ('retail', 'Anikó 90', 'Frischefunke', 43),
  ('retail', 'Onihara 90', 'Frischefunke', 44),
  ('retail', 'Onimagus 90', 'Frischefunke', 45),
  ('retail', 'Bollerkopp 90', 'Frischefunke', 46),
  ('retail', 'Imperialblue 90', 'Frischefunke', 47),
  ('retail', 'Alána 90', 'Frischefunke', 48),
  ('retail', 'Helldestroy 90', 'Frischefunke', 49),
  ('retail', 'Ghettodudu 90', 'Frischefunke', 50),
  ('retail', 'Barathryn 90', 'Frischefunke', 51),
  ('retail', 'Pavju 90', 'Frischefunke', 52),
  ('retail', 'Dilles 90', 'Frischefunke', 53),
  ('retail', 'Eiskäffchen 90', 'Frischefunke', 54),
  ('retail', 'Bomboclat 90', 'Frischefunke', 55),
  ('retail', 'Aasfresser 90', 'Frischefunke', 56)
) as v(front, name, rank, sort_order)
where not exists (select 1 from public.members);

insert into public.roster (front, name, role, sort_order)
select v.front, v.name, v.role, v.sort_order
from (values
  ('retail', 'Malusiamanu', 'Heiler', 0),
  ('retail', 'Lexxtra', 'Heiler', 1),
  ('retail', 'Lückog', 'Range-DD', 2),
  ('retail', 'Tuhan', 'Tank', 3),
  ('retail', 'Kokô', 'Melee-DD', 4),
  ('retail', 'Ineeri', 'Range-DD', 5),
  ('retail', 'Banette', 'Melee-DD', 6),
  ('retail', 'Snøxi', 'Heiler', 7),
  ('retail', 'Palaschlumpf', 'Tank', 8),
  ('retail', 'Fabirion', 'Range-DD', 9)
) as v(front, name, role, sort_order)
where not exists (select 1 from public.roster);

insert into public.leadership (name, subtitle, accent, sort_order)
select v.name, v.subtitle, v.accent, v.sort_order
from (values
  ('Malusiamanu', 'Gildenmeister • Holy Priest', 'amber', 0),
  ('Lexxtra', 'Flammenrat • Monk Heal', 'red', 1),
  ('Lückog', 'Flammenrat • Jäger', 'red', 2),
  ('Tuhan', 'Flammenrat • Paladin', 'red', 3)
) as v(name, subtitle, accent, sort_order)
where not exists (select 1 from public.leadership);

insert into public.guild_info (id, col1, col2, col3)
select 1, 'The Arc Flame steht für eine ehrgeizige, aber entspannte Horde-Gemeinschaft. Wir ziehen gemeinsam in den Raid, üben an den Bossen und lassen den Abend freundlich bleiben.', 'Retail: Samstag von 20:00 bis 22:00 Uhr, zusammen im Raid. Classic: Aufbau von 10er- und 20er-Gruppen und das Ziel, den 40er-Raid zum Beben zu bringen.', 'Ob Retail-Veteran oder Classic-Liebhaber ab dem 5. November: Über unseren gemeinsamen Gilden-Chat halten wir alle Fäden zusammen unter der roten Flagge.'
where not exists (select 1 from public.guild_info);

insert into public.mplus_groups (name, dungeon, meeting_time, tank, heal, dds)
select 'Die Keystoner', 'Ara-Kara +10', 'Mittwoch 20:00', 'Tuhan', 'Malusiamanu',
  array['Lexxtra', 'Lückog', 'Kokô']::text[]
where not exists (select 1 from public.mplus_groups);

insert into public.classic_runs (name, size, meeting_time)
select 'Molten Core', '40', 'Freitag 20:00 Uhr'
where not exists (select 1 from public.classic_runs);

insert into public.chat_messages (author, body)
select v.author, v.body
from (values
  ('Malusiamanu', 'Willkommen im gemeinsamen Gildenchat von The Arc Flame!'),
  ('Lexxtra', 'Retail & Forever vereint unter der Horde-Flagge! Lok''tar ogar!')
) as v(author, body)
where not exists (select 1 from public.chat_messages);

-- Galerie: dieselben Anweisungen wie in supabase/gallery.sql.

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


-- update public.profiles
-- set role = 'admin', status = 'approved', approved_at = now()
-- where id = (select id from auth.users where email = 'deine@email.de');

-- Forever-Umfrage: dieselben Anweisungen wie in supabase/forever_poll.sql.

-- The Arc Flame: Forever-Umfrage (Main & Twink).
-- Voraussetzung: public.is_officer() und public.is_approved() aus schema.sql.
-- Erneut ausführbar.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/forever_poll.sql
--
-- Lesen: alle (anon + authenticated), ohne user_id.
-- Schreiben: nur über public.submit_forever_poll(...).
--   Angemeldet: ein Eintrag pro Konto, erneutes Absenden ändert ihn.
--   Ohne Anmeldung: ein Eintrag pro Name (Groß/Klein egal), kein Überschreiben.
-- Löschen: Offiziere und Administratoren.

create extension if not exists pgcrypto;

create table if not exists public.forever_poll (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  char_name text not null,
  main_class text not null,
  main_role text,
  twink_class text,
  twink_role text,
  race text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forever_poll drop constraint if exists forever_poll_name_len;
alter table public.forever_poll add constraint forever_poll_name_len
  check (char_length(btrim(char_name)) between 2 and 40);

alter table public.forever_poll drop constraint if exists forever_poll_main_class_check;
alter table public.forever_poll add constraint forever_poll_main_class_check
  check (main_class in ('Krieger', 'Paladin', 'Jäger', 'Schurke', 'Priester', 'Schamane', 'Magier', 'Hexenmeister', 'Druide'));

alter table public.forever_poll drop constraint if exists forever_poll_twink_class_check;
alter table public.forever_poll add constraint forever_poll_twink_class_check
  check (twink_class is null or twink_class in ('Krieger', 'Paladin', 'Jäger', 'Schurke', 'Priester', 'Schamane', 'Magier', 'Hexenmeister', 'Druide', 'Noch unklar'));

alter table public.forever_poll drop constraint if exists forever_poll_role_check;
alter table public.forever_poll add constraint forever_poll_role_check check (
  (main_role is null or main_role in ('Tank', 'Heiler', 'Schaden'))
  and (twink_role is null or twink_role in ('Tank', 'Heiler', 'Schaden'))
);

alter table public.forever_poll drop constraint if exists forever_poll_race_check;
alter table public.forever_poll add constraint forever_poll_race_check
  check (race is null or race in ('Skyborne', 'Orc', 'Untoter', 'Tauren', 'Troll'));

alter table public.forever_poll drop constraint if exists forever_poll_comment_len;
alter table public.forever_poll add constraint forever_poll_comment_len
  check (comment is null or char_length(comment) between 1 and 300);

create unique index if not exists forever_poll_name_uidx on public.forever_poll (lower(btrim(char_name)));
create unique index if not exists forever_poll_user_uidx on public.forever_poll (user_id) where user_id is not null;
create index if not exists forever_poll_created_idx on public.forever_poll (created_at);

-- Absenden. Gibt den gespeicherten Eintrag zurück (ohne user_id).
create or replace function public.submit_forever_poll(
  p_char_name text,
  p_main_class text,
  p_main_role text default null,
  p_twink_class text default null,
  p_twink_role text default null,
  p_race text default null,
  p_comment text default null
)
returns table (
  id uuid, char_name text, main_class text, main_role text, twink_class text,
  twink_role text, race text, comment text, created_at timestamptz, updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_char_name, ''));
  v_uid uuid := auth.uid();
  v_own uuid;
  v_other public.forever_poll%rowtype;
  v_id uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'Bitte einen Namen mit 2 bis 40 Zeichen eingeben.';
  end if;
  p_main_role := nullif(btrim(coalesce(p_main_role, '')), '');
  p_twink_class := nullif(btrim(coalesce(p_twink_class, '')), '');
  p_twink_role := nullif(btrim(coalesce(p_twink_role, '')), '');
  p_race := nullif(btrim(coalesce(p_race, '')), '');
  p_comment := nullif(btrim(coalesce(p_comment, '')), '');
  if p_comment is not null and char_length(p_comment) > 300 then
    raise exception 'Der Kommentar ist zu lang (höchstens 300 Zeichen).';
  end if;

  select * into v_other from public.forever_poll f where lower(btrim(f.char_name)) = lower(v_name);

  if v_uid is not null then
    select f.id into v_own from public.forever_poll f where f.user_id = v_uid;
    if v_other.id is not null and v_other.id is distinct from v_own then
      -- Name gehört schon zu einem anderen Eintrag.
      if v_other.user_id is null and v_own is null and public.is_approved() then
        v_own := v_other.id; -- freigeschaltetes Mitglied übernimmt den Eintrag ohne Konto
      else
        raise exception 'Für den Namen „%“ gibt es schon einen Eintrag.', v_name;
      end if;
    end if;
    if v_own is not null then
      update public.forever_poll f set
        user_id = v_uid, char_name = v_name, main_class = p_main_class, main_role = p_main_role,
        twink_class = p_twink_class, twink_role = p_twink_role, race = p_race,
        comment = p_comment, updated_at = now()
      where f.id = v_own
      returning f.id into v_id;
    else
      insert into public.forever_poll (user_id, char_name, main_class, main_role, twink_class, twink_role, race, comment)
      values (v_uid, v_name, p_main_class, p_main_role, p_twink_class, p_twink_role, p_race, p_comment)
      returning forever_poll.id into v_id;
    end if;
  else
    if v_other.id is not null then
      raise exception 'Für den Namen „%“ gibt es schon einen Eintrag.', v_name;
    end if;
    insert into public.forever_poll (user_id, char_name, main_class, main_role, twink_class, twink_role, race, comment)
    values (null, v_name, p_main_class, p_main_role, p_twink_class, p_twink_role, p_race, p_comment)
    returning forever_poll.id into v_id;
  end if;

  return query
    select f.id, f.char_name, f.main_class, f.main_role, f.twink_class, f.twink_role,
           f.race, f.comment, f.created_at, f.updated_at
    from public.forever_poll f where f.id = v_id;
exception
  when unique_violation then
    raise exception 'Für den Namen „%“ gibt es schon einen Eintrag.', v_name;
  when check_violation then
    raise exception 'Bitte Klasse, Rolle und Rasse aus der Liste wählen.';
end;
$$;

-- Eigener Eintrag des angemeldeten Kontos (leer ohne Anmeldung oder ohne Eintrag).
create or replace function public.my_forever_poll()
returns table (
  id uuid, char_name text, main_class text, main_role text, twink_class text,
  twink_role text, race text, comment text, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select f.id, f.char_name, f.main_class, f.main_role, f.twink_class, f.twink_role,
         f.race, f.comment, f.created_at, f.updated_at
  from public.forever_poll f
  where auth.uid() is not null and f.user_id = auth.uid();
$$;

alter function public.submit_forever_poll(text, text, text, text, text, text, text) set row_security = off;
alter function public.my_forever_poll() set row_security = off;

alter table public.forever_poll enable row level security;
alter table public.forever_poll force row level security;

drop policy if exists forever_poll_select on public.forever_poll;
create policy forever_poll_select on public.forever_poll
  for select to anon, authenticated
  using (true);

drop policy if exists forever_poll_delete on public.forever_poll;
create policy forever_poll_delete on public.forever_poll
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

revoke all on table public.forever_poll from public, anon, authenticated;
grant select (id, char_name, main_class, main_role, twink_class, twink_role, race, comment, created_at, updated_at)
  on table public.forever_poll to anon, authenticated;
grant delete on table public.forever_poll to authenticated;

revoke all on function public.submit_forever_poll(text, text, text, text, text, text, text) from public;
revoke all on function public.my_forever_poll() from public;
grant execute on function public.submit_forever_poll(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.my_forever_poll() to anon, authenticated;

notify pgrst, 'reload schema';

-- DKP: dieselben Anweisungen wie in supabase/dkp.sql.

-- The Arc Flame: DKP-System für WoW Forever.
-- Voraussetzung: public.is_officer() und public.is_approved() aus schema.sql.
-- Erneut ausführbar. Vorhandene Daten bleiben erhalten, die Start-Aktivitäten
-- werden nur angelegt, solange die Tabelle dkp_activity_types leer ist.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/dkp.sql
--
-- Regeln:
--   DKP-Konto pro Spieler: 0 bis 500. Punkte über 500 verfallen nicht,
--   sie landen auf dem Überstundenkonto (Spalte overflow, ohne Obergrenze).
--   Gegenstände kosten DKP. DKP gehen nie unter 0: reicht das Konto nicht,
--   wird die Vergabe abgelehnt. Das Überstundenkonto zahlt keine Gegenstände,
--   Offiziere schieben Punkte bei Bedarf zurück (nie über 500).
--
-- Lesen: nur angemeldete, freigeschaltete Konten (public.is_approved()).
--   Besucher ohne Anmeldung (anon) haben kein Leserecht. dkp_history ohne officer_id.
-- Schreiben: nur über die dkp_*-Funktionen, nur freigeschaltete Offiziere und
--   Administratoren (public.is_officer() und public.is_approved()).
--   Jede Änderung schreibt eine Zeile in public.dkp_history.

create extension if not exists pgcrypto;

-- Tabellen ---------------------------------------------------------------

create table if not exists public.dkp_activity_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points integer not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkp_activity_types drop constraint if exists dkp_activity_types_name_len;
alter table public.dkp_activity_types add constraint dkp_activity_types_name_len
  check (char_length(btrim(name)) between 2 and 60);
alter table public.dkp_activity_types drop constraint if exists dkp_activity_types_points_check;
alter table public.dkp_activity_types add constraint dkp_activity_types_points_check
  check (points between 1 and 500);
create unique index if not exists dkp_activity_types_name_uidx on public.dkp_activity_types (lower(btrim(name)));

create table if not exists public.dkp_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cost integer not null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkp_items drop constraint if exists dkp_items_name_len;
alter table public.dkp_items add constraint dkp_items_name_len
  check (char_length(btrim(name)) between 2 and 80);
alter table public.dkp_items drop constraint if exists dkp_items_cost_check;
alter table public.dkp_items add constraint dkp_items_cost_check
  check (cost between 0 and 500);
alter table public.dkp_items drop constraint if exists dkp_items_note_len;
alter table public.dkp_items add constraint dkp_items_note_len
  check (note is null or char_length(note) between 1 and 200);
create unique index if not exists dkp_items_name_uidx on public.dkp_items (lower(btrim(name)));

create table if not exists public.dkp_players (
  id uuid primary key default gen_random_uuid(),
  char_name text not null,
  member_id uuid references public.members (id) on delete set null,
  dkp integer not null default 0,
  overflow integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dkp_players drop constraint if exists dkp_players_name_len;
alter table public.dkp_players add constraint dkp_players_name_len
  check (char_length(btrim(char_name)) between 2 and 40);
alter table public.dkp_players drop constraint if exists dkp_players_dkp_range;
alter table public.dkp_players add constraint dkp_players_dkp_range
  check (dkp between 0 and 500);
alter table public.dkp_players drop constraint if exists dkp_players_overflow_range;
alter table public.dkp_players add constraint dkp_players_overflow_range
  check (overflow >= 0);
create unique index if not exists dkp_players_name_uidx on public.dkp_players (lower(btrim(char_name)));
create index if not exists dkp_players_member_idx on public.dkp_players (member_id);

-- Verlauf. Namen werden mitgeschrieben, damit der Verlauf auch nach
-- Umbenennen oder Löschen lesbar bleibt.
create table if not exists public.dkp_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null,
  player_id uuid references public.dkp_players (id) on delete set null,
  char_name text,
  activity_type_id uuid references public.dkp_activity_types (id) on delete set null,
  activity_name text,
  item_id uuid references public.dkp_items (id) on delete set null,
  item_name text,
  dkp_change integer not null default 0,
  overflow_change integer not null default 0,
  dkp_after integer,
  overflow_after integer,
  reason text,
  batch_id uuid,
  reverses_id uuid references public.dkp_history (id) on delete set null,
  officer_id uuid references auth.users (id) on delete set null,
  officer_name text not null
);

alter table public.dkp_history drop constraint if exists dkp_history_kind_check;
alter table public.dkp_history add constraint dkp_history_kind_check
  check (kind in ('activity', 'item', 'adjustment', 'transfer', 'reversal', 'setup'));
alter table public.dkp_history drop constraint if exists dkp_history_reason_len;
alter table public.dkp_history add constraint dkp_history_reason_len
  check (reason is null or char_length(reason) between 1 and 300);

create index if not exists dkp_history_created_idx on public.dkp_history (created_at desc);
create index if not exists dkp_history_player_idx on public.dkp_history (player_id, created_at desc);
create index if not exists dkp_history_batch_idx on public.dkp_history (batch_id) where batch_id is not null;
create unique index if not exists dkp_history_reverses_uidx on public.dkp_history (reverses_id) where reverses_id is not null;

-- Start-Aktivitäten, nur wenn noch keine existieren. Danach frei änderbar.
insert into public.dkp_activity_types (name, points, sort_order)
select v.name, v.points, v.sort_order
from (values
  ('Raid', 20, 10),
  ('Dungeon', 5, 20),
  ('Gildenevent', 10, 30),
  ('Pünktlichkeit', 3, 40),
  ('Ersatzbank', 10, 50)
) as v(name, points, sort_order)
where not exists (select 1 from public.dkp_activity_types);

-- Interne Hilfsfunktionen (nicht über die API aufrufbar) -------------------

-- Prüft Offizier/Admin und liefert den Anzeigenamen für den Verlauf.
create or replace function public.dkp_require_officer()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null or not (public.is_officer() and public.is_approved()) then
    raise exception 'Nur Offiziere und Administratoren dürfen DKP verwalten.';
  end if;
  select nullif(btrim(p.display_name), '') into v_name from public.profiles p where p.id = auth.uid();
  return coalesce(v_name, 'Offizier');
end;
$$;

-- Text säubern: leer -> null, zu lang -> Fehler.
create or replace function public.dkp_clean_text(p_text text, p_max integer, p_label text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := nullif(btrim(coalesce(p_text, '')), '');
begin
  if v is not null and char_length(v) > p_max then
    raise exception '% ist zu lang (höchstens % Zeichen).', p_label, p_max;
  end if;
  return v;
end;
$$;

-- Bucht Punkte auf einen Spieler und schreibt den Verlauf. Läuft mit Zeilensperre.
-- p_cap = true: positive DKP über 500 wandern ins Überstundenkonto.
create or replace function public.dkp_book(
  p_player_id uuid,
  p_kind text,
  p_dkp_delta integer,
  p_overflow_delta integer,
  p_cap boolean,
  p_reason text,
  p_officer_name text,
  p_batch_id uuid default null,
  p_activity_type_id uuid default null,
  p_activity_name text default null,
  p_item_id uuid default null,
  p_item_name text default null,
  p_reverses_id uuid default null
)
returns public.dkp_history
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.dkp_players%rowtype;
  v_dkp integer := coalesce(p_dkp_delta, 0);
  v_over integer := coalesce(p_overflow_delta, 0);
  v_room integer;
  v_row public.dkp_history%rowtype;
begin
  select * into v_player from public.dkp_players where id = p_player_id for update;
  if v_player.id is null then
    raise exception 'Spieler nicht gefunden.';
  end if;
  if p_cap and v_dkp > 0 then
    v_room := 500 - v_player.dkp;
    if v_dkp > v_room then
      v_over := v_over + (v_dkp - v_room);
      v_dkp := v_room;
    end if;
  end if;
  if v_player.dkp + v_dkp < 0 then
    raise exception '„%“ hat nur % DKP. DKP können nicht unter 0 fallen.', v_player.char_name, v_player.dkp;
  end if;
  if v_player.dkp + v_dkp > 500 then
    raise exception '„%“ hätte mehr als 500 DKP. Höchstens % DKP sind möglich.', v_player.char_name, 500 - v_player.dkp;
  end if;
  if v_player.overflow + v_over < 0 then
    raise exception '„%“ hat nur % Punkte auf dem Überstundenkonto.', v_player.char_name, v_player.overflow;
  end if;

  update public.dkp_players
  set dkp = dkp + v_dkp, overflow = overflow + v_over, updated_at = now()
  where id = v_player.id;

  insert into public.dkp_history (
    kind, player_id, char_name, activity_type_id, activity_name, item_id, item_name,
    dkp_change, overflow_change, dkp_after, overflow_after, reason, batch_id,
    reverses_id, officer_id, officer_name
  ) values (
    p_kind, v_player.id, v_player.char_name, p_activity_type_id, p_activity_name, p_item_id, p_item_name,
    v_dkp, v_over, v_player.dkp + v_dkp, v_player.overflow + v_over, p_reason, p_batch_id,
    p_reverses_id, auth.uid(), p_officer_name
  )
  returning * into v_row;
  return v_row;
end;
$$;

-- Verlaufszeile für Einstellungen (Spieler, Aktivitäten, Gegenstände).
create or replace function public.dkp_log_setup(
  p_officer_name text,
  p_reason text,
  p_player_id uuid default null,
  p_char_name text default null,
  p_activity_type_id uuid default null,
  p_activity_name text default null,
  p_item_id uuid default null,
  p_item_name text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.dkp_history (
    kind, player_id, char_name, activity_type_id, activity_name, item_id, item_name,
    reason, officer_id, officer_name
  ) values (
    'setup', p_player_id, p_char_name, p_activity_type_id, p_activity_name, p_item_id, p_item_name,
    left(p_reason, 300), auth.uid(), p_officer_name
  );
$$;

-- Spieler ------------------------------------------------------------------

-- Anlegen (p_id null) oder ändern. Gibt den Spieler zurück.
create or replace function public.dkp_save_player(
  p_char_name text,
  p_id uuid default null,
  p_member_id uuid default null,
  p_active boolean default true
)
returns table (
  id uuid, char_name text, member_id uuid, dkp integer, overflow integer,
  active boolean, created_at timestamptz, updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_name text := btrim(coalesce(p_char_name, ''));
  v_old public.dkp_players%rowtype;
  v_id uuid;
  v_what text;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then
    raise exception 'Bitte einen Namen mit 2 bis 40 Zeichen eingeben.';
  end if;
  if p_member_id is not null and not exists (select 1 from public.members m where m.id = p_member_id) then
    raise exception 'Das Gildenmitglied wurde nicht gefunden.';
  end if;

  if p_id is null then
    insert into public.dkp_players (char_name, member_id, active)
    values (v_name, p_member_id, coalesce(p_active, true))
    returning dkp_players.id into v_id;
    v_what := 'Spieler angelegt: ' || v_name;
  else
    select * into v_old from public.dkp_players pl where pl.id = p_id for update;
    if v_old.id is null then
      raise exception 'Spieler nicht gefunden.';
    end if;
    update public.dkp_players pl set
      char_name = v_name, member_id = p_member_id, active = coalesce(p_active, true), updated_at = now()
    where pl.id = p_id
    returning pl.id into v_id;
    v_what := 'Spieler geändert: ' || v_name;
    if v_old.char_name is distinct from v_name then
      v_what := v_what || ' (vorher ' || v_old.char_name || ')';
    end if;
    if v_old.active is distinct from coalesce(p_active, true) then
      v_what := v_what || case when coalesce(p_active, true) then ', wieder aktiv' else ', inaktiv' end;
    end if;
  end if;

  perform public.dkp_log_setup(v_officer, v_what, v_id, v_name);

  return query
    select pl.id, pl.char_name, pl.member_id, pl.dkp, pl.overflow, pl.active, pl.created_at, pl.updated_at
    from public.dkp_players pl where pl.id = v_id;
exception
  when unique_violation then
    raise exception 'Den Spieler „%“ gibt es schon.', v_name;
end;
$$;

-- Löschen geht nur ohne Punkte-Verlauf. Sonst auf inaktiv setzen.
create or replace function public.dkp_delete_player(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_player public.dkp_players%rowtype;
begin
  select * into v_player from public.dkp_players where id = p_id for update;
  if v_player.id is null then
    raise exception 'Spieler nicht gefunden.';
  end if;
  if exists (select 1 from public.dkp_history h where h.player_id = p_id and h.kind <> 'setup') then
    raise exception '„%“ hat schon Punkte im Verlauf und kann nicht gelöscht werden. Bitte auf inaktiv setzen.', v_player.char_name;
  end if;
  delete from public.dkp_players where id = p_id;
  perform public.dkp_log_setup(v_officer, 'Spieler gelöscht: ' || v_player.char_name, null, v_player.char_name);
end;
$$;

-- Aktivitäten --------------------------------------------------------------

create or replace function public.dkp_save_activity_type(
  p_name text,
  p_points integer,
  p_id uuid default null,
  p_active boolean default true,
  p_sort_order integer default 0
)
returns setof public.dkp_activity_types
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_name text := btrim(coalesce(p_name, ''));
  v_old public.dkp_activity_types%rowtype;
  v_id uuid;
  v_what text;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Bitte einen Namen mit 2 bis 60 Zeichen eingeben.';
  end if;
  if p_points is null or p_points < 1 or p_points > 500 then
    raise exception 'Die Punkte müssen zwischen 1 und 500 liegen.';
  end if;

  if p_id is null then
    insert into public.dkp_activity_types (name, points, active, sort_order)
    values (v_name, p_points, coalesce(p_active, true), coalesce(p_sort_order, 0))
    returning dkp_activity_types.id into v_id;
    v_what := 'Aktivität angelegt: ' || v_name || ' (' || p_points || ' DKP)';
  else
    select * into v_old from public.dkp_activity_types a where a.id = p_id for update;
    if v_old.id is null then
      raise exception 'Aktivität nicht gefunden.';
    end if;
    update public.dkp_activity_types a set
      name = v_name, points = p_points, active = coalesce(p_active, true),
      sort_order = coalesce(p_sort_order, 0), updated_at = now()
    where a.id = p_id
    returning a.id into v_id;
    v_what := 'Aktivität geändert: ' || v_name || ' (' || p_points || ' DKP';
    if v_old.points is distinct from p_points then
      v_what := v_what || ', vorher ' || v_old.points;
    end if;
    v_what := v_what || ')';
    if v_old.name is distinct from v_name then
      v_what := v_what || ', vorher „' || v_old.name || '“';
    end if;
    if v_old.active is distinct from coalesce(p_active, true) then
      v_what := v_what || case when coalesce(p_active, true) then ', wieder aktiv' else ', inaktiv' end;
    end if;
  end if;

  perform public.dkp_log_setup(v_officer, v_what, null, null, v_id, v_name);

  return query select * from public.dkp_activity_types a where a.id = v_id;
exception
  when unique_violation then
    raise exception 'Die Aktivität „%“ gibt es schon.', v_name;
end;
$$;

create or replace function public.dkp_delete_activity_type(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_old public.dkp_activity_types%rowtype;
begin
  select * into v_old from public.dkp_activity_types where id = p_id for update;
  if v_old.id is null then
    raise exception 'Aktivität nicht gefunden.';
  end if;
  delete from public.dkp_activity_types where id = p_id;
  perform public.dkp_log_setup(v_officer, 'Aktivität gelöscht: ' || v_old.name, null, null, null, v_old.name);
end;
$$;

-- Gegenstände --------------------------------------------------------------

create or replace function public.dkp_save_item(
  p_name text,
  p_cost integer,
  p_id uuid default null,
  p_active boolean default true,
  p_note text default null
)
returns setof public.dkp_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_name text := btrim(coalesce(p_name, ''));
  v_note text := public.dkp_clean_text(p_note, 200, 'Die Notiz');
  v_old public.dkp_items%rowtype;
  v_id uuid;
  v_what text;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Bitte einen Namen mit 2 bis 80 Zeichen eingeben.';
  end if;
  if p_cost is null or p_cost < 0 or p_cost > 500 then
    raise exception 'Die Kosten müssen zwischen 0 und 500 DKP liegen.';
  end if;

  if p_id is null then
    insert into public.dkp_items (name, cost, active, note)
    values (v_name, p_cost, coalesce(p_active, true), v_note)
    returning dkp_items.id into v_id;
    v_what := 'Gegenstand angelegt: ' || v_name || ' (' || p_cost || ' DKP)';
  else
    select * into v_old from public.dkp_items i where i.id = p_id for update;
    if v_old.id is null then
      raise exception 'Gegenstand nicht gefunden.';
    end if;
    update public.dkp_items i set
      name = v_name, cost = p_cost, active = coalesce(p_active, true), note = v_note, updated_at = now()
    where i.id = p_id
    returning i.id into v_id;
    v_what := 'Gegenstand geändert: ' || v_name || ' (' || p_cost || ' DKP';
    if v_old.cost is distinct from p_cost then
      v_what := v_what || ', vorher ' || v_old.cost;
    end if;
    v_what := v_what || ')';
    if v_old.name is distinct from v_name then
      v_what := v_what || ', vorher „' || v_old.name || '“';
    end if;
    if v_old.active is distinct from coalesce(p_active, true) then
      v_what := v_what || case when coalesce(p_active, true) then ', wieder aktiv' else ', inaktiv' end;
    end if;
  end if;

  perform public.dkp_log_setup(v_officer, v_what, null, null, null, null, v_id, v_name);

  return query select * from public.dkp_items i where i.id = v_id;
exception
  when unique_violation then
    raise exception 'Den Gegenstand „%“ gibt es schon.', v_name;
end;
$$;

create or replace function public.dkp_delete_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_old public.dkp_items%rowtype;
begin
  select * into v_old from public.dkp_items where id = p_id for update;
  if v_old.id is null then
    raise exception 'Gegenstand nicht gefunden.';
  end if;
  delete from public.dkp_items where id = p_id;
  perform public.dkp_log_setup(v_officer, 'Gegenstand gelöscht: ' || v_old.name, null, null, null, null, null, v_old.name);
end;
$$;

-- Punkte -------------------------------------------------------------------
-- Alle Punkte-Funktionen geben dieselbe Form zurück: eine Zeile je Buchung.

-- Aktivität an einen oder mehrere Spieler. p_points leer = Standardpunkte der Aktivität.
-- Über 500 geht automatisch ins Überstundenkonto.
create or replace function public.dkp_award_activity(
  p_player_ids uuid[],
  p_activity_type_id uuid,
  p_points integer default null,
  p_reason text default null
)
returns table (
  history_id uuid, player_id uuid, char_name text, dkp_change integer,
  overflow_change integer, dkp integer, overflow integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_type public.dkp_activity_types%rowtype;
  v_points integer;
  v_reason text := public.dkp_clean_text(p_reason, 300, 'Der Grund');
  v_batch uuid := gen_random_uuid();
  v_ids uuid[];
  v_pid uuid;
  v_row public.dkp_history%rowtype;
begin
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_player_ids, '{}'::uuid[])) as x where x is not null;
  if v_ids is null or cardinality(v_ids) = 0 then
    raise exception 'Bitte mindestens einen Spieler auswählen.';
  end if;
  if cardinality(v_ids) > 100 then
    raise exception 'Höchstens 100 Spieler auf einmal.';
  end if;
  select * into v_type from public.dkp_activity_types a where a.id = p_activity_type_id;
  if v_type.id is null then
    raise exception 'Bitte eine Aktivität auswählen.';
  end if;
  v_points := coalesce(p_points, v_type.points);
  if v_points < 1 or v_points > 500 then
    raise exception 'Die Punkte müssen zwischen 1 und 500 liegen.';
  end if;
  if (select count(*) from public.dkp_players pl where pl.id = any (v_ids)) <> cardinality(v_ids) then
    raise exception 'Mindestens ein Spieler wurde nicht gefunden. Bitte die Liste neu laden.';
  end if;

  -- Feste Reihenfolge der Sperren, damit parallele Vergaben sich nicht blockieren.
  perform 1 from public.dkp_players pl where pl.id = any (v_ids) order by pl.id for update;

  for v_pid in select pl.id from public.dkp_players pl where pl.id = any (v_ids) order by lower(pl.char_name) loop
    v_row := public.dkp_book(v_pid, 'activity', v_points, 0, true, v_reason, v_officer, v_batch,
                             v_type.id, v_type.name);
    history_id := v_row.id; player_id := v_row.player_id; char_name := v_row.char_name;
    dkp_change := v_row.dkp_change; overflow_change := v_row.overflow_change;
    dkp := v_row.dkp_after; overflow := v_row.overflow_after;
    return next;
  end loop;
end;
$$;

-- Überstunden zurück auf das DKP-Konto. p_points leer = so viel wie möglich.
-- Nie über 500: mehr als frei ist wird gekappt.
create or replace function public.dkp_transfer_overflow(
  p_player_id uuid,
  p_points integer default null,
  p_reason text default null
)
returns table (
  history_id uuid, player_id uuid, char_name text, dkp_change integer,
  overflow_change integer, dkp integer, overflow integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_reason text := public.dkp_clean_text(p_reason, 300, 'Der Grund');
  v_player public.dkp_players%rowtype;
  v_move integer;
  v_row public.dkp_history%rowtype;
begin
  if p_points is not null and p_points < 1 then
    raise exception 'Bitte mindestens 1 Punkt übertragen.';
  end if;
  select * into v_player from public.dkp_players pl where pl.id = p_player_id for update;
  if v_player.id is null then
    raise exception 'Spieler nicht gefunden.';
  end if;
  if v_player.overflow = 0 then
    raise exception '„%“ hat keine Punkte auf dem Überstundenkonto.', v_player.char_name;
  end if;
  if v_player.dkp >= 500 then
    raise exception '„%“ hat schon 500 DKP.', v_player.char_name;
  end if;
  v_move := least(coalesce(p_points, v_player.overflow), v_player.overflow, 500 - v_player.dkp);

  v_row := public.dkp_book(v_player.id, 'transfer', v_move, -v_move, false, v_reason, v_officer);
  history_id := v_row.id; player_id := v_row.player_id; char_name := v_row.char_name;
  dkp_change := v_row.dkp_change; overflow_change := v_row.overflow_change;
  dkp := v_row.dkp_after; overflow := v_row.overflow_after;
  return next;
end;
$$;

-- Gegenstand vergeben. p_cost leer = hinterlegte Kosten. Abgelehnt, wenn die DKP nicht reichen.
create or replace function public.dkp_award_item(
  p_player_id uuid,
  p_item_id uuid,
  p_cost integer default null,
  p_reason text default null
)
returns table (
  history_id uuid, player_id uuid, char_name text, dkp_change integer,
  overflow_change integer, dkp integer, overflow integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_reason text := public.dkp_clean_text(p_reason, 300, 'Der Grund');
  v_item public.dkp_items%rowtype;
  v_player public.dkp_players%rowtype;
  v_cost integer;
  v_row public.dkp_history%rowtype;
begin
  select * into v_item from public.dkp_items i where i.id = p_item_id;
  if v_item.id is null then
    raise exception 'Bitte einen Gegenstand auswählen.';
  end if;
  v_cost := coalesce(p_cost, v_item.cost);
  if v_cost < 0 or v_cost > 500 then
    raise exception 'Die Kosten müssen zwischen 0 und 500 DKP liegen.';
  end if;
  select * into v_player from public.dkp_players pl where pl.id = p_player_id for update;
  if v_player.id is null then
    raise exception 'Spieler nicht gefunden.';
  end if;
  if v_player.dkp < v_cost then
    raise exception '„%“ hat nur % DKP, „%“ kostet % DKP.', v_player.char_name, v_player.dkp, v_item.name, v_cost;
  end if;

  v_row := public.dkp_book(v_player.id, 'item', -v_cost, 0, false, v_reason, v_officer,
                           null, null, null, v_item.id, v_item.name);
  history_id := v_row.id; player_id := v_row.player_id; char_name := v_row.char_name;
  dkp_change := v_row.dkp_change; overflow_change := v_row.overflow_change;
  dkp := v_row.dkp_after; overflow := v_row.overflow_after;
  return next;
end;
$$;

-- Bonus (positiv) oder Abzug (negativ) mit Pflicht-Grund.
-- p_account 'dkp': Bonus über 500 geht ins Überstundenkonto, Abzug nie unter 0.
-- p_account 'overflow': ändert nur das Überstundenkonto, nie unter 0.
create or replace function public.dkp_adjust(
  p_player_id uuid,
  p_points integer,
  p_reason text,
  p_account text default 'dkp'
)
returns table (
  history_id uuid, player_id uuid, char_name text, dkp_change integer,
  overflow_change integer, dkp integer, overflow integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_reason text := public.dkp_clean_text(p_reason, 300, 'Der Grund');
  v_account text := coalesce(nullif(btrim(p_account), ''), 'dkp');
  v_row public.dkp_history%rowtype;
begin
  if p_points is null or p_points = 0 or p_points < -10000 or p_points > 10000 then
    raise exception 'Bitte eine Punktzahl ungleich 0 eingeben (zwischen -10000 und 10000).';
  end if;
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception 'Bitte einen Grund angeben (mindestens 3 Zeichen).';
  end if;
  if v_account not in ('dkp', 'overflow') then
    raise exception 'Bitte DKP-Konto oder Überstundenkonto wählen.';
  end if;

  if v_account = 'dkp' then
    v_row := public.dkp_book(p_player_id, 'adjustment', p_points, 0, true, v_reason, v_officer);
  else
    v_row := public.dkp_book(p_player_id, 'adjustment', 0, p_points, false, v_reason, v_officer);
  end if;
  history_id := v_row.id; player_id := v_row.player_id; char_name := v_row.char_name;
  dkp_change := v_row.dkp_change; overflow_change := v_row.overflow_change;
  dkp := v_row.dkp_after; overflow := v_row.overflow_after;
  return next;
end;
$$;

-- Buchung stornieren: bucht genau das Gegenteil, mit Pflicht-Grund.
-- Jede Buchung kann nur einmal storniert werden. Stornos selbst nicht.
-- Würde das DKP-Konto über 500 steigen, geht der Rest ins Überstundenkonto.
create or replace function public.dkp_reverse_entry(
  p_history_id uuid,
  p_reason text
)
returns table (
  history_id uuid, player_id uuid, char_name text, dkp_change integer,
  overflow_change integer, dkp integer, overflow integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_officer text := public.dkp_require_officer();
  v_reason text := public.dkp_clean_text(p_reason, 300, 'Der Grund');
  v_orig public.dkp_history%rowtype;
  v_row public.dkp_history%rowtype;
begin
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception 'Bitte einen Grund angeben (mindestens 3 Zeichen).';
  end if;
  select * into v_orig from public.dkp_history h where h.id = p_history_id for update;
  if v_orig.id is null then
    raise exception 'Buchung nicht gefunden.';
  end if;
  if v_orig.kind not in ('activity', 'item', 'adjustment', 'transfer') then
    raise exception 'Diese Zeile kann nicht storniert werden.';
  end if;
  if v_orig.player_id is null then
    raise exception 'Der Spieler dieser Buchung existiert nicht mehr.';
  end if;
  if exists (select 1 from public.dkp_history h where h.reverses_id = v_orig.id) then
    raise exception 'Diese Buchung wurde schon storniert.';
  end if;

  v_row := public.dkp_book(v_orig.player_id, 'reversal', -v_orig.dkp_change, -v_orig.overflow_change, true,
                           v_reason, v_officer, null, v_orig.activity_type_id, v_orig.activity_name,
                           v_orig.item_id, v_orig.item_name, v_orig.id);
  history_id := v_row.id; player_id := v_row.player_id; char_name := v_row.char_name;
  dkp_change := v_row.dkp_change; overflow_change := v_row.overflow_change;
  dkp := v_row.dkp_after; overflow := v_row.overflow_after;
  return next;
exception
  when unique_violation then
    raise exception 'Diese Buchung wurde schon storniert.';
end;
$$;

-- Rechte -------------------------------------------------------------------

alter function public.dkp_require_officer() set row_security = off;
alter function public.dkp_book(uuid, text, integer, integer, boolean, text, text, uuid, uuid, text, uuid, text, uuid) set row_security = off;
alter function public.dkp_log_setup(text, text, uuid, text, uuid, text, uuid, text) set row_security = off;
alter function public.dkp_save_player(text, uuid, uuid, boolean) set row_security = off;
alter function public.dkp_delete_player(uuid) set row_security = off;
alter function public.dkp_save_activity_type(text, integer, uuid, boolean, integer) set row_security = off;
alter function public.dkp_delete_activity_type(uuid) set row_security = off;
alter function public.dkp_save_item(text, integer, uuid, boolean, text) set row_security = off;
alter function public.dkp_delete_item(uuid) set row_security = off;
alter function public.dkp_award_activity(uuid[], uuid, integer, text) set row_security = off;
alter function public.dkp_transfer_overflow(uuid, integer, text) set row_security = off;
alter function public.dkp_award_item(uuid, uuid, integer, text) set row_security = off;
alter function public.dkp_adjust(uuid, integer, text, text) set row_security = off;
alter function public.dkp_reverse_entry(uuid, text) set row_security = off;

alter table public.dkp_activity_types enable row level security;
alter table public.dkp_activity_types force row level security;
alter table public.dkp_items enable row level security;
alter table public.dkp_items force row level security;
alter table public.dkp_players enable row level security;
alter table public.dkp_players force row level security;
alter table public.dkp_history enable row level security;
alter table public.dkp_history force row level security;

-- Lesen nur für angemeldete, freigeschaltete Konten. Ohne Anmeldung: kein Zugriff.
-- (select ...) wertet die Prüfung einmal pro Abfrage aus, nicht pro Zeile.
drop policy if exists dkp_activity_types_select on public.dkp_activity_types;
create policy dkp_activity_types_select on public.dkp_activity_types
  for select to authenticated using ((select public.is_approved()));
drop policy if exists dkp_items_select on public.dkp_items;
create policy dkp_items_select on public.dkp_items
  for select to authenticated using ((select public.is_approved()));
drop policy if exists dkp_players_select on public.dkp_players;
create policy dkp_players_select on public.dkp_players
  for select to authenticated using ((select public.is_approved()));
drop policy if exists dkp_history_select on public.dkp_history;
create policy dkp_history_select on public.dkp_history
  for select to authenticated using ((select public.is_approved()));

revoke all on table public.dkp_activity_types from public, anon, authenticated;
revoke all on table public.dkp_items from public, anon, authenticated;
revoke all on table public.dkp_players from public, anon, authenticated;
revoke all on table public.dkp_history from public, anon, authenticated;
grant select on table public.dkp_activity_types to authenticated;
grant select on table public.dkp_items to authenticated;
grant select on table public.dkp_players to authenticated;
grant select (id, created_at, kind, player_id, char_name, activity_type_id, activity_name, item_id, item_name,
              dkp_change, overflow_change, dkp_after, overflow_after, reason, batch_id, reverses_id, officer_name)
  on table public.dkp_history to authenticated;

-- Interne Funktionen: niemand außer dem Besitzer.
revoke all on function public.dkp_require_officer() from public, anon, authenticated;
revoke all on function public.dkp_clean_text(text, integer, text) from public, anon, authenticated;
revoke all on function public.dkp_book(uuid, text, integer, integer, boolean, text, text, uuid, uuid, text, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.dkp_log_setup(text, text, uuid, text, uuid, text, uuid, text) from public, anon, authenticated;

-- API-Funktionen: nur angemeldete Konten, die Funktion prüft Offizier/Admin.
revoke all on function public.dkp_save_player(text, uuid, uuid, boolean) from public, anon;
revoke all on function public.dkp_delete_player(uuid) from public, anon;
revoke all on function public.dkp_save_activity_type(text, integer, uuid, boolean, integer) from public, anon;
revoke all on function public.dkp_delete_activity_type(uuid) from public, anon;
revoke all on function public.dkp_save_item(text, integer, uuid, boolean, text) from public, anon;
revoke all on function public.dkp_delete_item(uuid) from public, anon;
revoke all on function public.dkp_award_activity(uuid[], uuid, integer, text) from public, anon;
revoke all on function public.dkp_transfer_overflow(uuid, integer, text) from public, anon;
revoke all on function public.dkp_award_item(uuid, uuid, integer, text) from public, anon;
revoke all on function public.dkp_adjust(uuid, integer, text, text) from public, anon;
revoke all on function public.dkp_reverse_entry(uuid, text) from public, anon;
grant execute on function public.dkp_save_player(text, uuid, uuid, boolean) to authenticated;
grant execute on function public.dkp_delete_player(uuid) to authenticated;
grant execute on function public.dkp_save_activity_type(text, integer, uuid, boolean, integer) to authenticated;
grant execute on function public.dkp_delete_activity_type(uuid) to authenticated;
grant execute on function public.dkp_save_item(text, integer, uuid, boolean, text) to authenticated;
grant execute on function public.dkp_delete_item(uuid) to authenticated;
grant execute on function public.dkp_award_activity(uuid[], uuid, integer, text) to authenticated;
grant execute on function public.dkp_transfer_overflow(uuid, integer, text) to authenticated;
grant execute on function public.dkp_award_item(uuid, uuid, integer, text) to authenticated;
grant execute on function public.dkp_adjust(uuid, integer, text, text) to authenticated;
grant execute on function public.dkp_reverse_entry(uuid, text) to authenticated;

notify pgrst, 'reload schema';

-- DKP nur für freigeschaltete Mitglieder: dieselben Anweisungen wie in supabase/dkp_private.sql.

-- The Arc Flame: DKP nur für angemeldete, freigeschaltete Mitglieder.
-- Nachtrag zu dkp.sql (dort schon enthalten). Erneut ausführbar.
-- Voraussetzung: dkp.sql ist gelaufen, public.is_approved() aus schema.sql.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/dkp_private.sql
--
-- Besucher ohne Anmeldung (anon): kein Leserecht auf dkp_*.
-- Angemeldete Konten: lesen nur, wenn public.is_approved() (Status approved
-- oder Rolle officer/admin). Sonst liefern die Tabellen keine Zeilen.
-- Schreib-Funktionen bleiben unverändert.

-- Lesen nur für angemeldete, freigeschaltete Konten. Ohne Anmeldung: kein Zugriff.
-- (select ...) wertet die Prüfung einmal pro Abfrage aus, nicht pro Zeile.
drop policy if exists dkp_activity_types_select on public.dkp_activity_types;
create policy dkp_activity_types_select on public.dkp_activity_types
  for select to authenticated using ((select public.is_approved()));
drop policy if exists dkp_items_select on public.dkp_items;
create policy dkp_items_select on public.dkp_items
  for select to authenticated using ((select public.is_approved()));
drop policy if exists dkp_players_select on public.dkp_players;
create policy dkp_players_select on public.dkp_players
  for select to authenticated using ((select public.is_approved()));
drop policy if exists dkp_history_select on public.dkp_history;
create policy dkp_history_select on public.dkp_history
  for select to authenticated using ((select public.is_approved()));

revoke all on table public.dkp_activity_types from public, anon, authenticated;
revoke all on table public.dkp_items from public, anon, authenticated;
revoke all on table public.dkp_players from public, anon, authenticated;
revoke all on table public.dkp_history from public, anon, authenticated;
grant select on table public.dkp_activity_types to authenticated;
grant select on table public.dkp_items to authenticated;
grant select on table public.dkp_players to authenticated;
grant select (id, created_at, kind, player_id, char_name, activity_type_id, activity_name, item_id, item_name,
              dkp_change, overflow_change, dkp_after, overflow_after, reason, batch_id, reverses_id, officer_name)
  on table public.dkp_history to authenticated;

notify pgrst, 'reload schema';

-- Spiel-Zuordnung: dieselben Anweisungen wie in supabase/profile_game.sql.

-- The Arc Flame: Spiel-Zuordnung für Mitglieder (Forever / Retail / beides).
-- Erneut ausführbar. Setzen dürfen nur Offiziere und Administratoren (auch für sich selbst).
alter table public.profiles add column if not exists game text;
alter table public.profiles drop constraint if exists profiles_game_check;
alter table public.profiles add constraint profiles_game_check
  check (game is null or game in ('forever', 'retail', 'both'));

create or replace function public.guard_profile_game()
returns trigger
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $$
begin
  if new.game is distinct from old.game then
    if auth.uid() is null then
      if session_user not in ('postgres', 'supabase_admin') then
        raise exception 'Spiel-Zuordnung ohne Anmeldung ist nicht erlaubt.';
      end if;
    elsif not public.is_officer() then
      raise exception 'Nur Offiziere dürfen das Spiel zuordnen.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_profile_game() from public, anon, authenticated;

drop trigger if exists profiles_guard_game on public.profiles;
create trigger profiles_guard_game
  before update on public.profiles
  for each row execute function public.guard_profile_game();

-- Offiziere dürfen auch ihr eigenes Profil-Spiel setzen (eigene Zeile über profiles_update_own erlaubt;
-- Rolle/Status bleiben dort gesperrt).
grant select (game), update (game) on table public.profiles to authenticated;
notify pgrst, 'reload schema';

-- Raid-Planung: dieselben Anweisungen wie in supabase/raids.sql.

-- The Arc Flame: Raid-Planung.
-- Voraussetzung: public.is_officer() und public.is_approved() aus schema.sql.
-- Erneut ausführbar. Vorhandene Raids und Anmeldungen bleiben erhalten.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/raids.sql
--
-- Lesen der Termine: alle Besucher (anon + authenticated), ohne Notiz und ohne Namen.
--   Die Zahl der Anmeldungen (Zusage und Vielleicht) liefert public.raid_public_counts().
-- Notiz und Anmeldeliste: nur freigeschaltete Konten. E-Mails stehen hier nirgends.
-- Anlegen, Ändern, Absagen und Löschen: nur freigeschaltete Offiziere und Administratoren.
-- Zusagen: nur das eigene freigeschaltete Konto, nur bis zum Start, nur bei geplanten Raids.
-- Discord: nach dem Anlegen und beim Absagen (auch beim Löschen eines noch geplanten Raids).
--   Der Webhook kommt aus dem Vault, Name discord_raid_webhook, sonst discord_chat_webhook.
--   Keine Adresse steht in dieser Datei. Der Versand darf das Speichern nie verhindern.

create extension if not exists pgcrypto;

-- Tabellen ---------------------------------------------------------------

create table if not exists public.raids (
  id uuid primary key default gen_random_uuid(),
  front text not null,
  title text not null,
  starts_at timestamptz not null,
  note text,
  max_size integer not null,
  status text not null default 'scheduled',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.raids drop constraint if exists raids_front_check;
alter table public.raids add constraint raids_front_check
  check (front in ('forever', 'retail'));
alter table public.raids drop constraint if exists raids_title_len;
alter table public.raids add constraint raids_title_len
  check (char_length(btrim(title)) between 2 and 80);
alter table public.raids drop constraint if exists raids_note_len;
alter table public.raids add constraint raids_note_len
  check (note is null or char_length(note) between 1 and 500);
alter table public.raids drop constraint if exists raids_max_size_check;
alter table public.raids add constraint raids_max_size_check
  check (max_size between 1 and 40);
alter table public.raids drop constraint if exists raids_status_check;
alter table public.raids add constraint raids_status_check
  check (status in ('scheduled', 'cancelled'));

create index if not exists raids_front_starts_idx on public.raids (front, starts_at);

create table if not exists public.raid_signups (
  id uuid primary key default gen_random_uuid(),
  raid_id uuid not null references public.raids (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null,
  role text not null,
  character_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.raid_signups drop constraint if exists raid_signups_status_check;
alter table public.raid_signups add constraint raid_signups_status_check
  check (status in ('Zusage', 'Vielleicht', 'Absage'));
alter table public.raid_signups drop constraint if exists raid_signups_role_check;
alter table public.raid_signups add constraint raid_signups_role_check
  check (role in ('Tank', 'Heiler', 'Schaden'));
alter table public.raid_signups drop constraint if exists raid_signups_name_len;
alter table public.raid_signups add constraint raid_signups_name_len
  check (character_name is null or char_length(btrim(character_name)) between 1 and 40);
alter table public.raid_signups drop constraint if exists raid_signups_user_raid;
alter table public.raid_signups add constraint raid_signups_user_raid unique (raid_id, user_id);

create index if not exists raid_signups_raid_idx on public.raid_signups (raid_id);

-- Prüfungen --------------------------------------------------------------

create or replace function public.prepare_raid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.title := btrim(coalesce(new.title, ''));
  new.note := nullif(btrim(coalesce(new.note, '')), '');
  new.front := lower(btrim(coalesce(new.front, '')));
  new.status := lower(btrim(coalesce(new.status, '')));
  if new.status = '' then
    new.status := 'scheduled';
  end if;

  if auth.uid() is null then
    if session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Anmeldung erforderlich.';
    end if;
  elsif not (public.is_officer() and public.is_approved()) then
    raise exception 'Nur Offiziere dürfen Raids planen.';
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
  else
    new.id := old.id;
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();

  if new.front not in ('forever', 'retail') then
    raise exception 'Bitte Forever oder Retail wählen.';
  end if;
  if char_length(new.title) < 2 or char_length(new.title) > 80 then
    raise exception 'Bitte einen Raidnamen mit 2 bis 80 Zeichen eingeben.';
  end if;
  if position('@' in new.title) > 0 or position('@' in coalesce(new.note, '')) > 0 then
    raise exception 'Bitte keine E-Mail eintragen.';
  end if;
  if new.note is not null and char_length(new.note) > 500 then
    raise exception 'Die Notiz ist zu lang (höchstens 500 Zeichen).';
  end if;
  if new.max_size is null or new.max_size < 1 or new.max_size > 40 then
    raise exception 'Die Gruppengröße muss zwischen 1 und 40 liegen.';
  end if;
  if new.status not in ('scheduled', 'cancelled') then
    raise exception 'Ungültiger Status.';
  end if;
  if new.starts_at is null then
    raise exception 'Bitte Datum und Uhrzeit angeben.';
  end if;
  if tg_op = 'INSERT' and new.starts_at <= now() then
    raise exception 'Bitte einen Termin in der Zukunft wählen.';
  end if;
  if tg_op = 'UPDATE' and new.starts_at is distinct from old.starts_at and new.starts_at <= now() then
    raise exception 'Bitte einen Termin in der Zukunft wählen.';
  end if;
  return new;
end;
$$;

create or replace function public.prepare_raid_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_start timestamptz;
  v_name text;
begin
  if auth.uid() is null then
    if session_user not in ('postgres', 'supabase_admin') then
      raise exception 'Bitte anmelden.';
    end if;
  elsif not public.is_approved() then
    raise exception 'Dein Konto ist noch nicht freigeschaltet.';
  elsif tg_op = 'INSERT' then
    new.user_id := auth.uid();
  elsif new.user_id is distinct from auth.uid()
     or new.user_id is distinct from old.user_id
     or new.raid_id is distinct from old.raid_id then
    raise exception 'Du kannst nur deine eigene Anmeldung ändern.';
  end if;

  new.status := btrim(coalesce(new.status, ''));
  new.role := btrim(coalesce(new.role, ''));
  if new.status not in ('Zusage', 'Vielleicht', 'Absage') then
    raise exception 'Bitte Zusage, Vielleicht oder Absage wählen.';
  end if;
  if new.role not in ('Tank', 'Heiler', 'Schaden') then
    raise exception 'Bitte Tank, Heiler oder Schaden wählen.';
  end if;

  v_name := nullif(btrim(coalesce(new.character_name, '')), '');
  if v_name is not null and (position('@' in v_name) > 0 or char_length(v_name) > 40) then
    raise exception 'Bitte einen Charakternamen ohne E-Mail eintragen (höchstens 40 Zeichen).';
  end if;
  if v_name is null and auth.uid() is not null then
    select nullif(btrim(p.display_name), '') into v_name
    from public.profiles p
    where p.id = auth.uid();
    if v_name is not null and (position('@' in v_name) > 0 or char_length(v_name) > 40) then
      v_name := null;
    end if;
  end if;
  new.character_name := v_name;
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  else
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();

  select r.status, r.starts_at into v_status, v_start
  from public.raids r
  where r.id = new.raid_id;
  if v_status is null then
    raise exception 'Diesen Raid gibt es nicht.';
  end if;
  if v_status <> 'scheduled' or v_start <= now() then
    raise exception 'Für diesen Raid kannst du dich nicht mehr anmelden.';
  end if;
  return new;
end;
$$;

-- Öffentliche Zählung, ohne Namen. Zusage und Vielleicht zählen mit.
create or replace function public.raid_public_counts()
returns table (raid_id uuid, signup_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  return query
    select s.raid_id, count(*)::integer
    from public.raid_signups s
    where s.status in ('Zusage', 'Vielleicht')
    group by s.raid_id;
end;
$$;

-- Discord ----------------------------------------------------------------

create or replace function public.notify_raid_discord()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  hook text;
  row public.raids%rowtype;
  v_front text;
  v_title text;
  v_local timestamp;
  v_dow integer;
  v_day text;
  v_when text;
  v_content text;
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'scheduled' then
      return new;
    end if;
    row := new;
  elsif tg_op = 'UPDATE' then
    if not (new.status = 'cancelled' and old.status is distinct from 'cancelled') then
      return new;
    end if;
    row := new;
  elsif tg_op = 'DELETE' then
    if old.status is distinct from 'scheduled' then
      return old;
    end if;
    row := old;
  else
    return coalesce(new, old);
  end if;

  begin
    select btrim(ds.decrypted_secret) into hook
    from vault.decrypted_secrets ds
    where ds.name = 'discord_raid_webhook'
    limit 1;
    if hook is null or hook = '' then
      select btrim(ds.decrypted_secret) into hook
      from vault.decrypted_secrets ds
      where ds.name = 'discord_chat_webhook'
      limit 1;
    end if;
    if hook is null or hook = '' or hook !~ '^https://' then
      return coalesce(new, old);
    end if;

    v_front := case when row.front = 'forever' then 'Forever' else 'Retail' end;
    v_title := replace(replace(coalesce(row.title, ''), E'\n', ' '), E'\r', ' ');
    v_local := row.starts_at at time zone 'Europe/Berlin';
    v_dow := extract(dow from v_local)::integer;
    v_day := case v_dow
      when 0 then 'Sonntag'
      when 1 then 'Montag'
      when 2 then 'Dienstag'
      when 3 then 'Mittwoch'
      when 4 then 'Donnerstag'
      when 5 then 'Freitag'
      else 'Samstag'
    end;
    v_when := v_day || ', ' || to_char(v_local, 'DD.MM.YYYY') || ' um ' || to_char(v_local, 'HH24:MI') || ' Uhr';
    if tg_op = 'INSERT' then
      v_content := '📅 Neuer Raid (' || v_front || '): ' || v_title || ' am ' || v_when
        || '. Jetzt anmelden: https://thearcflame.github.io/#raid-' || row.id::text;
    else
      v_content := '❌ Raid abgesagt (' || v_front || '): ' || v_title || ' am ' || v_when || '.';
    end if;

    perform net.http_post(
      url := hook,
      body := jsonb_build_object(
        'username', 'The Arc Flame Raidplaner',
        'content', left(v_content, 1800),
        'allowed_mentions', jsonb_build_object('parse', jsonb_build_array())
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception
    when others then
      null;
  end;

  return coalesce(new, old);
exception
  when others then
    return coalesce(new, old);
end;
$$;

alter function public.prepare_raid() set row_security = off;
alter function public.prepare_raid_signup() set row_security = off;
alter function public.raid_public_counts() set row_security = off;
alter function public.notify_raid_discord() set search_path = public, net, vault;
alter function public.notify_raid_discord() set row_security = off;

drop trigger if exists raids_prepare on public.raids;
create trigger raids_prepare
  before insert or update on public.raids
  for each row execute function public.prepare_raid();

drop trigger if exists raids_discord on public.raids;
create trigger raids_discord
  after insert or update or delete on public.raids
  for each row execute function public.notify_raid_discord();

drop trigger if exists raid_signups_prepare on public.raid_signups;
create trigger raid_signups_prepare
  before insert or update on public.raid_signups
  for each row execute function public.prepare_raid_signup();

-- Rechte -----------------------------------------------------------------

alter table public.raids enable row level security;
alter table public.raids force row level security;
alter table public.raid_signups enable row level security;
alter table public.raid_signups force row level security;

drop policy if exists raids_select_anon on public.raids;
create policy raids_select_anon on public.raids
  for select to anon
  using (status = 'scheduled');

drop policy if exists raids_select_auth on public.raids;
create policy raids_select_auth on public.raids
  for select to authenticated
  using (true);

drop policy if exists raids_insert on public.raids;
create policy raids_insert on public.raids
  for insert to authenticated
  with check (public.is_officer() and public.is_approved());

drop policy if exists raids_update on public.raids;
create policy raids_update on public.raids
  for update to authenticated
  using (public.is_officer() and public.is_approved())
  with check (public.is_officer() and public.is_approved());

drop policy if exists raids_delete on public.raids;
create policy raids_delete on public.raids
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

drop policy if exists raid_signups_select on public.raid_signups;
create policy raid_signups_select on public.raid_signups
  for select to authenticated
  using (public.is_approved());

drop policy if exists raid_signups_insert on public.raid_signups;
create policy raid_signups_insert on public.raid_signups
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());

drop policy if exists raid_signups_update on public.raid_signups;
create policy raid_signups_update on public.raid_signups
  for update to authenticated
  using (user_id = auth.uid() and public.is_approved())
  with check (user_id = auth.uid() and public.is_approved());

revoke all on table public.raids from public, anon, authenticated;
grant select (id, front, title, starts_at, max_size, status)
  on table public.raids to anon;
grant select (id, front, title, starts_at, note, max_size, status, created_at)
  on table public.raids to authenticated;
grant insert (front, title, starts_at, note, max_size)
  on table public.raids to authenticated;
grant update (front, title, starts_at, note, max_size, status)
  on table public.raids to authenticated;
grant delete on table public.raids to authenticated;

revoke all on table public.raid_signups from public, anon, authenticated;
grant select (id, raid_id, user_id, status, role, character_name)
  on table public.raid_signups to authenticated;
grant insert (raid_id, user_id, status, role, character_name)
  on table public.raid_signups to authenticated;
grant update (status, role, character_name)
  on table public.raid_signups to authenticated;

revoke all on function public.prepare_raid() from public, anon, authenticated;
revoke all on function public.prepare_raid_signup() from public, anon, authenticated;
revoke all on function public.notify_raid_discord() from public, anon, authenticated;
revoke all on function public.raid_public_counts() from public;
grant execute on function public.raid_public_counts() to anon, authenticated;

notify pgrst, 'reload schema';
