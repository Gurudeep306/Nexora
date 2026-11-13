/* ────────────────────────────────────────────────────────────────────────
   Always-visible "where am I" in the top bar:
   - ProjectSwitcher: the project you're working on, with its own badge, the
     repo and how many agents are on it right now; switch, chat or add a repo.
   - ModelsAtWork: the models working right now as a stack of their marks;
     open it to see each agent, its model, project and what it's doing.
   ──────────────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronDown, FolderGit2, MessagesSquare, Plus, Search } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentMark, FAMILY, familyOf } from './agents'
import { hiveApi } from './api'
import { projectColor } from './projectColor'
import { useHive } from './store'
import type { Project } from './types'
import { vendorName } from './ui'

/* The project you're working on, shared by the top bar, the Copilot and chats. */
const FOCUS_KEY = 'hive:lastProject'
export function setFocusProject(id: string | null) {
  try {
    if (id) localStorage.setItem(FOCUS_KEY, id)
    else localStorage.removeItem(FOCUS_KEY)
    if (id) localStorage.setItem('hive:copilot-project', id)
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent('hive:focus', { detail: id }))
}
function useFocusId(): string | null {
  const read = () => {
    try {
      return localStorage.getItem(FOCUS_KEY)
    } catch {
      return null
    }
  }
  const [id, setId] = useState<string | null>(read)
  useEffect(() => {
    const on = () => setId(read())
    window.addEventListener('hive:focus', on)
    return () => window.removeEventListener('hive:focus', on)
  }, [])
  return id
}

const initials = (name: string) =>
  name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '·'

/** A project's badge: its colour, its initials and the repo owner's picture. */
export function ProjectAvatar({ project, size = 28, live = 0 }: { project: Pick<Project, 'name' | 'color' | 'repo_owner'>; size?: number; live?: number }) {
  const c = projectColor(project.color)
  const [img, setImg] = useState(true)
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span
        className="grid size-full place-items-center rounded-[28%] font-semibold text-white shadow-sm"
        style={{ background: `linear-gradient(140deg, ${c}, color-mix(in oklab, ${c} 55%, black))`, fontSize: Math.round(size * 0.38), letterSpacing: '-0.02em' }}
      >
        {initials(project.name)}
      </span>
      {project.repo_owner && img && size >= 22 && (
        <img src={`https://github.com/${encodeURIComponent(project.repo_owner)}.png?size=40`} alt="" onError={() => setImg(false)} className="absolute -bottom-1 -right-1 rounded-full ring-2 ring-[var(--color-bg-app)]" style={{ width: Math.round(size * 0.48), height: Math.round(size * 0.48) }} />
      )}
      {live > 0 && <span className="hive-dot-run absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent-brand ring-2 ring-[var(--color-bg-app)]" />}
    </span>
  )
}

