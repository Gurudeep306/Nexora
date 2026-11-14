import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowUp,
  Check,
  CircleDot,
  Cloud,
  ExternalLink,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Globe,
  Link2,
  Loader2,
  Lock,
  MessagesSquare,
  Paperclip,
  Plus,
  Search,
  Server,
  Settings2,
  Stethoscope,
  Users,
  X,
} from 'lucide-react'
import { Button, Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec } from '../AgentPicker'
import { FileChips, useUploads } from '../uploads'
import { ProjectSettingsDialog } from '../dialogs'
import { PROJECT_COLORS } from '../projectColor'
import { Session } from '../Session'
import { ProjectAvatar } from '../Showcase'
import { AgentMark } from '../agents'
import { useHive } from '../store'
import type { AgentSpec, GithubReport, LinkedRepo, Mode, Project, ProjectActivity, Task } from '../types'
import { MODE_INFO, ProviderGlyph, StatusPill, fmtTokens, timeAgo } from '../ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

export default function ProjectPage() {
  const { projectId } = useParams()
  const { boot, project, taskId } = useHive()
  if (!boot) return null
  if (projectId === 'new') return <NewProject />
  if (!project) return <div className="p-10 text-[14px] text-text-muted">Project not found.</div>
  if (taskId) return <Session />
  return <ProjectHome project={project} />
}

/* ── Project home ──────────────────────────────────────────────────────── */
const GROUPS: { id: string; label: string; match: (t: Task) => boolean }[] = [
  { id: 'running', label: 'Working now', match: (t) => t.status === 'running' || t.status === 'queued' },
  { id: 'review', label: 'Ready to review', match: (t) => t.status === 'review' },
  { id: 'shipped', label: 'Shipped', match: (t) => ['pr_open', 'committed', 'merged'].includes(t.status) },
  { id: 'other', label: 'Stopped', match: (t) => ['failed', 'stopped', 'interrupted'].includes(t.status) },
]

