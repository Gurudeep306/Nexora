import { useMemo, useState } from 'react'
import { Check, ChevronDown, Eye, Plus, Search, Settings2, SquarePen } from 'lucide-react'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@/components/ui'
import { cn } from '@/lib/utils'
import { Composer } from '../Composer'
import { NewProjectDialog, ProjectSettingsDialog } from '../dialogs'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import { TaskView } from '../TaskView'
import type { Task } from '../types'
import { ProviderGlyph, StatusDot, timeAgo } from '../ui'

const GROUPS: { id: string; label: string; match: (t: Task) => boolean }[] = [
  { id: 'running', label: 'Working', match: (t) => t.status === 'running' || t.status === 'queued' },
  { id: 'review', label: 'Review', match: (t) => t.status === 'review' },
  { id: 'shipped', label: 'Shipped', match: (t) => t.status === 'pr_open' || t.status === 'committed' },
  { id: 'other', label: 'Stopped', match: (t) => ['failed', 'stopped', 'interrupted'].includes(t.status) },
]

export default function ProjectPage() {
  const { boot, project, taskId, tasks, select, online, live } = useHive()
  const [q, setQ] = useState('')
  const [newProject, setNewProject] = useState(false)
  const [settings, setSettings] = useState(false)
  const filtered = useMemo(() => (q ? tasks.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())) : tasks), [tasks, q])
  if (!boot) return null
  if (!project) return <div className="p-10 text-[14px] text-text-muted">Project not found.</div>
  const here = online.filter((o) => o.view?.projectId === project.id)
  const working = live.filter((a) => a.projectId === project.id).length

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r hive-line md:flex">
        <div className="p-3">
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-text-primary/[0.05]">
                <span className="hive-hex grid size-9 shrink-0 place-items-center text-[13px] font-semibold text-white" style={{ background: projectColor(project.color) }}>
                  {project.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-text-primary">{project.name}</span>
                  <span className="block truncate text-[12px] text-text-muted">
                    {project.repo_owner}/{project.repo_name}
                  </span>
                </span>
                <ChevronDown className="size-4 text-text-muted" />
              </button>
            </MenuTrigger>
            <MenuContent align="start" className="w-64">
              <MenuLabel>Projects</MenuLabel>
              {boot.projects.map((p) => (
                <MenuItem key={p.id} onSelect={() => select(p.id)}>
                  <span className="hive-hex size-4" style={{ background: projectColor(p.color) }} />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {live.some((a) => a.projectId === p.id) && <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" />}
                  {p.id === project.id && <Check className="size-3.5" />}
                </MenuItem>
              ))}
              <MenuSeparator />
              <MenuItem onSelect={() => setNewProject(true)}>
                <Plus className="size-3.5" /> New project
              </MenuItem>
              <MenuItem onSelect={() => setSettings(true)}>
                <Settings2 className="size-3.5" /> Project settings
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
        <div className="space-y-2 px-3 pb-2">
          <button type="button" onClick={() => select(project.id)} className={cn('flex h-9 w-full items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors', !taskId ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-secondary hover:bg-text-primary/[0.05]')}>
            <SquarePen className="size-4" /> New task
          </button>
          <label className="flex h-9 items-center gap-2 rounded-lg px-3 text-text-muted focus-within:bg-text-primary/[0.04]">
            <Search className="size-4" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-muted" />
          </label>
        </div>
        <nav className="hive-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {GROUPS.map((g) => {
            const items = filtered.filter(g.match)
            if (!items.length) return null
            return (
              <div key={g.id} className="mb-3">
                <div className="px-3 pb-1 pt-2 text-[12px] text-text-muted">{g.label}</div>
                {items.map((t) => {
                  const viewers = online.filter((o) => o.view?.taskId === t.id).length
                  return (
                    <button key={t.id} type="button" onClick={() => select(project.id, t.id)} className={cn('mb-px flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors', t.id === taskId ? 'bg-text-primary/[0.07]' : 'hover:bg-text-primary/[0.04]')}>
                      <span className="flex items-start gap-2">
                        <StatusDot status={t.status} className="mt-1.5" />
                        <span className="line-clamp-2 flex-1 text-[13px] leading-snug text-text-primary">{t.title}</span>
                      </span>
                      <span className="flex items-center gap-1.5 pl-4">
                        <span className="flex -space-x-1">
                          {(t.agents ?? []).slice(0, 5).map((a) => (
                            <ProviderGlyph key={a.id} provider={a.provider} size="xs" className="rounded-full ring-1 ring-bg-app" />
                          ))}
                        </span>
                        <span className="ml-auto flex items-center gap-2 text-[11px] text-text-muted">
                          {viewers > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Eye className="size-3" />
                              {viewers}
                            </span>
                          )}
                          {timeAgo(t.updated_at)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
          {!tasks.length && <p className="px-3 py-6 text-[13px] text-text-muted">No tasks yet.</p>}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {taskId ? (
          <TaskView />
        ) : (
          <div className="mx-auto w-full max-w-[760px] px-6 pb-20 pt-[12vh]">
            <h1 className="text-center text-[30px] font-semibold tracking-[-0.03em] text-text-primary">What should we build in {project.name}?</h1>
            <p className="mt-2 text-center text-[14px] text-text-muted">
              {working ? `${working} agent${working === 1 ? '' : 's'} working` : 'No agents running'} · {here.length} staff here · every agent shares this repo's memory and sees the others
            </p>
            <div className="mt-8">
              <Composer projectId={project.id} autoFocus />
            </div>
          </div>
        )}
      </div>
      <NewProjectDialog open={newProject} onClose={() => setNewProject(false)} />
      <ProjectSettingsDialog project={project} open={settings} onClose={() => setSettings(false)} />
    </div>
  )
}
