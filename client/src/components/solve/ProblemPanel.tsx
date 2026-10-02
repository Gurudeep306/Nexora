import { useEffect, useRef, useState } from 'react'
import { Brain, Clock, Cpu, FileDown, GitCommitHorizontal, Lightbulb, Loader2, ScrollText } from 'lucide-react'
import { Badge, DifficultyBadge, LoadingBlock, Tabs } from '@/components/ui'
import { sanitizeHtml } from '@/components/ailab/sanitize'
import { prepareMathHtml, renderMathIn } from '@/lib/math'
import { useStatementMedia } from './StatementMedia'
import { TranslateBar } from './TranslateBar'
import { ThinkingPad } from './ThinkingPad'
import { SolutionTab } from './SolutionTab'
import type { Lang } from '@/learn/engine/types'
import { PlatformBadge, VerdictBadge } from '@/components/shared/PlatformBadge'
import { cn, timeAgo } from '@/lib/utils'
import { parseTags } from '@/components/problems/types'
import type { SolveProblem, StatementResponse, SubmissionRow } from './types'

interface Props {
  problem: SolveProblem | null
  statement: StatementResponse | null
  statementLoading: boolean
  statementError: string | null
  submissions: SubmissionRow[]
  onImportSample: (index: number) => void
  onImportAllSamples: () => void
  importedSampleCount: number
  /** Workshop problems have no decomposition notes or translation */
  custom?: boolean
  /** Nexora Learn problems: the written solution, shown in its own tab. */
  learnSolution?: { slug: string; editorial: string | null; solutions: Partial<Record<Lang, string>> }
}


function SpecSection({ title, html }: { title: string; html: string }) {
  if (!html || !html.trim()) return null
  return (
    <section className="mt-5">
      <h3 className="font-display text-xs tracking-wider text-primary-bright uppercase">{title}</h3>
      <div
        className="statement-html mt-2 text-sm leading-relaxed text-foreground-dim"
        dangerouslySetInnerHTML={{ __html: prepareMathHtml(sanitizeHtml(html)) }}
      />
    </section>
  )
}

