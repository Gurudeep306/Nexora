/*
  The guide (docs/voice/VIRTUAL_TEACHER.md §3, T2): the teacher walks over to
  something on the page, points at it, can press it, tells you what is on
  either side of them, and gives a short tour of the page.

  It finds things by the names people see (findTarget.ts), on any page, with
  no tagging; `data-guide-label` can give a clearer name where one helps.
  It never presses anything that changes or loses something (submit, delete,
  log out…): it points, and the student presses.
*/
import { FEATURE_GROUPS } from '@/pages/explore/features'
import { getVoicePrefs } from '../prefs'
import { speak, speakAndWait } from '../speak'
import { activeCode } from '../code/active'
import { bestTarget, risky, type Candidate, type TargetKind } from './findTarget'
import { getTeacher, setTeacher, teacherPoint } from './store'
import { teacherById } from './teachers'

interface Found extends Candidate {
  el: HTMLElement
}

const SKIP = '.tch, .tch-peek, .vc-pill, .vc-speaking, [aria-hidden="true"], [hidden]'

function kindOf(el: HTMLElement): TargetKind | null {
  const tag = el.tagName
  const role = el.getAttribute('role')
  if (/^H[1-3]$/.test(tag)) return 'heading'
  if (role === 'tab') return 'tab'
  if (tag === 'BUTTON' || role === 'button' || role === 'menuitem' || role === 'switch') return 'button'
  if (tag === 'A' || role === 'link') return 'link'
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || role === 'combobox' || role === 'searchbox') return 'field'
  return null
}

function nameOf(el: HTMLElement): string {
  const own = el.getAttribute('data-guide-label') || el.getAttribute('aria-label')
  if (own) return own
  const by = el.getAttribute('aria-labelledby')
  if (by) {
    const t = by
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim()
    if (t) return t
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const label = el.labels?.[0]?.textContent?.trim()
    if (label) return label
    if ('placeholder' in el && el.placeholder) return el.placeholder
  }
  return (el.innerText || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 80)
}

function shown(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  if (r.width < 4 || r.height < 4) return false
  const cs = getComputedStyle(el)
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05
}

function inView(r: DOMRect): boolean {
  return r.bottom > 56 && r.top < window.innerHeight - 40 && r.right > 0 && r.left < window.innerWidth
}

/** Everything on the page a person could ask about: controls and headings, with their names. */
export function pageTargets(): Found[] {
  const out: Found[] = []
  const els = document.querySelectorAll<HTMLElement>('h1, h2, h3, button, a[href], [role="button"], [role="tab"], [role="link"], [role="menuitem"], [role="switch"], input:not([type="hidden"]), select, textarea, [data-guide-label]')
  for (const el of els) {
    if (el.closest(SKIP) || !shown(el)) continue
    const kind = kindOf(el) ?? 'button'
    const name = nameOf(el)
    if (!name || name.length < 2) continue
    out.push({ el, name, kind, visible: inView(el.getBoundingClientRect()) })
  }
  return out
}

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const lang = () => (getVoicePrefs().lang === 'hi-IN' ? 'hi-IN' : 'en-IN')
const hi = () => lang() === 'hi-IN'
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/** Outline something for a moment (accent outline, no glow). */
function outline(el: HTMLElement, ms = 2600) {
  el.classList.add('tch-target')
  window.setTimeout(() => el.classList.remove('tch-target'), ms)
}

/** Bring it into view, walk under it, point and look at it. Resolves once pointing. */
async function goTo(el: HTMLElement) {
  if (getTeacher().hidden) setTeacher({ hidden: false })
  let r = el.getBoundingClientRect()
  if (!inView(r)) {
    el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' })
    await wait(reduced() ? 50 : 550)
    r = el.getBoundingClientRect()
  }
  outline(el)
  setTeacher({ atX: r.left + r.width / 2 })
  // The glide takes about 1.5 s; pointing starts as the teacher arrives.
  await wait(reduced() ? 80 : 1300)
  const now = el.getBoundingClientRect()
  teacherPoint({ x: now.left + now.width / 2, y: now.top + now.height / 2 })
}

function sayNotFound(target: string) {
  speak(hi() ? `मुझे इस पेज पर "${target}" नहीं दिख रहा।` : `I can't see "${target}" on this page.`, lang())
}

/** "Point at the Run button". */
export async function pointAt(target: string) {
  const t = bestTarget(target, pageTargets())
  if (!t) return sayNotFound(target)
  await goTo(t.el)
  speak(hi() ? `यह रहा: ${t.name}।` : `Here it is: ${t.name}.`, lang())
}

/** "Click Run": point, then press it, unless it changes or loses something. */
export async function clickOn(target: string) {
  const t = bestTarget(target, pageTargets(), true)
  if (!t) return sayNotFound(target)
  await goTo(t.el)
  if (risky(t.name)) {
    speak(hi() ? `यह रहा ${t.name}। यह बटन कुछ बदल देता है, इसलिए इसे आप ख़ुद दबाइए।` : `Here's ${t.name}. This one changes things, so please press it yourself.`, lang())
    return
  }
  // Say it first, then press: whatever the button does next (it may speak too) isn't talked over.
  await speakAndWait(hi() ? `ठीक है, ${t.name} दबा रही हूँ।`.replace('रही', getTeacherVerb()) : `Okay, pressing ${t.name}.`, lang())
  if (!t.el.isConnected) return
  if (t.kind === 'field') t.el.focus()
  else t.el.click()
}

/** "रही" for a woman teacher, "रहा" for a man (Hindi verb forms). */
function getTeacherVerb(): string {
  return teacherById(getVoicePrefs().teacher)?.body === 'M' ? 'रहा' : 'रही'
}

