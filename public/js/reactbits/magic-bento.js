/* ═══════════════════════════════════════════════════════════════════════════
   MagicBento — React Bits component ported to framework-free vanilla JS.
   Requires global `gsap`. Decorates existing card grids with: a global
   spotlight, cursor-following per-card border-glow, particle stars on hover,
   3D tilt, magnetism, and a click ripple.

   API:  MagicBento.autoEnhance({ glowColor, spotlightRadius, particleCount,
                                  enableTilt, enableMagnetism, clickEffect })
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const DEFAULTS = {
    glowColor: "132, 0, 255",
    spotlightRadius: 300,
    particleCount: 6,
    enableStars: true,
    enableTilt: true,
    enableMagnetism: true,
    clickEffect: true,
  };

  // Which existing grids/cards become bento cards (the "slides").
  const CARD_SEL = [
    ".qa-card", ".momentum-card", ".ailab-card", ".learn-card",
    ".learn-subject-card", ".forge-path-card", ".contest-card",
    ".dash-analytics-card", ".analytics-card", ".analytics-stat",
    ".quick-action-card", ".studio-quick-card", ".tool-card",
    ".achievement-card", ".lm-card", ".ob-card", ".hub-pstat",
  ].join(",");

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = () => window.innerWidth <= 768;

  let cfg = Object.assign({}, DEFAULTS);
  let spotlightEl = null;
  let spotlightBound = false;

  function ready() {
    return typeof gsap !== "undefined" && !reduce && !isMobile();
  }

  /* ── Particles ── */
  function makeParticle(x, y, color) {
    const el = document.createElement("div");
    el.className = "particle";
    el.style.cssText =
      `position:absolute;width:4px;height:4px;border-radius:50%;` +
      `background:rgba(${color},1);box-shadow:0 0 6px rgba(${color},0.6);` +
      `pointer-events:none;z-index:4;left:${x}px;top:${y}px;`;
    return el;
  }

  /* ── Global spotlight (single fixed element following the cursor) ── */
  function ensureSpotlight() {
    if (spotlightEl || !ready()) return;
    spotlightEl = document.createElement("div");
    spotlightEl.className = "global-spotlight";
    // No mix-blend-mode (it forces an expensive compositing layer every frame);
    // a plain additive-looking radial glow reads the same on the dark UI.
    spotlightEl.style.cssText =
      `position:fixed;width:760px;height:760px;border-radius:50%;` +
      `pointer-events:none;z-index:200;opacity:0;transform:translate(-50%,-50%);` +
      `will-change:left,top,opacity;background:radial-gradient(circle,` +
      `rgba(${cfg.glowColor},0.16) 0%,rgba(${cfg.glowColor},0.08) 16%,` +
      `rgba(${cfg.glowColor},0.03) 30%,transparent 60%);`;
    document.body.appendChild(spotlightEl);

    if (!spotlightBound) {
      spotlightBound = true;
      let raf = 0, mx = 0, my = 0;
      // Cached card geometry — refreshed on scroll/resize/content change, NOT
      // every frame (getBoundingClientRect forces sync layout = the main lag).
      let geom = [];
      window.MagicBento._dirty = true;
      const refresh = () => {
        window.MagicBento._dirty = false;
        geom = [];
        const vh = window.innerHeight, vw = window.innerWidth;
        document.querySelectorAll(".magic-bento-card").forEach((card) => {
          const r = card.getBoundingClientRect();
          if (r.width === 0 || r.bottom < -60 || r.top > vh + 60 || r.right < -60 || r.left > vw + 60) {
            if (card._glowOn) { card.style.setProperty("--glow-intensity", "0"); card._glowOn = false; }
            return; // cull offscreen
          }
          geom.push({
            card, l: r.left, t: r.top, w: r.width, h: r.height,
            cx: r.left + r.width / 2, cy: r.top + r.height / 2,
            half: Math.max(r.width, r.height) / 2,
          });
        });
      };
      const update = () => {
        raf = 0;
        if (window.MagicBento._dirty) refresh();
        if (!geom.length) { spotlightEl.style.opacity = "0"; return; }
        const prox = cfg.spotlightRadius * 0.5;
        const fade = cfg.spotlightRadius * 0.75;
        let min = Infinity;
        for (let i = 0; i < geom.length; i++) {
          const o = geom[i];
          const dist = Math.hypot(mx - o.cx, my - o.cy) - o.half;
          const d = dist < 0 ? 0 : dist;
          if (d < min) min = d;
          const card = o.card;
          if (d > fade) {
            // far card → write "off" only once (cheap, no recalc)
            if (card._glowOn) { card.style.setProperty("--glow-intensity", "0"); card._glowOn = false; }
            continue;
          }
          const glow = d <= prox ? 1 : (fade - d) / (fade - prox);
          card.style.setProperty("--glow-x", ((mx - o.l) / o.w * 100) + "%");
          card.style.setProperty("--glow-y", ((my - o.t) / o.h * 100) + "%");
          card.style.setProperty("--glow-intensity", glow.toFixed(3));
          card._glowOn = true;
        }
        // move spotlight directly (no per-frame gsap tween)
        spotlightEl.style.left = mx + "px";
        spotlightEl.style.top = my + "px";
        const target = min <= prox ? 0.8 : min <= fade ? ((fade - min) / (fade - prox)) * 0.8 : 0;
        spotlightEl.style.opacity = target.toFixed(3);
      };
      const onMove = (e) => {
        mx = e.clientX; my = e.clientY;
        if (!raf) raf = requestAnimationFrame(update);
      };
      document.addEventListener("mousemove", onMove, { passive: true });
      const markDirty = () => { window.MagicBento._dirty = true; };
      window.addEventListener("scroll", markDirty, { passive: true, capture: true });
      window.addEventListener("resize", markDirty, { passive: true });
      document.addEventListener("mouseleave", () => {
        geom.forEach((o) => { o.card.style.setProperty("--glow-intensity", "0"); o.card._glowOn = false; });
        spotlightEl.style.opacity = "0";
      });
    }
  }

  /* ── Per-card behaviours (particles / tilt / magnetism / ripple) ── */
  function wireCard(card) {
    if (card._bentoWired || !ready()) return;
    card._bentoWired = true;
    let particles = [];
    let timeouts = [];
    let hovered = false;

    const spawn = () => {
      const { width, height } = card.getBoundingClientRect();
      for (let i = 0; i < cfg.particleCount; i++) {
        const id = setTimeout(() => {
          if (!hovered) return;
          const p = makeParticle(
            Math.random() * width,
            Math.random() * height,
            cfg.glowColor
          );
          card.appendChild(p);
          particles.push(p);
          gsap.fromTo(p, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" });
          gsap.to(p, {
            x: (Math.random() - 0.5) * 90,
            y: (Math.random() - 0.5) * 90,
            rotation: Math.random() * 360,
            duration: 2 + Math.random() * 2,
            ease: "none",
            repeat: -1,
            yoyo: true,
          });
        }, i * 90);
        timeouts.push(id);
      }
    };
    const clear = () => {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      particles.forEach((p) =>
        gsap.to(p, { scale: 0, opacity: 0, duration: 0.3, onComplete: () => p.remove() })
      );
      particles = [];
    };

    card.addEventListener("mouseenter", () => {
      hovered = true;
      card.classList.add("magic-bento-card--hovered");
      if (cfg.enableStars) spawn();
    });
    card.addEventListener("mouseleave", () => {
      hovered = false;
      card.classList.remove("magic-bento-card--hovered");
      clear();
      if (cfg.enableTilt || cfg.enableMagnetism)
        gsap.to(card, { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 0.3, ease: "power2.out" });
    });
    card.addEventListener("mousemove", (e) => {
      if (!cfg.enableTilt && !cfg.enableMagnetism) return;
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const cx = r.width / 2;
      const cy = r.height / 2;
      if (cfg.enableTilt) {
        gsap.to(card, {
          rotateX: ((y - cy) / cy) * -7,
          rotateY: ((x - cx) / cx) * 7,
          duration: 0.1,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
      if (cfg.enableMagnetism) {
        gsap.to(card, { x: (x - cx) * 0.04, y: (y - cy) * 0.04, duration: 0.3, ease: "power2.out" });
      }
    });
    if (cfg.clickEffect) {
      card.addEventListener("click", (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        const maxD = Math.max(
          Math.hypot(x, y),
          Math.hypot(x - r.width, y),
          Math.hypot(x, y - r.height),
          Math.hypot(x - r.width, y - r.height)
        );
        const ripple = document.createElement("div");
        ripple.style.cssText =
          `position:absolute;width:${maxD * 2}px;height:${maxD * 2}px;border-radius:50%;` +
          `left:${x - maxD}px;top:${y - maxD}px;pointer-events:none;z-index:5;` +
          `background:radial-gradient(circle,rgba(${cfg.glowColor},0.4) 0%,` +
          `rgba(${cfg.glowColor},0.2) 30%,transparent 70%);`;
        card.appendChild(ripple);
        gsap.fromTo(
          ripple,
          { scale: 0, opacity: 1 },
          { scale: 1, opacity: 0, duration: 0.8, ease: "power2.out", onComplete: () => ripple.remove() }
        );
      });
    }
  }

  function autoEnhance(opts = {}) {
    cfg = Object.assign({}, DEFAULTS, opts);
    if (!ready()) return;
    ensureSpotlight();
    let added = 0;
    document.querySelectorAll(CARD_SEL).forEach((card) => {
      if (!card.classList.contains("magic-bento-card")) {
        card.classList.add("magic-bento-card", "magic-bento-card--border-glow");
        card.style.setProperty("--glow-color", cfg.glowColor);
        added++;
        // mark the parent grid so the spotlight scoping reads naturally
        const grid = card.parentElement;
        if (grid && !grid.classList.contains("bento-section"))
          grid.classList.add("bento-section");
      }
      wireCard(card);
    });
    if (added) window.MagicBento._dirty = true; // refresh cached geometry
  }

  window.MagicBento = { autoEnhance, CARD_SEL, _dirty: true };
})();
