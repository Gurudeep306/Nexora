/* ===== Nexora – Animated Particle Background (optimized) ===== */
(function() {
  'use strict';

  const canvas = document.createElement('canvas');
  canvas.id = 'riftCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.6;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: -1000, y: -1000 }, animId = 0, paused = false;
  const COLORS = ['#1d4ed8', '#14b8a6', '#059669', '#d4a017', '#3b82f6'];
  const MAX = 50;               // reduced from 80
  const CONNECT_DIST = 120;     // reduced from 140
  const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST; // avoid sqrt
  const TWO_PI = Math.PI * 2;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.r = Math.random() * 2 + 0.5;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.alpha = Math.random() * 0.5 + 0.2;
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < MAX; i++) particles.push(new Particle());
  }

  function draw() {
    if (paused) return;
    ctx.clearRect(0, 0, W, H);

    // batch connections in one path per alpha bucket
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      const pi = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const pj = particles[j];
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < CONNECT_DIST_SQ) {
          const alpha = (1 - Math.sqrt(distSq) / CONNECT_DIST) * 0.15;
          ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
        }
      }
    }

    // particles — skip per-particle glow gradients (major perf win)
    for (const p of particles) {
      // mouse repulsion
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const mDistSq = mdx * mdx + mdy * mdy;
      if (mDistSq < 22500) { // 150^2
        const mDist = Math.sqrt(mDistSq);
        const force = (150 - mDist) / 150 * 0.02;
        p.vx += mdx * force;
        p.vy += mdy * force;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;

      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TWO_PI);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    animId = requestAnimationFrame(draw);
  }

  // Pause when tab not visible — big battery/CPU saver
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      paused = true;
      cancelAnimationFrame(animId);
    } else {
      paused = false;
      animId = requestAnimationFrame(draw);
    }
  });

  // floating orbs in main content
  function createOrbs() {
    const main = document.getElementById('mainContent');
    if (!main) return;
    const orbLayer = document.createElement('div');
    orbLayer.className = 'orb-layer';
    main.prepend(orbLayer);

    for (let i = 0; i < 3; i++) {
      const orb = document.createElement('div');
      orb.className = 'floating-orb';
      orb.style.setProperty('--orb-size', (200 + Math.random() * 200) + 'px');
      orb.style.setProperty('--orb-x', (10 + Math.random() * 80) + '%');
      orb.style.setProperty('--orb-y', (10 + Math.random() * 80) + '%');
      orb.style.setProperty('--orb-hue', [240, 280, 190][i]);
      orb.style.animationDelay = (i * 3) + 's';
      orbLayer.appendChild(orb);
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); draw(); createOrbs(); });
  } else {
    init(); draw(); createOrbs();
  }
})();
