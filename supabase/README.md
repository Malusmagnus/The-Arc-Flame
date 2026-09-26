# Supabase für The Arc Flame

Die Seite liest und schreibt die Gildendaten über Supabase. Einmal `schema.sql` im **SQL Editor** ausführen. Die Datei kann erneut laufen: Tabellen und Richtlinien werden ersetzt, schon gefüllte Starttabellen bleiben unverändert.

Projekt-URL und der öffentliche Schlüssel stehen in `js/config.js`.

## Authentication → URL Configuration

- **Site URL:** `https://thearcflame.github.io`
- **Redirect URLs:**
  - `https://thearcflame.github.io/**`
  - `http://localhost:4173/**`

Ohne diese Adressen kommt der Anmeldelink nicht auf die Gildenseite zurück.

## E-Mail-Bestätigung ausschalten

**Authentication → Sign In / Providers → Email → Confirm email** deaktivieren.

Die Seite hat keinen eigenen Server. Bleibt die Bestätigung an, legt die Registrierung das Konto an, meldet aber nicht an, bis der Link in der Mail angeklickt wurde. Für diese Gildenseite soll ein neues Mitglied sich sofort anmelden können. Neue Konten sind trotzdem nur Mitglieder. Die Rollen Offizier und Administrator vergibt danach ein Administrator.

Falls die Bestätigung doch an bleiben soll, müssen Site URL und Redirect URLs wie oben gesetzt sein. Die Seite sagt dann: „Bitte bestätige die E-Mail“.

## Ersten Administrator setzen

Nach der eigenen Registrierung diese Zeile im SQL Editor ausführen und die E-Mail ersetzen. Sie steht auch auskommentiert am Ende von `schema.sql`. Über die Seite kann niemand die eigene Rolle anheben, auch kein Administrator.

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'deine@email.de');
```

Danach auf der Seite abmelden und wieder anmelden. Neben dem Namen erscheint **Rollen**. Weitere Konten werden dort Offizier oder Administrator. Die eigene Rolle lässt sich dort nicht ändern.

## Galerie

`gallery.sql` einmal ausführen, wenn `schema.sql` schon auf dem Projekt liegt und der Galerie-Block darin noch nicht gelaufen ist. Ein komplettes erneutes Ausführen von `schema.sql` enthält dieselben Anweisungen. Beides kann wiederholt werden.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/gallery.sql
```

Danach gibt es den öffentlichen Bucket `gallery` (höchstens 10 MB, JPEG, PNG, WebP, GIF) und die Tabelle `public.gallery_images`. Jeder darf die Bilder sehen. Hochladen und Löschen dürfen nur Profile mit der Rolle `officer` oder `admin` (`public.is_officer()`).

## Realtime

`schema.sql` hängt `chat_messages` und `roster` an die Publication `supabase_realtime`. Unter **Database → Publications** sollten beide Tabellen dort stehen, damit Chat und Kader live mitlaufen.
