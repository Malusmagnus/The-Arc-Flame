/* The Arc Flame
   Alle veränderlichen Daten bleiben in localStorage dieses Browsers.
   Schlüssel: arc_users, arc_current_user, arc_retail_members, arc_forever_members,
   arc_retail_raid, arc_forever_raid, arc_mplus_groups, arc_classic_runs,
   arc_guild_chat, arc_guild_info, arc_application_at. */
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
  };

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
  let resetArmed = false;
  let gallery = [];
  let galleryIndex = 0;
  let revealObserver = null;
  const LEGACY_GUILD_INFO = {
    col1: "The Arc Flame steht für ehrgeizige, aber entspannte Horde-Gemeinschaft. Unser klares Ziel ist es, den mythischen Raid-Content zu meistern und Bosse im höchsten Schwierigkeitsgrad zu bezwingen.",
    col2: "Retail: Samstag von 20:00 bis 22:00 Uhr mit vollem Fokus auf den Mythic-Progress. Classic: Aufbau von 10er, 20er und dem ultimativen Ziel, den 40er-Raid zum Beben zu bringen!",
  };

  const users = loadUsers();
  const retailMembers = loadArray("arc_retail_members", DEFAULTS.retailMembers);
  const foreverMembers = loadArray("arc_forever_members", DEFAULTS.foreverMembers);
  const retailRaid = loadArray("arc_retail_raid", DEFAULTS.retailRaid);
  const foreverRaid = loadArray("arc_forever_raid", DEFAULTS.foreverRaid);
  const mplusGroups = loadArray("arc_mplus_groups", DEFAULTS.mplusGroups);
  const classicRuns = loadArray("arc_classic_runs", DEFAULTS.classicRuns);
  const chatMessages = loadArray("arc_guild_chat", DEFAULTS.chatMessages);
  const guildInfo = loadGuildInfo();
  let currentUser = readCurrentUser();

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
    loadGuildInfoView();
    updateAuthUI();
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
    const index = Number(el.dataset.index);

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
      removeMember(front, index);
      return;
    }
    if (action === "remove-raid") {
      removeRaidMember(front, index);
      return;
    }
    if (action === "remove-mplus") {
      removeMPlusGroup(index);
      return;
    }
    if (action === "remove-classic") {
      removeClassicRun(index);
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
      return;
    }
    if (action === "reset-local") {
      resetLocalData(el);
    }
  }

  function onChange(event) {
    const roleInput = event.target.closest('[data-action="raid-role"]');
    if (!roleInput) return;
    updateRaidRole(
      roleInput.dataset.front === "forever" ? "forever" : "retail",
      Number(roleInput.dataset.index),
      roleInput.value
    );
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
      name.appendChild(
        document.createTextNode(
          " " +
            currentUser.username +
            " (" +
            (currentUser.role === "raidplanner" ? "Raidplaner" : "Mitglied") +
            ")"
        )
      );
      const logout = document.createElement("button");
      logout.type = "button";
      logout.dataset.action = "logout";
      logout.className = "ml-1 inline-flex min-h-11 min-w-11 items-center justify-center text-slate-400 hover:text-red-400";
      logout.setAttribute("aria-label", "Abmelden");
      logout.title = "Abmelden";
      logout.innerHTML = '<i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i>';
      pill.appendChild(name);
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
    syncLocks();
    prefillChatAuthor();
  }

  function syncLocks() {
    const planner = isRaidPlanner();
    ["retail-raid-add-btn", "forever-raid-add-btn", "classic-run-add-btn"].forEach(function (id) {
      const button = document.getElementById(id);
      if (!button) return;
      button.classList.toggle("opacity-60", !planner);
      button.setAttribute("aria-disabled", planner ? "false" : "true");
      button.title = planner ? "" : "Nur für Raidplaner";
    });
    const mplus = document.getElementById("mplus-add-btn");
    if (mplus) {
      const loggedIn = !!currentUser;
      mplus.classList.toggle("opacity-60", !loggedIn);
      mplus.setAttribute("aria-disabled", loggedIn ? "false" : "true");
      mplus.title = loggedIn ? "" : "Anmeldung erforderlich";
    }
  }

  function isRaidPlanner() {
    return !!(currentUser && currentUser.role === "raidplanner");
  }

  function openAuthModal() {
    const form = document.getElementById("auth-form");
    form.reset();
    syncAuthMode();
    openModal("auth-modal");
  }

  function syncAuthMode() {
    const register = document.getElementById("auth-mode").value === "register";
    document.getElementById("auth-role-wrap").hidden = !register;
    document.getElementById("auth-password").autocomplete = register ? "new-password" : "current-password";
  }

  function handleAuthSubmit(form) {
    const username = document.getElementById("auth-username").value.trim();
    const password = document.getElementById("auth-password").value;
    const mode = document.getElementById("auth-mode").value;
    if (!username || !password) {
      notify("Bitte Benutzername und Passwort ausfüllen.", "error");
      return;
    }
    if (mode === "register") {
      if (users.some(function (user) { return user.username.toLowerCase() === username.toLowerCase(); })) {
        notify("Dieser Benutzername ist bereits vergeben!", "error");
        return;
      }
      const role = document.getElementById("auth-role").value === "raidplanner" ? "raidplanner" : "member";
      const created = { username: username, password: password, role: role };
      users.push(created);
      if (!save("arc_users", users)) {
        users.pop();
        return;
      }
      currentUser = created;
      if (!save("arc_current_user", currentUser)) {
        currentUser = null;
        return;
      }
      notify("Erfolgreich registriert und eingeloggt!", "info");
    } else {
      const found = users.find(function (user) {
        return user.username.toLowerCase() === username.toLowerCase() && user.password === password;
      });
      if (!found) {
        notify("Falscher Benutzername oder falsches Passwort!", "error");
        return;
      }
      currentUser = {
        username: found.username,
        password: found.password,
        role: found.role === "raidplanner" ? "raidplanner" : "member",
      };
      if (!save("arc_current_user", currentUser)) {
        currentUser = null;
        return;
      }
      notify("Erfolgreich eingeloggt als " + currentUser.username, "info");
    }
    closeModal("auth-modal");
    form.reset();
    updateAuthUI();
    renderRaidKader("retail");
    renderRaidKader("forever");
  }

  function logoutUser() {
    currentUser = null;
    try {
      localStorage.removeItem("arc_current_user");
    } catch (err) {
      notify("Abmelden ist in diesem Browser gerade nicht möglich.", "error");
      return;
    }
    updateAuthUI();
    renderRaidKader("retail");
    renderRaidKader("forever");
    notify("Du wurdest abgemeldet.", "info");
  }

  function prefillChatAuthor() {
    const input = document.getElementById("chat-author");
    if (currentUser && input && !input.value) input.value = currentUser.username;
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
      card.draggable = true;
      card.dataset.memberName = member.name;
      card.dataset.front = front;
      const body = document.createElement("div");
      body.className = "flex min-w-0 items-center gap-3 pointer-events-none";
      body.innerHTML =
        '<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-xs font-bold text-amber-400" aria-hidden="true"><i class="fa-solid fa-user"></i></div>' +
        '<div class="min-w-0"><p class="truncate text-sm font-bold text-white"></p><p class="truncate text-xs text-slate-400"></p></div>';
      body.querySelector("p").textContent = member.name;
      body.querySelectorAll("p")[1].textContent = member.rank || "";
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = "remove-member";
      button.dataset.front = front;
      button.dataset.index = String(entry.index);
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
      card.append(body, button);
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
    const locked = !isRaidPlanner();
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
      input.readOnly = locked;
      input.dataset.action = "raid-role";
      input.dataset.front = front;
      input.dataset.index = String(index);
      input.className =
        "w-28 rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-bold text-amber-400 focus:border-amber-400";
      input.setAttribute("aria-label", "Rolle von " + slot.name);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "remove-raid";
      remove.dataset.front = front;
      remove.dataset.index = String(index);
      remove.className =
        "inline-flex min-h-11 min-w-11 items-center justify-center text-slate-500 hover:text-red-500";
      remove.setAttribute("aria-label", slot.name + " aus dem Kader entfernen");
      remove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      const name = document.createElement("p");
      name.className = "break-words text-base font-black text-white";
      name.textContent = slot.name;
      row.append(input, remove);
      card.append(row, name);
      gridEl.appendChild(card);
    });
  }

  function updateRaidRole(front, index, newRole) {
    if (!isRaidPlanner()) {
      notify("Nur berechtigte Raidplaner dürfen den Raidkader bearbeiten!", "error");
      renderRaidKader(front);
      return;
    }
    const kader = kaderOf(front);
    if (!kader[index]) return;
    kader[index].role = newRole.trim() || kader[index].role;
    save(storageKey(front, "raid"), kader);
    renderRaidKader(front);
  }

  function dropToRaid(event, front) {
    event.preventDefault();
    if (!isRaidPlanner()) {
      notify(
        "Achtung: Nur berechtigte Raidplaner dürfen Mitglieder in den Raidkader verschieben! Bitte logge dich als Raidplaner ein.",
        "error"
      );
      if (!currentUser) openAuthModal();
      return;
    }
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
    kader.push({ name: data.name, role: front === "retail" ? "Melee-DD" : "DD" });
    if (!save(storageKey(front, "raid"), kader)) {
      kader.pop();
      return;
    }
    renderRaidKader(front);
  }

  function openAddMemberModal(front) {
    const form = document.getElementById("member-form");
    form.reset();
    document.getElementById("modal-front").value = front;
    openModal("member-modal");
  }

  function openAddRaidModal(front) {
    if (!isRaidPlanner()) {
      notify("Zugriff verwehrt! Nur der Flammenrat bzw. berechtigte Raidplaner dürfen den Raidkader verwalten.", "error");
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
      notify("Bitte melde dich kurz an, um eine M+ Gruppe zu erstellen.", "error");
      openAuthModal();
      return;
    }
    document.getElementById("mplus-form").reset();
    openModal("mplus-modal");
  }

  function openClassicRaidModal() {
    if (!isRaidPlanner()) {
      notify("Zugriff verwehrt! Nur berechtigte Raidplaner dürfen Classic-Runs planen.", "error");
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
    const front = document.getElementById("modal-front").value === "forever" ? "forever" : "retail";
    const name = document.getElementById("modal-char-name").value.trim();
    const rank = document.getElementById("modal-char-rank").value;
    if (!name) {
      notify("Bitte einen Charakternamen eintragen.", "error");
      return;
    }
    const list = membersOf(front);
    list.push({ name: name, rank: rank });
    if (!save(storageKey(front, "members"), list)) {
      list.pop();
      return;
    }
    renderMembers(front);
    closeModal("member-modal");
    form.reset();
  }

  function removeMember(front, index) {
    const list = membersOf(front);
    if (!list[index]) return;
    list.splice(index, 1);
    save(storageKey(front, "members"), list);
    renderMembers(front);
  }

  function saveRaidMember(form) {
    const front = document.getElementById("modal-raid-front").value === "forever" ? "forever" : "retail";
    const name = document.getElementById("modal-raid-name").value.trim();
    const role = document.getElementById("modal-raid-role").value;
    if (!name) {
      notify("Bitte einen Namen eintragen.", "error");
      return;
    }
    const kader = kaderOf(front);
    kader.push({ name: name, role: role });
    if (!save(storageKey(front, "raid"), kader)) {
      kader.pop();
      return;
    }
    renderRaidKader(front);
    closeModal("raid-modal");
    form.reset();
  }

  function removeRaidMember(front, index) {
    if (!isRaidPlanner()) {
      notify("Nur Raidplaner dürfen Mitglieder aus dem Kader entfernen!", "error");
      return;
    }
    const kader = kaderOf(front);
    if (!kader[index]) return;
    kader.splice(index, 1);
    save(storageKey(front, "raid"), kader);
    renderRaidKader(front);
  }

  function saveMPlusGroup(form) {
    const dds = document
      .getElementById("mp-dds")
      .value.split(",")
      .map(function (part) { return part.trim(); })
      .filter(Boolean);
    const group = {
      name: document.getElementById("mp-group-name").value.trim(),
      dungeon: document.getElementById("mp-dungeon").value.trim(),
      time: document.getElementById("mp-time").value.trim(),
      tank: document.getElementById("mp-tank").value.trim(),
      heal: document.getElementById("mp-heal").value.trim(),
      dds: dds,
    };
    if (!group.name || !group.dungeon || !group.time || !group.tank || !group.heal || !dds.length) {
      notify("Bitte alle Felder der M+-Gruppe ausfüllen.", "error");
      return;
    }
    mplusGroups.push(group);
    if (!save("arc_mplus_groups", mplusGroups)) {
      mplusGroups.pop();
      return;
    }
    renderMPlusGroups();
    closeModal("mplus-modal");
    form.reset();
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
      const index = mplusGroups.indexOf(group);
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
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "remove-mplus";
      remove.dataset.index = String(index);
      remove.className =
        "inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-slate-500 hover:text-red-500";
      remove.setAttribute("aria-label", "M+-Gruppe " + group.name + " entfernen");
      remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
      head.append(titles, remove);
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
      card.append(head, time, roles);
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

  function removeMPlusGroup(index) {
    if (!mplusGroups[index]) return;
    mplusGroups.splice(index, 1);
    save("arc_mplus_groups", mplusGroups);
    renderMPlusGroups();
  }

  function saveClassicRun(form) {
    const run = {
      name: document.getElementById("cr-name").value.trim(),
      size: document.getElementById("cr-size").value,
      time: document.getElementById("cr-time").value.trim(),
    };
    if (!run.name || !run.time || !["10", "20", "40"].includes(run.size)) {
      notify("Bitte Instanz und Termin ausfüllen.", "error");
      return;
    }
    classicRuns.push(run);
    if (!save("arc_classic_runs", classicRuns)) {
      classicRuns.pop();
      return;
    }
    renderClassicRuns();
    closeModal("classic-raid-modal");
    form.reset();
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
      const index = classicRuns.indexOf(run);
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
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.action = "remove-classic";
      remove.dataset.index = String(index);
      remove.className =
        "inline-flex min-h-11 min-w-11 items-center justify-center text-sm text-slate-500 hover:text-red-500";
      remove.setAttribute("aria-label", "Classic-Run " + run.name + " entfernen");
      remove.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
      head.append(titles, remove);
      const time = document.createElement("p");
      time.className = "flex items-center gap-2 text-xs text-slate-400";
      time.innerHTML = '<i class="fa-solid fa-clock text-amber-400" aria-hidden="true"></i> ';
      time.appendChild(document.createTextNode(run.time || ""));
      card.append(head, time);
      grid.appendChild(card);
    });
  }

  function removeClassicRun(index) {
    if (!isRaidPlanner()) {
      notify("Nur Raidplaner dürfen Classic-Runs löschen!", "error");
      return;
    }
    if (!classicRuns[index]) return;
    classicRuns.splice(index, 1);
    save("arc_classic_runs", classicRuns);
    renderClassicRuns();
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
    chatMessages.push(entry);
    trimChat();
    try {
      localStorage.setItem("arc_guild_chat", JSON.stringify(chatMessages));
      return true;
    } catch (err) {
      chatMessages.pop();
      return false;
    }
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
    const author = document.getElementById("chat-author").value.trim();
    const text = document.getElementById("chat-text").value.trim();
    if (!author || !text) {
      notify("Bitte Name und Nachricht ausfüllen.", "error");
      return;
    }
    chatMessages.push({ author: author, text: text, time: clock() });
    trimChat();
    if (!save("arc_guild_chat", chatMessages)) {
      chatMessages.pop();
      return;
    }
    renderChat();
    document.getElementById("chat-text").value = "";
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
      empty.textContent = "Noch keine Nachrichten in diesem Browser.";
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
    guildInfo.col1 = document.getElementById("edit-col-1").value;
    guildInfo.col2 = document.getElementById("edit-col-2").value;
    guildInfo.col3 = document.getElementById("edit-col-3").value;
    if (!save("arc_guild_info", guildInfo)) return;
    loadGuildInfoView();
    cancelInfoEdit();
    notify("Gildeninfo in diesem Browser gespeichert.", "info");
  }

  function resetLocalData(button) {
    if (!resetArmed) {
      resetArmed = true;
      button.textContent = "Wirklich alle lokalen Daten löschen?";
      window.setTimeout(function () {
        resetArmed = false;
        button.textContent = "Lokale Daten löschen";
      }, 4000);
      return;
    }
    try {
      localStorage.clear();
    } catch (err) {
      notify("Die lokalen Daten konnten nicht gelöscht werden.", "error");
      return;
    }
    location.reload();
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

  function storageKey(front, kind) {
    return "arc_" + front + "_" + kind;
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

  function readJSON(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return undefined;
      return JSON.parse(raw);
    } catch (err) {
      return undefined;
    }
  }

  function loadArray(key, fallback) {
    const value = readJSON(key);
    if (!Array.isArray(value)) return clone(fallback || []);
    return value.filter(function (item) { return item && typeof item === "object"; });
  }

  function loadUsers() {
    return loadArray("arc_users", []).filter(function (user) {
      return typeof user.username === "string" && typeof user.password === "string";
    });
  }

  function loadGuildInfo() {
    const fallback = clone(DEFAULTS.guildInfo || { col1: "", col2: "", col3: "" });
    const value = readJSON("arc_guild_info");
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    ["col1", "col2", "col3"].forEach(function (key) {
      if (typeof value[key] === "string") fallback[key] = value[key];
      if (LEGACY_GUILD_INFO[key] && fallback[key] === LEGACY_GUILD_INFO[key]) {
        fallback[key] = (DEFAULTS.guildInfo && DEFAULTS.guildInfo[key]) || fallback[key];
      }
    });
    return fallback;
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

  function readCurrentUser() {
    const value = readJSON("arc_current_user");
    if (!value || typeof value.username !== "string") return null;
    return {
      username: value.username,
      password: typeof value.password === "string" ? value.password : "",
      role: value.role === "raidplanner" ? "raidplanner" : "member",
    };
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      notify("Speichern fehlgeschlagen. Der lokale Speicher dieses Browsers ist voll oder blockiert.", "error");
      return false;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
})();
