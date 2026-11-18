/* ────────────────────────────────────────────────────────────────────────
   Toolbox — the open-source AI ecosystem, inside Hive.
   300+ tools from the team's research, each with a plain answer to “how do I
   use this here?”: connect it in one click (MCP servers, search engines,
   skills, model gateways), see that Hive already does it, run it on a
   worker machine, or open the project. Connected tools are shared by the
   whole staff workspace and show up in chat and in every agent.
   ──────────────────────────────────────────────────────────────────────── */
import { SecretInput } from '../kit'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  ExternalLink,
  Globe,
  KeyRound,
  Library,
  Play,
  Plug,
  Plus,
  PiggyBank,
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  Wand2,
  Wrench,
} from 'lucide-react'
import { Button, Input, Modal, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { errMsg } from '../Improve'
import { useHive } from '../store'
import type { EcoTool, Integration, McpToolInfo, ToolHow, Toolbox } from '../types'
import { PageTitle, Toggle, timeAgo } from '../ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

const HOW: Record<ToolHow, { label: string; short: string; hue: number; icon: typeof Plug; hint: string }> = {
  mcp: { label: 'Connect as MCP', short: 'MCP', hue: 285, icon: Plug, hint: 'Its tools appear in chat and for every agent' },
  search: { label: 'Search engine', short: 'Search', hue: 200, icon: Globe, hint: 'Powers web search and page reading in chat and agents' },
  provider: { label: 'Model endpoint', short: 'Models', hue: 160, icon: KeyRound, hint: 'OpenAI-compatible — add it in Keys and the router can use it' },
  skill: { label: 'Import skill', short: 'Skill', hue: 330, icon: Wand2, hint: 'Imported as a Hive plugin: instructions every agent follows' },
  subscription: { label: 'Subscription agent', short: 'Subscription', hue: 25, icon: Sparkles, hint: 'Runs on your plan through a worker machine' },
  builtin: { label: 'Built into Hive', short: 'Built in', hue: 145, icon: CheckCircle2, hint: 'Hive already does this — nothing to install' },
  machine: { label: 'Runs on a machine', short: 'Machine', hue: 55, icon: Server, hint: 'A CLI you run on a worker machine next to the bridge' },
  reference: { label: 'Reference', short: 'Reference', hue: 250, icon: BookOpen, hint: 'Good to know — open the project to learn more' },
}
const FILTERS: { id: string; label: string; hows: ToolHow[] | null }[] = [
  { id: 'all', label: 'Everything', hows: null },
  { id: 'connect', label: 'Connect in one click', hows: ['mcp', 'search', 'provider', 'skill', 'subscription'] },
  { id: 'builtin', label: 'Already in Hive', hows: ['builtin'] },
  { id: 'machine', label: 'Runs on a machine', hows: ['machine'] },
  { id: 'reference', label: 'Learn about', hows: ['reference'] },
]
const hue = (h: number, l = 62, c = 0.14) => `oklch(${l}% ${c} ${h})`
const PAGE = 48

export default function ToolboxPage() {
  const toast = useToast()
  const { on } = useHive()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as 'discover' | 'connected' | 'directories') || 'discover'
  const setTab = (t: string) => setParams((p) => (p.set('tab', t), p), { replace: true })
  const [data, setData] = useState<Toolbox | null>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [filter, setFilter] = useState('all')
  const [shown, setShown] = useState(PAGE)
  const [connect, setConnect] = useState<{ kind: 'mcp' | 'search' | 'skill'; tool?: EcoTool; engine?: string } | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await hiveApi.toolbox())
    } catch (e) {
      toast.error(errMsg(e))
    }
  }, [toast])
  useEffect(() => {
    load()
  }, [load])
  useEffect(() => on('toolbox', load), [on, load])

  const tools = useMemo(() => {
    if (!data) return []
    const f = FILTERS.find((x) => x.id === filter)
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return data.tools.filter((t) => {
      if (cat !== 'all' && t.cat !== cat) return false
      if (f?.hows && !f.hows.includes(t.use.how)) return false
      if (!words.length) return true
      const hay = `${t.name} ${t.what} ${t.iface} ${data.categories[t.cat]?.label ?? ''}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
  }, [data, q, cat, filter])
  useEffect(() => setShown(PAGE), [q, cat, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of data?.tools ?? []) c[t.cat] = (c[t.cat] ?? 0) + 1
    return c
  }, [data])
  const ready = data?.tools.filter((t) => ['mcp', 'search', 'provider', 'skill', 'subscription'].includes(t.use.how)).length ?? 0
  const builtin = data?.tools.filter((t) => t.use.how === 'builtin').length ?? 0
  const live = data?.integrations.filter((i) => i.enabled).length ?? 0
  const liveTools = data?.integrations.filter((i) => i.enabled).reduce((n, i) => n + i.tools.length, 0) ?? 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle icon={<Boxes />} title="Toolbox" sub={`${data?.tools.length ?? '300+'} open-source AI tools — connect what Hive can use, discover the rest. Shared by the whole team.`}>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConnect({ kind: 'skill' })}>
            <Wand2 /> Import a skill
          </Button>
          <Button onClick={() => setConnect({ kind: 'mcp' })}>
            <Plug /> Connect MCP server
          </Button>
        </div>
      </PageTitle>

      {/* Overview */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Plug} hue={285} value={live} label="Connected now" sub={liveTools ? `${liveTools} tools live in chat & agents` : 'Nothing connected yet'} onClick={() => setTab('connected')} />
        <Stat icon={Sparkles} hue={200} value={ready} label="Ready to connect" sub="MCP, search, models, skills" onClick={() => (setTab('discover'), setFilter('connect'))} />
        <Stat icon={CheckCircle2} hue={145} value={builtin} label="Already in Hive" sub="No install needed" onClick={() => (setTab('discover'), setFilter('builtin'))} />
        <Link to="/hive/spend/savings" className="hive-card hive-card-hover group relative overflow-hidden p-4">
          <PiggyBank className="size-5" style={{ color: hue(150) }} />
          <div className="mt-2 text-[14px] font-semibold text-text-primary">Token Steward</div>
          <div className="text-[12px] text-text-muted">Spend tokens wisely with these tools</div>
          <ArrowUpRight className="absolute right-3 top-3 size-4 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl bg-text-primary/[0.04] p-1 sm:w-fit">
        {(
          [
            ['discover', 'Discover', Boxes],
            ['connected', `Connected${live ? ` · ${live}` : ''}`, Plug],
            ['directories', 'Directories', Library],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('relative flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-medium transition-colors', tab === id ? 'text-text-primary' : 'text-text-muted hover:text-text-primary')}>
            {tab === id && <motion.span layoutId="toolbox-tab" className="absolute inset-0 rounded-xl bg-bg-surface shadow-sm ring-1 ring-[var(--hive-line)]" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <Icon className="relative size-4" />
            <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="hive-shimmer h-40 rounded-2xl" />
          ))}
        </div>
      ) : tab === 'discover' ? (
        <>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tools — “pdf”, “browser”, “vector”, “voice”, “gateway”…" className="h-10 rounded-xl pl-9" aria-label="Search tools" />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {FILTERS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={cn('h-9 shrink-0 rounded-full px-3 text-[12.5px] font-medium transition-colors', filter === f.id ? 'bg-accent-brand text-on-accent-brand' : 'bg-text-primary/[0.05] text-text-secondary hover:bg-text-primary/[0.08]')}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="hive-scroll -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <CatChip on={cat === 'all'} onClick={() => setCat('all')} label="All categories" n={data.tools.length} />
            {Object.entries(data.categories).map(([id, c]) => (
              <CatChip key={id} on={cat === id} onClick={() => setCat(id)} label={c.label} n={counts[id] ?? 0} hint={c.hint} />
            ))}
          </div>
          {!tools.length ? (
            <div className="hive-card grid place-items-center gap-2 p-12 text-center">
              <Search className="size-6 text-text-muted" />
              <div className="text-[14px] font-medium">Nothing matches</div>
              <p className="max-w-sm text-[13px] text-text-muted">Try a broader word, or look through the directories — they list thousands more MCP servers and skills.</p>
              <Button variant="secondary" size="sm" onClick={() => setTab('directories')}>
                Open directories
              </Button>
            </div>
          ) : (
            <>
              <motion.div layout className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence initial={false}>
                  {tools.slice(0, shown).map((t, i) => (
                    <ToolCard key={t.id} t={t} i={i} catLabel={data.categories[t.cat]?.label ?? t.cat} onConnect={(kind) => setConnect({ kind, tool: t, engine: t.use.how === 'search' ? t.use.engine : undefined })} />
                  ))}
                </AnimatePresence>
              </motion.div>
              {tools.length > shown && (
                <div className="mt-5 flex justify-center">
                  <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                    <ChevronDown /> Show more · {tools.length - shown} left
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : tab === 'connected' ? (
        <Connected data={data} reload={load} onAdd={(kind) => setConnect({ kind })} />
      ) : (
        <Directories data={data} />
      )}

      <ConnectDialog state={connect} engines={data?.engines ?? {}} onClose={() => setConnect(null)} onDone={() => (setConnect(null), load())} />
    </div>
  )
}

function Stat({ icon: Icon, hue: h, value, label, sub, onClick }: { icon: typeof Plug; hue: number; value: number; label: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="hive-card hive-card-hover relative overflow-hidden p-4 text-left">
      <div className="flex items-center justify-between">
        <Icon className="size-5" style={{ color: hue(h) }} />
        <span className="text-[24px] font-semibold tabular-nums tracking-tight text-text-primary">{value}</span>
      </div>
      <div className="mt-2 text-[14px] font-semibold text-text-primary">{label}</div>
      <div className="truncate text-[12px] text-text-muted">{sub}</div>
    </button>
  )
}

function CatChip({ on, onClick, label, n, hint }: { on: boolean; onClick: () => void; label: string; n: number; hint?: string }) {
  return (
    <button type="button" title={hint} onClick={onClick} className={cn('flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-[12px] transition-colors', on ? 'border-accent-brand/40 bg-accent-brand/10 text-text-primary' : 'hive-line text-text-secondary hover:bg-text-primary/[0.04]')}>
      {label}
      <span className="tabular-nums text-text-muted">{n}</span>
    </button>
  )
}

function HowBadge({ how }: { how: ToolHow }) {
  const h = HOW[how]
  return (
    <Tooltip label={h.hint}>
      <span className="inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium" style={{ color: `color-mix(in oklab, ${hue(h.hue)} 62%, var(--color-text-primary))`, background: `color-mix(in oklab, ${hue(h.hue)} 13%, transparent)` }}>
        <h.icon className="size-3" /> {h.short}
      </span>
    </Tooltip>
  )
}

function ToolCard({ t, i, catLabel, onConnect }: { t: EcoTool; i: number; catLabel: string; onConnect: (kind: 'mcp' | 'search' | 'skill') => void }) {
  const h = HOW[t.use.how]
  let action: ReactNode
  if (t.connected) {
    action = (
      <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-state-success/12 px-2.5 text-[12px] font-medium text-state-success">
        <Check className="size-3.5" /> Connected
      </span>
    )
  } else if (t.use.how === 'mcp' || t.use.how === 'search' || t.use.how === 'skill') {
    const kind = t.use.how
    action = (
      <Button size="sm" variant="secondary" onClick={() => onConnect(kind)}>
        <h.icon /> {kind === 'skill' ? 'Import' : 'Connect'}
      </Button>
    )
  } else if (t.use.how === 'provider' || t.use.how === 'subscription') {
    action = (
      <Link to={`/hive/keys?add=${encodeURIComponent(t.use.vendor)}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] px-2.5 text-[12px] font-medium text-text-primary hover:bg-text-primary/[0.1]">
        <KeyRound className="size-3.5" /> Add in Keys
      </Link>
    )
  } else if (t.use.how === 'builtin') {
    action = (
      <Link to="/hive/extensions/plugins" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-state-success hover:bg-state-success/10">
        <CheckCircle2 className="size-3.5" /> In Hive
      </Link>
    )
  } else if (t.use.how === 'machine') {
    action = (
      <Link to="/hive/machines" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] px-2.5 text-[12px] font-medium text-text-primary hover:bg-text-primary/[0.1]">
        <Cpu className="size-3.5" /> Machines
      </Link>
    )
  }
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE, delay: Math.min(i, 12) * 0.02 } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
      className="hive-card hive-card-hover group relative flex flex-col overflow-hidden p-4"
    >
      <span className="absolute inset-x-0 top-0 h-[2px] opacity-0 transition-opacity group-hover:opacity-100" style={{ background: hue(h.hue) }} />
      <div className="mb-2 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl text-[15px] font-semibold" style={{ color: `color-mix(in oklab, ${hue(h.hue)} 62%, var(--color-text-primary))`, background: `color-mix(in oklab, ${hue(h.hue)} 14%, transparent)` }}>
          {t.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '·'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[14px] font-semibold text-text-primary">{t.name}</h2>
          <div className="truncate text-[11.5px] text-text-muted">{catLabel}</div>
        </div>
        <HowBadge how={t.use.how} />
      </div>
      <p className="line-clamp-3 flex-1 text-[13px] leading-relaxed text-text-secondary">{t.what}</p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
        <span className="rounded-md bg-text-primary/[0.05] px-1.5 py-0.5">{t.iface}</span>
        <Tooltip label={t.status}>
          <span className={cn('rounded-md px-1.5 py-0.5', t.license === 'oss' ? 'bg-state-success/10 text-state-success' : t.license === 'hosted' ? 'bg-state-warning/10 text-state-warning' : 'bg-text-primary/[0.05]')}>{t.license === 'oss' ? 'Open source' : t.license === 'hosted' ? 'Hosted' : 'Open core'}</span>
        </Tooltip>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t hive-line pt-3">
        <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary">
          <ExternalLink className="size-3.5" /> Project
        </a>
        {action}
      </div>
    </motion.article>
  )
}

