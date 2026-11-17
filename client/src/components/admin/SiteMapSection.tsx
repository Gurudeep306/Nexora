import { useState } from 'react'
import { Input, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { useSite } from '@/context/SiteContext'
import { cn } from '@/lib/utils'
import { Chip, Failed, Panel, Skeleton } from './kit'
import './staff.css'
import './sitemap.css'

/*
  Admin → Site map (GET/PUT /api/admin/sitemap, src/sitemap.js): every part
  of the site as a tree. For each part: who sees it (everyone, staff only,
  coming soon, hidden), its pages and API, and its code with "Open on GitHub"
  links. The server enforces every choice.
*/

type Mode = 'visible' | 'staff' | 'soon' | 'hidden'
interface FileInfo {
  path: string
  kind: 'file' | 'folder'
  exists: boolean
  files?: number
  url: string
}
interface Part {
  id: string
  label: string
  parent: string | null
  core: boolean
  pages: string | null
  api: string | null
  mode: Mode
  effective: Mode
  files: FileInfo[]
}
interface Data {
  parts: Part[]
}

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'visible', label: 'Everyone', hint: 'Open to everyone.' },
  { id: 'staff', label: 'Staff only', hint: 'Staff only. Everyone else gets “page not found”.' },
  { id: 'soon', label: 'Coming soon', hint: 'Staff can use it; everyone else sees “coming soon”.' },
  { id: 'hidden', label: 'Hidden', hint: 'Switched off. Only you can still open it, to check it.' },
]
const WORD: Record<Mode, string> = { visible: 'Everyone', staff: 'Staff only', soon: 'Coming soon', hidden: 'Hidden' }

/** "^/(learn/dsa|solve/learn)(/|$)" → "/learn/dsa, /solve/learn" (readable, not exact). */
function readablePaths(re: string | null): string | null {
  if (!re) return null
  const body = re.replace(/^\^/, '').split('(/|$)').join('').replace(/\(\?![^)]*\)/g, '').replace(/\\/g, '')
  const g = /\(([^()]+)\)/.exec(body)
  if (!g) return body
  return g[1]
    .split('|')
    .map((x) => body.slice(0, g.index) + x + body.slice(g.index + g[0].length))
    .join(', ')
}

