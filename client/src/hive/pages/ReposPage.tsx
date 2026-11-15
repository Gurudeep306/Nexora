/* ────────────────────────────────────────────────────────────────────────
   Your GitHub — every repository the connected GitHub account(s) can
   reach, in one searchable list. Open any of them and it becomes a project
   with a brief Hive writes from the code (stack, layout, how to run and test,
   conventions), so agents start with context. Or hand it straight to the
   Copilot: it opens the repo, picks the agents and runs the work.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, FolderGit2, Loader2, Lock, MessagesSquare, Plus, RefreshCw, Search, Upload } from 'lucide-react'
import { CopilotMark as Bot } from '../marks'
import { Button, useToast } from '@/components/ui'
import { hiveApi } from '../api'
import { errMsg } from '../Improve'
import { useHive } from '../store'
import type { GhRepo } from '../types'
import { timeAgo } from '../ui'
import { Empty, PageHeader, Row, RowList, SegmentedControl, StatusPill } from '../kit'
import { projectColor } from '../projectColor'
import { FolderImport } from '../FolderImport'

// A classic token with these scopes sees every repo you can (yours, collaborations and orgs).
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=Nexora%20Hive'

/** One row in the merged list: an open project, a repository, or both. */
interface Item {
  key: string
  owner: string
  name: string
  desc: string
  language: string | null
  updated: number
  private: boolean
  readOnly: boolean
  stars: number
  projectId: string | null
  color: string | null
  repo: GhRepo | null
  running: number
}

