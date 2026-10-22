import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, Bookmark, BookmarkCheck, Check, ChevronLeft, ChevronRight, Clock, Flame, GraduationCap, Layers, Loader2, Route, Users, X } from 'lucide-react'
import { Badge, Button, useToast } from '@/components/ui'
import { useApi } from '@/hooks/useApi'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Markdown } from '@/learn/md'
import { fmtMinutes } from './insights'

/*
 * The node view's advanced parts: the mastery confidence meter, exam
 * weightage, peer insight, where learners slip, the quick check ("Test
 * out"), the shortest path to unlock, flashcards and your own notes.
 */

export interface NodeInsight {
  min: number
  w: { n: number; marks: number; years: Record<string, number> } | null
  hy: boolean
  peer: { learners: number; mastered: number; pct: number | null; medianDays: number | null } | null
}

const H = 'mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-foreground-faint uppercase'

/** Confidence as a thin meter; the breakdown shows on hover and focus. */
export function MasteryMeter({ score, breakdown, color }: { score: number; breakdown: string; color: string }) {
  return (
    <div className="group relative" tabIndex={0} aria-label={`Mastery confidence ${score}%: ${breakdown}`}>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="font-semibold tracking-wider text-foreground-faint uppercase">Confidence</span>
        <span className="font-mono text-foreground tabular-nums">{score}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface-3">
        <div className="nx-meter h-full rounded-full transition-[width] duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <p className="mt-1 mb-0 max-h-0 overflow-hidden font-mono text-[11px] text-foreground-dim opacity-0 transition-all duration-200 group-hover:max-h-10 group-hover:opacity-100 group-focus-visible:max-h-10 group-focus-visible:opacity-100">
        {breakdown}
      </p>
    </div>
  )
}

/** PYQ marks by year as small bars. */
export function Sparkline({ years, color }: { years: Record<string, number>; color: string }) {
  const ys = Object.keys(years).map(Number).sort((a, b) => a - b)
  if (!ys.length) return null
  const from = Math.max(ys[0], ys[ys.length - 1] - 19)
  const span = ys[ys.length - 1] - from + 1
  const max = Math.max(...Object.values(years))
  const W = 160
  const Hh = 28
  const bw = W / span
  return (
    <svg width={W} height={Hh + 12} role="img" aria-label={`PYQ marks by year, ${from}–${ys[ys.length - 1]}`} className="block">
      {Array.from({ length: span }, (_, i) => {
        const y = from + i
        const v = years[y] || 0
        const h = v ? Math.max(2, (v / max) * Hh) : 1
        return <rect key={y} x={i * bw + 0.5} y={Hh - h} width={Math.max(1, bw - 1.5)} height={h} rx={1} fill={v ? color : 'var(--color-border)'} opacity={v ? 0.9 : 0.6}>
          <title>{`${y}: ${v} mark${v === 1 ? '' : 's'}`}</title>
        </rect>
      })}
      <text x={0} y={Hh + 11} fontSize="9" fill="var(--color-text-muted)">{from}</text>
      <text x={W} y={Hh + 11} fontSize="9" fill="var(--color-text-muted)" textAnchor="end">{ys[ys.length - 1]}</text>
    </svg>
  )
}

