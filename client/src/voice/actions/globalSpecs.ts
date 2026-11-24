/*
  The site-wide actions, as data: what each is called in speech and how risky
  it is. GlobalActions.tsx attaches what each one does; the test set in
  docs/voice/tests/commands.json is checked against these same phrases
  (tests/voice-actions.test.js).

  Dependency-free and type-strippable.
*/
import type { ActionSpec } from './types'

/** Places people say they want to go, beyond the nav labels ("label|alias|…"). */
export const EXTRA_PLACES: { to: string; label: string }[] = [
  { to: '/gate', label: 'GATE|gate prep|gate section' },
  { to: '/gate/notes', label: 'Notes|gate notes|notes section|नोट्स' },
  { to: '/gate/practice', label: 'Practice|gate practice|practice questions' },
  { to: '/gate/tests', label: 'Tests|mock tests|mock test|test series' },
  { to: '/gate/review', label: 'Review|revision|review queue' },
  { to: '/gate/daily', label: 'Daily question|daily|aaj ka question' },
  { to: '/live', label: 'Live|live rooms|study rooms' },
]

/** Spoken aliases added to the nav labels ("Home" is also "hub", "ghar"…). */
export const PAGE_ALIASES: Record<string, string[]> = {
  '/hub': ['home page', 'hub', 'ghar', 'dashboard'],
  '/problems': ['problem list', 'questions list', 'coding problems'],
  '/learn': ['learning', 'courses', 'lessons'],
  '/theme': ['themes', 'appearance', 'theme'],
  '/submissions': ['my submissions'],
  '/settings': ['setting'],
}

export function placeSpec(places: { to: string; label: string }[]): ActionSpec {
  return {
    id: 'nav.open',
    risk: 'safe',
    args: { page: places.map((p) => [p.to, ...p.label.split('|'), ...(PAGE_ALIASES[p.to] ?? [])].join('|')) },
    say: {
      en: ['open {page}', 'go {page}', 'show {page}', '{page}', '{page} page', 'take me {page}'],
      hi: ['{page} open', '{page} go', '{page} show', '{page} page open'],
    },
  }
}

export const GLOBAL_SPECS: ActionSpec[] = [
  { id: 'nav.back', risk: 'safe', say: { en: ['go back', 'back', 'previous page', 'last page'], hi: ['back go', 'pichla page'] } },
  { id: 'page.scroll.down', risk: 'safe', say: { en: ['scroll down', 'down', 'move down', 'show more', 'next part'], hi: ['neeche scroll', 'thoda neeche'] } },
  { id: 'page.scroll.up', risk: 'safe', say: { en: ['scroll up', 'up', 'move up'], hi: ['upar scroll', 'thoda upar'] } },
  { id: 'page.scroll.top', risk: 'safe', say: { en: ['go to top', 'top', 'scroll to top', 'top of page'], hi: ['sabse upar'] } },
  { id: 'page.scroll.bottom', risk: 'safe', say: { en: ['go to bottom', 'bottom', 'scroll to bottom', 'end of page'], hi: ['sabse neeche'] } },
  { id: 'look.mode.dark', risk: 'reversible', say: { en: ['dark mode', 'switch to dark mode', 'turn on dark mode', 'night mode'], hi: ['dark mode on'] } },
  { id: 'look.mode.light', risk: 'reversible', say: { en: ['light mode', 'switch to light mode', 'turn on light mode', 'day mode'], hi: ['light mode on'] } },
  { id: 'palette.open', risk: 'safe', say: { en: ['search', 'open search', 'command palette', 'find'], hi: ['search open', 'dhundo', 'khojo'] } },
  { id: 'shortcuts.open', risk: 'safe', say: { en: ['keyboard shortcuts', 'show shortcuts', 'shortcuts'], hi: ['shortcuts show'] } },
  { id: 'assistant.open', risk: 'safe', say: { en: ['open assistant', 'ask ai', 'open ai', 'ai assistant', 'ask guru'], hi: ['ai open', 'assistant open'] } },
  { id: 'problem.random', risk: 'safe', say: { en: ['random problem', 'surprise me', 'give me a random problem', 'any problem'], hi: ['koi bhi problem', 'koi random problem'] } },
  { id: 'teacher.studio', risk: 'safe', say: { en: ['teacher studio', 'open teacher studio', 'open the teacher studio', 'teacher settings', 'change my teacher', 'customise my teacher', 'customize my teacher'], hi: ['teacher studio kholo', 'teacher studio open', 'teacher badlo', 'teacher settings kholo'] } },
  { id: 'profile.open', risk: 'safe', say: { en: ['my profile', 'open my profile', 'show my profile'], hi: ['my profile show'] } },
  { id: 'auth.logout', risk: 'irreversible', say: { en: ['log out', 'logout', 'sign out'], hi: ['logout karo'] } },
]