export default function ReposPage() {
  const { boot, refresh, select } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const [repos, setRepos] = useState<GhRepo[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'projects' | 'mine' | 'private'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<'none' | 'repo' | 'folder'>('none')
  const connected = (boot?.github.length ?? 0) > 0

  const load = useCallback(
    async (fresh = false) => {
      if (!connected) return
      setLoading(true)
      try {
        const r = await hiveApi.allRepos(fresh)
        setRepos(r.repos)
        setErrors(r.errors)
      } catch (e) {
        toast.error(errMsg(e))
        setRepos([])
      } finally {
        setLoading(false)
      }
    },
    [connected, toast],
  )
  useEffect(() => {
    load()
  }, [load])

  const logins = useMemo(() => new Set((boot?.github ?? []).map((g) => g.login.toLowerCase())), [boot])
  // Projects first (most recent first), then every other repository.
  const items = useMemo<Item[]>(() => {
    const projects = boot?.projects ?? []
    const byId = new Map(projects.map((p) => [p.id, p]))
    const fromRepos: Item[] = (repos ?? []).map((r) => {
      const p = r.projectId ? byId.get(r.projectId) : undefined
      return { key: r.fullName, owner: r.owner, name: r.name, desc: r.description, language: r.language ?? null, updated: Math.max(r.pushedAt ? Date.parse(r.pushedAt) : 0, p?.updated_at ?? 0), private: r.private, readOnly: !r.canPush, stars: r.stars, projectId: r.projectId ?? null, color: p?.color ?? null, repo: r, running: p?.running ?? 0 }
    })
    const linked = new Set(fromRepos.map((i) => i.projectId).filter(Boolean))
    // Projects that aren't in the GitHub list (uploaded folders, machine folders, other accounts).
    const onlyProjects: Item[] = projects
      .filter((p) => !linked.has(p.id))
      .map((p) => ({ key: p.id, owner: p.repo_owner, name: p.repo_name || p.name, desc: p.description, language: null, updated: p.updated_at, private: false, readOnly: false, stars: 0, projectId: p.id, color: p.color, repo: null, running: p.running ?? 0 }))
    return [...onlyProjects, ...fromRepos].sort((a, b) => Number(!!b.projectId) - Number(!!a.projectId) || b.updated - a.updated)
  }, [repos, boot])

  const shown = useMemo(() => {
    const w = q.toLowerCase().trim()
    return items.filter((r) => {
      if (filter === 'projects' && !r.projectId) return false
      if (filter === 'mine' && !logins.has(r.owner.toLowerCase())) return false
      if (filter === 'private' && !r.private) return false
      return !w || `${r.owner}/${r.name} ${r.desc} ${r.language ?? ''}`.toLowerCase().includes(w)
    })
  }, [items, q, filter, logins])

  const open = async (it: Item, then: 'project' | 'copilot' | 'chat') => {
    setBusy(it.key + then)
    try {
      let projectId = it.projectId
      if (!projectId && it.repo) {
        const res = await hiveApi.openRepo(it.repo.fullName)
        projectId = res.project.id
        if (res.created) {
          toast.success(`${it.name} is a project — Hive is writing a brief for the agents from its code`)
          await refresh()
          setRepos((list) => (list ?? []).map((x) => (x.fullName === it.key ? { ...x, projectId } : x)))
        }
      }
      if (!projectId) return
      if (then === 'chat') {
        const c = await hiveApi.projectChat(projectId)
        navigate(`/hive/chat/${c.convo.id}`)
      } else if (then === 'copilot') navigate('/hive/copilot', { state: { projectId } })
      else {
        select(projectId)
        navigate(`/hive/p/${projectId}`)
      }
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  // Any repository by owner/name or URL — including public repos you don't own.
  const [addRef, setAddRef] = useState('')
  const addRepo = async () => {
    const ref = addRef.trim()
    if (!ref) return
    setBusy('add')
    try {
      const res = await hiveApi.openRepo(ref)
      toast.success(res.created ? 'Added — Hive is writing a brief from its code' : 'Already a project — opening its chat')
      setAddRef('')
      setAdding('none')
      await refresh()
      load(true)
      const c = await hiveApi.projectChat(res.project.id)
      navigate(`/hive/chat/${c.convo.id}`)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(null)
    }
  }

  const projectCount = items.filter((i) => i.projectId).length

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 pb-16 pt-6 sm:px-6">
      <PageHeader
        title="Projects"
        sub="Your projects first, then every repository you can reach. Open one and Hive writes a brief from its code for the agents."
        actions={
          connected && (
            <>
              <Button variant="ghost" size="sm" onClick={() => load(true)} loading={loading} aria-label="Refresh the list from GitHub">
                {!loading && <RefreshCw />} Refresh
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setAdding(adding === 'folder' ? 'none' : 'folder')} aria-expanded={adding === 'folder'}>
                <Upload /> Upload a folder
              </Button>
              <Button size="sm" onClick={() => setAdding(adding === 'repo' ? 'none' : 'repo')} aria-expanded={adding === 'repo'}>
                <Plus /> Add repository
              </Button>
            </>
          )
        }
      />

      {!connected ? (
        <div className="mt-6">
          <ConnectGithub onDone={() => refresh().then(() => load(true))} />
        </div>
      ) : (
        <>
          {adding === 'repo' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addRepo()
              }}
              className="mt-4 flex flex-col gap-2 rounded-[var(--hv-r-card)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] p-3 sm:flex-row sm:items-center"
            >
              <label className="sr-only" htmlFor="add-repo">
                Repository
              </label>
              <input id="add-repo" autoFocus value={addRef} onChange={(e) => setAddRef(e.target.value)} placeholder="owner/name or a github.com link — yours, your org’s or any public repo" className="h-9 min-w-0 flex-1 rounded-[var(--hv-r-btn)] bg-[var(--hv-surface-2)] px-3 text-[13.5px] text-[var(--hv-text-1)] outline-none placeholder:text-[var(--hv-text-3)] focus-visible:ring-2 focus-visible:ring-[var(--hv-accent)]" />
              <Button type="submit" size="sm" loading={busy === 'add'} disabled={!addRef.trim() || (!!busy && busy !== 'add')}>
                <MessagesSquare /> Add & chat
              </Button>
            </form>
          )}
          {adding === 'folder' && (
            <div className="mt-4">
              <FolderImport compact />
            </div>
          )}

          <div className="sticky top-[41px] z-10 -mx-4 mt-5 flex flex-col gap-2 bg-[var(--hv-bg-app)] px-4 py-2 sm:-mx-6 sm:flex-row sm:items-center sm:px-6">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--hv-r-btn)] border border-[var(--hv-border)] bg-[var(--hv-surface-1)] px-3 focus-within:ring-2 focus-within:ring-[var(--hv-accent)]">
              <Search className="size-4 text-[var(--hv-text-3)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects and repositories" placeholder={repos ? `Search ${items.length} projects and repositories` : 'Loading your repositories…'} className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--hv-text-1)] outline-none placeholder:text-[var(--hv-text-3)]" />
            </label>
            <SegmentedControl
              size="sm"
              label="Show"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'projects', label: `Projects${projectCount ? ` · ${projectCount}` : ''}` },
                { value: 'mine', label: 'Mine' },
                { value: 'private', label: 'Private' },
              ]}
            />
          </div>
          {errors.length > 0 && <p className="mt-2 rounded-[var(--hv-r-btn)] bg-[color-mix(in_oklab,var(--hv-warning)_10%,transparent)] px-3 py-2 text-[12.5px] text-[var(--hv-text-2)]">Some connections couldn’t list repositories: {errors.join(' · ')}</p>}

          <div className="mt-2">
            {!repos && !items.length ? (
              <div className="space-y-1">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="hive-shimmer h-10 rounded-[var(--hv-r-btn)]" />
                ))}
              </div>
            ) : !shown.length ? (
              <Empty icon={<FolderGit2 />} title={items.length ? 'Nothing matches' : 'No repositories yet'}>
                {items.length ? 'Try another word, or show All.' : 'This GitHub token can’t see any repositories. Give it access to your repos (or use a classic token with the “repo” scope).'}
              </Empty>
            ) : (
              <RowList label="Projects and repositories">
                {shown.slice(0, 300).map((it) => {
                  const b = (k: string) => busy === it.key + k
                  return (
                    <Row
                      key={it.key}
                      leading={it.projectId ? <span className="size-2.5 rounded-full" style={{ background: projectColor(it.color ?? '') }} aria-hidden /> : <FolderGit2 className="text-[var(--hv-text-3)]" />}
                      title={
                        <span className="inline-flex max-w-full items-center gap-1.5">
                          <span className="truncate">
                            {it.owner && <span className="text-[var(--hv-text-3)]">{it.owner}/</span>}
                            <span className={it.projectId ? 'font-medium' : ''}>{it.name}</span>
                          </span>
                          {it.private && <Lock className="size-3 shrink-0 text-[var(--hv-text-3)]" aria-label="Private" />}
                        </span>
                      }
                      meta={[it.desc || (it.projectId ? '' : 'No description'), it.language, it.stars ? `★ ${it.stars}` : '', it.updated ? `updated ${timeAgo(it.updated)}` : ''].filter(Boolean).join(' · ')}
                      trailing={
                        <>
                          {it.running > 0 && <StatusPill size="sm" status="running" label={`${it.running} running`} />}
                          {it.projectId ? <StatusPill size="sm" status="done" label="Project" className="max-sm:hidden" /> : null}
                          {it.readOnly && <span className="text-[11px] text-[var(--hv-text-3)] max-sm:hidden">read-only</span>}
                        </>
                      }
                      onOpen={() => open(it, 'project')}
                      className="max-sm:[&_.hv-row-actions]:hidden"
                      actions={
                        <>
                          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => open(it, 'chat')} aria-label={`Chat about ${it.name}`}>
                            {b('chat') ? <Loader2 className="animate-spin" /> : <MessagesSquare />} Chat
                          </Button>
                          <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => open(it, 'copilot')} aria-label={`Hand ${it.name} to the Copilot`} title="The Copilot plans it and runs agents">
                            {b('copilot') ? <Loader2 className="animate-spin" /> : <Bot />} Copilot
                          </Button>
                          {it.repo && (
                            <a href={`https://github.com/${it.repo.fullName}`} target="_blank" rel="noreferrer" className="grid size-7 place-items-center rounded-[var(--hv-r-btn)] text-[var(--hv-text-3)] hover:bg-[var(--hv-surface-2)] hover:text-[var(--hv-text-1)]" aria-label={`Open ${it.name} on GitHub`}>
                              <ExternalLink className="size-3.5" />
                            </a>
                          )}
                        </>
                      }
                    />
                  )
                })}
              </RowList>
            )}
            {shown.length > 300 && <p className="mt-2 px-2.5 text-[12px] text-[var(--hv-text-3)]">Showing 300 of {shown.length}. Search to narrow it down.</p>}
          </div>
        </>
      )}
    </div>
  )
}

