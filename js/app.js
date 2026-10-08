/* The Arc Flame
   Gildendaten kommen aus Supabase. localStorage bleibt nur für die
   Bewerbungs-Pause in diesem Browser (arc_application_at). */
(function () {
  "use strict";

  const DEFAULTS = window.ARC_DEFAULTS || {
    retailMembers: [],
    foreverMembers: [],
    retailRaid: [],
    foreverRaid: [],
    mplusGroups: [],
    classicRuns: [],
    chatMessages: [],
    guildInfo: { col1: "", col2: "", col3: "" },
    leadership: [],
  };

  const OFFLINE_MSG = "Die Gildendaten konnten nicht geladen werden. Es werden die Standardwerte angezeigt.";
  const SAVE_FAIL = "Speichern ist gerade nicht möglich. Die Änderung wurde nicht übernommen.";
  const PENDING_NOTICE = "Deine Registrierung wartet auf Freischaltung durch einen Offizier.";
  const REJECTED_NOTICE = "Deine Registrierung wurde abgelehnt.";
  const DISCORD_NOTE = "Discord-Zugang gibt es nach der Freischaltung.";
  const CHAT_PUBLIC_HINT = "Nachrichten sind für alle Besucher sichtbar. Zum Schreiben bitte anmelden.";
  const CHAT_MEMBER_HINT = "Der Gilden-Chat ist für freigeschaltete Mitglieder sichtbar.";
  const CHAT_LOCKED_HINT = "Der Gilden-Chat öffnet sich nach der Freischaltung.";

  const FOREVER_IDS = new Set([
    "content-forever",
    "forever-uebersicht",
    "forever-planer",
    "forever-kader",
    "forever-mitglieder",
    "forever-dkp",
    "forever-beute",
    "forever-karte",
  ]);
  const RETAIL_IDS = new Set([
    "retail-leitung",
    "retail-kader",
    "retail-mplus",
    "retail-mitglieder",
  ]);

  const NAV_LINK =
    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white";
  const NAV_LINK_ON =
    "inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white";
  const QUICK_LINK =
    "inline-flex items-center justify-center rounded-lg p-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-white";
  const TAB_BASE =
    "flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs font-bold transition-all sm:px-5 sm:text-sm";
  const TAB_RETAIL_ON =
    TAB_BASE +
    " bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-900/50";
  const TAB_FOREVER_ON =
    TAB_BASE +
    " bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-900/50";
  const TAB_OFF = TAB_BASE + " text-slate-400 hover:text-white";
  const LOGIN_BTN =
    "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-amber-400 transition hover:bg-slate-700";

  const RETAIL_NAV = [
    { href: "#werte", label: "Über uns", icon: "fa-fire", tone: "text-amber-400" },
    { href: "#retail-leitung", label: "Leitung", icon: "fa-crown", tone: "text-amber-400" },
    { href: "#retail-kader", label: "Raidkader", icon: "fa-shield", tone: "text-red-500" },
    { href: "#raidplanung", label: "Raids", icon: "fa-calendar-days", tone: "text-amber-400" },
    { href: "#retail-mplus", label: "M+ Planer", icon: "fa-stopwatch", tone: "text-amber-400" },
    { href: "#retail-mitglieder", label: "Mitglieder", icon: "fa-users", tone: "text-red-500" },
    { href: "#forever-umfrage", label: "Forever-Umfrage", icon: "fa-clipboard-list", tone: "text-amber-400" },
    { href: "#galerie", label: "Galerie", icon: "fa-image", tone: "text-amber-400" },
    { href: "#bewerbung", label: "Bewerbung", icon: "fa-scroll", tone: "text-amber-400" },
    { href: "#gilden-chat", label: "Chat", icon: "fa-comments", tone: "text-emerald-400" },
    { href: "#meckerkasten", label: "Meckerkasten", icon: "fa-comment-dots", tone: "text-amber-400" },
  ];
  const FOREVER_NAV = [
    { href: "#werte", label: "Über uns", icon: "fa-fire", tone: "text-amber-400" },
    { href: "#forever-uebersicht", label: "Übersicht", icon: "fa-hourglass-start", tone: "text-amber-400" },
    { href: "#forever-beute", label: "Beute", icon: "fa-gem", tone: "text-amber-400" },
    { href: "#forever-karte", label: "Karte", icon: "fa-map", tone: "text-amber-400" },
    { href: "#raidplanung", label: "Raids", icon: "fa-calendar-days", tone: "text-amber-400" },
    { href: "#forever-planer", label: "Classic Planer", icon: "fa-skull", tone: "text-amber-400" },
    { href: "#forever-kader", label: "Classic Kader", icon: "fa-shield-cat", tone: "text-amber-400" },
    { href: "#forever-mitglieder", label: "Classic Mitglieder", icon: "fa-users", tone: "text-amber-400" },
    { href: "#forever-dkp", label: "DKP", icon: "fa-coins", tone: "text-amber-400" },
    { href: "#forever-umfrage", label: "Forever-Umfrage", icon: "fa-clipboard-list", tone: "text-amber-400" },
    { href: "#galerie", label: "Galerie", icon: "fa-image", tone: "text-amber-400" },
    { href: "#bewerbung", label: "Bewerbung", icon: "fa-scroll", tone: "text-amber-400" },
    { href: "#gilden-chat", label: "Chat", icon: "fa-comments", tone: "text-emerald-400" },
    { href: "#meckerkasten", label: "Meckerkasten", icon: "fa-comment-dots", tone: "text-amber-400" },
  ];

  let activeFront = "retail";
  let lastFocus = null;
  let noticeTimer = 0;
  let gallery = [];
  let galleryIndex = 0;
  let galleryFromDb = [];
  let galleryDbReady = false;
  let galleryBusy = false;
  let galleryWebp = null;
  let revealObserver = null;
  let remote = null;
  let remoteReady = false;
  let liveChannel = null;
  let liveChannelFront = "";
  let liveChannelSerial = 0;
  let authReady = false;
  let chatRefreshTimer = 0;
  let chatLoadEpoch = 0;
  let rosterRefreshTimer = 0;
  let raidRefreshTimer;
  let serverPollRefreshTimer = 0;

  const retailMembers = clone(DEFAULTS.retailMembers || []);
  const foreverMembers = clone(DEFAULTS.foreverMembers || []);
  const retailRaid = clone(DEFAULTS.retailRaid || []);
  const foreverRaid = clone(DEFAULTS.foreverRaid || []);
  const mplusGroups = clone(DEFAULTS.mplusGroups || []);
  const classicRuns = clone(DEFAULTS.classicRuns || []);
  const chatMessages = clone(DEFAULTS.chatMessages || []);
  const leadership = clone(DEFAULTS.leadership || []);
  const guildInfo = clone(DEFAULTS.guildInfo || { col1: "", col2: "", col3: "" });
  let currentUser = null;
  let approvalEnforced = false;
  let profileDirectory = [];
  let profileGameFilter = "all";
  const profileGameSaving = {};
  let approvedProfiles = [];
  let approvedProfilesState = "idle";
  let approvedProfilesEpoch = 0;
  let approvedProfileWaiters = [];
  let memberPickQuery = "";
  let memberPickSelected = {};
  let memberPickBusy = false;
  let raidPickQuery = "";
  let raidPickSelected = {};
  let raidPickBusy = false;
  let dkpPickQuery = "";
  let dkpPickSelected = {};
  let leadershipPickQuery = "";
  let foreverPollRows = [];
  let foreverPollOwn = null;
  let foreverPollSending = false;
  let foreverPollReadable = false;
  let serverPollResults = [];
  let serverPollVotes = [];
  let serverPollOwn = null;
  let serverPollChoice = "";
  let serverPollSending = false;
  let serverPollNamePrefill = "";
  let serverPollVotesLoaded = false;
  let serverPollVotesLoading = false;
  let serverPollVotesError = false;
  let serverPollChannel = null;
  let applicationRows = [];
  let applicationStatus = "pending";
  let applicationFront = "all";
  let applicationPendingCount = 0;
  let applicationEpoch = 0;
  let applicationBusyId = "";
  let applicationState = "idle";
  let applicationsWatching = false;
  let applicationChannel = null;
  let applicationChannelSerial = 0;
  let applicationRefreshTimer = 0;
  let applicationFollow = null;
  let feedbackCategory = "";
  let feedbackFrontTouched = false;
  let feedbackSending = false;
  let feedbackNamePrefill = "";
  let feedbackNameDraft = null;

  const RAID_TITLES = {
    forever: ["Geschmolzener Kern", "Onyxias Hort", "Pechschwingenhort", "Zul'Gurub", "Ruinen von Ahn'Qiraj", "Tempel von Ahn'Qiraj", "Naxxramas"],
    retail: ["The Venomous Abyss (Ula'tek, Season 2)", "Die Leerenspitze", "Der Traumriss", "Marsch auf Quel'Danas", "Nerub-ar-Palast", "Befreiung von Lorenhall", "Manaschmiede Omega"],
  };
  const RAID_PUBLIC_COLUMNS = "id, front, title, starts_at, max_size, status";
  const RAID_MEMBER_COLUMNS = RAID_PUBLIC_COLUMNS + ", note";
  const RAID_SIGNUP_COLUMNS = "id, raid_id, user_id, status, role, character_name, discord_name";
  const RAID_STATUSES = ["Zusage", "Vielleicht", "Absage"];
  const RAID_ROLES = ["Tank", "Heiler", "Schaden"];
  const RAID_BTN = "inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 py-3 text-base font-extrabold transition";
  const RAID_BTN_OFF = RAID_BTN + " bg-slate-800 font-bold text-white hover:bg-slate-700";
  const RAID_BTN_PICK = RAID_BTN + " bg-amber-500 text-slate-950";
  let raidRows = [];
  let raidSignups = [];
  let raidCounts = {};
  let raidFront = "retail";
  let raidState = "loading";
  let raidEditingId = "";
  let raidPlanFront = "retail";
  let raidBusy = false;
  let raidEpoch = 0;
  let raidNamesReady = false;

  const FOREVER_POLL_CLASSES = ["Krieger", "Paladin", "Jäger", "Schurke", "Priester", "Schamane", "Magier", "Hexenmeister", "Druide"];
  const FOREVER_POLL_TWINK = FOREVER_POLL_CLASSES.concat(["Noch unklar"]);
  const FOREVER_POLL_ROLES = ["Tank", "Heiler", "Schaden"];
  const FOREVER_POLL_RACES = ["Skyborne", "Orc", "Untoter", "Tauren", "Troll"];
  const FOREVER_POLL_COLUMNS = "id, char_name, main_class, main_role, twink_class, twink_role, race, comment, created_at, updated_at";
  const SERVER_POLL_OPTIONS = [
    { value: "pve", label: "PvE" },
    { value: "pvp", label: "PvP" },
    { value: "rp", label: "RP" },
    { value: "egal", label: "Mir egal" },
  ];
  const SERVER_POLL_VALUES = ["pve", "pvp", "rp", "egal"];
  const SERVER_POLL_CHOICE_ON =
    "inline-flex h-full min-h-11 w-full items-center justify-center rounded-xl bg-amber-500 px-3 py-4 text-center text-lg font-black text-slate-950";
  const SERVER_POLL_CHOICE_OFF =
    "inline-flex h-full min-h-11 w-full items-center justify-center rounded-xl bg-slate-800 px-3 py-4 text-center text-lg font-bold text-white transition hover:bg-slate-700";

  const DKP_HISTORY_COLUMNS = "id, created_at, kind, player_id, char_name, activity_type_id, activity_name, item_id, item_name, dkp_change, overflow_change, dkp_after, overflow_after, reason, batch_id, reverses_id, officer_name";
  const DKP_PAGE_SIZE = 50;
  const DKP_INPUT = "min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 focus:border-amber-500";
  const DKP_TAB_ON = "inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-sm font-extrabold text-slate-950";
  const DKP_TAB_OFF = "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-700";
  const DKP_LOAD_FAIL = "Die DKP-Daten sind gerade nicht erreichbar. Bitte versuche es später noch einmal.";

  let dkpPlayers = [];
  let dkpActivityTypes = [];
  let dkpItems = [];
  let dkpHistory = [];
  let dkpHistoryHasMore = false;
  let dkpLoaded = false;
  let dkpLoadFailed = false;
  let dkpBusy = false;
  let dkpEpoch = 0;
  let dkpHistoryEpoch = 0;
  let dkpSort = { key: "dkp", dir: "desc" };
  let dkpPlayerQuery = "";
  let dkpShowInactive = false;
  let dkpHistoryPlayerId = "";
  let dkpShowSetup = false;
  let dkpAwardQuery = "";
  let dkpSelectedIds = {};
  let dkpPointsStamp = "";
  let dkpOfficerTab = "import";
  let dkpReverseId = "";
  let dkpImportSource = "forever";
  let dkpImportQuery = "";
  let dkpImportSelected = {};
  let dkpImportNames = {};

  const LOOT_SLOTS = ["Kopf", "Hals", "Schulter", "Rücken", "Brust", "Handgelenke", "Hände", "Taille", "Beine", "Füße", "Finger", "Schmuck", "Einhand", "Waffenhand", "Zweihand", "Schildhand", "Nebenhand", "Distanz", "Zauberstab", "Tasche", "Sonstiges"];
  const LOOT_STAT_ORDER = ["Schaden", "Schattenschaden", "Schadensart", "Tempo", "DPS", "Rüstung", "Blocken", "Stärke", "Beweglichkeit", "Ausdauer", "Intelligenz", "Willenskraft"];
  const LOOT_ATTR = { "Stärke": true, "Beweglichkeit": true, "Ausdauer": true, "Intelligenz": true, "Willenskraft": true };
  const LOOT_ARMOR = ["Stoff", "Leder", "Schwere Rüstung", "Platte"];
  const LOOT_QUALITIES = [
    { id: "poor", label: "Schlecht" },
    { id: "common", label: "Gewöhnlich" },
    { id: "uncommon", label: "Ungewöhnlich" },
    { id: "rare", label: "Selten" },
    { id: "epic", label: "Episch" },
    { id: "legendary", label: "Legendär" },
  ];
  const LOOT_INPUT = "min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 focus:border-amber-500";
  const LOOT_BTN = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700";
  const LOOT_BTN_AMBER = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400";
  const LOOT_BTN_DANGER = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-red-400 transition hover:bg-slate-700";
  let lootInstances = [];
  let lootState = "loading";
  let lootError = "";
  let lootSelectedId = "";
  let lootOpen = {};
  let lootFilterKey = "";
  let lootPreferKey = "";
  let lootSaving = false;
  let lootEpoch = 0;
  let lootRefreshTimer = 0;
  let lootChannel = null;
  let lootFiltersReady = false;

  document.addEventListener("DOMContentLoaded", boot);

  const APPLICATION_COOLDOWN_MS = 60000;

  function boot() {
    bindStaticEvents();
    renderDiscordSlots();
    renderGallery();
    renderVideos();
    setupReveal();
    startEmbers();
    bindLightboxTouch();
    renderMembers("retail");
    renderMembers("forever");
    renderRaidKader("retail");
    renderRaidKader("forever");
    renderMPlusGroups();
    renderClassicRuns();
    renderChat();
    renderLeadership();
    loadGuildInfoView();
    renderForeverPoll();
    renderServerPoll();
    initLootFilters();
    renderLoot();
    updateAuthUI();
    loadRemote();
    const hash = location.hash.replace(/^#/, "");
    if (FOREVER_IDS.has(hash)) switchFront("forever");
    else switchFront("retail");
    initFeedbackForm();
    resetRaidForm();
    if (hash.indexOf("raid-") === 0) {
      /* Der Termin kommt erst aus der Datenbank. Danach scrollt focusLinkedRaid. */
    } else if (hash && document.getElementById(hash)) {
      goTo(hash, { updateHistory: false, behavior: "instant" });
    }
  }

  function bindStaticEvents() {
    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("submit", onSubmit);
    window.addEventListener("popstate", function () {
      const id = location.hash.replace(/^#/, "");
      if (id) goTo(id, { updateHistory: false, behavior: "auto" });
    });

    ["retail", "forever"].forEach(function (front) {
      const list = document.getElementById(front + "-members-list");
      const grid = document.getElementById(front + "-kader-grid");
      const search = document.getElementById(front + "-search");
      if (list) list.addEventListener("dragstart", onMemberDragStart);
      if (grid) {
        grid.addEventListener("dragover", function (event) {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
        });
        grid.addEventListener("drop", function (event) {
          dropToRaid(event, front);
        });
      }
      if (search) {
        search.addEventListener("input", function () {
          renderMembers(front);
        });
      }
    });

    const mode = document.getElementById("auth-mode");
    if (mode) mode.addEventListener("change", syncAuthMode);

    const meckerFront = document.getElementById("mecker-front");
    if (meckerFront) {
      meckerFront.addEventListener("change", function () {
        feedbackFrontTouched = true;
      });
    }
    const meckerAnonymous = document.getElementById("mecker-anonymous");
    if (meckerAnonymous) meckerAnonymous.addEventListener("change", syncFeedbackAnonymous);
    const meckerMessage = document.getElementById("mecker-message");
    if (meckerMessage) meckerMessage.addEventListener("input", updateFeedbackCount);

    const galleryFile = document.getElementById("gallery-file");
    if (galleryFile) {
      galleryFile.addEventListener("change", function () {
        const picked = Array.prototype.slice.call(galleryFile.files || []);
        galleryFile.value = "";
        if (!picked.length) return;
        uploadGalleryFiles(picked);
      });
    }

    const dkpSearch = document.getElementById("dkp-search");
    if (dkpSearch) {
      dkpSearch.addEventListener("input", function () {
        dkpPlayerQuery = dkpSearch.value;
        renderDkpScores();
      });
    }
    const dkpAwardSearch = document.getElementById("dkp-activity-search");
    if (dkpAwardSearch) {
      dkpAwardSearch.addEventListener("input", function () {
        dkpAwardQuery = dkpAwardSearch.value;
        renderDkpAwardPlayers();
      });
      dkpAwardSearch.addEventListener("keydown", function (event) {
        if (event.key === "Enter") event.preventDefault();
      });
    }
    const dkpImportSearch = document.getElementById("dkp-import-search");
    if (dkpImportSearch) {
      dkpImportSearch.addEventListener("input", function () {
        dkpImportQuery = dkpImportSearch.value;
        renderDkpImport();
      });
      dkpImportSearch.addEventListener("keydown", function (event) {
        if (event.key === "Enter") event.preventDefault();
      });
    }
    const dkpImportList = document.getElementById("dkp-import-list");
    if (dkpImportList) {
      dkpImportList.addEventListener("input", function (event) {
        const field = event.target;
        if (!field || !field.dataset || !field.dataset.importName || dkpBusy) return;
        dkpImportNames[field.dataset.importName] = field.value;
        syncDkpImportRow(field);
      });
    }
    bindPickSearch("member-pick-search", function (value) {
      memberPickQuery = value;
      renderMemberPicker();
    });
    bindPickSearch("raid-pick-search", function (value) {
      raidPickQuery = value;
      renderRaidPicker();
    });
    bindPickSearch("dkp-player-pick-search", function (value) {
      dkpPickQuery = value;
      renderDkpPlayerPicker();
    });
    bindPickSearch("leadership-pick-search", function (value) {
      leadershipPickQuery = value;
      renderLeadershipPicker();
    });

    const lootSearch = document.getElementById("loot-search");
    if (lootSearch) {
      lootSearch.addEventListener("input", function () {
        renderLoot();
      });
    }

    const serverChoices = document.getElementById("server-poll-choices");
    if (serverChoices) {
      serverChoices.addEventListener("keydown", function (event) {
        const buttons = Array.prototype.slice.call(serverChoices.querySelectorAll("[data-choice]"));
        const current = event.target.closest("[data-choice]");
        if (!current || !buttons.length) return;
        let delta = 0;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") delta = 1;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") delta = -1;
        else return;
        event.preventDefault();
        const index = buttons.indexOf(current);
        const next = buttons[(index + delta + buttons.length) % buttons.length];
        setServerPollChoice(next.dataset.choice);
        next.focus();
      });
    }
  }

  function bindPickSearch(id, onInput) {
    const field = document.getElementById(id);
    if (!field) return;
    field.addEventListener("input", function () {
      onInput(field.value);
    });
    field.addEventListener("keydown", function (event) {
      if (event.key === "Enter") event.preventDefault();
    });
  }

  function onClick(event) {
    const actionEl = event.target.closest("[data-action]");
    if (actionEl) {
      handleAction(actionEl, event);
      return;
    }
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor) return;
    const id = anchor.getAttribute("href").slice(1);
    if (!id || !document.getElementById(id)) return;
    event.preventDefault();
    goTo(id);
  }

  function handleAction(el, event) {
    const action = el.dataset.action;
    if (action.indexOf("loot-") === 0) {
      handleLootAction(action, el);
      return;
    }
    const front = el.dataset.front === "forever" ? "forever" : "retail";
    if (action === "switch-front") {
      switchFront(el.dataset.front, { scroll: true });
      return;
    }
    if (action === "mecker-category") {
      setFeedbackCategory(el.dataset.category);
      return;
    }
    if (action === "server-poll-choice") {
      setServerPollChoice(el.dataset.choice);
      return;
    }
    if (action === "open-auth") {
      openAuthModal();
      return;
    }
    if (action === "logout") {
      logoutUser();
      return;
    }
    if (action === "toggle-info-edit") {
      toggleInfoEdit();
      return;
    }
    if (action === "cancel-info-edit") {
      cancelInfoEdit();
      return;
    }
    if (action === "save-info-edit") {
      saveInfoEdit();
      return;
    }
    if (action === "open-member-modal") {
      openAddMemberModal(front);
      return;
    }
    if (action === "member-pick-one") {
      addPickedMembers([el.dataset.pickKey]);
      return;
    }
    if (action === "member-pick-selected") {
      addPickedMembers(selectedPickKeys(memberPickSelected));
      return;
    }
    if (action === "open-raid-modal") {
      openAddRaidModal(front);
      return;
    }
    if (action === "raid-pick-one") {
      addPickedRaid([el.dataset.pickKey]);
      return;
    }
    if (action === "raid-pick-selected") {
      addPickedRaid(selectedPickKeys(raidPickSelected));
      return;
    }
    if (action === "dkp-pick-one") {
      addPickedDkpPlayers([el.dataset.pickKey]);
      return;
    }
    if (action === "dkp-pick-selected") {
      addPickedDkpPlayers(selectedPickKeys(dkpPickSelected));
      return;
    }
    if (action === "leadership-pick") {
      applyLeadershipPick(el.dataset.pickKey);
      return;
    }
    if (action === "open-mplus-modal") {
      openMPlusModal();
      return;
    }
    if (action === "open-classic-modal") {
      openClassicRaidModal();
      return;
    }
    if (action === "close-modal") {
      closeModal(el.dataset.modal);
      return;
    }
    if (action === "remove-member") {
      event.stopPropagation();
      removeMember(front, el.dataset.id);
      return;
    }
    if (action === "remove-raid") {
      removeRaidMember(front, el.dataset.id);
      return;
    }
    if (action === "remove-mplus") {
      removeMPlusGroup(el.dataset.id);
      return;
    }
    if (action === "edit-mplus") {
      openEditMPlus(el.dataset.id);
      return;
    }
    if (action === "join-mplus") {
      joinMPlus(el.dataset.id);
      return;
    }
    if (action === "leave-mplus") {
      leaveMPlus(el.dataset.id);
      return;
    }
    if (action === "remove-classic") {
      removeClassicRun(el.dataset.id);
      return;
    }
    if (action === "remove-chat") {
      removeChatMessage(el.dataset.id);
      return;
    }
    if (action === "open-leadership-modal") {
      openLeadershipModal(el.dataset.id || "");
      return;
    }
    if (action === "remove-leadership") {
      removeLeadership(el.dataset.id);
      return;
    }
    if (action === "open-roles") {
      openRolesModal();
      return;
    }
    if (action === "filter-profile-game") {
      const next = el.dataset.game;
      if (next === "all" || next === "forever" || next === "retail" || next === "none") {
        profileGameFilter = next;
        renderProfileDirectory();
      }
      return;
    }
    if (action === "open-approvals") {
      goTo("freischaltungen");
      return;
    }
    if (action === "applications-status") {
      setApplicationStatusFilter(el.dataset.status);
      return;
    }
    if (action === "applications-front") {
      setApplicationFrontFilter(el.dataset.front);
      return;
    }
    if (action === "accept-application" || action === "reject-application") {
      decideApplication(el.dataset.id, action === "accept-application");
      return;
    }
    if (action === "approve-user" || action === "reject-user") {
      setProfileStatus(
        el.dataset.userId,
        action === "approve-user" ? "approved" : "rejected",
        el.dataset.userName || ""
      );
      return;
    }
    if (action === "dismiss-notice") {
      hideNotice();
      return;
    }
    if (action === "open-gallery") {
      openLightbox(Number(el.dataset.index));
      return;
    }
    if (action === "delete-gallery") {
      event.preventDefault();
      event.stopPropagation();
      deleteGalleryImage(el.dataset.id, el.dataset.path);
      return;
    }
    if (action === "delete-forever-poll") {
      event.preventDefault();
      deleteForeverPoll(el.dataset.id);
      return;
    }
    if (action === "delete-server-poll") {
      event.preventDefault();
      deleteServerPoll(el.dataset.id);
      return;
    }
    if (action === "raid-filter") {
      raidFront = front;
      renderRaids();
      return;
    }
    if (action === "raid-plan-front") {
      setRaidPlanFront(front);
      return;
    }
    if (action === "raid-plan-size") {
      setRaidPlanSize(el.dataset.size);
      return;
    }
    if (action === "raid-edit-cancel") {
      resetRaidForm();
      return;
    }
    if (action === "raid-edit") {
      beginRaidEdit(el.dataset.id);
      return;
    }
    if (action === "raid-abort") {
      cancelRaid(el.dataset.id);
      return;
    }
    if (action === "raid-delete") {
      deleteRaid(el.dataset.id);
      return;
    }
    if (action === "raid-signup") {
      saveRaidSignup(el.dataset.id, el.dataset.status);
      return;
    }
    if (action === "raid-role") {
      chooseRaidRole(el);
      return;
    }
    if (action === "raid-save-name") {
      const own = ownRaidSignup(el.dataset.id);
      if (!own) {
        notify("Tippe zuerst auf Zusage, Vielleicht oder Absage.", "info");
        return;
      }
      saveRaidSignup(el.dataset.id, own.status);
      return;
    }
    if (action === "close-lightbox") {
      closeLightbox();
      return;
    }
    if (action === "lightbox-step") {
      showLightbox(galleryIndex + Number(el.dataset.step || 1));
      return;
    }
    if (action === "play-video") {
      playVideo(el);
      return;
    }
    if (action.indexOf("dkp-") === 0) handleDkpAction(action, el);
  }

  function onChange(event) {
    const changedId = event.target && event.target.id ? event.target.id : "";
    if (changedId.indexOf("loot-filter-") === 0) {
      renderLoot();
      return;
    }
    const pickBox = event.target;
    if (pickBox && pickBox.name === "member-pick") {
      togglePickKey(memberPickSelected, pickBox);
      return;
    }
    if (pickBox && pickBox.name === "raid-pick") {
      togglePickKey(raidPickSelected, pickBox);
      return;
    }
    if (pickBox && pickBox.name === "dkp-player-pick") {
      togglePickKey(dkpPickSelected, pickBox);
      return;
    }
    const roleInput = event.target.closest('[data-action="raid-role"]');
    if (roleInput) {
      updateRaidRole(
        roleInput.dataset.front === "forever" ? "forever" : "retail",
        roleInput.dataset.id,
        roleInput.value
      );
      return;
    }
    if (handleDkpChange(event)) return;
    const profileGame = event.target.closest('[data-action="set-game"]');
    if (profileGame) {
      setProfileGame(profileGame.dataset.userId, profileGame.value, profileGame);
      return;
    }
    const profileRole = event.target.closest('[data-action="set-role"]');
    if (!profileRole) return;
    setProfileRole(profileRole.dataset.userId, profileRole.value, profileRole);
  }

  function onSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.id === "auth-form") {
      event.preventDefault();
      handleAuthSubmit(form);
    } else if (form.id === "member-form") {
      event.preventDefault();
      saveMember(form);
    } else if (form.id === "raid-form") {
      event.preventDefault();
      saveRaidMember(form);
    } else if (form.id === "mplus-form") {
      event.preventDefault();
      saveMPlusGroup(form);
    } else if (form.id === "classic-form") {
      event.preventDefault();
      saveClassicRun(form);
    } else if (form.id === "application-form") {
      event.preventDefault();
      submitApplication(form);
    } else if (form.id === "chat-form") {
      event.preventDefault();
      sendChatMessage(form);
    } else if (form.id === "mecker-form") {
      event.preventDefault();
      submitFeedback(form);
    } else if (form.id === "leadership-form") {
      event.preventDefault();
      saveLeadership(form);
    } else if (form.id === "gallery-upload-form") {
      event.preventDefault();
    } else if (form.id === "forever-poll-form") {
      event.preventDefault();
      submitForeverPoll(form);
    } else if (form.id === "server-poll-form") {
      event.preventDefault();
      submitServerPoll(form);
    } else if (form.id === "raid-plan-form") {
      event.preventDefault();
      submitRaidPlan(form);
    } else if (form.id && form.id.indexOf("dkp-") === 0) {
      event.preventDefault();
      submitDkpForm(form);
    } else if (form.id === "loot-instance-form") {
      event.preventDefault();
      saveLootInstance();
    } else if (form.id === "loot-boss-form") {
      event.preventDefault();
      saveLootBoss();
    } else if (form.id === "loot-item-form") {
      event.preventDefault();
      saveLootItem();
    }
  }

  function onKeydown(event) {
    if (lightboxOpen()) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        showLightbox(galleryIndex + (event.key === "ArrowRight" ? 1 : -1));
        return;
      }
      if (event.key === "Tab") trapTab(event, document.getElementById("lightbox"));
      return;
    }
    const open = openModalEl();
    if (event.key === "Escape") {
      if (open) {
        closeModal(open.id);
        return;
      }
      if (!document.getElementById("info-edit-mode").hidden) cancelInfoEdit();
      return;
    }
    if (event.key !== "Tab" || !open) return;
    trapTab(event, open);
  }

  function trapTab(event, root) {
    const nodes = focusable(root);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function switchFront(front, options) {
    const nextFront = front === "forever" ? "forever" : "retail";
    const frontChanged = nextFront !== activeFront;
    activeFront = nextFront;
    if (frontChanged) {
      chatLoadEpoch += 1;
      replaceItems(chatMessages, []);
      renderChat();
    }
    updateChatHeading();
    document.getElementById("content-retail").hidden = activeFront !== "retail";
    document.getElementById("content-forever").hidden = activeFront !== "forever";

    const retailBtn = document.getElementById("btn-retail");
    const foreverBtn = document.getElementById("btn-forever");
    const retailOn = activeFront === "retail";
    retailBtn.className = retailOn ? TAB_RETAIL_ON : TAB_OFF;
    foreverBtn.className = retailOn ? TAB_OFF : TAB_FOREVER_ON;
    retailBtn.setAttribute("aria-selected", retailOn ? "true" : "false");
    foreverBtn.setAttribute("aria-selected", retailOn ? "false" : "true");
    refreshReveal(document.getElementById(activeFront === "retail" ? "content-retail" : "content-forever"));
    raidFront = activeFront;
    renderRaids();
    updateQuickNav();
    syncFeedbackFront(false);
    if (frontChanged) {
      refreshChat();
      if (remoteReady) subscribeLive();
    }

    if (options && options.scroll) {
      const id = activeFront === "retail" ? "content-retail" : "forever-uebersicht";
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: motion(), block: "start" });
    }
  }

  function navItems() {
    const items = (activeFront === "retail" ? RETAIL_NAV : FOREVER_NAV).slice();
    const videos = document.getElementById("videos");
    if (videos && !videos.hidden) {
      const entry = { href: "#videos", label: "Videos", icon: "fa-play", tone: "text-red-500" };
      const at = items.findIndex(function (item) { return item.href === "#bewerbung"; });
      items.splice(at < 0 ? items.length : at, 0, entry);
    }
    if (isOfficer()) {
      const entry = { href: "#bewerbungen", label: "Bewerbungen", icon: "fa-inbox", tone: "text-amber-400", applicationsBadge: true };
      const at = items.findIndex(function (item) { return item.href === "#bewerbung"; });
      items.splice(at < 0 ? items.length : at, 0, entry);
    }
    return items.map(function (item) {
      if (item.href !== "#forever-dkp") return item;
      return {
        href: item.href,
        label: canReadDkp() ? "DKP" : "Gilden-Aktivitäten",
        icon: item.icon,
        tone: item.tone,
      };
    });
  }

  function updateQuickNav() {
    fillNav(document.getElementById("mobile-nav-links"), navItems(), false);
    syncSectionNav();
  }

  function syncSectionNav() {
    const header = document.getElementById("site-header");
    if (header) {
      const height = Math.ceil(header.getBoundingClientRect().height) + 12;
      document.documentElement.style.setProperty("--section-scroll-offset", height + "px");
    }
    if (!syncSectionNav.bound) {
      syncSectionNav.bound = true;
      window.addEventListener("scroll", queueActiveSection, { passive: true });
      window.addEventListener("resize", syncSectionNav);
      if ("ResizeObserver" in window && header) {
        const observer = new ResizeObserver(function () { syncSectionNav(); });
        observer.observe(header);
      }
    }
    markActiveSection();
  }

  function queueActiveSection() {
    if (queueActiveSection.queued) return;
    queueActiveSection.queued = true;
    window.requestAnimationFrame(function () {
      queueActiveSection.queued = false;
      markActiveSection();
    });
  }

  function sectionIsShown(el) {
    if (!el || el.hidden) return false;
    if (el.closest("[hidden]")) return false;
    return el.getClientRects().length > 0;
  }

  function markActiveSection() {
    const links = document.querySelectorAll("#mobile-nav-links a");
    if (!links.length) return;
    const header = document.getElementById("site-header");
    const line = (header ? header.getBoundingClientRect().bottom : 0) + 48;
    let current = null;
    links.forEach(function (link) {
      const href = link.getAttribute("href") || "";
      const id = href.charAt(0) === "#" ? href.slice(1) : href;
      const el = document.getElementById(id);
      if (!sectionIsShown(el)) return;
      if (el.getBoundingClientRect().top <= line) current = link;
    });
    links.forEach(function (link) {
      const on = link === current;
      if (link.getAttribute("aria-current") === (on ? "true" : "false") && link.className === (on ? NAV_LINK_ON : NAV_LINK)) return;
      link.className = on ? NAV_LINK_ON : NAV_LINK;
      link.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function fillNav(container, items, iconsOnly) {
    if (!container) return;
    container.replaceChildren();
    items.forEach(function (item) {
      const link = document.createElement("a");
      link.href = item.href;
      link.className = iconsOnly ? QUICK_LINK : NAV_LINK;
      link.setAttribute("aria-label", item.label);
      if (iconsOnly) link.title = item.label;
      const icon = document.createElement("i");
      icon.className = "fa-solid " + item.icon + " " + item.tone;
      icon.setAttribute("aria-hidden", "true");
      link.appendChild(icon);
      if (!iconsOnly) link.appendChild(document.createTextNode(item.label));
      if (item.applicationsBadge) link.appendChild(applicationNavBadge());
      container.appendChild(link);
    });
  }

  function goTo(id, options) {
    if (id && id.indexOf("raid-") === 0) {
      focusLinkedRaid(options);
      return;
    }
    if (FOREVER_IDS.has(id)) switchFront("forever");
    else if (RETAIL_IDS.has(id)) switchFront("retail");
    const el = document.getElementById(id);
    if (!el) return;
    const updateHistory = !options || options.updateHistory !== false;
    if (updateHistory && location.hash !== "#" + id) {
      history.pushState(null, "", "#" + id);
    }
    const behavior = (options && options.behavior) || motion();
    el.scrollIntoView({ behavior: behavior, block: "start" });
  }

  function updateAuthUI() {
    if (!isOfficer()) clearPersonPickers();
    const headerAuth = document.getElementById("auth-header-section");
    if (!headerAuth) return;
    const editOpen = document.getElementById("info-edit-mode");
    if (editOpen && !editOpen.hidden && !isOfficer()) cancelInfoEdit();
    headerAuth.replaceChildren();
    if (currentUser) {
      const pill = document.createElement("div");
      pill.className =
        "flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs";
      const name = document.createElement("span");
      name.className = "truncate font-bold text-amber-400";
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-user-shield";
      icon.setAttribute("aria-hidden", "true");
      name.appendChild(icon);
      name.appendChild(document.createTextNode(" " + currentUser.displayName + " (" + roleLabel(currentUser.role) + ")"));
      pill.appendChild(name);
      if (isOfficer()) {
        const roles = document.createElement("button");
        roles.type = "button";
        roles.dataset.action = "open-roles";
        roles.className = "inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-amber-400 hover:text-white";
        roles.textContent = isAdmin() ? "Rollen" : "Mitglieder";
        pill.appendChild(roles);
      }
      if (approvalEnforced && isOfficer()) {
        const approvals = document.createElement("button");
        approvals.type = "button";
        approvals.dataset.action = "open-approvals";
        approvals.className = "inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-xs font-bold text-amber-400 hover:text-white";
        approvals.appendChild(document.createTextNode("Freischaltungen"));
        const badge = document.createElement("span");
        badge.id = "approval-header-count";
        badge.className = "inline-flex items-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white";
        badge.hidden = true;
        approvals.appendChild(badge);
        pill.appendChild(approvals);
      }
      const logout = document.createElement("button");
      logout.type = "button";
      logout.dataset.action = "logout";
      logout.className = "ml-1 inline-flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-red-400";
      logout.setAttribute("aria-label", "Abmelden");
      logout.title = "Abmelden";
      logout.innerHTML = '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>';
      pill.appendChild(logout);
      headerAuth.appendChild(pill);
    } else {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = "open-auth";
      button.className = LOGIN_BTN;
      button.innerHTML =
        '<i class="fa-solid fa-user-lock" aria-hidden="true"></i> Login / Reg';
      headerAuth.appendChild(button);
    }
    syncPermissions();
    prefillChatAuthor();
    prefillFeedbackName();
    prefillServerPollName();
    updateQuickNav();
  }

  function syncPermissions() {
    document.querySelectorAll("[data-perm]").forEach(function (el) {
      const perm = el.dataset.perm;
      const show = perm === "admin" ? isAdmin() : perm === "officer" ? isOfficer() : isApproved();
      el.hidden = !show;
    });
    syncAccessChrome();
  }

  function isApproved() {
    if (!currentUser) return false;
    if (!approvalEnforced) return true;
    if (isOfficer()) return true;
    if (currentUser.statusKnown === false) return true;
    return currentUser.status === "approved";
  }

  function accessNotice() {
    if (currentUser && currentUser.status === "rejected") return REJECTED_NOTICE;
    return PENDING_NOTICE;
  }

  function canReadChat() {
    if (!approvalEnforced) return true;
    return isApproved();
  }

  function syncAccessChrome() {
    syncApprovalBanner();
    renderDiscordSlots();
    syncChatGate();
    syncApprovalSection();
    syncApplications();
    renderChat();
  }

  function syncApprovalBanner() {
    const banner = document.getElementById("approval-banner");
    if (!banner) return;
    const pending = approvalEnforced && currentUser && !isOfficer() && currentUser.status === "pending";
    const rejected = approvalEnforced && currentUser && !isOfficer() && currentUser.status === "rejected";
    if (!pending && !rejected) {
      banner.hidden = true;
      banner.textContent = "";
      return;
    }
    banner.hidden = false;
    banner.textContent = rejected ? REJECTED_NOTICE : PENDING_NOTICE;
    banner.className = rejected
      ? "border-b border-red-900/50 bg-slate-950 px-4 py-3 text-center text-sm text-red-400"
      : "border-b border-amber-500/40 bg-slate-950 px-4 py-3 text-center text-sm text-amber-200";
  }

  function syncChatGate() {
    const form = document.getElementById("chat-form");
    const hint = document.getElementById("chat-hint");
    const applyHint = document.getElementById("application-hint");
    const locked = approvalEnforced && !isApproved();
    if (form) form.hidden = locked;
    if (hint) {
      if (!approvalEnforced) hint.textContent = CHAT_PUBLIC_HINT;
      else hint.textContent = isApproved() ? CHAT_MEMBER_HINT : CHAT_LOCKED_HINT;
    }
    if (applyHint) {
      applyHint.textContent = approvalEnforced
        ? "Die Bewerbung geht an die Gildenleitung auf Discord. Eine Kopie liegt im Gilden-Chat für freigeschaltete Mitglieder."
        : "Die Bewerbung geht an die Gildenleitung auf Discord. Eine Kopie erscheint im Gilden-Chat.";
    }
  }

  function syncApprovalSection() {
    const section = document.getElementById("freischaltungen");
    if (!section) return;
    const show = !!(approvalEnforced && isOfficer() && remote);
    section.hidden = !show;
    if (!show) return;
    refreshReveal(section.parentElement || document);
    loadApprovals();
  }

  function isOfficer() {
    return !!(currentUser && (currentUser.role === "officer" || currentUser.role === "admin"));
  }

  const APPLICATION_TAB_ON = "inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950";
  const APPLICATION_TAB_OFF = "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700";
  const APPLICATION_ACCEPT_BTN = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
  const APPLICATION_REJECT_BTN = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  function applicationNavBadge() {
    const badge = document.createElement("span");
    badge.dataset.applicationsBadge = "1";
    badge.className = "inline-flex items-center rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white";
    badge.textContent = String(applicationPendingCount);
    badge.hidden = applicationPendingCount < 1;
    if (applicationPendingCount > 0) badge.setAttribute("aria-label", applicationPendingCount + " offen");
    return badge;
  }

  function paintApplicationBadge() {
    const sectionBadge = document.getElementById("bewerbungen-count");
    if (sectionBadge) {
      sectionBadge.textContent = String(applicationPendingCount);
      sectionBadge.hidden = applicationPendingCount < 1;
    }
    const badges = document.querySelectorAll("[data-applications-badge]");
    if (!badges.length && isOfficer()) {
      updateQuickNav();
      return;
    }
    badges.forEach(function (badge) {
      badge.textContent = String(applicationPendingCount);
      badge.hidden = applicationPendingCount < 1;
      if (applicationPendingCount > 0) badge.setAttribute("aria-label", applicationPendingCount + " offen");
      else badge.removeAttribute("aria-label");
    });
  }

  function setApplicationStatusLine(message, isError) {
    const el = document.getElementById("bewerbungen-status");
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.hidden = true;
      el.className = "text-sm text-amber-200";
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = isError ? "text-sm text-red-400" : "text-sm text-amber-200";
  }

  function applicationStatusParam() {
    if (applicationStatus === "pending" || applicationStatus === "accepted" || applicationStatus === "rejected") {
      return applicationStatus;
    }
    return null;
  }

  function syncApplications() {
    if (!isOfficer() || !remote || typeof remote.rpc !== "function") {
      stopApplications();
      return;
    }
    if (applicationsWatching) return;
    applicationsWatching = true;
    loadApplications();
    subscribeApplications();
    if (location.hash === "#bewerbungen") goTo("bewerbungen", { updateHistory: false, behavior: "auto" });
  }

  function stopApplications() {
    applicationEpoch += 1;
    applicationRows = [];
    applicationPendingCount = 0;
    applicationBusyId = "";
    applicationState = "idle";
    applicationsWatching = false;
    applicationFollow = null;
    window.clearTimeout(applicationRefreshTimer);
    paintApplicationBadge();
    setApplicationStatusLine("");
    const list = document.getElementById("bewerbungen-list");
    if (list) list.replaceChildren();
    unsubscribeApplications();
  }

  function subscribeApplications() {
    if (!remote || !isOfficer() || applicationChannel || typeof remote.channel !== "function") return;
    try {
      applicationChannelSerial += 1;
      applicationChannel = remote.channel("arc-applications-" + applicationChannelSerial)
        .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, function () {
          if (!isOfficer()) return;
          window.clearTimeout(applicationRefreshTimer);
          applicationRefreshTimer = window.setTimeout(function () {
            loadApplications();
            if (applicationFollow && applicationStatus !== "all" && applicationStatus !== "accepted") {
              refreshApplicationFollow();
            }
          }, 250);
        })
        .subscribe();
    } catch (err) {
      applicationChannel = null;
    }
  }

  function unsubscribeApplications() {
    const channel = applicationChannel;
    applicationChannel = null;
    if (!channel || !remote || typeof remote.removeChannel !== "function") return;
    Promise.resolve(remote.removeChannel(channel)).catch(function () {});
  }

  function loadApplications() {
    if (!remote || !isOfficer() || typeof remote.rpc !== "function") return;
    const epoch = applicationEpoch + 1;
    applicationEpoch = epoch;
    const status = applicationStatusParam();
    if (applicationState !== "ready") {
      applicationState = "loading";
      paintApplicationStatus();
    }
    remote.rpc("list_applications", { p_status: status }).then(function (result) {
      if (epoch !== applicationEpoch || !isOfficer()) return;
      if (!result || result.error) {
        applicationState = applicationRows.length ? "ready" : "error";
        paintApplicationStatus();
        renderApplications();
        return;
      }
      applicationRows = (Array.isArray(result.data) ? result.data : []).map(normalizeApplication).filter(Boolean);
      applicationState = "ready";
      syncApplicationFollowFromRows();
      paintApplicationStatus();
      if (status === null || status === "pending") {
        applicationPendingCount = status === "pending"
          ? applicationRows.length
          : applicationRows.filter(function (row) { return row.status === "pending"; }).length;
        paintApplicationBadge();
        renderApplications();
        return;
      }
      renderApplications();
      loadApplicationPendingCount(epoch);
    }).catch(function () {
      if (epoch !== applicationEpoch || !isOfficer()) return;
      applicationState = applicationRows.length ? "ready" : "error";
      paintApplicationStatus();
      renderApplications();
    });
  }

  function paintApplicationStatus() {
    if (applicationState === "loading" && !applicationRows.length) {
      setApplicationStatusLine("Bewerbungen werden geladen…", false);
      return;
    }
    if (applicationState === "error") {
      setApplicationStatusLine("Die Bewerbungen konnten nicht geladen werden.", true);
      return;
    }
    if (applicationFollow && !applicationById(applicationFollow.id)) {
      const text = applicationNotifyText(applicationFollow.notify_status) || "Bewerbung angenommen.";
      setApplicationStatusLine((applicationFollow.name || "Bewerbung") + ": " + text, applicationFollow.notify_status === "failed");
      return;
    }
    setApplicationStatusLine("");
  }

  function syncApplicationFollowFromRows() {
    if (!applicationFollow) return;
    const found = applicationById(applicationFollow.id);
    if (found && found.notify_status) applicationFollow.notify_status = found.notify_status;
  }

  function refreshApplicationFollow() {
    if (!applicationFollow || !remote || !isOfficer()) return;
    if (applicationFollow.notify_status === "sent" || applicationFollow.notify_status === "partial" || applicationFollow.notify_status === "failed") return;
    const id = applicationFollow.id;
    remote.rpc("list_applications", { p_status: "accepted" }).then(function (result) {
      if (!applicationFollow || applicationFollow.id !== id || !isOfficer()) return;
      if (!result || result.error || !Array.isArray(result.data)) return;
      const found = result.data.map(normalizeApplication).filter(Boolean).find(function (row) {
        return row.id === id;
      });
      if (!found) return;
      applicationFollow.notify_status = found.notify_status;
      const index = applicationRows.findIndex(function (row) { return row.id === id; });
      if (index >= 0) applicationRows[index] = found;
      renderApplications();
      paintApplicationStatus();
    }).catch(function () {});
  }

  function loadApplicationPendingCount(epoch) {
    if (!remote || !isOfficer()) return;
    remote.rpc("list_applications", { p_status: "pending" }).then(function (result) {
      if (epoch !== applicationEpoch || !isOfficer()) return;
      if (!result || result.error || !Array.isArray(result.data)) return;
      applicationPendingCount = result.data.length;
      paintApplicationBadge();
      renderApplicationFilters();
    }).catch(function () {});
  }

  function normalizeApplication(row) {
    if (!row || row.id == null) return null;
    const id = String(row.id);
    const front = row.front === "forever" || row.front === "retail" ? row.front : "";
    const status = row.status === "accepted" || row.status === "rejected" || row.status === "pending" ? row.status : "";
    if (!status) return null;
    const notify = row.notify_status === "pending" || row.notify_status === "sent" || row.notify_status === "partial" || row.notify_status === "failed"
      ? row.notify_status
      : null;
    return {
      id: id,
      created_at: row.created_at || "",
      front: front,
      name: String(row.name || "").trim(),
      class_spec: String(row.class_spec || "").trim(),
      realm: String(row.realm || "").trim(),
      about: String(row.about || "").trim(),
      experience: String(row.experience || "").trim(),
      contact: String(row.contact || "").trim(),
      status: status,
      decided_by_name: String(row.decided_by_name || "").trim(),
      decided_at: row.decided_at || "",
      member_id: row.member_id || null,
      notify_status: notify,
    };
  }

  function setApplicationStatusFilter(next) {
    if (!isOfficer()) return;
    if (next !== "pending" && next !== "accepted" && next !== "rejected" && next !== "all") return;
    if (next === applicationStatus) return;
    applicationStatus = next;
    loadApplications();
  }

  function setApplicationFrontFilter(next) {
    if (!isOfficer()) return;
    if (next !== "all" && next !== "retail" && next !== "forever") return;
    applicationFront = next;
    renderApplications();
  }

  function visibleApplications() {
    return applicationRows.filter(function (row) {
      if (applicationFront === "retail" || applicationFront === "forever") return row.front === applicationFront;
      return true;
    });
  }

  function renderApplicationFilters() {
    const statusTabs = [
      ["pending", "Offen"],
      ["accepted", "Angenommen"],
      ["rejected", "Abgelehnt"],
      ["all", "Alle"],
    ];
    statusTabs.forEach(function (entry) {
      const button = document.getElementById("applications-status-" + entry[0]);
      if (!button) return;
      const on = applicationStatus === entry[0];
      button.className = on ? APPLICATION_TAB_ON : APPLICATION_TAB_OFF;
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.textContent = entry[1];
    });
    ["all", "retail", "forever"].forEach(function (front) {
      const button = document.getElementById("applications-front-" + front);
      if (!button) return;
      const on = applicationFront === front;
      button.className = on ? APPLICATION_TAB_ON : APPLICATION_TAB_OFF;
      button.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function applicationStatusLabel(status) {
    if (status === "accepted") return "Angenommen";
    if (status === "rejected") return "Abgelehnt";
    return "Offen";
  }

  function applicationStatusClass(status) {
    if (status === "accepted") return "inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400";
    if (status === "rejected") return "inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400";
    return "inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400";
  }

  function applicationFrontLabel(front) {
    if (front === "forever") return "Forever";
    if (front === "retail") return "Retail";
    return "";
  }

  function applicationNotifyText(status) {
    if (status === "pending") return "Nachricht wird gesendet…";
    if (status === "sent") return "Discord-Nachricht und Begrüßung gesendet";
    if (status === "partial") return "Begrüßung in #willkommen gepostet (keine Privatnachricht möglich)";
    if (status === "failed") return "Discord-Nachricht fehlgeschlagen";
    return "";
  }

  function applicationNotifyClass(status) {
    if (status === "sent") return "text-sm text-emerald-400";
    if (status === "failed") return "text-sm text-red-400";
    return "text-sm text-amber-200";
  }

  function applicationField(label, value) {
    const wrap = document.createElement("div");
    wrap.className = "min-w-0";
    const title = document.createElement("p");
    title.className = "text-xs font-semibold text-slate-400";
    title.textContent = label;
    const body = document.createElement("p");
    body.className = "mt-1 break-words text-sm text-slate-200";
    const text = String(value || "").trim();
    if (!text) {
      body.textContent = "—";
    } else {
      text.split("\n").forEach(function (line, index) {
        if (index) body.appendChild(document.createElement("br"));
        body.appendChild(document.createTextNode(line));
      });
    }
    wrap.append(title, body);
    return wrap;
  }

  function applicationEmptyText() {
    const game = applicationFront === "retail" ? " für Retail" : applicationFront === "forever" ? " für Forever" : "";
    if (applicationStatus === "pending") return "Keine offenen Bewerbungen" + game + ".";
    if (applicationStatus === "accepted") return "Keine angenommenen Bewerbungen" + game + ".";
    if (applicationStatus === "rejected") return "Keine abgelehnten Bewerbungen" + game + ".";
    return "Keine Bewerbungen" + game + ".";
  }

  function renderApplications() {
    renderApplicationFilters();
    const list = document.getElementById("bewerbungen-list");
    if (!list) return;
    list.replaceChildren();
    if (!isOfficer()) return;
    const rows = visibleApplications();
    if (!rows.length) {
      if (applicationState === "loading" || applicationState === "error") return;
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-400";
      empty.textContent = applicationEmptyText();
      list.appendChild(empty);
      return;
    }
    rows.forEach(function (row) {
      list.appendChild(applicationCard(row));
    });
  }

  function applicationCard(row) {
    const card = document.createElement("article");
    card.className = "space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm";
    card.dataset.applicationId = row.id;
    const head = document.createElement("div");
    head.className = "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between";
    const identity = document.createElement("div");
    identity.className = "min-w-0";
    const name = document.createElement("h3");
    name.className = "break-words text-lg font-black text-white";
    name.textContent = row.name || "Unbekannt";
    const when = document.createElement("p");
    when.className = "text-xs text-slate-400";
    const created = formatDkpStamp(row.created_at);
    when.textContent = created ? "Eingegangen " + created : "";
    identity.append(name, when);
    const pill = document.createElement("span");
    pill.className = applicationStatusClass(row.status);
    pill.textContent = applicationStatusLabel(row.status);
    head.append(identity, pill);
    card.appendChild(head);

    const game = document.createElement("p");
    game.className = row.front === "retail" ? "text-xs font-bold text-red-400" : "text-xs font-bold text-amber-400";
    game.textContent = applicationFrontLabel(row.front) || "—";
    card.appendChild(game);

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-1 gap-3 sm:grid-cols-2";
    grid.append(
      applicationField("Klasse/Spec", row.class_spec),
      applicationField("Realm", row.realm),
      applicationField("Kontakt", row.contact)
    );
    card.appendChild(grid);
    card.appendChild(applicationField("Nachricht", row.about));
    card.appendChild(applicationField("Erfahrung", row.experience));

    if (row.status !== "pending") {
      const decided = document.createElement("p");
      decided.className = "text-sm text-slate-300";
      decided.textContent = applicationDecisionText(row);
      card.appendChild(decided);
    }
    const notifyText = row.status === "accepted" ? applicationNotifyText(row.notify_status) : "";
    if (notifyText) {
      const note = document.createElement("p");
      note.className = applicationNotifyClass(row.notify_status);
      note.textContent = notifyText;
      card.appendChild(note);
    }
    if (row.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "flex flex-col gap-2 sm:flex-row";
      actions.append(
        applicationDecisionButton("accept-application", row, "Annehmen", APPLICATION_ACCEPT_BTN, "fa-check"),
        applicationDecisionButton("reject-application", row, "Ablehnen", APPLICATION_REJECT_BTN, "fa-xmark")
      );
      card.appendChild(actions);
    }
    return card;
  }

  function applicationDecisionText(row) {
    const verb = row.status === "accepted" ? "Angenommen" : "Abgelehnt";
    const when = formatDkpStamp(row.decided_at);
    if (row.decided_by_name && when) return verb + " von " + row.decided_by_name + " am " + when;
    if (row.decided_by_name) return verb + " von " + row.decided_by_name;
    if (when) return verb + " am " + when;
    return verb;
  }

  function applicationDecisionButton(action, row, label, className, iconName) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = row.id;
    button.className = className;
    button.disabled = applicationBusyId === row.id;
    const icon = document.createElement("i");
    icon.className = "fa-solid " + iconName;
    icon.setAttribute("aria-hidden", "true");
    button.append(icon, document.createTextNode(label));
    return button;
  }

  function applicationById(id) {
    for (let i = 0; i < applicationRows.length; i += 1) {
      if (applicationRows[i] && applicationRows[i].id === id) return applicationRows[i];
    }
    return null;
  }

  function applicationErrorText(error, fallback) {
    const raw = String((error && (error.message || error.error_description)) || "").replace(/^\s*ERROR:\s*/i, "").trim();
    if (!raw || /permission|jwt|pgrst|failed to fetch|network|schema cache/i.test(raw)) return fallback;
    if (raw.length > 180) return fallback;
    return raw;
  }

  function decideApplication(id, accept) {
    if (applicationBusyId) return;
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Bewerbungen entscheiden.", "error");
      return;
    }
    const row = applicationById(id);
    if (!row || row.status !== "pending") return;
    const name = row.name || "Diese Bewerbung";
    const question = accept
      ? name + " wirklich annehmen? Er kommt in die Mitgliederliste und bekommt eine Nachricht im Discord."
      : name + " wirklich ablehnen?";
    if (!window.confirm(question)) return;
    if (!requireRemote()) return;
    applicationBusyId = id;
    renderApplications();
    remote.rpc(accept ? "accept_application" : "reject_application", { p_id: id }).then(function (result) {
      if (applicationBusyId === id) applicationBusyId = "";
      if (!isOfficer()) return;
      if (!result || result.error) {
        renderApplications();
        notify(applicationErrorText(result && result.error, accept
          ? "Die Bewerbung konnte nicht angenommen werden."
          : "Die Bewerbung konnte nicht abgelehnt werden."), "error");
        return;
      }
      const payload = applicationRpcPayload(result.data);
      if (accept) {
        applicationFollow = {
          id: String(id),
          name: name,
          notify_status: (payload && payload.notify_status) || "pending",
        };
        notify(applicationNotifyText(applicationFollow.notify_status) || "Bewerbung angenommen.", "info");
        refreshMembersFromRemote();
      } else {
        applicationFollow = null;
        notify("Bewerbung abgelehnt.", "info");
      }
      loadApplications();
    }).catch(function (err) {
      if (applicationBusyId === id) applicationBusyId = "";
      renderApplications();
      notify(applicationErrorText(err, accept
        ? "Die Bewerbung konnte nicht angenommen werden."
        : "Die Bewerbung konnte nicht abgelehnt werden."), "error");
    });
  }

  function applicationRpcPayload(data) {
    if (!data) return null;
    if (Array.isArray(data)) return data[0] || null;
    return data;
  }

  function refreshMembersFromRemote() {
    if (!remote || !remoteReady) return;
    fetchRows("members", "id, front, name, rank, sort_order", "sort_order", true).then(function (rows) {
      replaceItems(retailMembers, rows.filter(function (row) { return row.front === "retail"; }).map(mapMember));
      replaceItems(foreverMembers, rows.filter(function (row) { return row.front === "forever"; }).map(mapMember));
      renderMembers("retail");
      renderMembers("forever");
    }).catch(function () { /* Die bisherige Mitgliederliste bleibt sichtbar. */ });
  }

  function isAdmin() {
    return !!(currentUser && currentUser.role === "admin");
  }

  function roleLabel(role) {
    if (role === "admin") return "Administrator";
    if (role === "officer") return "Offizier";
    return "Mitglied";
  }

  function openAuthModal() {
    const form = document.getElementById("auth-form");
    form.reset();
    syncAuthMode();
    openModal("auth-modal");
  }

  function syncAuthMode() {
    const register = document.getElementById("auth-mode").value === "register";
    document.getElementById("auth-name-wrap").hidden = !register;
    const name = document.getElementById("auth-display-name");
    name.required = register;
    document.getElementById("auth-password").autocomplete = register ? "new-password" : "current-password";
  }

  function authErrorText(error) {
    const msg = String((error && error.message) || "");
    if (/invalid login credentials/i.test(msg)) return "E-Mail oder Passwort ist falsch.";
    if (/already registered|already been registered/i.test(msg)) return "Diese E-Mail ist bereits registriert.";
    if (/password/i.test(msg)) return "Das Passwort wird nicht akzeptiert. Mindestens 6 Zeichen.";
    if (/email/i.test(msg)) return "Bitte eine gültige E-Mail-Adresse angeben.";
    if (/rate limit/i.test(msg)) return "Zu viele Versuche. Bitte warte einen Moment.";
    return "Anmeldung gerade nicht möglich. Bitte versuche es später noch einmal.";
  }

  function handleAuthSubmit(form) {
    if (!remote) {
      notify(OFFLINE_MSG, "error");
      return;
    }
    const email = document.getElementById("auth-email").value.trim().toLowerCase();
    const password = document.getElementById("auth-password").value;
    const mode = document.getElementById("auth-mode").value;
    const displayName = document.getElementById("auth-display-name").value.trim();
    if (!email || !password) {
      notify("Bitte E-Mail und Passwort ausfüllen.", "error");
      return;
    }
    if (password.length < 6) {
      notify("Das Passwort muss mindestens 6 Zeichen haben.", "error");
      return;
    }
    if (mode === "register") {
      if (displayName.length < 2 || displayName.length > 40) {
        notify("Der Anzeigename braucht 2 bis 40 Zeichen.", "error");
        return;
      }
      remote.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: location.origin + location.pathname,
        },
      }).then(function (result) {
        if (result.error) {
          notify(authErrorText(result.error), "error");
          return;
        }
        const createdUser = result.data && result.data.user;
        const identities = createdUser && createdUser.identities;
        if (createdUser && (!Array.isArray(identities) || identities.length > 0)) {
          postRegistrationNotice(displayName, email);
        }
        if (result.data && result.data.session) {
          return adoptSession(result.data.session).then(function () {
            closeModal("auth-modal");
            form.reset();
            syncAuthMode();
            updateAuthUI();
            renderPermissionSurfaces();
            if (remoteReady) refreshChat();
            notify(approvalEnforced && currentUser && !isApproved() ? accessNotice() : "Willkommen, du bist angemeldet.", "info");
          });
        }
        closeModal("auth-modal");
        form.reset();
        syncAuthMode();
        notify(approvalEnforced
          ? "Konto angelegt. Bitte bestätige die E-Mail. " + PENDING_NOTICE
          : "Konto angelegt. Bitte bestätige die E-Mail, danach kannst du dich anmelden.", "info");
      }).catch(function () {
        notify("Die Registrierung ist gerade nicht möglich.", "error");
      });
      return;
    }
    remote.auth.signInWithPassword({ email: email, password: password }).then(function (result) {
      if (result.error || !result.data || !result.data.session) {
        notify(result.error ? authErrorText(result.error) : "Anmeldung fehlgeschlagen.", "error");
        return;
      }
      return adoptSession(result.data.session).then(function () {
        closeModal("auth-modal");
        form.reset();
        updateAuthUI();
        renderPermissionSurfaces();
        if (remoteReady) refreshChat();
        notify(approvalEnforced && currentUser && !isApproved()
          ? accessNotice()
          : "Angemeldet als " + (currentUser ? currentUser.displayName : "Mitglied") + ".", "info");
      });
    }).catch(function () {
      notify("Die Anmeldung ist gerade nicht möglich.", "error");
    });
  }

  function logoutUser() {
    const finish = function () {
      currentUser = null;
      clearDkpData();
      updateAuthUI();
      renderPermissionSurfaces();
      notify("Du wurdest abgemeldet.", "info");
    };
    if (!remote) {
      finish();
      return;
    }
    remote.auth.signOut().then(finish).catch(function () {
      notify("Abmelden ist gerade nicht möglich.", "error");
    });
  }

  function prefillChatAuthor() {
    const input = document.getElementById("chat-author");
    if (!input) return;
    if (currentUser) {
      input.value = currentUser.displayName;
      input.readOnly = true;
    } else {
      input.readOnly = false;
    }
  }

  function renderMembers(front) {
    const listEl = document.getElementById(front + "-members-list");
    if (!listEl) return;
    const members = membersOf(front);
    const search = document.getElementById(front + "-search");
    const filter = search ? search.value.trim().toLowerCase() : "";
    listEl.replaceChildren();
    const visible = [];
    members.forEach(function (member, index) {
      if (!member || typeof member.name !== "string") return;
      if (filter && !member.name.toLowerCase().includes(filter)) return;
      visible.push({ member: member, index: index });
    });
    if (!visible.length) {
      const empty = document.createElement("li");
      empty.className = "col-span-full py-8 text-center italic text-slate-500";
      empty.textContent = filter ? "Keine Mitglieder gefunden." : "Noch keine Mitglieder eingetragen.";
      listEl.appendChild(empty);
      return;
    }
    visible.forEach(function (entry) {
      const member = entry.member;
      const card = document.createElement("li");
      card.className =
        "flex cursor-grab items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950 p-3.5 shadow-sm select-none hover:border-slate-700 active:cursor-grabbing";
      card.draggable = isOfficer();
      card.dataset.memberName = member.name;
      card.dataset.front = front;
      const body = document.createElement("div");
      body.className = "flex min-w-0 items-center gap-3 pointer-events-none";
      body.innerHTML =
        '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-amber-400" aria-hidden="true"><i class="fa-solid fa-user"></i></div>' +
        '<div class="min-w-0"><p class="truncate text-sm font-bold text-white"></p><p class="truncate text-xs text-slate-400"></p></div>';
      body.querySelector("p").textContent = member.name;
      body.querySelectorAll("p")[1].textContent = member.rank || "";
      card.appendChild(body);
      if (isOfficer() && member.id) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = "remove-member";
        button.dataset.front = front;
        button.dataset.id = member.id;
        button.className =
          "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:text-red-500";
        button.setAttribute("aria-label", member.name + " entfernen");
        button.title = "Entfernen";
        button.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        button.addEventListener("pointerdown", function (event) {
          event.stopPropagation();
          card.draggable = false;
        });
        button.addEventListener("pointerup", function () {
          card.draggable = true;
        });
        card.appendChild(button);
      }
      listEl.appendChild(card);
    });
  }

  function onMemberDragStart(event) {
    const card = event.target.closest("[data-member-name]");
    if (!card || event.target.closest("button")) {
      event.preventDefault();
      return;
    }
    const payload = JSON.stringify({
      name: card.dataset.memberName,
      front: card.dataset.front,
    });
    event.dataTransfer.setData("text/plain", payload);
    event.dataTransfer.effectAllowed = "copy";
  }

  function renderRaidKader(front) {
    const gridEl = document.getElementById(front + "-kader-grid");
    const countEl = document.getElementById(front + "-roster-count");
    if (!gridEl) return;
    const kader = kaderOf(front);
    const cap = front === "retail" ? 15 : 40;
    if (countEl) countEl.textContent = kader.length + "/" + cap;
    if (front === "forever") {
      const bar = document.getElementById("forever-progress-bar");
      const track = document.getElementById("forever-progress");
      const pct = Math.min(100, (kader.length / 40) * 100);
      if (bar) bar.style.width = pct + "%";
      if (track) {
        track.setAttribute("aria-valuenow", String(kader.length));
        track.setAttribute("aria-valuetext", kader.length + " von 40");
      }
    }
    gridEl.replaceChildren();
    if (!kader.length) {
      const empty = document.createElement("p");
      empty.className = "col-span-full py-8 text-center italic text-slate-500 pointer-events-none";
      empty.textContent = "Noch keine Spieler im Kader. Ziehe Mitglieder hierher oder trage sie ein.";
      gridEl.appendChild(empty);
      return;
    }
    const locked = !isOfficer();
    kader.forEach(function (slot, index) {
      if (!slot || typeof slot.name !== "string") return;
      const card = document.createElement("div");
      card.className = "relative flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md";
      const row = document.createElement("div");
      row.className = "mb-2 flex items-center justify-between gap-2";
      const input = document.createElement("input");
      input.type = "text";
      input.id = "raid-role-" + front + "-" + index;
      input.name = "raid-role-" + front + "-" + index;
      input.autocomplete = "off";
      input.value = slot.role || "";
      input.readOnly = locked || !slot.id;
      input.dataset.action = "raid-role";
      input.dataset.front = front;
      input.dataset.id = slot.id || "";
      input.className =
        "w-28 rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-bold text-amber-400 focus:border-amber-400";
      input.setAttribute("aria-label", "Rolle von " + slot.name);
      row.appendChild(input);
      if (!locked && slot.id) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove-raid";
        remove.dataset.front = front;
        remove.dataset.id = slot.id;
        remove.className =
          "inline-flex min-h-11 min-w-11 items-center justify-center text-slate-500 hover:text-red-500";
        remove.setAttribute("aria-label", slot.name + " aus dem Kader entfernen");
        remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
        row.appendChild(remove);
      }
      const name = document.createElement("p");
      name.className = "break-words text-base font-black text-white";
      name.textContent = slot.name;
      card.append(row, name);
      gridEl.appendChild(card);
    });
  }

  function updateRaidRole(front, id, newRole) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen den Raidkader bearbeiten.", "error");
      renderRaidKader(front);
      return;
    }
    if (!requireRemote()) {
      renderRaidKader(front);
      return;
    }
    const kader = kaderOf(front);
    const slot = kader.find(function (item) { return item.id === id; });
    const role = newRole.trim();
    if (!slot || !role) {
      renderRaidKader(front);
      return;
    }
    remote.from("roster").update({ role: role }).eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        renderRaidKader(front);
        return;
      }
      slot.role = role;
      renderRaidKader(front);
    });
  }

  function dropToRaid(event, front) {
    event.preventDefault();
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder in den Raidkader verschieben.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    if (!requireRemote()) return;
    const raw = event.dataTransfer ? event.dataTransfer.getData("text/plain") : "";
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return;
    }
    if (!data || data.front !== front || typeof data.name !== "string") {
      if (data && data.front && data.front !== front) {
        notify("Dieses Mitglied gehört zur anderen Front.", "error");
      }
      return;
    }
    const kader = kaderOf(front);
    if (kader.some(function (slot) { return slot.name === data.name; })) {
      notify("Dieser Charakter steht schon im Kader.", "info");
      return;
    }
    const role = front === "retail" ? "Melee-DD" : "DD";
    const sort = nextSort(kader);
    remote.from("roster").insert({
      front: front,
      name: data.name,
      role: role,
      sort_order: sort,
    }).select("id, front, name, role, sort_order").single().then(function (result) {
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      kader.push(mapRoster(result.data));
      renderRaidKader(front);
    });
  }

  const PICK_ADD_RED = "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
  const PICK_ADD_AMBER = "inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

  function selectedPickKeys(map) {
    return Object.keys(map).filter(function (key) { return map[key]; });
  }

  function togglePickKey(map, box) {
    const key = box.dataset.pickKey || "";
    if (!key) return;
    if (box.checked) map[key] = true;
    else delete map[key];
  }

  function setPickStatus(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function pickNote(parent, text) {
    const note = document.createElement("p");
    note.className = "px-2 py-3 text-sm text-slate-500";
    note.textContent = text;
    parent.appendChild(note);
  }

  function pickWaitText(fallback) {
    if (approvedProfilesState === "error" || !remote || !remoteReady) return fallback;
    return "Konten werden geladen…";
  }

  function pickMatches(query, parts) {
    const needle = String(query || "").trim().toLocaleLowerCase("de");
    if (!needle) return true;
    return parts.join(" ").toLocaleLowerCase("de").indexOf(needle) !== -1;
  }

  function personNameKey(value) {
    return String(value == null ? "" : value).trim().toLocaleLowerCase("de");
  }

  function personNameKeys(value) {
    const raw = personNameKey(value);
    if (!raw) return [];
    const cleaned = personNameKey(suggestDkpName(value));
    if (cleaned && cleaned !== raw) return [raw, cleaned];
    return [raw];
  }

  function namesOverlap(a, b) {
    const left = personNameKeys(a);
    const right = personNameKeys(b);
    for (let i = 0; i < left.length; i += 1) {
      if (right.indexOf(left[i]) !== -1) return true;
    }
    return false;
  }

  function personListed(list, name) {
    return list.some(function (item) {
      return item && namesOverlap(item.name, name);
    });
  }

  function pickGameRank(game, preferred) {
    const value = profileGameValue(game);
    if (value === preferred || value === "both") return 0;
    if (!value) return 1;
    return 2;
  }

  function modalFront(id) {
    return (document.getElementById(id) || {}).value === "forever" ? "forever" : "retail";
  }

  function clearPersonPickers() {
    approvedProfilesEpoch += 1;
    const waiters = approvedProfileWaiters.slice();
    approvedProfileWaiters = [];
    approvedProfiles = [];
    approvedProfilesState = "idle";
    memberPickSelected = {};
    raidPickSelected = {};
    dkpPickSelected = {};
    memberPickBusy = false;
    raidPickBusy = false;
    waiters.forEach(function (fn) { fn([]); });
    renderMemberPicker();
    renderRaidPicker();
    renderDkpPlayerPicker();
    renderLeadershipPicker();
  }

  function refreshOpenPickers() {
    const memberModal = document.getElementById("member-modal");
    if (memberModal && !memberModal.hidden) renderMemberPicker();
    const raidModal = document.getElementById("raid-modal");
    if (raidModal && !raidModal.hidden) renderRaidPicker();
    const leadModal = document.getElementById("leadership-modal");
    if (leadModal && !leadModal.hidden) renderLeadershipPicker();
    if (isOfficer() && canReadDkp()) renderDkpPlayerPicker();
  }

  function loadApprovedProfiles(force) {
    if (!isOfficer() || !remote || !remoteReady) return Promise.resolve([]);
    if (!force && (approvedProfilesState === "ready" || approvedProfilesState === "error")) {
      return Promise.resolve(approvedProfiles);
    }
    if (approvedProfilesState === "loading") {
      return new Promise(function (resolve) { approvedProfileWaiters.push(resolve); });
    }
    approvedProfilesState = "loading";
    const epoch = approvedProfilesEpoch;
    return remote.from("profiles").select("id, display_name, game, status").order("display_name").then(function (result) {
      if (epoch !== approvedProfilesEpoch || !isOfficer()) return [];
      if (!result || result.error) {
        approvedProfiles = [];
        approvedProfilesState = "error";
      } else {
        approvedProfiles = (result.data || []).filter(function (row) {
          return row && row.status === "approved" && String(row.display_name || "").trim();
        });
        approvedProfilesState = "ready";
      }
      const waiters = approvedProfileWaiters.slice();
      approvedProfileWaiters = [];
      waiters.forEach(function (fn) { fn(approvedProfiles); });
      refreshOpenPickers();
      return approvedProfiles;
    }).catch(function () {
      if (epoch !== approvedProfilesEpoch || !isOfficer()) return [];
      approvedProfiles = [];
      approvedProfilesState = "error";
      const waiters = approvedProfileWaiters.slice();
      approvedProfileWaiters = [];
      waiters.forEach(function (fn) { fn([]); });
      refreshOpenPickers();
      return [];
    });
  }

  function appendPickRow(parent, spec) {
    const row = document.createElement("div");
    row.className = "flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between" + (spec.muted ? " opacity-70" : "");
    const label = document.createElement(spec.checkName ? "label" : "div");
    label.className = "flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm text-slate-200";
    if (spec.checkName) {
      const box = document.createElement("input");
      box.type = "checkbox";
      box.name = spec.checkName;
      box.className = "h-4 w-4 shrink-0 accent-amber-500";
      box.checked = !!spec.checked;
      box.disabled = !!spec.disabled;
      box.dataset.pickKey = spec.key;
      label.appendChild(box);
    }
    const text = document.createElement("span");
    text.className = "min-w-0";
    const nameRow = document.createElement("span");
    nameRow.className = "flex min-w-0 flex-wrap items-center gap-2";
    const name = document.createElement("span");
    name.className = "break-words font-bold text-white";
    name.textContent = spec.name;
    nameRow.appendChild(name);
    const badge = spec.game ? gameBadge(spec.game) : null;
    if (badge) nameRow.appendChild(badge);
    text.appendChild(nameRow);
    if (spec.detail) {
      const detail = document.createElement("span");
      detail.className = "mt-1 block break-words text-xs text-slate-400";
      detail.textContent = spec.detail;
      text.appendChild(detail);
    }
    label.appendChild(text);
    row.appendChild(label);
    if (spec.buttonLabel) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = spec.buttonClass || PICK_ADD_RED;
      button.textContent = spec.buttonLabel;
      button.disabled = !!spec.disabled;
      button.dataset.action = spec.action;
      button.dataset.pickKey = spec.key;
      if (spec.dkpWrite) button.dataset.dkpWrite = "1";
      row.appendChild(button);
    }
    parent.appendChild(row);
  }

  function memberPickEntries(front) {
    const preferred = front === "forever" ? "forever" : "retail";
    return approvedProfiles.filter(function (profile) {
      return !personListed(membersOf(front), profile.display_name);
    }).slice().sort(function (a, b) {
      const byGame = pickGameRank(a.game, preferred) - pickGameRank(b.game, preferred);
      if (byGame) return byGame;
      return personNameKey(a.display_name).localeCompare(personNameKey(b.display_name), "de");
    });
  }

  function renderMemberPicker() {
    const list = document.getElementById("member-pick-list");
    const batch = document.getElementById("member-pick-selected");
    if (!list) return;
    if (batch) batch.disabled = memberPickBusy;
    if (!isOfficer()) {
      list.replaceChildren();
      return;
    }
    list.replaceChildren();
    if (!approvedProfiles.length) {
      pickNote(list, approvedProfilesState === "ready"
        ? "Noch keine freigegebenen Konten."
        : pickWaitText("Die Konten konnten nicht geladen werden. Den Namen kannst du unten von Hand eintragen."));
      return;
    }
    const front = modalFront("modal-front");
    const rows = memberPickEntries(front).filter(function (profile) {
      return pickMatches(memberPickQuery, [profile.display_name, gameLabel(profile.game)]);
    });
    if (!rows.length) {
      pickNote(list, memberPickEntries(front).length
        ? "Kein Konto passt zur Suche."
        : "Alle freigegebenen Konten stehen schon in der Liste.");
      return;
    }
    rows.forEach(function (profile) {
      const id = String(profile.id || "");
      appendPickRow(list, {
        key: id,
        name: String(profile.display_name || "").trim(),
        game: profile.game,
        checkName: "member-pick",
        checked: !!memberPickSelected[id],
        disabled: memberPickBusy,
        action: "member-pick-one",
        buttonLabel: "Hinzufügen",
        buttonClass: PICK_ADD_RED,
      });
    });
  }

  function insertMember(front, name, rank) {
    const list = membersOf(front);
    return remote.from("members").insert({
      front: front,
      name: name,
      rank: rank,
      sort_order: nextSort(list),
    }).select("id, front, name, rank, sort_order").single().then(function (result) {
      if (result.error || !result.data) return Promise.reject(result.error || new Error("save"));
      const mapped = mapMember(result.data);
      list.push(mapped);
      return mapped;
    });
  }

  function addPickedMembers(ids) {
    if (memberPickBusy) return;
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder bearbeiten.", "error");
      return;
    }
    if (!requireRemote()) return;
    const front = modalFront("modal-front");
    const rank = String((document.getElementById("modal-char-rank") || {}).value || "").trim() || "Frischefunke";
    const names = [];
    ids.forEach(function (id) {
      const profile = approvedProfiles.find(function (row) { return row && String(row.id) === id; });
      const name = profile ? String(profile.display_name || "").trim() : "";
      if (!name || personListed(membersOf(front), name)) return;
      if (names.some(function (existing) { return namesOverlap(existing, name); })) return;
      names.push(name);
    });
    if (!names.length) {
      setPickStatus("member-pick-status", "Bitte mindestens ein Konto auswählen.");
      return;
    }
    memberPickBusy = true;
    memberPickSelected = {};
    renderMemberPicker();
    let added = 0;
    function next(index) {
      if (index >= names.length) {
        memberPickBusy = false;
        renderMembers(front);
        renderMemberPicker();
        setPickStatus("member-pick-status", added === 1 ? "1 Mitglied hinzugefügt." : added + " Mitglieder hinzugefügt.");
        return;
      }
      insertMember(front, names[index], rank).then(function () {
        added += 1;
        next(index + 1);
      }).catch(function () {
        memberPickBusy = false;
        renderMembers(front);
        renderMemberPicker();
        notify(SAVE_FAIL, "error");
        if (added) {
          setPickStatus("member-pick-status", added + " hinzugefügt. Der Rest konnte nicht gespeichert werden.");
        }
      });
    }
    next(0);
  }

  function raidPickEntries(front) {
    const rows = [];
    const preferred = front === "forever" ? "forever" : "retail";
    membersOf(front).forEach(function (member) {
      if (!member || !member.id || !String(member.name || "").trim()) return;
      if (personListed(kaderOf(front), member.name)) return;
      rows.push({
        key: "m:" + member.id,
        name: String(member.name).trim(),
        detail: member.rank ? String(member.rank).trim() : "",
        game: front,
        group: 0,
      });
    });
    approvedProfiles.forEach(function (profile) {
      const name = String(profile.display_name || "").trim();
      if (!name || personListed(kaderOf(front), name)) return;
      if (rows.some(function (row) { return namesOverlap(row.name, name); })) return;
      rows.push({
        key: "p:" + profile.id,
        name: name,
        detail: "Konto",
        game: profile.game,
        group: 1 + pickGameRank(profile.game, preferred),
      });
    });
    rows.sort(function (a, b) {
      return a.group - b.group || personNameKey(a.name).localeCompare(personNameKey(b.name), "de");
    });
    return rows;
  }

  function raidPickByKey(front, key) {
    const rows = raidPickEntries(front);
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].key === key) return rows[i];
    }
    return null;
  }

  function renderRaidPicker() {
    const list = document.getElementById("raid-pick-list");
    const batch = document.getElementById("raid-pick-selected");
    if (!list) return;
    if (batch) batch.disabled = raidPickBusy;
    if (!isOfficer()) {
      list.replaceChildren();
      return;
    }
    list.replaceChildren();
    const front = modalFront("modal-raid-front");
    const available = raidPickEntries(front);
    if (!available.length && !approvedProfiles.length && approvedProfilesState !== "ready") {
      pickNote(list, pickWaitText("Die Konten konnten nicht geladen werden. Einen Namen kannst du unten von Hand eintragen."));
      return;
    }
    const rows = available.filter(function (row) {
      return pickMatches(raidPickQuery, [row.name, row.detail, gameLabel(row.game)]);
    });
    if (!rows.length) {
      if (available.length) pickNote(list, "Kein Name passt zur Suche.");
      else if (kaderOf(front).length) pickNote(list, "Alle passenden Namen stehen schon im Kader.");
      else pickNote(list, "Noch keine Namen zum Auswählen.");
      return;
    }
    rows.forEach(function (row) {
      appendPickRow(list, {
        key: row.key,
        name: row.name,
        detail: row.detail,
        game: row.game,
        checkName: "raid-pick",
        checked: !!raidPickSelected[row.key],
        disabled: raidPickBusy,
        action: "raid-pick-one",
        buttonLabel: "Hinzufügen",
        buttonClass: PICK_ADD_RED,
      });
    });
  }

  function insertRoster(front, name, role) {
    const kader = kaderOf(front);
    return remote.from("roster").insert({
      front: front,
      name: name,
      role: role,
      sort_order: nextSort(kader),
    }).select("id, front, name, role, sort_order").single().then(function (result) {
      if (result.error || !result.data) return Promise.reject(result.error || new Error("save"));
      const mapped = mapRoster(result.data);
      kader.push(mapped);
      return mapped;
    });
  }

  function addPickedRaid(keys) {
    if (raidPickBusy) return;
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen den Raidkader verwalten.", "error");
      return;
    }
    if (!requireRemote()) return;
    const front = modalFront("modal-raid-front");
    const role = String((document.getElementById("modal-raid-role") || {}).value || "").trim() || "Tank";
    const names = [];
    keys.forEach(function (key) {
      const row = raidPickByKey(front, key);
      if (!row || personListed(kaderOf(front), row.name)) return;
      if (names.some(function (existing) { return namesOverlap(existing, row.name); })) return;
      names.push(row.name);
    });
    if (!names.length) {
      setPickStatus("raid-pick-status", "Bitte mindestens einen Namen auswählen.");
      return;
    }
    raidPickBusy = true;
    raidPickSelected = {};
    renderRaidPicker();
    let added = 0;
    function next(index) {
      if (index >= names.length) {
        raidPickBusy = false;
        renderRaidKader(front);
        renderRaidPicker();
        setPickStatus("raid-pick-status", added === 1 ? "1 Spieler eingetragen." : added + " Spieler eingetragen.");
        return;
      }
      insertRoster(front, names[index], role).then(function () {
        added += 1;
        next(index + 1);
      }).catch(function () {
        raidPickBusy = false;
        renderRaidKader(front);
        renderRaidPicker();
        notify(SAVE_FAIL, "error");
        if (added) {
          setPickStatus("raid-pick-status", added + " eingetragen. Der Rest konnte nicht gespeichert werden.");
        }
      });
    }
    next(0);
  }

  function guildPickEntries() {
    const rows = [];
    function pushRow(key, name, detail, game) {
      const clean = String(name || "").trim();
      if (!clean) return;
      if (rows.some(function (row) { return namesOverlap(row.name, clean); })) return;
      rows.push({ key: key, name: clean, detail: detail, game: game });
    }
    foreverMembers.forEach(function (member) {
      if (!member || !member.id) return;
      pushRow("m:" + member.id, member.name, member.rank ? String(member.rank).trim() : "", "forever");
    });
    retailMembers.forEach(function (member) {
      if (!member || !member.id) return;
      pushRow("r:" + member.id, member.name, member.rank ? String(member.rank).trim() : "", "retail");
    });
    approvedProfiles.forEach(function (profile) {
      pushRow("p:" + profile.id, profile.display_name, "Konto", profile.game || "");
    });
    rows.sort(function (a, b) {
      return personNameKey(a.name).localeCompare(personNameKey(b.name), "de");
    });
    return rows;
  }

  function renderLeadershipPicker() {
    const list = document.getElementById("leadership-pick-list");
    if (!list) return;
    list.replaceChildren();
    if (!isOfficer()) return;
    const rows = guildPickEntries().filter(function (row) {
      return pickMatches(leadershipPickQuery, [row.name, row.detail, gameLabel(row.game)]);
    });
    if (!rows.length) {
      if (!foreverMembers.length && !retailMembers.length && approvedProfilesState !== "ready") {
        pickNote(list, pickWaitText("Die Konten konnten nicht geladen werden. Den Namen kannst du unten eintragen."));
        return;
      }
      pickNote(list, guildPickEntries().length ? "Kein Name passt zur Suche." : "Noch keine Namen zum Auswählen.");
      return;
    }
    rows.forEach(function (row) {
      appendPickRow(list, {
        key: row.key,
        name: row.name,
        detail: row.detail,
        game: row.game,
        action: "leadership-pick",
        buttonLabel: "Übernehmen",
        buttonClass: PICK_ADD_AMBER,
      });
    });
  }

  function applyLeadershipPick(key) {
    if (!isOfficer()) return;
    const row = guildPickEntries().filter(function (entry) { return entry.key === key; })[0];
    const input = document.getElementById("leadership-name");
    if (!row || !input) return;
    input.value = row.name.slice(0, 80);
    input.focus();
  }

  function dkpPickEntries() {
    const byKey = {};
    const rows = [];
    function add(label, memberId, game, detail) {
      const name = suggestDkpName(label);
      if (name.length < 2) return;
      const key = dkpNameKey(name);
      if (!key) return;
      const existing = byKey[key];
      if (existing) {
        if (!existing.memberId && memberId) existing.memberId = memberId;
        return;
      }
      const row = {
        key: key,
        name: name,
        label: String(label || "").trim(),
        memberId: memberId || "",
        game: game || "",
        detail: detail || "",
      };
      if (row.label !== row.name) row.detail = row.detail ? row.detail + " · wird als " + row.name + " angelegt" : "Wird als " + row.name + " angelegt";
      byKey[key] = row;
      rows.push(row);
    }
    foreverMembers.forEach(function (member) {
      if (!member || !String(member.name || "").trim()) return;
      add(member.name, isDkpUuid(member.id) ? member.id : "", "forever", member.rank ? String(member.rank).trim() : "");
    });
    approvedProfiles.forEach(function (profile) {
      const match = foreverMembers.find(function (member) {
        return member && namesOverlap(member.name, profile.display_name);
      });
      add(
        profile.display_name,
        match && isDkpUuid(match.id) ? match.id : "",
        profile.game || "",
        "Konto"
      );
    });
    rows.sort(function (a, b) {
      return personNameKey(a.name).localeCompare(personNameKey(b.name), "de");
    });
    return rows;
  }

  function dkpPickByKey(key) {
    const rows = dkpPickEntries();
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].key === key) return rows[i];
    }
    return null;
  }

  function dkpPickTaken(entry) {
    if (!entry) return true;
    if (dkpNameTaken(entry.name) || dkpNameTaken(entry.label)) return true;
    if (entry.memberId && dkpMemberTaken(entry.memberId)) return true;
    return false;
  }

  function renderDkpPlayerPicker() {
    const list = document.getElementById("dkp-player-pick-list");
    const batch = document.getElementById("dkp-player-pick-selected");
    if (!list) return;
    const editing = isDkpUuid(String((document.getElementById("dkp-player-id") || {}).value || ""));
    if (batch) batch.hidden = editing;
    if (!isOfficer() || !canReadDkp()) {
      list.replaceChildren();
      return;
    }
    list.replaceChildren();
    const available = dkpPickEntries();
    if (!available.length && approvedProfilesState !== "ready") {
      pickNote(list, pickWaitText("Die Konten konnten nicht geladen werden. Einen Namen kannst du unten von Hand eintragen."));
      return;
    }
    const rows = available.filter(function (row) {
      return pickMatches(dkpPickQuery, [row.label, row.name, row.detail, gameLabel(row.game)]);
    });
    if (!rows.length) {
      pickNote(list, available.length ? "Kein Name passt zur Suche." : "Noch keine Namen zum Auswählen.");
      return;
    }
    rows.forEach(function (row) {
      const taken = dkpPickTaken(row);
      if (taken) delete dkpPickSelected[row.key];
      appendPickRow(list, {
        key: row.key,
        name: row.label || row.name,
        detail: taken ? (row.detail ? row.detail + " · schon im DKP" : "schon im DKP") : row.detail,
        game: row.game,
        muted: taken,
        checkName: editing || taken ? "" : "dkp-player-pick",
        checked: !!dkpPickSelected[row.key],
        disabled: dkpBusy || taken,
        action: taken ? "" : "dkp-pick-one",
        buttonLabel: taken ? "" : (editing ? "Übernehmen" : "Hinzufügen"),
        buttonClass: PICK_ADD_AMBER,
        dkpWrite: !editing,
      });
    });
  }

  function fillDkpPlayerFromPick(entry) {
    const name = document.getElementById("dkp-player-name");
    const member = document.getElementById("dkp-player-member");
    const manual = document.getElementById("dkp-player-manual");
    if (name) name.value = entry.name;
    if (member) {
      const id = entry.memberId && isDkpUuid(entry.memberId) ? entry.memberId : "";
      if (id && !Array.prototype.some.call(member.options, function (option) { return option.value === id; })) {
        member.appendChild(dkpOption(id, entry.label || "Verknüpftes Mitglied"));
      }
      member.value = id;
    }
    if (manual) manual.open = true;
    setDkpStatus("dkp-player-status", "Name übernommen. Bitte speichern.");
    if (name) name.focus();
  }

  function addPickedDkpPlayers(keys) {
    if (!isOfficer() || !canReadDkp()) return;
    const editing = isDkpUuid(String((document.getElementById("dkp-player-id") || {}).value || ""));
    const entries = [];
    keys.forEach(function (key) {
      const row = dkpPickByKey(key);
      if (!row) return;
      if (entries.some(function (existing) { return existing.key === row.key; })) return;
      entries.push(row);
    });
    if (!entries.length) {
      setDkpStatus("dkp-player-status", "Bitte mindestens einen Spieler auswählen.");
      return;
    }
    if (editing) {
      fillDkpPlayerFromPick(entries[0]);
      return;
    }
    const todo = entries.filter(function (entry) { return !dkpPickTaken(entry); });
    if (!todo.length) {
      setDkpStatus("dkp-player-status", "Bitte einen Spieler auswählen, der noch nicht im DKP steht.");
      return;
    }
    dkpPickSelected = {};
    runDkpWrite("dkp-player-status", function () {
      let added = 0;
      function next(index) {
        if (index >= todo.length) {
          return added === 1 ? "1 Spieler angelegt." : added + " Spieler angelegt.";
        }
        const entry = todo[index];
        return dkpRpc("dkp_save_player", {
          p_char_name: entry.name,
          p_id: null,
          p_member_id: entry.memberId || null,
          p_active: true,
        }).then(function () {
          added += 1;
          return next(index + 1);
        }).catch(function (error) {
          if (!added) throw error;
          return added + " Spieler angelegt. Der Rest konnte nicht gespeichert werden.";
        });
      }
      return next(0);
    });
  }

  function openAddMemberModal(front) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder bearbeiten.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    const form = document.getElementById("member-form");
    form.reset();
    document.getElementById("modal-front").value = front;
    memberPickQuery = "";
    memberPickSelected = {};
    const manual = document.getElementById("member-manual");
    if (manual) manual.open = false;
    setPickStatus("member-pick-status", "");
    loadApprovedProfiles(true);
    renderMemberPicker();
    openModal("member-modal");
  }

  function openAddRaidModal(front) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen den Raidkader verwalten.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    const form = document.getElementById("raid-form");
    form.reset();
    document.getElementById("modal-raid-front").value = front;
    raidPickQuery = "";
    raidPickSelected = {};
    const manual = document.getElementById("raid-manual");
    if (manual) manual.open = false;
    setPickStatus("raid-pick-status", "");
    loadApprovedProfiles(true);
    renderRaidPicker();
    openModal("raid-modal");
  }

  function openMPlusModal() {
    if (!currentUser) {
      notify("Bitte melde dich an, um eine M+-Gruppe zu erstellen.", "error");
      openAuthModal();
      return;
    }
    const form = document.getElementById("mplus-form");
    form.reset();
    document.getElementById("mp-id").value = "";
    document.getElementById("mplus-modal-label").textContent = "M+ Gruppe erstellen";
    openModal("mplus-modal");
  }

  function openEditMPlus(id) {
    const group = mplusGroups.find(function (item) { return item.id === id; });
    if (!group || !canEditGroup(group)) {
      notify("Diese Gruppe darfst du nicht bearbeiten.", "error");
      return;
    }
    document.getElementById("mp-id").value = group.id;
    document.getElementById("mp-group-name").value = group.name;
    document.getElementById("mp-dungeon").value = group.dungeon;
    document.getElementById("mp-time").value = group.time;
    document.getElementById("mp-tank").value = group.tank;
    document.getElementById("mp-heal").value = group.heal;
    document.getElementById("mp-dds").value = asList(group.dds).join(", ");
    document.getElementById("mplus-modal-label").textContent = "M+ Gruppe bearbeiten";
    openModal("mplus-modal");
  }

  function openClassicRaidModal() {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Classic-Runs planen.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    document.getElementById("classic-form").reset();
    openModal("classic-raid-modal");
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    document.querySelectorAll(".modal").forEach(function (other) {
      if (other !== modal) other.hidden = true;
    });
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setInert(true);
    const field = modal.querySelector("input:not([type='hidden']), select, textarea, button");
    if (field) field.focus();
  }

  function closeModal(id) {
    const targets = id
      ? [document.getElementById(id)]
      : Array.from(document.querySelectorAll(".modal"));
    targets.forEach(function (modal) {
      if (modal) modal.hidden = true;
    });
    if (!openModalEl()) {
      document.body.classList.remove("modal-open");
      setInert(false);
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
  }

  function openModalEl() {
    return document.querySelector(".modal:not([hidden])");
  }

  function setInert(on) {
    ["site-header", "quick-nav", "inhalt", "site-footer"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.inert = on;
    });
  }

  function saveMember(form) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder bearbeiten.", "error");
      return;
    }
    if (!requireRemote()) return;
    const front = document.getElementById("modal-front").value === "forever" ? "forever" : "retail";
    const name = document.getElementById("modal-char-name").value.trim();
    const rank = document.getElementById("modal-char-rank").value;
    if (!name) {
      notify("Bitte einen Charakternamen eintragen.", "error");
      return;
    }
    insertMember(front, name, rank).then(function () {
      renderMembers(front);
      closeModal("member-modal");
      form.reset();
    }).catch(function () {
      notify(SAVE_FAIL, "error");
    });
  }

  function removeMember(front, id) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder entfernen.", "error");
      return;
    }
    if (!requireRemote() || !id) return;
    const list = membersOf(front);
    const index = list.findIndex(function (item) { return item.id === id; });
    if (index < 0) return;
    remote.from("members").delete().eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      list.splice(index, 1);
      renderMembers(front);
    });
  }

  function saveRaidMember(form) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen den Raidkader verwalten.", "error");
      return;
    }
    if (!requireRemote()) return;
    const front = document.getElementById("modal-raid-front").value === "forever" ? "forever" : "retail";
    const name = document.getElementById("modal-raid-name").value.trim();
    const role = document.getElementById("modal-raid-role").value;
    if (!name) {
      notify("Bitte einen Namen eintragen.", "error");
      return;
    }
    insertRoster(front, name, role).then(function () {
      renderRaidKader(front);
      closeModal("raid-modal");
      form.reset();
    }).catch(function () {
      notify(SAVE_FAIL, "error");
    });
  }

  function removeRaidMember(front, id) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder aus dem Kader entfernen.", "error");
      return;
    }
    if (!requireRemote() || !id) return;
    const kader = kaderOf(front);
    const index = kader.findIndex(function (item) { return item.id === id; });
    if (index < 0) return;
    remote.from("roster").delete().eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      kader.splice(index, 1);
      renderRaidKader(front);
    });
  }

  function readMPlusForm() {
    const dds = document
      .getElementById("mp-dds")
      .value.split(",")
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
    return {
      id: document.getElementById("mp-id").value,
      name: document.getElementById("mp-group-name").value.trim(),
      dungeon: document.getElementById("mp-dungeon").value.trim(),
      meeting_time: document.getElementById("mp-time").value.trim(),
      tank: document.getElementById("mp-tank").value.trim(),
      heal: document.getElementById("mp-heal").value.trim(),
      dds: dds,
    };
  }

  function saveMPlusGroup(form) {
    if (!currentUser) {
      notify("Bitte melde dich an, um eine M+-Gruppe zu erstellen.", "error");
      openAuthModal();
      return;
    }
    if (!isApproved()) {
      notify(accessNotice(), "error");
      return;
    }
    if (!requireRemote()) return;
    const group = readMPlusForm();
    if (!group.name || !group.dungeon || !group.meeting_time || !group.tank || !group.heal || !group.dds.length) {
      notify("Bitte alle Felder der M+-Gruppe ausfüllen.", "error");
      return;
    }
    const payload = {
      name: group.name,
      dungeon: group.dungeon,
      meeting_time: group.meeting_time,
      tank: group.tank,
      heal: group.heal,
      dds: group.dds,
    };
    const request = group.id
      ? remote.from("mplus_groups").update(payload).eq("id", group.id).select("id, name, dungeon, meeting_time, tank, heal, dds, created_by").single()
      : remote.from("mplus_groups").insert(payload).select("id, name, dungeon, meeting_time, tank, heal, dds, created_by").single();
    request.then(function (result) {
      if (result.error || !result.data) {
        notify(group.id ? "Diese Gruppe darfst du nicht bearbeiten." : SAVE_FAIL, "error");
        return;
      }
      const mapped = mapGroup(result.data, group.id ? (mplusGroups.find(function (item) { return item.id === group.id; }) || {}).signups : []);
      const index = mplusGroups.findIndex(function (item) { return item.id === mapped.id; });
      if (index >= 0) mplusGroups[index] = mapped;
      else mplusGroups.push(mapped);
      renderMPlusGroups();
      closeModal("mplus-modal");
      form.reset();
    });
  }

  function renderMPlusGroups() {
    const grid = document.getElementById("mplus-groups-grid");
    if (!grid) return;
    grid.replaceChildren();
    const groups = mplusGroups.filter(function (group) { return group && typeof group.name === "string"; });
    if (!groups.length) {
      const empty = document.createElement("p");
      empty.className = "col-span-full py-8 text-center italic text-slate-500";
      empty.textContent = "Noch keine M+-Gruppe eingetragen.";
      grid.appendChild(empty);
      return;
    }
    groups.forEach(function (group) {
      const card = document.createElement("article");
      card.className = "space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-md";
      const head = document.createElement("div");
      head.className = "flex items-start justify-between gap-3";
      const titles = document.createElement("div");
      titles.className = "min-w-0";
      const badge = document.createElement("span");
      badge.className =
        "inline-block rounded border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400";
      badge.textContent = group.dungeon || "";
      const title = document.createElement("h3");
      title.className = "mt-1 break-words text-lg font-bold text-white";
      title.textContent = group.name;
      titles.append(badge, title);
      const actions = document.createElement("div");
      actions.className = "flex shrink-0 items-center";
      if (group.id && canEditGroup(group)) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.dataset.action = "edit-mplus";
        edit.dataset.id = group.id;
        edit.className =
          "inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-slate-500 hover:text-white";
        edit.setAttribute("aria-label", "M+-Gruppe " + group.name + " bearbeiten");
        edit.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
        actions.appendChild(edit);
      }
      if (group.id && canDeleteGroup(group)) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove-mplus";
        remove.dataset.id = group.id;
        remove.className =
          "inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-slate-500 hover:text-red-500";
        remove.setAttribute("aria-label", "M+-Gruppe " + group.name + " entfernen");
        remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        actions.appendChild(remove);
      }
      head.append(titles, actions);
      const time = document.createElement("p");
      time.className = "flex items-center gap-2 text-xs text-slate-400";
      time.innerHTML = '<i class="fa-solid fa-clock text-amber-400" aria-hidden="true"></i> ';
      time.appendChild(document.createTextNode(group.time || ""));
      const roles = document.createElement("div");
      roles.className = "grid grid-cols-2 gap-2 border-t border-slate-900 pt-2 text-xs";
      roles.append(
        roleChip("bg-blue-950/40 border border-blue-900/50", "text-blue-400", "Tank:", group.tank),
        roleChip("bg-emerald-950/40 border border-emerald-900/50", "text-emerald-400", "Heal:", group.heal)
      );
      const dd = roleChip(
        "col-span-2 bg-red-950/40 border border-red-900/50",
        "text-red-400",
        "DDs:",
        asList(group.dds).join(", ")
      );
      roles.appendChild(dd);
      const signups = (group.signups || []).map(function (signup) { return signup.characterName; }).filter(Boolean);
      card.append(head, time, roles);
      if (signups.length) {
        card.appendChild(roleChip(
          "bg-slate-900 border border-slate-800",
          "text-amber-400",
          "Dabei:",
          signups.join(", ")
        ));
      }
      if (isApproved() && group.id && remoteReady) {
        const mine = (group.signups || []).find(function (signup) { return signup.userId === currentUser.id; });
        const join = document.createElement("button");
        join.type = "button";
        join.dataset.action = mine ? "leave-mplus" : "join-mplus";
        join.dataset.id = mine ? mine.id : group.id;
        join.className = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700";
        join.textContent = mine ? "Verlassen" : "Beitreten";
        card.appendChild(join);
      }
      grid.appendChild(card);
    });
  }

  function roleChip(boxClass, labelClass, label, value) {
    const el = document.createElement("div");
    el.className = boxClass + " rounded-lg p-2";
    const strong = document.createElement("span");
    strong.className = labelClass + " font-bold";
    strong.textContent = label + " ";
    el.append(strong, document.createTextNode(value || ""));
    return el;
  }

  function removeMPlusGroup(id) {
    const index = mplusGroups.findIndex(function (item) { return item.id === id; });
    const group = mplusGroups[index];
    if (!group || !canDeleteGroup(group)) {
      notify("Diese Gruppe darfst du nicht entfernen.", "error");
      return;
    }
    if (!requireRemote()) return;
    remote.from("mplus_groups").delete().eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      mplusGroups.splice(index, 1);
      renderMPlusGroups();
    });
  }

  function joinMPlus(groupId) {
    if (!currentUser) {
      notify("Bitte melde dich an, um einer Gruppe beizutreten.", "error");
      openAuthModal();
      return;
    }
    if (!isApproved()) {
      notify(accessNotice(), "error");
      return;
    }
    if (!requireRemote()) return;
    remote.from("mplus_signups").insert({ group_id: groupId }).select("id, group_id, user_id, character_name").single().then(function (result) {
      if (result.error || !result.data) {
        notify("Beitreten ist gerade nicht möglich.", "error");
        return;
      }
      const group = mplusGroups.find(function (item) { return item.id === groupId; });
      if (group) {
        group.signups = group.signups || [];
        group.signups.push(mapSignup(result.data));
      }
      renderMPlusGroups();
    });
  }

  function leaveMPlus(signupId) {
    if (!currentUser || !isApproved() || !requireRemote() || !signupId) return;
    remote.from("mplus_signups").delete().eq("id", signupId).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      mplusGroups.forEach(function (group) {
        group.signups = (group.signups || []).filter(function (signup) { return signup.id !== signupId; });
      });
      renderMPlusGroups();
    });
  }

  function saveClassicRun(form) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Classic-Runs planen.", "error");
      return;
    }
    if (!requireRemote()) return;
    const run = {
      name: document.getElementById("cr-name").value.trim(),
      size: document.getElementById("cr-size").value,
      meeting_time: document.getElementById("cr-time").value.trim(),
    };
    if (!run.name || !run.meeting_time || !["10", "20", "40"].includes(run.size)) {
      notify("Bitte Instanz und Termin ausfüllen.", "error");
      return;
    }
    remote.from("classic_runs").insert(run).select("id, name, size, meeting_time").single().then(function (result) {
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      classicRuns.push(mapRun(result.data));
      renderClassicRuns();
      closeModal("classic-raid-modal");
      form.reset();
    });
  }

  function renderClassicRuns() {
    const grid = document.getElementById("classic-runs-grid");
    if (!grid) return;
    grid.replaceChildren();
    const runs = classicRuns.filter(function (run) { return run && typeof run.name === "string"; });
    if (!runs.length) {
      const empty = document.createElement("p");
      empty.className = "col-span-full py-8 text-center italic text-slate-500";
      empty.textContent = "Noch kein Classic-Run angesetzt.";
      grid.appendChild(empty);
      return;
    }
    runs.forEach(function (run) {
      const card = document.createElement("article");
      card.className = "space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-md";
      const head = document.createElement("div");
      head.className = "flex items-start justify-between gap-3";
      const titles = document.createElement("div");
      titles.className = "min-w-0";
      const badge = document.createElement("span");
      badge.className =
        "inline-block rounded border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400";
      badge.textContent = String(run.size || "") + "er Raid";
      const title = document.createElement("h3");
      title.className = "mt-1 break-words text-lg font-bold text-white";
      title.textContent = run.name;
      titles.append(badge, title);
      head.appendChild(titles);
      if (isOfficer() && run.id) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove-classic";
        remove.dataset.id = run.id;
        remove.className =
          "inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-slate-500 hover:text-red-500";
        remove.setAttribute("aria-label", "Classic-Run " + run.name + " entfernen");
        remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        head.appendChild(remove);
      }
      const time = document.createElement("p");
      time.className = "flex items-center gap-2 text-xs text-slate-400";
      time.innerHTML = '<i class="fa-solid fa-clock text-amber-400" aria-hidden="true"></i> ';
      time.appendChild(document.createTextNode(run.time || ""));
      card.append(head, time);
      grid.appendChild(card);
    });
  }

  function removeClassicRun(id) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Classic-Runs löschen.", "error");
      return;
    }
    if (!requireRemote() || !id) return;
    const index = classicRuns.findIndex(function (item) { return item.id === id; });
    if (index < 0) return;
    remote.from("classic_runs").delete().eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      classicRuns.splice(index, 1);
      renderClassicRuns();
    });
  }

  let applicationSending = false;

  function arcConfig() {
    const config = window.ARC_CONFIG;
    return config && typeof config === "object" ? config : {};
  }

  function discordInvite() {
    const url = arcConfig().discordInviteUrl;
    if (typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!/^https:\/\/(discord\.gg|discord\.com)\//i.test(trimmed)) return "";
    return trimmed;
  }

  function applicationWebhookUrl() {
    const url = arcConfig().applicationWebhookUrl;
    if (typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!/^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/i.test(trimmed)) return "";
    return trimmed;
  }

  function renderDiscordSlots() {
    const url = isApproved() ? discordInvite() : "";
    document.querySelectorAll("[data-discord-slot]").forEach(function (slot) {
      slot.replaceChildren();
      if (url) {
        slot.hidden = false;
        slot.appendChild(discordJoinLink(url, slot.dataset.discordStyle || ""));
        return;
      }
      if (currentUser) {
        slot.hidden = true;
        return;
      }
      slot.hidden = false;
      slot.appendChild(discordLockedNote());
    });
  }

  function discordJoinLink(url, style) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const icon = document.createElement("i");
    icon.className = "fa-brands fa-discord";
    icon.setAttribute("aria-hidden", "true");
    link.appendChild(icon);
    if (style === "hero") {
      link.className = "btn btn-discord";
      link.appendChild(document.createTextNode(" Discord beitreten"));
      return link;
    }
    link.className = "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700";
    if (style === "header") {
      const shortLabel = document.createElement("span");
      shortLabel.className = "sm:hidden";
      shortLabel.textContent = "Discord";
      const fullLabel = document.createElement("span");
      fullLabel.className = "hidden sm:inline";
      fullLabel.textContent = "Discord beitreten";
      link.append(shortLabel, fullLabel);
      return link;
    }
    link.appendChild(document.createTextNode(" Discord beitreten"));
    return link;
  }

  function discordLockedNote() {
    const note = document.createElement("p");
    note.className = "text-xs leading-relaxed text-slate-300";
    note.appendChild(document.createTextNode(DISCORD_NOTE + " "));
    const apply = document.createElement("a");
    apply.href = "#bewerbung";
    apply.className = "font-semibold text-amber-400 hover:text-white";
    apply.textContent = "Bewerben";
    const register = document.createElement("button");
    register.type = "button";
    register.dataset.action = "open-auth";
    register.className = "font-semibold text-amber-400 hover:text-white";
    register.textContent = "Registrieren";
    note.append(apply, document.createTextNode(" · "), register);
    return note;
  }

  function fieldValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "") : "";
  }

  function sanitizeDiscord(value, max) {
    let text = String(value == null ? "" : value);
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length > max) text = text.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
    text = text.replace(/@/g, "@\u200b");
    text = text.replace(/[\\*_`~|]/g, "\\$&");
    text = text.replace(/^>/gm, "\\>");
    if (text.length > 1024) text = text.slice(0, 1023).replace(/\\$/, "").trimEnd() + "…";
    return text || "–";
  }

  function embedField(name, value, inline) {
    return { name: name, value: sanitizeDiscord(value, inline ? 80 : 900), inline: inline };
  }

  function applicationCooldownRemaining() {
    let at = 0;
    try {
      at = Number(localStorage.getItem("arc_application_at")) || 0;
    } catch (err) {
      at = 0;
    }
    if (!at) return 0;
    return Math.max(0, APPLICATION_COOLDOWN_MS - (Date.now() - at));
  }

  function buildApplicationPayload(data) {
    return {
      username: "The Arc Flame",
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: "Neue Gildenbewerbung",
          color: 14417958,
          fields: [
            embedField("Charaktername", data.name, true),
            embedField("Realm", data.realm, true),
            embedField("Klasse", data.charClass, true),
            embedField("Spezialisierung", data.spec, true),
            embedField("Front", data.front, true),
            embedField("Kontakt/Discord-Name", data.contact, true),
            embedField("Erfahrung", data.experience, false),
            embedField("Nachricht", data.message, false),
          ],
          footer: { text: "The Arc Flame" },
          timestamp: new Date().toISOString(),
        },
      ],
    };
  }

  function postApplication(payload) {
    const url = applicationWebhookUrl();
    if (!url) return Promise.reject(new Error("webhook"));
    return fetch(url, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (response) {
      if (!response.ok) throw new Error("webhook");
    });
  }

  function rememberApplication(entry) {
    const author = String(entry.author || "").slice(0, 80);
    const body = String(entry.text || "").slice(0, 4000);
    if (!remote || !remoteReady) {
      chatMessages.push({ author: author, text: body, time: entry.time || clock() });
      trimChat();
      renderChat();
      return;
    }
    remote.rpc("post_application_note", { author: author, body: body }).then(function (result) {
      if (result.error) {
        chatMessages.push({ author: author, text: body, time: entry.time || clock() });
        trimChat();
        renderChat();
        return;
      }
      refreshChat();
    });
  }

  function maskEmail(email) {
    const value = String(email || "").trim().toLowerCase();
    const at = value.indexOf("@");
    if (at < 1 || at !== value.lastIndexOf("@")) return "";
    const local = value.slice(0, at);
    const domain = value.slice(at + 1);
    if (!local || domain.indexOf(".") < 1) return "";
    return local.charAt(0) + "***@" + domain;
  }

  function registrationWebhookText(name, email) {
    const safeName = sanitizeDiscord(name, 80);
    const masked = maskEmail(email);
    const who = masked ? safeName + " (" + masked + ")" : safeName;
    return "Neue Registrierung auf der Webseite: " + who + " – bitte auf https://thearcflame.github.io freischalten.";
  }

  function postRegistrationNotice(name, email) {
    if (!applicationWebhookUrl()) return Promise.resolve();
    return postApplication({
      username: "The Arc Flame",
      allowed_mentions: { parse: [] },
      content: registrationWebhookText(name, email).slice(0, 1800),
    }).catch(function () {
      /* Die Registrierung bleibt gültig, auch wenn Discord gerade nicht antwortet. */
    });
  }

  function applicationErrorMessage() {
    if (isApproved()) {
      const invite = discordInvite();
      if (invite) return "Die Bewerbung konnte nicht gesendet werden. Schreib uns direkt auf Discord: " + invite;
    }
    return "Die Bewerbung konnte nicht gesendet werden. Bitte versuche es später noch einmal.";
  }

  function submitApplication(form) {
    if (applicationSending) return;
    const honeypot = document.getElementById("app-website");
    if (honeypot && honeypot.value.trim()) return;

    const frontSelect = document.getElementById("app-front");
    const frontValue = frontSelect ? frontSelect.value : "";
    const frontLabel = frontSelect && frontSelect.selectedOptions.length
      ? frontSelect.selectedOptions[0].textContent.trim()
      : frontValue;
    const data = {
      name: fieldValue("app-name").trim(),
      realm: fieldValue("app-realm").trim(),
      front: frontValue === "Forever" ? "Forever" : "Retail",
      frontLabel: frontLabel,
      charClass: fieldValue("app-class").trim(),
      spec: fieldValue("app-spec").trim(),
      contact: fieldValue("app-contact").trim(),
      experience: fieldValue("app-experience").trim(),
      message: fieldValue("app-msg").trim(),
    };
    if (!data.name || !data.realm || !data.charClass || !data.message) {
      notify("Bitte die Bewerbung vollständig ausfüllen.", "error");
      return;
    }
    if (applicationCooldownRemaining() > 0) {
      notify("Bitte warte eine Minute, bevor du eine weitere Bewerbung abschickst.", "error");
      return;
    }

    const button = form.querySelector('[type="submit"]');
    applicationSending = true;
    if (button) button.disabled = true;
    const payload = buildApplicationPayload({
      name: data.name,
      realm: data.realm,
      front: data.front,
      charClass: data.charClass,
      spec: data.spec,
      contact: data.contact,
      experience: data.experience,
      message: data.message,
    });
    postApplication(payload).then(function () {
      const spec = data.spec ? " / " + data.spec : "";
      const extra = [];
      if (data.experience) extra.push("Erfahrung: " + data.experience);
      if (data.contact) extra.push("Kontakt: " + data.contact);
      let text = 'Neue Bewerbung für [' + data.frontLabel + "] (" + data.charClass + spec + ", " + data.realm + '): "' + data.message + '"';
      if (extra.length) text += " " + extra.join(" ");
      rememberApplication({
        author: "Bewerbung (" + data.name + ")",
        text: text,
        time: clock(),
      });
      try {
        localStorage.setItem("arc_application_at", String(Date.now()));
      } catch (err) {
        /* Cooldown ist nur ein Zusatz; die Bewerbung ist schon angekommen. */
      }
      renderChat();
      form.reset();
      notify("Deine Bewerbung ist bei uns angekommen!", "info");
    }).catch(function () {
      notify(applicationErrorMessage(), "error");
    }).then(function () {
      applicationSending = false;
      if (button) button.disabled = false;
    });
  }

  function sendChatMessage(form) {
    if (!currentUser) {
      notify("Bitte melde dich an, um im Gildenchat zu schreiben.", "error");
      openAuthModal();
      return;
    }
    if (!isApproved()) {
      notify(accessNotice(), "error");
      return;
    }
    if (!requireRemote()) return;
    const text = document.getElementById("chat-text").value.trim();
    if (!text) {
      notify("Bitte eine Nachricht ausfüllen.", "error");
      return;
    }
    if (text.length > 2000) {
      notify("Die Nachricht ist zu lang.", "error");
      return;
    }
    const front = chatFront();
    remote.from("chat_messages").insert({
      body: text,
      author: currentUser.displayName,
      user_id: currentUser.id,
      front: front,
    }).select("id, author, body, user_id, source, front, created_at").single().then(function (result) {
      if (front !== chatFront()) return;
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      chatMessages.push(mapChat(result.data));
      trimChat();
      renderChat();
      document.getElementById("chat-text").value = "";
    });
  }

  function removeChatMessage(id) {
    const message = chatMessages.find(function (item) { return item.id === id; });
    if (!message || !currentUser) return;
    if (!isApproved()) {
      notify(accessNotice(), "error");
      return;
    }
    if (message.userId !== currentUser.id && !isOfficer()) {
      notify("Diese Nachricht darfst du nicht löschen.", "error");
      return;
    }
    if (!requireRemote()) return;
    remote.from("chat_messages").delete().eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      const index = chatMessages.findIndex(function (item) { return item.id === id; });
      if (index >= 0) chatMessages.splice(index, 1);
      renderChat();
    });
  }

  function renderChat() {
    const box = document.getElementById("chat-messages");
    if (!box) return;
    box.replaceChildren();
    const front = chatFront();
    const messages = chatMessages.filter(function (message) {
      return message && typeof message.text === "string" && (!message.front || message.front === front);
    });
    if (!canReadChat()) {
      const locked = document.createElement("p");
      locked.className = "text-amber-200";
      locked.textContent = CHAT_LOCKED_HINT;
      box.appendChild(locked);
      return;
    }
    if (!messages.length) {
      const empty = document.createElement("p");
      empty.className = "text-slate-500";
      empty.textContent = "Noch keine Nachrichten.";
      box.appendChild(empty);
      return;
    }
    messages.forEach(function (message) {
      const line = document.createElement("p");
      line.className = "break-words";
      const time = document.createElement("span");
      time.className = "text-slate-500";
      time.textContent = "[" + (message.time || "") + "]";
      const author = document.createElement("strong");
      author.className = "text-amber-400";
      author.textContent = " <" + (message.author || "Unbekannt") + ">";
      const text = document.createElement("span");
      text.className = "text-emerald-400";
      text.textContent = " " + message.text;
      line.append(time, author);
      if (message.source === "discord") line.appendChild(viaDiscordBadge());
      line.append(document.createTextNode(":"), text);
      if (message.id && currentUser && (message.userId === currentUser.id || isOfficer())) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove-chat";
        remove.dataset.id = message.id;
        remove.className = "ml-2 inline-flex min-h-11 min-w-11 items-center justify-center text-slate-500 hover:text-red-500";
        remove.setAttribute("aria-label", "Nachricht löschen");
        remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        line.appendChild(remove);
      }
      box.appendChild(line);
    });
    box.scrollTop = box.scrollHeight;
  }

  function loadGuildInfoView() {
    document.getElementById("info-col-1").textContent = guildInfo.col1;
    document.getElementById("info-col-2").textContent = guildInfo.col2;
    document.getElementById("info-col-3").textContent = guildInfoCol3();
  }

  function guildInfoCol3() {
    const shared = "Ob Retail-Veteran oder Classic-Liebhaber ab dem 5. November: Über unseren gemeinsamen Gilden-Chat halten wir alle Fäden zusammen unter der roten Flagge.";
    const split = "Ob Retail-Veteran oder Classic-Liebhaber ab dem 5. November: Retail und Forever haben jeweils einen eigenen Gilden-Chat unter der roten Flagge.";
    return guildInfo.col3 === shared ? split : guildInfo.col3;
  }

  function toggleInfoEdit() {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Gildeninfo bearbeiten.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    document.getElementById("edit-col-1").value = guildInfo.col1;
    document.getElementById("edit-col-2").value = guildInfo.col2;
    document.getElementById("edit-col-3").value = guildInfoCol3();
    document.getElementById("info-display-mode").hidden = true;
    document.getElementById("edit-info-btn").hidden = true;
    document.getElementById("info-edit-mode").hidden = false;
    document.getElementById("edit-info-btn").setAttribute("aria-expanded", "true");
    document.getElementById("edit-col-1").focus();
  }

  function cancelInfoEdit() {
    document.getElementById("info-edit-mode").hidden = true;
    document.getElementById("info-display-mode").hidden = false;
    document.getElementById("edit-info-btn").hidden = false;
    document.getElementById("edit-info-btn").setAttribute("aria-expanded", "false");
    document.getElementById("edit-info-btn").focus();
  }

  function saveInfoEdit() {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Gildeninfo bearbeiten.", "error");
      return;
    }
    if (!requireRemote()) return;
    const next = {
      col1: document.getElementById("edit-col-1").value,
      col2: document.getElementById("edit-col-2").value,
      col3: document.getElementById("edit-col-3").value,
    };
    remote.from("guild_info").update(next).eq("id", 1).select("col1, col2, col3").single().then(function (result) {
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      guildInfo.col1 = result.data.col1;
      guildInfo.col2 = result.data.col2;
      guildInfo.col3 = result.data.col3;
      loadGuildInfoView();
      cancelInfoEdit();
      notify("Gildeninfo gespeichert.", "info");
    });
  }

  function notify(message, kind) {
    const el = document.getElementById("notice");
    if (!el) return;
    el.dataset.kind = kind === "error" ? "error" : "info";
    el.setAttribute("aria-live", kind === "error" ? "assertive" : "polite");
    el.querySelector("[data-notice-text]").textContent = message;
    el.hidden = false;
    window.clearTimeout(noticeTimer);
    if (kind !== "error") {
      noticeTimer = window.setTimeout(hideNotice, 7000);
    }
  }

  function hideNotice() {
    const el = document.getElementById("notice");
    if (el) el.hidden = true;
  }

  function membersOf(front) {
    return front === "forever" ? foreverMembers : retailMembers;
  }

  function kaderOf(front) {
    return front === "forever" ? foreverRaid : retailRaid;
  }

  function trimChat() {
    const cap = 200;
    if (chatMessages.length > cap) chatMessages.splice(0, chatMessages.length - cap);
  }

  function asList(value) {
    if (Array.isArray(value)) return value.map(function (item) { return String(item); });
    if (typeof value === "string") {
      return value.split(",").map(function (part) { return part.trim(); }).filter(Boolean);
    }
    return [];
  }

  function clock() {
    return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  function motion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function focusable(root) {
    return Array.from(
      root.querySelectorAll("a, button, input, select, textarea")
    ).filter(function (el) {
      if (el.disabled || el.type === "hidden" || el.tabIndex < 0) return false;
      return !el.closest("[hidden]");
    });
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setupReveal() {
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });
    refreshReveal(document);
  }

  function refreshReveal(root) {
    if (!revealObserver || !root) return;
    root.querySelectorAll(".reveal").forEach(function (node) {
      if (node.classList.contains("is-visible")) return;
      if (node.closest("[hidden]")) return;
      const rect = node.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight * 0.94;
      if (inView) {
        node.classList.add("is-visible");
        return;
      }
      node.classList.add("will-reveal");
      revealObserver.observe(node);
    });
  }

  const GALLERY_MAX_WIDTH = 1920;
  const GALLERY_MAX_BYTES = 10 * 1024 * 1024;
  const GALLERY_BATCH = 10;

  function isGallerySrc(src) {
    if (typeof src !== "string") return false;
    const value = src.trim();
    if (!value || value.indexOf("..") !== -1) return false;
    return /^assets\/gallery\/[^/\\]+\.(webp|png|jpe?g|gif)$/i.test(value);
  }

  function isGalleryId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");
  }

  function isGalleryObjectPath(path) {
    return typeof path === "string" && path.length <= 160 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path);
  }

  function supabaseHost() {
    const raw = arcConfig().supabaseUrl;
    if (typeof raw !== "string") return "";
    try {
      const parsed = new URL(raw.trim());
      if (parsed.protocol !== "https:") return "";
      return parsed.host;
    } catch (err) {
      return "";
    }
  }

  function isGalleryPublicUrl(url, objectPath) {
    if (typeof url !== "string") return false;
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== "https:" || parsed.search || parsed.hash) return false;
      const host = supabaseHost();
      if (!host || parsed.host !== host) return false;
      const prefix = "/storage/v1/object/public/gallery/";
      if (parsed.pathname.indexOf(prefix) !== 0) return false;
      const name = decodeURIComponent(parsed.pathname.slice(prefix.length));
      if (!isGalleryObjectPath(name)) return false;
      if (objectPath && name !== objectPath) return false;
      return true;
    } catch (err) {
      return false;
    }
  }

  function staticGalleryItems() {
    const list = arcConfig().galleryImages;
    const items = [];
    if (!Array.isArray(list)) return items;
    list.forEach(function (item) {
      if (!item || !isGallerySrc(item.src)) return;
      const alt = typeof item.alt === "string" && item.alt.trim() ? item.alt.trim().slice(0, 200) : "Screenshot der Gilde";
      items.push({ src: item.src.trim(), alt: alt, caption: alt, remote: false });
    });
    return items;
  }

  function mapGalleryRow(row) {
    if (!row || !isGalleryId(String(row.id || "")) || !isGalleryObjectPath(row.path)) return null;
    const path = row.path.trim();
    const url = typeof row.url === "string" ? row.url.trim() : "";
    if (!isGalleryPublicUrl(url, path)) return null;
    const caption = typeof row.caption === "string" ? row.caption.trim().slice(0, 200) : "";
    return {
      id: String(row.id),
      path: path,
      src: url,
      alt: caption || "Screenshot der Gilde",
      caption: caption,
      remote: true,
    };
  }

  function mergedGallery() {
    const merged = [];
    const seen = {};
    const remoteItems = galleryDbReady ? galleryFromDb : [];
    remoteItems.forEach(function (item) {
      if (!item || !item.src || seen[item.src]) return;
      seen[item.src] = true;
      merged.push(item);
    });
    staticGalleryItems().forEach(function (item) {
      if (seen[item.src]) return;
      seen[item.src] = true;
      merged.push(item);
    });
    return merged;
  }

  function renderGalleryPlaceholders(grid) {
    grid.replaceChildren();
    ["a", "b", "c", "d"].forEach(function (tone) {
      const li = document.createElement("li");
      li.className = "gallery-tile is-placeholder is-" + tone;
      const art = document.createElement("div");
      art.className = "gallery-art";
      art.setAttribute("aria-hidden", "true");
      const rune = document.createElement("span");
      rune.className = "gallery-rune";
      art.appendChild(rune);
      const caption = document.createElement("p");
      caption.className = "gallery-caption";
      caption.textContent = "Screenshot folgt";
      li.append(art, caption);
      grid.appendChild(li);
    });
  }

  function renderGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    const items = mergedGallery();
    gallery = items;
    if (!items.length) {
      if (lightboxOpen()) closeLightbox();
      renderGalleryPlaceholders(grid);
      return;
    }
    const officer = isOfficer();
    grid.replaceChildren();
    items.forEach(function (item, index) {
      const li = document.createElement("li");
      li.className = "gallery-item";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-tile";
      button.dataset.action = "open-gallery";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", item.alt + ", vergrößern");
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      button.appendChild(img);
      if (item.caption) {
        const caption = document.createElement("span");
        caption.className = "gallery-caption";
        caption.textContent = item.caption;
        button.appendChild(caption);
      }
      li.appendChild(button);
      if (officer && item.remote && item.id && item.path) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "gallery-delete";
        remove.dataset.action = "delete-gallery";
        remove.dataset.id = item.id;
        remove.dataset.path = item.path;
        remove.textContent = "Löschen";
        remove.setAttribute("aria-label", item.caption ? "Löschen: " + item.caption : "Bild löschen");
        li.appendChild(remove);
      }
      grid.appendChild(li);
    });
  }

  function loadGallery() {
    if (!remote || typeof remote.from !== "function") return;
    let request;
    try {
      request = remote.from("gallery_images").select("id, path, url, caption, created_at").order("created_at", { ascending: false });
    } catch (err) {
      return;
    }
    Promise.resolve(request).then(function (result) {
      if (!result || result.error) return;
      const next = [];
      (result.data || []).forEach(function (row) {
        const item = mapGalleryRow(row);
        if (item) next.push(item);
      });
      galleryFromDb = next;
      galleryDbReady = true;
      renderGallery();
    }).catch(function () { /* Tabelle fehlt oder ist nicht erreichbar: statische Bilder bleiben. */ });
  }

  function setGalleryStatus(message) {
    const el = document.getElementById("gallery-status");
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function setGalleryBusy(busy) {
    galleryBusy = busy;
    const form = document.getElementById("gallery-upload-form");
    const input = document.getElementById("gallery-file");
    const caption = document.getElementById("gallery-caption");
    if (form) form.classList.toggle("is-busy", busy);
    if (input) input.disabled = busy;
    if (caption) caption.readOnly = busy;
  }

  function galleryCaptionValue() {
    const input = document.getElementById("gallery-caption");
    if (!input) return null;
    const value = input.value.trim();
    if (!value) return null;
    return value.slice(0, 200);
  }

  function galleryError(code) {
    const err = new Error(code);
    err.code = code;
    return err;
  }

  function galleryErrorMessage(code) {
    if (code === "type") return "Nur JPEG, PNG, WebP oder GIF sind erlaubt.";
    if (code === "decode") return "Dieses Bild konnte nicht gelesen werden.";
    if (code === "size") return "Das Bild ist größer als 10 MB und ließ sich nicht genug verkleinern.";
    if (code === "auth") return "Nur Offiziere und Administratoren dürfen die Galerie ändern.";
    if (code === "missing") return "Die Galerie ist noch nicht eingerichtet.";
    if (code === "row") return "Das Bild konnte nicht in der Galerie gespeichert werden.";
    return "Das Bild konnte nicht hochgeladen werden.";
  }

  function galleryFailureCode(error, fallback) {
    if (!error) return fallback;
    const code = String(error.code || "");
    const message = String(error.message || error.error || "").toLowerCase();
    const status = Number(error.status || error.statusCode || 0);
    if (
      code === "PGRST205" ||
      code === "42P01" ||
      code === "PGRST204" ||
      message.indexOf("bucket not found") !== -1 ||
      (message.indexOf("gallery_images") !== -1 && (message.indexOf("schema cache") !== -1 || message.indexOf("does not exist") !== -1 || message.indexOf("could not find") !== -1))
    ) {
      return "missing";
    }
    if (status === 413 || message.indexOf("payload too large") !== -1 || message.indexOf("file size") !== -1 || message.indexOf("exceeded") !== -1) {
      return "size";
    }
    if (message.indexOf("mime") !== -1) return "type";
    if (status === 401 || status === 403 || code === "42501" || message.indexOf("row-level security") !== -1 || message.indexOf("permission") !== -1 || message.indexOf("not allowed") !== -1) {
      return "auth";
    }
    return fallback;
  }

  function galleryStorageMissing(error) {
    if (!error) return false;
    const status = Number(error.status || error.statusCode || 0);
    const message = String(error.message || "").toLowerCase();
    return status === 404 || message.indexOf("not found") !== -1;
  }

  function galleryTypeOf(file) {
    if (!file) return "";
    const mime = String(file.type || "").toLowerCase();
    if (mime === "image/jpg" || mime === "image/jpeg" || mime === "image/pjpeg") return "image/jpeg";
    if (mime === "image/png" || mime === "image/webp" || mime === "image/gif") return mime;
    if (mime) return "";
    const name = String(file.name || "").toLowerCase();
    if (/\.jpe?g$/.test(name)) return "image/jpeg";
    if (/\.png$/.test(name)) return "image/png";
    if (/\.webp$/.test(name)) return "image/webp";
    if (/\.gif$/.test(name)) return "image/gif";
    return "";
  }

  function galleryExt(type) {
    if (type === "image/png") return "png";
    if (type === "image/webp") return "webp";
    if (type === "image/gif") return "gif";
    return "jpg";
  }

  function canvasSupportsWebp() {
    if (galleryWebp !== null) return galleryWebp;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      galleryWebp = canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
    } catch (err) {
      galleryWebp = false;
    }
    return galleryWebp;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) { resolve(blob || null); }, type, quality);
      } catch (err) {
        reject(galleryError("decode"));
      }
    });
  }

  function decodeGalleryImageElement(file) {
    return new Promise(function (resolve, reject) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(galleryError("decode"));
      };
      img.src = url;
    });
  }

  function decodeGalleryImage(file) {
    if (typeof createImageBitmap === "function") {
      return Promise.resolve().then(function () {
        return createImageBitmap(file, { imageOrientation: "from-image" });
      }).catch(function () {
        return decodeGalleryImageElement(file);
      });
    }
    return decodeGalleryImageElement(file);
  }

  function closeDecodedImage(image) {
    if (image && typeof image.close === "function") {
      try { image.close(); } catch (err) { /* Bitmap ist bereits geschlossen. */ }
    }
  }

  function blobAsFile(blob, mime) {
    const type = blob.type === "image/webp" || mime === "image/webp" ? "image/webp" : "image/jpeg";
    return new File([blob], "bild." + galleryExt(type), { type: type });
  }

  function encodeScaledGallery(image, width, height) {
    const scale = width > GALLERY_MAX_WIDTH ? GALLERY_MAX_WIDTH / width : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    if (targetWidth * targetHeight > 4096 * 4096) return Promise.reject(galleryError("size"));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.reject(galleryError("decode"));
    ctx.fillStyle = "#10080c";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    const first = canvasSupportsWebp() ? "image/webp" : "image/jpeg";
    const qualities = [0.86, 0.72, 0.58, 0.44];

    function attempt(kind, index) {
      if (index >= qualities.length) {
        if (kind === "image/webp") return attempt("image/jpeg", 0);
        return Promise.reject(galleryError("size"));
      }
      return canvasToBlob(canvas, kind, qualities[index]).then(function (blob) {
        if (!blob || (blob.type && blob.type !== kind) || blob.size > GALLERY_MAX_BYTES) {
          return attempt(kind, index + 1);
        }
        return blobAsFile(blob, kind);
      });
    }

    return attempt(first, 0);
  }

  function prepareGalleryFile(file) {
    const type = galleryTypeOf(file);
    if (!type) return Promise.reject(galleryError("type"));
    if (file.size > 40 * 1024 * 1024) return Promise.reject(galleryError("size"));
    return decodeGalleryImage(file).then(function (image) {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) {
        closeDecodedImage(image);
        return Promise.reject(galleryError("decode"));
      }
      if (width <= GALLERY_MAX_WIDTH && file.size <= GALLERY_MAX_BYTES) {
        closeDecodedImage(image);
        if (file.type === type) return file;
        return new File([file], "bild." + galleryExt(type), { type: type });
      }
      return encodeScaledGallery(image, width, height).then(function (out) {
        closeDecodedImage(image);
        return out;
      }, function (err) {
        closeDecodedImage(image);
        throw err;
      });
    });
  }

  function newGalleryObjectPath(type) {
    let id = "";
    if (window.crypto && typeof crypto.randomUUID === "function") id = crypto.randomUUID();
    else id = Date.now().toString(16) + Math.random().toString(16).slice(2);
    return id + "." + galleryExt(type);
  }

  function sendGalleryFile(file, caption) {
    const objectPath = newGalleryObjectPath(file.type);
    return remote.storage.from("gallery").upload(objectPath, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    }).then(function (uploaded) {
      if (!uploaded || uploaded.error) throw galleryError(galleryFailureCode(uploaded && uploaded.error, "storage"));
      const pub = remote.storage.from("gallery").getPublicUrl(objectPath);
      const url = pub && pub.data ? pub.data.publicUrl : "";
      if (!isGalleryPublicUrl(url, objectPath)) {
        return remote.storage.from("gallery").remove([objectPath]).then(function () {
          throw galleryError("storage");
        });
      }
      const row = { path: objectPath, url: url, caption: caption };
      if (currentUser && currentUser.id) row.uploaded_by = currentUser.id;
      return remote.from("gallery_images").insert(row).select("id").single().then(function (inserted) {
        if (!inserted || inserted.error || !inserted.data) {
          return remote.storage.from("gallery").remove([objectPath]).then(function () {
            throw galleryError(galleryFailureCode(inserted && inserted.error, "row"));
          });
        }
      });
    });
  }

  function uploadGalleryFiles(list) {
    if (galleryBusy) return;
    if (!isOfficer()) {
      notify("Nur Offiziere und Administratoren dürfen Bilder hochladen.", "error");
      return;
    }
    if (!remote || !remoteReady) {
      notify("Hochladen ist gerade nicht möglich.", "error");
      return;
    }
    const files = Array.prototype.slice.call(list || []);
    if (!files.length) return;
    let skipped = 0;
    if (files.length > GALLERY_BATCH) {
      skipped = files.length - GALLERY_BATCH;
      files.length = GALLERY_BATCH;
    }
    const caption = galleryCaptionValue();
    setGalleryBusy(true);
    let ok = 0;
    let failed = 0;
    let reason = "";
    let index = 0;

    function finish() {
      setGalleryBusy(false);
      setGalleryStatus("");
      const limitNote = skipped ? " Es werden höchstens " + GALLERY_BATCH + " Bilder auf einmal hochgeladen." : "";
      if (ok && !failed) {
        const input = document.getElementById("gallery-caption");
        if (input) input.value = "";
        notify((ok === 1 ? "Bild hochgeladen." : ok + " Bilder hochgeladen.") + limitNote, "info");
        loadGallery();
        return;
      }
      if (ok) {
        notify(ok + " von " + (ok + failed) + " Bildern hochgeladen." + (reason ? " " + reason : "") + limitNote, "error");
        loadGallery();
        return;
      }
      notify((reason || "Kein Bild konnte hochgeladen werden.") + limitNote, "error");
    }

    function next() {
      if (index >= files.length) {
        finish();
        return;
      }
      const file = files[index];
      const position = index + 1;
      index += 1;
      setGalleryStatus("Bild " + position + " von " + files.length + " wird vorbereitet…");
      prepareGalleryFile(file).then(function (prepared) {
        setGalleryStatus("Bild " + position + " von " + files.length + " wird hochgeladen…");
        return sendGalleryFile(prepared, caption);
      }).then(function () {
        ok += 1;
        next();
      }).catch(function (err) {
        failed += 1;
        if (!reason) reason = galleryErrorMessage(err && err.code);
        next();
      });
    }

    next();
  }

  function deleteGalleryImage(id, objectPath) {
    if (galleryBusy) {
      notify("Bitte warten, bis der Upload fertig ist.", "error");
      return;
    }
    if (!isOfficer()) {
      notify("Nur Offiziere und Administratoren dürfen Bilder löschen.", "error");
      return;
    }
    if (!remote || !remoteReady) {
      notify("Löschen ist gerade nicht möglich.", "error");
      return;
    }
    if (!isGalleryId(id) || !isGalleryObjectPath(objectPath)) {
      notify("Dieses Bild kann hier nicht gelöscht werden.", "error");
      return;
    }
    if (!window.confirm("Dieses Bild wirklich aus der Galerie löschen?")) return;
    setGalleryBusy(true);
    setGalleryStatus("Bild wird gelöscht…");
    remote.storage.from("gallery").remove([objectPath]).then(function (removed) {
      if (removed && removed.error && !galleryStorageMissing(removed.error)) {
        throw galleryError(galleryFailureCode(removed.error, "storage"));
      }
      return remote.from("gallery_images").delete().eq("id", id);
    }).then(function (deleted) {
      if (!deleted || deleted.error) throw galleryError(galleryFailureCode(deleted && deleted.error, "row"));
      galleryFromDb = galleryFromDb.filter(function (item) { return item.id !== id; });
      if (lightboxOpen()) closeLightbox();
      renderGallery();
      notify("Bild gelöscht.", "info");
      loadGallery();
    }).catch(function (err) {
      notify(err && err.code === "missing" ? galleryErrorMessage("missing") : "Das Bild konnte nicht gelöscht werden.", "error");
    }).then(function () {
      setGalleryBusy(false);
      setGalleryStatus("");
    });
  }

  function lightboxOpen() {
    const box = document.getElementById("lightbox");
    return !!(box && !box.hidden);
  }

  function showLightbox(index) {
    if (!gallery.length) return;
    galleryIndex = (index + gallery.length) % gallery.length;
    const item = gallery[galleryIndex];
    const img = document.getElementById("lightbox-image");
    const caption = document.getElementById("lightbox-caption");
    img.src = item.src;
    img.alt = item.alt;
    caption.textContent = item.alt + " (" + (galleryIndex + 1) + " von " + gallery.length + ")";
    const single = gallery.length < 2;
    document.getElementById("lightbox-prev").hidden = single;
    document.getElementById("lightbox-next").hidden = single;
  }

  function openLightbox(index) {
    if (!gallery.length || openModalEl()) return;
    if (!Number.isFinite(index)) return;
    lastFocus = document.activeElement;
    showLightbox(index);
    document.getElementById("lightbox").hidden = false;
    document.body.classList.add("modal-open");
    setInert(true);
    const closeBtn = document.getElementById("lightbox-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    const box = document.getElementById("lightbox");
    if (!box || box.hidden) return;
    box.hidden = true;
    const img = document.getElementById("lightbox-image");
    if (img) img.removeAttribute("src");
    if (!openModalEl()) {
      document.body.classList.remove("modal-open");
      setInert(false);
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
  }

  function bindLightboxTouch() {
    const dialog = document.querySelector(".lightbox-dialog");
    if (!dialog) return;
    let startX = 0;
    dialog.addEventListener("touchstart", function (event) {
      if (!event.changedTouches || !event.changedTouches.length) return;
      startX = event.changedTouches[0].clientX;
    }, { passive: true });
    dialog.addEventListener("touchend", function (event) {
      if (!lightboxOpen() || gallery.length < 2 || !event.changedTouches || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 48) return;
      showLightbox(galleryIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  function youtubeChannel() {
    const url = arcConfig().youtubeChannelUrl;
    if (typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") return "";
      const host = parsed.hostname.replace(/^www\./, "");
      if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtu.be") return "";
      return trimmed;
    } catch (err) {
      return "";
    }
  }

  function youtubeVideos() {
    const ids = arcConfig().youtubeVideoIds;
    if (!Array.isArray(ids)) return [];
    const seen = {};
    const list = [];
    ids.forEach(function (id) {
      if (typeof id !== "string") return;
      const clean = id.trim();
      if (!/^[a-zA-Z0-9_-]{11}$/.test(clean) || seen[clean]) return;
      seen[clean] = true;
      list.push(clean);
    });
    return list;
  }

  function renderVideos() {
    const section = document.getElementById("videos");
    if (!section) return;
    const channel = youtubeChannel();
    const videos = youtubeVideos();
    if (!channel && !videos.length) {
      section.hidden = true;
      return;
    }
    const lead = document.getElementById("videos-lead");
    const channelLink = document.getElementById("videos-channel");
    const grid = document.getElementById("video-grid");
    if (lead) {
      lead.textContent = videos.length
        ? "Clips von Malusmagnus. Das Video lädt erst nach einem Klick."
        : "Zum Kanal von Malusmagnus. Einzelne Videos lassen sich in der Konfiguration eintragen.";
    }
    if (channelLink) {
      if (channel) {
        channelLink.hidden = false;
        channelLink.href = channel;
        channelLink.target = "_blank";
        channelLink.rel = "noopener noreferrer";
      } else {
        channelLink.hidden = true;
      }
    }
    if (grid) {
      grid.replaceChildren();
      videos.forEach(function (id, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "yt-facade";
        button.dataset.action = "play-video";
        button.dataset.videoId = id;
        button.setAttribute("aria-label", "Video " + (index + 1) + " abspielen");
        const img = document.createElement("img");
        img.src = "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg";
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        const play = document.createElement("span");
        play.className = "yt-play";
        play.setAttribute("aria-hidden", "true");
        play.innerHTML = '<i class="fa-solid fa-play"></i>';
        button.append(img, play);
        grid.appendChild(button);
      });
    }
    section.hidden = false;
    refreshReveal(section);
  }

  function playVideo(button) {
    const id = button && button.dataset ? button.dataset.videoId : "";
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id || "")) return;
    const iframe = document.createElement("iframe");
    iframe.className = "yt-frame";
    iframe.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0";
    iframe.title = button.getAttribute("aria-label") || "YouTube-Video";
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
    iframe.setAttribute("allowfullscreen", "");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    button.replaceWith(iframe);
  }

  function startEmbers() {
    const canvas = document.getElementById("ember-canvas");
    if (!canvas || prefersReducedMotion()) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const host = canvas.parentElement || canvas;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let particles = [];
    let frameId = 0;
    let running = false;
    const count = Math.min(36, Math.max(16, Math.round((window.innerWidth || 800) / 42)));

    function resize() {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function make(fromBottom) {
      const purple = Math.random() < 0.14;
      return {
        x: Math.random() * width,
        y: fromBottom ? height + 8 : Math.random() * height,
        r: purple ? 0.7 + Math.random() * 1.1 : 0.45 + Math.random() * 1.7,
        vy: 0.2 + Math.random() * 0.6,
        vx: -0.16 + Math.random() * 0.32,
        a: 0.18 + Math.random() * 0.5,
        purple: purple,
        wobble: Math.random() * Math.PI * 2,
      };
    }

    function tick() {
      if (!running) return;
      frameId = window.requestAnimationFrame(tick);
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      if (particles.length < count) particles.push(make(false));
      for (let i = 0; i < particles.length; i += 1) {
        const spark = particles[i];
        spark.wobble += 0.02;
        spark.y -= spark.vy;
        spark.x += spark.vx + Math.sin(spark.wobble) * 0.12;
        if (spark.y < -8 || spark.x < -12 || spark.x > width + 12) {
          particles[i] = make(true);
          continue;
        }
        ctx.globalAlpha = spark.a;
        ctx.fillStyle = spark.purple ? "#c9a6ff" : (spark.r > 1.5 ? "#ffb15a" : "#ff6a1a");
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function setRunning(on) {
      if (on && !running && !media.matches) {
        running = true;
        frameId = window.requestAnimationFrame(tick);
        return;
      }
      if (!on && running) {
        running = false;
        window.cancelAnimationFrame(frameId);
      }
    }

    resize();
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(resize);
      observer.observe(host);
    } else {
      window.addEventListener("resize", resize);
    }
    const hero = document.getElementById("start");
    if ("IntersectionObserver" in window && hero) {
      const observer = new IntersectionObserver(function (entries) {
        setRunning(entries[0].isIntersecting && !document.hidden);
      });
      observer.observe(hero);
    } else {
      setRunning(true);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) setRunning(false);
    });
  }

  function requireRemote() {
    if (remote && remoteReady) return true;
    notify(SAVE_FAIL, "error");
    return false;
  }

  function replaceItems(target, next) {
    target.length = 0;
    next.forEach(function (item) { target.push(item); });
  }

  function nextSort(list) {
    return list.reduce(function (max, item) {
      return Math.max(max, Number(item.sortOrder) || 0);
    }, 0) + 1;
  }

  function canEditGroup(group) {
    return !!(isApproved() && currentUser && group && group.createdBy && group.createdBy === currentUser.id);
  }

  function canDeleteGroup(group) {
    return canEditGroup(group) || isOfficer();
  }

  function renderGuild() {
    renderMembers("retail");
    renderMembers("forever");
    renderRaidKader("retail");
    renderRaidKader("forever");
    renderMPlusGroups();
    renderClassicRuns();
    renderChat();
    renderLeadership();
    loadGuildInfoView();
    renderDkp();
  }

  function renderPermissionSurfaces() {
    renderMembers("retail");
    renderMembers("forever");
    renderRaidKader("retail");
    renderRaidKader("forever");
    renderMPlusGroups();
    renderClassicRuns();
    renderChat();
    renderLeadership();
    renderGallery();
    renderForeverPoll();
    renderServerPoll();
    renderDkp();
    renderRaids();
    renderLoot();
  }

  function renderLeadership() {
    const list = document.getElementById("leadership-list");
    if (!list) return;
    list.replaceChildren();
    const people = leadership.filter(function (person) { return person && typeof person.name === "string"; });
    if (!people.length) {
      const empty = document.createElement("li");
      empty.className = "col-span-full py-8 text-center italic text-slate-500";
      empty.textContent = "Noch niemand in der Gildenleitung eingetragen.";
      list.appendChild(empty);
      return;
    }
    people.forEach(function (person) {
      const amber = person.accent === "amber";
      const card = document.createElement("li");
      card.className = "flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm";
      const iconWrap = document.createElement("div");
      iconWrap.className = amber
        ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-xl font-bold text-amber-400"
        : "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/20 text-xl font-bold text-red-400";
      iconWrap.setAttribute("aria-hidden", "true");
      iconWrap.innerHTML = amber
        ? '<i class="fa-solid fa-crown"></i>'
        : '<i class="fa-solid fa-shield-halved"></i>';
      const body = document.createElement("div");
      body.className = "min-w-0 flex-1";
      const name = document.createElement("p");
      name.className = "text-base font-bold text-white";
      name.textContent = person.name;
      const subtitle = document.createElement("p");
      subtitle.className = amber ? "text-xs font-semibold text-amber-400" : "text-xs font-semibold text-red-400";
      subtitle.textContent = person.subtitle || "";
      body.append(name, subtitle);
      card.append(iconWrap, body);
      if (isOfficer() && person.id) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.dataset.action = "open-leadership-modal";
        edit.dataset.id = person.id;
        edit.className = "inline-flex min-h-11 min-w-11 items-center justify-center text-slate-500 hover:text-white";
        edit.setAttribute("aria-label", person.name + " bearbeiten");
        edit.innerHTML = '<i class="fa-solid fa-pen" aria-hidden="true"></i>';
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove-leadership";
        remove.dataset.id = person.id;
        remove.className = "inline-flex min-h-11 min-w-11 items-center justify-center text-slate-500 hover:text-red-500";
        remove.setAttribute("aria-label", person.name + " aus der Leitung entfernen");
        remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
        card.append(edit, remove);
      }
      list.appendChild(card);
    });
  }

  function openLeadershipModal(id) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Gildenleitung bearbeiten.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    const form = document.getElementById("leadership-form");
    form.reset();
    const person = leadership.find(function (item) { return item.id === id; });
    document.getElementById("leadership-id").value = person ? person.id : "";
    document.getElementById("leadership-name").value = person ? person.name : "";
    document.getElementById("leadership-subtitle").value = person ? person.subtitle : "";
    document.getElementById("leadership-accent").value = person && person.accent === "amber" ? "amber" : "red";
    document.getElementById("leadership-modal-label").textContent = person ? "Leitung bearbeiten" : "Zur Leitung hinzufügen";
    leadershipPickQuery = "";
    const search = document.getElementById("leadership-pick-search");
    if (search) search.value = "";
    loadApprovedProfiles(true);
    renderLeadershipPicker();
    openModal("leadership-modal");
  }

  function saveLeadership(form) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Gildenleitung bearbeiten.", "error");
      return;
    }
    if (!requireRemote()) return;
    const id = document.getElementById("leadership-id").value;
    const payload = {
      name: document.getElementById("leadership-name").value.trim(),
      subtitle: document.getElementById("leadership-subtitle").value.trim(),
      accent: document.getElementById("leadership-accent").value === "amber" ? "amber" : "red",
    };
    if (!payload.name || !payload.subtitle) {
      notify("Bitte Name und Rolle ausfüllen.", "error");
      return;
    }
    const request = id
      ? remote.from("leadership").update(payload).eq("id", id).select("id, name, subtitle, accent, sort_order").single()
      : remote.from("leadership").insert(Object.assign({ sort_order: nextSort(leadership) }, payload)).select("id, name, subtitle, accent, sort_order").single();
    request.then(function (result) {
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      const mapped = mapLeader(result.data);
      const index = leadership.findIndex(function (item) { return item.id === mapped.id; });
      if (index >= 0) leadership[index] = mapped;
      else leadership.push(mapped);
      renderLeadership();
      closeModal("leadership-modal");
      form.reset();
    });
  }

  function removeLeadership(id) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Gildenleitung bearbeiten.", "error");
      return;
    }
    if (!requireRemote() || !id) return;
    remote.from("leadership").delete().eq("id", id).then(function (result) {
      if (result.error) {
        notify(SAVE_FAIL, "error");
        return;
      }
      const index = leadership.findIndex(function (item) { return item.id === id; });
      if (index >= 0) leadership.splice(index, 1);
      renderLeadership();
    });
  }

  function profileGameValue(game) {
    if (game === "forever" || game === "retail" || game === "both") return game;
    return "";
  }

  function gameLabel(game) {
    if (game === "forever") return "Forever";
    if (game === "retail") return "Retail";
    if (game === "both") return "Beides";
    return "";
  }

  function profileMatchesGame(profile) {
    const game = profileGameValue(profile && profile.game);
    if (profileGameFilter === "none") return !game;
    if (profileGameFilter === "forever") return game === "forever" || game === "both";
    if (profileGameFilter === "retail") return game === "retail" || game === "both";
    return true;
  }

  function profileGameError(error) {
    const msg = String((error && error.message) || "").replace(/^\s*ERROR:\s*/i, "").trim();
    if (!msg || /failed to fetch|network|jwt|permission denied|PGRST|schema cache/i.test(msg)) {
      return "Das Spiel konnte nicht gespeichert werden.";
    }
    return msg;
  }

  function syncProfileGameFilter() {
    document.querySelectorAll("[data-action='filter-profile-game']").forEach(function (button) {
      const on = button.dataset.game === profileGameFilter;
      button.className = on
        ? "inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-sm font-extrabold text-slate-950"
        : "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-slate-700";
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function gameBadge(game) {
    const text = gameLabel(profileGameValue(game));
    if (!text) return null;
    const badge = document.createElement("span");
    const tone = game === "retail"
      ? "border-red-900/60 text-red-300"
      : "border-amber-500/40 text-amber-300";
    badge.className = "shrink-0 rounded-full border px-2 py-0.5 text-xs font-bold " + tone;
    badge.textContent = text;
    return badge;
  }

  function renderProfileDirectory() {
    const list = document.getElementById("roles-list");
    if (!list) return;
    syncProfileGameFilter();
    list.replaceChildren();
    const rows = profileDirectory.filter(profileMatchesGame);
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-400";
      empty.textContent = profileDirectory.length ? "Keine Konten für diesen Filter." : "Noch keine Konten.";
      list.appendChild(empty);
      return;
    }
    const admin = isAdmin();
    rows.forEach(function (profile) {
      const row = document.createElement("div");
      row.className = "flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between";
      const label = document.createElement("div");
      label.className = "min-w-0";
      const nameRow = document.createElement("div");
      nameRow.className = "flex min-w-0 flex-wrap items-center gap-2";
      const name = document.createElement("p");
      name.className = "truncate text-sm font-bold text-white";
      name.textContent = profile.display_name || "Mitglied";
      nameRow.appendChild(name);
      const badge = gameBadge(profile.game);
      if (badge) nameRow.appendChild(badge);
      const email = document.createElement("p");
      email.className = "truncate text-xs text-slate-400";
      email.textContent = currentUser && profile.id === currentUser.id ? "Das bist du" : (profile.email || "");
      label.append(nameRow, email);
      const controls = document.createElement("div");
      controls.className = "flex w-full flex-col gap-2 sm:max-w-xs";
      const gameField = document.createElement("label");
      gameField.className = "block text-xs font-semibold text-slate-400";
      gameField.textContent = "Spiel";
      const gameSelect = document.createElement("select");
      gameSelect.className = "mt-1 min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-amber-500";
      gameSelect.dataset.action = "set-game";
      gameSelect.dataset.userId = profile.id;
      gameSelect.setAttribute("aria-label", "Spiel von " + (profile.display_name || "Mitglied"));
      if (profileGameSaving[profile.id]) gameSelect.disabled = true;
      [
        ["", "– nicht zugeordnet –"],
        ["forever", "Forever"],
        ["retail", "Retail"],
        ["both", "Beides"],
      ].forEach(function (pair) {
        const option = document.createElement("option");
        option.value = pair[0];
        option.textContent = pair[1];
        if (profileGameValue(profile.game) === pair[0]) option.selected = true;
        gameSelect.appendChild(option);
      });
      gameField.appendChild(gameSelect);
      controls.appendChild(gameField);
      if (admin && currentUser && profile.id !== currentUser.id) {
        const roleSelect = document.createElement("select");
        roleSelect.className = "min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-amber-500";
        roleSelect.dataset.action = "set-role";
        roleSelect.dataset.userId = profile.id;
        roleSelect.setAttribute("aria-label", "Rolle von " + (profile.display_name || "Mitglied"));
        ["member", "officer", "admin"].forEach(function (role) {
          const option = document.createElement("option");
          option.value = role;
          option.textContent = roleLabel(role);
          if (profile.role === role) option.selected = true;
          roleSelect.appendChild(option);
        });
        controls.appendChild(roleSelect);
      } else {
        const roleText = document.createElement("p");
        roleText.className = "text-xs font-semibold text-amber-400";
        roleText.textContent = roleLabel(profile.role);
        controls.appendChild(roleText);
      }
      row.append(label, controls);
      list.appendChild(row);
    });
  }

  function openRolesModal() {
    if (!isOfficer() || !remote || !remoteReady) {
      notify("Nur Offiziere dürfen das Spiel zuordnen.", "error");
      return;
    }
    const title = document.getElementById("roles-modal-label");
    const hint = document.getElementById("roles-modal-hint");
    if (title) title.textContent = isAdmin() ? "Rollen" : "Mitglieder";
    if (hint) {
      hint.textContent = isAdmin()
        ? "Nur Administratoren ändern Rollen. Die eigene Rolle bleibt unverändert. Das Spiel ordnen Offiziere und Administratoren zu."
        : "Du kannst das Spiel zuordnen. Rollen ändert nur ein Administrator.";
    }
    profileGameFilter = "all";
    remote.from("profiles").select("id, display_name, email, role, status, game").order("display_name").then(function (result) {
      if (result.error) {
        notify("Die Mitgliederliste konnte nicht geladen werden.", "error");
        return;
      }
      profileDirectory = result.data || [];
      renderProfileDirectory();
      openModal("roles-modal");
    });
  }

  function setProfileGame(userId, value, select) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen das Spiel zuordnen.", "error");
      return;
    }
    if (!userId || profileGameSaving[userId]) return;
    const game = profileGameValue(value);
    if (value && !game) return;
    const stored = profileDirectory.find(function (profile) { return profile.id === userId; });
    const previous = stored ? profileGameValue(stored.game) : "";
    if (game === previous) return;
    if (!requireRemote()) return;
    profileGameSaving[userId] = true;
    if (select) select.disabled = true;
    remote.from("profiles").update({ game: game || null }).eq("id", userId).select("id, game").then(function (result) {
      delete profileGameSaving[userId];
      const saved = result && result.data && result.data[0];
      if (!result || result.error || !saved) {
        notify(profileGameError(result && result.error), "error");
        if (select) {
          select.disabled = false;
          select.value = previous;
        }
        return;
      }
      if (stored) stored.game = saved.game;
      renderProfileDirectory();
      notify("Spiel gespeichert.", "info");
    }).catch(function () {
      delete profileGameSaving[userId];
      notify("Das Spiel konnte nicht gespeichert werden.", "error");
      if (select) {
        select.disabled = false;
        select.value = previous;
      }
    });
  }

  function setProfileRole(userId, role, select) {
    if (!isAdmin()) {
      notify("Nur Administratoren dürfen Rollen ändern.", "error");
      return;
    }
    if (!userId || userId === currentUser.id) {
      notify("Die eigene Rolle kann nicht geändert werden.", "error");
      return;
    }
    if (role !== "member" && role !== "officer" && role !== "admin") return;
    if (!requireRemote()) return;
    remote.from("profiles").update({ role: role }).eq("id", userId).then(function (result) {
      if (result.error) {
        notify("Die Rolle konnte nicht geändert werden.", "error");
        if (select) openRolesModal();
        return;
      }
      notify("Rolle gespeichert.", "info");
    });
  }

  function loadApprovals() {
    if (!remote || !approvalEnforced || !isOfficer()) return;
    remote.from("profiles")
      .select("id, display_name, status, role, created_at, game")
      .in("status", ["pending", "rejected"])
      .order("created_at", { ascending: true })
      .then(function (result) {
        if (result.error) {
          if (missingStatusColumn(result.error)) {
            approvalEnforced = false;
            updateAuthUI();
          }
          return;
        }
        const rows = (result.data || []).filter(function (profile) {
          return profile && profile.role !== "officer" && profile.role !== "admin";
        });
        renderApprovals(rows);
      }).catch(function () { /* Die Liste bleibt, wie sie ist. */ });
  }

  function renderApprovals(rows) {
    const pending = rows.filter(function (profile) { return profile.status === "pending"; });
    const rejected = rows.filter(function (profile) { return profile.status === "rejected"; });
    paintApprovalBadge(pending.length);
    fillApprovalList(document.getElementById("approval-pending"), pending, true);
    const wrap = document.getElementById("approval-rejected-wrap");
    if (wrap) wrap.hidden = rejected.length === 0;
    fillApprovalList(document.getElementById("approval-rejected"), rejected, false);
  }

  function paintApprovalBadge(count) {
    ["approval-count", "approval-header-count"].forEach(function (id) {
      const badge = document.getElementById(id);
      if (!badge) return;
      badge.textContent = String(count);
      badge.hidden = id === "approval-header-count" ? count < 1 : false;
    });
  }

  function fillApprovalList(container, rows, pending) {
    if (!container) return;
    container.replaceChildren();
    if (!rows.length) {
      if (!pending) return;
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-400";
      empty.textContent = "Keine offenen Freischaltungen.";
      container.appendChild(empty);
      return;
    }
    rows.forEach(function (profile) {
      const row = document.createElement("div");
      row.className = "flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between";
      const label = document.createElement("div");
      label.className = "min-w-0";
      const name = document.createElement("p");
      name.className = "truncate text-sm font-bold text-white";
      name.textContent = profile.display_name || "Mitglied";
      const when = document.createElement("p");
      when.className = "text-xs text-slate-400";
      when.textContent = formatRegistration(profile.created_at);
      label.append(name, when);
      const actions = document.createElement("div");
      actions.className = "flex flex-wrap gap-2";
      actions.appendChild(approvalButton(
        "approve-user",
        profile,
        "Freischalten",
        "inline-flex min-h-11 items-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-400"
      ));
      if (pending) {
        actions.appendChild(approvalButton(
          "reject-user",
          profile,
          "Ablehnen",
          "inline-flex min-h-11 items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
        ));
      }
      row.append(label, actions);
      container.appendChild(row);
    });
  }

  function approvalButton(action, profile, text, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.userId = profile.id;
    button.dataset.userName = profile.display_name || "Mitglied";
    button.className = className;
    button.textContent = text;
    return button;
  }

  function setProfileStatus(userId, status, name) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Konten freischalten.", "error");
      return;
    }
    if (!userId || (currentUser && userId === currentUser.id)) {
      notify("Den eigenen Status kannst du nicht ändern.", "error");
      return;
    }
    if (status !== "approved" && status !== "rejected") return;
    const label = name || "dieses Konto";
    const question = status === "approved"
      ? "„" + label + "“ wirklich freischalten?"
      : "„" + label + "“ wirklich ablehnen?";
    if (!window.confirm(question)) return;
    if (!requireRemote()) return;
    remote.from("profiles").update({ status: status }).eq("id", userId).then(function (result) {
      if (result.error) {
        notify(status === "approved" ? "Die Freischaltung ist nicht gelungen." : "Die Ablehnung ist nicht gelungen.", "error");
        return;
      }
      notify(status === "approved" ? "Konto freigeschaltet." : "Konto abgelehnt.", "info");
      loadApprovals();
    });
  }

  function formatRegistration(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function pollChoice(value, allowed) {
    const text = String(value || "").trim();
    if (!text) return "";
    return allowed.indexOf(text) >= 0 ? text : null;
  }

  function normalizePollRow(row) {
    if (!row || row.id == null) return null;
    const id = String(row.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    return {
      id: id,
      char_name: String(row.char_name || "").trim(),
      main_class: String(row.main_class || ""),
      main_role: row.main_role ? String(row.main_role) : "",
      twink_class: row.twink_class ? String(row.twink_class) : "",
      twink_role: row.twink_role ? String(row.twink_role) : "",
      race: row.race ? String(row.race) : "",
      comment: row.comment ? String(row.comment) : "",
    };
  }

  function pollClassRole(className, role) {
    if (!className) return "—";
    if (role) return className + " (" + role + ")";
    return className;
  }

  function pollTotalLabel(count) {
    if (count === 1) return "1 Antwort";
    if (count > 1) return count + " Antworten";
    return "Noch keine Antwort";
  }

  function showForeverPollStatus(message, kind, toast) {
    const el = document.getElementById("forever-poll-status");
    if (el) {
      if (!message) {
        el.hidden = true;
        el.textContent = "";
      } else {
        el.hidden = false;
        el.textContent = message;
        el.className = "text-sm " + (kind === "error" ? "text-red-400" : "text-emerald-400");
      }
    }
    if (toast && message) notify(message, kind === "error" ? "error" : "info");
  }

  function setPollField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  }

  function setForeverPollSubmitLabel(changing) {
    const label = document.getElementById("forever-poll-submit-label");
    if (label) label.textContent = changing ? "Antwort ändern" : "Antwort senden";
  }

  function applyForeverPollOwn(row) {
    const same = !!(foreverPollOwn && row && foreverPollOwn.id === row.id);
    foreverPollOwn = row;
    setForeverPollSubmitLabel(!!row);
    if (!row || same) return;
    setPollField("forever-poll-name", row.char_name);
    setPollField("forever-poll-main-class", row.main_class);
    setPollField("forever-poll-main-role", row.main_role);
    setPollField("forever-poll-twink-class", row.twink_class);
    setPollField("forever-poll-twink-role", row.twink_role);
    setPollField("forever-poll-race", row.race);
    setPollField("forever-poll-comment", row.comment);
  }

  function clearForeverPollOwn() {
    const had = !!foreverPollOwn;
    foreverPollOwn = null;
    setForeverPollSubmitLabel(false);
    if (!had) return;
    const form = document.getElementById("forever-poll-form");
    if (form) form.reset();
    showForeverPollStatus("", "");
  }

  function appendPollBars(container, labels, counts) {
    if (!container) return;
    container.replaceChildren();
    let max = 0;
    labels.forEach(function (label) {
      if (counts[label] > max) max = counts[label];
    });
    labels.forEach(function (label) {
      const count = counts[label] || 0;
      const row = document.createElement("div");
      const head = document.createElement("div");
      head.className = "mb-1 flex items-center justify-between gap-3 text-sm";
      const name = document.createElement("span");
      name.className = "text-slate-300";
      name.textContent = label;
      const num = document.createElement("span");
      num.className = "font-bold text-amber-400";
      num.textContent = String(count);
      head.append(name, num);
      const track = document.createElement("div");
      track.className = "h-3 overflow-hidden rounded-full bg-slate-800";
      const bar = document.createElement("div");
      bar.className = "h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500";
      const pct = max > 0 ? Math.round((count / max) * 100) : 0;
      bar.style.width = pct + "%";
      track.appendChild(bar);
      row.append(head, track);
      row.setAttribute("role", "img");
      row.setAttribute("aria-label", label + ": " + count);
      container.appendChild(row);
    });
  }

  function renderForeverPoll() {
    const total = document.getElementById("forever-poll-total");
    if (total) total.textContent = pollTotalLabel(foreverPollRows.length);
    const mainCounts = {};
    const twinkCounts = {};
    FOREVER_POLL_CLASSES.forEach(function (label) {
      mainCounts[label] = 0;
    });
    FOREVER_POLL_TWINK.forEach(function (label) {
      twinkCounts[label] = 0;
    });
    foreverPollRows.forEach(function (row) {
      if (Object.prototype.hasOwnProperty.call(mainCounts, row.main_class)) mainCounts[row.main_class] += 1;
      if (row.twink_class && Object.prototype.hasOwnProperty.call(twinkCounts, row.twink_class)) twinkCounts[row.twink_class] += 1;
    });
    appendPollBars(document.getElementById("forever-poll-main-bars"), FOREVER_POLL_CLASSES, mainCounts);
    appendPollBars(document.getElementById("forever-poll-twink-bars"), FOREVER_POLL_TWINK, twinkCounts);

    const list = document.getElementById("forever-poll-list");
    if (!list) return;
    list.replaceChildren();
    if (!foreverPollRows.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500";
      empty.textContent = "Noch keine Antwort.";
      list.appendChild(empty);
      return;
    }
    const wrap = document.createElement("div");
    wrap.className = "overflow-x-auto";
    const table = document.createElement("table");
    table.className = "w-full border-collapse text-left text-sm text-slate-300";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headRow.className = "border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500";
    ["Name", "Main", "Twink", "Rasse", "Kommentar"].forEach(function (title) {
      const th = document.createElement("th");
      th.className = "px-2 py-2 font-semibold";
      th.scope = "col";
      th.textContent = title;
      headRow.appendChild(th);
    });
    const actionTh = document.createElement("th");
    actionTh.className = "px-2 py-2 font-semibold";
    actionTh.scope = "col";
    actionTh.dataset.perm = "officer";
    actionTh.hidden = !isOfficer();
    const actionLabel = document.createElement("span");
    actionLabel.className = "sr-only";
    actionLabel.textContent = "Löschen";
    actionTh.appendChild(actionLabel);
    headRow.appendChild(actionTh);
    thead.appendChild(headRow);
    const tbody = document.createElement("tbody");
    foreverPollRows.forEach(function (row) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-800";
      [row.char_name, pollClassRole(row.main_class, row.main_role), pollClassRole(row.twink_class, row.twink_role), row.race || "—", row.comment || "—"].forEach(function (value) {
        const td = document.createElement("td");
        td.className = "break-words px-2 py-2";
        td.textContent = value;
        tr.appendChild(td);
      });
      const action = document.createElement("td");
      action.className = "px-2 py-2";
      action.dataset.perm = "officer";
      action.hidden = !isOfficer();
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "delete-forever-poll";
      remove.dataset.id = row.id;
      remove.dataset.perm = "officer";
      remove.hidden = !isOfficer();
      remove.className = "inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-red-400 hover:text-white";
      remove.textContent = "Löschen";
      remove.setAttribute("aria-label", "Eintrag löschen: " + row.char_name);
      action.appendChild(remove);
      tr.appendChild(action);
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
    wrap.appendChild(table);
    list.appendChild(wrap);
  }

  function foreverPollErrorText(error) {
    const msg = String((error && error.message) || "").replace(/^ERROR:\s*/i, "").trim();
    if (!msg || /failed to fetch|network|jwt|schema cache|permission denied|PGRST/i.test(msg)) {
      return "Die Antwort konnte nicht gespeichert werden.";
    }
    return msg;
  }

  function loadForeverPoll() {
    if (!remote || typeof remote.from !== "function") return Promise.resolve();
    let request;
    try {
      request = remote.from("forever_poll").select(FOREVER_POLL_COLUMNS).order("created_at", { ascending: true });
    } catch (err) {
      return Promise.resolve();
    }
    return Promise.resolve(request).then(function (result) {
      if (!result || result.error) {
        showForeverPollStatus("Die Antworten konnten nicht geladen werden.", "error", false);
        renderDkpImport();
        return;
      }
      foreverPollReadable = true;
      foreverPollRows = (result.data || []).map(normalizePollRow).filter(Boolean);
      renderForeverPoll();
      renderDkpImport();
    }).catch(function () {
      showForeverPollStatus("Die Antworten konnten nicht geladen werden.", "error", false);
      renderDkpImport();
    });
  }

  function loadMyForeverPoll() {
    if (!remote || !currentUser || typeof remote.rpc !== "function") return Promise.resolve();
    return remote.rpc("my_forever_poll").then(function (result) {
      if (!currentUser || !result || result.error) return;
      const rows = Array.isArray(result.data) ? result.data : [];
      const own = rows.length ? normalizePollRow(rows[0]) : null;
      if (own) applyForeverPollOwn(own);
      else {
        foreverPollOwn = null;
        setForeverPollSubmitLabel(false);
      }
    }).catch(function () { /* Ohne eigenen Eintrag bleibt das Formular leer. */ });
  }

  function submitForeverPoll(form) {
    if (foreverPollSending) return;
    const honeypot = document.getElementById("forever-poll-website");
    if (honeypot && honeypot.value.trim()) return;
    if (!remote || typeof remote.rpc !== "function") {
      showForeverPollStatus("Die Umfrage ist gerade nicht erreichbar.", "error", true);
      return;
    }
    const name = fieldValue("forever-poll-name").trim();
    const mainClass = pollChoice(fieldValue("forever-poll-main-class"), FOREVER_POLL_CLASSES);
    const mainRole = pollChoice(fieldValue("forever-poll-main-role"), FOREVER_POLL_ROLES);
    const twinkClass = pollChoice(fieldValue("forever-poll-twink-class"), FOREVER_POLL_TWINK);
    const twinkRole = pollChoice(fieldValue("forever-poll-twink-role"), FOREVER_POLL_ROLES);
    const race = pollChoice(fieldValue("forever-poll-race"), FOREVER_POLL_RACES);
    const comment = fieldValue("forever-poll-comment").trim();
    if (name.length < 2 || name.length > 40) {
      showForeverPollStatus("Bitte einen Namen mit 2 bis 40 Zeichen eingeben.", "error", true);
      return;
    }
    if (!mainClass || mainRole === null || twinkClass === null || twinkRole === null || race === null) {
      showForeverPollStatus("Bitte Klasse, Rolle und Rasse aus der Liste wählen.", "error", true);
      return;
    }
    if (comment.length > 300) {
      showForeverPollStatus("Der Kommentar ist zu lang (höchstens 300 Zeichen).", "error", true);
      return;
    }
    const button = document.getElementById("forever-poll-submit");
    const changing = !!(currentUser && foreverPollOwn);
    foreverPollSending = true;
    if (button) button.disabled = true;
    remote.rpc("submit_forever_poll", {
      p_char_name: name,
      p_main_class: mainClass,
      p_main_role: mainRole,
      p_twink_class: twinkClass,
      p_twink_role: twinkRole,
      p_race: race,
      p_comment: comment,
    }).then(function (result) {
      if (!result || result.error) {
        showForeverPollStatus(foreverPollErrorText(result && result.error), "error", true);
        return;
      }
      const saved = Array.isArray(result.data) ? result.data : [];
      const row = saved.length ? normalizePollRow(saved[0]) : null;
      if (currentUser && row) applyForeverPollOwn(row);
      else setForeverPollSubmitLabel(false);
      showForeverPollStatus(changing ? "Deine Antwort wurde geändert." : "Danke. Deine Antwort ist gespeichert.", "info", true);
      return loadForeverPoll();
    }).catch(function () {
      showForeverPollStatus("Die Antwort konnte nicht gespeichert werden.", "error", true);
    }).then(function () {
      foreverPollSending = false;
      if (button) button.disabled = false;
    });
  }

  function deleteForeverPoll(id) {
    if (!isOfficer()) {
      showForeverPollStatus("Nur Offiziere und Administratoren dürfen Einträge löschen.", "error", true);
      return;
    }
    if (!remote || typeof remote.from !== "function") {
      showForeverPollStatus("Löschen ist gerade nicht möglich.", "error", true);
      return;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) return;
    const row = foreverPollRows.filter(function (item) { return item.id === id; })[0];
    const who = row ? row.char_name : "diesen Eintrag";
    if (!window.confirm("Den Eintrag von „" + who + "“ wirklich löschen?")) return;
    remote.from("forever_poll").delete().eq("id", id).then(function (result) {
      if (!result || result.error) {
        showForeverPollStatus("Der Eintrag konnte nicht gelöscht werden.", "error", true);
        return null;
      }
      return loadForeverPoll();
    }).then(function (loaded) {
      if (loaded === null) return;
      const still = foreverPollRows.some(function (item) { return item.id === id; });
      if (still) {
        showForeverPollStatus("Der Eintrag konnte nicht gelöscht werden.", "error", true);
        return;
      }
      if (foreverPollOwn && foreverPollOwn.id === id) clearForeverPollOwn();
      showForeverPollStatus("Eintrag gelöscht.", "info", true);
    }).catch(function () {
      showForeverPollStatus("Der Eintrag konnte nicht gelöscht werden.", "error", true);
    });
  }

  function serverPollCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n);
  }

  function serverPollTotalLabel(count) {
    const n = serverPollCount(count);
    if (n === 1) return "1 Stimme";
    return n + " Stimmen";
  }

  function serverPollLabel(choice) {
    for (let i = 0; i < SERVER_POLL_OPTIONS.length; i += 1) {
      if (SERVER_POLL_OPTIONS[i].value === choice) return SERVER_POLL_OPTIONS[i].label;
    }
    return "";
  }

  function serverPollErrorText(error) {
    const msg = String((error && error.message) || "").replace(/^ERROR:\s*/i, "").trim();
    if (!msg || /failed to fetch|network|jwt|schema cache|permission denied|PGRST/i.test(msg)) {
      return "Die Stimme konnte nicht gespeichert werden.";
    }
    return msg;
  }

  function showServerPollStatus(message, kind, toast) {
    const el = document.getElementById("server-poll-status");
    if (el) {
      if (!message) {
        el.hidden = true;
        el.textContent = "";
      } else {
        el.hidden = false;
        el.textContent = message;
        el.className = "text-sm " + (kind === "error" ? "text-red-400" : "text-emerald-400");
      }
    }
    if (toast && message) notify(message, kind === "error" ? "error" : "info");
  }

  function showServerPollResultsStatus(message) {
    const el = document.getElementById("server-poll-results-status");
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function setServerPollSubmitLabel(changing) {
    const label = document.getElementById("server-poll-submit-label");
    if (label) label.textContent = changing ? "Antwort ändern" : "Antwort senden";
  }

  function paintServerPollChoices() {
    const buttons = document.querySelectorAll("#server-poll-choices [data-choice]");
    let selected = false;
    buttons.forEach(function (button) {
      const on = button.dataset.choice === serverPollChoice;
      if (on) selected = true;
      button.className = on ? SERVER_POLL_CHOICE_ON : SERVER_POLL_CHOICE_OFF;
      button.setAttribute("aria-checked", on ? "true" : "false");
      button.tabIndex = on ? 0 : -1;
    });
    if (!selected && buttons.length) buttons[0].tabIndex = 0;
  }

  function setServerPollChoice(choice) {
    if (SERVER_POLL_VALUES.indexOf(choice) < 0) return;
    serverPollChoice = choice;
    paintServerPollChoices();
  }

  function prefillServerPollName() {
    const input = document.getElementById("server-poll-name");
    if (!input || serverPollOwn) return;
    const next = currentUser && currentUser.displayName ? String(currentUser.displayName).slice(0, 40) : "";
    if (input.value && input.value !== serverPollNamePrefill) return;
    input.value = next;
    serverPollNamePrefill = next;
  }

  function normalizeServerPollVote(row) {
    if (!row || row.id == null) return null;
    const id = String(row.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;
    const choice = String(row.choice || "");
    if (SERVER_POLL_VALUES.indexOf(choice) < 0) return null;
    const name = String(row.char_name || "").trim();
    if (name.length < 2 || name.length > 40) return null;
    return {
      id: id,
      char_name: name,
      choice: choice,
      created_at: row.created_at || "",
      updated_at: row.updated_at || "",
    };
  }

  function normalizeServerPollResult(row) {
    if (!row) return null;
    const choice = String(row.choice || "");
    if (SERVER_POLL_VALUES.indexOf(choice) < 0) return null;
    const label = String(row.label || serverPollLabel(choice) || choice);
    return {
      choice: choice,
      label: label,
      votes: serverPollCount(row.votes),
      total: serverPollCount(row.total),
    };
  }

  function applyServerPollOwn(row) {
    const same = !!(serverPollOwn && row && serverPollOwn.id === row.id && serverPollOwn.choice === row.choice && serverPollOwn.char_name === row.char_name);
    serverPollOwn = row;
    setServerPollSubmitLabel(!!(currentUser && row));
    if (!row || same) return;
    setPollField("server-poll-name", row.char_name);
    serverPollNamePrefill = row.char_name;
    serverPollChoice = row.choice;
    paintServerPollChoices();
  }

  function clearServerPollOwn() {
    const had = !!serverPollOwn;
    serverPollOwn = null;
    serverPollChoice = "";
    setServerPollSubmitLabel(false);
    if (had) {
      const form = document.getElementById("server-poll-form");
      if (form) form.reset();
      serverPollNamePrefill = "";
      showServerPollStatus("", "");
    }
    paintServerPollChoices();
    prefillServerPollName();
  }

  function clearServerPollSession() {
    serverPollVotes = [];
    serverPollVotesLoaded = false;
    serverPollVotesLoading = false;
    serverPollVotesError = false;
    serverPollOwn = null;
    serverPollChoice = "";
    serverPollNamePrefill = "";
    setServerPollSubmitLabel(false);
    const form = document.getElementById("server-poll-form");
    if (form) form.reset();
    paintServerPollChoices();
    showServerPollStatus("", "");
    renderServerPollVotes();
  }

  function appendServerPollBars(container, rows) {
    if (!container) return;
    container.replaceChildren();
    rows.forEach(function (row) {
      const count = serverPollCount(row.votes);
      const total = serverPollCount(row.total);
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const item = document.createElement("div");
      const head = document.createElement("div");
      head.className = "mb-1 flex items-center justify-between gap-3 text-sm";
      const name = document.createElement("span");
      name.className = "text-slate-300";
      name.textContent = row.label;
      const num = document.createElement("span");
      num.className = "shrink-0 font-bold text-amber-400";
      num.textContent = count + " · " + pct + " %";
      head.append(name, num);
      const track = document.createElement("div");
      track.className = "h-3 overflow-hidden rounded-full bg-slate-800";
      const bar = document.createElement("div");
      bar.className = "h-full rounded-full bg-gradient-to-r from-red-600 to-amber-500";
      bar.style.width = pct + "%";
      track.appendChild(bar);
      item.append(head, track);
      item.setAttribute("role", "img");
      item.setAttribute("aria-label", row.label + ": " + count + (count === 1 ? " Stimme, " : " Stimmen, ") + pct + " Prozent");
      container.appendChild(item);
    });
  }

  function serverPollResultRows() {
    if (!serverPollResults.length) {
      return SERVER_POLL_OPTIONS.map(function (opt) {
        return { choice: opt.value, label: opt.label, votes: 0, total: 0 };
      });
    }
    return serverPollResults;
  }

  function renderServerPollVotes() {
    const list = document.getElementById("server-poll-votes");
    if (!list) return;
    list.replaceChildren();
    if (!isOfficer()) return;
    const title = document.createElement("h4");
    title.className = "mb-1 text-sm font-bold uppercase tracking-wider text-slate-400";
    title.textContent = "Einzelstimmen";
    const note = document.createElement("p");
    note.className = "mb-3 text-xs text-slate-500";
    note.textContent = "Nur Offiziere sehen, wer wofür gestimmt hat.";
    list.append(title, note);
    if (serverPollVotesError) {
      const failed = document.createElement("p");
      failed.className = "text-sm text-red-400";
      failed.textContent = "Die Einzelstimmen konnten nicht geladen werden.";
      list.appendChild(failed);
      return;
    }
    if (!serverPollVotesLoaded) {
      const waiting = document.createElement("p");
      waiting.className = "text-sm text-slate-500";
      waiting.textContent = "Wird geladen…";
      list.appendChild(waiting);
      return;
    }
    if (!serverPollVotes.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-500";
      empty.textContent = "Noch keine Stimme.";
      list.appendChild(empty);
      return;
    }
    const items = document.createElement("ul");
    items.className = "space-y-2";
    serverPollVotes.forEach(function (row) {
      const li = document.createElement("li");
      li.className = "flex flex-col gap-2 rounded-xl border border-slate-800 p-3 sm:flex-row sm:items-center sm:justify-between";
      const text = document.createElement("div");
      text.className = "min-w-0";
      const who = document.createElement("p");
      who.className = "break-words font-bold text-white";
      who.textContent = row.char_name;
      const meta = document.createElement("p");
      meta.className = "text-sm text-slate-400";
      const when = formatRegistration(row.updated_at || row.created_at);
      meta.textContent = serverPollLabel(row.choice) + (when ? " · " + when : "");
      text.append(who, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "delete-server-poll";
      remove.dataset.id = row.id;
      remove.className = "inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-2 text-sm font-bold text-red-400 hover:text-white";
      remove.textContent = "Löschen";
      remove.setAttribute("aria-label", "Stimme löschen: " + row.char_name + " (" + serverPollLabel(row.choice) + ")");
      li.append(text, remove);
      items.appendChild(li);
    });
    list.appendChild(items);
  }

  function renderServerPoll() {
    const rows = serverPollResultRows();
    let total = 0;
    rows.forEach(function (row) {
      total = Math.max(total, serverPollCount(row.total));
    });
    const totalEl = document.getElementById("server-poll-total");
    if (totalEl) totalEl.textContent = serverPollTotalLabel(total);
    appendServerPollBars(document.getElementById("server-poll-bars"), rows);
    paintServerPollChoices();
    renderServerPollVotes();
    ensureServerPollVotes();
  }

  function ensureServerPollVotes() {
    if (!isOfficer() || !remote || !remoteReady || serverPollVotesLoaded || serverPollVotesLoading) return;
    loadServerPollVotes();
  }

  function loadServerPollResults() {
    if (!remote || typeof remote.rpc !== "function") return Promise.resolve();
    let request;
    try {
      request = remote.rpc("server_poll_results");
    } catch (err) {
      return Promise.resolve();
    }
    return Promise.resolve(request).then(function (result) {
      if (!result || result.error) {
        showServerPollResultsStatus("Die Ergebnisse konnten nicht geladen werden.");
        return;
      }
      const rows = Array.isArray(result.data) ? result.data : [];
      serverPollResults = rows.map(normalizeServerPollResult).filter(Boolean);
      showServerPollResultsStatus("");
      renderServerPoll();
    }).catch(function () {
      showServerPollResultsStatus("Die Ergebnisse konnten nicht geladen werden.");
    });
  }

  function loadServerPollVotes() {
    if (!isOfficer() || !remote || typeof remote.from !== "function") {
      serverPollVotes = [];
      serverPollVotesLoaded = false;
      serverPollVotesLoading = false;
      serverPollVotesError = false;
      renderServerPollVotes();
      return Promise.resolve();
    }
    serverPollVotesLoading = true;
    serverPollVotesError = false;
    let request;
    try {
      request = remote.from("server_poll_votes").select("id,char_name,choice,created_at,updated_at").order("created_at", { ascending: true });
    } catch (err) {
      serverPollVotesLoading = false;
      return Promise.resolve();
    }
    return Promise.resolve(request).then(function (result) {
      serverPollVotesLoading = false;
      if (!isOfficer()) return;
      if (!result || result.error) {
        serverPollVotes = [];
        serverPollVotesLoaded = true;
        serverPollVotesError = true;
        renderServerPollVotes();
        return;
      }
      serverPollVotes = (result.data || []).map(normalizeServerPollVote).filter(Boolean);
      serverPollVotesLoaded = true;
      serverPollVotesError = false;
      renderServerPollVotes();
    }).catch(function () {
      serverPollVotesLoading = false;
      if (!isOfficer()) return;
      serverPollVotes = [];
      serverPollVotesLoaded = true;
      serverPollVotesError = true;
      renderServerPollVotes();
    });
  }

  function loadMyServerPoll() {
    if (!remote || typeof remote.rpc !== "function") return Promise.resolve();
    const userId = currentUser ? currentUser.id : "";
    return remote.rpc("my_server_poll").then(function (result) {
      const nowId = currentUser ? currentUser.id : "";
      if (nowId !== userId || !result || result.error) return;
      const rows = Array.isArray(result.data) ? result.data : [];
      const own = rows.length ? normalizeServerPollVote(rows[0]) : null;
      if (currentUser && own) applyServerPollOwn(own);
      else {
        serverPollOwn = null;
        setServerPollSubmitLabel(false);
        prefillServerPollName();
      }
    }).catch(function () { /* Ohne eigene Stimme bleibt das Formular leer. */ });
  }

  function submitServerPoll(form) {
    if (serverPollSending) return;
    const honeypot = document.getElementById("server-poll-website");
    if (honeypot && honeypot.value.trim()) return;
    if (!remote || typeof remote.rpc !== "function") {
      showServerPollStatus("Die Umfrage ist gerade nicht erreichbar.", "error", true);
      return;
    }
    const name = fieldValue("server-poll-name").trim();
    const choice = SERVER_POLL_VALUES.indexOf(serverPollChoice) >= 0 ? serverPollChoice : "";
    if (name.length < 2 || name.length > 40) {
      showServerPollStatus("Bitte einen Namen mit 2 bis 40 Zeichen eingeben.", "error", true);
      return;
    }
    if (!choice) {
      showServerPollStatus("Bitte einen Servertyp wählen.", "error", true);
      return;
    }
    const button = document.getElementById("server-poll-submit");
    serverPollSending = true;
    if (button) button.disabled = true;
    remote.rpc("submit_server_poll", {
      p_char_name: name,
      p_choice: choice,
    }).then(function (result) {
      if (!result || result.error) {
        showServerPollStatus(serverPollErrorText(result && result.error), "error", true);
        return;
      }
      const saved = Array.isArray(result.data) ? result.data : [];
      const row = saved.length ? normalizeServerPollVote(saved[0]) : null;
      if (currentUser && row) applyServerPollOwn(row);
      else setServerPollSubmitLabel(false);
      showServerPollStatus("Danke! Deine Stimme ist gespeichert.", "info", true);
      const jobs = [loadServerPollResults()];
      if (isOfficer()) jobs.push(loadServerPollVotes());
      return Promise.all(jobs);
    }).catch(function () {
      showServerPollStatus("Die Stimme konnte nicht gespeichert werden.", "error", true);
    }).then(function () {
      serverPollSending = false;
      if (button) button.disabled = false;
    });
  }

  function deleteServerPoll(id) {
    if (!isOfficer()) {
      showServerPollStatus("Nur Offiziere und Administratoren dürfen Stimmen löschen.", "error", true);
      return;
    }
    if (!remote || typeof remote.from !== "function") {
      showServerPollStatus("Löschen ist gerade nicht möglich.", "error", true);
      return;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")) return;
    const row = serverPollVotes.filter(function (item) { return item.id === id; })[0];
    const who = row ? row.char_name : "diese Stimme";
    if (!window.confirm("Die Stimme von „" + who + "“ wirklich löschen?")) return;
    remote.from("server_poll_votes").delete().eq("id", id).then(function (result) {
      if (!result || result.error) {
        showServerPollStatus("Die Stimme konnte nicht gelöscht werden.", "error", true);
        return null;
      }
      return Promise.all([loadServerPollVotes(), loadServerPollResults()]);
    }).then(function (loaded) {
      if (loaded === null) return;
      const still = serverPollVotes.some(function (item) { return item.id === id; });
      if (still) {
        showServerPollStatus("Die Stimme konnte nicht gelöscht werden.", "error", true);
        return;
      }
      if (serverPollOwn && serverPollOwn.id === id) clearServerPollOwn();
      showServerPollStatus("Stimme gelöscht.", "info", true);
    }).catch(function () {
      showServerPollStatus("Die Stimme konnte nicht gelöscht werden.", "error", true);
    });
  }

  const FEEDBACK_CHOICE_ON =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-extrabold text-slate-950";
  const FEEDBACK_CHOICE_OFF =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700";

  function feedbackErrorText(error) {
    const message = error && typeof error.message === "string" ? error.message.trim() : "";
    return message || "Die Nachricht konnte nicht gesendet werden.";
  }

  function showFeedbackStatus(message, kind, toast) {
    const el = document.getElementById("mecker-status");
    if (el) {
      if (!message) {
        el.hidden = true;
        el.textContent = "";
      } else {
        el.hidden = false;
        el.textContent = message;
        el.className = "text-sm break-words " + (kind === "error" ? "text-red-400" : "text-emerald-400");
      }
    }
    if (toast && message) notify(message, kind === "error" ? "error" : "info");
  }

  function paintFeedbackCategory() {
    document.querySelectorAll("[data-action='mecker-category']").forEach(function (button) {
      const on = button.dataset.category === feedbackCategory;
      button.className = on ? FEEDBACK_CHOICE_ON : FEEDBACK_CHOICE_OFF;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setFeedbackCategory(category) {
    if (category !== "lob" && category !== "kritik" && category !== "vorschlag") return;
    feedbackCategory = category;
    paintFeedbackCategory();
  }

  function syncFeedbackFront(force) {
    const select = document.getElementById("mecker-front");
    if (!select || (feedbackFrontTouched && !force)) return;
    select.value = activeFront === "forever" ? "forever" : "retail";
  }

  function updateFeedbackCount() {
    const text = document.getElementById("mecker-message");
    const count = document.getElementById("mecker-count");
    if (!text || !count) return;
    count.textContent = String(text.value.length);
  }

  function prefillFeedbackName() {
    const input = document.getElementById("mecker-name");
    const anon = document.getElementById("mecker-anonymous");
    if (!input || input.disabled || (anon && anon.checked)) return;
    const next = currentUser && currentUser.displayName ? String(currentUser.displayName).slice(0, 40) : "";
    if (input.value && input.value !== feedbackNamePrefill) return;
    input.value = next;
    feedbackNamePrefill = next;
  }

  function syncFeedbackAnonymous() {
    const input = document.getElementById("mecker-name");
    const anon = document.getElementById("mecker-anonymous");
    if (!input || !anon) return;
    if (anon.checked) {
      if (!input.disabled) feedbackNameDraft = input.value;
      input.value = "";
      input.disabled = true;
      return;
    }
    input.disabled = false;
    if (feedbackNameDraft) {
      input.value = feedbackNameDraft;
      feedbackNameDraft = null;
      return;
    }
    feedbackNameDraft = null;
    prefillFeedbackName();
  }

  function initFeedbackForm() {
    paintFeedbackCategory();
    syncFeedbackFront(false);
    updateFeedbackCount();
    prefillFeedbackName();
  }

  function resetFeedbackForm() {
    const form = document.getElementById("mecker-form");
    feedbackCategory = "";
    feedbackFrontTouched = false;
    feedbackNameDraft = null;
    if (form) form.reset();
    const name = document.getElementById("mecker-name");
    if (name) {
      name.disabled = false;
      name.value = "";
    }
    paintFeedbackCategory();
    syncFeedbackFront(true);
    updateFeedbackCount();
    prefillFeedbackName();
  }

  function submitFeedback() {
    if (feedbackSending) return;
    const frontValue = fieldValue("mecker-front");
    const front = frontValue === "forever" ? "forever" : (frontValue === "retail" ? "retail" : "");
    const message = fieldValue("mecker-message").trim();
    const anonEl = document.getElementById("mecker-anonymous");
    const anonymous = !!(anonEl && anonEl.checked);
    const name = anonymous ? "" : fieldValue("mecker-name").trim().slice(0, 40);
    if (feedbackCategory !== "lob" && feedbackCategory !== "kritik" && feedbackCategory !== "vorschlag") {
      showFeedbackStatus("Bitte Lob, Kritik oder Vorschlag wählen.", "error", true);
      const first = document.querySelector("[data-action='mecker-category']");
      if (first) first.focus();
      return;
    }
    if (!front) {
      showFeedbackStatus("Bitte Retail oder Forever wählen.", "error", true);
      return;
    }
    if (!message) {
      showFeedbackStatus("Bitte eine Nachricht schreiben.", "error", true);
      const field = document.getElementById("mecker-message");
      if (field) field.focus();
      return;
    }
    if (message.length > 2000) {
      showFeedbackStatus("Die Nachricht ist zu lang.", "error", true);
      return;
    }
    if (!anonymous && !name) {
      showFeedbackStatus("Bitte einen Namen eingeben.", "error", true);
      const nameField = document.getElementById("mecker-name");
      if (nameField) nameField.focus();
      return;
    }
    if (!remote || typeof remote.rpc !== "function") {
      showFeedbackStatus("Senden ist gerade nicht möglich.", "error", true);
      return;
    }
    const button = document.getElementById("mecker-submit");
    feedbackSending = true;
    if (button) button.disabled = true;
    showFeedbackStatus("", "info", false);
    hideNotice();
    remote.rpc("submit_feedback", {
      p_front: front,
      p_category: feedbackCategory,
      p_message: message,
      p_name: anonymous ? "" : name,
      p_anonymous: anonymous,
    }).then(function (result) {
      if (!result || result.error) {
        showFeedbackStatus(feedbackErrorText(result && result.error), "error", true);
        return;
      }
      if (result.data && result.data.ok === false) {
        const failed = result.data.message || result.data.error;
        showFeedbackStatus(typeof failed === "string" && failed.trim() ? failed : "Die Nachricht konnte nicht gesendet werden.", "error", true);
        return;
      }
      resetFeedbackForm();
      showFeedbackStatus("Danke! Deine Nachricht ist angekommen.", "info", true);
    }).catch(function (err) {
      showFeedbackStatus(feedbackErrorText(err), "error", true);
    }).then(function () {
      feedbackSending = false;
      const again = document.getElementById("mecker-submit");
      if (again) again.disabled = false;
    });
  }

  function createRemote() {
    const lib = window.supabase;
    const config = arcConfig();
    const url = typeof config.supabaseUrl === "string" ? config.supabaseUrl.trim() : "";
    const key = typeof config.supabaseAnonKey === "string" ? config.supabaseAnonKey.trim() : "";
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

  function missingStatusColumn(error) {
    if (!error) return false;
    const code = String(error.code || "");
    const message = String(error.message || "").toLowerCase();
    if (message.indexOf("status") < 0) return false;
    return code === "42703" || code === "PGRST204" || /does not exist|schema cache/.test(message);
  }

  function profileFromSession(user, profile, statusKnown) {
    const meta = user.user_metadata || {};
    let role = "member";
    if (profile && (profile.role === "officer" || profile.role === "admin")) role = profile.role;
    let status = "approved";
    if (statusKnown && profile && (profile.status === "pending" || profile.status === "approved" || profile.status === "rejected")) {
      status = profile.status;
    } else if (statusKnown && approvalEnforced && !profile) {
      status = "pending";
    }
    return {
      id: user.id,
      email: user.email || "",
      displayName: (profile && profile.display_name) || meta.display_name || user.email || "Mitglied",
      role: role,
      status: status,
      statusKnown: statusKnown,
    };
  }

  function adoptSession(session) {
    const user = session && session.user;
    if (!user || !remote) {
      currentUser = null;
      return Promise.resolve();
    }
    return remote.from("profiles").select("display_name, role, status, game").eq("id", user.id).maybeSingle().then(function (result) {
      if (result && result.error && missingStatusColumn(result.error)) {
        approvalEnforced = false;
        return remote.from("profiles").select("display_name, role").eq("id", user.id).maybeSingle().then(function (fallback) {
          return { result: fallback || {}, statusKnown: false };
        });
      }
      return { result: result || {}, statusKnown: !(result && result.error) };
    }).then(function (payload) {
      const result = payload.result || {};
      currentUser = profileFromSession(user, result.data, payload.statusKnown);
    }).catch(function () {
      currentUser = profileFromSession(user, null, false);
    });
  }

  function probeApproval() {
    if (!remote || typeof remote.rpc !== "function") {
      approvalEnforced = false;
      return Promise.resolve();
    }
    return remote.rpc("is_approved").then(function (result) {
      approvalEnforced = !(result && result.error);
    }).catch(function () {
      approvalEnforced = false;
    });
  }

  function loadRemote() {
    remote = createRemote();
    if (!remote) {
      notify(OFFLINE_MSG, "error");
      renderDkp();
      raidState = "error";
      renderRaids();
      lootState = "error";
      lootError = "Die Beute konnte nicht geladen werden.";
      renderLoot();
      return;
    }
    loadGallery();
    loadForeverPoll();
    loadServerPollResults();
    loadLoot();
    subscribeLoot();
    probeApproval().then(function () {
      if (!authReady) {
        authReady = true;
        remote.auth.onAuthStateChange(function (event, session) {
          if (event === "SIGNED_OUT") {
            currentUser = null;
            if (approvalEnforced) replaceItems(chatMessages, []);
            clearForeverPollOwn();
            clearServerPollSession();
            clearDkpData();
            raidSignups = [];
            raidNamesReady = false;
            resetRaidForm();
            updateAuthUI();
            renderPermissionSurfaces();
            if (remoteReady) loadRaids();
            return;
          }
          if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED")) return;
          adoptSession(session).then(function () {
            updateAuthUI();
            renderPermissionSurfaces();
            if (!(event === "TOKEN_REFRESHED" && dkpLoaded && canReadDkp())) syncDkpAccess();
            if (event !== "TOKEN_REFRESHED") {
              loadMyForeverPoll();
              loadMyServerPoll();
              if (isOfficer()) loadServerPollVotes();
            }
            if (remoteReady && event === "SIGNED_IN") loadRaids();
            if (remoteReady && event !== "TOKEN_REFRESHED") refreshChat();
          }).catch(function () {
            updateAuthUI();
            clearDkpData();
          });
        });
      }
      return remote.auth.getSession();
    }).then(function (result) {
      if (!result) return null;
      if (result.error) throw result.error;
      if (result.data && result.data.session) return adoptSession(result.data.session);
      return null;
    }).catch(function () {
      currentUser = null;
    }).then(function () {
      const chatEpochAtFetch = chatLoadEpoch;
      return fetchAll().then(function () {
        return chatEpochAtFetch;
      });
    }).then(function (chatEpochAtFetch) {
      remoteReady = true;
      renderGuild();
      updateAuthUI();
      syncDkpAccess();
      loadMyForeverPoll();
      loadMyServerPoll();
      if (isOfficer()) loadServerPollVotes();
      loadRaids();
      subscribeLive();
      if ((currentUser && approvalEnforced) || chatEpochAtFetch !== chatLoadEpoch) refreshChat();
    }).catch(function () {
      remoteReady = false;
      notify(OFFLINE_MSG, "error");
      updateAuthUI();
      loadRaids();
    });
  }

  function fetchRows(table, columns, orderColumn, ascending) {
    let query = remote.from(table).select(columns);
    if (orderColumn) query = query.order(orderColumn, { ascending: ascending !== false });
    return query.then(function (result) {
      if (result.error) throw result.error;
      return result.data || [];
    });
  }

  function fetchAll() {
    const chatRequest = chatSelect();
    return Promise.all([
      fetchRows("members", "id, front, name, rank, sort_order", "sort_order", true),
      fetchRows("roster", "id, front, name, role, sort_order", "sort_order", true),
      fetchRows("leadership", "id, name, subtitle, accent, sort_order", "sort_order", true),
      fetchRows("guild_info", "id, col1, col2, col3", null, true),
      fetchRows("mplus_groups", "id, name, dungeon, meeting_time, tank, heal, dds, created_by", "created_at", true),
      fetchRows("mplus_signups", "id, group_id, user_id, character_name", "created_at", true),
      fetchRows("classic_runs", "id, name, size, meeting_time", "created_at", true),
      chatRequest.query,
    ]).then(function (rows) {
      const chatResult = rows[7];
      const chatCurrent = chatRequest.epoch === chatLoadEpoch && chatRequest.front === chatFront();
      replaceItems(retailMembers, rows[0].filter(function (row) { return row.front === "retail"; }).map(mapMember));
      replaceItems(foreverMembers, rows[0].filter(function (row) { return row.front === "forever"; }).map(mapMember));
      replaceItems(retailRaid, rows[1].filter(function (row) { return row.front === "retail"; }).map(mapRoster));
      replaceItems(foreverRaid, rows[1].filter(function (row) { return row.front === "forever"; }).map(mapRoster));
      replaceItems(leadership, rows[2].map(mapLeader));
      const info = rows[3][0];
      if (info) {
        guildInfo.col1 = info.col1 || "";
        guildInfo.col2 = info.col2 || "";
        guildInfo.col3 = info.col3 || "";
      }
      const signups = rows[5].map(mapSignup);
      replaceItems(mplusGroups, rows[4].map(function (row) {
        return mapGroup(row, signups.filter(function (signup) { return signup.groupId === row.id; }));
      }));
      replaceItems(classicRuns, rows[6].map(mapRun));
      if (chatCurrent && !canReadChat()) {
        replaceItems(chatMessages, []);
      } else if (chatCurrent && chatResult.error) {
        throw chatResult.error;
      } else if (chatCurrent) {
        replaceItems(chatMessages, (chatResult.data || []).slice().reverse().map(mapChat));
      }
    });
  }

  function mapMember(row) {
    return { id: row.id, name: row.name, rank: row.rank, sortOrder: row.sort_order };
  }

  function mapRoster(row) {
    return { id: row.id, name: row.name, role: row.role, sortOrder: row.sort_order };
  }

  function mapLeader(row) {
    return {
      id: row.id,
      name: row.name,
      subtitle: row.subtitle,
      accent: row.accent === "amber" ? "amber" : "red",
      sortOrder: row.sort_order,
    };
  }

  function mapSignup(row) {
    return {
      id: row.id,
      groupId: row.group_id,
      userId: row.user_id,
      characterName: row.character_name,
    };
  }

  function mapGroup(row, signups) {
    return {
      id: row.id,
      name: row.name,
      dungeon: row.dungeon,
      time: row.meeting_time,
      tank: row.tank,
      heal: row.heal,
      dds: Array.isArray(row.dds) ? row.dds : [],
      createdBy: row.created_by || null,
      signups: signups || [],
    };
  }

  function mapRun(row) {
    return { id: row.id, name: row.name, size: row.size, time: row.meeting_time };
  }

  function mapChat(row) {
    const front = row.front === "forever" || row.front === "retail" ? row.front : "";
    return {
      id: row.id,
      author: row.author,
      text: row.body,
      userId: row.user_id || null,
      source: row.source === "discord" ? "discord" : "homepage",
      front: front,
      time: formatStamp(row.created_at),
    };
  }

  function formatStamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function chatFront() {
    return activeFront === "forever" ? "forever" : "retail";
  }

  function updateChatHeading() {
    const text = activeFront === "forever" ? "Gildenchat Forever" : "Gildenchat Retail";
    const label = document.getElementById("gilden-chat-label");
    const lead = document.getElementById("gilden-chat-lead");
    const log = document.getElementById("chat-messages");
    if (label) label.textContent = text;
    if (lead) lead.textContent = activeFront === "forever"
      ? "Nachrichten in diesem Chat gelten für Forever."
      : "Nachrichten in diesem Chat gelten für Retail.";
    if (log) log.setAttribute("aria-label", text);
  }

  function chatSelect() {
    const front = chatFront();
    return {
      front: front,
      epoch: chatLoadEpoch,
      query: remote.from("chat_messages").select("id, author, body, user_id, source, front, created_at").eq("front", front).order("created_at", { ascending: false }).limit(200),
    };
  }

  function chatChangeForActiveFront(payload) {
    const front = chatFront();
    const next = payload && payload.new ? payload.new.front : "";
    const prev = payload && payload.old ? payload.old.front : "";
    const known = next === "retail" || next === "forever" || prev === "retail" || prev === "forever";
    if (!known) return true;
    return next === front || prev === front;
  }

  function refreshChat() {
    if (!remote || !remoteReady) return;
    if (!canReadChat()) {
      replaceItems(chatMessages, []);
      renderChat();
      return;
    }
    const request = chatSelect();
    request.query.then(function (result) {
      if (request.epoch !== chatLoadEpoch || request.front !== chatFront()) return;
      if (result.error || !result.data) return;
      replaceItems(chatMessages, result.data.slice().reverse().map(mapChat));
      renderChat();
    });
  }

  function refreshRoster() {
    if (!remote || !remoteReady) return;
    fetchRows("roster", "id, front, name, role, sort_order", "sort_order", true).then(function (rows) {
      replaceItems(retailRaid, rows.filter(function (row) { return row.front === "retail"; }).map(mapRoster));
      replaceItems(foreverRaid, rows.filter(function (row) { return row.front === "forever"; }).map(mapRoster));
      renderRaidKader("retail");
      renderRaidKader("forever");
    }).catch(function () { /* Der bisherige Kader bleibt sichtbar. */ });
  }

  function subscribeLive() {
    if (!remote) return;
    subscribeServerPoll();
    const front = chatFront();
    if (liveChannel && liveChannelFront === front) return;
    const previous = liveChannel;
    liveChannelFront = front;
    liveChannelSerial += 1;
    liveChannel = remote.channel("arc-guild-" + front + "-" + liveChannelSerial)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: "front=eq." + front }, function (payload) {
        if (!chatChangeForActiveFront(payload)) return;
        window.clearTimeout(chatRefreshTimer);
        chatRefreshTimer = window.setTimeout(refreshChat, 250);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roster" }, function () {
        window.clearTimeout(rosterRefreshTimer);
        rosterRefreshTimer = window.setTimeout(refreshRoster, 250);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "raid_signups" }, function () {
        window.clearTimeout(raidRefreshTimer);
        raidRefreshTimer = window.setTimeout(loadRaids, 500);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "raids" }, function () {
        window.clearTimeout(raidRefreshTimer);
        raidRefreshTimer = window.setTimeout(loadRaids, 500);
      })
      .subscribe();
    if (previous && typeof remote.removeChannel === "function") {
      Promise.resolve(remote.removeChannel(previous)).catch(function () {});
    }
  }

  function subscribeServerPoll() {
    if (!remote || serverPollChannel || typeof remote.channel !== "function") return;
    try {
      serverPollChannel = remote.channel("arc-server-poll")
        .on("postgres_changes", { event: "*", schema: "public", table: "server_poll_counts" }, function () {
          window.clearTimeout(serverPollRefreshTimer);
          serverPollRefreshTimer = window.setTimeout(function () {
            loadServerPollResults();
            if (isOfficer()) loadServerPollVotes();
          }, 250);
        })
        .subscribe();
    } catch (err) {
      serverPollChannel = null;
    }
  }

  function isDkpUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function dkpErrorText(error) {
    if (!error) return DKP_LOAD_FAIL;
    const code = String(error.code || "");
    const raw = String(error.message || error.error_description || "");
    const lower = raw.toLowerCase();
    if (
      error.name === "TypeError" ||
      !raw ||
      /^PGRST/i.test(code) ||
      code === "42501" ||
      lower.indexOf("permission denied") !== -1 ||
      lower.indexOf("jwt") !== -1 ||
      lower.indexOf("failed to fetch") !== -1 ||
      lower.indexOf("networkerror") !== -1 ||
      lower.indexOf("network error") !== -1 ||
      lower.indexOf("load failed") !== -1
    ) {
      return DKP_LOAD_FAIL;
    }
    return raw.replace(/^\s*ERROR:\s*/i, "");
  }

  function setDkpStatus(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function setDkpLoadStatus(message) {
    setDkpStatus("dkp-load-status", message);
  }

  function setDkpBusy(busy) {
    dkpBusy = busy;
    const section = document.getElementById("forever-dkp");
    if (section) section.setAttribute("aria-busy", busy ? "true" : "false");
    document.querySelectorAll("#forever-dkp button[type='submit'], #forever-dkp [data-dkp-write]").forEach(function (el) {
      el.disabled = busy;
    });
  }

  function dkpById(list, id) {
    if (!isDkpUuid(id)) return null;
    for (let i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function dkpPlayerById(id) {
    return dkpById(dkpPlayers, id);
  }

  function dkpNum(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0";
    return n.toLocaleString("de-DE");
  }

  function dkpSigned(value) {
    const n = Number(value) || 0;
    const text = Math.abs(n).toLocaleString("de-DE");
    if (n > 0) return "+" + text;
    if (n < 0) return "-" + text;
    return "0";
  }

  function readDkpInt(raw) {
    const text = String(raw == null ? "" : raw).trim();
    if (!text) return { empty: true, value: null, invalid: false };
    if (!/^-?\d+$/.test(text)) return { empty: false, value: null, invalid: true };
    const value = parseInt(text, 10);
    if (!Number.isFinite(value)) return { empty: false, value: null, invalid: true };
    return { empty: false, value: value, invalid: false };
  }

  function dkpOptionalText(raw, max) {
    const text = String(raw == null ? "" : raw).trim();
    if (!text) return { value: null, error: "" };
    if (text.length > max) return { value: null, error: "Der Text ist zu lang (höchstens " + max + " Zeichen)." };
    return { value: text, error: "" };
  }

  function formatDkpStamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function dkpOption(value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function fillDkpSelect(select, entries, placeholder) {
    if (!select) return;
    const previous = select.value;
    select.replaceChildren();
    if (placeholder) select.appendChild(dkpOption("", placeholder));
    entries.forEach(function (entry) {
      if (!isDkpUuid(entry.value)) return;
      select.appendChild(dkpOption(entry.value, entry.label));
    });
    const hasPrevious = previous && Array.prototype.some.call(select.options, function (option) {
      return option.value === previous;
    });
    if (hasPrevious) select.value = previous;
  }

  function unwrapDkpRows(result) {
    if (!result || result.error) throw (result && result.error) || new TypeError("Failed to fetch");
    return result.data || [];
  }

  function fetchDkpPlayers() {
    return remote.from("dkp_players")
      .select("id, char_name, member_id, dkp, overflow, active, created_at, updated_at")
      .order("char_name", { ascending: true })
      .then(unwrapDkpRows);
  }

  function fetchDkpActivityTypes() {
    return remote.from("dkp_activity_types")
      .select("id, name, points, active, sort_order, created_at, updated_at")
      .order("sort_order", { ascending: true })
      .then(unwrapDkpRows);
  }

  function fetchDkpItems() {
    return remote.from("dkp_items")
      .select("id, name, cost, note, active, created_at, updated_at")
      .order("name", { ascending: true })
      .then(unwrapDkpRows);
  }

  function fetchDkpHistoryPage(from) {
    let query = remote.from("dkp_history").select(DKP_HISTORY_COLUMNS).order("created_at", { ascending: false });
    if (isDkpUuid(dkpHistoryPlayerId)) query = query.eq("player_id", dkpHistoryPlayerId);
    if (!dkpShowSetup) query = query.neq("kind", "setup");
    return query.range(from, from + DKP_PAGE_SIZE - 1).then(function (result) {
      const rows = unwrapDkpRows(result);
      return { rows: rows, hasMore: rows.length === DKP_PAGE_SIZE };
    });
  }

  function canReadDkp() {
    return isApproved();
  }

  function clearDkpData() {
    dkpEpoch += 1;
    dkpHistoryEpoch += 1;
    dkpPlayers = [];
    dkpActivityTypes = [];
    dkpItems = [];
    dkpHistory = [];
    dkpHistoryHasMore = false;
    dkpLoaded = false;
    dkpLoadFailed = false;
    dkpSelectedIds = {};
    dkpReverseId = "";
    dkpHistoryPlayerId = "";
    if (dkpBusy) setDkpBusy(false);
    setDkpLoadStatus("");
    renderDkp();
  }

  function syncDkpAccess() {
    if (!canReadDkp()) {
      clearDkpData();
      return Promise.resolve();
    }
    return loadDkp();
  }

  function syncDkpChrome() {
    const open = canReadDkp();
    const heading = document.getElementById("dkp-heading-text");
    const gate = document.getElementById("dkp-gate");
    const gateText = document.getElementById("dkp-gate-text");
    const gateLogin = document.getElementById("dkp-gate-login");
    const intro = document.getElementById("dkp-intro");
    const body = document.getElementById("dkp-body");
    if (heading) heading.textContent = open ? "DKP-Punkte" : "Gilden-Aktivitäten";
    if (gate) gate.hidden = open;
    if (intro) intro.hidden = !open;
    if (body) body.hidden = !open;
    if (!open && gateText) {
      if (!currentUser) {
        gateText.textContent = "Unser Gilden-Aktivitäten-System: Punkte für Raids, Dungeons und Gildenevents. Nur für registrierte Mitglieder.";
      } else if (currentUser.status === "rejected") {
        gateText.textContent = "Deine Registrierung wurde abgelehnt. Ein Offizier muss das Konto freischalten.";
      } else {
        gateText.textContent = "Dein Konto muss zuerst von einem Offizier freigeschaltet werden.";
      }
    }
    if (gateLogin) gateLogin.hidden = !!currentUser;
    const label = open ? "DKP" : "Gilden-Aktivitäten";
    const current = document.querySelector("#quick-nav a[href='#forever-dkp'], #mobile-nav-links a[href='#forever-dkp']");
    if (!current || current.getAttribute("aria-label") !== label) updateQuickNav();
  }

  function loadDkp() {
    if (!canReadDkp()) {
      clearDkpData();
      return Promise.resolve();
    }
    if (!remote || typeof remote.from !== "function") {
      dkpLoaded = false;
      dkpLoadFailed = true;
      setDkpLoadStatus(DKP_LOAD_FAIL);
      renderDkp();
      return Promise.resolve();
    }
    const epoch = ++dkpEpoch;
    const historyEpoch = ++dkpHistoryEpoch;
    return Promise.all([
      fetchDkpPlayers(),
      fetchDkpActivityTypes(),
      fetchDkpItems(),
      fetchDkpHistoryPage(0),
    ]).then(function (parts) {
      if (epoch !== dkpEpoch) return;
      dkpPlayers = parts[0];
      dkpActivityTypes = parts[1];
      dkpItems = parts[2];
      if (historyEpoch === dkpHistoryEpoch) {
        dkpHistory = parts[3].rows;
        dkpHistoryHasMore = parts[3].hasMore;
      }
      dkpLoaded = true;
      dkpLoadFailed = false;
      pruneDkpSelection();
      setDkpLoadStatus("");
      renderDkp();
    }).catch(function (error) {
      if (epoch !== dkpEpoch) return;
      dkpLoaded = false;
      dkpLoadFailed = true;
      setDkpLoadStatus(dkpErrorText(error));
      renderDkp();
    });
  }

  function reloadDkpHistory() {
    if (!canReadDkp() || !remote) return Promise.resolve();
    const historyEpoch = ++dkpHistoryEpoch;
    return fetchDkpHistoryPage(0).then(function (page) {
      if (historyEpoch !== dkpHistoryEpoch) return;
      dkpHistory = page.rows;
      dkpHistoryHasMore = page.hasMore;
      setDkpStatus("dkp-history-status", "");
      renderDkpHistory();
    }).catch(function (error) {
      if (historyEpoch !== dkpHistoryEpoch) return;
      setDkpStatus("dkp-history-status", dkpErrorText(error));
    });
  }

  function loadMoreDkpHistory() {
    if (!canReadDkp() || dkpBusy || !dkpHistoryHasMore || !remote) return;
    const historyEpoch = dkpHistoryEpoch;
    const from = dkpHistory.length;
    setDkpBusy(true);
    fetchDkpHistoryPage(from).then(function (page) {
      if (historyEpoch !== dkpHistoryEpoch) return;
      dkpHistory = dkpHistory.concat(page.rows);
      dkpHistoryHasMore = page.hasMore;
      renderDkpHistory();
    }).catch(function (error) {
      if (historyEpoch !== dkpHistoryEpoch) return;
      setDkpStatus("dkp-history-status", dkpErrorText(error));
    }).then(function () {
      setDkpBusy(false);
    });
  }

  function dkpRpc(name, params) {
    if (!remote || typeof remote.rpc !== "function") return Promise.reject(new TypeError("Failed to fetch"));
    return remote.rpc(name, params).then(function (result) {
      if (!result || result.error) throw (result && result.error) || new TypeError("Failed to fetch");
      return result.data;
    });
  }

  function runDkpWrite(statusId, work) {
    if (dkpBusy) return;
    if (!isOfficer()) {
      const text = "Nur Offiziere und Administratoren dürfen DKP verwalten.";
      setDkpStatus(statusId, text);
      notify(text, "error");
      return;
    }
    setDkpBusy(true);
    setDkpStatus(statusId, "");
    Promise.resolve().then(work).then(function (message) {
      return loadDkp().then(function () {
        return message;
      });
    }).then(function (message) {
      if (message) {
        setDkpStatus(statusId, message);
        notify(message, "info");
      }
    }).catch(function (error) {
      const text = dkpErrorText(error);
      setDkpStatus(statusId, text);
      notify(text, "error");
    }).then(function () {
      setDkpBusy(false);
    });
  }

  function sortedDkpPlayers(activeOnly) {
    return dkpPlayers.filter(function (player) {
      return player && isDkpUuid(player.id) && (!activeOnly || player.active);
    }).slice().sort(function (a, b) {
      return String(a.char_name || "").localeCompare(String(b.char_name || ""), "de");
    });
  }

  function sortedDkpTypes(activeOnly) {
    return dkpActivityTypes.filter(function (row) {
      return row && isDkpUuid(row.id) && (!activeOnly || row.active);
    }).slice().sort(function (a, b) {
      const order = (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0);
      if (order) return order;
      return String(a.name || "").localeCompare(String(b.name || ""), "de");
    });
  }

  function sortedDkpItems(activeOnly) {
    return dkpItems.filter(function (row) {
      return row && isDkpUuid(row.id) && (!activeOnly || row.active);
    }).slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""), "de");
    });
  }

  function visibleScorePlayers() {
    const query = dkpPlayerQuery.trim().toLocaleLowerCase("de");
    const list = dkpPlayers.filter(function (player) {
      if (!player || !isDkpUuid(player.id)) return false;
      if (!dkpShowInactive && !player.active) return false;
      if (!query) return true;
      return String(player.char_name || "").toLocaleLowerCase("de").indexOf(query) !== -1;
    });
    const dir = dkpSort.dir === "asc" ? 1 : -1;
    list.sort(function (a, b) {
      if (dkpSort.key === "name") {
        const cmp = String(a.char_name || "").localeCompare(String(b.char_name || ""), "de");
        if (cmp) return cmp * dir;
      } else {
        const key = dkpSort.key === "overflow" ? "overflow" : "dkp";
        const diff = (Number(a[key]) || 0) - (Number(b[key]) || 0);
        if (diff) return diff * dir;
      }
      return String(a.char_name || "").localeCompare(String(b.char_name || ""), "de");
    });
    return list;
  }

  function visibleAwardPlayers() {
    const query = dkpAwardQuery.trim().toLocaleLowerCase("de");
    return sortedDkpPlayers(true).filter(function (player) {
      if (!query) return true;
      return String(player.char_name || "").toLocaleLowerCase("de").indexOf(query) !== -1;
    });
  }

  function pruneDkpSelection() {
    const live = {};
    dkpPlayers.forEach(function (player) {
      if (player && player.active && isDkpUuid(player.id)) live[player.id] = true;
    });
    Object.keys(dkpSelectedIds).forEach(function (id) {
      if (!live[id]) delete dkpSelectedIds[id];
    });
    if (dkpReverseId && !dkpHistory.some(function (row) { return row.id === dkpReverseId; })) dkpReverseId = "";
  }

  function selectedDkpCount() {
    return Object.keys(dkpSelectedIds).length;
  }

  function updateDkpSelectedCount() {
    const el = document.getElementById("dkp-activity-count");
    if (!el) return;
    const count = selectedDkpCount();
    el.textContent = count === 1 ? "1 ausgewählt" : count + " ausgewählt";
  }

  function dkpEmptyCell(text) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.className = "px-2 py-6 text-center text-slate-500";
    td.textContent = text;
    tr.appendChild(td);
    return tr;
  }

  function syncDkpSortHeaders() {
    document.querySelectorAll("[data-action='dkp-sort']").forEach(function (button) {
      const key = button.dataset.sort;
      const th = button.closest("th");
      const active = dkpSort.key === key;
      if (th) th.setAttribute("aria-sort", active ? (dkpSort.dir === "asc" ? "ascending" : "descending") : "none");
      const mark = button.querySelector("[data-sort-mark]");
      if (mark) mark.textContent = !active ? "" : dkpSort.dir === "asc" ? " ↑" : " ↓";
    });
  }

  function renderDkpScores() {
    const body = document.getElementById("dkp-score-body");
    if (!body) return;
    syncDkpSortHeaders();
    body.replaceChildren();
    if (!dkpLoaded) {
      body.appendChild(dkpEmptyCell(dkpLoadFailed ? "Die Punkteliste konnte nicht geladen werden." : "DKP werden geladen…"));
      return;
    }
    const players = visibleScorePlayers();
    if (!players.length) {
      let message = "Noch keine Spieler im DKP-System.";
      if (dkpPlayers.length && dkpPlayerQuery.trim()) message = "Kein Spieler passt zur Suche.";
      else if (dkpPlayers.length && !dkpShowInactive) message = "Keine aktiven Spieler. Inaktive sind ausgeblendet.";
      body.appendChild(dkpEmptyCell(message));
      return;
    }
    players.forEach(function (player) {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-800/80";
      const nameCell = document.createElement("td");
      nameCell.className = "px-2 py-1 align-middle";
      const nameBtn = document.createElement("button");
      nameBtn.type = "button";
      nameBtn.dataset.action = "dkp-filter-player";
      nameBtn.dataset.id = player.id;
      nameBtn.className = "inline-flex min-h-11 w-full items-center gap-2 text-left font-semibold text-white hover:text-amber-300";
      nameBtn.setAttribute("aria-label", "Verlauf von " + (player.char_name || "Spieler") + " anzeigen");
      const nameText = document.createElement("span");
      nameText.className = player.active ? "break-words" : "break-words text-slate-400";
      nameText.textContent = player.char_name || "Spieler";
      nameBtn.appendChild(nameText);
      if (!player.active) {
        const badge = document.createElement("span");
        badge.className = "rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-400";
        badge.textContent = "inaktiv";
        nameBtn.appendChild(badge);
      }
      nameCell.appendChild(nameBtn);
      const memberRank = dkpMemberRank(player.member_id);
      if (memberRank) {
        const rank = document.createElement("p");
        rank.className = "text-xs text-slate-400 break-words";
        rank.textContent = memberRank;
        nameCell.appendChild(rank);
      }
      const dkpCell = document.createElement("td");
      dkpCell.className = "px-2 py-1 align-middle whitespace-nowrap";
      const dkpValue = Math.max(0, Math.min(500, Number(player.dkp) || 0));
      const dkpText = document.createElement("div");
      dkpText.className = "font-bold text-amber-300";
      dkpText.textContent = dkpNum(player.dkp) + " / 500";
      const bar = document.createElement("div");
      bar.className = "mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800";
      bar.setAttribute("aria-hidden", "true");
      const fill = document.createElement("div");
      fill.className = "h-full bg-amber-500";
      fill.style.width = (dkpValue / 500) * 100 + "%";
      bar.appendChild(fill);
      dkpCell.append(dkpText, bar);
      const overCell = document.createElement("td");
      overCell.className = "px-2 py-1 align-middle font-semibold text-slate-200";
      overCell.textContent = dkpNum(player.overflow);
      tr.append(nameCell, dkpCell, overCell);
      body.appendChild(tr);
    });
  }

  function dkpKindLabel(row) {
    if (!row) return "Eintrag";
    if (row.kind === "activity") return "Aktivität";
    if (row.kind === "item") return "Gegenstand";
    if (row.kind === "transfer") return "Übertrag aus Überstunden";
    if (row.kind === "reversal") return "Storno";
    if (row.kind === "setup") return "Einstellung";
    if (row.kind === "adjustment") {
      const delta = (Number(row.dkp_change) || 0) + (Number(row.overflow_change) || 0);
      return delta < 0 ? "Abzug" : "Bonus";
    }
    return "Eintrag";
  }

  function dkpWhatText(row) {
    if (row.activity_name) return row.activity_name;
    if (row.item_name) return row.item_name;
    return "";
  }

  function dkpReversedMap() {
    const map = {};
    dkpHistory.forEach(function (row) {
      if (row && isDkpUuid(row.reverses_id)) map[row.reverses_id] = true;
    });
    return map;
  }

  function dkpLine(label, value, muted) {
    const p = document.createElement("p");
    p.className = muted ? "text-sm text-slate-400" : "text-sm text-slate-200";
    const strong = document.createElement("span");
    strong.className = "font-semibold text-slate-400";
    strong.textContent = label + ": ";
    p.appendChild(strong);
    p.appendChild(document.createTextNode(value || "—"));
    return p;
  }

  function renderDkpHistory() {
    const list = document.getElementById("dkp-history-list");
    const more = document.getElementById("dkp-history-more");
    if (!list) return;
    list.replaceChildren();
    if (more) more.hidden = !dkpHistoryHasMore;
    if (!dkpLoaded) {
      const li = document.createElement("li");
      li.className = "px-2 py-4 text-center text-sm text-slate-500";
      li.textContent = dkpLoadFailed ? "Der Verlauf konnte nicht geladen werden." : "Verlauf wird geladen…";
      list.appendChild(li);
      return;
    }
    if (!dkpHistory.length) {
      const li = document.createElement("li");
      li.className = "px-2 py-4 text-center text-sm text-slate-500";
      li.textContent = dkpHistoryPlayerId ? "Keine Einträge für diesen Spieler." : "Noch keine Einträge im Verlauf.";
      list.appendChild(li);
      return;
    }
    const reversed = dkpReversedMap();
    const officer = isOfficer();
    dkpHistory.forEach(function (row) {
      if (!row) return;
      const li = document.createElement("li");
      const isReversed = !!(row.id && reversed[row.id]);
      li.className = "rounded-xl border border-slate-800 bg-slate-950 p-3" + (isReversed ? " opacity-70" : "");
      const top = document.createElement("div");
      top.className = "flex flex-wrap items-center gap-2";
      const date = document.createElement("span");
      date.className = "text-xs text-slate-400";
      date.textContent = formatDkpStamp(row.created_at);
      const kind = document.createElement("span");
      kind.className = "rounded-full border border-amber-500/40 px-2 py-0.5 text-xs font-bold text-amber-300";
      kind.textContent = dkpKindLabel(row);
      top.append(date, kind);
      if (isReversed) {
        const badge = document.createElement("span");
        badge.className = "rounded-full border border-slate-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-400";
        badge.textContent = "storniert";
        top.appendChild(badge);
      }
      li.appendChild(top);
      if (isDkpUuid(row.player_id)) {
        const playerBtn = document.createElement("button");
        playerBtn.type = "button";
        playerBtn.dataset.action = "dkp-filter-player";
        playerBtn.dataset.id = row.player_id;
        playerBtn.className = "mt-2 inline-flex min-h-11 items-center text-left text-sm font-bold text-white hover:text-amber-300";
        playerBtn.textContent = row.char_name || "Spieler";
        li.appendChild(playerBtn);
      } else {
        li.appendChild(dkpLine("Spieler", row.char_name || "—"));
      }
      li.appendChild(dkpLine("Was", dkpWhatText(row) || "—"));
      const points = document.createElement("p");
      points.className = "mt-1 text-sm";
      const dkpChange = Number(row.dkp_change) || 0;
      const overChange = Number(row.overflow_change) || 0;
      const dkpSpan = document.createElement("span");
      dkpSpan.className = "font-bold " + (dkpChange > 0 ? "text-emerald-400" : dkpChange < 0 ? "text-red-400" : "text-slate-400");
      dkpSpan.textContent = dkpSigned(dkpChange);
      points.appendChild(dkpSpan);
      if (overChange !== 0) {
        const overSpan = document.createElement("span");
        overSpan.className = "ml-2 text-xs font-semibold " + (overChange > 0 ? "text-emerald-300" : "text-red-300");
        overSpan.textContent = dkpSigned(overChange) + " Überstunden";
        points.appendChild(overSpan);
      }
      li.appendChild(points);
      li.appendChild(dkpLine("Grund", row.reason || "—", true));
      li.appendChild(dkpLine("Offizier", row.officer_name || "—", true));
      if (row.kind === "reversal") {
        const note = document.createElement("p");
        note.className = "mt-1 text-xs text-slate-400";
        const original = dkpHistory.find(function (item) { return item && item.id === row.reverses_id; });
        if (!original) {
          note.textContent = "Storno einer älteren Buchung.";
        } else {
          const what = dkpWhatText(original);
          note.textContent = "Storno von " + dkpKindLabel(original) + (what ? " „" + what + "“" : "") + ", " + formatDkpStamp(original.created_at) + ".";
        }
        li.appendChild(note);
      }
      const reversible = officer && isDkpUuid(row.id) && !isReversed && (row.kind === "activity" || row.kind === "item" || row.kind === "adjustment" || row.kind === "transfer");
      if (reversible && dkpReverseId === row.id) {
        li.appendChild(buildDkpReverseForm());
      } else if (reversible) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = "dkp-reverse";
        button.dataset.id = row.id;
        button.dataset.dkpWrite = "1";
        button.className = "mt-2 inline-flex min-h-11 items-center justify-center rounded-xl border border-red-900/60 bg-slate-950 px-3 py-2 text-sm font-bold text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50";
        button.textContent = "Stornieren";
        button.disabled = dkpBusy;
        li.appendChild(button);
      }
      list.appendChild(li);
    });
    if (dkpReverseId) {
      const input = document.getElementById("dkp-reverse-reason");
      if (input) input.focus();
    }
  }

  function buildDkpReverseForm() {
    const form = document.createElement("form");
    form.id = "dkp-reverse-form";
    form.setAttribute("novalidate", "");
    form.className = "mt-3 space-y-2 rounded-xl border border-slate-800 p-3";
    const label = document.createElement("label");
    label.htmlFor = "dkp-reverse-reason";
    label.className = "mb-1 block text-xs font-semibold text-slate-400";
    label.textContent = "Grund für die Stornierung";
    const input = document.createElement("input");
    input.id = "dkp-reverse-reason";
    input.name = "reason";
    input.type = "text";
    input.maxLength = 300;
    input.autocomplete = "off";
    input.required = true;
    input.className = DKP_INPUT;
    const actions = document.createElement("div");
    actions.className = "flex flex-col gap-2 sm:flex-row";
    const save = document.createElement("button");
    save.type = "submit";
    save.dataset.dkpWrite = "1";
    save.className = "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";
    save.textContent = "Stornierung speichern";
    save.disabled = dkpBusy;
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.dataset.action = "dkp-reverse-cancel";
    cancel.className = "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 sm:w-auto";
    cancel.textContent = "Abbrechen";
    actions.append(save, cancel);
    form.append(label, input, actions);
    return form;
  }

  function playerSelectEntries(activeOnly) {
    return sortedDkpPlayers(activeOnly).map(function (player) {
      return {
        value: player.id,
        label: (player.char_name || "Spieler") + " · " + dkpNum(player.dkp) + " / 500 DKP · " + dkpNum(player.overflow) + " Überstunden",
      };
    });
  }

  function syncDkpActivityPoints(force) {
    const select = document.getElementById("dkp-activity-type");
    const input = document.getElementById("dkp-activity-points");
    if (!select || !input) return;
    const type = dkpById(dkpActivityTypes, select.value);
    const next = type ? String(type.points) : "";
    if (force || input.value.trim() === "" || input.value === dkpPointsStamp) input.value = next;
    dkpPointsStamp = next;
  }

  function renderDkpHints() {
    const transfer = dkpPlayerById((document.getElementById("dkp-transfer-player") || {}).value);
    const transferText = document.getElementById("dkp-transfer-balance");
    if (transferText) {
      transferText.textContent = transfer
        ? transfer.char_name + ": " + dkpNum(transfer.dkp) + " / 500 DKP, " + dkpNum(transfer.overflow) + " Überstunden."
        : "Kein Spieler ausgewählt.";
    }
    const item = dkpById(dkpItems, (document.getElementById("dkp-item-id") || {}).value);
    const itemHint = document.getElementById("dkp-item-hint");
    if (itemHint) {
      if (!item) itemHint.textContent = "Kein Gegenstand ausgewählt.";
      else itemHint.textContent = item.name + " kostet " + dkpNum(item.cost) + " DKP." + (item.note ? " " + item.note : "");
    }
    const itemPlayer = dkpPlayerById((document.getElementById("dkp-item-player") || {}).value);
    const itemBalance = document.getElementById("dkp-item-balance");
    if (itemBalance) {
      itemBalance.textContent = itemPlayer
        ? itemPlayer.char_name + " hat " + dkpNum(itemPlayer.dkp) + " / 500 DKP."
        : "Kein Spieler ausgewählt.";
    }
    const adjustPlayer = dkpPlayerById((document.getElementById("dkp-adjust-player") || {}).value);
    const adjustBalance = document.getElementById("dkp-adjust-balance");
    if (adjustBalance) {
      adjustBalance.textContent = adjustPlayer
        ? adjustPlayer.char_name + ": " + dkpNum(adjustPlayer.dkp) + " / 500 DKP, " + dkpNum(adjustPlayer.overflow) + " Überstunden."
        : "Kein Spieler ausgewählt.";
    }
  }

  function renderDkpAwardPlayers() {
    const box = document.getElementById("dkp-activity-players");
    if (!box) return;
    box.replaceChildren();
    const players = visibleAwardPlayers();
    if (!players.length) {
      const empty = document.createElement("p");
      empty.className = "px-2 py-3 text-sm text-slate-500";
      if (sortedDkpPlayers(true).length) {
        empty.textContent = "Kein Spieler passt zur Suche.";
        box.appendChild(empty);
      } else {
        empty.textContent = "Keine aktiven Spieler. Übernimm zuerst Mitglieder aus der Gildenliste.";
        box.appendChild(empty);
        box.appendChild(dkpJumpImportButton());
      }
      updateDkpSelectedCount();
      return;
    }
    players.forEach(function (player) {
      const label = document.createElement("label");
      label.className = "flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm text-slate-200 hover:bg-slate-900";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "dkp-award-player";
      input.dataset.id = player.id;
      input.checked = !!dkpSelectedIds[player.id];
      input.className = "h-4 w-4 shrink-0 accent-amber-500";
      const text = document.createElement("span");
      text.textContent = (player.char_name || "Spieler") + " · " + dkpNum(player.dkp) + " DKP · " + dkpNum(player.overflow) + " Überstunden";
      label.append(input, text);
      box.appendChild(label);
    });
    updateDkpSelectedCount();
  }

  function dkpAdminButton(action, id, label, danger) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = id;
    if (danger) button.dataset.dkpWrite = "1";
    button.className = danger
      ? "inline-flex min-h-11 items-center justify-center rounded-xl border border-red-900/60 px-3 py-2 text-sm font-bold text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
      : "inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700";
    button.textContent = label;
    button.disabled = danger && dkpBusy;
    return button;
  }

  function dkpAdminShell(title, meta) {
    const li = document.createElement("li");
    li.className = "flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center sm:justify-between";
    const body = document.createElement("div");
    body.className = "min-w-0";
    const heading = document.createElement("p");
    heading.className = "font-bold text-white break-words";
    heading.textContent = title;
    body.appendChild(heading);
    meta.forEach(function (line) {
      const p = document.createElement("p");
      p.className = "text-sm text-slate-400 break-words";
      p.textContent = line;
      body.appendChild(p);
    });
    li.appendChild(body);
    return li;
  }

  function renderDkpOfficer() {
    fillDkpSelect(
      document.getElementById("dkp-activity-type"),
      sortedDkpTypes(true).map(function (row) {
        return { value: row.id, label: (row.name || "Aktivität") + " (" + dkpNum(row.points) + " DKP)" };
      }),
      sortedDkpTypes(true).length ? "" : "Keine aktive Aktivität"
    );
    fillDkpSelect(document.getElementById("dkp-transfer-player"), playerSelectEntries(true), "Spieler wählen");
    fillDkpSelect(document.getElementById("dkp-item-player"), playerSelectEntries(true), "Spieler wählen");
    fillDkpSelect(document.getElementById("dkp-adjust-player"), playerSelectEntries(true), "Spieler wählen");
    fillDkpSelect(
      document.getElementById("dkp-item-id"),
      sortedDkpItems(true).map(function (row) {
        return { value: row.id, label: (row.name || "Gegenstand") + " · " + dkpNum(row.cost) + " DKP" };
      }),
      "Gegenstand wählen"
    );
    const historySelect = document.getElementById("dkp-history-player");
    const historyEntries = sortedDkpPlayers(false).map(function (player) {
      return { value: player.id, label: (player.char_name || "Spieler") + (player.active ? "" : " (inaktiv)") };
    });
    fillDkpSelect(historySelect, historyEntries, "Alle Spieler");
    if (historySelect && isDkpUuid(dkpHistoryPlayerId)) historySelect.value = dkpHistoryPlayerId;
    const memberSelect = document.getElementById("dkp-player-member");
    const currentMember = memberSelect ? memberSelect.value : "";
    const members = foreverMembers.filter(function (member) {
      return member && isDkpUuid(member.id);
    }).slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""), "de");
    }).map(function (member) {
      return { value: member.id, label: member.name || "Mitglied" };
    });
    if (isDkpUuid(currentMember) && !members.some(function (entry) { return entry.value === currentMember; })) {
      members.push({ value: currentMember, label: "Verknüpftes Mitglied" });
    }
    fillDkpSelect(memberSelect, members, "Kein Gildenmitglied");
    syncDkpActivityPoints(false);
    renderDkpAwardPlayers();
    renderDkpImport();
    renderDkpHints();
    if (isOfficer() && canReadDkp()) loadApprovedProfiles(false);
    renderDkpPlayerPicker();
    renderDkpPlayerAdmin();
    renderDkpTypeAdmin();
    renderDkpItemAdmin();
    showDkpTab(dkpOfficerTab);
  }

  function renderDkpPlayerAdmin() {
    const list = document.getElementById("dkp-player-list");
    if (!list) return;
    list.replaceChildren();
    const players = sortedDkpPlayers(false);
    if (!players.length) {
      const li = document.createElement("li");
      li.className = "text-sm text-slate-500";
      li.textContent = "Noch keine Spieler angelegt.";
      list.appendChild(li);
      return;
    }
    players.forEach(function (player) {
      const li = dkpAdminShell(player.char_name || "Spieler", [
        dkpNum(player.dkp) + " / 500 DKP · " + dkpNum(player.overflow) + " Überstunden · " + (player.active ? "aktiv" : "inaktiv"),
      ]);
      const actions = document.createElement("div");
      actions.className = "flex flex-col gap-2 sm:flex-row";
      actions.append(
        dkpAdminButton("dkp-edit-player", player.id, "Ändern", false),
        dkpAdminButton("dkp-delete-player", player.id, "Löschen", true)
      );
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function renderDkpTypeAdmin() {
    const list = document.getElementById("dkp-type-list");
    if (!list) return;
    list.replaceChildren();
    const rows = sortedDkpTypes(false);
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "text-sm text-slate-500";
      li.textContent = "Noch keine Aktivitäten angelegt.";
      list.appendChild(li);
      return;
    }
    rows.forEach(function (row) {
      const li = dkpAdminShell(row.name || "Aktivität", [
        dkpNum(row.points) + " DKP · Reihenfolge " + dkpNum(row.sort_order) + " · " + (row.active ? "aktiv" : "inaktiv"),
      ]);
      const actions = document.createElement("div");
      actions.className = "flex flex-col gap-2 sm:flex-row";
      actions.append(
        dkpAdminButton("dkp-edit-type", row.id, "Ändern", false),
        dkpAdminButton("dkp-delete-type", row.id, "Löschen", true)
      );
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function renderDkpItemAdmin() {
    const list = document.getElementById("dkp-item-list");
    if (!list) return;
    list.replaceChildren();
    const rows = sortedDkpItems(false);
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "text-sm text-slate-500";
      li.textContent = "Noch keine Gegenstände angelegt.";
      list.appendChild(li);
      return;
    }
    rows.forEach(function (row) {
      const lines = [dkpNum(row.cost) + " DKP · " + (row.active ? "aktiv" : "inaktiv")];
      if (row.note) lines.push(row.note);
      const li = dkpAdminShell(row.name || "Gegenstand", lines);
      const actions = document.createElement("div");
      actions.className = "flex flex-col gap-2 sm:flex-row";
      actions.append(
        dkpAdminButton("dkp-edit-item", row.id, "Ändern", false),
        dkpAdminButton("dkp-delete-item", row.id, "Löschen", true)
      );
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function renderDkp() {
    syncDkpChrome();
    renderDkpScores();
    renderDkpHistory();
    renderDkpOfficer();
    if (dkpBusy) setDkpBusy(true);
  }

  function showDkpTab(name) {
    const known = { import: 1, activity: 1, transfer: 1, item: 1, adjust: 1, players: 1, types: 1, items: 1 };
    if (!known[name]) name = "import";
    dkpOfficerTab = name;
    document.querySelectorAll("[data-action='dkp-tab']").forEach(function (tab) {
      const on = tab.dataset.tab === name;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.className = on ? DKP_TAB_ON : DKP_TAB_OFF;
    });
    Object.keys(known).forEach(function (id) {
      const panel = document.getElementById("dkp-panel-" + id);
      if (panel) panel.hidden = id !== name;
    });
  }

  function handleDkpChange(event) {
    const target = event.target;
    if (!target) return false;
    const tracked = target.id || target.name === "dkp-award-player" || target.name === "dkp-import-player";
    if (!tracked) return false;
    if (dkpBusy && (target.id === "dkp-import-source" || target.name === "dkp-import-player")) return true;
    if (target.id === "dkp-show-inactive") {
      dkpShowInactive = !!target.checked;
      renderDkpScores();
      return true;
    }
    if (target.id === "dkp-history-player") {
      dkpHistoryPlayerId = isDkpUuid(target.value) ? target.value : "";
      if (!isDkpUuid(target.value)) target.value = "";
      reloadDkpHistory();
      return true;
    }
    if (target.id === "dkp-show-setup") {
      dkpShowSetup = !!target.checked;
      reloadDkpHistory();
      return true;
    }
    if (target.id === "dkp-activity-type") {
      syncDkpActivityPoints(true);
      return true;
    }
    if (target.name === "dkp-award-player") {
      const id = target.dataset.id;
      if (!isDkpUuid(id)) return true;
      if (target.checked) dkpSelectedIds[id] = true;
      else delete dkpSelectedIds[id];
      updateDkpSelectedCount();
      return true;
    }
    if (target.name === "dkp-import-player") {
      const key = target.dataset.key || "";
      if (!key) return true;
      if (target.checked) dkpImportSelected[key] = true;
      else delete dkpImportSelected[key];
      updateDkpImportCount();
      return true;
    }
    if (target.id === "dkp-import-source") {
      const value = target.value === "retail" || target.value === "poll" ? target.value : "forever";
      dkpImportSource = value === "poll" && !foreverPollReadable ? "forever" : value;
      renderDkpImport();
      return true;
    }
    if (target.id === "dkp-transfer-player" || target.id === "dkp-item-player" || target.id === "dkp-adjust-player" || target.id === "dkp-item-id") {
      renderDkpHints();
      return true;
    }
    return false;
  }

  function filterDkpHistoryToPlayer(id) {
    if (!isDkpUuid(id)) return;
    dkpHistoryPlayerId = id;
    const select = document.getElementById("dkp-history-player");
    if (select) select.value = id;
    reloadDkpHistory();
    const history = document.getElementById("dkp-history");
    if (history) history.scrollIntoView({ behavior: motion(), block: "start" });
  }

  function selectAllDkpPlayers() {
    visibleAwardPlayers().forEach(function (player) {
      dkpSelectedIds[player.id] = true;
    });
    renderDkpAwardPlayers();
  }

  function selectNoDkpPlayers() {
    dkpSelectedIds = {};
    renderDkpAwardPlayers();
  }

  function suggestDkpName(raw) {
    let text = String(raw == null ? "" : raw).trim();
    const paren = text.indexOf("(");
    if (paren !== -1) text = text.slice(0, paren);
    text = text.trim().replace(/\s+\d+$/, "").trim();
    if (text.length > 40) text = text.slice(0, 40).trim();
    return text;
  }

  function dkpNameKey(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function dkpMemberById(memberId) {
    if (!isDkpUuid(memberId)) return null;
    const lists = [foreverMembers, retailMembers];
    for (let i = 0; i < lists.length; i += 1) {
      const list = lists[i];
      for (let j = 0; j < list.length; j += 1) {
        if (list[j] && list[j].id === memberId) return list[j];
      }
    }
    return null;
  }

  function dkpMemberRank(memberId) {
    const member = dkpMemberById(memberId);
    if (!member || member.rank == null) return "";
    return String(member.rank).trim();
  }

  function dkpNameTaken(name) {
    const key = dkpNameKey(name);
    if (!key) return false;
    return dkpPlayers.some(function (player) {
      return player && dkpNameKey(player.char_name) === key;
    });
  }

  function dkpMemberTaken(memberId) {
    if (!isDkpUuid(memberId)) return false;
    return dkpPlayers.some(function (player) {
      return player && String(player.member_id || "") === memberId;
    });
  }

  function dkpImportCurrentName(entry) {
    if (!entry) return "";
    if (Object.prototype.hasOwnProperty.call(dkpImportNames, entry.key)) {
      return String(dkpImportNames[entry.key] == null ? "" : dkpImportNames[entry.key]).trim();
    }
    return suggestDkpName(entry.sourceName);
  }

  function dkpImportLocked(entry) {
    if (!entry) return false;
    if (entry.memberId && dkpMemberTaken(entry.memberId)) return true;
    if (dkpNameTaken(entry.sourceName)) return true;
    if (dkpNameTaken(suggestDkpName(entry.sourceName))) return true;
    return false;
  }

  function dkpImportBlocked(entry) {
    return dkpImportLocked(entry) || dkpNameTaken(dkpImportCurrentName(entry));
  }

  function dkpImportEntries() {
    if (dkpImportSource === "poll") {
      if (!foreverPollReadable) return [];
      return foreverPollRows.filter(function (row) {
        return row && isDkpUuid(row.id);
      }).map(function (row) {
        const detail = [row.main_class, row.main_role].filter(Boolean).join(" · ");
        return {
          key: "poll:" + row.id,
          sourceName: row.char_name || "",
          detail: detail,
          memberId: null,
        };
      });
    }
    const list = dkpImportSource === "retail" ? retailMembers : foreverMembers;
    return list.filter(function (member) {
      return member && isDkpUuid(member.id);
    }).map(function (member) {
      return {
        key: member.id,
        sourceName: member.name || "",
        detail: member.rank ? String(member.rank).trim() : "",
        memberId: member.id,
      };
    });
  }

  function dkpImportEntryByKey(key) {
    const entries = dkpImportEntries();
    for (let i = 0; i < entries.length; i += 1) {
      if (entries[i].key === key) return entries[i];
    }
    return null;
  }

  function visibleDkpImportEntries() {
    const query = dkpImportQuery.trim().toLocaleLowerCase("de");
    return dkpImportEntries().filter(function (entry) {
      if (!query) return true;
      const hay = [entry.sourceName, entry.detail, dkpImportCurrentName(entry)].join(" ").toLocaleLowerCase("de");
      return hay.indexOf(query) !== -1;
    });
  }

  function pruneDkpImportSelection() {
    dkpImportEntries().forEach(function (entry) {
      if (dkpImportSelected[entry.key] && dkpImportBlocked(entry)) delete dkpImportSelected[entry.key];
    });
  }

  function updateDkpImportCount() {
    const el = document.getElementById("dkp-import-count");
    if (!el) return;
    let count = 0;
    dkpImportEntries().forEach(function (entry) {
      if (dkpImportSelected[entry.key]) count += 1;
    });
    el.textContent = count === 1 ? "1 ausgewählt" : count + " ausgewählt";
  }

  function syncDkpImportSource() {
    const select = document.getElementById("dkp-import-source");
    if (!select) return;
    const options = [
      { value: "forever", label: "Forever-Mitglieder" },
      { value: "retail", label: "Retail-Mitglieder" },
    ];
    if (foreverPollReadable) options.push({ value: "poll", label: "Forever-Umfrage" });
    if (dkpImportSource === "poll" && !foreverPollReadable) dkpImportSource = "forever";
    if (dkpImportSource !== "forever" && dkpImportSource !== "retail" && dkpImportSource !== "poll") dkpImportSource = "forever";
    select.replaceChildren();
    options.forEach(function (option) {
      select.appendChild(dkpOption(option.value, option.label));
    });
    select.value = dkpImportSource;
  }

  function dkpJumpImportButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "dkp-open-import";
    button.className = "mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-extrabold text-slate-950 transition hover:bg-amber-400 sm:w-auto";
    button.textContent = "Mitglieder übernehmen";
    return button;
  }

  function syncDkpImportRow(field) {
    const key = field.dataset.importName;
    const entry = dkpImportEntryByKey(key);
    const row = field.closest("[data-import-row]");
    if (!entry || !row) return;
    const locked = dkpImportLocked(entry);
    const blocked = locked || dkpNameTaken(String(field.value || "").trim());
    const box = row.querySelector("input[name='dkp-import-player']");
    if (box) {
      box.disabled = blocked || dkpBusy;
      if (blocked) {
        box.checked = false;
        delete dkpImportSelected[key];
      }
    }
    field.disabled = locked || dkpBusy;
    let note = row.querySelector("[data-import-note]");
    if (blocked) {
      if (!note) {
        note = document.createElement("span");
        note.dataset.importNote = "1";
        note.className = "mt-1 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-400";
        const wrap = row.querySelector("[data-import-text]");
        if (wrap) wrap.appendChild(note);
      }
      note.textContent = "schon im DKP";
    } else if (note) {
      note.remove();
    }
    updateDkpImportCount();
  }

  function renderDkpImport() {
    syncDkpImportSource();
    const box = document.getElementById("dkp-import-list");
    if (!box) return;
    pruneDkpImportSelection();
    const entries = visibleDkpImportEntries();
    box.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "px-2 py-3 text-sm text-slate-500";
      empty.textContent = dkpImportEntries().length ? "Kein Eintrag passt zur Suche." : "Keine Einträge in dieser Quelle.";
      box.appendChild(empty);
      updateDkpImportCount();
      return;
    }
    entries.forEach(function (entry) {
      const locked = dkpImportLocked(entry);
      const blocked = dkpImportBlocked(entry);
      const stored = Object.prototype.hasOwnProperty.call(dkpImportNames, entry.key);
      const row = document.createElement("div");
      row.dataset.importRow = "1";
      row.className = "flex flex-col gap-2 rounded-lg px-2 py-2 sm:flex-row sm:items-center" + (locked ? " opacity-70" : "");
      const label = document.createElement("label");
      label.className = "flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm text-slate-200";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "dkp-import-player";
      input.dataset.key = entry.key;
      input.checked = !!dkpImportSelected[entry.key] && !blocked;
      input.disabled = blocked || dkpBusy;
      input.className = "h-4 w-4 shrink-0 accent-amber-500";
      const textWrap = document.createElement("span");
      textWrap.dataset.importText = "1";
      textWrap.className = "min-w-0";
      const nameEl = document.createElement("span");
      nameEl.className = "block break-words font-semibold text-white";
      nameEl.textContent = entry.sourceName || "Ohne Name";
      textWrap.appendChild(nameEl);
      if (entry.detail) {
        const detail = document.createElement("span");
        detail.className = "block break-words text-xs text-slate-400";
        detail.textContent = entry.detail;
        textWrap.appendChild(detail);
      }
      if (blocked) {
        const badge = document.createElement("span");
        badge.dataset.importNote = "1";
        badge.className = "mt-1 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-xs font-bold text-slate-400";
        badge.textContent = "schon im DKP";
        textWrap.appendChild(badge);
      }
      label.append(input, textWrap);
      const nameField = document.createElement("input");
      nameField.type = "text";
      nameField.maxLength = 40;
      nameField.autocomplete = "off";
      nameField.placeholder = "DKP-Name";
      nameField.value = stored ? String(dkpImportNames[entry.key] == null ? "" : dkpImportNames[entry.key]) : suggestDkpName(entry.sourceName);
      nameField.disabled = locked || dkpBusy;
      nameField.dataset.importName = entry.key;
      nameField.setAttribute("aria-label", "DKP-Name für " + (entry.sourceName || "Eintrag"));
      nameField.className = DKP_INPUT + " sm:max-w-xs";
      row.append(label, nameField);
      box.appendChild(row);
    });
    updateDkpImportCount();
  }

  function selectAllDkpImport() {
    if (dkpBusy) return;
    visibleDkpImportEntries().forEach(function (entry) {
      if (!dkpImportBlocked(entry)) dkpImportSelected[entry.key] = true;
    });
    renderDkpImport();
  }

  function selectNoDkpImport() {
    if (dkpBusy) return;
    dkpImportEntries().forEach(function (entry) {
      delete dkpImportSelected[entry.key];
    });
    renderDkpImport();
  }

  function openDkpImport() {
    if (!isOfficer()) return;
    showDkpTab("import");
    const target = document.getElementById("dkp-import");
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: motion(), block: "start" });
    }
    const source = document.getElementById("dkp-import-source");
    if (source && typeof source.focus === "function") source.focus();
  }

  function submitDkpImport() {
    if (dkpBusy) return;
    if (!isOfficer()) {
      const text = "Nur Offiziere und Administratoren dürfen DKP verwalten.";
      setDkpStatus("dkp-import-status", text);
      notify(text, "error");
      return;
    }
    pruneDkpImportSelection();
    updateDkpImportCount();
    const chosen = dkpImportEntries().filter(function (entry) {
      return !!dkpImportSelected[entry.key] && !dkpImportBlocked(entry);
    });
    if (!chosen.length) {
      setDkpStatus("dkp-import-status", "Bitte mindestens einen Eintrag auswählen.");
      return;
    }
    const preview = chosen.map(function (entry) {
      return dkpImportCurrentName(entry) || entry.sourceName || "Eintrag";
    });
    const question = chosen.length === 1 ? "1 Mitglied ins DKP übernehmen?" : chosen.length + " Mitglieder ins DKP übernehmen?";
    const shown = preview.length <= 8 ? preview.join(", ") : preview.slice(0, 8).join(", ") + " und " + (preview.length - 8) + " weitere";
    if (!window.confirm(question + "\n\n" + shown)) return;
    setDkpBusy(true);
    setDkpStatus("dkp-import-status", "");
    const successes = [];
    const errors = [];
    const savedKeys = [];
    let chain = Promise.resolve();
    chosen.forEach(function (entry) {
      chain = chain.then(function () {
        const name = dkpImportCurrentName(entry);
        const shownName = name || entry.sourceName || "Eintrag";
        if (name.length < 2 || name.length > 40) {
          errors.push(shownName + ": Bitte einen Namen mit 2 bis 40 Zeichen eingeben.");
          return;
        }
        return dkpRpc("dkp_save_player", {
          p_char_name: name,
          p_member_id: entry.memberId,
          p_active: true,
        }).then(function () {
          successes.push(name);
          savedKeys.push(entry.key);
        }).catch(function (error) {
          errors.push(shownName + ": " + dkpErrorText(error));
        });
      });
    });
    chain.then(function () {
      savedKeys.forEach(function (key) {
        delete dkpImportSelected[key];
      });
      return loadDkp();
    }).catch(function () {
      return null;
    }).then(function () {
      let text = successes.length + " übernommen";
      if (errors.length) text += ", " + errors.length + " Fehler: " + errors.join("; ");
      setDkpBusy(false);
      renderDkpImport();
      setDkpStatus("dkp-import-status", text);
      notify(text, errors.length ? "error" : "info");
    });
  }

  function resetDkpPlayerForm() {
    const form = document.getElementById("dkp-player-form");
    if (form) form.reset();
    const id = document.getElementById("dkp-player-id");
    if (id) id.value = "";
    const active = document.getElementById("dkp-player-active");
    if (active) active.checked = true;
    const submit = document.getElementById("dkp-player-submit");
    if (submit) submit.textContent = "Spieler anlegen";
    const manual = document.getElementById("dkp-player-manual");
    if (manual) manual.open = false;
    dkpPickQuery = "";
    dkpPickSelected = {};
    const search = document.getElementById("dkp-player-pick-search");
    if (search) search.value = "";
    renderDkpPlayerPicker();
  }

  function resetDkpTypeForm() {
    const form = document.getElementById("dkp-type-form");
    if (form) form.reset();
    const id = document.getElementById("dkp-type-id");
    if (id) id.value = "";
    const order = document.getElementById("dkp-type-order");
    if (order) order.value = "0";
    const active = document.getElementById("dkp-type-active");
    if (active) active.checked = true;
    const submit = document.getElementById("dkp-type-submit");
    if (submit) submit.textContent = "Aktivität anlegen";
  }

  function resetDkpItemForm() {
    const form = document.getElementById("dkp-item-admin-form");
    if (form) form.reset();
    const id = document.getElementById("dkp-item-admin-id");
    if (id) id.value = "";
    const active = document.getElementById("dkp-item-admin-active");
    if (active) active.checked = true;
    const submit = document.getElementById("dkp-item-admin-submit");
    if (submit) submit.textContent = "Gegenstand anlegen";
  }

  function editDkpPlayer(id) {
    const player = dkpPlayerById(id);
    if (!player) return;
    showDkpTab("players");
    const hidden = document.getElementById("dkp-player-id");
    const name = document.getElementById("dkp-player-name");
    const member = document.getElementById("dkp-player-member");
    const active = document.getElementById("dkp-player-active");
    const submit = document.getElementById("dkp-player-submit");
    if (hidden) hidden.value = player.id;
    if (name) name.value = player.char_name || "";
    if (member) {
      if (isDkpUuid(player.member_id) && !Array.prototype.some.call(member.options, function (option) { return option.value === player.member_id; })) {
        member.appendChild(dkpOption(player.member_id, "Verknüpftes Mitglied"));
      }
      member.value = isDkpUuid(player.member_id) ? player.member_id : "";
    }
    if (active) active.checked = !!player.active;
    if (submit) submit.textContent = "Änderungen speichern";
    const manual = document.getElementById("dkp-player-manual");
    if (manual) manual.open = true;
    if (name) name.focus();
    renderDkpPlayerPicker();
  }

  function editDkpType(id) {
    const row = dkpById(dkpActivityTypes, id);
    if (!row) return;
    showDkpTab("types");
    const hidden = document.getElementById("dkp-type-id");
    const name = document.getElementById("dkp-type-name");
    const points = document.getElementById("dkp-type-points");
    const order = document.getElementById("dkp-type-order");
    const active = document.getElementById("dkp-type-active");
    const submit = document.getElementById("dkp-type-submit");
    if (hidden) hidden.value = row.id;
    if (name) name.value = row.name || "";
    if (points) points.value = String(row.points);
    if (order) order.value = String(row.sort_order);
    if (active) active.checked = !!row.active;
    if (submit) submit.textContent = "Änderungen speichern";
    if (name) name.focus();
  }

  function editDkpItem(id) {
    const row = dkpById(dkpItems, id);
    if (!row) return;
    showDkpTab("items");
    const hidden = document.getElementById("dkp-item-admin-id");
    const name = document.getElementById("dkp-item-admin-name");
    const cost = document.getElementById("dkp-item-admin-cost");
    const note = document.getElementById("dkp-item-admin-note");
    const active = document.getElementById("dkp-item-admin-active");
    const submit = document.getElementById("dkp-item-admin-submit");
    if (hidden) hidden.value = row.id;
    if (name) name.value = row.name || "";
    if (cost) cost.value = String(row.cost);
    if (note) note.value = row.note || "";
    if (active) active.checked = !!row.active;
    if (submit) submit.textContent = "Änderungen speichern";
    if (name) name.focus();
  }

  function handleDkpAction(action, el) {
    if (action === "dkp-tab") {
      showDkpTab(el.dataset.tab || "activity");
      return;
    }
    if (action === "dkp-sort") {
      const key = el.dataset.sort === "name" || el.dataset.sort === "overflow" ? el.dataset.sort : "dkp";
      if (dkpSort.key === key) dkpSort.dir = dkpSort.dir === "asc" ? "desc" : "asc";
      else dkpSort = { key: key, dir: key === "name" ? "asc" : "desc" };
      renderDkpScores();
      return;
    }
    if (action === "dkp-filter-player") {
      filterDkpHistoryToPlayer(el.dataset.id || "");
      return;
    }
    if (action === "dkp-select-all") {
      selectAllDkpPlayers();
      return;
    }
    if (action === "dkp-select-none") {
      selectNoDkpPlayers();
      return;
    }
    if (action === "dkp-import-all") {
      selectAllDkpImport();
      return;
    }
    if (action === "dkp-import-none") {
      selectNoDkpImport();
      return;
    }
    if (action === "dkp-import-save") {
      submitDkpImport();
      return;
    }
    if (action === "dkp-open-import") {
      openDkpImport();
      return;
    }
    if (action === "dkp-history-more") {
      loadMoreDkpHistory();
      return;
    }
    if (action === "dkp-reverse") {
      const id = el.dataset.id || "";
      if (!isDkpUuid(id) || dkpBusy) return;
      if (!window.confirm("Diesen Verlaufseintrag wirklich stornieren?")) return;
      dkpReverseId = id;
      renderDkpHistory();
      return;
    }
    if (action === "dkp-reverse-cancel") {
      dkpReverseId = "";
      renderDkpHistory();
      return;
    }
    if (action === "dkp-player-cancel") {
      resetDkpPlayerForm();
      setDkpStatus("dkp-player-status", "");
      return;
    }
    if (action === "dkp-type-cancel") {
      resetDkpTypeForm();
      setDkpStatus("dkp-type-status", "");
      return;
    }
    if (action === "dkp-item-cancel") {
      resetDkpItemForm();
      setDkpStatus("dkp-item-admin-status", "");
      return;
    }
    if (action === "dkp-edit-player") {
      editDkpPlayer(el.dataset.id || "");
      return;
    }
    if (action === "dkp-edit-type") {
      editDkpType(el.dataset.id || "");
      return;
    }
    if (action === "dkp-edit-item") {
      editDkpItem(el.dataset.id || "");
      return;
    }
    if (action === "dkp-delete-player") {
      deleteDkpPlayer(el.dataset.id || "");
      return;
    }
    if (action === "dkp-delete-type") {
      deleteDkpType(el.dataset.id || "");
      return;
    }
    if (action === "dkp-delete-item") {
      deleteDkpItem(el.dataset.id || "");
    }
  }

  function dkpNamePreview(players) {
    const names = players.map(function (player) { return player.char_name || "Spieler"; });
    if (names.length <= 8) return names.join(", ");
    return names.slice(0, 8).join(", ") + " und " + (names.length - 8) + " weitere";
  }

  function dkpAwardSummary(rows) {
    const list = Array.isArray(rows) ? rows : [];
    const count = list.length;
    let text = count + (count === 1 ? " Spieler hat Punkte bekommen." : " Spieler haben Punkte bekommen.");
    const overtime = list.filter(function (row) { return Number(row.overflow_change) > 0; });
    if (!overtime.length) {
      text += " Niemand hat Punkte auf das Überstundenkonto bekommen.";
    } else {
      text += " Überstunden: " + overtime.map(function (row) {
        return (row.char_name || "Spieler") + " " + dkpSigned(row.overflow_change);
      }).join(", ") + ".";
    }
    return text;
  }

  function dkpBalanceSummary(row, lead) {
    if (!row) return lead;
    let text = lead;
    if (Number(row.overflow_change)) text += " Überstunden " + dkpSigned(row.overflow_change) + ".";
    text += " Neuer Stand: " + dkpNum(row.dkp) + " / 500 DKP, " + dkpNum(row.overflow) + " Überstunden.";
    return text;
  }

  function submitDkpActivity() {
    const type = dkpById(dkpActivityTypes, (document.getElementById("dkp-activity-type") || {}).value);
    if (!type) {
      setDkpStatus("dkp-activity-status", "Bitte eine Aktivität auswählen.");
      return;
    }
    const pointsInput = readDkpInt((document.getElementById("dkp-activity-points") || {}).value);
    if (!pointsInput.empty && (pointsInput.invalid || pointsInput.value < 1 || pointsInput.value > 500)) {
      setDkpStatus("dkp-activity-status", "Die Punkte müssen zwischen 1 und 500 liegen.");
      return;
    }
    const reason = dkpOptionalText((document.getElementById("dkp-activity-reason") || {}).value, 300);
    if (reason.error) {
      setDkpStatus("dkp-activity-status", "Der Grund ist zu lang (höchstens 300 Zeichen).");
      return;
    }
    const chosen = sortedDkpPlayers(true).filter(function (player) { return !!dkpSelectedIds[player.id]; });
    if (!chosen.length) {
      setDkpStatus("dkp-activity-status", "Bitte mindestens einen Spieler auswählen.");
      return;
    }
    if (chosen.length > 100) {
      setDkpStatus("dkp-activity-status", "Höchstens 100 Spieler auf einmal.");
      return;
    }
    const pointsLabel = pointsInput.empty ? Number(type.points) : pointsInput.value;
    const summary = "Aktivität „" + (type.name || "") + "“ mit " + pointsLabel + " Punkten an " + chosen.length + " Spieler vergeben?\n\n" + dkpNamePreview(chosen);
    if (!window.confirm(summary)) return;
    const ids = [];
    chosen.forEach(function (player) {
      if (ids.indexOf(player.id) === -1) ids.push(player.id);
    });
    runDkpWrite("dkp-activity-status", function () {
      return dkpRpc("dkp_award_activity", {
        p_player_ids: ids,
        p_activity_type_id: type.id,
        p_points: pointsInput.empty ? null : pointsInput.value,
        p_reason: reason.value,
      }).then(function (data) {
        dkpSelectedIds = {};
        const reasonInput = document.getElementById("dkp-activity-reason");
        if (reasonInput) reasonInput.value = "";
        return dkpAwardSummary(data);
      });
    });
  }

  function submitDkpTransfer() {
    const player = dkpPlayerById((document.getElementById("dkp-transfer-player") || {}).value);
    if (!player) {
      setDkpStatus("dkp-transfer-status", "Bitte einen Spieler auswählen.");
      return;
    }
    const pointsInput = readDkpInt((document.getElementById("dkp-transfer-points") || {}).value);
    if (!pointsInput.empty && (pointsInput.invalid || pointsInput.value < 1)) {
      setDkpStatus("dkp-transfer-status", "Bitte mindestens 1 Punkt übertragen.");
      return;
    }
    const reason = dkpOptionalText((document.getElementById("dkp-transfer-reason") || {}).value, 300);
    if (reason.error) {
      setDkpStatus("dkp-transfer-status", "Der Grund ist zu lang (höchstens 300 Zeichen).");
      return;
    }
    runDkpWrite("dkp-transfer-status", function () {
      return dkpRpc("dkp_transfer_overflow", {
        p_player_id: player.id,
        p_points: pointsInput.empty ? null : pointsInput.value,
        p_reason: reason.value,
      }).then(function (data) {
        const row = Array.isArray(data) ? data[0] : null;
        const moved = row ? Number(row.dkp_change) || 0 : 0;
        const pointsField = document.getElementById("dkp-transfer-points");
        const reasonField = document.getElementById("dkp-transfer-reason");
        if (pointsField) pointsField.value = "";
        if (reasonField) reasonField.value = "";
        return dkpBalanceSummary(row, moved + " Punkte von den Überstunden auf das DKP-Konto von " + ((row && row.char_name) || player.char_name) + " übertragen.");
      });
    });
  }

  function submitDkpItemAward() {
    const item = dkpById(dkpItems, (document.getElementById("dkp-item-id") || {}).value);
    const player = dkpPlayerById((document.getElementById("dkp-item-player") || {}).value);
    if (!item) {
      setDkpStatus("dkp-item-status", "Bitte einen Gegenstand auswählen.");
      return;
    }
    if (!player) {
      setDkpStatus("dkp-item-status", "Bitte einen Spieler auswählen.");
      return;
    }
    const costInput = readDkpInt((document.getElementById("dkp-item-cost") || {}).value);
    if (!costInput.empty && (costInput.invalid || costInput.value < 0 || costInput.value > 500)) {
      setDkpStatus("dkp-item-status", "Die Kosten müssen zwischen 0 und 500 DKP liegen.");
      return;
    }
    const reason = dkpOptionalText((document.getElementById("dkp-item-reason") || {}).value, 300);
    if (reason.error) {
      setDkpStatus("dkp-item-status", "Der Grund ist zu lang (höchstens 300 Zeichen).");
      return;
    }
    runDkpWrite("dkp-item-status", function () {
      return dkpRpc("dkp_award_item", {
        p_player_id: player.id,
        p_item_id: item.id,
        p_cost: costInput.empty ? null : costInput.value,
        p_reason: reason.value,
      }).then(function (data) {
        const row = Array.isArray(data) ? data[0] : null;
        const costField = document.getElementById("dkp-item-cost");
        const reasonField = document.getElementById("dkp-item-reason");
        if (costField) costField.value = "";
        if (reasonField) reasonField.value = "";
        const spent = row ? Math.abs(Number(row.dkp_change) || 0) : (costInput.empty ? Number(item.cost) : costInput.value);
        return dkpBalanceSummary(row, "Gegenstand „" + (item.name || "") + "“ an " + ((row && row.char_name) || player.char_name) + " vergeben, " + dkpNum(spent) + " DKP abgezogen.");
      });
    });
  }

  function submitDkpAdjust() {
    const player = dkpPlayerById((document.getElementById("dkp-adjust-player") || {}).value);
    if (!player) {
      setDkpStatus("dkp-adjust-status", "Bitte einen Spieler auswählen.");
      return;
    }
    const pointsInput = readDkpInt((document.getElementById("dkp-adjust-points") || {}).value);
    if (pointsInput.empty || pointsInput.invalid || pointsInput.value < 1 || pointsInput.value > 10000) {
      setDkpStatus("dkp-adjust-status", "Bitte eine Punktzahl ungleich 0 eingeben (zwischen -10000 und 10000).");
      return;
    }
    const mode = (document.getElementById("dkp-adjust-mode") || {}).value === "penalty" ? "penalty" : "bonus";
    const account = (document.getElementById("dkp-adjust-account") || {}).value === "overflow" ? "overflow" : "dkp";
    const points = mode === "penalty" ? -pointsInput.value : pointsInput.value;
    const reason = dkpOptionalText((document.getElementById("dkp-adjust-reason") || {}).value, 300);
    if (!reason.value || reason.value.length < 3) {
      setDkpStatus("dkp-adjust-status", "Bitte einen Grund angeben (mindestens 3 Zeichen).");
      return;
    }
    runDkpWrite("dkp-adjust-status", function () {
      return dkpRpc("dkp_adjust", {
        p_player_id: player.id,
        p_points: points,
        p_reason: reason.value,
        p_account: account,
      }).then(function (data) {
        const row = Array.isArray(data) ? data[0] : null;
        const pointsField = document.getElementById("dkp-adjust-points");
        const reasonField = document.getElementById("dkp-adjust-reason");
        if (pointsField) pointsField.value = "";
        if (reasonField) reasonField.value = "";
        const label = points > 0 ? "Bonus" : "Abzug";
        return dkpBalanceSummary(row, label + " für " + ((row && row.char_name) || player.char_name) + " gebucht (" + dkpSigned(points) + ").");
      });
    });
  }

  function submitDkpPlayer() {
    const name = String((document.getElementById("dkp-player-name") || {}).value || "").trim();
    if (name.length < 2 || name.length > 40) {
      setDkpStatus("dkp-player-status", "Bitte einen Namen mit 2 bis 40 Zeichen eingeben.");
      return;
    }
    const hidden = String((document.getElementById("dkp-player-id") || {}).value || "");
    const id = hidden ? (isDkpUuid(hidden) ? hidden : null) : null;
    if (hidden && !id) {
      setDkpStatus("dkp-player-status", "Dieser Spieler ist ungültig. Bitte die Liste neu laden.");
      return;
    }
    const memberRaw = String((document.getElementById("dkp-player-member") || {}).value || "");
    if (memberRaw && !isDkpUuid(memberRaw)) {
      setDkpStatus("dkp-player-status", "Das Gildenmitglied wurde nicht gefunden.");
      return;
    }
    const active = !!((document.getElementById("dkp-player-active") || {}).checked);
    runDkpWrite("dkp-player-status", function () {
      return dkpRpc("dkp_save_player", {
        p_char_name: name,
        p_id: id,
        p_member_id: memberRaw || null,
        p_active: active,
      }).then(function () {
        resetDkpPlayerForm();
        return id ? "Spieler gespeichert." : "Spieler angelegt.";
      });
    });
  }

  function submitDkpType() {
    const name = String((document.getElementById("dkp-type-name") || {}).value || "").trim();
    if (name.length < 2 || name.length > 60) {
      setDkpStatus("dkp-type-status", "Bitte einen Namen mit 2 bis 60 Zeichen eingeben.");
      return;
    }
    const pointsInput = readDkpInt((document.getElementById("dkp-type-points") || {}).value);
    if (pointsInput.empty || pointsInput.invalid || pointsInput.value < 1 || pointsInput.value > 500) {
      setDkpStatus("dkp-type-status", "Die Punkte müssen zwischen 1 und 500 liegen.");
      return;
    }
    const orderInput = readDkpInt((document.getElementById("dkp-type-order") || {}).value);
    if (!orderInput.empty && (orderInput.invalid || orderInput.value < -100000 || orderInput.value > 100000)) {
      setDkpStatus("dkp-type-status", "Bitte eine ganze Zahl als Reihenfolge eingeben.");
      return;
    }
    const hidden = String((document.getElementById("dkp-type-id") || {}).value || "");
    const id = hidden ? (isDkpUuid(hidden) ? hidden : null) : null;
    if (hidden && !id) {
      setDkpStatus("dkp-type-status", "Diese Aktivität ist ungültig. Bitte die Liste neu laden.");
      return;
    }
    const active = !!((document.getElementById("dkp-type-active") || {}).checked);
    runDkpWrite("dkp-type-status", function () {
      return dkpRpc("dkp_save_activity_type", {
        p_name: name,
        p_points: pointsInput.value,
        p_id: id,
        p_active: active,
        p_sort_order: orderInput.empty ? 0 : orderInput.value,
      }).then(function () {
        resetDkpTypeForm();
        return id ? "Aktivität gespeichert." : "Aktivität angelegt.";
      });
    });
  }

  function submitDkpItemAdmin() {
    const name = String((document.getElementById("dkp-item-admin-name") || {}).value || "").trim();
    if (name.length < 2 || name.length > 80) {
      setDkpStatus("dkp-item-admin-status", "Bitte einen Namen mit 2 bis 80 Zeichen eingeben.");
      return;
    }
    const costInput = readDkpInt((document.getElementById("dkp-item-admin-cost") || {}).value);
    if (costInput.empty || costInput.invalid || costInput.value < 0 || costInput.value > 500) {
      setDkpStatus("dkp-item-admin-status", "Die Kosten müssen zwischen 0 und 500 DKP liegen.");
      return;
    }
    const note = dkpOptionalText((document.getElementById("dkp-item-admin-note") || {}).value, 200);
    if (note.error) {
      setDkpStatus("dkp-item-admin-status", "Die Notiz ist zu lang (höchstens 200 Zeichen).");
      return;
    }
    const hidden = String((document.getElementById("dkp-item-admin-id") || {}).value || "");
    const id = hidden ? (isDkpUuid(hidden) ? hidden : null) : null;
    if (hidden && !id) {
      setDkpStatus("dkp-item-admin-status", "Dieser Gegenstand ist ungültig. Bitte die Liste neu laden.");
      return;
    }
    const active = !!((document.getElementById("dkp-item-admin-active") || {}).checked);
    runDkpWrite("dkp-item-admin-status", function () {
      return dkpRpc("dkp_save_item", {
        p_name: name,
        p_cost: costInput.value,
        p_id: id,
        p_active: active,
        p_note: note.value,
      }).then(function () {
        resetDkpItemForm();
        return id ? "Gegenstand gespeichert." : "Gegenstand angelegt.";
      });
    });
  }

  function submitDkpReverse(form) {
    const id = dkpReverseId;
    if (!isDkpUuid(id)) return;
    const reason = dkpOptionalText((form.querySelector("[name='reason']") || {}).value, 300);
    if (!reason.value || reason.value.length < 3) {
      setDkpStatus("dkp-history-status", "Bitte einen Grund angeben (mindestens 3 Zeichen).");
      notify("Bitte einen Grund angeben (mindestens 3 Zeichen).", "error");
      return;
    }
    runDkpWrite("dkp-history-status", function () {
      return dkpRpc("dkp_reverse_entry", {
        p_history_id: id,
        p_reason: reason.value,
      }).then(function () {
        dkpReverseId = "";
        return "Die Buchung wurde storniert.";
      });
    });
  }

  function deleteDkpPlayer(id) {
    const player = dkpPlayerById(id);
    if (!player || dkpBusy) return;
    if (!window.confirm("Spieler „" + (player.char_name || "") + "“ wirklich löschen? Das geht nur ohne Punkteverlauf. Sonst bitte auf inaktiv setzen.")) return;
    runDkpWrite("dkp-player-status", function () {
      return dkpRpc("dkp_delete_player", { p_id: player.id }).then(function () {
        if (dkpHistoryPlayerId === player.id) dkpHistoryPlayerId = "";
        if ((document.getElementById("dkp-player-id") || {}).value === player.id) resetDkpPlayerForm();
        return "Spieler gelöscht.";
      });
    });
  }

  function deleteDkpType(id) {
    const row = dkpById(dkpActivityTypes, id);
    if (!row || dkpBusy) return;
    if (!window.confirm("Aktivität „" + (row.name || "") + "“ wirklich löschen? Im Verlauf bleibt der Name stehen.")) return;
    runDkpWrite("dkp-type-status", function () {
      return dkpRpc("dkp_delete_activity_type", { p_id: row.id }).then(function () {
        if ((document.getElementById("dkp-type-id") || {}).value === row.id) resetDkpTypeForm();
        return "Aktivität gelöscht.";
      });
    });
  }

  function deleteDkpItem(id) {
    const row = dkpById(dkpItems, id);
    if (!row || dkpBusy) return;
    if (!window.confirm("Gegenstand „" + (row.name || "") + "“ wirklich löschen? Im Verlauf bleibt der Name stehen.")) return;
    runDkpWrite("dkp-item-admin-status", function () {
      return dkpRpc("dkp_delete_item", { p_id: row.id }).then(function () {
        if ((document.getElementById("dkp-item-admin-id") || {}).value === row.id) resetDkpItemForm();
        return "Gegenstand gelöscht.";
      });
    });
  }

  function submitDkpForm(form) {
    if (form.id === "dkp-activity-form") submitDkpActivity();
    else if (form.id === "dkp-transfer-form") submitDkpTransfer();
    else if (form.id === "dkp-item-form") submitDkpItemAward();
    else if (form.id === "dkp-adjust-form") submitDkpAdjust();
    else if (form.id === "dkp-player-form") submitDkpPlayer();
    else if (form.id === "dkp-type-form") submitDkpType();
    else if (form.id === "dkp-item-admin-form") submitDkpItemAdmin();
    else if (form.id === "dkp-reverse-form") submitDkpReverse(form);
  }


  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  let raidHashDone = "";

  function raidById(id) {
    for (let i = 0; i < raidRows.length; i += 1) {
      if (raidRows[i] && raidRows[i].id === id) return raidRows[i];
    }
    return null;
  }

  function mapRaid(row) {
    if (!row || !isDkpUuid(row.id)) return null;
    if (row.front !== "forever" && row.front !== "retail") return null;
    const title = String(row.title || "").trim();
    if (title.length < 2) return null;
    const starts = new Date(row.starts_at);
    if (Number.isNaN(starts.getTime())) return null;
    const size = Number(row.max_size);
    return {
      id: row.id,
      front: row.front,
      title: title.slice(0, 80),
      startsAt: starts.toISOString(),
      note: raidNoteText(row.note),
      maxSize: Number.isFinite(size) ? Math.max(1, Math.min(40, Math.round(size))) : 40,
      status: row.status === "cancelled" ? "cancelled" : "scheduled",
    };
  }

  function mapRaidSignup(row) {
    if (!row || !isDkpUuid(row.id) || !isDkpUuid(row.raid_id)) return null;
    if (RAID_STATUSES.indexOf(row.status) === -1 || RAID_ROLES.indexOf(row.role) === -1) return null;
    return {
      id: row.id,
      raidId: row.raid_id,
      userId: row.user_id || "",
      status: row.status,
      role: row.role,
      characterName: raidPublicName(row.character_name),
      viaDiscord: !!row.discord_name,
    };
  }

  function raidPublicName(value) {
    const text = String(value || "").trim();
    if (!text || text.indexOf("@") !== -1) return "";
    return text.slice(0, 40);
  }

  function raidTitleText(value) {
    const text = String(value || "").replace(/[\r\n]+/g, " ").trim();
    if (!text || text.indexOf("@") !== -1) return "";
    return text.slice(0, 80);
  }

  function raidNoteText(value) {
    const text = String(value || "").trim();
    if (!text || text.indexOf("@") !== -1) return "";
    return text.slice(0, 500);
  }

  function berlinHour(value) {
    return value === "24" ? "00" : value;
  }

  function raidIsUpcoming(raid) {
    return !!raid && new Date(raid.startsAt).getTime() > Date.now();
  }

  function linkedRaidId() {
    const hash = location.hash.replace(/^#/, "");
    if (hash.indexOf("raid-") !== 0) return "";
    const id = hash.slice(5);
    return isDkpUuid(id) ? id : "";
  }

  function visibleRaids() {
    const linked = linkedRaidId();
    return raidRows.filter(function (raid) {
      if (raid.front !== raidFront) return false;
      const pinned = linked && raid.id === linked;
      if (!pinned && !raidIsUpcoming(raid)) return false;
      if (raid.status === "cancelled" && !isApproved()) return false;
      return raid.status === "scheduled" || raid.status === "cancelled";
    }).sort(function (a, b) {
      return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
    });
  }

  function raidSignupsFor(raidId) {
    return raidSignups.filter(function (signup) { return signup.raidId === raidId; });
  }

  function ownRaidSignup(raidId) {
    if (!currentUser) return null;
    const rows = raidSignupsFor(raidId);
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].userId && rows[i].userId === currentUser.id) return rows[i];
    }
    return null;
  }

  function raidComingCount(raid) {
    if (isApproved() && raidNamesReady) {
      return raidSignupsFor(raid.id).filter(function (signup) {
        return signup.status === "Zusage" || signup.status === "Vielleicht";
      }).length;
    }
    return raidCounts[raid.id] || 0;
  }

  function raidCountLabel(count) {
    if (!count) return "Noch keine Anmeldung";
    if (count === 1) return "1 Anmeldung";
    return count + " Anmeldungen";
  }

  function formatRaidWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const weekday = date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", weekday: "long" });
    const day = date.toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
    const time = date.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const label = weekday ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : "";
    return label + ", " + day + " um " + time + " Uhr";
  }

  function berlinFields(iso) {
    const date = new Date(iso);
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const map = {};
    fmt.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") map[part.type] = part.value;
    });
    return { date: map.year + "-" + map.month + "-" + map.day, time: berlinHour(map.hour) + ":" + map.minute };
  }

  function berlinWall(ms) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Berlin",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    const map = {};
    fmt.formatToParts(new Date(ms)).forEach(function (part) {
      if (part.type !== "literal") map[part.type] = part.value;
    });
    return Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(berlinHour(map.hour)), Number(map.minute), Number(map.second));
  }

  function berlinInstant(dateStr, timeStr) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr || ""));
    const clock = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(timeStr || ""));
    if (!match || !clock) return null;
    const y = Number(match[1]);
    const mo = Number(match[2]);
    const d = Number(match[3]);
    const h = Number(clock[1]);
    const mi = Number(clock[2]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
    const wanted = Date.UTC(y, mo - 1, d, h, mi, 0);
    let utc = wanted;
    utc = utc - (berlinWall(utc) - wanted);
    utc = utc - (berlinWall(utc) - wanted);
    if (berlinWall(utc) !== wanted) return null;
    return new Date(utc).toISOString();
  }

  function raidMissing(error) {
    if (!error) return false;
    const code = String(error.code || "");
    const message = String(error.message || error.details || "").toLowerCase();
    if (code === "42P01" || code === "PGRST205" || code === "PGRST202") return true;
    return message.indexOf("raid") !== -1 && (message.indexOf("does not exist") !== -1 || message.indexOf("schema cache") !== -1 || message.indexOf("could not find") !== -1);
  }

  function raidErrorText(error, fallback) {
    if (raidMissing(error)) return "Die Raid-Planung ist noch nicht eingerichtet.";
    const msg = String((error && (error.message || error.details)) || "").replace(/^\s*ERROR:\s*/i, "").trim();
    if (!msg || /failed to fetch|network|jwt|schema cache|permission denied|PGRST|row-level security/i.test(msg)) return fallback;
    return msg;
  }

  function setRaidStatus(id, message, kind) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = kind === "ok" ? "text-sm text-emerald-300" : "text-sm text-amber-200";
  }

  function viaDiscordBadge() {
    const badge = document.createElement("span");
    badge.className = "via-discord";
    badge.textContent = "via Discord";
    return badge;
  }

  function raidNode(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function raidChoiceClass(on, tone) {
    if (!on) return RAID_BTN_OFF;
    if (tone === "yes") return RAID_BTN + " bg-emerald-600 font-extrabold text-white";
    if (tone === "no") return RAID_BTN + " bg-red-600 font-extrabold text-white";
    return RAID_BTN_PICK;
  }

  function fillRaidTitles(selected) {
    const select = document.getElementById("raid-plan-title");
    if (!select) return;
    const names = RAID_TITLES[raidPlanFront] || [];
    const previous = selected == null ? select.value : selected;
    select.replaceChildren();
    const placeholder = raidNode("option", "", "Bitte wählen");
    placeholder.value = "";
    select.appendChild(placeholder);
    names.forEach(function (name) {
      const option = raidNode("option", "", name);
      option.value = name;
      select.appendChild(option);
    });
    select.value = names.indexOf(previous) === -1 ? "" : previous;
  }

  function paintRaidPlanFront() {
    document.querySelectorAll("[data-action='raid-plan-front']").forEach(function (button) {
      const on = button.dataset.front === raidPlanFront;
      button.className = raidChoiceClass(on, "pick");
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function paintRaidSizes() {
    const input = document.getElementById("raid-plan-size");
    const current = input ? String(input.value || "") : "";
    document.querySelectorAll("[data-action='raid-plan-size']").forEach(function (button) {
      const on = button.dataset.size === current;
      button.className = "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 py-3 text-base " + (on ? "bg-amber-500 font-extrabold text-slate-950" : "bg-slate-800 font-bold text-white");
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setRaidPlanFront(front) {
    raidPlanFront = front === "forever" ? "forever" : "retail";
    const size = document.getElementById("raid-plan-size");
    if (size && !raidEditingId) size.value = raidPlanFront === "forever" ? "40" : "20";
    fillRaidTitles(null);
    paintRaidPlanFront();
    paintRaidSizes();
  }

  function setRaidPlanSize(size) {
    const input = document.getElementById("raid-plan-size");
    const number = Number(size);
    if (input && number >= 1 && number <= 40) input.value = String(number);
    paintRaidSizes();
  }

  function resetRaidForm() {
    raidEditingId = "";
    raidPlanFront = activeFront === "forever" ? "forever" : "retail";
    const custom = document.getElementById("raid-plan-custom");
    if (custom) custom.value = "";
    const note = document.getElementById("raid-plan-note");
    if (note) note.value = "";
    const date = document.getElementById("raid-plan-date");
    if (date) date.value = "";
    const time = document.getElementById("raid-plan-time");
    if (time) time.value = "20:00";
    const size = document.getElementById("raid-plan-size");
    if (size) size.value = raidPlanFront === "forever" ? "40" : "20";
    const heading = document.getElementById("raid-plan-heading");
    if (heading) heading.textContent = "Neuen Raid anlegen";
    const submit = document.getElementById("raid-plan-submit");
    if (submit) submit.textContent = "Raid anlegen";
    const cancel = document.getElementById("raid-plan-cancel");
    if (cancel) cancel.hidden = true;
    setRaidStatus("raid-plan-status", "");
    fillRaidTitles("");
    paintRaidPlanFront();
    paintRaidSizes();
    setRaidFormBusy(false);
  }

  function setRaidFormBusy(busy) {
    const form = document.getElementById("raid-plan-form");
    if (!form) return;
    form.querySelectorAll("button, input, select, textarea").forEach(function (el) {
      if (el.id === "raid-plan-cancel" && el.hidden) return;
      el.disabled = busy;
    });
  }

  function beginRaidEdit(id) {
    if (!isOfficer() || !isDkpUuid(id)) return;
    const raid = raidById(id);
    if (!raid) return;
    raidEditingId = raid.id;
    raidPlanFront = raid.front;
    const when = berlinFields(raid.startsAt);
    const known = (RAID_TITLES[raid.front] || []).indexOf(raid.title) !== -1;
    fillRaidTitles(known ? raid.title : "");
    const custom = document.getElementById("raid-plan-custom");
    if (custom) custom.value = known ? "" : raid.title;
    const date = document.getElementById("raid-plan-date");
    if (date) date.value = when.date;
    const time = document.getElementById("raid-plan-time");
    if (time) time.value = when.time;
    const note = document.getElementById("raid-plan-note");
    if (note) note.value = raid.note || "";
    const size = document.getElementById("raid-plan-size");
    if (size) size.value = String(raid.maxSize);
    const heading = document.getElementById("raid-plan-heading");
    if (heading) heading.textContent = "Raid ändern";
    const submit = document.getElementById("raid-plan-submit");
    if (submit) submit.textContent = "Änderungen speichern";
    const cancel = document.getElementById("raid-plan-cancel");
    if (cancel) cancel.hidden = false;
    paintRaidPlanFront();
    paintRaidSizes();
    setRaidStatus("raid-plan-status", "");
    const form = document.getElementById("raid-plan-form");
    if (form) form.scrollIntoView({ behavior: motion(), block: "start" });
  }

  function submitRaidPlan(form) {
    if (!isOfficer() || raidBusy || !remote) {
      setRaidStatus("raid-plan-status", "Nur Offiziere können Raids anlegen.", "err");
      return;
    }
    const custom = raidTitleText((document.getElementById("raid-plan-custom") || {}).value);
    const picked = String((document.getElementById("raid-plan-title") || {}).value || "").trim();
    const title = custom || picked;
    if (title.length < 2 || title.length > 80) {
      setRaidStatus("raid-plan-status", "Bitte einen Raid aus der Liste wählen oder einen Namen eintragen.", "err");
      return;
    }
    const date = (document.getElementById("raid-plan-date") || {}).value || "";
    const time = (document.getElementById("raid-plan-time") || {}).value || "";
    const startsAt = berlinInstant(date, time);
    if (!startsAt) {
      setRaidStatus("raid-plan-status", "Bitte Datum und Uhrzeit prüfen. Die Zeit ist Berliner Zeit.", "err");
      return;
    }
    if (new Date(startsAt).getTime() <= Date.now()) {
      setRaidStatus("raid-plan-status", "Bitte einen Termin in der Zukunft wählen.", "err");
      return;
    }
    const size = Number((document.getElementById("raid-plan-size") || {}).value);
    if (!Number.isInteger(size) || size < 1 || size > 40) {
      setRaidStatus("raid-plan-status", "Die Gruppengröße muss zwischen 1 und 40 liegen.", "err");
      return;
    }
    const noteRaw = String((document.getElementById("raid-plan-note") || {}).value || "").trim();
    if (noteRaw.length > 500) {
      setRaidStatus("raid-plan-status", "Die Notiz ist zu lang (höchstens 500 Zeichen).", "err");
      return;
    }
    const payload = {
      front: raidPlanFront,
      title: title,
      starts_at: startsAt,
      note: noteRaw || null,
      max_size: size,
    };
    raidBusy = true;
    setRaidFormBusy(true);
    const editing = raidEditingId;
    const request = editing
      ? remote.from("raids").update(payload).eq("id", editing).select(RAID_MEMBER_COLUMNS).single()
      : remote.from("raids").insert(payload).select(RAID_MEMBER_COLUMNS).single();
    Promise.resolve(request).then(function (result) {
      raidBusy = false;
      setRaidFormBusy(false);
      if (!result || result.error) {
        setRaidStatus("raid-plan-status", raidErrorText(result && result.error, "Der Raid konnte nicht gespeichert werden."), "err");
        return;
      }
      resetRaidForm();
      notify(editing ? "Der Raid ist gespeichert." : "Der Raid ist angelegt.", "info");
      return loadRaids();
    }).catch(function () {
      raidBusy = false;
      setRaidFormBusy(false);
      setRaidStatus("raid-plan-status", "Der Raid konnte nicht gespeichert werden.", "err");
    });
  }

  function cancelRaid(id) {
    const raid = raidById(id);
    if (!isOfficer() || !raid || raidBusy || !remote) return;
    if (raid.status === "cancelled") return;
    if (!window.confirm("„" + raid.title + "“ wirklich absagen?")) return;
    raidBusy = true;
    remote.from("raids").update({ status: "cancelled" }).eq("id", raid.id).then(function (result) {
      raidBusy = false;
      if (!result || result.error) {
        notify(raidErrorText(result && result.error, "Der Raid konnte nicht abgesagt werden."), "error");
        return;
      }
      notify("Der Raid ist abgesagt.", "info");
      loadRaids();
    }).catch(function () {
      raidBusy = false;
      notify("Der Raid konnte nicht abgesagt werden.", "error");
    });
  }

  function deleteRaid(id) {
    const raid = raidById(id);
    if (!isOfficer() || !raid || raidBusy || !remote) return;
    if (!window.confirm("„" + raid.title + "“ wirklich löschen?")) return;
    raidBusy = true;
    remote.from("raids").delete().eq("id", raid.id).then(function (result) {
      raidBusy = false;
      if (!result || result.error) {
        notify(raidErrorText(result && result.error, "Der Raid konnte nicht gelöscht werden."), "error");
        return;
      }
      if (raidEditingId === raid.id) resetRaidForm();
      notify("Der Raid ist gelöscht.", "info");
      loadRaids();
    }).catch(function () {
      raidBusy = false;
      notify("Der Raid konnte nicht gelöscht werden.", "error");
    });
  }

  function selectedRaidRole(card, signup) {
    if (!card) return signup ? signup.role : "Schaden";
    const pressed = card.querySelector("[data-action='raid-role'][aria-pressed='true']");
    if (pressed && RAID_ROLES.indexOf(pressed.dataset.role) !== -1) return pressed.dataset.role;
    return signup ? signup.role : "Schaden";
  }

  function raidNameFromCard(card, signup) {
    const input = card ? card.querySelector("[data-raid-name]") : null;
    if (input) return raidPublicName(input.value);
    return signup ? signup.characterName : raidPublicName(currentUser && currentUser.displayName);
  }

  function chooseRaidRole(button) {
    const card = button.closest(".raid-card");
    if (!card || raidBusy) return;
    const role = button.dataset.role;
    if (RAID_ROLES.indexOf(role) === -1) return;
    card.querySelectorAll("[data-action='raid-role']").forEach(function (item) {
      const on = item === button;
      item.setAttribute("aria-pressed", on ? "true" : "false");
      item.className = raidChoiceClass(on, "pick");
    });
    const raid = raidById(button.dataset.id);
    const own = raid ? ownRaidSignup(raid.id) : null;
    if (own && raid) saveRaidSignup(raid.id, own.status);
  }

  function saveRaidSignup(id, status) {
    const raid = raidById(id);
    if (!raid || !isApproved() || !currentUser || raidBusy || !remote) return;
    if (RAID_STATUSES.indexOf(status) === -1) return;
    if (raid.status !== "scheduled" || !raidIsUpcoming(raid)) {
      notify("Für diesen Raid kannst du dich nicht mehr anmelden.", "error");
      return;
    }
    const card = document.getElementById("raid-" + raid.id);
    const own = ownRaidSignup(raid.id);
    const role = selectedRaidRole(card, own);
    const name = raidNameFromCard(card, own);
    const typed = card ? card.querySelector("[data-raid-name]") : null;
    if (typed && typed.value.trim() && !name) {
      notify("Bitte einen Charakternamen ohne E-Mail eintragen.", "error");
      return;
    }
    const payload = { status: status, role: role, character_name: name || null };
    raidBusy = true;
    const request = own
      ? remote.from("raid_signups").update(payload).eq("id", own.id).eq("user_id", currentUser.id).select(RAID_SIGNUP_COLUMNS).single()
      : remote.from("raid_signups").insert({
        raid_id: raid.id,
        user_id: currentUser.id,
        status: status,
        role: role,
        character_name: name || null,
      }).select(RAID_SIGNUP_COLUMNS).single();
    Promise.resolve(request).then(function (result) {
      if (result && result.error && String(result.error.code || "") === "23505" && !own) {
        return loadRaids().then(function () {
          const again = ownRaidSignup(raid.id);
          if (!again) return result;
          return remote.from("raid_signups").update(payload).eq("id", again.id).eq("user_id", currentUser.id).select(RAID_SIGNUP_COLUMNS).single();
        });
      }
      return result;
    }).then(function (result) {
      raidBusy = false;
      if (!result || result.error) {
        notify(raidErrorText(result && result.error, "Die Anmeldung konnte nicht gespeichert werden."), "error");
        return;
      }
      notify(status + " gespeichert.", "info");
      return loadRaids();
    }).catch(function () {
      raidBusy = false;
      notify("Die Anmeldung konnte nicht gespeichert werden.", "error");
    });
  }

  function focusLinkedRaid(options) {
    const hash = location.hash.replace(/^#/, "");
    if (hash.indexOf("raid-") !== 0) return;
    const force = !!(options && options.force);
    if (!force && raidHashDone === hash) return;
    const raid = raidById(hash.slice(5));
    if (raid && activeFront !== raid.front) switchFront(raid.front);
    else {
      if (raid) raidFront = raid.front;
      renderRaids();
    }
    const el = document.getElementById(hash);
    raidHashDone = hash;
    if (!el) {
      const section = document.getElementById("raidplanung");
      if (section) section.scrollIntoView({ behavior: (options && options.behavior) || motion(), block: "start" });
      return;
    }
    const updateHistory = !options || options.updateHistory !== false;
    if (updateHistory && location.hash !== "#" + hash) history.pushState(null, "", "#" + hash);
    const behavior = (options && options.behavior) || motion();
    el.scrollIntoView({ behavior: behavior, block: "start" });
  }

  function renderRaidFilter() {
    ["forever", "retail"].forEach(function (front) {
      const button = document.getElementById("raid-filter-" + front);
      if (!button) return;
      const on = raidFront === front;
      const count = raidRows.filter(function (raid) {
        return raid.front === front && raid.status === "scheduled" && raidIsUpcoming(raid);
      }).length;
      button.className = raidChoiceClass(on, "pick");
      button.setAttribute("aria-selected", on ? "true" : "false");
      button.textContent = (front === "forever" ? "Forever" : "Retail") + " (" + count + ")";
    });
  }

  function appendRaidPeople(parent, raid) {
    const rows = raidSignupsFor(raid.id);
    const wrap = raidNode("div", "space-y-3");
    const counts = raidNode("p", "text-sm font-bold text-slate-200");
    const parts = RAID_STATUSES.map(function (status) {
      const n = rows.filter(function (signup) { return signup.status === status; }).length;
      return status + " " + n;
    });
    counts.textContent = parts.join(" · ");
    wrap.appendChild(counts);
    const yesRows = rows.filter(function (signup) { return signup.status === "Zusage"; });
    const roles = raidNode("p", "text-sm text-slate-300");
    roles.textContent = "Rollen bei Zusage: " + RAID_ROLES.map(function (role) {
      const n = yesRows.filter(function (signup) { return signup.role === role; }).length;
      return role + " " + n;
    }).join(" · ");
    wrap.appendChild(roles);
    if (!rows.length) {
      wrap.appendChild(raidNode("p", "text-sm text-slate-500", "Noch niemand hat geantwortet."));
      parent.appendChild(wrap);
      return;
    }
    RAID_STATUSES.forEach(function (status) {
      const group = rows.filter(function (signup) { return signup.status === status; });
      if (!group.length) return;
      const block = raidNode("div");
      block.appendChild(raidNode("h4", "text-sm font-bold text-amber-400", status));
      const list = raidNode("ul", "mt-1 space-y-1");
      group.sort(function (a, b) {
        const role = RAID_ROLES.indexOf(a.role) - RAID_ROLES.indexOf(b.role);
        if (role) return role;
        return a.characterName.localeCompare(b.characterName, "de");
      }).forEach(function (signup) {
        const item = raidNode("li", "text-base text-slate-100");
        const who = signup.characterName || "Ohne Namen";
        const mine = !!(currentUser && signup.userId && signup.userId === currentUser.id);
        item.appendChild(document.createTextNode(who + " · " + signup.role + (mine ? " (du)" : "")));
        if (signup.viaDiscord) item.appendChild(viaDiscordBadge());
        list.appendChild(item);
      });
      block.appendChild(list);
      wrap.appendChild(block);
    });
    parent.appendChild(wrap);
  }

  function appendRaidSignup(parent, raid) {
    const open = raid.status === "scheduled" && raidIsUpcoming(raid);
    if (!currentUser) {
      const button = raidNode("button", RAID_BTN_PICK, "Anmelden, um mitzumachen");
      button.type = "button";
      button.dataset.action = "open-auth";
      parent.appendChild(button);
      return;
    }
    if (!isApproved()) {
      parent.appendChild(raidNode("p", "text-sm text-amber-200", accessNotice()));
      return;
    }
    if (!open) {
      parent.appendChild(raidNode("p", "text-sm font-bold text-amber-200", raid.status === "cancelled" ? "Dieser Raid ist abgesagt." : "Dieser Raid ist vorbei."));
      return;
    }
    const own = ownRaidSignup(raid.id);
    const roleNow = own ? own.role : "Schaden";
    const statusNow = own ? own.status : "";
    parent.appendChild(raidNode("p", "text-sm font-bold text-slate-300", "Kommst du mit?"));
    const statusRow = raidNode("div", "raid-actions");
    RAID_STATUSES.forEach(function (status) {
      const tone = status === "Zusage" ? "yes" : status === "Absage" ? "no" : "pick";
      const button = raidNode("button", raidChoiceClass(statusNow === status, tone), status);
      button.type = "button";
      button.dataset.action = "raid-signup";
      button.dataset.id = raid.id;
      button.dataset.status = status;
      button.setAttribute("aria-pressed", statusNow === status ? "true" : "false");
      statusRow.appendChild(button);
    });
    parent.appendChild(statusRow);
    parent.appendChild(raidNode("p", "text-sm font-bold text-slate-300", "Deine Rolle"));
    const roleRow = raidNode("div", "raid-actions");
    RAID_ROLES.forEach(function (role) {
      const button = raidNode("button", raidChoiceClass(roleNow === role, "pick"), role);
      button.type = "button";
      button.dataset.action = "raid-role";
      button.dataset.id = raid.id;
      button.dataset.role = role;
      button.setAttribute("aria-pressed", roleNow === role ? "true" : "false");
      roleRow.appendChild(button);
    });
    parent.appendChild(roleRow);
    const nameLabel = raidNode("label", "block text-sm font-bold text-slate-300", "Charaktername (optional)");
    nameLabel.htmlFor = "raid-name-" + raid.id;
    const name = document.createElement("input");
    name.id = "raid-name-" + raid.id;
    name.type = "text";
    name.maxLength = 40;
    name.autocomplete = "off";
    name.dataset.raidName = "1";
    name.dataset.id = raid.id;
    name.className = "mt-1 min-h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-base text-slate-200 focus:border-amber-500";
    name.placeholder = "Dein Charakter";
    const prefill = own && own.characterName ? own.characterName : raidPublicName(currentUser.displayName);
    name.value = prefill;
    name.dataset.saved = prefill;
    parent.appendChild(nameLabel);
    parent.appendChild(name);
    const saveName = raidNode("button", RAID_BTN_OFF, "Namen speichern");
    saveName.type = "button";
    saveName.dataset.action = "raid-save-name";
    saveName.dataset.id = raid.id;
    parent.appendChild(saveName);
    parent.appendChild(raidNode("p", "text-sm text-slate-500", "Ein Tipp auf Zusage, Vielleicht oder Absage speichert. Bis zum Start kannst du es ändern."));
  }

  function appendRaidOfficer(parent, raid) {
    if (!isOfficer()) return;
    const row = raidNode("div", "flex flex-col gap-2 sm:flex-row");
    const edit = raidNode("button", RAID_BTN_OFF + " sm:w-auto", "Ändern");
    edit.type = "button";
    edit.dataset.action = "raid-edit";
    edit.dataset.id = raid.id;
    row.appendChild(edit);
    if (raid.status === "scheduled") {
      const abort = raidNode("button", raidChoiceClass(true, "no") + " sm:w-auto", "Absagen");
      abort.type = "button";
      abort.dataset.action = "raid-abort";
      abort.dataset.id = raid.id;
      row.appendChild(abort);
    }
    const remove = raidNode("button", RAID_BTN_OFF + " sm:w-auto", "Löschen");
    remove.type = "button";
    remove.dataset.action = "raid-delete";
    remove.dataset.id = raid.id;
    row.appendChild(remove);
    parent.appendChild(row);
  }

  function renderRaidCard(raid) {
    const linked = linkedRaidId() === raid.id;
    const card = raidNode("article", "raid-card space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-4" + (linked ? " is-linked" : ""));
    card.id = "raid-" + raid.id;
    card.tabIndex = -1;
    const title = raidNode("h3", "text-2xl font-black text-white", raid.title);
    title.id = "raid-title-" + raid.id;
    card.setAttribute("aria-labelledby", title.id);
    card.appendChild(title);
    const meta = raidNode("p", "text-base font-bold text-amber-400");
    meta.textContent = (raid.front === "forever" ? "Forever" : "Retail") + " · " + formatRaidWhen(raid.startsAt);
    card.appendChild(meta);
    card.appendChild(raidNode("p", "text-base text-slate-200", raidCountLabel(raidComingCount(raid)) + " · " + raid.maxSize + " Plätze"));
    if (raid.status === "cancelled") card.appendChild(raidNode("p", "text-base font-extrabold text-red-300", "Abgesagt"));
    else if (!raidIsUpcoming(raid)) card.appendChild(raidNode("p", "text-base font-bold text-slate-400", "Vorbei"));
    if (currentUser && raid.note) card.appendChild(raidNode("p", "text-sm text-slate-300", raid.note));
    if (isApproved() && raidNamesReady) appendRaidPeople(card, raid);
    else if (isApproved()) card.appendChild(raidNode("p", "text-sm text-amber-200", "Die Namen konnten gerade nicht geladen werden."));
    appendRaidSignup(card, raid);
    appendRaidOfficer(card, raid);
    return card;
  }

  function renderRaids() {
    renderRaidFilter();
    const list = document.getElementById("raid-list");
    if (!list) return;
    list.replaceChildren();
    if (raidState === "loading") {
      setRaidStatus("raid-list-status", "Raids werden geladen…", "err");
      return;
    }
    if (raidState === "missing") {
      setRaidStatus("raid-list-status", "Die Raid-Planung ist noch nicht eingerichtet. Alles andere auf der Seite geht weiter.", "err");
      return;
    }
    if (raidState === "error") {
      setRaidStatus("raid-list-status", "Die Termine konnten gerade nicht geladen werden.", "err");
      return;
    }
    const linked = linkedRaidId();
    if (linked && !raidById(linked)) setRaidStatus("raid-list-status", "Diesen Raid gibt es hier nicht.", "err");
    else setRaidStatus("raid-list-status", "");
    const rows = visibleRaids();
    if (!rows.length) {
      list.appendChild(raidNode("p", "text-base text-slate-400", "Noch kein Raid geplant."));
      return;
    }
    rows.forEach(function (raid) { list.appendChild(renderRaidCard(raid)); });
  }

  function loadRaids() {
    if (!remote || typeof remote.from !== "function") {
      raidState = "error";
      renderRaids();
      return Promise.resolve();
    }
    const epoch = raidEpoch + 1;
    raidEpoch = epoch;
    const columns = currentUser ? RAID_MEMBER_COLUMNS : RAID_PUBLIC_COLUMNS;
    let raidsReq;
    let countReq;
    let signupReq;
    try {
      raidsReq = remote.from("raids").select(columns).order("starts_at", { ascending: true });
      countReq = remote.rpc("raid_public_counts");
      signupReq = isApproved()
        ? remote.from("raid_signups").select(RAID_SIGNUP_COLUMNS)
        : Promise.resolve({ data: [], error: null });
    } catch (err) {
      raidState = "error";
      renderRaids();
      return Promise.resolve();
    }
    return Promise.resolve(raidsReq).catch(function (error) {
      return { data: null, error: error };
    }).then(function (raidsResult) {
      if (epoch !== raidEpoch) return null;
      if (!raidsResult || raidsResult.error) {
        raidRows = [];
        raidSignups = [];
        raidCounts = {};
        raidNamesReady = false;
        raidState = raidMissing(raidsResult && raidsResult.error) ? "missing" : "error";
        renderRaids();
        focusLinkedRaid({ updateHistory: false, behavior: "instant" });
        return null;
      }
      raidRows = (raidsResult.data || []).map(mapRaid).filter(Boolean);
      return Promise.all([
        Promise.resolve(countReq).catch(function (error) { return { data: null, error: error }; }),
        Promise.resolve(signupReq).catch(function (error) { return { data: null, error: error }; }),
      ]);
    }).then(function (results) {
      if (!results || epoch !== raidEpoch) return;
      raidCounts = {};
      const countResult = results[0] || {};
      if (!countResult.error) {
        (countResult.data || []).forEach(function (row) {
          if (!row) return;
          const id = row.raid_id;
          const count = Number(row.signup_count);
          if (id && Number.isFinite(count)) raidCounts[id] = count;
        });
      }
      const signupResult = results[1] || {};
      raidNamesReady = !!(isApproved() && signupResult && !signupResult.error);
      raidSignups = raidNamesReady ? (signupResult.data || []).map(mapRaidSignup).filter(Boolean) : [];
      raidState = "ready";
      renderRaids();
      focusLinkedRaid({ updateHistory: false, behavior: "instant" });
    }).catch(function () {
      if (epoch !== raidEpoch) return;
      raidState = "error";
      renderRaids();
    });
  }

  function lootIsId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function lootAppendOptions(id, pairs) {
    const select = document.getElementById(id);
    if (!select) return;
    pairs.forEach(function (pair) {
      const option = document.createElement("option");
      option.value = pair[0];
      option.textContent = pair[1];
      select.appendChild(option);
    });
  }

  function initLootFilters() {
    if (lootFiltersReady) return;
    lootFiltersReady = true;
    lootAppendOptions("loot-filter-slot", LOOT_SLOTS.map(function (slot) { return [slot, slot]; }));
    lootAppendOptions("loot-filter-armor", LOOT_ARMOR.map(function (armor) { return [armor, armor]; }));
    lootAppendOptions("loot-filter-quality", LOOT_QUALITIES.map(function (entry) { return [entry.id, entry.label]; }));
    lootAppendOptions("loot-item-quality", LOOT_QUALITIES.map(function (entry) { return [entry.id, entry.label]; }));
    lootAppendOptions("loot-item-slot", LOOT_SLOTS.map(function (slot) { return [slot, slot]; }));
    lootAppendOptions("loot-item-armor", LOOT_ARMOR.map(function (armor) { return [armor, armor]; }));
  }

  function lootBySortName(list) {
    return (list || []).slice().sort(function (a, b) {
      const as = Number(a && a.sort);
      const bs = Number(b && b.sort);
      const aNum = Number.isFinite(as) ? as : 0;
      const bNum = Number.isFinite(bs) ? bs : 0;
      if (aNum !== bNum) return aNum - bNum;
      return String((a && a.name_de) || "").localeCompare(String((b && b.name_de) || ""), "de");
    });
  }

  function lootNextSort(list) {
    let max = 0;
    (list || []).forEach(function (item) {
      const n = Number(item && item.sort);
      if (Number.isFinite(n) && n > max) max = n;
    });
    return max + 10;
  }

  function lootCopyItem(item) {
    const stats = {};
    if (item && item.stats && typeof item.stats === "object" && !Array.isArray(item.stats)) {
      Object.keys(item.stats).forEach(function (key) {
        stats[key] = item.stats[key];
      });
    }
    return {
      id: item.id,
      instance_id: item.instance_id,
      boss_id: item.boss_id || null,
      name_de: item.name_de || "",
      name_en: item.name_en || "",
      quality: item.quality || "",
      slot: item.slot || "",
      armor_type: item.armor_type || "",
      weapon_type: item.weapon_type || "",
      required_level: item.required_level,
      stats: stats,
      effect_text: item.effect_text || "",
      dkp_cost: item.dkp_cost,
      verified_in_forever: item.verified_in_forever,
      sort: item.sort,
    };
  }

  function lootUniqueItems(items) {
    const seen = {};
    const out = [];
    (items || []).forEach(function (item) {
      if (!item || !item.id || seen[item.id]) return;
      seen[item.id] = true;
      out.push(lootCopyItem(item));
    });
    return lootBySortName(out);
  }

  function lootNormalizeInstance(row) {
    const top = Array.isArray(row.loot_items) ? row.loot_items : [];
    const byBoss = {};
    top.forEach(function (item) {
      const key = item && item.boss_id ? item.boss_id : "";
      if (!byBoss[key]) byBoss[key] = [];
      byBoss[key].push(item);
    });
    const bosses = lootBySortName(Array.isArray(row.loot_bosses) ? row.loot_bosses : []).map(function (boss) {
      const nested = Array.isArray(boss.loot_items) && boss.loot_items.length ? boss.loot_items : (byBoss[boss.id] || []);
      return {
        id: boss.id,
        instance_id: boss.instance_id || row.id,
        name_de: boss.name_de || "",
        name_en: boss.name_en || "",
        sort: boss.sort,
        note: boss.note || "",
        items: lootUniqueItems(nested),
      };
    });
    return {
      id: row.id,
      slug: row.slug || "",
      name_de: row.name_de || "",
      kind: row.kind === "raid" ? "raid" : "dungeon",
      level_range: row.level_range || "",
      location: row.location || "",
      sort: row.sort,
      is_new_in_forever: !!row.is_new_in_forever,
      note: row.note || "",
      bosses: bosses,
      trash: lootUniqueItems(byBoss[""] || []),
    };
  }

  function lootFind(id) {
    for (let i = 0; i < lootInstances.length; i += 1) {
      if (lootInstances[i].id === id) return lootInstances[i];
    }
    return null;
  }

  function lootBossById(id) {
    for (let i = 0; i < lootInstances.length; i += 1) {
      const bosses = lootInstances[i].bosses;
      for (let j = 0; j < bosses.length; j += 1) {
        if (bosses[j].id === id) return bosses[j];
      }
    }
    return null;
  }

  function lootItemById(id) {
    for (let i = 0; i < lootInstances.length; i += 1) {
      const inst = lootInstances[i];
      const pools = [inst.trash];
      inst.bosses.forEach(function (boss) { pools.push(boss.items); });
      for (let p = 0; p < pools.length; p += 1) {
        for (let j = 0; j < pools[p].length; j += 1) {
          if (pools[p][j].id === id) return pools[p][j];
        }
      }
    }
    return null;
  }

  function lootReadFilters() {
    const search = document.getElementById("loot-search");
    const slot = document.getElementById("loot-filter-slot");
    const armor = document.getElementById("loot-filter-armor");
    const quality = document.getElementById("loot-filter-quality");
    return {
      query: search ? search.value.trim().toLowerCase() : "",
      slot: slot ? slot.value : "",
      armor: armor ? armor.value : "",
      quality: quality ? quality.value : "",
    };
  }

  function lootFiltersActive(filters) {
    return !!(filters.query || filters.slot || filters.armor || filters.quality);
  }

  function lootItemMatches(item, filters) {
    if (filters.query) {
      const de = String(item.name_de || "").toLowerCase();
      const en = String(item.name_en || "").toLowerCase();
      if (de.indexOf(filters.query) === -1 && en.indexOf(filters.query) === -1) return false;
    }
    if (filters.slot && item.slot !== filters.slot) return false;
    if (filters.armor && item.armor_type !== filters.armor) return false;
    if (filters.quality && item.quality !== filters.quality) return false;
    return true;
  }

  function lootKindLabel(kind) {
    return kind === "raid" ? "Raid" : "Dungeon";
  }

  function lootLevelLabel(range) {
    const text = String(range || "").trim();
    if (!text) return "";
    if (/^stufe\b/i.test(text)) return text;
    return "Stufe " + text;
  }

  function lootQualityLabel(id) {
    for (let i = 0; i < LOOT_QUALITIES.length; i += 1) {
      if (LOOT_QUALITIES[i].id === id) return LOOT_QUALITIES[i].label;
    }
    return "";
  }

  function lootQualityClass(id) {
    return lootQualityLabel(id) ? "loot-quality-" + id : "text-white";
  }

  function lootCountItems(inst) {
    let total = inst.trash.length;
    inst.bosses.forEach(function (boss) { total += boss.items.length; });
    return total;
  }

  function lootCountMatches(inst, filters) {
    let total = inst.trash.filter(function (item) { return lootItemMatches(item, filters); }).length;
    inst.bosses.forEach(function (boss) {
      total += boss.items.filter(function (item) { return lootItemMatches(item, filters); }).length;
    });
    return total;
  }

  function lootPlural(count, one, many) {
    return count + " " + (count === 1 ? one : many);
  }

  function lootSigned(n) {
    if (!Number.isFinite(n)) return String(n);
    const negative = n < 0;
    const rounded = Math.round(Math.abs(n) * 100) / 100;
    const text = (Number.isInteger(rounded) ? String(rounded) : String(rounded)).replace(".", ",");
    if (negative) return "-" + text;
    if (n > 0) return "+" + text;
    return "0";
  }

  function lootAsNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && /^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim())) {
      return Number(value.trim().replace(",", "."));
    }
    return null;
  }

  function lootDeDecimal(n, fixed) {
    if (!Number.isFinite(n)) return String(n);
    if (fixed != null) return n.toFixed(fixed).replace(".", ",");
    const rounded = Math.round(n * 100) / 100;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",");
  }

  function lootPlainAmount(n) {
    if (n < 0) return lootSigned(n);
    return lootDeDecimal(n);
  }

  function lootDamageRange(value) {
    const text = String(value == null ? "" : value).trim();
    const match = text.match(/^[+]?\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*[+]?\s*(\d+(?:[.,]\d+)?)$/);
    if (!match) return null;
    return {
      min: lootDeDecimal(Number(match[1].replace(",", "."))),
      max: lootDeDecimal(Number(match[2].replace(",", "."))),
    };
  }

  function lootFormatStat(key, value) {
    if (key === "Schaden") {
      const range = lootDamageRange(value);
      if (range) return range.min + " - " + range.max + " Schaden";
    }
    if (key === "Schattenschaden") {
      const range = lootDamageRange(value);
      if (range) return "+" + range.min + " - " + range.max + " Schattenschaden";
    }
    if (key === "Schadensart") return "Schadensart: " + String(value == null ? "" : value).trim();
    if (key === "Tempo") {
      const tempo = lootAsNumber(value);
      if (tempo != null) return "Tempo " + lootDeDecimal(tempo, 2);
    }
    if (key === "DPS") {
      const dps = lootAsNumber(value);
      if (dps != null) return "(" + lootDeDecimal(dps) + " Schaden pro Sekunde)";
    }
    if (key === "Rüstung" || key === "Blocken") {
      const amount = lootAsNumber(value);
      if (amount != null) return lootPlainAmount(amount) + " " + key;
    }
    if (LOOT_ATTR[key]) {
      const amount = lootAsNumber(value);
      if (amount != null) return lootSigned(amount) + " " + key;
    }
    const numeric = lootAsNumber(value);
    if (numeric != null) return lootSigned(numeric) + " " + key;
    if (value == null) return key + ":";
    return key + ": " + String(value).trim();
  }

  function lootStatKeys(stats) {
    const keys = Object.keys(stats);
    const known = LOOT_STAT_ORDER.filter(function (key) { return keys.indexOf(key) !== -1; });
    const rest = keys.filter(function (key) { return LOOT_STAT_ORDER.indexOf(key) === -1; });
    rest.sort(function (a, b) { return a.localeCompare(b, "de"); });
    return known.concat(rest);
  }

  function lootStatLines(stats) {
    if (!stats || typeof stats !== "object" || Array.isArray(stats)) return [];
    return lootStatKeys(stats).map(function (key) {
      return lootFormatStat(key, stats[key]);
    });
  }

  function lootMeta(item) {
    const parts = [];
    if (item.slot) parts.push(item.slot);
    if (item.armor_type) parts.push(item.armor_type);
    if (item.weapon_type) parts.push(item.weapon_type);
    if (item.required_level != null && item.required_level !== "" && Number.isFinite(Number(item.required_level))) {
      parts.push("Stufe " + Number(item.required_level));
    }
    return parts.join(" · ");
  }

  function lootActionButton(action, id, label, className, icon) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    if (id) button.dataset.id = id;
    button.className = className;
    if (icon) {
      const mark = document.createElement("i");
      mark.className = "fa-solid " + icon;
      mark.setAttribute("aria-hidden", "true");
      button.appendChild(mark);
    }
    button.appendChild(document.createTextNode((icon ? " " : "") + label));
    return button;
  }

  function lootActionRow(buttons) {
    const row = document.createElement("div");
    row.className = "mt-3 flex flex-wrap gap-2";
    row.dataset.perm = "officer";
    row.hidden = !isOfficer();
    buttons.forEach(function (button) { row.appendChild(button); });
    return row;
  }

  function lootRenderItem(item) {
    const article = document.createElement("article");
    article.className = "rounded-xl border border-slate-800 bg-slate-950 p-3";
    const row = document.createElement("div");
    row.className = "flex flex-col items-start gap-3 sm:flex-row sm:justify-between";
    const body = document.createElement("div");
    body.className = "min-w-0";
    const title = document.createElement("h4");
    title.className = "break-words text-base font-extrabold " + lootQualityClass(item.quality);
    title.appendChild(document.createTextNode(item.name_de || "Ohne Namen"));
    const quality = lootQualityLabel(item.quality);
    if (quality) {
      const hidden = document.createElement("span");
      hidden.className = "sr-only";
      hidden.textContent = ", " + quality;
      title.appendChild(hidden);
    }
    body.appendChild(title);
    if (item.name_en) {
      const en = document.createElement("p");
      en.className = "text-xs text-slate-500";
      en.textContent = item.name_en;
      body.appendChild(en);
    }
    const meta = lootMeta(item);
    if (meta) {
      const line = document.createElement("p");
      line.className = "mt-1 text-xs text-slate-400";
      line.textContent = meta;
      body.appendChild(line);
    }
    const lines = lootStatLines(item.stats);
    const statList = document.createElement("ul");
    statList.className = "mt-2 space-y-1 text-sm text-slate-200";
    if (!lines.length) {
      const empty = document.createElement("li");
      empty.className = "italic text-slate-500";
      empty.textContent = "Werte folgen";
      statList.appendChild(empty);
    } else {
      lines.forEach(function (line) {
        const entry = document.createElement("li");
        entry.textContent = line;
        statList.appendChild(entry);
      });
    }
    body.appendChild(statList);
    if (item.effect_text) {
      const effect = document.createElement("p");
      effect.className = "loot-effect mt-2 text-sm text-slate-300";
      effect.textContent = item.effect_text;
      body.appendChild(effect);
    }
    if (item.dkp_cost != null && item.dkp_cost !== "" && Number.isFinite(Number(item.dkp_cost))) {
      const dkp = document.createElement("p");
      dkp.className = "mt-2 text-sm font-bold text-amber-400";
      dkp.textContent = Number(item.dkp_cost).toLocaleString("de-DE") + " DKP";
      body.appendChild(dkp);
    }
    if (item.verified_in_forever === false) {
      const hint = document.createElement("p");
      hint.className = "mt-1 text-xs text-slate-500";
      hint.textContent = "noch nicht geprüft";
      body.appendChild(hint);
    }
    row.appendChild(body);
    const actions = document.createElement("div");
    actions.className = "flex flex-wrap gap-2";
    actions.appendChild(lootActionButton("loot-edit-item", item.id, "Bearbeiten", LOOT_BTN, "fa-pen"));
    actions.appendChild(lootActionButton("loot-delete-item", item.id, "Löschen", LOOT_BTN_DANGER, "fa-trash"));
    const wrap = document.createElement("div");
    wrap.dataset.perm = "officer";
    wrap.hidden = !isOfficer();
    wrap.appendChild(actions);
    row.appendChild(wrap);
    article.appendChild(row);
    return article;
  }

  function lootRenderGroup(parent, options) {
    const filters = options.filters;
    const matched = options.items.filter(function (item) { return lootItemMatches(item, filters); });
    const active = lootFiltersActive(filters);
    if (active && !matched.length) return false;
    const shown = active ? matched : options.items;
    const open = !!lootOpen[options.key];
    const section = document.createElement("section");
    section.className = "loot-boss rounded-xl border border-slate-800 bg-slate-950 p-3";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "flex min-h-11 w-full items-center justify-between gap-3 text-left";
    toggle.dataset.action = "loot-toggle";
    toggle.dataset.id = options.key;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    const titles = document.createElement("span");
    titles.className = "min-w-0";
    const name = document.createElement("span");
    name.className = "block break-words font-black text-white";
    name.textContent = options.title;
    titles.appendChild(name);
    if (options.subtitle) {
      const sub = document.createElement("span");
      sub.className = "block text-xs text-slate-500";
      sub.textContent = options.subtitle;
      titles.appendChild(sub);
    }
    const right = document.createElement("span");
    right.className = "flex shrink-0 items-center gap-2";
    const count = document.createElement("span");
    count.className = "text-xs font-bold text-slate-400";
    count.textContent = lootPlural(shown.length, "Gegenstand", "Gegenstände");
    const icon = document.createElement("i");
    icon.className = "fa-solid " + (open ? "fa-chevron-up" : "fa-chevron-down") + " text-amber-400";
    icon.setAttribute("aria-hidden", "true");
    right.appendChild(count);
    right.appendChild(icon);
    toggle.appendChild(titles);
    toggle.appendChild(right);
    section.appendChild(toggle);
    if (options.note) {
      const note = document.createElement("p");
      note.className = "mt-1 text-sm text-slate-400";
      note.textContent = options.note;
      section.appendChild(note);
    }
    const buttons = [];
    if (options.boss) {
      buttons.push(lootActionButton("loot-edit-boss", options.boss.id, "Boss bearbeiten", LOOT_BTN, "fa-pen"));
      buttons.push(lootActionButton("loot-delete-boss", options.boss.id, "Boss löschen", LOOT_BTN_DANGER, "fa-trash"));
    }
    const addItem = lootActionButton("loot-add-item", "", "Gegenstand", LOOT_BTN_AMBER, "fa-plus");
    addItem.dataset.bossId = options.bossId || "";
    buttons.push(addItem);
    section.appendChild(lootActionRow(buttons));
    if (open) {
      const list = document.createElement("div");
      list.className = "mt-3 space-y-2";
      if (!shown.length) {
        const empty = document.createElement("p");
        empty.className = "py-4 text-center italic text-slate-500";
        empty.textContent = "Noch keine Beute.";
        list.appendChild(empty);
      } else {
        shown.forEach(function (item) { list.appendChild(lootRenderItem(item)); });
      }
      section.appendChild(list);
    }
    parent.appendChild(section);
    return true;
  }

  function lootRenderInstanceCard(inst, filters) {
    const selected = inst.id === lootSelectedId;
    const total = lootCountItems(inst);
    const matched = lootCountMatches(inst, filters);
    const active = lootFiltersActive(filters);
    const card = document.createElement("div");
    card.className = "loot-card rounded-xl border border-slate-800 bg-slate-950 p-4";
    if (selected) card.className += " is-selected";
    if (active && matched === 0) card.className += " is-muted";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "w-full text-left";
    button.dataset.action = "loot-select-instance";
    button.dataset.id = inst.id;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    const head = document.createElement("span");
    head.className = "flex items-start justify-between gap-2";
    const name = document.createElement("span");
    name.className = "break-words font-black text-white";
    name.textContent = inst.name_de || "Instanz";
    head.appendChild(name);
    if (inst.is_new_in_forever) {
      const badge = document.createElement("span");
      badge.className = "shrink-0 rounded-full border border-amber-500/30 bg-amber-500/25 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-400";
      badge.textContent = "Neu in Forever";
      head.appendChild(badge);
    }
    button.appendChild(head);
    const metaParts = [lootKindLabel(inst.kind)];
    const level = lootLevelLabel(inst.level_range);
    if (level) metaParts.push(level);
    if (inst.location) metaParts.push(inst.location);
    const meta = document.createElement("span");
    meta.className = "mt-2 block text-xs text-slate-400";
    meta.textContent = metaParts.join(" · ");
    button.appendChild(meta);
    const count = document.createElement("span");
    count.className = "mt-1 block text-xs text-slate-500";
    count.textContent = active ? (matched + " von " + total) : lootPlural(total, "Gegenstand", "Gegenstände");
    button.appendChild(count);
    if (inst.note) {
      const note = document.createElement("span");
      note.className = "mt-2 block text-sm text-slate-400";
      note.textContent = inst.note;
      button.appendChild(note);
    }
    card.appendChild(button);
    const edit = lootActionButton("loot-edit-instance", inst.id, "Bearbeiten", LOOT_BTN, "fa-pen");
    const remove = lootActionButton("loot-delete-instance", inst.id, "Löschen", LOOT_BTN_DANGER, "fa-trash");
    card.appendChild(lootActionRow([edit, remove]));
    return card;
  }

  function lootPreferMatch(filters) {
    const key = [filters.query, filters.slot, filters.armor, filters.quality].join("|");
    if (key === lootPreferKey) return;
    lootPreferKey = key;
    if (!lootFiltersActive(filters)) return;
    const current = lootFind(lootSelectedId);
    if (current && lootCountMatches(current, filters) > 0) return;
    for (let i = 0; i < lootInstances.length; i += 1) {
      if (lootCountMatches(lootInstances[i], filters) > 0) {
        lootSelectedId = lootInstances[i].id;
        return;
      }
    }
  }

  function lootSyncFilterOpen(inst, filters) {
    const key = [filters.query, filters.slot, filters.armor, filters.quality, inst ? inst.id : ""].join("|");
    if (key === lootFilterKey) return;
    lootFilterKey = key;
    if (!inst || !lootFiltersActive(filters)) return;
    inst.bosses.forEach(function (boss) {
      const hit = boss.items.some(function (item) { return lootItemMatches(item, filters); });
      if (hit) lootOpen[boss.id] = true;
    });
    if (inst.trash.some(function (item) { return lootItemMatches(item, filters); })) lootOpen["trash:" + inst.id] = true;
  }

  function renderLootInstances() {
    const list = document.getElementById("loot-instances");
    if (!list) return;
    list.replaceChildren();
    if (lootState !== "ready") return;
    if (!lootInstances.length) {
      const empty = document.createElement("p");
      empty.className = "col-span-full py-8 text-center italic text-slate-500";
      empty.textContent = "Noch keine Instanzen eingetragen.";
      list.appendChild(empty);
      return;
    }
    const filters = lootReadFilters();
    lootInstances.forEach(function (inst) {
      list.appendChild(lootRenderInstanceCard(inst, filters));
    });
  }

  function renderLootDetail() {
    const root = document.getElementById("loot-detail");
    if (!root) return;
    root.replaceChildren();
    if (lootState !== "ready") return;
    const inst = lootFind(lootSelectedId);
    if (!inst) return;
    const filters = lootReadFilters();
    lootSyncFilterOpen(inst, filters);
    root.setAttribute("aria-label", inst.name_de || "Beute");
    const header = document.createElement("div");
    header.className = "rounded-xl border border-slate-800 bg-slate-950 p-4";
    const title = document.createElement("h3");
    title.className = "break-words text-2xl font-black text-white";
    title.textContent = inst.name_de || "Instanz";
    header.appendChild(title);
    const metaParts = [lootKindLabel(inst.kind), lootPlural(inst.bosses.length, "Boss", "Bosse")];
    const level = lootLevelLabel(inst.level_range);
    if (level) metaParts.push(level);
    if (inst.location) metaParts.push(inst.location);
    const meta = document.createElement("p");
    meta.className = "mt-1 text-sm text-slate-400";
    meta.textContent = metaParts.join(" · ");
    header.appendChild(meta);
    if (inst.is_new_in_forever) {
      const badge = document.createElement("p");
      badge.className = "mt-2";
      const mark = document.createElement("span");
      mark.className = "rounded-full border border-amber-500/30 bg-amber-500/25 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-400";
      mark.textContent = "Neu in Forever";
      badge.appendChild(mark);
      header.appendChild(badge);
    }
    if (inst.note) {
      const note = document.createElement("p");
      note.className = "mt-2 text-sm text-slate-300";
      note.textContent = inst.note;
      header.appendChild(note);
    }
    const addBoss = lootActionButton("loot-add-boss", inst.id, "Boss anlegen", LOOT_BTN_AMBER, "fa-plus");
    const addItem = lootActionButton("loot-add-item", "", "Gegenstand anlegen", LOOT_BTN, "fa-plus");
    addItem.dataset.bossId = "";
    const edit = lootActionButton("loot-edit-instance", inst.id, "Instanz bearbeiten", LOOT_BTN, "fa-pen");
    header.appendChild(lootActionRow([addBoss, addItem, edit]));
    root.appendChild(header);
    let visible = 0;
    inst.bosses.forEach(function (boss) {
      const subtitle = boss.name_en && boss.name_en !== boss.name_de ? boss.name_en : "";
      const shown = lootRenderGroup(root, {
        key: boss.id,
        title: boss.name_de || "Boss",
        subtitle: subtitle,
        note: boss.note,
        items: boss.items,
        filters: filters,
        boss: boss,
        bossId: boss.id,
      });
      if (shown) visible += 1;
    });
    if (inst.trash.length) {
      const shown = lootRenderGroup(root, {
        key: "trash:" + inst.id,
        title: "Trash / Sonstige Beute",
        subtitle: "",
        note: "",
        items: inst.trash,
        filters: filters,
        boss: null,
        bossId: "",
      });
      if (shown) visible += 1;
    }
    if (!visible) {
      const empty = document.createElement("p");
      empty.className = "py-8 text-center italic text-slate-500";
      empty.textContent = lootFiltersActive(filters)
        ? "Keine Beute passt zur Suche."
        : "Für diese Instanz ist noch keine Beute eingetragen.";
      root.appendChild(empty);
    }
  }

  function renderLoot() {
    const active = document.activeElement;
    const restoreAction = active && active.dataset ? active.dataset.action || "" : "";
    const restoreId = active && active.dataset ? active.dataset.id || "" : "";
    const section = document.getElementById("forever-beute");
    if (section) section.setAttribute("aria-busy", lootState === "loading" ? "true" : "false");
    const status = document.getElementById("loot-status");
    if (status) {
      if (lootState === "loading" && !lootInstances.length) {
        status.hidden = false;
        status.textContent = "Beute wird geladen…";
      } else if (lootState === "error" && !lootInstances.length) {
        status.hidden = false;
        status.textContent = lootError || "Die Beute konnte nicht geladen werden.";
      } else {
        status.hidden = true;
        status.textContent = "";
      }
    }
    if (lootState === "ready") lootPreferMatch(lootReadFilters());
    renderLootInstances();
    renderLootDetail();
    if (restoreAction.indexOf("loot-") === 0 && restoreId) {
      const selector = '[data-action="' + restoreAction + '"][data-id="' + restoreId + '"]';
      const again = document.querySelector(selector);
      if (again && typeof again.focus === "function") again.focus();
    }
  }

  function lootFailMessage(error) {
    const message = error && error.message ? String(error.message).trim() : "";
    return message || "Die Änderung wurde nicht übernommen.";
  }

  function loadLoot() {
    if (!remote) return;
    const epoch = lootEpoch + 1;
    lootEpoch = epoch;
    if (!lootInstances.length) {
      lootState = "loading";
      lootError = "";
      renderLoot();
    }
    remote.from("loot_instances").select("*,loot_bosses(*,loot_items(*)),loot_items(*)").order("sort").then(function (result) {
      if (epoch !== lootEpoch) return;
      if (!result || result.error) {
        const message = lootFailMessage(result && result.error);
        if (!lootInstances.length) {
          lootState = "error";
          lootError = message;
          renderLoot();
        } else {
          notify(message, "error");
        }
        return;
      }
      lootInstances = lootBySortName((result.data || []).map(lootNormalizeInstance));
      lootState = "ready";
      lootError = "";
      if (!lootFind(lootSelectedId)) lootSelectedId = lootInstances.length ? lootInstances[0].id : "";
      renderLoot();
    }).catch(function (err) {
      if (epoch !== lootEpoch) return;
      const message = lootFailMessage(err);
      if (!lootInstances.length) {
        lootState = "error";
        lootError = message;
        renderLoot();
      } else {
        notify(message, "error");
      }
    });
  }

  function subscribeLoot() {
    if (!remote || lootChannel) return;
    try {
      lootChannel = remote.channel("arc-loot")
        .on("postgres_changes", { event: "*", schema: "public", table: "loot_instances" }, scheduleLootRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "loot_bosses" }, scheduleLootRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "loot_items" }, scheduleLootRefresh)
        .subscribe();
    } catch (err) {
      lootChannel = null;
    }
  }

  function scheduleLootRefresh() {
    window.clearTimeout(lootRefreshTimer);
    lootRefreshTimer = window.setTimeout(loadLoot, 250);
  }

  function lootGuard() {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Beute bearbeiten.", "error");
      if (!currentUser) openAuthModal();
      return false;
    }
    if (!remote) {
      notify(SAVE_FAIL, "error");
      return false;
    }
    if (lootSaving) return false;
    return true;
  }

  function lootSetStatus(id, message, isError) {
    const el = document.getElementById(id);
    if (!el) return;
    if (!message) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.textContent = message;
    el.className = isError ? "text-sm text-red-400" : "text-sm text-amber-200";
  }

  function lootSetBusy(busy) {
    ["loot-instance-form", "loot-boss-form", "loot-item-form"].forEach(function (id) {
      const form = document.getElementById(id);
      if (!form) return;
      form.querySelectorAll("button[type='submit']").forEach(function (button) {
        button.disabled = busy;
      });
    });
  }

  function lootCommit(request, statusId, modalId) {
    lootSaving = true;
    lootSetBusy(true);
    request.then(function (result) {
      if (result && result.error) {
        const message = lootFailMessage(result.error);
        lootSetStatus(statusId, message, true);
        notify(message, "error");
        return;
      }
      closeModal(modalId);
      notify("Gespeichert.", "info");
      loadLoot();
    }).catch(function (err) {
      const message = lootFailMessage(err);
      lootSetStatus(statusId, message, true);
      notify(message, "error");
    }).then(function () {
      lootSaving = false;
      lootSetBusy(false);
    });
  }

  function lootRemove(table, id) {
    lootSaving = true;
    lootSetBusy(true);
    remote.from(table).delete().eq("id", id).then(function (result) {
      if (result && result.error) {
        notify(lootFailMessage(result.error), "error");
        return;
      }
      notify("Gelöscht.", "info");
      loadLoot();
    }).catch(function (err) {
      notify(lootFailMessage(err), "error");
    }).then(function () {
      lootSaving = false;
      lootSetBusy(false);
    });
  }

  function lootSlugify(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function lootReadSort(id) {
    const field = document.getElementById(id);
    const raw = field ? field.value.trim() : "";
    if (!raw) return { value: 0 };
    if (!/^-?\d+$/.test(raw)) return { error: "Die Reihenfolge muss eine ganze Zahl sein." };
    const n = Number(raw);
    if (n < -100000 || n > 1000000) return { error: "Die Reihenfolge liegt außerhalb des erlaubten Bereichs." };
    return { value: n };
  }

  function lootReadOptionalInt(id, min, max, label) {
    const field = document.getElementById(id);
    const raw = field ? field.value.trim() : "";
    if (!raw) return { value: null };
    if (!/^-?\d+$/.test(raw)) return { error: label + " muss eine ganze Zahl sein." };
    const n = Number(raw);
    if (n < min || n > max) return { error: label + " muss zwischen " + min + " und " + max + " liegen." };
    return { value: n };
  }

  function lootBlank(value) {
    const text = String(value == null ? "" : value).trim();
    return text || null;
  }

  function handleLootAction(action, el) {
    if (action === "loot-select-instance") {
      lootSelectedId = el.dataset.id || "";
      renderLoot();
      const detail = document.getElementById("loot-detail");
      if (detail && window.matchMedia("(max-width: 767px)").matches) {
        detail.scrollIntoView({ behavior: motion(), block: "start" });
      }
      return;
    }
    if (action === "loot-toggle") {
      const key = el.dataset.id || "";
      lootOpen[key] = !lootOpen[key];
      renderLoot();
      return;
    }
    if (action === "loot-add-instance") {
      openLootInstanceModal(null);
      return;
    }
    if (action === "loot-edit-instance") {
      const inst = lootFind(el.dataset.id);
      if (!inst) return;
      openLootInstanceModal(inst);
      return;
    }
    if (action === "loot-delete-instance") {
      deleteLootInstance(el.dataset.id);
      return;
    }
    if (action === "loot-add-boss") {
      openLootBossModal(null);
      return;
    }
    if (action === "loot-edit-boss") {
      const boss = lootBossById(el.dataset.id);
      if (!boss) return;
      openLootBossModal(boss);
      return;
    }
    if (action === "loot-delete-boss") {
      deleteLootBoss(el.dataset.id);
      return;
    }
    if (action === "loot-add-item") {
      openLootItemModal(null, el.dataset.bossId || "");
      return;
    }
    if (action === "loot-edit-item") {
      const item = lootItemById(el.dataset.id);
      if (!item) return;
      openLootItemModal(item, "");
      return;
    }
    if (action === "loot-delete-item") {
      deleteLootItem(el.dataset.id);
      return;
    }
    if (action === "loot-stat-add") {
      lootAddStatRow("", "");
      const rows = document.querySelectorAll("#loot-item-stats [data-loot-stat-key]");
      const last = rows[rows.length - 1];
      if (last) last.focus();
      return;
    }
    if (action === "loot-stat-remove") {
      const row = el.closest("[data-loot-stat-row]");
      if (row) row.remove();
    }
  }

  function openLootInstanceModal(inst) {
    if (inst === undefined) return;
    if (inst && !inst.id) return;
    if (!lootGuard()) return;
    const form = document.getElementById("loot-instance-form");
    if (!form) return;
    form.reset();
    document.getElementById("loot-instance-id").value = inst ? inst.id : "";
    document.getElementById("loot-instance-modal-label").textContent = inst ? "Instanz bearbeiten" : "Instanz anlegen";
    if (inst) {
      document.getElementById("loot-instance-name").value = inst.name_de || "";
      document.getElementById("loot-instance-slug").value = inst.slug || "";
      document.getElementById("loot-instance-kind").value = inst.kind === "raid" ? "raid" : "dungeon";
      document.getElementById("loot-instance-level").value = inst.level_range || "";
      document.getElementById("loot-instance-location").value = inst.location || "";
      document.getElementById("loot-instance-sort").value = inst.sort == null ? "" : String(inst.sort);
      document.getElementById("loot-instance-new").checked = !!inst.is_new_in_forever;
      document.getElementById("loot-instance-note").value = inst.note || "";
    } else {
      document.getElementById("loot-instance-sort").value = String(lootNextSort(lootInstances));
    }
    lootSetStatus("loot-instance-status", "");
    openModal("loot-instance-modal");
  }

  function openLootBossModal(boss) {
    if (!lootGuard()) return;
    const inst = boss ? lootFind(boss.instance_id) : lootFind(lootSelectedId);
    if (!inst) {
      notify("Bitte zuerst eine Instanz wählen.", "error");
      return;
    }
    const form = document.getElementById("loot-boss-form");
    if (!form) return;
    form.reset();
    document.getElementById("loot-boss-id").value = boss ? boss.id : "";
    document.getElementById("loot-boss-instance").value = inst.id;
    document.getElementById("loot-boss-modal-label").textContent = boss ? "Boss bearbeiten" : "Boss anlegen";
    if (boss) {
      document.getElementById("loot-boss-name-de").value = boss.name_de || "";
      document.getElementById("loot-boss-name-en").value = boss.name_en || "";
      document.getElementById("loot-boss-sort").value = boss.sort == null ? "" : String(boss.sort);
      document.getElementById("loot-boss-note").value = boss.note || "";
    } else {
      document.getElementById("loot-boss-sort").value = String(lootNextSort(inst.bosses));
    }
    lootSetStatus("loot-boss-status", "");
    openModal("loot-boss-modal");
  }

  function lootEnsureOption(id, value, label) {
    const select = document.getElementById(id);
    if (!select || !value) return;
    for (let i = 0; i < select.options.length; i += 1) {
      if (select.options[i].value === value) return;
    }
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label || value;
    select.appendChild(option);
  }

  function lootFillBossSelect(inst, selectedId) {
    const select = document.getElementById("loot-item-boss");
    if (!select) return;
    select.replaceChildren();
    const trash = document.createElement("option");
    trash.value = "";
    trash.textContent = "Trash / Sonstige Beute";
    select.appendChild(trash);
    if (inst) {
      inst.bosses.forEach(function (boss) {
        const option = document.createElement("option");
        option.value = boss.id;
        option.textContent = boss.name_de || "Boss";
        select.appendChild(option);
      });
    }
    select.value = selectedId && lootIsId(selectedId) ? selectedId : "";
  }

  function lootNumberField(value) {
    if (value == null || value === "") return "";
    const n = Number(value);
    return Number.isFinite(n) ? String(n) : "";
  }

  function lootItemSortSuggestion(inst, bossId) {
    if (!inst) return 10;
    if (!bossId) return lootNextSort(inst.trash);
    const boss = inst.bosses.filter(function (entry) { return entry.id === bossId; })[0];
    return lootNextSort(boss ? boss.items : []);
  }

  function lootClearStats() {
    const list = document.getElementById("loot-item-stats");
    if (list) list.replaceChildren();
  }

  function lootStatInputValue(value) {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (value == null) return "";
    return String(value);
  }

  function lootAddStatRow(key, value) {
    const list = document.getElementById("loot-item-stats");
    if (!list) return;
    const row = document.createElement("div");
    row.className = "flex flex-col gap-2 sm:flex-row sm:items-center";
    row.setAttribute("data-loot-stat-row", "");
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = LOOT_INPUT;
    keyInput.placeholder = "z.B. Ausdauer oder Schaden";
    keyInput.value = key || "";
    keyInput.setAttribute("data-loot-stat-key", "");
    keyInput.autocomplete = "off";
    keyInput.maxLength = 80;
    keyInput.setAttribute("aria-label", "Wertname");
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.className = LOOT_INPUT;
    valueInput.placeholder = "z.B. 5 oder 20-38";
    valueInput.value = value == null ? "" : String(value);
    valueInput.setAttribute("data-loot-stat-value", "");
    valueInput.autocomplete = "off";
    valueInput.maxLength = 80;
    valueInput.setAttribute("aria-label", "Wert");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.action = "loot-stat-remove";
    remove.className = LOOT_BTN;
    remove.textContent = "Entfernen";
    remove.setAttribute("aria-label", "Wert entfernen");
    row.appendChild(keyInput);
    row.appendChild(valueInput);
    row.appendChild(remove);
    list.appendChild(row);
  }

  function openLootItemModal(item, bossId) {
    if (item === undefined) return;
    if (!lootGuard()) return;
    const inst = item ? lootFind(item.instance_id) : lootFind(lootSelectedId);
    if (!inst) {
      notify("Bitte zuerst eine Instanz wählen.", "error");
      return;
    }
    const form = document.getElementById("loot-item-form");
    if (!form) return;
    form.reset();
    const chosenBoss = item ? (item.boss_id || "") : (bossId || "");
    document.getElementById("loot-item-id").value = item ? item.id : "";
    document.getElementById("loot-item-instance").value = inst.id;
    document.getElementById("loot-item-modal-label").textContent = item ? "Gegenstand bearbeiten" : "Gegenstand anlegen";
    lootFillBossSelect(inst, chosenBoss);
    const quality = item && item.quality ? item.quality : "rare";
    const slot = item && item.slot ? item.slot : "Sonstiges";
    const armor = item && item.armor_type ? item.armor_type : "";
    lootEnsureOption("loot-item-quality", quality, lootQualityLabel(quality) || quality);
    lootEnsureOption("loot-item-slot", slot, slot);
    if (armor) lootEnsureOption("loot-item-armor", armor, armor);
    document.getElementById("loot-item-name-de").value = item ? item.name_de : "";
    document.getElementById("loot-item-name-en").value = item ? item.name_en : "";
    document.getElementById("loot-item-quality").value = quality;
    document.getElementById("loot-item-slot").value = slot;
    document.getElementById("loot-item-armor").value = armor;
    document.getElementById("loot-item-weapon").value = item ? (item.weapon_type || "") : "";
    document.getElementById("loot-item-level").value = item ? lootNumberField(item.required_level) : "";
    document.getElementById("loot-item-dkp").value = item ? lootNumberField(item.dkp_cost) : "";
    document.getElementById("loot-item-sort").value = item && item.sort != null
      ? String(item.sort)
      : String(lootItemSortSuggestion(inst, chosenBoss));
    document.getElementById("loot-item-effect").value = item ? (item.effect_text || "") : "";
    document.getElementById("loot-item-verified").checked = !!(item && item.verified_in_forever === true);
    lootClearStats();
    if (item && item.stats && typeof item.stats === "object" && !Array.isArray(item.stats)) {
      Object.keys(item.stats).forEach(function (key) {
        lootAddStatRow(key, lootStatInputValue(item.stats[key]));
      });
    }
    lootSetStatus("loot-item-status", "");
    openModal("loot-item-modal");
  }

  function saveLootInstance() {
    if (!lootGuard()) return;
    const id = document.getElementById("loot-instance-id").value.trim();
    const name = document.getElementById("loot-instance-name").value.trim();
    let slug = document.getElementById("loot-instance-slug").value.trim().toLowerCase();
    const kind = document.getElementById("loot-instance-kind").value === "raid" ? "raid" : "dungeon";
    const level = document.getElementById("loot-instance-level").value.trim();
    const location = document.getElementById("loot-instance-location").value.trim();
    const note = document.getElementById("loot-instance-note").value.trim();
    const sort = lootReadSort("loot-instance-sort");
    if (id && !lootIsId(id)) {
      lootSetStatus("loot-instance-status", "Der Eintrag ist ungültig.", true);
      return;
    }
    if (!name) {
      lootSetStatus("loot-instance-status", "Bitte einen Namen eintragen.", true);
      return;
    }
    if (!slug) slug = lootSlugify(name);
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      lootSetStatus("loot-instance-status", "Der Kurzname darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.", true);
      return;
    }
    if (sort.error) {
      lootSetStatus("loot-instance-status", sort.error, true);
      return;
    }
    const payload = {
      name_de: name,
      slug: slug,
      kind: kind,
      level_range: level || null,
      location: location || null,
      sort: sort.value,
      is_new_in_forever: !!document.getElementById("loot-instance-new").checked,
      note: note || null,
    };
    lootSetStatus("loot-instance-status", "");
    const request = id
      ? remote.from("loot_instances").update(payload).eq("id", id)
      : remote.from("loot_instances").insert(payload);
    lootCommit(request, "loot-instance-status", "loot-instance-modal");
  }

  function saveLootBoss() {
    if (!lootGuard()) return;
    const id = document.getElementById("loot-boss-id").value.trim();
    const instanceId = document.getElementById("loot-boss-instance").value.trim();
    const name = document.getElementById("loot-boss-name-de").value.trim();
    const nameEn = document.getElementById("loot-boss-name-en").value.trim();
    const note = document.getElementById("loot-boss-note").value.trim();
    const sort = lootReadSort("loot-boss-sort");
    if (id && !lootIsId(id)) {
      lootSetStatus("loot-boss-status", "Der Eintrag ist ungültig.", true);
      return;
    }
    if (!lootIsId(instanceId)) {
      lootSetStatus("loot-boss-status", "Bitte zuerst eine Instanz wählen.", true);
      return;
    }
    if (!name) {
      lootSetStatus("loot-boss-status", "Bitte einen Namen eintragen.", true);
      return;
    }
    if (sort.error) {
      lootSetStatus("loot-boss-status", sort.error, true);
      return;
    }
    const payload = {
      instance_id: instanceId,
      name_de: name,
      name_en: nameEn || null,
      sort: sort.value,
      note: note || null,
    };
    lootSetStatus("loot-boss-status", "");
    const request = id
      ? remote.from("loot_bosses").update(payload).eq("id", id)
      : remote.from("loot_bosses").insert(payload);
    lootCommit(request, "loot-boss-status", "loot-boss-modal");
  }

  function lootReadStats() {
    const rows = document.querySelectorAll("#loot-item-stats [data-loot-stat-row]");
    const stats = {};
    const seen = {};
    for (let i = 0; i < rows.length; i += 1) {
      const keyInput = rows[i].querySelector("[data-loot-stat-key]");
      const valueInput = rows[i].querySelector("[data-loot-stat-value]");
      const key = keyInput ? keyInput.value.trim() : "";
      const raw = valueInput ? valueInput.value.trim() : "";
      if (!key && !raw) continue;
      if (!key) return { error: "Jeder Wert braucht einen Namen." };
      if (!raw) return { error: "„" + key + "“ braucht eine Zahl oder einen Text." };
      const folded = key.toLowerCase();
      if (seen[folded]) return { error: "„" + key + "“ ist doppelt." };
      seen[folded] = true;
      stats[key] = lootParseStatValue(raw);
    }
    return { stats: stats };
  }

  function lootParseStatValue(raw) {
    if (/^[+-]?\d+$/.test(raw)) return Number(raw);
    if (/^[+-]?\d+[.,]\d+$/.test(raw)) return Number(raw.replace(",", "."));
    return raw;
  }

  function saveLootItem() {
    if (!lootGuard()) return;
    const id = document.getElementById("loot-item-id").value.trim();
    const instanceId = document.getElementById("loot-item-instance").value.trim();
    const bossId = document.getElementById("loot-item-boss").value.trim();
    const name = document.getElementById("loot-item-name-de").value.trim();
    const nameEn = document.getElementById("loot-item-name-en").value.trim();
    const quality = document.getElementById("loot-item-quality").value;
    const slot = document.getElementById("loot-item-slot").value;
    const armor = document.getElementById("loot-item-armor").value;
    const weapon = document.getElementById("loot-item-weapon").value.trim();
    const effect = document.getElementById("loot-item-effect").value.trim();
    const sort = lootReadSort("loot-item-sort");
    const level = lootReadOptionalInt("loot-item-level", 1, 60, "Die benötigte Stufe");
    const dkp = lootReadOptionalInt("loot-item-dkp", 0, 500, "DKP");
    const stats = lootReadStats();
    if (id && !lootIsId(id)) {
      lootSetStatus("loot-item-status", "Der Eintrag ist ungültig.", true);
      return;
    }
    if (!lootIsId(instanceId)) {
      lootSetStatus("loot-item-status", "Bitte zuerst eine Instanz wählen.", true);
      return;
    }
    if (bossId && !lootIsId(bossId)) {
      lootSetStatus("loot-item-status", "Bitte einen Boss wählen.", true);
      return;
    }
    if (!name) {
      lootSetStatus("loot-item-status", "Bitte einen Namen eintragen.", true);
      return;
    }
    if (!lootQualityLabel(quality)) {
      lootSetStatus("loot-item-status", "Bitte eine Qualität wählen.", true);
      return;
    }
    if (LOOT_SLOTS.indexOf(slot) === -1) {
      lootSetStatus("loot-item-status", "Bitte einen Platz wählen.", true);
      return;
    }
    if (armor && LOOT_ARMOR.indexOf(armor) === -1) {
      lootSetStatus("loot-item-status", "Bitte eine Rüstungsart wählen.", true);
      return;
    }
    if (sort.error) {
      lootSetStatus("loot-item-status", sort.error, true);
      return;
    }
    if (level.error) {
      lootSetStatus("loot-item-status", level.error, true);
      return;
    }
    if (dkp.error) {
      lootSetStatus("loot-item-status", dkp.error, true);
      return;
    }
    if (stats.error) {
      lootSetStatus("loot-item-status", stats.error, true);
      return;
    }
    const payload = {
      instance_id: instanceId,
      boss_id: bossId || null,
      name_de: name,
      name_en: lootBlank(nameEn),
      quality: quality,
      slot: slot,
      armor_type: armor || null,
      weapon_type: lootBlank(weapon),
      required_level: level.value,
      stats: stats.stats,
      effect_text: lootBlank(effect),
      dkp_cost: dkp.value,
      verified_in_forever: !!document.getElementById("loot-item-verified").checked,
      sort: sort.value,
    };
    lootSetStatus("loot-item-status", "");
    const request = id
      ? remote.from("loot_items").update(payload).eq("id", id)
      : remote.from("loot_items").insert(payload);
    lootCommit(request, "loot-item-status", "loot-item-modal");
  }

  function deleteLootInstance(id) {
    const inst = lootFind(id);
    if (!inst || !lootGuard()) return;
    if (!window.confirm("Instanz „" + (inst.name_de || "") + "“ wirklich löschen?")) return;
    lootRemove("loot_instances", id);
  }

  function deleteLootBoss(id) {
    const boss = lootBossById(id);
    if (!boss || !lootGuard()) return;
    if (!window.confirm("Boss „" + (boss.name_de || "") + "“ wirklich löschen?")) return;
    lootRemove("loot_bosses", id);
  }

  function deleteLootItem(id) {
    const item = lootItemById(id);
    if (!item || !lootGuard()) return;
    if (!window.confirm("Gegenstand „" + (item.name_de || "") + "“ wirklich löschen?")) return;
    lootRemove("loot_items", id);
  }
})();
