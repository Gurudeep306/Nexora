import { useEffect, useRef, useState } from 'react'
import { TopicChips } from '@/components/topics/TopicChips'
import { Check, Copy, ExternalLink, FileDown, FileText, Languages, Loader2, Plug, Sigma, ImageOff, Play, Footprints } from 'lucide-react'
import { LoadingBlock, Tabs } from '@/components/ui'
import { sanitizeHtml } from '@/lib/sanitize'
import { prepareMathHtml, renderMathIn } from '@/lib/math'
import { useStatementMedia } from './StatementMedia'
import { TranslateBar } from './TranslateBar'
import { ThinkingPad } from './ThinkingPad'
import { SolutionTab } from './SolutionTab'
import type { Lang } from '@/learn/engine/types'
import { VerdictBadge } from '@/components/shared/PlatformBadge'
import { InviteToSolve } from '@/components/social/InviteToSolve'
import { useAuth } from '@/context/AuthContext'
import { sourceLabel } from '@/lib/sources'
import { cn, timeAgo } from '@/lib/utils'
import { parseTags } from '@/components/problems/types'
import type { ProblemAnalysis, SolveProblem, StatementResponse, SubmissionRow } from './types'
import './statement.css'

interface Props {
  problem: SolveProblem | null
  statement: StatementResponse | null
  statementLoading: boolean
  statementError: string | null
  submissions: SubmissionRow[]
  /** Your record on this problem (attempts, first Accepted, best time). */
  analysis?: ProblemAnalysis | null
  onImportSample: (index: number) => void
  onImportAllSamples: () => void
  importedSampleCount: number
  /** Workshop problems have no decomposition notes or translation */
  custom?: boolean
  /** NexoraGuru Learn problems: the written solution, shown in its own tab. */
  learnSolution?: { slug: string; editorial: string | null; solutions: Partial<Record<Lang, string>> }
  /** Put a source's starter code (LeetCode) into the editor. */
  onUseStarter?: (code: string, langSlug: string) => void
  /** The editor's current language, to offer the matching starter code. */
  language?: string
  /** Run the code on example i (acts on the case being read). */
  onRunSample?: (index: number) => void
  /** Open the dry run on example i. */
  onDryRunSample?: (index: number) => void
}

/** Difficulty band of a rating, for the quiet coloured dot. */
function band(rating: number): { label: string; tone: string } {
  if (rating <= 0) return { label: 'Unrated', tone: 'bg-foreground-faint' }
  if (rating < 1200) return { label: 'Easy', tone: 'bg-state-success' }
  if (rating < 1600) return { label: 'Medium', tone: 'bg-state-warning' }
  if (rating < 2000) return { label: 'Hard', tone: 'bg-[oklch(65%_0.17_40)]' }
  return { label: 'Expert', tone: 'bg-state-error' }
}

