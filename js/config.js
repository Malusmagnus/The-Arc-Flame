/* Öffentliche Gilden-Konfiguration.
   Die Webhook-URL steht absichtlich im ausgelieferten JavaScript,
   weil die Seite keinen Server hat. Bei Missbrauch den Webhook in
   Discord löschen und hier durch einen neuen ersetzen. */
window.ARC_CONFIG = {
  applicationWebhookUrl: "https://discord.com/api/webhooks/1553356945476427806/abNAiUCIk7I3IF0evg19Rb_aRbO0L4DrDIUQHuV3BzP0GhdD3THerXwUNVdSo4bZV5zX",
  discordInviteUrl: "https://discord.gg/g6TP8sBZQ",
  /* Öffentlicher Supabase-Schlüssel. Er darf im Browser stehen;
     Schreibrechte regelt die Datenbank, nicht dieser Schlüssel. */
  supabaseUrl: "https://asbhzoskbbifiuluijwl.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmh6b3NrYmJpZml1bHVpandsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTYyMTIsImV4cCI6MjEwNTk5MjIxMn0.bmOULxoOVViR7WWiXWeawcufNKMOH3rNZsWbSHBwUU0",
  /* Statische Bilder, zusätzlich zu den hochgeladenen oder als Ersatz,
     solange die Tabelle gallery_images noch nicht existiert.
     Eintrag: { src: "assets/gallery/dateiname.webp", alt: "Kurze Beschreibung" } */
  galleryImages: [],
  /* Beide leer: der Abschnitt „Videos von Malusmagnus“ bleibt ausgeblendet.
     youtubeVideoIds erwartet die 11 Zeichen nach watch?v= */
  youtubeChannelUrl: "https://www.youtube.com/@Malusmagnus-k9q",
  youtubeVideoIds: ["FZPBPVesvz0", "vDd96SSvch8", "2mjFd0iLDkQ"],
};
