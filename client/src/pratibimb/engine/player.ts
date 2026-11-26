/*
  The Pratibimb player: one person's model on a canvas, alive and talking.

  - Loads a VRM 1.0 model (three-vrm, MIT) and dresses it in a look (look.ts).
  - Idle life: breathing, a small weight shift, blinks every few seconds, small eye darts, the head
    following the viewer (or the board, or the pointer), arms resting naturally.
  - States: idle, listening (slight tilt and nods at pauses), thinking (eyes up and aside), speaking.
  - speak(): plays the voice and drives the face from the lip-sync slot (lipsync.ts): curves when the
    server sent them, otherwise the voice's sound timings; prosody from the audio itself.
  - Gestures: wave, namaste, present (an open hand towards the board), point, nod.
  - renderAt(t): draws any moment exactly (tests and filming).
  - Respects reduced motion (no sway, gestures shortened), pauses when hidden, transparent background so
    it sits on any theme.
*/
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, type VRM, type VRMHumanBoneName } from '@pixiv/three-vrm'
import { applyLook, type Look } from './look'
import { analyseVoice, speakingFace, type Curves, type Prosody, type Timing } from './lipsync'

export type State = 'idle' | 'listening' | 'thinking' | 'speaking'
export type Gesture = 'wave' | 'namaste' | 'present' | 'point' | 'nod'
export type Framing = 'portrait' | 'upper' | 'full'

export interface Clip {
  audio: AudioBuffer
  curves?: Curves | null
  timing?: Timing | null
  prosody?: Prosody | null
}

type Pose = Partial<Record<VRMHumanBoneName, [number, number, number]>>

/** Arms resting by the sides (the model's rest pose is a T-pose). */
const REST: Pose = {
  leftUpperArm: [0, 0, -1.22], rightUpperArm: [0, 0, 1.22],
  leftLowerArm: [0, -0.15, -0.12], rightLowerArm: [0, 0.15, 0.12],
  leftHand: [0, 0, -0.08], rightHand: [0, 0, 0.08],
}
/** Gesture poses (normalized humanoid bones; checked by rendering). */
const GESTURES: Record<Exclude<Gesture, 'nod'>, { pose: Pose; seconds: number }> = {
  wave: { pose: { rightUpperArm: [0, 0, 0.55], rightLowerArm: [0, 0, -1.7] }, seconds: 1.8 },
  namaste: {
    pose: { rightUpperArm: [0, 0.7, 1.1], rightLowerArm: [0, 2.0, 0], leftUpperArm: [0, -0.7, -1.1], leftLowerArm: [0, -2.0, 0], rightHand: [0, 0, -0.3], leftHand: [0, 0, 0.3] },
    seconds: 1.8,
  },
  present: { pose: { rightUpperArm: [0, 0.45, 0.15], rightLowerArm: [0, 0.35, 0], rightHand: [0, 0, -0.25] }, seconds: 2.4 },
  point: { pose: { rightUpperArm: [0, 0.3, 0.05], rightLowerArm: [0, 0.1, 0], rightHand: [0, 0, -0.1] }, seconds: 2 },
}

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
const smooth = (x: number) => {
  x = clamp(x)
  return x * x * (3 - 2 * x)
}

export class Player {
  readonly canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(22, 1, 0.05, 50)
  private vrm: VRM | null = null
  private faceMeshes: THREE.Mesh[] = []
  private look: Look
  private framing: Framing = 'upper'
  private state: State = 'idle'
  private stateSince = 0
  private gestures: { g: Gesture; start: number; seconds: number }[] = []
  private target = new THREE.Object3D()
  private gaze: 'viewer' | 'board' | 'pointer' = 'viewer'
  private pointer = new THREE.Vector2()
  private clip: (Clip & { start: number; source: AudioBufferSourceNode | null; done: () => void }) | null = null
  private audioCtx: AudioContext | null = null
  private raf = 0
  private clock = 0
  private last = 0
  private reduced = false
  private blinks: number[] = []
  private seed = 7
  private resize: ResizeObserver | null = null
  onState?: (s: State) => void

