/* ═══════════════════════════════════════════════════════════════════════════
   Nexora — React Bits bootstrap (vanilla).
   Wires the ported React Bits components into the existing app:
     · TargetCursor  — global custom cursor + .cursor-target tagging
     · MagicBento    — spotlight/glow/stars/tilt on card grids (added in step 2)
     · ASCIIText     — brand wordmark (added in step 3)
   Re-tags on SPA view swaps via a debounced MutationObserver (mirrors premium.js).
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const RB_GLOW = "132, 0, 255"; // React Bits default purple

  function boot() {
    // 1 · Global target cursor
    if (window.NexoraCursor) {
      window.NexoraCursor.init({
        spinDuration: 2.2,
        parallaxOn: true,
        hideDefaultCursor: true,
        cursorColor: "#ffffff",
        cursorColorOnTarget: "#8400ff",
      });
    }

    // 2 · MagicBento on eligible card grids (no-op until step 2 lands the module)
    if (window.MagicBento && typeof window.MagicBento.autoEnhance === "function") {
      window.MagicBento.autoEnhance({ glowColor: RB_GLOW });
    }

    // 3 · ASCII brand wordmark (no-op until step 3 lands the module)
    if (window.NexoraASCII && typeof window.NexoraASCII.autoMount === "function") {
      window.NexoraASCII.autoMount();
    }

    retag();

    // Re-run on SPA view changes (debounced)
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(retag, 140);
    }).observe(document.body, { childList: true, subtree: true });
  }

  function retag() {
    if (window.NexoraCursor) window.NexoraCursor.tag(document);
    if (window.MagicBento && typeof window.MagicBento.autoEnhance === "function") {
      window.MagicBento.autoEnhance({ glowColor: RB_GLOW });
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
