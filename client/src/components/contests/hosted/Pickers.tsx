import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Plus } from 'lucide-react'
import { Button, EmptyState, LoadingBlock, Modal, SearchInput, useToast } from '@/components/ui'
import { api, ApiError } from '@/lib/api'
import { stripMarkdown } from './text'
import { PHASE_LABEL, when, type ContestSummary, type Kind } from './api'
import { useLoaded } from './useLoaded'
import './hosted.css'

/*
  Pickers for the contest builder (a catalog problem, a GATE past-paper
  question, one of your Workshop problems) and "Add to a contest", which any
  problem or GATE question page can open.
*/

type Found = { key: string; kind: Kind; ref: string; title: string; sub: string }

function useSearch(kind: 'problem' | 'gate' | 'workshop', q: string, me?: string) {
  const [items, setItems] = useState<Found[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    const t = setTimeout(async () => {
      try {
        let out: Found[] = []
        if (kind === 'problem') {
          const r = await api.get<{ problems: { id: number; title: string; platform: string; problem_id: string; rating: number | null }[] }>('/api/problems', { query: { search: q, limit: 30, sort: q ? undefined : 'rating' } })
          out = r.problems.map((p) => ({ key: `p${p.id}`, kind: 'problem', ref: String(p.id), title: p.title, sub: `${p.platform} ${p.problem_id}${p.rating ? ` · rating ${p.rating}` : ''}` }))
        } else if (kind === 'gate') {
          const r = await api.get<{ questions: { id: string; text: string; exam: string; year: number; set: number | null; number: string; type: string; marks: number | null }[] }>('/api/gate/questions', {
            query: { q, type: 'MCQ,MSQ,NAT', answered: 'yes', limit: 30 },
          })
          out = r.questions.map((x) => ({ key: x.id, kind: 'gate', ref: x.id, title: stripMarkdown(x.text).slice(0, 140) || 'Question', sub: `GATE ${x.exam} ${x.year}${x.set ? ` set ${x.set}` : ''} · Q${x.number} · ${x.type} · ${x.marks ?? 1} mark${(x.marks ?? 1) === 1 ? '' : 's'}` }))
        } else {
          const r = await api.get<{ problems: { id: number; title: string; creator?: string; difficulty?: number; contest_only?: number }[] }>('/api/custom-problems')
          const needle = q.trim().toLowerCase()
          out = r.problems
            .filter((p) => p.creator === me && (!needle || p.title.toLowerCase().includes(needle)))
            .map((p) => ({ key: `w${p.id}`, kind: 'workshop', ref: String(p.id), title: p.title, sub: p.contest_only ? 'Written for contests' : `Workshop · difficulty ${p.difficulty ?? '—'}` }))
        }
        if (live) {
          setItems(out)
          setError(null)
        }
      } catch (e) {
        if (live) setError(e instanceof ApiError ? e.message : 'Could not search')
      }
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [kind, q, me])
  return { items, error }
}

const PICKER_TITLE = { problem: 'Add a problem from the catalog', gate: 'Add a GATE past-paper question', workshop: 'Add one of your Workshop problems' } as const

export function ItemPicker({
  open,
  kind,
  me,
  have,
  onClose,
  onPick,
}: {
  open: boolean
  kind: 'problem' | 'gate' | 'workshop'
  me: string
  /** Already in the contest ("kind:ref"). */
  have: Set<string>
  onClose: () => void
  onPick: (kind: Kind, ref: string) => Promise<void>
}) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const { items, error } = useSearch(kind, open ? q : '__closed__', me)
  return (
    <Modal open={open} onClose={onClose} title={PICKER_TITLE[kind]} description={kind === 'gate' ? 'Only questions with a checked answer (MCQ, MSQ, NAT). Past papers are public, answers included: for a graded test, write your own questions.' : undefined} size="lg">
      <SearchInput value={q} onChange={(e) => setQ(e.target.value)} onClear={() => setQ('')} placeholder={kind === 'gate' ? 'Search by words, subject or year' : 'Search by name'} aria-label="Search" autoFocus />
      <div className="mt-3 max-h-[60vh] overflow-y-auto" tabIndex={0} aria-label="Results">
        {error ? (
          <p className="hc-note text-state-error">{error}</p>
        ) : !items ? (
          <LoadingBlock rows={4} />
        ) : !items.length ? (
          <EmptyState icon="search" title="Nothing found" description={kind === 'workshop' ? 'Write a problem in the Workshop first, or write one for this contest.' : 'Try other words.'} />
        ) : (
          <ul className="hc-list">
            {items.map((it) => {
              const added = have.has(`${it.kind}:${it.ref}`)
              return (
                <li key={it.key} className="hc-item" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                  <div className="min-w-0">
                    <span className="hc-title">{it.title}</span>
                    <span className="hc-sub">{it.sub}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={added ? 'ghost' : 'outline'}
                    disabled={added || busy === it.key}
                    aria-label={added ? `${it.title}: added` : `Add ${it.title}`}
                    onClick={async () => {
                      setBusy(it.key)
                      try {
                        await onPick(it.kind, it.ref)
                      } finally {
                        setBusy(null)
                      }
                    }}
                  >
                    {added ? <Check /> : busy === it.key ? <Loader2 className="animate-spin" /> : <Plus />}
                    {added ? 'Added' : 'Add'}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}

/** "Add to a contest": from a problem or a GATE question, into a draft or upcoming contest you host, or a new one. */
export function AddToContest({ open, onClose, kind, refId, title }: { open: boolean; onClose: () => void; kind: Kind; refId: string; title: string }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState<number | 'new' | null>(null)
  // Contests you host that have not started; asked for again each time this opens.
  const loaded = useLoaded(async () => (open ? (await api.get<{ hosting: ContestSummary[] }>('/api/hosted/mine')).hosting.filter((c) => c.phase === 'draft' || c.phase === 'upcoming') : null), [open])
  const list = open ? loaded.data : null
  const error = loaded.error

  const add = async (c: ContestSummary) => {
    setBusy(c.id)
    try {
      const r = await api.post<{ added: boolean; reason?: string }>(`/api/hosted/${c.id}/items`, { kind, ref: refId })
      if (r.added) toast.success('Added', `“${title}” is in ${c.title}.`)
      else toast.info(r.reason || 'Already there')
      onClose()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not add it')
    } finally {
      setBusy(null)
    }
  }
  const fresh = async () => {
    setBusy('new')
    try {
      const r = await api.post<{ id: number }>('/api/hosted', { title: 'Untitled contest', item: { kind, ref: refId } })
      onClose()
      navigate(`/contests/${r.id}/edit`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not make the contest')
      setBusy(null)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title="Add to a contest" description={`“${title}” goes into a contest you host that has not started.`}>
      {error ? (
        <p className="hc-note text-state-error">{error}</p>
      ) : !list ? (
        <LoadingBlock rows={3} />
      ) : (
        <>
          {list.length > 0 && (
            <ul className="hc-list mb-4">
              {list.map((c) => (
                <li key={c.id} className="hc-item" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                  <div className="min-w-0">
                    <span className="hc-title">{c.title}</span>
                    <span className="hc-sub">
                      {PHASE_LABEL[c.phase]} · {when(c.startTime)} · {c.items ?? 0} question{c.items === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void add(c)} disabled={busy !== null} aria-label={`Add to ${c.title}`}>
                    {busy === c.id ? <Loader2 className="animate-spin" /> : <Plus />} Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button onClick={() => void fresh()} loading={busy === 'new'} disabled={busy !== null && busy !== 'new'}>
            <Plus /> New contest with it
          </Button>
        </>
      )}
    </Modal>
  )
}
