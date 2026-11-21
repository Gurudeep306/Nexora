import { codeKey, mark as markLearn } from '@/learn/progress'
import { judgeOf } from '@/lib/sources'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ContestBar } from '@/components/contests/hosted/ContestBar'
import { AddToContest } from '@/components/contests/hosted/Pickers'
import { motion } from 'motion/react'
import {
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
  X, Footprints, Lightbulb, MessageCircleQuestion, MoreHorizontal } from 'lucide-react'
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
import { setFaviconMode, celebrateFavicon } from '@/lib/faviconFx'
import { CodeEditor } from '@/components/solve/CodeEditor'
import { ProblemPanel } from '@/components/solve/ProblemPanel'
import { TestcaseDeck } from '@/components/solve/TestcaseDeck'
import { JudgeResults, JudgingCard, RunOutput } from '@/components/solve/ResultsPanel'
import { VerdictBanner } from '@/components/solve/VerdictBanner'
import { agentTask, aiErrorText, plainAiText } from '@/lib/agent'
import { useAgentContext, useAgentPageContext } from '@/context/AgentContext'
import { sanitizeHtml } from '@/lib/sanitize'
import type { ReplayEvent } from '@/components/submissions/replay'
import {
  loadStoredCode,
  storeCode,
  type JudgeResponse,
  type Language,
  type ProblemDetailResponse,
  type RunResult,
  type StatementResponse,
  type Testcase,
  type CustomProblemResponse,
} from '@/components/solve/types'

import { DEFAULT_CODE } from '@/lib/templates'
import { useVoiceAction } from '@/voice/actions/useVoiceAction'
import { registerBuilder } from '@/voice/code/build'
import { activeCode } from '@/voice/code/active'
import { BuildSheet, type BuildRequest } from '@/voice/code/BuildSheet'
import { ExplainBack } from '@/voice/explain/ExplainBack'
import { useAutoTests } from '@/components/solve/useAutoTests'
import { LanguagePicker } from '@/components/solve/LanguagePicker'
import { Workspace } from '@/components/solve/workspace/Workspace'
import { useWorkspace } from '@/components/solve/workspace/useWorkspace'
import { useCoach } from '@/components/solve/coach'
import { Arena, enterBrowserFullscreen } from '@/components/solve/Arena'
import { LayoutMenu } from '@/components/solve/workspace/LayoutMenu'
import { AiTestsPanel } from '@/components/solve/AiTestsPanel'
import { AnalysisPanel } from '@/components/solve/AnalysisPanel'
import { JourneyPanel } from '@/components/solve/journey/JourneyPanel'
import { DryRunPanel } from '@/components/solve/dryrun/DryRunPanel'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui'
import { Building2, GraduationCap, ListChecks, ListPlus, Trophy } from 'lucide-react'
import { AddToSetDialog, AskedAtDialog } from '@/components/problems/sets/SetDialogs'

type BottomTab = 'tests' | 'output' | 'dryrun' | 'aitests' | 'analysis' | 'journey' | 'coach' | 'issues'
const RESULT_VIEWS = [
  { id: 'result' as const, label: 'Result' },
  { id: 'analysis' as const, label: 'Analysis' },
]

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
import { explainError, parseDiagnostics, type Diag } from '@/lib/diagnostics'

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
    // A course problem's tests are open practice (its solutions are public too), so they
    // are not "hidden"; a Workshop problem's hidden tests reach only its author.
    ...hidden.map((x, i) => ({ label: p.learn ? `Test ${i + 1}` : `Hidden ${i + 1}`, input: x.input ?? '', expected_output: x.expected_output ?? x.output ?? '' })),
  ]
  return {
    detail: {
      ok: true,
      problem: {
        // Learn problems are keyed by slug; the IDE only needs a number here.
        id: typeof p.id === 'number' ? p.id : 0,
        platform: p.learn ? 'learn' : 'custom',
        problem_id: p.learn ? 'LEARN' : `WS-${p.id}`,
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
      platform: p.learn ? 'learn' : 'custom',
      source: p.learn ? `NexoraGuru Learn · ${p.learn.topic}` : p.creator ? `workshop · @${p.creator}` : 'workshop',
    },
  }
}

function stripHtml(html: string): string {
  // DOMParser documents are inert: unlike a detached <div>, nothing in them
  // loads or runs (no <img onerror>), so untrusted HTML is safe to parse here.
  return new DOMParser().parseFromString(html, 'text/html').body.textContent ?? ''
}

/** Identity of a testcase for de-duplication: content, never the label. */
const sampleKey = (input: string, expected: string) =>
  `${input.replace(/\r\n?/g, '\n').trim()}\u0000${expected.replace(/\r\n?/g, '\n').trim()}`

/**
 * The IDE. `custom` opens a Workshop problem and `learn` a NexoraGuru Learn
 * problem; both are judged on the problem's own tests without platform XP.
 */
