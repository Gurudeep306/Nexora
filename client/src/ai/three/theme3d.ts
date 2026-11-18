import { useEffect, useState } from 'react'

/**
 * The site's design tokens as plain sRGB colours for WebGL. The tokens are
 * written in oklch / color-mix, which three.js can't parse, so each one is
 * painted onto a 1×1 canvas and read back. Recomputed whenever the theme,
 * palette or light/dark mode changes, so 3D scenes follow every theme.
 */
export interface Palette3D {
  ink: string
  ink2: string
  muted: string
  hair: string
  strong: string
  bg: string
  surface: string
  accent: string
  info: string
  success: string
  warning: string
  error: string
  dark: boolean
}

const TOKENS: Record<Exclude<keyof Palette3D, 'dark'>, string> = {
  ink: '--color-text-primary',
  ink2: '--color-text-secondary',
  muted: '--color-text-muted',
  hair: '--color-border',
  strong: '--color-border-strong',
  bg: '--color-bg-app',
  surface: '--color-bg-surface',
  accent: '--color-accent-brand',
  info: '--color-state-info',
  success: '--color-state-success',
  warning: '--color-state-warning',
  error: '--color-state-error',
}

const FALLBACK: Palette3D = { ink: '#1f1e1b', ink2: '#4a4842', muted: '#77746c', hair: '#d9d4c7', strong: '#b0aa9c', bg: '#f4f1e8', surface: '#fbf9f3', accent: '#b4562f', info: '#2f6fb0', success: '#3d7d4a', warning: '#a5741b', error: '#b23b31', dark: false }

function read(): Palette3D {
  if (typeof document === 'undefined') return FALLBACK
  const probe = document.createElement('span')
  probe.style.display = 'none'
  document.body.appendChild(probe)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const out = { ...FALLBACK }
  for (const [k, v] of Object.entries(TOKENS) as [keyof typeof TOKENS, string][]) {
    probe.style.color = `var(${v})`
    const css = getComputedStyle(probe).color
    if (!ctx || !css) continue
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    out[k] = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  }
  probe.remove()
  const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) * 0.299 + parseInt(hex.slice(3, 5), 16) * 0.587 + parseInt(hex.slice(5, 7), 16) * 0.114
  out.dark = lum(out.bg) < 128
  return out
}

export function usePalette3D(): Palette3D {
  const [p, setP] = useState<Palette3D>(() => read())
  useEffect(() => {
    const update = () => setP(read())
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-style', 'data-palette', 'data-mode', 'data-kit'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', update)
    return () => {
      mo.disconnect()
      mq.removeEventListener('change', update)
    }
  }, [])
  return p
}

export function useReducedMotion() {
  const [r, setR] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const on = () => setR(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return r
}

/** Can this browser draw WebGL at all? */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Mix two hex colours: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `#${pa.map((x, i) => Math.round(x + (pb[i] - x) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('')}`
}
