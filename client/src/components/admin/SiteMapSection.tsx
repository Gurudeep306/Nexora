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
  of the site, grouped by area, with every part inside it listed and its own
  buttons. Who sees each part (everyone, staff only, coming soon, hidden; for
  Admin's own sections: the team or the owner only), its pages and API, and
  its code with "Open on GitHub" links. The server enforces every choice.
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
  adminSection: boolean
  /** A Hive part: admins and the owner (default) or the owner only. */
  hiveSection?: boolean
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
// Admin's own sections: the team (by their permissions and Staff access) or you alone.
const ADMIN_MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'visible', label: 'Team', hint: 'Staff with the permission (see Staff access).' },
  { id: 'hidden', label: 'Owner only', hint: 'Only you.' },
]
// Hive's parts: admins and the owner (full access, the default) or you alone.
const HIVE_MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'visible', label: 'Admins and owner', hint: 'Every admin and you, with full access. Members never see Hive.' },
  { id: 'hidden', label: 'Owner only', hint: 'Only you.' },
]
const WORD: Record<Mode, string> = { visible: 'Everyone', staff: 'Staff only', soon: 'Coming soon', hidden: 'Hidden' }

/** The areas the top-level parts are grouped into, in this order. */
const AREAS: { title: string; ids: string[] }[] = [
  { title: 'Learning', ids: ['learn', 'nexus', 'gate'] },
  { title: 'Practice and contests', ids: ['practice', 'contests'] },
  { title: 'Community', ids: ['social', 'profiles'] },
  { title: 'Your space', ids: ['hub', 'analytics', 'achievements', 'bookmarks', 'ai_tutor', 'settings', 'auth'] },
  { title: 'Admin', ids: ['admin'] },
  { title: 'Hive', ids: ['hive'] },
]

