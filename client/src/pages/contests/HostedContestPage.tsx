import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, CircleAlert, Clock, FileText, ListChecks, Lock, Pencil, Play } from 'lucide-react'
import { BackButton, Button, ConfirmDialog, ErrorState, Field, Input, LoadingBlock, Tabs, useToast } from '@/components/ui'
import { Markdown } from '@/learn/md'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { CODING, PHASE_LABEL, TYPE_LABEL, clock, duration, minutes, solveLink, timingLine, type ContestView, type Lobby, type Row, type Settings, type Standings, marksOf } from '@/components/contests/hosted/api'
import { useLoaded } from '@/components/contests/hosted/useLoaded'
import '@/components/contests/hosted/hosted.css'

/*
  A hosted contest, by its code: the lobby (join, with a password when the
  host set one), then the questions with your clock, and the marks list as
  the host's rules allow.
*/

function useNow(every = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

export default function HostedContestPage() {
  const { code = '' } = useParams()
  const { data, error, reload } = useLoaded(async () => {
    const lobby = await api.get<Lobby>(`/api/hosted/code/${encodeURIComponent(code)}`)
    const view = lobby.joined || lobby.host ? await api.get<ContestView>(`/api/hosted/${lobby.contest.id}`) : null
    return { lobby, view }
  }, [code])

  if (error && !data) return <ErrorState message={error} onRetry={() => void reload()} />
  if (!data) return <LoadingBlock rows={6} className="py-8" />
  return (
    <div className="hc">
      <BackButton />
      {data.view ? <Inside lobby={data.lobby} view={data.view} reload={reload} /> : <Join lobby={data.lobby} onJoined={reload} />}
    </div>
  )
}

function Head({ lobby, children }: { lobby: Lobby; children?: React.ReactNode }) {
  const c = lobby.contest
  return (
    <header className="hc-head">
      <div className="min-w-0">
        <p className="ed-label">Contest · {c.code}</p>
        <h1 className="ed-title">{c.title}</h1>
        <p className="hc-meta">
          <span className="hc-chip" data-tone={c.phase === 'live' ? 'live' : undefined}>
            {PHASE_LABEL[c.phase]}
          </span>
          <span>{timingLine(c)}</span>
          <span>
            {lobby.itemCount} question{lobby.itemCount === 1 ? '' : 's'} · {marksOf(lobby.totalMarks)}
          </span>
          <span>Hosted by {c.hostName || c.creator}</span>
        </p>
      </div>
      {children}
    </header>
  )
}

/* ── before joining ── */

function Join({ lobby, onJoined }: { lobby: Lobby; onJoined: () => Promise<void> }) {
  const toast = useToast()
  const c = lobby.contest
  const [pass, setPass] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ended = c.phase === 'ended'
  const join = async () => {
    setBusy(true)
    setErr(null)
    try {
      await api.post(`/api/hosted/code/${c.code}/join`, { password: pass })
      toast.success('You are in')
      await onJoined()
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Could not join')
    } finally {
      setBusy(false)
    }
  }
  const parts = [lobby.kinds.coding ? `${lobby.kinds.coding} coding problem${lobby.kinds.coding === 1 ? '' : 's'}` : '', lobby.kinds.paper ? `${lobby.kinds.paper} GATE-style question${lobby.kinds.paper === 1 ? '' : 's'}` : ''].filter(Boolean)
  return (
    <>
      <Head lobby={lobby} />
      <div className="hc-box max-w-2xl">
        <h2>{ended ? 'This contest has ended' : 'Join the contest'}</h2>
        {c.description?.trim() && (
          <div className="mt-2">
            <Markdown md={c.description} />
          </div>
        )}
        <p className="hc-note mt-2">
          {parts.join(' and ')}. {c.settings.mode === 'window' ? `You get ${duration(c.durationMins)} from when you press Start, any time before it closes.` : `It runs for ${duration(c.durationMins)} from the start time.`}{' '}
          {lobby.kinds.paper ? 'The GATE-style questions are answered once, in the exam console.' : ''} The questions stay hidden until it starts.
        </p>
        {!ended && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void join()
            }}
          >
            {lobby.needsPassword && (
              <div className="min-w-[14rem] flex-1">
                <Field label="Password" error={err ?? undefined}>
                  <Input type="password" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
                </Field>
              </div>
            )}
            <Button type="submit" loading={busy} disabled={lobby.needsPassword && !pass}>
              {lobby.needsPassword ? <Lock /> : <Check />} Join
            </Button>
            {!lobby.needsPassword && err && (
              <p role="alert" className="w-full text-sm text-state-error">
                {err}
              </p>
            )}
          </form>
        )}
        <p className="hc-note mt-3">{lobby.contest.people ?? 0} joined so far.</p>
      </div>
    </>
  )
}

/* ── inside ── */

