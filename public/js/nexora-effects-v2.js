/**
 * ═══════════════════════════════════════════════════════════════
 *  Nexora — Advanced UI Effects Engine  v2.0
 *  Custom cursor · 3D tilt · Holographic shimmer · Parallax
 *  Entrance reveals · Counter animations · Ambient particles
 *  Glitch text · Magnetic hover · Ripple · Spotlight · Radar
 *  Neon border · Spring reveals · 3D flip · Depth shadows
 * ═══════════════════════════════════════════════════════════════
 */
;(function () {
  'use strict';

  /* ─── touch devices skip heavy visual effects ─── */
  const IS_TOUCH = window.matchMedia('(pointer: coarse)').matches;

  /* ─── shared mouse state ─── */
  const M = { x: -400, y: -400, rx: 0.5, ry: 0.5, vx: 0, vy: 0 };
  let _lx = -400, _ly = -400;

  /* ─── colour palette ─── */
  const BURST_COLORS = ['#00d4ff','#b44aff','#ff2d95','#39ff14','#fbbf24'];
  const AMBIENT_COLORS = ['#00d4ff','#b44aff','#ff2d95','#39ff14','#fbbf24','#06b6d4','#8b5cf6','#f59e0b'];

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
     1.  CUSTOM CURSOR  (dot + ring + canvas trail)
     ══════════════════════════════════════════════════════════════ */
  function initCursor() {
    if (IS_TOUCH) return;

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

    const TRAIL_MAX = 32;
    const trail = [];
    let ringX = M.x, ringY = M.y;

    document.addEventListener('mousemove', e => {
      M.vx = e.clientX - _lx;
      M.vy = e.clientY - _ly;
      _lx = M.x = e.clientX;
      _ly = M.y = e.clientY;
      M.rx = e.clientX / innerWidth;
      M.ry = e.clientY / innerHeight;

      dot.style.left = e.clientX + 'px';
      dot.style.top  = e.clientY + 'px';

      trail.push({ x: e.clientX, y: e.clientY, t: 0 });
      if (trail.length > TRAIL_MAX) trail.shift();

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
      spawnParticles(M.x, M.y, 6);
    });

    document.addEventListener('mouseup', () => {
      ring.classList.remove('nx-ring-click');
      dot.classList.remove('nx-dot-click');
      dot.style.transform = 'translate(-50%,-50%) scale(1)';
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    });

    (function tick() {
      ringX += (M.x - ringX) * 0.10;
      ringY += (M.y - ringY) * 0.10;
      ring.style.left = ringX + 'px';
      ring.style.top  = ringY + 'px';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.t++;
        const life  = 1 - p.t / TRAIL_MAX;
        if (life <= 0) { trail.splice(i, 1); continue; }
        const alpha = life * 0.5;
        const size  = life * 3.2;

        const colorIdx = Math.floor((i / TRAIL_MAX) * BURST_COLORS.length);
        const color = BURST_COLORS[colorIdx % BURST_COLORS.length];

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
        grd.addColorStop(0, `rgba(0,212,255,${alpha})`);
        grd.addColorStop(0.4, `rgba(180,74,255,${alpha * 0.5})`);
        grd.addColorStop(1, `rgba(180,74,255,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      requestAnimationFrame(tick);
    })();
  }

  /* ══════════════════════════════════════════════════════════════
     2.  PARTICLE BURSTS  (on click / special events)
     ══════════════════════════════════════════════════════════════ */
  function spawnParticles(x, y, n) {
    n = n || 6;
    for (let i = 0; i < n; i++) {
      const p     = mk('div', 'nx-particle');
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.9;
      const dist  = 18 + Math.random() * 36;
      const size  = 2 + Math.random() * 3;
      const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)];
      Object.assign(p.style, {
        left: x + 'px', top: y + 'px',
        width: size + 'px', height: size + 'px',
        background: color,
        '--px': (Math.cos(angle) * dist) + 'px',
        '--py': (Math.sin(angle) * dist) + 'px',
        boxShadow: `0 0 ${size * 2.5}px ${color}, 0 0 ${size * 5}px ${color}44`,
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
      _barW = Math.min(_barW + (Math.random() * 22 + 6), 80);
      barEl.style.width = _barW + '%';
      barEl.style.transition = 'width 0.22s ease-out';
      if (_barW < 80) _barTimer = setTimeout(advance, 80 + Math.random() * 100);
    };
    _barTimer = setTimeout(advance, 25);
  }

  function progressEnd() {
    clearTimeout(_barTimer);
    barEl.style.width = '100%';
    barEl.style.transition = 'width 0.18s ease-out';
    setTimeout(() => {
      barEl.classList.add('nx-bar-done');
      setTimeout(() => barEl.classList.remove('nx-bar-active', 'nx-bar-done'), 700);
    }, 200);
  }

  /* ══════════════════════════════════════════════════════════════
     4.  PAGE TRANSITIONS  (hash-based fade + slide)
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

      pc.style.cssText =
        'opacity:0;transform:translateY(-6px) scale(0.992);' +
        'transition:opacity 0.12s,transform 0.12s;pointer-events:none';

      const obs = new MutationObserver(() => {
        obs.disconnect();
        requestAnimationFrame(() => {
          pc.style.cssText =
            'opacity:0;transform:translateY(12px) scale(0.993);' +
            'transition:none;pointer-events:none';
          requestAnimationFrame(() => {
            pc.style.cssText =
              'opacity:1;transform:translateY(0) scale(1);' +
              'transition:opacity 0.5s cubic-bezier(0.16,1,0.3,1),' +
              'transform 0.5s cubic-bezier(0.16,1,0.3,1);pointer-events:auto';
            progressEnd();
            setTimeout(() => {
              busy = false;
              applyReveal();
              applyTiltAndScan();
              applyMagnetic();
              applyHolo();
              applyNeonBorder();
              initCounters();
            }, 65);
          });
        });
      });
      obs.observe(pc, { childList: true });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     5.  3-D TILT CARDS  (event delegation)
     ══════════════════════════════════════════════════════════════ */
  const TILT_SEL =
    '.stat-card,.problem-card,.hub-card,.achievement-card,' +
    '.gate-panel,.ob-preview-card,.settings-section,.social-card,' +
    '.leaderboard-entry,.tutorial-card,.forge-card,.skill-node,' +
    '.nexus-card,.hub-module,.contest-card,.up-stat-card,.up-section-card';

  let _activeTiltEl = null;

  function applyTiltAndScan() {
    document.querySelectorAll(TILT_SEL).forEach(card => {
      if (card.dataset.nxTilt) return;
      card.dataset.nxTilt = '1';
      card.classList.add('nx-tilt-card', 'nx-card-scan', 'nx-glow-hover', 'nx-holo', 'nx-neon-border');

      if (!card.querySelector('.nx-sheen')) {
        const sheen = mk('div', 'nx-sheen');
        card.style.position = card.style.position || 'relative';
        card.appendChild(sheen);
      }

      /* depth ring */
      if (!card.querySelector('.nx-depth-ring')) {
        const ring = mk('div', 'nx-depth-ring');
        card.appendChild(ring);
      }
    });
  }

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
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    const ry = (nx - 0.5) * 15;
    const rx = -(ny - 0.5) * 11;

    card.style.transform  = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02) translateZ(4px)`;
    card.style.transition = 'transform 0.06s';

    const sheen = card.querySelector('.nx-sheen');
    if (sheen) {
      sheen.style.setProperty('--sx', (nx * 100).toFixed(1) + '%');
      sheen.style.setProperty('--sy', (ny * 100).toFixed(1) + '%');
      sheen.style.opacity = '1';
    }

    /* update holographic position */
    card.style.setProperty('--hx', (nx * 100).toFixed(1) + '%');
    card.style.setProperty('--hy', (ny * 100).toFixed(1) + '%');
  });

  document.addEventListener('mouseleave', e => {
    const card = e.target && e.target.matches && e.target.matches(TILT_SEL) ? e.target : null;
    if (card) { _resetTilt(card); if (_activeTiltEl === card) _activeTiltEl = null; }
  }, true);

  function _resetTilt(card) {
    card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1) translateZ(0)';
    card.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    const sheen = card.querySelector('.nx-sheen');
    if (sheen) sheen.style.opacity = '0';
    card.style.setProperty('--hx', '50%');
    card.style.setProperty('--hy', '50%');
  }

  /* ══════════════════════════════════════════════════════════════
     6.  HOLOGRAPHIC SHIMMER  (rainbow on hover)
     ══════════════════════════════════════════════════════════════ */
  function applyHolo() {
    /* delegation: the mousemove above already sets --hx/--hy per card */
    /* just add the class to non-tilt elements that should get holo */
    const holoSel = '.up-stat-card,.up-section-card,.achievement-card.unlocked';
    document.querySelectorAll(holoSel).forEach(el => {
      if (!el.classList.contains('nx-holo')) {
        el.classList.add('nx-holo');
        el.addEventListener('mousemove', e => {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--hx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
          el.style.setProperty('--hy', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
        });
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     7.  ENTRANCE REVEAL  (IntersectionObserver — 4 variants)
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
    '#pageContent .skill-node,' +
    '#pageContent .up-stat-card,' +
    '#pageContent .up-section-card';

  /* Use 4 reveal variants for variety */
  const REVEAL_CLASSES = ['nx-fade-up', 'nx-spring-up', 'nx-fade-left', 'nx-flip-in'];

  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('nx-in');
        revealIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -10px 0px' });

  function applyReveal() {
    document.querySelectorAll(REVEAL_SEL).forEach((el, i) => {
      if (el.dataset.nxRev) return;
      el.dataset.nxRev = '1';

      const cls = REVEAL_CLASSES[i % REVEAL_CLASSES.length];
      el.classList.add(cls);
      el.style.transitionDelay = Math.min(i * 0.04, 0.5) + 's';

      /* double-rAF then observe; also safety fallback timeout */
      requestAnimationFrame(() => requestAnimationFrame(() => {
        revealIO.observe(el);
        /* safety: if IO doesn't fire in 700ms, force visible */
        setTimeout(() => {
          if (!el.classList.contains('nx-in')) {
            el.classList.add('nx-in');
            revealIO.unobserve(el);
          }
        }, 700);
      }));
    });
  }

  /* ══════════════════════════════════════════════════════════════
     8.  AMBIENT PARTICLE FIELD  (floating background dots)
     ══════════════════════════════════════════════════════════════ */
  function initAmbientField() {
    const field = mk('div', 'nx-ambient-field', { id: 'nxAmbient' });
    document.body.appendChild(field);

    for (let i = 0; i < 45; i++) {
      const p = mk('div', 'nx-ambient-particle');
      const size  = 1 + Math.random() * 2.5;
      const color = AMBIENT_COLORS[Math.floor(Math.random() * AMBIENT_COLORS.length)];
      const dur   = 5 + Math.random() * 12;
      const delay = -(Math.random() * 12);
      const ao    = (0.06 + Math.random() * 0.18).toFixed(2);

      Object.assign(p.style, {
        left:             (Math.random() * 100) + '%',
        top:              (Math.random() * 100) + '%',
        width:            size + 'px',
        height:           size + 'px',
        background:       color,
        '--ao':           ao,
        animationDuration: dur + 's',
        animationDelay:   delay + 's',
        boxShadow:        `0 0 ${size * 2}px ${color}88`,
      });
      field.appendChild(p);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     9.  COUNTER ANIMATIONS  (stat numbers count up from 0)
     ══════════════════════════════════════════════════════════════ */
  const COUNTER_SEL =
    '.up-stat-val,.hud-stat-val,.stat-number,' +
    '.hud-v2-stat-num,.profile-hero-stat-val,.today-ring-val';

  const counterIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      if (el.dataset.nxCounted) return;
      el.dataset.nxCounted = '1';
      counterIO.unobserve(el);

      const raw    = el.textContent.trim();
      const suffix = raw.replace(/[\d,.\s]+/g, '');
      const target = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (isNaN(target) || target === 0) return;

      el.classList.add('nx-counting');
      const dur  = Math.min(1400, 600 + target * 0.3);
      const t0   = performance.now();

      requestAnimationFrame(function step(now) {
        const progress = Math.min((now - t0) / dur, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const current  = Math.round(eased * target);
        el.textContent = current.toLocaleString() + suffix;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = target.toLocaleString() + suffix;
          el.classList.remove('nx-counting');
          el.classList.add('nx-count-done');

          /* flash the parent card */
          const card = el.closest('.up-stat-card, .stat-card, .hud-v2-stat');
          if (card) card.classList.add('nx-apex-flash');
          setTimeout(() => {
            el.classList.remove('nx-count-done');
            if (card) card.classList.remove('nx-apex-flash');
          }, 800);
        }
      });
    });
  }, { threshold: 0.5 });

  function initCounters() {
    document.querySelectorAll(COUNTER_SEL).forEach(el => {
      if (!el.dataset.nxCounted) counterIO.observe(el);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     10.  PARALLAX  (mouse-driven, RAF-throttled)
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
      requestAnimationFrame(() => { _doParallax(); pending = false; });
    });
  }

  function _doParallax() {
    const rx = M.rx - 0.5;
    const ry = M.ry - 0.5;

    const orbLayer = document.querySelector('.orb-layer');
    if (orbLayer) orbLayer.style.transform = `translate3d(${rx * 24}px,${ry * 16}px,0)`;

    document.querySelectorAll('.floating-orb').forEach((orb, i) => {
      const d  = ((i % 4) + 1) * 0.45;
      orb.style.transform = `translate3d(${rx * 28 * d}px,${ry * 20 * d}px,0)`;
    });

    const sb = document.getElementById('sidebar');
    if (sb) sb.style.backgroundPosition = `${50 + rx * 4}% ${50 + ry * 4}%`;
  }

  /* ══════════════════════════════════════════════════════════════
     11.  SPOTLIGHT  (cursor glow in main content)
     ══════════════════════════════════════════════════════════════ */
  function initSpotlight() {
    if (IS_TOUCH) return;

    const mc = document.getElementById('mainContent');
    if (!mc) return;

    const spot = mk('div', 'nx-spotlight', { id: 'nxSpot' });
    mc.style.position = 'relative';
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
     12.  MAGNETIC BUTTONS + RIPPLE
     ══════════════════════════════════════════════════════════════ */
  const MAG_SEL =
    '.btn-primary,.btn-submit,.btn-run,' +
    '.gate-btn-primary,.ob-deploy,.ob-nav-next,.gate-btn';

  function applyMagnetic() {
    document.querySelectorAll(MAG_SEL).forEach(btn => {
      if (btn.dataset.nxMag) return;
      btn.dataset.nxMag = '1';
      btn.classList.add('nx-ripple-host', 'nx-btn-3d');
      btn.addEventListener('mousemove',  _onMagMove);
      btn.addEventListener('mouseleave', _onMagLeave);
      btn.addEventListener('click',      _onRipple);
    });
  }

  function _onMagMove(e) {
    const r  = this.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) * 0.22;
    const dy = (e.clientY - r.top  - r.height / 2) * 0.22;
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
    const size = Math.max(r.width, r.height) * 2.5;
    const rip  = mk('span', 'nx-ripple');
    rip.style.cssText =
      `width:${size}px;height:${size}px;` +
      `left:${e.clientX - r.left - size / 2}px;` +
      `top:${e.clientY - r.top  - size / 2}px`;
    btn.appendChild(rip);
    spawnParticles(e.clientX, e.clientY, 4);
    setTimeout(() => rip.remove(), 750);
  }

  /* ══════════════════════════════════════════════════════════════
     13.  NAV CLICK PARTICLES + BORDER TRACE
     ══════════════════════════════════════════════════════════════ */
  function initNavParticles() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => spawnParticles(e.clientX, e.clientY, 5));
    });
  }

  function initBorderTrace() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.add('nx-border-run');
    });
  }

  /* ══════════════════════════════════════════════════════════════
     14.  NEON BORDER  (rotating gradient border on panels)
     ══════════════════════════════════════════════════════════════ */
  const NEON_BORDER_SEL =
    '.settings-section,.social-card,.up-section-card,.gate-panel,.ob-preview-card';

  function applyNeonBorder() {
    document.querySelectorAll(NEON_BORDER_SEL).forEach(el => {
      if (!el.classList.contains('nx-neon-border')) {
        el.classList.add('nx-neon-border');
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     15.  RADAR SWEEP
     ══════════════════════════════════════════════════════════════ */
  function initRadar() {
    const line = mk('div', 'nx-radar-line', { id: 'nxRadar' });
    document.body.appendChild(line);
  }

  /* ══════════════════════════════════════════════════════════════
     16.  NEON GRID BACKGROUND
     ══════════════════════════════════════════════════════════════ */
  function initGridBg() {
    const grid = mk('div', 'nx-grid-bg', { id: 'nxGrid' });
    document.body.appendChild(grid);
  }

  /* ══════════════════════════════════════════════════════════════
     17.  GLITCH TEXT  (random burst on page headings)
     ══════════════════════════════════════════════════════════════ */
  const GLITCH_SEL =
    '.page-title,.section-title,.hud-rank-title,.up-rank-title,' +
    '.sidebar-brand,.brand-name,.welcome-title';

  function applyGlitch() {
    document.querySelectorAll(GLITCH_SEL).forEach(el => {
      if (el.dataset.nxGlitch) return;
      el.dataset.nxGlitch = '1';
      const text = el.textContent;
      el.setAttribute('data-text', text);
      el.classList.add('nx-glitch');
    });
  }

  /* ══════════════════════════════════════════════════════════════
     18.  GRADIENT TEXT on key elements
     ══════════════════════════════════════════════════════════════ */
  const GRAD_TEXT_SEL =
    '.hud-rank-title,.up-level-tag,.sidebar-title-row .sidebar-title,' +
    '.nexus-level-title,.forge-tier-title,.brand-text';

  function applyGradientText() {
    document.querySelectorAll(GRAD_TEXT_SEL).forEach(el => {
      if (!el.dataset.nxGrad) {
        el.dataset.nxGrad = '1';
        /* only if single-line text elements */
        if (el.children.length === 0) {
          el.classList.add('nx-gradient-text');
        }
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     19.  SIDEBAR PLAYER CARD — neon pulse on active level badge
     ══════════════════════════════════════════════════════════════ */
  function initSidebarEffects() {
    const xpFill = document.getElementById('sidebarXpFill');
    if (xpFill) xpFill.classList.add('nx-neon-pulse');

    const badge = document.getElementById('sidebarRiftBadge');
    if (badge) badge.style.filter = 'drop-shadow(0 0 6px #00d4ff) drop-shadow(0 0 12px #b44aff44)';
  }

  /* ══════════════════════════════════════════════════════════════
     20.  MUTATION OBSERVER — keeps effects alive on dynamic DOM
     ══════════════════════════════════════════════════════════════ */
  let _watchTimer;

  function watchDOM() {
    const pc = document.getElementById('pageContent');
    if (!pc) return;

    const obs = new MutationObserver(() => {
      clearTimeout(_watchTimer);
      _watchTimer = setTimeout(() => {
        applyReveal();
        applyTiltAndScan();
        applyMagnetic();
        applyHolo();
        applyNeonBorder();
        applyGlitch();
        applyGradientText();
        initCounters();
      }, 55);
    });
    obs.observe(pc, { childList: true, subtree: true });
  }

  /* ══════════════════════════════════════════════════════════════
     BOOT  — wire everything up
     ══════════════════════════════════════════════════════════════ */
  function boot() {
    initProgressBar();
    initPageTransitions();
    initRadar();
    initGridBg();
    initBorderTrace();

    if (!IS_TOUCH) {
      initCursor();
      initParallax();
      initSpotlight();
    }

    /* ambient particle field (always) */
    initAmbientField();

    /* initial pass after App renders */
    setTimeout(() => {
      applyReveal();
      applyTiltAndScan();
      applyMagnetic();
      applyHolo();
      applyNeonBorder();
      applyGlitch();
      applyGradientText();
      initCounters();
      initNavParticles();
      initSidebarEffects();
    }, 950);

    watchDOM();

    /* re-run counters periodically for dynamically loaded stats */
    setInterval(initCounters, 3000);

    console.log(
      '%c[Nexora FX v2] Effects engine online ✦',
      'color:#00d4ff;font-weight:700;font-family:monospace;font-size:13px;' +
      'text-shadow:0 0 10px #00d4ff,0 0 20px #b44aff'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
