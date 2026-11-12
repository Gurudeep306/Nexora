import { useMemo, useState } from 'react'
import { ChevronDown, Sparkles, X } from 'lucide-react'
import { Input, Popover, PopoverContent, PopoverTrigger, Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { AgentSpec, Bootstrap, Effort, HiveKey, ProviderId } from './types'
import { PROVIDER_STYLE, ProviderGlyph, fmtTokens, keyShare, shareTone } from './ui'

const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

/** Providers that have at least one usable key. */
export function usableProviders(boot: Bootstrap): ProviderId[] {
  const set = new Set<ProviderId>()
  for (const k of boot.keys) if (!k.disabled && k.status !== 'invalid') set.add(k.provider)
  return (['anthropic', 'openai', 'gemini', 'openai_compat'] as ProviderId[]).filter((p) => set.has(p))
}

export function modelsFor(boot: Bootstrap, provider: ProviderId, keyId: string): string[] {
  const keys = boot.keys.filter((k) => k.provider === provider && (keyId === 'auto' || k.id === keyId))
  const set = new Set<string>()
  for (const k of keys) for (const m of k.models) set.add(m)
  const suggested = boot.catalogue.providers.find((p) => p.id === provider)?.suggested ?? []
  const list = [...set]
  // Suggested first (in their order), then the rest alphabetically.
  return [...suggested.filter((m) => set.has(m) || !list.length), ...list.filter((m) => !suggested.includes(m)).sort()]
}

export function defaultSpec(boot: Bootstrap, provider?: ProviderId): AgentSpec | null {
  const p = provider ?? usableProviders(boot)[0]
  if (!p) return null
  const key = bestKey(boot.keys.filter((k) => k.provider === p))
  const models = modelsFor(boot, p, 'auto')
  return { provider: p, keyId: 'auto', model: key?.defaultModel || models[0] || '', effort: p === 'anthropic' ? 'high' : null }
}

function bestKey(keys: HiveKey[]): HiveKey | undefined {
  return [...keys].filter((k) => !k.disabled).sort((a, b) => (keyShare(b) ?? 1) - (keyShare(a) ?? 1))[0]
}

export function AgentChip({
  boot,
  spec,
  onChange,
  onRemove,
  label,
  accent,
}: {
  boot: Bootstrap
  spec: AgentSpec
  onChange: (s: AgentSpec) => void
  onRemove?: () => void
  label?: string
  accent?: boolean
}) {
  const [open, setOpen] = useState(false)
  const providers = usableProviders(boot)
  const keys = boot.keys.filter((k) => k.provider === spec.provider && !k.disabled)
  const models = useMemo(() => modelsFor(boot, spec.provider, spec.keyId), [boot, spec.provider, spec.keyId])
  const key = spec.keyId === 'auto' ? bestKey(keys) : keys.find((k) => k.id === spec.keyId)
  const share = key ? keyShare(key) : null
  const supportsEffort = spec.provider === 'anthropic' || spec.provider === 'openai'
  const [custom, setCustom] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'group inline-flex h-9 items-center gap-2 rounded-xl border bg-bg-surface/80 pl-1.5 pr-1 text-left text-xs transition-colors',
          accent ? 'border-accent-brand/50' : 'border-border hover:border-border-strong',
        )}
      >
        <PopoverTrigger asChild>
          <button type="button" className="flex min-w-0 items-center gap-2 py-1 outline-none">
            <ProviderGlyph provider={spec.provider} size="sm" />
            <span className="flex min-w-0 flex-col leading-tight">
              {label && <span className="text-[9px] font-semibold uppercase tracking-wider text-accent-brand">{label}</span>}
              <span className="max-w-40 truncate font-medium text-text-primary">{spec.name ? `${spec.name} · ` : ''}{spec.model || 'Choose model'}</span>
            </span>
            <span className="flex items-center gap-1 text-[10px] text-text-muted">
              <span className="size-1.5 rounded-full" style={{ background: shareTone(share) }} />
              {spec.keyId === 'auto' ? 'auto' : key?.label?.slice(0, 12)}
              {spec.effort && supportsEffort ? ` · ${spec.effort}` : ''}
            </span>
            <ChevronDown className="size-3 text-text-muted" />
          </button>
        </PopoverTrigger>
        {onRemove && (
          <button type="button" onClick={onRemove} className="grid size-6 place-items-center rounded-md text-text-muted opacity-60 hover:bg-text-primary/8 hover:text-text-primary group-hover:opacity-100" aria-label="Remove agent">
            <X className="size-3" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-4 gap-1">
            {(['anthropic', 'openai', 'gemini', 'openai_compat'] as ProviderId[]).map((p) => {
              const ok = providers.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  disabled={!ok}
                  title={ok ? PROVIDER_STYLE[p].name : `No ${PROVIDER_STYLE[p].name} key yet`}
                  onClick={() => {
                    const d = defaultSpec(boot, p)
                    if (d) onChange({ ...d, name: spec.name })
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                    spec.provider === p ? 'border-accent-brand bg-accent-brand/8 text-text-primary' : 'border-transparent text-text-muted hover:bg-text-primary/5',
                  )}
                >
                  <ProviderGlyph provider={p} size="sm" />
                  {PROVIDER_STYLE[p].name}
                </button>
              )
            })}
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Key</div>
            <div className="flex flex-col gap-1">
              <KeyOption active={spec.keyId === 'auto'} onClick={() => onChange({ ...spec, keyId: 'auto' })} title="Auto" sub="Most budget left, fewest running — fails over automatically" icon={<Sparkles className="size-3.5 text-accent-brand" />} />
              {keys.map((k) => (
                <KeyOption
                  key={k.id}
                  active={spec.keyId === k.id}
                  onClick={() => onChange({ ...spec, keyId: k.id, model: k.models.includes(spec.model) ? spec.model : k.defaultModel || spec.model })}
                  title={k.label}
                  sub={`${k.tokenLimit == null ? 'No limit' : `${fmtTokens(k.remaining)} left`} · ${k.active}/${k.maxConcurrency} busy · @${k.owner}`}
                  share={keyShare(k)}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Model
              <button type="button" className="normal-case tracking-normal text-accent-brand" onClick={() => setCustom((c) => !c)}>
                {custom ? 'Pick from list' : 'Type a model id'}
              </button>
            </div>
            {custom || !models.length ? (
              <Input value={spec.model} onChange={(e) => onChange({ ...spec, model: e.target.value })} placeholder="model id" className="h-8 font-mono text-xs" />
            ) : (
              <Select value={spec.model} onValueChange={(m) => onChange({ ...spec, model: m })} className="h-8 w-full text-xs">
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {supportsEffort && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Effort</div>
              <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-text-primary/5 p-0.5">
                {EFFORTS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => onChange({ ...spec, effort: e })}
                    className={cn('h-6 rounded-md text-[10px] font-medium capitalize', (spec.effort ?? 'high') === e ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Name (optional — the lead can assign work by name)</div>
            <Input value={spec.name ?? ''} onChange={(e) => onChange({ ...spec, name: e.target.value.slice(0, 40) || undefined })} placeholder="e.g. frontend" className="h-8 text-xs" />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function KeyOption({ active, onClick, title, sub, share, icon }: { active: boolean; onClick: () => void; title: string; sub: string; share?: number | null; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors', active ? 'border-accent-brand/60 bg-accent-brand/6' : 'border-transparent hover:bg-text-primary/5')}
    >
      {icon ?? <span className="size-2 shrink-0 rounded-full" style={{ background: shareTone(share ?? null) }} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-text-primary">{title}</span>
        <span className="block truncate text-[10px] text-text-muted">{sub}</span>
      </span>
    </button>
  )
}
