(function () {
  "use strict";

  var CLASSES = ["Krieger", "Paladin", "Jäger", "Schurke", "Priester", "Schamane", "Magier", "Hexenmeister", "Druide"];
  var FACTIONS = ["horde", "alliance"];
  var SIGNUP_FROM = "2026-10-11";
  var GUEST_LIST = "Die Teilnehmerliste sehen Gildenmitglieder und Angemeldete.";

  var rows = [];
  var epoch = 0;
  var sending = false;
  var officer = false;
  var remote = null;

  function config() {
    return window.ARC_CONFIG || {};
  }

  function createRemote() {
    var lib = window.supabase;
    var url = typeof config().supabaseUrl === "string" ? config().supabaseUrl.trim() : "";
    var key = typeof config().supabaseAnonKey === "string" ? config().supabaseAnonKey.trim() : "";
    if (!lib || typeof lib.createClient !== "function") return null;
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || key.length < 20) return null;
    try {
      return lib.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      return null;
    }
  }

  function berlinDate(date) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  function signupOpen() {
    return berlinDate(new Date()) >= SIGNUP_FROM;
  }

  function fieldValue(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || "") : "";
  }

  function allowedChoice(value, allowed) {
    var text = String(value || "").trim();
    if (!text) return "";
    return allowed.indexOf(text) >= 0 ? text : null;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function factionLabel(value) {
    var faction = String(value || "").toLowerCase();
    if (faction === "horde") return "Horde";
    if (faction === "alliance" || faction === "allianz") return "Allianz";
    return "";
  }

  function showStatus(message, kind) {
    var el = document.getElementById("tournament-status");
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = "text-sm " + (kind === "error" ? "text-red-400" : "text-emerald-400");
  }

  function errorText(error, fallback) {
    var msg = String((error && error.message) || "").replace(/^ERROR:\s*/i, "").trim();
    if (!msg || /failed to fetch|network|jwt|schema cache|permission denied|PGRST/i.test(msg)) return fallback;
    return msg;
  }

  function normalizeRow(row) {
    if (!row || row.id == null) return null;
    var id = String(row.id);
    if (!isUuid(id)) return null;
    return {
      id: id,
      created_at: String(row.created_at || ""),
      character_name: String(row.character_name || "").trim(),
      className: String(row["class"] || "").trim(),
      faction: String(row.faction || "").toLowerCase(),
      discord_name: String(row.discord_name || "").trim(),
      is_mine: row.is_mine === true,
    };
  }

  function syncSignupGate() {
    var open = signupOpen();
    var note = document.getElementById("signup-note");
    var fields = document.getElementById("tournament-fields");
    var button = document.getElementById("tournament-submit");
    if (note) note.hidden = open;
    if (fields) fields.disabled = !open;
    if (button) button.disabled = !open || sending;
  }

  function renderList() {
    var list = document.getElementById("tournament-list");
    if (!list) return;
    list.replaceChildren();
    if (!rows.length) {
      var note = document.createElement("p");
      note.className = "text-sm text-slate-400";
      note.textContent = GUEST_LIST;
      list.appendChild(note);
      return;
    }
    var count = document.createElement("p");
    count.className = "text-sm font-semibold text-amber-400";
    count.textContent = rows.length === 1 ? "1 Teilnehmer" : rows.length + " Teilnehmer";
    var items = document.createElement("ul");
    items.className = "grid grid-cols-1 gap-3 sm:grid-cols-2";
    items.setAttribute("aria-label", "Teilnehmer");
    rows.forEach(function (row) {
      var item = document.createElement("li");
      item.className = "rounded-xl border border-slate-800 bg-slate-950/60 p-4";
      var head = document.createElement("div");
      head.className = "flex items-start justify-between gap-3";
      var text = document.createElement("div");
      text.className = "min-w-0";
      var name = document.createElement("p");
      name.className = "break-words font-bold text-white";
      name.textContent = row.character_name || "Unbekannt";
      var meta = document.createElement("p");
      meta.className = "mt-1 text-sm text-slate-300";
      meta.textContent = [row.className, factionLabel(row.faction)].filter(Boolean).join(" · ");
      text.append(name, meta);
      if (row.discord_name) {
        var discord = document.createElement("p");
        discord.className = "mt-1 break-words text-sm text-slate-400";
        discord.textContent = "Discord: " + row.discord_name;
        text.appendChild(discord);
      }
      head.appendChild(text);
      if (officer || row.is_mine) {
        var cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs font-bold text-red-400 hover:text-white";
        cancel.textContent = "Abmelden";
        cancel.setAttribute("aria-label", "Abmelden: " + (row.character_name || "Teilnehmer"));
        cancel.addEventListener("click", function () {
          cancelSignup(row.id);
        });
        head.appendChild(cancel);
      }
      item.appendChild(head);
      items.appendChild(item);
    });
    list.append(count, items);
  }

  function loadList() {
    if (!remote || typeof remote.rpc !== "function") return Promise.resolve();
    var current = epoch + 1;
    epoch = current;
    return remote.rpc("list_tournament_signups").then(function (result) {
      if (current !== epoch) return;
      if (!result || result.error) {
        var list = document.getElementById("tournament-list");
        if (list && !rows.length) {
          list.replaceChildren();
          var note = document.createElement("p");
          note.className = "text-sm text-red-400";
          note.textContent = "Die Teilnehmerliste konnte nicht geladen werden.";
          list.appendChild(note);
        }
        return;
      }
      var data = Array.isArray(result.data) ? result.data : [];
      rows = data.map(normalizeRow).filter(Boolean);
      rows.sort(function (a, b) {
        if (a.created_at < b.created_at) return -1;
        if (a.created_at > b.created_at) return 1;
        return a.character_name.localeCompare(b.character_name, "de");
      });
      renderList();
    }).catch(function () {
      var list = document.getElementById("tournament-list");
      if (!list || rows.length) return;
      list.replaceChildren();
      var note = document.createElement("p");
      note.className = "text-sm text-red-400";
      note.textContent = "Die Teilnehmerliste konnte nicht geladen werden.";
      list.appendChild(note);
    });
  }

  function loadRole() {
    if (!remote || !remote.auth || typeof remote.auth.getSession !== "function") return Promise.resolve();
    return remote.auth.getSession().then(function (result) {
      var session = result && result.data && result.data.session;
      var user = session && session.user;
      if (!user) return null;
      return remote.from("profiles").select("role").eq("id", user.id).maybeSingle();
    }).then(function (result) {
      var role = result && result.data && result.data.role;
      officer = role === "officer" || role === "admin";
    }).catch(function () {
      officer = false;
    });
  }

  function submitSignup(form) {
    if (sending) return;
    if (!signupOpen()) {
      showStatus("Anmeldung ab Sonntag, 11.10.2026.", "error");
      syncSignupGate();
      return;
    }
    if (!remote || typeof remote.rpc !== "function") {
      showStatus("Die Anmeldung ist gerade nicht erreichbar.", "error");
      return;
    }
    var name = fieldValue("tournament-name").trim();
    var className = allowedChoice(fieldValue("tournament-class"), CLASSES);
    var faction = allowedChoice(fieldValue("tournament-faction"), FACTIONS);
    var discord = fieldValue("tournament-discord").trim();
    if (name.length < 2 || name.length > 24) {
      showStatus("Bitte einen Charakternamen mit 2 bis 24 Zeichen eingeben.", "error");
      return;
    }
    if (!className) {
      showStatus("Bitte eine Klasse aus der Liste wählen.", "error");
      return;
    }
    if (!faction) {
      showStatus("Bitte Horde oder Allianz wählen.", "error");
      return;
    }
    if (discord.length < 2 || discord.length > 40) {
      showStatus("Bitte einen Discord-Namen mit 2 bis 40 Zeichen eingeben.", "error");
      return;
    }
    var button = document.getElementById("tournament-submit");
    sending = true;
    if (button) button.disabled = true;
    remote.rpc("submit_tournament_signup", {
      p_character_name: name,
      p_class: className,
      p_faction: faction,
      p_discord_name: discord,
    }).then(function (result) {
      if (!result || result.error) {
        showStatus(errorText(result && result.error, "Die Anmeldung konnte nicht gespeichert werden."), "error");
        return null;
      }
      if (form) form.reset();
      showStatus("Danke. Du bist angemeldet.", "info");
      return loadList();
    }).catch(function () {
      showStatus("Die Anmeldung konnte nicht gespeichert werden.", "error");
    }).then(function () {
      sending = false;
      syncSignupGate();
    });
  }

  function cancelSignup(id) {
    if (!isUuid(id)) return;
    var row = rows.filter(function (item) { return item.id === id; })[0];
    if (!officer && !(row && row.is_mine)) {
      showStatus("Diese Anmeldung kannst du nicht zurücknehmen.", "error");
      return;
    }
    if (!remote || typeof remote.rpc !== "function") {
      showStatus("Abmelden ist gerade nicht möglich.", "error");
      return;
    }
    var who = row && row.character_name ? row.character_name : "diesen Teilnehmer";
    if (!window.confirm("„" + who + "“ wirklich abmelden?")) return;
    remote.rpc("cancel_tournament_signup", { p_id: id }).then(function (result) {
      if (!result || result.error) {
        showStatus(errorText(result && result.error, "Die Anmeldung konnte nicht gelöscht werden."), "error");
        return null;
      }
      showStatus("Anmeldung gelöscht.", "info");
      return loadList();
    }).catch(function () {
      showStatus("Die Anmeldung konnte nicht gelöscht werden.", "error");
    });
  }

  function boot() {
    syncSignupGate();
    var form = document.getElementById("tournament-form");
    if (form) {
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitSignup(form);
      });
    }
    remote = createRemote();
    if (!remote) {
      showStatus("Die Anmeldung ist gerade nicht erreichbar.", "error");
      var list = document.getElementById("tournament-list");
      if (list) {
        list.replaceChildren();
        var note = document.createElement("p");
        note.className = "text-sm text-red-400";
        note.textContent = "Die Teilnehmerliste konnte nicht geladen werden.";
        list.appendChild(note);
      }
      return;
    }
    loadRole().then(loadList);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
