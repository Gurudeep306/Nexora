import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Time spent on one question. Counts only while the tab is visible (switching
 * away pauses it) and while `running`. `read()` gives the exact ms without
 * waiting for the next tick; `seconds` re-renders once a second for display.
 */
export function useQuestionTimer(running: boolean) {
  const acc = useRef(0)
  const since = useRef<number | null>(null)
  const [seconds, setSeconds] = useState(0)

  const read = useCallback(() => acc.current + (since.current != null ? Date.now() - since.current : 0), [])

  useEffect(() => {
    const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
    const start = () => {
      if (since.current == null && visible()) since.current = Date.now()
    }
    const pause = () => {
      if (since.current != null) {
        acc.current += Date.now() - since.current
        since.current = null
      }
    }
    if (!running) {
      pause()
      return
    }
    start()
    const onVis = () => (visible() ? start() : pause())
    document.addEventListener('visibilitychange', onVis)
    const t = setInterval(() => setSeconds(Math.floor(read() / 1000)), 1000)
    return () => {
      pause()
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [running, read])

  return { seconds, read }
}

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function fmtDuration(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return '—'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