/** Exam weight, peer insight and where learners slip. */
export function ExamInsight({ subject, node, insight, color }: { subject: string; node: string; insight: NodeInsight | null; color: string }) {
  const slips = useApi<{ ok: boolean; slips: { id: string; label: string; topic: string | null; attempts: number; accuracy: number; text: string; wrong: { option: string; text: string; share: number } | null }[] }>(
    () => api.get(`/api/nexus/mistakes/${subject}/${node}`),
    [subject, node],
    { cacheKey: `nexus:slips:${subject}:${node}`, skip: !insight?.w },
  )
  if (!insight?.w && !insight?.peer) return null
  const slip = slips.data?.slips?.[0]
  return (
    <section aria-label="Exam insight" className="space-y-3">
      <h3 className={H}>
        <Flame className="size-3.5" aria-hidden="true" /> In the exam
        {insight.hy && <Badge variant="warning">high-yield</Badge>}
      </h3>
      {insight.w && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="mb-0 text-[13px] text-foreground-dim">
            <span className="font-mono text-foreground tabular-nums">{insight.w.n}</span> PYQs ·{' '}
            <span className="font-mono text-foreground tabular-nums">{insight.w.marks}</span> marks across{' '}
            <span className="font-mono text-foreground tabular-nums">{Object.keys(insight.w.years).length}</span> years
          </p>
          <Sparkline years={insight.w.years} color={color} />
        </div>
      )}
      {insight.peer && insight.peer.learners > 0 && (
        <p className="mb-0 flex items-center gap-1.5 text-[12.5px] text-foreground-dim">
          <Users className="size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-mono text-foreground tabular-nums">{insight.peer.pct}%</span> of {insight.peer.learners} learner{insight.peer.learners === 1 ? '' : 's'} who tried it mastered it
            {insight.peer.medianDays !== null ? (
              <>
                {' '}· median <span className="font-mono text-foreground tabular-nums">{insight.peer.medianDays}</span> day{insight.peer.medianDays === 1 ? '' : 's'} to master
              </>
            ) : null}
          </span>
        </p>
      )}
      {slip && (
        <div className="nx-due-note flex gap-2 rounded-lg px-3 py-2 text-[12.5px]">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Most learners slip on <span className="font-semibold">{slip.label}</span>
            {slip.topic ? ` (${slip.topic})` : ''} — only {slip.accuracy}% get it right
            {slip.wrong ? (
              <>
                ; {slip.wrong.share}% pick <span className="font-semibold">{slip.wrong.option}</span>
                {slip.wrong.text ? <> (“{slip.wrong.text}”)</> : null}
              </>
            ) : null}
            .
          </span>
        </div>
      )}
    </section>
  )
}

/** The shortest path to unlock a locked node. */
export function UnlockPath({ steps, names, minutes, onStart, onPick }: { steps: string[]; names: Record<string, string>; minutes: Record<string, number>; onStart: () => void; onPick: (id: string) => void }) {
  if (!steps.length) return null
  const total = steps.reduce((a, id) => a + (minutes[id] ?? 0), 0)
  return (
    <section aria-label="Shortest path to unlock" className="rounded-xl border border-border px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={cn(H, 'mb-0')}>
          <Route className="size-3.5" aria-hidden="true" /> Shortest path to unlock
        </h3>
        <span className="font-mono text-[11px] text-foreground-dim tabular-nums">
          {steps.length} step{steps.length === 1 ? '' : 's'} · ≈ {fmtMinutes(total)}
        </span>
      </div>
      <ol className="mb-3 space-y-1">
        {steps.map((id, i) => (
          <li key={id} className="flex items-baseline gap-2 text-[13px]">
            <span className="w-4 shrink-0 text-right font-mono text-[10.5px] text-foreground-faint tabular-nums">{i + 1}</span>
            <button type="button" className="min-w-0 flex-1 cursor-pointer truncate text-left text-foreground hover:underline" onClick={() => onPick(id)}>
              {names[id] ?? id}
            </button>
            <span className="font-mono text-[11px] text-foreground-faint tabular-nums">{fmtMinutes(minutes[id] ?? 0)}</span>
          </li>
        ))}
      </ol>
      <Button variant="outline" size="sm" className="nx-press" onClick={onStart}>
        Start path
      </Button>
    </section>
  )
}

interface TestQ {
  id: string
  type: string
  marks: number
  year: number
  exam: string
  text: string
  options: { l: string; t: string }[]
}