function ProjectHome({ project }: { project: Project }) {
  const { tasks, select, machines, live, online } = useHive()
  const navigate = useNavigate()
  const toast = useToast()
  const [settings, setSettings] = useState(false)
  const [q, setQ] = useState('')
  const [activity, setActivity] = useState<ProjectActivity | null>(null)
  const [repos, setRepos] = useState<LinkedRepo[]>([])
  const machine = project.machine_id ? machines.find((m) => m.id === project.machine_id) : null
  const working = live.filter((a) => a.projectId === project.id)
  const here = online.filter((o) => o.view?.projectId === project.id)
  useEffect(() => {
    setActivity(null)
    hiveApi
      .activity(project.id)
      .then(setActivity)
      .catch(() => {})
    hiveApi
      .projectRepos(project.id)
      .then((r) => setRepos(r.repos))
      .catch(() => {})
  }, [project.id])
  const shown = q ? tasks.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())) : tasks

  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 pb-20 pt-6 sm:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <ProjectAvatar project={project} size={56} live={working.length} />
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{project.name}</h1>
          {working.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {[...new Map(working.map((a) => [`${a.provider}|${a.model}`, a])).values()].slice(0, 6).map((a) => (
                <span key={`${a.provider}|${a.model}`} className="inline-flex items-center gap-1.5 rounded-full bg-text-primary/[0.05] py-0.5 pl-0.5 pr-2 text-[11.5px] ring-1 ring-[var(--hive-line)]">
                  <AgentMark provider={a.provider} model={a.model} size={18} /> {a.model}
                </span>
              ))}
              <span className="text-[11.5px] text-accent-brand">{working.length} working now</span>
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-text-muted">
            {project.repo_owner && (
              <a href={`https://github.com/${project.repo_owner}/${project.repo_name}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text-primary">
                <FolderGit2 className="size-3.5" /> {project.repo_owner}/{project.repo_name} <ExternalLink className="size-3" />
              </a>
            )}
            {project.repo_owner && (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="size-3.5" /> {project.default_branch}
              </span>
            )}
            {machine && (
              <span className="inline-flex items-center gap-1">
                <Server className={cn('size-3.5', machine.online ? 'text-state-success' : 'text-state-warning')} /> {machine.name}: <span className="font-mono">{project.folder}</span>
              </span>
            )}
            {project.site_url && (
              <a href={project.site_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-text-primary">
                <Globe className="size-3.5" /> {project.site_url.replace(/^https:\/\//, '')}
              </a>
            )}
          </div>
          {project.description && <p className="mt-2 max-w-2xl text-[13.5px] text-text-secondary">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {here.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-text-muted">
              <Users className="size-3.5" /> {here.length} here
            </span>
          )}
          <Button
            size="sm"
            onClick={() =>
              hiveApi
                .projectChat(project.id)
                .then((r) => navigate(`/hive/chat/${r.convo.id}`))
                .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
            }
          >
            <MessagesSquare /> Chat
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSettings(true)}>
            <Settings2 /> Settings
          </Button>
        </div>
      </div>

      {/* Pulse */}
      <Pulse project={project} activity={activity} working={working.length} />

      {/* Repositories & where agents can work */}
      <div className="hive-card mt-3 flex flex-wrap items-start gap-4 p-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Repositories</div>
          {!project.repo_owner && !repos.length && <div className="text-[12.5px] text-text-muted">This project lives in a folder on a machine. Link a GitHub repo to open PRs from Hive.</div>}
          {project.repo_owner && (
            <div className="flex items-center gap-2 text-[12.5px]">
              <FolderGit2 className="size-3.5 text-accent-brand" />
              <span className="font-mono">
                {project.repo_owner}/{project.repo_name}
              </span>
              <span className="text-text-muted">· primary</span>
            </div>
          )}
          {repos.map((r) => (
            <RepoRow key={r.id} r={r} project={project} onDone={() => hiveApi.projectRepos(project.id).then((x) => setRepos(x.repos))} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkRepoButton project={project} onDone={() => hiveApi.projectRepos(project.id).then((x) => setRepos(x.repos))} />
          {!project.machine_id && (
            <Button size="sm" variant="secondary" onClick={() => navigate('/hive/machines')}>
              <Server /> Work on a machine
            </Button>
          )}
        </div>
      </div>

      {/* New session */}
      <SessionComposer project={project} repos={repos} />

      {/* Sessions */}
      <div className="mt-10 flex items-center gap-3">
        <h2 className="text-[15px] font-semibold">Sessions</h2>
        <span className="text-[12.5px] text-text-muted">{tasks.length}</span>
        <label className="ml-auto flex h-8 w-56 items-center gap-2 rounded-lg bg-text-primary/[0.05] px-2.5">
          <Search className="size-3.5 text-text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sessions" className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-text-muted" />
        </label>
      </div>
      {GROUPS.map((g) => {
        const list = shown.filter(g.match)
        if (!list.length) return null
        return (
          <section key={g.id} className="mt-5">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              {g.label} · {list.length}
            </h3>
            <div className="grid gap-2.5 md:grid-cols-2">
              {list.map((t, i) => (
                <motion.button key={t.id} type="button" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }} onClick={() => select(project.id, t.id)} className={cn('hive-card hive-card-hover hive-lift flex flex-col gap-2 p-4 text-left', t.status === 'running' && 'hive-working')}>
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 text-[14px] font-medium leading-snug">{t.title}</span>
                    <StatusPill status={t.status} />
                  </div>
                  <div className="flex items-center gap-2 text-[11.5px] text-text-muted">
                    <span className="flex -space-x-1">
                      {(t.agents ?? []).slice(0, 5).map((a) => (
                        <ProviderGlyph key={a.id} provider={a.provider} size="xs" className="rounded-full ring-2 ring-[var(--color-bg-surface)]" />
                      ))}
                    </span>
                    <span>{MODE_INFO[t.mode]?.label ?? t.mode}</span>
                    <span>· {fmtTokens((t.agents ?? []).reduce((s, a) => s + a.input_tokens + a.output_tokens, 0))} tok</span>
                    {t.pr_number && (
                      <span className="inline-flex items-center gap-0.5 text-state-success">
                        <GitPullRequest className="size-3" /> #{t.pr_number}
                      </span>
                    )}
                    <span className="ml-auto">{timeAgo(t.updated_at)}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )
      })}
      {!tasks.length && <p className="mt-4 text-[13px] text-text-muted">No sessions yet — describe what you want above.</p>}

      <ProjectSettingsDialog project={project} open={settings} onClose={() => setSettings(false)} />
    </div>
  )
}

function Pulse({ project, activity, working }: { project: Project; activity: ProjectActivity | null; working: number }) {
  const toast = useToast()
  const head = activity?.commits[0]
  const deploy = activity?.deployments[0]
  const ci = activity?.headChecks?.state
  const [siteEdit, setSiteEdit] = useState(false)
  const [site, setSite] = useState(project.site_url ?? '')
  const cards = [
    {
      icon: CircleDot,
      tone: working ? 'var(--color-accent-brand)' : 'var(--color-text-muted)',
      label: 'Agents',
      value: working ? `${working} working` : 'Idle',
      sub: 'on this project right now',
    },
    {
      icon: GitCommitHorizontal,
      tone: ci === 'success' ? 'var(--color-state-success)' : ci === 'failure' ? 'var(--color-state-error)' : ci === 'pending' ? 'var(--color-state-warning)' : 'var(--color-text-muted)',
      label: project.repo_owner ? `${project.default_branch} · CI` : 'Git',
      value: !project.repo_owner ? 'Local' : !activity ? '…' : ci === 'success' ? 'Passing' : ci === 'failure' ? 'Failing' : ci === 'pending' ? 'Running' : 'No checks',
      sub: head ? `${head.message.slice(0, 48)} · ${timeAgo(Date.parse(head.at))}` : 'latest commit',
      href: head?.url,
    },
    {
      icon: GitPullRequest,
      tone: 'var(--color-state-info)',
      label: 'Open PRs',
      value: activity ? String(activity.pulls.length) : '…',
      sub: activity?.pulls[0] ? `#${activity.pulls[0].number} ${activity.pulls[0].title}` : 'none open',
      href: activity?.pulls[0]?.url,
    },
    {
      icon: Cloud,
      tone: deploy?.state === 'success' ? 'var(--color-state-success)' : deploy?.state === 'failure' || deploy?.state === 'error' ? 'var(--color-state-error)' : 'var(--color-text-muted)',
      label: 'Deploy',
      value: deploy ? deploy.state : activity?.site ? (activity.site.up ? 'Site up' : 'Site down') : '—',
      sub: deploy ? `${deploy.environment} · ${timeAgo(Date.parse(deploy.createdAt))}` : activity?.site ? `${activity.site.ms} ms${activity.site.version ? ` · ${activity.site.version}` : ''}` : 'set a site URL to watch it',
      href: deploy?.url ?? project.site_url ?? undefined,
    },
  ]
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <a key={c.label} href={c.href} target={c.href ? '_blank' : undefined} rel="noreferrer" className={cn('hive-card block p-4', c.href && 'hive-card-hover')}>
          <div className="flex items-center gap-2 text-[11.5px] font-medium text-text-muted">
            <c.icon className="size-3.5" style={{ color: c.tone }} /> {c.label}
          </div>
          <div className="mt-1.5 text-[19px] font-semibold capitalize tracking-[-0.01em]" style={{ color: c.tone === 'var(--color-text-muted)' ? undefined : c.tone }}>
            {c.value}
          </div>
          <div className="truncate text-[11.5px] text-text-muted">{c.sub}</div>
        </a>
      ))}
      {project.repo_owner && (
        <div className="col-span-2 flex items-center gap-2 text-[12px] text-text-muted lg:col-span-4">
          <Globe className="size-3.5" />
          {siteEdit ? (
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                hiveApi
                  .setSite(project.id, site)
                  .then(() => (toast.success('Watching the site'), setSiteEdit(false)))
                  .catch((err) => toast.error(errMsg(err)))
              }}
            >
              <input autoFocus value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://nexoraguru.in" className="h-7 flex-1 rounded-md border hive-line bg-transparent px-2 text-[12px] outline-none" />
              <Button size="sm" type="submit">
                Save
              </Button>
            </form>
          ) : (
            <button type="button" onClick={() => setSiteEdit(true)} className="hover:text-text-primary">
              {project.site_url ? `Live site: ${project.site_url} — change` : 'Add the live site URL to watch its health after deploys'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── New session composer ──────────────────────────────────────────────── */
function SessionComposer({ project, repos }: { project: Project; repos: LinkedRepo[] }) {
  const { boot, select, machines } = useHive()
  const toast = useToast()
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<Mode>('solo')
  const [agents, setAgents] = useState<AgentSpec[]>(() => {
    const d = boot ? defaultSpec(boot) : null
    return d ? [d] : []
  })
  const [where, setWhere] = useState<string>(project.machine_id ? `m:${project.machine_id}` : 'gh:primary')
  const [budget, setBudget] = useState('')
  const [busy, setBusy] = useState(false)
  const up = useUploads()
  if (!boot) return null
  const online = machines.filter((m) => m.online)
  const submit = async () => {
    if (!prompt.trim() || !agents.length) return
    setBusy(true)
    try {
      const machineId = where.startsWith('m:') ? where.slice(2) : null
      const repoId = where.startsWith('gh:') && where !== 'gh:primary' ? where.slice(3) : null
      const body = {
        prompt: prompt.trim(),
        mode,
        agents: mode === 'team' ? agents.slice(1) : agents,
        lead: mode === 'team' ? agents[0] : null,
        attachments: up.files.map((f) => f.id),
        budgetTokens: budget ? Number(budget) * 1000 : null,
        machineId,
        folder: machineId ? (machineId === project.machine_id ? project.folder : null) : null,
        repoId,
      }
      if (machineId && !body.folder) throw new Error('Link a folder on that machine to the project first (Settings, or Machines → clone)')
      const r = await hiveApi.createTask(project.id, body)
      setPrompt('')
      up.setFiles([])
      select(project.id, r.task.id)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="hive-composer mt-8 rounded-2xl p-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
        }}
        rows={3}
        placeholder={`What should the agents do in ${project.name}? Be specific — files, behaviour, how to verify.  (⌘↵ to start)`}
        className="block w-full resize-y bg-transparent px-2 py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-text-muted"
      />
      {up.files.length > 0 && (
        <div className="px-2 pb-1">
          <FileChips files={up.files} onRemove={up.remove} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 px-1 pt-2">
        <label className="grid size-8 cursor-pointer place-items-center rounded-full text-text-muted hover:bg-text-primary/[0.07]" title="Attach designs, specs, screenshots">
          <Paperclip className="size-4" />
          <input type="file" multiple className="hidden" onChange={(e) => e.target.files && up.add(e.target.files)} />
        </label>
        <div className="grid grid-cols-4 gap-0.5 rounded-full bg-text-primary/[0.06] p-0.5">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
            <Tooltip key={m} label={MODE_INFO[m].hint}>
              <button type="button" onClick={() => setMode(m)} className={cn('h-7 rounded-full px-3 text-[12px] transition-colors', mode === m ? 'bg-bg-surface text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary')}>
                {MODE_INFO[m].label}
              </button>
            </Tooltip>
          ))}
        </div>
        {agents.map((s, i) => (
          <AgentChip key={i} boot={boot} spec={s} label={mode === 'team' && i === 0 ? 'Lead' : undefined} compact={agents.length > 2} onChange={(n) => setAgents((l) => l.map((x, j) => (j === i ? n : x)))} onRemove={agents.length > 1 ? () => setAgents((l) => l.filter((_, j) => j !== i)) : undefined} />
        ))}
        {agents.length < 8 && (
          <Tooltip label="Add an agent (different models work great together)">
            <button
              type="button"
              onClick={() => {
                const used = new Set(agents.map((a) => a.provider))
                const next = boot.catalogue.providers.find((p) => p.caps.tools && !used.has(p.id) && boot.keys.some((k) => k.provider === p.id && !k.disabled))?.id
                const d = defaultSpec(boot, next ?? agents[0]?.provider)
                if (d) setAgents((l) => [...l, d])
              }}
              className="grid size-7 place-items-center rounded-full text-text-muted ring-1 ring-dashed ring-[var(--hive-line-strong)] hover:text-text-primary"
              aria-label="Add agent"
            >
              <Plus className="size-3.5" />
            </button>
          </Tooltip>
        )}
        <span className="mx-1 h-5 w-px bg-[var(--hive-line)]" />
        <select value={where} onChange={(e) => setWhere(e.target.value)} className="h-7 max-w-56 truncate rounded-full bg-text-primary/[0.06] px-2.5 text-[12px] outline-none">
          {project.repo_owner && <option value="gh:primary">☁ {project.repo_name} (safe copy → PR)</option>}
          {repos.map((r) => (
            <option key={r.id} value={`gh:${r.id}`}>
              ☁ {r.repo_name}
              {r.role ? ` · ${r.role}` : ''}
            </option>
          ))}
          {online.map((m) => (
            <option key={m.id} value={`m:${m.id}`}>
              ⌘ {m.name}
              {m.id === project.machine_id && project.folder ? ` · ${project.folder.split(/[\\/]/).pop()}` : ''} (real files + commands)
            </option>
          ))}
        </select>
        <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} placeholder="budget k" title="Token budget for this session, in thousands (optional)" className="h-7 w-20 rounded-full bg-text-primary/[0.06] px-2.5 text-[12px] outline-none placeholder:text-text-muted" />
        <button type="button" onClick={submit} disabled={!prompt.trim() || busy || up.busy} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-brand px-4 text-[13px] font-medium text-on-accent-brand shadow-sm transition-all enabled:hover:brightness-110 disabled:opacity-40">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" strokeWidth={2.4} />} Start session
        </button>
      </div>
    </div>
  )
}

