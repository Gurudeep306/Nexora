import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAgent, type AgentApi, type SendOptions } from '@/hooks/useAgent'
import type { AgentPage } from '@/lib/agent'

interface AgentContextValue {
  /** The single shared conversation (the global panel and the AI Lab use the same thread). */
  agent: AgentApi
  open: boolean
  /** Open the assistant; with a seed, ask it right away. */
  openAssistant: (seed?: string, opts?: { animate?: boolean; page?: Partial<AgentPage> }) => void
  closeAssistant: () => void
  toggleAssistant: () => void
  /** Send with the current page context attached. */
  ask: (text: string, opts?: SendOptions) => Promise<void>
  /** What the current page told the assistant about itself. */
  pageContext: () => AgentPage
  setPageContext: (ctx: AgentPage | null) => void
}

const AgentContext = createContext<AgentContextValue | null>(null)

/** Window event so non-React code (and the command palette) can open the panel. */
export const openAssistantEvent = (seed?: string) => window.dispatchEvent(new CustomEvent('nexora:assistant', { detail: { seed } }))

export function AgentProvider({ children }: { children: ReactNode }) {
  const agent = useAgent()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const ctxRef = useRef<AgentPage | null>(null)

  const pageContext = useCallback((): AgentPage => ({ path: location.pathname, ...(ctxRef.current ?? {}) }), [location.pathname])
  const setPageContext = useCallback((ctx: AgentPage | null) => {
    ctxRef.current = ctx
  }, [])

  const { send } = agent
  const ask = useCallback((text: string, opts: SendOptions = {}) => send(text, { ...opts, page: { ...pageContext(), ...(opts.page ?? {}) } }), [send, pageContext])

  const openAssistant = useCallback(
    (seed?: string, opts: { animate?: boolean; page?: Partial<AgentPage> } = {}) => {
      setOpen(true)
      if (seed) void ask(seed, { animate: opts.animate, page: opts.page })
    },
    [ask],
  )

  useEffect(() => {
    const onOpen = (e: Event) => openAssistant((e as CustomEvent<{ seed?: string }>).detail?.seed)
    window.addEventListener('nexora:assistant', onOpen)
    return () => window.removeEventListener('nexora:assistant', onOpen)
  }, [openAssistant])

  const value = useMemo<AgentContextValue>(
    () => ({
      agent,
      open,
      openAssistant,
      closeAssistant: () => setOpen(false),
      toggleAssistant: () => setOpen((o) => !o),
      ask,
      pageContext,
      setPageContext,
    }),
    [agent, open, openAssistant, ask, pageContext, setPageContext],
  )
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgentContext(): AgentContextValue {
  const v = useContext(AgentContext)
  if (!v) throw new Error('useAgentContext must be used inside <AgentProvider>')
  return v
}

/**
 * Pages call this to tell the assistant what is on screen (problem, code,
 * selection, GATE question, …). The latest value wins; it is cleared when the
 * page unmounts. Values are read at send time, so passing fresh code on every
 * render is cheap.
 */
export function useAgentPageContext(ctx: AgentPage | null) {
  const v = useContext(AgentContext)
  const setCtx = v?.setPageContext
  const json = JSON.stringify(ctx ?? null)
  useEffect(() => {
    if (!setCtx) return
    setCtx(ctx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCtx, json])
  useEffect(() => () => setCtx?.(null), [setCtx])
}
