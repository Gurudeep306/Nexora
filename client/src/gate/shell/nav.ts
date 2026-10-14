import { GATE_ROUTES } from '@/gate/api'
import type { IconName } from '@/components/icon/Icon'

export interface GateNavItem {
  id: string
  label: string
  to: string
  icon: IconName
  hint: string
  /** Match nested routes (e.g. /gate/tests/:id). */
  prefix?: boolean
}

export const GATE_NAV: GateNavItem[] = [
  { id: 'home', label: 'Home', to: GATE_ROUTES.home, icon: 'home', hint: 'Your command centre' },
  { id: 'practice', label: 'Practice', to: GATE_ROUTES.practice, icon: 'practice', hint: 'The full PYQ bank' },
  { id: 'review', label: 'Review', to: GATE_ROUTES.review, icon: 'brain', hint: 'Spaced repetition queue' },
  { id: 'daily', label: 'Daily', to: GATE_ROUTES.daily, icon: 'sunrise', hint: "Today's challenge" },
  { id: 'tests', label: 'Tests', to: GATE_ROUTES.tests, icon: 'timer', hint: 'Custom & sectional tests', prefix: true },
  { id: 'cbt', label: 'Mock', to: GATE_ROUTES.cbt, icon: 'monitor', hint: 'Full CBT mock exam', prefix: true },
  { id: 'analytics', label: 'Analytics', to: GATE_ROUTES.analytics, icon: 'chart', hint: 'Deep performance insight' },
  { id: 'syllabus', label: 'Syllabus', to: GATE_ROUTES.syllabus, icon: 'map', hint: 'Topics, mastery & PYQ trends' },
  { id: 'planner', label: 'Planner', to: GATE_ROUTES.planner, icon: 'calendar', hint: 'Week-by-week study plan' },
  { id: 'notebook', label: 'Notebook', to: GATE_ROUTES.notebook, icon: 'book', hint: 'Bookmarks, notes, mistakes' },
  { id: 'leaderboard', label: 'Leaderboard', to: GATE_ROUTES.leaderboard, icon: 'trophy', hint: 'Weekly rankings' },
]

export function activeNavId(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  let best: GateNavItem | undefined
  for (const item of GATE_NAV) {
    const hit = path === item.to || ((item.prefix || item.to !== GATE_ROUTES.home) && path.startsWith(`${item.to}/`))
    if (hit && (!best || item.to.length > best.to.length)) best = item
  }
  return best?.id ?? 'home'
}
