import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen, CheckCircle2, GraduationCap } from 'lucide-react'
import { Badge, Button, Card, CardContent, EmptyState, ErrorState, LoadingBlock, Progress, Select, StatCard } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { TutorialReader } from './TutorialReader'
import { CATEGORY_GROUPS, categoryLabel, type Tutorial, type TutorialStats } from './types'
import { cn } from '@/lib/utils'

export function TutorialsPanel() {
  const [category, setCategory] = useState('cp')
  const [openId, setOpenId] = useState<number | null>(null)

  const tutorials = useApi<Tutorial[]>(
    () => api.get<{ ok: boolean; tutorials: Tutorial[] }>('/api/tutorials').then((r) => r.tutorials ?? []),
    [],
  )
  const stats = useApi<TutorialStats>(() => api.get<TutorialStats>('/api/tutorial-stats'), [])

  const byCategory = useMemo(() => {
    const m = new Map<string, Tutorial[]>()
    for (const t of tutorials.data ?? []) {
      const list = m.get(t.category)
      if (list) list.push(t)
      else m.set(t.category, [t])
    }
    for (const list of m.values()) list.sort((a, b) => a.order_index - b.order_index)
    return m
  }, [tutorials.data])

  const current = byCategory.get(category) ?? []
  const openTutorial = openId != null ? (tutorials.data?.find((t) => t.id === openId) ?? null) : null
  const knownCategories = useMemo(() => new Set(CATEGORY_GROUPS.flatMap((g) => g.categories.map((c) => c.id))), [])
  const extraCategories = useMemo(
    () => [...byCategory.keys()].filter((c) => !knownCategories.has(c)).sort(),
    [byCategory, knownCategories],
  )

  const markCompleted = (id: number) => {
    tutorials.setData((prev) => prev?.map((t) => (t.id === id ? { ...t, completed: 1 as const } : t)) ?? null)
    stats.refetch()
  }

  if (openTutorial) {
    return (
      <TutorialReader
        tutorials={tutorials.data ?? []}
        tutorial={openTutorial}
        onBack={() => setOpenId(null)}
        onNavigate={(id) => setOpenId(id)}
        onCompleted={markCompleted}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<GraduationCap />} label="Chapters" value={stats.data?.total ?? '—'} accent="primary" />
        <StatCard icon={<CheckCircle2 />} label="Completed" value={stats.data?.completed ?? '—'} accent="success" />
        <Card className="p-4">
          <p className="text-[11px] font-semibold tracking-wider text-foreground-faint uppercase">Track progress</p>
          <p className="mt-1 font-display text-2xl text-cyan tabular-nums">
            {stats.data && stats.data.total > 0 ? Math.round((stats.data.completed / stats.data.total) * 100) : 0}%
          </p>
          <Progress value={stats.data?.completed ?? 0} max={Math.max(stats.data?.total ?? 0, 1)} className="mt-2" barClassName="from-cyan to-primary-bright" />
        </Card>
      </div>

      {tutorials.loading ? (
        <LoadingBlock rows={6} />
      ) : tutorials.error ? (
        <ErrorState message={tutorials.error} onRetry={tutorials.refetch} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          {/* Category rail (desktop) / select (mobile) */}
          <div className="space-y-3">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Tutorial category"
              className="lg:hidden"
            >
              {CATEGORY_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.categories.filter((c) => byCategory.has(c.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
              {extraCategories.length > 0 && (
                <optgroup label="More">
                  {extraCategories.map((c) => (
                    <option key={c} value={c}>{categoryLabel(c)}</option>
                  ))}
                </optgroup>
              )}
            </Select>
            <nav aria-label="Tutorial categories" className="hidden space-y-4 lg:block">
              {CATEGORY_GROUPS.map((g) => {
                const cats = g.categories.filter((c) => byCategory.has(c.id))
                if (!cats.length) return null
                return (
                  <div key={g.group}>
                    <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">{g.group}</p>
                    <ul className="space-y-0.5">
                      {cats.map((c) => {
                        const list = byCategory.get(c.id)!
                        const done = list.filter((t) => t.completed).length
                        return (
                          <li key={c.id}>
                            <button
                              onClick={() => setCategory(c.id)}
                              aria-current={category === c.id ? 'true' : undefined}
                              className={cn(
                                'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors duration-200',
                                category === c.id
                                  ? 'border border-primary/50 bg-primary/10 text-primary-bright'
                                  : 'border border-transparent text-foreground-dim hover:bg-surface-2 hover:text-foreground',
                              )}
                            >
                              <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                              <span className="min-w-0 flex-1 truncate">{c.label}</span>
                              <span className="shrink-0 font-mono text-[10px] text-foreground-faint tabular-nums">
                                {done}/{list.length}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
              {extraCategories.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">More</p>
                  <ul className="space-y-0.5">
                    {extraCategories.map((c) => (
                      <li key={c}>
                        <button
                          onClick={() => setCategory(c)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors duration-200',
                            category === c
                              ? 'border border-primary/50 bg-primary/10 text-primary-bright'
                              : 'border border-transparent text-foreground-dim hover:bg-surface-2 hover:text-foreground',
                          )}
                        >
                          <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{categoryLabel(c)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </nav>
          </div>

          {/* Chapter list */}
          <div>
            {current.length === 0 ? (
              <EmptyState icon={<BookOpen />} title="No chapters here yet" description="Pick another category from the rail." />
            ) : (
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {current.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.035 }}
                  >
                    <Card
                      interactive
                      className="h-full"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open chapter ${t.title}`}
                      onClick={() => setOpenId(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setOpenId(t.id)
                        }
                      }}
                    >
                      <CardContent className="flex h-full flex-col gap-2 p-4">
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-lg border font-display text-xs tabular-nums',
                              t.completed
                                ? 'border-success/40 bg-success/10 text-success'
                                : 'border-border bg-surface-2 text-primary-bright',
                            )}
                          >
                            {t.completed ? <CheckCircle2 className="size-4" aria-label="Completed" /> : t.order_index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-display text-[13px] tracking-wide text-foreground">{t.title}</h3>
                            {t.description && (
                              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground-dim">{t.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-1.5">
                          <Badge variant={t.difficulty?.toLowerCase() === 'advanced' ? 'accent' : t.difficulty?.toLowerCase() === 'intermediate' ? 'warning' : 'cyan'}>
                            {t.difficulty}
                          </Badge>
                          <Badge variant="default">{t.estimated_time}</Badge>
                          {t.completed ? (
                            <Badge variant="success" className="ml-auto">Done</Badge>
                          ) : (
                            <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-[11px]" tabIndex={-1} aria-hidden="true">
                              Read →
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
