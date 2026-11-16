import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import { CheckCircle2, ChevronDown, ListChecks, Network, PanelLeftClose, PanelLeftOpen, PanelRightOpen } from 'lucide-react'
import { ErrorState, LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAgentPageContext } from '@/context/AgentContext'
import { isDone, mark, pageKey, useProgress } from '../progress'
import { LessonBlock, ScrollyFigure } from './Blocks'
import { useReaderPanels } from '@/components/reader/panels'
import { Outline } from '@/components/reader/Outline'
import { EndOfLesson } from '@/components/reader/EndOfLesson'
import { DSA_TOPICS } from '../content/dsa/syllabus'
import type { Block } from '../types'
import { useTopic } from './useTopic'
import { useDomOutline, useScrollSpy } from '@/components/reader/outline'

/**
 * A topic, read page by page: a sidebar of pages (with what you have read),
 * the lesson itself, and previous/next at the bottom. A page counts as read
 * when you reach its end.
 */
export default function TopicPage() {
  const { topic: topicId, page: pageId } = useParams()
  const { entry, topic, error } = useTopic(topicId)
  const { items } = useProgress()
  const end = useRef<HTMLDivElement>(null)
  const article = useRef<HTMLElement>(null)
  // The side panels fold the same way in every reader (components/reader/panels).
  const panels = useReaderPanels()
  const mini = panels.left
  const setMini = (v: boolean) => panels.setPanels({ left: v })
  const [navFor, setNavFor] = useState<string | null>(null)
  const navOpen = navFor != null && navFor === (pageId ?? '')
  const { scrollYProgress } = useScroll()
  const readBar = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })

  const pageIndex = topic ? Math.max(0, topic.pages.findIndex((p) => p.id === pageId)) : 0
  const page = topic?.pages[pageIndex]
  const bank = useMemo(() => new Map((topic?.questions ?? []).map((q) => [q.id, q])), [topic])
  useAgentPageContext(
    topic && page
      ? { learnTopic: `${topic.title} · ${page.title}`, title: page.title }
      : { learnTopic: topicId ?? 'DSA course' },
  )

  // Reaching the end of a page marks it read.
  useEffect(() => {
    const el = end.current
    if (!el || !topic || !page) return
    const key = pageKey(topic.id, page.id)
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !isDone(items[key])) mark(key, 'read')
    })
    io.observe(el)
    return () => io.disconnect()
  }, [topic, page, items])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pageId])

  const chapterNo = Math.max(1, DSA_TOPICS.findIndex((t) => t.id === topicId) + 1)
  const outline = useDomOutline(article, `${topic?.id ?? ''}/${page?.id ?? ''}`)
  const active = useScrollSpy(outline.map((h) => h.id))

  if (!entry) return <Navigate to="/learn" replace />
  if (!entry.load) return <Navigate to="/learn" replace />
  if (error) return <ErrorState message={error} />
  if (!topic || !page) return <LoadingBlock rows={8} />

  const read = topic.pages.filter((p) => isDone(items[pageKey(topic.id, p.id)])).length
  const prev = topic.pages[pageIndex - 1]
  const next = topic.pages[pageIndex + 1]
  const nonCode = topic.questions.filter((q) => q.kind !== 'code').length
  const code = topic.questions.length - nonCode
  const vizCount = page.blocks.filter((b) => b.t === 'viz').length
  const checkCount = page.blocks.reduce((n, b) => n + (b.t === 'check' ? b.ids.length : 0), 0)
  const practiceCount = page.blocks.reduce((n, b) => n + (b.t === 'practice' ? b.ids.length : 0), 0)

  const pct = Math.round((read / topic.pages.length) * 100)

  return (
    <div className={cn('nr-layout', mini && 'is-tree-hidden', panels.right && 'is-toc-hidden')} style={{ ['--nr-top' as string]: '5rem' }}>
      <motion.div className="learn-readbar fixed inset-x-0 top-0 z-[60] h-[3px] origin-left" style={{ scaleX: readBar }} aria-hidden="true" />

      {/* Left: the topic's pages (or, collapsed, a dot per page) */}
      <nav className="nr-tree" aria-label={`Pages in ${topic.title}`}>
        {mini ? (
          <div className="nr-mini">
            <button type="button" className="nr-icon" onClick={() => setMini(false)} aria-label="Show the page list" title="Show pages">
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </button>
            <span className="nr-mini-ch is-here" style={{ ['--p' as string]: `${pct}%` }} title={`${read} of ${topic.pages.length} pages read`}>
              <span>{pageIndex + 1}</span>
            </span>
            <span className="nr-mini-lessons">
              {topic.pages.map((p, i) => (
                <Link
                  key={p.id}
                  to={`/learn/dsa/${topic.id}/${p.id}`}
                  className={cn('nr-mini-dot', i === pageIndex && 'is-current', isDone(items[pageKey(topic.id, p.id)]) && 'is-done')}
                  title={`${i + 1}. ${p.title}`}
                  aria-label={`${i + 1}. ${p.title}`}
                  aria-current={i === pageIndex ? 'page' : undefined}
                />
              ))}
            </span>
            <Link to={`/learn/dsa/${topic.id}/practice`} className="nr-icon" title="Question bank" aria-label="Question bank">
              <ListChecks className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <>
            <div className="nr-tree-head">
              <Link to="/learn/dsa" className="nr-tree-subject">
                {topic.title}
              </Link>
              <button type="button" className="nr-icon" onClick={() => setMini(true)} aria-label="Fold the page list" title="Fold the page list  [">
                <PanelLeftClose className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mb-4">
              <div className="h-1 overflow-hidden rounded-full bg-bg-surface-3">
                <div className="h-full rounded-full bg-accent-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 mb-0 text-[12px] text-text-muted">
                {read} of {topic.pages.length} pages read
              </p>
            </div>
            <ol className="m-0 list-none space-y-0.5 p-0">
              {topic.pages.map((p, i) => {
                const done = isDone(items[pageKey(topic.id, p.id)])
                const on = i === pageIndex
                return (
                  <li key={p.id}>
                    <Link to={`/learn/dsa/${topic.id}/${p.id}`} aria-current={on ? 'page' : undefined} className={cn('notes-tree-link', on && 'is-current')}>
                      {done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-state-success" />
                      ) : (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong text-[9px] font-semibold text-text-muted">{i + 1}</span>
                      )}
                      <span className="min-w-0">{p.title}</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
            <Link to={`/learn/dsa/${topic.id}/practice`} className="notes-tree-link mt-3 border-t border-border pt-3">
              <ListChecks className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">Question bank</span>
              <span className="font-mono text-[11px] text-text-muted">{nonCode + code}</span>
            </Link>
          </>
        )}
      </nav>

      {/* Centre: the page */}
      <div className="nr-main">
        <div className="nr-bar">
          <nav aria-label="Lesson path" className="notes-crumbs">
            <ol>
              <li>
                <Link to="/learn/dsa">DSA course</Link>
              </li>
              <li>
                <span aria-current="page">{topic.title}</span>
              </li>
            </ol>
          </nav>
          <span className="nr-bar-links">
            <Link to="/learn/dsa?view=tree" className="nr-bar-link">
              <Network className="size-3.5" aria-hidden="true" /> Skill tree
            </Link>
            <Link to={`/learn/dsa/${topic.id}/practice`} className="nr-bar-link">
              <ListChecks className="size-3.5" aria-hidden="true" /> Practice
            </Link>
          </span>
        </div>
        {/* Phones: the page list as a disclosure */}
        <details className="notes-tree-mobile" open={navOpen} onToggle={(e) => setNavFor((e.target as HTMLDetailsElement).open ? (pageId ?? '') : null)}>
          <summary>
            <ChevronDown className="size-4" aria-hidden="true" /> Page {pageIndex + 1} of {topic.pages.length}
          </summary>
          <ol className="m-0 list-none space-y-0.5 px-2.5 pb-3">
            {topic.pages.map((p, i) => (
              <li key={p.id}>
                <Link to={`/learn/dsa/${topic.id}/${p.id}`} className={cn('notes-tree-link', i === pageIndex && 'is-current')}>
                  <span className="font-mono text-[11px] text-text-muted">{i + 1}</span> {p.title}
                </Link>
              </li>
            ))}
          </ol>
        </details>

        <motion.article ref={article} data-agent-content key={page.id} initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="min-w-0">
          <header className="nr-head">
            <p className="nr-kicker">
              Chapter {roman(chapterNo)} · {topic.title} · Page {pageIndex + 1} of {topic.pages.length}
            </p>
            <h1 className="nr-title">{page.title}</h1>
            {page.summary && <p className="nr-dek">{page.summary}</p>}
            <div className="nr-meta">
              <span>{page.minutes} min</span>
              {vizCount > 0 && (
                <span>
                  {vizCount} animation{vizCount === 1 ? '' : 's'}
                </span>
              )}
              {checkCount > 0 && (
                <span>
                  {checkCount} question{checkCount === 1 ? '' : 's'}
                </span>
              )}
              {practiceCount > 0 && (
                <span>
                  {practiceCount} coding problem{practiceCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </header>

          <div className="nx-read nx-lesson nr-prose space-y-6">
            {groupFigures(page.blocks).map((g, i) =>
              g.kind === 'scrolly' ? <ScrollyFigure key={i} viz={g.viz} steps={g.steps} /> : <LessonBlock key={i} b={g.b} bank={bank} />,
            )}
          </div>
        </motion.article>

        <div ref={end} className="h-px" />

        <EndOfLesson
          next={
            next
              ? { to: `/learn/dsa/${topic.id}/${next.id}`, title: next.title, onGo: () => mark(pageKey(topic.id, page.id), 'read') }
              : { to: `/learn/dsa/${topic.id}/practice`, title: `Question bank for ${topic.title}`, kicker: 'Finished the chapter' }
          }
          prev={prev ? { to: `/learn/dsa/${topic.id}/${prev.id}`, title: prev.title } : null}
          dots={topic.pages.map((p, k) => ({
            to: `/learn/dsa/${topic.id}/${p.id}`,
            title: p.title,
            done: isDone(items[pageKey(topic.id, p.id)]),
            current: k === pageIndex,
          }))}
          label={`Pages of ${topic.title}`}
        />
      </div>

      {/* Right: on this page */}
      <aside className={cn('nr-toc', panels.right && 'is-folded')} aria-label="On this page">
        {panels.right ? (
          <div className="nr-toc-mini">
            <button type="button" className="nr-icon" onClick={panels.toggleRight} aria-label="Show On this page" title="Show On this page  ]">
              <PanelRightOpen className="size-4" aria-hidden="true" />
            </button>
            <span className="nr-toc-meter" role="img" aria-label={`${read} of ${topic.pages.length} pages read`}>
              <span style={{ transform: `scaleY(${pct / 100})` }} />
            </span>
            <span className="nr-toc-meter-no">{pct}%</span>
          </div>
        ) : (
        <>
        <Outline items={outline} active={active} onFold={panels.toggleRight} />
        <div className="nr-toc-progress">
          <span className="nr-toc-bar" aria-hidden="true">
            <span style={{ transform: `scaleX(${pct / 100})` }} />
          </span>
          <span>
            {read} of {topic.pages.length} pages read
          </span>
        </div>
        <Link to={`/learn/dsa/${topic.id}/practice`} className="nr-toc-link">
          <ListChecks className="size-3.5" aria-hidden="true" /> Question bank ({nonCode + code})
        </Link>
        </>
        )}
      </aside>
    </div>
  )
}

const ROMAN: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
/** 3 → "III": chapter numbers as in a printed book. */
function roman(n: number): string {
  let out = ''
  for (const [v, r] of ROMAN)
    while (n >= v) {
      out += r
      n -= v
    }
  return out || String(n)
}

type Group = { kind: 'block'; b: Block } | { kind: 'scrolly'; viz: Extract<Block, { t: 'viz' }>; steps: Extract<Block, { t: 'steps' }> }
/** A figure followed by its step-by-step walkthrough becomes one scroll-synced passage. */
function groupFigures(blocks: Block[]): Group[] {
  const out: Group[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const n = blocks[i + 1]
    if (b.t === 'viz' && n?.t === 'steps' && n.items.length > 1) {
      out.push({ kind: 'scrolly', viz: b, steps: n })
      i++
    } else out.push({ kind: 'block', b })
  }
  return out
}
