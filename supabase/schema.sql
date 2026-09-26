-- The Arc Flame: Tabellen, Rechte und Startdaten.
-- Im Supabase-SQL-Editor ausführen. Die Datei ist erneut ausführbar:
-- vorhandene Tabellen, Richtlinien und gefüllte Starttabellen bleiben erhalten.
-- Neue Konten starten als Mitglied. Die erste Admin-Rolle setzt die letzte Zeile.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  role text not null default 'member',
  email text not null default '',
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
  insert into public.profiles (id, display_name, role, email)
  values (new.id, chosen, 'member', coalesce(new.email, ''))
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

create or replace function public.prepare_classic_run()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin() and id <> auth.uid())
  with check (public.is_admin() and id <> auth.uid());

drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to anon, authenticated
  using (true);

drop policy if exists members_insert on public.members;
create policy members_insert on public.members
  for insert to authenticated
  with check (public.is_officer());

drop policy if exists members_update on public.members;
create policy members_update on public.members
  for update to authenticated
  using (public.is_officer())
  with check (public.is_officer());

drop policy if exists members_delete on public.members;
create policy members_delete on public.members
  for delete to authenticated
  using (public.is_officer());

drop policy if exists roster_select on public.roster;
create policy roster_select on public.roster
  for select to anon, authenticated
  using (true);

drop policy if exists roster_insert on public.roster;
create policy roster_insert on public.roster
  for insert to authenticated
  with check (public.is_officer());

drop policy if exists roster_update on public.roster;
create policy roster_update on public.roster
  for update to authenticated
  using (public.is_officer())
  with check (public.is_officer());

drop policy if exists roster_delete on public.roster;
create policy roster_delete on public.roster
  for delete to authenticated
  using (public.is_officer());

drop policy if exists leadership_select on public.leadership;
create policy leadership_select on public.leadership
  for select to anon, authenticated
  using (true);

drop policy if exists leadership_insert on public.leadership;
create policy leadership_insert on public.leadership
  for insert to authenticated
  with check (public.is_officer());

drop policy if exists leadership_update on public.leadership;
create policy leadership_update on public.leadership
  for update to authenticated
  using (public.is_officer())
  with check (public.is_officer());

drop policy if exists leadership_delete on public.leadership;
create policy leadership_delete on public.leadership
  for delete to authenticated
  using (public.is_officer());

drop policy if exists guild_info_select on public.guild_info;
create policy guild_info_select on public.guild_info
  for select to anon, authenticated
  using (true);

drop policy if exists guild_info_update on public.guild_info;
create policy guild_info_update on public.guild_info
  for update to authenticated
  using (public.is_officer())
  with check (public.is_officer());

drop policy if exists mplus_groups_select on public.mplus_groups;
create policy mplus_groups_select on public.mplus_groups
  for select to anon, authenticated
  using (true);

drop policy if exists mplus_groups_insert on public.mplus_groups;
create policy mplus_groups_insert on public.mplus_groups
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists mplus_groups_update on public.mplus_groups;
create policy mplus_groups_update on public.mplus_groups
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists mplus_groups_delete on public.mplus_groups;
create policy mplus_groups_delete on public.mplus_groups
  for delete to authenticated
  using (created_by = auth.uid() or public.is_officer());

drop policy if exists mplus_signups_select on public.mplus_signups;
create policy mplus_signups_select on public.mplus_signups
  for select to anon, authenticated
  using (true);

drop policy if exists mplus_signups_insert on public.mplus_signups;
create policy mplus_signups_insert on public.mplus_signups
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists mplus_signups_delete on public.mplus_signups;
create policy mplus_signups_delete on public.mplus_signups
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_officer()
    or exists (
      select 1 from public.mplus_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

drop policy if exists classic_runs_select on public.classic_runs;
create policy classic_runs_select on public.classic_runs
  for select to anon, authenticated
  using (true);

drop policy if exists classic_runs_insert on public.classic_runs;
create policy classic_runs_insert on public.classic_runs
  for insert to authenticated
  with check (public.is_officer());

drop policy if exists classic_runs_update on public.classic_runs;
create policy classic_runs_update on public.classic_runs
  for update to authenticated
  using (public.is_officer())
  with check (public.is_officer());

drop policy if exists classic_runs_delete on public.classic_runs;
create policy classic_runs_delete on public.classic_runs
  for delete to authenticated
  using (public.is_officer());

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to anon, authenticated
  using (true);

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists chat_messages_delete on public.chat_messages;
create policy chat_messages_delete on public.chat_messages
  for delete to authenticated
  using (user_id = auth.uid() or public.is_officer());

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, role) on table public.profiles to authenticated;

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
revoke all on function public.post_application_note(text, text) from public;
grant execute on function public.is_officer() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
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

-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'deine@email.de');
