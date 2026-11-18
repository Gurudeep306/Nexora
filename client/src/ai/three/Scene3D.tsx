import { useCallback, useEffect, useId, useRef, useState, type ComponentRef, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Spherical, Vector3 } from 'three'
import { ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hasWebGL, usePalette3D, useReducedMotion, type Palette3D } from './theme3d'
import './scene3d.css'

export interface SceneStep {
  /** Short name of the step ("Step 12", "Forward: hidden layer"). */
  label: string
  /** What is happening now, in plain words (read out to screen readers). */
  note?: ReactNode
}

export interface SceneCtx {
  /** The current step (0 when the scene has no steps). */
  step: number
  /** Continuous time in steps, 0 … steps − 1: step + how far it is towards the next (for smooth motion). */
  t: number
  /** How far into the current step, 0 … 1, eased. */
  frac: number
  p: Palette3D
  reduced: boolean
}

type Controls = ComponentRef<typeof OrbitControls>
interface CamApi {
  zoom: (f: number) => void
  turn: (dAz: number, dPol: number) => void
}

/** Inside the canvas: gives the toolbar and keys a way to move the camera. */
function CameraRig({ onApi, controls }: { onApi: (api: CamApi) => void; controls: React.RefObject<Controls | null> }) {
  const { camera, invalidate, size } = useThree()
  const fitted = useRef(false)
  // On a narrow (phone) view the scene needs more room: back the camera off once, and make that the "Reset view" framing.
  useEffect(() => {
    if (fitted.current || !size.width || !size.height) return
    fitted.current = true
    const c = controls.current
    const target = c ? (c.target as Vector3) : new Vector3()
    const aspect = size.width / size.height
    const k = Math.min(2.2, Math.max(1, 1.25 / aspect))
    if (k > 1) camera.position.copy(target.clone().add(camera.position.clone().sub(target).multiplyScalar(k)))
    c?.update()
    c?.saveState()
    invalidate()
  }, [size.width, size.height, camera, controls, invalidate])
  useEffect(() => {
    onApi({
      zoom: (f) => {
        const c = controls.current
        const target = c ? (c.target as Vector3) : new Vector3()
        const d = camera.position.clone().sub(target).multiplyScalar(f)
        if (d.length() < 0.8 || d.length() > 60) return
        camera.position.copy(target.clone().add(d))
        c?.update()
        invalidate()
      },
      turn: (dAz, dPol) => {
        const c = controls.current
        const target = c ? (c.target as Vector3) : new Vector3()
        const s = new Spherical().setFromVector3(camera.position.clone().sub(target))
        s.theta += dAz
        s.phi = Math.max(0.05, Math.min(Math.PI - 0.05, s.phi + dPol))
        camera.position.copy(target.clone().add(new Vector3().setFromSpherical(s)))
        camera.lookAt(target)
        c?.update()
        invalidate()
      },
    })
  }, [onApi, camera, controls, invalidate])
  return null
}

/** Soft light from above and behind, brighter in light mode; no shadows (the house style has none). */
function Lights({ p }: { p: Palette3D }) {
  return (
    <>
      <ambientLight intensity={p.dark ? 0.9 : 1.1} />
      <directionalLight position={[5, 9, 6]} intensity={p.dark ? 1.4 : 1.6} />
      <directionalLight position={[-6, 4, -5]} intensity={0.45} />
    </>
  )
}

/**
 * The frame for every 3D scene in the AI courses: a WebGL view you can drag
 * to turn, scroll or pinch to zoom, right-drag to pan; a step-by-step
 * timeline; keyboard control; the theme's colours; a text description for
 * screen readers; and a 2D fallback when WebGL is missing.
 */
