import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Eye, FolderGit2 as Github, Lock, Plus, Search, Settings2, SquarePen, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Input, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Modal, Select, Textarea, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from './api'
import { useHive } from './store'
import type { Project, Task } from './types'
import { ProviderGlyph, StatusPill, timeAgo } from './ui'

const COLORS: Record<string, string> = {
  violet: 'oklch(66% 0.16 295)',
  blue: 'oklch(66% 0.15 255)',
  cyan: 'oklch(72% 0.12 210)',
  green: 'oklch(70% 0.14 155)',
  amber: 'oklch(78% 0.14 80)',
  rose: 'oklch(68% 0.17 15)',
  slate: 'oklch(62% 0.03 260)',
}
export const projectColor = (c: string) => COLORS[c] ?? COLORS.violet

const GROUPS: { id: string; label: string; match: (t: Task) => boolean }[] = [
  { id: 'running', label: 'Running', match: (t) => t.status === 'running' || t.status === 'queued' },
  { id: 'review', label: 'Needs review', match: (t) => t.status === 'review' },
  { id: 'shipped', label: 'Shipped', match: (t) => t.status === 'pr_open' || t.status === 'committed' },
  { id: 'other', label: 'Stopped & failed', match: (t) => ['failed', 'stopped', 'interrupted'].includes(t.status) },
]

