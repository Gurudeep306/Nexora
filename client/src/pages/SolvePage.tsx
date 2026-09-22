import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowLeft,
  Bot,
  Expand,
  ChevronsDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUp,
  Code2,
  Loader2,
  Play,
  ScrollText,
  Send,
  TerminalSquare,
  Wand2,
  Sparkles,
} from 'lucide-react'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingBlock,
  Tabs,
  Tooltip,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { CodeEditor } from '@/components/solve/CodeEditor'
import { ProblemPanel } from '@/components/solve/ProblemPanel'
import { TestcaseDeck } from '@/components/solve/TestcaseDeck'
import { JudgeResults, RunOutput } from '@/components/solve/ResultsPanel'
import { VerdictBanner } from '@/components/solve/VerdictBanner'
import { AiTutorModal } from '@/components/solve/AiTutorModal'
import { sanitizeHtml } from '@/components/ailab/sanitize'
import type { ReplayEvent } from '@/components/submissions/replay'
import {
  loadStoredCode,
  storeCode,
  XP_BY_RATING,
  type AiFixResponse,
  type JudgeResponse,
  type Language,
  type ProblemDetailResponse,
  type RunResult,
  type StatementResponse,
  type Testcase,
  type CustomProblemResponse,
} from '@/components/solve/types'

import { DEFAULT_CODE } from '@/lib/templates'
import { LanguagePicker } from '@/components/solve/LanguagePicker'
import { Workspace } from '@/components/solve/workspace/Workspace'
import { useWorkspace } from '@/components/solve/workspace/useWorkspace'
import { LayoutMenu } from '@/components/solve/workspace/LayoutMenu'
import { useCoach } from '@/components/solve/coach'
import { CoachPanel } from '@/components/solve/CoachPanel'
import { Arena, enterBrowserFullscreen } from '@/components/solve/Arena'

