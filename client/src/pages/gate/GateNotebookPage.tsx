/*
  GATE notebook — everything the student chose to keep.

    Bookmarks   grouped by collection (create / delete collections, unbookmark)
    Notes       searchable, rendered markdown, linked to the question
    Mistakes    last attempt wrong, newest first, by subject → retest
*/
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, Card, ConfirmDialog, Input, SearchInput, Skeleton, Tabs, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { AiMarkdown } from '@/components/ai/AiMarkdown'
import { cn } from '@/lib/utils'
import { useApi } from '@/hooks/useApi'
import { gateApi, type Collection, type NoteEntry, type QuestionProgress } from '@/gate/api'
import { GateShell } from '@/gate/shell/GateShell'
import { useGateExam } from '@/gate/shell/examStore'
import { useGateProgressAll, useQuestionsByIds } from '@/gate/shell/useGateData'
import { practiceLink, testLink } from '@/gate/shell/links'
import { EmptyHint, LinkButton, Panel } from '@/gate/insights/ui'
import { useSubjects } from '@/gate/insights/subjects'
import { QuestionRow } from '@/gate/insights/QuestionRow'
import { snippet, timeAgo } from '@/gate/insights/format'
import { shortSubject } from '@/gate/insights/subjects'

type Tab = 'bookmarks' | 'notes' | 'mistakes'

export default function GateNotebookPage() {
  const [params, setParams] = useSearchParams()
  const tab = (['bookmarks', 'notes', 'mistakes'].includes(params.get('tab') ?? '') ? params.get('tab') : 'bookmarks') as Tab
  const progress = useGateProgressAll()
  const notes = useApi(() => gateApi.notes().then((r) => r.notes), [], { cacheKey: 'gate:me:notes' })

  const entries = useMemo(() => Object.entries(progress.data ?? {}), [progress.data])
  const bookmarked = useMemo(() => entries.filter(([, p]) => p.bookmarked), [entries])
  const mistakes = useMemo(
    () => entries.filter(([, p]) => p.outcome === 'wrong').sort((a, b) => (b[1].lastAt ?? 0) - (a[1].lastAt ?? 0)),
    [entries],
  )

  return (
    <GateShell
      title="Notebook"
      subtitle="Bookmarks, notes and mistakes — your personal revision deck."
      actions={
        <LinkButton to={testLink({ focus: 'mistakes', count: 15, durationMin: 30 })} icon="refresh">
          Retest mistakes
        </LinkButton>
      }
    >
      <Tabs
        className="mb-5"
        active={tab}
        onChange={(id) => setParams((p) => (p.set('tab', id), p), { replace: true })}
        items={[
          { id: 'bookmarks', label: 'Bookmarks', icon: <Icon name="bookmark" className="size-4" />, badge: bookmarked.length || undefined },
          { id: 'notes', label: 'Notes', icon: <Icon name="edit" className="size-4" />, badge: notes.data?.length || undefined },
          { id: 'mistakes', label: 'Mistakes', icon: <Icon name="x-circle" className="size-4" />, badge: mistakes.length || undefined },
        ]}
      />
      {tab === 'bookmarks' && <Bookmarks rows={bookmarked} loading={progress.loading && !progress.data} onChanged={progress.refetch} setProgress={progress.setData} />}
      {tab === 'notes' && <Notes notes={notes.data ?? []} loading={notes.loading && !notes.data} />}
      {tab === 'mistakes' && <Mistakes rows={mistakes} loading={progress.loading && !progress.data} />}
    </GateShell>
  )
}

/* ── Bookmarks ──────────────────────────────────────────────────────────── */

