/* ────────────────────────────────────────────────────────────────────────
   Hive Copilot — your chief of staff. Tell it what you want; it plans the
   work, writes the prompts, puts the right agents on it, watches, reviews
   and judges the result, and reports back. Every action it takes shows as
   a step you can open. Lives on its own page and as a floating panel on
   every Hive page.
   ──────────────────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowUp,
  Bot,
  BrainCircuit,
  Clock3,
  GitMerge,
  HardDrive,
  ShieldCheck,
  Check,
  ChevronDown,
  Coins,
  Eye,
  FileDiff,
  Gavel,
  Globe,
  HeartPulse,
  Loader2,
  Maximize2,
  MessageSquarePlus,
  Network,
  Play,
  Radar,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  UserPlus,
  Wand2,
  X,
  XCircle,
} from 'lucide-react'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { Popover, PopoverContent, PopoverTrigger, Tooltip, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { AgentChip } from './AgentPicker'
import { AgentAvatar, AgentMark } from './agents'
import { hiveApi } from './api'
import { errMsg } from './Improve'
import { useHive } from './store'
import type { AgentSpec, CopilotBrain, CopilotMsg, CopilotSettings, CopilotStep, CopilotWork } from './types'
import { timeAgo, vendorName } from './ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

const STEP: Record<string, { icon: typeof Bot; label: (i: Record<string, unknown>) => string }> = {
  hive_overview: { icon: Eye, label: () => 'Looked over the hive' },
  list_models: { icon: Radar, label: (i) => `Compared models${i.kind ? ` for ${i.kind}` : ''}` },
  session_detail: { icon: Activity, label: () => 'Checked a session' },
  session_diff: { icon: FileDiff, label: (i) => `Read the changes${i.path ? ` in ${String(i.path)}` : ''}` },
  start_session: { icon: Play, label: (i) => `Started “${String(i.title || 'a session')}”` },
  plan_team: { icon: Network, label: () => 'Planned a team' },
  start_team: { icon: Rocket, label: () => 'Started the team' },
  change_team_part: { icon: Settings2, label: (i) => `Changed part ${String(i.partId ?? '')}` },
  add_agent: { icon: UserPlus, label: (i) => `Brought in ${String(i.agent || 'an agent')}` },
  steer_agent: { icon: MessageSquarePlus, label: () => 'Steered an agent' },
  stop_session: { icon: Square, label: () => 'Stopped a session' },
  judge_session: { icon: Gavel, label: () => 'Asked the Judge' },
  improve_prompt: { icon: Wand2, label: () => 'Sharpened a prompt' },
  agent_health: { icon: HeartPulse, label: (i) => (i.testNow ? 'Tested every agent' : 'Checked agent health') },
  spend_report: { icon: Coins, label: () => 'Checked spend' },
  web_search: { icon: Search, label: (i) => `Searched “${String(i.query ?? '').slice(0, 50)}”` },
  read_url: { icon: Globe, label: (i) => `Read ${String(i.url ?? '').replace(/^https?:\/\//, '').slice(0, 40)}` },
  WebSearch: { icon: Search, label: (i) => `Searched “${String(i.query ?? '').slice(0, 50)}”` },
  WebFetch: { icon: Globe, label: (i) => `Read ${String(i.url ?? '').replace(/^https?:\/\//, '').slice(0, 40)}` },
  remember: { icon: BrainCircuit, label: () => 'Remembered that' },
  watch_session: { icon: Eye, label: () => 'Watching a session' },
  ask_model: { icon: Sparkles, label: (i) => `Handed a ${String(i.kind || 'reading')} job to a cheap model` },
  ship_session: { icon: Rocket, label: (i) => `Shipped “${String(i.title ?? '')}” as a pull request` },
  pr_status: { icon: Activity, label: () => 'Checked the pull request' },
  merge_when_green: { icon: GitMerge, label: () => 'Merge when CI is green' },
  pending_approvals: { icon: ShieldCheck, label: () => 'Checked waiting commands' },
  answer_approval: { icon: ShieldCheck, label: (i) => (i.approve ? 'Approved a command' : 'Denied a command') },
  list_pipelines: { icon: Network, label: () => 'Looked at pipelines' },
  run_pipeline: { icon: Play, label: () => 'Ran a pipeline' },
  list_automations: { icon: Clock3, label: () => 'Looked at automations' },
  create_automation: { icon: Clock3, label: (i) => `Scheduled “${String(i.title ?? '')}”` },
  drive_list: { icon: HardDrive, label: () => 'Looked in Drive' },
  drive_read: { icon: HardDrive, label: (i) => `Read ${String(i.path ?? '')}` },
  drive_write: { icon: HardDrive, label: (i) => `Saved ${String(i.path ?? '')}` },
  change_setting: { icon: Settings2, label: () => 'Changed a Hive setting' },
}

const SUGGESTIONS = [
  { icon: Eye, text: "What's happening in the hive right now?" },
  { icon: Network, text: 'Plan a team to add a dark-mode toggle to the settings page, with tests — free models where they are good enough' },
  { icon: Gavel, text: 'Review the most recent session: is it really done? Fix what is missing.' },
  { icon: Radar, text: 'Research which free model is best for coding right now, and remember it' },
  { icon: HeartPulse, text: 'Which agents are failing and why? Test them all.' },
  { icon: Coins, text: 'How much did we spend this month, and where can we save without losing quality?' },
]

const QUICK: { label: string; icon: typeof Bot; send?: string; fill?: string }[] = [
  { label: 'Status', icon: Eye, send: "Give me a short status: what's running, what finished, what needs me." },
  { label: 'Build something', icon: Network, fill: 'Build this, using free models where they are good enough: ' },
  { label: 'Review the last session', icon: Gavel, send: 'Review the most recent session: is it really done? Fix what is missing.' },
  { label: 'Free models', icon: Sparkles, send: 'Which free models are connected, which are failing, and which free sources should I add next?' },
  { label: 'Save tokens', icon: Coins, send: 'Where am I spending tokens, and what should change to spend less without losing quality?' },
]

const WORK_TONE: Record<string, string> = { running: 'var(--color-accent-brand)', queued: 'var(--color-text-muted)', review: 'var(--color-state-success)', pr_open: 'var(--color-state-info)', merged: 'oklch(62% 0.16 300)', committed: 'var(--color-state-info)', failed: 'var(--color-state-error)', stopped: 'var(--color-text-muted)' }
const WORK_LABEL: Record<string, string> = { running: 'working', queued: 'starting', review: 'ready for review', pr_open: 'PR open', merged: 'merged', committed: 'committed', failed: 'failed', stopped: 'stopped' }

/** What the Copilot is running for you right now. */
function ActiveWork({ items, compact }: { items: CopilotWork[]; compact?: boolean }) {
  return (
    <div className={cn('hive-scroll flex shrink-0 gap-2 overflow-x-auto border-b hive-line', compact ? 'px-3 py-2' : 'px-4 py-2.5 sm:px-6')}>
      <span className="flex shrink-0 items-center text-[10.5px] font-semibold uppercase tracking-[0.1em] text-text-muted">On it</span>
      {items.map((w) => {
        const tone = WORK_TONE[w.status] ?? 'var(--color-text-muted)'
        const live = w.status === 'running' || w.status === 'queued'
        return (
          <Link key={w.id} to={`/hive/p/${w.projectId}/t/${w.id}`} className="flex max-w-[260px] shrink-0 items-center gap-2 rounded-xl border hive-line bg-bg-surface/60 py-1 pl-1.5 pr-2.5 hover:border-[var(--hive-line-strong)]">
            <span className="flex -space-x-1.5">
              {w.agents.slice(0, 3).map((a, i) => (
                <AgentAvatar key={i} provider={a.provider} model={a.model} state={a.status === 'running' ? 'editing' : a.status === 'done' ? 'done' : a.status === 'failed' ? 'failed' : 'queued'} size={22} />
              ))}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium">{w.title}</span>
              <span className="flex items-center gap-1 text-[10.5px]" style={{ color: tone }}>
                <span className={cn('size-1.5 rounded-full', live && 'hive-dot-run')} style={{ background: tone }} />
                {WORK_LABEL[w.status] ?? w.status}
                {w.reviewed && !live ? ' · reviewed' : ''}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

/** A link to whatever an action produced (session, team plan). */
function linkOf(s: CopilotStep): { to: string; label: string } | null {
  try {
    const j = JSON.parse(s.preview ?? '') as { link?: string; sessionId?: string }
    if (j.link) return { to: j.link, label: s.name === 'plan_team' ? 'Open the plan' : 'Open session' }
  } catch {
    /* not JSON */
  }
  return null
}

function Steps({ steps, live }: { steps: CopilotStep[]; live?: boolean }) {
  const [open, setOpen] = useState(false)
  if (!steps.length) return null
  const shown = open || live ? steps : steps.slice(-3)
  return (
    <div className="mb-2 space-y-1">
      {steps.length > 3 && !live && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text-primary">
          <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} /> {open ? 'Hide' : `Show all ${steps.length} actions`}
        </button>
      )}
      <AnimatePresence initial={false}>
        {shown.map((s) => {
          const meta = STEP[s.name] ?? { icon: Sparkles, label: () => s.name.replace(/_/g, ' ') }
          const link = s.status === 'done' ? linkOf(s) : null
          return (
            <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }} className="flex items-center gap-2 rounded-xl bg-text-primary/[0.035] px-2.5 py-1.5 text-[12.5px]">
              <span className={cn('grid size-6 shrink-0 place-items-center rounded-lg', s.status === 'error' ? 'bg-state-error/12 text-state-error' : 'bg-accent-brand/10 text-accent-brand')}>
                {s.status === 'running' ? <Loader2 className="size-3.5 animate-spin" /> : s.status === 'error' ? <XCircle className="size-3.5" /> : <meta.icon className="size-3.5" />}
              </span>
              <span className={cn('min-w-0 flex-1 truncate', s.status === 'running' && 'hive-thinking-text')}>{meta.label(s.input)}</span>
              {s.status === 'done' && !link && <Check className="size-3.5 shrink-0 text-state-success" />}
              {link && (
                <Link to={link.to} className="shrink-0 rounded-md bg-accent-brand/12 px-2 py-0.5 text-[11.5px] font-medium text-accent-brand hover:bg-accent-brand/20">
                  {link.label} →
                </Link>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

function BrainPill({ brain, settings, onChange, compact, admin }: { brain: CopilotBrain | null; settings: CopilotSettings | null; onChange: (s: CopilotSettings) => void; compact?: boolean; admin: boolean }) {
  const { boot } = useHive()
  const [spec, setSpec] = useState<AgentSpec | null>(null)
  const label = !brain ? '…' : brain.error ? 'No brain connected' : brain.kind === 'cli' ? 'Claude · your plan' : brain.name || brain.model
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-text-primary/[0.06] pl-1 pr-2.5 text-[12px] hover:bg-text-primary/[0.1]', brain?.error && 'text-state-error')}>
          {brain?.provider ? <AgentMark provider={brain.provider} model={brain.model} size={22} /> : <BrainCircuit className="ml-1 size-4" />}
          <span className="truncate">{compact ? label : `Thinking with ${label}`}</span>
          <ChevronDown className="size-3 shrink-0 text-text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="mb-2 text-[12.5px] font-semibold">The Copilot's brain</div>
        <div className="space-y-1">
          {(
            [
              ['auto', 'Auto (recommended)', 'Your Claude plan first — no API credits. When the plan is busy or offline, the best free model that can use tools, then the best paid one.'],
              ['claude_code', 'Claude plan only', 'Always Claude Code on your worker machine. Stops if the machine is offline.'],
              ['api', 'A specific model', 'Pick one model below.'],
            ] as const
          ).map(([k, t, d]) => (
            <button key={k} type="button" onClick={() => onChange({ brain: k, model: k === 'api' ? settings?.model || '' : '' })} className={cn('flex w-full gap-2 rounded-xl p-2 text-left', settings?.brain === k ? 'bg-accent-brand/10' : 'hover:bg-text-primary/[0.04]')}>
              <span className={cn('mt-1 size-3 shrink-0 rounded-full border-2', settings?.brain === k ? 'border-accent-brand bg-accent-brand' : 'border-text-muted/40')} />
              <span>
                <span className="block text-[12.5px] font-medium">{t}</span>
                <span className="block text-[11.5px] text-text-muted">{d}</span>
              </span>
            </button>
          ))}
        </div>
        {settings?.brain === 'api' && boot && (
          <div className="mt-2">
            <AgentChip
              boot={boot}
              need="tools"
              spec={spec ?? { provider: settings.model.split('/')[0] || 'auto', keyId: 'auto', model: settings.model.split('/').slice(1).join('/') }}
              onChange={(s) => {
                setSpec(s)
                onChange({ brain: 'api', model: `${s.provider}/${s.model}` })
              }}
            />
          </div>
        )}
        {brain?.error && <p className="mt-2 rounded-lg bg-state-error/[0.07] p-2 text-[11.5px] text-text-secondary">{brain.error}</p>}
        <div className="mt-3 border-t hive-line pt-3">
          <div className="mb-2 text-[12.5px] font-semibold">How much it does on its own</div>
          <div className="flex gap-1 rounded-xl bg-text-primary/[0.05] p-1 text-[12px]">
            {(
              [
                ['autopilot', 'Autopilot'],
                ['assist', 'Assist'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => settings && onChange({ ...settings, autonomy: k })} className={cn('h-8 flex-1 rounded-lg', (settings?.autonomy ?? 'autopilot') === k ? 'bg-bg-surface font-medium shadow-sm' : 'text-text-muted')}>
                {l}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11.5px] text-text-muted">
            {(settings?.autonomy ?? 'autopilot') === 'autopilot'
              ? 'Acts for you: starts work, approves safe commands, reviews, fixes and ships verified work as pull requests. Never approves destructive commands.'
              : 'Starts and reviews work, but asks you before shipping, approving commands, scheduling or changing settings.'}
          </p>
          <label className={cn('mt-2.5 flex items-start gap-2 rounded-xl p-2', admin ? 'cursor-pointer hover:bg-text-primary/[0.04]' : 'opacity-60')}>
            <input type="checkbox" disabled={!admin} checked={!!settings?.canMerge} onChange={(e) => settings && onChange({ ...settings, canMerge: e.target.checked })} className="mt-0.5 accent-[var(--color-accent-brand)]" />
            <span>
              <span className="block text-[12.5px] font-medium">Let it merge when CI is green</span>
              <span className="block text-[11.5px] text-text-muted">Merging to the main branch can deploy the live site. {admin ? 'Off until you turn it on.' : 'Only admins can turn this on.'}</span>
            </span>
          </label>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function CopilotThread({ compact = false }: { compact?: boolean }) {
  const { on, boot } = useHive()
  const toast = useToast()
  const [msgs, setMsgs] = useState<CopilotMsg[] | null>(null)
  const [settings, setSettings] = useState<CopilotSettings | null>(null)
  const [brain, setBrain] = useState<CopilotBrain | null>(null)
  const [admin, setAdmin] = useState(false)
  const [active, setActive] = useState<CopilotWork[]>([])
  const [text, setText] = useState('')
  const [pending, setPending] = useState<{ text: string; steps: CopilotStep[]; note?: string; brain?: CopilotBrain } | null>(null)
  const ctl = useRef<AbortController | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const ta = useRef<HTMLTextAreaElement>(null)
  const me = boot?.me.username

  const load = useCallback(async () => {
    try {
      const r = await hiveApi.copilot()
      setMsgs(r.messages)
      setSettings(r.settings)
      setBrain(r.brain)
      setAdmin(!!r.admin)
      setActive(r.active ?? [])
    } catch (e) {
      toast.error(errMsg(e))
    }
  }, [toast])
  useEffect(() => {
    load()
  }, [load])
  // Automatic reviews (and other tabs) arrive over the socket.
  useEffect(
    () =>
      on('copilot', ((d: { username: string; type: string; message?: CopilotMsg }) => {
        if (d.username !== me || ctl.current) return
        if ((d.type === 'done' || d.type === 'user') && d.message) setMsgs((l) => (l && !l.some((m) => m.id === d.message!.id) ? [...l, d.message!] : l))
      }) as never),
    [on, me],
  )
  useEffect(() => {
    const refresh = () => hiveApi.copilotActive().then((r) => setActive(r.active)).catch(() => {})
    return on('task', refresh as never)
  }, [on])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs?.length, pending?.text.length, pending?.steps.length])
  useEffect(() => {
    const el = ta.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(200, el.scrollHeight)}px`
  }, [text])

  const send = async (body: string) => {
    const t = body.trim()
    if (!t || pending) return
    setText('')
    const c = new AbortController()
    ctl.current = c
    setPending({ text: '', steps: [] })
    try {
      await hiveApi.sendCopilot(
        t,
        (type, d) => {
          if (type === 'user') setMsgs((l) => [...(l ?? []), d.message as unknown as CopilotMsg])
          else if (type === 'brain') setPending((p) => p && { ...p, brain: d as CopilotBrain })
          else if (type === 'delta') setPending((p) => p && { ...p, text: p.text + String(d.text ?? '') })
          else if (type === 'note') setPending((p) => p && { ...p, note: String(d.text ?? '') })
          else if (type === 'tool' || type === 'tool_done') {
            const step = d.tool as CopilotStep
            setPending((p) => p && { ...p, steps: p.steps.some((s) => s.id === step.id) ? p.steps.map((s) => (s.id === step.id ? step : s)) : [...p.steps, step] })
          } else if (type === 'done') setMsgs((l) => [...(l ?? []), d.message as unknown as CopilotMsg])
          else if (type === 'error') toast.error(String(d.error ?? 'Something went wrong'))
        },
        c.signal,
      )
    } catch (e) {
      if (!c.signal.aborted) toast.error(errMsg(e))
    } finally {
      ctl.current = null
      setPending(null)
    }
  }

  // A message handed over from Mission control: send it once the thread has loaded.
  const location = useLocation()
  const navigate = useNavigate()
  const handed = useRef(false)
  useEffect(() => {
    const st = location.state as { send?: string } | null
    if (compact || !st?.send || handed.current || !msgs) return
    handed.current = true
    navigate(location.pathname, { replace: true, state: null })
    send(st.send)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs])

  const changeBrain = async (s: CopilotSettings) => {
    setSettings(s)
    try {
      const r = await hiveApi.copilotSettings(s)
      setBrain(r.brain)
      setSettings(r.settings)
    } catch (e) {
      toast.error(errMsg(e))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex items-center gap-2 border-b hive-line', compact ? 'px-3 py-2' : 'px-4 py-2.5 sm:px-6')}>
        <BrainPill brain={brain} settings={settings} onChange={changeBrain} compact={compact} admin={admin} />
        {settings && (
          <span className={cn('hidden h-6 items-center rounded-full px-2 text-[11px] font-medium sm:inline-flex', settings.autonomy === 'assist' ? 'bg-state-info/12 text-state-info' : 'bg-state-success/12 text-state-success')}>{settings.autonomy === 'assist' ? 'Assist' : 'Autopilot'}</span>
        )}
        <span className="ml-auto" />
        {!!msgs?.length && (
          <Tooltip label="Start fresh (memory is kept)">
            <button
              type="button"
              onClick={() => hiveApi.clearCopilot().then(() => setMsgs([])).catch((e) => toast.error(errMsg(e)))}
              className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06] hover:text-text-primary"
              aria-label="Clear the conversation"
            >
              <Trash2 className="size-4" />
            </button>
          </Tooltip>
        )}
      </div>

      {active.length > 0 && <ActiveWork items={active} compact={compact} />}

      <div className="hive-scroll min-h-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto w-full', compact ? 'px-3 py-4' : 'max-w-[820px] px-4 py-6 sm:px-6')}>
          {!msgs ? (
            <div className="space-y-3">
              <div className="hive-shimmer h-16 rounded-2xl" />
              <div className="hive-shimmer h-24 rounded-2xl" />
            </div>
          ) : !msgs.length && !pending ? (
            <div className={cn('text-center', compact ? 'py-4' : 'py-10')}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.3, ease: EASE }} className="relative mx-auto mb-4 grid size-16 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent-brand/20" style={{ animationDuration: '2.6s' }} />
                <span className="relative grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(68%_0.17_285),oklch(70%_0.15_200))] text-white shadow-lg">
                  <Bot className="size-8" />
                </span>
              </motion.div>
              <h2 className={cn('font-semibold tracking-tight', compact ? 'text-[16px]' : 'text-[22px]')}>Your Copilot runs the hive</h2>
              <p className="mx-auto mt-1 max-w-md text-[13px] text-text-muted">Say what you want built or checked. It plans the work, writes the prompts, puts the right agents on it, reviews what they did and tells you when it's ready.</p>
              <div className={cn('mx-auto mt-5 grid gap-2 text-left', compact ? '' : 'max-w-2xl sm:grid-cols-2')}>
                {SUGGESTIONS.slice(0, compact ? 4 : 6).map((s) => (
                  <button key={s.text} type="button" onClick={() => send(s.text)} className="hive-card hive-card-hover flex items-start gap-2.5 p-3 text-[12.5px] text-text-secondary">
                    <s.icon className="mt-0.5 size-4 shrink-0 text-accent-brand" />
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {msgs.map((m) =>
                m.role === 'user' ? (
                  m.auto ? null : (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-accent-brand/12 px-3.5 py-2 text-[13.5px]">{m.content}</div>
                    </div>
                  )
                ) : (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <AgentAvatar provider={m.provider ?? 'auto'} model={m.model} state="done" size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2 text-[11.5px] text-text-muted">
                        <span className="font-medium text-text-secondary">Copilot</span>
                        {m.auto && <span className="rounded-full bg-state-info/12 px-1.5 py-0.5 text-[10.5px] font-medium text-state-info">automatic review</span>}
                        <span className="truncate">{m.provider === 'claude_code' ? 'Claude · your plan' : m.model ? `${vendorName(m.provider ?? '')} · ${m.model}` : ''}</span>
                        <span className="ml-auto shrink-0">{timeAgo(m.createdAt)}</span>
                      </div>
                      <Steps steps={m.tools} />
                      {m.content && <AiMarkdown text={m.content} />}
                      {m.error && <div className="mt-1 rounded-xl bg-state-error/[0.07] px-3 py-2 text-[12.5px] text-state-error">{m.error}</div>}
                    </div>
                  </motion.div>
                ),
              )}
              {pending && (
                <div className="flex gap-3">
                  <AgentAvatar provider={pending.brain?.provider ?? 'auto'} model={pending.brain?.model} state={pending.steps.some((s) => s.status === 'running') ? 'running' : pending.text ? 'writing' : 'thinking'} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-[11.5px] text-text-muted">
                      <span className="font-medium text-text-secondary">Copilot</span> {pending.brain?.kind === 'cli' ? '· Claude · your plan' : pending.brain?.model ? `· ${pending.brain.model}` : ''}
                    </div>
                    {pending.note && <div className="mb-2 inline-flex rounded-full bg-state-warning/12 px-2.5 py-0.5 text-[11.5px] text-state-warning">{pending.note}</div>}
                    <Steps steps={pending.steps} live />
                    {pending.text ? <AiMarkdown text={pending.text} streaming /> : !pending.steps.length && <span className="hive-shine text-[13.5px] font-medium">Thinking…</span>}
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={end} className="h-1" />
        </div>
      </div>

      <div className={cn('shrink-0', compact ? 'p-2.5' : 'px-4 pb-4 sm:px-6')}>
        {!!msgs?.length && !pending && (
          <div className={cn('hive-scroll mx-auto mb-2 flex gap-1.5 overflow-x-auto', !compact && 'max-w-[820px]')}>
            {QUICK.map((q) => (
              <button key={q.label} type="button" onClick={() => (q.send ? send(q.send) : setText(q.fill ?? ''))} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border hive-line bg-bg-surface/60 px-2.5 text-[12px] text-text-secondary hover:border-accent-brand/40 hover:text-text-primary">
                <q.icon className="size-3.5 text-accent-brand" /> {q.label}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(text)
          }}
          className={cn('hive-composer hive-ring mx-auto flex items-end gap-2 rounded-[20px] p-2 pl-3.5', !compact && 'max-w-[820px]')}
        >
          <textarea
            ref={ta}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send(text)
              }
            }}
            rows={1}
            placeholder="Tell your Copilot what you want done…"
            className="hive-scroll max-h-[200px] min-h-9 flex-1 resize-none bg-transparent py-2 text-[14px] outline-none placeholder:text-text-muted"
            aria-label="Message the Copilot"
          />
          {pending ? (
            <button type="button" onClick={() => ctl.current?.abort()} className="grid size-9 shrink-0 place-items-center rounded-full bg-text-primary text-bg-app" aria-label="Stop">
              <Square className="size-3.5 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={!text.trim()} className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-brand text-on-accent-brand transition-transform enabled:hover:scale-105 disabled:opacity-35" aria-label="Send">
              <ArrowUp className="size-4" strokeWidth={2.4} />
            </button>
          )}
        </form>
        {!compact && <p className="mx-auto mt-1.5 max-w-[820px] text-center text-[11px] text-text-muted">The Copilot plans, delegates and reviews. On Autopilot it ships verified work as pull requests; it merges only if you allow it. Sessions it starts are reviewed automatically.</p>}
      </div>
    </div>
  )
}

/** The floating Copilot button + panel, on every Hive page except the Copilot page. */
export function CopilotDock() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const { live } = useHive()
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i' && !e.shiftKey) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  if (pathname.startsWith('/hive/copilot')) return null
  // Pages with a composer at the bottom: sit above it.
  const raised = /^\/hive\/chat|\/t\//.test(pathname)
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            className={cn('fixed right-3 z-[800] flex', raised ? 'bottom-40' : 'bottom-20', ' h-[min(640px,calc(100dvh-7rem))] w-[min(420px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border hive-line bg-bg-surface shadow-2xl')}
            role="dialog"
            aria-label="Copilot"
          >
            <div className="flex items-center gap-2 border-b hive-line px-3 py-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,oklch(68%_0.17_285),oklch(70%_0.15_200))] text-white">
                <Bot className="size-4" />
              </span>
              <span className="text-[14px] font-semibold">Copilot</span>
              <span className="ml-auto" />
              <Link to="/hive/copilot" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06]" aria-label="Open full page">
                <Maximize2 className="size-4" />
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-lg text-text-muted hover:bg-text-primary/[0.06]" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <CopilotThread compact />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <Tooltip label="Copilot · ⌘I" side="left">
        <motion.button
          type="button"
          onClick={() => setOpen((v) => !v)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className={cn('fixed right-4 z-[800] grid size-13', raised ? 'bottom-28' : 'bottom-4', ' place-items-center rounded-full bg-[linear-gradient(135deg,oklch(64%_0.19_285),oklch(66%_0.16_210))] text-white shadow-[0_10px_30px_-8px_oklch(55%_0.2_285/0.7)]')}
          aria-label={open ? 'Close Copilot' : 'Open Copilot'}
          aria-expanded={open}
        >
          {live.length > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-accent-brand/30" style={{ animationDuration: '2.4s' }} />}
          {open ? <X className="relative size-5" /> : <Bot className="relative size-6" />}
        </motion.button>
      </Tooltip>
    </>
  )
}
