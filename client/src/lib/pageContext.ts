/* What the floating assistant knows about the current page: its kind (mirrors
 * pageKind() in src/ai/prompts.js — the server decides for itself), a short
 * label for the context pill, and quick-action chips that fit the page. */
import type { AgentPage } from './agent'

export type PageKind =
  | 'solve'
  | 'problems'
  | 'learn'
  | 'system-design'
  | 'gate'
  | 'gate-exam'
  | 'nexus'
  | 'analytics'
  | 'profile'
  | 'contests'
  | 'social'
  | 'settings'
  | 'hub'
  | 'general'

export function pageKind(path: string): PageKind {
  if (/^\/solve\//.test(path)) return 'solve'
  if (/^\/problems(\/|$)/.test(path)) return 'problems'
  if (/^\/learn\/system-design\//.test(path)) return 'system-design'
  if (/^\/learn(\/|$)/.test(path)) return 'learn'
  if (/^\/gate\/cbt\/[^/]+/.test(path)) return 'gate-exam'
  if (/^\/gate(\/|$)/.test(path)) return 'gate'
  if (/^\/nexus(\/|$)/.test(path)) return 'nexus'
  if (/^\/(analytics|achievements|submissions)(\/|$)/.test(path)) return 'analytics'
  if (/^\/profile(\/|$)/.test(path)) return 'profile'
  if (/^\/contests(\/|$)/.test(path)) return 'contests'
  if (/^\/social(\/|$)/.test(path)) return 'social'
  if (/^\/settings(\/|$)/.test(path)) return 'settings'
  if (/^\/(hub|workshop|bookmarks)(\/|$)/.test(path)) return 'hub'
  return 'general'
}

const SECTION_NAMES: Record<string, string> = {
  hub: 'Hub',
  workshop: 'Workshop',
  bookmarks: 'Bookmarks',
  analytics: 'Analytics',
  achievements: 'Achievements',
  submissions: 'Submissions',
  profile: 'Profile',
  contests: 'Contests',
  social: 'Social',
  settings: 'Settings',
  nexus: 'Nexus',
  problems: 'Problems',
  learn: 'Learn',
  gate: 'GATE',
}

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

export interface PageSummary {
  kind: PageKind
  /** e.g. "Two Sum", "Learn · Linked Lists", "GATE · mock exam" */
  label: string
  examActive: boolean
  gateAnswered: boolean
  hasGateQuestion: boolean
}

/** Light, render-friendly summary of a page context (no code or page text). */
export function summarizePage(path: string, ctx: Partial<AgentPage> | null): PageSummary {
  const c = ctx ?? {}
  const routeKind = pageKind(path)
  const examActive = c.examActive === true || (routeKind === 'gate-exam' && c.examReview !== true)
  // A mock paper opened from /gate/cbt behaves like /gate/cbt/<paper>.
  const kind: PageKind = routeKind === 'gate' && (examActive || c.examReview) ? 'gate-exam' : routeKind
  const seg = path.split('/')[1] ?? ''
  const section = SECTION_NAMES[seg] ?? (seg ? titleCase(seg) : 'NexoraGuru')
  let label: string
  if (c.label) label = c.label
  else if (kind === 'solve') label = c.title || 'Problem'
  else if (kind === 'learn') label = c.learnTopic ? `Learn · ${c.learnTopic}` : 'Learn'
  else if (kind === 'system-design') label = `System design · ${c.title || titleCase(path.split('/')[3] ?? '')}`
  else if (kind === 'gate-exam') label = examActive ? 'GATE mock · exam in progress' : 'GATE mock · review'
  else if (kind === 'gate') label = c.gateQuestionId ? `GATE · ${c.title || c.gateQuestionId}` : c.title || 'GATE practice'
  else label = c.title ? `${section} · ${c.title}` : section
  return { kind, label: label.slice(0, 80), examActive, gateAnswered: c.gateAnswered === true, hasGateQuestion: !!c.gateQuestionId }
}

/** Quick actions that fit the page. Each chip is sent as a message. */
export function chipsFor(s: PageSummary): string[] {
  switch (s.kind) {
    case 'solve':
      return ['Explain this problem', 'Give me a hint', 'Why is my code failing?', 'Analyze complexity']
    case 'learn':
      return ['Explain this topic simply', 'Quiz me on this', 'Give an example']
    case 'system-design':
      return ['Explain this chapter simply', 'Quiz me like an interviewer', 'What are the trade-offs here?']
    case 'gate-exam':
      return s.examActive
        ? ['Explain a concept (no answers)', 'How should I pace this paper?', 'How does the virtual calculator work?']
        : ['Explain my mistakes', 'Which topics should I revise?', 'Make me a 7-day plan']
    case 'gate':
      if (s.hasGateQuestion && !s.gateAnswered) return ['Give me a hint for this question', 'Explain the concept behind it', 'Related concepts']
      if (s.hasGateQuestion) return ['Explain this question', 'Why is this the answer?', 'Related concepts']
      return ['Which GATE subjects am I weakest in?', 'Find PYQs on paging', 'Plan my GATE revision']
    case 'problems':
      return ['Recommend a problem for me', 'Find me an easy DP problem', 'What do these filters mean?']
    case 'nexus':
      return ['What should I learn next?', 'Explain this zone', 'Which problems train this skill?']
    case 'analytics':
    case 'profile':
      return ['How am I doing this week?', 'What are my weak topics?', 'Plan my next week']
    case 'contests':
      return ['How should I prepare for a contest?', 'Review my last contest', 'Recommend a virtual contest']
    case 'social':
      return ['How do rooms and friends work?', 'What should I practise next?']
    case 'settings':
      return ['What do these settings do?', 'How do I change my editor theme?']
    default:
      return ['What should I practise next?', 'How am I doing this week?', 'Find me an easy DP problem']
  }
}

const SCRAPE_SKIP = 'script,style,noscript,svg,canvas,.katex-mathml,textarea,input,select,[aria-hidden="true"],.monaco-editor,[data-agent-ignore]'

/**
 * Readable text of the main content area (headings + paragraphs), for pages
 * that don't describe themselves in detail. Capped; the server caps again.
 */
export function scrapeVisibleText(max = 6000): string {
  if (typeof document === 'undefined') return ''
  const main = document.getElementById('main-content')
  if (!main) return ''
  // Prefer the page's main reading area (a lesson, an article) over sidebars.
  const focus =
    main.querySelector<HTMLElement>('[data-agent-content]') ??
    [...main.querySelectorAll<HTMLElement>('article')].sort((a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0))[0] ??
    main
  const clone = focus.cloneNode(true) as HTMLElement
  clone.querySelectorAll(SCRAPE_SKIP).forEach((el) => el.remove())
  // innerText needs layout; textContent with light normalisation is good enough.
  clone.querySelectorAll('h1,h2,h3,h4,p,li,pre,tr,div,section,article,header,a,button').forEach((el) => el.append('\n'))
  const text = (clone.textContent ?? '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text.slice(0, max)
}