export function ProjectRail({ onNewTask }: { onNewTask: () => void }) {
  const { boot, project, tasks, taskId, select, online } = useHive()
  const [q, setQ] = useState('')
  const [newProject, setNewProject] = useState(false)
  const [settings, setSettings] = useState(false)
  const filtered = useMemo(() => (q ? tasks.filter((t) => t.title.toLowerCase().includes(q.toLowerCase())) : tasks), [tasks, q])
  if (!boot) return null

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-border/70 bg-bg-surface/40">
      <div className="p-2.5">
        <Menu>
          <MenuTrigger asChild>
            <button type="button" className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-bg-surface/80 p-2 text-left hover:border-border-strong">
              {project ? (
                <>
                  <span className="hive-hex grid size-8 shrink-0 place-items-center text-[13px] font-bold text-white" style={{ background: projectColor(project.color) }}>
                    {project.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{project.name}</span>
                    <span className="block truncate text-[11px] text-text-muted">
                      {project.repo_owner}/{project.repo_name}
                    </span>
                  </span>
                </>
              ) : (
                <span className="flex-1 text-sm text-text-muted">Choose a project</span>
              )}
              <ChevronsUpDown className="size-4 text-text-muted" />
            </button>
          </MenuTrigger>
          <MenuContent align="start" className="w-64">
            <MenuLabel>Projects</MenuLabel>
            {boot.projects.map((p) => {
              const here = online.filter((o) => o.view?.projectId === p.id).length
              return (
                <MenuItem key={p.id} onSelect={() => select(p.id)}>
                  <span className="hive-hex grid size-5 place-items-center text-[9px] font-bold text-white" style={{ background: projectColor(p.color) }}>
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {!!p.running && <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" />}
                  {here > 0 && <span className="text-[10px] text-text-muted">{here}👤</span>}
                  {p.id === project?.id && <Check className="size-3.5" />}
                </MenuItem>
              )
            })}
            <MenuSeparator />
            <MenuItem onSelect={() => setNewProject(true)}>
              <Plus className="size-3.5" /> New project from GitHub
            </MenuItem>
            {project && (
              <MenuItem onSelect={() => setSettings(true)}>
                <Settings2 className="size-3.5" /> Project settings
              </MenuItem>
            )}
          </MenuContent>
        </Menu>
      </div>

      {project && (
        <>
          <div className="flex gap-1.5 px-2.5 pb-2">
            <Button size="sm" className="flex-1 justify-start" onClick={onNewTask}>
              <SquarePen /> New task
            </Button>
          </div>
          <div className="px-2.5 pb-2">
            <label className="flex h-8 items-center gap-2 rounded-lg bg-text-primary/5 px-2.5">
              <Search className="size-3.5 text-text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-text-muted" />
            </label>
          </div>
          <nav className="hive-scroll min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
            {GROUPS.map((g) => {
              const items = filtered.filter(g.match)
              if (!items.length) return null
              return (
                <div key={g.id} className="mb-2">
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {g.label} <span className="tabular-nums">· {items.length}</span>
                  </div>
                  {items.map((t) => (
                    <TaskRow key={t.id} t={t} active={t.id === taskId} viewers={online.filter((o) => o.view?.taskId === t.id).length} onClick={() => select(project.id, t.id)} />
                  ))}
                </div>
              )
            })}
            {!tasks.length && <p className="px-3 py-6 text-center text-xs text-text-muted">No tasks yet — describe what you want built and pick your agents.</p>}
          </nav>
        </>
      )}
      <NewProjectDialog open={newProject} onClose={() => setNewProject(false)} />
      {project && <ProjectSettingsDialog project={project} open={settings} onClose={() => setSettings(false)} />}
    </aside>
  )
}

function TaskRow({ t, active, viewers, onClick }: { t: Task; active: boolean; viewers: number; onClick: () => void }) {
  const agents = t.agents ?? []
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group mb-0.5 flex w-full flex-col gap-1 rounded-xl px-2.5 py-2 text-left transition-colors', active ? 'bg-accent-brand/10 ring-1 ring-accent-brand/30' : 'hover:bg-text-primary/5')}
    >
      <span className="line-clamp-2 text-[13px] font-medium leading-snug text-text-primary">{t.title}</span>
      <span className="flex items-center gap-1.5">
        <span className="flex -space-x-1">
          {agents.slice(0, 5).map((a) => (
            <ProviderGlyph key={a.id} provider={a.provider} size="xs" pulse={a.status === 'running'} className="ring-2 ring-bg-surface" />
          ))}
        </span>
        <StatusPill status={t.status} className="h-4 px-1.5 text-[10px]" />
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-text-muted">
          {viewers > 0 && (
            <span className="inline-flex items-center gap-0.5" title={`${viewers} staff watching`}>
              <Eye className="size-3" />
              {viewers}
            </span>
          )}
          {timeAgo(t.updated_at)}
        </span>
      </span>
    </button>
  )
}

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boot, select, refresh } = useHive()
  const toast = useToast()
  const [githubId, setGithubId] = useState('')
  const [repos, setRepos] = useState<{ owner: string; name: string; fullName: string; private: boolean; defaultBranch: string; description: string | null; pushedAt: string }[] | null>(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [instructions, setInstructions] = useState('')
  const [color, setColor] = useState('violet')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open && boot?.github[0] && !githubId) setGithubId(boot.github[0].id)
  }, [open, boot, githubId])
  useEffect(() => {
    if (!open || !githubId) return
    setRepos(null)
    hiveApi
      .repos(githubId)
      .then((r) => setRepos(r.repos))
      .catch((e) => {
        setRepos([])
        toast.error(e instanceof Error ? e.message : 'Could not list repositories')
      })
  }, [open, githubId, toast])

  const list = (repos ?? []).filter((r) => r.fullName.toLowerCase().includes(q.toLowerCase())).slice(0, 60)
  const target = picked ?? (manual.includes('/') ? manual.trim() : null)

  const create = async () => {
    if (!target) return
    const [owner, repo] = target.split('/')
    setBusy(true)
    try {
      const r = await hiveApi.createProject({ githubId, owner, repo, instructions, color })
      await refresh()
      select(r.project.id)
      toast.success(`${r.project.name} is ready`)
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the project')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New project" description="Point Hive at a GitHub repository. Every staff member sees it and can run agents on it." size="lg">
      {!boot?.github.length ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-text-muted">
          <Github className="mx-auto mb-2 size-6" />
          Connect GitHub first (Key vault → GitHub connections).
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Connection
              <Select value={githubId} onValueChange={setGithubId}>
                {boot.github.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label} (@{g.login})
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              Colour
              <div className="flex h-9 items-center gap-1">
                {Object.keys(COLORS).map((c) => (
                  <button key={c} type="button" aria-label={c} onClick={() => setColor(c)} className={cn('hive-hex size-6 transition-transform', color === c && 'scale-125')} style={{ background: COLORS[c] }} />
                ))}
              </div>
            </label>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <label className="flex h-9 items-center gap-2 border-b border-border px-3">
              <Search className="size-3.5 text-text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your repositories" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-muted" autoFocus />
            </label>
            <div className="hive-scroll max-h-64 overflow-y-auto p-1">
              {repos === null
                ? Array.from({ length: 5 }, (_, i) => <div key={i} className="hive-shimmer m-1 h-9 rounded-lg" />)
                : list.map((r) => (
                    <button
                      key={r.fullName}
                      type="button"
                      onClick={() => setPicked(r.fullName === picked ? null : r.fullName)}
                      className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left', picked === r.fullName ? 'bg-accent-brand/10' : 'hover:bg-text-primary/5')}
                    >
                      <Github className="size-4 shrink-0 text-text-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm text-text-primary">
                          {r.fullName} {r.private && <Lock className="size-3 text-text-muted" />}
                        </span>
                        {r.description && <span className="block truncate text-[11px] text-text-muted">{r.description}</span>}
                      </span>
                      <span className="text-[10px] text-text-muted">{timeAgo(Date.parse(r.pushedAt))}</span>
                      {picked === r.fullName && <Check className="size-4 text-accent-brand" />}
                    </button>
                  ))}
              {repos?.length === 0 && <p className="p-3 text-xs text-text-muted">No repositories visible to this token.</p>}
            </div>
          </div>
          {!picked && (
            <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
              …or type owner/repo
              <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="acme/web-app" className="font-mono" />
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Instructions for every agent (optional)
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} placeholder="Conventions, architecture notes, things to never touch… (like a CLAUDE.md)" />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={create} loading={busy} disabled={!target}>
              Create project
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ProjectSettingsDialog({ project, open, onClose }: { project: Project; open: boolean; onClose: () => void }) {
  const { boot, refresh, select } = useHive()
  const toast = useToast()
  const [name, setName] = useState(project.name)
  const [instructions, setInstructions] = useState(project.instructions)
  const [branch, setBranch] = useState(project.default_branch)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    if (open) {
      setName(project.name)
      setInstructions(project.instructions)
      setBranch(project.default_branch)
    }
  }, [open, project])
  const canDelete = boot?.me.admin || boot?.me.username === project.created_by
  return (
    <Modal open={open} onClose={onClose} title="Project settings" description={`${project.repo_owner}/${project.repo_name}`} size="lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Name
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Default base branch
            <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="font-mono" />
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
          Instructions for every agent
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={8} className="font-mono text-xs" />
        </label>
        <div className="flex items-center gap-2">
          {canDelete && (
            <Button variant="ghost" className="text-state-error" onClick={() => setConfirm(true)}>
              <Trash2 /> Delete project
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await hiveApi.updateProject(project.id, { name, instructions, branch })
                await refresh()
                onClose()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Could not save')
              } finally {
                setBusy(false)
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Delete project?"
        message="Its tasks, transcripts and uncommitted changes are deleted for everyone. Commits and PRs on GitHub are not touched."
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          try {
            await hiveApi.deleteProject(project.id)
            await refresh()
            select(null)
            onClose()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not delete')
          }
        }}
      />
    </Modal>
  )
}
