/* ────────────────────────────────────────────────────────────────────────
   Your GitHub — every repository the connected GitHub account(s) can
   reach, in one searchable list. Open any of them and it becomes a project
   with a brief Hive writes from the code (stack, layout, how to run and test,
   conventions), so agents start with context. Or hand it straight to the
   Copilot: it opens the repo, picks the agents and runs the work.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Bot, Check, ExternalLink, FolderGit2, GitBranch, Loader2, Lock, MessagesSquare, Plus, RefreshCw, Search, Star } from 'lucide-react'
import { Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { errMsg } from '../Improve'
import { useHive } from '../store'
import type { GhRepo } from '../types'
import { IconTile, PageTitle, timeAgo } from '../ui'
import { FolderImport } from '../FolderImport'

// A classic token with these scopes sees every repo you can (yours, collaborations and orgs).
const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=repo,workflow,read:org&description=Nexora%20Hive'
const LANG_HUE: Record<string, number> = { TypeScript: 230, JavaScript: 85, Python: 250, Go: 195, Rust: 35, Java: 25, 'C++': 330, C: 300, Ruby: 15, PHP: 270, Swift: 30, Kotlin: 290, Dart: 200, HTML: 20, CSS: 260, Shell: 140, Vue: 150, Svelte: 20 }

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
  const shown = useMemo(() => {
    const w = q.toLowerCase().trim()
    return (repos ?? []).filter((r) => {
      if (filter === 'projects' && !r.projectId) return false
      if (filter === 'mine' && !logins.has(r.owner.toLowerCase())) return false
      if (filter === 'private' && !r.private) return false
      return !w || `${r.fullName} ${r.description} ${r.language ?? ''}`.toLowerCase().includes(w)
    })
  }, [repos, q, filter, logins])

  const open = async (r: GhRepo, then: 'project' | 'copilot' | 'chat') => {
    setBusy(r.fullName + then)
    try {
      const res = r.projectId ? { project: { id: r.projectId }, created: false } : await hiveApi.openRepo(r.fullName)
      if (res.created) {
        toast.success(`${r.name} is a project — Hive is writing a brief for the agents from its code`)
        await refresh()
        setRepos((list) => (list ?? []).map((x) => (x.fullName === r.fullName ? { ...x, projectId: res.project.id } : x)))
      }
      if (then === 'chat') {
        const c = await hiveApi.projectChat(res.project.id)
        navigate(`/hive/chat/${c.convo.id}`)
      } else if (then === 'copilot') navigate('/hive/copilot', { state: { projectId: res.project.id } })
      else {
        select(res.project.id)
        navigate(`/hive/p/${res.project.id}`)
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PageTitle
        icon={<GitBranch />}
        title="Your GitHub"
        sub="Every repository you can reach. Open one and it's a project, with a brief Hive writes from the code — or hand it to the Copilot and say what you want."
      >
        {connected && (
          <Button variant="secondary" onClick={() => load(true)} loading={loading}>
            {!loading && <RefreshCw />} Refresh
          </Button>
        )}
      </PageTitle>

      {!connected ? (
        <ConnectGithub onDone={() => refresh().then(() => load(true))} />
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addRepo()
            }}
            className="hive-card mb-3 flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center"
          >
            <IconTile hue={150}>
              <Plus />
            </IconTile>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">Add any repository</div>
              <input value={addRef} onChange={(e) => setAddRef(e.target.value)} placeholder="owner/name or a github.com link — yours, your org’s or any public repo" className="mt-1 h-9 w-full rounded-lg bg-text-primary/[0.05] px-3 text-[13.5px] outline-none ring-1 ring-[var(--hive-line)] placeholder:text-text-muted focus:ring-accent-brand/50" />
            </div>
            <Button type="submit" loading={busy === 'add'} disabled={!addRef.trim() || (!!busy && busy !== 'add')}>
              <MessagesSquare /> Add & chat
            </Button>
          </form>
          <div className="mb-5">
            <FolderImport compact />
          </div>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="hive-card flex h-11 flex-1 items-center gap-2 rounded-2xl px-3.5">
              <Search className="size-4 text-text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={repos ? `Search ${repos.length} repositories` : 'Loading your repositories…'} className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-text-muted" />
            </label>
            <div className="flex gap-1 rounded-xl bg-text-primary/[0.05] p-1">
              {(
                [
                  ['all', 'All'],
                  ['projects', 'Projects'],
                  ['mine', 'Mine'],
                  ['private', 'Private'],
                ] as const
              ).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setFilter(k)} className={cn('h-8 flex-1 rounded-lg px-3 text-[12.5px] sm:flex-none', filter === k ? 'bg-bg-surface font-medium text-text-primary shadow-sm' : 'text-text-muted hover:text-text-primary')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {errors.length > 0 && <div className="mb-3 rounded-xl bg-state-warning/[0.08] px-3 py-2 text-[12.5px] text-text-secondary">Some connections couldn’t list repositories: {errors.join(' · ')}</div>}
          {!repos ? (
            <div className="grid gap-2.5 md:grid-cols-2">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="hive-shimmer h-[88px] rounded-2xl" />
              ))}
            </div>
          ) : !shown.length ? (
            <div className="hive-card p-10 text-center text-[13px] text-text-muted">{repos.length ? 'Nothing matches.' : 'This GitHub token can’t see any repositories. Give it access to your repos (or use a classic token with the “repo” scope).'}</div>
          ) : (
            <div className="grid gap-2.5 md:grid-cols-2">
              {shown.slice(0, 200).map((r, i) => (
                <motion.div key={r.fullName} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 16) * 0.015 } }} className="hive-card group flex flex-col gap-2 p-3.5">
                  <div className="flex items-start gap-3">
                    <IconTile hue={LANG_HUE[r.language ?? ''] ?? 260}>
                      <FolderGit2 />
                    </IconTile>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold">
                          <span className="font-normal text-text-muted">{r.owner}/</span>
                          {r.name}
                        </span>
                        {r.private && <Lock className="size-3 text-text-muted" aria-label="Private" />}
                        {r.projectId && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-state-success/12 px-1.5 text-[10.5px] font-medium text-state-success">
                            <Check className="size-3" /> project
                          </span>
                        )}
                        {!r.canPush && <span className="rounded-full bg-text-primary/[0.06] px-1.5 text-[10.5px] text-text-muted">read-only</span>}
                      </div>
                      <div className="line-clamp-1 text-[12.5px] text-text-muted">{r.description || 'No description'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11.5px] text-text-muted">
                        {r.language && (
                          <span className="inline-flex items-center gap-1">
                            <span className="size-2 rounded-full" style={{ background: `oklch(65% 0.15 ${LANG_HUE[r.language] ?? 260})` }} /> {r.language}
                          </span>
                        )}
                        {r.stars > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="size-3" /> {r.stars}
                          </span>
                        )}
                        {r.pushedAt && <span>updated {timeAgo(Date.parse(r.pushedAt))}</span>}
                      </div>
                    </div>
                    <a href={`https://github.com/${r.fullName}`} target="_blank" rel="noreferrer" className="grid size-7 shrink-0 place-items-center rounded-lg text-text-muted opacity-0 hover:bg-text-primary/[0.06] group-hover:opacity-100" aria-label="Open on GitHub">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" disabled={!!busy} onClick={() => open(r, 'chat')} className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-brand text-[12.5px] font-medium text-on-accent-brand disabled:opacity-60">
                      {busy === r.fullName + 'chat' ? <Loader2 className="size-3.5 animate-spin" /> : <MessagesSquare className="size-3.5" />} Chat
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => open(r, 'copilot')} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-text-primary/[0.06] px-3 text-[12.5px] font-medium hover:bg-text-primary/[0.1] disabled:opacity-60" title="Hand it to the Copilot: it plans and runs agents">
                      {busy === r.fullName + 'copilot' ? <Loader2 className="size-3.5 animate-spin" /> : <Bot className="size-3.5" />} Copilot
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => open(r, 'project')} className="inline-flex h-8 items-center gap-1 rounded-lg bg-text-primary/[0.06] px-3 text-[12.5px] font-medium hover:bg-text-primary/[0.1] disabled:opacity-60">
                      {busy === r.fullName + 'project' ? <Loader2 className="size-3.5 animate-spin" /> : null} {r.projectId ? 'Open' : 'Open as project'} <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
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
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_… or github_pat_…" autoComplete="off" className="h-9 min-w-0 flex-1 rounded-xl border hive-line bg-bg-surface px-3 font-mono text-[12.5px] outline-none focus:border-accent-brand/50" aria-label="GitHub token" />
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
