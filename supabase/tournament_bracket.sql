-- Turnier der Kraft: Auslosung, Gruppen und K.-o.-Baum.
-- Voraussetzung: public.is_admin() aus schema.sql und die bestehende Tabelle
-- public.tournament_signups. Diese Datei ändert keine bestehenden Funktionen
-- und keine bestehenden Richtlinien.
--
-- Live geprüft (nur gelesen): tournament_signups hat bereits die Spalte status
-- sowie id, user_id, character_name, "class", faction, discord_name, created_at.
-- status wird wiederverwendet. Fehlt die Spalte in einer anderen Datenbank,
-- wird sie ergänzt. Der Default gilt nur für diese neue Spalte.
--
-- Einmal im SQL-Editor von Supabase ausführen. Die Datei darf erneut laufen.
-- Anmeldungen und die bisherigen RPCs bleiben erhalten.
--
-- Lesen des Baums: nur Administratoren (public.is_admin()) und angemeldete
-- Konten mit eigener, nicht abgelehnter Zeile in tournament_signups.
-- Schreiben: nur Administratoren, über die Funktionen unten.

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.is_admin()') is null then
    raise exception 'public.is_admin() fehlt. Bitte zuerst schema.sql ausführen.';
  end if;
  if to_regclass('public.tournament_signups') is null then
    raise exception 'public.tournament_signups fehlt.';
  end if;
end $$;

alter table public.tournament_signups
  add column if not exists status text default 'pending';

create or replace function public.tournament_signup_state(p_status text)
returns text
language sql
immutable
as $$
  select case
    when lower(btrim(coalesce(p_status, ''))) in (
      'approved', 'confirmed', 'confirm', 'accepted', 'freigegeben',
      'bestaetigt', 'bestätigt', 'yes', 'ok', 'true'
    ) then 'approved'
    when lower(btrim(coalesce(p_status, ''))) in (
      'rejected', 'declined', 'denied', 'abgelehnt', 'no', 'false'
    ) then 'rejected'
    else 'pending'
  end;
$$;

create or replace function public.can_view_tournament_board()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tournament_signups s
      where s.user_id = auth.uid()
        and public.tournament_signup_state(s.status) <> 'rejected'
    );
$$;

create table if not exists public.tournament_draws (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

alter table public.tournament_draws drop constraint if exists tournament_draws_mode_check;
alter table public.tournament_draws
  add constraint tournament_draws_mode_check check (mode in ('ko', 'groups'));

create table if not exists public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.tournament_draws (id) on delete cascade,
  label text not null,
  sort_order int not null
);

alter table public.tournament_groups drop constraint if exists tournament_groups_label_len;
alter table public.tournament_groups
  add constraint tournament_groups_label_len check (char_length(btrim(label)) between 1 and 8);

create unique index if not exists tournament_groups_label_uidx
  on public.tournament_groups (draw_id, label);

create table if not exists public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.tournament_draws (id) on delete cascade,
  group_id uuid,
  signup_id uuid,
  character_name text not null,
  class_name text not null,
  faction text not null,
  tiebreak int not null default 0
);

alter table public.tournament_entries drop constraint if exists tournament_entries_group_fk;
alter table public.tournament_entries
  add constraint tournament_entries_group_fk
  foreign key (group_id) references public.tournament_groups (id) on delete cascade;

alter table public.tournament_entries drop constraint if exists tournament_entries_name_len;
alter table public.tournament_entries
  add constraint tournament_entries_name_len
  check (char_length(btrim(character_name)) between 1 and 40);

alter table public.tournament_entries drop constraint if exists tournament_entries_faction_check;
alter table public.tournament_entries
  add constraint tournament_entries_faction_check
  check (faction in ('horde', 'alliance'));

create unique index if not exists tournament_entries_signup_uidx
  on public.tournament_entries (draw_id, signup_id);

create index if not exists tournament_entries_draw_idx
  on public.tournament_entries (draw_id);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.tournament_draws (id) on delete cascade,
  stage text not null,
  group_id uuid references public.tournament_groups (id) on delete cascade,
  round_no int not null,
  slot_no int not null,
  player_a uuid references public.tournament_entries (id) on delete set null,
  player_b uuid references public.tournament_entries (id) on delete set null,
  winner_id uuid references public.tournament_entries (id) on delete set null,
  is_bye boolean not null default false,
  bye_side text,
  placeholder_a text,
  placeholder_b text,
  source_a_group uuid,
  source_a_place int,
  source_b_group uuid,
  source_b_place int,
  feeds_match uuid,
  feeds_slot text
);

