# The Arc Flame

Statische Gildenhomepage für **The Arc Flame** (World of Warcraft, Horde). Die Seite zeigt Retail und WoW Forever (Classic): Gildenleitung, Raidkader, Mitglieder, M+-Planer, Classic-Planer, Bewerbung, Gilden-Chat und die bearbeitbare Gildeninfo.

Sie wird über GitHub Pages unter [https://thearcflame.github.io/](https://thearcflame.github.io/) ausgeliefert. Eigene Dateien sind relativ verlinkt.

## Gildendaten

Mitglieder, Raidkader (Retail und Forever), Gildenleitung, M+-Gruppen, Classic-Runs, Status & Vision und der Gilden-Chat liegen in **Supabase**. Alle Besucher sehen denselben Stand, außer den Gilden-Chat: den lesen nur freigeschaltete Konten. Die Anmeldung läuft über E-Mail und Passwort. Neue Konten sind Mitglieder und warten auf Freischaltung. Offiziere und Administratoren schalten frei und pflegen Kader, Mitglieder, Leitung und die Statustexte. Administratoren vergeben zusätzlich die Rollen. Die eigene Rolle und den eigenen Status kann niemand selbst ändern.

Ältere Einträge im localStorage dieses Browsers werden nicht mehr gelesen und nicht in die Datenbank kopiert.

Ist Supabase nicht erreichbar, zeigt die Seite die Startwerte aus `js/defaults.js` und einen Hinweis auf Deutsch. Änderungen werden dann nicht gespeichert.

Einmalig `supabase/schema.sql` im SQL-Editor des Projekts ausführen. Liegt das Schema schon, zusätzlich `supabase/approval.sql` (Freischaltung). Die Auth-Einstellungen stehen in `supabase/README.md`. Projekt-URL und der öffentliche Schlüssel stehen in `js/config.js`.

Im Browser bleibt nur noch `arc_application_at`: der Abstand von 60 Sekunden zwischen zwei Bewerbungen auf diesem Gerät. Die Bewerbung selbst geht weiter an den Discord-Webhook. Eine Kopie erscheint im gemeinsamen Chat.

## Inhalte bearbeiten

Feste Überschriften stehen in den Dateien. Was die Gilde selbst pflegt, liegt in Supabase.

- **Feste Texte** (Überschriften, Raid-Zeit, Bewerbung): `index.html`
- **Startwerte** für Mitglieder, Kader, Leitung, M+, Classic-Runs, Chat und die drei Statustexte: `js/defaults.js` und derselbe Inhalt in `supabase/schema.sql`
- **Farben und Layout**: `css/input.css`, danach das Stylesheet neu bauen:

```bash
npm install
npm run build:css
```

Die fertige Datei `css/styles.css` liegt im Repository. GitHub Pages braucht dafür keinen Build.

Auf der Seite ändern Offiziere die Statustexte über **Informationen bearbeiten**. Mitglieder, Kader, Leitung, Planer und Chat haben eigene Formulare. Diese Änderungen gelten für alle Besucher.

## Discord

Einladungslink und Bewerbungs-Webhook stehen in `js/config.js`:

- `discordInviteUrl` — Ziel des Buttons **Discord beitreten**. Der Link steht nicht im HTML. Die Seite setzt ihn nur für freigeschaltete Konten. Alle anderen sehen den Hinweis „Discord-Zugang gibt es nach der Freischaltung“ mit Links zum Bewerben und Registrieren.
- `applicationWebhookUrl` — Adresse, an die das Bewerbungsformular ein Embed schickt. Dieselbe Adresse erhält nach einer Registrierung die Nachricht zur Freischaltung.

Zum Austauschen die beiden Werte in `js/config.js` ersetzen und die Seite neu veröffentlichen (Push auf `main`).

Die Webhook-URL liegt im öffentlichen JavaScript und ist für jeden Besucher sichtbar. Wenn sie missbraucht wird, den Webhook in Discord löschen und in `js/config.js` durch einen neuen ersetzen.

## Galerie

Die Sektion **Galerie** zeigt zuerst die Zeilen aus `public.gallery_images` (neueste zuerst) und danach die statischen Einträge aus `galleryImages` in `js/config.js`. Dieselbe Adresse wird nicht doppelt angezeigt. Solange beides leer ist, bleiben die Platzhalter mit **Screenshot folgt**.

Offiziere und Administratoren sehen **Bild hochladen**. Mehrere Dateien sind erlaubt, die Bildunterschrift ist optional und gilt für den ganzen Vorgang. Bilder, die breiter als 1920 Pixel sind, verkleinert der Browser vorher auf JPEG oder WebP. **Löschen** entfernt die Datei im Bucket `gallery` und die Zeile. Ein Klick auf das Bild öffnet die Lightbox (Escape, Pfeiltasten, Wischen).

Fehlt die Tabelle noch, bleibt die Seite bei den statischen Bildern und stürzt nicht ab. Dafür einmal `supabase/gallery.sql` ausführen (dieselben Anweisungen stehen in `supabase/schema.sql`). Siehe `supabase/README.md`.

Statische Bilder bleiben möglich:

1. Datei nach `assets/gallery/` legen (webp, png, jpg oder gif). Flache Dateinamen, kein Unterordner.
2. In `js/config.js` eintragen, zum Beispiel:

```js
galleryImages: [
  { src: "assets/gallery/samstag-raid.webp", alt: "Kurze Beschreibung des Bildes" },
],
```

3. Auf `main` pushen. Diese Dateien haben kein **Löschen** auf der Seite.

## Videos von Malusmagnus

Der Abschnitt bleibt **komplett ausgeblendet**, solange `youtubeChannelUrl` und `youtubeVideoIds` in `js/config.js` beide leer sind.

- `youtubeChannelUrl` — `https://`-Adresse auf youtube.com oder youtu.be, sonst leer lassen
- `youtubeVideoIds` — Liste der 11 Zeichen hinter `watch?v=`

```js
youtubeChannelUrl: "https://www.youtube.com/@Kanalname",
youtubeVideoIds: ["VIDEO_ID_11"],
```

Eingebunden wird erst nach einem Klick, über `youtube-nocookie.com`. Vorher liegt nur das Vorschaubild.

## Deployment auf GitHub Pages

Der Workflow `.github/workflows/pages.yml` veröffentlicht die Seite bei jedem Push auf `main`. Er nutzt `actions/configure-pages`, `actions/upload-pages-artifact` und `actions/deploy-pages`.

Einmalig im Repository einstellen: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

`.nojekyll` im Root sorgt dafür, dass GitHub Pages die Dateien nicht durch Jekyll schickt.

Die öffentliche Adresse ist `https://thearcflame.github.io/`.

## Lokal ansehen

Im Projektordner:

```bash
python3 -m http.server 4173
```

Dann [http://localhost:4173/](http://localhost:4173/) öffnen. Die Seite nicht per `file://` öffnen, sonst kann der Browser Skripte und Speicher blockieren.

## Projektstruktur

```
index.html          Seite
robots.txt          Crawler-Hinweise, Verweis auf die Sitemap
sitemap.xml         Sitemap der Startseite
css/input.css       Tailwind-Quelle
css/styles.css      fertiges Stylesheet
js/config.js        Discord, Supabase, statische Galerie und YouTube
js/defaults.js      Startwerte, falls Supabase nicht erreichbar ist
js/app.js           Verhalten
supabase/schema.sql Tabellen, Rechte, Startdaten, Galerie und Freischaltung
supabase/approval.sql Freischaltung (erneut ausführbar, auch in schema.sql)
supabase/gallery.sql Galerie-Bucket, Tabelle und Rechte (erneut ausführbar)
supabase/README.md  Einstellungen im Supabase-Dashboard
assets/             Emblem, Wortmarke, Hero, Favicon, Open-Graph-Bild, Schriften, Icons
assets/gallery/     Screenshots für die Galerie
.nojekyll
.github/workflows/pages.yml
```

Neue Dateien liegen unter `assets/`. Der Pages-Workflow kopiert diesen Ordner bereits mit; ein eigener Kopierschritt ist dafür nicht nötig.

Schrift: [Inter](https://rsms.me/inter/) und [Cinzel](https://fonts.google.com/specimen/Cinzel) (beide SIL Open Font License), selbst gehostet. Icons: [Font Awesome 6.4](https://fontawesome.com/) (Free).
