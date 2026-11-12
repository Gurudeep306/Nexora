import { useMemo, useState } from 'react'
import { Check, ChevronDown, Sparkles, X } from 'lucide-react'
import { Input, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { AgentSpec, Bootstrap, Effort, HiveKey, ProviderId, ProviderInfo } from './types'
import { ProviderGlyph, fmtTokens, keyShare, shareTone, vendorName } from './ui'

const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const vendorInfo = (boot: Bootstrap, id: string): ProviderInfo | undefined => boot.catalogue.providers.find((p) => p.id === id)

/** Vendors with at least one usable key (optionally: that can use tools / make images). */
export function usableProviders(boot: Bootstrap, need?: 'tools' | 'images'): ProviderId[] {
  const set = new Set<ProviderId>()
  for (const k of boot.keys) if (!k.disabled && k.status !== 'invalid') set.add(k.provider)
  return boot.catalogue.providers.filter((p) => set.has(p.id) && (!need || p.caps[need])).map((p) => p.id)
}

export function modelsFor(boot: Bootstrap, provider: ProviderId, keyId: string): string[] {
  const keys = boot.keys.filter((k) => k.provider === provider && (keyId === 'auto' || k.id === keyId))
  const set = new Set<string>()
  for (const k of keys) for (const m of k.models) set.add(m)
  const suggested = vendorInfo(boot, provider)?.suggested ?? []
  if (!set.size) return suggested
  return [...suggested.filter((m) => set.has(m)), ...[...set].filter((m) => !suggested.includes(m)).sort()]
}

export function defaultSpec(boot: Bootstrap, provider?: ProviderId, need: 'tools' | 'images' | undefined = 'tools'): AgentSpec | null {
  const p = provider ?? usableProviders(boot, need)[0]
  if (!p) return null
  const key = bestKey(boot.keys.filter((k) => k.provider === p))
  const models = modelsFor(boot, p, 'auto')
  return { provider: p, keyId: 'auto', model: key?.defaultModel || models[0] || '', effort: p === 'anthropic' ? 'high' : null }
}

function bestKey(keys: HiveKey[]): HiveKey | undefined {
  return [...keys].filter((k) => !k.disabled).sort((a, b) => (keyShare(b) ?? 1) - (keyShare(a) ?? 1))[0]
}

const shortModel = (m: string) => m.replace(/^claude-/, '').replace(/^accounts\/[^/]+\/models\//, '').replace(/^[^/]+\//, '')

export function AgentChip({
  boot,
  spec,
  onChange,
  onRemove,
  label,
  need = 'tools',
  compact,
}: {
  boot: Bootstrap
  spec: AgentSpec
  onChange: (s: AgentSpec) => void
  onRemove?: () => void
  label?: string
  need?: 'tools' | 'images' | 'chat'
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState(false)
  const providers = usableProviders(boot, need === 'chat' ? undefined : need)
  const keys = boot.keys.filter((k) => k.provider === spec.provider && !k.disabled)
  const models = useMemo(() => modelsFor(boot, spec.provider, spec.keyId), [boot, spec.provider, spec.keyId])
  const key = spec.keyId === 'auto' ? bestKey(keys) : keys.find((k) => k.id === spec.keyId)
  const share = key ? keyShare(key) : null
  const supportsEffort = spec.provider === 'anthropic' || spec.provider === 'openai'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className="group inline-flex items-center rounded-full bg-text-primary/[0.06] transition-colors hover:bg-text-primary/[0.09]">
        <PopoverTrigger asChild>
          <button type="button" className={cn('flex min-w-0 items-center gap-1.5 py-1 pl-1 text-[12.5px] outline-none', onRemove ? 'pr-1' : 'pr-2.5')}>
            <ProviderGlyph provider={spec.provider} size="sm" className="rounded-full" />
            {label && <span className="text-text-muted">{label}</span>}
            <span className={cn('truncate font-medium text-text-primary', compact ? 'max-w-28' : 'max-w-44')}>{spec.name || shortModel(spec.model) || 'Choose model'}</span>
            {spec.name && !compact && <span className="max-w-28 truncate text-text-muted">{shortModel(spec.model)}</span>}
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: shareTone(share) }} title={key ? `${key.label}: ${key.tokenLimit == null ? 'no limit' : `${fmtTokens(key.remaining)} left`}` : ''} />
            <ChevronDown className="size-3 text-text-muted" />
          </button>
        </PopoverTrigger>
        {onRemove && (
          <button type="button" onClick={onRemove} className="mr-1 grid size-5 place-items-center rounded-full text-text-muted hover:bg-text-primary/10 hover:text-text-primary" aria-label="Remove agent">
            <X className="size-3" />
          </button>
        )}
      </span>
      <PopoverContent align="start" className="w-[340px] p-0">
        <div className="max-h-[70vh] overflow-y-auto p-3">
          <div className="mb-1.5 text-[11px] font-medium text-text-muted">Provider</div>
          <div className="grid grid-cols-4 gap-1">
            {providers.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  const d = defaultSpec(boot, p, need === 'chat' ? undefined : need)
                  if (d) onChange({ ...d, name: spec.name })
                }}
                className={cn('flex flex-col items-center gap-1 rounded-lg py-2 text-[10.5px] transition-colors', spec.provider === p ? 'bg-accent-brand/10 text-text-primary' : 'text-text-muted hover:bg-text-primary/5')}
              >
                <ProviderGlyph provider={p} size="sm" />
                <span className="max-w-full truncate px-1">{vendorName(p)}</span>
              </button>
            ))}
          </div>

          <div className="mb-1.5 mt-4 text-[11px] font-medium text-text-muted">Account</div>
          <div className="space-y-0.5">
            <Option active={spec.keyId === 'auto'} onClick={() => onChange({ ...spec, keyId: 'auto' })} icon={<Sparkles className="size-3.5 text-accent-brand" />} title="Auto" sub="Most budget left · switches when a limit is hit" />
            {keys.map((k) => (
              <Option
                key={k.id}
                active={spec.keyId === k.id}
                onClick={() => onChange({ ...spec, keyId: k.id, model: k.models.includes(spec.model) ? spec.model : k.defaultModel || spec.model })}
                icon={<span className="size-2 rounded-full" style={{ background: shareTone(keyShare(k)) }} />}
                title={k.label}
                sub={`${k.tokenLimit == null ? 'No limit' : `${fmtTokens(k.remaining)} left`} · ${k.active}/${k.maxConcurrency} busy`}
              />
            ))}
          </div>

          <div className="mb-1.5 mt-4 flex items-center justify-between text-[11px] font-medium text-text-muted">
            Model
            <button type="button" className="text-accent-brand" onClick={() => setCustom((c) => !c)}>
              {custom ? 'Pick from list' : 'Type an id'}
            </button>
          </div>
          {custom || !models.length ? (
            <Input value={spec.model} onChange={(e) => onChange({ ...spec, model: e.target.value })} placeholder="model id" className="h-8 font-mono text-xs" />
          ) : (
            <div className="max-h-44 space-y-0.5 overflow-y-auto">
              {models.map((m) => (
                <button key={m} type="button" onClick={() => onChange({ ...spec, model: m })} className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-mono text-[11.5px]', spec.model === m ? 'bg-accent-brand/10 text-text-primary' : 'text-text-secondary hover:bg-text-primary/5')}>
                  <span className="min-w-0 flex-1 truncate">{m}</span>
                  {spec.model === m && <Check className="size-3.5 text-accent-brand" />}
                </button>
              ))}
            </div>
          )}

          {supportsEffort && need !== 'images' && (
            <>
              <div className="mb-1.5 mt-4 text-[11px] font-medium text-text-muted">Effort</div>
              <div className="grid grid-cols-5 gap-0.5 rounded-lg bg-text-primary/5 p-0.5">
                {EFFORTS.map((e) => (
                  <button key={e} type="button" onClick={() => onChange({ ...spec, effort: e })} className={cn('h-6 rounded-md text-[10.5px] capitalize', (spec.effort ?? 'high') === e ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}

          {need === 'tools' && (
            <>
              <div className="mb-1.5 mt-4 text-[11px] font-medium text-text-muted">Name · the lead can assign work by name</div>
              <Input value={spec.name ?? ''} onChange={(e) => onChange({ ...spec, name: e.target.value.slice(0, 40) || undefined })} placeholder="e.g. frontend" className="h-8 text-xs" />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Option({ active, onClick, title, sub, icon }: { active: boolean; onClick: () => void; title: string; sub: string; icon: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left', active ? 'bg-accent-brand/10' : 'hover:bg-text-primary/5')}>
      <span className="grid size-4 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] text-text-primary">{title}</span>
        <span className="block truncate text-[11px] text-text-muted">{sub}</span>
      </span>
      {active && <Check className="size-3.5 text-accent-brand" />}
    </button>
  )
}