export function SiteMapSection() {
  const toast = useToast()
  const { refresh } = useSite()
  const { data, error, loading, refetch, setData } = useApi(() => api.get<Data>('/api/admin/sitemap'), [])
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')

  if (error && !data) return <Failed message={error} onRetry={refetch} />
  if (!data) return loading ? <Skeleton className="h-96" /> : null

  // A search shows the matching parts and the parts they sit in, opened.
  const needle = q.trim().toLowerCase()
  const keep = new Set<string>()
  if (needle) {
    for (const p of data.parts) {
      if (!p.label.toLowerCase().includes(needle) && !p.id.toLowerCase().includes(needle)) continue
      let cur: Part | undefined = p
      while (cur) {
        keep.add(cur.id)
        cur = cur.parent ? data.parts.find((x) => x.id === cur!.parent) : undefined
      }
    }
  }
  const children = (id: string | null) => data.parts.filter((p) => p.parent === id && (!needle || keep.has(p.id)))
  const toggle = (id: string) => setOpen((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })

  const choose = async (p: Part, mode: Mode) => {
    setBusy(p.id)
    try {
      const r = await api.put<{ effective: Record<string, Mode>; chosen: Record<string, Mode> }>(`/api/admin/sitemap/${encodeURIComponent(p.id)}`, { mode })
      setData((d) => (d ? { ...d, parts: d.parts.map((x) => ({ ...x, mode: r.chosen[x.id] ?? x.mode, effective: r.effective[x.id] ?? x.effective })) } : d))
      toast.success(`${p.label}: ${WORD[mode]}`)
      void refresh()
    } catch (e) {
      toast.error('Could not change it', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  const changed = data.parts.filter((p) => p.mode !== 'visible')

  const node = (p: Part) => {
    const kids = children(p.id)
    const isOpen = open.has(p.id)
    const inside = data.parts.filter((x) => x.parent === p.id).length
    // While searching, every part with a match inside shows its children.
    const showKids = !!needle || isOpen
    const pages = readablePaths(p.pages)
    const inherited = p.effective !== p.mode
    const parent = p.parent ? data.parts.find((x) => x.id === p.parent) : null
    return (
      <li key={p.id} className="sm-node">
        <div className="sm-row">
          <button type="button" className="sm-name" aria-expanded={isOpen} onClick={() => toggle(p.id)}>
            <span className="sm-twist" aria-hidden="true">
              {isOpen ? '−' : '+'}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-text-primary">{p.label}</span>
                {inside > 0 && <span className="text-xs text-text-secondary">{inside} inside</span>}
                {p.core ? <Chip>Always on</Chip> : p.effective !== 'visible' && <Chip tone={p.effective === 'hidden' ? 'danger' : 'warning'}>{WORD[p.effective]}</Chip>}
              </span>
              <span className="block truncate font-mono text-xs text-text-secondary">{pages ?? 'No pages · API only'}</span>
            </span>
          </button>
          {!p.core && (
            <fieldset className="sm-modes" disabled={busy === p.id}>
              <legend className="sr-only">Who sees {p.label}</legend>
              <span className="sa-seg">
                {MODES.map((m) => (
                  <label key={m.id} className={cn('sa-opt', p.mode === m.id && 'is-on')} title={m.hint}>
                    <input type="radio" name={`sm-${p.id}`} value={m.id} checked={p.mode === m.id} onChange={() => void choose(p, m.id)} className="sr-only" />
                    {m.label}
                  </label>
                ))}
              </span>
            </fieldset>
          )}
        </div>
        {inherited && parent && <p className="sm-note">Shown as “{WORD[p.effective]}” because {parent.label} is {WORD[parent.effective].toLowerCase()}.</p>}

        {isOpen && (
          <div className="sm-detail">
            <p className="sm-label">Code</p>
            <ul className="sm-files">
              {p.files.map((f) => (
                <li key={f.path}>
                  <Icon name={f.kind === 'folder' ? 'layers' : 'code'} className="size-3.5 shrink-0 text-text-secondary" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-primary">{f.path}</span>
                  {f.kind === 'folder' && f.files != null && <span className="text-xs text-text-secondary">{f.files} files</span>}
                  {!f.exists && <Chip tone="warning">not on this server</Chip>}
                  <a href={f.url} target="_blank" rel="noreferrer" className="sm-gh">
                    Open on GitHub <Icon name="external" className="size-3" />
                    <span className="sr-only"> ({f.path})</span>
                  </a>
                </li>
              ))}
            </ul>
            {p.api && (
              <p className="mt-3 text-xs text-text-secondary">
                API: <span className="font-mono">{readablePaths(p.api)}</span>
              </p>
            )}
          </div>
        )}
        {kids.length > 0 && showKids && <ul className="sm-kids">{kids.map(node)}</ul>}
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <Panel title="Who sees what" description="Every part of NexoraGuru. Pick who can use each one; parts inside another are never more open than it. The server holds to it, so a hidden part stays shut even if someone types its address.">
        <dl className="sm-legend">
          {MODES.map((m) => (
            <div key={m.id}>
              <dt>{m.label}</dt>
              <dd>{m.hint}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-text-secondary">{changed.length ? `${changed.length} part${changed.length === 1 ? '' : 's'} not open to everyone.` : 'Everything is open to everyone.'} Open a part to see its code.</p>
      </Panel>
      <label className="block max-w-md">
        <span className="mb-1.5 block text-sm font-medium text-text-primary">Find a part</span>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digital Logic, Contests, Hive Drive…" />
      </label>
      {needle && keep.size === 0 ? (
        <p className="text-sm text-text-secondary">No part matches &ldquo;{q.trim()}&rdquo;.</p>
      ) : (
        <ul className="sm-tree" aria-label="Site map">
          {children(null).map(node)}
        </ul>
      )}
    </div>
  )
}
