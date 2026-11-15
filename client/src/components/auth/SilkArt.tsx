import { useEffect, useRef } from 'react'

/**
 * Generative "silk": a few dozen fine threads, each a sum of slow sine waves,
 * drawn additively so they read as one flowing ribbon of light — silver, with
 * a single thread of the theme's accent. Pure art for the sign-in panel.
 *
 * One 2D canvas. It stops when off-screen or when the tab is hidden, and under
 * reduced motion it draws one still frame.
 */
const THREADS = 64

function accent(): string {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent-brand').trim() || '#7aa2ff'
}

export function SilkArt({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    let w = 0
    let h = 0
    let raf = 0
    let visible = true
    let tint = accent()
    const t0 = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ribbon = (t: number, cx: number, cy: number, angle: number, scale: number, phase: number, alpha: number) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angle)
      const len = Math.hypot(w, h) * 0.75
      const step = 7
      for (let i = 0; i < THREADS; i++) {
        const k = i / (THREADS - 1) - 0.5 // -0.5 … 0.5 across the ribbon
        const edge = 1 - Math.abs(k) * 2 // 1 in the middle, 0 at the edges
        const isAccent = i === Math.round(THREADS * 0.62)
        ctx.beginPath()
        for (let x = -len; x <= len; x += step) {
          const u = x / len
          const spread = (0.55 + 0.45 * Math.sin(u * 2.4 + t * 0.00011 + phase)) * 150 * scale
          const y =
            k * spread +
            Math.sin(u * 3.1 + t * 0.00023 + phase + k * 0.9) * 70 * scale +
            Math.sin(u * 7.3 - t * 0.00017 + k * 2.2) * 16 * scale
          if (x === -len) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = isAccent ? tint : '#ffffff'
        ctx.globalAlpha = isAccent ? 0.75 * alpha : (0.035 + 0.16 * edge * edge) * alpha
        ctx.lineWidth = isAccent ? 1.4 : 0.9
        ctx.stroke()
      }
      ctx.restore()
    }

    const draw = (now: number) => {
      const t = now - t0 + 40000
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'
      const s = Math.min(w, h) / 620
      ribbon(t, w * 0.5, h * 0.42, -0.42, s, 0, 1)
      ribbon(t * 0.8, w * 0.55, h * 0.62, -0.18, s * 0.7, 2.1, 0.55)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      draw(now)
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      if (still) draw(t0)
      else if (visible && !document.hidden) raf = requestAnimationFrame(frame)
    }

    resize()
    start()
    const ro = new ResizeObserver(() => {
      resize()
      if (still) draw(t0)
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      start()
    })
    io.observe(canvas)
    const mo = new MutationObserver(() => {
      tint = accent()
      if (still) draw(t0)
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-palette', 'data-accent', 'data-mode'] })
    document.addEventListener('visibilitychange', start)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      document.removeEventListener('visibilitychange', start)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className={className} />
}