/** "Point at line 12" in the code editor in use. */
export async function pointAtLine(n: number) {
  const code = activeCode()
  const ed = code?.editor()
  const node = ed?.getDomNode()
  if (!ed || !node) {
    speak(hi() ? 'अभी कोई कोड एडिटर खुला नहीं है।' : 'There is no code editor open right now.', lang())
    return
  }
  const lines = ed.getModel()?.getLineCount() ?? 0
  if (n < 1 || n > lines) {
    speak(hi() ? `कोड में ${lines} लाइनें हैं।` : `The code has ${lines} lines.`, lang())
    return
  }
  ed.revealLineInCenter(n)
  ed.setSelection({ startLineNumber: n, startColumn: 1, endLineNumber: n, endColumn: (ed.getModel()?.getLineMaxColumn(n) ?? 1) })
  await wait(120)
  const pos = ed.getScrolledVisiblePosition({ lineNumber: n, column: 1 })
  const box = node.getBoundingClientRect()
  const y = box.top + (pos?.top ?? 0) + (pos?.height ?? 18) / 2
  setTeacher({ atX: Math.min(box.right, box.left + box.width * 0.6) })
  await wait(reduced() ? 80 : 1300)
  teacherPoint({ x: box.left + 60, y })
  const text = ed.getModel()?.getLineContent(n).trim() ?? ''
  speak(hi() ? `लाइन ${n}: ${text || 'खाली लाइन'}` : `Line ${n}: ${text || 'an empty line'}.`, lang())
}

/** "What's on your right?": the nearest few things on that side of the teacher. */
export function describeSide(side: 'left' | 'right', teacherBox: DOMRect | null) {
  const mid = teacherBox ? teacherBox.left + teacherBox.width / 2 : window.innerWidth / 2
  const top = teacherBox ? teacherBox.top : window.innerHeight
  const near = pageTargets()
    .filter((t) => t.visible && t.kind !== 'field')
    .map((t) => ({ t, r: t.el.getBoundingClientRect() }))
    .filter(({ r }) => (side === 'right' ? r.left + r.width / 2 > mid : r.left + r.width / 2 < mid))
    .sort((a, b) => Math.hypot(a.r.left + a.r.width / 2 - mid, a.r.top - top) - Math.hypot(b.r.left + b.r.width / 2 - mid, b.r.top - top))
  const seen = new Set<string>()
  const names: string[] = []
  for (const { t } of near) {
    const n = t.name.slice(0, 40)
    if (seen.has(n.toLowerCase())) continue
    seen.add(n.toLowerCase())
    names.push(n)
    if (names.length === 3) break
  }
  if (!names.length) {
    speak(hi() ? `मेरे ${side === 'right' ? 'दाएं' : 'बाएं'} कुछ ख़ास नहीं है।` : `There's nothing much on my ${side}.`, lang())
    return
  }
  const first = near.find(({ t }) => t.name.slice(0, 40) === names[0])
  if (first) {
    outline(first.t.el)
    teacherPoint({ x: first.r.left + first.r.width / 2, y: first.r.top + first.r.height / 2 })
  }
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} ${hi() ? 'और' : 'and'} ${names.at(-1)}` : names[0]
  speak(hi() ? `मेरे ${side === 'right' ? 'दाएं' : 'बाएं'}: ${list}।` : `On my ${side}: ${list}.`, lang())
}

/** What this page is, from the Explore list (true names and addresses only). */
function pageLine(path: string): string | null {
  let best: { what: string; len: number } | null = null
  for (const g of FEATURE_GROUPS) {
    for (const f of g.items) {
      if (f.action || !f.to || f.to === '/') continue
      const to = f.to.split('?')[0]
      if ((path === to || path.startsWith(`${to}/`)) && (!best || to.length > best.len)) best = { what: `${f.name}: ${f.what}`, len: to.length }
    }
  }
  return best?.what ?? null
}

let touring = 0
/** Stop a tour in progress (any new command, Stop, or leaving the page). */
export function stopTour() {
  touring++
}

/** "Give me a tour": what this page is, then up to four main things on it, pointing at each. */
export async function tour() {
  const my = ++touring
  const all = pageTargets()
  const title = all.find((t) => t.kind === 'heading' && t.el.tagName === 'H1')
  const line = pageLine(window.location.pathname)
  const intro = line ?? (title ? (hi() ? `यह ${title.name} पेज है।` : `This is the ${title.name} page.`) : hi() ? 'चलिए, इस पेज को देखते हैं।' : 'Let me show you around this page.')
  if (title) await goTo(title.el)
  if (my !== touring || !(await speakAndWait(intro, lang()))) return
  const stops: Found[] = []
  const seen = new Set<string>()
  for (const t of all) {
    if (t === title || !t.visible || seen.has(t.name.toLowerCase())) continue
    if (t.kind === 'heading' && t.el.tagName === 'H2') stops.push(t)
    else if ((t.kind === 'button' || t.kind === 'tab') && t.el.closest('main')) stops.push(t)
    seen.add(t.name.toLowerCase())
    if (stops.length === 4) break
  }
  for (const s of stops) {
    if (my !== touring) return
    await goTo(s.el)
    const say = s.kind === 'heading' ? (hi() ? `यहाँ है: ${s.name}।` : `Here is ${s.name}.`) : hi() ? `यह ${s.name} बटन है।` : `This is the ${s.name} button.`
    if (!(await speakAndWait(say, lang()))) return
  }
  if (my === touring) await speakAndWait(hi() ? 'बस इतना ही! कुछ भी पूछिए।' : 'That’s the page! Ask me anything.', lang())
}