// The editor's language id → LeetCode's snippet slug.
const SNIPPET_SLUG: Record<string, string[]> = {
  cpp: ['cpp'],
  c: ['c'],
  java: ['java'],
  python: ['python3', 'python'],
  javascript: ['javascript'],
  typescript: ['typescript'],
  csharp: ['csharp'],
  go: ['golang'],
  rust: ['rust'],
  kotlin: ['kotlin'],
  swift: ['swift'],
  ruby: ['ruby'],
  php: ['php'],
  scala: ['scala'],
  dart: ['dart'],
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1200)
        })
      }}
      className="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-foreground-faint transition-colors hover:bg-surface-2 hover:text-foreground"
      aria-label={label}
      title={label}
    >
      {done ? <Check className="size-3.5 text-state-success" /> : <Copy className="size-3.5" />}
    </button>
  )
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex gap-2.5 rounded-lg bg-[color-mix(in_oklab,var(--color-primary)_7%,transparent)] px-3 py-2.5 text-[13px] leading-snug text-foreground-dim [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-primary-bright">
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Your record on one problem: how it went, in plain numbers. */
function ProblemRecord({ a }: { a: ProblemAnalysis }) {
  const solvedLine =
    a.firstAcAt && a.triesToAccept
      ? `Accepted on try ${a.triesToAccept}${a.minutesToAccept !== null ? `, ${spanText(a.minutesToAccept)} after the first try` : ''}.`
      : `Not accepted yet after ${a.attempts} ${a.attempts === 1 ? 'try' : 'tries'}.`
  const cells: [string, string][] = [
    ['Tries', String(a.attempts)],
    ['Accepted', String(a.accepted)],
    ['Languages', String(a.languages)],
    ['Fastest', a.bestMs !== null ? `${a.bestMs} ms` : '—'],
  ]
  return (
    <section aria-label="Your record on this problem" className="mb-3 rounded-lg border border-border px-3 py-2.5">
      <p className="m-0 text-[13px] text-foreground">{solvedLine}</p>
      <dl className="m-0 mt-2 grid grid-cols-4 gap-2">
        {cells.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-foreground-faint">{k}</dt>
            <dd className="m-0 font-mono text-[13px] text-foreground tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function spanText(min: number): string {
  if (min < 1) return 'within a minute'
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `${h} h`
  return `${Math.round(h / 24)} days`
}

export function ProblemPanel({
  problem,
  statement,
  statementLoading,
  statementError,
  submissions,
  analysis,
  onImportSample,
  onImportAllSamples,
  importedSampleCount,
  custom = false,
  learnSolution,
  onUseStarter,
  language,
  onRunSample,
  onDryRunSample,
}: Props) {
  const [tab, setTab] = useState('statement')
  const [translated, setTranslated] = useState<{ lang: string; html: string } | null>(null)
  const [translating, setTranslating] = useState(false)
  const [showTopics, setShowTopics] = useState(false)
  // Every section (statement, input, output, note) lives inside this one root,
  // so formulas render everywhere — not only in the first block.
  const bodyRef = useRef<HTMLDivElement>(null)
  const mediaLightbox = useStatementMedia()
  const { user } = useAuth()

  useEffect(() => {
    renderMathIn(bodyRef.current)
  }, [statement, translated, tab])

  // A statement read out of its PDF keeps the PDF one click away (open at once when it has a picture).
  const [pdfOpen, setPdfOpen] = useState(false)

  if (!problem) return <LoadingBlock rows={6} className="p-4" />

  const tags = parseTags(problem.tags)
  const samples = statement?.samples ?? []
  const extra = statement?.extra ?? {}
  const named: Record<string, string> = { Easy: 'bg-state-success', Medium: 'bg-state-warning', Hard: 'bg-state-error' }
  const b = extra.difficulty && named[extra.difficulty] ? { label: extra.difficulty, tone: named[extra.difficulty] } : band(problem.rating)
  const html = (s: string | undefined) => ({ __html: sanitizeHtml(prepareMathHtml(s ?? '')) })
  const starter = (() => {
    if (!extra.snippets || !language) return null
    for (const slug of SNIPPET_SLUG[language] ?? [language]) if (extra.snippets[slug]) return { slug, code: extra.snippets[slug] }
    return null
  })()
  // Invite friends to solve it (catalog problems; signed in).
  const canInvite = !custom && !!user && problem.platform !== 'learn' && Number(problem.id) > 0
  const sourceName = problem.platform === 'custom' ? 'Workshop' : problem.platform === 'learn' ? 'NexoraGuru Learn' : sourceLabel(problem.platform)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {mediaLightbox}
      <header className="px-5 pt-4">
        <p className="sp-mast flex min-w-0 items-center gap-1.5 text-[12px] text-foreground-faint">
          <span className="truncate">{sourceName}</span>
          {!custom && problem.problem_id && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{problem.problem_id}</span>
            </>
          )}
          {canInvite && (
            <InviteToSolve problemId={Number(problem.id)} title={problem.title} className="ml-auto" />
          )}
          {problem.url && (
            <a href={problem.url} target="_blank" rel="noopener noreferrer" className={cn(!canInvite && 'ml-auto', 'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface-2 hover:text-foreground')} aria-label={`Original, on ${sourceName} (opens in a new tab)`}>
              Original <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          )}
        </p>
        <h1 className="sp-title mt-1.5 text-[20px] leading-tight font-semibold tracking-[-0.01em] text-foreground">{problem.title}</h1>
        {/* Which kind of problem this is (src/topics.js), always shown. */}
        <TopicChips topics={problem.topics} link className="mt-2" />
        <div className="sp-meta mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[12.5px] text-foreground-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', b.tone)} aria-hidden="true" />
            {extra.difficulty || b.label}
            {problem.rating > 0 && <span className="font-mono text-foreground-faint tabular-nums">{problem.rating}</span>}
          </span>
          {statement?.timeLimit && <span className="tabular-nums">{statement.timeLimit}</span>}
          {statement?.memLimit && <span className="tabular-nums">{statement.memLimit}</span>}
          {problem.solve_status === 'solved' && <VerdictBadge verdict="AC" />}
          {problem.solve_status === 'examples' && <span className="text-text-secondary" title="The judge's full tests aren't here, so it counts as solved after a full check">Passed the examples</span>}
          {problem.solve_status === 'attempted' && <span className="text-state-warning">Attempted</span>}
          {tags.length > 0 && (
            <button type="button" onClick={() => setShowTopics((v) => !v)} className="cursor-pointer text-foreground-faint underline-offset-2 hover:text-foreground hover:underline" aria-expanded={showTopics}>
              {showTopics ? 'Hide tags' : `Tags (${tags.length})`}
            </button>
          )}
          {!custom && statement && !statementLoading && (
            <button type="button" onClick={() => setTranslating((v) => !v)} aria-pressed={translating} className={cn('ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface-2 hover:text-foreground', translating && 'text-foreground')}>
              <Languages className="size-3.5" /> Translate
            </button>
          )}
        </div>
        {showTopics && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11.5px] text-foreground-dim">
                {t}
              </span>
            ))}
          </div>
        )}
        <Tabs
          className="mt-3"
          variant="underline"
          active={tab}
          onChange={setTab}
          items={[
            { id: 'statement', label: 'Description' },
            ...(custom ? [] : [{ id: 'thinking', label: 'Notes' }]),
            ...(learnSolution ? [{ id: 'solution', label: 'Solution' }] : []),
            { id: 'submissions', label: 'Submissions', badge: submissions.length || undefined },
          ]}
        />
      </header>

      {/* Focusable so the keyboard can scroll it, whatever the tab holds. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-5 pb-8" tabIndex={0} role="region" aria-label="Problem">
        {tab === 'statement' && (
          <>
            {statementLoading && <LoadingBlock rows={6} />}
            {statementError && (
              <div className="stmt-away">
                <h2 className="stmt-away-title">The statement didn&apos;t load</h2>
                <p className="stmt-away-text">{statementError}</p>
                {problem?.url && (
                  <a href={problem.url} target="_blank" rel="noopener noreferrer" className="stmt-away-btn">
                    Open on {sourceName} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
            {statement?.unavailable && !statementLoading && (
              <div className="stmt-away">
                <span className="stmt-away-icon" aria-hidden="true">
                  <FileText className="size-5" />
                </span>
                <h2 className="stmt-away-title">Read this problem on {sourceName}</h2>
                <p className="stmt-away-text">
                  {sourceName} doesn&apos;t let other sites load its statements, so it opens there in a new tab. You can still write, run and test your solution here — add the examples as tests.
                </p>
                {(statement.url || problem?.url) && (
                  <a href={statement.url || problem?.url} target="_blank" rel="noopener noreferrer" className="stmt-away-btn">
                    Open on {sourceName} <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            )}
            {statement && !statement.unavailable && !statementLoading && (
              <div ref={bodyRef}>
                {translating && !custom && (
                  <div className="mb-5">
                    <TranslateBar
                      html={[statement.statement, statement.inputSpec, statement.outputSpec, statement.note].filter(Boolean).join('')}
                      onResult={(r) => setTranslated(r ? { lang: r.lang, html: r.html } : null)}
                    />
                  </div>
                )}
                {extra.kind === 'function' && (
                  <Notice icon={<Plug />}>
                    <p>
                      This is a function problem: {sourceName} calls your method directly, so it can't be judged on stdin here. Write and test it locally, then submit on {sourceName}.
                    </p>
                    {starter && onUseStarter && (
                      <button type="button" onClick={() => onUseStarter(starter.code, starter.slug)} className="mt-1.5 cursor-pointer font-medium text-primary-bright hover:underline">
                        Insert the starter code
                      </button>
                    )}
                  </Notice>
                )}
                {extra.kind === 'answer' && (
                  <Notice icon={<Sigma />}>The answer is a single value. Compute it with code, then check it on {sourceName}.</Notice>
                )}
                {extra.interactive && (
                  <Notice icon={<Plug />}>Interactive problem: your program talks to a judge that answers queries. Samples show one conversation; submit on {sourceName} to be judged.</Notice>
                )}
                {extra.figures && extra.fromPdf && extra.pdf && (
                  <Notice icon={<ImageOff />}>
                    <p>This problem has a picture. It is in the original PDF under the statement.</p>
                  </Notice>
                )}
                {extra.figures && !(extra.fromPdf && extra.pdf) && (
                  <Notice icon={<ImageOff />}>
                    <p>
                      This problem refers to a picture that isn't in the copy shown here.{' '}
                      {problem?.url ? (
                        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-bright underline underline-offset-2">
                          See it on {sourceName}
                        </a>
                      ) : (
                        <>See it on {sourceName}.</>
                      )}
                    </p>
                  </Notice>
                )}
                {extra.files && (
                  <Notice icon={<FileText />}>
                    Reads <span className="font-mono">{extra.files.input || 'standard input'}</span> and writes <span className="font-mono">{extra.files.output || 'standard output'}</span>.
                  </Notice>
                )}

                {extra.source && (
                  <p className="mb-2 text-[12px] text-text-muted">
                    Statement from the open dataset{' '}
                    <a href={extra.source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-text-secondary">
                      {extra.source.name}
                    </a>{' '}
                    ({extra.source.license}), because {sourceName} doesn't let our server read its page. Judged on the examples and, where the answer is exact, the official tests.
                  </p>
                )}
                <article className="nx-statement">
                  {translated ? (
                    <div dangerouslySetInnerHTML={html(translated.html)} />
                  ) : (
                    <>
                      <div dangerouslySetInnerHTML={html(statement.statement)} />
                      {statement.inputSpec?.trim() && <div dangerouslySetInnerHTML={html(statement.inputSpec)} />}
                      {statement.outputSpec?.trim() && <div dangerouslySetInnerHTML={html(statement.outputSpec)} />}
                    </>
                  )}
                </article>

                {samples.length > 0 && (
                  <section className="mt-7" aria-label="Examples">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="sp-label text-[13.5px] font-semibold text-foreground">Examples</h2>
                      <button
                        type="button"
                        onClick={onImportAllSamples}
                        disabled={importedSampleCount >= samples.length}
                        className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] text-foreground-dim transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <FileDown className="size-3.5" aria-hidden="true" />
                        {importedSampleCount >= samples.length ? 'All in your tests' : 'Add all to tests'}
                      </button>
                    </div>
                    <div className="space-y-5">
                      {samples.map((s, i) => (
                        <div key={i}>
                          <div className="mb-1.5 flex items-center gap-1 text-[12px] text-foreground-faint">
                            <span>Example {i + 1}</span>
                            {/* Act on the case you are reading. */}
                            <span className="ml-auto flex items-center gap-0.5">
                              {onRunSample && (
                                <button type="button" onClick={() => onRunSample(i)} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface-2 hover:text-foreground" aria-label={`Run this: example ${i + 1}`}>
                                  <Play className="size-3" aria-hidden="true" /> Run this
                                </button>
                              )}
                              {onDryRunSample && (
                                <button type="button" onClick={() => onDryRunSample(i)} className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-surface-2 hover:text-foreground" aria-label={`Dry run this: example ${i + 1}`}>
                                  <Footprints className="size-3" aria-hidden="true" /> Dry run this
                                </button>
                              )}
                              <button type="button" onClick={() => onImportSample(i)} className="cursor-pointer rounded-md px-1.5 py-0.5 hover:bg-surface-2 hover:text-foreground" aria-label={`Add to tests: example ${i + 1}`}>
                                Add to tests
                              </button>
                            </span>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {(['input', 'output'] as const).map((k) => (
                              <div key={k} className="sp-sample min-w-0 overflow-hidden rounded-lg bg-[color-mix(in_oklab,var(--color-foreground)_4.5%,transparent)]">
                                <div className="flex items-center justify-between pr-1 pl-3 pt-1.5 text-[11.5px] text-foreground-faint">
                                  <span>{k === 'input' ? 'Input' : 'Output'}</span>
                                  <CopyButton text={s[k] ?? ''} label={`Copy example ${i + 1} ${k}`} />
                                </div>
                                <pre tabIndex={0} className="max-h-72 overflow-auto px-3 pt-0.5 pb-2.5 font-mono text-[12.5px] leading-[1.55] text-foreground">{s[k] || ' '}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {!translated && statement.note?.trim() && (
                  <article className="nx-statement mt-7">
                    <div dangerouslySetInnerHTML={html(statement.note)} />
                  </article>
                )}

                {extra.pdf && extra.fromPdf && !extra.figures && !pdfOpen && (
                  <button type="button" onClick={() => setPdfOpen(true)} className="mt-5 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
                    <FileText className="size-4" /> Show the original PDF
                  </button>
                )}
                {extra.pdf && (!extra.fromPdf || extra.figures || pdfOpen) && (
                  <div className="mt-5">
                    <iframe
                      src={`/api/problem-pdf/${problem.id}`}
                      title={`${problem.title}: statement (PDF)`}
                      className="h-[75vh] min-h-[420px] w-full rounded-[var(--radius-card)] border border-border bg-bg-surface"
                    />
                    <a href={extra.pdf} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary">
                      <FileText className="size-4" /> Open the PDF in a new tab
                    </a>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'thinking' && !custom && <ThinkingPad problemId={problem.id} />}

        {tab === 'solution' && learnSolution && <SolutionTab {...learnSolution} />}

        {tab === 'submissions' &&
          (submissions.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-foreground-faint">No submissions yet. Your first submit lands here.</p>
          ) : (
            <>
              {analysis && <ProblemRecord a={analysis} />}
              <ul className="divide-y divide-border/60">
                {submissions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <VerdictBadge verdict={s.verdict} className="w-28 justify-center" />
                    {s.total ? (
                      <span className="font-mono text-[12px] text-foreground-dim tabular-nums" title="Tests passed">
                        {s.passed}/{s.total}
                      </span>
                    ) : null}
                    <span className="font-mono text-[12px] text-foreground-dim tabular-nums">{s.exec_time_ms} ms</span>
                    {s.language && <span className="text-[12px] text-foreground-faint">{s.language}</span>}
                    <span className="ml-auto text-[12px] text-foreground-faint">{timeAgo(s.submitted_at)}</span>
                  </li>
                ))}
              </ul>
            </>
          ))}
      </div>

      {statementLoading && (
        <p className="flex items-center gap-2 border-t border-border px-5 py-2 text-[12px] text-foreground-faint">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Fetching the statement…
        </p>
      )}
    </div>
  )
}
