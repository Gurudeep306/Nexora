import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Eye, FileText, Image as ImageIcon, Search, Sparkles, Star, Wrench, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { AgentSpec, Bootstrap, Effort, HiveKey, ProviderId, ProviderInfo } from './types'
import { ProviderGlyph, fmtTokens, keyShare, shareTone, vendorName } from './ui'
import { AgentMark, FAMILY, familyOf } from './agents'

const EFFORTS: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']

export const vendorInfo = (boot: Bootstrap, id: string): ProviderInfo | undefined => boot.catalogue.providers.find((p) => p.id === id)

/** Vendors with at least one usable key (optionally: that can use tools / make images). */
export function usableProviders(boot: Bootstrap, need?: 'tools' | 'images'): ProviderId[] {
  const set = new Set<ProviderId>()
  for (const k of boot.keys) if (!k.disabled && k.status !== 'invalid') set.add(k.provider)
  return boot.catalogue.providers.filter((p) => set.has(p.id) && (!need || p.caps[need])).map((p) => p.id)
}

const NOT_CHAT = /(embed|whisper|tts|transcri|audio|speech|realtime|moderation|guard|rerank|dall-?e|image-|-image|imagen|veo|flux|stable-diffusion|davinci|babbage|aqa|distil)/i

export function modelsFor(boot: Bootstrap, provider: ProviderId, keyId: string): string[] {
  const keys = boot.keys.filter((k) => k.provider === provider && (keyId === 'auto' || k.id === keyId))
  const set = new Set<string>()
  for (const k of keys) for (const m of k.models) if (!NOT_CHAT.test(m)) set.add(m)
  const suggested = vendorInfo(boot, provider)?.suggested ?? []
  if (!set.size) return suggested
  const defaults = keys.map((k) => k.defaultModel).filter((m): m is string => !!m && set.has(m))
  const first = [...new Set([...defaults, ...suggested.filter((m) => set.has(m))])]
  return [...first, ...[...set].filter((m) => !first.includes(m)).sort()]
}

/** The smart router: Hive picks the best model for the kind of work. */
export const AUTO_SPEC: AgentSpec = { provider: 'auto', keyId: 'auto', model: '' }

export function defaultSpec(boot: Bootstrap, provider?: ProviderId, need: 'tools' | 'images' | undefined = 'tools'): AgentSpec | null {
  // Auto is the default whenever anything usable is connected (not for images).
  if (!provider && need !== 'images' && usableProviders(boot, need).length) return { ...AUTO_SPEC }
  const recent = readList(RECENT_KEY)[0]
  const usable = usableProviders(boot, need)
  if (!provider && recent && usable.includes(recent.provider) && modelsFor(boot, recent.provider, 'auto').includes(recent.model)) {
    return { provider: recent.provider, keyId: 'auto', model: recent.model, effort: recent.provider === 'anthropic' ? 'high' : null }
  }
  const p = provider ?? usable[0]
  if (!p) return null
  const key = bestKey(boot.keys.filter((k) => k.provider === p))
  const models = modelsFor(boot, p, 'auto')
  return { provider: p, keyId: 'auto', model: key?.defaultModel || models[0] || '', effort: p === 'anthropic' ? 'high' : null }
}

function bestKey(keys: HiveKey[]): HiveKey | undefined {
  return [...keys].filter((k) => !k.disabled).sort((a, b) => (keyShare(b) ?? 1) - (keyShare(a) ?? 1))[0]
}

export const shortModel = (m: string) => m.replace(/^claude-/, '').replace(/^accounts\/[^/]+\/models\//, '').replace(/^[^/]+\//, '')

/* Favourites and recents live in this browser only. */
const FAV_KEY = 'hive:fav-models'
const RECENT_KEY = 'hive:recent-models'
type ModelRef = { provider: string; model: string }
function readList(k: string): ModelRef[] {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]')
  } catch {
    return []
  }
}
function writeList(k: string, v: ModelRef[]) {
  try {
    localStorage.setItem(k, JSON.stringify(v.slice(0, 12)))
  } catch {
    /* ignore */
  }
}
export function noteRecentModel(provider: string, model: string) {
  writeList(RECENT_KEY, [{ provider, model }, ...readList(RECENT_KEY).filter((x) => !(x.provider === provider && x.model === model))])
}

