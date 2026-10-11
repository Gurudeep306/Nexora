import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api'
import { aiErrorText, isAiUnavailable, streamChat, stripAnimationBlock, type AgentPage, type NavAction } from '@/lib/agent'

export interface AgentToolChip {
  name: string
  status: 'running' | 'done'
  ok?: boolean
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Normalised animation spec for CyberMatrixPlayer. */
  visualization?: unknown
  tools?: AgentToolChip[]
  actions?: NavAction[]
  error?: boolean
  streaming?: boolean
}

export type AgentStatus = 'idle' | 'streaming' | 'error' | 'unavailable'

export interface SendOptions {
  page?: AgentPage
  animate?: boolean
}

const CONV_KEY = 'nexora:agent:conversation'
let seq = 0
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`

function savedConversation(): string | null {
  try {
    return sessionStorage.getItem(CONV_KEY)
  } catch {
    return null
  }
}
function rememberConversation(id: string | null) {
  try {
    if (id) sessionStorage.setItem(CONV_KEY, id)
    else sessionStorage.removeItem(CONV_KEY)
  } catch {
    /* private mode */
  }
}

/**
 * One conversation with the Nexora AI agent: streaming replies, tool chips,
 * navigation suggestions and animations. The thread lives on the server
 * (per user); this tab remembers which conversation it is on.
 */
export function useAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(savedConversation)
  const abortRef = useRef<AbortController | null>(null)
  const loadedRef = useRef(false)

  // Restore the tab's conversation once.
  useEffect(() => {
    if (loadedRef.current || !conversationId) return
    loadedRef.current = true
    api
      .get<{ messages: { id: number; role: 'user' | 'assistant'; content: string; visualization: unknown }[] }>(
        `/api/agent/conversations/${encodeURIComponent(conversationId)}`,
      )
      .then((r) => setMessages(r.messages.map((m) => ({ id: `s${m.id}`, role: m.role, content: m.content, visualization: m.visualization ?? undefined }))))
      .catch(() => {
        rememberConversation(null)
        setConversationId(null)
      })
  }, [conversationId])

  const patch = (id: string, fn: (m: AgentMessage) => AgentMessage) =>
    setMessages((list) => list.map((m) => (m.id === id ? fn(m) : m)))

  const send = useCallback(
    async (text: string, opts: SendOptions = {}) => {
      const message = text.trim()
      if (!message || abortRef.current) return
      const userMsg: AgentMessage = { id: uid(), role: 'user', content: message }
      const botId = uid()
      setMessages((list) => [...list, userMsg, { id: botId, role: 'assistant', content: '', streaming: true, tools: [], actions: [] }])
      setStatus('streaming')
      setError(null)

      const ctrl = new AbortController()
      abortRef.current = ctrl
      let raw = ''
      let failed = null as ApiError | null
      await streamChat(
        { message, conversationId, page: opts.page, animate: opts.animate },
        {
          onMeta: ({ conversationId: id }) => {
            setConversationId(id)
            rememberConversation(id)
          },
          onToken: (t) => {
            raw += t
            const shown = stripAnimationBlock(raw)
            patch(botId, (m) => ({ ...m, content: shown }))
          },
          onTool: (d) =>
            patch(botId, (m) => {
              const tools = [...(m.tools ?? [])]
              const i = tools.findIndex((x) => x.name === d.name && x.status === 'running')
              if (d.status === 'running' || i < 0) tools.push(d)
              else tools[i] = d
              return { ...m, tools }
            }),
          onAction: (a) => patch(botId, (m) => ({ ...m, actions: [...(m.actions ?? []), a] })),
          onAnimation: (v) => patch(botId, (m) => ({ ...m, visualization: v })),
          onError: (e) => {
            failed = e
          },
        },
        ctrl.signal,
      )
      abortRef.current = null
      if (failed) {
        const err: ApiError = failed
        const unavailable = isAiUnavailable(err)
        setStatus(unavailable ? 'unavailable' : 'error')
        setError(aiErrorText(err))
        patch(botId, (m) => ({ ...m, streaming: false, error: true, content: m.content || aiErrorText(err) }))
        return
      }
      setStatus('idle')
      patch(botId, (m) => ({ ...m, streaming: false, content: m.content || (ctrl.signal.aborted ? '_Stopped._' : m.content) }))
    },
    [conversationId],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
  }, [])

  /** Start a fresh conversation (the old one stays on the server). */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setMessages([])
    setStatus('idle')
    setError(null)
    setConversationId(null)
    rememberConversation(null)
  }, [])

  /** Delete the current conversation from the server too. */
  const clear = useCallback(async () => {
    const id = conversationId
    reset()
    if (id) await api.delete(`/api/agent/conversations/${encodeURIComponent(id)}`).catch(() => undefined)
  }, [conversationId, reset])

  const actions = messages.flatMap((m) => m.actions ?? [])

  return { messages, send, stop, reset, clear, status, error, conversationId, actions }
}

export type AgentApi = ReturnType<typeof useAgent>
