/* Öffentliche Gilden-Konfiguration.
   Die Webhook-URL steht absichtlich im ausgelieferten JavaScript,
   weil die Seite keinen Server hat. Bei Missbrauch den Webhook in
   Discord löschen und hier durch einen neuen ersetzen. */
window.ARC_CONFIG = {
  applicationWebhookUrl: "https://discord.com/api/webhooks/1553337995883585546/FlU1TmH7fUoFlY3RUD91_Xr0DFoWKDvfiUC-Xs0E4EgTVXAkmuYGUL5DEitJVLEb8CYr",
  discordInviteUrl: "https://discord.gg/g6TP8sBZQ",
  /* Leer lassen, bis echte Screenshots in assets/gallery/ liegen.
     Eintrag: { src: "assets/gallery/dateiname.webp", alt: "Kurze Beschreibung" } */
  galleryImages: [],
  /* Beide leer: der Abschnitt „Videos von Malusmagnus“ bleibt ausgeblendet.
     youtubeVideoIds erwartet die 11 Zeichen nach watch?v= */
  youtubeChannelUrl: "",
  youtubeVideoIds: [],
};
