import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAgent, type AgentApi, type SendOptions } from '@/hooks/useAgent'
import type { AgentPage } from '@/lib/agent'
import { scrapeVisibleText, summarizePage, type PageSummary } from '@/lib/pageContext'

export interface OpenOptions {
  animate?: boolean
  page?: Partial<AgentPage>
  /** Move keyboard focus into the assistant (default: only when there is no seed). */
  focus?: boolean
}

interface AgentContextValue {
  /** The single shared conversation, kept while the student moves between pages. */
  agent: AgentApi
  open: boolean
  /** Open the assistant; with a seed, ask it right away. */
  openAssistant: (seed?: string, opts?: OpenOptions) => void
  closeAssistant: () => void
  toggleAssistant: () => void
  /** Send with the current page context attached (unless sharing is off). */
  ask: (text: string, opts?: SendOptions) => Promise<void>
  /** Everything the current page told the assistant about itself. */
  pageContext: () => AgentPage
  /** Legacy single-slot setter; prefer useAgentPageContext. */
  setPageContext: (ctx: AgentPage | null) => void
  /** Light, reactive summary for the context pill and chips. */
  summary: PageSummary
  shareContext: boolean
  setShareContext: (on: boolean) => void
  /** Bumped whenever the assistant should take keyboard focus. */
  focusTick: number
}

const AgentContext = createContext<AgentContextValue | null>(null)

/** Window event so non-React code (and the command palette) can open the assistant. */
export const openAssistantEvent = (seed?: string) => window.dispatchEvent(new CustomEvent('nexora:assistant', { detail: { seed } }))

const SHARE_KEY = 'nexora:agent:share-page'
const LIGHT_KEYS = ['title', 'label', 'learnTopic', 'gateQuestionId', 'gateAnswered', 'examActive', 'examReview'] as const

function readShare(): boolean {
  try {
    return localStorage.getItem(SHARE_KEY) !== '0'
  } catch {
    return true
  }
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const agent = useAgent()
  const [open, setOpen] = useState(false)
  const [focusTick, setFocusTick] = useState(0)
  const [shareContext, setShareState] = useState(readShare)
  const location = useLocation()
  const path = location.pathname

  // Every mounted page part registers its slice; they merge in mount order.
  const entries = useRef(new Map<string, AgentPage>())
  const [light, setLight] = useState<Partial<AgentPage> | null>(null)
  const lightJson = useRef('null')

  const merged = useCallback((): AgentPage => {
    const out: AgentPage = {}
    for (const v of entries.current.values()) Object.assign(out, v)
    return out
  }, [])

  const refreshLight = useCallback(() => {
    const m = merged()
    const l: Partial<AgentPage> = {}
    for (const k of LIGHT_KEYS) if (m[k] !== undefined) (l as Record<string, unknown>)[k] = m[k]
    const json = JSON.stringify(l)
    if (json !== lightJson.current) {
      lightJson.current = json
      setLight(l)
    }
  }, [merged])

  const register = useCallback(
    (id: string, ctx: AgentPage | null) => {
      if (ctx) entries.current.set(id, ctx)
      else entries.current.delete(id)
      refreshLight()
    },
    [refreshLight],
  )

  const summary = useMemo(() => summarizePage(path, light), [path, light])
  const summaryRef = useRef(summary)
  const shareRef = useRef(shareContext)
  const openRef = useRef(open)
  useLayoutEffect(() => {
    summaryRef.current = summary
    shareRef.current = shareContext
    openRef.current = open
  })

  const pageContext = useCallback((): AgentPage => ({ path, ...merged() }), [path, merged])
  const setPageContext = useCallback((ctx: AgentPage | null) => register('legacy', ctx), [register])

  const setShareContext = useCallback((on: boolean) => {
    setShareState(on)
    try {
      localStorage.setItem(SHARE_KEY, on ? '1' : '0')
    } catch {
      /* private mode */
    }
  }, [])

  const { send } = agent
  const ask = useCallback(
    (text: string, opts: SendOptions = {}) => {
      const s = summaryRef.current
      const full = pageContext()
      let page: AgentPage
      if (shareRef.current) {
        page = { ...full, ...(opts.page ?? {}) }
        // Pages that don't describe themselves in detail: send what's on screen.
        if (!page.visibleText && !page.gateQuestionText && s.kind !== 'solve') {
          const seen = scrapeVisibleText()
          if (seen) page.visibleText = seen
        }
      } else {
        // Sharing off: only the path and the exam guard (it can only make the AI stricter),
        // plus anything the student explicitly chose to ask about.
        page = { path: full.path, examActive: s.examActive || undefined, examReview: full.examReview }
        if (opts.page?.selection) page.selection = opts.page.selection
      }
      return send(text, { ...opts, page, pageLabel: s.label })
    },
    [send, pageContext],
  )

  const openAssistant = useCallback(
    (seed?: string, opts: OpenOptions = {}) => {
      setOpen(true)
      if (opts.focus ?? !seed) setFocusTick((t) => t + 1)
      if (seed) void ask(seed, { animate: opts.animate, page: opts.page })
    },
    [ask],
  )
  const closeAssistant = useCallback(() => setOpen(false), [])
  const toggleAssistant = useCallback(() => {
    if (!openRef.current) setFocusTick((t) => t + 1)
    setOpen(!openRef.current)
  }, [])

  useEffect(() => {
    const onOpen = (e: Event) => openAssistant((e as CustomEvent<{ seed?: string }>).detail?.seed, { focus: true })
    window.addEventListener('nexora:assistant', onOpen)
    return () => window.removeEventListener('nexora:assistant', onOpen)
  }, [openAssistant])

  const value = useMemo<AgentContextValue>(
    () => ({
      agent,
      open,
      openAssistant,
      closeAssistant,
      toggleAssistant,
      ask,
      pageContext,
      setPageContext,
      summary,
      shareContext,
      setShareContext,
      focusTick,
    }),
    [agent, open, openAssistant, closeAssistant, toggleAssistant, ask, pageContext, setPageContext, summary, shareContext, setShareContext, focusTick],
  )
  return (
    <AgentContext.Provider value={value}>
      <RegisterContext.Provider value={register}>{children}</RegisterContext.Provider>
    </AgentContext.Provider>
  )
}

/* A separate, stable context for registration, so pages that only report
   their context don't re-render when the conversation changes. */
const RegisterContext = createContext<((id: string, ctx: AgentPage | null) => void) | null>(null)

export function useAgentContext(): AgentContextValue {
  const v = useContext(AgentContext)
  if (!v) throw new Error('useAgentContext must be used inside <AgentProvider>')
  return v
}

/**
 * Pages (and parts of pages) call this to tell the assistant what is on
 * screen: problem, code, verdict, lesson topic, GATE question, filters, …
 * Several components may report at once; their fields merge. A component's
 * slice is removed when it unmounts. Values are read at send time.
 */
export function useAgentPageContext(ctx: AgentPage | null) {
  const register = useContext(RegisterContext)
  const id = useId()
  const json = JSON.stringify(ctx ?? null)
  useEffect(() => {
    if (!register) return
    register(id, json === 'null' ? null : (JSON.parse(json) as AgentPage))
  }, [register, id, json])
  useEffect(() => () => register?.(id, null), [register, id])
}
