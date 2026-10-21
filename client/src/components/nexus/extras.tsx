import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown, Flag, History, X } from 'lucide-react'
import { Button, Card, CardContent, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { masteredKeys, newlyMastered, routePlan, type InsightSubject } from './insights'
import type { NexusPyqsResponse, WebRoute } from './types'

/*
 * The Nexus's shared extras: the goal path (persisted), the mastery
 * celebration, ⌘K, the phone bottom sheet, the review action and the
 * layout-holding skeleton.
 */

const GOAL_KEY = 'nexus:goal'

/** The chosen goal path, kept on this device. */
export function useGoal(routes: WebRoute[], subjects: InsightSubject[] | null) {
  const [goal, setGoalState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GOAL_KEY)
    } catch {
      return null
    }
  })
  const setGoal = (id: string | null) => {
    setGoalState(id)
    try {
      if (id) localStorage.setItem(GOAL_KEY, id)
      else localStorage.removeItem(GOAL_KEY)
    } catch {
      /* storage blocked: the goal lasts this visit */
    }
  }
  const route = routes.find((r) => r.id === goal) ?? null
  const plan = useMemo(() => (route && subjects ? routePlan(subjects, route.subjects) : null), [route, subjects])
  return { goal: route ? goal : null, route, plan, setGoal }
}

/** A small control to pick (or clear) the goal path. */
export function GoalMenu({ routes, goal, onGoal, className }: { routes: WebRoute[]; goal: string | null; onGoal: (id: string | null) => void; className?: string }) {
  const active = routes.find((r) => r.id === goal)
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant={active ? 'primary' : 'outline'} size="sm" className={cn('nx-press', className)} aria-label={active ? `Goal path: ${active.name}` : 'Choose a goal path'}>
          <Flag className="size-3.5" aria-hidden="true" />
          {active ? active.name : 'Goal path'}
          <ChevronDown className="size-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </MenuTrigger>
      <MenuContent align="end">
        <MenuLabel>Highlight a route</MenuLabel>
        {routes.map((r) => (
          <MenuItem key={r.id} onSelect={() => onGoal(r.id)} icon={<Flag className={cn(r.id === goal ? 'text-warning' : 'opacity-50')} />}>
            <span className="flex min-w-0 flex-col">
              <span className="text-text-primary">{r.name}</span>
              <span className="truncate text-[11px] text-text-muted">{r.description}</span>
            </span>
          </MenuItem>
        ))}
        {active && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => onGoal(null)} icon={<X />}>
              Clear the goal path
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  )
}

/**
 * Mastered since the last visit: a toast for each (a few at most) and the
 * keys for the radial's burst. The set is saved once the state is fresh.
 */
export function useCelebration(subjects: InsightSubject[] | null, fresh: boolean): string[] {
  const toast = useToast()
  const [before] = useState<Set<string> | null>(() => {
    try {
      const raw = localStorage.getItem('nexus:mastered:v1')
      return raw ? new Set(JSON.parse(raw) as string[]) : null
    } catch {
      return null
    }
  })
  const done = useRef(false)
  const keys = useMemo(() => (subjects && fresh ? newlyMastered(before, subjects) : []), [subjects, fresh, before])
  useEffect(() => {
    if (!subjects || !fresh || done.current) return
    done.current = true
    try {
      localStorage.setItem('nexus:mastered:v1', JSON.stringify(masteredKeys(subjects)))
    } catch {
      /* storage blocked: no celebration next time */
    }
    const names = keys.slice(0, 3).map((k) => {
      const [s, id] = [k.split(':')[0], k.split(':').slice(1).join(':')]
      return subjects.find((x) => x.id === s)?.nodes.find((n) => n.id === id)?.n ?? id
    })
    if (names.length) toast.success(keys.length === 1 ? `Mastered: ${names[0]}` : `Mastered ${keys.length} concepts`, keys.length === 1 ? 'Everything it unlocks is open to you.' : names.join(' · '))
  }, [subjects, fresh, keys, toast])
  return keys
}

/** ⌘K / Ctrl+K opens the Nexus palette (before the app's own palette). */
export function usePaletteHotkey(open: () => void) {
  const ref = useRef(open)
  ref.current = open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopPropagation()
        ref.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])
}

/** Is this a phone-width screen (bottom sheets, thumb controls)? */
export function usePhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

/** On phones a bottom sheet with a handle; elsewhere the content as is. */
export function ResponsivePanel({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const phone = usePhone()
  const reduce = useReducedMotion()
  if (!phone) return <>{children}</>
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-bg-app/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} aria-hidden="true" />
          <motion.aside
            role="dialog"
            aria-label={label}
            className="pop-surface fixed inset-x-0 bottom-0 z-[71] max-h-[78vh] overflow-y-auto !rounded-b-none !rounded-t-2xl px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
          >
            <div className="nx-sheet-handle" aria-hidden="true" />
            {children}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/** Start a spaced review of a concept: its PYQs in the practice view. */
export async function startReview(subject: string, id: string, go: (to: string) => void): Promise<boolean> {
  try {
    const r = await api.get<NexusPyqsResponse>(`/api/nexus/pyqs/${subject}/${id}`)
    const ids = r.questions.map((q) => q.id).slice(0, 60)
    if (!ids.length) return false
    go(`/gate/practice?ids=${ids.join(',')}`)
    return true
  } catch {
    return false
  }
}

/** "Continue where you left off". */
export function ContinueChip({ name, subjectName, onClick }: { name: string; subjectName: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="nx-press inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[12.5px] text-text-secondary transition-colors hover:border-primary/60 hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-brand focus-visible:outline-none"
    >
      <History className="size-3.5 shrink-0 text-accent-brand" aria-hidden="true" />
      <span className="shrink-0 text-text-muted">Continue</span>
      <span className="truncate font-medium text-text-primary">{name}</span>
      <span className="hidden shrink-0 text-text-muted sm:inline">· {subjectName}</span>
    </button>
  )
}

/** The radial card's skeleton: the same size, so nothing shifts when it lands. */
export function RadialSkeleton() {
  return (
    <Card className="overflow-hidden p-0" aria-busy="true" aria-label="Loading the Nexus">
      <CardContent className="flex items-center justify-center p-0" style={{ height: 'min(720px, max(440px, calc(100vh - 220px)))' }}>
        <div className="relative aspect-square h-[80%] max-w-[90%]">
          <div className="nx-skel absolute inset-0 rounded-full opacity-40" />
          <div className="absolute inset-[22%] rounded-full bg-bg-surface" />
          <div className="nx-skel absolute inset-[44%] rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

/** The rank card's skeleton (same height as the card). */
export function RankCardSkeleton() {
  return (
    <Card className="mb-4" aria-busy="true">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="nx-skel size-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="nx-skel h-4 w-40 rounded" />
            <div className="nx-skel h-3 w-64 max-w-full rounded" />
          </div>
        </div>
        <div className="nx-skel h-2 w-full rounded-full" />
        <div className="nx-skel h-3 w-56 rounded" />
      </CardContent>
    </Card>
  )
}
