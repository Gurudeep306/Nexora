/*
  Nexora Viz player: steps a scene frame by frame.

    animate  play / pause, step back / forward, scrub, keyboard
             (← → step, Space play/pause, Home / End), captions announced
    static   the last frame with every caption listed — used for
             mode="static", prefers-reduced-motion, and printing

  The text alternative (every caption, in order) is always available.
*/
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import type { VizSpec } from './schema'
import { buildFrames } from './frames'
import { TWEEN_MS, interpolateFrames } from './tween'
import { useVizLayout } from './useVizLayout'
import { VizScene } from './VizScene'
import { useSketcher } from './sketch'
import './viz.css'

const STEP_MS = 2400

function useMedia(query: string) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setOn(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return on
}

export interface VizPlayerProps {
  spec: VizSpec
  mode?: 'animate' | 'static'
  /** Optional caption from the lesson (shown under the figure). */
  caption?: string
  cleanLines: boolean
  onCleanLines: (on: boolean) => void
}

export function VizPlayer({ spec, mode = 'animate', caption, cleanLines, onCleanLines }: VizPlayerProps) {
  const figRef = useRef<HTMLElement>(null)
  const layout = useVizLayout(spec, figRef)
  const frames = useMemo(() => buildFrames(spec, layout), [spec, layout])
  const reduced = useMedia('(prefers-reduced-motion: reduce)')
  const printing = useMedia('print')
  const isStatic = mode === 'static' || reduced || printing
  const last = frames.length - 1
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Plays by itself once in view; holds while hovered or focused or off-screen;
  // once the reader takes the controls, only the controls move it.
  const [hold, setHold] = useState(false)
  const [touched, setTouched] = useState(false)
  const sketch = useSketcher(!cleanLines)
  const uid = useId()
  const frame = frames[isStatic ? last : i]!

  // The frame actually drawn. When the step changes (and motion is allowed),
  // it glides from the previous frame to the target over TWEEN_MS via rAF;
  // arrows re-snap on every tick, so edges follow their vertices. Static /
  // reduced-motion / print show the target frame directly.
  const [shown, setShown] = useState(frame)
  const shownRef = useRef(frame)
  const rafRef = useRef(0)
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const from = shownRef.current
    if (isStatic || from === frame) {
      // No motion (static / reduced motion / print) or nothing to animate:
      // land on the target frame on the next animation frame.
      rafRef.current = requestAnimationFrame(() => {
        shownRef.current = frame
        setShown(frame)
      })
      return () => cancelAnimationFrame(rafRef.current)
    }
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS)
      const f = interpolateFrames(from, frame, t)
      shownRef.current = f
      setShown(f)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        shownRef.current = frame
        setShown(frame)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [frame, isStatic])

  // Playing stops by itself on the last frame.
  const running = playing && i < last && !isStatic && !(hold && !touched)
  useEffect(() => {
    const el = figRef.current
    if (!el || isStatic || touched || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting), { threshold: 0.45 })
    io.observe(el)
    return () => io.disconnect()
  }, [isStatic, touched])
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setI((n) => Math.min(last, n + 1)), STEP_MS)
    return () => window.clearTimeout(t)
  }, [running, i, last])

  const go = useCallback(
    (n: number) => {
      setTouched(true)
      setPlaying(false)
      setI(Math.max(0, Math.min(last, n)))
    },
    [last],
  )
  const toggle = () => {
    setTouched(true)
    setHold(false)
    if (i >= last) {
      setI(0)
      setPlaying(true)
    } else setPlaying(!(playing && i < last))
  }

  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if (isStatic) return
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT') return // the scrubber handles its own arrows
    if (e.key === 'ArrowRight') go(i + 1)
    else if (e.key === 'ArrowLeft') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(last)
    else if (e.key === ' ' && target.tagName !== 'BUTTON') toggle()
    else return
    e.preventDefault()
  }

  return (
    <figure
      ref={figRef}
      className={cn('nxv', isStatic && 'nxv--static')}
      data-layout={layout}
      aria-roledescription={isStatic ? undefined : 'step-by-step diagram'}
      aria-label={spec.title}
      onKeyDown={onKey}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHold(false)}
    >
      <div className="nxv-stage">
        <VizScene spec={spec} layout={layout} frame={shown} sketch={sketch} titleId={`${uid}-t`} descId={`${uid}-d`} />
      </div>

      {!isStatic && (
        <div className="nxv-deck">
          <p className="nxv-caption" aria-live="polite">
            <span className="nxv-step" aria-hidden="true">
              {i === 0 ? 'Start' : `${String(i).padStart(2, '0')} / ${String(last).padStart(2, '0')}`}
            </span>
            <span className="sr-only">{i === 0 ? 'Start. ' : `Step ${i} of ${last}. `}</span>
            <span className="nxv-caption-text">{frame.caption}</span>
          </p>
          <div className="nxv-transport" role="group" aria-label="Diagram controls">
            <button type="button" className="nxv-key" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous step" title="Previous step (←)">
              <Icon name="skip-back" className="size-4" />
            </button>
            <button type="button" className="nxv-key nxv-key--play" onClick={toggle} aria-label={running ? 'Pause' : i >= last ? 'Replay' : 'Play'} title={running ? 'Pause (Space)' : i >= last ? 'Replay' : 'Play (Space)'}>
              <Icon name={running ? 'pause' : i >= last ? 'refresh' : 'play'} className="size-4" />
            </button>
            <button type="button" className="nxv-key" onClick={() => go(i + 1)} disabled={i >= last} aria-label="Next step" title="Next step (→)">
              <Icon name="skip-forward" className="size-4" />
            </button>
            {last <= 24 ? (
              <div className="nxv-ticks" role="group" aria-label="Go to a step">
                {frames.map((f) => (
                  <button
                    key={f.index}
                    type="button"
                    className={cn('nxv-tick', f.index <= i && 'is-past', f.index === i && 'is-now')}
                    onClick={() => go(f.index)}
                    aria-label={f.index === 0 ? 'Start' : `Step ${f.index} of ${last}`}
                    aria-current={f.index === i ? 'step' : undefined}
                  >
                    <span aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="range"
                className="nxv-scrub"
                min={0}
                max={last}
                step={1}
                value={i}
                onChange={(e) => go(Number(e.target.value))}
                aria-label="Scrub through the steps"
                aria-valuetext={i === 0 ? 'Start' : `Step ${i} of ${last}`}
              />
            )}
            <CleanToggle on={cleanLines} onChange={onCleanLines} />
          </div>
        </div>
      )}

      {isStatic && (
        <ol className="nxv-captions" aria-label="What the diagram shows">
          {frames.map((f) => (
            <li key={f.index}>{f.caption}</li>
          ))}
        </ol>
      )}

      {(caption || !isStatic) && (
        <figcaption className="nxv-figcaption">
          {caption && <span>{caption}</span>}
          {!isStatic && (
            <details className="nxv-alt">
              <summary>Read it as text</summary>
              <ol>
                {frames.map((f) => (
                  <li key={f.index}>{f.caption}</li>
                ))}
              </ol>
            </details>
          )}
        </figcaption>
      )}
      {isStatic && !printing && (
        <div className="nxv-controls nxv-controls--static">
          <CleanToggle on={cleanLines} onChange={onCleanLines} />
        </div>
      )}
    </figure>
  )
}

function CleanToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  // Hand-drawn strokes or clean ones: a quiet two-way switch.
  return (
    <button type="button" className="nxv-style" aria-pressed={on} onClick={() => onChange(!on)} title={on ? 'Show hand-drawn lines' : 'Show clean lines'}>
      <span className={cn('nxv-style-opt', !on && 'is-on')}>Sketch</span>
      <span className={cn('nxv-style-opt', on && 'is-on')}>Clean</span>
      <span className="sr-only">{on ? 'Clean lines on' : 'Clean lines off'}</span>
    </button>
  )
}

export default VizPlayer
