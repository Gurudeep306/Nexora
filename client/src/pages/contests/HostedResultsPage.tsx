import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import { BackButton, Button, EmptyState, ErrorState, LoadingBlock, SearchInput, Select, Tabs } from '@/components/ui'
import { api } from '@/lib/api'
import { CODING, KIND_LABEL, PHASE_LABEL, TYPE_LABEL, minutes, timingLine, type Analysis, type Kind, type QType, marksOf } from '@/components/contests/hosted/api'
import { useLoaded } from '@/components/contests/hosted/useLoaded'
import '@/components/contests/hosted/hosted.css'

/*
  The host's results (GET /api/hosted/:id/analysis): the marks list, each
  question (who tried it, who got it right, the options people picked, and
  how well it separates the top quarter from the bottom quarter), each
  person's answers, and answers over time. Everything exports to CSV.
*/

const TABS = [
  { id: 'marks', label: 'Marks list' },
  { id: 'questions', label: 'By question' },
  { id: 'people', label: 'By student' },
  { id: 'time', label: 'Over time' },
] as const
type TabId = (typeof TABS)[number]['id']

type Person = {
  username: string
  name: string
  window: { from: number | null; to: number | null; state: string }
  items: {
    idx: number
    kind: Kind
    title: string
    type: QType | null
    maxMarks: number
    response?: unknown
    attempted?: boolean
    correct?: boolean
    marks?: number
    timeMs?: number
    runs?: { verdict: string; passed: number; total: number; language: string | null; at: number }[]
    result?: { solved: boolean; tries: number; wrong: number; minutes: number | null }
  }[]
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default function HostedResultsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'marks') as TabId
  const setTab = (t: string) => setParams((p) => (p.set('tab', t), p), { replace: true })
  const { data, error, reload } = useLoaded(() => api.get<Analysis>(`/api/hosted/${id}/analysis`), [id])

  if (error && !data) return <ErrorState message={error} onRetry={() => void reload()} />
  if (!data) return <LoadingBlock rows={8} className="py-8" />
  const c = data.contest

  return (
    <div className="hc">
      <BackButton />
      <header className="hc-head">
        <div className="min-w-0">
          <p className="ed-label">Marks & analysis</p>
          <h1 className="ed-title">{c.title}</h1>
          <p className="hc-meta">
            <span className="hc-chip" data-tone={c.phase === 'live' ? 'live' : undefined}>
              {PHASE_LABEL[c.phase]}
            </span>
            <span>{timingLine(c)}</span>
            <span>
              {data.rows.length} {data.rows.length === 1 ? 'person' : 'people'} · {marksOf(data.totalMarks)}
            </span>
          </p>
        </div>
        <div className="hc-actions">
          <Button variant="outline" size="sm" onClick={() => void reload()}>
            <RefreshCw /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/contests/c/${c.code}`)}>
            Contest page
          </Button>
          <a className="inline-flex h-8 items-center gap-1.5 rounded-[var(--kit-btn-radius,8px)] bg-accent-brand px-3 text-sm font-medium text-on-accent-brand hover:bg-accent-brand-hover [&_svg]:size-3.5" href={`/api/hosted/${c.id}/export.csv`} download>
            <Download aria-hidden="true" /> Export CSV
          </a>
        </div>
      </header>

      <Tabs items={TABS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} className="mb-5" />

      {data.rows.length === 0 ? (
        <EmptyState icon="trophy" title="No one has taken part yet" description="Share the link from the builder. Results fill in as people answer." />
      ) : tab === 'marks' ? (
        <MarksTab data={data} openPerson={(u) => setParams((p) => (p.set('tab', 'people'), p.set('who', u), p), { replace: true })} />
      ) : tab === 'questions' ? (
        <QuestionsTab data={data} />
      ) : tab === 'people' ? (
        <PeopleTab data={data} who={params.get('who') || data.rows[0].username} setWho={(u) => setParams((p) => (p.set('who', u), p), { replace: true })} />
      ) : (
        <TimeTab data={data} />
      )}
    </div>
  )
}

/* ── marks list ── */

function MarksTab({ data, openPerson }: { data: Analysis; openPerson: (u: string) => void }) {
  const [q, setQ] = useState('')
  const rows = data.rows.filter((r) => !q.trim() || `${r.username} ${r.name}`.toLowerCase().includes(q.trim().toLowerCase()))
  const coding = data.items.some((i) => CODING.has(i.kind))
  const marks = data.rows.map((r) => r.marks).sort((a, b) => a - b)
  const mean = marks.reduce((a, b) => a + b, 0) / marks.length
  const median = marks.length % 2 ? marks[(marks.length - 1) / 2] : (marks[marks.length / 2 - 1] + marks[marks.length / 2]) / 2
  return (
    <section aria-label="Marks list">
      <dl className="mb-4 flex flex-wrap gap-x-8 gap-y-2">
        {(
          [
            ['Highest', marks[marks.length - 1]],
            ['Average', Math.round(mean * 100) / 100],
            ['Median', Math.round(median * 100) / 100],
            ['Lowest', marks[0]],
          ] as const
        ).map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{k}</dt>
            <dd className="m-0 font-mono text-lg font-semibold text-text-primary">
              {v} <span className="text-[12.5px] font-normal text-text-secondary">/ {data.totalMarks}</span>
            </dd>
          </div>
        ))}
      </dl>
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder="Find a student" aria-label="Find a student" containerClassName="mb-3 w-full sm:w-72" />
      <div className="hc-table-wrap" tabIndex={0} role="region" aria-label="Marks of every student">
        <table className="hc-table">
          <thead>
            <tr>
              <th className="num">Rank</th>
              <th>Student</th>
              <th className="num">Marks</th>
              {data.items.map((it, i) => (
                <th key={it.idx} className="num" title={it.title}>
                  Q{i + 1}
                </th>
              ))}
              <th className="num">Right</th>
              <th className="num">Wrong</th>
              <th className="num">Blank</th>
              {coding && <th className="num">Penalty</th>}
              <th className="num">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.username}>
                <td className="num">{r.rank}</td>
                <td>
                  <button type="button" className="text-left hover:underline" onClick={() => openPerson(r.username)}>
                    {r.name || r.username}
                    {r.name && <span className="ml-1.5 text-[12px] text-text-secondary">@{r.username}</span>}
                  </button>
                </td>
                <td className="num font-semibold">{r.marks}</td>
                {data.items.map((it) => {
                  const cell = r.cells.find((x) => x.idx === it.idx)
                  const ok = CODING.has(it.kind) ? cell?.solved : cell?.correct
                  const tried = CODING.has(it.kind) ? (cell?.tries ?? 0) > 0 : cell?.attempted
                  return (
                    <td key={it.idx} className={`num ${ok ? 'hc-cell-ok' : tried ? 'hc-cell-bad' : 'hc-cell-none'}`}>
                      {tried ? cell?.marks : '–'}
                    </td>
                  )
                })}
                <td className="num">{r.correct + r.solved}</td>
                <td className="num">{r.wrong}</td>
                <td className="num">{r.skipped}</td>
                {coding && <td className="num">{r.penalty} min</td>}
                <td className="num">{r.state === 'running' ? 'Still in' : r.state === 'not_started' || r.state === 'missed' ? '—' : minutes(r.timeUsedMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hc-note mt-2">Green is right, red is wrong (with any marks lost), a dash is not tried. Click a name for that student's answers.</p>
    </section>
  )
}

/* ── by question ── */

function separation(d: number | null): string {
  if (d == null) return 'Needs 4 or more people'
  if (d < 0) return 'The weaker students did better: check the answer key'
  if (d < 0.1) return 'Hardly separates strong from weak'
  if (d < 0.3) return 'Separates somewhat'
  return 'Separates strong from weak well'
}

function QuestionsTab({ data }: { data: Analysis }) {
  return (
    <section aria-label="Each question">
      <ol className="hc-list">
        {data.perItem.map((p, i) => {
          const it = data.items.find((x) => x.idx === p.idx)!
          const coding = CODING.has(p.kind)
          const answer = Array.isArray(it.answer) ? it.answer : typeof it.answer === 'string' ? [it.answer] : []
          const picks = Object.entries(p.picks).sort((a, b) => b[1] - a[1])
          return (
            <li key={p.idx} className="hc-item" style={{ alignItems: 'start' }}>
              <span className="hc-num" aria-hidden="true">
                {i + 1}
              </span>
              <div className="min-w-0">
                <span className="hc-title">{it.title}</span>
                <span className="hc-sub">
                  <span>{coding ? 'Coding' : KIND_LABEL[p.kind]}</span>
                  {it.type && <span>{TYPE_LABEL[it.type]}</span>}
                  <span>{marksOf(p.marks)}</span>
                  {it.source && <span>{it.source}</span>}
                </span>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-4">
                  <div>
                    <dt className="text-text-secondary">{coding ? 'Solved' : 'Right'}</dt>
                    <dd className="m-0 flex items-center gap-2 font-semibold text-text-primary">
                      {p.right} of {p.people} ({pct(p.right, p.people)}%)
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Tried</dt>
                    <dd className="m-0 font-semibold text-text-primary">{p.tried}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">Average marks</dt>
                    <dd className="m-0 font-semibold text-text-primary">{p.averageMarks}</dd>
                  </div>
                  <div>
                    <dt className="text-text-secondary">{coding ? 'Average time to solve' : 'Average time on it'}</dt>
                    <dd className="m-0 font-semibold text-text-primary">{minutes(p.averageTimeMs)}</dd>
                  </div>
                </dl>
                <div className="mt-2 flex items-center gap-2">
                  <span className="hc-bar" aria-hidden="true">
                    <span style={{ width: `${pct(p.right, p.people)}%` }} />
                  </span>
                  <span className="hc-note">{separation(p.discrimination)}</span>
                </div>
                {picks.length > 0 && (
                  <p className="hc-note mt-2">
                    Answers given:{' '}
                    {picks.map(([k, n], j) => (
                      <span key={k}>
                        {j > 0 && ', '}
                        <strong className={answer.includes(k) ? 'text-state-success' : undefined}>{k}</strong> × {n}
                      </span>
                    ))}
                    {answer.length > 0 && ' (the right answer is in green)'}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/* ── by student ── */

function PeopleTab({ data, who, setWho }: { data: Analysis; who: string; setWho: (u: string) => void }) {
  const loaded = useLoaded(() => api.get<Person>(`/api/hosted/${data.contest.id}/analysis/${encodeURIComponent(who)}`), [data.contest.id, who])
  const person = loaded.data?.username === who ? loaded.data : null
  const error = loaded.error
  const row = data.rows.find((r) => r.username === who)
  const show = (v: unknown) => (v == null || v === '' || (Array.isArray(v) && !v.length) ? 'No answer' : Array.isArray(v) ? v.join(', ') : String(v))
  return (
    <section aria-label="One student">
      <div className="mb-4 max-w-sm">
        <Select value={who} onValueChange={setWho} aria-label="Student">
          {data.rows.map((r) => (
            <option key={r.username} value={r.username}>
              {r.rank}. {r.name || r.username} · {marksOf(r.marks)}
            </option>
          ))}
        </Select>
      </div>
      {row && (
        <p className="hc-meta mb-3">
          <span>Rank {row.rank}</span>
          <span>
            {row.marks} of {marksOf(data.totalMarks)}
          </span>
          <span>Time used {minutes(row.timeUsedMs)}</span>
          {row.startedAt && <span>Started {new Date(row.startedAt).toLocaleTimeString()}</span>}
        </p>
      )}
      {error ? (
        <p className="hc-note text-state-error">{error}</p>
      ) : !person ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="hc-table-wrap" tabIndex={0} role="region" aria-label={`Answers of ${person.name || person.username}`}>
          <table className="hc-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Answer</th>
                <th>Result</th>
                <th className="num">Marks</th>
                <th className="num">Time</th>
              </tr>
            </thead>
            <tbody>
              {person.items.map((it, i) => (
                <tr key={it.idx}>
                  <td className="max-w-[18rem] overflow-hidden text-ellipsis" title={it.title}>
                    Q{i + 1}. {it.title}
                  </td>
                  {CODING.has(it.kind) ? (
                    <>
                      <td>
                        {it.runs?.length ? `${it.runs.length} run${it.runs.length === 1 ? '' : 's'}, last ${it.runs[it.runs.length - 1].verdict} (${it.runs[it.runs.length - 1].passed}/${it.runs[it.runs.length - 1].total})` : 'No runs'}
                      </td>
                      <td className={it.result?.solved ? 'hc-cell-ok' : it.runs?.length ? 'hc-cell-bad' : 'hc-cell-none'}>
                        {it.result?.solved ? `Solved at ${it.result.minutes} min, ${it.result.wrong} wrong before` : it.runs?.length ? 'Not solved' : '–'}
                      </td>
                      <td className="num">{it.result?.solved ? it.maxMarks : 0}</td>
                      <td className="num">{it.result?.minutes != null ? `${it.result.minutes} min` : '—'}</td>
                    </>
                  ) : (
                    <>
                      <td>{show(it.response)}</td>
                      <td className={!it.attempted ? 'hc-cell-none' : it.correct ? 'hc-cell-ok' : 'hc-cell-bad'}>{!it.attempted ? 'Blank' : it.correct ? 'Right' : 'Wrong'}</td>
                      <td className="num">{it.marks ?? 0}</td>
                      <td className="num">{minutes(it.timeMs)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/* ── over time ── */

function TimeTab({ data }: { data: Analysis }) {
  const bins = data.overTime.bins
  const top = Math.max(1, ...bins.map((b) => b.right + b.wrong))
  const fmt = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const finish = useMemo(() => [...data.finishTimesMs].sort((a, b) => a - b), [data.finishTimesMs])
  const total = bins.reduce((a, b) => a + b.right + b.wrong, 0)
  return (
    <section aria-label="Over time" className="grid gap-6">
      <div className="hc-box">
        <h2>Answers and runs during the contest</h2>
        <p className="hc-note">
          Each bar is {minutes(data.overTime.binMs)}. Coding runs count when they were judged; GATE-style answers when the paper was handed in. {total} in all.
        </p>
        {total === 0 ? (
          <p className="hc-note mt-3">Nothing yet.</p>
        ) : (
          <>
            <div className="hc-chart mt-3" role="img" aria-label={bins.map((b) => `${fmt(b.from)}: ${b.right} right, ${b.wrong} wrong`).join('; ')}>
              {bins.map((b) => (
                <div key={b.from} className="hc-chart-col">
                  <span className="w" style={{ height: `${(b.wrong / top) * 100}%` }} />
                  <span className="r" style={{ height: `${(b.right / top) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="hc-chart-axis" aria-hidden="true">
              <span>{fmt(bins[0].from)}</span>
              <span>{fmt(bins[bins.length - 1].from + data.overTime.binMs)}</span>
            </div>
            <div className="hc-legend">
              <span>
                <i style={{ background: 'var(--color-state-success)' }} />
                Right or accepted
              </span>
              <span>
                <i style={{ background: 'var(--color-state-error)' }} />
                Wrong
              </span>
            </div>
          </>
        )}
      </div>
      <div className="hc-box">
        <h2>How long people took</h2>
        {finish.length === 0 ? (
          <p className="hc-note">Nobody has finished yet.</p>
        ) : (
          <p className="hc-note">
            {finish.length} finished. Fastest {minutes(finish[0])}, median {minutes(finish[Math.floor(finish.length / 2)])}, slowest {minutes(finish[finish.length - 1])}. The time allowed was {minutes(data.contest.durationMins * 60000)}.
          </p>
        )}
      </div>
    </section>
  )
}
