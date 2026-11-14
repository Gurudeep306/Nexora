/* ────────────────────────────────────────────────────────────────────────
   Agent identity: every model family gets its own mark (original geometric
   glyphs — not company logos), colour and personality, plus a live "state"
   that animates what the agent is doing right now (thinking, reading,
   writing, running a command, reviewing, waiting for a human, done).
   Used by the team floor, rosters, chat, models and pipelines.
   ──────────────────────────────────────────────────────────────────────── */
import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentRow, CostClass, HiveEvent, LiveAgent } from './types'

export type Family =
  | 'claude'
  | 'claudecode'
  | 'codex'
  | 'vibe'
  | 'gpt'
  | 'gemini'
  | 'hermes'
  | 'deepseek'
  | 'grok'
  | 'mistral'
  | 'llama'
  | 'qwen'
  | 'kimi'
  | 'glm'
  | 'minimax'
  | 'perplexity'
  | 'phi'
  | 'nemotron'
  | 'auto'
  | 'generic'

interface FamilyInfo {
  name: string
  hue: number
  chroma: number
  hue2?: number
  tagline: string
}

export const FAMILY: Record<Family, FamilyInfo> = {
  claude: { name: 'Claude', hue: 42, chroma: 0.15, hue2: 25, tagline: 'Careful, thorough, great with large changes' },
  claudecode: { name: 'Claude Code', hue: 42, chroma: 0.15, hue2: 18, tagline: 'Full agent on your machine, on your Claude plan' },
  codex: { name: 'Codex', hue: 165, chroma: 0.13, hue2: 190, tagline: 'Sandboxed coding agent on your ChatGPT plan' },
  vibe: { name: 'Mistral Vibe', hue: 50, chroma: 0.17, hue2: 28, tagline: 'Coding agent on your machine, on your Le Chat plan' },
  gpt: { name: 'GPT', hue: 160, chroma: 0.11, hue2: 140, tagline: 'Strong all-rounder, good at planning and debugging' },
  gemini: { name: 'Gemini', hue: 262, chroma: 0.16, hue2: 300, tagline: 'Fast, huge context, sees images and PDFs' },
  hermes: { name: 'Hermes', hue: 80, chroma: 0.14, hue2: 300, tagline: 'Steerable open model with a strong voice' },
  deepseek: { name: 'DeepSeek', hue: 250, chroma: 0.15, hue2: 225, tagline: 'Great coding and reasoning for very little' },
  grok: { name: 'Grok', hue: 260, chroma: 0.015, tagline: 'Sharp reasoning, quick replies' },
  mistral: { name: 'Mistral', hue: 55, chroma: 0.17, hue2: 25, tagline: 'Fast European models, Codestral for code' },
  llama: { name: 'Llama', hue: 215, chroma: 0.13, hue2: 245, tagline: 'Open and fast — free on many hosts' },
  qwen: { name: 'Qwen', hue: 285, chroma: 0.14, hue2: 255, tagline: 'Top open coder, often free' },
  kimi: { name: 'Kimi', hue: 205, chroma: 0.12, hue2: 230, tagline: 'Open agentic coder with long context' },
  glm: { name: 'GLM', hue: 232, chroma: 0.13, hue2: 200, tagline: 'Strong open coding model' },
  minimax: { name: 'MiniMax', hue: 345, chroma: 0.15, hue2: 15, tagline: 'Efficient open agent model' },
  perplexity: { name: 'Sonar', hue: 190, chroma: 0.12, tagline: 'Answers with live web citations' },
  phi: { name: 'Phi', hue: 205, chroma: 0.09, tagline: 'Small and quick' },
  nemotron: { name: 'Nemotron', hue: 135, chroma: 0.15, tagline: 'Reasoning open model from NVIDIA' },
  auto: { name: 'Auto', hue: 285, chroma: 0.16, hue2: 220, tagline: 'Hive picks the best model for the job' },
  generic: { name: 'Model', hue: 260, chroma: 0.04, tagline: 'An AI model' },
}

