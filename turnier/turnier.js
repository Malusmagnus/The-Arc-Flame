(function () {
  "use strict";

  var CLASSES = ["Krieger", "Paladin", "Jäger", "Schurke", "Priester", "Schamane", "Magier", "Hexenmeister", "Druide"];
  var FACTIONS = ["horde", "alliance"];
  var SIGNUP_FROM = "2026-10-11";
  var GUEST_LIST = "Die Teilnehmerliste sehen Gildenmitglieder und Angemeldete.";
  var VISIBLE_NOTE = "Turnierbaum sichtbar für angemeldete Teilnehmer.";
  var WAITING_NOTE = "Turnierbaum folgt nach der Auslosung.";
  var SUPABASE_URL = "https://asbhzoskbbifiuluijwl.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzYmh6b3NrYmJpZml1bHVpandsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MTYyMTIsImV4cCI6MjEwNTk5MjIxMn0.bmOULxoOVViR7WWiXWeawcufNKMOH3rNZsWbSHBwUU0";
  var PREVIEW_NAMES = [
    "Aldric", "Brenna", "Cedric", "Dagmar", "Eldrin", "Falka", "Gorim", "Hilda",
    "Ivar", "Jorun", "Keldric", "Liora", "Marek", "Nessa", "Osric", "Petra",
    "Quen", "Runa", "Soren", "Tilda", "Ulric", "Vessa", "Wulfgar", "Xara",
    "Ylva", "Borin", "Cora", "Dain", "Erna", "Finn", "Gilda", "Hagen",
    "Inga", "Jorek", "Kara", "Leif", "Mira", "Nils", "Orla", "Piotr",
    "Ragna", "Svea", "Torin"
  ];

  var rows = [];
  var adminRows = null;
  var epoch = 0;
  var adminEpoch = 0;
  var sending = false;
  var officer = false;
  var admin = false;
  var adminMissing = false;
  var remote = null;
  var preview = null;
  var currentBoard = null;
  var boardBusy = false;
  var listFailed = false;

  function bracketApi() {
    return window.TurnierBracket || null;
  }

  function h(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function createRemote() {
    var lib = window.supabase;
    var url = SUPABASE_URL.trim();
    var key = SUPABASE_ANON_KEY.trim();
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
    el.className = "status " + (kind === "error" ? "is-error" : "is-ok");
  }

  function showBoardStatus(message, kind) {
    var el = document.getElementById("baum-status");
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = "status " + (kind === "error" ? "is-error" : "is-ok");
  }

  function showBoardMessage(text, kind) {
    var note = document.getElementById("baum-note");
    if (!note) return;
    if (!text) {
      note.hidden = true;
      note.textContent = "";
      return;
    }
    note.hidden = false;
    note.textContent = text;
    note.className = kind === "wait" ? "muted" : "note";
  }

  function errorText(error, fallback) {
    var msg = String((error && error.message) || "").replace(/^ERROR:\s*/i, "").trim();
    if (!msg || /failed to fetch|network|jwt|schema cache|permission denied|PGRST/i.test(msg)) return fallback;
    return msg;
  }

  function missingRpc(error) {
    if (!error) return false;
    var code = String(error.code || "");
    var msg = String(error.message || "").toLowerCase();
    return code === "PGRST202" || code === "42P01" || code === "42883" || code === "PGRST205"
      || msg.indexOf("schema cache") >= 0
      || msg.indexOf("does not exist") >= 0
      || msg.indexOf("could not find the function") >= 0;
  }

  function normalizeRow(row) {
    if (!row || row.id == null) return null;
    var id = String(row.id);
    if (!isUuid(id)) return null;
    return {
      id: id,
      created_at: String(row.created_at || ""),
      character_name: String(row.character_name || "").trim(),
      className: String(row["class"] || row.class_name || row.className || "").trim(),
      faction: String(row.faction || "").toLowerCase(),
      discord_name: String(row.discord_name || "").trim(),
      is_mine: row.is_mine === true,
      state: "",
    };
  }

  function normalizeAdminRow(row) {
    if (!row || row.id == null) return null;
    var id = String(row.id);
    if (!isUuid(id) && !(preview && String(id).indexOf("preview-") === 0)) return null;
    var state = String(row.state || "");
    if (state !== "approved" && state !== "rejected" && state !== "pending") state = "pending";
    return {
      id: id,
      created_at: String(row.created_at || ""),
      character_name: String(row.character_name || "").trim(),
      className: String(row.class_name || row.className || row["class"] || "").trim(),
      faction: String(row.faction || "").toLowerCase(),
      discord_name: String(row.discord_name || "").trim(),
      is_mine: false,
      state: state,
    };
  }

  function compareRows(a, b) {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return a.character_name.localeCompare(b.character_name, "de");
  }

  function previewActive() {
    return !!(preview && preview.role !== "gast");
  }

  function canViewBoard() {
    if (preview && preview.role === "gast") return false;
    if (previewActive()) return true;
    if (admin) return true;
    return rows.some(function (row) { return row.is_mine === true; });
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

  function visibleRows() {
    var map = {};
    rows.forEach(function (row) {
      map[row.id] = {
        id: row.id,
        created_at: row.created_at,
        character_name: row.character_name,
        className: row.className,
        faction: row.faction,
        discord_name: row.discord_name,
        is_mine: row.is_mine === true,
        state: "",
      };
    });
    if (admin && adminRows) {
      adminRows.forEach(function (row) {
        if (!map[row.id]) {
          map[row.id] = {
            id: row.id,
            created_at: row.created_at,
            character_name: row.character_name,
            className: row.className,
            faction: row.faction,
            discord_name: row.discord_name,
            is_mine: false,
            state: row.state,
          };
        } else {
          map[row.id].state = row.state;
        }
      });
    }
    return Object.keys(map).map(function (id) { return map[id]; }).sort(compareRows);
  }

  function approvedSignups() {
    if (!admin || !adminRows) return [];
    return adminRows.filter(function (row) { return row.state === "approved"; });
  }

  function stateLabel(state) {
    if (state === "approved") return "Freigegeben";
    if (state === "rejected") return "Abgelehnt";
    if (state === "pending") return "Wartet auf Freigabe";
    return "";
  }

  function renderList() {
    var list = document.getElementById("tournament-list");
    if (!list) return;
    list.replaceChildren();
    var people = visibleRows();
    if (listFailed && !rows.length && !people.length) {
      list.appendChild(h("p", "error", "Die Teilnehmerliste konnte nicht geladen werden."));
      return;
    }
    if (!people.length) {
      var note = document.createElement("p");
      note.className = "muted";
      note.textContent = admin ? "Noch keine Anmeldung." : GUEST_LIST;
      list.appendChild(note);
      return;
    }
    var approvedCount = people.filter(function (row) { return row.state === "approved"; }).length;
    var count = document.createElement("p");
    count.className = "count";
    count.textContent = people.length === 1 ? "1 Teilnehmer" : people.length + " Teilnehmer";
    if (admin && adminRows) count.textContent += ", davon " + approvedCount + " freigegeben";
    var items = document.createElement("ul");
    items.className = "people";
    items.setAttribute("aria-label", "Teilnehmer");
    people.forEach(function (row) {
      var item = document.createElement("li");
      item.className = "person";
      var head = document.createElement("div");
      head.className = "person-head";
      var text = document.createElement("div");
      var name = document.createElement("p");
      name.className = "person-name";
      name.textContent = row.character_name || "Unbekannt";
      var meta = document.createElement("p");
      meta.className = "person-meta";
      meta.textContent = [row.className, factionLabel(row.faction)].filter(Boolean).join(" · ");
      text.append(name, meta);
      if (row.discord_name) {
        var discord = document.createElement("p");
        discord.className = "person-meta";
        discord.textContent = "Discord: " + row.discord_name;
        text.appendChild(discord);
      }
      var label = stateLabel(row.state);
      if (label) {
        var pill = document.createElement("p");
        pill.className = "pill pill-" + row.state;
        pill.textContent = label;
        text.appendChild(pill);
      }
      head.appendChild(text);
      var actions = document.createElement("div");
      actions.className = "person-actions";
      if (admin && row.state && row.state !== "approved") {
        actions.appendChild(statusButton(row, "approve", "Freigeben", "mini mini-good"));
      }
      if (admin && row.state && row.state !== "rejected") {
        actions.appendChild(statusButton(row, "reject", "Ablehnen", "mini mini-bad"));
      }
      if (officer || row.is_mine) {
        var cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "cancel";
        cancel.textContent = "Abmelden";
        cancel.setAttribute("aria-label", "Abmelden: " + (row.character_name || "Teilnehmer"));
        cancel.addEventListener("click", function () {
          cancelSignup(row.id);
        });
        actions.appendChild(cancel);
      }
      if (actions.childNodes.length) head.appendChild(actions);
      item.appendChild(head);
      items.appendChild(item);
    });
    list.append(count, items);
  }

  function statusButton(row, action, label, className) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.disabled = boardBusy;
    button.setAttribute("aria-label", label + ": " + (row.character_name || "Teilnehmer"));
    button.addEventListener("click", function () {
      setSignupState(row.id, action);
    });
    return button;
  }

  function loadList() {
    if (previewActive()) return Promise.resolve();
    if (!remote || typeof remote.rpc !== "function") return Promise.resolve();
    var current = epoch + 1;
    epoch = current;
    return remote.rpc("list_tournament_signups").then(function (result) {
      if (current !== epoch) return;
      if (!result || result.error) {
        listFailed = true;
        return;
      }
      listFailed = false;
      var data = Array.isArray(result.data) ? result.data : [];
      rows = data.map(normalizeRow).filter(Boolean);
      rows.sort(compareRows);
      renderList();
    }).catch(function () {
      listFailed = true;
    });
  }

  function loadAdminSignups() {
    if (previewActive() || !admin || !remote || typeof remote.rpc !== "function") return Promise.resolve();
    var current = adminEpoch + 1;
    adminEpoch = current;
    return remote.rpc("admin_list_tournament_signups").then(function (result) {
      if (current !== adminEpoch) return;
      if (!result || result.error) {
        adminRows = null;
        adminMissing = missingRpc(result && result.error);
        return;
      }
      adminMissing = false;
      var data = Array.isArray(result.data) ? result.data : [];
      adminRows = data.map(normalizeAdminRow).filter(Boolean);
    }).catch(function () {
      adminRows = null;
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
      admin = role === "admin";
    }).catch(function () {
      officer = false;
      admin = false;
    });
  }

  function refreshAfterSignup() {
    return loadList().then(loadAdminSignups).then(function () {
      renderList();
      return loadBoard();
    });
  }

  function submitSignup(form) {
    if (sending) return;
    if (!signupOpen()) {
      showStatus("Anmeldung zum Turnier der Kraft ab Sonntag, 11.10.2026.", "error");
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
      return refreshAfterSignup();
    }).catch(function () {
      showStatus("Die Anmeldung konnte nicht gespeichert werden.", "error");
    }).then(function () {
      sending = false;
      syncSignupGate();
    });
  }

  function findVisible(id) {
    return visibleRows().filter(function (row) { return row.id === id; })[0] || null;
  }

  function cancelSignup(id) {
    if (!isUuid(id) && !(previewActive() && String(id).indexOf("preview-") === 0)) return;
    var row = findVisible(id);
    if (!officer && !(row && row.is_mine)) {
      showStatus("Diese Anmeldung kannst du nicht zurücknehmen.", "error");
      return;
    }
    if (!previewActive() && (!remote || typeof remote.rpc !== "function")) {
      showStatus("Abmelden ist gerade nicht möglich.", "error");
      return;
    }
    var who = row && row.character_name ? row.character_name : "diesen Teilnehmer";
    if (!window.confirm("„" + who + "“ wirklich abmelden?")) return;
    if (previewActive()) {
      rows = rows.filter(function (item) { return item.id !== id; });
      if (adminRows) adminRows = adminRows.filter(function (item) { return item.id !== id; });
      renderList();
      renderBoard();
      showStatus("Anmeldung gelöscht. In der Beispielansicht wird nichts gespeichert.", "info");
      return;
    }
    remote.rpc("cancel_tournament_signup", { p_id: id }).then(function (result) {
      if (!result || result.error) {
        showStatus(errorText(result && result.error, "Die Anmeldung konnte nicht gelöscht werden."), "error");
        return null;
      }
      showStatus("Anmeldung gelöscht.", "info");
      return refreshAfterSignup();
    }).catch(function () {
      showStatus("Die Anmeldung konnte nicht gelöscht werden.", "error");
    });
  }

  function setSignupState(id, action) {
    if (!admin || boardBusy) return;
    var row = findVisible(id);
    var who = row && row.character_name ? row.character_name : "Diese Anmeldung";
    var question = action === "approve"
      ? "„" + who + "“ freigeben? Nur freigegebene Teilnehmer kommen in die Auslosung."
      : "„" + who + "“ ablehnen? Die Person zählt dann nicht für die Auslosung.";
    if (!window.confirm(question)) return;
    if (previewActive()) {
      if (adminRows) {
        adminRows.forEach(function (item) {
          if (item.id === id) item.state = action === "approve" ? "approved" : "rejected";
        });
      }
      renderList();
      renderBoard();
      showStatus(action === "approve"
        ? "Freigegeben. In der Beispielansicht wird nichts gespeichert."
        : "Abgelehnt. In der Beispielansicht wird nichts gespeichert.", "info");
      return;
    }
    if (!remote || typeof remote.rpc !== "function") {
      showStatus("Die Freigabe ist gerade nicht möglich.", "error");
      return;
    }
    boardBusy = true;
    renderList();
    remote.rpc("set_tournament_signup_status", { p_id: id, p_action: action }).then(function (result) {
      if (!result || result.error) {
        showStatus(errorText(result && result.error, "Der Status konnte nicht gespeichert werden."), "error");
        return null;
      }
      showStatus(action === "approve" ? "Anmeldung freigegeben." : "Anmeldung abgelehnt.", "info");
      return refreshAfterSignup();
    }).catch(function () {
      showStatus("Der Status konnte nicht gespeichert werden.", "error");
    }).then(function () {
      boardBusy = false;
      renderList();
      renderBoard();
    });
  }

  function clearBoardNodes() {
    ["baum-admin", "baum-groups", "baum-ko"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.replaceChildren();
    });
  }

  function renderBoard() {
    clearBoardNodes();
    if (!canViewBoard()) {
      showBoardMessage(VISIBLE_NOTE, "deny");
      return;
    }
    if (!currentBoard) {
      showBoardMessage(WAITING_NOTE, "wait");
      renderAdminBar();
      return;
    }
    showBoardMessage("", "");
    renderAdminBar();
    renderGroups();
    renderKo();
  }

  function renderAdminBar() {
    var host = document.getElementById("baum-admin");
    if (!host || !canViewBoard()) return;
    host.replaceChildren();
    if (previewActive()) {
      host.appendChild(h("p", "baum-banner", "Beispielansicht. Es wird nichts gespeichert."));
    }
    var bar = document.createElement("div");
    bar.className = "admin-bar";
    if (admin) {
      var approved = approvedSignups();
      var info = document.createElement("p");
      info.textContent = "Freigegeben: " + approved.length + ". Nur diese Personen kommen in die Auslosung.";
      bar.appendChild(info);
      if (!currentBoard) {
        var draw = document.createElement("button");
        draw.type = "button";
        draw.className = "btn-admin";
        draw.textContent = "Auslosung starten";
        draw.disabled = boardBusy || adminMissing || approved.length < 2 || !bracketApi();
        draw.addEventListener("click", startDraw);
        bar.appendChild(draw);
        if (approved.length < 2) {
          bar.appendChild(h("p", "", "Mindestens zwei freigegebene Teilnehmer."));
        }
      } else {
        var reset = document.createElement("button");
        reset.type = "button";
        reset.className = "btn-ghost";
        reset.textContent = "Auslosung zurücksetzen";
        reset.disabled = boardBusy;
        reset.addEventListener("click", resetDraw);
        bar.appendChild(reset);
        bar.appendChild(h("p", "", "Eine neue Freigabe ändert diesen Baum nicht. Dafür zuerst zurücksetzen."));
      }
      if (adminMissing) {
        bar.appendChild(h("p", "", "Die Auslosung ist noch nicht eingerichtet. Die SQL-Datei muss einmal im Supabase-SQL-Editor laufen."));
      }
    }
    var refresh = document.createElement("button");
    refresh.type = "button";
    refresh.className = "btn-ghost";
    refresh.textContent = "Aktualisieren";
    refresh.disabled = boardBusy;
    refresh.addEventListener("click", function () {
      if (previewActive()) {
        renderBoard();
        return;
      }
      refreshAfterSignup();
    });
    bar.appendChild(refresh);
    host.appendChild(bar);
  }

  function saveBoard(board, successText) {
    var api = bracketApi();
    if (!api || !remote || typeof remote.rpc !== "function") {
      showBoardStatus("Die Auslosung ist gerade nicht erreichbar.", "error");
      return;
    }
    boardBusy = true;
    renderBoard();
    remote.rpc("save_tournament_board", { p_board: api.toPayload(board) }).then(function (result) {
      if (!result || result.error || !result.data || result.data.access !== "ok") {
        showBoardStatus(errorText(result && result.error, "Die Auslosung konnte nicht gespeichert werden."), "error");
        return;
      }
      currentBoard = result.data.draw || null;
      showBoardStatus(successText, "info");
    }).catch(function () {
      showBoardStatus("Die Auslosung konnte nicht gespeichert werden.", "error");
    }).then(function () {
      boardBusy = false;
      renderBoard();
    });
  }

  function startDraw() {
    var api = bracketApi();
    if (!admin || boardBusy || !api) return;
    var approved = approvedSignups();
    if (approved.length < 2) {
      showBoardStatus("Mindestens zwei freigegebene Teilnehmer.", "error");
      return;
    }
    if (currentBoard) return;
    if (!window.confirm("Zufällige Auslosung mit " + approved.length + " freigegebenen Teilnehmern starten?")) return;
    var board;
    try {
      board = api.createDraw(approved.map(function (row) {
        return {
          id: row.id,
          character_name: row.character_name,
          className: row.className,
          faction: row.faction,
        };
      }));
    } catch (err) {
      showBoardStatus("Die Auslosung konnte nicht erstellt werden.", "error");
      return;
    }
    if (previewActive()) {
      currentBoard = board;
      renderBoard();
      showBoardStatus("Auslosung erstellt. In der Beispielansicht wird nichts gespeichert.", "info");
      return;
    }
    saveBoard(board, "Die Auslosung ist gespeichert.");
  }

  function resetDraw() {
    if (!admin || boardBusy) return;
    if (!window.confirm("Auslosung und Ergebnisse wirklich löschen? Die Anmeldungen bleiben erhalten.")) return;
    if (previewActive()) {
      currentBoard = null;
      renderBoard();
      showBoardStatus("Auslosung gelöscht. In der Beispielansicht wird nichts gespeichert.", "info");
      return;
    }
    if (!remote || typeof remote.rpc !== "function") {
      showBoardStatus("Zurücksetzen ist gerade nicht möglich.", "error");
      return;
    }
    boardBusy = true;
    renderBoard();
    remote.rpc("reset_tournament_board").then(function (result) {
      if (!result || result.error) {
        showBoardStatus(errorText(result && result.error, "Die Auslosung konnte nicht gelöscht werden."), "error");
        return;
      }
      currentBoard = null;
      showBoardStatus("Auslosung gelöscht.", "info");
    }).catch(function () {
      showBoardStatus("Die Auslosung konnte nicht gelöscht werden.", "error");
    }).then(function () {
      boardBusy = false;
      renderBoard();
    });
  }

  function chooseWinner(matchId, winnerId) {
    var api = bracketApi();
    if (!admin || boardBusy || !currentBoard || !api) return;
    var next = api.setWinner(currentBoard, matchId, winnerId);
    if (previewActive()) {
      currentBoard = next;
      renderBoard();
      return;
    }
    saveBoard(next, "Ergebnis gespeichert.");
  }

  function undoWinner(matchId) {
    var api = bracketApi();
    if (!admin || boardBusy || !currentBoard || !api) return;
    var next = api.clearWinner(currentBoard, matchId);
    if (previewActive()) {
      currentBoard = next;
      renderBoard();
      return;
    }
    saveBoard(next, "Ergebnis gelöscht.");
  }

  function slotView(match, side) {
    var api = bracketApi();
    var key = side === "b" ? "b" : "a";
    var entry = api ? api.entryById(currentBoard, match[key]) : null;
    if (entry) return { entry: entry, bye: false, text: "" };
    if (match.byeSide === side) return { entry: null, bye: true, text: "Freilos" };
    var placeholder = side === "b" ? match.placeholderB : match.placeholderA;
    if (placeholder) return { entry: null, bye: false, text: placeholder };
    return { entry: null, bye: false, text: "offen" };
  }

  function renderSlot(match, side) {
    var view = slotView(match, side);
    var slot = document.createElement("div");
    slot.className = "slot";
    if (view.bye) slot.classList.add("is-bye");
    if (view.entry && match.winner === view.entry.id) slot.classList.add("is-winner");
    var text = document.createElement("div");
    if (view.entry) {
      text.appendChild(h("p", "slot-name", view.entry.name || "Unbekannt"));
      var meta = [view.entry.className, factionLabel(view.entry.faction)].filter(Boolean).join(" · ");
      if (meta) text.appendChild(h("p", "slot-meta", meta));
    } else {
      text.appendChild(h("p", "slot-name", view.text));
    }
    slot.appendChild(text);
    if (admin && view.entry && match.a && match.b && !match.bye && !boardBusy) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "mini";
      button.textContent = match.winner === view.entry.id ? "Sieger" : "Sieger";
      button.setAttribute("aria-label", "Sieger: " + (view.entry.name || "Teilnehmer"));
      button.addEventListener("click", function () {
        chooseWinner(match.id, view.entry.id);
      });
      slot.appendChild(button);
    }
    return slot;
  }

  function renderMatch(match, title) {
    var box = document.createElement("div");
    box.className = "match";
    box.setAttribute("aria-label", title);
    box.appendChild(renderSlot(match, "a"));
    box.appendChild(renderSlot(match, "b"));
    if (admin && match.winner && !match.bye && match.a && match.b) {
      var undo = document.createElement("button");
      undo.type = "button";
      undo.className = "mini";
      undo.textContent = "Ergebnis löschen";
      undo.disabled = boardBusy;
      undo.addEventListener("click", function () {
        undoWinner(match.id);
      });
      var wrap = document.createElement("div");
      wrap.className = "slot";
      wrap.appendChild(undo);
      box.appendChild(wrap);
    }
    return box;
  }

  function renderGroups() {
    var api = bracketApi();
    var host = document.getElementById("baum-groups");
    if (!host || !currentBoard || !api || currentBoard.mode !== "groups") return;
    var block = document.createElement("div");
    block.className = "group-list";
    block.appendChild(h("h3", "", "Gruppen"));
    var groups = currentBoard.groups.slice().sort(function (a, b) { return a.sort - b.sort; });
    groups.forEach(function (group) {
      var card = document.createElement("article");
      card.className = "group-card";
      card.appendChild(h("h3", "", "Gruppe " + group.label));
      var members = currentBoard.entries.filter(function (entry) { return entry.groupId === group.id; });
      var matches = currentBoard.matches.filter(function (match) {
        return match.stage === "group" && match.groupId === group.id;
      }).sort(function (a, b) { return a.slot - b.slot; });
      var ranked = api.rankEntries(members, matches);
      var done = api.groupComplete(currentBoard, group.id);
      var table = document.createElement("table");
      table.className = "standings";
      var head = document.createElement("thead");
      var headRow = document.createElement("tr");
      ["Name", "Siege", "Niederlagen"].forEach(function (label, index) {
        var cell = document.createElement("th");
        cell.textContent = label;
        cell.scope = "col";
        if (index > 0) cell.className = "num";
        headRow.appendChild(cell);
      });
      head.appendChild(headRow);
      table.appendChild(head);
      var body = document.createElement("tbody");
      ranked.forEach(function (row, index) {
        var entry = api.entryById(currentBoard, row.id);
        var tr = document.createElement("tr");
        var nameCell = document.createElement("td");
        nameCell.textContent = entry ? entry.name : "Unbekannt";
        if (done && index < 2) {
          var tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = "weiter";
          nameCell.appendChild(tag);
        }
        var wins = document.createElement("td");
        wins.className = "num";
        wins.textContent = String(row.wins);
        var losses = document.createElement("td");
        losses.className = "num";
        losses.textContent = String(row.losses);
        tr.append(nameCell, wins, losses);
        body.appendChild(tr);
      });
      table.appendChild(body);
      card.appendChild(table);
      card.appendChild(h("p", "muted", done
        ? "Die ersten zwei sind weiter."
        : "Die ersten zwei kommen weiter, sobald alle Spiele dieser Gruppe eingetragen sind."));
      var list = document.createElement("div");
      list.className = "pair-list";
      matches.forEach(function (match) {
        list.appendChild(renderMatch(match, "Gruppe " + group.label));
      });
      card.appendChild(list);
      block.appendChild(card);
    });
    host.appendChild(block);
  }

  function renderKo() {
    var api = bracketApi();
    var host = document.getElementById("baum-ko");
    if (!host || !currentBoard || !api) return;
    var rounds = api.koRounds(currentBoard);
    if (!rounds.length) return;
    var block = document.createElement("div");
    block.className = "ko-wrap";
    block.appendChild(h("h3", "", "K.-o.-Runde"));
    var final = rounds[rounds.length - 1][0];
    if (final && final.winner) {
      var winner = api.entryById(currentBoard, final.winner);
      if (winner) {
        var banner = document.createElement("div");
        banner.className = "champion";
        banner.appendChild(h("p", "card-label", "Sieger des Turniers"));
        banner.appendChild(h("p", "slot-name", winner.name || "Unbekannt"));
        block.appendChild(banner);
      }
    }
    block.appendChild(h("p", "swipe", "Gold markiert den Sieger. Ein Freilos kommt ohne Kampf weiter. Auf dem Handy den Baum seitlich schieben."));
    var scroller = document.createElement("div");
    scroller.className = "ko-scroll";
    var ko = document.createElement("div");
    ko.className = "ko";
    rounds.forEach(function (round) {
      var col = document.createElement("div");
      col.className = "ko-col";
      col.appendChild(h("h3", "", api.roundName(round.length)));
      round.forEach(function (match) {
        col.appendChild(renderMatch(match, api.roundName(round.length)));
      });
      ko.appendChild(col);
    });
    scroller.appendChild(ko);
    block.appendChild(scroller);
    host.appendChild(block);
  }

  function loadBoard() {
    if (!canViewBoard()) {
      currentBoard = null;
      renderBoard();
      return Promise.resolve();
    }
    if (previewActive()) {
      renderBoard();
      return Promise.resolve();
    }
    if (!remote || typeof remote.rpc !== "function") {
      currentBoard = null;
      renderBoard();
      return Promise.resolve();
    }
    return remote.rpc("tournament_board").then(function (result) {
      if (!canViewBoard()) {
        currentBoard = null;
        renderBoard();
        return;
      }
      if (!result || result.error) {
        currentBoard = null;
        if (missingRpc(result && result.error)) adminMissing = true;
        renderBoard();
        if (admin && missingRpc(result && result.error)) {
          showBoardStatus("Die Auslosung ist noch nicht eingerichtet. Die SQL-Datei muss einmal im Supabase-SQL-Editor laufen.", "error");
        }
        return;
      }
      var data = result.data || {};
      if (data.access !== "ok") {
        currentBoard = null;
        renderBoard();
        showBoardMessage(VISIBLE_NOTE, "deny");
        return;
      }
      adminMissing = false;
      currentBoard = data.draw || null;
      renderBoard();
    }).catch(function () {
      currentBoard = null;
      renderBoard();
    });
  }

  function previewConfig() {
    var host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return null;
    var params = new URLSearchParams(window.location.search);
    var raw = params.get("vorschau");
    if (raw !== "5" && raw !== "16" && raw !== "40") return null;
    var role = params.get("rolle");
    if (role !== "gast" && role !== "teilnehmer" && role !== "admin") role = "teilnehmer";
    return { count: Number(raw), role: role };
  }

  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6d2b79f5) >>> 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function previewPeople(count, extra) {
    var list = [];
    var i;
    for (i = 0; i < count; i += 1) {
      list.push({
        id: "preview-" + (i + 1),
        created_at: "2026-10-12T10:00:" + String(i).padStart(2, "0"),
        character_name: PREVIEW_NAMES[i] || ("Held" + (i + 1)),
        className: CLASSES[i % CLASSES.length],
        faction: i % 2 === 0 ? "horde" : "alliance",
        discord_name: "",
        is_mine: false,
        state: "approved",
      });
    }
    extra.forEach(function (row, index) {
      list.push({
        id: "preview-x" + (index + 1),
        created_at: "2026-10-12T12:00:0" + index,
        character_name: row.name,
        className: row.className,
        faction: row.faction,
        discord_name: row.discord,
        is_mine: false,
        state: row.state,
      });
    });
    return list;
  }

  function playSampleGroup(board, group) {
    var api = bracketApi();
    var members = board.entries.filter(function (entry) { return entry.groupId === group.id; });
    members.sort(function (a, b) {
      if (a.tiebreak !== b.tiebreak) return a.tiebreak - b.tiebreak;
      return a.id < b.id ? -1 : 1;
    });
    var next = board;
    [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]].forEach(function (pair) {
      var left = members[pair[0]].id;
      var right = members[pair[1]].id;
      var match = next.matches.filter(function (item) {
        return item.stage === "group" && item.groupId === group.id
          && ((item.a === left && item.b === right) || (item.a === right && item.b === left));
      })[0];
      if (match) next = api.setWinner(next, match.id, left);
    });
    return next;
  }

  function bootPreview(config) {
    var api = bracketApi();
    admin = config.role === "admin";
    officer = admin;
    var extras = admin ? [
      { name: "Queldo", className: "Magier", faction: "horde", discord: "queldo", state: "pending" },
      { name: "Sira", className: "Priester", faction: "alliance", discord: "sira", state: "pending" },
      { name: "Torbjorn", className: "Krieger", faction: "horde", discord: "torbjorn", state: "rejected" },
    ] : [];
    var people = previewPeople(config.count, extras);
    rows = people.map(function (row) {
      return {
        id: row.id,
        created_at: row.created_at,
        character_name: row.character_name,
        className: row.className,
        faction: row.faction,
        discord_name: row.discord_name,
        is_mine: false,
        state: "",
      };
    });
    adminRows = admin ? people.map(function (row) {
      return normalizeAdminRow(row);
    }).filter(Boolean) : null;
    currentBoard = null;
    if (api) {
      try {
        currentBoard = api.createDraw(people.filter(function (row) { return row.state === "approved"; }), mulberry32(config.count));
        if (config.count === 40 && currentBoard.groups[0]) currentBoard = playSampleGroup(currentBoard, currentBoard.groups[0]);
        if (config.count === 5) {
          var real = currentBoard.matches.filter(function (match) {
            return match.stage === "ko" && match.round === 1 && !match.bye && match.a && match.b;
          })[0];
          if (real) currentBoard = api.setWinner(currentBoard, real.id, real.a);
        }
      } catch (err) {
        currentBoard = null;
      }
    }
    renderList();
    renderBoard();
  }

  function showListFailure() {
    var list = document.getElementById("tournament-list");
    if (!list) return;
    list.replaceChildren();
    var note = document.createElement("p");
    note.className = "error";
    note.textContent = "Die Teilnehmerliste konnte nicht geladen werden.";
    list.appendChild(note);
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
    preview = previewConfig();
    remote = createRemote();
    if (preview && preview.role !== "gast") {
      bootPreview(preview);
      return;
    }
    if (!remote) {
      showStatus("Die Anmeldung ist gerade nicht erreichbar.", "error");
      showListFailure();
      showBoardMessage(VISIBLE_NOTE, "deny");
      return;
    }
    loadRole().then(loadList).then(loadAdminSignups).then(function () {
      renderList();
      return loadBoard();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
