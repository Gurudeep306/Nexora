import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { KeyRound, LogIn, Hammer, Copy, Trophy, Trash2, Users, Swords, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'
import { CountdownTimer } from './CountdownTimer'
import type { CustomContest, CustomContestDetail } from './types'
import { contestPhase } from './types'

const JOINED_KEY = (me: string) => `nexora:joined-contests:${me}`

function readJoined(me: string): number[] {
  try {
    const raw = localStorage.getItem(JOINED_KEY(me))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : []
  } catch {
    return []
  }
}

function writeJoined(me: string, ids: number[]) {
  try {
    localStorage.setItem(JOINED_KEY(me), JSON.stringify([...new Set(ids)]))
  } catch {
    /* storage unavailable — session-only */
  }
}

export function CustomContestsSection({ me }: { me: string }) {
  const toast = useToast()
  const [details, setDetails] = useState<CustomContestDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [joinOpen, setJoinOpen] = useState(false)
  const [active, setActive] = useState<CustomContestDetail | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (): Promise<CustomContestDetail[]> => {
    setLoading(true)
    try {
      // Contests I created + contests I joined (ids persisted locally).
      const mine = await api
        .get<{ contests: CustomContest[] }>('/api/contests/mine', { query: { username: me } })
        .catch(() => ({ contests: [] as CustomContest[] }))
      const joinedIds = readJoined(me)
      const ids = [...new Set([...(mine.contests ?? []).map((c) => c.id), ...joinedIds])]
      const results = await Promise.all(
        ids.map((id) =>
          api
            .get<CustomContestDetail & { ok: boolean }>(`/api/contests/${id}`, {
              query: { username: me },
            })
            .then((d) => ({ contest: d.contest, participants: d.participants ?? [], isOwner: d.isOwner }))
            .catch(() => null),
        ),
      )
      const loaded = results.filter((r): r is CustomContestDetail => r != null)
      setDetails(loaded)
      writeJoined(me, loaded.map((d) => d.contest.id))
      return loaded
    } finally {
      setLoading(false)
    }
  }, [me])

  useEffect(() => {
    void load()
  }, [load])

  function phaseOf(c: CustomContest) {
    return contestPhase(c, Date.now())
  }

  async function deleteContest() {
    if (!active) return
    setDeleting(true)
    try {
      await api.delete(`/api/contests/${active.contest.id}`, { body: { username: me } })
      toast.success('Contest deleted', `“${active.contest.title}” was scrapped.`)
      setActive(null)
      void load()
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.info('Copied', `Contest code ${code} copied to clipboard.`)
    } catch {
      toast.warning('Copy failed', code)
    }
  }

  const live = details.filter((d) => phaseOf(d.contest) === 'live')
  const upcoming = details.filter((d) => phaseOf(d.contest) === 'upcoming')
  const ended = details.filter((d) => phaseOf(d.contest) === 'ended')
  const ordered = [...live, ...upcoming, ...ended]

  return (
    <section aria-labelledby="custom-contests-heading" className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="custom-contests-heading" className="font-display text-lg tracking-wide text-foreground glow-text">
            Nexora Custom Contests
          </h2>
          <p className="mt-0.5 text-xs text-foreground-dim">
            Password-gated contests hosted by players. Join with a contest code — or forge your own in the Workshop.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="accent" size="sm" onClick={() => setJoinOpen(true)}>
            <KeyRound /> Join with Code
          </Button>
          <Link to="/workshop">
            <Button variant="outline" size="sm">
              <Hammer /> Create in Workshop
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Card className="p-4">
          <div className="skeleton h-16 w-full" />
        </Card>
      ) : ordered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy />}
            title="No custom contests yet"
            description="You haven't joined or hosted any Nexora contests. Join one with its NX-XXXXXX code, or build one in the Workshop."
            action={
              <Button variant="accent" size="sm" onClick={() => setJoinOpen(true)}>
                <LogIn /> Join a contest
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((d, i) => {
            const phase = phaseOf(d.contest)
            const startMs = new Date(d.contest.start_time).getTime()
            const endMs = startMs + (d.contest.duration_mins ?? 60) * 60_000
            return (
              <motion.div
                key={d.contest.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
              >
                <Card
                  interactive
                  glow={phase === 'live'}
                  onClick={() => setActive(d)}
                  className={cn('flex h-full flex-col p-4', phase === 'live' && 'border-accent/60 glow-box-accent')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {phase === 'live' ? (
                        <Badge variant="accent" className="animate-pulse-glow">Live</Badge>
                      ) : phase === 'upcoming' ? (
                        <Badge variant="cyan">Upcoming</Badge>
                      ) : (
                        <Badge variant="default">Ended</Badge>
                      )}
                      {d.isOwner && <Badge variant="gold">Host</Badge>}
                      {d.contest.type && <Badge variant="primary">{d.contest.type}</Badge>}
                    </div>
                    <span className="font-mono text-[11px] text-foreground-faint tabular-nums">
                      {d.contest.contest_code}
                    </span>
                  </div>
                  <p className="mt-2.5 line-clamp-2 font-display text-sm tracking-wide text-foreground">
                    {d.contest.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-dim">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3.5 text-foreground-faint" />
                      {d.participants.length}/{d.contest.max_participants ?? 50}
                    </span>
                    {phase === 'upcoming' && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] tracking-wider text-foreground-faint uppercase">Starts in</span>
                        <CountdownTimer target={startMs} />
                      </span>
                    )}
                    {phase === 'live' && (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[11px] tracking-wider text-foreground-faint uppercase">Ends in</span>
                        <CountdownTimer target={endMs} />
                      </span>
                    )}
                    {phase === 'ended' && (
                      <span className="font-mono tabular-nums">{formatDate(d.contest.start_time)}</span>
                    )}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <JoinContestModal
        open={joinOpen}
        me={me}
        onClose={() => setJoinOpen(false)}
        onJoined={(d) => {
          writeJoined(me, [...readJoined(me), d.contest.id])
          setJoinOpen(false)
          void load().then((list) => {
            setActive(list.find((x) => x.contest.id === d.contest.id) ?? d)
          })
        }}
      />

      {/* ── Contest detail + leaderboard ── */}
      <Modal
        open={active != null}
        onClose={() => setActive(null)}
        title={active ? active.contest.title : ''}
        size="lg"
      >
        {active && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {phaseOf(active.contest) === 'live' && <Badge variant="accent" className="animate-pulse-glow">Live</Badge>}
              {phaseOf(active.contest) === 'upcoming' && <Badge variant="cyan">Upcoming</Badge>}
              {phaseOf(active.contest) === 'ended' && <Badge variant="default">Ended</Badge>}
              {active.contest.type && <Badge variant="primary">{active.contest.type}</Badge>}
              {active.contest.org_tag && <Badge variant="outline">{active.contest.org_tag}</Badge>}
              <button
                onClick={() => void copyCode(active.contest.contest_code)}
                className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-primary-bright tabular-nums transition-colors duration-200 hover:border-primary"
                aria-label={`Copy contest code ${active.contest.contest_code}`}
              >
                {active.contest.contest_code} <Copy className="size-3" />
              </button>
            </div>

            {active.contest.description && (
              <p className="text-sm text-foreground-dim">{active.contest.description}</p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface-2/50 p-2.5">
                <p className="tracking-wider text-foreground-faint uppercase">Starts</p>
                <p className="mt-1 font-mono text-foreground tabular-nums">
                  {new Date(active.contest.start_time).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-2.5">
                <p className="tracking-wider text-foreground-faint uppercase">Duration</p>
                <p className="mt-1 font-mono text-foreground tabular-nums">
                  {active.contest.duration_mins ?? 60} min
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-2.5">
                <p className="tracking-wider text-foreground-faint uppercase">Host</p>
                <p className="mt-1 truncate text-foreground">@{active.contest.creator}</p>
              </div>
              <div className="rounded-lg border border-border bg-surface-2/50 p-2.5">
                <p className="tracking-wider text-foreground-faint uppercase">Players</p>
                <p className="mt-1 font-mono text-foreground tabular-nums">
                  {active.participants.length}/{active.contest.max_participants ?? 50}
                </p>
              </div>
            </div>

            <ContestProblems
              ids={contestProblemIdList(active.contest.problems)}
              unlocked={active.isOwner || contestPhase(active.contest, Date.now()) !== 'upcoming'}
            />

            <div>
              <h3 className="mb-2 flex items-center gap-2 font-display text-xs tracking-wider text-foreground uppercase">
                <Trophy className="size-3.5 text-gold" /> Leaderboard
              </h3>
              {active.participants.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-4 text-center text-xs text-foreground-faint">
                  No participants yet.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-14">#</TH>
                      <TH>Player</TH>
                      <TH className="text-right">Score</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {active.participants.map((p, i) => (
                      <TR key={p.username} className={cn(p.username === me && 'bg-primary/10')}>
                        <TD className={cn('font-display tabular-nums', i === 0 && 'text-gold')}>{i + 1}</TD>
                        <TD className="text-foreground">
                          {p.username === me ? `${p.username} (you)` : p.username}
                        </TD>
                        <TD className="text-right font-mono text-cyan tabular-nums">{p.score ?? 0}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>

            {active.isOwner && (
              <div className="flex justify-end border-t border-border pt-3">
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 /> Delete contest
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteContest()}
        title="Delete contest?"
        message={<>“{active?.contest.title}” and its participant list will be permanently deleted.</>}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </section>
  )
}

/* ════════════════ Join modal ════════════════ */

function JoinContestModal({
  open,
  me,
  onClose,
  onJoined,
}: {
  open: boolean
  me: string
  onClose: () => void
  onJoined: (detail: CustomContestDetail) => void
}) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [joining, setJoining] = useState(false)

  async function join() {
    if (!code.trim() || !password) return
    setJoining(true)
    try {
      const d = await api.post<{ ok: boolean; contest: CustomContest; participant_count: number }>(
        '/api/contests/join',
        { username: me, contest_code: code.trim().toUpperCase(), password },
      )
      toast.success('Joined contest', `“${d.contest.title}” — good luck, ${me}.`)
      setCode('')
      setPassword('')
      onJoined({ contest: d.contest, participants: [], isOwner: false })
    } catch (err) {
      toast.error(
        err instanceof ApiError && err.status === 401 ? 'Wrong password' : 'Join failed',
        err instanceof ApiError ? err.message : 'Unknown error',
      )
    } finally {
      setJoining(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join Custom Contest" size="sm">
      <div className="space-y-4">
        <Field label="Contest code" hint="Format NX-XXXXXX — case insensitive">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="NX-A2B3C4"
            className="font-mono tracking-widest uppercase"
            autoFocus
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void join()}
            placeholder="Host's contest password"
          />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={() => void join()} loading={joining} disabled={!code.trim() || !password}>
            <LogIn /> Join
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function contestProblemIdList(raw?: string): number[] {
  try {
    const v: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n)) : []
  } catch {
    return []
  }
}

/* Problem set for a custom contest — Workshop problems solved in the IDE at /solve/custom/:id */
function ContestProblems({ ids, unlocked }: { ids: number[]; unlocked: boolean }) {
  const [titles, setTitles] = useState<Record<number, string>>({})
  useEffect(() => {
    if (!unlocked || ids.length === 0) return
    let active = true
    api
      .get<{ problems: { id: number; title: string }[] }>('/api/custom-problems')
      .then((res) => {
        if (active) setTitles(Object.fromEntries((res.problems ?? []).map((p) => [p.id, p.title])))
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [unlocked, ids.length])

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 font-display text-xs tracking-wider text-foreground uppercase">
        <Swords className="size-3.5 text-primary-bright" /> Problems
      </h3>
      {ids.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-4 text-center text-xs text-foreground-faint">
          No problems attached to this contest.
        </p>
      ) : !unlocked ? (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-foreground-faint">
          <Lock className="size-3.5" aria-hidden="true" /> Problems unlock when the contest starts.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {ids.map((pid, i) => (
            <li key={pid}>
              <Link
                to={`/solve/custom/${pid}`}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 transition-colors duration-200 hover:border-border-glow"
              >
                <span className="grid size-6 place-items-center rounded-md bg-primary/15 font-display text-xs text-primary-bright">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">{titles[pid] ?? `Problem #${pid}`}</span>
                <span className="text-[11px] font-semibold tracking-wider text-primary-bright uppercase">Solve</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
