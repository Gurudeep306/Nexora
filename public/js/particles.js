/* ===== Nexora – Animated Particle Background ===== */
(function() {
  'use strict';

  const canvas = document.createElement('canvas');
  canvas.id = 'riftCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.6;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: -1000, y: -1000 };
  const COLORS = ['#1d4ed8', '#14b8a6', '#059669', '#d4a017', '#3b82f6'];
  const MAX = 80;
  const CONNECT_DIST = 140;

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
    ctx.clearRect(0, 0, W, H);

    // connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.15;
          ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // particles
    for (const p of particles) {
      // mouse repulsion
      const mdx = p.x - mouse.x;
      const mdy = p.y - mouse.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mDist < 150) {
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
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;

      // glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, p.color + '20');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

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

  window.addEventListener('resize', resize);
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { init(); draw(); createOrbs(); });
  } else {
    init(); draw(); createOrbs();
  }
})();
