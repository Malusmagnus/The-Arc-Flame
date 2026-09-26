# The Arc Flame

Statische Gildenhomepage für **The Arc Flame** (World of Warcraft, Horde). Die Seite zeigt Retail und WoW Forever (Classic): Gildenleitung, Raidkader, Mitglieder, M+-Planer, Classic-Planer, Bewerbung, Gilden-Chat und die bearbeitbare Gildeninfo.

Sie wird über GitHub Pages unter [https://thearcflame.github.io/](https://thearcflame.github.io/) ausgeliefert. Eigene Dateien sind relativ verlinkt.

## Wichtig: Alle Daten bleiben im eigenen Browser

Es gibt **keinen Server und keine gemeinsame Datenbank**. Was jemand auf der Seite einträgt oder ändert, liegt im **localStorage dieses Browsers** — außer der Gildenbewerbung. Die geht an einen Discord-Webhook, damit die Leitung sie sieht. Eine Kopie bleibt zusätzlich im lokalen Gilden-Chat. Andere Personen sehen Mitglieder, Kader, Planer und Chat aus diesem Browser nicht.

Das betrifft den lokalen Speicher:

- Gildenmitglieder und Raidkader
- M+-Gruppen und Classic-Runs
- Gilden-Chat und die lokale Kopie einer Bewerbung
- die bearbeiteten Texte unter „Status & Vision“
- lokale Konten (Benutzername und Passwort)

Ein gemeinsames Backend ist der empfohlene nächste Schritt, damit Kader und Chat wirklich für die ganze Gilde gelten. Dafür eignen sich zum Beispiel **Supabase** oder **Firebase**.

Die Anmeldung ist kein echter Zugriffsschutz. Jede Person kann sich in ihrem Browser selbst als Mitglied oder Raidplaner registrieren. Passwörter werden **unverschlüsselt** im lokalen Speicher abgelegt. Es gibt keine vorgegebenen Konten.

### localStorage-Schlüssel

| Schlüssel | Inhalt |
| --- | --- |
| `arc_users` | lokale Konten |
| `arc_current_user` | aktuell angemeldete Person |
| `arc_retail_members` | Retail-Mitglieder |
| `arc_forever_members` | Forever-Mitglieder |
| `arc_retail_raid` | Retail-Raidkader |
| `arc_forever_raid` | Classic-Raidkader |
| `arc_mplus_groups` | M+-Gruppen |
| `arc_classic_runs` | Classic-Runs |
| `arc_guild_chat` | Chat und die lokale Kopie einer Bewerbung |
| `arc_guild_info` | die drei Statustexte |
| `arc_application_at` | Zeitpunkt der letzten erfolgreich gesendeten Bewerbung (60 Sekunden Abstand) |

Sobald ein Schlüssel gesetzt ist, gelten die Startwerte aus `js/defaults.js` für diesen Bereich nicht mehr. Zurücksetzen geht über **Lokale Daten löschen** in der Fußzeile oder über die Entwicklerwerkzeuge (Application → Local Storage).

## Inhalte bearbeiten

Texte, die für alle Besucher gleich sein sollen, stehen in den Dateien — nicht im Browser.

- **Sichtbare Texte und die Gildenleitung** (Namen, Rollen, Raid-Zeit, Überschriften): `index.html`
- **Startwerte** für Mitglieder, Kader, M+, Classic-Runs, Chat und die drei Statustexte: `js/defaults.js`  
  Diese Werte sieht nur, wer in diesem Browser noch nichts gespeichert hat.
- **Farben und Layout**: `css/input.css`, danach das Stylesheet neu bauen:

```bash
npm install
npm run build:css
```

Die fertige Datei `css/styles.css` liegt im Repository. GitHub Pages braucht dafür keinen Build.

Auf der Seite selbst lassen sich die Statustexte über **Informationen bearbeiten** ändern. Mitglieder, Kader, Planer und Chat haben eigene Formulare. Diese Änderungen bleiben lokal.

## Discord

Einladungslink und Bewerbungs-Webhook stehen in `js/config.js`:

- `discordInviteUrl` — Ziel der Buttons **Discord beitreten** (Kopfzeile und Bewerbung)
- `applicationWebhookUrl` — Adresse, an die das Bewerbungsformular ein Embed schickt

Zum Austauschen die beiden Werte in `js/config.js` ersetzen und die Seite neu veröffentlichen (Push auf `main`). Die Buttons lesen den Einladungslink beim Laden aus dieser Datei.

Die Webhook-URL liegt im öffentlichen JavaScript und ist für jeden Besucher sichtbar. Wenn sie missbraucht wird, den Webhook in Discord löschen und in `js/config.js` durch einen neuen ersetzen.

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
js/config.js        Discord-Einladung und Bewerbungs-Webhook
js/defaults.js      Startwerte
js/app.js           Verhalten und localStorage
assets/             Favicon, Open-Graph-Bild, Schriften, Icons
.nojekyll
.github/workflows/pages.yml
```

Schrift: [Inter](https://rsms.me/inter/) (SIL Open Font License). Icons: [Font Awesome 6.4](https://fontawesome.com/) (Free).
