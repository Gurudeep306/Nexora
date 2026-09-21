import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, ChevronLeft, ChevronRight, History, RefreshCw, Search } from 'lucide-react'
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  StatCard,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { PlatformBadge, VerdictBadge } from '@/components/shared/PlatformBadge'
import { cn, formatDate, timeAgo } from '@/lib/utils'
import { SubmissionDetails } from '@/components/submissions/SubmissionDetails'
import { fetchSubmissionHistory, parseSubmittedAt, type SubmissionRow } from '@/components/submissions/fetchHistory'

const PAGE_SIZE = 25

export default function SubmissionsPage() {
  const { data, loading, error, refetch } = useApi(() => fetchSubmissionHistory(), [])
  const [verdict, setVerdict] = useState('all')
  const [language, setLanguage] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(null)

  const rows = useMemo(() => data ?? [], [data])

  const verdictOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.verdict).filter(Boolean))).sort(),
    [rows],
  )
  const languageOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.language).filter((l): l is string => Boolean(l)))).sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (verdict !== 'all' && r.verdict !== verdict) return false
      if (language !== 'all' && r.language !== language) return false
      if (q && !r.title.toLowerCase().includes(q) && !r.problem_id.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, verdict, language, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const acCount = rows.filter((r) => r.verdict === 'AC').length
  const accuracy = rows.length ? Math.round((acCount / rows.length) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Submissions"
        subtitle="Every verdict the judge ever handed you — filter, inspect, and relive the runtime."
        actions={
          <Button variant="outline" size="sm" onClick={refetch} aria-label="Refresh submissions">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Total Runs" value={rows.length} icon={<History />} sub="archived submissions" />
        <StatCard label="Accepted" value={acCount} icon={<History />} accent="success" sub="clean kills" />
        <StatCard label="Accuracy" value={`${accuracy}%`} icon={<History />} accent="cyan" sub="AC / total" />
        <StatCard
          label="Last Verdict"
          value={rows[0]?.verdict ?? '—'}
          icon={<History />}
          accent="warning"
          sub={rows[0] ? timeAgo(parseSubmittedAt(rows[0].submitted_at)) : 'no activity'}
        />
      </div>

      {loading ? (
        <LoadingBlock rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<History />}
          title="No submissions yet"
          description="Once you submit code from the solve IDE, the full verdict history shows up here."
        />
      ) : (
        <>
          {/* filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-40 flex-1 sm:max-w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-faint"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                placeholder="Search problem…"
                aria-label="Search submissions by problem"
                className="pl-9"
              />
            </div>
            <Select
              value={verdict}
              onChange={(e) => {
                setVerdict(e.target.value)
                setPage(0)
              }}
              aria-label="Filter by verdict"
              className="w-auto min-w-36"
            >
              <option value="all">All verdicts</option>
              {verdictOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </Select>
            <Select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value)
                setPage(0)
              }}
              aria-label="Filter by language"
              className="w-auto min-w-36"
            >
              <option value="all">All languages</option>
              {languageOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
            <span className="ml-auto font-mono text-xs text-foreground-faint tabular-nums">
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="card-neon overflow-hidden">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH className="w-8" />
                  <TH>Verdict</TH>
                  <TH>Problem</TH>
                  <TH className="hidden md:table-cell">Platform</TH>
                  <TH className="hidden lg:table-cell">Language</TH>
                  <TH className="text-right">Runtime</TH>
                  <TH className="hidden sm:table-cell text-right">When</TH>
                </TR>
              </THead>
              <TBody>
                {pageRows.map((row: SubmissionRow) => {
                  const open = expanded === row.id
                  return (
                    <Fragment key={row.id}>
                      <TR
                        className={cn('cursor-pointer', open && 'bg-surface-2/80')}
                        onClick={() => setExpanded(open ? null : row.id)}
                        aria-expanded={open}
                      >
                        <TD className="pr-0 text-foreground-faint">
                          <ChevronDown
                            className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
                            aria-hidden="true"
                          />
                          <span className="sr-only">{open ? 'Collapse' : 'Expand'} submission {row.id}</span>
                        </TD>
                        <TD>
                          <VerdictBadge verdict={row.verdict} />
                        </TD>
                        <TD>
                          <span className="block max-w-64 truncate text-sm text-foreground">{row.title}</span>
                          <span className="font-mono text-[10px] text-foreground-faint">#{row.id} · {row.problem_id}</span>
                        </TD>
                        <TD className="hidden md:table-cell">
                          <PlatformBadge platform={row.platform} />
                        </TD>
                        <TD className="hidden font-mono text-xs lg:table-cell">{row.language ?? '—'}</TD>
                        <TD className="text-right font-mono text-xs tabular-nums">{row.exec_time_ms} ms</TD>
                        <TD className="hidden text-right text-xs whitespace-nowrap sm:table-cell">
                          {formatDate(parseSubmittedAt(row.submitted_at))}
                        </TD>
                      </TR>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.tr
                            key="details"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                          >
                            <TD colSpan={7} className="bg-background/60 px-4 py-4">
                              <SubmissionDetails row={row} />
                            </TD>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  )
                })}
                {pageRows.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-sm text-foreground-faint">
                      No submissions match these filters.
                    </TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </div>

          {/* pagination */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="font-mono text-xs text-foreground-faint tabular-nums">
              Page {safePage + 1} / {pageCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="subtle"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </Button>
              <Button
                variant="subtle"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
