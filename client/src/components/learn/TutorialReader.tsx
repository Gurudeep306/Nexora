import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, ExternalLink, ListTodo, Tag } from 'lucide-react'
import { Badge, Button, Card, CardContent, DifficultyBadge, EmptyState, LoadingBlock, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { TutorialContent } from './TutorialContent'
import { categoryLabel, type Tutorial, type TutorialProblem } from './types'
import { cn } from '@/lib/utils'

/** Rich-text styles for server-seeded tutorial HTML (headings, tables, code blocks). */
const CONTENT_CLASSES = cn(
  'text-sm leading-relaxed text-foreground-dim break-words',
  '[&_h2]:font-display [&_h2]:text-lg [&_h2]:tracking-wide [&_h2]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:glow-text',
  '[&_h3]:font-display [&_h3]:text-sm [&_h3]:tracking-wider [&_h3]:text-primary-bright [&_h3]:mt-5 [&_h3]:mb-2',
  '[&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-foreground [&_h4]:mt-4 [&_h4]:mb-1.5',
  '[&_p]:my-2.5',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2.5 [&_ul]:space-y-1 [&_ul]:marker:text-primary-bright',
  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2.5 [&_ol]:space-y-1 [&_ol]:marker:text-primary-bright',
  '[&_strong]:font-semibold [&_strong]:text-foreground',
  '[&_em]:italic',
  '[&_a]:text-cyan [&_a]:underline [&_a]:underline-offset-2 [&_a]:cursor-pointer',
  '[&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-cyan [&_code]:rounded [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5',
  '[&_.tutorial-code]:my-3 [&_.tutorial-code]:rounded-lg [&_.tutorial-code]:border [&_.tutorial-code]:border-border [&_.tutorial-code]:bg-background [&_.tutorial-code]:overflow-hidden',
  '[&_.tutorial-code_pre]:p-4 [&_.tutorial-code_pre]:overflow-x-auto [&_.tutorial-code_pre]:text-xs [&_.tutorial-code_pre]:leading-relaxed',
  '[&_.tutorial-code_pre_code]:bg-transparent [&_.tutorial-code_pre_code]:p-0 [&_.tutorial-code_pre_code]:text-foreground-dim',
  '[&_pre]:my-3 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-background [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_.tutorial-table]:w-full [&_.tutorial-table]:my-3 [&_.tutorial-table]:text-xs [&_.tutorial-table]:border-collapse [&_.tutorial-table]:block [&_.tutorial-table]:overflow-x-auto',
  '[&_table]:w-full [&_table]:my-3 [&_table]:text-xs [&_table]:border-collapse [&_table]:block [&_table]:overflow-x-auto',
  '[&_th]:bg-surface-2 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-semibold [&_th]:tracking-wider [&_th]:uppercase [&_th]:text-primary-bright [&_th]:border [&_th]:border-border',
  '[&_td]:px-2.5 [&_td]:py-1.5 [&_td]:border [&_td]:border-border [&_td]:text-foreground-dim',
  '[&_.tutorial-info-grid]:grid [&_.tutorial-info-grid]:grid-cols-1 [&_.tutorial-info-grid]:gap-3 [&_.tutorial-info-grid]:my-3 md:[&_.tutorial-info-grid]:grid-cols-2',
  '[&_.tutorial-info-card]:rounded-lg [&_.tutorial-info-card]:border [&_.tutorial-info-card]:border-border [&_.tutorial-info-card]:bg-surface-2 [&_.tutorial-info-card]:p-3.5',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:my-3 [&_blockquote]:italic',
)

export function TutorialReader({
  tutorials,
  tutorial,
  onBack,
  onNavigate,
  onCompleted,
}: {
  tutorials: Tutorial[]
  tutorial: Tutorial
  onBack: () => void
  onNavigate: (id: number) => void
  onCompleted: (id: number) => void
}) {
  const toast = useToast()

  const siblings = useMemo(
    () => tutorials.filter((t) => t.category === tutorial.category).sort((a, b) => a.order_index - b.order_index),
    [tutorials, tutorial.category],
  )
  const idx = siblings.findIndex((t) => t.id === tutorial.id)
  const prev = idx > 0 ? siblings[idx - 1] : null
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null

  const keywords = useMemo(() => {
    const list = (() => {
      try {
        const v = JSON.parse(tutorial.code_examples || '[]')
        return Array.isArray(v) ? (v as string[]) : []
      } catch {
        return []
      }
    })()
    return list.filter((k) => typeof k === 'string').slice(0, 16)
  }, [tutorial.code_examples])

  const practice = useApi<TutorialProblem[]>(
    () =>
      api
        .get<{ ok: boolean; problems: TutorialProblem[] }>(`/api/tutorial-problems/${encodeURIComponent(tutorial.topic)}`)
        .then((r) => (r.problems ?? []).slice(0, 8)),
    [tutorial.topic],
  )

  async function markComplete() {
    try {
      await api.post(`/api/tutorials/${tutorial.id}/complete`)
      toast.success('Chapter complete', `“${tutorial.title}” marked as finished.`)
      onCompleted(tutorial.id)
    } catch (err) {
      toast.error('Failed to save progress', (err as Error).message)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to tutorial list">
          <ArrowLeft /> Chapters
        </Button>
        <Badge variant="primary">{categoryLabel(tutorial.category)}</Badge>
        <DifficultyBadge difficulty={tutorial.difficulty} />
        <span className="flex items-center gap-1 text-[11px] text-foreground-faint">
          <Clock className="size-3" /> {tutorial.estimated_time}
        </span>
        <span className="ml-auto text-[11px] text-foreground-faint tabular-nums">
          {idx + 1} / {siblings.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">
        {/* Reader */}
        <Card className="min-w-0">
          <CardContent className="space-y-2">
            <h1 className="font-display text-xl tracking-wide text-foreground glow-text md:text-2xl">{tutorial.title}</h1>
            {tutorial.description && <p className="text-sm text-foreground-dim">{tutorial.description}</p>}
            <hr className="my-4 border-border" />
            <TutorialContent content={tutorial.content} className={CONTENT_CLASSES} />

            {keywords.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-1.5">
                <Tag className="size-3.5 text-foreground-faint" aria-hidden="true" />
                {keywords.map((k) => (
                  <Badge key={k} variant="outline" className="normal-case">{k}</Badge>
                ))}
              </div>
            )}

            {/* Prev / complete / next */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" disabled={!prev} onClick={() => prev && onNavigate(prev.id)}>
                <ArrowLeft /> <span className="hidden max-w-40 truncate sm:inline">{prev?.title ?? 'Prev'}</span><span className="sm:hidden">Prev</span>
              </Button>
              {tutorial.completed ? (
                <Badge variant="success" className="px-3 py-1.5"><CheckCircle2 /> Completed</Badge>
              ) : (
                <Button variant="accent" size="sm" onClick={() => void markComplete()}>
                  <CheckCircle2 /> Mark complete
                </Button>
              )}
              <Button variant="outline" size="sm" disabled={!next} onClick={() => next && onNavigate(next.id)}>
                <span className="hidden max-w-40 truncate sm:inline">{next?.title ?? 'Next'}</span><span className="sm:hidden">Next</span> <ArrowRight />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: practice problems + chapter nav */}
        <div className="min-w-0 space-y-4">
          <Card>
            <CardContent className="space-y-2.5">
              <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                <ListTodo className="size-3.5" /> Practice problems
              </p>
              {practice.loading ? (
                <LoadingBlock rows={3} />
              ) : !practice.data?.length ? (
                <EmptyState title="No linked problems" description="None tagged for this topic yet." className="px-2 py-6" />
              ) : (
                <ul className="space-y-1.5">
                  {practice.data.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/solve/${p.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 transition-colors duration-200 hover:border-primary"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-foreground">{p.title}</p>
                          <p className="text-[10px] text-foreground-faint uppercase">{p.platform}</p>
                        </div>
                        {p.solve_status === 'solved' && <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-label="Solved" />}
                        {p.rating > 0 && (
                          <span className="shrink-0 font-mono text-[11px] text-primary-bright tabular-nums">{p.rating}</span>
                        )}
                        <ExternalLink className="size-3 shrink-0 text-foreground-faint" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">
                {categoryLabel(tutorial.category)} chapters
              </p>
              <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
                {siblings.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onNavigate(s.id)}
                      aria-current={s.id === tutorial.id ? 'true' : undefined}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors duration-200',
                        s.id === tutorial.id
                          ? 'border border-primary/50 bg-primary/10 text-primary-bright'
                          : 'text-foreground-dim hover:bg-surface-2 hover:text-foreground',
                      )}
                    >
                      <span className="w-5 shrink-0 font-mono text-[10px] text-foreground-faint tabular-nums">{s.order_index + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{s.title}</span>
                      {!!s.completed && <CheckCircle2 className="size-3 shrink-0 text-success" aria-label="Completed" />}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
