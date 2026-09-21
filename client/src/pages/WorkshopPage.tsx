import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import {
  Hammer,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Trophy,
  Users,
  Clock,
  CalendarClock,
  Swords,
  Play,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingBlock,
  PageHeader,
  StatCard,
  Tabs,
  useToast,
} from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/context/AuthContext'
import { cn, timeAgo } from '@/lib/utils'
import { ProblemFormModal } from '@/components/workshop/ProblemFormModal'
import { ContestFormModal, contestProblemIds } from '@/components/workshop/ContestFormModal'
import type { CustomContestRow, CustomProblem } from '@/components/workshop/types'
import { difficultyLabel, parseJson } from '@/components/workshop/types'

type Tab = 'problems' | 'contests'

export default function WorkshopPage() {
  const { user } = useAuth()
  const me = user?.username ?? ''
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('problems')
  const [problemModal, setProblemModal] = useState<{ open: boolean; editing: CustomProblem | null }>({
    open: false,
    editing: null,
  })
  const [contestModal, setContestModal] = useState(false)
  const [deleteProblem, setDeleteProblem] = useState<CustomProblem | null>(null)
  const [deleteContest, setDeleteContest] = useState<CustomContestRow | null>(null)
  const [busy, setBusy] = useState(false)

  const problemsApi = useApi<{ problems: CustomProblem[] }>(() => api.get('/api/custom-problems'), [])
  const contestsApi = useApi<{ contests: CustomContestRow[] }>(
    () => api.get('/api/contests/mine', { query: { username: me } }),
    [me],
    { skip: !me },
  )
  const statsApi = useApi<{ totalCustom: number; totalContests: number }>(
    () => api.get('/api/workshop/stats', { query: { username: me } }),
    [me],
    { skip: !me },
  )

  const allProblems = problemsApi.data?.problems ?? []
  const myContests = contestsApi.data?.contests ?? []
  const problemsById = useMemo(() => new Map(allProblems.map((p) => [p.id, p])), [allProblems])

  async function removeProblem() {
    if (!deleteProblem) return
    setBusy(true)
    try {
      await api.delete(`/api/custom-problems/${deleteProblem.id}`)
      toast.success('Problem deleted', `“${deleteProblem.title}” was scrapped.`)
      setDeleteProblem(null)
      problemsApi.refetch()
      statsApi.refetch()
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  async function removeContest() {
    if (!deleteContest) return
    setBusy(true)
    try {
      await api.delete(`/api/contests/${deleteContest.id}`, { body: { username: me } })
      toast.success('Contest deleted', `“${deleteContest.title}” and its participants were removed.`)
      setDeleteContest(null)
      contestsApi.refetch()
      statsApi.refetch()
    } catch (err) {
      toast.error('Delete failed', err instanceof ApiError ? err.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      toast.info('Copied', `Contest code ${code} copied.`)
    } catch {
      toast.warning('Copy failed', code)
    }
  }

  function phaseOf(c: CustomContestRow): 'upcoming' | 'live' | 'ended' {
    const now = Date.now()
    const start = new Date(c.start_time).getTime()
    const end = start + (c.duration_mins ?? 60) * 60_000
    if (now < start) return 'upcoming'
    if (now <= end) return 'live'
    return 'ended'
  }

  return (
    <div>
      <PageHeader
        title="Workshop"
        subtitle="Forge custom problems and host password-gated contests for the community."
        actions={
          tab === 'problems' ? (
            <Button variant="accent" size="sm" onClick={() => setProblemModal({ open: true, editing: null })}>
              <Plus /> New Problem
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={() => setContestModal(true)}>
              <Trophy /> New Contest
            </Button>
          )
        }
      />

      {/* ── Stats ── */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={<Hammer />} label="Custom problems" value={statsApi.data?.totalCustom ?? allProblems.length} accent="primary" />
        <StatCard icon={<Trophy />} label="My contests" value={statsApi.data?.totalContests ?? myContests.length} accent="gold" />
        <StatCard
          icon={<Swords />}
          label="Selected for contests"
          value={myContests.reduce((s, c) => s + contestProblemIds(c).length, 0)}
          accent="cyan"
        />
      </div>

      <Tabs
        variant="underline"
        className="mb-5"
        items={[
          { id: 'problems', label: 'Problems', icon: <Hammer className="size-3.5" />, badge: allProblems.length },
          { id: 'contests', label: 'My Contests', icon: <Trophy className="size-3.5" />, badge: myContests.length },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === 'problems' ? (
        problemsApi.loading ? (
          <LoadingBlock rows={5} />
        ) : problemsApi.error ? (
          <Card>
            <ErrorState message={problemsApi.error} onRetry={problemsApi.refetch} />
          </Card>
        ) : allProblems.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Hammer />}
              title="The forge is cold"
              description="No custom problems exist yet. Create the first one — statement, samples and judge testcases."
              action={
                <Button variant="accent" size="sm" onClick={() => setProblemModal({ open: true, editing: null })}>
                  <Plus /> Forge a problem
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allProblems.map((p, i) => {
              const rating = p.difficulty ?? 1000
              const tags = parseJson<string[]>(p.tags, [])
              const testcases = parseJson<unknown[]>(p.testcases, [])
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <Card interactive className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant={rating < 1200 ? 'success' : rating < 1600 ? 'warning' : rating < 2000 ? 'danger' : 'accent'}
                        className="tabular-nums"
                      >
                        {rating} · {difficultyLabel(rating)}
                      </Badge>
                      {p.creator === me && <Badge variant="gold">Yours</Badge>}
                    </div>
                    <p className="mt-2.5 line-clamp-2 font-display text-sm tracking-wide text-foreground">
                      {p.title}
                    </p>
                    {p.statement && (
                      <p className="mt-1.5 line-clamp-2 text-xs text-foreground-dim">{p.statement}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tags.slice(0, 4).map((t) => (
                        <span key={t} className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-foreground-faint">
                          {t}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-foreground-faint">
                      {testcases.length} testcase{testcases.length === 1 ? '' : 's'}
                      {p.creator && <> · by @{p.creator}</>}
                      {p.created_at && <> · {timeAgo(p.created_at)}</>}
                    </p>
                    <div className="mt-auto flex gap-2 pt-4">
                      <Link to={`/solve/custom/${p.id}`} className="flex-1">
                        <Button size="sm" variant="primary" className="w-full">
                          <Play /> Solve
                        </Button>
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => setProblemModal({ open: true, editing: p })}>
                        <Pencil /> Edit
                      </Button>
                      <Button size="icon-sm" variant="ghost" aria-label={`Delete ${p.title}`} onClick={() => setDeleteProblem(p)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )
      ) : contestsApi.loading ? (
        <LoadingBlock rows={4} />
      ) : contestsApi.error ? (
        <Card>
          <ErrorState message={contestsApi.error} onRetry={contestsApi.refetch} />
        </Card>
      ) : myContests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Trophy />}
            title="No contests hosted"
            description="Pick your custom problems, set a password and start time — players join with the NX-code on the Contests page."
            action={
              <Button variant="accent" size="sm" onClick={() => setContestModal(true)}>
                <Plus /> Host a contest
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {myContests.map((c, i) => {
            const phase = phaseOf(c)
            const ids = contestProblemIds(c)
            const start = new Date(c.start_time)
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.28) }}
              >
                <Card glow={phase === 'live'} className={cn('p-4', phase === 'live' && 'border-accent/60 glow-box-accent')}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {phase === 'live' ? (
                          <Badge variant="accent" className="animate-pulse-glow">Live</Badge>
                        ) : phase === 'upcoming' ? (
                          <Badge variant="cyan">Upcoming</Badge>
                        ) : (
                          <Badge variant="default">Ended</Badge>
                        )}
                        {c.type && <Badge variant="primary">{c.type}</Badge>}
                        <h3 className="truncate font-display text-sm tracking-wide text-foreground">{c.title}</h3>
                      </div>
                      {c.description && <p className="mt-1 line-clamp-1 text-xs text-foreground-dim">{c.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-dim">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="size-3.5 text-foreground-faint" />
                          {start.toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5 text-foreground-faint" />
                          {c.duration_mins ?? 60} min
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5 text-foreground-faint" />
                          <span className="font-mono tabular-nums">
                            {c.participant_count ?? 0}/{c.max_participants ?? 50}
                          </span>
                        </span>
                      </div>
                      {ids.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ids.map((id) => (
                            <span key={id} className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-foreground-faint">
                              {problemsById.get(id)?.title ?? `Problem #${id}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        onClick={() => void copyCode(c.contest_code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-primary-bright tabular-nums transition-colors duration-200 hover:border-primary hover:glow-box"
                        aria-label={`Copy contest code ${c.contest_code}`}
                      >
                        {c.contest_code} <Copy className="size-3" />
                      </button>
                      <p className="text-[10px] tracking-wider text-foreground-faint uppercase">
                        created {c.created_at ? timeAgo(c.created_at) : ''}
                      </p>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteContest(c)}>
                        <Trash2 /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <ProblemFormModal
        open={problemModal.open}
        me={me}
        editing={problemModal.editing}
        onClose={() => setProblemModal({ open: false, editing: null })}
        onSaved={() => {
          problemsApi.refetch()
          statsApi.refetch()
        }}
      />

      <ContestFormModal
        open={contestModal}
        me={me}
        problems={allProblems}
        onClose={() => setContestModal(false)}
        onCreated={() => {
          contestsApi.refetch()
          statsApi.refetch()
        }}
      />

      <ConfirmDialog
        open={deleteProblem != null}
        onClose={() => setDeleteProblem(null)}
        onConfirm={() => void removeProblem()}
        title="Delete problem?"
        message={<>“{deleteProblem?.title}” will be permanently deleted. Contests referencing it keep a dangling id.</>}
        confirmLabel="Delete"
        danger
        loading={busy}
      />
      <ConfirmDialog
        open={deleteContest != null}
        onClose={() => setDeleteContest(null)}
        onConfirm={() => void removeContest()}
        title="Delete contest?"
        message={<>“{deleteContest?.title}” ({deleteContest?.contest_code}) and its participant list will be permanently deleted.</>}
        confirmLabel="Delete"
        danger
        loading={busy}
      />
    </div>
  )
}
