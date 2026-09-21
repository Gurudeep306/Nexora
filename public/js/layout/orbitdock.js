/**
 * =============================================================================
 * Nexora — OrbitDock Premium Sidebar Engine
 * Layout Engine  |  v2.0.0
 * =============================================================================
 *
 * Depends on sidebar-config.js being loaded first, which defines:
 *   ORBITDOCK_CONFIG  — nav data (orbit rail, workspaces, context actions, quick-create)
 *   ORBITDOCK_ICONS   — complete SVG icon set
 *   SIDEBAR_ICONS     — alias of ORBITDOCK_ICONS
 *
 * Architecture — 3-layer sidebar:
 *   1. Orbit Rail       — 56px slim left strip with icon orbit buttons
 *   2. Workspace Panel  — 244px panel with groups, search, pinned tools
 *   3. Context Actions  — Bottom section of panel that changes per page
 *
 * State stored in localStorage with prefix 'nexora_orbitdock_'.
 * No external dependencies — pure vanilla JS.
 * =============================================================================
 */

class OrbitDock {
  // ---------------------------------------------------------------------------
  // Constructor
  // ---------------------------------------------------------------------------

  constructor(options = {}) {
    this.options = {
      container: document.body,
      mode: this._detectMode(),
      onNavigate: null,
      ...options,
    };
    this.currentMode = this._loadState("mode", this.options.mode);
    this.collapsed = this._loadState("collapsed", false);
    this.searchQuery = "";
    this._searchTimeout = null;
    this.quickCreateOpen = false;
    this.mobileOpen = false;
    this.init();
  }

  // ---------------------------------------------------------------------------
  // State detection
  // ---------------------------------------------------------------------------

  _detectCurrentPage() {
    if (window.location.hash && window.location.hash.length > 2) {
      const hash = window.location.hash.slice(2); // remove '#/'
      return hash.split("?")[0].split("/")[0] || "hub";
    }
    const path = window.location.pathname;
    if (path.includes("studio")) return "studio";
    if (path.includes("explainlab")) return "explainlab";
    if (path.includes("live-class")) return "live-class";
    if (path.includes("forgebuilder")) return "forgebuilder";
    return "hub";
  }

