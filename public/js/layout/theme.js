/* ═══════════════════════════════════════════════════════════
   Nexora Theme Manager — Dark/Light Theme Toggle
   Handles theme switching with localStorage persistence
   ═══════════════════════════════════════════════════════════ */

const ThemeManager = {
  storageKey: "nexora_theme",
  isDark: true,

  init() {
    // Check localStorage for saved preference
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.isDark = saved === "dark";
    } else {
      // Nexora ships dark-first — default to dark unless the user opts out.
      this.isDark = true;
    }
    this.apply();
    this.setupListeners();
  },

  apply() {
    const theme = this.isDark ? "dark" : "light";
    if (this.isDark) {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
    localStorage.setItem(this.storageKey, theme);

    // Keep OrbitDock's data-theme attribute in sync for any JS-driven styling
    const dock = document.getElementById("orbitdock");
    if (dock) dock.dataset.theme = theme;
  },

  toggle() {
    this.isDark = !this.isDark;
    this.apply();
    // Dispatch event so other components (charts, canvas-based UIs, etc.) can react
    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { isDark: this.isDark, theme: this.isDark ? "dark" : "light" },
      }),
    );
  },

  setTheme(theme) {
    this.isDark = theme === "dark";
    this.apply();
  },

  setupListeners() {
    // Listen for system theme changes
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only auto-switch if no manual preference saved
        if (!localStorage.getItem(this.storageKey)) {
          this.isDark = e.matches;
          this.apply();
        }
      });
  },

  // Get current theme name
  getTheme() {
    return this.isDark ? "dark" : "light";
  },

  // Check if dark theme is active
  isDarkTheme() {
    return this.isDark;
  },
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  ThemeManager.init();
});

// Export for global access
window.ThemeManager = ThemeManager;
