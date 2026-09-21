/* ═══════════════════════════════════════════════════════════════════════════
   ASCIIText — React Bits component (ported from a CodePen by Juan Fuentes),
   adapted to framework-free vanilla JS. Requires global `THREE`.
   Renders text onto a wavy 3D plane, then converts the WebGL frame to ASCII.

   API:  NexoraASCII.mount(containerEl, { text, asciiFontSize, ... }) -> {dispose}
         NexoraASCII.autoMount()   // mounts on every `.ascii-wordmark`
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  if (typeof THREE === "undefined") {
    window.NexoraASCII = { mount() { return { dispose() {} }; }, autoMount() {} };
    return;
  }

  const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float mouse;
uniform float uEnableWaves;
void main() {
  vUv = uv;
  float time = uTime * 5.;
  float waveFactor = uEnableWaves;
  vec3 transformed = position;
  transformed.x += sin(time + position.y) * 0.5 * waveFactor;
  transformed.y += cos(time + position.z) * 0.15 * waveFactor;
  transformed.z += sin(time + position.x) * waveFactor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}`;

  const fragmentShader = `
varying vec2 vUv;
uniform float mouse;
uniform float uTime;
uniform sampler2D uTexture;
void main() {
  float time = uTime;
  vec2 pos = vUv;
  float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;
  float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;
  float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;
  float a = texture2D(uTexture, pos).a;
  gl_FragColor = vec4(r, g, b, a);
}`;

  Math.map = function (n, a, b, c, d) {
    return ((n - a) / (b - a)) * (d - c) + c;
  };
  const PX_RATIO = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  class AsciiFilter {
    constructor(renderer, { fontSize, fontFamily, charset, invert } = {}) {
      this.renderer = renderer;
      this.domElement = document.createElement("div");
      Object.assign(this.domElement.style, { position: "absolute", top: "0", left: "0", width: "100%", height: "100%" });
      this.pre = document.createElement("pre");
      this.domElement.appendChild(this.pre);
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      this.domElement.appendChild(this.canvas);
      this.deg = 0;
      this.invert = invert ?? true;
      this.fontSize = fontSize ?? 12;
      this.fontFamily = fontFamily ?? "'Courier New', monospace";
      this.charset = charset ?? " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
      this.context.imageSmoothingEnabled = false;
      this.onMouseMove = this.onMouseMove.bind(this);
      document.addEventListener("mousemove", this.onMouseMove);
    }
    setSize(w, h) {
      this.width = w; this.height = h;
      this.renderer.setSize(w, h);
      this.reset();
      this.center = { x: w / 2, y: h / 2 };
      this.mouse = { x: this.center.x, y: this.center.y };
    }
    reset() {
      this.context.font = `${this.fontSize}px ${this.fontFamily}`;
      const cw = this.context.measureText("A").width;
      this.cols = Math.floor(this.width / (this.fontSize * (cw / this.fontSize)));
      this.rows = Math.floor(this.height / this.fontSize);
      this.canvas.width = this.cols; this.canvas.height = this.rows;
      Object.assign(this.pre.style, {
        fontFamily: this.fontFamily, fontSize: `${this.fontSize}px`, margin: "0",
        padding: "0", lineHeight: "1em", position: "absolute", left: "0", top: "0",
        zIndex: "9", backgroundAttachment: "fixed", mixBlendMode: "difference",
      });
    }
    render(scene, camera) {
      this.renderer.render(scene, camera);
      const w = this.canvas.width, h = this.canvas.height;
      this.context.clearRect(0, 0, w, h);
      if (this.context && w && h) this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
      this.asciify(this.context, w, h);
      this.hue();
    }
    onMouseMove(e) { this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO }; }
    get dx() { return this.mouse.x - this.center.x; }
    get dy() { return this.mouse.y - this.center.y; }
    hue() {
      const deg = (Math.atan2(this.dy, this.dx) * 180) / Math.PI;
      this.deg += (deg - this.deg) * 0.075;
      this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
    }
    asciify(ctx, w, h) {
      if (!w || !h) return;
      const d = ctx.getImageData(0, 0, w, h).data;
      let str = "";
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = x * 4 + y * 4 * w;
          const [r, g, b, a] = [d[i], d[i + 1], d[i + 2], d[i + 3]];
          if (a === 0) { str += " "; continue; }
          const gray = (0.3 * r + 0.6 * g + 0.1 * b) / 255;
          let idx = Math.floor((1 - gray) * (this.charset.length - 1));
          if (this.invert) idx = this.charset.length - idx - 1;
          str += this.charset[idx];
        }
        str += "\n";
      }
      this.pre.innerHTML = str;
    }
    dispose() { document.removeEventListener("mousemove", this.onMouseMove); }
  }

  class CanvasTxt {
    constructor(txt, { fontSize = 200, fontFamily = "Arial", color = "#fdf9f3" } = {}) {
      this.canvas = document.createElement("canvas");
      this.context = this.canvas.getContext("2d");
      this.txt = txt; this.fontSize = fontSize; this.fontFamily = fontFamily; this.color = color;
      this.font = `600 ${this.fontSize}px ${this.fontFamily}`;
    }
    resize() {
      this.context.font = this.font;
      const m = this.context.measureText(this.txt);
      this.canvas.width = Math.ceil(m.width) + 20;
      this.canvas.height = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 20;
    }
    render() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.context.fillStyle = this.color;
      this.context.font = this.font;
      const m = this.context.measureText(this.txt);
      this.context.fillText(this.txt, 10, 10 + m.actualBoundingBoxAscent);
    }
    get width() { return this.canvas.width; }
    get height() { return this.canvas.height; }
    get texture() { return this.canvas; }
  }

  class CanvAscii {
    constructor({ text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves }, container, w, h) {
      this.textString = text; this.asciiFontSize = asciiFontSize; this.textFontSize = textFontSize;
      this.textColor = textColor; this.planeBaseHeight = planeBaseHeight; this.container = container;
      this.width = w; this.height = h; this.enableWaves = enableWaves;
      this.camera = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
      this.camera.position.z = 30;
      this.scene = new THREE.Scene();
      this.mouse = { x: w / 2, y: h / 2 };
      this.onMouseMove = this.onMouseMove.bind(this);
    }
    async init() {
      try { await document.fonts.load('600 200px "IBM Plex Mono"'); await document.fonts.load('500 12px "IBM Plex Mono"'); } catch (e) {}
      await document.fonts.ready;
      this.setMesh(); this.setRenderer();
    }
    setMesh() {
      this.textCanvas = new CanvasTxt(this.textString, { fontSize: this.textFontSize, fontFamily: "IBM Plex Mono", color: this.textColor });
      this.textCanvas.resize(); this.textCanvas.render();
      this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
      this.texture.minFilter = THREE.NearestFilter;
      const aspect = this.textCanvas.width / this.textCanvas.height;
      const planeH = this.planeBaseHeight, planeW = planeH * aspect;
      this.geometry = new THREE.PlaneGeometry(planeW, planeH, 36, 36);
      this.material = new THREE.ShaderMaterial({
        vertexShader, fragmentShader, transparent: true,
        uniforms: { uTime: { value: 0 }, mouse: { value: 1.0 }, uTexture: { value: this.texture }, uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 } },
      });
      this.mesh = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.mesh);
    }
    setRenderer() {
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);
      this.filter = new AsciiFilter(this.renderer, { fontFamily: "IBM Plex Mono", fontSize: this.asciiFontSize, invert: true });
      this.container.appendChild(this.filter.domElement);
      this.setSize(this.width, this.height);
      this.container.addEventListener("mousemove", this.onMouseMove);
      this.container.addEventListener("touchmove", this.onMouseMove);
    }
    setSize(w, h) {
      this.width = w; this.height = h;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.filter.setSize(w, h); this.center = { x: w / 2, y: h / 2 };
    }
    load() { this.animate(); }
    onMouseMove(evt) {
      const e = evt.touches ? evt.touches[0] : evt;
      const b = this.container.getBoundingClientRect();
      this.mouse = { x: e.clientX - b.left, y: e.clientY - b.top };
    }
    animate() {
      const f = () => { this.animationFrameId = requestAnimationFrame(f); this.render(); };
      f();
    }
    render() {
      const t = new Date().getTime() * 0.001;
      this.textCanvas.render(); this.texture.needsUpdate = true;
      this.mesh.material.uniforms.uTime.value = Math.sin(t);
      this.updateRotation(); this.filter.render(this.scene, this.camera);
    }
    updateRotation() {
      const x = Math.map(this.mouse.y, 0, this.height, 0.5, -0.5);
      const y = Math.map(this.mouse.x, 0, this.width, -0.5, 0.5);
      this.mesh.rotation.x += (x - this.mesh.rotation.x) * 0.05;
      this.mesh.rotation.y += (y - this.mesh.rotation.y) * 0.05;
    }
    dispose() {
      cancelAnimationFrame(this.animationFrameId);
      if (this.filter) { this.filter.dispose(); if (this.filter.domElement.parentNode) this.container.removeChild(this.filter.domElement); }
      this.container.removeEventListener("mousemove", this.onMouseMove);
      this.container.removeEventListener("touchmove", this.onMouseMove);
      try { this.scene.clear(); this.renderer.dispose(); this.renderer.forceContextLoss(); } catch (e) {}
    }
  }

  // Inject the required CSS once (font + warm gradient pre)
  function injectStyle() {
    if (document.getElementById("nexora-ascii-style")) return;
    const s = document.createElement("style");
    s.id = "nexora-ascii-style";
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&display=swap');
      .ascii-wordmark { position:relative; display:block; width:min(640px,82vw); height:210px; margin:0 auto; }
      /* When ASCII actually renders, hide the original (fallback) glitch text. */
      .ascii-wordmark.ascii-active { color: transparent !important; text-shadow: none !important; -webkit-text-stroke: 0 !important; }
      .ascii-wordmark.ascii-active::before,
      .ascii-wordmark.ascii-active::after { opacity: 0 !important; display: none !important; }
      .ascii-text-container { position:absolute; inset:0; width:100%; height:100%; }
      .ascii-text-container canvas { position:absolute; left:0; top:0; width:100%; height:100%; image-rendering:pixelated; }
      .ascii-text-container pre {
        margin:0; user-select:none; padding:0; line-height:1em; text-align:left;
        position:absolute; left:0; top:0;
        background-image: radial-gradient(circle, #ff6188 0%, #fc9867 50%, #ffd866 100%);
        background-attachment: fixed; -webkit-text-fill-color: transparent;
        -webkit-background-clip: text; background-clip: text; z-index:9; mix-blend-mode: difference;
      }`;
    document.head.appendChild(s);
  }

  const NexoraASCII = {
    mount(host, opts = {}) {
      injectStyle();
      const cfg = Object.assign({ text: "NEXORA", asciiFontSize: 8, textFontSize: 200, textColor: "#fdf9f3", planeBaseHeight: 8, enableWaves: true }, opts);
      const container = document.createElement("div");
      container.className = "ascii-text-container";
      host.appendChild(container);
      let instance = null, disposed = false;
      const start = (w, h) => {
        if (disposed || w <= 0 || h <= 0) return;
        instance = new CanvAscii(cfg, container, w, h);
        instance.init().then(() => { if (!disposed) instance.load(); });
      };
      const r = host.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) start(r.width, r.height);
      else {
        const io = new IntersectionObserver((es) => {
          const en = es[0];
          if (en.isIntersecting && en.boundingClientRect.width > 0) {
            io.disconnect();
            start(en.boundingClientRect.width, en.boundingClientRect.height);
          }
        }, { threshold: 0.1 });
        io.observe(host);
      }
      return { dispose() { disposed = true; if (instance) instance.dispose(); container.remove(); } };
    },
    autoMount() {
      document.querySelectorAll(".ascii-wordmark:not([data-ascii-mounted])").forEach((el) => {
        el.dataset.asciiMounted = "1";
        const text = (el.getAttribute("data-text") || el.textContent || "NEXORA").trim();
        // Overlay the ASCII canvas ON TOP of the existing (fallback) wordmark.
        // Only hide the fallback once ASCII has actually drawn — so if WebGL is
        // unavailable the brand text stays visible instead of vanishing.
        el.style.position = "relative";
        const handle = NexoraASCII.mount(el, { text, asciiFontSize: 8, enableWaves: true });
        el._asciiHandle = handle;
        const container = el.querySelector(".ascii-text-container");
        // Poll briefly: hide the fallback the moment the ASCII canvas draws (no
        // overlap); if it never draws (no WebGL) drop the overlay, keep fallback.
        let tries = 0;
        const poll = setInterval(() => {
          tries++;
          if (container && container.querySelector("canvas")) {
            el.classList.add("ascii-active");
            clearInterval(poll);
          } else if (tries >= 16) {
            handle.dispose();
            clearInterval(poll);
          }
        }, 180);
      });
    },
  };

  window.NexoraASCII = NexoraASCII;
})();
