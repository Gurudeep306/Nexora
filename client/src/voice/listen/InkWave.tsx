/*
  Listening, drawn like the NexoraGuru mark: one line of ink that moves with
  your voice, and the clay full stop where the pen is, growing as you speak.
  When you're quiet the line breathes gently, so it never looks frozen. Real
  sound drives it (level.ts); with reduced motion it stays a still line and
  only the dot shows the level.
*/
import { useEffect, useRef } from 'react'
import { closeLevel, openLevel, readLevel } from './level'
import './listen.css'

export function InkWave({ active }: { active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dot = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!active) return
    let raf = 0
    let alive = true
    let shown = 0 // eased loudness
    const pts = new Float32Array(48)
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    void openLevel()
    const draw = (t: number) => {
      if (!alive) return
      const c = canvas.current
      const ctx2 = c?.getContext('2d')
      if (c && ctx2) {
        const dpr = window.devicePixelRatio || 1
        const w = c.clientWidth
        const h = c.clientHeight
        if (c.width !== Math.round(w * dpr)) {
          c.width = Math.round(w * dpr)
          c.height = Math.round(h * dpr)
        }
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx2.clearRect(0, 0, w, h)
        const lv = readLevel()
        const target = lv?.level ?? 0
        shown += (target - shown) * (target > shown ? 0.35 : 0.08)
        // The ink: the text colour, so it fits every theme, light and dark.
        const ink = getComputedStyle(c).color
        const mid = h / 2
        const amp = still ? 0 : (h / 2 - 3) * (0.12 + shown * 0.88)
        for (let i = 0; i < pts.length; i++) {
          const x = i / (pts.length - 1)
          // Real waveform where there is one, a calm breath under it.
          const sample = lv ? lv.wave[Math.floor(x * (lv.wave.length - 1))] * 3.2 : 0
          const breath = Math.sin(x * Math.PI * 3 + t / 520) * 0.22
          // Taper at both ends, like a pen stroke that starts and lifts.
          const taper = Math.sin(Math.PI * x) ** 0.8
          pts[i] = mid + Math.max(-1, Math.min(1, sample + breath)) * amp * taper
        }
        ctx2.strokeStyle = ink
        ctx2.lineWidth = 1.6 + shown * 1.2
        ctx2.lineCap = 'round'
        ctx2.lineJoin = 'round'
        ctx2.beginPath()
        const step = w / (pts.length - 1)
        ctx2.moveTo(0, pts[0])
        for (let i = 1; i < pts.length - 1; i++) {
          const x = i * step
          ctx2.quadraticCurveTo(x, pts[i], x + step / 2, (pts[i] + pts[i + 1]) / 2)
        }
        ctx2.lineTo(w, pts[pts.length - 1])
        ctx2.stroke()
        dot.current?.style.setProperty('--lv', shown.toFixed(3))
        document.documentElement.style.setProperty('--vc-level', shown.toFixed(3))
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      closeLevel()
      document.documentElement.style.removeProperty('--vc-level')
    }
  }, [active])

  return (
    <div className="vc-ink" aria-hidden="true">
      <canvas ref={canvas} className="vc-ink-line" />
      <span ref={dot} className="vc-ink-dot" />
    </div>
  )
}
