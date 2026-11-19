import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, CircleCheck, GraduationCap, Link2, ListChecks, Lock, MessageSquareText, PenLine, Sparkles } from 'lucide-react'
import { Badge, Button, LoadingBlock, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon/Icon'
import { Markdown } from '@/learn/md'
import { useAgentContext } from '@/context/AgentContext'
import { NotesRoot } from '@/gate/notes/ui'
import { NotesContextProvider, Nodes, type NotesContext } from '@/gate/notes/render/NotesContent'
import { domId } from '@/gate/notes/render/ids'
import { useLesson } from '@/gate/notes/api'
import { flushScroll, progressOf, reportScroll, setCompleted, useNotesProgress } from '@/gate/notes/progress'
import { useNotesPrefs } from '@/gate/notes/prefs'
import type { LessonPayload } from '@/gate/notes/types'
import { ReadAloud } from '@/components/reader/ReadAloud'
import { MasteryRing, CrossChips } from './NodePanel'
import { ExamInsight, Flashcards, MasteryMeter, NodeNotes, TestOut, TimeChip, UnlockPath, type NodeInsight } from './NodeExtras'
import { confidence, fmtMinutes, unlockPath } from './insights'
import { readReviewList, toggleReview, type NodeContentData } from './NodeContent'
import type { CrossLink, NexusNode } from './types'

/*
 * A bloomed lesson: the course node opened in place. The tree folds into a
 * path rail (what it needs above, the node with its sections, what it
 * unlocks below); the lesson itself fills the page — the real GATE notes
 * lesson for subjects that have notes, the course Markdown where it is
 * written, else a "coming soon" lesson built from the node's own data — and
 * its tools (confidence, exam weight, flashcards, notes) sit in a side
 * column. Reading fills the node's ring; finishing masters it and the
 * unlocked nodes light up.
 */

type Stop = { id: string; title: string }

export interface LessonProps {
  subject: string
  subjectName: string
  subjectHref: string
  nodeHref: (id: string) => string
  node: NexusNode
  nodes: NexusNode[]
  zoneName: string
  zoneColor: string
  isDsa: boolean
  /** a GATE subject (its lessons are GATE notes) */
  isGate?: boolean
  insight: NodeInsight | null
  minutes: Record<string, number>
  note: { note: string; bookmarked: boolean } | null
  onNoteSaved: (v: { note: string; bookmarked: boolean }) => void
  nextId: string | null
  onMastered: () => void
  onJump: (l: CrossLink) => void
  hueOf: (subject: string) => string | undefined
  goTo: (id: string) => void
}

/** The rail: prerequisites above, the node and its sections, unlocks below. */
function PathRail({
  p,
  stops,
  activeStop,
  readPct,
  fresh,
}: {
  p: LessonProps
  stops: Stop[]
  activeStop: string | null
  readPct: number
  fresh: Set<string>
}) {
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const prereqs = p.node.requires.map((id) => p.nodes.find((n) => n.id === id)).filter((n): n is NexusNode => !!n)
  const unlocks = p.nodes.filter((n) => n.requires.includes(p.node.id))
  const ring = p.node.completed ? 100 : Math.max(p.node.progress, Math.round(readPct * 0.5))
  const Item = ({ n, dir }: { n: NexusNode; dir: 'up' | 'down' }) => (
    <li>
      <Link
        to={p.nodeHref(n.id)}
        className={cn('group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors hover:bg-text-primary/5', fresh.has(n.id) && 'nx-just-unlocked')}
      >
        <span
          className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', n.completed ? 'border-transparent text-white' : n.unlocked ? '' : 'border-dashed')}
          style={n.completed ? { background: p.zoneColor } : { borderColor: n.unlocked ? p.zoneColor : 'var(--color-border-strong)' }}
          aria-hidden="true"
        >
          {n.completed ? <Check className="size-3" strokeWidth={3.5} /> : !n.unlocked ? <Lock className="size-2.5 text-text-muted" /> : null}
        </span>
        <span className={cn('min-w-0 flex-1 truncate', n.unlocked || n.completed ? 'text-text-primary' : 'text-text-muted')}>{n.name}</span>
        <span className="text-[10px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100">{dir === 'up' ? 'needs' : 'next'}</span>
      </Link>
    </li>
  )
  return (
    <motion.nav
      aria-label="The path through this node"
      className="nx-rail"
      initial={reduce ? false : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <Link to={p.subjectHref} className="mb-4 hidden items-center gap-1.5 text-[12.5px] text-text-secondary hover:text-text-primary lg:inline-flex">
        <ArrowLeft className="size-3.5" aria-hidden="true" /> {p.subjectName} tree
      </Link>
      {/* Phones and tablets: a strip with the node, its progress and the path on demand. */}
      <button type="button" className="nx-rail-strip" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="nx-rail-strip-bar" aria-hidden="true">
          <span style={{ transform: `scaleX(${ring / 100})`, background: p.zoneColor }} />
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-text-primary">
          {p.node.name}
          {activeStop && stops.length ? <span className="font-normal text-text-muted"> · {stops.find((s) => s.id === activeStop)?.title}</span> : null}
        </span>
        <span className="font-mono text-[11px] text-text-muted tabular-nums">{ring}%</span>
        <ChevronDown className={cn('size-4 shrink-0 text-text-muted transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
      <div className={cn('nx-rail-body', open && 'is-open')}>
      {prereqs.length > 0 && (
        <>
          <p className="nx-rail-label">Builds on</p>
          <ul className="mb-1 space-y-0.5">
            {prereqs.map((n) => (
              <Item key={n.id} n={n} dir="up" />
            ))}
          </ul>
        </>
      )}
      {prereqs.length > 0 && <div className="nx-rail-line" aria-hidden="true" />}
      {/* The node, attached to the lesson by a fine connector. */}
      <div className="nx-rail-current">
        <div className="flex items-center gap-3">
          <MasteryRing value={ring} color={p.zoneColor} state={p.node.completed ? 'done' : p.node.unlocked ? 'open' : 'locked'} icon={p.node.icon} />
          <div className="min-w-0">
            <p className="mb-0 text-[10.5px] font-semibold tracking-wider text-text-muted uppercase">{p.zoneName}</p>
            <p className="mb-0 font-display text-[14px] leading-snug font-semibold text-text-primary">{p.node.name}</p>
          </div>
        </div>
        {stops.length > 0 && (
          <ol className="mt-3 mb-0 space-y-0.5 border-l border-border pl-3">
            {stops.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    setOpen(false)
                    document.getElementById(s.id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
                  }}
                  className={cn('-ml-[13px] block border-l-2 py-1 pl-3 text-[12.5px] leading-snug transition-colors', activeStop === s.id ? 'border-current font-semibold text-text-primary' : 'border-transparent text-text-secondary hover:text-text-primary')}
                  style={activeStop === s.id ? { color: p.zoneColor } : undefined}
                >
                  <span className={activeStop === s.id ? 'text-text-primary' : ''}>{s.title}</span>
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
      {unlocks.length > 0 && <div className="nx-rail-line" aria-hidden="true" />}
      {unlocks.length > 0 && (
        <>
          <p className="nx-rail-label">Unlocks</p>
          <ul className="mb-3 space-y-0.5">
            {unlocks.map((n) => (
              <Item key={n.id} n={n} dir="down" />
            ))}
          </ul>
        </>
      )}
      {p.nextId && (
        <Link to={p.nodeHref(p.nextId)} className="block">
          <Button variant="outline" size="sm" className="nx-press w-full justify-between">
            <span className="truncate">Next · {p.nodes.find((n) => n.id === p.nextId)?.name}</span>
            <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
          </Button>
        </Link>
      )}
      <Link to={p.subjectHref} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-text-secondary hover:text-text-primary lg:hidden">
        <ArrowLeft className="size-3.5" aria-hidden="true" /> {p.subjectName} tree
      </Link>
      </div>
    </motion.nav>
  )
}

/** One real GATE notes lesson, embedded (the notes reader's own blocks). */
function NotesLessonEmbed({ subject, lessonId, onStops, onRead, onUnavailable }: { subject: string; lessonId: string; onStops: (s: Stop[]) => void; onRead: (pct: number) => void; onUnavailable: () => void }) {
  const r = useLesson(subject, lessonId)
  const data: LessonPayload | null = r.data && r.data.lesson.id === lessonId ? r.data : null
  const [prefs, setPrefs] = useNotesPrefs()
  const article = useRef<HTMLElement>(null)
  useEffect(() => {
    if (r.error && !data) onUnavailable()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.error, data])
  const ctx = useMemo<NotesContext | null>(() => {
    if (!data) return null
    const concepts: Record<string, string> = {}
    for (const h of data.lesson.outline) concepts[h.id] = h.text
    for (const b of data.lesson.blocks) concepts[b.id] = b.title ? `${b.name}: ${b.title}` : b.name
    return {
      subject: data.subject,
      lessonId: data.lesson.id,
      practice: data.practice,
      viz: data.viz,
      pyqTopics: data.lesson.pyq_topics,
      cleanLines: prefs.cleanLines,
      setCleanLines: (on) => setPrefs({ cleanLines: on }),
      concepts,
    }
  }, [data, prefs.cleanLines, setPrefs])
  useEffect(() => {
    if (!data) return
    onStops(data.lesson.outline.filter((h) => h.level === 2).map((h) => ({ id: domId(h.id), title: h.text })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
  // Reading position: the node's ring fills live, the notes remember it.
  useEffect(() => {
    if (!data) return
    let raf = 0
    const measure = () => {
      raf = 0
      const el = article.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const span = rect.height - window.innerHeight
      const v = span <= 0 ? 100 : Math.max(0, Math.min(100, (-rect.top / span) * 100))
      onRead(v)
      reportScroll(subject, lessonId, v)
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    window.addEventListener('scroll', on, { passive: true })
    measure()
    return () => {
      window.removeEventListener('scroll', on)
      if (raf) cancelAnimationFrame(raf)
      flushScroll(`${subject}/${lessonId}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, subject, lessonId])
  if (!data || !ctx) return r.error ? null : <LoadingBlock rows={10} />
  return (
    <NotesRoot color={data.subject.color}>
      <article ref={article} className="notes-paper nx-lesson-paper" aria-label={data.lesson.title}>
        <div className="notes-prose">
          <div className="flex items-center justify-between gap-2">
            <p className="notes-meta">
              Chapter {data.chapter.n} · {data.chapter.title} · {fmtMinutes(data.lesson.est_minutes || 0)}
            </p>
            <ReadAloud target={article} />
          </div>
          <NotesContextProvider value={ctx}>
            <Nodes nodes={data.lesson.body} />
          </NotesContextProvider>
        </div>
      </article>
    </NotesRoot>
  )
}

/** A hand-written course page (content/courses), sections from its headings. */
function CourseMarkdown({ body, onStops }: { body: string; onStops: (s: Stop[]) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const hs = [...(ref.current?.querySelectorAll('h1, h2, h3') ?? [])] as HTMLElement[]
    hs.forEach((h, i) => {
      if (!h.id) h.id = `c-${i}-${(h.textContent || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`
    })
    onStops(hs.filter((h) => h.tagName !== 'H3').map((h) => ({ id: h.id, title: h.textContent || '' })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body])
  return (
    <div ref={ref} className="nx-read nx-lesson nx-lesson-md">
      <Markdown md={body} />
    </div>
  )
}

export function CourseLesson(p: LessonProps) {
  const location = useLocation()
  const wantsCard = new URLSearchParams(location.search).has('card')
  const toast = useToast()
  const agent = useAgentContext()
  const reduce = useReducedMotion()
  const key = `${p.subject}:${p.node.id}`
  const content = useApi<NodeContentData>(() => api.get<NodeContentData>(`/api/nexus/content/${p.subject}/${p.node.id}`), [p.subject, p.node.id], { cacheKey: `nexus:content:${key}` })
  const course = useApi<{ ok: boolean; body: string | null }>(() => api.get(`/api/courses/${p.subject}/${p.node.id}`), [p.subject, p.node.id], { cacheKey: `nexus:course:${key}` })
  const data = content.data
  const lessons = data?.lessons ?? []
  const [notesGone, setNotesGone] = useState(false)
  const embedNotes = lessons.length > 0 && lessons.some((l) => l.readable) && !notesGone
  const [stops, setStops] = useState<Stop[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [readPct, setReadPct] = useState(0)
  // The quick check opens where it was asked for: the header or the finish line.
  const [testing, setTestingAt] = useState<'head' | 'foot' | null>(null)
  const setTesting = (v: boolean | ((x: boolean) => boolean), at: 'head' | 'foot' = 'head') =>
    setTestingAt((cur) => ((typeof v === 'function' ? v(!!cur) : v) ? at : null))
  const [metaOpen, setMetaOpen] = useState(false)
  const [, bump] = useState(0)
  const marked = readReviewList().has(key)
  const notesProgress = useNotesProgress(lessons[0] ? data?.lessons[0]?.href.split('/')[3] : undefined)
  const lessonDone = lessons.length > 0 && lessons.every((l) => progressOf(notesProgress, l.href.split('/')[3], l.id).completed)
  const pool = p.node.metric?.pyq?.pool ?? 0
  const canTest = !p.isDsa && !p.node.completed && pool >= 3
  const canMarkLearned = !p.isDsa && !p.node.completed && pool < 3 && !embedNotes
  // Newly unlocked after finishing: they glow on the rail.
  const before = useRef(new Set(p.nodes.filter((n) => n.unlocked).map((n) => n.id)))
  const fresh = useMemo(() => new Set(p.nodes.filter((n) => n.unlocked && !before.current.has(n.id)).map((n) => n.id)), [p.nodes])
  useEffect(() => {
    if (!fresh.size) return
    const names = [...fresh].map((id) => p.nodes.find((n) => n.id === id)?.name).filter(Boolean)
    toast.success(`Unlocked: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`, 'The path ahead is open.')
    for (const id of fresh) before.current.add(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh])
  // Keep the rail's section highlight in step with reading.
  useEffect(() => {
    if (!stops.length) return
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    for (const s of stops) {
      const el = document.getElementById(s.id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [stops])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    setStops([])
    setReadPct(0)
    setTestingAt(null)
    setNotesGone(false)
  }, [key])

  const c = confidence(p.node)
  const markLearned = useCallback(async () => {
    try {
      await api.post(`/api/nexus/done/${p.subject}/${p.node.id}`)
      toast.success('Mastered', `${p.node.name} — well done.`)
      p.onMastered()
    } catch {
      toast.error('Could not save that')
    }
  }, [p, toast])
  const explain = () =>
    agent.openAssistant(
      `Explain "${p.node.name}" (${p.subjectName}) to me step by step. It covers: ${(data?.topics ?? []).join('; ')}. My progress is ${p.node.progress}%${p.node.metric?.pyq ? `, ${Math.min(p.node.metric.pyq.correct, p.node.metric.pyq.target)}/${p.node.metric.pyq.target} PYQs right` : ''}. Start with the idea, then a worked example, then the usual exam traps.`,
    )
  const practise = async () => {
    try {
      const r = await api.get<{ questions: { id: string }[] }>(`/api/nexus/pyqs/${p.subject}/${p.node.id}`)
      const ids = r.questions.map((q) => q.id).slice(0, 60)
      if (ids.length) window.location.assign(`/gate/practice?ids=${ids.join(',')}`)
    } catch {
      toast.error('Could not load the questions')
    }
  }

  // A skill with written notes opens them in the full notes reader — the
  // first one not finished yet. ?card=1 (the reader's "Skill" link) shows
  // this card instead: mastery, exam insight, flashcards and the quick check.
  const readable = lessons.filter((l) => l.readable)
  const readFirst = readable.find((l) => !progressOf(notesProgress, l.href.split('/')[3], l.id).completed) ?? readable[0]
  if (readFirst && !notesGone && !wantsCard) return <Navigate to={readFirst.href} replace />

  const meta = (
    <div className="space-y-6">
      <MasteryMeter score={c.score} breakdown={c.breakdown} color={p.zoneColor} />
      <div className="flex flex-wrap gap-1.5">
        {p.insight && <TimeChip minutes={p.insight.min} />}
        <Badge variant="gold">{p.node.xpReward} XP</Badge>
        {p.insight?.hy && <Badge variant="warning">high-yield</Badge>}
        {(data?.optional || p.node.optional) && <Badge variant="default">optional</Badge>}
      </div>
      <ExamInsight subject={p.subject} node={p.node.id} insight={p.insight} color={p.zoneColor} />
      <Flashcards
        cards={
          data?.cards?.length
            ? data.cards
            : data
              ? [{ front: `What does **${p.node.name}** cover?`, back: data.summary }, ...data.topics.map((t) => ({ front: `${t} — say it in a sentence.`, back: `Part of ${p.node.name}: ${data.summary}` }))]
              : []
        }
        canReview={!!p.node.metric?.pyq}
        onAddToReview={async () => {
          try {
            const r = await api.post<{ added: number }>(`/api/nexus/review/${p.subject}/${p.node.id}`)
            toast.success('Added to your Review deck', `${r.added} question${r.added === 1 ? '' : 's'} due today`)
          } catch {
            toast.error('Could not add to the Review deck')
          }
        }}
      />
      <NodeNotes subject={p.subject} node={p.node.id} initial={p.note} onSaved={p.onNoteSaved} />
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            toggleReview(key)
            bump((x) => x + 1)
          }}
          aria-pressed={marked}
        >
          {marked ? 'Marked for review' : 'Mark for review'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(new URL(p.nodeHref(p.node.id), window.location.origin).toString())
              toast.success('Link copied')
            } catch {
              /* blocked */
            }
          }}
        >
          <Link2 className="size-3.5" aria-hidden="true" /> Copy link
        </Button>
      </div>
    </div>
  )

  return (
    <div className="nx-bloom">
      <PathRail p={p} stops={stops} activeStop={active} readPct={embedNotes ? readPct : 0} fresh={fresh} />

      <motion.main
        className="min-w-0"
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 28, delay: 0.05 }}
      >
        {/* The reading progress of this lesson. */}
        {embedNotes && (
          <div className="nx-read-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${readPct / 100})`, background: p.zoneColor }} />
          </div>
        )}
        <header className="nx-lesson-head">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-text-muted uppercase">
            {p.subjectName} · {p.zoneName}
          </p>
          <h1 className="mb-3 font-display text-[30px] leading-tight font-semibold tracking-tight text-text-primary sm:text-[36px]">{p.node.name}</h1>
          <p className="mb-5 max-w-[68ch] text-[16.5px] leading-relaxed text-text-secondary">{data?.summary || p.node.desc}</p>
          <div className="flex flex-wrap gap-2">
            {canTest && (
              <Button variant={testing ? 'primary' : 'outline'} size="sm" className="nx-press" onClick={() => setTesting((v) => !v)}>
                <GraduationCap className="size-3.5" aria-hidden="true" /> Test out
              </Button>
            )}
            {p.node.metric?.pyq && (
              <Button variant="outline" size="sm" className="nx-press" onClick={practise}>
                <PenLine className="size-3.5" aria-hidden="true" /> Practise PYQs
              </Button>
            )}
            <Button variant="ghost" size="sm" className="nx-press" onClick={explain}>
              <MessageSquareText className="size-3.5" aria-hidden="true" /> Explain this
            </Button>
          </div>
          {!p.node.unlocked && (
            <div className="mt-5">
              <UnlockPath
                steps={unlockPath(p.nodes.map((n) => ({ id: n.id, requires: n.requires, completed: n.completed })), p.node.id, p.minutes).steps}
                names={Object.fromEntries(p.nodes.map((n) => [n.id, n.name]))}
                minutes={p.minutes}
                onStart={() => {
                  const first = unlockPath(p.nodes.map((n) => ({ id: n.id, requires: n.requires, completed: n.completed })), p.node.id).steps[0]
                  if (first) p.goTo(first)
                }}
                onPick={p.goTo}
              />
            </div>
          )}
          <AnimatePresence>{testing === 'head' && <div className="mt-5"><TestOut subject={p.subject} node={p.node.id} onClose={() => setTesting(false)} onPassed={p.onMastered} /></div>}</AnimatePresence>
        </header>

        {/* What you'll learn */}
        {data && data.topics.length > 0 && (
          <section className="nx-learn-list" aria-label="What you'll learn">
            <h2 className="mb-3 flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-text-muted uppercase">
              <ListChecks className="size-4" aria-hidden="true" /> What you'll learn
            </h2>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {data.topics.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[14.5px] text-text-primary">
                  <span className="mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full" style={{ background: p.node.completed ? p.zoneColor : 'transparent', border: p.node.completed ? 'none' : `1.5px solid ${p.zoneColor}` }} aria-hidden="true">
                    {p.node.completed && <Check className="size-2.5 text-white" strokeWidth={4} />}
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* The lesson itself */}
        <section aria-label="Lesson" className="mt-8">
          {content.loading && !data ? (
            <LoadingBlock rows={10} />
          ) : embedNotes ? (
            lessons
              .filter((l) => l.readable)
              .map((l) => (
                <NotesLessonEmbed
                  key={l.id}
                  subject={l.href.split('/')[3]}
                  lessonId={l.id}
                  onStops={(s) => setStops((cur) => [...cur.filter((x) => !s.some((y) => y.id === x.id)), ...s])}
                  onRead={setReadPct}
                  onUnavailable={() => setNotesGone(true)}
                />
              ))
          ) : course.data?.body ? (
            <CourseMarkdown body={course.data.body} onStops={setStops} />
          ) : (
            <div className="nx-coming-soon">
              <Sparkles className="size-5" style={{ color: p.zoneColor }} aria-hidden="true" />
              <div className="min-w-0">
                <p className="mb-1 font-display text-[18px] font-semibold text-text-primary">{p.isDsa ? 'Learn it in the DSA course' : p.isGate || lessons.length ? 'Notes coming soon' : 'Course coming soon'}</p>
                <p className="mb-3 max-w-[60ch] text-[14.5px] leading-relaxed text-text-secondary">
                  {p.isDsa
                    ? 'This skill is taught in the DSA lessons and mastered by solving its problems. The checklist above is what it covers.'
                    : p.isGate || lessons.length
                      ? 'The GATE notes lesson for this node is being written. The checklist above is what it covers; practise its PYQs and ask the assistant to walk you through it meanwhile.'
                      : 'This lesson is being written. The checklist above is exactly what it will cover — explore it with the assistant, then mark it learned.'}
                </p>
                {p.isDsa && (
                  <Link to="/learn/dsa" className="mb-3 inline-block">
                    <Button variant="outline" size="sm" className="nx-press">
                      <BookOpen className="size-3.5" aria-hidden="true" /> Open the DSA lessons
                    </Button>
                  </Link>
                )}
                {lessons.length > 0 && (
                  <ul className="mb-0 space-y-1 text-[13.5px] text-text-secondary">
                    {lessons.flatMap((l) => l.sections).slice(0, 12).map((s) => (
                      <li key={s.id} className="flex gap-2">
                        <BookOpen className="mt-0.5 size-3.5 shrink-0 text-text-muted" aria-hidden="true" /> {s.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Finish */}
        <footer className="nx-lesson-foot">
          {p.node.completed ? (
            <p className="mb-0 flex items-center gap-2 text-[15px] font-semibold" style={{ color: p.zoneColor }}>
              <CircleCheck className="size-5" aria-hidden="true" /> Mastered — the path ahead is open.
            </p>
          ) : embedNotes ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={lessonDone ? 'outline' : 'primary'}
                className="nx-press"
                onClick={() => {
                  for (const l of lessons.filter((x) => x.readable)) setCompleted(l.href.split('/')[3], l.id, true)
                  toast.success('Lesson complete', canTest ? 'Now test out to master the node.' : 'Nice work.')
                  if (canTest) setTesting(true, 'foot')
                  window.setTimeout(p.onMastered, 600)
                }}
              >
                <Check className="size-4" aria-hidden="true" /> {lessonDone ? 'Lesson read' : 'I’ve finished this lesson'}
              </Button>
              {canTest && <span className="text-[13px] text-text-secondary">Then pass the quick check to master it.</span>}
            </div>
          ) : canMarkLearned ? (
            <Button variant="primary" className="nx-press" onClick={markLearned}>
              <Check className="size-4" aria-hidden="true" /> I’ve learned this
            </Button>
          ) : canTest ? (
            <Button variant="primary" className="nx-press" onClick={() => setTesting(true, 'foot')}>
              <GraduationCap className="size-4" aria-hidden="true" /> Test out to master it
            </Button>
          ) : null}
          {p.nextId && (
            <Link to={p.nodeHref(p.nextId)} className="ml-auto">
              <Button variant="outline" className="nx-press">
                Next lesson · {p.nodes.find((n) => n.id === p.nextId)?.name} <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </Link>
          )}
        </footer>
        <AnimatePresence>
          {testing === 'foot' && (
            <div className="mt-5 max-w-[78ch]">
              <TestOut subject={p.subject} node={p.node.id} onClose={() => setTesting(false)} onPassed={p.onMastered} />
            </div>
          )}
        </AnimatePresence>

        {/* Prerequisites and unlocks across subjects */}
        {((p.node.crossRequires ?? []).length > 0 || (p.node.crossUnlocks ?? []).length > 0) && (
          <section className="mt-8 space-y-3" aria-label="Across subjects">
            <CrossChips title="Needs from other subjects" links={p.node.crossRequires ?? []} kind="needs" onJump={p.onJump} hueOf={p.hueOf} />
            <CrossChips title="Unlocks in other subjects" links={p.node.crossUnlocks ?? []} kind="unlocks" onJump={p.onJump} hueOf={p.hueOf} />
          </section>
        )}

        {/* The tools, below the lesson where there is no side column. */}
        <section className="nx-meta-inline" aria-label="Tools for this node">
          <button type="button" className="flex w-full cursor-pointer items-center justify-between py-3 text-[12px] font-semibold tracking-[0.14em] text-text-muted uppercase" onClick={() => setMetaOpen((v) => !v)} aria-expanded={metaOpen}>
            Mastery, exam insight, flashcards and notes
            <ChevronDown className={cn('size-4 transition-transform', metaOpen && 'rotate-180')} aria-hidden="true" />
          </button>
          {metaOpen && <div className="pb-4">{meta}</div>}
        </section>
      </motion.main>

      <aside className="nx-meta" aria-label="Tools for this node">
        {meta}
        <Link to={p.subjectHref} className="mt-6 inline-flex items-center gap-1 text-[12px] text-text-secondary hover:text-text-primary">
          <Icon name="map" className="size-3.5" aria-hidden="true" /> Back to the tree
        </Link>
      </aside>
    </div>
  )
}