  constructor(canvas: HTMLCanvasElement, opts: { look?: Look; framing?: Framing } = {}) {
    this.canvas = canvas
    this.look = opts.look ?? 'painted'
    this.framing = opts.framing ?? 'upper'
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false })
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene.add(new THREE.HemisphereLight(0xfff7ee, 0xb9a99a, 1.1))
    const key = new THREE.DirectionalLight(0xfff0e0, 2.3)
    key.position.set(-1.2, 2, 2.2)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0xffe6d0, 1.1)
    rim.position.set(1.5, 1.6, -1.8)
    this.scene.add(rim)
    this.scene.add(this.target)
    this.reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    this.resize = new ResizeObserver(() => this.fit())
    this.resize.observe(canvas)
  }

  async load(url: string): Promise<void> {
    const loader = new GLTFLoader()
    loader.register((p) => new VRMLoaderPlugin(p))
    const gltf = await loader.loadAsync(url)
    const vrm = gltf.userData.vrm as VRM
    this.vrm?.scene.removeFromParent()
    this.vrm = vrm
    this.scene.add(vrm.scene)
    this.faceMeshes = applyLook(vrm.scene, this.look)
    if (vrm.lookAt) vrm.lookAt.target = this.target
    this.fit()
  }

  setFraming(f: Framing) {
    this.framing = f
    this.fit()
  }

  setState(s: State) {
    if (s === this.state) return
    this.state = s
    this.stateSince = this.clock
    this.onState?.(s)
  }

  setGaze(g: 'viewer' | 'board' | 'pointer') {
    this.gaze = g
  }

  /** Pointer position in the canvas, -1..1 (for gaze 'pointer'). */
  setPointer(x: number, y: number) {
    this.pointer.set(x, y)
  }

  gesture(g: Gesture) {
    const seconds = g === 'nod' ? 0.6 : GESTURES[g].seconds * (this.reduced ? 0.6 : 1)
    this.gestures.push({ g, start: this.clock, seconds })
  }

  /** Play a voice clip with its face; resolves when it ends (or is stopped). */
  speak(clip: Clip): Promise<void> {
    this.stop()
    this.audioCtx ??= new AudioContext()
    const ctx = this.audioCtx
    void ctx.resume()
    const prosody = clip.prosody ?? analyseVoice(clip.audio.getChannelData(0), clip.audio.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = clip.audio
    source.connect(ctx.destination)
    return new Promise((resolve) => {
      const done = () => {
        if (this.clip?.source === source) this.clip = null
        this.setState('idle')
        resolve()
      }
      source.onended = done
      this.clip = { ...clip, prosody, start: ctx.currentTime + 0.05, source, done }
      source.start(ctx.currentTime + 0.05)
      this.setState('speaking')
    })
  }

  stop() {
    if (!this.clip) return
    const c = this.clip
    this.clip = null
    try {
      c.source?.stop()
    } catch {
      /* already stopped */
    }
  }

  start() {
    if (this.raf) return
    const tick = (now: number) => {
      this.raf = requestAnimationFrame(tick)
      if (document.hidden) return
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60
      this.last = now
      this.clock += dt
      this.frame(this.clock, dt)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stopLoop() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  /** Draw one exact moment (tests, filming). `speechT` = seconds into the current clip, if any. */
  renderAt(t: number, speechT?: number) {
    this.clock = t
    this.frame(t, 1 / 30, speechT)
  }

  dispose() {
    this.stopLoop()
    this.stop()
    this.resize?.disconnect()
    this.renderer.dispose()
    void this.audioCtx?.close()
  }

  // --- internals ----------------------------------------------------------------------------------

  private rnd() {
    this.seed = (this.seed * 16807) % 2147483647
    return this.seed / 2147483647
  }

  private fit() {
    const w = this.canvas.clientWidth || 300
    const h = this.canvas.clientHeight || 300
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    const vrm = this.vrm
    if (!vrm) return
    vrm.scene.updateMatrixWorld(true)
    const head = new THREE.Vector3()
    vrm.humanoid.getNormalizedBoneNode('head')?.getWorldPosition(head)
    const fov = { portrait: 18, upper: 22, full: 28 }[this.framing]
    this.camera.fov = fov
    // Narrow stages (board open, phones) move the camera back so the shoulders still fit.
    const back = Math.max(1, 0.9 / Math.max(0.3, w / h))
    if (this.framing === 'portrait') {
      this.camera.position.set(head.x, head.y + 0.02, head.z + 1.05 * back)
      this.camera.lookAt(head.x, head.y - 0.03, head.z)
    } else if (this.framing === 'upper') {
      this.camera.position.set(head.x, head.y - 0.06, head.z + 1.75 * back)
      this.camera.lookAt(head.x, head.y - 0.2, head.z)
    } else {
      this.camera.position.set(0, head.y * 0.6, 4.2 * Math.min(back, 1.6))
      this.camera.lookAt(0, head.y * 0.55, 0)
    }
    this.camera.updateProjectionMatrix()
  }

  private bone(n: VRMHumanBoneName) {
    return this.vrm?.humanoid.getNormalizedBoneNode(n) ?? null
  }

  private frame(t: number, dt: number, speechT?: number) {
    const vrm = this.vrm
    if (!vrm) return
    const calm = this.reduced ? 0.3 : 1
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    // Rest pose, then gestures blended on top.
    for (const n of Object.keys(REST) as VRMHumanBoneName[]) this.bone(n)?.rotation.set(...REST[n]!)
    this.gestures = this.gestures.filter((g) => t - g.start < g.seconds + 0.5)
    let nodNow = 0
    for (const g of this.gestures) {
      const local = t - g.start
      const w = smooth(local / 0.35) * (1 - smooth((local - (g.seconds - 0.35)) / 0.35))
      if (g.g === 'nod') {
        nodNow = Math.max(nodNow, Math.sin((Math.PI * clamp(local / g.seconds)) * 2) * 0.08)
        continue
      }
      for (const [n, r] of Object.entries(GESTURES[g.g].pose) as [VRMHumanBoneName, [number, number, number]][]) {
        const node = this.bone(n)
        if (!node) continue
        let rr = r
        if (g.g === 'wave' && n === 'rightLowerArm') rr = [r[0], r[1], r[2] + 0.28 * Math.sin(local * 9)]
        q.setFromEuler(e.set(rr[0], rr[1], rr[2]))
        node.quaternion.slerp(q, w)
      }
    }
    // Breathing and a slow weight shift.
    const chest = this.bone('chest')
    const spine = this.bone('spine')
    const hips = this.bone('hips')
    if (chest) chest.rotation.x += 0.012 * Math.sin((2 * Math.PI * t) / 4.2) * calm
    if (spine) spine.rotation.z += 0.008 * Math.sin((2 * Math.PI * t) / 7.3) * calm
    if (hips) hips.rotation.z = 0.01 * Math.sin((2 * Math.PI * t) / 9.1) * calm
    // Face and voice.
    const em = vrm.expressionManager
    for (const n of ['blink', 'relaxed', 'happy', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh']) em?.setValue(n, 0)
    let shapes: Record<string, number> = {}
    let headAdd: [number, number, number] = [0, 0, 0]
    let blink = 0
    const c = this.clip
    const ts = speechT ?? (c && this.audioCtx ? this.audioCtx.currentTime - c.start : undefined)
    if (c && ts !== undefined && ts >= 0) {
      const f = speakingFace(ts, c)
      shapes = f.shapes
      headAdd = f.head
      blink = f.blink
      if (chest) chest.rotation.x += f.chest
    }
    // Blinks: a natural rhythm while not speaking (speech brings its own at phrase ends).
    if (!this.blinks.length || this.blinks[this.blinks.length - 1] < t) {
      let b = Math.max(t, this.blinks[this.blinks.length - 1] ?? 0)
      while (this.blinks.length < 6) this.blinks.push((b += 2.4 + this.rnd() * 3))
    }
    this.blinks = this.blinks.filter((b) => b > t - 1)
    for (const b of this.blinks) {
      const d = t - b
      if (d >= 0 && d < 0.15) blink = Math.max(blink, Math.sin((Math.PI * d) / 0.15))
    }
    em?.setValue('blink', blink)
    em?.setValue('relaxed', this.state === 'listening' ? 0.25 : 0.12)
    // Gaze: viewer (camera), board (to her right, the viewer's left), or the pointer; with small darts.
    const since = t - this.stateSince
    const dart = Math.floor(t / 1.3)
    const dx = Math.sin(dart * 12.9898) * 0.04 * calm
    const dy = Math.sin(dart * 78.233) * 0.03 * calm
    const camPos = this.camera.position
    if (this.state === 'thinking') this.target.position.set(camPos.x + 0.5, camPos.y + 0.6, camPos.z)
    else if (this.gaze === 'board') this.target.position.set(camPos.x - 1.6, camPos.y - 0.1, camPos.z - 0.6)
    else if (this.gaze === 'pointer') this.target.position.set(camPos.x + this.pointer.x * 0.8, camPos.y + this.pointer.y * 0.5, camPos.z)
    else this.target.position.set(camPos.x + dx, camPos.y + dy, camPos.z)
    // Head: follows gaze a little, plus speech nods, listening tilt and idle drift.
    const head = this.bone('head')
    const neck = this.bone('neck')
    const look = this.gaze === 'board' ? -0.45 : this.state === 'thinking' ? 0.18 : 0
    if (head) {
      head.rotation.set(
        headAdd[0] + nodNow + 0.012 * Math.sin(t * 1.3) * calm + (this.state === 'thinking' ? -0.08 * smooth(since / 0.5) : 0),
        look * 0.55 + 0.02 * Math.sin(t * 0.6) * calm,
        (this.state === 'listening' ? 0.07 * smooth(since / 0.6) : 0) + 0.008 * Math.sin(t * 0.9) * calm,
      )
    }
    if (neck) neck.rotation.set(0.006 * Math.sin(t * 0.8) * calm, look * 0.35, 0)
    vrm.update(dt)
    // Face shapes after the VRM update (VRM expressions would otherwise overwrite them).
    for (const m of this.faceMeshes) {
      const dict = m.morphTargetDictionary!
      const inf = m.morphTargetInfluences!
      for (const k of ['jawOpen', 'mouthClose', 'mouthFunnel', 'mouthPucker', 'mouthPressLeft', 'mouthPressRight', 'mouthRollLower', 'mouthRollUpper', 'mouthLowerDownLeft', 'mouthLowerDownRight', 'mouthUpperUpLeft', 'mouthUpperUpRight', 'mouthStretchLeft', 'mouthStretchRight', 'browInnerUp', 'browOuterUpLeft', 'browOuterUpRight']) {
        const i = dict[k]
        if (i !== undefined) inf[i] = 0
      }
      for (const [k, v] of Object.entries(shapes)) {
        if (/^eye(Blink|Look)/.test(k)) continue
        const i = dict[k]
        if (i !== undefined) inf[i] = v
      }
    }
    this.renderer.render(this.scene, this.camera)
  }
}
