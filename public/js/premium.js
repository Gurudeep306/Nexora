/* ═══════════════════════════════════════════════════════════════════════════
   Nexora — Premium FX engine (reactbits-inspired, framework-free)
   Tags app elements with px-* classes and wires the interactions:
   spotlight tracking · count-up · click spark · aurora injection.
   Re-runs on SPA view swaps via a debounced MutationObserver.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Cards that should get the spotlight + lift treatment. Broad on purpose so
     the effect reaches every surface without per-page wiring. */
  const CARD_SEL = [
    ".qa-card", ".ailab-card", ".learn-card", ".learn-subject-card",
    ".forge-path-card", ".contest-card", ".friend-card", ".achievement-card",
    ".daily-card", ".momentum-card", ".ob-card", ".lm-card",
    ".level-problem-card", ".dash-analytics-card", ".badge-showcase-card",
    ".analytics-stat", ".analytics-card", ".stat-card", ".studio-stat",
    ".hub-pstat", ".dash-analytics-card",
    ".quick-action-card", ".studio-quick-card", ".tool-card", ".neo-status-card",
    ".empty-state-card", ".skill-node-card", ".insight-card", ".session-card",
    ".forge-card", ".el-card", ".content-card",
  ].join(",");

  /* Primary call-to-action buttons get the sheen sweep. */
  const BTN_SEL = ".btn-primary, .btn-submit, .btn-gold, .btn-success";

  /* Big headings get the shiny gradient. Tagged opt-in via these hooks. */
  const HEAD_SEL =
    ".page-title, .hub-title, .section-title-xl, .studio-topbar-title, .px-hero-title";

  function tag(root) {
    root.querySelectorAll(CARD_SEL).forEach((el) => {
      if (!el.classList.contains("px-card")) el.classList.add("px-card");
    });
    root.querySelectorAll(BTN_SEL).forEach((el) => {
      if (!el.classList.contains("px-btn")) el.classList.add("px-btn");
    });
    if (!reduce) {
      root.querySelectorAll(HEAD_SEL).forEach((el) => {
        if (!el.classList.contains("px-shiny") && el.textContent.trim().length < 40)
          el.classList.add("px-shiny");
      });
    }
    setupCountUp(root);
    setupReveal(root);
  }

  /* ── Scroll reveal: fade + rise elements as they enter the viewport ── */
  const revealObserver =
    "IntersectionObserver" in window && !reduce
      ? new IntersectionObserver(
          (entries, obs) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                en.target.classList.add("px-revealed");
                obs.unobserve(en.target);
              }
            });
          },
          { threshold: 0.06, rootMargin: "0px 0px -4% 0px" }
        )
      : null;

  const REVEAL_SEL =
    CARD_SEL +
    ",.section-title,.studio-section-header,.hub-section,.px-reveal-on";
  let revealSafety = 0;
  function setupReveal(root) {
    if (!revealObserver) return;
    const groupCounts = new Map(); // parent -> running index, for stagger
    root.querySelectorAll(REVEAL_SEL).forEach((el) => {
      if (el.dataset.pxReveal) return;
      el.dataset.pxReveal = "1";
      el.classList.add("px-reveal");
      // Cascade siblings: stagger the delay by position within the parent,
      // capped so long lists don't crawl in.
      const parent = el.parentElement || document.body;
      const idx = groupCounts.get(parent) || 0;
      groupCounts.set(parent, idx + 1);
      const delay = Math.min(idx * 55, 440);
      if (delay) el.style.transitionDelay = delay + "ms, " + delay + "ms";
      revealObserver.observe(el);
    });
    // Safety net: never leave content stuck invisible.
    clearTimeout(revealSafety);
    revealSafety = setTimeout(() => {
      document
        .querySelectorAll(".px-reveal:not(.px-revealed)")
        .forEach((el) => el.classList.add("px-revealed"));
    }, 4000);
  }

  /* ── Page transition: replay an enter animation on SPA route changes ── */
  function playPageIn() {
    if (reduce) return;
    const mc =
      document.getElementById("mainContent") ||
      document.querySelector(".app-content, main");
    if (!mc) return;
    mc.classList.remove("px-page-in");
    void mc.offsetWidth; // force reflow to restart the animation
    mc.classList.add("px-page-in");
  }
  window.addEventListener("hashchange", () => setTimeout(playPageIn, 30));

  /* ── Spotlight + 3D tilt: one delegated listener drives the hovered card ── */
  if (!reduce) {
    const TILT = 6; // max degrees
    let raf = 0, curCard = null, prevCard = null, mx = 0, my = 0;
    function resetCard(el) {
      if (!el) return;
      el.classList.remove("px-tilting");
      el.style.removeProperty("--px-rx");
      el.style.removeProperty("--px-ry");
    }
    function apply() {
      raf = 0;
      if (prevCard && prevCard !== curCard) { resetCard(prevCard); prevCard = null; }
      if (!curCard) return;
      const r = curCard.getBoundingClientRect();
      const px = mx - r.left, py = my - r.top;
      curCard.style.setProperty("--px-mx", px + "px");
      curCard.style.setProperty("--px-my", py + "px");
      // tilt away from cursor; subtle, skip very small chips
      if (r.width > 120 && r.height > 70) {
        const rx = (0.5 - py / r.height) * TILT * 2;
        const ry = (px / r.width - 0.5) * TILT * 2;
        curCard.style.setProperty("--px-rx", rx.toFixed(2) + "deg");
        curCard.style.setProperty("--px-ry", ry.toFixed(2) + "deg");
        curCard.classList.add("px-tilting");
      }
      prevCard = curCard;
    }
    window.addEventListener(
      "pointermove",
      (e) => {
        let card = e.target.closest ? e.target.closest(".px-card") : null;
        // MagicBento owns spotlight+tilt for its cards — don't double up.
        if (card && card.classList.contains("magic-bento-card")) card = null;
        if (card !== curCard) prevCard = curCard;
        curCard = card; mx = e.clientX; my = e.clientY;
        if (!raf) raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );
  }

  /* ── Magnetic buttons: gentle pull toward the cursor on primary CTAs ── */
  if (!reduce) {
    let mraf = 0, curBtn = null, prevBtn = null, bx = 0, by = 0;
    function resetBtn(el) { if (el) el.style.translate = ""; }
    function bApply() {
      mraf = 0;
      if (prevBtn && prevBtn !== curBtn) { resetBtn(prevBtn); prevBtn = null; }
      if (!curBtn) return;
      const r = curBtn.getBoundingClientRect();
      if (r.width > 260) { resetBtn(curBtn); return; } // skip wide/full-width buttons
      const dx = (bx - (r.left + r.width / 2)) * 0.28;
      const dy = (by - (r.top + r.height / 2)) * 0.4;
      curBtn.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
      prevBtn = curBtn;
    }
    window.addEventListener(
      "pointermove",
      (e) => {
        const b = e.target.closest ? e.target.closest(".px-btn") : null;
        if (b !== curBtn) prevBtn = curBtn;
        curBtn = b; bx = e.clientX; by = e.clientY;
        if (!mraf) mraf = requestAnimationFrame(bApply);
      },
      { passive: true }
    );
  }

  /* ── Count-up: animate integers into view once ── */
  const countObserver =
    "IntersectionObserver" in window && !reduce
      ? new IntersectionObserver(
          (entries, obs) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                runCount(en.target);
                obs.unobserve(en.target);
              }
            });
          },
          { threshold: 0.4 }
        )
      : null;

  const NUM_SEL =
    ".analytics-stat-value, .stat-value, .ob-card-num, .fp-pstat-num, " +
    ".ailab-stat-num, .hud-stat-value, .studio-stat-value, .hub-pstat-val, " +
    ".px-count";

  function setupCountUp(root) {
    if (!countObserver) return;
    root.querySelectorAll(NUM_SEL).forEach((el) => {
      const raw = el.textContent.trim().replace(/,/g, "");
      if (/^\d{1,9}$/.test(raw) && !el.dataset.pxCounted) {
        el.dataset.pxTarget = raw;
        el.dataset.pxCounted = "1";
        countObserver.observe(el);
      }
    });
  }

  function runCount(el) {
    const target = parseInt(el.dataset.pxTarget, 10);
    if (!Number.isFinite(target)) return;
    const dur = Math.min(1400, 500 + target.toString().length * 220);
    const start = performance.now();
    el.classList.add("px-counting");
    function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = Math.round(target * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(frame);
      else { el.textContent = target.toLocaleString(); el.classList.remove("px-counting"); }
    }
    requestAnimationFrame(frame);
  }

  /* ── Click spark: a small burst of particles at the pointer ── */
  if (!reduce) {
    const SPARK_SKIP = "input,textarea,select,[contenteditable],.monaco-editor,.cm-editor";
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        // Don't spark while typing / interacting with form fields or the editor,
        // or when the user is selecting text.
        if (e.target.closest && e.target.closest(SPARK_SKIP)) return;
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.type === "Range") return;
        const n = 6;
        for (let i = 0; i < n; i++) {
          const s = document.createElement("div");
          s.className = "px-spark";
          s.style.left = e.clientX + "px";
          s.style.top = e.clientY + "px";
          const hue = i % 2 ? "#22d3ee" : "#818cf8";
          s.style.background = hue;
          s.style.boxShadow = `0 0 8px ${hue}`;
          document.body.appendChild(s);
          const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
          const dist = 18 + Math.random() * 22;
          const dx = Math.cos(ang) * dist;
          const dy = Math.sin(ang) * dist;
          s.animate(
            [
              { transform: "translate(0,0) scale(1)", opacity: 1 },
              { transform: `translate(${dx}px, ${dy}px) scale(0)`, opacity: 0 },
            ],
            { duration: 480 + Math.random() * 160, easing: "cubic-bezier(0.16,1,0.3,1)" }
          ).onfinish = () => s.remove();
        }
      },
      { passive: true }
    );
  }

  /* ── Scroll progress bar (tracks the main scroll container) ── */
  function setupProgress() {
    let bar = document.getElementById("px-progress");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "px-progress";
      document.body.appendChild(bar);
    }
    let praf = 0;
    function update() {
      praf = 0;
      // Prefer the app's scrolling content area; fall back to the document.
      const sc =
        document.querySelector(
          "#mainContent, .app-content, main.studio-main, .el-main"
        ) || document.scrollingElement || document.documentElement;
      const max = sc.scrollHeight - sc.clientHeight;
      const top = sc.scrollTop || window.scrollY || 0;
      const pct = max > 4 ? Math.min(100, (top / max) * 100) : 0;
      bar.style.width = pct + "%";
      bar.style.opacity = pct > 0.5 ? "1" : "0";
    }
    const onScroll = () => { if (!praf) praf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  /* ── Aurora backdrop (one per page, behind content) ── */
  function injectAurora() {
    if (reduce || document.querySelector(".px-aurora")) return;
    const a = document.createElement("div");
    a.className = "px-aurora";
    document.body.prepend(a);
  }

  /* ── Boot: tag now + observe SPA view swaps ── */
  function boot() {
    injectAurora();
    setupProgress();
    tag(document);
    let t = 0;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => tag(document), 120);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
