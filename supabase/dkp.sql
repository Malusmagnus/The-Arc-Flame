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
-- Lesen: alle (anon + authenticated). dkp_history ohne officer_id.
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

drop policy if exists dkp_activity_types_select on public.dkp_activity_types;
create policy dkp_activity_types_select on public.dkp_activity_types
  for select to anon, authenticated using (true);
drop policy if exists dkp_items_select on public.dkp_items;
create policy dkp_items_select on public.dkp_items
  for select to anon, authenticated using (true);
drop policy if exists dkp_players_select on public.dkp_players;
create policy dkp_players_select on public.dkp_players
  for select to anon, authenticated using (true);
drop policy if exists dkp_history_select on public.dkp_history;
create policy dkp_history_select on public.dkp_history
  for select to anon, authenticated using (true);

revoke all on table public.dkp_activity_types from public, anon, authenticated;
revoke all on table public.dkp_items from public, anon, authenticated;
revoke all on table public.dkp_players from public, anon, authenticated;
revoke all on table public.dkp_history from public, anon, authenticated;
grant select on table public.dkp_activity_types to anon, authenticated;
grant select on table public.dkp_items to anon, authenticated;
grant select on table public.dkp_players to anon, authenticated;
grant select (id, created_at, kind, player_id, char_name, activity_type_id, activity_name, item_id, item_name,
              dkp_change, overflow_change, dkp_after, overflow_after, reason, batch_id, reverses_id, officer_name)
  on table public.dkp_history to anon, authenticated;

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
