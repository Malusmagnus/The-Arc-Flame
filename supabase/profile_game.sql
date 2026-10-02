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