/** Which family a (provider, model) belongs to — the model decides, the host doesn't. */
export function familyOf(provider: string, model?: string | null): Family {
  if (provider === 'auto') return 'auto'
  if (provider === 'claude_code') return 'claudecode'
  if (provider === 'codex') return 'codex'
  if (provider === 'vibe') return 'vibe'
  const m = String(model || '').toLowerCase()
  if (/claude|opus|sonnet|haiku|fable|mythos/.test(m) || (!m && provider === 'anthropic')) return 'claude'
  if (/hermes|nous/.test(m)) return 'hermes'
  if (/gemini|gemma/.test(m) || (!m && provider === 'gemini')) return 'gemini'
  if (/deepseek/.test(m) || (!m && provider === 'deepseek')) return 'deepseek'
  if (/grok/.test(m) || provider === 'xai') return 'grok'
  if (/mistral|codestral|devstral|magistral|pixtral|ministral/.test(m) || (!m && provider === 'mistral')) return 'mistral'
  if (/llama/.test(m)) return 'llama'
  if (/qwen|qwq/.test(m) || (!m && provider === 'qwen')) return 'qwen'
  if (/kimi|moonshot/.test(m) || provider === 'moonshot') return 'kimi'
  if (/glm|zhipu/.test(m) || provider === 'zhipu') return 'glm'
  if (/minimax/.test(m)) return 'minimax'
  if (/sonar/.test(m) || provider === 'perplexity') return 'perplexity'
  if (/phi-/.test(m)) return 'phi'
  if (/nemotron/.test(m)) return 'nemotron'
  if (/gpt|o\d-|^o\d$|chatgpt|codex/.test(m) || (!m && provider === 'openai')) return 'gpt'
  return provider === 'anthropic' ? 'claude' : provider === 'openai' ? 'gpt' : provider === 'gemini' ? 'gemini' : 'generic'
}

export const familyColor = (f: Family, l = 70) => `oklch(${l}% ${FAMILY[f].chroma} ${FAMILY[f].hue})`
export const familyColor2 = (f: Family, l = 66) => `oklch(${l}% ${FAMILY[f].chroma} ${FAMILY[f].hue2 ?? FAMILY[f].hue})`

