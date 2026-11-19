import { useCallback, useEffect, useId, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { PerspectiveCamera, Spherical, Vector3 } from 'three'
import { CameraControls } from '@react-three/drei'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Minus, Pause, Play, Plus, RotateCcw, Video } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hasWebGL, usePalette3D, useReducedMotion, type Palette3D } from './theme3d'
import { Studio } from './studio'
import type { V3 } from './coords'
import './scene3d.css'

/*
 * The frame for every 3D scene in the AI courses, built on what the best
 * explorable explanations do (Bycroft's LLM visualisation, the Georgia Tech
 * explainers, TensorFlow Playground):
 *   - a timeline of steps with their own durations, reading breaks where
 *     autoplay waits ("Continue"), a scrubber and speeds;
 *   - a camera that glides to each step's view (camera-controls), until you
 *     take over by dragging; "Follow the tour" hands it back;
 *   - focus: what the step is about stays bright, the rest dims;
 *   - hover to read exact values; live formulas with the step's numbers;
 *   - keys, full screen, the theme's colours, reduced motion, a text
 *     description and a 2D fallback.
 */

export interface SceneView {
  camera: V3
  target: V3
}

export interface SceneStep {
  /** Short name of the step ("Step 12", "Forward: hidden layer"). */
  label: string
  /** What is happening now, in plain words (read out to screen readers). */
  note?: ReactNode
  /** The step's formula with its real numbers filled in (KaTeX). */
  tex?: string
  /** Where the camera goes for this step (kept until a later step sets another). */
  view?: SceneView
  /** Ids of the parts this step is about; everything else dims. */
  focus?: string[]
  /** Autoplay stops here so the student can read; Play continues. */
  pause?: boolean
  /** How long the move from this step to the next takes, in ms (default: the scene's stepMs). */
  ms?: number
}

export interface SceneCtx {
  /** The current step (0 when the scene has no steps). */
  step: number
  /** Continuous time in steps, 0 … steps − 1 (for smooth motion). */
  t: number
  /** How far into the current step, 0 … 1, eased. */
  frac: number
  p: Palette3D
  reduced: boolean
  /** Opacity for a part: 1 when the step is about it (or about everything), dimmed otherwise. */
  dim: (id: string) => number
  /** Show a value under the pointer (call from onPointerMove); `null` hides it. */
  tip: (e: ThreeEvent<PointerEvent> | null, text?: string) => void
}

type Controls = ComponentRef<typeof CameraControls>

function StepTex({ src }: { src: string }) {
  return <div className="ai3d-tex" tabIndex={0} role="group" aria-label="Formula for this step" dangerouslySetInnerHTML={{ __html: katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false }) }} />
}

type TipState = { x: number; y: number; text: string } | null

/** Connects the scene's pointer events to the readout, without re-rendering the scene on every move. */
class HoverBus {
  private el: HTMLElement | null = null
  private set: ((t: TipState) => void) | null = null
  attach(el: HTMLElement | null) {
    this.el = el
  }
  bind(set: (t: TipState) => void) {
    this.set = set
  }
  show(clientX: number, clientY: number, text: string) {
    const r = this.el?.getBoundingClientRect()
    this.set?.({ x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0), text })
  }
  hide() {
    this.set?.(null)
  }
}

/** The value under the pointer. Its own state, so moving the mouse never re-renders the scene. */
function Tip({ bind }: { bind: (set: (t: TipState) => void) => void }) {
  const [t, setT] = useState<TipState>(null)
  useEffect(() => bind(setT), [bind])
  if (!t) return null
  return (
    <div className="ai3d-tip" style={{ left: t.x + 14, top: t.y + 12 }} role="status">
      {t.text}
    </div>
  )
}

/** Soft light from above and behind, brighter in light mode; no shadows (the house style has none). */
function Lights({ p }: { p: Palette3D }) {
  return (
    <>
      <hemisphereLight args={['#ffffff', p.dark ? '#202020' : '#bdb6a6', p.dark ? 0.35 : 0.45]} />
      <directionalLight position={[5, 9, 6]} intensity={p.dark ? 0.8 : 0.9} />
    </>
  )
}

const FOV_3D = 40
const FOV_2D = 6

/** In 2D a drag pans the paper; in 3D it turns the scene (camera-controls ACTION values). */
function setDragMode(c: Controls, flat: boolean) {
  c.mouseButtons.left = flat ? 2 : 1 // TRUCK : ROTATE
  c.touches.one = flat ? 128 : 64 // TOUCH_TRUCK : TOUCH_ROTATE
}
/** Change the lens (field of view) and how far the camera sees. */
function setLens(cam: PerspectiveCamera, fov: number, far: number) {
  cam.fov = fov
  cam.far = far
  cam.updateProjectionMatrix()
}