alter table public.tournament_matches drop constraint if exists tournament_matches_stage_check;
alter table public.tournament_matches
  add constraint tournament_matches_stage_check check (stage in ('group', 'ko'));

alter table public.tournament_matches drop constraint if exists tournament_matches_round_check;
alter table public.tournament_matches
  add constraint tournament_matches_round_check
  check (round_no between 1 and 12 and slot_no between 0 and 256);

alter table public.tournament_matches drop constraint if exists tournament_matches_winner_check;
alter table public.tournament_matches
  add constraint tournament_matches_winner_check
  check (winner_id is null or winner_id = player_a or winner_id = player_b);

alter table public.tournament_matches drop constraint if exists tournament_matches_bye_side_check;
alter table public.tournament_matches
  add constraint tournament_matches_bye_side_check
  check (bye_side is null or bye_side in ('a', 'b'));

alter table public.tournament_matches drop constraint if exists tournament_matches_feeds_slot_check;
alter table public.tournament_matches
  add constraint tournament_matches_feeds_slot_check
  check (feeds_slot is null or feeds_slot in ('a', 'b'));

alter table public.tournament_matches drop constraint if exists tournament_matches_place_check;
alter table public.tournament_matches
  add constraint tournament_matches_place_check
  check (
    (source_a_place is null or source_a_place in (1, 2))
    and (source_b_place is null or source_b_place in (1, 2))
  );

alter table public.tournament_matches drop constraint if exists tournament_matches_placeholder_len;
alter table public.tournament_matches
  add constraint tournament_matches_placeholder_len
  check (
    (placeholder_a is null or char_length(placeholder_a) between 1 and 80)
    and (placeholder_b is null or char_length(placeholder_b) between 1 and 80)
  );

alter table public.tournament_matches drop constraint if exists tournament_matches_feeds_fk;
alter table public.tournament_matches
  add constraint tournament_matches_feeds_fk
  foreign key (feeds_match) references public.tournament_matches (id) on delete set null;

create index if not exists tournament_matches_draw_idx
  on public.tournament_matches (draw_id, stage, round_no, slot_no);

alter function public.can_view_tournament_board() set row_security = off;

alter table public.tournament_draws enable row level security;
alter table public.tournament_draws force row level security;
alter table public.tournament_groups enable row level security;
alter table public.tournament_groups force row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_entries force row level security;
alter table public.tournament_matches enable row level security;
alter table public.tournament_matches force row level security;

drop policy if exists tournament_draws_select on public.tournament_draws;
create policy tournament_draws_select on public.tournament_draws
  for select to authenticated
  using (public.can_view_tournament_board());

drop policy if exists tournament_groups_select on public.tournament_groups;
create policy tournament_groups_select on public.tournament_groups
  for select to authenticated
  using (public.can_view_tournament_board());

drop policy if exists tournament_entries_select on public.tournament_entries;
create policy tournament_entries_select on public.tournament_entries
  for select to authenticated
  using (public.can_view_tournament_board());

drop policy if exists tournament_matches_select on public.tournament_matches;
create policy tournament_matches_select on public.tournament_matches
  for select to authenticated
  using (public.can_view_tournament_board());

create or replace function public.tournament_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_draw public.tournament_draws%rowtype;
  v_entries jsonb;
  v_groups jsonb;
  v_matches jsonb;
