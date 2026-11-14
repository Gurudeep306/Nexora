import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUp, Boxes, Check, Flag, FolderGit2, Layers, Lightbulb, Loader2, Lock, Plus, RefreshCw, Rocket, Server, Sparkles, Target, Trash2, Users, Wand2 } from 'lucide-react'
import { Button, ConfirmDialog, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { AgentChip, defaultSpec } from '../AgentPicker'
import { HiveLogo } from '../HiveLogo'
import { useHive } from '../store'
import type { AgentSpec, Idea, IdeaPlan } from '../types'
import { timeAgo } from '../ui'

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong')

const EXAMPLES = [
  'A spaced-repetition app for GATE CS that turns my notes into flashcards and schedules reviews.',
  'A Chrome extension that shows a Codeforces problem’s editorial hints one level at a time.',
  'A tiny SaaS that monitors my websites and messages me on Telegram when one goes down.',
]

export default function LaunchpadPage() {
  const { ideaId } = useParams()
  const { boot, ideasVersion } = useHive()
  const navigate = useNavigate()
  const [ideas, setIdeas] = useState<Idea[]>([])
  const load = () =>
    hiveApi
      .ideas()
      .then((r) => setIdeas(r.ideas))
      .catch(() => {})
  useEffect(() => {
    load()
  }, [ideasVersion])
  if (!boot) return null
  const idea = ideas.find((i) => i.id === ideaId) ?? null

  return (
    <div className="flex h-full min-h-0">
      <aside className="hive-scroll hidden w-[280px] shrink-0 overflow-y-auto border-r hive-line p-3 md:block">
        <button type="button" onClick={() => navigate('/hive/projects/ideas')} className={cn('mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium', !ideaId ? 'bg-accent-brand/12 text-accent-brand' : 'text-text-secondary hover:bg-text-primary/[0.05]')}>
          <Plus className="size-4" /> New idea
        </button>
        <div className="px-1 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted">Ideas</div>
        {ideas.map((i) => (
          <button key={i.id} type="button" onClick={() => navigate(`/hive/projects/ideas/${i.id}`)} className={cn('mb-1 w-full rounded-xl px-3 py-2 text-left', i.id === ideaId ? 'bg-text-primary/[0.07]' : 'hover:bg-text-primary/[0.04]')}>
            <div className="flex items-center gap-2">
              <span className={cn('size-1.5 rounded-full', i.status === 'launched' ? 'bg-state-success' : i.status === 'failed' ? 'bg-state-error' : i.status === 'planning' ? 'hive-dot-run bg-accent-brand' : 'bg-state-warning')} />
              <span className="truncate text-[13px] font-medium">{i.title}</span>
            </div>
            <div className="mt-0.5 truncate pl-3.5 text-[11.5px] text-text-muted">
              {i.status} · {timeAgo(i.updated_at)}
            </div>
          </button>
        ))}
        {!ideas.length && <p className="px-2 text-[12px] text-text-muted">Ideas you plan appear here.</p>}
      </aside>
      <div className="hive-scroll min-w-0 flex-1 overflow-y-auto">{idea ? <IdeaView idea={idea} onChanged={load} /> : <NewIdea onCreated={(i) => (load(), navigate(`/hive/projects/ideas/${i.id}`))} />}</div>
    </div>
  )
}

function NewIdea({ onCreated }: { onCreated: (i: Idea) => void }) {
  const { boot } = useHive()
  const toast = useToast()
  const [pitch, setPitch] = useState('')
  const [spec, setSpec] = useState<AgentSpec | null>(() => (boot ? defaultSpec(boot, undefined, undefined) : null))
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  useEffect(() => {
    if (!busy) return setStage(0)
    const t = setInterval(() => setStage((s) => Math.min(4, s + 1)), 2600)
    return () => clearInterval(t)
  }, [busy])
  if (!boot) return null
  const stages = ['Understanding the idea', 'Choosing a stack', 'Designing the architecture', 'Breaking it into milestones', 'Writing the first task for the agents']
  const go = async () => {
    if (pitch.trim().length < 10) return
    setBusy(true)
    try {
      const r = await hiveApi.createIdea(pitch.trim(), spec)
      onCreated(r.idea)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="relative mx-auto max-w-[760px] px-5 pb-20 pt-12">
      <div className="relative text-center">
        <span className="hive-tile mx-auto size-14" style={{ ['--tile' as string]: 'var(--color-state-warning)' }}>
          <Lightbulb className="size-6" />
        </span>
        <h1 className="mt-4 text-[30px] font-semibold tracking-[-0.03em]">From idea to running project</h1>
        <p className="mx-auto mt-2 max-w-lg text-[14px] text-text-muted">Describe it like you’d tell a friend. Hive drafts the product, stack, architecture and milestones, creates the repo, and puts agents on milestone 1.</p>
      </div>
      <div className="hive-composer relative mt-8 rounded-[24px] p-3">
        <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} rows={6} autoFocus disabled={busy} placeholder="I want to build…" className="block w-full resize-y bg-transparent px-2 py-1.5 text-[15.5px] leading-relaxed outline-none placeholder:text-text-muted" />
        <div className="flex items-center gap-2 px-1 pt-1">
          {spec && <AgentChip boot={boot} spec={spec} onChange={setSpec} need="chat" label="Planner" />}
          <button type="button" onClick={go} disabled={pitch.trim().length < 10 || busy} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-accent-brand px-4 text-[13px] font-medium text-on-accent-brand disabled:opacity-40">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />} Draft the plan
          </button>
        </div>
      </div>
      <AnimatePresence>
        {busy && (
          <motion.ol initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-6 max-w-sm space-y-2">
            {stages.map((s, i) => (
              <li key={s} className={cn('flex items-center gap-2.5 text-[13px] transition-opacity', i > stage && 'opacity-35')}>
                {i < stage ? <Check className="size-4 text-state-success" /> : i === stage ? <Loader2 className="size-4 animate-spin text-accent-brand" /> : <span className="size-4" />}
                {s}
              </li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
      {!busy && (
        <div className="mt-6 space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">Try one</div>
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setPitch(e)} className="hive-card hive-card-hover block w-full p-3 text-left text-[13px] text-text-secondary">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const PRIORITY: Record<string, string> = { must: 'var(--color-state-error)', should: 'var(--color-state-warning)', could: 'var(--color-state-info)' }

function IdeaView({ idea, onChanged }: { idea: Idea; onChanged: () => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  const [launch, setLaunch] = useState(false)
  const [del, setDel] = useState(false)
  const plan = idea.plan as IdeaPlan | null
  if (!plan || plan.error) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <AlertTriangle className="mx-auto size-8 text-state-warning" />
        <p className="mt-3 text-[14px]">{plan?.error ?? 'No plan yet.'}</p>
        <p className="mt-1 text-[12.5px] text-text-muted">{idea.pitch}</p>
      </div>
    )
  }
  const refine = async () => {
    if (!feedback.trim()) return
    setRefining(true)
    try {
      await hiveApi.refineIdea(idea.id, feedback.trim())
      setFeedback('')
      onChanged()
      toast.success('Plan updated')
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setRefining(false)
    }
  }
  return (
    <div className="mx-auto max-w-[980px] px-5 pb-24 pt-8 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hive-card relative overflow-hidden p-7">
        <div className="relative flex flex-wrap items-start gap-5">
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-accent-brand">{idea.status === 'launched' ? 'Launched' : 'Plan'}{plan._model ? ` · drafted by ${plan._model}` : ''}</div>
            <h1 className="mt-1 text-[32px] font-semibold tracking-[-0.03em]">{plan.name}</h1>
            {plan.tagline && <p className="mt-1 text-[16px] text-text-secondary">{plan.tagline}</p>}
            {plan.summary && <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-text-secondary">{plan.summary}</p>}
            {plan.audience && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-text-muted">
                <Users className="size-3.5" /> {plan.audience}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {idea.project_id ? (
              <Button onClick={() => navigate(`/hive/p/${idea.project_id}`)}>
                <Rocket /> Open project
              </Button>
            ) : (
              <Button size="lg" onClick={() => setLaunch(true)}>
                <Rocket /> Launch
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setDel(true)}>
              <Trash2 /> Delete
            </Button>
          </div>
        </div>
        {plan.stack && (
          <div className="relative mt-5 flex flex-wrap gap-1.5">
            {Object.entries(plan.stack)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <span key={k} className="hive-chip h-auto py-1">
                  <span className="text-text-muted">{k}</span> <span className="font-medium text-text-primary">{v}</span>
                </span>
              ))}
          </div>
        )}
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-6">
          <Block icon={<Flag className="size-4" />} title="Milestones">
            <ol className="relative space-y-4 border-l hive-line pl-5">
              {(plan.milestones ?? []).map((m, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                  <span className={cn('absolute -left-[27px] grid size-[14px] place-items-center rounded-full text-[8px] font-bold ring-4 ring-[var(--color-bg-app)]', i === 0 ? 'bg-accent-brand text-white' : 'bg-text-primary/20')}>{i + 1}</span>
                  <div className="text-[14px] font-semibold">{m.title}</div>
                  {m.goal && <div className="text-[12.5px] text-text-muted">{m.goal}</div>}
                  <ul className="mt-2 space-y-1">
                    {(m.tasks ?? []).map((t, j) => (
                      <li key={j} className="flex gap-2 text-[12.5px]">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-text-muted/50" />
                        <span>
                          <span className="font-medium text-text-primary">{t.title}</span>
                          {t.detail && <span className="text-text-muted"> — {t.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {i === 0 && <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-brand/10 px-2 py-0.5 text-[11px] text-accent-brand">Agents start here</div>}
                </motion.li>
              ))}
            </ol>
          </Block>
          {plan.architecture && (
            <Block icon={<Layers className="size-4" />} title="Architecture">
              <p className="text-[13.5px] leading-relaxed text-text-secondary">{plan.architecture}</p>
            </Block>
          )}
        </div>
        <div className="space-y-6">
          <Block icon={<Target className="size-4" />} title="Features">
            <div className="space-y-2">
              {(plan.features ?? []).map((f, i) => (
                <div key={i} className="rounded-xl bg-text-primary/[0.035] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{f.title}</span>
                    {f.priority && (
                      <span className="ml-auto rounded-full px-1.5 text-[10.5px] font-medium uppercase" style={{ color: PRIORITY[f.priority], background: `color-mix(in oklab, ${PRIORITY[f.priority] ?? 'gray'} 13%, transparent)` }}>
                        {f.priority}
                      </span>
                    )}
                  </div>
                  {f.detail && <p className="mt-1 text-[12.5px] text-text-muted">{f.detail}</p>}
                </div>
              ))}
            </div>
          </Block>
          {!!plan.risks?.length && (
            <Block icon={<AlertTriangle className="size-4" />} title="Risks">
              <ul className="space-y-1.5 text-[12.5px] text-text-secondary">
                {plan.risks.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </Block>
          )}
          {!!plan.conventions?.length && (
            <Block icon={<Boxes className="size-4" />} title="Conventions for agents">
              <ul className="space-y-1.5 text-[12.5px] text-text-secondary">
                {plan.conventions.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      </div>

      {!idea.project_id && (
        <div className="hive-composer sticky bottom-4 mt-8 rounded-2xl p-2.5">
          <div className="flex items-end gap-2">
            <Sparkles className="mb-2.5 ml-1 size-4 shrink-0 text-accent-brand" />
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={1} placeholder="Refine it — “use Postgres”, “add payments”, “make milestone 1 smaller”…" className="max-h-40 min-h-[38px] flex-1 resize-y bg-transparent py-2 text-[14px] outline-none placeholder:text-text-muted" onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), refine())} />
            <button type="button" onClick={refine} disabled={!feedback.trim() || refining} className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent-brand text-on-accent-brand disabled:opacity-40" aria-label="Refine">
              {refining ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            </button>
          </div>
        </div>
      )}

      <LaunchDialog idea={idea} plan={plan} open={launch} onClose={() => setLaunch(false)} onLaunched={(pid, tid) => navigate(`/hive/p/${pid}/t/${tid}`)} />
      <ConfirmDialog open={del} onClose={() => setDel(false)} onConfirm={() => hiveApi.deleteIdea(idea.id).then(() => navigate('/hive/projects/ideas'))} title="Delete this idea?" message="The plan is removed. A launched project stays." confirmLabel="Delete" danger />
    </div>
  )
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="hive-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold">
        <span className="text-accent-brand">{icon}</span> {title}
      </h2>
      {children}
    </section>
  )
}

function LaunchDialog({ idea, plan, open, onClose, onLaunched }: { idea: Idea; plan: IdeaPlan; open: boolean; onClose: () => void; onLaunched: (projectId: string, taskId: string) => void }) {
  const { boot, machines, refresh } = useHive()
  const toast = useToast()
  const [where, setWhere] = useState<'github' | 'machine'>(boot?.github.length ? 'github' : 'machine')
  const [githubId, setGithubId] = useState(boot?.github[0]?.id ?? '')
  const [repoName, setRepoName] = useState(plan.repoName ?? '')
  const [org, setOrg] = useState('')
  const [priv, setPriv] = useState(true)
  const [machineId, setMachineId] = useState(machines.find((m) => m.online)?.id ?? '')
  const [agents, setAgents] = useState<AgentSpec[]>(() => {
    const d = boot ? defaultSpec(boot) : null
    return d ? [d] : []
  })
  const [busy, setBusy] = useState(false)
  if (!boot) return null
  const go = async () => {
    setBusy(true)
    try {
      const r = await hiveApi.launchIdea(idea.id, where === 'github' ? { githubId, repoName, org: org || undefined, private: priv, agents } : { machineId, agents })
      await refresh()
      toast.success(`${r.project.name} launched`, 'Agents are on milestone 1')
      onLaunched(r.project.id, r.task.id)
    } catch (e) {
      toast.error(errMsg(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Launch ${plan.name}`} description="Creates the home for the code, saves the plan as PLAN.md and project memory, and starts milestone 1." size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['github', FolderGit2, 'New GitHub repo', 'PRs, CI, deploys'],
              ['machine', Server, 'Folder on a machine', 'Real files + commands'],
            ] as const
          ).map(([id, Icon, t, s]) => (
            <button key={id} type="button" onClick={() => setWhere(id)} className={cn('flex items-center gap-3 rounded-xl border px-4 py-3 text-left', where === id ? 'border-accent-brand/50 bg-accent-brand/[0.06]' : 'hive-line hover:bg-text-primary/[0.03]')}>
              <Icon className={cn('size-5', where === id ? 'text-accent-brand' : 'text-text-muted')} />
              <span>
                <span className="block text-[13.5px] font-medium">{t}</span>
                <span className="block text-[11.5px] text-text-muted">{s}</span>
              </span>
            </button>
          ))}
        </div>
        {where === 'github' ? (
          boot.github.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-[12px] font-medium text-text-secondary">Connection</span>
                <select value={githubId} onChange={(e) => setGithubId(e.target.value)} className="h-9 w-full rounded-lg border hive-line bg-transparent px-2 text-[13px]">
                  {boot.github.map((g) => (
                    <option key={g.id} value={g.id}>
                      @{g.login}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-medium text-text-secondary">Repository name</span>
                <input value={repoName} onChange={(e) => setRepoName(e.target.value)} className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 font-mono text-[13px] outline-none" />
              </label>
              <label>
                <span className="mb-1 block text-[12px] font-medium text-text-secondary">Organisation (optional)</span>
                <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="your account" className="h-9 w-full rounded-lg border hive-line bg-transparent px-3 text-[13px] outline-none" />
              </label>
              <button type="button" onClick={() => setPriv((p) => !p)} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg border hive-line px-3 text-[13px]">
                <Lock className={cn('size-4', priv ? 'text-state-warning' : 'text-text-muted')} /> {priv ? 'Private' : 'Public'}
              </button>
              <p className="text-[11.5px] text-text-muted sm:col-span-2">The token needs Administration: read & write to create repositories.</p>
            </div>
          ) : (
            <p className="text-[13px] text-text-muted">Connect GitHub in Keys first.</p>
          )
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {machines.map((m) => (
              <button key={m.id} type="button" disabled={!m.online} onClick={() => setMachineId(m.id)} className={cn('hive-chip disabled:opacity-40', machineId === m.id && 'bg-accent-brand/15 text-text-primary ring-1 ring-accent-brand/40')}>
                <span className={cn('size-1.5 rounded-full', m.online ? 'bg-state-success' : 'bg-text-muted')} /> {m.name}
              </button>
            ))}
            {!machines.length && <p className="text-[13px] text-text-muted">Connect a machine first.</p>}
          </div>
        )}
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-text-secondary">Agents for milestone 1 {agents.length > 1 && <span className="text-text-muted">· first one leads</span>}</span>
          <div className="flex flex-wrap gap-1.5">
            {agents.map((s, i) => (
              <AgentChip key={i} boot={boot} spec={s} label={agents.length > 1 && i === 0 ? 'Lead' : undefined} onChange={(n) => setAgents((l) => l.map((x, j) => (j === i ? n : x)))} onRemove={agents.length > 1 ? () => setAgents((l) => l.filter((_, j) => j !== i)) : undefined} />
            ))}
            <button type="button" onClick={() => boot && setAgents((l) => [...l, defaultSpec(boot)!].filter(Boolean))} className="grid size-7 place-items-center rounded-full ring-1 ring-dashed ring-[var(--hive-line-strong)] text-text-muted" aria-label="Add agent">
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <HiveLogo size={20} className="mr-auto opacity-60" />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={go} loading={busy} disabled={!agents.length || (where === 'github' ? !githubId || !repoName : !machineId)}>
            {!busy && <ArrowUp />} Launch
          </Button>
        </div>
      </div>
    </Modal>
  )
}
