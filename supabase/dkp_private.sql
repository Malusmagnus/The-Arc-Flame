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
