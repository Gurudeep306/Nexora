import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Brain, Database, FileMinus, Globe, Infinity as InfinityIcon, Map as MapIcon, Minimize2, Plus, Puzzle, Radar, Route, ScanSearch, Scissors, Shield, Trash2 } from 'lucide-react'
import { Button, Input, Modal, Select, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { useHive } from '../store'
import type { Plugin } from '../types'
import { PageTitle, ProviderGlyph, Toggle, vendorName } from '../ui'

const ICONS: Record<string, typeof Puzzle> = {
  infinity: InfinityIcon,
  brain: Brain,
  radar: Radar,
  map: MapIcon,
  scissors: Scissors,
  'file-minus': FileMinus,
  database: Database,
  minimize: Minimize2,
  route: Route,
  shield: Shield,
  scan: ScanSearch,
  globe: Globe,
}

const CATEGORY_ORDER = ['Token saver', 'Reliability', 'Context', 'Control', 'Quality', 'Tools']

export default function PluginsPage() {
  const { boot, project, pluginsVersion } = useHive()
  const toast = useToast()
  // Starts on the project you're in (even if it loads after this page); your pick wins after that.
  const [chosen, setScope] = useState<string | null>(null)
  const scope = chosen ?? project?.id ?? '*'
  const [data, setData] = useState<{ builtins: Plugin[]; custom: Plugin[] } | null>(null)
  const [editing, setEditing] = useState<Plugin | 'new' | null>(null)
  const load = useCallback(() => hiveApi.plugins(scope === '*' ? null : scope).then(setData).catch(() => {}), [scope])
  useEffect(() => {
    load()
  }, [load, pluginsVersion])

  const groups = useMemo(() => {
    const m = new Map<string, Plugin[]>()
    for (const p of data?.builtins ?? []) (m.get(p.category ?? 'Other') ?? m.set(p.category ?? 'Other', []).get(p.category ?? 'Other')!).push(p)
    return [...m.entries()].sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]))
  }, [data])

  if (!boot) return null
  const canWorkspace = boot.me.admin

  const set = async (p: Plugin, body: { enabled?: boolean; config?: Record<string, unknown> }) => {
    try {
      await hiveApi.setPlugin(p.id, { scope, ...body })
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    }
  }
  const reset = async (p: Plugin) => {
    try {
      await hiveApi.resetPlugin(p.id, scope)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not reset')
    }
  }
  const toggleCustom = (c: Plugin, v: boolean) =>
    hiveApi
      .updateCustomPlugin(c.id, { enabled: v })
      .then(load)
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not save'))
  const custom = (data?.custom ?? []).filter((c) => scope === '*' || c.scope === scope || c.scope === '*')
  const enabledCount = (data?.builtins ?? []).filter((p) => p.enabled).length + custom.filter((c) => c.enabled).length

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 pb-20 pt-10 sm:px-8">
      <PageTitle icon={<Puzzle />} title="Plugins" sub={`${enabledCount} active · they cut token use, keep work going when limits hit, and share context between agents.`}>
        <Button onClick={() => setEditing('new')}>
          <Plus /> New plugin
        </Button>
      </PageTitle>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Select value={scope} onValueChange={setScope} className="w-60" aria-label="Settings for">
          {canWorkspace && <option value="*">All projects (the default)</option>}
          {boot.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <p className="text-[13px] text-[var(--hv-text-2)]">{scope === '*' ? 'What every project uses unless it changes a plugin.' : 'This project follows All projects, except where it changes a plugin.'}</p>
      </div>

      {groups.map(([cat, list]) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary">{cat}</h2>
          <div className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
            {list.map((p) => (
              <PluginRow key={p.id} p={p} onToggle={(v) => set(p, { enabled: v })} onConfig={(config) => set(p, { config })} onReset={p.scope === scope && (scope !== '*' || canWorkspace) ? () => reset(p) : undefined} locked={scope === '*' && !canWorkspace} inherited={scope !== '*' && p.scope !== scope} projectView={scope !== '*'} />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-10">
        <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Your plugins</h2>
        {custom.length === 0 ? (
          <button type="button" onClick={() => setEditing('new')} className="flex w-full items-center gap-4 rounded-[var(--hv-r-card)] border border-dashed border-[var(--hv-border-strong,var(--hv-border))] p-5 text-left transition-colors hover:bg-[var(--hv-fill)]">
            <span className="grid size-10 place-items-center rounded-xl bg-[var(--hv-fill)]">
              <Puzzle className="size-5 text-text-secondary" />
            </span>
            <span>
              <span className="block text-[14px] font-medium">Write an instruction plugin</span>
              <span className="block text-[13px] text-text-muted">Coding standards, a review checklist, a house style, a “don't touch” list — injected into every agent or chat you choose.</span>
            </span>
          </button>
        ) : (
          <div className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
            {custom.map((c) => (
              <div key={c.id} className="flex items-center gap-4 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--hv-fill)]">
                  <Puzzle className="size-4 text-text-secondary" />
                </span>
                <button type="button" onClick={() => setEditing(c)} className="min-w-0 flex-1 text-left">
                  <span className="block text-[14px] text-text-primary">{c.name}</span>
                  <span className="block truncate text-[12.5px] text-text-muted">
                    {c.description || String(c.config.instructions ?? '').slice(0, 120)} · {({ all: 'agents & chat', tasks: 'agents', chat: 'chat' } as Record<string, string>)[String(c.config.appliesTo ?? 'all')]} · {c.scope === '*' ? 'all projects' : boot.projects.find((p) => p.id === c.scope)?.name}
                  </span>
                </button>
                <Toggle on={c.enabled} label={c.name} onChange={(v) => toggleCustom(c, v)} />
              </div>
            ))}
          </div>
        )}
      </section>
      {editing && <CustomPluginDialog plugin={editing === 'new' ? null : editing} scope={scope} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  )
}

function PluginRow({ p, onToggle, onConfig, onReset, locked, inherited, projectView }: { p: Plugin; onToggle: (v: boolean) => void; onConfig: (c: Record<string, unknown>) => void; onReset?: () => void; locked: boolean; inherited: boolean; projectView: boolean }) {
  const Icon = ICONS[p.icon ?? ''] ?? Puzzle
  const [open, setOpen] = useState(false)
  const hasConfig = Object.keys(p.config ?? {}).length > 0
  return (
    <div className="py-4">
      <div className="flex items-start gap-4">
        <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--hv-fill)] transition-colors', p.enabled ? 'text-[var(--hv-text-1)]' : 'text-[var(--hv-text-3)]')}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium text-text-primary">{p.name}</span>
            {inherited && p.scope === '*' && <span className="text-[11.5px] text-text-muted">· set for all projects</span>}
            {onReset && (
              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-text-muted">
                · {projectView ? 'changed for this project' : 'changed from the default'}
                <button type="button" onClick={onReset} className="underline underline-offset-2 hover:text-text-primary">
                  {projectView ? 'Use the default' : 'Reset'}
                </button>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-text-muted">{p.description}</p>
          {hasConfig && p.enabled && (
            <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1.5 text-[12.5px] text-accent-brand hover:underline">
              {open ? 'Hide settings' : 'Settings'}
            </button>
          )}
          {open && p.enabled && <PluginConfig p={p} onSave={onConfig} />}
        </div>
        <Toggle on={p.enabled} label={p.name} onChange={onToggle} disabled={locked} />
      </div>
    </div>
  )
}

function PluginConfig({ p, onSave }: { p: Plugin; onSave: (c: Record<string, unknown>) => void }) {
  const { boot } = useHive()
  const [cfg, setCfg] = useState<Record<string, unknown>>(p.config)
  if (!boot) return null
  if (p.id === 'never_stop') {
    const vendors = boot.catalogue.providers.filter((v) => v.caps.tools)
    const order = [...new Set([...((cfg.order as string[]) ?? []), ...vendors.map((v) => v.id)])].filter((id) => vendors.some((v) => v.id === id))
    const move = (i: number, d: number) => {
      const next = [...order]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      setCfg({ ...cfg, order: next })
    }
    const keyed = new Set(boot.keys.map((k) => k.provider))
    return (
      <div className="mt-3 rounded-xl bg-[var(--hv-fill)] p-3">
        <p className="mb-2 text-[12.5px] text-text-muted">When a provider runs out, try them in this order (only ones with keys are used):</p>
        <ol className="space-y-1">
          {order.map((id, i) => (
            <li key={id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1', !keyed.has(id) && 'opacity-40')}>
              <span className="w-5 text-right text-[12px] tabular-nums text-text-muted">{i + 1}</span>
              <ProviderGlyph provider={id} size="xs" />
              <span className="flex-1 text-[13px]">{vendorName(id)}</span>
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-6 place-items-center rounded text-text-muted hover:text-text-primary disabled:opacity-30" aria-label="Up">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" disabled={i === order.length - 1} onClick={() => move(i, 1)} className="grid size-6 place-items-center rounded text-text-muted hover:text-text-primary disabled:opacity-30" aria-label="Down">
                <ArrowDown className="size-3.5" />
              </button>
            </li>
          ))}
        </ol>
        <Button size="sm" className="mt-2" onClick={() => onSave({ order })}>
          Save order
        </Button>
      </div>
    )
  }
  if (p.id === 'auto_review') {
    return (
      <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-[var(--hv-fill)] p-3">
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Reviewer provider
          <Select value={String(cfg.provider ?? '')} onValueChange={(v) => setCfg({ ...cfg, provider: v })} className="w-44" placeholder="Cheapest available">
            <option value="">Cheapest available</option>
            {[...new Set(boot.keys.map((k) => k.provider))].map((v) => (
              <option key={v} value={v}>
                {vendorName(v)}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] text-text-muted">
          Model (optional)
          <Input value={String(cfg.model ?? '')} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="h-9 w-52 font-mono text-xs" />
        </label>
        <Button size="sm" onClick={() => onSave(cfg)}>
          Save
        </Button>
      </div>
    )
  }
  const LABELS: Record<string, string> = { triggerTokens: 'Trim when context passes (tokens)', maxLines: 'Lines per read', maxTokensPerTask: 'Tokens per task', maxItems: 'Memory items shown to agents', maxEntries: 'Map entries' }
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-[var(--hv-fill)] p-3">
      {Object.entries(cfg).map(([k, v]) => (
        <label key={k} className="flex flex-col gap-1 text-[12px] text-text-muted">
          {LABELS[k] ?? k}
          <Input value={String(v ?? '')} onChange={(e) => setCfg({ ...cfg, [k]: typeof v === 'number' ? Number(e.target.value.replace(/[^\d]/g, '')) : e.target.value })} className="h-9 w-48 tabular-nums" />
        </label>
      ))}
      <Button size="sm" onClick={() => onSave(cfg)}>
        Save
      </Button>
    </div>
  )
}

function CustomPluginDialog({ plugin, scope, onClose, onSaved }: { plugin: Plugin | null; scope: string; onClose: () => void; onSaved: () => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [name, setName] = useState(plugin?.name ?? '')
  const [description, setDescription] = useState(plugin?.description ?? '')
  const [instructions, setInstructions] = useState(String(plugin?.config.instructions ?? ''))
  const [appliesTo, setAppliesTo] = useState(String(plugin?.config.appliesTo ?? 'all'))
  const [where, setWhere] = useState(plugin?.scope ?? scope)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      if (plugin) await hiveApi.updateCustomPlugin(plugin.id, { name, description, instructions, appliesTo })
      else await hiveApi.addCustomPlugin({ scope: where, name, description, instructions, appliesTo })
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={plugin ? plugin.name : 'New plugin'} description="Instructions added to every agent and/or chat — written once, used by every model." size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-text-secondary">
            Name
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Security checklist" maxLength={60} />
          </label>
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-text-secondary">
            Short description
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-text-secondary">
          <span className="flex items-baseline justify-between gap-2">
            Instructions
            <span className={cn('hv-num text-[11.5px] font-normal', instructions.length > 5400 ? 'text-[var(--color-state-warning)]' : 'text-text-muted')}>
              {instructions.length.toLocaleString()} / 6,000
            </span>
          </span>
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={10} maxLength={6000} className="font-mono text-[12.5px]" placeholder={'- Validate every input at the API boundary\n- Never log secrets\n- Prefer small pure functions'} />
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-text-secondary">
            Used by
            <Select value={appliesTo} onValueChange={setAppliesTo} className="w-44">
              <option value="all">Agents and chat</option>
              <option value="tasks">Agents only</option>
              <option value="chat">Chat only</option>
            </Select>
          </label>
          {!plugin && (
            <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-text-secondary">
              Where
              <Select value={where} onValueChange={setWhere} className="w-48">
                <option value="*">All projects</option>
                {boot?.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
          <span className="flex-1" />
          {plugin && !confirmDelete && (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Delete
            </Button>
          )}
          {plugin && confirmDelete && (
            <Button
              variant="secondary"
              className="text-state-error"
              onClick={() =>
                hiveApi
                  .deleteCustomPlugin(plugin.id)
                  .then(() => {
                    onSaved()
                    onClose()
                  })
                  .catch((e) => toast.error(e.message))
              }
            >
              <Trash2 /> Delete for good
            </Button>
          )}
          <Button onClick={save} loading={busy} disabled={!name.trim() || !instructions.trim()}>
            Save plugin
          </Button>
        </div>
      </div>
    </Modal>
  )
}