export function ProblemPanel({
  problem,
  statement,
  statementLoading,
  statementError,
  submissions,
  onImportSample,
  onImportAllSamples,
  importedSampleCount,
  custom = false,
  learnSolution,
}: Props) {
  const [tab, setTab] = useState('statement')
  const [translated, setTranslated] = useState<{ lang: string; html: string } | null>(null)
  const statementRef = useRef<HTMLDivElement>(null)
  const mediaLightbox = useStatementMedia()

  useEffect(() => {
    renderMathIn(statementRef.current)
  }, [statement, translated, tab])

  if (!problem) return <LoadingBlock rows={6} className="p-4" />

  const tags = parseTags(problem.tags)
  const samples = statement?.samples ?? []

  return (
    <div className="flex h-full min-h-0 flex-col">
      {mediaLightbox}
      <div className="border-b border-border px-4 pt-3 pb-0">
        <h1 className="font-display text-base leading-snug tracking-wide text-foreground md:text-lg">
          {problem.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={problem.platform} />
          {problem.rating > 0 ? (
            <DifficultyBadge rating={problem.rating} />
          ) : (
            <Badge variant="default">unrated</Badge>
          )}
          {problem.rating > 0 && (
            <span className="font-mono text-xs text-foreground-dim tabular-nums">{problem.rating}</span>
          )}
          {problem.solve_status === 'solved' && <VerdictBadge verdict="AC" />}
          {problem.solve_status === 'attempted' && <Badge variant="warning">attempted</Badge>}
          {statement?.timeLimit && (
            <Badge variant="outline">
              <Clock aria-hidden="true" /> {statement.timeLimit}
            </Badge>
          )}
          {statement?.memLimit && (
            <Badge variant="outline">
              <Cpu aria-hidden="true" /> {statement.memLimit}
            </Badge>
          )}
        </div>
        <Tabs
          className="mt-3"
          variant="underline"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'statement', label: 'Statement', icon: <ScrollText className="size-3.5" /> },
            ...(custom ? [] : [{ id: 'thinking', label: 'Thinking', icon: <Brain className="size-3.5" /> }]),
            ...(learnSolution ? [{ id: 'solution', label: 'Solution', icon: <Lightbulb className="size-3.5" /> }] : []),
            {
              id: 'submissions',
              label: 'Submissions',
              icon: <GitCommitHorizontal className="size-3.5" />,
              badge: submissions.length || undefined,
            },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'statement' && (
          <>
            {statementLoading && <LoadingBlock rows={5} />}
            {statementError && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {statementError}
              </p>
            )}
            {statement && !statementLoading && (
              <>
                {!custom && (
                  <TranslateBar
                    html={[statement.statement, statement.inputSpec, statement.outputSpec, statement.note].filter(Boolean).join('')}
                    onResult={(r) => setTranslated(r ? { lang: r.lang, html: sanitizeHtml(r.html) } : null)}
                  />
                )}
                {translated ? (
                  <div
                    ref={statementRef}
                    className="statement-html text-sm leading-relaxed text-foreground-dim [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:w-full"
                    dangerouslySetInnerHTML={{ __html: prepareMathHtml(translated.html) }}
                  />
                ) : (
                  <>
                    <div
                      ref={statementRef}
                      className="statement-html text-sm leading-relaxed text-foreground-dim [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:w-full"
                      dangerouslySetInnerHTML={{ __html: prepareMathHtml(sanitizeHtml(statement.statement)) }}
                    />
                    <SpecSection title="Input" html={statement.inputSpec} />
                    <SpecSection title="Output" html={statement.outputSpec} />
                    <SpecSection title="Note" html={statement.note} />
                  </>
                )}

                {samples.length > 0 && (
                  <section className="mt-6">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-xs tracking-wider text-primary-bright uppercase">
                        Examples
                      </h3>
                      <button
                        onClick={onImportAllSamples}
                        disabled={importedSampleCount >= samples.length}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-1 rounded-md border border-border-glow px-2 py-1 text-[11px] font-semibold text-primary-bright transition-all duration-200 hover:border-primary hover:glow-box disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                      >
                        <FileDown className="size-3" aria-hidden="true" /> Import all as tests
                      </button>
                    </div>
                    <div className="mt-2 space-y-3">
                      {samples.map((s, i) => (
                        <div key={i} className="rounded-lg border border-border bg-surface p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold tracking-wider text-foreground-faint uppercase">
                              Example {i + 1}
                            </p>
                            <button
                              onClick={() => onImportSample(i)}
                              className="cursor-pointer text-[11px] font-semibold text-primary-bright transition-colors hover:text-cyan"
                              aria-label={`Import example ${i + 1} as testcase`}
                            >
                              Import
                            </button>
                          </div>
                          <div className="mt-2 grid gap-2 md:grid-cols-2">
                            <div>
                              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Input</p>
                              <pre className="mt-1 overflow-x-auto rounded-md bg-background p-2 font-mono text-xs text-foreground">
                                {s.input}
                              </pre>
                            </div>
                            <div>
                              <p className="text-[10px] tracking-wider text-foreground-faint uppercase">Output</p>
                              <pre className="mt-1 overflow-x-auto rounded-md bg-background p-2 font-mono text-xs text-foreground">
                                {s.output}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {tags.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <Badge key={t} variant="primary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}

                <p className="mt-5 text-[10px] text-foreground-faint">
                  Statement source: {statement.source}
                  {problem.url && (
                    <>
                      {' · '}
                      <a
                        href={problem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer text-primary-bright underline-offset-2 hover:underline"
                      >
                        view on {problem.platform}
                      </a>
                    </>
                  )}
                </p>
              </>
            )}
          </>
        )}

        {tab === 'thinking' && !custom && <ThinkingPad problemId={problem.id} />}

        {tab === 'solution' && learnSolution && <SolutionTab {...learnSolution} />}

        {tab === 'submissions' && (
          <>
            {submissions.length === 0 ? (
              <p className="py-8 text-center text-xs text-foreground-faint">
                No submissions for this problem yet. Your first SUBMIT lands here.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {submissions.map((s, i) => (
                  <li
                    key={s.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2',
                      i === 0 && 'border-border-glow',
                    )}
                  >
                    <VerdictBadge verdict={s.verdict} className="w-28 justify-center" />
                    <span className="font-mono text-xs text-foreground-dim tabular-nums">
                      {s.exec_time_ms} ms
                    </span>
                    <span className="ml-auto text-[11px] text-foreground-faint">
                      {timeAgo(s.submitted_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {statementLoading && (
        <p className="flex items-center gap-2 border-t border-border px-4 py-2 text-[11px] text-foreground-faint">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Fetching statement…
        </p>
      )}
    </div>
  )
}
