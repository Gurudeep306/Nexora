import { cn } from '@/lib/utils'
import { AgentMark } from '../agents'
import { vendorName } from '../ui'

const UPPER = new Set(['gpt', 'glm', 'oss', 'ai', 'r1', 'vl', 'tts', 'ocr', 'api', 'sd', 'xl'])

/**
 * A friendly name for a model slug: "minimaxai/minimax-m3.1-flash" →
 * "MiniMax M3.1 Flash". The raw slug stays available in a tooltip.
 */
export function friendlyModel(slug: string): string {
  if (!slug) return ''
  if (slug === 'default') return 'Default'
  const base = slug
    .replace(/^accounts\/[^/]+\/models\//, '')
    .split('/')
    .pop()!
    .replace(/:free$/, '')
    .replace(/-latest$/, '')
    // Version numbers written with dashes: "sonnet-5-5" → "sonnet-5.5", "llama-3-1-8b" → "llama-3.1-8b".
    .replace(/(^|-)(\d+)-(\d)(?=-|$)/g, '$1$2.$3')
    .replace(/[-_]+/g, ' ')
    .trim()
  return base
    .split(' ')
    .map((w) => {
      const lw = w.toLowerCase()
      if (UPPER.has(lw)) return lw.toUpperCase()
      if (/^minimax/i.test(w)) return 'MiniMax' + w.slice(7).toUpperCase()
      if (/^deepseek/i.test(w)) return 'DeepSeek' + w.slice(8)
      if (/^\d/.test(w) || /^[a-z]\d/i.test(w)) return w.toUpperCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

/** A model as a chip: its mark, a friendly name, the slug and vendor on hover. */
export function ModelChip({ provider, model, size = 'md', className }: { provider: string; model: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={cn('inline-flex max-w-full items-center gap-1.5 rounded-full bg-[var(--hv-surface-1)] pr-2 ring-1 ring-[var(--hv-border-subtle)]', size === 'sm' ? 'h-5 pl-0.5 text-[11px]' : 'h-6 pl-0.5 text-[12px]', className)}
      title={`${vendorName(provider)} · ${model}`}
    >
      <AgentMark provider={provider} model={model} size={size === 'sm' ? 16 : 20} />
      <span className="truncate font-medium text-[var(--hv-text-1)]">{friendlyModel(model)}</span>
    </span>
  )
}