/* ── Connected tools ─────────────────────────────────────────────────── */
function Connected({ data, reload, onAdd }: { data: Toolbox; reload: () => void; onAdd: (k: 'mcp' | 'search' | 'skill') => void }) {
  const mcp = data.integrations.filter((i) => i.kind === 'mcp')
  const search = data.integrations.filter((i) => i.kind === 'search')
  if (!data.integrations.length)
    return (
      <div className="hive-card relative overflow-hidden p-8 sm:p-10">
        <div className="relative max-w-xl">
          <Plug className="size-7 text-accent-brand" />
          <h2 className="mt-3 text-[20px] font-semibold tracking-tight">Give your agents real tools</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-text-secondary">
            Connect an <b>MCP server</b> (GitHub, Sentry, Linear, Notion, Supabase, Context7, Exa…) and its tools appear in chat and for every agent. Add a <b>search engine</b> (Tavily, Exa, Brave, SearXNG, Jina, Firecrawl) for sharper web research. <b>Import a skill</b> (Superpowers, wshobson/agents…) and every agent follows it.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => onAdd('mcp')}>
              <Plug /> Connect MCP server
            </Button>
            <Button variant="secondary" onClick={() => onAdd('search')}>
              <Globe /> Add search engine
            </Button>
            <Button variant="ghost" onClick={() => onAdd('skill')}>
              <Wand2 /> Import a skill
            </Button>
          </div>
        </div>
      </div>
    )
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-text-secondary">MCP servers · {mcp.reduce((n, i) => n + (i.enabled ? i.tools.length : 0), 0)} tools live</h2>
          <Button size="sm" variant="ghost" onClick={() => onAdd('mcp')}>
            <Plus /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {mcp.map((i) => (
            <IntegrationCard key={i.id} i={i} reload={reload} />
          ))}
          {!mcp.length && (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed hive-line px-6 py-8 text-center">
              <Plug className="size-5 text-text-muted" />
              <div className="text-[13.5px] font-medium text-text-primary">No MCP servers yet</div>
              <div className="max-w-xs text-[12.5px] text-text-muted">Connect one to give agents outside tools — databases, browsers, ticket queues.</div>
              <Button size="sm" variant="secondary" className="mt-1.5" onClick={() => onAdd('mcp')}>
                <Plus /> Connect MCP server
              </Button>
            </div>
          )}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-text-secondary">Search & reading engines</h2>
          <Button size="sm" variant="ghost" onClick={() => onAdd('search')}>
            <Plus /> Add
          </Button>
        </div>
        <div className="space-y-3">
          {search.map((i) => (
            <IntegrationCard key={i.id} i={i} reload={reload} />
          ))}
          {!search.length && <p className="text-[13px] text-text-muted">Using the built-in free search (DuckDuckGo). Add an engine for better results.</p>}
        </div>
      </section>
    </div>
  )
}