export default function SolvePage({ custom: customProp = false, learn = false }: { custom?: boolean; learn?: boolean }) {
  const custom = customProp || learn
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  // Opened from a hosted contest: submits also count there (src/routes/hosted-contests.js).
  const contestId = learn ? null : Number(searchParams.get('contest')) || null
  const [addToContest, setAddToContest] = useState(false)
  const [addToSet, setAddToSet] = useState(false)
  const [askedAt, setAskedAt] = useState(false)
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
    () => api.get<CustomProblemResponse>(learn ? `/api/learn/problems/${id}` : `/api/custom-problems/${id}`),
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
  const storageId = learn ? `learn-${id}` : custom ? `custom-${id}` : id
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
  const [banner, setBanner] = useState<{ verdict: string; xp: number | null; id: number; examplesOnly?: boolean } | null>(null)
  const [bottomTab, setBottomTab] = useState<BottomTab>('tests')
  const [reveal, setReveal] = useState<{ line: number; id: number } | null>(null)
  const [mobilePane, setMobilePane] = useState<'problem' | 'code' | 'results'>('problem')
  const [splitPct, setSplitPct] = useState(46)
  const [problemCollapsed, setProblemCollapsed] = useState(() => localStorage.getItem('nexora:panel:problem') === 'collapsed')
  const [bottomH, setBottomH] = useState(() => {
    const v = Number(localStorage.getItem('nexora:panel:bottom-h'))
    return Number.isFinite(v) && v >= 140 && v <= 900 ? v : 240
  })
  const [bottomCollapsed, setBottomCollapsed] = useState(false)
  const [bottomHidden, setBottomHidden] = useState(() => localStorage.getItem('nexora:panel:bottom-hidden') === '1')
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

  /* ── Sample import ──
     Samples are matched on content, never on label: clicking "Import all"
     twice, or an auto-import racing a manual one, can never duplicate a case. */
  const existingKeys = useMemo(
    () => new Set(testcases.map((t) => sampleKey(t.input ?? '', t.expected_output ?? ''))),
    [testcases],
  )

  const importSamples = useCallback(
    async (indexes: number[]) => {
      const seen = new Set(existingKeys)
      const fresh = indexes
        .map((i) => {
          const s = samples[i]
          if (!s) return null
          const tc = { label: `Sample ${i + 1}`, input: s.input ?? '', expected_output: s.output ?? '' }
          const key = sampleKey(tc.input, tc.expected_output)
          if (seen.has(key) || (!tc.input.trim() && !tc.expected_output.trim())) return null
          seen.add(key)
          return tc
        })
        .filter((t): t is { label: string; input: string; expected_output: string } => t !== null)

      if (!fresh.length) return 0

      if (custom) {
        setTestcases((prev) => [...prev, ...fresh])
        return fresh.length
      }

      try {
        // One request for the whole batch — the server skips anything it already has.
        const res = await api.post<{ ok: boolean; added: number; skipped: number }>(
          '/api/testcases/bulk',
          { problem_rowid: Number(id), testcases: fresh },
        )
        const added = res?.added ?? 0
        if (added > 0) {
          problemApi.refetch()
          toast.success(`Imported ${added} sample${added > 1 ? 's' : ''} as testcases`)
        }
        return added
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not import the samples')
        return 0
      }
    },
    [samples, id, problemApi, toast, custom, existingKeys],
  )

  /* Auto-import samples the problem does not already have. Runs once per
     problem, and no longer gives up just because *some* testcase exists. */
  useEffect(() => {
    if (autoImported.current || custom) return
    if (!problemApi.data || !statementApi.data || samples.length === 0) return
    autoImported.current = true
    const stored = new Set(
      (problemApi.data.testcases ?? []).map((t) => sampleKey(t.input ?? '', t.expected_output ?? '')),
    )
    const missing = samples
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !stored.has(sampleKey(s.input ?? '', s.output ?? '')))
      .map(({ i }) => i)
    if (missing.length) void importSamples(missing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemApi.data, statementApi.data, samples.length])

  /** How many of the statement's samples are already stored as testcases. */
  const importedSampleCount = useMemo(
    () => samples.filter((s) => existingKeys.has(sampleKey(s.input ?? '', s.output ?? ''))).length,
    [samples, existingKeys],
  )

  /* ── Run & Submit ── */
  const persistCode = useCallback(
    (c: string) => {
      setCode(c)
      storeCode(storageId, language, c)
    },
    [storageId, language],
  )

  const handleRun = useCallback(async (only?: { input: string; label: string; expected: string }) => {
    if (running || submitting || !code.trim()) return
    setRunning(true)
    setBottomTab('output')
    setRunResult(null)
    const tc = only ? undefined : selectedTest >= 0 ? testcases[selectedTest] : undefined
    const input = only ? only.input : tc ? tc.input : customInput
    setRunCase(only ? { label: only.label, expected: only.expected } : tc ? { label: tc.label || `Test ${selectedTest + 1}`, expected: tc.expected_output ?? '' } : null)
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
    try {
      const res = await api.post<JudgeResponse>(
        '/api/judge',
        {
          problem_id: custom ? undefined : Number(id),
          // Workshop problems are judged against their stored tests (hidden
          // ones included) server-side; our list only adds extra cases.
          custom_problem_id: custom && !learn ? Number(id) : undefined,
          contest_id: contestId ?? undefined,
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
      if (contestId && res.contest && !res.contest.counted) toast.info('Not counted in the contest', res.contest.reason)
      if (!custom) void saveReplay(code)
      // Only what the server awarded: never a guess.
      const xp = res.xp ? res.xp.gainedXp || null : null
      const part = res.xp?.partial
      // Only the examples (and your own tests) ran: say so, never "Accepted".
      const examplesOnly = res.verdict === 'AC' && !!res.coverage && !res.coverage.full
      setBanner({ verdict: res.verdict, xp, id: Date.now(), examplesOnly })
      if (learn && id) markLearn(codeKey(id), res.verdict === 'AC' ? 'solved' : 'attempted')
      if (res.verdict === 'AC') {
        celebrateFavicon()
        if (examplesOnly) toast.success('Passed the examples', `${judgeOf(res.coverage!.judge)} full tests are not here${res.coverage!.pending ? ' yet' : ''}: see the Result tab.`)
        else toast.success('Accepted!', xp ? `+${xp} XP awarded — nice solve.` : learn ? 'All tests pass — marked solved in your course.' : custom ? 'All workshop tests pass.' : 'Solved again — clean.')
        if (!custom) {
          void refresh()
          problemApi.refetch()
        }
      } else if (part && part.passed > 0) {
        toast.error(`Verdict: ${res.verdict}`, `${part.passed} of ${part.total} tests passed${xp ? ` · +${xp} XP for that` : ''}. Pass them all for the full ${part.ofXp} XP.`)
        void refresh()
      } else {
        toast.error(`Verdict: ${res.verdict}`, res.message ?? 'Check the testcase results below.')
      }
    } catch (err) {
      toast.error('Submit failed', err instanceof Error ? err.message : undefined)
      // Known backend quirk: the first submission that creates a progress row can
      // 500 AFTER the submission was recorded — refetch so the panel stays truthful.
      problemApi.refetch()
    } finally {
      setSubmitting(false)
    }
  }, [running, submitting, code, id, language, testcases, toast, refresh, problemApi, custom, learn, storageId, saveReplay, contestId])

  /* Drive the animated browser-tab favicon: fast pulse while judging. */
  useEffect(() => {
    setFaviconMode(running || submitting ? 'busy' : 'idle')
  }, [running, submitting])

  /* Global shortcuts (Monaco handles its own via addCommand) */
  const runRef = useRef(handleRun)
  runRef.current = handleRun
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit
  // Voice and the ⌘K palette: run on the samples, submit after a confirm.
  useVoiceAction({ id: 'solve.run', title: 'Run the code', group: 'Code', hint: 'Ctrl+Enter', say: { en: ['run', 'run the code', 'run my code', 'code chalao', 'run karo', 'chalao'], hi: ['कोड चलाओ', 'रन करो'] }, risk: 'safe', keys: ['Ctrl', 'Enter'], run: () => void runRef.current() })
  useVoiceAction({ id: 'solve.submit', title: 'Submit to the judge', group: 'Code', hint: 'Ctrl+Shift+Enter', say: { en: ['submit', 'submit the code', 'submit my code', 'submit karo', 'judge pe bhejo'], hi: ['सबमिट करो'] }, risk: 'irreversible', keys: ['Ctrl', 'Shift', 'Enter'], run: () => void submitRef.current() })
  /* ── Explain-back: after Accepted, explain the solution (graded; counts towards mastery) ── */
  const [explainOpen, setExplainOpen] = useState(false)
  useVoiceAction(customProp ? null : { id: 'solve.explain', title: 'Explain it back', group: 'Code', say: { en: ['explain it back', 'explain back', 'explain my solution', 'let me explain', 'viva', 'main samjhata hoon', 'apna solution samjhao'] }, risk: 'safe', run: () => setExplainOpen(true) })
  /* ── Build mode by voice: "translate to python", "make it iterative" ── */
  const [buildReq, setBuildReq] = useState<BuildRequest | null>(null)
  useEffect(() => registerBuilder((cmd) => setBuildReq({ cmd, key: Date.now() })), [])
  const buildProblem = useMemo(() => (id ? { kind: learn ? ('learn' as const) : custom ? ('custom' as const) : ('platform' as const), id: String(id) } : null), [id, learn, custom])
  const buildSamples = useMemo(() => {
    const fromStatement = samples.map((x) => ({ input: x.input ?? '', output: x.output ?? '' }))
    return fromStatement.length ? fromStatement : testcases.filter((t) => t.expected_output != null).map((t) => ({ input: t.input, output: t.expected_output ?? '' }))
  }, [samples, testcases])
  const labelOf = useCallback((lid: string) => languages.find((l) => l.id === lid)?.label ?? lid, [languages])
  const applyBuilt = useCallback(
    (next: string, lang: string) => {
      if (lang !== language) {
        // A translation: keep the original under its own language and switch.
        storeCode(storageId, lang, next)
        setLanguage(lang)
        toast.success(`Now in ${labelOf(lang)}`, `Your ${labelOf(language)} code is still saved — switch back any time.`)
        return
      }
      // Same language: one edit, so Ctrl+Z brings the old code back.
      const ed = activeCode()?.editor()
      const model = ed?.getModel()
      if (ed && model) {
        ed.pushUndoStop()
        ed.executeEdits('voice-build', [{ range: model.getFullModelRange(), text: next }])
        ed.pushUndoStop()
      } else persistCode(next)
      toast.success('Change applied', 'Ctrl+Z puts your old code back.')
    },
    [language, storageId, labelOf, persistCode, toast],
  )
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
    if (judgeResult?.compileError) return parseDiagnostics(judgeResult.compileError, language)
    if (runResult && runResult.verdict !== 'OK') {
      return parseDiagnostics([runResult.error, runResult.stderr].filter(Boolean).join('\n'), language)
    }
    return []
  }, [judgeResult, runResult, language])
  /* An error the runner gave no line for (a C++ exception, a crash): still say what it means. */
  const errorHint = useMemo(() => {
    if (diagnostics.some((d) => d.hint)) return null
    const text = judgeResult?.compileError || (runResult && runResult.verdict !== 'OK' ? [runResult.error, runResult.stderr].filter(Boolean).join('\n') : '')
    return text ? explainError(text, language) : null
  }, [diagnostics, judgeResult, runResult, language])

  const handleAiFix = useCallback(async () => {
    if (fixing || !code.trim()) return
    setFixing(true)
    try {
      const res = await agentTask<{ code: string | null; reason?: string }>(
        'fix',
        { code, language, error: lastError },
        { timeoutMs: 120000 },
      )
      if (res.code) {
        persistCode(res.code)
        toast.success('AI fix applied', 'Review the diff in the editor, then run again.')
      } else {
        toast.warning('No fix', res.reason ? plainAiText(res.reason) : 'AI could not safely fix this code.')
      }
    } catch (err) {
      toast.error('AI fix failed', aiErrorText(err))
    } finally {
      setFixing(false)
    }
  }, [fixing, code, language, lastError, persistCode, toast])

  const statementText = useMemo(
    () => stripHtml(statementApi.data?.statement ?? ''),
    [statementApi.data],
  )

  /* ── Global assistant (⌘J): tell it what's on screen ──
     Platform problems are looked up server-side (statement + solved status);
     Workshop/Learn problems pass their visible statement. */
  const { openAssistant } = useAgentContext()
  const verdictText = useMemo(() => {
    if (judgeResult) {
      const passed = judgeResult.results.filter((r) => r.passed).length
      const head = `Submit: ${judgeResult.verdict} (${passed}/${judgeResult.results.length} tests passed)`
      if (judgeResult.verdict === 'AC') return head
      return `${head}\n${lastError}`.slice(0, 1500)
    }
    if (runResult) return `Run: ${runResult.verdict}${runResult.verdict !== 'OK' ? `\n${lastError}` : ''}`.slice(0, 1500)
    return undefined
  }, [judgeResult, runResult, lastError])
  useAgentPageContext({
    problemId: id,
    title: problem?.title,
    code: code.slice(0, 12000),
    language,
    verdict: verdictText,
    // Platform problems are looked up on the server; course/workshop problems send what's on screen.
    visibleText: custom ? statementText.slice(0, 6000) : undefined,
  })

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
  const allDiagnostics = useMemo((): Diag[] => {
    const ai = (coach.insight?.issues ?? [])
      .filter((i) => i.line && i.line > 0 && i.severity !== 'info')
      .map((i) => ({ line: i.line as number, column: 1, message: `AI check: ${i.message}`, severity: i.severity === 'error' ? ('error' as const) : ('warning' as const) }))
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

  /** Add many tests at once (file / paste / AI import); returns how many were new. */
  const addManyTestcases = useCallback(
    async (list: { label: string; input: string; expected_output: string }[]) => {
      const seen = new Set(testcases.map((t) => sampleKey(t.input ?? '', t.expected_output ?? '')))
      const fresh = list.filter((t) => {
        const k = sampleKey(t.input, t.expected_output)
        if (seen.has(k) || (!t.input.trim() && !t.expected_output.trim())) return false
        seen.add(k)
        return true
      })
      if (!fresh.length) return 0
      if (custom) {
        setTestcases((prev) => [...prev, ...fresh])
        return fresh.length
      }
      let added = 0
      try {
        for (let i = 0; i < fresh.length; i += 100) {
          const res = await api.post<{ added: number }>('/api/testcases/bulk', { problem_rowid: Number(id), testcases: fresh.slice(i, i + 100) })
          added += res?.added ?? 0
        }
      } catch (err) {
        toast.error('Could not add the tests', err instanceof Error ? err.message : undefined)
      }
      problemApi.refetch()
      return added
    },
    [testcases, custom, id, toast, problemApi],
  )

  /* ── Automatic AI tests: a problem with fewer than 10 tests gets a checked set ── */
  const autoTests = useAutoTests({
    key: storageId,
    ready: !!problemApi.data && !problemApi.loading && !!statementApi.data && !statementApi.loading,
    have: testcases.length,
    request: problem || adapted
      ? { problem_id: custom ? undefined : Number(id), custom_problem_id: custom && !learn ? Number(id) : undefined, title: problem?.title ?? '', statement: coachStatement, samples: samples.map((x) => ({ input: x.input ?? '', output: x.output ?? '' })), count: 24 }
      : null,
    add: addManyTestcases,
  })

  /** The largest inputs on hand, to time the code on. */
  const biggestInputs = useMemo(
    () =>
      [...testcases]
        .filter((t) => (t.input ?? '').length > 0)
        .sort((a, b) => (b.input ?? '').length - (a.input ?? '').length)
        .slice(0, 3)
        .map((t) => ({ label: t.label || 'Test', input: t.input })),
    [testcases],
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

  const toggleBottomHidden = useCallback(() => {
    setBottomHidden((h) => {
      localStorage.setItem('nexora:panel:bottom-hidden', h ? '0' : '1')
      return !h
    })
  }, [])

  // The dry run needs room to read: it opens at about two-thirds of the code
  // area (never smaller than the height you chose; your saved height is kept).
  const [roomForTests, setRoomForTests] = useState(0)
  const roomForDryRun = useCallback(() => setRoomForTests((n) => n + 1), [])
  // The dry run's cases: every test, then the custom input. "Dry run this"
  // on an example remounts the panel on that case.
  const dryRunCases = useMemo(
    () => [...testcases.map((t, i) => ({ label: t.label || `Test ${i + 1}`, input: t.input })), ...(customInput.trim() ? [{ label: 'Custom input', input: customInput }] : [])],
    [testcases, customInput],
  )
  const [dryRunFocus, setDryRunFocus] = useState(0)
  const [dryRunPick, setDryRunPick] = useState<number | null>(null)
  const dryRunStart = dryRunPick ?? (selectedTest >= 0 ? selectedTest : testcases.length)

  // The results panel has four tabs: Tests, Result (with Analysis), Dry run
  // and How it runs. Older names (aitests, analysis, coach, issues) still land
  // in the right place.
  const [subView, setSubView] = useState<{ tests: 'cases' | 'ai'; output: 'result' | 'analysis' }>({ tests: 'cases', output: 'result' })
  const openTab = (requested: BottomTab) => {
    const t: BottomTab = requested === 'aitests' ? 'tests' : requested === 'analysis' || requested === 'coach' || requested === 'issues' ? 'output' : requested
    if (requested === 'aitests') setSubView((v) => ({ ...v, tests: 'ai' }))
    if (requested === 'analysis' || requested === 'coach') setSubView((v) => ({ ...v, output: 'analysis' }))
    if (requested === 'output' || requested === 'issues') setSubView((v) => ({ ...v, output: 'result' }))
    setBottomTab(t)
    // On a phone the results live behind their own tab: go there.
    setMobilePane('results')
    workspace.minimize('tests', false)
    if (bottomHidden) toggleBottomHidden()
    if (t === 'dryrun' || t === 'journey') roomForDryRun()
  }
  // Alt+D opens the dry run.
  const openTabRef = useRef(openTab)
  openTabRef.current = openTab
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyD') {
        e.preventDefault()
        openTabRef.current('dryrun')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The three actions on the code. They sit in the top bar on a computer and
  // in a bar at the bottom of the screen on a phone (thumb reach).
  const actions = (compact: boolean) => (
    <>
      <Button variant="subtle" size="sm" onClick={() => openTab('dryrun')} aria-label="Dry run: watch your code run step by step (Alt+D)" title="Dry run: watch your code run step by step (Alt+D)" className={compact ? 'flex-1' : undefined}>
        <Footprints aria-hidden="true" /> <span className={compact ? undefined : 'hidden sm:inline'}>Dry run</span>
      </Button>
      <Button variant="subtle" size="sm" onClick={() => void handleRun()} loading={running} disabled={submitting} aria-label="Run on the selected test (Ctrl+Enter)" className={compact ? 'flex-1' : undefined}>
        {!running && <Play aria-hidden="true" />} <span className={compact ? undefined : 'hidden sm:inline'}>Run</span>
        {!compact && <kbd className="ml-0.5 hidden font-mono text-[10px] text-foreground-faint lg:inline">⌘↵</kbd>}
      </Button>
      <Button variant="primary" size="sm" onClick={() => void handleSubmit()} loading={submitting} disabled={running} aria-label="Submit to the judge (Ctrl+Shift+Enter)" className={compact ? 'flex-1' : undefined}>
        {!submitting && <Send aria-hidden="true" />} Submit
      </Button>
    </>
  )

  const lastErrorShown = (judgeResult && judgeResult.verdict !== 'AC') || (runResult && runResult.verdict !== 'OK')

  // AI help, in one menu in the editor header (not repeating the tabs).
  const helpMenu = (
    <Menu>
      <Tooltip label="AI help (⌘J asks the tutor)">
        <MenuTrigger asChild>
          <button type="button" aria-label="AI help" className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[12px] text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground">
            {fixing ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-3.5" aria-hidden="true" />} Help
          </button>
        </MenuTrigger>
      </Tooltip>
      <MenuContent className="w-64">
        <MenuLabel>AI help</MenuLabel>
        <MenuItem icon={<Lightbulb />} onSelect={() => openAssistant('Give me one small hint for this problem, the next step only. Do not give the solution or code.')}>
          Give me a hint
        </MenuItem>
        {lastErrorShown && (
          <MenuItem icon={<MessageCircleQuestion />} onSelect={() => openAssistant(`Explain this result in simple words and point to the line that causes it, without giving the full solution:\n${lastError.slice(0, 1500)}`)}>
            Explain my error
          </MenuItem>
        )}
        <MenuItem icon={<Wand2 />} onSelect={() => void handleAiFix()} disabled={fixing || !code.trim()}>
          Fix my code
        </MenuItem>
        {!customProp && (
          <MenuItem icon={<GraduationCap />} onSelect={() => setExplainOpen(true)}>
            Explain it back
          </MenuItem>
        )}
        <MenuItem icon={<Bot />} onSelect={() => openAssistant()} shortcut="⌘J">
          Ask the tutor
        </MenuItem>
      </MenuContent>
    </Menu>
  )

  const toolbar = (
    <div className="flex items-center gap-2 border-b border-border/70 pb-2.5">
      <span className="hidden min-w-0 items-center gap-2 md:flex">
        <span className="max-w-64 truncate text-[13.5px] font-medium text-foreground lg:max-w-[28rem]">{problem?.title ?? `Problem ${id}`}</span>
        {coach.insight && (
          <Tooltip label={coach.insight.summary}>
            <button
              type="button"
              onClick={() => openTab('analysis')}
              className="hidden h-6 max-w-72 cursor-pointer items-center gap-1.5 truncate rounded-full bg-surface-2 px-2.5 text-[11.5px] text-foreground-dim transition-colors hover:text-foreground xl:flex"
            >
              <span className="truncate">{coach.insight.approach}</span>
              <span className={cn('font-mono', coach.insight.fits === false ? 'text-state-error' : 'text-foreground-faint')}>{coach.insight.time}</span>
            </button>
          </Tooltip>
        )}
      </span>

      <div className="ml-auto flex min-w-0 items-center gap-1.5">
        <LanguagePicker languages={languages.length ? languages : [{ id: language, label: language, ext: '', compiled: true }]} value={language} onChange={setLanguage} />
        <span className="hidden items-center gap-1.5 lg:flex">{actions(false)}</span>
        {/* Layout and full screen, always in sight (they were inside the … menu). */}
        {isDesktop && <LayoutMenu api={workspace} />}
        <Tooltip label="Full screen (Alt+4)">
          <Button variant="ghost" size="icon-sm" aria-label="Full screen" onClick={openArena}>
            <Expand aria-hidden="true" />
          </Button>
        </Tooltip>
        <Menu>
          <Tooltip label="More">
            <MenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More: sets, contests and keys">
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </MenuTrigger>
          </Tooltip>
          <MenuContent className="w-72">
            {!learn && (
              <MenuItem icon={<Trophy />} onSelect={() => setAddToContest(true)}>
                Add to a contest
              </MenuItem>
            )}
            {!custom && (
              <>
                <MenuSeparator />
                <MenuLabel>Sets</MenuLabel>
                <MenuItem icon={<ListPlus />} onSelect={() => setAddToSet(true)}>
                  Add to a set
                </MenuItem>
                <MenuItem icon={<Building2 />} onSelect={() => setAskedAt(true)}>
                  I was asked this at…
                </MenuItem>
              </>
            )}
            <MenuSeparator />
            <MenuLabel>Keys</MenuLabel>
            <div className="space-y-1 px-2.5 pb-2 text-[11.5px] text-foreground-dim">
              {[
                ['Run', 'Ctrl/⌘ + Enter'],
                ['Submit', 'Ctrl/⌘ + Shift + Enter'],
                ['Dry run', 'Alt + D'],
                ['Full screen', 'Alt + 4'],
                ['Ask the tutor', 'Ctrl/⌘ + J'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                  <span>{k}</span>
                  <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10.5px] text-foreground">{v}</kbd>
                </div>
              ))}
            </div>
          </MenuContent>
        </Menu>
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
    analysis={problemApi.data?.analysis ?? null}
    onImportSample={(i) => void importSamples([i])}
    onImportAllSamples={() => void importSamples(samples.map((_, i) => i))}
    importedSampleCount={importedSampleCount}
    custom={custom}
    language={language}
    onRunSample={(i) => void handleRun({ input: samples[i]?.input ?? '', label: `Example ${i + 1}`, expected: samples[i]?.output ?? '' })}
    onDryRunSample={(i) => {
      const input = samples[i]?.input ?? ''
      const at = testcases.findIndex((t) => t.input.trim() === input.trim())
      if (at >= 0) {
        setSelectedTest(at)
        setDryRunPick(at)
      } else {
        setCustomInput(input)
        setDryRunPick(testcases.length)
      }
      setDryRunFocus((n) => n + 1)
      openTab('dryrun')
    }}
    onUseStarter={(starter) => {
      persistCode(starter)
      toast.success('Starter code inserted')
    }}
    learnSolution={
      learn && customApi.data?.problem.learn
        ? { slug: String(customApi.data.problem.id), editorial: customApi.data.problem.learn.editorial ?? null, solutions: customApi.data.problem.learn.solutions ?? {} }
        : problem?.platform === 'nexora' && statementApi.data?.extra?.solution
          ? { slug: `nx-${problem.id}`, editorial: statementApi.data.extra.solution.editorial ?? null, solutions: statementApi.data.extra.solution.solutions ?? {} }
          : undefined
    }
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
      onAiInlineChange={(on) => {
        setAiInline(on)
        localStorage.setItem('nexora:ai-inline', on ? 'on' : 'off')
      }}
      headerExtra={helpMenu}
      onIssuesClick={() => openTab('output')}
      onRecord={recordChange}
      diagnostics={allDiagnostics}
      reveal={reveal}
      minimal={arena}
      focusMode={arena}
      onFocusMode={arena ? closeArena : openArena}
      onExplain={(sel) => {
        openAssistant(`Explain what this code does, line by line:\n\`\`\`${language}\n${sel.slice(0, 2000)}\n\`\`\``, {
          page: { selection: sel.slice(0, 3000) },
        })
      }}
    />
  )

  const testsTabs = (className?: string) => (
  <Tabs
    variant="pills"
    className={className}
    active={bottomTab}
    onChange={(t) => openTab(t as BottomTab)}
    items={[
      { id: 'tests', label: 'Tests', badge: testcases.length || undefined },
      { id: 'output', label: 'Result', badge: running || submitting ? '•' : judgeResult ? judgeResult.verdict : runResult ? (runResult.verdict === 'OK' ? 'OK' : runResult.verdict) : allDiagnostics.length || undefined },
      { id: 'dryrun', label: 'Dry run' },
      { id: 'journey', label: 'How it runs' },
    ]}
  />
  )

  const issuesList = allDiagnostics.length > 0 && (
    <ul className="m-0 list-none space-y-1.5 p-0" aria-label="Issues in your code">
      {allDiagnostics.map((d, i) => (
        <li key={i}>
          <button
            type="button"
            onClick={() => setReveal({ line: d.line, id: Date.now() })}
            className="flex w-full cursor-pointer items-start gap-2 rounded-lg border border-hairline/[0.05] bg-bg-field px-2.5 py-2 text-left text-xs transition-colors hover:border-border"
          >
            <span className={cn('mt-1 size-1.5 shrink-0 rounded-full', d.severity === 'error' ? 'bg-destructive' : 'bg-warning')} aria-hidden="true" />
            <span className="shrink-0 font-mono text-foreground-faint tabular-nums">Ln {d.line}</span>
            <span className="min-w-0 text-foreground-dim">
              {d.hint && <span className="font-semibold text-foreground">{d.hint.label} · </span>}
              {d.message}
              {d.hint && <span className="mt-0.5 block text-foreground-faint">What it means: {d.hint.text}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  const resultBody =
    running || submitting ? (
      submitting ? (
        <JudgingCard count={testcases.length} label={`Judging on ${testcases.length ? `${testcases.length}+` : 'all'} tests…`} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 py-6 text-xs text-foreground-faint">
          <Loader2 className="size-5 animate-spin text-primary-bright" aria-hidden="true" />
          Running your code…
        </div>
      )
    ) : judgeResult ? (
      <JudgeResults result={judgeResult} onExplain={customProp ? undefined : () => setExplainOpen(true)} />
    ) : runResult ? (
      <RunOutput result={runResult} expected={runCase?.expected} caseLabel={runCase?.label} />
    ) : allDiagnostics.length ? null : (
      <EmptyState className="py-6" icon={<TerminalSquare />} title="Nothing run yet" description="Run checks the selected test (⌘/Ctrl + Enter). Submit checks them all." />
    )

  const testsBody = (
  <div className="h-full min-h-0 flex-1 overflow-y-auto">
    {bottomTab === 'tests' ? (
      <div>
        <SubSwitch
          label="Tests view"
          value={subView.tests}
          onChange={(v) => setSubView((s) => ({ ...s, tests: v }))}
          options={[
            { id: 'cases', label: 'Your tests' },
            { id: 'ai', label: 'Generate with AI' },
          ]}
        />
        {subView.tests === 'cases' && autoTests.kind !== 'idle' && (
          <p className={cn('m-0 flex items-center gap-2 border-b border-border/70 px-3 py-1.5 text-[12px]', autoTests.kind === 'error' ? 'text-state-warning' : 'text-foreground-dim')} role="status">
            {autoTests.kind === 'working' && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {autoTests.kind === 'working' && `Making more tests with AI — ${autoTests.step.replace(/^Only \d+ tests so far: /, '')}…`}
            {autoTests.kind === 'done' && (autoTests.added ? `Added ${autoTests.added} AI-checked tests, corner cases included.` : 'AI tests are ready.')}
            {autoTests.kind === 'error' && (
              <>
                Couldn’t make AI tests: {autoTests.message}{' '}
                <button type="button" className="cursor-pointer underline underline-offset-2" onClick={() => setSubView((v) => ({ ...v, tests: 'ai' }))}>
                  Try in Generate with AI
                </button>
              </>
            )}
          </p>
        )}
        {subView.tests === 'cases' ? (
          <TestcaseDeck
            testcases={testcases}
            selectedIndex={selectedTest}
            onSelect={setSelectedTest}
            customInput={customInput}
            onCustomInput={setCustomInput}
            onAdd={addTestcase}
            onDelete={deleteTestcase}
            onAddMany={addManyTestcases}
          />
        ) : (
          <AiTestsPanel
            problemId={custom ? undefined : Number(id)}
            customProblemId={custom && !learn ? Number(id) : undefined}
            title={problem?.title ?? ''}
            statement={coachStatement}
            samples={samples}
            code={code}
            language={language}
            onAddTests={addManyTestcases}
          />
        )}
      </div>
    ) : bottomTab === 'dryrun' ? (
      <DryRunPanel
        key={dryRunFocus}
        code={code}
        language={language}
        cases={dryRunCases}
        initialCase={dryRunStart}
        onJumpToLine={(line) => setReveal({ line, id: Date.now() })}
      />
    ) : bottomTab === 'journey' ? (
      <JourneyPanel
        code={code}
        language={language}
        input={selectedTest >= 0 && testcases[selectedTest] ? testcases[selectedTest].input : customInput}
        inputLabel={selectedTest >= 0 && testcases[selectedTest] ? testcases[selectedTest].label || `Test ${selectedTest + 1}` : 'your custom input'}
        onJumpToLine={(line) => setReveal({ line, id: Date.now() })}
      />
    ) : subView.output === 'analysis' ? (
      <div>
        <SubSwitch label="Result view" value={subView.output} onChange={(v) => setSubView((s) => ({ ...s, output: v }))} options={RESULT_VIEWS} />
        <AnalysisPanel
          problemId={custom ? undefined : Number(id)}
          customProblemId={custom && !learn ? Number(id) : undefined}
          title={problem?.title ?? ''}
          statement={coachStatement}
          code={code}
          language={language}
          timeLimit={statementApi.data?.timeLimit}
          inputs={biggestInputs}
          onJumpToLine={(line) => setReveal({ line, id: Date.now() })}
        />
      </div>
    ) : (
      <div className="space-y-3">
        <SubSwitch label="Result view" value={subView.output} onChange={(v) => setSubView((s) => ({ ...s, output: v }))} options={RESULT_VIEWS} />
        {errorHint && !running && !submitting && (
          <div className="mx-3 mt-3 rounded-lg border border-hairline/[0.05] bg-bg-field px-3 py-2 text-xs" role="note">
            <p className="m-0 font-semibold text-foreground">What it means: {errorHint.label}</p>
            <p className="m-0 mt-0.5 text-foreground-dim">{errorHint.text}</p>
          </div>
        )}
        {allDiagnostics.length > 0 && (
          <div className="px-3 pt-3">
            <p className="mb-1.5 text-[12px] font-semibold text-foreground-faint">
              {allDiagnostics.length} issue{allDiagnostics.length === 1 ? '' : 's'} in your code — click one to jump to its line
            </p>
            {issuesList}
          </div>
        )}
        {resultBody}
      </div>
    )}
  </div>
  )

  const bottomPanel = bottomHidden ? (
    <button
      onClick={toggleBottomHidden}
      aria-label="Show tests panel"
      title="Show tests panel"
      className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-[12px] text-foreground-faint transition-colors hover:text-foreground"
    >
      <ChevronsUp className="size-3.5 text-primary-bright" aria-hidden="true" />
      Show the tests panel
    </button>
  ) : (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background',
        // On a phone's Results tab the panel is the whole screen; elsewhere it
        // keeps the height you chose.
        !bottomCollapsed && (mobilePane === 'results' ? 'h-[var(--bh)] max-lg:h-auto max-lg:flex-1' : 'h-[var(--bh)]'),
      )}
      style={bottomCollapsed ? undefined : ({ '--bh': `${bottomH}px` } as React.CSSProperties)}
    >
      {/* Vertical resize handle */}
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize tests panel"
        aria-valuenow={bottomH}
        aria-valuemin={0}
        aria-valuemax={2000}
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
      <div className="flex items-center gap-2 border-b border-border/70 pr-2">
        {testsTabs('m-2 w-auto self-start')}
        <button
          onClick={toggleBottomHidden}
          aria-label="Hide tests panel"
          title="Hide panel"
          className="ml-auto flex size-6 items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-surface-2 hover:text-primary"
        >
          <X className="size-4" />
        </button>
        <button
          onClick={() => setBottomCollapsed((c) => !c)}
          aria-label={bottomCollapsed ? 'Expand tests panel' : 'Minimize tests panel'}
          title={bottomCollapsed ? 'Expand panel' : 'Minimize panel'}
          className="flex size-6 items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-surface-2 hover:text-primary"
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
      {contestId && <ContestBar id={contestId} />}
      {toolbar}
      {!learn && <AddToContest open={addToContest} onClose={() => setAddToContest(false)} kind={custom ? 'workshop' : 'problem'} refId={id} title={problem?.title || 'This problem'} />}
      {!custom && addToSet && <AddToSetDialog problemId={Number(id)} title={problem?.title || `Problem ${id}`} onClose={() => setAddToSet(false)} />}
      {!custom && askedAt && <AskedAtDialog problemId={Number(id)} title={problem?.title || `Problem ${id}`} onClose={() => setAskedAt(false)} />}
      {!customProp && <ExplainBack open={explainOpen} problem={buildProblem} code={code} language={language} onClose={() => setExplainOpen(false)} />}
      <BuildSheet request={buildReq} code={code} language={language} labelOf={labelOf} problem={buildProblem} samples={buildSamples} onClose={() => setBuildReq(null)} onUse={applyBuilt} />

      {arena ? (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border text-sm text-foreground-dim">
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
            overlay={<VerdictBanner verdict={banner?.verdict ?? null} examplesOnly={banner?.examplesOnly} xpEarned={banner?.xp} burstId={banner?.id} onDismiss={() => setBanner(null)} />}
            problem={{ title: 'Problem', icon: <ScrollText />, content: <div className="h-full overflow-hidden">{problemContent}</div> }}
            tests={{
              title: 'Console',
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
          roomForTests={roomForTests}
          overlay={<VerdictBanner verdict={banner?.verdict ?? null} examplesOnly={banner?.examplesOnly} xpEarned={banner?.xp} burstId={banner?.id} onDismiss={() => setBanner(null)} />}
          problem={{ title: 'Problem', icon: <ScrollText />, content: <div className="h-full overflow-hidden">{problemContent}</div> }}
          tests={{
            title: 'Console',
            icon: <Code2 />,
            headerExtra: testsTabs('ml-1 flex-nowrap p-0.5 [&_button]:py-1 [&_button]:text-[12px]'),
            content: testsBody,
          }}
          editor={editorEl}
        />
      ) : (
      <>
      {/* On a phone the statement (and its h1) can be hidden behind a tab. */}
      {mobilePane !== 'problem' && <h1 className="sr-only">{problem?.title ?? 'Solve'}</h1>}
      {/* Mobile pane switch */}
      <Tabs
        variant="pills"
        className="self-start lg:hidden"
        active={mobilePane}
        onChange={(t) => setMobilePane(t as 'problem' | 'code' | 'results')}
        items={[
          { id: 'problem', label: 'Problem', icon: <ScrollText className="size-3.5" /> },
          { id: 'code', label: 'Code', icon: <Code2 className="size-3.5" /> },
          { id: 'results', label: 'Results', icon: <ListChecks className="size-3.5" /> },
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
        <VerdictBanner verdict={banner?.verdict ?? null} examplesOnly={banner?.examplesOnly} xpEarned={banner?.xp} burstId={banner?.id} onDismiss={() => setBanner(null)} />

        {/* Problem pane: full panel or minimized rail */}
        {problemCollapsed ? (
          <button
            onClick={toggleProblemCollapsed}
            aria-label="Expand problem panel"
            title={problem?.title ?? 'Expand problem panel'}
            className="group hidden w-12 shrink-0 flex-col items-center gap-3 overflow-hidden rounded-xl border border-border py-4 lg:flex"
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
              'relative min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background lg:flex lg:w-[var(--split)]',
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
            aria-valuenow={splitPct}
            aria-valuemin={25}
            aria-valuemax={75}
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
            mobilePane === 'code' || mobilePane === 'results' ? 'flex' : 'hidden',
          )}
        >
          <div className={cn('min-h-40 flex-1 overflow-hidden rounded-xl border border-border bg-background', mobilePane === 'results' && 'max-lg:hidden')}>
            {editorEl}
          </div>
          {bottomPanel}
        </section>
      </div>

      {/* Phone: the actions on the code, within thumb reach. */}
      <div className="solve-actionbar sticky bottom-0 z-30 -mx-1 mt-2 flex items-center gap-2 border-t border-border bg-background px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
        {actions(true)}
      </div>

      </>
      )}
    </motion.div>
  )
}

/** A two-way switch inside a results tab (Tests / Generate with AI, …). */
function SubSwitch<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="sticky top-0 z-10 flex items-center border-b border-border bg-surface px-3 py-1.5">
      <div role="group" aria-label={label} className="inline-flex items-center gap-0.5 rounded-lg border border-border p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'cursor-pointer rounded-md px-2.5 py-1 text-[12px] transition-colors',
              value === o.id ? 'bg-surface-2 font-medium text-foreground' : 'text-foreground-dim hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
