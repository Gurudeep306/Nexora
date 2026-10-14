import { useEffect, useState } from 'react'

/** Theme tokens resolved for SVG charts; re-read whenever the look changes. */
export interface GateChartColors {
  accent: string
  good: string
  bad: string
  warn: string
  grid: string
  axis: string
  ink: string
  surface: string
  /** Fixed-order categorical hues (identity, never rank). */
  series: string[]
}

const TOKENS = {
  accent: '--color-accent-brand',
  good: '--color-state-success',
  bad: '--color-state-error',
  warn: '--color-state-warning',
  grid: '--color-border',
  axis: '--color-text-muted',
  ink: '--color-text-primary',
  surface: '--color-bg-surface-1',
} as const

const SERIES = ['--color-accent-brand', '--color-cyan', '--color-gold', '--color-success', '--color-streak', '--color-info', '--color-primary-bright', '--color-warning']

function read(): GateChartColors {
  const s = getComputedStyle(document.documentElement)
  const get = (n: string) => s.getPropertyValue(n).trim() || 'currentColor'
  const out = Object.fromEntries(Object.entries(TOKENS).map(([k, v]) => [k, get(v)])) as Omit<GateChartColors, 'series'>
  return { ...out, series: SERIES.map(get) }
}

export function useGateChartColors(): GateChartColors {
  const [c, setC] = useState<GateChartColors>(() =>
    typeof document === 'undefined'
      ? { accent: '', good: '', bad: '', warn: '', grid: '', axis: '', ink: '', surface: '', series: [] }
      : read(),
  )
  useEffect(() => {
    const mo = new MutationObserver(() => setC(read()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-palette', 'data-mode', 'data-accent', 'style'] })
    return () => mo.disconnect()
  }, [])
  return c
}
