import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Clock, Code2, ListChecks, PlayCircle, HelpCircle } from 'lucide-react'
import { ErrorState, LoadingBlock } from '@/components/ui'
import { cn } from '@/lib/utils'
import { isDone, mark, pageKey, useProgress } from '../progress'
import { LessonBlock } from './Blocks'
import { useTopic } from './useTopic'

/**
 * A topic, read page by page: a sidebar of pages (with what you have read),
 * the lesson itself, and previous/next at the bottom. A page counts as read
 * when you reach its end.
 */
export default function TopicPage() {
  const { topic: topicId, page: pageId } = useParams()
  const { entry, topic, error } = useTopic(topicId)
  const { items } = useProgress()
  const navigate = useNavigate()
  const end = useRef<HTMLDivElement>(null)
  const [navFor, setNavFor] = useState<string | null>(null)
  const navOpen = navFor != null && navFor === (pageId ?? '')
  const { scrollYProgress } = useScroll()
  const readBar = useSpring(scrollYProgress, { stiffness: 200, damping: 30 })

  const pageIndex = topic ? Math.max(0, topic.pages.findIndex((p) => p.id === pageId)) : 0
  const page = topic?.pages[pageIndex]
  const bank = useMemo(() => new Map((topic?.questions ?? []).map((q) => [q.id, q])), [topic])

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

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
      <motion.div className="learn-readbar fixed inset-x-0 top-0 z-[60] h-[3px] origin-left" style={{ scaleX: readBar }} aria-hidden="true" />
      {/* sidebar */}
      <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto">
        <Link to="/learn" className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-text-muted !no-underline hover:text-text-primary">
          <ArrowLeft className="size-3.5" /> DSA course
        </Link>
        <div className="card p-4">
          <p className="mb-0 text-[11px] font-bold tracking-[0.12em] text-accent-brand uppercase">Topic</p>
          <h1 className="mb-2 !text-[22px] font-bold text-text-primary">{topic.title}</h1>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface-3">
            <div className="h-full rounded-full bg-accent-brand transition-[width] duration-700" style={{ width: `${(read / topic.pages.length) * 100}%` }} />
          </div>
          <p className="mt-1.5 mb-3 font-mono text-[11px] text-text-muted">
            {read}/{topic.pages.length} pages read
          </p>
          <button
            type="button"
            onClick={() => setNavFor(navOpen ? null : (pageId ?? ''))}
            aria-expanded={navOpen}
            className="mb-2 flex w-full cursor-pointer items-center gap-2 rounded-xl bg-bg-surface-2 px-3 py-2 text-left text-[13px] text-text-primary ring-1 ring-border hover:!scale-100 lg:hidden"
          >
            <span className="font-mono text-[11px] text-accent-brand">{pageIndex + 1}.</span>
            <span className="min-w-0 flex-1 truncate font-medium">{page.title}</span>
            <ChevronDown className={cn('size-4 text-text-muted transition-transform', navOpen && 'rotate-180')} />
          </button>
          <nav className={cn('-mx-2 space-y-0.5', !navOpen && 'hidden lg:block')} aria-label="Pages">
            {topic.pages.map((p, i) => {
              const done = isDone(items[pageKey(topic.id, p.id)])
              const on = i === pageIndex
              return (
                <Link
                  key={p.id}
                  to={`/learn/dsa/${topic.id}/${p.id}`}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] !no-underline transition-colors',
                    on ? 'bg-accent-brand/12 font-semibold text-text-primary' : 'text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary',
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="size-4 shrink-0 text-state-success" />
                  ) : (
                    <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold', on ? 'border-accent-brand text-accent-brand' : 'border-border-strong text-text-muted')}>{i + 1}</span>
                  )}
                  <span className="min-w-0 truncate">{p.title}</span>
                </Link>
              )
            })}
          </nav>
          <Link to={`/learn/dsa/${topic.id}/practice`} className="mt-3 flex items-center gap-2 rounded-xl bg-bg-surface-2 px-3 py-2.5 text-[13px] font-medium text-text-primary !no-underline ring-1 ring-border transition-colors hover:bg-bg-surface-3">
            <ListChecks className="size-4 text-accent-brand" />
            <span className="flex-1">Question bank</span>
            <span className="font-mono text-[11px] text-text-muted">
              {nonCode} + {code}
            </span>
          </Link>
        </div>
      </aside>

      {/* lesson */}
      <motion.article key={page.id} initial={{ y: 8 }} animate={{ y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="mx-auto w-full max-w-[820px] min-w-0">
        <header className="mb-7">
          <p className="mb-2 flex items-center gap-3 text-[12px] text-text-muted">
            <span className="inline-flex items-center gap-1.5 font-semibold tracking-[0.1em] text-accent-brand uppercase">
              <BookOpen className="size-3.5" /> Page {pageIndex + 1} of {topic.pages.length}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {page.minutes} min
            </span>
          </p>
          <h2 className="mb-2 !text-[30px] leading-tight font-bold tracking-tight text-text-primary sm:!text-[36px]">{page.title}</h2>
          <p className="mb-0 text-[16px] leading-relaxed text-text-secondary">{page.summary}</p>
          {(vizCount > 0 || checkCount > 0 || practiceCount > 0) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {vizCount > 0 && (
                <span className="learn-pill">
                  <PlayCircle className="size-3.5" /> {vizCount} animation{vizCount === 1 ? '' : 's'}
                </span>
              )}
              {checkCount > 0 && (
                <span className="learn-pill">
                  <HelpCircle className="size-3.5" /> {checkCount} question{checkCount === 1 ? '' : 's'}
                </span>
              )}
              {practiceCount > 0 && (
                <span className="learn-pill">
                  <Code2 className="size-3.5" /> {practiceCount} coding problem{practiceCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </header>

        <div className="space-y-6">
          {page.blocks.map((b, i) => (
            <LessonBlock key={i} b={b} bank={bank} />
          ))}
        </div>

        <div ref={end} className="h-px" />

        <nav className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2" aria-label="Page navigation">
          {prev ? (
            <Link to={`/learn/dsa/${topic.id}/${prev.id}`} className="card-interactive card group block p-4 !no-underline">
              <span className="flex items-center gap-1.5 text-[11.5px] text-text-muted">
                <ArrowLeft className="size-3.5" /> Previous
              </span>
              <span className="mt-1 block text-[15px] font-semibold text-text-primary">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <button
              type="button"
              onClick={() => {
                mark(pageKey(topic.id, page.id), 'read')
                navigate(`/learn/dsa/${topic.id}/${next.id}`)
              }}
              className="card-interactive card group block cursor-pointer p-4 text-right hover:!scale-100"
            >
              <span className="flex items-center justify-end gap-1.5 text-[11.5px] text-text-muted">
                Next <ArrowRight className="size-3.5" />
              </span>
              <span className="mt-1 block text-[15px] font-semibold text-text-primary">{next.title}</span>
            </button>
          ) : (
            <Link to={`/learn/dsa/${topic.id}/practice`} className="card-interactive card group block p-4 text-right !no-underline">
              <span className="flex items-center justify-end gap-1.5 text-[11.5px] text-text-muted">
                Finish <ArrowRight className="size-3.5" />
              </span>
              <span className="mt-1 block text-[15px] font-semibold text-text-primary">Question bank for {topic.title}</span>
            </Link>
          )}
        </nav>
      </motion.article>
    </div>
  )
}