function Bookmarks({
  rows,
  loading,
  onChanged,
  setProgress,
}: {
  rows: [string, QuestionProgress][]
  loading: boolean
  onChanged: () => void
  setProgress: (fn: (p: Record<string, QuestionProgress> | null) => Record<string, QuestionProgress> | null) => void
}) {
  const [exam] = useGateExam()
  const toast = useToast()
  const subjects = useSubjects(exam)
  const cols = useApi(() => gateApi.collections().then((r) => r.collections), [], { cacheKey: 'gate:me:collections' })
  const [active, setActive] = useState<string>('all')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [doomed, setDoomed] = useState<Collection | null>(null)
  const [deleting, setDeleting] = useState(false)

  const shown = rows.filter(([, p]) => active === 'all' || (active === 'none' ? !p.collections?.length : p.collections?.includes(active)))
  const ids = useMemo(() => shown.map(([id]) => id), [shown])
  const qs = useQuestionsByIds(ids)
  const unfiled = rows.filter(([, p]) => !p.collections?.length).length

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setCreating(true)
    try {
      const r = await gateApi.createCollection(n)
      cols.setData((c) => [...(c ?? []), r.collection])
      setName('')
      setActive(r.collection.id)
    } catch {
      toast.error('Couldn’t create collection', 'Please try again in a moment.')
    } finally {
      setCreating(false)
    }
  }

  const remove = async () => {
    if (!doomed) return
    setDeleting(true)
    try {
      await gateApi.deleteCollection(doomed.id)
      cols.setData((c) => (c ?? []).filter((x) => x.id !== doomed.id))
      if (active === doomed.id) setActive('all')
      onChanged()
      setDoomed(null)
    } catch {
      toast.error('Couldn’t delete collection')
    } finally {
      setDeleting(false)
    }
  }

  const unbookmark = async (id: string) => {
    setProgress((p) => (p ? { ...p, [id]: { ...p[id]!, bookmarked: false } } : p))
    try {
      await gateApi.setBookmark(id, false)
    } catch {
      setProgress((p) => (p ? { ...p, [id]: { ...p[id]!, bookmarked: true } } : p))
      toast.error('Couldn’t remove bookmark')
    }
  }

  const chip = (id: string, label: string, n: number, extra?: React.ReactNode) => (
    <li key={id} className="flex items-center">
      <button
        type="button"
        aria-pressed={active === id}
        onClick={() => setActive(id)}
        className={cn(
          'flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
          active === id ? 'bg-bg-surface-3 font-medium text-text-primary' : 'text-text-secondary hover:bg-bg-surface-2',
        )}
      >
        <span className="truncate">{label}</span>
        <span className="text-[11.5px] text-text-muted tabular-nums">{n}</span>
      </button>
      {extra}
    </li>
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-fit p-3">
        <p className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">Collections</p>
        <ul className="space-y-0.5">
          {chip('all', 'All bookmarks', rows.length)}
          {chip('none', 'Unfiled', unfiled)}
          {cols.loading && !cols.data ? (
            <li>
              <Skeleton className="mt-1 h-8 w-full rounded-lg" />
            </li>
          ) : (
            (cols.data ?? []).map((c) =>
              chip(
                c.id,
                c.name,
                c.count,
                <button
                  type="button"
                  aria-label={`Delete collection ${c.name}`}
                  onClick={() => setDoomed(c)}
                  className="ml-0.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface-3 hover:text-state-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                >
                  <Icon name="delete" className="size-3.5" />
                </button>,
              ),
            )
          )}
        </ul>
        <form onSubmit={create} className="mt-3 flex gap-1.5 border-t border-border pt-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New collection" aria-label="New collection name" maxLength={40} className="h-8 text-[13px]" />
          <Button type="submit" size="sm" variant="secondary" loading={creating} disabled={!name.trim()} aria-label="Create collection">
            <Icon name="add" />
          </Button>
        </form>
      </Card>

      <Panel title={active === 'all' ? 'All bookmarks' : active === 'none' ? 'Unfiled' : (cols.data?.find((c) => c.id === active)?.name ?? 'Collection')} icon="bookmark" subtitle={`${shown.length} question${shown.length === 1 ? '' : 's'}`}>
        {loading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : !shown.length ? (
          <EmptyHint icon="bookmark" title={rows.length ? 'Nothing in this collection' : 'No bookmarks yet'} action={<LinkButton to={practiceLink({ exam })} icon="play">Browse PYQs</LinkButton>}>
            Tap the bookmark on any question to save it here — then group them into collections like “Revise before exam”.
          </EmptyHint>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {shown.map(([id, p]) => (
              <QuestionRow
                key={id}
                id={id}
                q={qs.data?.[id]}
                loading={qs.loading}
                subjectName={(s) => shortSubject(subjects.subjectName(s))}
                meta={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {p.outcome && <span className={cn(p.outcome === 'correct' ? 'text-state-success' : p.outcome === 'wrong' ? 'text-state-error' : '')}>{p.outcome}</span>}
                    {p.hasNote && (
                      <span className="inline-flex items-center gap-0.5">
                        <Icon name="edit" className="size-3" /> note
                      </span>
                    )}
                    {(p.collections ?? []).map((cid) => (
                      <span key={cid} className="rounded bg-bg-surface-3 px-1.5 text-[11px]">
                        {cols.data?.find((c) => c.id === cid)?.name ?? cid}
                      </span>
                    ))}
                  </span>
                }
                right={
                  <button
                    type="button"
                    onClick={() => unbookmark(id)}
                    aria-label="Remove bookmark"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                  >
                    <Icon name="bookmark" className="size-4 fill-current" />
                  </button>
                }
              />
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={!!doomed}
        onClose={() => setDoomed(null)}
        onConfirm={remove}
        loading={deleting}
        danger
        title="Delete collection?"
        message={`“${doomed?.name ?? ''}” will be removed. The questions stay bookmarked.`}
        confirmLabel="Delete"
      />
    </div>
  )
}

/* ── Notes ──────────────────────────────────────────────────────────────── */

function Notes({ notes, loading }: { notes: NoteEntry[]; loading: boolean }) {
  const [exam] = useGateExam()
  const subjects = useSubjects(exam)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const sorted = useMemo(() => [...notes].sort((a, b) => b.updatedAt - a.updatedAt), [notes])
  const ids = useMemo(() => sorted.map((n) => n.questionId), [sorted])
  const qs = useQuestionsByIds(ids)
  const q = query.trim().toLowerCase()
  const shown = sorted.filter((n) => {
    if (!q) return true
    const qq = qs.data?.[n.questionId]
    return n.text.toLowerCase().includes(q) || (qq && (snippet(qq.text, 400).toLowerCase().includes(q) || subjects.subjectName(qq.subject).toLowerCase().includes(q)))
  })

  return (
    <Panel
      title="Notes"
      icon="edit"
      subtitle={`${notes.length} note${notes.length === 1 ? '' : 's'} · markdown & LaTeX supported`}
      action={<SearchInput value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery('')} placeholder="Search notes" aria-label="Search notes" containerClassName="w-44 sm:w-64" />}
    >
      {loading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : !notes.length ? (
        <EmptyHint icon="edit" title="No notes yet" action={<LinkButton to={practiceLink({ exam })} icon="play">Open a question</LinkButton>}>
          Jot down the trick, the trap or the formula on any question. Notes show up here, searchable.
        </EmptyHint>
      ) : !shown.length ? (
        <p className="py-6 text-center text-[13px] text-text-muted">No notes match “{query}”.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((n) => {
            const isOpen = open === n.questionId
            const long = n.text.length > 280
            return (
              <li key={n.questionId} className="flex flex-col rounded-xl border border-border">
                <ul className="border-b border-border px-3">
                  <QuestionRow id={n.questionId} q={qs.data?.[n.questionId]} loading={qs.loading} subjectName={(s) => shortSubject(subjects.subjectName(s))} className="py-2.5" />
                </ul>
                <div className={cn('relative px-3 py-2.5 text-[13px] text-text-secondary', !isOpen && long && 'max-h-40 overflow-hidden')}>
                  <AiMarkdown text={n.text} size="compact" />
                  {!isOpen && long && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-bg-surface-1 to-transparent" />}
                </div>
                <div className="mt-auto flex items-center justify-between px-3 pb-2.5 text-[11.5px] text-text-muted">
                  <span>Edited {timeAgo(n.updatedAt)}</span>
                  {long && (
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : n.questionId)}
                      aria-expanded={isOpen}
                      className="cursor-pointer rounded font-medium text-text-primary underline decoration-border-strong underline-offset-2 hover:decoration-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
                    >
                      {isOpen ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}

/* ── Mistakes ───────────────────────────────────────────────────────────── */

function Mistakes({ rows, loading }: { rows: [string, QuestionProgress][]; loading: boolean }) {
  const [exam] = useGateExam()
  const subjects = useSubjects(exam)
  const [subject, setSubject] = useState('all')
  const ids = useMemo(() => rows.slice(0, 100).map(([id]) => id), [rows])
  const qs = useQuestionsByIds(ids)

  const bySubject = useMemo(() => {
    const m = new Map<string, number>()
    for (const [id] of rows) {
      const s = qs.data?.[id]?.subject
      if (s) m.set(s, (m.get(s) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows, qs.data])
  const shown = rows.filter(([id]) => subject === 'all' || qs.data?.[id]?.subject === subject)

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-fit p-3">
        <p className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-text-muted uppercase">By subject</p>
        <ul className="space-y-0.5">
          {[['all', rows.length] as const, ...bySubject].map(([id, n]) => (
            <li key={id}>
              <button
                type="button"
                aria-pressed={subject === id}
                onClick={() => setSubject(id)}
                className={cn(
                  'flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
                  subject === id ? 'bg-bg-surface-3 font-medium text-text-primary' : 'text-text-secondary hover:bg-bg-surface-2',
                )}
              >
                <span className="truncate">{id === 'all' ? 'All mistakes' : shortSubject(subjects.subjectName(id))}</span>
                <span className="text-[11.5px] text-text-muted tabular-nums">{n}</span>
              </button>
            </li>
          ))}
        </ul>
        <LinkButton
          className="mt-3 w-full"
          variant="primary"
          icon="refresh"
          to={testLink({ focus: 'mistakes', exam, subject: subject === 'all' ? undefined : subject, count: Math.min(30, Math.max(5, shown.length)), durationMin: 45 })}
        >
          Retest {subject === 'all' ? 'all' : 'these'}
        </LinkButton>
      </Card>

      <Panel title="Mistakes" icon="x-circle" subtitle="Questions whose last attempt was wrong — newest first">
        {loading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : !rows.length ? (
          <EmptyHint icon="check-circle" title="No open mistakes">
            Wrong answers land here automatically. Solve them again correctly and they drop off the list.
          </EmptyHint>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {shown.map(([id, p]) => (
              <QuestionRow
                key={id}
                id={id}
                q={qs.data?.[id]}
                loading={qs.loading}
                subjectName={(s) => shortSubject(subjects.subjectName(s))}
                meta={
                  <span className="tabular-nums">
                    {p.correct}/{p.attempts} correct · last tried {timeAgo(p.lastAt)}
                    {p.review?.due && <> · review {p.review.due <= new Date().toISOString().slice(0, 10) ? 'due now' : `on ${p.review.due}`}</>}
                  </span>
                }
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
