import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, CircleDot, ExternalLink, Heart, Lock, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react'
import { BackButton, Button, ConfirmDialog, EmptyState, ErrorState, Input, LoadingBlock, Modal, PageHeader, Progress, SearchInput, Textarea, useToast } from '@/components/ui'
import { ToggleRow } from '@/components/account/SettingsPrimitives'
import { AddLinkForm } from '@/components/problems/sets/SetDialogs'
import { useSite } from '@/context/SiteContext'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { TopicChips } from '@/components/topics/TopicChips'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { ApiError, api } from '@/lib/api'
import { type SetDetail, type SetItem } from '@/lib/problemSets'
import { topicLabel } from '@/lib/topics'
import { cn } from '@/lib/utils'

const CONTEST_MAX = 60

/** One problem set: its problems in order (by section), your progress, and what you can do with it. */
export default function ProblemSetPage() {
  const { id = '', company } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const url = company ? `/api/problem-sets/company/${encodeURIComponent(company)}` : `/api/problem-sets/${encodeURIComponent(id)}`
  const d = useApi(() => api.get<SetDetail>(url), [url], { cacheKey: `set:${url}` })
  const [topic, setTopic] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [making, setMaking] = useState(false)

  const items = useMemo(() => d.data?.items ?? [], [d.data])
  const topics = useMemo(() => {
    const n = new Map<string, number>()
    for (const it of items) for (const t of it.problem?.topics ?? []) n.set(t, (n.get(t) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1])
  }, [items])
  const shown = topic ? items.filter((it) => it.problem?.topics.includes(topic)) : items
  const sections = useMemo(() => {
    const out: { name: string; items: SetItem[] }[] = []
    for (const it of shown) {
      const last = out[out.length - 1]
      if (last && last.name === it.section) last.items.push(it)
      else out.push({ name: it.section, items: [it] })
    }
    return out
  }, [shown])

  if (d.error && !d.data) return <ErrorState message={`Couldn't open this set: ${d.error}`} onRetry={d.refetch} />
  if (!d.data) return <LoadingBlock rows={6} />
  const { set, canEdit } = d.data
  const numericId = /^\d+$/.test(set.id)

  const like = async () => {
    if (!user || !numericId) return
    try {
      const r = set.liked ? await api.delete<{ liked: boolean; likes: number }>(`/api/problem-sets/${set.id}/like`) : await api.put<{ liked: boolean; likes: number }>(`/api/problem-sets/${set.id}/like`)
      d.setData((cur) => (cur ? { ...cur, set: { ...cur.set, liked: r.liked, likes: r.likes } } : cur))
    } catch (e) {
      toast.error("Couldn't save your like", e instanceof ApiError ? e.message : undefined)
    }
  }
  const move = async (pos: number, by: -1 | 1) => {
    const order = items.map((i) => i.position)
    const i = order.indexOf(pos)
    const j = i + by
    if (j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    try {
      await api.put(`/api/problem-sets/${set.id}/order`, { order })
      d.refetch()
    } catch (e) {
      toast.error("Couldn't move it", e instanceof ApiError ? e.message : undefined)
    }
  }
  const remove = async (pos: number) => {
    try {
      await api.delete(`/api/problem-sets/${set.id}/items/${pos}`)
      d.refetch()
    } catch (e) {
      toast.error("Couldn't remove it", e instanceof ApiError ? e.message : undefined)
    }
  }
  /** A contest draft with this set's problems (the shown ones, after a topic filter). */
  const makeContest = async () => {
    const ids = shown.filter((it) => it.problem).map((it) => it.problem!.id).slice(0, CONTEST_MAX)
    if (!ids.length) return
    setMaking(true)
    try {
      const c = await api.post<{ id: number }>('/api/hosted', { title: topic ? `${set.title}: ${topicLabel(topic)}` : set.title })
      await api.put(`/api/hosted/${c.id}/items`, { items: ids.map((ref) => ({ kind: 'problem', ref: String(ref) })) })
      navigate(`/contests/${c.id}/edit`)
    } catch (e) {
      toast.error("Couldn't make the contest", e instanceof ApiError ? e.message : undefined)
      setMaking(false)
    }
  }
  const problemCount = shown.filter((it) => it.problem).length

  return (
    <div className="space-y-4">
      <BackButton />
      <PageHeader
        icon="problems"
        eyebrow={set.kind === 'series' ? 'Famous series' : set.kind === 'company' ? 'Company' : set.visibility === 'private' ? 'Your private set' : set.owner ? `A set by @${set.owner}` : 'Problem set'}
        title={set.title}
        subtitle={set.description || undefined}
        actions={
          canEdit && numericId ? (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <p className="m-0 text-sm text-text-secondary tabular-nums">
            <span className="font-semibold text-text-primary">{set.solved}</span> of {set.count} solved
            {set.visibility === 'private' && (
              <span className="ml-2 inline-flex items-center gap-1 text-text-muted">
                <Lock className="size-3.5" aria-hidden="true" /> Only you can see it
              </span>
            )}
          </p>
          <Progress value={set.solved} max={Math.max(1, set.count)} label={`${set.solved} of ${set.count} solved`} />
        </div>
        {set.sourceUrl && (
          <a href={set.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-text-primary underline underline-offset-[3px]">
            The original <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        {set.likes != null && numericId && (
          <Button variant="ghost" size="sm" onClick={() => void like()} disabled={!user} aria-pressed={set.liked} title={user ? undefined : 'Sign in to like sets'}>
            <Heart className={cn(set.liked && 'fill-current')} aria-hidden="true" /> {set.likes} {set.likes === 1 ? 'like' : 'likes'}
          </Button>
        )}
        {user && problemCount > 0 && (
          <Button size="sm" onClick={() => void makeContest()} loading={making} title={problemCount > CONTEST_MAX ? `A contest takes up to ${CONTEST_MAX} problems: the first ${CONTEST_MAX} go in` : undefined}>
            {!making && <Trophy aria-hidden="true" />} Make a contest{topic ? ` (${topicLabel(topic)})` : ''}
          </Button>
        )}
      </div>

      {topics.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Show problems with a topic">
          <span className="mr-1 text-xs text-text-muted">Topic</span>
          <button type="button" className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors', !topic ? 'border-text-primary text-text-primary' : 'border-border text-text-secondary hover:border-border-strong')} aria-pressed={!topic} onClick={() => setTopic(null)}>
            All
          </button>
          {topics.slice(0, 14).map(([t, n]) => (
            <button key={t} type="button" className={cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors', topic === t ? 'border-text-primary text-text-primary' : 'border-border text-text-secondary hover:border-border-strong')} aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)}>
              {topicLabel(t)} <span className="text-text-muted tabular-nums">{n}</span>
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="No problems yet"
          description={canEdit ? 'Add problems here, or from the Solve page (… → Add to a set).' : set.kind === 'company' ? 'Problems show once at least two people report being asked them.' : 'The owner hasn’t added any yet.'}
          action={canEdit && numericId ? <Button onClick={() => setAdding(true)}><Plus aria-hidden="true" /> Add problems</Button> : undefined}
        />
      ) : (
        <div className="space-y-5">
          {canEdit && numericId && (
            <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" /> Add problems
            </Button>
          )}
          {sections.map((sec, si) => (
            <section key={`${sec.name}-${si}`} aria-label={sec.name || 'Problems'}>
              {sec.name && <h2 className="mb-2 text-[13px] font-semibold tracking-wider text-text-muted uppercase">{sec.name}</h2>}
              <ol className="divide-y divide-border rounded-xl border border-border bg-bg-surface">
                {sec.items.map((it) => (
                  <li key={it.position} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                    <Status s={it.status} external={!!it.link} />
                    <div className="min-w-0 flex-1">
                      {it.problem ? (
                        <Link to={`/solve/${it.problem.id}`} className="text-[14.5px] font-medium text-text-primary hover:underline">
                          {it.problem.title}
                        </Link>
                      ) : (
                        <a href={it.link!.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[14.5px] font-medium text-text-primary hover:underline">
                          {it.link!.title} <ExternalLink className="size-3.5 text-text-muted" aria-hidden="true" />
                          <span className="sr-only">(not on NexoraGuru; opens the original in a new tab)</span>
                        </a>
                      )}
                      {it.note && <p className="m-0 text-xs text-text-muted">{it.note}</p>}
                      {it.problem && it.problem.topics.length > 0 && <TopicChips topics={it.problem.topics} className="mt-1" />}
                    </div>
                    {it.problem && <PlatformBadge platform={it.problem.platform} />}
                    {it.problem?.rating ? <span className="w-12 text-right font-mono text-xs text-text-muted tabular-nums">{it.problem.rating}</span> : null}
                    {canEdit && numericId && !topic && (
                      <span className="flex items-center">
                        <Button variant="ghost" size="icon-sm" aria-label="Move up" onClick={() => void move(it.position, -1)} disabled={it.position === items[0].position}>
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="Move down" onClick={() => void move(it.position, 1)} disabled={it.position === items[items.length - 1].position}>
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${it.problem?.title ?? it.link?.title}`} onClick={() => void remove(it.position)}>
                          <X aria-hidden="true" />
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {editing && (
        <EditSetDialog
          detail={d.data}
          onClose={() => setEditing(false)}
          onSaved={() => d.refetch()}
          onDelete={() => {
            setEditing(false)
            setDeleting(true)
          }}
        />
      )}
      {adding && <AddProblemsDialog setId={set.id} series={set.kind === 'series'} have={new Set(items.map((i) => i.problem?.id).filter(Boolean) as number[])} onClose={() => setAdding(false)} onAdded={() => d.refetch()} />}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this set?"
        message="The set goes for good. The problems and your progress on them stay."
        confirmLabel="Delete the set"
        danger
        onConfirm={async () => {
          try {
            await api.delete(`/api/problem-sets/${set.id}`)
            toast.success('Set deleted')
            navigate('/problems/sets?tab=mine')
          } catch (e) {
            toast.error("Couldn't delete it", e instanceof ApiError ? e.message : undefined)
          }
        }}
      />
    </div>
  )
}

function Status({ s, external }: { s?: SetItem['status']; external?: boolean }) {
  if (external) return <span className="size-4" aria-hidden="true" />
  if (s === 'solved')
    return (
      <span className="grid size-4 place-items-center rounded-full bg-state-success text-bg-app" title="Solved">
        <Check className="size-3" aria-hidden="true" />
        <span className="sr-only">Solved</span>
      </span>
    )
  if (s === 'examples' || s === 'attempted')
    return (
      <span title={s === 'examples' ? 'Passed the examples' : 'Attempted'} className="text-text-muted">
        <CircleDot className="size-4" aria-hidden="true" />
        <span className="sr-only">{s === 'examples' ? 'Passed the examples' : 'Attempted'}</span>
      </span>
    )
  return (
    <span className="size-4 rounded-full border border-border-strong" title="Not tried yet">
      <span className="sr-only">Not tried yet</span>
    </span>
  )
}

function EditSetDialog({ detail, onClose, onSaved, onDelete }: { detail: SetDetail; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const toast = useToast()
  const s = detail.set
  const [title, setTitle] = useState(s.title)
  const [description, setDescription] = useState(s.description)
  const [shared, setShared] = useState(s.visibility === 'public')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    try {
      await api.put(`/api/problem-sets/${s.id}`, { title, description, visibility: shared ? 'public' : 'private' })
      onSaved()
      onClose()
    } catch (e) {
      toast.error("Couldn't save", e instanceof ApiError ? e.message : undefined)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Edit the set" size="md">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">Name</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text-primary">About it</span>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} />
        </label>
        {s.kind === 'mine' && <ToggleRow label="Share it" hint="Anyone can see and like it." checked={shared} onChange={setShared} />}
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" onClick={onDelete} className="text-state-error">
            <Trash2 aria-hidden="true" /> Delete
          </Button>
          <span className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} disabled={title.trim().length < 2}>
              Save
            </Button>
          </span>
        </div>
      </form>
    </Modal>
  )
}

interface Found {
  id: number
  title: string
  platform: string
  rating: number | null
}

/** Find problems by name or topic (the same search as Problems) and add them. */
function AddProblemsDialog({ setId, series, have, onClose, onAdded }: { setId: string; series: boolean; have: Set<number>; onClose: () => void; onAdded: () => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const { can } = useSite()
  const staff = !!user && can('problems.manage')
  const [q, setQ] = useState('')
  const [added, setAdded] = useState<Set<number>>(new Set())
  const query = q.trim()
  const found = useApi(() => api.get<{ problems: Found[] }>('/api/problems', { query: { search: query, limit: 20 } }), [query], { skip: query.length < 2 })
  const add = async (p: Found) => {
    try {
      await api.post(`/api/problem-sets/${setId}/items`, { problemId: p.id })
      setAdded((cur) => new Set(cur).add(p.id))
      onAdded()
    } catch (e) {
      toast.error("Couldn't add it", e instanceof ApiError ? e.message : undefined)
    }
  }
  return (
    <Modal open onClose={onClose} title="Add problems" description="Search by name, or by topic: “graphs”, “topic:dp”." size="md">
      <div className="space-y-3">
        <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Two pointers, Dijkstra, topic:dp…" aria-label="Find problems" autoFocus />
        {series && staff && <AddLinkForm setId={setId} onAdded={onAdded} />}
        {query.length < 2 ? (
          <p className="py-4 text-center text-sm text-text-secondary">Type at least two letters.</p>
        ) : !found.data ? (
          <LoadingBlock rows={3} />
        ) : found.data.problems.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-secondary">No problem matches “{query}”.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto overscroll-contain rounded-lg border border-border">
            {found.data.problems.map((p) => {
              const inSet = have.has(p.id) || added.has(p.id)
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">{p.title}</span>
                    <span className="block text-xs text-text-muted">
                      {p.platform}
                      {p.rating ? ` · ${p.rating}` : ''}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" disabled={inSet} onClick={() => void add(p)} aria-label={inSet ? `Added: ${p.title}` : `Add ${p.title}`}>
                    {inSet ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />} {inSet ? 'Added' : 'Add'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
