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