/* ── Glyphs (24×24, drawn with currentColor) ─────────────────────────── */
function Glyph({ f, gid }: { f: Family; gid: string }) {
  const fill = `url(#${gid})`
  switch (f) {
    case 'claude':
      // A soft eight-ray burst.
      return (
        <g fill={fill}>
          {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map((a, i) => (
            <rect key={a} x="11" y={i % 2 ? 4.2 : 2.6} width="2" height={i % 2 ? 15.6 : 18.8} rx="1" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
      )
    case 'claudecode':
      return (
        <g>
          <g fill={fill}>
            {[0, 30, 60, 90, 120, 150].map((a) => (
              <rect key={a} x="11.1" y="2.4" width="1.8" height="12" rx="0.9" transform={`rotate(${a} 12 8.4)`} />
            ))}
          </g>
          <path d="M5.5 17.2l2.6 2-2.6 2" stroke={fill} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10" y="20.2" width="7.5" height="1.7" rx="0.85" fill={fill} />
        </g>
      )
    case 'codex':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2.6l8.1 4.7v9.4L12 21.4l-8.1-4.7V7.3z" />
          <path d="M8.2 9.6l3 2.4-3 2.4" />
          <path d="M12.8 15h3.4" />
        </g>
      )
    case 'vibe':
      // Stepped bars (a nod to Mistral) over a terminal prompt.
      return (
        <g>
          <g fill={fill}>
            <rect x="3.5" y="3" width="4" height="4" rx="0.8" />
            <rect x="16.5" y="3" width="4" height="4" rx="0.8" />
            <rect x="3.5" y="8.2" width="17" height="4" rx="0.8" />
          </g>
          <path d="M5.5 15.4l2.6 2.1-2.6 2.1" stroke={fill} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10" y="18.6" width="8" height="1.7" rx="0.85" fill={fill} />
        </g>
      )
    case 'gpt':
      // Six interlocking petals.
      return (
        <g fill="none" stroke={fill} strokeWidth="1.6">
          {[0, 60, 120].map((a) => (
            <ellipse key={a} cx="12" cy="12" rx="8.6" ry="3.8" transform={`rotate(${a} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="1.6" fill={fill} stroke="none" />
        </g>
      )
    case 'gemini':
      return <path d="M12 1.8c.5 5.4 4.8 9.7 10.2 10.2-5.4.5-9.7 4.8-10.2 10.2C11.5 16.8 7.2 12.5 1.8 12 7.2 11.5 11.5 7.2 12 1.8z" fill={fill} />
    case 'hermes':
      // A winged sphere.
      return (
        <g fill={fill}>
          <circle cx="12" cy="13" r="3.4" />
          <path d="M8.2 12.2C6 9.4 3.6 8.4 1.6 8.6c1.1 1 1.6 2 1.7 3-.8-.2-1.6-.1-2.3.3 1.6.8 2.7 2 3.2 3.4 1.5-.6 2.9-1.6 4-3.1z" />
          <path d="M15.8 12.2c2.2-2.8 4.6-3.8 6.6-3.6-1.1 1-1.6 2-1.7 3 .8-.2 1.6-.1 2.3.3-1.6.8-2.7 2-3.2 3.4-1.5-.6-2.9-1.6-4-3.1z" />
          <path d="M12 3.4l1.3 2.7h-2.6z" />
        </g>
      )
    case 'deepseek':
      // A breaching tail over a wave.
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 15.5c2 1.6 4 1.6 6 0s4-1.6 6 0 4 1.6 6 0" />
          <path d="M12 12.4c-.4-3.4 1-6.4 4.4-7.8-.3 1.6 0 2.9 1 3.8-2 .2-3.5 1.4-4.2 3.2" />
          <path d="M12 12.4C11 9.6 8.8 8 6.2 8.2c1 1 1.5 2.2 1.4 3.4" />
        </g>
      )
    case 'grok':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="8.4" />
          <path d="M6.4 17.6L17.6 6.4" />
        </g>
      )
    case 'mistral':
      // A pixel staircase.
      return (
        <g fill={fill}>
          {[
            [3, 4], [16, 4], [3, 9], [8.5, 9], [16, 9], [3, 14], [10.6, 14], [16, 14], [3, 19], [16, 19],
          ].map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y - 1} width="5" height="4.2" rx="0.6" />
          ))}
        </g>
      )
    case 'llama':
      return <path d="M5.2 12c0-2.4 1.6-4.2 3.6-4.2 3.6 0 4.8 8.4 8.4 8.4 2 0 3.6-1.8 3.6-4.2S19.2 7.8 17.2 7.8c-3.6 0-4.8 8.4-8.4 8.4-2 0-3.6-1.8-3.6-4.2z" fill="none" stroke={fill} strokeWidth="1.9" />
    case 'qwen':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
          <path d="M13.2 13.6l4.6 4.6" />
          <circle cx="12" cy="12" r="2.6" />
        </g>
      )
    case 'kimi':
      return <path d="M15.6 3.4A8.8 8.8 0 1020.6 15 7 7 0 0115.6 3.4z" fill={fill} />
    case 'glm':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 3.2L21 19.4H3z" />
          <path d="M12 3.2v16.2M7.5 11.3l9 0" />
        </g>
      )
    case 'minimax':
      return <path d="M2.5 12h3l2-6 3.5 12 3-9 2 5h5.5" fill="none" stroke={fill} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    case 'perplexity':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 3v18M3.5 7.5l17 9M20.5 7.5l-17 9" />
        </g>
      )
    case 'phi':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.9" strokeLinecap="round">
          <ellipse cx="12" cy="12" rx="6.6" ry="5" />
          <path d="M12 3v18" />
        </g>
      )
    case 'nemotron':
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M4 18V6l8 12V6M16 6h4v12h-4z" />
        </g>
      )
    case 'auto':
      // The router: a sparkle with three orbiting choices.
      return (
        <g>
          <path d="M12 5.2c.3 3.4 3 6.1 6.4 6.4-3.4.3-6.1 3-6.4 6.4-.3-3.4-3-6.1-6.4-6.4 3.4-.3 6.1-3 6.4-6.4z" fill={fill} />
          <circle cx="4" cy="5" r="1.6" fill={fill} opacity="0.65" />
          <circle cx="20.4" cy="6.4" r="1.2" fill={fill} opacity="0.5" />
          <circle cx="19" cy="20" r="1.5" fill={fill} opacity="0.6" />
        </g>
      )
    default:
      return (
        <g fill="none" stroke={fill} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
          <circle cx="12" cy="12" r="2.2" fill={fill} stroke="none" />
        </g>
      )
  }
}

/** The family mark on a tinted squircle. */
export function AgentMark({ provider, model, size = 28, className, flat }: { provider: string; model?: string | null; size?: number; className?: string; flat?: boolean }) {
  const f = familyOf(provider, model)
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const c1 = familyColor(f, 72)
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(3, Math.round(size * 0.18)),
        background: flat ? 'transparent' : `color-mix(in oklab, ${c1} 18%, var(--color-bg-surface))`,
        boxShadow: flat ? undefined : `inset 0 0 0 1px color-mix(in oklab, ${c1} 30%, transparent)`,
      }}
      role="img"
      aria-label={FAMILY[f].name}
      title={FAMILY[f].name}
    >
      <svg viewBox="0 0 24 24" width={size * (flat ? 0.95 : 0.62)} height={size * (flat ? 0.95 : 0.62)} aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c1} />
          </linearGradient>
        </defs>
        <Glyph f={f} gid={gid} />
      </svg>
    </span>
  )
}

/* ── Live state ───────────────────────────────────────────────────────── */
export type AgentState = 'queued' | 'thinking' | 'reading' | 'writing' | 'editing' | 'running' | 'reviewing' | 'talking' | 'waiting' | 'handoff' | 'done' | 'failed' | 'stopped'

export const STATE_INFO: Record<AgentState, { label: string; color: string }> = {
  queued: { label: 'Getting ready', color: 'var(--color-text-muted)' },
  thinking: { label: 'Thinking', color: 'var(--color-accent-brand)' },
  reading: { label: 'Reading', color: 'oklch(72% 0.12 230)' },
  writing: { label: 'Writing', color: 'var(--color-accent-brand)' },
  editing: { label: 'Editing code', color: 'oklch(72% 0.15 150)' },
  running: { label: 'Running', color: 'oklch(75% 0.14 85)' },
  reviewing: { label: 'Reviewing', color: 'oklch(72% 0.13 300)' },
  talking: { label: 'Talking to the team', color: 'oklch(72% 0.12 200)' },
  waiting: { label: 'Waiting for you', color: 'var(--color-state-warning)' },
  handoff: { label: 'Handing over', color: 'oklch(72% 0.14 330)' },
  done: { label: 'Done', color: 'var(--color-state-success)' },
  failed: { label: 'Stopped with an error', color: 'var(--color-state-error)' },
  stopped: { label: 'Stopped', color: 'var(--color-text-muted)' },
}

const READ_TOOLS = new Set(['read_file', 'list_files', 'search', 'repo_read', 'repo_search', 'drive_read', 'drive_list', 'read_url', 'web_search', 'server_logs', 'read_team_board'])
const EDIT_TOOLS = new Set(['write_file', 'edit_file', 'delete_file'])
const RUN_TOOLS = new Set(['run_command', 'start_server', 'fetch_local', 'stop_server'])

const short = (p: unknown) => {
  const s = String(p ?? '')
  const parts = s.split('/')
  return parts.length > 2 ? `…/${parts.slice(-2).join('/')}` : s
}

/** A plain-language sentence for one tool call. */
export function describeTool(name: string, input: Record<string, unknown> = {}): string {
  switch (name) {
    case 'read_file':
    case 'repo_read':
      return `Reading ${short(input.path)}`
    case 'list_files':
      return input.pattern ? `Looking for ${input.pattern}` : 'Looking around the code'
    case 'search':
    case 'repo_search':
      return `Searching for “${String(input.query ?? '').slice(0, 40)}”`
    case 'write_file':
      return `Writing ${short(input.path)}`
    case 'edit_file':
      return `Editing ${short(input.path)}`
    case 'delete_file':
      return `Deleting ${short(input.path)}`
    case 'view_changes':
      return 'Checking the work so far'
    case 'run_command': {
      const c = String(input.command ?? '')
      if (/\b(test|jest|vitest|pytest|mocha|node --test)\b/.test(c)) return 'Running the tests'
      if (/\b(build|tsc|compile)\b/.test(c)) return 'Building the project'
      if (/\b(lint|eslint|oxlint|ruff|prettier)\b/.test(c)) return 'Running the linter'
      if (/\b(install|npm i|pnpm add|pip install)\b/.test(c)) return 'Installing packages'
      if (/^git\b/.test(c)) return 'Using git'
      return `Running ${c.slice(0, 40)}`
    }
    case 'start_server':
      return 'Starting a dev server'
    case 'fetch_local':
      return 'Trying the app'
    case 'team_note':
      return 'Leaving a note for the team'
    case 'read_team_board':
      return 'Checking what the team is doing'
    case 'delegate':
      return 'Handing out work to the team'
    case 'remember':
      return 'Saving something to memory'
    case 'read_url':
      return `Reading ${String(input.url ?? '').replace(/^https?:\/\//, '').slice(0, 40)}`
    case 'web_search':
      return `Searching the web for “${String(input.query ?? '').slice(0, 40)}”`
    case 'create_document':
      return `Creating ${input.format === 'slides' ? 'slides' : String(input.format ?? 'a document').toUpperCase()}: ${String(input.title ?? '')}`
    case 'drive_list':
    case 'drive_read':
      return 'Looking in Drive'
    case 'plan':
      return 'Planning the steps'
    case 'finish':
      return 'Wrapping up'
    default:
      return name.replace(/_/g, ' ')
  }
}

/** What an agent is doing right now, from its events and the live feed. */
export function agentActivity(a: AgentRow, events: HiveEvent[], live: LiveAgent[], streaming: Record<string, string>, thinking: Record<string, string>): { state: AgentState; line: string } {
  if (a.status === 'queued') return { state: 'queued', line: 'Getting ready…' }
  if (a.status === 'done') return { state: 'done', line: firstLine(a.result) || 'Finished' }
  if (a.status === 'failed') return { state: 'failed', line: firstLine(a.error) || 'Failed' }
  if (a.status === 'stopped' || a.status === 'interrupted') return { state: 'stopped', line: a.status === 'interrupted' ? 'Interrupted by a restart' : 'Stopped' }
  // Running.
  let lastCall: HiveEvent | undefined
  let pendingApproval = false
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    if (e.agent_id !== a.id) continue
    if (e.kind === 'approval_result') break
    if (e.kind === 'approval') {
      pendingApproval = true
      break
    }
    if (e.kind === 'tool_call' && !lastCall) lastCall = e
    if (lastCall) break
  }
  if (pendingApproval) return { state: 'waiting', line: 'Waiting for you to approve a command' }
  if (streaming[a.id]) return { state: 'writing', line: 'Writing…' }
  const doing = live.find((x) => x.id === a.id)?.doing
  if (lastCall) {
    const name = String(lastCall.data.name)
    const input = (lastCall.data.input ?? {}) as Record<string, unknown>
    const resultIn = events.some((e) => e.kind === 'tool_result' && e.agent_id === a.id && e.data.id === lastCall!.data.id)
    const line = doing || describeTool(name, input)
    if (!resultIn) {
      if (EDIT_TOOLS.has(name)) return { state: 'editing', line }
      if (RUN_TOOLS.has(name)) return { state: 'running', line }
      if (name === 'team_note' || name === 'read_team_board') return { state: 'talking', line }
      if (name === 'delegate') return { state: 'handoff', line }
      if (READ_TOOLS.has(name) || name === 'view_changes') return { state: a.role === 'reviewer' ? 'reviewing' : 'reading', line }
    }
  }
  if (thinking[a.id]) return { state: a.role === 'reviewer' ? 'reviewing' : 'thinking', line: a.role === 'reviewer' ? 'Reviewing the changes…' : 'Thinking…' }
  return { state: a.role === 'reviewer' ? 'reviewing' : 'thinking', line: doing || (a.role === 'reviewer' ? 'Reviewing the changes…' : 'Thinking…') }
}

const firstLine = (s: string | null | undefined) =>
  String(s ?? '')
    .replace(/[#*_`>]/g, '')
    .split('\n')
    .map((x) => x.trim())
    .find(Boolean)
    ?.slice(0, 160) ?? ''

/* ── Role ─────────────────────────────────────────────────────────────── */
export function roleOf(a: Pick<AgentRow, 'role' | 'title' | 'routed_kind'>): { label: string; hue: number } {
  const t = String(a.title || '').toLowerCase()
  if (a.role === 'lead') return { label: 'Lead', hue: 285 }
  if (/judge/.test(t)) return { label: 'Judge', hue: 75 }
  if (a.role === 'reviewer' || /review|fact-check/.test(t)) return { label: 'Reviewer', hue: 300 }
  if (/ci fixer|fix/.test(t)) return { label: 'Fixer', hue: 20 }
  if (/test|verify/.test(t)) return { label: 'Tester', hue: 85 }
  if (/plan|investigate|map/.test(t)) return { label: 'Planner', hue: 230 }
  if (/doc|write/.test(t) || a.routed_kind === 'writing') return { label: 'Writer', hue: 200 }
  if (/race|compare|#\d/.test(t)) return { label: 'Contender', hue: 330 }
  if (/escalated/.test(t)) return { label: 'Specialist', hue: 15 }
  if (/resumed/.test(t)) return { label: 'Builder', hue: 155 }
  if (a.role === 'worker') return { label: 'Builder', hue: 155 }
  return { label: 'Builder', hue: 155 }
}

export function RoleTag({ a, className }: { a: Pick<AgentRow, 'role' | 'title' | 'routed_kind'>; className?: string }) {
  const r = roleOf(a)
  return (
    <span className={cn('inline-flex h-[18px] items-center rounded-full px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em]', className)} style={{ color: `oklch(74% 0.12 ${r.hue})`, background: `oklch(70% 0.12 ${r.hue} / 0.13)` }}>
      {r.label}
    </span>
  )
}

/* ── Avatar with an animated state ring ───────────────────────────────── */
export function AgentAvatar({ provider, model, state, size = 44, className }: { provider: string; model?: string | null; state: AgentState; size?: number; className?: string }) {
  const f = familyOf(provider, model)
  const color = STATE_INFO[state].color
  const active = !['done', 'failed', 'stopped', 'queued'].includes(state)
  return (
    <span className={cn('hive-av relative inline-grid shrink-0 place-items-center', `hive-av--${state}`, className)} style={{ width: size + 10, height: size + 10, borderRadius: Math.max(4, Math.round(size * 0.18)) + 5, ['--av' as string]: color, ['--fam' as string]: familyColor(f) }}>
      {/* halo */}
      {active && <span className="hive-av-halo absolute inset-0 rounded-[inherit]" aria-hidden="true" />}
      {/* ring */}
      <span className="hive-av-ring absolute inset-[2px] rounded-[inherit]" aria-hidden="true" />
      <AgentMark provider={provider} model={model} size={size} />
      {/* state ornaments */}
      {state === 'thinking' && (
        <span className="hive-av-orbit absolute inset-0" aria-hidden="true">
          <span className="absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full" style={{ background: color }} />
        </span>
      )}
      {(state === 'reading' || state === 'reviewing') && <span className="hive-av-scan absolute inset-[5px] overflow-hidden rounded-[inherit]" aria-hidden="true" />}
      {(state === 'writing' || state === 'editing') && (
        <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-[3px] rounded-full bg-bg-surface px-1.5 py-1 shadow-sm ring-1 ring-[var(--hive-line)]" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="hive-av-type size-1 rounded-full" style={{ background: color, animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      )}
      {state === 'running' && <span className="hive-av-spin absolute inset-0 rounded-[inherit]" aria-hidden="true" />}
      {state === 'done' && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-state-success text-on-accent-brand ring-2 ring-[var(--color-bg-surface)]">
          <Check className="size-3" strokeWidth={3} />
        </motion.span>
      )}
      {state === 'failed' && (
        <span className="absolute -bottom-0.5 -right-0.5 grid size-[18px] place-items-center rounded-full bg-state-error text-white ring-2 ring-[var(--color-bg-surface)]">
          <X className="size-3" strokeWidth={3} />
        </span>
      )}
      {state === 'waiting' && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-state-warning ring-2 ring-[var(--color-bg-surface)] hive-ping" aria-hidden="true" />}
    </span>
  )
}

/* ── Cost class ───────────────────────────────────────────────────────── */
export const COST_INFO: Record<CostClass, { label: string; short: string; hue: number; chroma: number }> = {
  free: { label: 'Free', short: 'Free', hue: 155, chroma: 0.14 },
  sub: { label: 'Your plan', short: 'Plan', hue: 285, chroma: 0.14 },
  low: { label: 'Low cost', short: '$', hue: 200, chroma: 0.1 },
  mid: { label: 'Mid price', short: '$$', hue: 75, chroma: 0.12 },
  high: { label: 'Premium', short: '$$$', hue: 30, chroma: 0.14 },
}

export function CostBadge({ cost, long, className }: { cost: CostClass; long?: boolean; className?: string }) {
  const c = COST_INFO[cost] ?? COST_INFO.mid
  return (
    <span className={cn('inline-flex h-[18px] items-center rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums', className)} style={{ color: `oklch(72% ${c.chroma} ${c.hue})`, background: `oklch(70% ${c.chroma} ${c.hue} / 0.13)` }} title={c.label}>
      {long ? c.label : c.short}
    </span>
  )
}

/* ── Score bars ───────────────────────────────────────────────────────── */
export function ScoreBar({ value, label, hue = 285, max = 100, suffix }: { value: number; label?: ReactNode; hue?: number; max?: number; suffix?: ReactNode }) {
  const pct = Math.max(0, Math.min(1, value / max))
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-[74px] shrink-0 truncate text-[11px] text-text-muted">{label}</span>}
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-[2px] bg-text-primary/[0.07]">
        <motion.span initial={{ width: 0 }} animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} className="absolute inset-y-0 left-0 rounded-[2px]" style={{ background: `oklch(66% 0.13 ${hue})` }} />
      </span>
      <span className="w-7 shrink-0 text-right text-[11px] tabular-nums text-text-secondary">{suffix ?? Math.round(value)}</span>
    </div>
  )
}

/** A ring gauge, e.g. for intelligence. */
export function ScoreRing({ value, size = 44, hue = 285, label }: { value: number; size?: number; hue?: number; label?: string }) {
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / 100))
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} title={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="color-mix(in oklab, var(--color-text-primary) 9%, transparent)" strokeWidth="3.5" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={`oklch(72% 0.15 ${hue})`} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      <span className="absolute text-[12px] font-semibold tabular-nums">{Math.round(value)}</span>
    </span>
  )
}
