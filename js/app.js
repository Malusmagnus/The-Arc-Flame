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

  const FOREVER_IDS = new Set([
    "content-forever",
    "forever-uebersicht",
    "forever-planer",
    "forever-kader",
    "forever-mitglieder",
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
    { href: "#galerie", label: "Galerie", icon: "fa-image", tone: "text-amber-400" },
    { href: "#bewerbung", label: "Bewerbung", icon: "fa-scroll", tone: "text-amber-400" },
    { href: "#gilden-chat", label: "Chat", icon: "fa-comments", tone: "text-emerald-400" },
  ];

  let activeFront = "retail";
  let lastFocus = null;
  let noticeTimer = 0;
  let gallery = [];
  let galleryIndex = 0;
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

  document.addEventListener("DOMContentLoaded", boot);

  const APPLICATION_COOLDOWN_MS = 60000;

  function boot() {
    bindStaticEvents();
    applyDiscordLinks();
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
    if (action === "dismiss-notice") {
      hideNotice();
      return;
    }
    if (action === "open-gallery") {
      openLightbox(Number(el.dataset.index));
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
    }
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
        "flex max-w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs";
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
      const show = perm === "admin" ? isAdmin() : perm === "officer" ? isOfficer() : !!currentUser;
      el.hidden = !show;
    });
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
        if (result.data && result.data.session) {
          return adoptSession(result.data.session).then(function () {
            closeModal("auth-modal");
            form.reset();
            syncAuthMode();
            updateAuthUI();
            renderPermissionSurfaces();
            notify("Willkommen, du bist angemeldet.", "info");
          });
        }
        closeModal("auth-modal");
        form.reset();
        syncAuthMode();
        notify("Konto angelegt. Bitte bestätige die E-Mail, danach kannst du dich anmelden.", "info");
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
        notify("Angemeldet als " + currentUser.displayName + ".", "info");
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
      if (currentUser && group.id && remoteReady) {
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
    if (!currentUser || !requireRemote() || !signupId) return;
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

  function applyDiscordLinks() {
    const url = discordInvite();
    document.querySelectorAll("[data-discord-invite]").forEach(function (link) {
      if (!url) {
        link.hidden = true;
        return;
      }
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    });
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

  function applicationErrorMessage() {
    const invite = discordInvite();
    if (!invite) return "Die Bewerbung konnte nicht gesendet werden. Bitte versuche es später noch einmal.";
    return "Die Bewerbung konnte nicht gesendet werden. Schreib uns direkt auf Discord: " + invite;
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

  function isGallerySrc(src) {
    if (typeof src !== "string") return false;
    const value = src.trim();
    if (!value || value.indexOf("..") !== -1) return false;
    return /^assets\/gallery\/[^/\\]+\.(webp|png|jpe?g|gif)$/i.test(value);
  }

  function renderGallery() {
    const grid = document.getElementById("gallery-grid");
    if (!grid) return;
    const list = arcConfig().galleryImages;
    gallery = [];
    if (!Array.isArray(list)) return;
    list.forEach(function (item) {
      if (!item || !isGallerySrc(item.src)) return;
      const alt = typeof item.alt === "string" && item.alt.trim() ? item.alt.trim() : "Screenshot der Gilde";
      gallery.push({ src: item.src.trim(), alt: alt });
    });
    if (!gallery.length) return;
    grid.replaceChildren();
    gallery.forEach(function (item, index) {
      const li = document.createElement("li");
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
      const caption = document.createElement("span");
      caption.className = "gallery-caption";
      caption.textContent = item.alt;
      button.append(img, caption);
      li.appendChild(button);
      grid.appendChild(li);
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
    return !!(currentUser && group && group.createdBy && group.createdBy === currentUser.id);
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

  function adoptSession(session) {
    const user = session && session.user;
    if (!user || !remote) {
      currentUser = null;
      return Promise.resolve();
    }
    return remote.from("profiles").select("display_name, role").eq("id", user.id).maybeSingle().then(function (result) {
      const profile = result && result.data;
      const meta = user.user_metadata || {};
      let role = "member";
      if (profile && (profile.role === "officer" || profile.role === "admin")) role = profile.role;
      currentUser = {
        id: user.id,
        email: user.email || "",
        displayName: (profile && profile.display_name) || meta.display_name || user.email || "Mitglied",
        role: role,
      };
    });
  }

  function loadRemote() {
    remote = createRemote();
    if (!remote) {
      notify(OFFLINE_MSG, "error");
      return;
    }
    if (!authReady) {
      authReady = true;
      remote.auth.onAuthStateChange(function (event, session) {
        if (event === "SIGNED_OUT") {
          currentUser = null;
          updateAuthUI();
          renderPermissionSurfaces();
          return;
        }
        if (!session || (event !== "SIGNED_IN" && event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED")) return;
        adoptSession(session).then(function () {
          updateAuthUI();
          renderPermissionSurfaces();
        }).catch(function () {
          updateAuthUI();
        });
      });
    }
    remote.auth.getSession().then(function (result) {
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
      if (chatResult.error) throw chatResult.error;
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
      const messages = (chatResult.data || []).slice().reverse().map(mapChat);
      replaceItems(chatMessages, messages);
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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
})();