begin
  if not public.can_view_tournament_board() then
    return jsonb_build_object('access', 'denied');
  end if;

  select * into v_draw
  from public.tournament_draws
  order by created_at desc
  limit 1;

  if v_draw.id is null then
    return jsonb_build_object('access', 'ok', 'draw', null);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'signupId', e.signup_id,
    'name', e.character_name,
    'className', e.class_name,
    'faction', e.faction,
    'groupId', e.group_id,
    'tiebreak', e.tiebreak
  ) order by e.tiebreak, e.character_name), '[]'::jsonb)
  into v_entries
  from public.tournament_entries e
  where e.draw_id = v_draw.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'label', g.label,
    'sort', g.sort_order
  ) order by g.sort_order), '[]'::jsonb)
  into v_groups
  from public.tournament_groups g
  where g.draw_id = v_draw.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'stage', m.stage,
    'groupId', m.group_id,
    'round', m.round_no,
    'slot', m.slot_no,
    'a', m.player_a,
    'b', m.player_b,
    'winner', m.winner_id,
    'bye', m.is_bye,
    'byeSide', m.bye_side,
    'placeholderA', m.placeholder_a,
    'placeholderB', m.placeholder_b,
    'sourceA', case
      when m.source_a_group is null then null
      else jsonb_build_object('groupId', m.source_a_group, 'place', m.source_a_place)
    end,
    'sourceB', case
      when m.source_b_group is null then null
      else jsonb_build_object('groupId', m.source_b_group, 'place', m.source_b_place)
    end,
    'feeds', m.feeds_match,
    'feedsSlot', m.feeds_slot
  ) order by m.stage, m.round_no, m.slot_no), '[]'::jsonb)
  into v_matches
  from public.tournament_matches m
  where m.draw_id = v_draw.id;

  return jsonb_build_object(
    'access', 'ok',
    'draw', jsonb_build_object(
      'mode', v_draw.mode,
      'entries', v_entries,
      'groups', v_groups,
      'matches', v_matches
    )
  );
end;
$$;

