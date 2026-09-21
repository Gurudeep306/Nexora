/* ═══════════════════════════════════════════════════════════════════════════
   TargetCursor — React Bits component ported to framework-free vanilla JS.
   Requires global `gsap`. Renders a spinning corner-bracket cursor that locks
   onto elements matching `.cursor-target`, with parallax + click feedback.

   API:  NexoraCursor.init({ spinDuration, hideDefaultCursor, hoverDuration,
                             parallaxOn, cursorColor, cursorColorOnTarget,
                             targetSelector })
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const NexoraCursor = {
    _inited: false,

    init(opts = {}) {
      if (this._inited) return;
      if (typeof window === "undefined" || typeof gsap === "undefined") return;

      // Mobile / touch → skip entirely (use native cursor)
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const smallScreen = window.innerWidth <= 768;
      const mobileUA =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          (navigator.userAgent || "").toLowerCase()
        );
      if ((hasTouch && smallScreen) || mobileUA) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        // still hide native cursor but keep things calm: render dot, no spin
        opts.spinDuration = 1e9;
      }

      this._inited = true;

      const cfg = Object.assign(
        {
          targetSelector: ".cursor-target",
          spinDuration: 2,
          hideDefaultCursor: true,
          hoverDuration: 0.2,
          parallaxOn: true,
          cursorColor: "#ffffff",
          cursorColorOnTarget: "#8400ff",
        },
        opts
      );

      const constants = { borderWidth: 3, cornerSize: 12 };

      // ── Build cursor DOM ──
      const wrapper = document.createElement("div");
      wrapper.className = "target-cursor-wrapper";
      const dot = document.createElement("div");
      dot.className = "target-cursor-dot";
      dot.style.backgroundColor = cfg.cursorColor;
      wrapper.appendChild(dot);
      ["tl", "tr", "br", "bl"].forEach((p) => {
        const c = document.createElement("div");
        c.className = "target-cursor-corner corner-" + p;
        c.style.borderColor = cfg.cursorColor;
        wrapper.appendChild(c);
      });
      document.body.appendChild(wrapper);
      const corners = wrapper.querySelectorAll(".target-cursor-corner");

      if (cfg.hideDefaultCursor) document.body.classList.add("target-cursor-active");

      // ── State ──
      let spinTl = null;
      let activeTarget = null;
      let currentLeaveHandler = null;
      let resumeTimeout = null;
      let targetCorners = null;
      const activeStrength = { current: 0 };
      let tickerOn = false;

      gsap.set(wrapper, {
        xPercent: -50,
        yPercent: -50,
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });

      const createSpin = () => {
        if (spinTl) spinTl.kill();
        spinTl = gsap
          .timeline({ repeat: -1 })
          .to(wrapper, { rotation: "+=360", duration: cfg.spinDuration, ease: "none" });
      };
      createSpin();

      const moveCursor = (x, y) => {
        gsap.to(wrapper, { x, y, duration: 0.1, ease: "power3.out" });
      };

      const ticker = () => {
        if (!targetCorners) return;
        const strength = activeStrength.current;
        if (strength === 0) return;
        const cx = gsap.getProperty(wrapper, "x");
        const cy = gsap.getProperty(wrapper, "y");
        corners.forEach((corner, i) => {
          const curX = gsap.getProperty(corner, "x");
          const curY = gsap.getProperty(corner, "y");
          const tX = targetCorners[i].x - cx;
          const tY = targetCorners[i].y - cy;
          const fX = curX + (tX - curX) * strength;
          const fY = curY + (tY - curY) * strength;
          const dur = strength >= 0.99 ? (cfg.parallaxOn ? 0.2 : 0) : 0.05;
          gsap.to(corner, {
            x: fX,
            y: fY,
            duration: dur,
            ease: dur === 0 ? "none" : "power1.out",
            overwrite: "auto",
          });
        });
      };

      const moveHandler = (e) => moveCursor(e.clientX, e.clientY);
      window.addEventListener("mousemove", moveHandler);

      const mouseDown = () => {
        gsap.to(dot, { scale: 0.7, duration: 0.3 });
        gsap.to(wrapper, { scale: 0.9, duration: 0.2 });
      };
      const mouseUp = () => {
        gsap.to(dot, { scale: 1, duration: 0.3 });
        gsap.to(wrapper, { scale: 1, duration: 0.2 });
      };
      window.addEventListener("mousedown", mouseDown);
      window.addEventListener("mouseup", mouseUp);

      const restCorners = () => {
        const cs = constants.cornerSize;
        const pos = [
          { x: -cs * 1.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: -cs * 1.5 },
          { x: cs * 0.5, y: cs * 0.5 },
          { x: -cs * 1.5, y: cs * 0.5 },
        ];
        const tl = gsap.timeline();
        corners.forEach((corner, i) => {
          gsap.killTweensOf(corner, "x,y");
          tl.to(corner, { x: pos[i].x, y: pos[i].y, duration: 0.3, ease: "power3.out" }, 0);
        });
      };

      const enterHandler = (e) => {
        let el = e.target;
        let target = null;
        while (el && el !== document.body) {
          if (el.matches && el.matches(cfg.targetSelector)) {
            target = el;
            break;
          }
          el = el.parentElement;
        }
        if (!target || activeTarget === target) return;
        if (activeTarget && currentLeaveHandler)
          activeTarget.removeEventListener("mouseleave", currentLeaveHandler);
        if (resumeTimeout) {
          clearTimeout(resumeTimeout);
          resumeTimeout = null;
        }

        activeTarget = target;
        corners.forEach((c) => gsap.killTweensOf(c, "x,y"));
        gsap.killTweensOf(wrapper, "rotation");
        spinTl && spinTl.pause();
        gsap.set(wrapper, { rotation: 0 });

        if (cfg.cursorColorOnTarget) {
          gsap.to(corners, { borderColor: cfg.cursorColorOnTarget, duration: 0.15 });
          gsap.to(dot, { backgroundColor: cfg.cursorColorOnTarget, duration: 0.15 });
        }

        const rect = target.getBoundingClientRect();
        const { borderWidth: bw, cornerSize: cs } = constants;
        const cx = gsap.getProperty(wrapper, "x");
        const cy = gsap.getProperty(wrapper, "y");
        targetCorners = [
          { x: rect.left - bw, y: rect.top - bw },
          { x: rect.right + bw - cs, y: rect.top - bw },
          { x: rect.right + bw - cs, y: rect.bottom + bw - cs },
          { x: rect.left - bw, y: rect.bottom + bw - cs },
        ];

        if (!tickerOn) {
          gsap.ticker.add(ticker);
          tickerOn = true;
        }
        gsap.to(activeStrength, { current: 1, duration: cfg.hoverDuration, ease: "power2.out" });
        corners.forEach((corner, i) => {
          gsap.to(corner, {
            x: targetCorners[i].x - cx,
            y: targetCorners[i].y - cy,
            duration: 0.2,
            ease: "power2.out",
          });
        });

        const leaveHandler = () => {
          if (tickerOn) {
            gsap.ticker.remove(ticker);
            tickerOn = false;
          }
          targetCorners = null;
          gsap.set(activeStrength, { current: 0, overwrite: true });
          activeTarget = null;
          if (cfg.cursorColorOnTarget) {
            gsap.to(corners, { borderColor: cfg.cursorColor, duration: 0.15 });
            gsap.to(dot, { backgroundColor: cfg.cursorColor, duration: 0.15 });
          }
          restCorners();
          resumeTimeout = setTimeout(() => {
            if (!activeTarget) createSpin();
            resumeTimeout = null;
          }, 50);
          target.removeEventListener("mouseleave", leaveHandler);
        };
        currentLeaveHandler = leaveHandler;
        target.addEventListener("mouseleave", leaveHandler);
      };
      window.addEventListener("mouseover", enterHandler, { passive: true });

      // keep cursor alive after SPA view swaps (re-append if removed)
      const ensureAttached = () => {
        if (!document.body.contains(wrapper)) document.body.appendChild(wrapper);
      };
      this._ensureAttached = ensureAttached;
    },

    /** Tag interactive elements so the cursor locks onto them. */
    tag(root = document) {
      root
        .querySelectorAll(
          ".px-card, .magic-bento-card, .neo-nav-card, .btn, button, a.btn, " +
            ".problem-table tbody tr, .qa-card, .bm-star, .studio-nav-item, " +
            ".filter-chip, .neo-orbit-item, [role='button']"
        )
        .forEach((el) => el.classList.add("cursor-target"));
      if (this._ensureAttached) this._ensureAttached();
    },
  };

  window.NexoraCursor = NexoraCursor;
})();