export function ProjectSwitcher() {
  const { boot, project: routeProject, live } = useHive()
  const navigate = useNavigate()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const projects = useMemo(() => boot?.projects ?? [], [boot])
  // The project in the URL, else the one you last worked on.
  const focusId = useFocusId()
  const project = routeProject ?? projects.find((p) => p.id === focusId) ?? null
  useEffect(() => {
    if (routeProject && routeProject.id !== focusId) setFocusProject(routeProject.id)
  }, [routeProject, focusId])
  const liveBy = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of live) m.set(a.projectId, (m.get(a.projectId) ?? 0) + 1)
    return m
  }, [live])
  const list = projects.filter((p) => `${p.name} ${p.repo_owner}/${p.repo_name}`.toLowerCase().includes(q.toLowerCase().trim()))
  const go = (p: Project, to: 'project' | 'chat') => {
    setOpen(false)
    setFocusProject(p.id)
    if (to === 'project') navigate(`/hive/p/${p.id}`)
    else
      hiveApi
        .projectChat(p.id)
        .then((r) => navigate(`/hive/chat/${r.convo.id}`))
        .catch((e) => toast.error(e instanceof Error ? e.message : String(e)))
  }
  const n = project ? (liveBy.get(project.id) ?? 0) : 0
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn('group flex h-9 min-w-0 max-w-[300px] items-center gap-2 rounded-xl border px-1.5 pr-2.5 text-left transition-colors', project ? 'hive-line bg-bg-surface hover:border-accent-brand/40' : 'border-dashed hive-line text-text-muted hover:text-text-primary')} aria-label="Switch project">
          {project ? (
            <ProjectAvatar project={project} size={24} live={n} />
          ) : (
            <span className="grid size-6 place-items-center rounded-lg bg-text-primary/[0.06]">
              <FolderGit2 className="size-3.5" />
            </span>
          )}
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[12.5px] font-semibold">{project ? project.name : 'Pick a project'}</span>
            {project && (
              <span className="block truncate text-[10.5px] text-text-muted">
                {project.repo_owner ? `${project.repo_owner}/${project.repo_name}` : 'local folder'}
                {n > 0 && <span className="text-accent-brand"> · {n} working</span>}
              </span>
            )}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-text-muted transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[340px] p-1.5">
        <label className="mb-1 flex h-9 items-center gap-2 rounded-lg bg-text-primary/[0.05] px-2.5">
          <Search className="size-3.5 text-text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a project…" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
        </label>
        <div className="hive-scroll max-h-[360px] overflow-y-auto">
          {list.map((p) => {
            const k = liveBy.get(p.id) ?? 0
            return (
              <div key={p.id} className={cn('group flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-text-primary/[0.05]', project?.id === p.id && 'bg-accent-brand/[0.07]')}>
                <button type="button" onClick={() => go(p, 'project')} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <ProjectAvatar project={p} size={30} live={k} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-[13px] font-medium">
                      {p.name}
                      {project?.id === p.id && <Check className="size-3.5 text-accent-brand" />}
                    </span>
                    <span className="block truncate text-[11px] text-text-muted">
                      {p.repo_owner ? `${p.repo_owner}/${p.repo_name}` : 'local folder'}
                      {k > 0 && <span className="text-accent-brand"> · {k} agent{k === 1 ? '' : 's'} working</span>}
                    </span>
                  </span>
                </button>
                <button type="button" onClick={() => go(p, 'chat')} className="grid size-7 shrink-0 place-items-center rounded-lg text-text-muted opacity-0 hover:bg-text-primary/[0.08] hover:text-text-primary group-hover:opacity-100" aria-label={`Chat about ${p.name}`} title="Chat about this project">
                  <MessagesSquare className="size-3.5" />
                </button>
              </div>
            )
          })}
          {!list.length && <div className="px-2 py-4 text-center text-[12px] text-text-muted">No projects match.</div>}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            navigate('/hive/repos')
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-lg border-t hive-line px-2 pt-2 pb-1.5 text-[12.5px] font-medium text-accent-brand hover:bg-accent-brand/[0.06]"
        >
          <Plus className="size-3.5" /> Add a repository
        </button>
      </PopoverContent>
    </Popover>
  )
}

export function ModelsAtWork() {
  const { live, boot } = useHive()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // One mark per distinct model, most-used first.
  const models = useMemo(() => {
    const m = new Map<string, { provider: string; model: string; n: number }>()
    for (const a of live) {
      const k = `${a.provider}|${a.model}`
      const cur = m.get(k) ?? { provider: a.provider, model: a.model, n: 0 }
      cur.n++
      m.set(k, cur)
    }
    return [...m.values()].sort((a, b) => b.n - a.n)
  }, [live])
  if (!live.length) return null
  const projectName = (id: string) => boot?.projects.find((p) => p.id === id)?.name ?? 'project'
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="hidden h-9 items-center gap-2 rounded-xl border hive-line bg-bg-surface px-2 hover:border-accent-brand/40 md:flex" aria-label="Models working now">
          <span className="flex -space-x-1.5">
            {models.slice(0, 4).map((m) => (
              <span key={`${m.provider}|${m.model}`} className="rounded-lg ring-2 ring-[var(--color-bg-surface)]">
                <AgentMark provider={m.provider} model={m.model} size={22} />
              </span>
            ))}
          </span>
          <span className="text-[12px] font-medium">
            <span className="hive-dot-run mr-1 inline-block size-1.5 rounded-full bg-accent-brand align-middle" />
            {live.length} working
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-2">
        <div className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Working now</div>
        <div className="hive-scroll max-h-[380px] space-y-1 overflow-y-auto">
          {live.map((a) => {
            const fam = FAMILY[familyOf(a.provider, a.model)]
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate(`/hive/p/${a.projectId}/t/${a.taskId}`)
                }}
                className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-text-primary/[0.05]"
              >
                <AgentMark provider={a.provider} model={a.model} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                    <span className="truncate">{a.name}</span>
                    <span className="truncate font-normal text-text-muted">· {a.model || fam.name}</span>
                  </span>
                  <span className="block truncate text-[11.5px] text-text-secondary">{a.doing || 'Thinking…'}</span>
                  <span className="block truncate text-[11px] text-text-muted">
                    {vendorName(a.provider)} · {projectName(a.projectId)} · {a.taskTitle}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
