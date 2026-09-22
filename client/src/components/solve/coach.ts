import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

export interface CoachIssue {
  line?: number
  severity: 'error' | 'warning' | 'info'
  message: string
}
export interface CoachInsight {
  summary: string
  approach: string
  time: string
  space: string
  fits: boolean | null
  progress: number
  issues: CoachIssue[]
  edgeCases: string[]
  nextStep: string
}
export interface CoachTest {
  label: string
  input: string
  expected: string
  why: string
}

const LIVE_KEY = 'nexora:coach:live'
const IDLE_MS = 6000
const MIN_GAP_MS = 45000

/**
 * The "AI that understands what you're doing": analyses the code on demand, or
 * live — after you pause typing — at most once every 45 s, and only when the
 * code changed meaningfully since the last look.
 */
export function useCoach({
  code,
  language,
  title,
  statement,
  template = '',
}: {
  code: string
  language: string
  title: string
  statement: string
  /** starter code — never analysed on its own */
  template?: string
}) {
  const [insight, setInsight] = useState<CoachInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [live, setLiveState] = useState(() => {
    try {
      return localStorage.getItem(LIVE_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const lastCode = useRef('')
  const lastAt = useRef(0)
  const [analysedAt, setAnalysedAt] = useState<number | null>(null)

  const analyse = useCallback(
    async (force = true) => {
      const src = code.trim()
      if (src.length < 30) return
      if (!force && Math.abs(src.length - lastCode.current.length) < 20 && src === lastCode.current) return
      lastCode.current = src
      lastAt.current = Date.now()
      setLoading(true)
      setError(null)
      try {
        const r = await api.post<{ insight: CoachInsight }>(
          '/api/ai/coach',
          { mode: 'insight', code, language, title, statement: statement.slice(0, 5000) },
          { timeoutMs: 60000 },
        )
        setInsight(r.insight)
        setAnalysedAt(Date.now())
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Coach unavailable')
      } finally {
        setLoading(false)
      }
    },
    [code, language, title, statement],
  )

  // Live mode: wait for an idle pause, respect the minimum gap.
  useEffect(() => {
    if (!live) return
    const src = code.trim()
    if (src.length < 60 || src === template.trim()) return
    const changed = Math.abs(src.length - lastCode.current.length) >= 25 || (src !== lastCode.current && lastCode.current === '')
    if (!changed) return
    const wait = Math.max(IDLE_MS, MIN_GAP_MS - (Date.now() - lastAt.current))
    const t = window.setTimeout(() => void analyse(false), wait)
    return () => window.clearTimeout(t)
  }, [code, live, analyse, template])

  const setLive = (v: boolean) => {
    setLiveState(v)
    try {
      localStorage.setItem(LIVE_KEY, v ? 'on' : 'off')
    } catch {
      /* ignore */
    }
  }

  const tests = useCallback(async () => {
    const r = await api.post<{ tests: CoachTest[] }>('/api/ai/coach', { mode: 'tests', title, statement: statement.slice(0, 5000), language }, { timeoutMs: 90000 })
    return r.tests ?? []
  }, [title, statement, language])

  const explain = useCallback(
    async (verdict: string, failing?: { input?: string; expected?: string; actual?: string; stderr?: string }) => {
      const r = await api.post<{ explanation: string }>(
        '/api/ai/coach',
        { mode: 'explain', code, language, title, statement: statement.slice(0, 4000), verdict, failing },
        { timeoutMs: 60000 },
      )
      return r.explanation
    },
    [code, language, title, statement],
  )

  const ask = useCallback(
    async (question: string) => {
      const r = await api.post<{ answer: string }>(
        '/api/ai/coach',
        { mode: 'ask', code, language, title, statement: statement.slice(0, 4000), question },
        { timeoutMs: 60000 },
      )
      return r.answer
    },
    [code, language, title, statement],
  )

  return { insight, loading, error, analyse, live, setLive, analysedAt, tests, explain, ask }
}

export type CoachApi = ReturnType<typeof useCoach>