function Inside({ lobby, view, reload }: { lobby: Lobby; view: ContestView; reload: () => Promise<void> }) {
  const toast = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const now = useNow()
  const c = view.contest
  const [tab, setTab] = useState<'questions' | 'marks'>('questions')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data: standings, reload: loadStandings } = useLoaded(() => api.get<Standings>(`/api/hosted/${c.id}/standings`), [c.id])
  useEffect(() => {
    if (c.phase !== 'live') return
    const t = setInterval(() => void loadStandings(), 20000)
    return () => clearInterval(t)
  }, [loadStandings, c.phase])

  // When the clock reaches a boundary, load again (the questions appear at the start).
  const startMs = Date.parse(c.startTime)
  const myEnd = view.me?.to ?? null
  useEffect(() => {
    const next = [startMs, Date.parse(c.closesAt), myEnd ?? 0].filter((t) => t > Date.now()).sort((a, b) => a - b)[0]
    if (!next || next - Date.now() > 24 * 3600000) return
    const t = setTimeout(() => void reload(), next - Date.now() + 500)
    return () => clearTimeout(t)
  }, [startMs, c.closesAt, myEnd, reload])

  const myRow: Row | null = (user && standings?.rows.find((r) => r.username === user.username)) || null

  const start = async () => {
    setBusy(true)
    try {
      await api.post(`/api/hosted/${c.id}/start`)
      await reload()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not start')
    } finally {
      setBusy(false)
    }
  }
  const finish = async () => {
    try {
      await api.post(`/api/hosted/${c.id}/finish`)
      toast.success('Finished. Well done.')
      await reload()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not finish')
    }
  }

  const state = view.me?.state
  const running = state === 'running'
  const paperItems = view.items.filter((i) => !CODING.has(i.kind))
  const codingItems = view.items.filter((i) => CODING.has(i.kind))
  const paperMarks = paperItems.reduce((a, i) => a + i.marks, 0)

  return (
    <>
      <Head lobby={lobby}>
        <div className="hc-actions">
          {view.host && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/contests/${c.id}/edit`)}>
                <Pencil /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/contests/${c.id}/results`)}>
                <ListChecks /> Marks & analysis
              </Button>
            </>
          )}
        </div>
      </Head>

      {view.me && (
        <div className="hc-box mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            {state === 'not_started' && c.phase === 'upcoming' && (
              <>
                <span className="hc-clock-l">Starts in</span>
                <span className="hc-clock" role="timer">
                  {clock(startMs - now)}
                </span>
              </>
            )}
            {state === 'not_started' && c.phase === 'live' && c.settings.mode === 'window' && (
              <p className="hc-note max-w-xl">
                Your {duration(c.durationMins)} start when you press Start{Date.parse(c.closesAt) - now < c.durationMins * 60000 ? `, but the contest closes in ${clock(Date.parse(c.closesAt) - now)}, so you get less` : ''}. Make sure you have the time now.
              </p>
            )}
            {running && myEnd && (
              <>
                <span className="hc-clock-l">Time left</span>
                <span className="hc-clock" role="timer" aria-live="off">
                  {clock(myEnd - now)}
                </span>
              </>
            )}
            {(state === 'finished' || state === 'missed') && (
              <p className="m-0 text-[15px] font-semibold text-text-primary">{state === 'missed' ? 'The window closed before you started.' : c.phase === 'ended' ? 'The contest has ended.' : 'Your time is over. The contest is still running for others.'}</p>
            )}
          </div>
          <div className="hc-actions">
            {state === 'not_started' && c.phase === 'live' && c.settings.mode === 'window' && (
              <Button onClick={() => void start()} loading={busy}>
                <Play /> Start now
              </Button>
            )}
            {running && (
              <Button variant="outline" onClick={() => setConfirm(true)}>
                Finish early
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs
        items={[
          { id: 'questions', label: 'Questions' },
          { id: 'marks', label: 'Marks list' },
        ]}
        active={tab}
        onChange={(t) => setTab(t as 'questions' | 'marks')}
        className="mb-4"
      />

      {tab === 'questions' &&
        (view.items.length === 0 ? (
          <div className="hc-box">
            <h2>{c.phase === 'upcoming' || state === 'not_started' ? 'The questions appear when it starts' : 'No questions'}</h2>
            {c.description?.trim() && (
              <div className="mt-2">
                <Markdown md={c.description} />
              </div>
            )}
          </div>
        ) : (
          <>
            {codingItems.length > 0 && (
              <section aria-labelledby="hc-coding" className="mb-6">
                <h2 id="hc-coding" className="ed-h2 mb-2">
                  Coding
                </h2>
                <ol className="hc-list">
                  {codingItems.map((it, n) => {
                    const mc = myRow?.cells.find((x) => x.idx === it.idx)
                    return (
                      <li key={it.idx} className="hc-item">
                        <span className="hc-num" aria-hidden="true">
                          {n + 1}
                        </span>
                        <div className="min-w-0">
                          <Link to={solveLink(it, c.id)} className="hc-title">
                            {it.title}
                          </Link>
                          <span className="hc-sub">
                            <span>{marksOf(it.marks)}</span>
                            {it.rating ? <span>Rating {it.rating}</span> : null}
                          </span>
                        </div>
                        <div className="hc-side">
                          {mc?.solved ? (
                            <span className="hc-state" data-tone="success">
                              Solved · {mc.minutes} min
                            </span>
                          ) : mc?.tries ? (
                            <span className="hc-state" data-tone="error">
                              {mc.tries} tr{mc.tries === 1 ? 'y' : 'ies'}
                            </span>
                          ) : null}
                          <Button size="sm" variant={running ? 'primary' : 'outline'} onClick={() => navigate(solveLink(it, c.id))} aria-label={`${running ? 'Solve' : 'Open'} ${it.title}`}>
                            {running ? 'Solve' : 'Open'}
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {running && <p className="hc-note mt-2">Every Submit on the Solve page while your time runs counts here. Run does not count.</p>}
              </section>
            )}
            {paperItems.length > 0 && (
              <section aria-labelledby="hc-paper">
                <h2 id="hc-paper" className="ed-h2 mb-2">
                  GATE-style questions
                </h2>
                <div className="hc-box flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="m-0 font-semibold text-text-primary">
                      {paperItems.length} question{paperItems.length === 1 ? '' : 's'} · {marksOf(Math.round(paperMarks * 100) / 100)}
                    </p>
                    <p className="hc-note">
                      {paperItems.map((i) => (i.type ? TYPE_LABEL[i.type] : 'Question')).filter((v, k, a) => a.indexOf(v) === k).join(', ')}. Answered once in the exam console
                      {c.settings.negativeMarking && paperItems.some((i) => i.kind === 'gate') ? '; past-paper MCQs lose a third of their marks when wrong' : ''}.
                    </p>
                  </div>
                  {view.me?.paperDone ? (
                    <Button variant="outline" onClick={() => navigate(`/contests/${c.id}/paper`)}>
                      <FileText /> {state === 'running' ? 'Handed in' : 'See your answers'}
                    </Button>
                  ) : running ? (
                    <Button onClick={() => navigate(`/contests/${c.id}/paper`)}>
                      <FileText /> Open the exam console
                    </Button>
                  ) : view.host || c.phase === 'ended' ? (
                    <Button variant="outline" onClick={() => navigate(`/contests/${c.id}/paper`)}>
                      <FileText /> {view.host ? 'See the paper' : 'See the answers'}
                    </Button>
                  ) : null}
                </div>
              </section>
            )}
          </>
        ))}

      {tab === 'marks' && <MarksList standings={standings} host={view.host} codingCount={codingItems.length} mode={c.settings.standings} me={user?.username} />}

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={finish}
        title="Finish now?"
        message={paperItems.length && !view.me?.paperDone ? 'You have not handed in the GATE-style answers. Finishing now ends your time, and those answers will not count.' : 'Finishing ends your time. Later runs will not count.'}
        confirmLabel="Finish"
      />
    </>
  )
}

function MarksList({ standings, host, codingCount, mode, me }: { standings: Standings | null; host: boolean; codingCount: number; mode: Settings['standings']; me?: string }) {
  if (!standings) return <LoadingBlock rows={4} />
  const settingsNote = mode === 'after' ? 'The marks list opens to everyone when the contest ends. For now, here is your own result.' : 'The host keeps the marks list private. Here is your own result.'
  if (!standings.rows.length)
    return (
      <div className="hc-box">
        <h2>No one yet</h2>
        <p className="hc-note">The list fills as people take part.</p>
      </div>
    )
  return (
    <>
      {!standings.visible && !host && (
        <p className="hc-banner" data-tone="info" role="note">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          {settingsNote}
        </p>
      )}
      {standings.paperMarksHidden && (
        <p className="hc-banner" data-tone="info" role="note">
          <Clock className="size-4 shrink-0" aria-hidden="true" /> Marks for the GATE-style questions show when the answers can be reviewed.
        </p>
      )}
      <div className="hc-table-wrap" tabIndex={0} role="region" aria-label="Marks list">
        <table className="hc-table">
          <thead>
            <tr>
              <th className="num">Rank</th>
              <th>Name</th>
              <th className="num">Marks</th>
              {codingCount > 0 && <th className="num">Solved</th>}
              {codingCount > 0 && <th className="num">Penalty</th>}
              <th className="num">Time</th>
            </tr>
          </thead>
          <tbody>
            {standings.rows.map((r) => (
              <tr key={r.username} data-me={r.username === me ? '' : undefined}>
                <td className="num">{r.rank}</td>
                <td>
                  <Link to={`/u/${r.username}`} className="hover:underline">
                    {r.name || r.username}
                  </Link>
                  {r.name && <span className="ml-1.5 text-[12px] text-text-secondary">@{r.username}</span>}
                </td>
                <td className="num">{r.marks}</td>
                {codingCount > 0 && <td className="num">{r.solved}</td>}
                {codingCount > 0 && <td className="num">{r.penalty} min</td>}
                <td className="num">{r.state === 'running' ? 'Still in' : r.state === 'not_started' ? '—' : minutes(r.timeUsedMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
