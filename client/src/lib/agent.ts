/* Client for the Nexora AI agent (server: src/routes/agent.js, powered by Groq).
 *
 *  - agentTask(mode, input)      one-shot tasks: completion, fix, coach, …
 *  - streamChat(body, handlers)  the streaming assistant (Server-Sent Events)
 *
 * The model's text is untrusted: render it with <AiMarkdown> (react-markdown,
 * no raw HTML), never as HTML, and pass any HTML it produces through sanitizeHtml. */
import { api, ApiError } from './api'

export const AI_NOT_CONFIGURED = 'AI is not configured'

/** True when the server has no GROQ_API_KEY (503). */
export function isAiUnavailable(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503
}

/** Short, friendly text for any AI error. */
export function aiErrorText(err: unknown): string {
  if (isAiUnavailable(err)) return 'AI features are not set up on this server yet.'
  if (err instanceof ApiError && err.status === 429) return err.message || 'AI is busy — try again in a moment.'
  if (err instanceof ApiError && err.status === 401) return 'Sign in to use the AI assistant.'
  return err instanceof Error ? err.message : 'AI request failed'
}

export type AiErrorKind = 'unavailable' | 'budget' | 'rate' | 'auth' | 'network' | 'other'

/** Which friendly error callout to show for an AI failure. */
export function aiErrorKind(err: unknown): AiErrorKind {
  if (!(err instanceof ApiError)) return 'other'
  if (err.status === 503) return 'unavailable'
  if (err.status === 429) return /budget/i.test(err.message) || (err.data as { code?: string } | null)?.code === 'budget' ? 'budget' : 'rate'
  if (err.status === 401) return 'auth'
  if (err.status === 0) return 'network'
  return 'other'
}

/** Model markdown flattened to one line of plain text, for toasts and titles. */
export function plainAiText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function agentTask<T>(mode: string, input: Record<string, unknown> = {}, opts: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<T> {
  // Only pass `signal` when given: api.ts would otherwise lose its timeout signal.
  const options = opts.signal ? { timeoutMs: opts.timeoutMs ?? 60000, signal: opts.signal } : { timeoutMs: opts.timeoutMs ?? 60000 }
  const r = await api.post<{ ok: boolean; result: T }>('/api/agent/task', { ...input, mode }, options)
  return r.result
}

/* ── streaming chat ── */

/** What the current page tells the assistant (server caps every field). */
export interface AgentPage {
  path?: string
  problemId?: string | number
  title?: string
  /** Short name for the context pill, e.g. "Two Sum" or "Graphs · BFS". */
  label?: string
  code?: string
  language?: string
  selection?: string
  /** Last run/judge result, with the first failing case. */
  verdict?: string
  /** Active list filters, as one readable line. */
  filters?: string
  gateQuestionId?: string
  gateQuestionText?: string
  /** The student has checked / revealed the answer to the GATE question on screen. */
  gateAnswered?: boolean
  /** A timed exam is running: the assistant must not give answers. */
  examActive?: boolean
  /** A mock paper has been submitted and is being reviewed. */
  examReview?: boolean
  learnTopic?: string
  visibleText?: string
}

export interface NavAction {
  type: 'navigate'
  path: string
  label: string
}

export interface ChatHandlers {
  onMeta?: (d: { conversationId: string }) => void
  onToken?: (text: string) => void
  onTool?: (d: { name: string; status: 'running' | 'done'; ok?: boolean }) => void
  onAction?: (a: NavAction) => void
  onAnimation?: (visualization: unknown) => void
  onDone?: (d: { conversationId: string; messageId: number | null }) => void
  onError?: (err: ApiError) => void
}

export interface ChatBody {
  message: string
  conversationId?: string | null
  page?: AgentPage
  animate?: boolean
}

/** Parse one SSE block ("event: x\ndata: {...}"). Exported for tests/tools. */
export function parseSseBlock(block: string): { event: string; data: unknown } | null {
  let event = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue // heartbeat
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
  }
  if (!data.length) return null
  try {
    return { event, data: JSON.parse(data.join('\n')) }
  } catch {
    return null
  }
}

/** POST /api/agent/chat and dispatch events until the stream ends. */
export async function streamChat(body: ChatBody, h: ChatHandlers, signal?: AbortSignal): Promise<void> {
  let res: Response
  try {
    res = await fetch('/api/agent/chat', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(body),
      signal,
    })
  } catch {
    if (signal?.aborted) return
    h.onError?.(new ApiError(0, 'Network error — is the server running?'))
    return
  }

  if (!res.ok || !res.body || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
    let msg = `Request failed (${res.status})`
    let data: unknown = null
    try {
      data = await res.json()
      msg = (data as { error?: string })?.error || msg
    } catch {
      /* not JSON */
    }
    h.onError?.(new ApiError(res.status, msg, data))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
      let cut: number
      while ((cut = buf.indexOf('\n\n')) >= 0) {
        const ev = parseSseBlock(buf.slice(0, cut))
        buf = buf.slice(cut + 2)
        if (!ev) continue
        const d = ev.data as Record<string, unknown>
        switch (ev.event) {
          case 'meta':
            h.onMeta?.(d as { conversationId: string })
            break
          case 'token':
            h.onToken?.(String(d.text ?? ''))
            break
          case 'tool':
            h.onTool?.(d as { name: string; status: 'running' | 'done'; ok?: boolean })
            break
          case 'action':
            h.onAction?.(d as unknown as NavAction)
            break
          case 'animation':
            h.onAnimation?.(d.visualization)
            break
          case 'done':
            h.onDone?.(d as { conversationId: string; messageId: number | null })
            break
          case 'error':
            h.onError?.(new ApiError(Number(d.status) || 500, String(d.error || 'AI error')))
            break
        }
      }
    }
  } catch {
    if (!signal?.aborted) h.onError?.(new ApiError(0, 'The connection to the AI dropped — try again.'))
  }
}

/* ── animation helpers (the server sends a normalised spec in `animation`) ── */

/** Detects animation intent (mirrors src/ai/animation.js). */
export function wantsAnimation(text: string): boolean {
  return /animate|visuali[sz]|simulation|step through|show animation|animation/i.test(text)
}

/** Removes the ```nexora_animation JSON block from streamed text so prose renders cleanly. */
export function stripAnimationBlock(text: string): string {
  return text
    .replace(/```(?:nexora_animation|json)\s*\n?[\s\S]*?```/i, '')
    .replace(/```nexora_animation[\s\S]*$/i, '') // still streaming
    .trim()
}