function useIsDesktop() {
  const q = '(min-width: 1024px)'
  const [v, setV] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setV(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return v
}
import { parseDiagnostics } from '@/lib/diagnostics'

/* Workshop statements are "plain text or HTML" — render both safely */
function richText(raw: string | undefined): string {
  const text = (raw ?? '').trim()
  if (!text) return ''
  if (/<[a-z][\s\S]*>/i.test(text)) return sanitizeHtml(text)
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return esc
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function parseList<T>(raw: string | undefined): T[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? (v as T[]) : []
  } catch {
    return []
  }
}

/** Adapts a Workshop custom problem to the platform-problem shapes the IDE renders. */
function adaptCustom(res: CustomProblemResponse): { detail: ProblemDetailResponse; statement: StatementResponse } {
  const p = res.problem
  const samples = parseList<{ input?: string; output?: string }>(p.samples)
    .filter((x) => (x.input ?? '') !== '' || (x.output ?? '') !== '')
    .map((x) => ({ input: x.input ?? '', output: x.output ?? '' }))
  const hidden = parseList<{ input?: string; output?: string; expected_output?: string }>(p.testcases)
    .filter((x) => (x.input ?? '') !== '' || (x.expected_output ?? x.output ?? '') !== '')
  const testcases: Testcase[] = [
    ...samples.map((x, i) => ({ label: `Sample ${i + 1}`, input: x.input, expected_output: x.output })),
    ...hidden.map((x, i) => ({ label: `Hidden ${i + 1}`, input: x.input ?? '', expected_output: x.expected_output ?? x.output ?? '' })),
  ]
  return {
    detail: {
      ok: true,
      problem: {
        id: p.id,
        platform: 'custom',
        problem_id: `WS-${p.id}`,
        title: p.title,
        url: '',
        rating: p.difficulty ?? 0,
        tags: p.tags ?? '[]',
        category: 'workshop',
        solve_status: 'unsolved',
        attempts: null,
        xp_earned: null,
        notes: null,
      },
      testcases,
      submissions: [],
    },
    statement: {
      ok: true,
      statement: richText(p.statement),
      inputSpec: richText(p.input_spec),
      outputSpec: richText(p.output_spec),
      note: '',
      timeLimit: p.time_limit ?? '',
      memLimit: p.memory_limit ?? '',
      samples,
      platform: 'custom',
      source: p.creator ? `workshop · @${p.creator}` : 'workshop',
    },
  }
}

function stripHtml(html: string): string {
  const el = document.createElement('div')
  el.innerHTML = html
  return el.textContent ?? ''
}

export default function SolvePage({ custom = false }: { custom?: boolean }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const toast = useToast()

  const platformApi = useApi<ProblemDetailResponse>(
    () => api.get<ProblemDetailResponse>(`/api/problems/${id}`),
    [id],
    { skip: custom },
  )
  const platformStatementApi = useApi<StatementResponse>(
    () => api.get<StatementResponse>(`/api/problem-statement/${id}`, { timeoutMs: 90000 }),
    [id],
    { skip: custom },
  )
  const customApi = useApi<CustomProblemResponse>(
    () => api.get<CustomProblemResponse>(`/api/custom-problems/${id}`),
    [id],
    { skip: !custom },
  )
  const adapted = useMemo(() => (customApi.data ? adaptCustom(customApi.data) : null), [customApi.data])
  /* Workshop problems reuse the whole IDE; they're judged without problem_id (no XP) */
  const problemApi = useMemo(
    () =>
      custom
        ? { data: adapted?.detail ?? null, loading: customApi.loading, error: customApi.error, refetch: customApi.refetch }
        : { data: platformApi.data, loading: platformApi.loading, error: platformApi.error, refetch: platformApi.refetch },
    [custom, adapted, customApi.loading, customApi.error, customApi.refetch, platformApi.data, platformApi.loading, platformApi.error, platformApi.refetch],
  )
  const statementApi = custom
    ? { data: adapted?.statement ?? null, loading: customApi.loading, error: customApi.error }
    : platformStatementApi
  const storageId = custom ? `custom-${id}` : id
  const langsApi = useApi<Language[]>(() => api.get<Language[]>('/api/languages'), [])
  // Only offer languages the judge can actually run here.
  const languages = useMemo(() => (langsApi.data ?? []).filter((l) => l.available !== false), [langsApi.data])
  const isDesktop = useIsDesktop()
  const workspace = useWorkspace()
  const arena = workspace.arena
  const openArena = useCallback(() => {
    enterBrowserFullscreen()
    workspace.setArena(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const closeArena = useCallback(() => workspace.setArena(false), [workspace])
  // Alt+4 toggles the full-screen arena
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'Digit4') {
        e.preventDefault()
        if (workspace.arena) {
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
          workspace.setArena(false)
        } else openArena()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [workspace, openArena])

  const [language, setLanguage] = useState(
    () => localStorage.getItem('nexora:lang') ?? 'cpp',
  )
  const [code, setCode] = useState('')
  const [testcases, setTestcases] = useState<Testcase[]>([])
  const [selectedTest, setSelectedTest] = useState(0)
  const [customInput, setCustomInput] = useState('')
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [judgeResult, setJudgeResult] = useState<JudgeResponse | null>(null)
  const [runCase, setRunCase] = useState<{ label: string; expected: string } | null>(null)
  const [banner, setBanner] = useState<{ verdict: string; xp: number | null; id: number } | null>(null)
  const [bottomTab, setBottomTab] = useState<'tests' | 'output' | 'coach'>('tests')
  const [mobilePane, setMobilePane] = useState<'problem' | 'code'>('problem')
  const [splitPct, setSplitPct] = useState(46)
  const [tutorOpen, setTutorOpen] = useState(false)
  const [tutorSeed, setTutorSeed] = useState<string | null>(null)
  const [problemCollapsed, setProblemCollapsed] = useState(() => localStorage.getItem('nexora:panel:problem') === 'collapsed')
  const [bottomH, setBottomH] = useState(() => {
    const v = Number(localStorage.getItem('nexora:panel:bottom-h'))
    return Number.isFinite(v) && v >= 140 && v <= 900 ? v : 240
  })
  const [bottomCollapsed, setBottomCollapsed] = useState(false)
  const [aiInline, setAiInline] = useState(() => localStorage.getItem('nexora:ai-inline') !== 'off')

  /* ── Code replay recorder ──
     Starts from a snapshot of the document on the first change after a reset,
     so programmatic value swaps (language switch, AI fix) never corrupt it. */
  const replayRef = useRef<{ events: ReplayEvent[]; startedAt: number } | null>(null)
  const recordChange = useCallback((ev: ReplayEvent, fullText: string) => {
    const rec = replayRef.current
    if (!rec) {
      replayRef.current = {
        startedAt: Date.now(),
        events: [{ t: 0, changes: [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: fullText }] }],
      }
      return
    }
    rec.events.push({ ...ev, t: Date.now() - rec.startedAt })
  }, [])

  const splitRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const codeSectionRef = useRef<HTMLElement>(null)
  const bottomDraggingRef = useRef(false)
  const bottomHRef = useRef(bottomH)
  const autoImported = useRef(false)
  const codeInitialized = useRef('')

  const problem = problemApi.data?.problem ?? null
  const submissions = problemApi.data?.submissions ?? []
  const statementData = statementApi.data
  const samples = useMemo(() => statementData?.samples ?? [], [statementData])

  /* ── Testcases from server ── */
  useEffect(() => {
    if (problemApi.data) setTestcases(problemApi.data.testcases ?? [])
  }, [problemApi.data])

  /* ── Load persisted code per problem+language ── */
  useEffect(() => {
    const key = `${storageId}:${language}`
    if (codeInitialized.current === key) return
    codeInitialized.current = key
    const stored = loadStoredCode(storageId, language)
    setCode(stored ?? DEFAULT_CODE(language))
    replayRef.current = null
    setRunResult(null)
    setJudgeResult(null)
  }, [storageId, language])

  useEffect(() => {
    localStorage.setItem('nexora:lang', language)
  }, [language])

  /* ── Fall back to a supported language ── */
  useEffect(() => {
    const langs = languages
    if (!langs.length) return
    if (!langs.some((l) => l.id === language)) {
      setLanguage(langs.find((l) => l.compiled)?.id ?? langs[0].id)
    }
  }, [languages, language])

  /* ── Sample import ── */
  const importSamples = useCallback(
    async (indexes: number[]) => {
      if (custom) {
        const fresh = indexes
          .map((i) => samples[i] && { label: `Sample ${i + 1}`, input: samples[i]!.input, expected_output: samples[i]!.output })
          .filter((t): t is Testcase => !!t && !testcases.some((x) => x.label === t.label))
        if (fresh.length) setTestcases((prev) => [...prev, ...fresh])
        return fresh.length
      }
      let added = 0
      for (const i of indexes) {
        const s = samples[i]
        if (!s) continue
        try {
          await api.post('/api/testcases', {
            problem_rowid: Number(id),
            label: `Sample ${i + 1}`,
            input: s.input,
            expected_output: s.output,
          })
          added++
        } catch {
          /* keep going with the rest */
        }
      }
      if (added > 0) {
        problemApi.refetch()
        toast.success(`Imported ${added} sample${added > 1 ? 's' : ''} as testcases`)
      }
      return added
    },
    [samples, id, problemApi, toast, custom, testcases],
  )

  /* Auto-import samples when the problem has no testcases yet */
  useEffect(() => {
    if (autoImported.current || custom) return
    if (!problemApi.data || !statementApi.data) return
    const tcs = problemApi.data.testcases ?? []
    if (tcs.length > 0 || samples.length === 0) return
    autoImported.current = true
    void importSamples(samples.map((_, i) => i))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemApi.data, statementApi.data])

  const importedSampleCount = useMemo(
    () => testcases.filter((t) => /^Sample \d+$/i.test(t.label)).length,
    [testcases],
  )

  /* ── Run & Submit ── */
  const persistCode = useCallback(
    (c: string) => {
      setCode(c)
      storeCode(storageId, language, c)
    },
    [storageId, language],
  )

  const handleRun = useCallback(async () => {
    if (running || submitting || !code.trim()) return
    setRunning(true)
    setBottomTab('output')
    setRunResult(null)
    const tc = selectedTest >= 0 ? testcases[selectedTest] : undefined
    const input = tc ? tc.input : customInput
    setRunCase(tc ? { label: tc.label || `Test ${selectedTest + 1}`, expected: tc.expected_output ?? '' } : null)
    try {
      const res = await api.post<RunResult>(
        '/api/run',
        { code, input, language },
        { timeoutMs: 90000 },
      )
      setRunResult(res)
    } catch (err) {
      toast.error('Run failed', err instanceof Error ? err.message : undefined)
    } finally {
      setRunning(false)
    }
  }, [running, submitting, code, selectedTest, testcases, customInput, language, toast])

  /* Attach the recorded session to the submission the judge just stored */
  const saveReplay = useCallback(
    async (finalCode: string) => {
      const rec = replayRef.current
      replayRef.current = null
      if (!rec || rec.events.length <= 5) return
      const events: ReplayEvent[] =
        rec.events.length > 2000
          ? [{ t: 0, changes: [{ range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 }, text: finalCode }] }]
          : rec.events
      try {
        const detail = await api.get<ProblemDetailResponse>(`/api/problems/${id}`)
        const latest = detail.submissions?.[0]
        if (!latest) return
        await api.post('/api/code-replay', {
          submission_id: latest.id,
          events,
          duration_ms: Date.now() - rec.startedAt,
        })
      } catch {
        /* replay is a bonus — never block the verdict on it */
      }
    },
    [id],
  )

  const handleSubmit = useCallback(async () => {
    if (running || submitting || !code.trim()) return
    setSubmitting(true)
    setBottomTab('output')
    setJudgeResult(null)
    setBanner(null)
    storeCode(storageId, language, code)
    const alreadySolved = problem?.solve_status === 'solved'
    try {
      const res = await api.post<JudgeResponse>(
        '/api/judge',
        {
          problem_id: custom ? undefined : Number(id),
          code,
          language,
          testcases: testcases.map((t) => ({
            id: t.id,
            label: t.label,
            input: t.input,
            expected_output: t.expected_output,
          })),
        },
        { timeoutMs: 180000 },
      )
      setJudgeResult(res)
      if (!custom) void saveReplay(code)
      const xp = res.verdict === 'AC' && !alreadySolved && !custom ? XP_BY_RATING(problem?.rating ?? 0) : null
      setBanner({ verdict: res.verdict, xp, id: Date.now() })
      if (res.verdict === 'AC') {
        toast.success('Accepted!', xp ? `+${xp} XP awarded — nice solve.` : custom ? 'All workshop tests pass.' : 'Solved again — clean.')
        if (!custom) {
          void refresh()
          problemApi.refetch()
        }
      } else {
        toast.error(`Verdict: ${res.verdict}`, 'Check the testcase results below.')
      }
    } catch (err) {
      toast.error('Submit failed', err instanceof Error ? err.message : undefined)
      // Known backend quirk: the first submission that creates a progress row can
      // 500 AFTER the submission was recorded — refetch so the panel stays truthful.
      problemApi.refetch()
    } finally {
      setSubmitting(false)
    }
  }, [running, submitting, code, id, language, testcases, problem, toast, refresh, problemApi, custom, storageId, saveReplay])

  /* Global shortcuts (Monaco handles its own via addCommand) */
  const runRef = useRef(handleRun)
  runRef.current = handleRun
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) void submitRef.current()
        else void runRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ── AI assist ── */
  const lastError = useMemo(() => {
    if (judgeResult?.compileError) return judgeResult.compileError
    const failed = judgeResult?.results.find((r) => !r.passed)
    if (failed) {
      return `Testcase "${failed.label}" failed.\nInput:\n${failed.input}\nExpected:\n${failed.expected}\nActual:\n${failed.actual}\n${failed.stderr}`.slice(0, 3000)
    }
    if (runResult && runResult.verdict !== 'OK') {
      return [runResult.error, runResult.stderr].filter(Boolean).join('\n').slice(0, 3000)
    }
    return 'The code does not produce the expected output on the tests.'
  }, [judgeResult, runResult])

  /* Line-accurate markers for the editor gutter (compile errors + runtime crashes) */
  const diagnostics = useMemo(() => {
    if (judgeResult?.compileError) return parseDiagnostics(judgeResult.compileError)
    if (runResult && runResult.verdict !== 'OK') {
      return parseDiagnostics([runResult.error, runResult.stderr].filter(Boolean).join('\n'))
    }
    return []
  }, [judgeResult, runResult])

  const handleAiFix = useCallback(async () => {
    if (fixing || !code.trim()) return
    setFixing(true)
    try {
      const res = await api.post<AiFixResponse>(
        '/api/ai-fix',
        { code, language, error: lastError },
        { timeoutMs: 120000 },
      )
      if (res.ok && res.code) {
        persistCode(res.code)
        toast.success('AI fix applied', 'Review the diff in the editor, then run again.')
      } else {
        toast.warning('No fix', res.error ?? 'AI could not safely fix this code.')
      }
    } catch (err) {
      toast.error('AI fix failed', err instanceof Error ? err.message : undefined)
    } finally {
      setFixing(false)
    }
  }, [fixing, code, language, lastError, persistCode, toast])

  const statementText = useMemo(
    () => stripHtml(statementApi.data?.statement ?? ''),
    [statementApi.data],
  )

  /* ── AI coach: watches the code and explains what it sees ── */
  const coachStatement = useMemo(() => {
    const d = statementApi.data
    if (!d) return ''
    return stripHtml([d.statement, d.inputSpec ? `<p>INPUT:</p>${d.inputSpec}` : '', d.outputSpec ? `<p>OUTPUT:</p>${d.outputSpec}` : ''].join(' '))
  }, [statementApi.data])
  const coach = useCoach({
    code,
    language,
    title: problem?.title ?? '',
    statement: coachStatement,
    template: DEFAULT_CODE(language),
  })
  const allDiagnostics = useMemo(() => {
    const ai = (coach.insight?.issues ?? [])
      .filter((i) => i.line && i.line > 0 && i.severity !== 'info')
      .map((i) => ({ line: i.line as number, column: 1, message: `Coach: ${i.message}`, severity: i.severity === 'error' ? ('error' as const) : ('warning' as const) }))
    return [...diagnostics, ...ai]
  }, [diagnostics, coach.insight])

  /* ── Testcase mutations ── */
  const addTestcase = useCallback(
    async (tc: { label: string; input: string; expected_output: string }) => {
      if (custom) {
        setTestcases((prev) => [...prev, tc])
        setSelectedTest(testcases.length)
        return true
      }
      try {
        const res = await api.post<{ ok: boolean; id?: number }>('/api/testcases', {
          problem_rowid: Number(id),
          ...tc,
        })
        setTestcases((prev) => [...prev, { id: res.id, ...tc }])
        setSelectedTest(testcases.length)
        return true
      } catch (err) {
        toast.error('Could not add testcase', err instanceof Error ? err.message : undefined)
        return false
      }
    },
    [id, testcases.length, toast, custom],
  )

  const deleteTestcase = useCallback(
    async (tcId: number) => {
      try {
        await api.delete(`/api/testcases/${tcId}`)
        setTestcases((prev) => prev.filter((t) => t.id !== tcId))
        setSelectedTest(0)
      } catch (err) {
        toast.error('Could not delete testcase', err instanceof Error ? err.message : undefined)
      }
    },
    [toast],
  )

  /* ── Split drag ── */
  const onSplitMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !splitRef.current) return
    const rect = splitRef.current.getBoundingClientRect()
    const pct = ((e.clientX - rect.left) / rect.width) * 100
    setSplitPct(Math.min(75, Math.max(25, pct)))
  }, [])

  /* ── Bottom panel: vertical resize + collapse ── */
  const onBottomMove = useCallback((e: React.PointerEvent) => {
    if (!bottomDraggingRef.current || !codeSectionRef.current) return
    const rect = codeSectionRef.current.getBoundingClientRect()
    const h = Math.min(Math.max(140, rect.bottom - e.clientY), rect.height - 240)
    bottomHRef.current = Math.round(h)
    setBottomH(bottomHRef.current)
  }, [])

  const endBottomDrag = useCallback(() => {
    if (!bottomDraggingRef.current) return
    bottomDraggingRef.current = false
    localStorage.setItem('nexora:panel:bottom-h', String(bottomHRef.current))
  }, [])

  const toggleProblemCollapsed = useCallback(() => {
    setProblemCollapsed((c) => {
      localStorage.setItem('nexora:panel:problem', c ? 'open' : 'collapsed')
      return !c
    })
  }, [])

  const toolbar = (
    <div className="card-neon flex flex-wrap items-center gap-2 px-3 py-2">
      <Tooltip label={custom ? 'Back to workshop' : 'Back to problems'}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate(custom ? '/workshop' : '/problems')}
          aria-label={custom ? 'Back to workshop' : 'Back to problems'}
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
      </Tooltip>
      <span className="hidden min-w-0 items-center gap-2 md:flex">
        <TerminalSquare className="size-4 shrink-0 text-primary-bright" aria-hidden="true" />
        <span className="max-w-56 truncate font-display text-xs tracking-wider text-foreground uppercase lg:max-w-96">
          {problem?.title ?? `Solve #${id}`}
        </span>
      </span>
      {coach.insight && (
        <Tooltip label={coach.insight.summary}>
          <button
            onClick={() => {
              setBottomTab('coach')
              workspace.minimize('tests', false)
            }}
            className="hidden h-7 max-w-72 cursor-pointer items-center gap-1.5 truncate rounded-full border border-primary/25 bg-primary/10 px-2.5 text-[11px] text-primary-bright transition-colors hover:border-primary/50 xl:flex"
          >
            <Bot className="size-3.5 shrink-0" />
            <span className="truncate">{coach.insight.approach}</span>
            <span className={cn('font-mono', coach.insight.fits === false ? 'text-[#f87171]' : 'text-foreground-dim')}>{coach.insight.time}</span>
          </button>
        </Tooltip>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {isDesktop && <LayoutMenu api={workspace} />}
        <Tooltip label="Full-screen arena — just the editor, problem & tests (Alt+4)">
          <Button variant="ghost" size="icon-sm" onClick={openArena} aria-label="Open full-screen arena">
            <Expand aria-hidden="true" />
          </Button>
        </Tooltip>
        <LanguagePicker
          languages={languages.length ? languages : [{ id: language, label: language, ext: '', compiled: true }]}
          value={language}
          onChange={setLanguage}
        />

        <Tooltip label={aiInline ? 'AI autocomplete on — Tab to accept ghost text' : 'AI autocomplete off'}>
          <Button
            variant={aiInline ? 'subtle' : 'ghost'}
            size="icon-sm"
            onClick={() => {
              const next = !aiInline
              setAiInline(next)
              localStorage.setItem('nexora:ai-inline', next ? 'on' : 'off')
            }}
            aria-pressed={aiInline}
            aria-label="Toggle AI autocomplete"
          >
            <Sparkles aria-hidden="true" className={cn(aiInline && 'text-cyan')} />
          </Button>
        </Tooltip>
        <Tooltip label="AI fix — repair failing code">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleAiFix()}
            loading={fixing}
            aria-label="AI fix my code"
          >
            {!fixing && <Wand2 aria-hidden="true" />} Fix
          </Button>
        </Tooltip>
        <Tooltip label="AI tutor — hints & explanations">
          <Button variant="outline" size="sm" onClick={() => setTutorOpen(true)} aria-label="Open AI tutor">
            <Bot aria-hidden="true" /> Tutor
          </Button>
        </Tooltip>

        <Button
          variant="subtle"
          size="sm"
          onClick={() => void handleRun()}
          loading={running}
          disabled={submitting}
          aria-label="Run code against selected input"
        >
          {!running && <Play aria-hidden="true" />} RUN
          <kbd className="ml-1 hidden rounded border border-border bg-background px-1 font-mono text-[9px] text-foreground-faint lg:inline">
            ⌘↵
          </kbd>
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleSubmit()}
          loading={submitting}
          disabled={running}
          aria-label="Submit code to judge"
        >
          {!submitting && <Send aria-hidden="true" />} SUBMIT
        </Button>
      </div>
    </div>
  )

  if (problemApi.error) {
    return (
      <div>
        {toolbar}
        <ErrorState message={problemApi.error} onRetry={problemApi.refetch} />
      </div>
    )
  }

  const problemContent = problemApi.loading ? (
  <LoadingBlock rows={8} className="p-4" />
) : (
  <ProblemPanel
    problem={problem}
    statement={statementApi.data}
    statementLoading={statementApi.loading}
    statementError={statementApi.error}
    submissions={submissions}
    onImportSample={(i) => void importSamples([i])}
    onImportAllSamples={() => void importSamples(samples.map((_, i) => i))}
    importedSampleCount={importedSampleCount}
    custom={custom}
  />
)

  const editorEl = (
    <CodeEditor
      value={code}
      language={language}
      onChange={persistCode}
      onRunShortcut={() => void handleRun()}
      onSubmitShortcut={() => void handleSubmit()}
      aiInline={aiInline}
      onRecord={recordChange}
      diagnostics={allDiagnostics}
      minimal={arena}
      focusMode={arena}
      onFocusMode={arena ? closeArena : openArena}
      onExplain={(sel) => {
        setTutorSeed(`Explain what this code does, line by line:\n\`\`\`${language}\n${sel.slice(0, 2000)}\n\`\`\``)
        setTutorOpen(true)
      }}
    />
  )

  const testsTabs = (className?: string) => (
  <Tabs
    variant="pills"
    className={className}
    active={bottomTab}
    onChange={(t) => setBottomTab(t as 'tests' | 'output' | 'coach')}
    items={[
      { id: 'tests', label: 'test/', icon: <Code2 className="size-3.5" />, badge: testcases.length },
      {
        id: 'output',
        label: 'stdout',
        icon: <TerminalSquare className="size-3.5" />,
        badge: runResult || judgeResult ? '•' : undefined,
      },
      {
        id: 'coach',
        label: 'coach',
        icon: coach.loading ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />,
        badge: coach.insight?.issues.length ? coach.insight.issues.length : undefined,
      },
    ]}
  />
  )

  const testsBody = (
  <div className="h-full min-h-0 flex-1 overflow-y-auto">
    {bottomTab === 'coach' ? (
      <CoachPanel coach={coach} judgeResult={judgeResult} onAddTest={addTestcase} />
    ) : bottomTab === 'tests' ? (
      <TestcaseDeck
        testcases={testcases}
        selectedIndex={selectedTest}
        onSelect={setSelectedTest}
        customInput={customInput}
        onCustomInput={setCustomInput}
        onAdd={addTestcase}
        onDelete={deleteTestcase}
      />
    ) : running || submitting ? (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-foreground-faint">
        <Loader2 className="size-5 animate-spin text-primary-bright" aria-hidden="true" />
        {submitting ? 'Judging against all testcases…' : 'Running your code…'}
      </div>
    ) : judgeResult ? (
      <JudgeResults result={judgeResult} />
    ) : runResult ? (
      <RunOutput result={runResult} expected={runCase?.expected} caseLabel={runCase?.label} />
    ) : (
      <EmptyState
        className="py-6"
        icon={<TerminalSquare />}
        title="No output yet"
        description="Hit RUN (⌘/Ctrl + Enter) or SUBMIT to see results here."
      />
    )}
  </div>
  )

  const bottomPanel = (
    <div
      className="card-neon flex min-h-0 flex-col"
      style={bottomCollapsed ? undefined : { height: bottomH }}
    >
      {/* Vertical resize handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize tests panel"
        tabIndex={0}
        onPointerDown={(e) => {
          bottomDraggingRef.current = true
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') setBottomH((h) => Math.min(900, h + 16))
          if (e.key === 'ArrowDown') setBottomH((h) => Math.max(140, h - 16))
        }}
        className="group flex h-2.5 shrink-0 cursor-ns-resize items-center justify-center"
      >
        <span className="h-1 w-10 rounded-full bg-border transition-colors duration-150 group-hover:bg-primary group-active:bg-primary-bright" />
      </div>
      <div className="flex items-center gap-2 pr-2">
        {testsTabs('m-2 w-auto self-start')}
        <button
          onClick={() => setBottomCollapsed((c) => !c)}
          aria-label={bottomCollapsed ? 'Expand tests panel' : 'Minimize tests panel'}
          title={bottomCollapsed ? 'Expand panel' : 'Minimize panel'}
          className="ml-auto flex size-6 items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-surface-2 hover:text-primary"
        >
          {bottomCollapsed ? <ChevronsUp className="size-4" /> : <ChevronsDown className="size-4" />}
        </button>
      </div>
      {!bottomCollapsed && testsBody}
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-[calc(100dvh-8rem)] min-h-[560px] flex-col gap-3"
    >
      {toolbar}

      {arena ? (
        <>
          <div className="card-neon flex flex-1 flex-col items-center justify-center gap-3 text-sm text-foreground-dim">
            <Expand className="size-6 text-primary-bright" />
            You're in the full-screen arena.
            <Button variant="subtle" size="sm" onClick={() => workspace.setArena(false)}>
              Back to the normal layout
            </Button>
          </div>
          <Arena
            api={workspace}
            title={problem?.title ?? `Problem #${id}`}
            languagePicker={
              <LanguagePicker
                languages={languages.length ? languages : [{ id: language, label: language, ext: '', compiled: true }]}
                value={language}
                onChange={setLanguage}
              />
            }
            overlay={<VerdictBanner verdict={banner?.verdict ?? null} xpEarned={banner?.xp} burstId={banner?.id} onDismiss={() => setBanner(null)} />}
            problem={{ title: 'Problem', icon: <ScrollText />, content: <div className="h-full overflow-hidden">{problemContent}</div> }}
            tests={{
              title: 'Tests',
              icon: <Code2 />,
              headerExtra: testsTabs('ml-1 flex-nowrap p-0.5 [&_button]:py-1 [&_button]:text-[12px]'),
              content: testsBody,
            }}
            editor={editorEl}
            running={running}
            submitting={submitting}
            onRun={() => void handleRun()}
            onSubmit={() => void handleSubmit()}
            onExit={closeArena}
          />
        </>
      ) : isDesktop ? (
        <Workspace
          api={workspace}
          overlay={<VerdictBanner verdict={banner?.verdict ?? null} xpEarned={banner?.xp} burstId={banner?.id} onDismiss={() => setBanner(null)} />}
          problem={{ title: 'Problem', icon: <ScrollText />, content: <div className="h-full overflow-hidden">{problemContent}</div> }}
          tests={{
            title: 'Tests',
            icon: <Code2 />,
            headerExtra: testsTabs('ml-1 flex-nowrap p-0.5 [&_button]:py-1 [&_button]:text-[12px]'),
            content: testsBody,
          }}
          editor={editorEl}
        />
      ) : (
      <>
      {/* Mobile pane switch */}
      <Tabs
        variant="pills"
        className="self-start lg:hidden"
        active={mobilePane}
        onChange={(t) => setMobilePane(t as 'problem' | 'code')}
        items={[
          { id: 'problem', label: 'Problem', icon: <ScrollText className="size-3.5" /> },
          { id: 'code', label: 'Code', icon: <Code2 className="size-3.5" /> },
        ]}
      />

      <div
        ref={splitRef}
        className="relative flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0"
        style={{ '--split': `${splitPct}%` } as CSSProperties}
        onPointerMove={onSplitMove}
        onPointerUp={() => (draggingRef.current = false)}
        onPointerLeave={() => (draggingRef.current = false)}
      >
        <VerdictBanner verdict={banner?.verdict ?? null} xpEarned={banner?.xp} burstId={banner?.id} onDismiss={() => setBanner(null)} />

        {/* Problem pane: full panel or minimized rail */}
        {problemCollapsed ? (
          <button
            onClick={toggleProblemCollapsed}
            aria-label="Expand problem panel"
            title={problem?.title ?? 'Expand problem panel'}
            className="card-neon group hidden w-12 shrink-0 flex-col items-center gap-3 overflow-hidden py-4 lg:flex"
          >
            <ChevronsRight className="size-4 shrink-0 text-foreground-faint transition-colors group-hover:text-primary" />
            <span className="min-h-0 flex-1 truncate text-xs text-foreground-faint [writing-mode:vertical-rl] rotate-180">
              {problem?.title ?? 'Problem'}
            </span>
            <ScrollText className="size-4 shrink-0 text-foreground-faint/60" />
          </button>
        ) : (
          <section
            aria-label="Problem statement"
            className={cn(
              'card-neon relative min-h-0 flex-col overflow-hidden lg:flex lg:w-[var(--split)]',
              mobilePane === 'problem' ? 'flex flex-1' : 'hidden',
            )}
          >
            <button
              onClick={toggleProblemCollapsed}
              aria-label="Minimize problem panel"
              title="Minimize panel"
              className="absolute right-2.5 top-2.5 z-20 hidden size-7 items-center justify-center rounded-md border border-border bg-background/80 text-foreground-faint backdrop-blur transition-colors hover:border-primary hover:text-primary lg:flex"
            >
              <ChevronsLeft className="size-4" />
            </button>
            {problemContent}
          </section>
        )}

        {/* Draggable divider (desktop) */}
        {!problemCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panes"
            tabIndex={0}
            onPointerDown={(e) => {
              draggingRef.current = true
              ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setSplitPct((p) => Math.max(25, p - 2))
              if (e.key === 'ArrowRight') setSplitPct((p) => Math.min(75, p + 2))
            }}
            className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center lg:flex"
          >
            <span className="h-10 w-1 rounded-full bg-border transition-colors duration-150 group-hover:bg-primary group-active:bg-primary-bright" />
          </div>
        )}

        {/* Editor + results pane */}
        <section
          ref={codeSectionRef}
          aria-label="Code editor and results"
          onPointerMove={onBottomMove}
          onPointerUp={endBottomDrag}
          onPointerLeave={endBottomDrag}
          className={cn(
            'min-h-0 flex-1 flex-col gap-3 lg:flex',
            mobilePane === 'code' ? 'flex' : 'hidden',
          )}
        >
          <div className="card-neon min-h-40 flex-1 overflow-hidden">
            {editorEl}
          </div>
          {bottomPanel}
        </section>
      </div>

      </>
      )}

      <AiTutorModal
        open={tutorOpen}
        onClose={() => {
          setTutorOpen(false)
          setTutorSeed(null)
        }}
        statementText={statementText}
        problemTitle={problem?.title ?? `Problem #${id}`}
        seed={tutorSeed}
      />
    </motion.div>
  )
}
