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
