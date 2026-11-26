// Pratibimb anime player: our own WebGL2 renderer for the character built by engine/anime.py.
// Toon shading (two tones + soft rim), outlines (inverted hull), anime eyes drawn by the shader, hair shine
// band; skinning, head morphs (52 expression values) and eye gaze on the CPU. Transparent background.
//   const p = await AnimePlayer.load(canvas, 'character.json'); p.draw({ b: [...52], ypr: [y, p, r], pose: {...} })

const VS = `#version 300 es
in vec3 pos; in vec3 nrm;
uniform mat4 view, proj; uniform float outline;
out vec3 vN; out vec3 vW; out vec3 vV;
void main(){
  vec3 p = pos + nrm * outline;
  vec4 v = view * vec4(p, 1.0);
  vW = pos; vN = mat3(view) * nrm; vV = -v.xyz;
  gl_Position = proj * v;
}`

const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; in vec3 vV;
uniform vec3 base; uniform int kind; uniform float isOutline; uniform vec3 eyeC; uniform float eyeR; uniform vec3 eyeDir;
uniform vec3 iris; uniform mat4 view;
out vec4 col;
vec3 toon(vec3 c, vec3 n, vec3 v){
  vec3 L = normalize(mat3(view) * normalize(vec3(-0.45, 0.6, 0.75)));
  float d = dot(n, L);
  float lit = smoothstep(-0.05, 0.08, d);
  vec3 shade = c * mix(vec3(0.72, 0.58, 0.62), vec3(1.0), lit);
  float rim = pow(1.0 - max(dot(n, normalize(v)), 0.0), 3.0);
  shade += vec3(1.0, 0.95, 0.92) * rim * 0.18 * lit;
  return shade;
}
void main(){
  if (isOutline > 0.5) { col = vec4(base * 0.35, 1.0); return; }
  vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
  vec3 c = base;
  if (kind == 2) { // eye: sclera, iris with gradient, pupil, two highlights, upper shadow
    vec3 d = normalize(vW - eyeC);
    float a = acos(clamp(dot(d, eyeDir), -1.0, 1.0));
    float ri = 0.62, rp = 0.24;
    vec3 sclera = vec3(0.97, 0.96, 0.95);
    float t = a / ri;
    vec3 up = normalize(cross(cross(eyeDir, vec3(0,1,0)), eyeDir));
    float h = dot(d, -up);
    vec3 irisC = mix(iris * 1.35, iris * 0.55, smoothstep(-0.4, 0.5, h));
    irisC = mix(irisC, iris * 0.4, smoothstep(0.82, 1.0, t));
    c = t < 1.0 ? irisC : sclera;
    if (a < rp) c = vec3(0.05, 0.04, 0.06);
    vec3 side = normalize(cross(eyeDir, up));
    vec2 q = vec2(dot(d, side), dot(d, -up));
    if (length(q - vec2(-0.22, 0.22)) < 0.13) c = vec3(1.0);
    if (length(q - vec2(0.18, -0.2)) < 0.06) c = vec3(1.0);
    col = vec4(c, 1.0); return;
  }
  vec3 s = toon(c, n, vV);
  if (kind == 3) { // hair: the anime shine band
    vec3 vn = n;
    float band = smoothstep(0.55, 0.62, vn.y) * (1.0 - smoothstep(0.72, 0.8, vn.y));
    s += vec3(1.0) * band * 0.22;
  }
  col = vec4(s, 1.0);
}`

function mat4Mul(a, b) { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s } return o }
function perspective(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]) }
function lookAt(e, c, u) {
  const z = norm(sub(e, c)), x = norm(cross(u, z)), y = cross(z, x)
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1])
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
// 3x3 rotations as arrays of 9 (row-major)
const m3mul = (A, B) => { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return o }
const m3v = (A, v) => [A[0] * v[0] + A[1] * v[1] + A[2] * v[2], A[3] * v[0] + A[4] * v[1] + A[5] * v[2], A[6] * v[0] + A[7] * v[1] + A[8] * v[2]]
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]
function ypr(y, p, r) { // degrees; +yaw turns towards the character's left
  const [a, b, c] = [y, p, r].map((d) => (d * Math.PI) / 180)
  const Ry = [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)]
  const Rx = [1, 0, 0, 0, Math.cos(b), -Math.sin(b), 0, Math.sin(b), Math.cos(b)]
  const Rz = [Math.cos(c), -Math.sin(c), 0, Math.sin(c), Math.cos(c), 0, 0, 0, 1]
  return m3mul(Rz, m3mul(Ry, Rx))
}

const KIND = { skin: 0, cloth: 0, brows: 0, lashes: 0, mouth: 0, teeth: 0, eye: 2, hair: 3 }

export class AnimePlayer {
  static async load(canvas, url) {
    const doc = await (await fetch(url)).json()
    const bin = await (await fetch(url.replace(/\.json$/, '.bin'))).arrayBuffer()
    return new AnimePlayer(canvas, doc, bin)
  }

  constructor(canvas, doc, bin) {
    this.doc = doc
    const gl = (this.gl = canvas.getContext('webgl2', { premultipliedAlpha: false, alpha: true, preserveDrawingBuffer: true, antialias: true }))
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o }
    const pr = (this.prog = gl.createProgram())
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr))
    this.u = Object.fromEntries(['view', 'proj', 'outline', 'base', 'kind', 'isOutline', 'eyeC', 'eyeR', 'eyeDir', 'iris'].map((n) => [n, gl.getUniformLocation(pr, n)]))
    const arr = (a, T) => (a.type === 'u32' ? new Uint32Array(bin, a.offset, a.count) : new Float32Array(bin, a.offset, a.count))
    const col = doc.colours
    const matColour = { skin: col.skin, brows: col.brows.map((x) => x * 0.8), lashes: [0.08, 0.06, 0.07], mouth: [0.35, 0.12, 0.14], teeth: [0.98, 0.97, 0.95], eye: [1, 1, 1], hair: col.hair }
    this.meshes = doc.meshes.map((m) => {
      const pos = arr(m.pos), idx = arr(m.idx)
      const o = { m, rest: Float32Array.from(pos), cur: new Float32Array(pos.length), nrm: new Float32Array(pos.length), idx, colour: m.colour || matColour[m.material] || [0.8, 0.8, 0.8] }
      if (m.morphs) o.morphs = arr(m.morphs)
      if (m.joints) { o.joints = arr(m.joints); o.weights = arr(m.weights) }
      o.vbo = gl.createBuffer(); o.nbo = gl.createBuffer(); o.ibo = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)
      return o
    })
    const sk = doc.skeleton
    this.sk = sk
    this.ji = Object.fromEntries(sk.names.map((n, i) => [n, i]))
    this.nb = doc.morphNames.length
  }

  // world rotations / positions of every joint for a pose {joint: rotation 3x3 (9 numbers)}
  fk(pose) {
    const { names, parents, rest } = this.sk
    const R = [], P = []
    names.forEach((n, i) => {
      const L = pose[n] || I3
      if (parents[i] < 0) { R.push(L); P.push(rest[i]) } else {
        const pi = parents[i]
        R.push(m3mul(R[pi], L))
        const d = m3v(R[pi], sub(rest[i], rest[pi]))
        P.push([P[pi][0] + d[0], P[pi][1] + d[1], P[pi][2] + d[2]])
      }
    })
    return { R, P }
  }

  draw(frame = {}) {
    const gl = this.gl, W = gl.canvas.width, H = gl.canvas.height
    const b = frame.b || new Array(this.nb).fill(0)
    const headTurn = frame.ypr ? ypr(...frame.ypr) : I3
    const pose = Object.assign({}, frame.pose || {})
    // the head turn is shared by neck (40%) and head (60%)
    if (frame.ypr) { pose.neck = m3mul(pose.neck || I3, ypr(frame.ypr[0] * 0.4, frame.ypr[1] * 0.4, frame.ypr[2] * 0.4)); pose.head = m3mul(pose.head || I3, ypr(frame.ypr[0] * 0.6, frame.ypr[1] * 0.6, frame.ypr[2] * 0.6)) }
    const { R, P } = this.fk(pose)
    const rest = this.sk.rest
    const hj = this.ji[this.doc.headJoint]
    const names = this.doc.morphNames
    const look = (k) => b[names.indexOf(k)] || 0
    for (const o of this.meshes) {
      const m = o.m, v = o.cur, r = o.rest, n = r.length / 3
      v.set(r)
      if (o.morphs) for (let k = 0; k < this.nb; k++) { const w = b[k]; if (Math.abs(w) < 1e-3) continue; const off = k * r.length; for (let i = 0; i < r.length; i++) v[i] += w * o.morphs[off + i] }
      if (m.material === 'eye') { // gaze: turn the eye about its centre
        const c = m.centre
        const gx = (look('eyeLookOutLeft') - look('eyeLookInLeft')) * (m.name === 'eyeL' ? 1 : -1) * 0.35
        const gy = (look('eyeLookUpLeft') - look('eyeLookDownLeft')) * 0.3
        const G = ypr(gx * 57.3, -gy * 57.3, 0)
        for (let i = 0; i < n; i++) { const q = m3v(G, [v[3 * i] - c[0], v[3 * i + 1] - c[1], v[3 * i + 2] - c[2]]); v[3 * i] = q[0] + c[0]; v[3 * i + 1] = q[1] + c[1]; v[3 * i + 2] = q[2] + c[2] }
        o.eyeDir = m3v(G, [0, 0, 1])
      }
      if (m.bone) { // rigid with a bone (the head and everything on it)
        const j = this.ji[m.bone], Rj = R[j], pj = P[j], rj = rest[j]
        for (let i = 0; i < n; i++) { const q = m3v(Rj, [v[3 * i] - rj[0], v[3 * i + 1] - rj[1], v[3 * i + 2] - rj[2]]); v[3 * i] = q[0] + pj[0]; v[3 * i + 1] = q[1] + pj[1]; v[3 * i + 2] = q[2] + pj[2] }
        if (o.eyeDir) { o.eyeDirW = m3v(Rj, o.eyeDir); const c = m.centre; const q = m3v(Rj, [c[0] - rj[0], c[1] - rj[1], c[2] - rj[2]]); o.eyeCW = [q[0] + pj[0], q[1] + pj[1], q[2] + pj[2]] }
      } else if (o.joints) { // skinned: two bones per vertex
        for (let i = 0; i < n; i++) {
          let x = 0, y = 0, z = 0
          for (let c = 0; c < 2; c++) {
            const w = o.weights[2 * i + c]; if (!w) continue
            const j = o.joints[2 * i + c], rj = rest[j], q = m3v(R[j], [r[3 * i] - rj[0], r[3 * i + 1] - rj[1], r[3 * i + 2] - rj[2]])
            x += w * (q[0] + P[j][0]); y += w * (q[1] + P[j][1]); z += w * (q[2] + P[j][2])
          }
          v[3 * i] = x; v[3 * i + 1] = y; v[3 * i + 2] = z
        }
      }
      // normals
      const N = o.nrm; N.fill(0); const I = o.idx
      for (let t = 0; t < I.length; t += 3) {
        const a = 3 * I[t], bb = 3 * I[t + 1], c = 3 * I[t + 2]
        const e1 = [v[bb] - v[a], v[bb + 1] - v[a + 1], v[bb + 2] - v[a + 2]], e2 = [v[c] - v[a], v[c + 1] - v[a + 1], v[c + 2] - v[a + 2]]
        const fn = cross(e1, e2)
        for (const k of [a, bb, c]) { N[k] += fn[0]; N[k + 1] += fn[1]; N[k + 2] += fn[2] }
      }
      for (let i = 0; i < n; i++) { const l = Math.hypot(N[3 * i], N[3 * i + 1], N[3 * i + 2]) || 1; N[3 * i] /= l; N[3 * i + 1] /= l; N[3 * i + 2] /= l }
    }
    // camera: waist-up, facing the student
    const head = P[hj]
    const cam = frame.camera || {}
    const target = [0, head[1] + (cam.y ?? -0.17), 0]
    const eye = [target[0] + (cam.x || 0), target[1] + 0.03, 1.55]
    const view = lookAt(eye, target, [0, 1, 0]), proj = perspective((cam.fov || 26) * Math.PI / 180, W / H, 0.05, 20)
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST); gl.useProgram(this.prog)
    gl.uniformMatrix4fv(this.u.view, false, view); gl.uniformMatrix4fv(this.u.proj, false, proj)
    gl.uniform3fv(this.u.iris, this.doc.colours.iris)
    const posLoc = gl.getAttribLocation(this.prog, 'pos'), nLoc = gl.getAttribLocation(this.prog, 'nrm')
    for (const pass of ['outline', 'main']) {
      gl.enable(gl.CULL_FACE); gl.cullFace(pass === 'outline' ? gl.FRONT : gl.BACK)
      for (const o of this.meshes) {
        const mat = o.m.material
        if (pass === 'outline' && ['eye', 'lashes', 'brows', 'mouth', 'teeth'].includes(mat)) continue
        if (pass === 'main' && ['lashes', 'brows', 'teeth', 'hair'].includes(mat)) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE)
        gl.bindBuffer(gl.ARRAY_BUFFER, o.vbo); gl.bufferData(gl.ARRAY_BUFFER, o.cur, gl.DYNAMIC_DRAW)
        gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0)
        gl.bindBuffer(gl.ARRAY_BUFFER, o.nbo); gl.bufferData(gl.ARRAY_BUFFER, o.nrm, gl.DYNAMIC_DRAW)
        gl.enableVertexAttribArray(nLoc); gl.vertexAttribPointer(nLoc, 3, gl.FLOAT, false, 0, 0)
        gl.uniform1f(this.u.outline, pass === 'outline' ? (mat === 'hair' ? 0.0016 : 0.0012) : 0)
        gl.uniform1f(this.u.isOutline, pass === 'outline' ? 1 : 0)
        gl.uniform3fv(this.u.base, o.colour)
        gl.uniform1i(this.u.kind, KIND[mat] ?? 0)
        if (mat === 'eye') { gl.uniform3fv(this.u.eyeC, o.eyeCW); gl.uniform3fv(this.u.eyeDir, o.eyeDirW); gl.uniform1f(this.u.eyeR, o.m.radius) }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.ibo)
        gl.drawElements(gl.TRIANGLES, o.idx.length, gl.UNSIGNED_INT, 0)
      }
    }
  }
}
