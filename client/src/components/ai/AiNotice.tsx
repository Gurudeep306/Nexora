import type { ReactNode } from 'react'
import { Clock, KeyRound, PlugZap, RotateCcw, TriangleAlert, WifiOff, Wallet } from 'lucide-react'
import type { AiErrorKind } from '@/lib/agent'
import { cn } from '@/lib/utils'

const COPY: Record<AiErrorKind, { title: string; body: string; icon: typeof TriangleAlert; tone: 'warn' | 'error' | 'info' }> = {
  unavailable: {
    title: 'AI isn’t set up on this server',
    body: 'Everything else on NexoraGuru works as usual. An admin can turn AI on by adding a GROQ_API_KEY.',
    icon: PlugZap,
    tone: 'info',
  },
  budget: { title: 'Daily AI budget used', body: 'Today’s AI allowance is used up. It resets at midnight UTC.', icon: Wallet, tone: 'warn' },
  rate: { title: 'Slow down a little', body: 'Too many AI requests in a short time. Wait a moment, then try again.', icon: Clock, tone: 'warn' },
  auth: { title: 'Sign in to use AI', body: 'Your session has ended. Sign in again to keep going.', icon: KeyRound, tone: 'warn' },
  network: { title: 'Connection lost', body: 'Couldn’t reach the AI. Check your connection and try again.', icon: WifiOff, tone: 'error' },
  other: { title: 'Something went wrong', body: 'The AI couldn’t finish this reply.', icon: TriangleAlert, tone: 'error' },
}

/** A friendly, themed callout for AI failures (not configured, rate limit, budget, network…). */
export function AiNotice({
  kind = 'other',
  detail,
  onRetry,
  compact = false,
  className,
  children,
}: {
  kind?: AiErrorKind
  /** The server's message — shown instead of the generic copy for unknown errors. */
  detail?: string | null
  onRetry?: () => void
  compact?: boolean
  className?: string
  children?: ReactNode
}) {
  const c = COPY[kind]
  const Icon = c.icon
  const body = detail && kind === 'other' ? detail : c.body
  return (
    <div className={cn('ai-notice', `ai-notice-${c.tone}`, compact && 'ai-notice-compact', className)} role={c.tone === 'error' ? 'alert' : 'status'}>
      <span className="ai-notice-icon">
        <Icon aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="ai-notice-title">{c.title}</p>
        <p className="ai-notice-body">{body}</p>
        {children}
      </div>
      {onRetry && kind !== 'unavailable' && kind !== 'budget' && (
        <button type="button" onClick={onRetry} className="ai-notice-retry">
          <RotateCcw aria-hidden="true" /> Retry
        </button>
      )}
    </div>
  )
}