function IntegrationCard({ i, reload }: { i: Integration; reload: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const act = async (what: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(what)
    try {
      await fn()
      if (ok) toast.success(ok)
      reload()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  const tone = !i.enabled ? 'var(--color-text-muted)' : i.status === 'error' ? 'var(--color-state-error)' : 'var(--color-state-success)'
  return (
    <motion.div layout className="hive-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="relative grid size-10 place-items-center rounded-xl" style={{ background: `color-mix(in oklab, ${hue(i.kind === 'mcp' ? 285 : 200)} 14%, transparent)` }}>
          {i.kind === 'mcp' ? <Plug className="size-4.5" style={{ color: hue(285, 55) }} /> : <Globe className="size-4.5" style={{ color: hue(200, 55) }} />}
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-bg-surface" style={{ background: tone }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold">{i.name}</div>
          <div className="truncate text-[12px] text-text-muted">
            {i.kind === 'mcp' ? `${i.tools.length} tools · ${i.url}` : i.url || 'API'} · by @{i.createdBy}
            {i.checkedAt ? ` · checked ${timeAgo(i.checkedAt)}` : ''}
          </div>
          {i.status === 'error' && i.error && <div className="mt-0.5 text-[12px] text-state-error">{i.error}</div>}
        </div>
        <div className="flex items-center gap-1">
          {i.kind === 'mcp' && (
            <>
              <Tooltip label="Re-read its tools">
                <Button size="icon-sm" variant="ghost" aria-label="Refresh tools" onClick={() => act('refresh', () => hiveApi.refreshIntegration(i.id), 'Tools refreshed')} loading={busy === 'refresh'}>
                  <RefreshCw />
                </Button>
              </Tooltip>
              <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                <Wrench /> Tools <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
              </Button>
            </>
          )}
          <Toggle on={i.enabled} label={`${i.enabled ? 'Disable' : 'Enable'} ${i.name}`} onChange={(v) => act('toggle', () => hiveApi.updateIntegration(i.id, { enabled: v }))} />
          <Tooltip label="Remove">
            <Button size="icon-sm" variant="ghost" aria-label={`Remove ${i.name}`} onClick={() => act('remove', () => hiveApi.removeIntegration(i.id), 'Removed')} loading={busy === 'remove'}>
              <Trash2 />
            </Button>
          </Tooltip>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden border-t hive-line">
            <div className="grid gap-2 p-3 sm:grid-cols-2">
              {i.tools.map((t) => (
                <ToolTry key={t.name} integrationId={i.id} t={t} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function ToolTry({ integrationId, t }: { integrationId: string; t: McpToolInfo }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<{ content: string; isError?: boolean } | null>(null)
  const props = Object.entries(t.schema?.properties ?? {})
  const run = async () => {
    const input: Record<string, unknown> = {}
    for (const [k, p] of props) {
      const v = vals[k]
      if (v === undefined || v === '') continue
      input[k] = p.type === 'number' || p.type === 'integer' ? Number(v) : p.type === 'boolean' ? v === 'true' : p.type === 'object' || p.type === 'array' ? safeJson(v) : v
    }
    setBusy(true)
    try {
      setOut(await hiveApi.callIntegration(integrationId, t.name, input))
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="rounded-xl bg-text-primary/[0.03] p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-text-primary">
            {t.name}
            {t.readOnly && <span className="rounded bg-state-success/10 px-1 font-sans text-[10px] text-state-success">read-only</span>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-text-muted">{t.description || 'No description'}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          <Play /> Try
        </Button>
      </div>
      {open && (
        <div className="mt-2 space-y-2">
          {props.map(([k, p]) => (
            <label key={k} className="block">
              <span className="text-[11px] text-text-muted">
                {k}
                {t.schema.required?.includes(k) ? ' *' : ''} {p.type ? `· ${p.type}` : ''}
              </span>
              <Input value={vals[k] ?? ''} onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} placeholder={p.description ?? ''} className="h-8 text-[12.5px]" />
            </label>
          ))}
          <Button size="sm" onClick={run} loading={busy}>
            <Play /> Run
          </Button>
          {out && <pre className={cn('hive-code hive-scroll max-h-56 overflow-auto whitespace-pre-wrap rounded-lg p-2 text-[11.5px]', out.isError && 'text-state-error')}>{out.content}</pre>}
        </div>
      )}
    </div>
  )
}

function safeJson(s: string) {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

/* ── Directories ─────────────────────────────────────────────────────── */
function Directories({ data }: { data: Toolbox }) {
  return (
    <div>
      <p className="mb-4 max-w-2xl text-[13.5px] text-text-secondary">
        Curated directories with thousands more MCP servers, skills, agents and tools. Found something you like? Connect its MCP URL or import its skill from the buttons above. Catalogue snapshot: {data.snapshot}.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.directories.map((d, i) => (
          <motion.a key={d.name} href={d.url ?? '#'} target="_blank" rel="noreferrer" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.015, duration: 0.2 } }} className="hive-card hive-card-hover group flex items-start gap-3 p-4">
            <Library className="mt-0.5 size-4.5 shrink-0 text-accent-brand" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-text-primary">{d.name}</div>
              <p className="mt-0.5 text-[12.5px] text-text-muted">{d.what}</p>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </motion.a>
        ))}
      </div>
      <div className="hive-card mt-6 p-4 text-[12.5px] leading-relaxed text-text-muted">
        <b className="text-text-secondary">Before you connect anything:</b> check it's maintained and its licence fits; prefer read-only tokens; remember every connected tool's description is sent with each request — keep the set small (the Token Steward warns when it grows).
      </div>
    </div>
  )
}

/* ── Connect dialog: MCP server · search engine · skill ──────────────── */
function ConnectDialog({ state, engines, onClose, onDone }: { state: { kind: 'mcp' | 'search' | 'skill'; tool?: EcoTool; engine?: string } | null; engines: Toolbox['engines']; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const { project } = useHive()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [engine, setEngine] = useState('tavily')
  const [scope, setScope] = useState<'all' | 'project'>('all')
  const [busy, setBusy] = useState(false)
  const kind = state?.kind
  useEffect(() => {
    if (!state) return
    setName(state.tool?.name ?? '')
    setUrl(state.kind === 'skill' && state.tool ? state.tool.url : '')
    setToken('')
    setEngine(state.engine ?? 'tavily')
  }, [state])
  const eng = engines[engine]
  const submit = async () => {
    setBusy(true)
    try {
      if (kind === 'skill') {
        const r = await hiveApi.importSkill({ url, projectId: scope === 'project' ? project?.id : null })
        toast.success(`“${r.name}” is now a plugin every agent follows`)
      } else if (kind === 'mcp') {
        const r = await hiveApi.connectTool({ kind: 'mcp', name: name || undefined, url, token: token || undefined, toolId: state?.tool?.id ?? null })
        toast.success(`Connected — ${r.tools ?? 0} tools are live in chat and agents`)
      } else {
        await hiveApi.connectTool({ kind: 'search', engine, url: url || undefined, token: token || undefined, toolId: state?.tool?.id ?? null })
        toast.success(`${eng?.label ?? 'Engine'} is now used for web search`)
      }
      onDone()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  const title = kind === 'skill' ? 'Import a skill' : kind === 'mcp' ? `Connect ${state?.tool?.name ?? 'an MCP server'}` : 'Add a search engine'
  const desc =
    kind === 'skill'
      ? 'Paste a GitHub link to a SKILL.md, a skill folder or a repository. Long skills are condensed by a free model into compact instructions.'
      : kind === 'mcp'
        ? 'Paste the server’s remote URL (Streamable HTTP, usually ending in /mcp). Servers that only run locally (stdio) can be exposed with a gateway such as Docker MCP Gateway or MCPHub.'
        : 'Hive uses the first working engine for web search in chat and agents; Jina and Firecrawl also read JS-heavy pages.'
  const canSubmit = kind === 'skill' ? !!url.trim() : kind === 'mcp' ? !!url.trim() : eng && (eng.needs !== 'key' || !!token.trim()) && (eng.needs !== 'url' || !!url.trim())
  return (
    <Modal open={!!state} onClose={onClose} title={title} description={desc} size="md">
      <div className="space-y-3">
        {kind === 'search' && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(engines).map(([id, e]) => (
              <button key={id} type="button" onClick={() => setEngine(id)} className={cn('rounded-xl border p-2.5 text-left transition-colors', engine === id ? 'border-accent-brand/50 bg-accent-brand/8' : 'hive-line hover:bg-text-primary/[0.03]')}>
                <div className="text-[13px] font-medium">{e.label}</div>
                <div className="text-[11px] text-text-muted">{e.does.join(' + ')}</div>
              </button>
            ))}
          </div>
        )}
        {kind === 'mcp' && (
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sentry" />
          </Field>
        )}
        {(kind !== 'search' || eng?.needs === 'url') && (
          <Field label={kind === 'skill' ? 'GitHub link' : kind === 'mcp' ? 'Server URL' : 'Your SearXNG URL'}>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={kind === 'skill' ? 'https://github.com/obra/superpowers' : kind === 'mcp' ? 'https://mcp.example.com/mcp' : 'https://search.example.com'} autoFocus />
          </Field>
        )}
        {kind !== 'skill' && (kind === 'mcp' || eng?.needs !== 'url') && (
          <Field label={kind === 'mcp' ? 'Access token (optional)' : eng?.needs === 'key-optional' ? 'API key (optional — higher limits)' : 'API key'}>
            <SecretInput value={token} onChange={(e) => setToken(e.target.value)} placeholder="Stored encrypted, shared with the team" />
            {kind === 'search' && eng && (
              <a href={eng.docs} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] text-accent-brand">
                Get a key <ExternalLink className="size-3" />
              </a>
            )}
          </Field>
        )}
        {kind === 'skill' && project && (
          <div className="flex gap-1 rounded-xl bg-text-primary/[0.04] p-1 text-[12.5px]">
            {(['all', 'project'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setScope(s)} className={cn('h-8 flex-1 rounded-lg', scope === s ? 'bg-bg-surface font-medium shadow-sm' : 'text-text-muted')}>
                {s === 'all' ? 'Every project' : `Only ${project.name}`}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit || busy} loading={busy}>
            {kind === 'skill' ? <Wand2 /> : <Plug />} {kind === 'skill' ? 'Import' : 'Connect'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  )
}