/** "^/(learn/dsa|solve/learn)(/|$)" → "/learn/dsa, /solve/learn" (readable, not exact). */
function readablePaths(re: string | null): string | null {
  if (!re) return null
  if (re.includes('section=')) return `/admin · ${/section=([a-z-]+)/.exec(re)?.[1] ?? ''}`
  if (re.includes('tab=')) return `/social · ${/tab=([a-z-]+)/.exec(re)?.[1] ?? ''} tab`
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
  // Everything is open by default; these are the parts folded away.
  const [folded, setFolded] = useState<Set<string>>(new Set())
  const [codeOpen, setCodeOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')

  if (error && !data) return <Failed message={error} onRetry={refetch} />
  if (!data) return loading ? <Skeleton className="h-96" /> : null

  const kidsOf = (id: string) => data.parts.filter((p) => p.parent === id)
  const withKids = data.parts.filter((p) => kidsOf(p.id).length > 0).map((p) => p.id)

  // A search shows the matching parts and the parts they sit in.
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
  const shown = (p: Part) => !needle || keep.has(p.id)

  const fold = (id: string) =>
    setFolded((s) => {
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
      toast.success(`${p.label}: ${p.hiveSection ? (mode === 'hidden' ? 'Owner only' : 'Admins and owner') : p.adminSection ? (mode === 'hidden' ? 'Owner only' : 'Team') : WORD[mode]}`)
      void refresh()
    } catch (e) {
      toast.error('Could not change it', e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(null)
    }
  }

  const changed = data.parts.filter((p) => p.mode !== 'visible')

  const row = (p: Part, depth: number): React.ReactNode => {
    const kids = kidsOf(p.id).filter(shown)
    const isFolded = !needle && folded.has(p.id)
    const pages = readablePaths(p.pages)
    const parent = p.parent ? data.parts.find((x) => x.id === p.parent) : null
    const inherited = p.effective !== p.mode && parent
    const modes = p.hiveSection ? HIVE_MODES : p.adminSection ? ADMIN_MODES : MODES
    const showCode = codeOpen === p.id
    return (
      <li key={p.id} className="sm-node" data-depth={depth}>
        <div className="sm-row">
          <div className="sm-name">
            {kidsOf(p.id).length > 0 ? (
              <button type="button" className="sm-twist" aria-expanded={!isFolded} aria-label={`${isFolded ? 'Show' : 'Hide'} the parts inside ${p.label}`} onClick={() => fold(p.id)}>
                {isFolded ? '+' : '−'}
              </button>
            ) : (
              <span className="sm-twist sm-leaf" aria-hidden="true">
                ·
              </span>
            )}
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className={cn('text-text-primary', depth === 0 ? 'font-semibold' : 'font-medium')}>{p.label}</span>
                {kidsOf(p.id).length > 0 && <span className="text-xs text-text-secondary">{kidsOf(p.id).length} inside</span>}
                {p.core ? <Chip>Always on</Chip> : (p.hiveSection || p.adminSection) ? p.effective === 'hidden' && <Chip tone="danger">Owner only</Chip> : p.effective !== 'visible' && <Chip tone={p.effective === 'hidden' ? 'danger' : 'warning'}>{WORD[p.effective]}</Chip>}
              </span>
              <span className="block truncate font-mono text-xs text-text-secondary">{pages ?? 'No pages · works behind the scenes'}</span>
            </span>
          </div>
          <div className="sm-actions">
            {!p.core && (
              <fieldset className="sm-modes" disabled={busy === p.id}>
                <legend className="sr-only">Who sees {p.label}</legend>
                <span className="sa-seg">
                  {modes.map((m) => {
                    const on = p.adminSection || p.hiveSection ? (m.id === 'hidden') === (p.mode === 'hidden') : p.mode === m.id
                    return (
                      <label key={m.id} className={cn('sa-opt', on && 'is-on')} title={m.hint}>
                        <input type="radio" name={`sm-${p.id}`} value={m.id} checked={on} onChange={() => void choose(p, m.id)} className="sr-only" />
                        {m.label}
                      </label>
                    )
                  })}
                </span>
              </fieldset>
            )}
            <button type="button" className="sm-code-btn" aria-expanded={showCode} onClick={() => setCodeOpen(showCode ? null : p.id)}>
              <Icon name="code" className="size-3.5" /> Code
            </button>
          </div>
        </div>
        {inherited && <p className="sm-note">Shown as “{WORD[p.effective]}” because {parent!.label} is {WORD[parent!.effective].toLowerCase()}.</p>}

        {showCode && (
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
          </div>
        )}
        {kids.length > 0 && !isFolded && <ul className="sm-kids">{kids.map((k) => row(k, depth + 1))}</ul>}
      </li>
    )
  }

  const byId = new Map(data.parts.map((p) => [p.id, p]))
  const areas = AREAS.map((a) => ({ ...a, parts: a.ids.map((id) => byId.get(id)).filter((p): p is Part => !!p && shown(p)) })).filter((a) => a.parts.length)

  return (
    <div className="space-y-6">
      <Panel title="Who sees what" description="Every part of NexoraGuru and every part inside it, each with its own buttons. Parts inside another are never more open than it. The server holds to every choice, so a hidden part stays shut even if someone types its address.">
        <dl className="sm-legend">
          {MODES.map((m) => (
            <div key={m.id}>
              <dt>{m.label}</dt>
              <dd>{m.hint}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-text-secondary">
          Admin&rsquo;s own sections have two choices: <strong className="font-semibold text-text-primary">Team</strong> (staff with the permission) or <strong className="font-semibold text-text-primary">Owner only</strong>. Hive has two too: <strong className="font-semibold text-text-primary">Admins and owner</strong> (full access, the default) or <strong className="font-semibold text-text-primary">Owner only</strong>; members never see it.
        </p>
        <p className="mt-2 text-xs text-text-secondary">{changed.length ? `${changed.length} part${changed.length === 1 ? '' : 's'} not open to everyone.` : 'Everything is open to everyone.'}</p>
      </Panel>

      <div className="sm-tools">
        <label className="min-w-0 flex-1 basis-64">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Find a part</span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Digital Logic, Messages, Moderation…" />
        </label>
        <div className="flex gap-2">
          <button type="button" className="nx-btn" data-size="sm" onClick={() => setFolded(new Set())}>
            Expand all
          </button>
          <button type="button" className="nx-btn" data-size="sm" onClick={() => setFolded(new Set(withKids))}>
            Collapse all
          </button>
        </div>
      </div>

      {needle && keep.size === 0 ? (
        <p className="text-sm text-text-secondary">No part matches &ldquo;{q.trim()}&rdquo;.</p>
      ) : (
        <div className="sm-areas">
          {areas.map((a) => (
            <section key={a.title} aria-labelledby={`sm-area-${a.title.replace(/\W+/g, '-')}`}>
              <h3 id={`sm-area-${a.title.replace(/\W+/g, '-')}`} className="sm-area">
                {a.title}
              </h3>
              <ul className="sm-tree">{a.parts.map((p) => row(p, 0))}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
