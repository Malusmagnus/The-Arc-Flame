# Supabase für The Arc Flame

Die Seite liest und schreibt die Gildendaten über Supabase. Einmal `schema.sql` im **SQL Editor** ausführen. Die Datei kann erneut laufen: Tabellen und Richtlinien werden ersetzt, schon gefüllte Starttabellen bleiben unverändert.

Liegt `schema.sql` schon auf dem Projekt, die Freischaltung getrennt ausführen:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/approval.sql
```

Dieselben Anweisungen stehen in `schema.sql`. Der Lauf kann wiederholt werden. Profile, die beim ersten Anlegen der Spalte noch keinen Status haben, werden `approved`. Spätere Konten starten als `pending`.

Projekt-URL und der öffentliche Schlüssel stehen in `js/config.js`.

## Authentication → URL Configuration

- **Site URL:** `https://thearcflame.github.io`
- **Redirect URLs:**
  - `https://thearcflame.github.io/**`
  - `http://localhost:4173/**`

Ohne diese Adressen kommt der Anmeldelink nicht auf die Gildenseite zurück.

## E-Mail-Bestätigung ausschalten

**Authentication → Sign In / Providers → Email → Confirm email** deaktivieren.

Die Seite hat keinen eigenen Server. Bleibt die Bestätigung an, legt die Registrierung das Konto an, meldet aber nicht an, bis der Link in der Mail angeklickt wurde. Für diese Gildenseite soll ein neues Mitglied sich sofort anmelden können. Neue Konten sind trotzdem nur Mitglieder und bleiben `pending`, bis ein Offizier oder Administrator sie freischaltet. Die Rollen Offizier und Administrator vergibt danach ein Administrator. Offiziere und Administratoren gelten immer als freigeschaltet.

Falls die Bestätigung doch an bleiben soll, müssen Site URL und Redirect URLs wie oben gesetzt sein. Die Seite sagt dann: „Bitte bestätige die E-Mail“.

## Ersten Administrator setzen

Nach der eigenen Registrierung diese Zeile im SQL Editor ausführen und die E-Mail ersetzen. Sie steht auch auskommentiert am Ende von `schema.sql`. Über die Seite kann niemand die eigene Rolle anheben, auch kein Administrator.

```sql
update public.profiles
set role = 'admin', status = 'approved', approved_at = now()
where id = (select id from auth.users where email = 'deine@email.de');
```

Danach auf der Seite abmelden und wieder anmelden. Neben dem Namen erscheint **Rollen**. Weitere Konten werden dort Offizier oder Administrator. Die eigene Rolle lässt sich dort nicht ändern. Offiziere sehen **Freischaltungen** und können wartende Konten freischalten oder ablehnen. Abgelehnte Konten lassen sich dort wieder freischalten.

## Galerie

`gallery.sql` einmal ausführen, wenn `schema.sql` schon auf dem Projekt liegt und der Galerie-Block darin noch nicht gelaufen ist. Ein komplettes erneutes Ausführen von `schema.sql` enthält dieselben Anweisungen. Beides kann wiederholt werden.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/gallery.sql
```

Danach gibt es den öffentlichen Bucket `gallery` (höchstens 10 MB, JPEG, PNG, WebP, GIF) und die Tabelle `public.gallery_images`. Jeder darf die Bilder sehen. Hochladen und Löschen dürfen nur freigeschaltete Profile mit der Rolle `officer` oder `admin` (`public.is_officer()` und `public.is_approved()`). `gallery.sql` bricht ab, wenn `public.is_approved()` noch fehlt.

## Forever-Umfrage

`forever_poll.sql` einmal ausführen, wenn `schema.sql` schon auf dem Projekt liegt und der Umfrage-Block darin noch nicht gelaufen ist. Ein komplettes erneutes Ausführen von `schema.sql` enthält dieselben Anweisungen. Beides kann wiederholt werden.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/forever_poll.sql
```

Danach gibt es die Tabelle `public.forever_poll`. Lesen dürfen alle Besucher, aber nur die sichtbaren Spalten: `id`, `char_name`, `main_class`, `main_role`, `twink_class`, `twink_role`, `race`, `comment`, `created_at`, `updated_at`. Die Spalte `user_id` bleibt verborgen, deshalb die Spalten einzeln auswählen. Schreiben geht nur über `public.submit_forever_poll`. Angemeldete Konten haben einen Eintrag und ändern ihn beim erneuten Absenden. Ohne Anmeldung gilt ein Name einmal. Den eigenen Eintrag liefert `public.my_forever_poll`. Löschen dürfen freigeschaltete Offiziere und Administratoren (`public.is_officer()` und `public.is_approved()`).

## Realtime

`schema.sql` hängt `chat_messages` und `roster` an die Publication `supabase_realtime`. Unter **Database → Publications** sollten beide Tabellen dort stehen, damit Chat und Kader live mitlaufen.
