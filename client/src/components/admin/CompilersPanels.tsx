import { useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui'
import { SearchInput } from '@/components/ui/Input'
import { useApi } from '@/hooks/useApi'
import { api, ApiError } from '@/lib/api'
import { Chip, Failed, Panel, Skeleton, Toggle } from './kit'
import { ago } from './format'

/*
  Admin → Code runners, the free public runners. Each can be turned off, and
  the compiler version each one uses for a language updates by itself: every
  few hours the server reads each service's list, tests the newest stable
  version with a small program, and uses it only if it passes. A version can
  be kept (pinned) so it never changes, or reset to the built-in one.
*/

type Catalog = { at: number; ok: boolean; error: string | null; count: number } | null
type Service = { id: string; name: string; site: string; note: string; lists: boolean; on: boolean; restingFor: number; catalog: Catalog }
type Compiler = { engine: string; current: string; builtin: string | null; pinned: boolean; picked: { id: string; version: string; at: number } | null }
type Lang = { lang: string; chain: string[]; compilers: Compiler[] }
type SyncResult = { engine: string; lang: string; from: string; to: string; ok: boolean; held?: boolean; detail: string }
type View = {
  services: Service[]
  languages: Lang[]
  sync: { at?: number; by?: string; running?: boolean; results?: SyncResult[] }
  everyHours: number
}

const LABEL: Record<string, string> = {
  cpp: 'C++', c: 'C', python: 'Python', java: 'Java', javascript: 'JavaScript', typescript: 'TypeScript', csharp: 'C#', go: 'Go', rust: 'Rust',
  kotlin: 'Kotlin', swift: 'Swift', ruby: 'Ruby', php: 'PHP', perl: 'Perl', lua: 'Lua', shell: 'Bash', r: 'R', scala: 'Scala', julia: 'Julia',
  pascal: 'Pascal', haskell: 'Haskell', d: 'D', nim: 'Nim', zig: 'Zig', groovy: 'Groovy', commonlisp: 'Common Lisp', dart: 'Dart', fsharp: 'F#',
  ocaml: 'OCaml', crystal: 'Crystal', objectivec: 'Objective-C', elixir: 'Elixir', scheme: 'Scheme',
}
const label = (l: string) => LABEL[l] ?? l.charAt(0).toUpperCase() + l.slice(1)

function serviceStatus(s: Service): { tone: string; text: string } {
  if (!s.on) return { tone: '', text: 'Off' }
  if (s.restingFor > 0) return { tone: 'warning', text: `Resting ${Math.ceil(s.restingFor / 1000)} s after failures` }
  if (s.catalog && !s.catalog.ok) return { tone: 'warning', text: 'Working · its list could not be read' }
  return { tone: 'success', text: 'Working' }
}

export function CompilersPanels() {
  const toast = useToast()
  const { data, loading, error, refetch, setData } = useApi(() => api.get<View>('/api/admin/compilers'), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const services = useMemo(() => new Map((data?.services ?? []).map((s) => [s.id, s.name])), [data])
  const running = !!data?.sync?.running

  // While a check runs, ask again every few seconds until it is done.
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => void refetch(), 5000)
    return () => clearInterval(t)
  }, [running, refetch])

  if (loading && !data) return <Skeleton className="h-64" />
  if (error || !data) return <Failed message={error ?? 'Could not load the public runners'} onRetry={refetch} />

  const act = async (id: string, fn: () => Promise<View>, done?: string) => {
    setBusy(id)
    try {
      setData(await fn())
      if (done) toast.success(done)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const results = data.sync.results ?? []
  const used = results.filter((r) => r.ok)
  const held = results.filter((r) => r.held)
  const failed = results.filter((r) => !r.ok && !r.held)
  const shown = data.languages.filter((l) => !q || label(l.lang).toLowerCase().includes(q.toLowerCase()) || l.lang.includes(q.toLowerCase()))

  return (
    <>
      <Panel
        title="Public runners"
        description={`Free services behind our own runners, tried in the order shown for each language. Every ${data.everyHours} hours their compiler lists are read; a newer version is used only after it passes a test program.`}
        icon="globe"
        actions={
          <button type="button" className="ai-btn" disabled={running || busy === 'sync'} onClick={() => void act('sync', () => api.post<View>('/api/admin/compilers/sync'), 'Checking for new versions…')}>
            {running ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} {running ? 'Checking…' : 'Check for new versions'}
          </button>
        }
      >
        <ul className="ai-list">
          {data.services.map((s) => {
            const st = serviceStatus(s)
            return (
              <li key={s.id} className="ai-row">
                <div className="min-w-0 flex-1">
                  <p className="m-0 flex flex-wrap items-center gap-2 text-[14px] font-semibold text-text-primary">
                    {s.name}
                    <Chip tone={st.tone}>{st.text}</Chip>
                  </p>
                  <p className="m-0 mt-0.5 text-[12.5px] text-text-secondary">{s.note}</p>
                  {s.catalog && (
                    <p className="m-0 mt-0.5 text-[12px] text-text-muted">
                      {s.catalog.ok ? `List read ${ago(s.catalog.at)} · ${s.catalog.count} compilers` : `List not read ${ago(s.catalog.at)}: ${s.catalog.error}`}
                    </p>
                  )}
                </div>
                <Toggle checked={s.on} label={`Use ${s.name}`} onChange={(v) => void act(`svc:${s.id}`, () => api.put<View>(`/api/admin/compilers/services/${s.id}`, { on: v }), v ? `${s.name} turned on` : `${s.name} turned off`)} />
              </li>
            )
          })}
        </ul>

        {data.sync.at && !running && (
          <div className="mt-4 text-[13px] text-text-secondary">
            <p className="m-0">
              Last check {ago(data.sync.at)}: {used.length} updated, {held.length} waiting for a check by hand, {failed.length} failed the test
              {results.length === 0 && ' (everything was already up to date)'}.
            </p>
            {results.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-text-primary">What changed</summary>
                <ul className="m-0 mt-2 space-y-1 pl-4">
                  {results.map((r) => (
                    <li key={`${r.engine}:${r.lang}`} className="text-[12.5px]">
                      <Chip tone={r.ok ? 'success' : r.held ? 'warning' : 'danger'}>{r.ok ? 'Updated' : r.held ? 'Waiting' : 'Failed'}</Chip>{' '}
                      {label(r.lang)} on {services.get(r.engine) ?? r.engine}: <span className="font-mono">{r.from}</span> → <span className="font-mono">{r.to}</span>
                      <span className="text-text-muted"> · {r.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </Panel>

      <Panel title="Languages" description="Where each language runs, in order, and the version each runner uses. Keep a version to stop it from updating." icon="code">
        <div className="mb-3 max-w-sm">
          <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Find a language" aria-label="Find a language" />
        </div>
        <ul className="ai-list">
          {shown.map((l) => (
            <li key={l.lang} className="ai-row block">
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <span className="text-[14px] font-semibold text-text-primary">{label(l.lang)}</span>
                  <span className="text-[12.5px] text-text-muted">{l.chain.length ? l.chain.map((e, i) => `${i + 1}. ${services.get(e) ?? 'Our runner'}`).join('  ') : 'No runner is on for it'}</span>
                </summary>
                <ul className="m-0 mt-3 space-y-2 pl-0">
                  {l.compilers.map((c) => {
                    const id = `${c.engine}:${l.lang}`
                    const changed = c.builtin && c.current !== c.builtin
                    return (
                      <li key={id} className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="min-w-36 text-text-secondary">{services.get(c.engine)}</span>
                        <span className="font-mono text-[12.5px] text-text-primary">{c.current}</span>
                        {c.pinned && <Chip tone="info">Kept</Chip>}
                        {!c.pinned && c.picked && <Chip tone="success">Updated {ago(c.picked.at)}</Chip>}
                        {changed && <span className="text-[12px] text-text-muted">built-in: {c.builtin}</span>}
                        {c.engine !== 'paiza' && (
                          <span className="ml-auto flex flex-wrap gap-2">
                            <button type="button" className="ai-btn" disabled={busy === id} onClick={() => void act(id, () => api.put<View>('/api/admin/compilers/pin', { engine: c.engine, lang: l.lang, keep: !c.pinned }), c.pinned ? 'It will update by itself again' : 'Kept: it will not update')}>
                              {c.pinned ? 'Let it update' : 'Keep this version'}
                            </button>
                            {(changed || c.pinned) && (
                              <button type="button" className="ai-btn" disabled={busy === id} onClick={() => void act(id, () => api.post<View>('/api/admin/compilers/reset', { engine: c.engine, lang: l.lang }), 'Back to the built-in version')}>
                                Use built-in
                              </button>
                            )}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  )
}
