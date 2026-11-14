import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Brain, Check, CheckCircle2, ChevronDown, Cloud, ExternalLink, FolderGit2, GitMerge, GitPullRequest, Globe, KeyRound, Loader2, Play, Rocket, Server, ShieldCheck, Sparkles, Stethoscope, Workflow } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { Button, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { hiveApi } from '../api'
import { defaultSpec } from '../AgentPicker'
import { HiveLogo } from '../HiveLogo'
import { useHive } from '../store'
import type { GithubReport, Project } from '../types'
import { AccessReport, NewProject } from './ProjectPage'

const OWNER = 'Gurudeep306'
const REPO = 'Nexora'
const SITE = 'https://nexoraguru.in'

/** What every agent should know about this codebase (seeded into project memory). */
const NEXORA_MEMORY: [string, string][] = [
  ['Stack', 'API: Node 22 + Express 4 + socket.io in src/ (src/server.js is large; routes in src/routes/*). Client: React 19 + Vite 8 + TypeScript + Tailwind 4 in client/. DB: SQLite locally, Turso (libsql) in production.'],
  ['Checks before shipping', 'Server tests: `npm test` (node --test, needs `npm ci --prefix client` first for the GATE notes tests). Client: `npm run lint --prefix client` and `npm run build --prefix client` (type-check + build). CI runs all of these on every PR.'],
  ['Deploys', 'Render deploys `main` automatically once CI passes (render.yaml, autoDeployTrigger: checksPass). Never commit to main directly — branch + PR. Live site: nexoraguru.in.'],
  ['Security conventions', 'Authorization rules live in src/middleware/authz.js (a deny-list — every new route needs a rule). Paths are matched canonically (case-insensitive, trailing slash stripped). Never trust usernames from the request body.'],
  ['UI conventions', 'Use the theme tokens (bg-bg-surface, text-text-primary, accent-brand…) and components in client/src/components/ui. Respect light/dark palettes; no hard-coded colours. Keep pages responsive to phone width.'],
]

const FIRST_TASKS = [
  { title: 'Validate profile avatar URLs', prompt: 'In src/routes/auth.js the profile update accepts any string as avatarUrl. Accept only https URLs (max 500 chars) or the existing /uploads/ paths, reject everything else with a 400, and add a test in tests/ that proves it.' },
  { title: 'Rate-limit contest passwords', prompt: 'Contest passwords are only protected by the global rate limiter. Add a dedicated limiter (e.g. 10 attempts / 10 min per IP+contest) to the contest join route, with a clear error, plus a test.' },
  { title: 'Polish the 404 page', prompt: 'Review the client 404 page and make it match the rest of the site: theme tokens, NexoraGuru logo, helpful links (Home, Problems, Learn). Keep it accessible and responsive.' },
]

const LOOP = [
  { icon: Sparkles, label: 'Session' },
  { icon: FolderGit2, label: 'Branch' },
  { icon: GitPullRequest, label: 'Pull request' },
  { icon: Workflow, label: 'CI checks' },
  { icon: GitMerge, label: 'Merge' },
  { icon: Cloud, label: 'Render deploy' },
  { icon: Globe, label: 'nexoraguru.in' },
]

export default function NexoraGuide() {
  const { boot, machines, refresh } = useHive()
  const navigate = useNavigate()
  const toast = useToast()
  const [report, setReport] = useState<GithubReport | null>(null)
  const [testing, setTesting] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const project: Project | undefined = boot?.projects.find((p) => p.repo_owner?.toLowerCase() === OWNER.toLowerCase() && p.repo_name?.toLowerCase() === REPO.toLowerCase())
  const [memCount, setMemCount] = useState<number | null>(null)
  useEffect(() => {
    if (!project) return
    hiveApi
      .memory(project.id)
      .then((r) => setMemCount(r.memory.length))
      .catch(() => {})
  }, [project])

  if (!boot) return null
  const machine = project?.machine_id ? machines.find((m) => m.id === project.machine_id) : null
  const steps = [
    { done: boot.keys.some((k) => k.status === 'ok'), title: 'Add an AI key', icon: KeyRound },
    { done: !!report?.ok && report.canPush !== false ? true : !!project, title: 'Give GitHub access to the private repo', icon: ShieldCheck },
    { done: !!project, title: 'Open NexoraGuru as a project', icon: FolderGit2 },
    { done: (memCount ?? 0) >= NEXORA_MEMORY.length && !!project?.site_url, title: 'Teach the agents about Nexora', icon: Brain },
    { done: !!machine, title: 'Optional: a machine to run tests', icon: Server, optional: true },
    { done: false, title: 'Start a session', icon: Play },
    { done: false, title: 'Ship it to nexoraguru.in', icon: Rocket },
  ]
  const current = open ?? steps.findIndex((s) => !s.done && !s.optional)

  const test = async () => {
    const gh = boot.github[0]
    if (!gh) return navigate('/hive/keys')
    setTesting(true)
    try {
      setReport((await hiveApi.githubTest(gh.id, OWNER, REPO)).report)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setTesting(false)
    }
  }
  const seed = async () => {
    if (!project) return
    setSeeding(true)
    try {
      const existing = (await hiveApi.memory(project.id)).memory.map((m) => m.title)
      for (const [title, body] of NEXORA_MEMORY) if (!existing.includes(title)) await hiveApi.addMemory(project.id, { title, body, pinned: true })
      if (!project.site_url) await hiveApi.setSite(project.id, SITE)
      await hiveApi.updateProject(project.id, { instructions: 'This is the NexoraGuru platform (nexoraguru.in). Read the project memory. Run the checks listed there before finishing when a machine is available. Keep changes focused and add tests.' })
      setMemCount(NEXORA_MEMORY.length)
      await refresh()
      toast.success('Agents now know the Nexora codebase')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSeeding(false)
    }
  }
  const start = async (t: (typeof FIRST_TASKS)[number]) => {
    if (!project) return
    const spec = defaultSpec(boot)
    if (!spec) return toast.error('Add a key whose models can use tools')
    setStarting(t.title)
    try {
      const r = await hiveApi.createTask(project.id, { prompt: t.prompt, title: t.title, mode: 'solo', agents: [spec], machineId: project.machine_id ?? null, folder: project.folder ?? null })
      navigate(`/hive/p/${project.id}/t/${r.task.id}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-4 pb-24 pt-8 sm:px-8">
      {/* Hero */}
      <div className="hive-card relative overflow-hidden p-7">
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <LogoMark size={44} />
            <span className="text-[20px] text-text-muted">×</span>
            <HiveLogo size={44} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Build NexoraGuru from Hive</h1>
            <p className="mt-1 text-[13.5px] text-text-muted">Agents change the code, you review, CI checks it, you merge — and Render puts it live on nexoraguru.in. All from this browser, from anywhere.</p>
          </div>
          {project && (
            <Button onClick={() => navigate(`/hive/p/${project.id}`)}>
              Open project <ArrowRight />
            </Button>
          )}
        </div>
        {/* The loop */}
        <div className="relative mt-6 flex flex-wrap items-center gap-2 text-[12px]">
          {LOOP.map(({ icon: Icon, label }, i, a) => (
            <span key={label} className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-app/60 px-3 py-1.5 ring-1 ring-[var(--hive-line)]">
                <Icon className="size-3.5 text-accent-brand" /> {label}
              </span>
              {i < a.length - 1 && <ArrowRight className="size-3.5 text-text-muted" />}
            </span>
          ))}
        </div>
      </div>

      {/* Steps */}
      <ol className="mt-8 space-y-3">
        {steps.map((s, i) => {
          const active = i === current
          return (
            <motion.li key={s.title} layout className={cn('hive-card overflow-hidden transition-shadow', active && 'ring-2 ring-accent-brand/40')}>
              <button type="button" onClick={() => setOpen(active ? -1 : i)} className="flex w-full items-center gap-3 px-5 py-4 text-left">
                <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold', s.done ? 'bg-state-success text-white' : active ? 'bg-accent-brand text-on-accent-brand' : 'bg-text-primary/[0.08] text-text-muted')}>{s.done ? <Check className="size-4" /> : i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[14.5px] font-medium', s.done && 'text-text-muted')}>{s.title}</span>
                </span>
                {s.optional && <span className="text-[11px] text-text-muted">optional</span>}
                <ChevronDown className={cn('size-4 text-text-muted transition-transform', active && 'rotate-180')} />
              </button>
              {active && (
                <div className="border-t hive-line px-5 pb-5 pt-4 text-[13.5px] text-text-secondary">
                  {i === 0 && (
                    <div className="space-y-3">
                      <p>Hive needs at least one model. Claude, GPT and Gemini work best for agents; Groq, Gemini and OpenRouter have free tiers. Add as many keys as you like — Hive switches between them when one runs out.</p>
                      <Button onClick={() => navigate('/hive/keys')}>
                        <KeyRound /> Add keys
                      </Button>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="space-y-3">
                      <p>
                        NexoraGuru is a <b>private</b> repo. GitHub fine-grained tokens only see private repos you pick explicitly — that’s why it didn’t show up. Create (or edit) a token like this:
                      </p>
                      <ol className="list-decimal space-y-1.5 pl-5">
                        <li>
                          github.com → Settings → Developer settings → <b>Fine-grained tokens</b> → Generate new token.
                        </li>
                        <li>
                          <b>Resource owner:</b> {OWNER}. <b>Repository access:</b> Only select repositories → <span className="font-mono">{REPO}</span>.
                        </li>
                        <li>
                          <b>Permissions:</b> Contents — Read and write · Pull requests — Read and write · Actions — Read · Commit statuses — Read · Workflows — Read and write (only if agents may edit .github/workflows).
                        </li>
                        <li>Copy the token, then Keys → GitHub → Connect (or keep your existing connection if you edited its token).</li>
                      </ol>
                      <div className="flex flex-wrap gap-2">
                        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-text-primary/[0.07] px-3 text-[13px] hover:bg-text-primary/[0.1]">
                          Create a token <ExternalLink className="size-3.5" />
                        </a>
                        <Button variant="secondary" onClick={() => navigate('/hive/keys')}>
                          Connect in Keys
                        </Button>
                        <Button onClick={test} loading={testing} disabled={!boot.github.length}>
                          {!testing && <Stethoscope />} Check access to {OWNER}/{REPO}
                        </Button>
                      </div>
                      {report && <AccessReport report={report} />}
                    </div>
                  )}
                  {i === 2 && (project ? <Done text={`${project.name} is set up.`} /> : <NewProject presetOwner={OWNER} presetRepo={REPO} presetName="NexoraGuru" onCreated={() => refresh()} />)}
                  {i === 3 && (
                    <div className="space-y-3">
                      <p>Pins what every agent must know — stack, the checks to run, how deploys work, security and UI conventions — into project memory, and points the project’s health check at {SITE}.</p>
                      <ul className="space-y-1">
                        {NEXORA_MEMORY.map(([t, b]) => (
                          <li key={t} className="flex gap-2 text-[12.5px]">
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent-brand" />
                            <span>
                              <b className="text-text-primary">{t}:</b> {b.slice(0, 120)}…
                            </span>
                          </li>
                        ))}
                      </ul>
                      <Button onClick={seed} loading={seeding} disabled={!project}>
                        {!seeding && <Brain />} Teach the agents
                      </Button>
                    </div>
                  )}
                  {i === 4 && (
                    <div className="space-y-3">
                      <p>Without a machine, agents edit a safe copy of the repo on the server and CI runs the tests on the PR. With a machine (your PC, or a free always-on VM) they can run <span className="font-mono">npm test</span> and the client build themselves before you even open the PR, and start the dev server.</p>
                      <ol className="list-decimal space-y-1 pl-5 text-[12.5px]">
                        <li>Machines → Connect a machine → run the one-line command it shows.</li>
                        <li>Folders & clone → clone NexoraGuru (it links to this project automatically).</li>
                        <li>Run <span className="font-mono">npm ci && npm ci --prefix client</span> once in its terminal.</li>
                      </ol>
                      <Button variant="secondary" onClick={() => navigate('/hive/machines')}>
                        <Server /> Machines
                      </Button>
                    </div>
                  )}
                  {i === 5 && (
                    <div className="space-y-3">
                      <p>Pick a first job — or open the project and describe your own. Add more agents any time; each one’s result becomes a checkpoint you can return to.</p>
                      <div className="grid gap-2 md:grid-cols-3">
                        {FIRST_TASKS.map((t) => (
                          <button key={t.title} type="button" disabled={!project || !!starting} onClick={() => start(t)} className="hive-card hive-card-hover hive-lift flex flex-col gap-1.5 p-4 text-left disabled:opacity-50">
                            <span className="flex items-center gap-2 text-[13.5px] font-medium text-text-primary">
                              {starting === t.title ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4 text-accent-brand" />} {t.title}
                            </span>
                            <span className="line-clamp-3 text-[12px] text-text-muted">{t.prompt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {i === 6 && (
                    <ol className="list-decimal space-y-1.5 pl-5">
                      <li>In the session, review the Changes tab (edit or revert any file, or restore a checkpoint).</li>
                      <li>
                        <b>Ship</b> → Commit & open PR. Hive pushes a <span className="font-mono">hive/…</span> branch — never <span className="font-mono">main</span>.
                      </li>
                      <li>Watch the checks right there: server tests, client lint + build, GATE notes.</li>
                      <li>
                        When they’re green, an admin presses <b>Squash & merge</b>. Render deploys <span className="font-mono">main</span> automatically after CI passes.
                      </li>
                      <li>The project’s pulse shows the deploy and whether {SITE} is up.</li>
                    </ol>
                  )}
                </div>
              )}
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}

function Done({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-state-success">
      <Check className="size-4" /> {text}
    </p>
  )
}