/** An inline quick check: 3–5 of the node's PYQs; passing masters the node. */
export function TestOut({ subject, node, onClose, onPassed }: { subject: string; node: string; onClose: () => void; onPassed: () => void }) {
  const toast = useToast()
  const { data, loading } = useApi<{ ok: boolean; available: boolean; questions: TestQ[] }>(() => api.get(`/api/nexus/testout/${subject}/${node}`), [subject, node])
  const [picks, setPicks] = useState<Record<string, string | string[]>>({})
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean; results: { id: string; correct: boolean; key: unknown }[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const qs = data?.questions ?? []
  const set = (id: string, v: string, multi: boolean) =>
    setPicks((p) => {
      if (!multi) return { ...p, [id]: v }
      const cur = Array.isArray(p[id]) ? (p[id] as string[]) : []
      return { ...p, [id]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }
    })
  const submit = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ ok: boolean; score: number; total: number; passed: boolean; results: { id: string; correct: boolean; key: unknown }[] }>(`/api/nexus/testout/${subject}/${node}`, { answers: picks })
      setResult(r)
      if (r.passed) {
        toast.success('Tested out', `${r.score}/${r.total} — the node is mastered.`)
        onPassed()
      }
    } catch {
      toast.error('Could not grade the quick check')
    } finally {
      setBusy(false)
    }
  }
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} aria-label="Test out" className="rounded-xl border border-accent-brand/40 px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className={cn(H, 'mb-0')}>
          <GraduationCap className="size-3.5" aria-hidden="true" /> Test out
        </h3>
        <button type="button" onClick={onClose} aria-label="Close the quick check" className="cursor-pointer rounded p-1 text-foreground-dim hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      {loading && !data ? (
        <p className="mb-0 flex items-center gap-2 text-[12.5px] text-foreground-dim">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Picking questions…
        </p>
      ) : !data?.available ? (
        <p className="mb-0 text-[12.5px] text-foreground-dim">Not enough auto-graded questions for this node yet — study it instead.</p>
      ) : (
        <div className="space-y-4">
          <p className="mb-0 text-[12px] text-foreground-dim">Answer {qs.length} questions; {Math.ceil(qs.length * 0.8)} right masters the node (at 60% of its XP).</p>
          {qs.map((q, i) => {
            const r = result?.results.find((x) => x.id === q.id)
            return (
              <div key={q.id} className="space-y-2">
                <p className="mb-0 text-[11px] text-foreground-faint">
                  {i + 1}. {q.exam} {q.year} · {q.marks} mark{q.marks === 1 ? '' : 's'} · {q.type}
                  {r && (r.correct ? <span className="ml-2 text-success">✓ correct</span> : <span className="ml-2 text-destructive">✗ key: {Array.isArray(r.key) ? r.key.join(', ') : String(r.key)}</span>)}
                </p>
                <div className="text-[13.5px] text-foreground">
                  <Markdown md={q.text} />
                </div>
                {q.options.length ? (
                  <div className="grid gap-1.5">
                    {q.options.map((o) => {
                      const on = Array.isArray(picks[q.id]) ? (picks[q.id] as string[]).includes(o.l) : picks[q.id] === o.l
                      return (
                        <button
                          key={o.l}
                          type="button"
                          disabled={!!result}
                          onClick={() => set(q.id, o.l, q.type === 'MSQ')}
                          className={cn('flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[13px] transition-colors', on ? 'border-accent-brand bg-accent-brand/10' : 'border-border hover:border-primary/50')}
                          aria-pressed={on}
                        >
                          <span className="font-mono text-[11.5px] text-foreground-dim">{o.l}</span>
                          <span className="min-w-0 flex-1">
                            <Markdown md={o.t} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={!!result}
                    value={typeof picks[q.id] === 'string' ? (picks[q.id] as string) : ''}
                    onChange={(e) => setPicks((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder={q.type === 'TF' ? 'True or False' : 'Your answer'}
                    aria-label={`Answer to question ${i + 1}`}
                    className="w-40 rounded-lg border border-border bg-transparent px-2.5 py-1.5 font-mono text-[13px] outline-none focus:border-accent-brand"
                  />
                )}
              </div>
            )
          })}
          {result ? (
            <p className={cn('mb-0 text-[13px] font-semibold', result.passed ? 'text-success' : 'text-warning')}>
              {result.score}/{result.total} — {result.passed ? 'mastered. Nice.' : 'not yet: study it, or try again tomorrow.'}
            </p>
          ) : (
            <Button variant="primary" size="sm" className="nx-press" onClick={submit} disabled={busy || Object.keys(picks).length < qs.length}>
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />} Check answers
            </Button>
          )}
        </div>
      )}
    </motion.section>
  )
}

/** Flip cards from the lesson's definitions, or from the summary and topics. */
export function Flashcards({ cards, onAddToReview, canReview }: { cards: { front: string; back: string }[]; onAddToReview?: () => void; canReview: boolean }) {
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  if (!cards.length) return null
  const c = cards[Math.min(i, cards.length - 1)]
  const go = (d: number) => {
    setFlip(false)
    setI((x) => (x + d + cards.length) % cards.length)
  }
  return (
    <section aria-label="Flashcards">
      <h3 className={H}>
        <Layers className="size-3.5" aria-hidden="true" /> Flashcards
        <span className="ml-auto font-mono font-normal tracking-normal normal-case tabular-nums">
          {i + 1}/{cards.length}
        </span>
      </h3>
      <button
        type="button"
        onClick={() => setFlip((f) => !f)}
        className="relative block min-h-[112px] w-full cursor-pointer rounded-xl border border-border bg-surface/60 px-4 py-4 text-left transition-colors hover:border-primary/50"
        aria-label={flip ? 'Show the front' : 'Show the answer'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${i}-${flip}`} initial={{ opacity: 0, rotateX: -12 }} animate={{ opacity: 1, rotateX: 0 }} exit={{ opacity: 0, rotateX: 12 }} transition={{ duration: 0.18 }}>
            <p className="mb-1 text-[10.5px] font-semibold tracking-wider text-foreground-faint uppercase">{flip ? 'Answer' : 'Prompt'}</p>
            <div className={cn('text-[14px]', flip ? 'text-foreground-dim' : 'font-semibold text-foreground')}>
              <Markdown md={flip ? c.back : c.front} />
            </div>
          </motion.div>
        </AnimatePresence>
      </button>
      <div className="mt-2 flex items-center gap-1.5">
        <Button variant="ghost" size="sm" onClick={() => go(-1)} aria-label="Previous card">
          <ChevronLeft className="size-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => go(1)} aria-label="Next card">
          <ChevronRight className="size-3.5" />
        </Button>
        {canReview && onAddToReview && (
          <Button variant="outline" size="sm" className="nx-press ml-auto" onClick={onAddToReview}>
            Add to Review deck
          </Button>
        )}
      </div>
    </section>
  )
}

/** Your own note and bookmark for the node (saved to your account on save). */
export function NodeNotes({ subject, node, initial, onSaved }: { subject: string; node: string; initial: { note: string; bookmarked: boolean } | null; onSaved: (v: { note: string; bookmarked: boolean }) => void }) {
  const toast = useToast()
  const [note, setNote] = useState(initial?.note ?? '')
  const [mark, setMark] = useState(!!initial?.bookmarked)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setNote(initial?.note ?? '')
    setMark(!!initial?.bookmarked)
  }, [initial, node])
  const save = async (next: { note: string; bookmarked: boolean }) => {
    setSaving(true)
    try {
      await api.put(`/api/nexus/notes/${subject}/${node}`, next)
      onSaved(next)
    } catch {
      toast.error('Could not save your note')
    } finally {
      setSaving(false)
    }
  }
  const dirty = note !== (initial?.note ?? '')
  return (
    <section aria-label="Your notes">
      <h3 className={H}>
        Your notes
        <button
          type="button"
          className="ml-auto inline-flex cursor-pointer items-center gap-1 font-normal tracking-normal text-foreground-dim normal-case hover:text-foreground"
          onClick={() => {
            setMark(!mark)
            void save({ note, bookmarked: !mark })
          }}
          aria-pressed={mark}
        >
          {mark ? <BookmarkCheck className="size-3.5 text-accent-brand" aria-hidden="true" /> : <Bookmark className="size-3.5" aria-hidden="true" />}
          {mark ? 'Bookmarked' : 'Bookmark'}
        </button>
      </h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={4000}
        placeholder="Write what clicked, a formula, a trap to remember…"
        aria-label="Your note on this node"
        className="w-full resize-y rounded-xl border border-border bg-transparent px-3 py-2 text-[13.5px] outline-none placeholder:text-foreground-faint focus:border-accent-brand"
      />
      {dirty && (
        <div className="mt-1.5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setNote(initial?.note ?? '')}>
            Discard
          </Button>
          <Button variant="primary" size="sm" className="nx-press" onClick={() => void save({ note, bookmarked: mark })} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />} Save
          </Button>
        </div>
      )}
    </section>
  )
}

/** A small "≈ 1h 45m" chip. */
export function TimeChip({ minutes }: { minutes: number }) {
  return (
    <Badge variant="default">
      <Clock className="size-3" aria-hidden="true" /> ≈ {fmtMinutes(minutes)}
    </Badge>
  )
}