interface Pose {
  az: number
  pol: number
  dist: number
  target: Vector3
}
export interface RigApi {
  /** Back to the scene's own framing (in 3D, or its flat view in 2D). */
  reset: (smooth: boolean) => void
}

/**
 * The camera rig: frames the scene once (backing off on narrow screens) and
 * morphs between 3D and 2D. lift = 1 is the 3D pose; lift = 0 looks straight
 * down, square-on (x to the right), through a very long lens, so the scene
 * reads as a flat diagram. In between, the camera turns, tilts up and pulls
 * back while the lens narrows (a dolly zoom). The 3D pose is the framing, or
 * wherever the student leaves the camera in 3D. In 2D, dragging pans.
 */
function Rig({ controls, camera3, target3, lift, onApi }: { controls: React.RefObject<Controls | null>; camera3: V3; target3: V3; lift: number; onApi: (a: RigApi) => void }) {
  const { camera, size, invalidate } = useThree()
  const pose = useRef<Pose | null>(null)
  const home = useRef<Pose | null>(null)
  const liftRef = useRef(lift)

  const apply = useCallback(
    (l: number, smooth: boolean) => {
      const c = controls.current
      const p0 = pose.current
      const cam = camera as PerspectiveCamera
      if (!c || !p0 || !cam.isPerspectiveCamera) return
      const s = 1 - l
      const fov = FOV_3D + (FOV_2D - FOV_3D) * s
      const k = Math.tan(((FOV_3D / 2) * Math.PI) / 180) / Math.tan(((fov / 2) * Math.PI) / 180)
      // Turn the shortest way to face the page square-on.
      let az = p0.az % (2 * Math.PI)
      if (az > Math.PI) az -= 2 * Math.PI
      if (az < -Math.PI) az += 2 * Math.PI
      setLens(cam, fov, Math.max(200, p0.dist * k * 4))
      setDragMode(c, l < 0.999)
      void c.moveTo(p0.target.x, p0.target.y, p0.target.z, smooth)
      void c.rotateTo(az * (1 - s), p0.pol + (0.0005 - p0.pol) * s, smooth)
      void c.dollyTo(p0.dist * k, smooth)
      invalidate()
    },
    [controls, camera, invalidate],
  )

  // Frame once the canvas has a size: the 3D home pose.
  useEffect(() => {
    if (home.current || !size.width || !size.height) return
    const k = Math.min(2.2, Math.max(1, 1.25 / (size.width / size.height)))
    const t = new Vector3(...target3)
    const off = new Vector3(...camera3).sub(t).multiplyScalar(k)
    const sph = new Spherical().setFromVector3(off)
    home.current = { az: sph.theta, pol: sph.phi, dist: sph.radius, target: t }
    pose.current = { ...home.current, target: t.clone() }
    apply(liftRef.current, false)
  }, [size.width, size.height, camera3, target3, apply])

  // Follow the lift.
  useEffect(() => {
    liftRef.current = lift
    apply(lift, false)
  }, [lift, apply])

  // In 3D, remember where the student (or the guided tour) leaves the camera.
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const keep = () => {
      if (liftRef.current < 0.999) return
      pose.current = { az: c.azimuthAngle, pol: c.polarAngle, dist: c.distance, target: c.getTarget(new Vector3()) }
    }
    c.addEventListener('controlend', keep)
    c.addEventListener('rest', keep)
    return () => {
      c.removeEventListener('controlend', keep)
      c.removeEventListener('rest', keep)
    }
  }, [controls])

  useEffect(() => {
    onApi({
      reset: (smooth) => {
        if (!home.current) return
        pose.current = { ...home.current, target: home.current.target.clone() }
        apply(liftRef.current, smooth)
      },
    })
  }, [onApi, apply])
  return null
}

