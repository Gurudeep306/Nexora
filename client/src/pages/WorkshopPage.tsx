import { useState } from 'react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { Hammer, Plus, Pencil, Trash2, Trophy, Play } from 'lucide-react'
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
import { timeAgo } from '@/lib/utils'
import { ProblemFormModal } from '@/components/workshop/ProblemFormModal'
import { HostedSection } from '@/components/contests/hosted/HostedSection'
import type { CustomContestRow, CustomProblem } from '@/components/workshop/types'
import { difficultyLabel, parseJson } from '@/components/workshop/types'

type Tab = 'problems' | 'contests'

export default function WorkshopPage() {
  const { user } = useAuth()
  const me = user?.username ?? ''
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('problems')
  const [problemModal, setProblemModal] = useState<{ open: boolean; editing: CustomProblem | null }>({
    open: false,
    editing: null,
  })
  const [deleteProblem, setDeleteProblem] = useState<CustomProblem | null>(null)
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

  return (
    <div>
      <PageHeader
        icon="workshop"
        eyebrow="The Workshop"
        title="Workshop"
        subtitle="Write your own problems and host contests with them."
        actions={
          tab === 'problems' ? (
            <Button variant="accent" size="sm" onClick={() => setProblemModal({ open: true, editing: null })}>
              <Plus /> New Problem
            </Button>
          ) : (
            <Button variant="accent" size="sm" onClick={() => navigate('/contests/new')}>
              <Trophy /> New Contest
            </Button>
          )
        }
      />

      {/* ── Stats ── */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon="workshop" label="Custom problems" value={statsApi.data?.totalCustom ?? allProblems.length} accent="primary" />
        <StatCard icon="trophy" label="My contests" value={statsApi.data?.totalContests ?? myContests.length} accent="gold" />
        <StatCard
          icon="problems"
          label="Written for contests"
          value={allProblems.filter((p) => p.creator === me && p.contest_only).length}
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
              icon="workshop"
              title="No problems written yet"
              description="No custom problems exist yet. Create the first one — statement, samples and judge testcases."
              action={
                <Button variant="accent" size="sm" onClick={() => setProblemModal({ open: true, editing: null })}>
                  <Plus /> Write a problem
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
      ) : (
        <HostedSection />
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
    </div>
  )
}
