/**
 * ═══════════════════════════════════════════════════════════════
 *  Nexora — Advanced UI Effects Engine  v1.0
 *  Custom cursor · 3D tilt · Parallax · Entrance reveals
 *  Magnetic hover · Ripple · Particle burst · Spotlight · Radar
 * ═══════════════════════════════════════════════════════════════
 */
;(function () {
  'use strict';

  /* ─── skip all heavy JS effects on touch devices ─── */
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

  /* ─── global mouse state (updated on every mousemove) ─── */
  const M = { x: -400, y: -400, rx: 0.5, ry: 0.5, vx: 0, vy: 0 };
  let _lx = -400, _ly = -400;   // previous frame coords for velocity

  /* ─── colour palette for particle bursts ─── */
  const BURST_COLORS = ['#00d4ff', '#b44aff', '#ff2d95', '#39ff14', '#fbbf24'];

  /* ══════════════════════════════════════════════════════════════
     UTILITY
     ══════════════════════════════════════════════════════════════ */
  function mk(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls)   e.className = cls;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  /* ══════════════════════════════════════════════════════════════
     1.  CUSTOM CURSOR
     ══════════════════════════════════════════════════════════════ */
  function initCursor() {
    if (IS_TOUCH) return;

    /* ── DOM elements ── */
    const dot    = mk('div', 'nx-cursor-dot',  { id: 'nxDot'   });
    const ring   = mk('div', 'nx-cursor-ring', { id: 'nxRing'  });
    const canvas = mk('canvas', 'nx-trail-canvas', { id: 'nxTrail' });

    canvas.width  = innerWidth;
    canvas.height = innerHeight;

    document.body.append(canvas, ring, dot);
    const ctx = canvas.getContext('2d');

    window.addEventListener('resize', () => {
      canvas.width  = innerWidth;
      canvas.height = innerHeight;
    });

    /* ── trail state ── */
    const TRAIL_MAX = 28;
    const trail     = [];
    let ringX = M.x, ringY = M.y;

    /* ── mouse listeners ── */
    document.addEventListener('mousemove', e => {
      M.vx = e.clientX - _lx;
      M.vy = e.clientY - _ly;
      _lx  = M.x = e.clientX;
      _ly  = M.y = e.clientY;
      M.rx = e.clientX / innerWidth;
      M.ry = e.clientY / innerHeight;

      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';

      trail.push({ x: e.clientX, y: e.clientY, t: 0 });
      if (trail.length > TRAIL_MAX) trail.shift();

      /* state: hovering an interactive element? */
      const tgt = document.elementFromPoint(e.clientX, e.clientY);
      const hot = tgt && tgt.closest(
        'a,button,[role="button"],input,select,textarea,.nav-item,.btn,.problem-row,label,.gate-btn,.ob-deploy'
      );
      ring.classList.toggle('nx-ring-hover', !!hot);
      dot.classList.toggle('nx-dot-hover',   !!hot);
    });

    document.addEventListener('mousedown', () => {
      ring.classList.add('nx-ring-click');
      dot.classList.add('nx-dot-click');
      dot.style.transform = 'translate(-50%,-50%) scale(0.55)';
      spawnParticles(M.x, M.y, 5);
    });

    document.addEventListener('mouseup', () => {
      ring.classList.remove('nx-ring-click');
      dot.classList.remove('nx-dot-click');
      dot.style.transform = 'translate(-50%,-50%) scale(1)';
    });

    /* hide/show on window enter/leave */
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    /* ── RAF loop: ring lerp + trail draw ── */
    (function tick() {
      /* smooth ring lag */
      ringX += (M.x - ringX) * 0.10;
      ringY += (M.y - ringY) * 0.10;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';

      /* trail canvas */
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.t++;
        const life  = 1 - p.t / TRAIL_MAX;
        if (life <= 0) { trail.splice(i, 1); continue; }
        const alpha = life * 0.45;
        const size  = life * 2.8;

        /* gradient dot */
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.5);
        grd.addColorStop(0, `rgba(0,212,255,${alpha})`);
        grd.addColorStop(1, `rgba(180,74,255,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      requestAnimationFrame(tick);
    })();
  }

  /* ══════════════════════════════════════════════════════════════
     2.  PARTICLE BURSTS
     ══════════════════════════════════════════════════════════════ */
  function spawnParticles(x, y, n) {
    n = n || 6;
    for (let i = 0; i < n; i++) {
      const p     = mk('div', 'nx-particle');
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.9;
      const dist  = 16 + Math.random() * 30;
      const size  = 2 + Math.random() * 2.5;
      const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
      Object.assign(p.style, {
        left:      x + 'px',
        top:       y + 'px',
        width:     size + 'px',
        height:    size + 'px',
        background: color,
        '--px':    (Math.cos(angle) * dist) + 'px',
        '--py':    (Math.sin(angle) * dist) + 'px',
        boxShadow: `0 0 ${size * 2}px ${color}`,
      });
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     3.  TOP PROGRESS BAR
     ══════════════════════════════════════════════════════════════ */
  let _barTimer, _barW = 0;
  const barEl = mk('div', 'nx-topbar-progress');
  barEl.appendChild(mk('div', 'nx-topbar-glow'));

  function initProgressBar() {
    document.body.appendChild(barEl);
  }

  function progressStart() {
    clearTimeout(_barTimer);
    _barW = 0;
    barEl.style.cssText = 'width:0%;opacity:1;transition:none';
    barEl.classList.add('nx-bar-active');
    barEl.classList.remove('nx-bar-done');
    const advance = () => {
      _barW = Math.min(_barW + (Math.random() * 20 + 5), 80);
      barEl.style.width      = _barW + '%';
      barEl.style.transition = 'width 0.22s ease-out';
      if (_barW < 80) _barTimer = setTimeout(advance, 80 + Math.random() * 110);
    };
    _barTimer = setTimeout(advance, 25);
  }

  function progressEnd() {
    clearTimeout(_barTimer);
    barEl.style.width      = '100%';
    barEl.style.transition = 'width 0.18s ease-out';
    setTimeout(() => {
      barEl.classList.add('nx-bar-done');
      setTimeout(() => barEl.classList.remove('nx-bar-active', 'nx-bar-done'), 700);
    }, 200);
  }

  /* ══════════════════════════════════════════════════════════════
     4.  PAGE TRANSITIONS (hash-based)
     ══════════════════════════════════════════════════════════════ */
  const veil = mk('div', 'nx-transition-veil', { id: 'nxVeil' });

  function initPageTransitions() {
    document.body.appendChild(veil);

    const pc = document.getElementById('pageContent');
    if (!pc) return;

    let busy = false;

    window.addEventListener('hashchange', () => {
      if (busy) return;
      busy = true;
      progressStart();

      /* fade out */
      pc.style.cssText =
        'opacity:0;transform:translateY(-5px) scale(0.993);' +
        'transition:opacity 0.12s,transform 0.12s;pointer-events:none';

      /* watch for new children (App re-renders synchronously) */
      const obs = new MutationObserver(() => {
        obs.disconnect();
        requestAnimationFrame(() => {
          /* start from below */
          pc.style.cssText =
            'opacity:0;transform:translateY(10px) scale(0.994);' +
            'transition:none;pointer-events:none';
          requestAnimationFrame(() => {
            pc.style.cssText =
              'opacity:1;transform:translateY(0) scale(1);' +
              'transition:opacity 0.48s cubic-bezier(0.16,1,0.3,1),' +
              'transform 0.48s cubic-bezier(0.16,1,0.3,1);pointer-events:auto';
            progressEnd();
            setTimeout(() => {
              busy = false;
              applyReveal();
              applyTiltAndScan();
              applyMagnetic();
            }, 60);
          });
        });
      });
      obs.observe(pc, { childList: true });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     5.  3-D TILT CARDS  (event-delegation — works on dynamic DOM)
     ══════════════════════════════════════════════════════════════ */
  const TILT_SEL =
    '.stat-card,.problem-card,.hub-card,.achievement-card,' +
    '.gate-panel,.ob-preview-card,.settings-section,.social-card,' +
    '.leaderboard-entry,.tutorial-card,.forge-card,.skill-node,' +
    '.nexus-card,.hub-module,.contest-card';

  let _activeTiltEl = null;

  function applyTiltAndScan() {
    document.querySelectorAll(TILT_SEL).forEach(card => {
      if (card.dataset.nxTilt) return;
      card.dataset.nxTilt = '1';
      card.classList.add('nx-tilt-card', 'nx-card-scan', 'nx-glow-hover');

      /* inject sheen once */
      if (!card.querySelector('.nx-sheen')) {
        const sheen = mk('div', 'nx-sheen');
        card.style.position = card.style.position || 'relative';
        card.appendChild(sheen);
      }
    });
  }

  /* delegated mousemove on document for tilt */
  document.addEventListener('mousemove', e => {
    if (IS_TOUCH) return;
    const card = e.target.closest ? e.target.closest(TILT_SEL) : null;

    if (_activeTiltEl && _activeTiltEl !== card) {
      _resetTilt(_activeTiltEl);
      _activeTiltEl = null;
    }

    if (!card) return;
    _activeTiltEl = card;

    const r  = card.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;        /* 0–1 */
    const ny = (e.clientY - r.top)  / r.height;       /* 0–1 */
    const ry = (nx - 0.5) * 13;                        /* ±6.5 ° */
    const rx = -(ny - 0.5) * 10;                       /* ±5 ° */

    card.style.transform  = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.018,1.018,1.018)`;
    card.style.transition = 'transform 0.06s';

    const sheen = card.querySelector('.nx-sheen');
    if (sheen) {
      sheen.style.setProperty('--sx', (nx * 100).toFixed(1) + '%');
      sheen.style.setProperty('--sy', (ny * 100).toFixed(1) + '%');
      sheen.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', e => {
    const card = e.target && e.target.matches && e.target.matches(TILT_SEL)
      ? e.target : null;
    if (card) { _resetTilt(card); if (_activeTiltEl === card) _activeTiltEl = null; }
  }, true);

  function _resetTilt(card) {
    card.style.transform  = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
    card.style.transition = 'transform 0.55s cubic-bezier(0.16,1,0.3,1)';
    const sheen = card.querySelector('.nx-sheen');
    if (sheen) sheen.style.opacity = '0';
  }

  /* ══════════════════════════════════════════════════════════════
     6.  ENTRANCE REVEAL  (IntersectionObserver)
     ══════════════════════════════════════════════════════════════ */
  const REVEAL_SEL =
    '#pageContent > *,' +
    '#pageContent .stat-card,' +
    '#pageContent .problem-row,' +
    '#pageContent .hub-card,' +
    '#pageContent .hub-module,' +
    '#pageContent .achievement-card,' +
    '#pageContent .tutorial-card,' +
    '#pageContent .social-card,' +
    '#pageContent .leaderboard-entry,' +
    '#pageContent .nexus-card,' +
    '#pageContent .forge-card,' +
    '#pageContent .skill-node';

  const REVEAL_CLASSES = ['nx-fade-up', 'nx-fade-up-scale', 'nx-fade-left'];

  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('nx-in');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

  function applyReveal() {
    document.querySelectorAll(REVEAL_SEL).forEach((el, i) => {
      if (el.dataset.nxRev) return;
      el.dataset.nxRev = '1';

      const cls = REVEAL_CLASSES[i % 3];
      el.classList.add(cls);
      el.style.transitionDelay = Math.min(i * 0.038, 0.44) + 's';

      /* double-rAF guarantees browser paints opacity:0 before we observe */
      requestAnimationFrame(() => requestAnimationFrame(() => revealIO.observe(el)));
    });
  }

  /* ══════════════════════════════════════════════════════════════
     7.  PARALLAX  (mouse-driven, RAF-throttled)
     ══════════════════════════════════════════════════════════════ */
  function initParallax() {
    if (IS_TOUCH) return;

    const orbLayer = document.querySelector('.orb-layer');
    if (orbLayer) {
      orbLayer.style.willChange = 'transform';
      orbLayer.style.transition = 'transform 1.4s cubic-bezier(0.16,1,0.3,1)';
    }

    let pending = false;
    document.addEventListener('mousemove', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        _doParallax();
        pending = false;
      });
    });
  }

  function _doParallax() {
    const rx = M.rx - 0.5;   /* -0.5 … 0.5 */
    const ry = M.ry - 0.5;

    /* whole orb layer drifts slowly */
    const orbLayer = document.querySelector('.orb-layer');
    if (orbLayer) {
      orbLayer.style.transform =
        `translate3d(${rx * 22}px, ${ry * 14}px, 0)`;
    }

    /* individual orbs at different depth levels */
    document.querySelectorAll('.floating-orb').forEach((orb, i) => {
      const d  = ((i % 4) + 1) * 0.45;
      const ox = rx * 28 * d;
      const oy = ry * 20 * d;
      orb.style.transform =
        `translate3d(${ox}px,${oy}px,0) ` +
        (orb._baseTransform || '');
    });

    /* sidebar subtle counter-drift (depth illusion) */
    const sb = document.getElementById('sidebar');
    if (sb) {
      sb.style.backgroundPosition =
        `${50 + rx * 4}% ${50 + ry * 4}%`;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     8.  SPOTLIGHT (cursor glow inside main content)
     ══════════════════════════════════════════════════════════════ */
  function initSpotlight() {
    if (IS_TOUCH) return;

    const mc = document.getElementById('mainContent');
    if (!mc) return;

    const spot = mk('div', 'nx-spotlight', { id: 'nxSpot' });
    mc.style.position = 'relative';   /* ensure absolute child is contained */
    mc.appendChild(spot);

    let pending = false;
    document.addEventListener('mousemove', e => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        const r = mc.getBoundingClientRect();
        spot.style.left = (e.clientX - r.left) + 'px';
        spot.style.top  = (e.clientY - r.top)  + 'px';
        pending = false;
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     9.  MAGNETIC BUTTONS + RIPPLE
     ══════════════════════════════════════════════════════════════ */
  const MAG_SEL =
    '.btn-primary,.btn-submit,.btn-run,' +
    '.gate-btn-primary,.ob-deploy,.ob-nav-next,.gate-btn';

  function applyMagnetic() {
    document.querySelectorAll(MAG_SEL).forEach(btn => {
      if (btn.dataset.nxMag) return;
      btn.dataset.nxMag = '1';
      btn.classList.add('nx-ripple-host');
      btn.addEventListener('mousemove',  _onMagMove);
      btn.addEventListener('mouseleave', _onMagLeave);
      btn.addEventListener('click',      _onRipple);
    });
  }

  function _onMagMove(e) {
    const r  = this.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) * 0.24;
    const dy = (e.clientY - r.top  - r.height / 2) * 0.24;
    this.style.transform  = `translate(${dx}px,${dy}px)`;
    this.style.transition = 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)';
  }

  function _onMagLeave() {
    this.style.transform  = 'translate(0,0)';
    this.style.transition = 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
  }

  function _onRipple(e) {
    const btn  = this;
    const r    = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.4;
    const rip  = mk('span', 'nx-ripple');
    rip.style.cssText =
      `width:${size}px;height:${size}px;` +
      `left:${e.clientX - r.left - size / 2}px;` +
      `top:${e.clientY - r.top  - size / 2}px`;
    btn.appendChild(rip);
    setTimeout(() => rip.remove(), 750);
  }

  /* ══════════════════════════════════════════════════════════════
     10. NAV CLICK PARTICLES
     ══════════════════════════════════════════════════════════════ */
  function initNavParticles() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => spawnParticles(e.clientX, e.clientY, 4));
    });
  }

  /* ══════════════════════════════════════════════════════════════
     11. RADAR SWEEP  (ambient vertical scan line across viewport)
     ══════════════════════════════════════════════════════════════ */
  function initRadar() {
    const line = mk('div', 'nx-radar-line', { id: 'nxRadar' });
    document.body.appendChild(line);
  }

  /* ══════════════════════════════════════════════════════════════
     12. BORDER TRACE on nav items
     ══════════════════════════════════════════════════════════════ */
  function initBorderTrace() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.add('nx-border-run');
    });
  }

  /* ══════════════════════════════════════════════════════════════
     13. MUTATION OBSERVER — keeps effects alive as DOM updates
     ══════════════════════════════════════════════════════════════ */
  function watchDOM() {
    const pc = document.getElementById('pageContent');
    if (!pc) return;

    const obs = new MutationObserver(() => {
      /* debounce slightly so one batch handles rapid DOM additions */
      clearTimeout(_watchTimer);
      _watchTimer = setTimeout(() => {
        applyReveal();
        applyTiltAndScan();
        applyMagnetic();
      }, 55);
    });
    obs.observe(pc, { childList: true, subtree: true });
  }
  let _watchTimer;

  /* ══════════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════════ */
  function boot() {
    initProgressBar();
    initPageTransitions();
    initRadar();
    initBorderTrace();

    if (!IS_TOUCH) {
      initCursor();
      initParallax();
      initSpotlight();
    }

    /* initial pass (for elements already in DOM at boot) */
    setTimeout(() => {
      applyReveal();
      applyTiltAndScan();
      applyMagnetic();
      initNavParticles();
    }, 900);   /* slight delay so App.js finishes initial render */

    watchDOM();

    console.log('%c[Nexora FX] Effects engine online', 'color:#00d4ff;font-weight:700;font-family:monospace');
  }

  /* start after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
