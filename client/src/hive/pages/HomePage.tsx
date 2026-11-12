import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FolderGit2, KeyRound, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { Composer } from '../Composer'
import { AddGithubDialog, NewProjectDialog } from '../dialogs'
import { projectColor } from '../projectColor'
import { useHive } from '../store'
import type { Task } from '../types'
import { ProviderGlyph, StatusDot, fmtCost, fmtTokens, statusLabel, timeAgo } from '../ui'

type OverviewTask = Task & { project_name: string; project_color: string; repo_owner: string; repo_name: string }

export default function HomePage() {
  const { boot, live, noteTasks, taskIndex } = useHive()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<OverviewTask[]>([])
  const [today, setToday] = useState<{ tokens: number; cost: number } | null>(null)
  const [newProject, setNewProject] = useState(false)

  useEffect(() => {
    hiveApi
      .overview()
      .then((r) => {
        setTasks(r.tasks)
        setToday(r.today)
        noteTasks(r.tasks)
      })
      .catch(() => {})
  }, [noteTasks, live.length])

  // Keep statuses fresh from the live task stream.
  const merged = useMemo(() => tasks.map((t) => ({ ...t, ...(taskIndex[t.id] ?? {}) })), [tasks, taskIndex])
  const review = merged.filter((t) => t.status === 'review')
  const recent = merged.filter((t) => t.status !== 'review').slice(0, 8)

  if (!boot) return null
  const setupDone = boot.github.length > 0 && boot.keys.length > 0 && boot.projects.length > 0
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const projectsWorking = new Set(live.map((a) => a.projectId)).size

  return (
    <div className="mx-auto w-full max-w-[1080px] px-6 pb-20 pt-[8vh]">
      <div className="hive-in mx-auto max-w-[760px] text-center">
        <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-text-primary">
          {greeting}, {boot.me.username}
        </h1>
        <p className="mt-2 text-[15px] text-text-muted">
          {live.length ? (
            <>
              <span className="text-accent-brand">{live.length} agent{live.length === 1 ? '' : 's'}</span> working across {projectsWorking} project{projectsWorking === 1 ? '' : 's'}
            </>
          ) : (
            'The hive is quiet.'
          )}
          {today && today.tokens > 0 && (
            <>
              {' '}
              · {fmtTokens(today.tokens)} tokens today{fmtCost(today.cost) ? ` (≈ ${fmtCost(today.cost)})` : ''}
            </>
          )}
        </p>
        {setupDone && (
          <div className="mt-8 text-left">
            <Composer autoFocus placeholder="What should the hive build? Pick a project, agents and go…" />
          </div>
        )}
      </div>

      {!setupDone && <Onboarding onProject={() => setNewProject(true)} />}

      {live.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Working now</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((a) => (
              <button key={a.id} type="button" onClick={() => navigate(`/hive/p/${a.projectId}/t/${a.taskId}`)} className="hive-card hive-card-hover hive-in flex flex-col gap-3 p-4 text-left">
                <div className="flex items-center gap-2.5">
                  <ProviderGlyph provider={a.provider} pulse />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-text-primary">{a.name}</div>
                    <div className="truncate text-[12px] text-text-muted">{a.model}</div>
                  </div>
                </div>
                <div className="truncate text-[13px] text-text-secondary">
                  <span className="text-accent-brand">●</span> {a.doing || 'thinking…'}
                </div>
                <div className="truncate text-[12px] text-text-muted">
                  {boot.projects.find((p) => p.id === a.projectId)?.name} · {a.taskTitle}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {review.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Ready for your review</h2>
          <TaskList tasks={review} />
        </section>
      )}

      {setupDone && (
        <section className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-text-secondary">Projects</h2>
            <Button size="sm" variant="ghost" onClick={() => setNewProject(true)}>
              <Plus /> New project
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boot.projects.map((p) => {
              const working = live.filter((a) => a.projectId === p.id).length
              return (
                <Link key={p.id} to={`/hive/p/${p.id}`} className="hive-card hive-card-hover flex items-center gap-3 p-4">
                  <span className="hive-hex grid size-9 shrink-0 place-items-center text-[13px] font-semibold text-white" style={{ background: projectColor(p.color) }}>
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-text-primary">{p.name}</span>
                    <span className="block truncate text-[12px] text-text-muted">
                      {p.repo_owner}/{p.repo_name}
                    </span>
                  </span>
                  {working > 0 ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-accent-brand">
                      <span className="hive-dot-run size-1.5 rounded-full bg-accent-brand" />
                      {working}
                    </span>
                  ) : (
                    <span className="text-[12px] text-text-muted">{p.tasks ?? 0} tasks</span>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary">Recent</h2>
          <TaskList tasks={recent} />
        </section>
      )}
      <NewProjectDialog open={newProject} onClose={() => setNewProject(false)} />
    </div>
  )
}

function TaskList({ tasks }: { tasks: OverviewTask[] }) {
  return (
    <div className="hive-card divide-y divide-[var(--hive-line)] overflow-hidden p-0">
      {tasks.map((t) => (
        <Link key={t.id} to={`/hive/p/${t.project_id}/t/${t.id}`} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-text-primary/[0.03]">
          <span className="hive-hex size-2.5 shrink-0" style={{ background: projectColor(t.project_color) }} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] text-text-primary">{t.title}</span>
            <span className="block truncate text-[12px] text-text-muted">
              {t.project_name} · {statusLabel(t.status)} · {timeAgo(t.updated_at)}
            </span>
          </span>
          <span className="flex -space-x-1">
            {(t.agents ?? []).slice(0, 5).map((a) => (
              <ProviderGlyph key={a.id} provider={a.provider} size="sm" className="rounded-full ring-2 ring-bg-app" />
            ))}
          </span>
          <StatusDot status={t.status} />
          <ArrowRight className="size-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      ))}
    </div>
  )
}

function Onboarding({ onProject }: { onProject: () => void }) {
  const { boot } = useHive()
  const [gh, setGh] = useState(false)
  if (!boot) return null
  const steps = [
    { done: boot.github.length > 0, title: 'Connect GitHub', body: 'A token that can read and write the repositories Hive works on.', action: () => setGh(true), cta: 'Connect', icon: FolderGit2 },
    { done: boot.keys.length > 0, title: 'Add AI keys', body: 'Claude, GPT, Gemini, DeepSeek, Grok and 10 more — as many accounts as you like.', to: '/hive/keys', cta: 'Add keys', icon: KeyRound },
    { done: boot.projects.length > 0, title: 'Create a project', body: 'Pick a repository. Every staff member and agent shares it.', action: onProject, cta: 'New project', icon: Plus, disabled: !boot.github.length },
  ]
  return (
    <div className="mx-auto mt-12 max-w-[620px] space-y-2">
      {steps.map((s, i) => (
        <div key={s.title} className={cn('hive-card flex items-center gap-4 p-4', s.done && 'opacity-70')}>
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', s.done ? 'bg-state-success/12 text-state-success' : 'bg-text-primary/[0.06] text-text-secondary')}>
            {s.done ? <Check className="size-5" /> : <s.icon className="size-5" strokeWidth={1.8} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-medium text-text-primary">
              {i + 1}. {s.title}
            </div>
            <div className="text-[13px] text-text-muted">{s.body}</div>
          </div>
          {!s.done &&
            (s.to ? (
              <Link to={s.to}>
                <Button size="sm">{s.cta}</Button>
              </Link>
            ) : (
              <Button size="sm" onClick={s.action} disabled={s.disabled}>
                {s.cta}
              </Button>
            ))}
        </div>
      ))}
      <AddGithubDialog open={gh} onClose={() => setGh(false)} />
    </div>
  )
}