create or replace function public.save_tournament_board(p_board jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_existing uuid;
  v_existing_mode text;
  v_approved int;
  v_entry_count int;
  v_match_count int;
  v_names jsonb;
  v_draw uuid;
  v_groups jsonb := '{}'::jsonb;
  v_entries jsonb := '{}'::jsonb;
  v_matches jsonb := '{}'::jsonb;
  r record;
  v_ref text;
  v_signup uuid;
  v_group_ref text;
  v_group_id uuid;
  v_tiebreak int;
  v_info jsonb;
  v_entry_id uuid;
  v_match_id uuid;
  v_player_a uuid;
  v_player_b uuid;
  v_winner uuid;
  v_feeds uuid;
  v_source_a uuid;
  v_source_b uuid;
  v_limit constant int := 32;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Nur ein Administrator kann die Auslosung speichern.';
  end if;
  if p_board is null or jsonb_typeof(p_board) <> 'object'
     or jsonb_typeof(p_board->'entries') <> 'array'
     or jsonb_typeof(p_board->'matches') <> 'array' then
    raise exception 'Die Auslosung ist unvollständig.';
  end if;

  perform pg_advisory_xact_lock(4815162342);

  v_mode := p_board->>'mode';
  if v_mode not in ('ko', 'groups') then
    raise exception 'Unbekannter Modus.';
  end if;

  select count(*) into v_entry_count from jsonb_array_elements(p_board->'entries');
  select count(*) into v_match_count from jsonb_array_elements(p_board->'matches');
  if v_entry_count < 2 or v_entry_count > 256 or v_match_count < 1 or v_match_count > 2000 then
    raise exception 'Die Auslosung hat eine ungültige Größe.';
  end if;
  if v_mode = 'ko' and jsonb_array_length(coalesce(p_board->'groups', '[]'::jsonb)) <> 0 then
    raise exception 'Die direkte K.-o.-Runde hat keine Gruppen.';
  end if;
  if v_mode = 'groups' and jsonb_array_length(coalesce(p_board->'groups', '[]'::jsonb)) < 1 then
    raise exception 'Die Gruppen fehlen.';
  end if;

  select id, mode into v_existing, v_existing_mode
  from public.tournament_draws
  order by created_at desc
  limit 1;

  if v_existing is null then
    select count(*) into v_approved
    from public.tournament_signups s
    where public.tournament_signup_state(s.status) = 'approved';
    if v_entry_count <> v_approved then
      raise exception 'Die Auslosung muss genau die freigegebenen Anmeldungen enthalten.';
    end if;
    if v_approved <= v_limit and v_mode <> 'ko' then
      raise exception 'Bis 32 freigegebene Teilnehmer gibt es eine direkte K.-o.-Runde.';
    end if;
    if v_approved > v_limit and v_mode <> 'groups' then
      raise exception 'Ab 33 freigegebenen Teilnehmern gibt es zuerst Gruppen.';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(p_board->'entries') value
      where not exists (
        select 1
        from public.tournament_signups s
        where s.id = (value->>'signupId')::uuid
          and public.tournament_signup_state(s.status) = 'approved'
      )
    ) then
      raise exception 'Nur freigegebene Anmeldungen kommen in die Auslosung.';
    end if;
    select coalesce(jsonb_object_agg(s.id::text, jsonb_build_object(
      'name', btrim(s.character_name),
      'class', btrim(s."class"),
      'faction', lower(btrim(s.faction))
    )), '{}'::jsonb)
    into v_names
    from public.tournament_signups s
    where public.tournament_signup_state(s.status) = 'approved';
  else
    if v_existing_mode is distinct from v_mode then
      raise exception 'Der Modus einer laufenden Auslosung bleibt gleich.';
    end if;
    if exists (
      select 1
      from (
        select (value->>'signupId')::uuid as id
        from jsonb_array_elements(p_board->'entries') value
      ) incoming
      full outer join (
        select signup_id as id
        from public.tournament_entries
        where draw_id = v_existing
      ) stored on stored.id = incoming.id
      where incoming.id is null or stored.id is null
    ) then
      raise exception 'Die Teilnehmer bleiben die der Auslosung. Zum Ändern zuerst zurücksetzen.';
    end if;
    select coalesce(jsonb_object_agg(e.signup_id::text, jsonb_build_object(
      'name', e.character_name,
      'class', e.class_name,
      'faction', e.faction
    )), '{}'::jsonb)
    into v_names
    from public.tournament_entries e
    where e.draw_id = v_existing;
  end if;

  if (
    select count(distinct value->>'ref')
    from jsonb_array_elements(p_board->'entries') value
  ) <> v_entry_count then
    raise exception 'Eine Anmeldung kommt doppelt vor.';
  end if;
  if (
    select count(distinct value->>'signupId')
    from jsonb_array_elements(p_board->'entries') value
  ) <> v_entry_count then
    raise exception 'Eine Anmeldung kommt doppelt vor.';
  end if;

  delete from public.tournament_draws;

  insert into public.tournament_draws (mode, created_by)
  values (v_mode, auth.uid())
  returning id into v_draw;

  for r in select value as item from jsonb_array_elements(coalesce(p_board->'groups', '[]'::jsonb))
  loop
    v_ref := btrim(coalesce(r.item->>'ref', ''));
    if v_ref = '' or char_length(v_ref) > 80 or jsonb_exists(v_groups, v_ref) then
      raise exception 'Eine Gruppe ist ungültig.';
    end if;
    if char_length(btrim(coalesce(r.item->>'label', ''))) < 1 then
      raise exception 'Eine Gruppe ist ungültig.';
    end if;
    insert into public.tournament_groups (draw_id, label, sort_order)
    values (
      v_draw,
      btrim(coalesce(r.item->>'label', '')),
      coalesce((r.item->>'sort')::int, 0)
    )
    returning id into v_group_id;
    v_groups := v_groups || jsonb_build_object(v_ref, v_group_id::text);
  end loop;

  for r in select value as item from jsonb_array_elements(p_board->'entries')
  loop
    v_ref := btrim(coalesce(r.item->>'ref', ''));
    v_signup := (r.item->>'signupId')::uuid;
    v_info := v_names->v_signup::text;
    if v_ref = '' or jsonb_exists(v_entries, v_ref) or v_info is null then
      raise exception 'Ein Teilnehmer der Auslosung fehlt.';
    end if;
    if coalesce(v_info->>'faction', '') not in ('horde', 'alliance')
       or char_length(coalesce(v_info->>'name', '')) < 1
       or char_length(coalesce(v_info->>'class', '')) < 1 then
      raise exception 'Ein Teilnehmer hat unvollständige Angaben.';
    end if;
    v_group_ref := nullif(btrim(coalesce(r.item->>'groupRef', '')), '');
    v_group_id := null;
    if v_group_ref is not null then
      if not jsonb_exists(v_groups, v_group_ref) then
        raise exception 'Eine Gruppe fehlt.';
      end if;
      v_group_id := (v_groups->>v_group_ref)::uuid;
    end if;
    v_tiebreak := coalesce((r.item->>'tiebreak')::int, 0);
    insert into public.tournament_entries (
      draw_id, group_id, signup_id, character_name, class_name, faction, tiebreak
    ) values (
      v_draw, v_group_id, v_signup, v_info->>'name', v_info->>'class', v_info->>'faction', v_tiebreak
    )
    returning id into v_entry_id;
    v_entries := v_entries || jsonb_build_object(v_ref, v_entry_id::text);
  end loop;

  for r in select value as item from jsonb_array_elements(p_board->'matches')
  loop
    v_ref := btrim(coalesce(r.item->>'ref', ''));
    if v_ref = '' or char_length(v_ref) > 80 or jsonb_exists(v_matches, v_ref) then
      raise exception 'Ein Spiel ist ungültig.';
    end if;
    if coalesce(r.item->>'stage', '') not in ('group', 'ko') then
      raise exception 'Ein Spiel ist ungültig.';
    end if;
    if nullif(r.item->>'byeSide', '') is not null and r.item->>'byeSide' not in ('a', 'b') then
      raise exception 'Ein Spiel ist ungültig.';
    end if;
    if nullif(r.item->>'feedsSlot', '') is not null and r.item->>'feedsSlot' not in ('a', 'b') then
      raise exception 'Ein Spiel verweist ins Leere.';
    end if;
    v_group_ref := nullif(btrim(coalesce(r.item->>'groupRef', '')), '');
    v_group_id := null;
    if v_group_ref is not null then
      if not jsonb_exists(v_groups, v_group_ref) then
        raise exception 'Eine Gruppe fehlt.';
      end if;
      v_group_id := (v_groups->>v_group_ref)::uuid;
    end if;
    v_player_a := null;
    v_player_b := null;
    v_winner := null;
    if nullif(btrim(coalesce(r.item->>'a', '')), '') is not null then
      if not jsonb_exists(v_entries, r.item->>'a') then
        raise exception 'Ein Spiel verweist auf einen unbekannten Teilnehmer.';
      end if;
      v_player_a := (v_entries->>(r.item->>'a'))::uuid;
    end if;
    if nullif(btrim(coalesce(r.item->>'b', '')), '') is not null then
      if not jsonb_exists(v_entries, r.item->>'b') then
        raise exception 'Ein Spiel verweist auf einen unbekannten Teilnehmer.';
      end if;
      v_player_b := (v_entries->>(r.item->>'b'))::uuid;
    end if;
    if nullif(btrim(coalesce(r.item->>'winner', '')), '') is not null then
      if not jsonb_exists(v_entries, r.item->>'winner') then
        raise exception 'Der Sieger gehört nicht ins Turnier.';
      end if;
      v_winner := (v_entries->>(r.item->>'winner'))::uuid;
      if v_winner is distinct from v_player_a and v_winner is distinct from v_player_b then
        raise exception 'Der Sieger muss einer der beiden Spieler sein.';
      end if;
    end if;
    v_source_a := null;
    v_source_b := null;
    if jsonb_typeof(r.item->'sourceA') = 'object' then
      v_group_ref := r.item#>>'{sourceA,groupRef}';
      if v_group_ref is null or not jsonb_exists(v_groups, v_group_ref) then
        raise exception 'Eine Gruppe fehlt.';
      end if;
      v_source_a := (v_groups->>v_group_ref)::uuid;
    end if;
    if jsonb_typeof(r.item->'sourceB') = 'object' then
      v_group_ref := r.item#>>'{sourceB,groupRef}';
      if v_group_ref is null or not jsonb_exists(v_groups, v_group_ref) then
        raise exception 'Eine Gruppe fehlt.';
      end if;
      v_source_b := (v_groups->>v_group_ref)::uuid;
    end if;
    insert into public.tournament_matches (
      draw_id, stage, group_id, round_no, slot_no,
      player_a, player_b, winner_id, is_bye, bye_side,
      placeholder_a, placeholder_b,
      source_a_group, source_a_place, source_b_group, source_b_place,
      feeds_slot
    ) values (
      v_draw,
      r.item->>'stage',
      v_group_id,
      (r.item->>'round')::int,
      (r.item->>'slot')::int,
      v_player_a,
      v_player_b,
      v_winner,
      coalesce((r.item->>'bye')::boolean, false),
      nullif(r.item->>'byeSide', ''),
      nullif(btrim(coalesce(r.item->>'placeholderA', '')), ''),
      nullif(btrim(coalesce(r.item->>'placeholderB', '')), ''),
      v_source_a,
      case when v_source_a is null then null else (r.item#>>'{sourceA,place}')::int end,
      v_source_b,
      case when v_source_b is null then null else (r.item#>>'{sourceB,place}')::int end,
      nullif(r.item->>'feedsSlot', '')
    )
    returning id into v_match_id;
    v_matches := v_matches || jsonb_build_object(v_ref, v_match_id::text);
  end loop;

  for r in select value as item from jsonb_array_elements(p_board->'matches')
  loop
    if nullif(btrim(coalesce(r.item->>'feeds', '')), '') is null then
      continue;
    end if;
    if not jsonb_exists(v_matches, r.item->>'ref') or not jsonb_exists(v_matches, r.item->>'feeds') then
      raise exception 'Ein Spiel verweist ins Leere.';
    end if;
    if coalesce(r.item->>'feedsSlot', '') not in ('a', 'b') then
      raise exception 'Ein Spiel verweist ins Leere.';
    end if;
    v_match_id := (v_matches->>(r.item->>'ref'))::uuid;
    v_feeds := (v_matches->>(r.item->>'feeds'))::uuid;
    update public.tournament_matches
    set feeds_match = v_feeds,
        feeds_slot = r.item->>'feedsSlot'
    where id = v_match_id;
  end loop;

  return public.tournament_board();
exception
  when invalid_text_representation then
    raise exception 'Eine Kennung ist ungültig.';
end;
$$;

create or replace function public.reset_tournament_board()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Nur ein Administrator kann die Auslosung zurücksetzen.';
  end if;
  perform pg_advisory_xact_lock(4815162342);
  delete from public.tournament_draws;
  return public.tournament_board();
end;
$$;

create or replace function public.admin_list_tournament_signups()
returns table (
  id uuid,
  created_at timestamptz,
  character_name text,
  class_name text,
  faction text,
  discord_name text,
  status text,
  state text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Nur ein Administrator sieht die Freigaben.';
  end if;
  return query
  select
    s.id,
    s.created_at,
    s.character_name,
    s."class",
    s.faction,
    s.discord_name,
    s.status,
    public.tournament_signup_state(s.status)
  from public.tournament_signups s
  order by s.created_at, s.character_name;
end;
$$;

create or replace function public.set_tournament_signup_status(p_id uuid, p_action text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidates text[];
  v_value text;
  v_found boolean;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Nur ein Administrator kann Anmeldungen freigeben.';
  end if;
  if p_id is null then
    raise exception 'Diese Anmeldung gibt es nicht.';
  end if;
  if p_action = 'approve' then
    v_candidates := array['approved', 'confirmed', 'freigegeben', 'accepted', 'bestaetigt'];
  elsif p_action = 'reject' then
    v_candidates := array['rejected', 'declined', 'abgelehnt', 'denied', 'unconfirmed', 'pending'];
  else
    raise exception 'Unbekannte Aktion.';
  end if;

  foreach v_value in array v_candidates
  loop
    begin
      update public.tournament_signups
      set status = v_value
      where id = p_id;
      v_found := found;
      if not v_found then
        raise exception 'Diese Anmeldung gibt es nicht.';
      end if;
      return public.tournament_signup_state(v_value);
    exception
      when check_violation then
        null;
    end;
  end loop;

  raise exception 'Der Status konnte nicht gespeichert werden.';
end;
$$;

alter function public.tournament_board() set row_security = off;
alter function public.save_tournament_board(jsonb) set row_security = off;
alter function public.reset_tournament_board() set row_security = off;
alter function public.admin_list_tournament_signups() set row_security = off;
alter function public.set_tournament_signup_status(uuid, text) set row_security = off;

revoke all on table public.tournament_draws from public, anon, authenticated;
revoke all on table public.tournament_groups from public, anon, authenticated;
revoke all on table public.tournament_entries from public, anon, authenticated;
revoke all on table public.tournament_matches from public, anon, authenticated;
grant select on table public.tournament_draws to authenticated;
grant select on table public.tournament_groups to authenticated;
grant select on table public.tournament_entries to authenticated;
grant select on table public.tournament_matches to authenticated;

revoke all on function public.tournament_signup_state(text) from public;
revoke all on function public.can_view_tournament_board() from public;
revoke all on function public.tournament_board() from public;
revoke all on function public.save_tournament_board(jsonb) from public;
revoke all on function public.reset_tournament_board() from public;
revoke all on function public.admin_list_tournament_signups() from public;
revoke all on function public.set_tournament_signup_status(uuid, text) from public;

grant execute on function public.tournament_signup_state(text) to anon, authenticated;
grant execute on function public.can_view_tournament_board() to anon, authenticated;
grant execute on function public.tournament_board() to anon, authenticated;
grant execute on function public.save_tournament_board(jsonb) to authenticated;
grant execute on function public.reset_tournament_board() to authenticated;
grant execute on function public.admin_list_tournament_signups() to authenticated;
grant execute on function public.set_tournament_signup_status(uuid, text) to authenticated;

notify pgrst, 'reload schema';