/* ── New project: GitHub repo (with access doctor) or a machine folder ── */
export function NewProject({ presetOwner, presetRepo, presetName, onCreated }: { presetOwner?: string; presetRepo?: string; presetName?: string; onCreated?: (p: Project) => void }) {
  const { boot, refresh, machines, select } = useHive()
  const toast = useToast()
  const navigate = useNavigate()
  const [kind, setKind] = useState<'github' | 'machine'>('github')
  const [githubId, setGithubId] = useState(boot?.github[0]?.id ?? '')
  const [repos, setRepos] = useState<{ owner: string; name: string; fullName: string; private: boolean; description: string | null; pushedAt: string }[] | null>(null)
  const [q, setQ] = useState('')
  const [target, setTarget] = useState(presetOwner && presetRepo ? `${presetOwner}/${presetRepo}` : '')
  const [name, setName] = useState(presetName ?? '')
  const [color, setColor] = useState('blue')
  const [report, setReport] = useState<GithubReport | null>(null)
  const [testing, setTesting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [machineId, setMachineId] = useState(machines.find((m) => m.online)?.id ?? '')
  const [folder, setFolder] = useState('')
  const [dirs, setDirs] = useState<{ path: string; dirs: { name: string; path: string; git: boolean }[] } | null>(null)

  useEffect(() => {
    if (!githubId) return
    setRepos(null)
    hiveApi
      .repos(githubId)
      .then((r) => setRepos(r.repos))
      .catch(() => setRepos([]))
  }, [githubId])
  useEffect(() => {
    if (kind !== 'machine' || !machineId) return
    hiveApi
      .folders(machineId)
      .then(setDirs)
      .catch(() => setDirs(null))
  }, [kind, machineId])
  const list = useMemo(() => (repos ?? []).filter((r) => r.fullName.toLowerCase().includes(q.toLowerCase())).slice(0, 80), [repos, q])
  if (!boot) return null

  const test = async () => {
    const [o, r] = target.split('/')
    if (!o || !r || !githubId) return
    setTesting(true)
    try {
      setReport((await hiveApi.githubTest(githubId, o, r)).report)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setTesting(false)
    }
  }
  const create = async () => {
    setBusy(true)
    try {
      let p: Project
      if (kind === 'github') {
        const [owner, repo] = target.split('/')
        p = (await hiveApi.createProject({ githubId, owner, repo, name: name || undefined, color })).project
      } else p = (await hiveApi.createProject({ machineId, folder, name: name || folder.split(/[\\/]/).pop(), color })).project
      await refresh()
      toast.success(`${p.name} is ready`)
      if (onCreated) onCreated(p)
      else select(p.id)
    } catch (e) {
      toast.error(errMsg(e))
      if (kind === 'github') test()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-20 pt-8 sm:px-8">
      {!onCreated && (
        <>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">New project</h1>
          <p className="mt-1 text-[13.5px] text-text-muted">A project is a codebase agents work on: a GitHub repository (agents edit a safe copy and open PRs) or a folder on one of your machines (real files, commands, tests). You can link more repos later.</p>
        </>
      )}
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-text-primary/[0.04] p-1.5">
        {(
          [
            ['github', FolderGit2, 'GitHub repository', 'Private or public · PRs · CI'],
            ['machine', Server, 'Folder on a machine', 'Your PC or a server · commands'],
          ] as const
        ).map(([id, Icon, title, sub]) => (
          <button key={id} type="button" onClick={() => setKind(id)} className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors', kind === id ? 'bg-bg-surface shadow-sm ring-1 ring-[var(--hive-line)]' : 'hover:bg-text-primary/[0.03]')}>
            <Icon className={cn('size-5', kind === id ? 'text-accent-brand' : 'text-text-muted')} />
            <span>
              <span className="block text-[13.5px] font-medium">{title}</span>
              <span className="block text-[11.5px] text-text-muted">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {kind === 'github' ? (
        boot.github.length === 0 ? (
          <div className="hive-card mt-5 p-6 text-center">
            <p className="text-[13.5px]">Connect GitHub first.</p>
            <Button className="mt-3" onClick={() => navigate('/hive/keys')}>
              Go to Keys → GitHub
            </Button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {boot.github.map((g) => (
                <button key={g.id} type="button" onClick={() => setGithubId(g.id)} className={cn('hive-chip', githubId === g.id && 'bg-accent-brand/15 text-text-primary ring-1 ring-accent-brand/40')}>
                  @{g.login}
                </button>
              ))}
            </div>
            <div className="hive-card overflow-hidden">
              <label className="flex items-center gap-2 border-b hive-line px-3">
                <Search className="size-4 text-text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories this token can see" className="h-11 flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-text-muted" />
              </label>
              <div className="hive-scroll max-h-64 overflow-y-auto p-1">
                {repos === null && <div className="hive-shimmer m-2 h-24 rounded-lg" />}
                {list.map((r) => (
                  <button key={r.fullName} type="button" onClick={() => (setTarget(r.fullName), setReport(null), setName((n) => n || r.name))} className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left', target === r.fullName ? 'bg-accent-brand/10' : 'hover:bg-text-primary/[0.04]')}>
                    {r.private ? <Lock className="size-3.5 text-state-warning" /> : <FolderGit2 className="size-3.5 text-text-muted" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{r.fullName}</span>
                      {r.description && <span className="block truncate text-[11.5px] text-text-muted">{r.description}</span>}
                    </span>
                    <span className="text-[11px] text-text-muted">{timeAgo(Date.parse(r.pushedAt))}</span>
                    {target === r.fullName && <Check className="size-4 text-accent-brand" />}
                  </button>
                ))}
                {repos && !list.length && <p className="p-4 text-[12.5px] text-text-muted">No repositories match. A private repo missing here means the token wasn’t given access to it — type it below and run the access check.</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[12px] font-medium text-text-secondary">Repository (owner/name)</span>
                <input value={target} onChange={(e) => (setTarget(e.target.value.trim()), setReport(null))} placeholder="Gurudeep306/Nexora" className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 font-mono text-[13px] outline-none focus:border-accent-brand/50" />
              </label>
              <Button variant="secondary" onClick={test} loading={testing} disabled={!/^[^/\s]+\/[^/\s]+$/.test(target)}>
                {!testing && <Stethoscope />} Check access
              </Button>
            </div>
            {report && <AccessReport report={report} />}
          </div>
        )
      ) : (
        <div className="mt-5 space-y-3">
          {!machines.length ? (
            <div className="hive-card p-6 text-center text-[13.5px]">
              Connect a machine first.
              <Button className="ml-3" size="sm" onClick={() => navigate('/hive/machines')}>
                Machines
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {machines.map((m) => (
                  <button key={m.id} type="button" disabled={!m.online} onClick={() => setMachineId(m.id)} className={cn('hive-chip disabled:opacity-40', machineId === m.id && 'bg-accent-brand/15 text-text-primary ring-1 ring-accent-brand/40')}>
                    <span className={cn('size-1.5 rounded-full', m.online ? 'bg-state-success' : 'bg-text-muted')} /> {m.name}
                  </button>
                ))}
              </div>
              <div className="hive-card hive-scroll max-h-64 overflow-y-auto p-1">
                {dirs?.dirs.map((d) => (
                  <button key={d.path} type="button" onClick={() => setFolder(d.path)} className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px]', folder === d.path ? 'bg-accent-brand/10' : 'hover:bg-text-primary/[0.04]')}>
                    <FolderGit2 className={cn('size-3.5', d.git ? 'text-state-success' : 'text-text-muted')} />
                    <span className="flex-1 truncate">{d.name}</span>
                    {d.git && <span className="text-[11px] text-text-muted">git</span>}
                  </button>
                ))}
                {dirs && !dirs.dirs.length && <p className="p-3 text-[12.5px] text-text-muted">No folders under {dirs.path}.</p>}
              </div>
              <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="/home/you/code/my-app" className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 font-mono text-[12.5px] outline-none" />
            </>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" className="h-10 w-64 rounded-lg border hive-line bg-transparent px-3 text-[14px] outline-none focus:border-accent-brand/50" />
        <div className="flex gap-1.5">
          {Object.keys(PROJECT_COLORS).map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cn('hive-hex size-6 transition-transform', color === c && 'scale-125')} style={{ background: PROJECT_COLORS[c] }} />
          ))}
        </div>
        <Button className="ml-auto" onClick={create} loading={busy} disabled={kind === 'github' ? !/^[^/\s]+\/[^/\s]+$/.test(target) || !githubId : !folder || !machineId}>
          <Plus /> Create project
        </Button>
      </div>
    </div>
  )
}

export function AccessReport({ report }: { report: GithubReport }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-2xl border p-4', report.ok && report.canPush !== false ? 'border-state-success/35 bg-state-success/[0.06]' : 'border-state-warning/40 bg-state-warning/[0.07]')}>
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
        {report.ok && report.canPush !== false ? <Check className="size-4 text-state-success" /> : <AlertTriangle className="size-4 text-state-warning" />}
        {report.ok ? (report.canPush === false ? 'Read-only access' : 'Access looks good') : `GitHub says ${report.status}`}
        <span className="rounded-full bg-text-primary/[0.07] px-2 py-0.5 text-[11px] font-normal text-text-secondary">{report.kind} token{report.login ? ` · @${report.login}` : ''}</span>
        {report.private != null && <span className="rounded-full bg-text-primary/[0.07] px-2 py-0.5 text-[11px] font-normal text-text-secondary">{report.private ? 'private repo' : 'public repo'}</span>}
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12.5px] text-text-secondary">
        {report.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {!report.ok && report.kind === 'fine-grained' && (
        <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-accent-brand hover:underline">
          Open your fine-grained tokens <ExternalLink className="size-3" />
        </a>
      )}
    </motion.div>
  )
}

export function LinkRepoButton({ project, onDone }: { project: Project; onDone: () => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState('')
  const [role, setRole] = useState('')
  if (!boot?.github.length) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">
          <Link2 /> Link a repo
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-3">
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="owner/repo" className="h-8 w-full rounded-md border hive-line bg-transparent px-2 font-mono text-[12.5px] outline-none" />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="role, e.g. api / mobile / docs" className="h-8 w-full rounded-md border hive-line bg-transparent px-2 text-[12.5px] outline-none" />
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            const [owner, repo] = target.split('/')
            hiveApi
              .addProjectRepo(project.id, { githubId: boot.github[0].id, owner, repo, role })
              .then(() => (toast.success('Linked'), setOpen(false), onDone()))
              .catch((e) => toast.error(errMsg(e)))
          }}
        >
          Link
        </Button>
      </PopoverContent>
    </Popover>
  )
}

export function RepoRow({ r, project, onDone }: { r: LinkedRepo; project: Project; onDone: () => void }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <FolderGit2 className="size-3.5 text-text-muted" />
      <span className="font-mono">
        {r.repo_owner}/{r.repo_name}
      </span>
      {r.role && <span className="text-text-muted">· {r.role}</span>}
      <button type="button" onClick={() => hiveApi.removeProjectRepo(project.id, r.id).then(onDone)} className="ml-auto text-text-muted hover:text-state-error" aria-label="Unlink">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