  _detectMode() {
    const path = window.location.pathname;
    if (path.includes("studio")) return "creator";
    if (path.includes("explainlab")) return "creator";
    if (path.includes("live-class")) return "creator";
    if (path.includes("forgebuilder")) return "admin";
    return "student";
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  _loadState(key, defaultValue) {
    try {
      const value = localStorage.getItem("nexora_orbitdock_" + key);
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveState(key, value) {
    try {
      localStorage.setItem("nexora_orbitdock_" + key, JSON.stringify(value));
    } catch (e) {
      // localStorage unavailable — degrade silently
    }
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  init() {
    this._render();
    this._bindEvents();
    this._updateActiveState();
    // Push body class for content margin
    document.body.classList.add("orbitdock-active");
    if (this.collapsed) document.body.classList.add("orbitdock-collapsed");
    // Hash change listener
    window.addEventListener("hashchange", () => {
      this._updateActiveState();
      this._refreshContextActions();
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering — root
  // ---------------------------------------------------------------------------

  _render() {
    const dock = document.createElement("div");
    dock.id = "orbitdock";
    dock.className = "orbitdock";
    if (this.collapsed) dock.classList.add("collapsed");

    dock.appendChild(this._renderOrbitRail());
    dock.appendChild(this._renderWorkspacePanel());
    dock.appendChild(this._renderQuickCreateMenu());
    dock.appendChild(this._renderMobileOverlay());

    // Mobile toggle is appended to body, not the dock
    document.body.appendChild(this._renderMobileToggle());

    document.body.insertBefore(dock, document.body.firstChild);
  }

  // ---------------------------------------------------------------------------
  // Rendering — orbit rail
  // ---------------------------------------------------------------------------

  _renderOrbitRail() {
    const rail = document.createElement("div");
    rail.className = "orbitdock-rail";

    // ── Logo button ────────────────────────────────────────────────────────
    const logo = document.createElement("button");
    logo.className = "orbit-button orbit-logo";
    logo.setAttribute("aria-label", "Nexora Home");
    logo.setAttribute("title", "Nexora Home");
    logo.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS["nexora"]
        ? ORBITDOCK_ICONS["nexora"]
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
           stroke-linecap="round" stroke-linejoin="round">
           <text x="5" y="18" font-size="14" font-weight="bold" stroke="none" fill="currentColor">N</text>
         </svg>`;
    logo.addEventListener("click", () => {
      if (window.location.hash) {
        window.location.hash = "/hub";
      } else {
        window.location.href = "/";
      }
    });
    rail.appendChild(logo);

    // ── Mode-to-orbit map ─────────────────────────────────────────────────
    const modeMap = {
      hq: "student",
      code: "student",
      learn: "student",
      studio: "creator",
      live: "creator",
      build: "admin",
      ai: "student",
    };

    // ── Orbit items ────────────────────────────────────────────────────────
    const orbitItems =
      typeof ORBITDOCK_CONFIG !== "undefined" && ORBITDOCK_CONFIG.orbit
        ? ORBITDOCK_CONFIG.orbit
        : [];
    orbitItems.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "orbit-button";
      btn.id = `orbit-${item.id}`;
      btn.setAttribute("aria-label", item.label);
      btn.setAttribute("title", item.label);
      btn.innerHTML =
        typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS[item.icon]
          ? ORBITDOCK_ICONS[item.icon]
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
             stroke-linecap="round" stroke-linejoin="round">
             <circle cx="12" cy="12" r="4"/>
           </svg>`;

      btn.addEventListener("click", () => {
        // Switch mode if this orbit maps to a mode
        if (modeMap[item.id]) {
          const newMode = modeMap[item.id];
          if (newMode !== this.currentMode) {
            this._switchMode(newMode);
          }
        }
        // Navigate to the orbit's route
        if (item.route) {
          if (item.route.startsWith("#")) {
            window.location.hash = item.route.slice(1);
          } else if (item.route.startsWith("/")) {
            window.location.href = item.route;
          }
        }
      });

      rail.appendChild(btn);
    });

    // ── Spacer ─────────────────────────────────────────────────────────────
    const spacer = document.createElement("div");
    spacer.className = "orbit-spacer";
    spacer.style.flex = "1";
    rail.appendChild(spacer);

    // ── Quick Create button ────────────────────────────────────────────────
    const createBtn = document.createElement("button");
    createBtn.className = "orbit-button orbit-create";
    createBtn.setAttribute("aria-label", "Quick Create");
    createBtn.setAttribute("title", "Quick Create");
    createBtn.id = "orbit-create-btn";
    createBtn.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS["plus"]
        ? ORBITDOCK_ICONS["plus"]
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
           stroke-linecap="round" stroke-linejoin="round">
           <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
         </svg>`;
    createBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._toggleQuickCreate();
    });
    rail.appendChild(createBtn);

    // ── Settings button ────────────────────────────────────────────────────
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "orbit-button orbit-settings";
    settingsBtn.setAttribute("aria-label", "Settings");
    settingsBtn.setAttribute("title", "Settings");
    settingsBtn.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS["settings"]
        ? ORBITDOCK_ICONS["settings"]
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
           stroke-linecap="round" stroke-linejoin="round">
           <circle cx="12" cy="12" r="3"/>
         </svg>`;
    settingsBtn.addEventListener("click", () => {
      window.location.hash = "/settings";
    });
    rail.appendChild(settingsBtn);

    return rail;
  }

  // ---------------------------------------------------------------------------
  // Rendering — workspace panel
  // ---------------------------------------------------------------------------

  _renderWorkspacePanel() {
    const panel = document.createElement("div");
    panel.className = "orbitdock-panel";
    panel.id = "orbitdock-panel";

    const workspace =
      typeof ORBITDOCK_CONFIG !== "undefined" && ORBITDOCK_CONFIG.workspaces
        ? ORBITDOCK_CONFIG.workspaces[this.currentMode] || {}
        : {};

    // ── Header ─────────────────────────────────────────────────────────────
    const header = document.createElement("div");
    header.className = "orbitdock-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "orbitdock-workspace-title";

    const h3 = document.createElement("h3");
    h3.textContent = workspace.title || "Workspace";

    const subtitle = document.createElement("p");
    subtitle.textContent = workspace.subtitle || "";

    titleWrap.appendChild(h3);
    titleWrap.appendChild(subtitle);
    header.appendChild(titleWrap);

    const collapseBtn = document.createElement("button");
    collapseBtn.className = "orbitdock-collapse-btn";
    collapseBtn.setAttribute("title", "Collapse");
    collapseBtn.setAttribute("aria-label", "Collapse sidebar");
    collapseBtn.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS["chevronLeft"]
        ? ORBITDOCK_ICONS["chevronLeft"]
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
           stroke-linecap="round" stroke-linejoin="round">
           <polyline points="15 18 9 12 15 6"/>
         </svg>`;
    header.appendChild(collapseBtn);
    panel.appendChild(header);

    // ── Search ─────────────────────────────────────────────────────────────
    const searchWrap = document.createElement("div");
    searchWrap.className = "orbitdock-search";

    const inputWrap = document.createElement("div");
    inputWrap.className = "search-input-wrap";

    const searchIcon = document.createElement("span");
    searchIcon.className = "search-icon";
    searchIcon.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS["search"]
        ? ORBITDOCK_ICONS["search"]
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
           stroke-linecap="round" stroke-linejoin="round">
           <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
         </svg>`;

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "search-input";
    searchInput.placeholder = "Search tools...";
    searchInput.setAttribute("aria-label", "Search sidebar tools");
    searchInput.setAttribute("autocomplete", "off");
    searchInput.value = this.searchQuery;

    inputWrap.appendChild(searchIcon);
    inputWrap.appendChild(searchInput);
    searchWrap.appendChild(inputWrap);
    panel.appendChild(searchWrap);

    // ── Scrollable nav area ────────────────────────────────────────────────
    const scrollArea = this._renderNavScrollArea(workspace);
    panel.appendChild(scrollArea);

    // ── Status card (outside scroll, at bottom) ────────────────────────────
    if (workspace.statusCard) {
      panel.appendChild(this._renderStatusCard(workspace.statusCard));
    }

    return panel;
  }

  // ---------------------------------------------------------------------------
  // Rendering — nav scroll area
  // ---------------------------------------------------------------------------

  _renderNavScrollArea(workspace) {
    const scrollArea = document.createElement("div");
    scrollArea.className = "orbitdock-nav-scroll";

    // Pinned tools
    const pinned = this._renderPinnedTools(workspace);
    if (pinned) scrollArea.appendChild(pinned);

    // Nav groups
    const groups = workspace.groups || [];
    groups.forEach((group) => {
      scrollArea.appendChild(this._renderNavGroup(group));
    });

    // Context actions
    const context = this._renderContextActions();
    if (context) scrollArea.appendChild(context);

    return scrollArea;
  }

  // ---------------------------------------------------------------------------
  // Rendering — pinned tools
  // ---------------------------------------------------------------------------

  _renderPinnedTools(workspace) {
    // Find the actual item objects for pinnedTools IDs
    const pinnedItems = (workspace.pinnedTools || [])
      .map((pinId) => {
        for (const group of workspace.groups || []) {
          const found = group.items.find((item) => item.id === pinId);
          if (found) return found;
        }
        return null;
      })
      .filter(Boolean);

    if (pinnedItems.length === 0) return null;

    const section = document.createElement("div");
    section.className = "orbitdock-pinned";

    const pinnedLabel = document.createElement("div");
    pinnedLabel.className = "pinned-label";
    pinnedLabel.textContent = "Quick Access";
    section.appendChild(pinnedLabel);

    const items = document.createElement("div");
    items.className = "pinned-items";
    pinnedItems.forEach((item) =>
      items.appendChild(this._createNavItem(item, true)),
    );
    section.appendChild(items);

    return section;
  }

  // ---------------------------------------------------------------------------
  // Rendering — nav group
  // ---------------------------------------------------------------------------

  _renderNavGroup(group) {
    const section = document.createElement("div");
    section.className = "orbitdock-group";
    section.dataset.groupId = group.id;

    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group.title;
    section.appendChild(title);

    const items = document.createElement("div");
    items.className = "group-items";
    (group.items || []).forEach((item) =>
      items.appendChild(this._createNavItem(item)),
    );
    section.appendChild(items);

    return section;
  }

  // ---------------------------------------------------------------------------
  // Rendering — nav item button
  // ---------------------------------------------------------------------------

  _createNavItem(item, isPinned = false) {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    if (isPinned) btn.classList.add("pinned");
    btn.setAttribute("data-item-id", item.id);
    btn.setAttribute("data-route", item.route || "");
    if (item.tab) btn.setAttribute("data-tab", item.tab);
    btn.setAttribute("aria-label", item.label);

    const iconEl = document.createElement("span");
    iconEl.className = "nav-item-icon";
    iconEl.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined"
        ? ORBITDOCK_ICONS[item.icon] || ORBITDOCK_ICONS["help"] || ""
        : "";

    const labelEl = document.createElement("span");
    labelEl.className = "nav-item-label";
    labelEl.textContent = item.label;

    btn.appendChild(iconEl);
    btn.appendChild(labelEl);

    if (item.badge !== null && item.badge !== undefined) {
      const badgeEl = document.createElement("span");
      badgeEl.className =
        "nav-item-badge" + (item.badge === "NEW" ? " badge-new" : "");
      badgeEl.textContent = item.badge;
      badgeEl.dataset.itemBadge = item.id;
      btn.appendChild(badgeEl);
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._navigate(item.route, item.tab, item.action);
    });

    return btn;
  }

  // ---------------------------------------------------------------------------
  // Rendering — context actions
  // ---------------------------------------------------------------------------

  _renderContextActions() {
    const currentPage = this._detectCurrentPage();
    const actions =
      typeof ORBITDOCK_CONFIG !== "undefined" && ORBITDOCK_CONFIG.contextActions
        ? ORBITDOCK_CONFIG.contextActions[currentPage]
        : null;

    if (!actions || actions.length === 0) return null;

    const section = document.createElement("div");
    section.className = "orbitdock-context";
    section.id = "orbitdock-context";

    const ctxLabel = document.createElement("div");
    ctxLabel.className = "context-label";
    ctxLabel.textContent = "Context Actions";
    section.appendChild(ctxLabel);

    const items = document.createElement("div");
    items.className = "context-items";

    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.className = "context-action-btn";
      btn.setAttribute("data-action", action.id);
      btn.setAttribute("aria-label", action.label);

      const icon = document.createElement("span");
      icon.className = "action-icon";
      icon.innerHTML =
        typeof ORBITDOCK_ICONS !== "undefined"
          ? ORBITDOCK_ICONS[action.icon] || ORBITDOCK_ICONS["zap"] || ""
          : "";

      const lbl = document.createElement("span");
      lbl.className = "action-label";
      lbl.textContent = action.label;

      btn.appendChild(icon);
      btn.appendChild(lbl);
      btn.addEventListener("click", () => this._handleAction(action.action));
      items.appendChild(btn);
    });

    section.appendChild(items);
    return section;
  }

  // ---------------------------------------------------------------------------
  // Rendering — refresh context actions on hash change
  // ---------------------------------------------------------------------------

  _refreshContextActions() {
    const existing = document.getElementById("orbitdock-context");
    if (existing) existing.remove();

    const newContext = this._renderContextActions();
    if (newContext) {
      const scrollArea = document.querySelector(
        "#orbitdock-panel .orbitdock-nav-scroll",
      );
      if (scrollArea) scrollArea.appendChild(newContext);
    }
  }

  // ---------------------------------------------------------------------------
  // Rendering — status card
  // ---------------------------------------------------------------------------

  _renderStatusCard(cardConfig) {
    const card = document.createElement("div");
    card.className = "orbitdock-status-card";
    card.id = "orbitdock-status-card";

    const title = document.createElement("div");
    title.className = "status-card-title";
    title.textContent = cardConfig.title;
    card.appendChild(title);

    const rows = document.createElement("div");
    rows.className = "status-card-rows";

    const fieldLabels = {
      level: "Level",
      streak: "Streak",
      solved: "Solved",
      xp: "XP",
      drafts: "Drafts",
      doubts: "Doubts",
      scheduled: "Scheduled",
      recordings: "Recordings",
      health: "System",
      pending: "Pending",
      warnings: "Warnings",
    };

    (cardConfig.fields || []).forEach((field) => {
      const row = document.createElement("div");
      row.className = "status-row";

      const lbl = document.createElement("span");
      lbl.className = "status-row-label";
      lbl.textContent = fieldLabels[field] || field;

      const val = document.createElement("span");
      val.className = "status-row-value";
      val.id = `orbitdock-status-${field}`;
      val.textContent = "—"; // placeholder, populated by _populateStatusCard

      row.appendChild(lbl);
      row.appendChild(val);
      rows.appendChild(row);
    });

    card.appendChild(rows);

    // Populate async so page state has time to load
    setTimeout(() => this._populateStatusCard(cardConfig.fields || []), 500);

    return card;
  }

  // ---------------------------------------------------------------------------
  // Status card data population
  // ---------------------------------------------------------------------------

  _populateStatusCard(fields) {
    fields.forEach((field) => {
      const el = document.getElementById(`orbitdock-status-${field}`);
      if (!el) return;

      try {
        if (field === "level" && window.App?._level != null) {
          el.textContent = window.App._level || "—";
        } else if (field === "streak" && window.App?._streak !== undefined) {
          el.textContent =
            window.App._streak > 0 ? window.App._streak + " 🔥" : "0";
        } else if (field === "solved" && window.App?._solved !== undefined) {
          el.textContent = window.App._solved;
        } else if (field === "xp" && window.App?._xp !== undefined) {
          el.textContent = window.App._xp;
        } else if (
          field === "doubts" &&
          window.Studio?.doubtsCount !== undefined
        ) {
          el.textContent = window.Studio.doubtsCount;
        } else if (field === "health") {
          el.textContent = "✓ OK";
        } else {
          el.textContent = "—";
        }
      } catch (e) {
        el.textContent = "—";
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Rendering — quick create menu
  // ---------------------------------------------------------------------------

  _renderQuickCreateMenu() {
    const menu = document.createElement("div");
    menu.id = "orbitdock-quick-create";
    menu.className = "orbitdock-quick-create hidden";

    const menuTitle = document.createElement("div");
    menuTitle.className = "quick-create-title";
    menuTitle.textContent = "Quick Create";
    menu.appendChild(menuTitle);

    const createActions =
      typeof ORBITDOCK_CONFIG !== "undefined" && ORBITDOCK_CONFIG.quickCreate
        ? ORBITDOCK_CONFIG.quickCreate[this.currentMode] || []
        : [];

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "quick-create-items";

    createActions.forEach((action) => {
      const btn = document.createElement("button");
      btn.className = "quick-create-item";
      btn.setAttribute("aria-label", action.label);

      const iconEl = document.createElement("span");
      iconEl.className = "quick-create-icon";
      iconEl.innerHTML =
        typeof ORBITDOCK_ICONS !== "undefined"
          ? ORBITDOCK_ICONS[action.icon] || ORBITDOCK_ICONS["zap"] || ""
          : "";

      const labelEl = document.createElement("span");
      labelEl.className = "quick-create-label";
      labelEl.textContent = action.label;

      btn.appendChild(iconEl);
      btn.appendChild(labelEl);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._handleAction(action.action);
        this._closeQuickCreate();
      });

      itemsContainer.appendChild(btn);
    });

    menu.appendChild(itemsContainer);
    return menu;
  }

  // ---------------------------------------------------------------------------
  // Rendering — mobile overlay
  // ---------------------------------------------------------------------------

  _renderMobileOverlay() {
    const overlay = document.createElement("div");
    overlay.className = "orbitdock-mobile-overlay";
    overlay.addEventListener("click", () => this.closeMobileDrawer());
    return overlay;
  }

  // ---------------------------------------------------------------------------
  // Rendering — mobile toggle button (appended to body)
  // ---------------------------------------------------------------------------

  _renderMobileToggle() {
    const btn = document.createElement("button");
    btn.className = "orbitdock-mobile-toggle";
    btn.setAttribute("aria-label", "Open navigation");
    btn.setAttribute("title", "Open navigation");
    btn.innerHTML =
      typeof ORBITDOCK_ICONS !== "undefined" && ORBITDOCK_ICONS["menu"]
        ? ORBITDOCK_ICONS["menu"]
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
           stroke-linecap="round" stroke-linejoin="round">
           <line x1="3" y1="6" x2="21" y2="6"/>
           <line x1="3" y1="12" x2="21" y2="12"/>
           <line x1="3" y1="18" x2="21" y2="18"/>
         </svg>`;
    btn.addEventListener("click", () => this.openMobileDrawer());
    return btn;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  _bindEvents() {
    const dock = document.getElementById("orbitdock");
    if (!dock) return;

    // Event delegation on the dock container for collapse button
    dock.addEventListener("click", (e) => {
      if (e.target.closest(".orbitdock-collapse-btn")) {
        this.toggleCollapse();
      }
    });

    // Search input — debounced
    const searchInput = document.querySelector(
      "#orbitdock-panel .search-input",
    );
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(this._searchTimeout);
        this._searchTimeout = setTimeout(() => {
          this._handleSearch(e.target.value.trim());
        }, 150);
      });
    }

    // Close quick create when clicking outside the dock or menu
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest("#orbitdock") &&
        !e.target.closest("#orbitdock-quick-create")
      ) {
        this._closeQuickCreate();
      }
    });

    // Escape closes open menus and mobile drawer
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this._closeQuickCreate();
        this.closeMobileDrawer();
      }
    });

    // Ctrl/Cmd + B to toggle collapse
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        this.toggleCollapse();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Active state
  // ---------------------------------------------------------------------------

  _updateActiveState() {
    const currentPage = this._detectCurrentPage();

    // Page → orbit id mapping
    const pageToOrbit = {
      hub: "hq",
      problems: "code",
      contests: "code",
      submissions: "code",
      bookmarks: "code", // bookmarks → problems section
      learn: "learn",
      forge: "learn",
      nexus: "learn",
      workshop: "learn",
      achievements: "learn", // achievements → progress/nexus section
      skills: "hq",
      ailab: "ai",
      analytics: "ai",
      social: "hq",
      studio: "studio",
      explainlab: "studio",
      liveclass: "live",
      "live-class": "live",
      forgebuilder: "build",
    };

    // Clear all orbit active states
    document.querySelectorAll(".orbit-button").forEach((b) => {
      b.classList.remove("active");
      b.removeAttribute("aria-current");
    });

    const orbitId = pageToOrbit[currentPage] || "hq";
    const activeOrbit = document.getElementById(`orbit-${orbitId}`);
    if (activeOrbit) {
      activeOrbit.classList.add("active");
      activeOrbit.setAttribute("aria-current", "true");
    }

    // Clear all nav item active states
    document.querySelectorAll("#orbitdock .nav-item").forEach((item) => {
      item.classList.remove("active");
      item.removeAttribute("aria-current");
    });

    // Activate items matching current page id
    document
      .querySelectorAll(`#orbitdock .nav-item[data-item-id="${currentPage}"]`)
      .forEach((item) => {
        item.classList.add("active");
        item.setAttribute("aria-current", "page");
      });

    // Also activate items matching by exact route
    // currentRoute: location.hash.slice(1) gives e.g. '/hub' (no '#')
    // data-route stores e.g. '#/hub', so we must normalise before comparing.
    const currentRoute =
      window.location.hash.slice(1) || window.location.pathname;
    document
      .querySelectorAll("#orbitdock .nav-item[data-route]")
      .forEach((item) => {
        const route = item.getAttribute("data-route");
        if (!route) return;
        // Strip leading '#' so '#/hub' becomes '/hub' — matches currentRoute
        const normalizedRoute = route.startsWith("#") ? route.slice(1) : route;
        if (
          currentRoute === normalizedRoute ||
          currentRoute.startsWith(normalizedRoute + "?")
        ) {
          item.classList.add("active");
        }
      });
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  _handleSearch(query) {
    this.searchQuery = query;
    const allItems = document.querySelectorAll(
      "#orbitdock-panel .nav-item, #orbitdock-panel .context-action-btn",
    );
    const allGroups = document.querySelectorAll(
      "#orbitdock-panel .orbitdock-group, #orbitdock-panel .orbitdock-pinned",
    );

    if (!query) {
      // Restore everything
      allItems.forEach((item) => (item.style.display = ""));
      allGroups.forEach((group) => (group.style.display = ""));
      const noResults = document.getElementById("orbitdock-no-results");
      if (noResults) noResults.remove();
      return;
    }

    const q = query.toLowerCase();
    let anyMatch = false;

    allItems.forEach((item) => {
      const label = (
        item.querySelector(".nav-item-label, .action-label")?.textContent || ""
      ).toLowerCase();
      const matches = label.includes(q);
      item.style.display = matches ? "" : "none";
      if (matches) anyMatch = true;
    });

    // Hide group/pinned containers whose every item is hidden
    allGroups.forEach((group) => {
      const visibleItems = group.querySelectorAll(
        '.nav-item:not([style*="display: none"]):not([style*="display:none"])',
      );
      group.style.display = visibleItems.length > 0 ? "" : "none";
    });

    // No-results message
    let noResults = document.getElementById("orbitdock-no-results");
    if (!anyMatch) {
      if (!noResults) {
        noResults = document.createElement("div");
        noResults.id = "orbitdock-no-results";
        noResults.className = "orbitdock-no-results";
        noResults.textContent = "No tools found.";
        const scrollArea = document.querySelector(
          "#orbitdock-panel .orbitdock-nav-scroll",
        );
        if (scrollArea) scrollArea.appendChild(noResults);
      }
    } else {
      if (noResults) noResults.remove();
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  _navigate(route, tab, action) {
    if (action) {
      this._handleAction(action);
      return;
    }

    if (tab) {
      if (window.Studio?.switchTab) {
        if (!window.location.pathname.includes("studio")) {
          window.location.href = "/studio";
          return;
        }
        window.Studio.switchTab(tab);
        this.closeMobileDrawer();
        return;
      }
    }

    if (!route) return;

    if (route.startsWith("#")) {
      window.location.hash = route.slice(1); // strip leading '#'
    } else if (route.startsWith("/")) {
      window.location.href = route;
    }

    // Close mobile drawer after navigation
    this.closeMobileDrawer();
  }

  // ---------------------------------------------------------------------------
  // Mode switching
  // ---------------------------------------------------------------------------

  _switchMode(newMode) {
    if (
      typeof ORBITDOCK_CONFIG === "undefined" ||
      !ORBITDOCK_CONFIG.workspaces[newMode]
    )
      return;
    this.currentMode = newMode;
    this._saveState("mode", newMode);

    // Remove existing panel
    const oldPanel = document.getElementById("orbitdock-panel");
    if (oldPanel) oldPanel.remove();

    const dock = document.getElementById("orbitdock");
    if (dock) {
      const newPanel = this._renderWorkspacePanel();
      const rail = dock.querySelector(".orbitdock-rail");

      if (rail && rail.nextSibling) {
        dock.insertBefore(newPanel, rail.nextSibling);
      } else {
        dock.appendChild(newPanel);
      }

      // Re-bind search input on the new panel
      const searchInput = newPanel.querySelector(".search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          clearTimeout(this._searchTimeout);
          this._searchTimeout = setTimeout(() => {
            this._handleSearch(e.target.value.trim());
          }, 150);
        });
      }

      // Re-bind collapse button on the new panel
      const collapseBtn = newPanel.querySelector(".orbitdock-collapse-btn");
      if (collapseBtn) {
        collapseBtn.addEventListener("click", () => this.toggleCollapse());
      }
    }

    // Also rebuild the quick create menu for the new mode
    const oldQC = document.getElementById("orbitdock-quick-create");
    if (oldQC) oldQC.remove();
    const dockEl = document.getElementById("orbitdock");
    if (dockEl) dockEl.appendChild(this._renderQuickCreateMenu());

    this._updateActiveState();
  }

  // ---------------------------------------------------------------------------
  // Quick create
  // ---------------------------------------------------------------------------

  _toggleQuickCreate() {
    const menu = document.getElementById("orbitdock-quick-create");
    if (!menu) return;
    const isOpen = !menu.classList.contains("hidden");
    if (isOpen) {
      this._closeQuickCreate();
    } else {
      menu.classList.remove("hidden");
      this.quickCreateOpen = true;
    }
  }

  _closeQuickCreate() {
    const menu = document.getElementById("orbitdock-quick-create");
    if (menu) menu.classList.add("hidden");
    this.quickCreateOpen = false;
  }

  // ---------------------------------------------------------------------------
  // Actions dispatcher
  // ---------------------------------------------------------------------------

  _handleAction(action) {
    const handlers = {
      // ── Student actions ───────────────────────────────────────────────────
      solveProblem: () => {
        window.location.hash = "#/problems";
      },
      askDoubt: () => {
        window.location.hash = "#/social?tab=doubts";
      },
      joinLive: () => {
        window.location.href = "/live-class";
      },
      openAI: () => {
        window.location.hash = "#/ailab";
      },

      // ── Creator actions ───────────────────────────────────────────────────
      createCourse: () => {
        if (window.Studio?.createCourse) {
          window.Studio.createCourse();
        } else {
          window.location.href = "/studio";
          this._showToast("Navigate to Studio to create a course", "info");
        }
      },
      createLesson: () => {
        if (window.Studio?.createLesson) {
          window.Studio.createLesson();
        } else {
          window.location.href = "/studio";
          this._showToast("Navigate to Studio to create a lesson", "info");
        }
      },
      openPad: () => {
        window.location.href = "/explainlab?mode=whiteboard";
      },
      newExplain: () => {
        window.location.href = "/explainlab";
      },
      startLive: () => {
        window.location.href = "/live-class";
      },
      uploadNotes: () => {
        if (window.Studio?.uploadNotes) {
          window.Studio.uploadNotes();
        } else {
          this._showToast("Navigate to Studio to upload notes", "info");
        }
      },

      // ── Admin actions ─────────────────────────────────────────────────────
      createPage: () => {
        this._showToast(
          "This will be implemented in the next function.",
          "info",
        );
      },
      addUser: () => {
        this._showToast(
          "This will be implemented in the next function.",
          "info",
        );
      },
      editTheme: () => {
        this._showToast(
          "This will be implemented in the next function.",
          "info",
        );
      },
      runHealthCheck: () => {
        this._showToast(
          "This will be implemented in the next function.",
          "info",
        );
      },
      publishChanges: () => {
        this._showToast(
          "This will be implemented in the next function.",
          "info",
        );
      },

      // ── Context: problems ─────────────────────────────────────────────────
      openProblemsFilter: () => {
        if (window.App?.toggleProblemsFilter) window.App.toggleProblemsFilter();
        else this._showToast("Use the filter button in Problems page", "info");
      },
      filterByDifficulty: () => {
        window.location.hash = "#/problems?filter=difficulty";
      },
      filterByTags: () => {
        window.location.hash = "#/problems?filter=tags";
      },
      filterUnsolved: () => {
        window.location.hash = "#/problems?filter=unsolved";
      },
      filterRecommended: () => {
        window.location.hash = "#/problems?filter=recommended";
      },
      resetFilters: () => {
        if (window.App?.resetProblemsFilter) window.App.resetProblemsFilter();
        else window.location.hash = "#/problems";
      },

      // ── Context: learn ────────────────────────────────────────────────────
      searchTopics: () => {
        window.location.hash = "#/learn";
        document.querySelector(".learn-search")?.focus();
      },
      continueLast: () => {
        window.location.hash = "#/learn";
      },
      upcomingClasses: () => {
        window.location.hash = "#/learn?tab=live";
      },

      // ── Context: ailab ────────────────────────────────────────────────────
      aiPractice: () => {
        window.location.hash = "#/ailab";
      },
      filterML: () => {
        window.location.hash = "#/ailab?cat=ml";
      },
      filterDL: () => {
        window.location.hash = "#/ailab?cat=dl";
      },

      // ── Context: social ───────────────────────────────────────────────────
      findFriends: () => {
        window.location.hash = "#/social?tab=allies";
      },
      squadRooms: () => {
        window.location.hash = "#/social?tab=rooms";
      },
      activityFeed: () => {
        window.location.hash = "#/social?tab=feed";
      },

      // ── Context: live-class ───────────────────────────────────────────────
      toggleCamera: () => {
        const btn =
          document.querySelector('[data-lc-action="camera"]') ||
          document.getElementById("lc-camera-btn");
        if (btn) btn.click();
        else
          this._showToast(
            "Use the camera button in LiveClass controls",
            "info",
          );
      },
      toggleMic: () => {
        const btn =
          document.querySelector('[data-lc-action="mic"]') ||
          document.getElementById("lc-mic-btn");
        if (btn) btn.click();
        else
          this._showToast("Use the mic button in LiveClass controls", "info");
      },
      shareScreen: () => {
        this._showToast("Use the screen share button in LiveClass", "info");
      },
      toggleChat: () => {
        this._showToast("Use the chat panel in LiveClass", "info");
      },
      toggleRecord: () => {
        this._showToast("Use the record button in LiveClass", "info");
      },

      // ── Context: explainlab ───────────────────────────────────────────────
      selectPen: () => {
        const btn = document.querySelector('[data-tool="pen"]');
        if (btn) btn.click();
        else this._showToast("Select pen tool from ExplainLab toolbar", "info");
      },
      selectEraser: () => {
        const btn = document.querySelector('[data-tool="eraser"]');
        if (btn) btn.click();
        else
          this._showToast("Select eraser tool from ExplainLab toolbar", "info");
      },
      selectShapes: () => {
        const btn = document.querySelector('[data-tool="shapes"]');
        if (btn) btn.click();
        else
          this._showToast("Select shapes tool from ExplainLab toolbar", "info");
      },
      addPage: () => {
        const btn = document.querySelector('[data-action="add-page"]');
        if (btn) btn.click();
        else this._showToast("Use Add Page button in ExplainLab", "info");
      },
      saveDraft: () => {
        const btn = document.querySelector('[data-action="save-draft"]');
        if (btn) btn.click();
        else this._showToast("Use Save button in ExplainLab", "info");
      },
      publish: () => {
        const btn = document.querySelector('[data-action="publish"]');
        if (btn) btn.click();
        else this._showToast("Use Publish button in ExplainLab", "info");
      },

      // ── AI generation ─────────────────────────────────────────────────────
      genLesson: () => {
        if (window.Studio?.aiGenerate) window.Studio.aiGenerate("lesson");
        else
          this._showToast(
            "This will be implemented in the next function.",
            "info",
          );
      },
      genNotes: () => {
        if (window.Studio?.aiGenerate) window.Studio.aiGenerate("notes");
        else
          this._showToast(
            "This will be implemented in the next function.",
            "info",
          );
      },
      genQuiz: () => {
        if (window.Studio?.aiGenerate) window.Studio.aiGenerate("quiz");
        else
          this._showToast(
            "This will be implemented in the next function.",
            "info",
          );
      },
    };

    const handler = handlers[action];
    if (handler) {
      handler();
    } else {
      this._showToast("This will be implemented in the next function.", "info");
    }
  }

  // ---------------------------------------------------------------------------
  // Collapse
  // ---------------------------------------------------------------------------

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this._saveState("collapsed", this.collapsed);

    const dock = document.getElementById("orbitdock");
    if (dock) dock.classList.toggle("collapsed", this.collapsed);

    document.body.classList.toggle("orbitdock-collapsed", this.collapsed);
  }

  // ---------------------------------------------------------------------------
  // Mobile drawer
  // ---------------------------------------------------------------------------

  openMobileDrawer() {
    this.mobileOpen = true;
    const dock = document.getElementById("orbitdock");
    const overlay = document.querySelector(".orbitdock-mobile-overlay");
    if (dock) dock.classList.add("mobile-open");
    if (overlay) overlay.classList.add("visible");
    document.body.style.overflow = "hidden";
  }

  closeMobileDrawer() {
    this.mobileOpen = false;
    const dock = document.getElementById("orbitdock");
    const overlay = document.querySelector(".orbitdock-mobile-overlay");
    if (dock) dock.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("visible");
    document.body.style.overflow = "";
  }

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  _showToast(message, type = "default") {
    // Remove any existing toast first
    const existing = document.querySelector(".orbitdock-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `orbitdock-toast orbitdock-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Double rAF to ensure class is applied after paint, triggering CSS transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add("show"));
    });

    // Auto-dismiss after 3 s with a 300 ms fade-out
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Update or remove a badge on every nav item that matches the given itemId.
   * @param {string} itemId
   * @param {number} count  — 0 or negative removes the badge
   */
  updateBadge(itemId, count) {
    const items = document.querySelectorAll(`[data-item-id="${itemId}"]`);
    items.forEach((item) => {
      let badge = item.querySelector(".nav-item-badge");
      if (count <= 0) {
        if (badge) badge.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "nav-item-badge";
        item.appendChild(badge);
      }
      badge.textContent = count > 99 ? "99+" : count;
    });
  }

  /**
   * Completely tear down the OrbitDock instance and restore original body state.
   */
  destroy() {
    const dock = document.getElementById("orbitdock");
    if (dock) dock.remove();
    const toggle = document.querySelector(".orbitdock-mobile-toggle");
    if (toggle) toggle.remove();
    document.body.classList.remove("orbitdock-active", "orbitdock-collapsed");
    // Remove the hashchange listener bound in init()
    window.removeEventListener("hashchange", this._updateActiveState);
  }
}

/* =============================================================================
   Auto-initialization
   ============================================================================= */

if (typeof window !== "undefined") {
  // Expose class on window for external use
  window.OrbitDock = OrbitDock;

  const _initOrbitDock = () => {
    // Guard: only init once
    if (document.getElementById("orbitdock")) return;

    // Detect mode from URL
    const mode = (() => {
      const path = window.location.pathname;
      if (path.includes("studio")) return "creator";
      if (path.includes("explainlab")) return "creator";
      if (path.includes("live-class")) return "creator";
      if (path.includes("forgebuilder")) return "admin";
      return "student";
    })();

    // Hide legacy sidebar if present
    const oldSidebar = document.getElementById("sidebar");
    if (oldSidebar) oldSidebar.style.display = "none";

    window.orbitDockInstance = new OrbitDock({ mode });

    // Register command palette shortcuts if the App exposes the API
    if (window.App?.registerCmdActions) {
      window.App.registerCmdActions([
        {
          id: "od-studio",
          label: "Open Studio",
          icon: "layers",
          action: () => {
            window.location.href = "/studio";
          },
        },
        {
          id: "od-explainlab",
          label: "Open ExplainLab",
          icon: "presentation",
          action: () => {
            window.location.href = "/explainlab";
          },
        },
        {
          id: "od-liveclass",
          label: "Start Live Class",
          icon: "video",
          action: () => {
            window.location.href = "/live-class";
          },
        },
        {
          id: "od-problems",
          label: "Open Problems",
          icon: "code",
          action: () => {
            window.location.hash = "#/problems";
          },
        },
        {
          id: "od-learn",
          label: "Open Learn",
          icon: "book",
          action: () => {
            window.location.hash = "#/learn";
          },
        },
        {
          id: "od-forge",
          label: "Open ForgeBuilder",
          icon: "tool",
          action: () => {
            window.location.href = "/forgebuilder";
          },
        },
      ]);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _initOrbitDock);
  } else {
    _initOrbitDock();
  }
}

/* CommonJS export (for tooling / unit tests) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = OrbitDock;
}