export function AgentChip({
  boot,
  spec,
  onChange,
  onRemove,
  label,
  need = 'tools',
  compact,
  align = 'start',
  side,
}: {
  boot: Bootstrap
  spec: AgentSpec
  onChange: (s: AgentSpec) => void
  onRemove?: () => void
  label?: string
  need?: 'tools' | 'images' | 'chat'
  compact?: boolean
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom'
}) {
  const [open, setOpen] = useState(false)
  const keys = boot.keys.filter((k) => k.provider === spec.provider && !k.disabled)
  const key = spec.keyId === 'auto' ? bestKey(keys) : keys.find((k) => k.id === spec.keyId)
  const share = key ? keyShare(key) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className="group inline-flex items-center rounded-full bg-text-primary/[0.06] transition-colors hover:bg-text-primary/[0.1]">
        <PopoverTrigger asChild>
          <button type="button" className={cn('flex min-w-0 items-center gap-1.5 py-1 pl-1 text-[12.5px] outline-none', onRemove ? 'pr-1' : 'pr-2.5')}>
            <AgentMark provider={spec.provider} model={spec.model} size={20} />
            {label && <span className="text-text-muted">{label}</span>}
            <span className={cn('truncate font-medium text-text-primary', compact ? 'max-w-28' : 'max-w-48')}>{spec.provider === 'auto' ? (spec.freeOnly ? 'Auto · free' : 'Auto') : spec.name || shortModel(spec.model) || 'Choose model'}</span>
            {spec.name && !compact && <span className="max-w-28 truncate text-text-muted">{shortModel(spec.model)}</span>}
            {spec.effort && spec.provider === 'anthropic' && !compact && <span className="text-[11px] text-text-muted">· {spec.effort}</span>}
            {spec.provider !== 'auto' && <span className="size-1.5 shrink-0 rounded-full" style={{ background: shareTone(share) }} title={key ? `${key.label}: ${key.tokenLimit == null ? 'no limit' : `${fmtTokens(key.remaining)} left`}` : ''} />}
            <ChevronDown className="size-3 text-text-muted transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </PopoverTrigger>
        {onRemove && (
          <button type="button" onClick={onRemove} className="mr-1 grid size-5 place-items-center rounded-full text-text-muted hover:bg-text-primary/10 hover:text-text-primary" aria-label="Remove agent">
            <X className="size-3" />
          </button>
        )}
      </span>
      <PopoverContent align={align} side={side} className="w-[min(560px,calc(100vw-24px))] overflow-hidden p-0">
        {open && (
          <ModelPanel
            boot={boot}
            spec={spec}
            need={need}
            onChange={(s, close) => {
              onChange(s)
              if (close) {
                noteRecentModel(s.provider, s.model)
                setOpen(false)
              }
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

function ModelPanel({ boot, spec, need, onChange }: { boot: Bootstrap; spec: AgentSpec; need: 'tools' | 'images' | 'chat'; onChange: (s: AgentSpec, close?: boolean) => void }) {
  const providers = usableProviders(boot, need === 'chat' ? undefined : need)
  const [q, setQ] = useState('')
  const [vendor, setVendor] = useState<string>('all')
  const [favs, setFavs] = useState<ModelRef[]>(() => readList(FAV_KEY))
  const recents = useMemo(() => readList(RECENT_KEY).filter((r) => providers.includes(r.provider)), [providers])
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const isFav = (p: string, m: string) => favs.some((f) => f.provider === p && f.model === m)
  const toggleFav = (p: string, m: string) => {
    const next = isFav(p, m) ? favs.filter((f) => !(f.provider === p && f.model === m)) : [{ provider: p, model: m }, ...favs]
    setFavs(next)
    writeList(FAV_KEY, next)
  }

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    const match = (p: string, m: string) => !s || `${vendorName(p)} ${m}`.toLowerCase().includes(s)
    const out: { title: string; items: ModelRef[] }[] = []
    if (vendor === 'all' && !s) {
      const fav = favs.filter((f) => providers.includes(f.provider))
      if (fav.length) out.push({ title: 'Favourites', items: fav })
      if (recents.length) out.push({ title: 'Recent', items: recents.filter((r) => !isFav(r.provider, r.model)).slice(0, 5) })
    }
    for (const p of providers) {
      if (vendor !== 'all' && vendor !== p) continue
      const items = modelsFor(boot, p, 'auto')
        .filter((m) => match(p, m))
        .map((m) => ({ provider: p, model: m }))
      if (items.length) out.push({ title: vendorName(p), items: vendor === 'all' && !s ? items.slice(0, 6) : items })
    }
    return out.filter((g) => g.items.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, vendor, favs, recents, boot])
  const flat = groups.flatMap((g) => g.items)

  useEffect(() => setCursor(0), [q, vendor])
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${cursor}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const pick = (r: ModelRef) => {
    const sameVendor = r.provider === spec.provider
    onChange({ ...spec, provider: r.provider, model: r.model, keyId: sameVendor ? spec.keyId : 'auto', effort: r.provider === 'anthropic' ? (spec.effort ?? 'high') : null, freeOnly: undefined }, true)
  }
  const keys = boot.keys.filter((k) => k.provider === spec.provider && !k.disabled)
  const supportsEffort = spec.provider === 'anthropic' || spec.provider === 'openai'
  let i = -1

  return (
    <div className="flex max-h-[min(560px,70vh)] flex-col">
      <label className="flex items-center gap-2 border-b hive-line px-3.5">
        <Search className="size-4 text-text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') (e.preventDefault(), setCursor((c) => Math.min(flat.length - 1, c + 1)))
            else if (e.key === 'ArrowUp') (e.preventDefault(), setCursor((c) => Math.max(0, c - 1)))
            else if (e.key === 'Enter') {
              e.preventDefault()
              if (flat[cursor]) pick(flat[cursor])
              else if (q.trim()) onChange({ ...spec, model: q.trim() }, true)
            }
          }}
          placeholder="Search models — or type any model id and press Enter"
          className="h-11 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-muted"
        />
        <span className="hive-kbd">↵</span>
      </label>
      <div className="flex min-h-0 flex-1">
        <nav className="hive-scroll hidden w-40 shrink-0 overflow-y-auto border-r hive-line p-1.5 sm:block">
          <VendorTab active={vendor === 'all'} onClick={() => setVendor('all')} icon={<Sparkles className="size-3.5 text-accent-brand" />} label="All models" />
          {providers.map((p) => (
            <VendorTab key={p} active={vendor === p} onClick={() => setVendor(p)} icon={<ProviderGlyph provider={p} size="xs" />} label={vendorName(p)} count={modelsFor(boot, p, 'auto').length} />
          ))}
          {!providers.length && <p className="p-2 text-[11.5px] text-text-muted">Add a key in Keys first.</p>}
        </nav>
        <div ref={listRef} className="hive-scroll min-h-0 flex-1 overflow-y-auto p-1.5">
          {need !== 'images' && vendor === 'all' && !q.trim() && (
            <div className="mb-1.5">
              <div className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">Let Hive choose</div>
              {[
                { free: false, title: 'Auto', sub: 'The best model for this kind of job — free and plan models first' },
                { free: true, title: 'Auto · free only', sub: 'Only free models (free tiers and :free models)' },
              ].map((o) => {
                const active = spec.provider === 'auto' && !!spec.freeOnly === o.free
                return (
                  <button key={o.title} type="button" onClick={() => onChange({ provider: 'auto', keyId: 'auto', model: '', freeOnly: o.free || undefined, name: spec.name }, true)} className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left', active ? 'bg-accent-brand/10' : 'hover:bg-text-primary/[0.04]')}>
                    <AgentMark provider="auto" size={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-text-primary">{o.title}</span>
                      <span className="block truncate text-[11px] text-text-muted">{o.sub}</span>
                    </span>
                    {active && <Check className="size-3.5 shrink-0 text-accent-brand" />}
                  </button>
                )
              })}
            </div>
          )}
          {groups.map((g) => (
            <div key={g.title} className="mb-1.5">
              <div className="px-2 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">{g.title}</div>
              {g.items.map((r) => {
                i++
                const idx = i
                const caps = vendorInfo(boot, r.provider)?.caps
                const active = r.provider === spec.provider && r.model === spec.model
                return (
                  <div
                    key={`${g.title}:${r.provider}:${r.model}`}
                    data-i={idx}
                    onMouseEnter={() => setCursor(idx)}
                    className={cn('group/row flex items-center gap-2.5 rounded-lg px-2 py-1.5', idx === cursor ? 'bg-accent-brand/10' : '')}
                  >
                    <button type="button" onClick={() => pick(r)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                      <AgentMark provider={r.provider} model={r.model} size={22} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-text-primary">{shortModel(r.model)}</span>
                        <span className="block truncate text-[10.5px] text-text-muted">
                          {FAMILY[familyOf(r.provider, r.model)].name} · {vendorName(r.provider)} · <span className="font-mono">{r.model}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-text-muted">
                        {caps?.vision && <Eye className="size-3" aria-label="Sees images" />}
                        {caps?.pdf && <FileText className="size-3" aria-label="Reads PDFs" />}
                        {caps?.tools && <Wrench className="size-3" aria-label="Uses tools" />}
                        {caps?.images && <ImageIcon className="size-3" aria-label="Makes images" />}
                      </span>
                      {active && <Check className="size-3.5 shrink-0 text-accent-brand" />}
                    </button>
                    <button type="button" onClick={() => toggleFav(r.provider, r.model)} className={cn('grid size-6 shrink-0 place-items-center rounded-md', isFav(r.provider, r.model) ? 'text-state-warning' : 'text-text-muted opacity-0 group-hover/row:opacity-100 hover:text-text-primary')} aria-label="Favourite">
                      <Star className={cn('size-3.5', isFav(r.provider, r.model) && 'fill-current')} />
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
          {!flat.length && (
            <div className="p-6 text-center text-[12.5px] text-text-muted">
              No model matches.{q.trim() && <> Press <span className="hive-kbd">↵</span> to use “{q.trim()}”.</>}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-2.5 border-t hive-line bg-text-primary/[0.02] p-3">
        {spec.provider !== 'auto' && (
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] font-medium text-text-muted">Account</span>
          <div className="hive-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
            <Seg active={spec.keyId === 'auto'} onClick={() => onChange({ ...spec, keyId: 'auto' })}>
              <Sparkles className="size-3 text-accent-brand" /> Auto
            </Seg>
            {keys.map((k) => (
              <Seg key={k.id} active={spec.keyId === k.id} onClick={() => onChange({ ...spec, keyId: k.id })} title={`${k.tokenLimit == null ? 'No limit' : `${fmtTokens(k.remaining)} left`} · ${k.active}/${k.maxConcurrency} busy`}>
                <span className="size-1.5 rounded-full" style={{ background: shareTone(keyShare(k)) }} />
                {k.label}
              </Seg>
            ))}
          </div>
        </div>
        )}
        {supportsEffort && need !== 'images' && (
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-medium text-text-muted">Effort</span>
            <div className="grid flex-1 grid-cols-5 gap-0.5 rounded-lg bg-text-primary/[0.06] p-0.5">
              {EFFORTS.map((e) => (
                <button key={e} type="button" onClick={() => onChange({ ...spec, effort: e })} className={cn('h-6 rounded-md text-[11px] capitalize transition-colors', (spec.effort ?? 'high') === e ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
        {need === 'tools' && (
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] font-medium text-text-muted">Name</span>
            <input value={spec.name ?? ''} onChange={(e) => onChange({ ...spec, name: e.target.value.slice(0, 40) || undefined })} placeholder="optional — e.g. frontend (the lead assigns work by name)" className="h-7 flex-1 rounded-md bg-text-primary/[0.05] px-2 text-[12px] outline-none placeholder:text-text-muted focus:bg-text-primary/[0.08]" />
          </div>
        )}
      </div>
    </div>
  )
}

function VendorTab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition-colors', active ? 'bg-text-primary/[0.08] text-text-primary' : 'text-text-secondary hover:bg-text-primary/[0.04]')}>
      <span className="grid size-4 place-items-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count != null && <span className="text-[10.5px] tabular-nums text-text-muted">{count}</span>}
    </button>
  )
}

function Seg({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button type="button" title={title} onClick={onClick} className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] transition-colors', active ? 'bg-accent-brand/12 text-text-primary ring-1 ring-accent-brand/30' : 'bg-text-primary/[0.05] text-text-secondary hover:bg-text-primary/[0.08]')}>
      {children}
    </button>
  )
}