/** Connect GitHub in two steps: a pre-filled token page, then paste. */
export function ConnectGithub({ onDone }: { onDone?: () => void }) {
  const toast = useToast()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const connect = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.addGithub({ token: token.trim() })
      toast.success(`Connected as @${r.login} — all your repositories are here now`)
      setToken('')
      onDone?.()
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="hive-card relative mx-auto max-w-2xl overflow-hidden p-6">
      <h2 className="relative text-[17px] font-semibold">Connect GitHub once — every repo is ready</h2>
      <p className="relative mt-1 text-[13px] text-text-muted">After this, all your repositories (yours, ones you collaborate on, and your organisations’) show up here and the Copilot can work on any of them.</p>
      <ol className="relative mt-5 space-y-4 text-[13px]">
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-brand text-[12px] font-semibold text-on-accent-brand">1</span>
          <div>
            <div className="font-medium">Create a token — everything is pre-filled</div>
            <div className="text-text-muted">Pick an expiry, scroll down, press “Generate token”, copy it.</div>
            <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl bg-text-primary px-3.5 text-[13px] font-medium text-bg-app hover:opacity-90">
              Open GitHub <ExternalLink className="size-3.5" />
            </a>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-brand text-[12px] font-semibold text-on-accent-brand">2</span>
          <div className="min-w-0 flex-1">
            <div className="font-medium">Paste it here</div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (token.trim().length >= 10) connect()
              }}
            >
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_… or github_pat_…" autoComplete="new-password" data-1p-ignore="" data-lpignore="true" data-bwignore="" className="h-9 min-w-0 flex-1 rounded-xl border hive-line bg-bg-surface px-3 font-mono text-[12.5px] outline-none focus:border-accent-brand/50" aria-label="GitHub token" />
              <Button type="submit" loading={busy} disabled={token.trim().length < 10}>
                Connect
              </Button>
            </form>
            <div className="mt-1.5 text-[11.5px] text-text-muted">Stored encrypted. Agents use it to read code and open pull requests — they never push to your main branch.</div>
          </div>
        </li>
      </ol>
    </section>
  )
}
