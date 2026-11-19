/* ────────────────────────────────────────────────────────────────────────
   Toolbox — the open-source AI ecosystem, inside Hive.
   300+ tools from the team's research, each with a plain answer to “how do I
   use this here?”: connect it in one click (MCP servers, search engines,
   skills, model gateways), see that Hive already does it, run it on a
   worker machine, or open the project. Connected tools are shared by the
   whole staff workspace and show up in chat and in every agent.
   ──────────────────────────────────────────────────────────────────────── */
import { Empty, SecretInput, SegmentedControl } from '../kit'
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
  RefreshCw,
  Search,
  Server,
  Sparkles,
  Trash2,
  Wand2,
  Wrench,
} from 'lucide-react'
import { Button, Input, Modal, SearchInput, Select, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { errMsg } from '../Improve'
import { useHive } from '../store'
import type { EcoTool, Integration, McpToolInfo, ToolHow, Toolbox } from '../types'
import { PageTitle, Toggle, timeAgo } from '../ui'

const HOW: Record<ToolHow, { label: string; short: string; icon: typeof Plug; hint: string }> = {
  mcp: { label: 'Connect as MCP', short: 'MCP', icon: Plug, hint: 'Its tools appear in chat and for every agent' },
  search: { label: 'Search engine', short: 'Search', icon: Globe, hint: 'Powers web search and page reading in chat and agents' },
  provider: { label: 'Model endpoint', short: 'Models', icon: KeyRound, hint: 'OpenAI-compatible — add it in Keys and the router can use it' },
  skill: { label: 'Import skill', short: 'Skill', icon: Wand2, hint: 'Imported as a Hive plugin: instructions every agent follows' },
  subscription: { label: 'Subscription agent', short: 'Subscription', icon: Sparkles, hint: 'Runs on your plan through a worker machine' },
  builtin: { label: 'Built into Hive', short: 'Built in', icon: CheckCircle2, hint: 'Hive already does this — nothing to install' },
  machine: { label: 'Runs on a machine', short: 'Machine', icon: Server, hint: 'A CLI you run on a worker machine next to the bridge' },
  reference: { label: 'Reference', short: 'Reference', icon: BookOpen, hint: 'Good to know — open the project to learn more' },
}
const FILTERS: { id: string; label: string; hows: ToolHow[] | null }[] = [
  { id: 'all', label: 'Everything', hows: null },
  { id: 'connect', label: 'Connect in one click', hows: ['mcp', 'search', 'provider', 'skill', 'subscription'] },
  { id: 'builtin', label: 'Already in Hive', hows: ['builtin'] },
  { id: 'machine', label: 'Runs on a machine', hows: ['machine'] },
  { id: 'reference', label: 'Learn about', hows: ['reference'] },
]
const PAGE = 48
const LINK = 'underline decoration-[var(--hv-border-strong,var(--hv-border))] underline-offset-[3px] hover:text-[var(--hv-text-1)] hover:decoration-current'

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
  // A new search or filter starts again at the first page.
  const [lastQuery, setLastQuery] = useState('')
  const queryKey = `${q}|${cat}|${filter}`
  if (queryKey !== lastQuery) {
    setLastQuery(queryKey)
    setShown(PAGE)
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const t of data?.tools ?? []) c[t.cat] = (c[t.cat] ?? 0) + 1
    return c
  }, [data])
  const ready = data?.tools.filter((t) => ['mcp', 'search', 'provider', 'skill', 'subscription'].includes(t.use.how)).length ?? 0
  const builtin = data?.tools.filter((t) => t.use.how === 'builtin').length ?? 0
  const live = data?.integrations.filter((i) => i.enabled).length ?? 0
  const liveTools = data?.integrations.filter((i) => i.enabled).reduce((n, i) => n + i.tools.length, 0) ?? 0
  const showFilter = (id: string) => {
    setTab('discover')
    setFilter(id)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-8">
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

      {data && (
        <p className="mb-6 text-[13.5px] leading-relaxed text-[var(--hv-text-2)]">
          <button type="button" onClick={() => setTab('connected')} className={LINK}>
            {live ? `${live} connected` : 'Nothing connected yet'}
          </button>
          {liveTools > 0 && ` (${liveTools} tools live in chat and agents)`} ·{' '}
          <button type="button" onClick={() => showFilter('connect')} className={LINK}>
            {ready} ready to connect
          </button>{' '}
          ·{' '}
          <button type="button" onClick={() => showFilter('builtin')} className={LINK}>
            {builtin} already in Hive
          </button>{' '}
          ·{' '}
          <Link to="/hive/spend/savings" className={LINK}>
            what the tools cost in tokens
          </Link>
        </p>
      )}

      <SegmentedControl
        label="Toolbox view"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'discover', label: 'Discover' },
          { value: 'connected', label: live ? `Connected · ${live}` : 'Connected' },
          { value: 'directories', label: 'Directories' },
        ]}
        className="mb-6"
      />

      {!data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="hive-shimmer h-20 rounded-[var(--hv-r-card)]" />
          ))}
        </div>
      ) : tab === 'discover' ? (
        <>
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Search tools — “pdf”, “browser”, “vector”, “voice”, “gateway”…" aria-label="Search tools" containerClassName="mb-3" />
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={setFilter} className="w-52" aria-label="Show">
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Select value={cat} onValueChange={setCat} className="w-64" aria-label="Category">
              <option value="all">All categories ({data.tools.length})</option>
              {Object.entries(data.categories).map(([id, c]) => (
                <option key={id} value={id}>
                  {c.label} ({counts[id] ?? 0})
                </option>
              ))}
            </Select>
            <span className="hv-num text-[12.5px] text-[var(--hv-text-3)]" aria-live="polite">
              {tools.length} {tools.length === 1 ? 'tool' : 'tools'}
            </span>
          </div>
          {cat !== 'all' && data.categories[cat]?.hint && <p className="mb-2 text-[12.5px] text-[var(--hv-text-3)]">{data.categories[cat].hint}</p>}
          {!tools.length ? (
            <Empty level={2} icon={<Search />} title="Nothing matches" action={<Button variant="secondary" size="sm" onClick={() => setTab('directories')}>Open directories</Button>}>
              Try a broader word, or look through the directories — they list thousands more MCP servers and skills.
            </Empty>
          ) : (
            <>
              <ul className="mt-4 divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
                {tools.slice(0, shown).map((t) => (
                  <ToolRow key={t.id} t={t} catLabel={data.categories[t.cat]?.label ?? t.cat} onConnect={(kind) => setConnect({ kind, tool: t, engine: t.use.how === 'search' ? t.use.engine : undefined })} />
                ))}
              </ul>
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

const QUIET_ACTION = 'inline-flex h-8 items-center gap-1.5 rounded-[var(--hv-r-btn)] px-2.5 text-[12px] font-medium text-[var(--hv-text-1)] bg-[var(--hv-fill)] hover:bg-[var(--hv-fill-hover)]'

function ToolRow({ t, catLabel, onConnect }: { t: EcoTool; catLabel: string; onConnect: (kind: 'mcp' | 'search' | 'skill') => void }) {
  const h = HOW[t.use.how]
  let action: ReactNode
  if (t.connected) {
    action = (
      <span className="inline-flex h-8 items-center gap-1 px-1 text-[12px] font-medium text-[var(--color-state-success)]">
        <Check className="size-3.5" /> Connected
      </span>
    )
  } else if (t.use.how === 'mcp' || t.use.how === 'search' || t.use.how === 'skill') {
    const kind = t.use.how
    action = (
      <Button size="sm" variant="secondary" onClick={() => onConnect(kind)} aria-label={`${kind === 'skill' ? 'Import' : 'Connect'} ${t.name}`}>
        <h.icon /> {kind === 'skill' ? 'Import' : 'Connect'}
      </Button>
    )
  } else if (t.use.how === 'provider' || t.use.how === 'subscription') {
    action = (
      <Link to={`/hive/keys?add=${encodeURIComponent(t.use.vendor)}`} className={QUIET_ACTION} aria-label={`Add in Keys: ${t.name}`}>
        <KeyRound className="size-3.5" /> Add in Keys
      </Link>
    )
  } else if (t.use.how === 'builtin') {
    action = (
      <Link to="/hive/extensions/plugins" className="inline-flex h-8 items-center gap-1.5 px-1 text-[12px] font-medium text-[var(--color-state-success)] hover:underline" aria-label={`In Hive: ${t.name} is built in, see Plugins`}>
        <CheckCircle2 className="size-3.5" /> In Hive
      </Link>
    )
  } else if (t.use.how === 'machine') {
    action = (
      <Link to="/hive/machines" className={QUIET_ACTION} aria-label={`Machines: run ${t.name} on a machine`}>
        <Cpu className="size-3.5" /> Machines
      </Link>
    )
  }
  const licence = t.license === 'oss' ? 'Open source' : t.license === 'hosted' ? 'Hosted' : 'Open core'
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-[var(--hv-r-btn)] bg-[var(--hv-fill)] text-[13px] font-semibold text-[var(--hv-text-2)]" aria-hidden="true">
          {t.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || '·'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="m-0 font-[family-name:var(--hv-sans)] text-[14px] font-medium leading-snug text-[var(--hv-text-1)]">{t.name}</h2>
            <Tooltip label={h.hint}>
              <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--hv-text-2)]">
                <h.icon className="size-3" aria-hidden="true" /> {h.short}
              </span>
            </Tooltip>
          </div>
          <p className="mb-0 mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--hv-text-2)]">{t.what}</p>
          <p className="mb-0 mt-1 text-[11.5px] text-[var(--hv-text-3)]">
            {catLabel} · {t.iface} ·{' '}
            <Tooltip label={t.status}>
              <span>{licence}</span>
            </Tooltip>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 pl-12 sm:pl-0">
        <a href={t.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-[var(--hv-r-btn)] px-2 text-[12px] text-[var(--hv-text-2)] hover:bg-[var(--hv-fill)] hover:text-[var(--hv-text-1)]" aria-label={`Project: ${t.name} (opens in a new tab)`}>
          <ExternalLink className="size-3.5" /> Project
        </a>
        {action}
      </div>
    </li>
  )
}

/* ── Connected tools ─────────────────────────────────────────────────── */
function Connected({ data, reload, onAdd }: { data: Toolbox; reload: () => void; onAdd: (k: 'mcp' | 'search' | 'skill') => void }) {
  const mcp = data.integrations.filter((i) => i.kind === 'mcp')
  const search = data.integrations.filter((i) => i.kind === 'search')
  if (!data.integrations.length)
    return (
      <Empty
        level={2}
        icon={<Plug />}
        title="Give your agents real tools"
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => onAdd('mcp')}>
              <Plug /> Connect MCP server
            </Button>
            <Button variant="secondary" onClick={() => onAdd('search')}>
              <Globe /> Add search engine
            </Button>
            <Button variant="ghost" onClick={() => onAdd('skill')}>
              <Wand2 /> Import a skill
            </Button>
          </div>
        }
      >
        Connect an MCP server (GitHub, Sentry, Linear, Notion, Supabase, Context7, Exa…) and its tools appear in chat and for every agent. Add a search engine (Tavily, Exa, Brave, SearXNG, Jina, Firecrawl) for sharper web research. Import a skill and every agent follows it.
      </Empty>
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
        <div className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
          {mcp.map((i) => (
            <IntegrationCard key={i.id} i={i} reload={reload} />
          ))}
          {!mcp.length && (
            <div className="flex flex-col items-center gap-1.5 px-6 py-8 text-center">
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
        <div className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
          {search.map((i) => (
            <IntegrationCard key={i.id} i={i} reload={reload} />
          ))}
          {!search.length && <p className="py-4 text-[13px] text-text-muted">Using the built-in free search (DuckDuckGo). Add an engine for better results.</p>}
        </div>
      </section>
    </div>
  )
}

function IntegrationCard({ i, reload }: { i: Integration; reload: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
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
    <div>
      <div className="flex flex-wrap items-center gap-3 py-4">
        <span className="relative grid size-9 place-items-center rounded-[var(--hv-r-btn)] bg-[var(--hv-fill)] text-[var(--hv-text-2)]">
          {i.kind === 'mcp' ? <Plug className="size-4" /> : <Globe className="size-4" />}
          <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-[var(--hv-bg,var(--color-bg-app))]" style={{ background: tone }} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">
            {i.name}
            <span className="sr-only">{!i.enabled ? ' (off)' : i.status === 'error' ? ' (not working)' : ' (working)'}</span>
          </div>
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
          {confirmRemove ? (
            <>
              <Button size="sm" variant="secondary" onClick={() => act('remove', () => hiveApi.removeIntegration(i.id), 'Removed')} loading={busy === 'remove'}>
                Remove
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                Keep
              </Button>
            </>
          ) : (
            <Tooltip label="Remove">
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${i.name}`} onClick={() => setConfirmRemove(true)}>
                <Trash2 />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            <div className="grid gap-2 pb-4 sm:grid-cols-2">
              {i.tools.map((t) => (
                <ToolTry key={t.name} integrationId={i.id} t={t} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
    <div className="rounded-[var(--hv-r-card)] bg-[var(--hv-fill)] p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-text-primary">
            {t.name}
            {t.readOnly && <span className="rounded bg-state-success/10 px-1 font-sans text-[10px] text-state-success">read-only</span>}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] text-text-muted">{t.description || 'No description'}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={`Try ${t.name}`}>
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
          <Button size="sm" variant="secondary" onClick={run} loading={busy}>
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
      <div className="divide-y divide-[var(--hv-border)] border-y border-[var(--hv-border)]">
        {data.directories.map((d) => (
          <a key={d.name} href={d.url ?? '#'} target="_blank" rel="noreferrer" className="group flex items-start gap-3 px-1 py-3.5 hover:bg-[var(--hv-fill)]">
            <Library className="mt-0.5 size-4 shrink-0 text-[var(--hv-text-3)]" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-text-primary">{d.name}</div>
              <p className="mt-0.5 text-[12.5px] text-text-muted">{d.what}</p>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ))}
      </div>
      <div className="mt-6 text-[12.5px] leading-relaxed text-text-muted">
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
              <button key={id} type="button" onClick={() => setEngine(id)} aria-pressed={engine === id} className={cn('rounded-[var(--hv-r-btn)] border p-2.5 text-left transition-colors', engine === id ? 'border-[var(--hv-text-1)] bg-[var(--hv-fill)]' : 'border-[var(--hv-border)] hover:bg-[var(--hv-fill)]')}>
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
              <a href={eng.docs} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[12px] underline underline-offset-2">
                Get a key <ExternalLink className="size-3" />
              </a>
            )}
          </Field>
        )}
        {kind === 'skill' && project && (
          <SegmentedControl
            label="Use it in"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: 'Every project' },
              { value: 'project', label: `Only ${project.name}` },
            ]}
          />
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