export function Scene3D({
  title,
  description,
  steps,
  camera = [6, 5, 7],
  target = [0, 0, 0],
  stepMs = 700,
  fallback,
  className,
  resetKey,
  lift = 1,
  tools,
  children,
}: {
  title: string
  /** What the scene shows, in words, for screen readers and as the WebGL fallback. */
  description: string
  steps?: SceneStep[]
  camera?: V3
  target?: V3
  stepMs?: number
  fallback?: ReactNode
  className?: string
  /** Change it (a new start point, a new input) to replay the scene from the start. */
  resetKey?: string | number
  /** 1 = 3D, 0 = flat 2D seen from above; anything between morphs. A function gets the timeline's time (Stage drives it). */
  lift?: number | ((t: number) => number)
  /** Extra controls for the bar (Stage's 2D / 3D switch); a function gets the current lift. */
  tools?: ReactNode | ((lift: number) => ReactNode)
  children: (ctx: SceneCtx) => ReactNode
}) {
  const p = usePalette3D()
  const reduced = useReducedMotion()
  const [webgl] = useState(() => hasWebGL())
  // Phones get the lighter quality settings for occlusion.
  const [narrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [follow, setFollow] = useState(true)
  const [full, setFull] = useState(false)
  const root = useRef<HTMLElement>(null)
  const controls = useRef<Controls | null>(null)
  const started = useRef(false)
  const [hover] = useState(() => new HoverBus())
  const descId = useId()
  const rig = useRef<RigApi | null>(null)
  const setRig = useCallback((a: RigApi) => {
    rig.current = a
  }, [])
  const n = steps?.length ?? 0
  const hasViews = !!steps?.some((s) => s.view)

  // The clock. Continuous while playing; whole steps with reduced motion; stops at reading breaks.
  useEffect(() => {
    if (!playing || n < 2) return
    let raf = 0
    let last = performance.now()
    let held = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setTime((t0) => {
        const k = Math.floor(t0 + 1e-9)
        const dur = steps?.[k]?.ms ?? stepMs
        if (reduced) {
          held += dt * speed
          if (held < Math.max(dur, 900)) return t0
          held = 0
          const nx = Math.min(n - 1, k + 1)
          if (nx >= n - 1 || steps?.[nx]?.pause) setPlaying(false)
          return nx
        }
        let nx = Math.min(n - 1, t0 + (dt * speed) / dur)
        // Crossing into a step with a reading break: stop exactly on it.
        const kn = Math.floor(nx + 1e-9)
        if (kn > k && steps?.[kn]?.pause) {
          nx = kn
          setPlaying(false)
        }
        if (nx >= n - 1) setPlaying(false)
        return nx
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, n, stepMs, reduced, speed, steps])

  // Autoplay once, the first time most of the scene scrolls into view (never with reduced motion).
  useEffect(() => {
    const el = root.current
    if (!el || n < 2 || reduced) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          setTime(0)
          setPlaying(true)
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [n, reduced])

  // A new setting (start point, input, learning rate): play again from the start.
  const firstKey = useRef(resetKey)
  useEffect(() => {
    if (resetKey === firstKey.current) return
    firstKey.current = resetKey
    started.current = true
    setTime(0)
    setPlaying(!reduced && n > 1)
  }, [resetKey, reduced, n])

  const step = Math.floor(time + 1e-9)
  const raw = time - step
  const frac = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2
  const cur = steps?.[step]

  // The guided camera: glide to the view of the current step (the last one set at or before it).
  let viewIdx = -1
  if (steps) for (let k = step; k >= 0; k--) if (steps[k].view) {
    viewIdx = k
    break
  }
  const liftNow = typeof lift === 'function' ? lift(time) : lift
  const in3D = liftNow >= 0.999
  useEffect(() => {
    const c = controls.current
    if (!c || !follow || viewIdx < 0 || !steps || !in3D) return
    const v = steps[viewIdx].view!
    void c.setLookAt(v.camera[0], v.camera[1], v.camera[2], v.target[0], v.target[1], v.target[2], !reduced)
  }, [viewIdx, follow, reduced, steps, in3D])

  // Taking the camera (dragging, pinching) stops the tour from moving it.
  useEffect(() => {
    const c = controls.current
    if (!c || !hasViews) return
    const take = () => setFollow(false)
    c.addEventListener('controlstart', take)
    return () => c.removeEventListener('controlstart', take)
  }, [hasViews, webgl])

  useEffect(() => {
    const on = () => setFull(document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  const focus = cur?.focus
  const dim = useCallback((id: string) => (!focus || focus.includes(id) ? 1 : 0.22), [focus])
  const tip = useCallback(
    (e: ThreeEvent<PointerEvent> | null, text?: string) => {
      if (!e || !text) hover.hide()
      else hover.show(e.nativeEvent.clientX, e.nativeEvent.clientY, text)
    },
    [hover],
  )
  const bindTip = useCallback(
    (set: (t: TipState) => void) => hover.bind(set),
    [hover],
  )

  const go = (d: number) => {
    started.current = true
    setPlaying(false)
    setTime((t0) => Math.max(0, Math.min(n - 1, (d > 0 ? Math.floor(t0 + 1e-9) : Math.ceil(t0 - 1e-9)) + d)))
  }
  const toggle = () => {
    started.current = true
    if (!playing && time >= n - 1) setTime(0)
    setPlaying((x) => !x)
  }
  const reset = () => {
    setFollow(true)
    rig.current?.reset(!reduced)
  }
  const zoom = (d: number) => void controls.current?.dolly(d, !reduced)
  const turn = (az: number, pol: number) => {
    if (hasViews) setFollow(false)
    void controls.current?.rotate(az, pol, !reduced)
  }
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.current?.requestFullscreen?.()
  }
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key
    if (k === 'ArrowLeft') turn(-0.15, 0)
    else if (k === 'ArrowRight') turn(0.15, 0)
    else if (k === 'ArrowUp') turn(0, -0.12)
    else if (k === 'ArrowDown') turn(0, 0.12)
    else if (k === '+' || k === '=') zoom(1)
    else if (k === '-' || k === '_') zoom(-1)
    else if (k === '0') reset()
    else if (n && k === '.') go(1)
    else if (n && k === ',') go(-1)
    else if (n && k === ' ') toggle()
    else return
    e.preventDefault()
  }

  const atBreak = !playing && n > 1 && time > 0 && time < n - 1 && !!cur?.pause

  return (
    <figure ref={root} className={cn('ai3d', className)}>
      <div
        ref={(el) => hover.attach(el)}
        className="ai3d-view"
        tabIndex={0}
        role="group"
        aria-roledescription="3D scene"
        aria-label={`${title}. Drag to turn, scroll to zoom; or use the arrow keys, plus and minus.`}
        aria-describedby={descId}
        onKeyDown={onKey}
        onPointerLeave={() => hover.hide()}
      >
        {webgl ? (
          <Canvas frameloop="demand" dpr={[1, narrow ? 1.5 : 2]} camera={{ position: camera, fov: FOV_3D, near: 0.1, far: 400 }} gl={{ antialias: true, alpha: true }}>
            <Lights p={p} />
            <CameraControls ref={controls} makeDefault smoothTime={reduced ? 0 : 0.45} draggingSmoothTime={reduced ? 0 : 0.12} minDistance={1} maxDistance={60} />
            <Rig controls={controls} camera3={camera} target3={target} lift={liftNow} onApi={setRig} />
            <Studio p={p} lift={liftNow} quality={narrow ? 'low' : 'high'} />
            {children({ step, t: time, frac, p, reduced, dim, tip })}
          </Canvas>
        ) : (
          <div className="ai3d-fallback">{fallback ?? <p>{description}</p>}</div>
        )}
        <Tip bind={bindTip} />
        <p className="ai3d-hint" aria-hidden="true">
          {in3D ? 'Drag to turn · scroll or pinch to zoom · right-drag to pan' : 'Flat view · drag to move · scroll or pinch to zoom'}
        </p>
      </div>
      <p id={descId} className="sr-only">
        {description}
      </p>
      {n > 0 && (
        <div className="ai3d-note" aria-live={playing ? 'off' : 'polite'}>
          <span className="ai3d-step">
            {cur?.label} <span className="ai3d-of">of {n}</span>
          </span>
          {cur?.note && <span className="ai3d-text">{cur.note}</span>}
        </div>
      )}
      {cur?.tex && <StepTex src={cur.tex} />}
      <div className="ai3d-bar">
        {n > 0 && (
          <span className="ai3d-group">
            <Button variant="ghost" size="icon-sm" aria-label="Previous step" onClick={() => go(-1)} disabled={time <= 0}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggle}>
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} {playing ? 'Pause' : time >= n - 1 ? 'Replay' : atBreak ? 'Continue' : 'Play'}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next step" onClick={() => go(1)} disabled={time >= n - 1}>
              <ChevronRight aria-hidden="true" />
            </Button>
            <input
              type="range"
              className="ai3d-scrub"
              min={0}
              max={n - 1}
              step={0.01}
              value={time}
              onChange={(e) => {
                started.current = true
                setPlaying(false)
                setTime(Number(e.target.value))
              }}
              aria-label="Scrub through the steps"
              aria-valuetext={`Step ${step + 1} of ${n}`}
            />
            <span className="ai3d-speed" role="group" aria-label="Speed">
              {[0.5, 1, 2].map((v) => (
                <button key={v} type="button" aria-pressed={speed === v} onClick={() => setSpeed(v)}>
                  {v === 0.5 ? '½×' : `${v}×`}
                </button>
              ))}
            </span>
          </span>
        )}
        <span className="ai3d-group ai3d-cam">
          {typeof tools === 'function' ? tools(liftNow) : tools}
          {hasViews && (
            <Button variant="ghost" size="sm" aria-pressed={follow} onClick={() => setFollow((f) => !f)} disabled={!webgl}>
              <Video aria-hidden="true" /> Follow the tour
            </Button>
          )}
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => zoom(-1)} disabled={!webgl}>
            <Minus aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => zoom(1)} disabled={!webgl}>
            <Plus aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} disabled={!webgl}>
            <RotateCcw aria-hidden="true" /> Reset view
          </Button>
          {typeof document !== 'undefined' && document.fullscreenEnabled && (
            <Button variant="ghost" size="icon-sm" aria-label={full ? 'Exit full screen' : 'Full screen'} onClick={toggleFull}>
              {full ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
            </Button>
          )}
        </span>
      </div>
    </figure>
  )
}
