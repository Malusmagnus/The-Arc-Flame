-- The Arc Flame: Meckerkasten.
-- Voraussetzung: public.is_officer() und public.is_approved() aus schema.sql.
-- Erneut ausführbar. Vorhandene Nachrichten bleiben erhalten.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/feedback.sql
--
-- Absenden: public.submit_feedback, auch ohne Anmeldung (anon + authenticated).
-- Speichern: public.feedback. Lesen und Löschen nur freigeschaltete Offiziere
--   und Administratoren. Keine öffentliche Liste.
-- Discord: nach dem Speichern. Zuerst discord_feedback_webhook_retail bzw.
--   discord_feedback_webhook_forever, dann discord_feedback_webhook,
--   dann discord_chat_webhook.
--   Keine Adresse steht in dieser Datei. Der Versand darf das Speichern nie verhindern.

create extension if not exists pgcrypto;

do $need_approved$
begin
  if to_regprocedure('public.is_officer()') is null
     or to_regprocedure('public.is_approved()') is null then
    raise exception 'public.is_officer() oder public.is_approved() fehlt. Zuerst supabase/schema.sql ausführen.';
  end if;
end
$need_approved$;

-- Tabelle ----------------------------------------------------------------

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  front text not null,
  category text not null,
  message text not null,
  author_name text,
  anonymous boolean not null default false,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.feedback drop constraint if exists feedback_front_check;
alter table public.feedback add constraint feedback_front_check
  check (front in ('forever', 'retail'));

alter table public.feedback drop constraint if exists feedback_category_check;
alter table public.feedback add constraint feedback_category_check
  check (category in ('lob', 'kritik', 'vorschlag'));

alter table public.feedback drop constraint if exists feedback_message_len;
alter table public.feedback add constraint feedback_message_len
  check (char_length(message) between 1 and 2000);

alter table public.feedback drop constraint if exists feedback_author_check;
alter table public.feedback add constraint feedback_author_check
  check (
    (anonymous and author_name is null)
    or (
      not anonymous
      and author_name is not null
      and char_length(btrim(author_name)) between 1 and 40
    )
  );

alter table public.feedback drop constraint if exists feedback_no_mention;
alter table public.feedback add constraint feedback_no_mention
  check (
    position('@' in message) = 0
    and (author_name is null or position('@' in author_name) = 0)
  );

create index if not exists feedback_created_idx on public.feedback (created_at desc);

-- Absenden. Anonym speichert weder Namen noch Konto.
create or replace function public.submit_feedback(
  p_front text,
  p_category text,
  p_message text,
  p_name text,
  p_anonymous boolean
)
returns void
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  v_front text := lower(btrim(coalesce(p_front, '')));
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_message text := btrim(coalesce(p_message, ''));
  v_anonymous boolean := coalesce(p_anonymous, false);
  v_name text := btrim(coalesce(p_name, ''));
  v_hook text;
  v_who text;
  v_label text;
  v_content text;
begin
  if v_front not in ('retail', 'forever') then
    raise exception 'Bitte Retail oder Forever wählen.';
  end if;
  if v_category not in ('lob', 'kritik', 'vorschlag') then
    raise exception 'Bitte Lob, Kritik oder Vorschlag wählen.';
  end if;
  if v_message = '' then
    raise exception 'Bitte eine Nachricht schreiben.';
  end if;
  if char_length(v_message) > 2000 then
    raise exception 'Die Nachricht ist zu lang (höchstens 2000 Zeichen).';
  end if;
  if position('@' in v_message) > 0 then
    raise exception 'Bitte keine E-Mail oder @-Erwähnung eintragen.';
  end if;

  if v_anonymous then
    v_name := null;
  else
    v_name := btrim(regexp_replace(replace(replace(v_name, E'\r', ' '), E'\n', ' '), '[[:space:]]+', ' ', 'g'));
    if char_length(v_name) < 1 or char_length(v_name) > 40 then
      raise exception 'Bitte einen Namen mit 1 bis 40 Zeichen eingeben.';
    end if;
    if position('@' in v_name) > 0 then
      raise exception 'Bitte einen Namen ohne E-Mail eintragen.';
    end if;
  end if;

  insert into public.feedback (front, category, message, author_name, anonymous, user_id)
  values (
    v_front,
    v_category,
    v_message,
    v_name,
    v_anonymous,
    case when v_anonymous then null else auth.uid() end
  );

  begin
    select btrim(ds.decrypted_secret) into v_hook
    from vault.decrypted_secrets ds
    where ds.name = 'discord_feedback_webhook_' || v_front
    limit 1;
    if v_hook is null or v_hook = '' then
      select btrim(ds.decrypted_secret) into v_hook
      from vault.decrypted_secrets ds
      where ds.name = 'discord_feedback_webhook'
      limit 1;
    end if;
    if v_hook is null or v_hook = '' then
      select btrim(ds.decrypted_secret) into v_hook
      from vault.decrypted_secrets ds
      where ds.name = 'discord_chat_webhook'
      limit 1;
    end if;
    if v_hook is null or v_hook = '' or v_hook !~ '^https://' then
      return;
    end if;

    v_who := case when v_anonymous then 'Anonym' else v_name end;
    v_label := case v_category
      when 'lob' then 'Lob'
      when 'kritik' then 'Kritik'
      else 'Vorschlag'
    end;
    v_content := '💬 Meckerkasten ('
      || case when v_front = 'forever' then 'Forever' else 'Retail' end
      || ' · ' || v_label || ')' || E'\n'
      || 'Von: ' || v_who || E'\n\n'
      || v_message;

    perform net.http_post(
      url := v_hook,
      body := jsonb_build_object(
        'username', 'The Arc Flame Meckerkasten',
        'content', left(v_content, 1800),
        'allowed_mentions', jsonb_build_object('parse', jsonb_build_array())
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception
    when others then
      null;
  end;
end;
$$;

alter function public.submit_feedback(text, text, text, text, boolean) set search_path = public, net, vault;
alter function public.submit_feedback(text, text, text, text, boolean) set row_security = off;

-- Rechte -----------------------------------------------------------------

alter table public.feedback enable row level security;
alter table public.feedback force row level security;

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select to authenticated
  using (public.is_officer() and public.is_approved());

drop policy if exists feedback_delete on public.feedback;
create policy feedback_delete on public.feedback
  for delete to authenticated
  using (public.is_officer() and public.is_approved());

revoke all on table public.feedback from public, anon, authenticated;
grant select (id, front, category, message, author_name, anonymous, user_id, created_at)
  on table public.feedback to authenticated;
grant delete on table public.feedback to authenticated;

revoke all on function public.submit_feedback(text, text, text, text, boolean) from public;
grant execute on function public.submit_feedback(text, text, text, text, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
