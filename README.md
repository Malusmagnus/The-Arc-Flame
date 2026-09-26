# The Arc Flame

Statische Gildenhomepage für **The Arc Flame** (World of Warcraft, Horde). Die Seite zeigt Retail und WoW Forever (Classic): Gildenleitung, Raidkader, Mitglieder, M+-Planer, Classic-Planer, Bewerbung, Gilden-Chat und die bearbeitbare Gildeninfo.

Sie wird über GitHub Pages unter [https://thearcflame.github.io/](https://thearcflame.github.io/) ausgeliefert. Eigene Dateien sind relativ verlinkt.

## Gildendaten

Mitglieder, Raidkader (Retail und Forever), Gildenleitung, M+-Gruppen, Classic-Runs, Status & Vision und der Gilden-Chat liegen in **Supabase**. Alle Besucher sehen denselben Stand. Die Anmeldung läuft über E-Mail und Passwort. Neue Konten sind Mitglieder. Offiziere pflegen Kader, Mitglieder, Leitung und die Statustexte. Administratoren vergeben zusätzlich die Rollen. Die eigene Rolle kann niemand selbst anheben.

Ältere Einträge im localStorage dieses Browsers werden nicht mehr gelesen und nicht in die Datenbank kopiert.

Ist Supabase nicht erreichbar, zeigt die Seite die Startwerte aus `js/defaults.js` und einen Hinweis auf Deutsch. Änderungen werden dann nicht gespeichert.

Einmalig `supabase/schema.sql` im SQL-Editor des Projekts ausführen und die Auth-Einstellungen aus `supabase/README.md` setzen. Projekt-URL und der öffentliche Schlüssel stehen in `js/config.js`.

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

- `discordInviteUrl` — Ziel der Buttons **Discord beitreten** (Kopfzeile und Bewerbung)
- `applicationWebhookUrl` — Adresse, an die das Bewerbungsformular ein Embed schickt

Zum Austauschen die beiden Werte in `js/config.js` ersetzen und die Seite neu veröffentlichen (Push auf `main`). Die Buttons lesen den Einladungslink beim Laden aus dieser Datei.

Die Webhook-URL liegt im öffentlichen JavaScript und ist für jeden Besucher sichtbar. Wenn sie missbraucht wird, den Webhook in Discord löschen und in `js/config.js` durch einen neuen ersetzen.

## Galerie

Die Sektion **Galerie** liest `galleryImages` aus `js/config.js`. Solange die Liste leer ist, zeigt die Seite Platzhalter mit dem Hinweis **Screenshot folgt**. Das sind keine Spielbilder.

So kommt ein echtes Bild hinein:

1. Datei nach `assets/gallery/` legen (webp, png, jpg oder gif). Flache Dateinamen, kein Unterordner.
2. In `js/config.js` eintragen, zum Beispiel:

```js
galleryImages: [
  { src: "assets/gallery/samstag-raid.webp", alt: "Kurze Beschreibung des Bildes" },
],
```

3. Auf `main` pushen. WebP ist die schlanke Variante; png und jpg funktionieren genauso.

Ein Klick öffnet das Bild in einer Lightbox (Escape, Pfeiltasten, Wischen).

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
js/config.js        Discord, Supabase, Galerie und YouTube
js/defaults.js      Startwerte, falls Supabase nicht erreichbar ist
js/app.js           Verhalten
supabase/schema.sql Tabellen, Rechte und Startdaten
supabase/README.md  Einstellungen im Supabase-Dashboard
assets/             Emblem, Wortmarke, Hero, Favicon, Open-Graph-Bild, Schriften, Icons
assets/gallery/     Screenshots für die Galerie
.nojekyll
.github/workflows/pages.yml
```

Neue Dateien liegen unter `assets/`. Der Pages-Workflow kopiert diesen Ordner bereits mit; ein eigener Kopierschritt ist dafür nicht nötig.

Schrift: [Inter](https://rsms.me/inter/) und [Cinzel](https://fonts.google.com/specimen/Cinzel) (beide SIL Open Font License), selbst gehostet. Icons: [Font Awesome 6.4](https://fontawesome.com/) (Free).
