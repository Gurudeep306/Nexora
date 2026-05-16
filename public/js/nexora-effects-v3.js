/**
 * ═══════════════════════════════════════════════════════════════
 *  Nexora Effects Engine  v4.0  — GAME-GRADE 3D
 *  GSAP 3 · ScrollTrigger · Three.js WebGL (lit Phong meshes)
 *  Lenis smooth scroll · Splitting.js character reveals
 *  Game lighting · Scroll fly-through · Warp particles
 *  Spring magnetics · Holographic foil · Chromatic aberration
 * ═══════════════════════════════════════════════════════════════
 */
;(function () {
  'use strict';

  const IS_TOUCH  = window.matchMedia('(pointer: coarse)').matches;
  const HAS_GSAP  = typeof gsap  !== 'undefined';
  const HAS_THREE = typeof THREE !== 'undefined';
  const HAS_LENIS = typeof Lenis !== 'undefined';
  const HAS_SPLIT = typeof Splitting !== 'undefined';

  let lenis = null;
  const M = { x: innerWidth/2, y: innerHeight/2, rx: 0.5, ry: 0.5 };

  document.addEventListener('mousemove', e => {
    M.rx = e.clientX / innerWidth;
    M.ry = e.clientY / innerHeight;
    M.x  = e.clientX;
    M.y  = e.clientY;
  });

  const PALETTE = ['#00d4ff','#b44aff','#ff2d95','#39ff14','#fbbf24','#06b6d4','#8b5cf6'];

  function mk(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  /* ══════════════════════════════════════════════════════════════
     1.  LENIS  SMOOTH SCROLL
     ══════════════════════════════════════════════════════════════ */
  function initLenis() {
    if (!HAS_LENIS) return;
    const wrapper = document.getElementById('mainContent');
    if (!wrapper) return;
    try {
      lenis = new Lenis({
        wrapper,
        content:        document.getElementById('pageContent') || wrapper,
        duration:       1.35,
        easing:         t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel:    true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
        infinite:       false,
      });
      if (HAS_GSAP) {
        gsap.ticker.add(time => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
        lenis.on('scroll', () => typeof ScrollTrigger !== 'undefined' && ScrollTrigger.update());
      } else {
        (function raf(t) { requestAnimationFrame(raf); lenis.raf(t); })();
      }
    } catch (e) { lenis = null; }
  }

  /* ══════════════════════════════════════════════════════════════
     2.  THREE.JS  GAME-GRADE 3D SCENE
         • MeshPhongMaterial with neon point lights (game lighting)
         • TorusKnot · Icosahedron · HexPillar · Diamond · Dodeca
         • 25-piece debris field (small rotating geometry)
         • 1500 additive-blending glow particles
         • Scroll-driven camera fly-through (Z: 130 → −150)
         • Warp effect: particle size surges with scroll velocity
         • Mouse-reactive camera tilt + yaw
     ══════════════════════════════════════════════════════════════ */
  function initWebGL() {
    if (!HAS_THREE || IS_TOUCH) return;

    const canvas = mk('canvas');
    canvas.id = 'nxWebGLCanvas';
    Object.assign(canvas.style, {
      position:'fixed', top:'0', left:'0', width:'100%', height:'100%',
      zIndex:'0', pointerEvents:'none',
    });
    document.body.insertBefore(canvas, document.body.firstChild);

    /* Game-grade renderer: antialias on, full pixel ratio */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    /* ─── PBR RENDERER CONFIG ─── */
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputEncoding     = THREE.sRGBEncoding;

    const scene  = new THREE.Scene();

    /* ─── PROCEDURAL NEON ENVIRONMENT MAP (PMREMGenerator — PBR reflections) ─── */
    ;(function buildEnvMap() {
      try {
        const pmremGen = new THREE.PMREMGenerator(renderer);
        pmremGen.compileEquirectangularShader();
        const ec = document.createElement('canvas'); ec.width = 1024; ec.height = 512;
        const ex = ec.getContext('2d');
        /* Sky: deep dark blue gradient */
        const sg = ex.createLinearGradient(0,0,0,240);
        sg.addColorStop(0,'#000510'); sg.addColorStop(1,'#001225');
        ex.fillStyle = sg; ex.fillRect(0,0,1024,260);
        /* Floor: dark teal */
        const fg = ex.createLinearGradient(0,260,0,512);
        fg.addColorStop(0,'#001830'); fg.addColorStop(1,'#000510');
        ex.fillStyle = fg; ex.fillRect(0,260,1024,252);
        /* Neon light halos — drives specular reflections on PBR meshes */
        [{x:220,y:100,r:200,c:'0,212,255',a:0.22},{x:820,y:130,r:160,c:'180,74,255',a:0.18},
         {x:520,y:400,r:220,c:'255,45,149',a:0.16},{x:80, y:360,r:130,c:'57,255,20', a:0.11}]
        .forEach(({x,y,r,c,a}) => {
          const gr = ex.createRadialGradient(x,y,0,x,y,r);
          gr.addColorStop(0,`rgba(${c},${a})`); gr.addColorStop(1,'rgba(0,0,0,0)');
          ex.save(); ex.globalCompositeOperation='lighter';
          ex.fillStyle=gr; ex.fillRect(0,0,1024,512); ex.restore();
        });
        const envTex = new THREE.CanvasTexture(ec);
        envTex.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = pmremGen.fromEquirectangular(envTex).texture;
        pmremGen.dispose(); envTex.dispose();
      } catch(e) { /* env map optional */ }
    })();

    /* Wide FOV = game-like dramatic depth */
    const camera = new THREE.PerspectiveCamera(72, innerWidth/innerHeight, 0.1, 3000);
    camera.position.set(0, 0, 130);

    /* ─── GAME-ENGINE LIGHTING ─── */
    scene.add(new THREE.AmbientLight(0x050520, 0.55));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.35);
    dirLight.position.set(30, 120, 80);
    scene.add(dirLight);

    /* Neon point lights — exactly like Unreal/Unity colored stage lights */
    [
      { color:0x00d4ff, int:5.0, dist:260, pos:[ 65,  55,  95] },
      { color:0xb44aff, int:4.0, dist:230, pos:[-65, -45,  80] },
      { color:0xff2d95, int:3.5, dist:210, pos:[  5, -75, 115] },
      { color:0x39ff14, int:2.5, dist:190, pos:[-85,  65,  65] },
    ].forEach(({ color, int, dist, pos }) => {
      const l = new THREE.PointLight(color, int, dist);
      l.position.set(...pos); scene.add(l);
    });

    /* ─── GLOW SPRITE TEXTURE ─── */
    const spriteTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32,32,0,32,32,32);
      g.addColorStop(0,   'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
      g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
      g.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
      return new THREE.CanvasTexture(c);
    })();

    /* ─── PBR MATERIAL HELPER (MeshStandardMaterial — full specular reflections) ─── */
    function neonPhong(color, specular, shininess, emissive) {
      /* Upgraded from Phong → PBR Standard. specular tint becomes neon emissive glow */
      return new THREE.MeshStandardMaterial({
        color,
        emissive:          new THREE.Color(specular || 0x001020).multiplyScalar(0.16),
        emissiveIntensity: 1.4,
        metalness:         0.88,
        roughness:         0.08,
        transparent:       true,
        opacity:           0.92,
      });
    }

    /* ─── HERO 3D OBJECTS (lit, game-quality) ─── */

    /* TorusKnot — the centrepiece: twisting gleaming knot */
    const torusKnot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(10, 3.1, 200, 20),
      neonPhong(0x001133, 0x00d4ff, 260, 0x000d22)
    );
    torusKnot.position.set(65, 15, -55);
    torusKnot._rx = 0.0055; torusKnot._ry = 0.0085;
    scene.add(torusKnot);

    /* Icosahedron — smooth crystal sphere */
    const crystal = new THREE.Mesh(
      new THREE.IcosahedronGeometry(16, 2),
      neonPhong(0x110011, 0xb44aff, 280, 0x080011)
    );
    crystal.position.set(-72, 22, -48);
    crystal._rx = 0.0038; crystal._ry = -0.0072;
    scene.add(crystal);

    /* Hexagonal Pillar — crystalline tower */
    const hexPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 30, 6, 1),
      neonPhong(0x110022, 0xff2d95, 190, 0x0a0011)
    );
    hexPillar.position.set(12, 52, -38);
    hexPillar._rx = 0.0045; hexPillar._ry = 0.0028;
    scene.add(hexPillar);

    /* Octahedron — diamond gem */
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(13, 1),
      neonPhong(0x001100, 0x39ff14, 230, 0x000d00)
    );
    diamond.position.set(-22, -47, -30);
    diamond._rx = 0.0075; diamond._ry = 0.0048;
    scene.add(diamond);

    /* Dodecahedron — 12-faced gem */
    const dodeca = new THREE.Mesh(
      new THREE.DodecahedronGeometry(11, 0),
      neonPhong(0x000d22, 0x06b6d4, 210, 0x000810)
    );
    dodeca.position.set(-48, -32, -62);
    dodeca._rx = -0.0028; dodeca._ry = 0.0105;
    scene.add(dodeca);

    const heroes = [torusKnot, crystal, hexPillar, diamond, dodeca];

    /* ─── DEBRIS FIELD (small fragments spinning in the void) ─── */
    const debrisGeos = [
      new THREE.IcosahedronGeometry(2.4, 0),
      new THREE.TetrahedronGeometry(2.0, 0),
      new THREE.OctahedronGeometry(1.8, 0),
    ];
    const debris = [];
    for (let i = 0; i < 28; i++) {
      const g   = debrisGeos[i % 3];
      const col = [0x00d4ff, 0xb44aff, 0xff2d95, 0x39ff14, 0x06b6d4][i % 5];
      const d   = new THREE.Mesh(g, neonPhong(0x000510, col, 160));
      d.position.set((Math.random()-0.5)*210, (Math.random()-0.5)*160, (Math.random()-0.5)*90 - 25);
      d._rx = (Math.random()-0.5)*0.018; d._ry = (Math.random()-0.5)*0.018;
      d.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, 0);
      scene.add(d); debris.push(d);
    }

    /* ─── PARTICLE FIELD (1500 glow sprites) ─── */
    const COUNT = 1500;
    const pPos  = new Float32Array(COUNT * 3);
    const pCol  = new Float32Array(COUNT * 3);
    const pVel  = [];
    const threeColors = PALETTE.map(h => new THREE.Color(h));
    for (let i = 0; i < COUNT; i++) {
      pPos[i*3]   = (Math.random()-0.5) * 400;
      pPos[i*3+1] = (Math.random()-0.5) * 300;
      pPos[i*3+2] = (Math.random()-0.5) * 180 - 40;
      pVel.push({ x:(Math.random()-0.5)*0.018, y:(Math.random()-0.5)*0.014 });
      const c = threeColors[i % threeColors.length];
      pCol[i*3]=c.r; pCol[i*3+1]=c.g; pCol[i*3+2]=c.b;
    }
    const ptGeo = new THREE.BufferGeometry();
    ptGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    ptGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
    const ptMat = new THREE.PointsMaterial({
      map:spriteTex, vertexColors:true, transparent:true, opacity:0.44, size:2.6,
      sizeAttenuation:true, depthWrite:false, blending:THREE.AdditiveBlending,
    });
    const points = new THREE.Points(ptGeo, ptMat);
    scene.add(points);

    /* ─── GLTF MODEL + PBR (DamagedHelmet — real PBR textures: albedo, normal, AO, metallic) ─── */
    if (typeof THREE.GLTFLoader !== 'undefined') {
      const gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load(
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
        (gltf) => {
          const model = gltf.scene;
          model.position.set(0, 8, -32);
          model.scale.setScalar(22);
          model.rotation.set(0.2, Math.PI * 0.25, 0);
          model.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.envMapIntensity = 2.8;
              child.material.needsUpdate = true;
            }
          });
          model._rx = 0.0028; model._ry = 0.0058;
          scene.add(model);
          heroes.push(model);
        },
        undefined,
        () => { /* silently fall back to procedural geometry */ }
      );
    }

    /* ─── SCROLL STATE ─── */
    let scrollProgress = 0, targetCamZ = 130, currentCamZ = 130;
    let prevScroll = 0, scrollVel = 0;

    const mc = document.getElementById('mainContent');
    if (mc) {
      mc.addEventListener('scroll', () => {
        const sp = mc.scrollTop / Math.max(1, mc.scrollHeight - mc.clientHeight);
        scrollProgress = sp;
        scrollVel      = mc.scrollTop - prevScroll;
        prevScroll     = mc.scrollTop;
        /* Camera flies forward as user scrolls deeper — game fly-through */
        targetCamZ = 130 - sp * 280;
      }, { passive: true });
    }

    let t = 0, tmx = 0, tmy = 0;
    window.addEventListener('resize', () => {
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    });

    /* ─── RENDER LOOP ─── */
    (function loop() {
      requestAnimationFrame(loop);
      t += 0.008;

      /* Smooth camera Z fly-through */
      currentCamZ += (targetCamZ - currentCamZ) * 0.052;
      camera.position.z = currentCamZ;

      /* Cinematic Y drift on scroll */
      camera.position.y += (-scrollProgress * 20 - camera.position.y) * 0.038;

      /* Mouse tilt */
      tmx += ((M.rx-0.5)*0.42 - tmx) * 0.026;
      tmy += ((M.ry-0.5)*0.32 - tmy) * 0.026;
      camera.rotation.y = -tmx * 0.20;
      camera.rotation.x = -tmy * 0.14 - scrollProgress * 0.24;

      /* Hero objects rotate — scroll velocity adds extra spin */
      heroes.forEach(h => {
        h.rotation.x += h._rx + scrollVel * 0.00025;
        h.rotation.y += h._ry + scrollVel * 0.00018;
      });

      /* Debris field */
      debris.forEach(d => { d.rotation.x += d._rx; d.rotation.y += d._ry; });

      /* Particle drift */
      const arr = ptGeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        arr[i*3]   += pVel[i].x; arr[i*3+1] += pVel[i].y;
        if (arr[i*3]   >  200) arr[i*3]   = -200;
        if (arr[i*3]   < -200) arr[i*3]   =  200;
        if (arr[i*3+1] >  150) arr[i*3+1] = -150;
        if (arr[i*3+1] < -150) arr[i*3+1] =  150;
      }
      ptGeo.attributes.position.needsUpdate = true;

      /* WARP SPEED on fast scroll — particles surge + screen flash */
      const absV = Math.abs(scrollVel);
      if (absV > 1.5) ptMat.size = Math.min(6.5, 2.6 + absV * 0.22);
      else ptMat.size += (2.6 - ptMat.size) * 0.10;
      if (absV > 18 && !document.querySelector('.nx-warp-flash')) {
        const fl = mk('div','nx-warp-flash'); document.body.appendChild(fl);
        setTimeout(() => fl.remove(), 400);
      }
      scrollVel *= 0.82;

      renderer.render(scene, camera);
    })();
  }

  /* ══════════════════════════════════════════════════════════════
     3.  SPLITTING.JS  Character-level text reveals on titles
     ══════════════════════════════════════════════════════════════ */
  const SPLIT_SEL =
    '.page-title,.section-title,.hud-rank-title,.up-rank-title,' +
    '.welcome-title,.nexus-level-title,.hub-section-title';

  function applySplitText(scope) {
    if (!HAS_SPLIT || !HAS_GSAP) return;
    const root = scope || document;
    root.querySelectorAll(SPLIT_SEL).forEach(el => {
      if (el.dataset.nxSplit) return;
      el.dataset.nxSplit = '1';
      el.setAttribute('data-text', el.textContent.trim());
      el.classList.add('nx-glitch', 'nx-split-title');
      try {
        const res = Splitting({ target: el, by: 'chars' });
        if (!res || !res[0]) return;
        gsap.from(res[0].chars, {
          y: '100%', opacity: 0, rotateX: -90, scale: 0.8,
          transformOrigin: '0% 50%',
          stagger: { each: 0.028, from: 'start' },
          duration: 0.65, ease: 'back.out(2)',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      } catch(e) {}
    });
  }

  /* ══════════════════════════════════════════════════════════════
     4.  CUSTOM CURSOR  (dot + ring + canvas glow trail)
     ══════════════════════════════════════════════════════════════ */
  function initCursor() {
    if (IS_TOUCH) return;
    const dot   = mk('div', 'nx-cursor-dot');
    const ring  = mk('div', 'nx-cursor-ring');
    const trail = mk('canvas', 'nx-trail-canvas');
    trail.width = innerWidth; trail.height = innerHeight;
    document.body.append(trail, ring, dot);
    const ctx = trail.getContext('2d');
    window.addEventListener('resize', () => { trail.width=innerWidth; trail.height=innerHeight; });

    const TRAIL = [];
    let rx = M.x, ry = M.y;

    document.addEventListener('mousemove', e => {
      dot.style.left = e.clientX+'px'; dot.style.top = e.clientY+'px';
      TRAIL.push({ x:e.clientX, y:e.clientY, t:0 });
      if (TRAIL.length > 35) TRAIL.shift();
      const hot = document.elementFromPoint(e.clientX,e.clientY)
        ?.closest('a,button,[role=button],.nav-item,.btn,label,select');
      ring.classList.toggle('nx-ring-hover', !!hot);
      dot.classList.toggle('nx-dot-hover',   !!hot);
    });
    document.addEventListener('mousedown', () => {
      ring.classList.add('nx-ring-click'); dot.classList.add('nx-dot-click'); spawnBurst(M.x,M.y,6);
    });
    document.addEventListener('mouseup', () => {
      ring.classList.remove('nx-ring-click'); dot.classList.remove('nx-dot-click');
    });
    document.addEventListener('mouseleave', () => { dot.style.opacity='0'; ring.style.opacity='0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity='1'; ring.style.opacity='1'; });

    (function tick() {
      rx += (M.x-rx)*0.10; ry += (M.y-ry)*0.10;
      ring.style.left = rx+'px'; ring.style.top = ry+'px';
      ctx.clearRect(0,0,trail.width,trail.height);
      for (let i=TRAIL.length-1; i>=0; i--) {
        const p=TRAIL[i]; p.t++;
        const life = 1 - p.t/35;
        if (life<=0) { TRAIL.splice(i,1); continue; }
        const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,life*10);
        g.addColorStop(0,   'rgba(0,212,255,'+(life*0.5)+')');
        g.addColorStop(0.4, 'rgba(180,74,255,'+(life*0.2)+')');
        g.addColorStop(1,   'rgba(180,74,255,0)');
        ctx.beginPath(); ctx.arc(p.x,p.y,life*10,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill();
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ══════════════════════════════════════════════════════════════
     5.  PARTICLE BURST  (on clicks)
     ══════════════════════════════════════════════════════════════ */
  function spawnBurst(x, y, n) {
    for (let i=0; i<(n||6); i++) {
      const p  = mk('div','nx-particle');
      const a  = (i/(n||6))*Math.PI*2 + Math.random()*0.9;
      const d  = 22 + Math.random()*42;
      const s  = 2  + Math.random()*3.5;
      const c  = PALETTE[i % PALETTE.length];
      Object.assign(p.style, {
        left:x+'px', top:y+'px', width:s+'px', height:s+'px',
        background:c,
        '--px': Math.cos(a)*d+'px',
        '--py': Math.sin(a)*d+'px',
        boxShadow:'0 0 '+(s*3)+'px '+c+',0 0 '+(s*6)+'px '+c+'80',
      });
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }

  /* ══════════════════════════════════════════════════════════════
     6.  GSAP BOOT TIMELINE
     ══════════════════════════════════════════════════════════════ */
  function initBootTimeline() {
    if (!HAS_GSAP) return;
    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({ delay:0.4 });

    const brand = document.querySelector('.brand-text,.sidebar-brand .brand-text');
    if (brand && HAS_SPLIT) {
      brand.setAttribute('data-text', brand.textContent.trim());
      try {
        const res = Splitting({ target:brand, by:'chars' });
        if (res && res[0]) {
          tl.from(res[0].chars, { y:-30,opacity:0,rotateX:-90,scale:0.5,stagger:0.06,duration:0.6,ease:'back.out(2)' });
        }
      } catch(e) { tl.from(brand, { y:-20,opacity:0,duration:0.5,ease:'expo.out' }); }
    } else {
      tl.from('.sidebar-brand', { y:-20,opacity:0,duration:0.5,ease:'expo.out' });
    }

    tl.from('.nav-item',         { x:-36,opacity:0,duration:0.55,stagger:0.06,ease:'back.out(1.8)' }, '-=0.3')
      .from('#sidebarPlayerCard', { y:20,opacity:0,duration:0.5,ease:'power3.out' }, '-=0.25')
      .from('#pageContent',       { opacity:0,y:24,duration:0.65,ease:'expo.out' }, '-=0.2');
  }

  /* ══════════════════════════════════════════════════════════════
     7.  GSAP PAGE TRANSITIONS  (cinematic + progress bar)
     ══════════════════════════════════════════════════════════════ */
  let _busy = false;

  function initPageTransitions() {
    const pc = document.getElementById('pageContent');
    if (!pc) return;

    const bar  = mk('div','nx-topbar-progress'); bar.appendChild(mk('div','nx-topbar-glow')); document.body.appendChild(bar);
    const veil = mk('div','nx-page-veil'); document.body.appendChild(veil);

    window.addEventListener('hashchange', () => {
      if (_busy) return; _busy = true;
      gsap.set(bar, { width:'0%', opacity:1 });
      gsap.to(bar,  { width:'70%', duration:0.4, ease:'power1.out' });
      gsap.to(veil, { opacity:1, duration:0.1 });
      gsap.to(pc,   { opacity:0, y:-10, scale:0.99, duration:0.18, ease:'power2.in' });

      const obs = new MutationObserver(() => {
        obs.disconnect();
        gsap.to(bar,  { width:'100%', duration:0.15, ease:'power1.out', onComplete:() => gsap.to(bar,{opacity:0,duration:0.3,delay:0.1}) });
        gsap.to(veil, { opacity:0, duration:0.4, ease:'power2.out' });
        gsap.fromTo(pc,
          { opacity:0, y:18, scale:0.99 },
          { opacity:1, y:0,  scale:1, duration:0.6, ease:'expo.out',
            onComplete() {
              _busy = false;
              _reapplyAll(pc);
            }
          }
        );
      });
      obs.observe(pc, { childList:true });
    });
  }

  function _reapplyAll(scope) {
    applyScrollReveal(); apply3DScrollCards(); applyTilt(); applyMagnetic(); applyHolo();
    applyGlitchText(); applySplitText(scope);
    initCounters(); staggerGrids();
    initProblemRowEffects(); initProfileAnimations(); init3DScrollSections();
  }

  /* ══════════════════════════════════════════════════════════════
     8.  GSAP SCROLL REVEAL  (4 direction variants, depth-aware)
     ══════════════════════════════════════════════════════════════ */
  const CARD_SEL =
    '.stat-card,.hub-card,.achievement-card,.social-card,' +
    '.tutorial-card,.problem-row,.nexus-card,.forge-card,' +
    '.up-stat-card,.up-section-card,.contest-card,.skill-node,' +
    '.hub-module,.leaderboard-entry,.settings-section';

  const REVEALS = [
    { y:55, opacity:0, rotateX:18,  scale:0.88 },
    { x:-55, opacity:0, rotateY:-16, scale:0.90 },
    { x:55,  opacity:0, rotateY:16,  scale:0.90 },
    { y:40,  opacity:0, scale:0.82,  rotate:-3  },
  ];

  function applyScrollReveal() {
    if (!HAS_GSAP) return;
    document.querySelectorAll(CARD_SEL).forEach((el, i) => {
      if (el.dataset.gsapRev) return;
      el.dataset.gsapRev = '1';
      gsap.from(el, {
        ...REVEALS[i % REVEALS.length],
        duration:0.9, delay:(i%8)*0.05, ease:'expo.out', clearProps:'all',
        scrollTrigger: { trigger:el, start:'top 94%', once:true },
      });
    });
    ScrollTrigger.refresh();
  }

  /* ── NEW: 3D card reveals — scrub-tied, emerge from deep Z ── */
  function apply3DScrollCards() {
    if (!HAS_GSAP) return;
    document.querySelectorAll(CARD_SEL).forEach((el, i) => {
      if (el.dataset.nx3dCard) return;
      el.dataset.nx3dCard = '1';
      el.classList.add('nx-3d-entry');
      const dir = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(el,
        {
          z: -180 - (i % 5) * 30,
          rotateY: dir * 22,
          rotateX: -14,
          scale: 0.75,
          opacity: 0,
          transformPerspective: 900,
        },
        {
          z: 0, rotateY: 0, rotateX: 0, scale: 1, opacity: 1,
          clearProps: 'all',
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top 96%',
            end:   'top 35%',
            scrub: 1.2,
          },
        }
      );
    });
    ScrollTrigger.refresh();
  }

  /* ══════════════════════════════════════════════════════════════
     8b.  3D SCROLL SECTIONS
          Sections rotate in from 3D space as you scroll.
          Camera-like perspective shift — sections arrive from
          different 3D angles like flying environments.
     ══════════════════════════════════════════════════════════════ */
  function init3DScrollSections() {
    if (!HAS_GSAP) return;
    const SECTION_SEL =
      '.hub-section,.content-section,.page-section,' +
      '.problems-section,.profile-section,.leaderboard-section,' +
      '.hub-modules,.achievements-grid,.up-stats-grid';

    document.querySelectorAll(SECTION_SEL).forEach((sec, i) => {
      if (sec.dataset.nx3dSec) return;
      sec.dataset.nx3dSec = '1';
      const dir = i % 2 === 0 ? 1 : -1;
      gsap.fromTo(sec,
        {
          rotateY:   dir * 18,
          rotateX:   -10,
          z:         -250,
          scale:     0.82,
          opacity:   0,
          transformPerspective: 1100,
        },
        {
          rotateY: 0, rotateX: 0, z: 0, scale: 1, opacity: 1,
          clearProps: 'all',
          ease: 'none',
          scrollTrigger: {
            trigger: sec,
            start: 'top 95%',
            end:   'top 20%',
            scrub: 1.5,
          },
        }
      );
    });
    ScrollTrigger.refresh();
  }

  /* ══════════════════════════════════════════════════════════════
     9.  COUNTER ANIMATIONS  (snap to integer + elastic pop)
     ══════════════════════════════════════════════════════════════ */
  const CTR_SEL = '.up-stat-val,.hud-stat-val,.stat-number,.hud-v2-stat-num,.profile-hero-stat-val,.today-ring-val';

  function initCounters() {
    if (!HAS_GSAP) return;
    document.querySelectorAll(CTR_SEL).forEach(el => {
      if (el.dataset.nxCnt) return;
      const raw    = el.textContent.trim();
      const suffix = raw.replace(/[\d,.]+/g,'');
      const target = parseFloat(raw.replace(/[^0-9.]/g,''));
      if (isNaN(target) || target===0) return;
      el.dataset.nxCnt = '1';
      ScrollTrigger.create({
        trigger:el, start:'top 90%', once:true,
        onEnter: () => {
          const obj = { val:0 };
          gsap.to(obj, {
            val:target, duration:1.8, ease:'power2.out', snap:{ val:1 },
            onUpdate() { el.textContent = Math.round(obj.val).toLocaleString()+suffix; },
            onComplete() {
              el.textContent = target.toLocaleString()+suffix;
              gsap.fromTo(el, { scale:1.25,color:'#00d4ff' }, { scale:1,color:'',duration:0.6,ease:'elastic.out(1,0.5)' });
              const card = el.closest('.up-stat-card,.stat-card,.hud-v2-stat');
              if (card) card.classList.add('nx-apex-flash');
            },
          });
        },
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     10. GSAP MAGNETIC BUTTONS  (spring physics + ripple)
     ══════════════════════════════════════════════════════════════ */
  const MAG_SEL = '.btn-primary,.btn-submit,.btn-run,.gate-btn-primary,.ob-deploy,.ob-nav-next,.gate-btn';

  function applyMagnetic() {
    document.querySelectorAll(MAG_SEL).forEach(btn => {
      if (btn.dataset.nxMag) return;
      btn.dataset.nxMag = '1'; btn.classList.add('nx-ripple-host');
      if (HAS_GSAP) {
        btn.addEventListener('mousemove', e => {
          const r=btn.getBoundingClientRect(), dx=(e.clientX-r.left-r.width/2)*0.28, dy=(e.clientY-r.top-r.height/2)*0.28;
          gsap.to(btn, { x:dx,y:dy,duration:0.35,ease:'power2.out',overwrite:'auto' });
        });
        btn.addEventListener('mouseleave', () => gsap.to(btn, { x:0,y:0,duration:0.8,ease:'elastic.out(1,0.5)',overwrite:'auto' }));
        btn.addEventListener('mousedown',  () => gsap.to(btn, { scale:0.90,duration:0.1,ease:'power2.out' }));
        btn.addEventListener('mouseup',    () => gsap.to(btn, { scale:1,duration:0.55,ease:'elastic.out(1,0.5)' }));
      }
      btn.addEventListener('click', e => {
        const r=btn.getBoundingClientRect(), rip=mk('span','nx-ripple'), sz=Math.max(r.width,r.height)*2.8;
        rip.style.cssText='width:'+sz+'px;height:'+sz+'px;left:'+(e.clientX-r.left-sz/2)+'px;top:'+(e.clientY-r.top-sz/2)+'px';
        btn.appendChild(rip); spawnBurst(e.clientX,e.clientY,4); setTimeout(()=>rip.remove(),750);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     11. GSAP 3D TILT + HOLOGRAPHIC SHEEN
     ══════════════════════════════════════════════════════════════ */
  const TILT_SEL =
    '.stat-card,.hub-card,.achievement-card,.gate-panel,.settings-section,' +
    '.social-card,.leaderboard-entry,.tutorial-card,.forge-card,' +
    '.skill-node,.nexus-card,.hub-module,.contest-card,.up-stat-card,.up-section-card';

  let _lastTilt = null;

  function applyTilt() {
    document.querySelectorAll(TILT_SEL).forEach(card => {
      if (card.dataset.nxTilt) return;
      card.dataset.nxTilt = '1';
      card.classList.add('nx-tilt-card','nx-glow-hover');
      if (!card.querySelector('.nx-sheen')) card.appendChild(mk('div','nx-sheen'));
    });
  }

  document.addEventListener('mousemove', e => {
    if (IS_TOUCH) return;
    const card = e.target?.closest?.(TILT_SEL);
    if (_lastTilt && _lastTilt!==card) { _resetTilt(_lastTilt); _lastTilt=null; }
    if (!card) return;
    _lastTilt = card;
    const r=card.getBoundingClientRect(), nx=(e.clientX-r.left)/r.width, ny=(e.clientY-r.top)/r.height;
    const ry=(nx-0.5)*22, rx=-(ny-0.5)*16;
    if (HAS_GSAP) {
      gsap.to(card, { rotateX:rx,rotateY:ry,scale:1.03,z:12,transformPerspective:700,duration:0.07,ease:'none',overwrite:'auto' });
    } else {
      card.style.transform='perspective(700px) rotateX('+rx+'deg) rotateY('+ry+'deg) scale(1.02)';
    }
    const sh=card.querySelector('.nx-sheen');
    if (sh) { sh.style.setProperty('--sx',(nx*100).toFixed(1)+'%'); sh.style.setProperty('--sy',(ny*100).toFixed(1)+'%'); sh.style.opacity='1'; }
    card.style.setProperty('--hx',(nx*100).toFixed(1)+'%');
    card.style.setProperty('--hy',(ny*100).toFixed(1)+'%');
  });

  document.addEventListener('mouseleave', e => {
    if (e.target?.matches?.(TILT_SEL)) { _resetTilt(e.target); if(_lastTilt===e.target)_lastTilt=null; }
  }, true);

  function _resetTilt(card) {
    if (HAS_GSAP) {
      gsap.to(card, { rotateX:0,rotateY:0,scale:1,z:0,duration:0.7,ease:'elastic.out(1,0.7)',clearProps:'transform',overwrite:'auto' });
    } else { card.style.transform=''; }
    const sh=card.querySelector('.nx-sheen'); if(sh) sh.style.opacity='0';
  }

  /* ══════════════════════════════════════════════════════════════
     12. HOLOGRAPHIC FOIL
     ══════════════════════════════════════════════════════════════ */
  function applyHolo() {
    const sel = '.up-stat-card,.up-section-card,.achievement-card.unlocked,.gate-panel';
    document.querySelectorAll(sel).forEach(el => {
      if (el.dataset.nxHolo) return;
      el.dataset.nxHolo = '1'; el.classList.add('nx-holo');
      const hl = mk('div','nx-holo-layer'); el.appendChild(hl);
      el.addEventListener('mousemove', e => {
        const r=el.getBoundingClientRect();
        el.style.setProperty('--hx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
        el.style.setProperty('--hy',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     13. GLITCH TEXT
     ══════════════════════════════════════════════════════════════ */
  const GLITCH_SEL =
    '.page-title,.section-title,.hud-rank-title,.up-rank-title,' +
    '.sidebar-brand .brand-text,.welcome-title,.nexus-level-title';

  function applyGlitchText() {
    document.querySelectorAll(GLITCH_SEL).forEach(el => {
      if (el.dataset.nxGlitch) return;
      el.dataset.nxGlitch = '1';
      el.setAttribute('data-text', el.textContent.trim());
      el.classList.add('nx-glitch');
    });
  }

  /* ══════════════════════════════════════════════════════════════
     14. GSAP STAGGER GRIDS
     ══════════════════════════════════════════════════════════════ */
  function staggerGrids() {
    if (!HAS_GSAP) return;
    [
      ['.achievements-grid','.achievement-card'],
      ['.up-stats-grid','.up-stat-card'],
      ['.hub-modules','.hub-module'],
      ['.skills-grid','.skill-node'],
    ].forEach(([csel,isel]) => {
      document.querySelectorAll(csel).forEach(con => {
        if (con.dataset.nxStag) return; con.dataset.nxStag='1';
        const items=con.querySelectorAll(isel); if(!items.length) return;
        gsap.from(items, { scale:0.65,opacity:0,rotateX:22,rotateY:12,z:-80,y:20,
          transformPerspective:800, duration:0.65,stagger:0.065,ease:'back.out(2.2)',
          scrollTrigger:{ trigger:con,start:'top 90%',once:true } });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     15. PARALLAX  (orbs drift with mouse)
     ══════════════════════════════════════════════════════════════ */
  function initParallax() {
    if (IS_TOUCH) return;
    let p=false;
    document.addEventListener('mousemove', () => {
      if(p) return; p=true;
      requestAnimationFrame(() => {
        const rx=M.rx-0.5,ry=M.ry-0.5;
        document.querySelectorAll('.floating-orb').forEach((o,i) => {
          const d=((i%4)+1)*0.6; o.style.transform='translate3d('+(rx*32*d)+'px,'+(ry*24*d)+'px,0)';
        });
        p=false;
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     16. SPOTLIGHT GLOW
     ══════════════════════════════════════════════════════════════ */
  function initSpotlight() {
    if (IS_TOUCH) return;
    const mc=document.getElementById('mainContent'); if(!mc) return;
    const spot=mk('div','nx-spotlight'); mc.style.position='relative'; mc.appendChild(spot);
    let p=false;
    document.addEventListener('mousemove', e => {
      if(p) return; p=true;
      requestAnimationFrame(() => {
        const r=mc.getBoundingClientRect(); spot.style.left=(e.clientX-r.left)+'px'; spot.style.top=(e.clientY-r.top)+'px'; p=false;
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     17. NAV PARTICLE BURSTS
     ══════════════════════════════════════════════════════════════ */
  function initNavEffects() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', e => spawnBurst(e.clientX,e.clientY,4));
    });
  }

  /* ══════════════════════════════════════════════════════════════
     18. SIDEBAR GSAP
     ══════════════════════════════════════════════════════════════ */
  function initSidebarGSAP() {
    if (!HAS_GSAP) return;
    const xpFill=document.getElementById('sidebarXpFill');
    if (xpFill) { gsap.from(xpFill,{width:'0%',duration:1.6,ease:'power2.out',delay:1.4}); }
    const pc=document.getElementById('sidebarPlayerCard');
    if (pc) {
      pc.addEventListener('mouseenter',()=>gsap.to(pc,{x:6,boxShadow:'-6px 0 28px rgba(0,212,255,0.16) inset',duration:0.3,ease:'power2.out'}));
      pc.addEventListener('mouseleave',()=>gsap.to(pc,{x:0,boxShadow:'none',duration:0.55,ease:'elastic.out(1,0.5)'}));
    }
  }

  /* ══════════════════════════════════════════════════════════════
     19. PROFILE ANIMATIONS  (SVG ring + stat bars)
     ══════════════════════════════════════════════════════════════ */
  function initProfileAnimations() {
    if (!HAS_GSAP) return;
    const ring=document.querySelector('.up-xp-ring circle:last-child');
    if (ring && !ring.dataset.nxRing) {
      ring.dataset.nxRing='1';
      const da=ring.getAttribute('stroke-dasharray')||'0,339.3', fill=parseFloat(da);
      if (!isNaN(fill) && fill>0) {
        ring.setAttribute('stroke-dasharray','0,339.3');
        gsap.to(ring,{attr:{'stroke-dasharray':fill+',339.3'},duration:2,ease:'power2.out',delay:0.5});
      }
    }
    document.querySelectorAll('.up-stat-bar-fill,.up-rank-bar-fill').forEach(bar => {
      if (bar.dataset.gsapBar) return; bar.dataset.gsapBar='1';
      const tgt=bar.style.width||'0%'; bar.style.width='0%';
      gsap.to(bar,{width:tgt,duration:1.6,ease:'power2.out',scrollTrigger:{trigger:bar,start:'top 92%',once:true}});
    });
  }

  /* ══════════════════════════════════════════════════════════════
     20. PROBLEM ROW STAGGER
     ══════════════════════════════════════════════════════════════ */
  function initProblemRowEffects() {
    if (!HAS_GSAP) return;
    const list=document.querySelector('.problems-list,.problem-table,#problemsList');
    if (!list||list.dataset.nxProbFx) return; list.dataset.nxProbFx='1';
    const rows=[...list.querySelectorAll('.problem-row,tr')]; if(rows.length<2) return;
    gsap.from(rows,{x:-24,opacity:0,duration:0.38,stagger:0.022,ease:'power2.out'});
  }

  /* ══════════════════════════════════════════════════════════════
     21. AMBIENT  (grid background)
     ══════════════════════════════════════════════════════════════ */
  function initAmbient() {
    document.body.appendChild(mk('div','nx-grid-bg'));
    /* 3D perspective grid floor */
    if (!IS_TOUCH) document.body.appendChild(mk('div','nx-3d-floor'));
    /* Depth fog at scroll bottom */
    const mc = document.getElementById('mainContent');
    if (mc) mc.appendChild(mk('div','nx-depth-fog'));
    /* Add stagger delay CSS var to cards */
    document.querySelectorAll(
      '.stat-card,.hub-module,.achievement-card,.up-stat-card'
    ).forEach((el, i) => el.style.setProperty('--nx-i', i % 8));
  }

  /* ══════════════════════════════════════════════════════════════
     22. SPLINE  3D  VIEWER  EMBED
         Injects <spline-viewer> into the gate/login screen for an
         interactive 3D background. Requires @splinetool/viewer CDN.
     ══════════════════════════════════════════════════════════════ */
  function initSplineEmbed() {
    function tryEmbed() {
      const gate = document.getElementById('gateScreen');
      if (!gate || gate.querySelector('spline-viewer')) return;
      const sv = document.createElement('spline-viewer');
      sv.setAttribute('url', 'https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode');
      sv.setAttribute('loading-anim-type', 'none');
      Object.assign(sv.style, {
        position:'absolute', inset:'0', width:'100%', height:'100%',
        zIndex:'0', opacity:'0.42', pointerEvents:'none',
      });
      gate.style.position = 'relative';
      gate.style.overflow = 'hidden';
      gate.insertBefore(sv, gate.firstChild);
    }
    tryEmbed();
    window.addEventListener('hashchange', () => setTimeout(tryEmbed, 150));
    /* Also watch for gate screen becoming visible */
    document.addEventListener('click', () => setTimeout(tryEmbed, 200), { once: false, passive: true });
  }

  /* ══════════════════════════════════════════════════════════════
     23. CSS  PRE-RENDERED  3D  OVERLAYS
         Perspective-transformed rings and holographic orb that
         simulate baked 3D scene dressing without extra WebGL.
     ══════════════════════════════════════════════════════════════ */
  function init3DOverlays() {
    if (IS_TOUCH) return;
    ['nx-3d-ring nx-ring-a', 'nx-3d-ring nx-ring-b', 'nx-3d-ring nx-ring-c'].forEach(cls => {
      document.body.appendChild(mk('div', cls));
    });
    document.body.appendChild(mk('div', 'nx-3d-orb'));
    document.body.appendChild(mk('div', 'nx-holo-grid-plane'));
  }

  /* ══════════════════════════════════════════════════════════════
     24. MUTATION OBSERVER
     ══════════════════════════════════════════════════════════════ */
  let _mutTimer;
  function watchDOM() {
    const pc=document.getElementById('pageContent'); if(!pc) return;
    new MutationObserver(()=>{
      clearTimeout(_mutTimer);
      _mutTimer=setTimeout(()=>{
        applyScrollReveal(); apply3DScrollCards(); applyTilt(); applyMagnetic(); applyHolo();
        applyGlitchText(); applySplitText(pc); initCounters();
        staggerGrids(); initProblemRowEffects(); initProfileAnimations(); init3DScrollSections();
      },60);
    }).observe(pc,{childList:true,subtree:true});
  }

  /* ══════════════════════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════════════════════ */
  function boot() {
    initAmbient();
    init3DOverlays();
    initWebGL();
    initSplineEmbed();
    if (!IS_TOUCH) { initCursor(); initParallax(); initSpotlight(); }
    initLenis();
    initPageTransitions();
    initNavEffects();
    if (HAS_GSAP) { gsap.registerPlugin(ScrollTrigger); initBootTimeline(); initSidebarGSAP(); }

    setTimeout(() => {
      applyTilt(); applyMagnetic(); applyHolo(); applyGlitchText();
      applyScrollReveal(); apply3DScrollCards(); applySplitText(); initCounters();
      staggerGrids(); initProblemRowEffects(); initProfileAnimations(); init3DScrollSections();
    }, 1000);

    setInterval(initCounters, 4000);
    watchDOM();

    console.log(
      '%c[Nexora FX v4] Three.js GAME-GRADE · GSAP Scrub 3D · Scroll Fly-Through ✦ ONLINE',
      'color:#00d4ff;font-weight:700;font-family:monospace;font-size:13px;' +
      'text-shadow:0 0 10px #00d4ff,0 0 20px #b44aff,0 0 40px #ff2d95'
    );
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
