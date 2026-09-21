/**
 * =============================================================================
 * Nexora Neo-Navigation Hub — Modern Sidebar Engine
 * Glassmorphism + Animated Cards | v1.0
 * =============================================================================
 *
 * A unified, modern sidebar with:
 *   - Card-based navigation with gradient overlays
 *   - Glassmorphism effects
 *   - Smooth micro-interactions
 *   - Role-based navigation (student, creator, admin)
 *   - Status card with user stats
 *   - Floating action buttons
 *
 * No dependencies — pure vanilla JS
 * Uses ORBITDOCK_CONFIG from sidebar-config.js for data
 * =============================================================================
 */

class NeoSidebar {
  constructor(options = {}) {
    this.options = {
      container: document.body,
      mode: this._detectMode(),
      ...options,
    };

    this.currentMode = this._loadState("mode", this.options.mode);
    this.currentPage = this._detectCurrentPage();
    this._init();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State Detection & Persistence
  // ─────────────────────────────────────────────────────────────────────────

  _detectMode() {
    const path = window.location.pathname;
    if (path.includes("studio")) return "creator";
    if (path.includes("explainlab")) return "creator";
    if (path.includes("live-class")) return "creator";
    if (path.includes("forgebuilder")) return "admin";
    return "student";
  }

  _detectCurrentPage() {
    if (window.location.hash && window.location.hash.length > 2) {
      const hash = window.location.hash.slice(2);
      return hash.split("?")[0].split("/")[0] || "hub";
    }
    const path = window.location.pathname;
    if (path.includes("studio")) return "studio";
    if (path.includes("explainlab")) return "explainlab";
    if (path.includes("live-class")) return "live-class";
    if (path.includes("forgebuilder")) return "forgebuilder";
    return "hub";
  }

  _loadState(key, defaultValue) {
    try {
      const value = localStorage.getItem("nexora_neo_sidebar_" + key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  _saveState(key, value) {
    try {
      localStorage.setItem("nexora_neo_sidebar_" + key, JSON.stringify(value));
    } catch {}
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Initialization
  // ─────────────────────────────────────────────────────────────────────────

  _init() {
    this._render();
    this._attachEventListeners();
    this._updateActiveState();
    document.body.classList.add("neo-sidebar-active");
    this._restoreCollapsed();
    this._setupCollapsedTooltips();
    this._setupDockControls();
    // catch a username that the app sets shortly after the sidebar renders
    setTimeout(() => this._syncProfile(), 1500);
    setTimeout(() => this._syncProfile(), 4000);

    // Update on route change
    window.addEventListener("hashchange", () => {
      this.currentPage = this._detectCurrentPage();
      this._updateActiveState();
      this._syncProfile(); // catch post-login username changes
    });

    // Handle popstate for history changes
    window.addEventListener("popstate", () => {
      this.currentPage = this._detectCurrentPage();
      this._updateActiveState();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────

  _render() {
    // Check if sidebar already exists
    let sidebar = document.getElementById("neo-sidebar");
    if (sidebar) {
      sidebar.remove();
    }

    sidebar = document.createElement("div");
    sidebar.id = "neo-sidebar";
    document.body.insertBefore(sidebar, document.body.firstChild);

    // Get workspace config for current mode
    const workspace =
      ORBITDOCK_CONFIG.workspaces[this.currentMode] ||
      ORBITDOCK_CONFIG.workspaces.student;

    // Render header (now a premium profile)
    sidebar.appendChild(this._createHeader());

    // Track routes so every destination appears exactly ONCE across the nav.
    // (The old "Quick Access" rail duplicated items already in the groups.)
    this._seenRoutes = new Set();

    // Render navigation sections (deduped)
    workspace.groups.forEach((group) => {
      const section = this._createNavSection(group);
      if (section) sidebar.appendChild(section);
    });

    // Render status card
    if (workspace.statusCard) {
      sidebar.appendChild(this._createStatusCard(workspace.statusCard));
    }

    // Render floating action area
    sidebar.appendChild(this._createFloatingActions());
  }

  _createHeader() {
    const header = document.createElement("div");
    header.className = "neo-sidebar-header neo-profile-header";

    let username = "Guest";
    try { username = localStorage.getItem("cp_arena_username") || "Guest"; } catch (e) {}
    const initial = (username[0] || "N").toUpperCase();

    // Avatar with a circular level-progress ring + presence dot
    const avatar = document.createElement("div");
    avatar.className = "neo-profile-avatar";
    avatar.innerHTML =
      '<svg class="neo-ring" viewBox="0 0 46 46" aria-hidden="true">' +
      '<circle class="neo-ring-bg" cx="23" cy="23" r="20"></circle>' +
      '<circle class="neo-ring-fg" id="neoRingFg" cx="23" cy="23" r="20"></circle>' +
      "</svg>" +
      '<div class="neo-avatar-core" id="neoAvatarCore"></div>' +
      '<span class="neo-online-dot" title="Online"></span>';
    avatar.querySelector("#neoAvatarCore").textContent = initial;
    avatar.style.cursor = "pointer";
    avatar.title = "View profile";
    avatar.onclick = () => {
      if (username && username !== "Guest")
        window.location.hash = "#/profile/" + encodeURIComponent(username);
    };

    const info = document.createElement("div");
    info.className = "neo-profile-info";
    const nameEl = document.createElement("div");
    nameEl.className = "neo-profile-name";
    nameEl.textContent = username;
    const lvlEl = document.createElement("div");
    lvlEl.className = "neo-profile-level";
    lvlEl.id = "neoProfileLevel";
    lvlEl.textContent = "Bit · Lv 1";
    info.appendChild(nameEl);
    info.appendChild(lvlEl);

    const controls = document.createElement("div");
    controls.className = "neo-dock-controls";

    // collapse → minimize the dock to a small floating orb
    const collapseBtn = document.createElement("button");
    collapseBtn.className = "neo-dock-btn neo-dock-collapse";
    collapseBtn.innerHTML = "&#8211;"; // en-dash
    collapseBtn.title = "Minimize dock";
    collapseBtn.onclick = (e) => {
      e.stopPropagation();
      this._minimizeDock();
    };

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "neo-sidebar-toggle neo-dock-btn";
    toggleBtn.innerHTML = "&#9678;"; // hollow dot = unpinned
    toggleBtn.title = "Pin sidebar open";
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      this._toggleSidebar();
    };

    controls.appendChild(collapseBtn);
    controls.appendChild(toggleBtn);

    header.appendChild(avatar);
    header.appendChild(info);
    header.appendChild(controls);

    this._loadProfile(username);
    return header;
  }

  _syncProfile() {
    let username = "Guest";
    try { username = localStorage.getItem("cp_arena_username") || "Guest"; } catch (e) {}
    const nameEl = document.querySelector(".neo-profile-name");
    if (!nameEl || nameEl.textContent === username) return;
    nameEl.textContent = username;
    const core = document.getElementById("neoAvatarCore");
    if (core) core.textContent = (username[0] || "N").toUpperCase();
    const avatar = document.querySelector(".neo-profile-avatar");
    if (avatar)
      avatar.onclick = () => {
        if (username && username !== "Guest")
          window.location.hash = "#/profile/" + encodeURIComponent(username);
      };
    this._loadProfile(username);
  }

  async _loadProfile(username) {
    if (!username || username === "Guest") return;
    try {
      const r = await fetch("/api/stats?username=" + encodeURIComponent(username));
      const d = await r.json();
      const lvl = d && (d.level || (d.stats && d.stats.level));
      if (!lvl) return;
      const lvlEl = document.getElementById("neoProfileLevel");
      const num = lvl.index ?? lvl.tier ?? lvl.level ?? "";
      if (lvlEl) lvlEl.textContent = `${lvl.name || "Bit"}${num !== "" ? " · Lv " + num : ""}`;
      const ring = document.getElementById("neoRingFg");
      if (ring) {
        const circ = 2 * Math.PI * 20;
        const pct =
          lvl.xpForNext > 0 ? Math.min(1, (lvl.xpInLevel || 0) / lvl.xpForNext) : 1;
        ring.style.strokeDasharray = circ.toFixed(2);
        ring.style.strokeDashoffset = (circ * (1 - pct)).toFixed(2);
        if (lvl.color) ring.style.stroke = lvl.color;
      }
      const core = document.getElementById("neoAvatarCore");
      if (core && lvl.color) {
        core.style.boxShadow = `0 0 18px -3px ${lvl.color}`;
        core.style.borderColor = lvl.color;
      }
    } catch (e) {}
  }

  _createQuickAccess() {
    const section = document.createElement("div");
    section.className = "neo-nav-section";

    const title = document.createElement("div");
    title.className = "neo-nav-section-title";
    title.textContent = "Quick Access";
    section.appendChild(title);

    const gradients = ["grad-1", "grad-2", "grad-3", "grad-4", "grad-5"];
    let gradIndex = 0;

    // Only show relevant orbit items for current mode
    const modeOrbitItems = ORBITDOCK_CONFIG.orbit.filter((item) =>
      item.modes.includes(this.currentMode)
    );

    modeOrbitItems.forEach((item) => {
      const card = document.createElement("a");
      card.href = item.route;
      card.className = `neo-nav-card ${gradients[gradIndex % 5]}`;
      card.dataset.id = item.id;
      card.dataset.label = item.label;

      const iconEl = document.createElement("span");
      iconEl.className = "neo-nav-card-icon";
      iconEl.innerHTML = ORBITDOCK_ICONS[item.icon] || "◆";

      const label = document.createElement("span");
      label.className = "neo-nav-card-label";
      label.textContent = item.label;

      card.appendChild(iconEl);
      card.appendChild(label);

      card.onclick = (e) => {
        if (item.route.startsWith("http") || item.route.startsWith("/")) {
          window.location.href = item.route;
        }
      };

      section.appendChild(card);
      gradIndex++;
    });

    return section;
  }

  _createNavSection(group) {
    const section = document.createElement("div");
    section.className = "neo-nav-section";

    const title = document.createElement("div");
    title.className = "neo-nav-section-title";
    title.textContent = group.title;
    section.appendChild(title);

    const gradients = ["grad-1", "grad-2", "grad-3", "grad-4", "grad-5"];
    let gradIndex = 0;
    let rendered = 0;
    // Dedup by the FULL route (keep query strings so filtered views like
    // #/problems?filter=daily stay distinct from #/problems). Only literal
    // duplicates (e.g. HQ listed twice) collapse.
    const normRoute = (r) =>
      (r || "").replace(/^#/, "").replace(/\/+$/, "");

    group.items.forEach((item) => {
      // Every destination appears exactly once across the whole nav.
      const key = normRoute(item.route);
      if (!this._seenRoutes) this._seenRoutes = new Set();
      if (key && this._seenRoutes.has(key)) return; // skip duplicate
      if (key) this._seenRoutes.add(key);

      const card = document.createElement("a");
      card.href = item.route;
      card.className = `neo-nav-card ${gradients[gradIndex % 5]}`;
      card.dataset.id = item.id;
      card.dataset.label = item.label;

      const iconEl = document.createElement("span");
      iconEl.className = "neo-nav-card-icon";
      iconEl.innerHTML = ORBITDOCK_ICONS[item.icon] || "◆";

      const label = document.createElement("span");
      label.className = "neo-nav-card-label";
      label.textContent = item.label;

      const content = document.createElement("div");
      content.style.display = "flex";
      content.style.alignItems = "center";
      content.style.gap = "10px";
      content.style.flex = "1";

      content.appendChild(iconEl);
      content.appendChild(label);
      card.appendChild(content);

      if (item.badge) {
        const badge = document.createElement("span");
        badge.className = "neo-nav-card-badge";
        badge.textContent = item.badge;
        card.appendChild(badge);
      }

      card.onclick = (e) => {
        e.preventDefault();
        if (item.route.startsWith("http") || item.route.startsWith("/")) {
          window.location.href = item.route;
        } else if (item.route.startsWith("#")) {
          window.location.hash = item.route.slice(1);
        }
      };

      section.appendChild(card);
      gradIndex++;
      rendered++;
    });

    // skip a section whose every item was a duplicate
    return rendered ? section : null;
  }

  _createStatusCard(config) {
    const card = document.createElement("div");
    card.className = "neo-status-card";

    const header = document.createElement("div");
    header.className = "neo-status-card-header";
    header.textContent = config.title;
    card.appendChild(header);

    const itemsContainer = document.createElement("div");
    itemsContainer.className = "neo-status-card-items";

    const statusValues = {
      level: { label: "Level", value: Math.floor(Math.random() * 50) + 1 },
      streak: { label: "Streak", value: Math.floor(Math.random() * 100) + 1 },
      solved: { label: "Solved", value: Math.floor(Math.random() * 500) + 50 },
      xp: { label: "XP", value: Math.floor(Math.random() * 10000) + 500 },
    };

    config.fields.forEach((field) => {
      const statusData = statusValues[field];
      if (statusData) {
        const item = document.createElement("div");
        item.className = "neo-status-item";

        const value = document.createElement("div");
        value.className = "neo-status-item-value";
        value.textContent = statusData.value;

        const label = document.createElement("div");
        label.className = "neo-status-item-label";
        label.textContent = statusData.label;

        item.appendChild(value);
        item.appendChild(label);
        itemsContainer.appendChild(item);
      }
    });

    card.appendChild(itemsContainer);
    return card;
  }

  _createFloatingActions() {
    const fab = document.createElement("div");
    fab.className = "neo-floating-action";

    // Create button
    const createBtn = document.createElement("button");
    createBtn.className = "neo-fab-button primary";
    createBtn.innerHTML = "✨ Create";
    createBtn.onclick = () => {
      console.log("Create action clicked");
      if (window.App && window.App.openCmdPalette) {
        window.App.openCmdPalette();
      }
    };
    fab.appendChild(createBtn);

    // Settings button
    const settingsBtn = document.createElement("button");
    settingsBtn.className = "neo-fab-button secondary";
    settingsBtn.innerHTML = "⚙ Settings";
    settingsBtn.onclick = () => {
      window.location.hash = "#/settings";
    };
    fab.appendChild(settingsBtn);

    return fab;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handling
  // ─────────────────────────────────────────────────────────────────────────

  _attachEventListeners() {
    const sidebar = document.getElementById("neo-sidebar");
    if (!sidebar) return;

    // Highlight cards on click
    sidebar.querySelectorAll(".neo-nav-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        this._updateActiveState();
      });
    });

    // Close sidebar on mobile when clicking a link
    if (window.innerWidth <= 1024) {
      sidebar.querySelectorAll(".neo-nav-card").forEach((card) => {
        card.addEventListener("click", () => {
          sidebar.classList.remove("mobile-open");
        });
      });
    }
  }

  _updateActiveState() {
    const sidebar = document.getElementById("neo-sidebar");
    if (!sidebar) return;

    // Normalize a route to a comparable path (drop leading #, query, trailing /)
    const norm = (r) =>
      (r || "")
        .replace(/^#/, "")
        .replace(/\?.*$/, "")
        .replace(/\/+$/, "");
    const current = norm(window.location.hash || window.location.pathname);

    let matched = false;
    sidebar.querySelectorAll(".neo-nav-card").forEach((card) => {
      const cardRoute = norm(card.getAttribute("href"));
      // Active only when this card's OWN route matches — and only the first
      // such card (routes like HQ appear in more than one section).
      const isActive = !matched && !!cardRoute && cardRoute === current;
      if (isActive) matched = true;
      card.classList.toggle("active", isActive);
    });
  }

  // Floating tooltips for the collapsed icon-rail (escape the sidebar overflow)
  _setupCollapsedTooltips() {
    const sidebar = document.getElementById("neo-sidebar");
    if (!sidebar) return;
    let tip = document.getElementById("neo-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "neo-tip";
      tip.className = "neo-tip";
      document.body.appendChild(tip);
    }
    sidebar.addEventListener("pointerover", (e) => {
      if (!document.body.classList.contains("neo-collapsed")) return;
      const card = e.target.closest && e.target.closest(".neo-nav-card");
      if (!card || !card.dataset.label) {
        tip.classList.remove("show");
        return;
      }
      const r = card.getBoundingClientRect();
      tip.textContent = card.dataset.label;
      tip.style.top = r.top + r.height / 2 + "px";
      tip.style.left = r.right + 12 + "px";
      tip.classList.add("show");
    });
    sidebar.addEventListener("pointerout", (e) => {
      const to = e.relatedTarget;
      if (!to || !to.closest || !to.closest(".neo-nav-card"))
        tip.classList.remove("show");
    });
    sidebar.addEventListener("pointerleave", () => tip.classList.remove("show"));
  }

  // Make the dock draggable (reposition) + handle minimize-to-orb / restore.
  _setupDockControls() {
    const sidebar = document.getElementById("neo-sidebar");
    if (!sidebar) return;
    const header = sidebar.querySelector(".neo-sidebar-header");
    if (!header) return;

    try {
      if (localStorage.getItem("dock_min") === "1" && window.innerWidth > 1024)
        document.body.classList.add("dock-min");
      const pos = JSON.parse(localStorage.getItem("dock_pos") || "null");
      if (pos && window.innerWidth > 1024) this._applyPos(sidebar, pos.x, pos.y);
    } catch (e) {}

    // Click the minimized orb to restore the full dock
    sidebar.addEventListener(
      "click",
      (e) => {
        if (document.body.classList.contains("dock-min")) {
          e.preventDefault();
          e.stopPropagation();
          this._restoreDock();
        }
      },
      true
    );

    // Drag to reposition (grab the header; buttons still work)
    let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      this._applyPos(sidebar, ox + dx, oy + dy);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      sidebar.style.transition = "";
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      if (moved) {
        const r = sidebar.getBoundingClientRect();
        try { localStorage.setItem("dock_pos", JSON.stringify({ x: r.left, y: r.top })); } catch (e) {}
        const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); window.removeEventListener("click", swallow, true); };
        window.addEventListener("click", swallow, true);
      }
    };
    header.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || (e.target.closest && e.target.closest("button"))) return;
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      const r = sidebar.getBoundingClientRect();
      ox = r.left; oy = r.top;
      sidebar.style.transition = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    });
    header.style.cursor = "grab";
  }

  _applyPos(sidebar, x, y) {
    const w = sidebar.offsetWidth;
    const h = Math.min(sidebar.scrollHeight || 600, window.innerHeight - 16);
    x = Math.max(6, Math.min(x, window.innerWidth - w - 6));
    y = Math.max(6, Math.min(y, window.innerHeight - h - 6));
    // Use !important so it beats the dock's `left/top: !important` base rules.
    sidebar.style.setProperty("left", x + "px", "important");
    sidebar.style.setProperty("top", y + "px", "important");
    sidebar.style.setProperty("bottom", "auto", "important");
    if (!document.body.classList.contains("dock-min"))
      sidebar.style.setProperty("height", h + "px", "important");
    document.body.classList.add("dock-floating");
  }

  _minimizeDock() {
    const sb = document.getElementById("neo-sidebar");
    // clear the inline height so the CSS orb size wins
    if (sb) sb.style.removeProperty("height");
    document.body.classList.add("dock-min");
    try { localStorage.setItem("dock_min", "1"); } catch (e) {}
  }

  _restoreDock() {
    document.body.classList.remove("dock-min");
    try { localStorage.setItem("dock_min", "0"); } catch (e) {}
    // if it was free-floating, restore its panel height at the current spot
    const sb = document.getElementById("neo-sidebar");
    if (sb && document.body.classList.contains("dock-floating")) {
      const r = sb.getBoundingClientRect();
      this._applyPos(sb, r.left, r.top);
    }
  }

  _toggleSidebar() {
    const sidebar = document.getElementById("neo-sidebar");
    if (!sidebar) return;
    if (window.innerWidth <= 1024) {
      // mobile: slide the full dock in/out
      sidebar.classList.toggle("mobile-open");
    } else {
      // desktop: PIN the dock open (otherwise it expands on hover only)
      const pinned = document.body.classList.toggle("dock-pinned");
      try {
        localStorage.setItem("dock_pinned", pinned ? "1" : "0");
      } catch (e) {}
      const btn = sidebar.querySelector(".neo-sidebar-toggle");
      if (btn) {
        btn.title = pinned ? "Unpin (auto-collapse)" : "Pin sidebar open";
        btn.innerHTML = pinned ? "&#9679;" : "&#9678;"; // filled / hollow dot
      }
    }
  }

  _restoreCollapsed() {
    try {
      if (
        localStorage.getItem("dock_pinned") === "1" &&
        window.innerWidth > 1024
      ) {
        document.body.classList.add("dock-pinned");
        const btn = document.querySelector(
          "#neo-sidebar .neo-sidebar-toggle"
        );
        if (btn) {
          btn.innerHTML = "&#9679;";
          btn.title = "Unpin (auto-collapse)";
        }
      }
    } catch (e) {}
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Auto-initialization when DOM is ready
// ═══════════════════════════════════════════════════════════════════════════

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof ORBITDOCK_CONFIG !== "undefined" && typeof ORBITDOCK_ICONS !== "undefined") {
      window.neoSidebar = new NeoSidebar();
    }
  });
} else {
  if (typeof ORBITDOCK_CONFIG !== "undefined" && typeof ORBITDOCK_ICONS !== "undefined") {
    window.neoSidebar = new NeoSidebar();
  }
}
