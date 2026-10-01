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
  ]);
  const RETAIL_IDS = new Set([
    "retail-leitung",
    "retail-kader",
    "retail-mplus",
    "retail-mitglieder",
  ]);

  const NAV_LINK =
    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white";
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
    { href: "#retail-leitung", label: "Leitung", icon: "fa-crown", tone: "text-amber-400" },
    { href: "#retail-kader", label: "Raidkader", icon: "fa-shield", tone: "text-red-500" },
    { href: "#retail-mplus", label: "M+ Planer", icon: "fa-stopwatch", tone: "text-amber-400" },
    { href: "#retail-mitglieder", label: "Mitglieder", icon: "fa-users", tone: "text-red-500" },
    { href: "#galerie", label: "Galerie", icon: "fa-image", tone: "text-amber-400" },
    { href: "#bewerbung", label: "Bewerbung", icon: "fa-scroll", tone: "text-amber-400" },
    { href: "#gilden-chat", label: "Chat", icon: "fa-comments", tone: "text-emerald-400" },
  ];
  const FOREVER_NAV = [
    { href: "#forever-uebersicht", label: "Übersicht", icon: "fa-hourglass-start", tone: "text-amber-400" },
    { href: "#forever-planer", label: "Classic Planer", icon: "fa-skull", tone: "text-amber-400" },
    { href: "#forever-kader", label: "Classic Kader", icon: "fa-shield-cat", tone: "text-amber-400" },
    { href: "#forever-mitglieder", label: "Classic Mitglieder", icon: "fa-users", tone: "text-amber-400" },
    { href: "#forever-dkp", label: "DKP", icon: "fa-coins", tone: "text-amber-400" },
    { href: "#galerie", label: "Galerie", icon: "fa-image", tone: "text-amber-400" },
    { href: "#bewerbung", label: "Bewerbung", icon: "fa-scroll", tone: "text-amber-400" },
    { href: "#gilden-chat", label: "Chat", icon: "fa-comments", tone: "text-emerald-400" },
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
  let authReady = false;
  let chatRefreshTimer = 0;
  let rosterRefreshTimer = 0;

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
  let dkpOfficerTab = "activity";
  let dkpReverseId = "";

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
    updateAuthUI();
    loadRemote();
    const hash = location.hash.replace(/^#/, "");
    if (FOREVER_IDS.has(hash)) switchFront("forever");
    else switchFront("retail");
    if (hash && document.getElementById(hash)) {
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
    const front = el.dataset.front === "forever" ? "forever" : "retail";
    if (action === "switch-front") {
      switchFront(el.dataset.front, { scroll: true });
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
    if (action === "open-raid-modal") {
      openAddRaidModal(front);
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
    if (action === "open-approvals") {
      goTo("freischaltungen");
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
    } else if (form.id === "leadership-form") {
      event.preventDefault();
      saveLeadership(form);
    } else if (form.id === "gallery-upload-form") {
      event.preventDefault();
    } else if (form.id && form.id.indexOf("dkp-") === 0) {
      event.preventDefault();
      submitDkpForm(form);
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
    activeFront = front === "forever" ? "forever" : "retail";
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
    updateQuickNav();

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
    return items;
  }

  function updateQuickNav() {
    const items = navItems();
    fillNav(document.getElementById("quick-nav"), items, true);
    fillNav(document.getElementById("mobile-nav-links"), items, false);
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
      container.appendChild(link);
    });
  }

  function goTo(id, options) {
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
      if (isAdmin()) {
        const roles = document.createElement("button");
        roles.type = "button";
        roles.dataset.action = "open-roles";
        roles.className = "inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-amber-400 hover:text-white";
        roles.textContent = "Rollen";
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
        : "Die Bewerbung geht an die Gildenleitung auf Discord. Eine Kopie erscheint im gemeinsamen Gilden-Chat.";
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

  function openAddMemberModal(front) {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen Mitglieder bearbeiten.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    const form = document.getElementById("member-form");
    form.reset();
    document.getElementById("modal-front").value = front;
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
    const list = membersOf(front);
    remote.from("members").insert({
      front: front,
      name: name,
      rank: rank,
      sort_order: nextSort(list),
    }).select("id, front, name, rank, sort_order").single().then(function (result) {
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      list.push(mapMember(result.data));
      renderMembers(front);
      closeModal("member-modal");
      form.reset();
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
    const kader = kaderOf(front);
    remote.from("roster").insert({
      front: front,
      name: name,
      role: role,
      sort_order: nextSort(kader),
    }).select("id, front, name, role, sort_order").single().then(function (result) {
      if (result.error || !result.data) {
        notify(SAVE_FAIL, "error");
        return;
      }
      kader.push(mapRoster(result.data));
      renderRaidKader(front);
      closeModal("raid-modal");
      form.reset();
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
    remote.from("chat_messages").insert({
      body: text,
      author: currentUser.displayName,
      user_id: currentUser.id,
    }).select("id, author, body, user_id, created_at").single().then(function (result) {
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
    const messages = chatMessages.filter(function (message) {
      return message && typeof message.text === "string";
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
      author.textContent = " <" + (message.author || "Unbekannt") + ">:";
      const text = document.createElement("span");
      text.className = "text-emerald-400";
      text.textContent = " " + message.text;
      line.append(time, author, text);
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
    document.getElementById("info-col-3").textContent = guildInfo.col3;
  }

  function toggleInfoEdit() {
    if (!isOfficer()) {
      notify("Nur Offiziere dürfen die Gildeninfo bearbeiten.", "error");
      if (!currentUser) openAuthModal();
      return;
    }
    document.getElementById("edit-col-1").value = guildInfo.col1;
    document.getElementById("edit-col-2").value = guildInfo.col2;
    document.getElementById("edit-col-3").value = guildInfo.col3;
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
    renderDkp();
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

  function openRolesModal() {
    if (!isAdmin() || !remote || !remoteReady) {
      notify("Nur Administratoren dürfen Rollen ändern.", "error");
      return;
    }
    remote.from("profiles").select("id, display_name, email, role").order("display_name").then(function (result) {
      if (result.error) {
        notify("Die Rollenliste konnte nicht geladen werden.", "error");
        return;
      }
      const list = document.getElementById("roles-list");
      list.replaceChildren();
      (result.data || []).forEach(function (profile) {
        const row = document.createElement("div");
        row.className = "flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3";
        const label = document.createElement("div");
        label.className = "min-w-0";
        const name = document.createElement("p");
        name.className = "truncate text-sm font-bold text-white";
        name.textContent = profile.display_name || "Mitglied";
        const email = document.createElement("p");
        email.className = "truncate text-xs text-slate-400";
        email.textContent = profile.id === currentUser.id ? "Das bist du" : (profile.email || "");
        label.append(name, email);
        row.appendChild(label);
        if (profile.id === currentUser.id) {
          const self = document.createElement("span");
          self.className = "text-xs font-semibold text-amber-400";
          self.textContent = roleLabel(profile.role);
          row.appendChild(self);
        } else {
          const select = document.createElement("select");
          select.className = "rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-amber-500";
          select.dataset.action = "set-role";
          select.dataset.userId = profile.id;
          select.setAttribute("aria-label", "Rolle von " + (profile.display_name || "Mitglied"));
          ["member", "officer", "admin"].forEach(function (role) {
            const option = document.createElement("option");
            option.value = role;
            option.textContent = roleLabel(role);
            if (profile.role === role) option.selected = true;
            select.appendChild(option);
          });
          row.appendChild(select);
        }
        list.appendChild(row);
      });
      if (!list.children.length) {
        const empty = document.createElement("p");
        empty.className = "text-sm text-slate-400";
        empty.textContent = "Noch keine Konten.";
        list.appendChild(empty);
      }
      openModal("roles-modal");
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
      .select("id, display_name, status, role, created_at")
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
    return remote.from("profiles").select("display_name, role, status").eq("id", user.id).maybeSingle().then(function (result) {
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
      dkpLoadFailed = true;
      setDkpLoadStatus(DKP_LOAD_FAIL);
      renderDkp();
      return;
    }
    loadGallery();
    loadDkp();
    probeApproval().then(function () {
      if (!authReady) {
        authReady = true;
        remote.auth.onAuthStateChange(function (event, session) {
          if (event === "SIGNED_OUT") {
            currentUser = null;
            if (approvalEnforced) replaceItems(chatMessages, []);
            updateAuthUI();
            renderPermissionSurfaces();
            return;
          }
          if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED")) return;
          adoptSession(session).then(function () {
            updateAuthUI();
            renderPermissionSurfaces();
            if (remoteReady && event !== "TOKEN_REFRESHED") refreshChat();
          }).catch(function () {
            updateAuthUI();
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
      return fetchAll();
    }).then(function () {
      remoteReady = true;
      renderGuild();
      updateAuthUI();
      subscribeLive();
      if (currentUser && approvalEnforced) refreshChat();
    }).catch(function () {
      remoteReady = false;
      notify(OFFLINE_MSG, "error");
      updateAuthUI();
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
    return Promise.all([
      fetchRows("members", "id, front, name, rank, sort_order", "sort_order", true),
      fetchRows("roster", "id, front, name, role, sort_order", "sort_order", true),
      fetchRows("leadership", "id, name, subtitle, accent, sort_order", "sort_order", true),
      fetchRows("guild_info", "id, col1, col2, col3", null, true),
      fetchRows("mplus_groups", "id, name, dungeon, meeting_time, tank, heal, dds, created_by", "created_at", true),
      fetchRows("mplus_signups", "id, group_id, user_id, character_name", "created_at", true),
      fetchRows("classic_runs", "id, name, size, meeting_time", "created_at", true),
      remote.from("chat_messages").select("id, author, body, user_id, created_at").order("created_at", { ascending: false }).limit(200),
    ]).then(function (rows) {
      const chatResult = rows[7];
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
      if (!canReadChat()) {
        replaceItems(chatMessages, []);
      } else if (chatResult.error) {
        throw chatResult.error;
      } else {
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
    return {
      id: row.id,
      author: row.author,
      text: row.body,
      userId: row.user_id || null,
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

  function refreshChat() {
    if (!remote || !remoteReady) return;
    if (!canReadChat()) {
      replaceItems(chatMessages, []);
      renderChat();
      return;
    }
    remote.from("chat_messages").select("id, author, body, user_id, created_at").order("created_at", { ascending: false }).limit(200).then(function (result) {
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
    if (!remote || liveChannel) return;
    liveChannel = remote.channel("arc-guild")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, function () {
        window.clearTimeout(chatRefreshTimer);
        chatRefreshTimer = window.setTimeout(refreshChat, 250);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roster" }, function () {
        window.clearTimeout(rosterRefreshTimer);
        rosterRefreshTimer = window.setTimeout(refreshRoster, 250);
      })
      .subscribe();
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

  function loadDkp() {
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
    if (!remote) return Promise.resolve();
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
    if (dkpBusy || !dkpHistoryHasMore || !remote) return;
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
      empty.textContent = sortedDkpPlayers(true).length ? "Kein Spieler passt zur Suche." : "Keine aktiven Spieler.";
      box.appendChild(empty);
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
    renderDkpHints();
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
    renderDkpScores();
    renderDkpHistory();
    renderDkpOfficer();
    if (dkpBusy) setDkpBusy(true);
  }

  function showDkpTab(name) {
    const known = { activity: 1, transfer: 1, item: 1, adjust: 1, players: 1, types: 1, items: 1 };
    if (!known[name]) name = "activity";
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
    if (!target || !target.id && target.name !== "dkp-award-player") return false;
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

  function resetDkpPlayerForm() {
    const form = document.getElementById("dkp-player-form");
    if (form) form.reset();
    const id = document.getElementById("dkp-player-id");
    if (id) id.value = "";
    const active = document.getElementById("dkp-player-active");
    if (active) active.checked = true;
    const submit = document.getElementById("dkp-player-submit");
    if (submit) submit.textContent = "Spieler anlegen";
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
    if (name) name.focus();
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
})();