export function Scene3D({
  title,
  description,
  steps,
  camera = [6, 5, 7],
  target = [0, 0, 0],
  stepMs = 700,
  fallback,
  className,
  children,
}: {
  title: string
  /** What the scene shows, in words, for screen readers and as the WebGL fallback. */
  description: string
  steps?: SceneStep[]
  camera?: [number, number, number]
  target?: [number, number, number]
  stepMs?: number
  fallback?: ReactNode
  className?: string
  children: (ctx: SceneCtx) => ReactNode
}) {
  const p = usePalette3D()
  const reduced = useReducedMotion()
  const [webgl] = useState(() => hasWebGL())
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const root = useRef<HTMLElement>(null)
  const started = useRef(false)
  const controls = useRef<Controls | null>(null)
  const cam = useRef<CamApi | null>(null)
  const descId = useId()
  const setCam = useCallback((a: CamApi) => {
    cam.current = a
  }, [])
  const n = steps?.length ?? 0

  // The clock: continuous time while playing (smooth motion), whole steps with reduced motion.
  useEffect(() => {
    if (!playing || n < 2) return
    let raf = 0
    let last = performance.now()
    let held = 0
    const tick = (now: number) => {
      const dt = now - last
      last = now
      setTime((t0) => {
        if (reduced) {
          held += dt * speed
          if (held < Math.max(stepMs, 900)) return t0
          held = 0
          const nx = Math.min(n - 1, Math.floor(t0) + 1)
          if (nx >= n - 1) setPlaying(false)
          return nx
        }
        const nx = Math.min(n - 1, t0 + (dt * speed) / stepMs)
        if (nx >= n - 1) setPlaying(false)
        return nx
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, n, stepMs, reduced, speed])

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

  const step = Math.floor(time + 1e-9)
  const raw = time - step
  const frac = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2
  const go = useCallback(
    (d: number) => {
      started.current = true
      setPlaying(false)
      setTime((t0) => Math.max(0, Math.min(n - 1, (d > 0 ? Math.floor(t0 + 1e-9) : Math.ceil(t0 - 1e-9)) + d)))
    },
    [n],
  )
  const reset = () => {
    controls.current?.reset()
  }
  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key
    if (k === 'ArrowLeft') cam.current?.turn(-0.15, 0)
    else if (k === 'ArrowRight') cam.current?.turn(0.15, 0)
    else if (k === 'ArrowUp') cam.current?.turn(0, -0.12)
    else if (k === 'ArrowDown') cam.current?.turn(0, 0.12)
    else if (k === '+' || k === '=') cam.current?.zoom(0.85)
    else if (k === '-' || k === '_') cam.current?.zoom(1.18)
    else if (k === '0') reset()
    else if (n && k === '.') go(1)
    else if (n && k === ',') go(-1)
    else if (n && k === ' ') toggle()
    else return
    e.preventDefault()
  }

  const cur = steps?.[step]
  const toggle = () => {
    started.current = true
    if (!playing && time >= n - 1) setTime(0)
    setPlaying((x) => !x)
  }

  return (
    <figure ref={root} className={cn('ai3d', className)}>
      <div
        className="ai3d-view"
        tabIndex={0}
        role="group"
        aria-roledescription="3D scene"
        aria-label={`${title}. Drag to turn, scroll to zoom; or use the arrow keys, plus and minus.`}
        aria-describedby={descId}
        onKeyDown={onKey}
      >
        {webgl ? (
          <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: camera, fov: 40, near: 0.1, far: 200 }} gl={{ antialias: true, alpha: true }}>
            <Lights p={p} />
            <OrbitControls ref={controls} makeDefault target={target} enableDamping={!reduced} dampingFactor={0.12} minDistance={1} maxDistance={60} />
            <CameraRig onApi={setCam} controls={controls} />
            {children({ step, t: time, frac, p, reduced })}
          </Canvas>
        ) : (
          <div className="ai3d-fallback">{fallback ?? <p>{description}</p>}</div>
        )}
        <p className="ai3d-hint" aria-hidden="true">
          Drag to turn · scroll or pinch to zoom · right-drag to pan
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
      <div className="ai3d-bar">
        {n > 0 && (
          <span className="ai3d-group">
            <Button variant="ghost" size="icon-sm" aria-label="Previous step" onClick={() => go(-1)} disabled={time <= 0}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggle}>
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />} {playing ? 'Pause' : time >= n - 1 ? 'Replay' : 'Play'}
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
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => cam.current?.zoom(1.18)} disabled={!webgl}>
            <Minus aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => cam.current?.zoom(0.85)} disabled={!webgl}>
            <Plus aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} disabled={!webgl}>
            <RotateCcw aria-hidden="true" /> Reset view
          </Button>
        </span>
      </div>
    </figure>
  )
}
