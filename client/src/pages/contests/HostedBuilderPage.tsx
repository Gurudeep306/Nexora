import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, BookOpen, Check, CircleAlert, Code2, Copy, FilePlus2, ListChecks, Pencil, Trash2 } from 'lucide-react'
import { BackButton, Button, ConfirmDialog, ErrorState, Field, Input, LoadingBlock, Tabs, Textarea, useToast } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { api, ApiError } from '@/lib/api'
import { ProblemFormModal } from '@/components/workshop/ProblemFormModal'
import type { CustomProblem } from '@/components/workshop/types'
import { ItemPicker } from '@/components/contests/hosted/Pickers'
import { QuestionEditor } from '@/components/contests/hosted/QuestionEditor'
import { CODING, KIND_LABEL, PHASE_LABEL, TYPE_LABEL, contestUrl, duration, type ContestView, type Item, type Kind, type Settings, marksOf } from '@/components/contests/hosted/api'
import { useLoaded } from '@/components/contests/hosted/useLoaded'
import '@/components/contests/hosted/hosted.css'

/*
  Build a contest (src/routes/hosted-contests.js): pick or write the
  questions, set the timing and rules, then share the link and publish.
  Everything saves as you go. Questions are fixed once someone starts.
*/

const TABS = [
  { id: 'questions', label: 'Questions' },
  { id: 'rules', label: 'Timing & rules' },
  { id: 'share', label: 'Share & publish' },
] as const
type TabId = (typeof TABS)[number]['id']

/** "2026-12-06T10:00" in local time, for <input type="datetime-local">. */
const toLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null)

/** /contests/new: make a draft, then open it. */
export function NewContestPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    api
      .post<{ id: number }>('/api/hosted', { title: 'Untitled contest' })
      .then((r) => navigate(`/contests/${r.id}/edit`, { replace: true }))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not start a contest'))
  }, [navigate])
  return error ? <ErrorState message={error} /> : <LoadingBlock rows={6} className="py-8" />
}

export default function HostedBuilderPage() {
  const { id: idParam = '' } = useParams()
  const id = Number(idParam)
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'questions') as TabId
  const setTab = (t: string) => setParams((p) => (p.set('tab', t), p), { replace: true })

  const { data: view, error, reload: load } = useLoaded(async () => {
    const v = await api.get<ContestView>(`/api/hosted/${id}`)
    if (!v.host) throw new ApiError(403, 'Only the host can edit this contest')
    return v
  }, [id])

  if (error && !view) return <ErrorState message={error} onRetry={() => void load()} />
  if (!view || !user) return <LoadingBlock rows={8} className="py-8" />
  const c = view.contest

  return (
    <div className="hc">
      <BackButton />
      <header className="hc-head">
        <div className="min-w-0 flex-1">
          <p className="ed-label">Contest builder</p>
          <h1 className="sr-only">Edit the contest: {c.title}</h1>
          <TitleField id={id} initial={c.title} />
          <p className="hc-meta">
            <span className="hc-chip" data-tone={c.phase === 'live' ? 'live' : undefined}>
              {PHASE_LABEL[c.phase]}
            </span>
            <span>
              {view.itemCount} question{view.itemCount === 1 ? '' : 's'} · {marksOf(view.totalMarks)}
            </span>
            <span>Code {c.code}</span>
          </p>
        </div>
        <div className="hc-actions">
          {c.status === 'published' && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/contests/${id}/results`)}>
              <ListChecks /> Marks & analysis
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(contestUrl(c.code))}>
            Open the contest page
          </Button>
        </div>
      </header>

      <Tabs items={TABS.map((t) => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} className="mb-5" />

      {tab === 'questions' && <QuestionsTab view={view} me={user.username} reload={load} />}
      {tab === 'rules' && <RulesTab view={view} reload={load} />}
      {tab === 'share' && (
        <ShareTab
          view={view}
          reload={load}
          onDeleted={() => {
            toast.success('Contest deleted')
            navigate('/contests')
          }}
        />
      )}
    </div>
  )
}

/* ── the title, saved as you type ── */

function TitleField({ id, initial }: { id: number; initial: string }) {
  const [v, setV] = useState(initial)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  // A title wraps like a heading: the field grows with it (no cut-off on a phone).
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [v])
  return (
    <label className="block">
      <span className="sr-only">Contest title</span>
      <textarea
        ref={area}
        rows={1}
        className="ed-title mt-1 block w-full min-w-0 resize-none overflow-hidden border-0 border-b border-transparent bg-transparent p-0 hover:border-border focus:border-text-primary focus:outline-none"
        value={v}
        maxLength={120}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        onChange={(e) => {
          const t = e.target.value.replace(/\s*\n\s*/g, ' ')
          setV(t)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => void api.put(`/api/hosted/${id}`, { title: t }).catch(() => {}), 700)
        }}
      />
    </label>
  )
}

/* ── questions ── */

function QuestionsTab({ view, me, reload }: { view: ContestView; me: string; reload: () => Promise<void> }) {
  const toast = useToast()
  const id = view.contest.id
  const locked = !!view.locked
  // Edits show at once; the server's list takes over when it answers.
  const [pending, setPending] = useState<Item[] | null>(null)
  const items = pending ?? view.items
  const [picker, setPicker] = useState<null | 'problem' | 'gate' | 'workshop'>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [editingWs, setEditingWs] = useState<CustomProblem | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const have = useMemo(() => new Set(items.map((i) => `${i.kind}:${i.ref}`)), [items])
  const total = Math.round(items.reduce((a, i) => a + (Number(i.marks) || 0), 0) * 100) / 100

  const push = useCallback(
    async (next: Item[], soon = false) => {
      setPending(next)
      const send = async () => {
        try {
          await api.put(`/api/hosted/${id}/items`, { items: next.map((i) => ({ kind: i.kind, ref: i.ref, marks: i.marks })) })
        } catch (e) {
          toast.error(e instanceof ApiError ? e.message : 'Could not save the questions')
        }
        await reload()
        setPending(null)
      }
      if (timer.current) clearTimeout(timer.current)
      if (soon) timer.current = setTimeout(() => void send(), 700)
      else await send()
    },
    [id, reload, toast],
  )

  const add = async (kind: Kind, ref: string) => {
    try {
      const r = await api.post<{ added: boolean; reason?: string }>(`/api/hosted/${id}/items`, { kind, ref })
      if (!r.added) toast.info(r.reason || 'Already there')
      await reload()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not add it')
    }
  }
  const newQuestion = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ id: number }>(`/api/hosted/${id}/questions`, {})
      await reload()
      setOpen(`question:${r.id}`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not add a question')
    } finally {
      setBusy(false)
    }
  }
  const newCoding = async () => {
    setBusy(true)
    try {
      const r = await api.post<{ id: number }>(`/api/hosted/${id}/coding-problem`)
      await reload()
      const p = await api.get<{ problem: CustomProblem }>(`/api/custom-problems/${r.id}`)
      setEditingWs(p.problem)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not add a problem')
    } finally {
      setBusy(false)
    }
  }
  const remove = async (it: Item) => {
    if (it.kind === 'question') {
      try {
        await api.delete(`/api/hosted/${id}/questions/${it.ref}`)
        await reload()
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Could not remove it')
      }
    } else await push(items.filter((x) => x !== it))
  }
  const move = (i: number, d: -1 | 1) => {
    const next = [...items]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    void push(next)
  }

  return (
    <section aria-label="Questions">
      {locked && (
        <p className="hc-banner" role="note">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" /> Someone has started, so the questions are fixed. You can still change the title, the description and the rules for the marks list.
        </p>
      )}
      {items.length === 0 ? (
        <div className="hc-box">
          <h2>Add the first question</h2>
          <p className="hc-note">Mix coding problems and GATE-style questions in one contest. Coding is solved on the Solve page; the GATE-style questions are answered once, in the exam console.</p>
        </div>
      ) : (
        <>
          <ol className="hc-list" aria-label="Questions in this contest">
            {items.map((it, i) => {
              const key = `${it.kind}:${it.ref}`
              const coding = CODING.has(it.kind)
              return (
                <li key={key} className="hc-item" style={{ alignItems: 'start' }}>
                  <span className="hc-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    {it.link && !it.missing ? (
                      <Link to={it.link} className="hc-title">
                        {it.title}
                      </Link>
                    ) : (
                      <span className="hc-title">{it.title}</span>
                    )}
                    <span className="hc-sub">
                      <span>{coding ? 'Coding' : KIND_LABEL[it.kind]}</span>
                      {it.type && <span>{TYPE_LABEL[it.type]}</span>}
                      {it.source && <span>{it.source}</span>}
                      {it.missing && <span className="text-state-error">Removed: take it out</span>}
                      {!!it.problems?.length && <span className="text-state-warning">Still needs {it.problems.join(', ')}</span>}
                    </span>
                    {open === key && it.question && (
                      <QuestionEditor
                        contestId={id}
                        qid={it.ref}
                        initial={it.question}
                        disabled={locked}
                        onSaved={() => void reload()}
                      />
                    )}
                  </div>
                  <div className="hc-side">
                    {it.kind !== 'question' && (
                      <label className="flex items-center gap-1.5 text-[12.5px] text-text-secondary">
                        Marks
                        <input
                          className="hc-marks-in"
                          type="number"
                          min={0.25}
                          max={1000}
                          step={0.25}
                          value={it.marks}
                          disabled={locked}
                          aria-label={`Marks for question ${i + 1}`}
                          onChange={(e) => void push(items.map((x) => (x === it ? { ...x, marks: Number(e.target.value) || 0 } : x)), true)}
                        />
                      </label>
                    )}
                    {it.kind === 'question' && <span className="hc-state">{marksOf(it.marks)}</span>}
                    {it.kind === 'question' && (
                      <Button size="sm" variant={open === key ? 'secondary' : 'outline'} onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key} aria-label={`${open === key ? 'Done editing' : 'Edit'} question ${i + 1}`}>
                        <Pencil /> {open === key ? 'Done' : 'Edit'}
                      </Button>
                    )}
                    {it.kind === 'workshop' && it.editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`Edit problem ${i + 1}`}
                        disabled={locked}
                        onClick={async () => {
                          try {
                            const p = await api.get<{ problem: CustomProblem }>(`/api/custom-problems/${it.ref}`)
                            setEditingWs(p.problem)
                          } catch (e) {
                            toast.error(e instanceof ApiError ? e.message : 'Could not open it')
                          }
                        }}
                      >
                        <Pencil /> Edit
                      </Button>
                    )}
                    <button type="button" className="hc-icon-btn" onClick={() => move(i, -1)} disabled={locked || i === 0} aria-label={`Move question ${i + 1} up`}>
                      <ArrowUp />
                    </button>
                    <button type="button" className="hc-icon-btn" onClick={() => move(i, 1)} disabled={locked || i === items.length - 1} aria-label={`Move question ${i + 1} down`}>
                      <ArrowDown />
                    </button>
                    <button type="button" className="hc-icon-btn" onClick={() => void remove(it)} disabled={locked} aria-label={`Remove question ${i + 1}`}>
                      <Trash2 />
                    </button>
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="hc-note mt-2">Total {marksOf(total)}.</p>
        </>
      )}

      {!locked && (
        <div className="hc-add" role="group" aria-label="Add a question">
          <button type="button" className="hc-add-btn" onClick={() => setPicker('problem')}>
            <Code2 aria-hidden="true" />
            <span>
              <strong>A coding problem</strong>
              <span>From the problem catalog</span>
            </span>
          </button>
          <button type="button" className="hc-add-btn" onClick={() => void newCoding()} disabled={busy}>
            <FilePlus2 aria-hidden="true" />
            <span>
              <strong>Write a coding problem</strong>
              <span>Statement, samples, hidden tests, editorial</span>
            </span>
          </button>
          <button type="button" className="hc-add-btn" onClick={() => setPicker('gate')}>
            <BookOpen aria-hidden="true" />
            <span>
              <strong>A GATE past-paper question</strong>
              <span>With its official answer</span>
            </span>
          </button>
          <button type="button" className="hc-add-btn" onClick={() => void newQuestion()} disabled={busy}>
            <Pencil aria-hidden="true" />
            <span>
              <strong>Write a GATE-style question</strong>
              <span>MCQ, MSQ or NAT, marks, figures, solution</span>
            </span>
          </button>
          <button type="button" className="hc-add-btn" onClick={() => setPicker('workshop')}>
            <ListChecks aria-hidden="true" />
            <span>
              <strong>One of your Workshop problems</strong>
              <span>Problems you wrote before</span>
            </span>
          </button>
        </div>
      )}

      {picker && <ItemPicker open kind={picker} me={me} have={have} onClose={() => setPicker(null)} onPick={add} />}
      <ProblemFormModal
        open={!!editingWs}
        me={me}
        editing={editingWs}
        onClose={() => setEditingWs(null)}
        onSaved={() => void reload()}
      />
    </section>
  )
}

/* ── timing and rules ── */

function RulesTab({ view, reload }: { view: ContestView; reload: () => Promise<void> }) {
  const toast = useToast()
  const c = view.contest
  const id = c.id
  const started = !!view.locked
  const [s, setS] = useState<Settings>(c.settings)
  const [start, setStart] = useState(toLocal(c.startTime))
  const [dur, setDur] = useState(String(c.durationMins))
  const [desc, setDesc] = useState(c.description || '')
  const [max, setMax] = useState(String(c.maxParticipants ?? 500))
  const [pass, setPass] = useState('')
  const [saved, setSaved] = useState<'saved' | 'saving' | 'failed'>('saved')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = (body: Record<string, unknown>, soon = false) => {
    const send = async () => {
      setSaved('saving')
      try {
        await api.put(`/api/hosted/${id}`, body)
        setSaved('saved')
        void reload()
      } catch (e) {
        setSaved('failed')
        toast.error(e instanceof ApiError ? e.message : 'Could not save')
      }
    }
    if (timer.current) clearTimeout(timer.current)
    if (soon) timer.current = setTimeout(() => void send(), 700)
    else void send()
  }
  const setting = (patch: Partial<Settings>) => {
    const next = { ...s, ...patch }
    setS(next)
    save({ settings: next })
  }

  return (
    <section className="hc-form" aria-label="Timing and rules">
      <p role="status" aria-live="polite" className="hc-note">
        {saved === 'saving' ? 'Saving…' : saved === 'failed' ? 'Not saved: check the values' : 'Every change is saved.'}
      </p>

      <div className="hc-box hc-form">
        <h2>When</h2>
        <fieldset className="hc-choice" disabled={started}>
          <legend>How the time works</legend>
          <label className="hc-radio">
            <input type="radio" name="mode" checked={s.mode === 'fixed'} onChange={() => setting({ mode: 'fixed' })} />
            <span>
              <strong>Everyone together</strong>
              <span>It starts at the start time and ends for everyone after the duration. Best for a class test or a live round.</span>
            </span>
          </label>
          <label className="hc-radio">
            <input type="radio" name="mode" checked={s.mode === 'window'} onChange={() => setting({ mode: 'window' })} />
            <span>
              <strong>Any time in a window</strong>
              <span>Open from the start time until a closing time. Each person gets the duration from when they press Start (cut short at the close).</span>
            </span>
          </label>
        </fieldset>
        <div className="hc-grid2">
          <Field label={s.mode === 'window' ? 'Opens at' : 'Starts at'} hint={started ? 'Fixed now that it has started.' : `Your time zone (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}>
            <Input
              type="datetime-local"
              value={start}
              disabled={started}
              onChange={(e) => {
                setStart(e.target.value)
                const iso = fromLocal(e.target.value)
                if (iso) save({ startTime: iso }, true)
              }}
            />
          </Field>
          <Field label="Duration, in minutes" hint={Number(dur) >= 5 ? duration(Number(dur)) : 'At least 5 minutes'}>
            <Input
              type="number"
              min={5}
              max={10080}
              value={dur}
              disabled={started}
              onChange={(e) => {
                setDur(e.target.value)
                if (Number(e.target.value) >= 5) save({ durationMins: Number(e.target.value) }, true)
              }}
            />
          </Field>
          {s.mode === 'window' && (
            <Field label="Closes at" hint="Nobody can start or answer after this.">
              <Input type="datetime-local" value={toLocal(s.endTime)} onChange={(e) => setting({ endTime: fromLocal(e.target.value) })} />
            </Field>
          )}
        </div>
      </div>

      <div className="hc-box hc-form">
        <h2>Who can join</h2>
        <fieldset className="hc-choice">
          <legend className="sr-only">Who can join</legend>
          <label className="hc-radio">
            <input type="radio" name="access" checked={s.access === 'link'} onChange={() => setting({ access: 'link' })} />
            <span>
              <strong>Anyone with the link</strong>
              <span>Signed-in people who open the link or type the code.</span>
            </span>
          </label>
          <label className="hc-radio">
            <input type="radio" name="access" checked={s.access === 'password'} onChange={() => setting({ access: 'password' })} />
            <span>
              <strong>The link and a password</strong>
              <span>For a class: share the password with your students only.</span>
            </span>
          </label>
        </fieldset>
        {s.access === 'password' && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[14rem] flex-1">
              <Field label={c.hasPassword ? 'Change the password' : 'Password'} hint={c.hasPassword ? 'A password is set. Type a new one to change it.' : 'At least 4 characters.'}>
                <Input type="text" autoComplete="off" value={pass} onChange={(e) => setPass(e.target.value)} />
              </Field>
            </div>
            <Button
              variant="outline"
              disabled={pass.length < 4}
              onClick={() => {
                save({ password: pass })
                setPass('')
              }}
            >
              Save password
            </Button>
          </div>
        )}
        <div className="w-48">
          <Field label="Most people">
            <Input
              type="number"
              min={2}
              max={5000}
              value={max}
              onChange={(e) => {
                setMax(e.target.value)
                save({ maxParticipants: Number(e.target.value) }, true)
              }}
            />
          </Field>
        </div>
      </div>

      <div className="hc-box hc-form">
        <h2>Marks and answers</h2>
        <fieldset className="hc-choice">
          <legend>The marks list</legend>
          {(
            [
              ['live', 'Live for everyone', 'Everyone sees the ranking as it changes. Good for a coding round.'],
              ['after', 'After the contest ends', 'Hidden while it runs, then shown to everyone.'],
              ['hidden', 'Only you', 'For a class test: each person sees only their own result; you see everyone, with analysis and a CSV.'],
            ] as const
          ).map(([v, t, d]) => (
            <label key={v} className="hc-radio">
              <input type="radio" name="standings" checked={s.standings === v} onChange={() => setting({ standings: v })} />
              <span>
                <strong>{t}</strong>
                <span>{d}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="hc-choice">
          <legend>Right answers and solutions</legend>
          <label className="hc-radio">
            <input type="radio" name="review" checked={s.review === 'after_end'} onChange={() => setting({ review: 'after_end' })} />
            <span>
              <strong>After the contest ends</strong>
              <span>Nobody can pass the answers on while others are still sitting it.</span>
            </span>
          </label>
          <label className="hc-radio">
            <input type="radio" name="review" checked={s.review === 'after_finish'} onChange={() => setting({ review: 'after_finish' })} />
            <span>
              <strong>As soon as each person finishes</strong>
              <span>Faster feedback; fine when everyone sits it at once.</span>
            </span>
          </label>
        </fieldset>
        <label className="hc-check">
          <input type="checkbox" checked={s.negativeMarking} onChange={(e) => setting({ negativeMarking: e.target.checked })} />
          Past-paper MCQs lose a third of their marks when wrong (the GATE rule)
        </label>
        <div className="w-60">
          <Field label="Coding: minutes added per wrong try" hint="Ties on marks are broken by time plus this penalty.">
            <Input type="number" min={0} max={120} value={s.penaltyMins} onChange={(e) => setting({ penaltyMins: Number(e.target.value) || 0 })} />
          </Field>
        </div>
      </div>

      <div className="hc-box hc-form">
        <h2>Description</h2>
        <Field label="What people see before they start" hint="Markdown. Say what is allowed (calculator, notes) and anything else they should know.">
          <Textarea
            rows={5}
            value={desc}
            onChange={(e) => {
              setDesc(e.target.value)
              save({ description: e.target.value }, true)
            }}
          />
        </Field>
      </div>
    </section>
  )
}

/* ── share and publish ── */

function ShareTab({ view, reload, onDeleted }: { view: ContestView; reload: () => Promise<void>; onDeleted: () => void }) {
  const toast = useToast()
  const c = view.contest
  const [missing, setMissing] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const url = `${window.location.origin}${contestUrl(c.code)}`
  useEffect(() => {
    let live = true
    api
      .get<{ missing: string[] }>(`/api/hosted/${c.id}/check`)
      .then((r) => live && setMissing(r.missing))
      .catch(() => live && setMissing([]))
    return () => {
      live = false
    }
  }, [c.id, view])

  const act = async (path: 'publish' | 'unpublish') => {
    setBusy(true)
    try {
      await api.post(`/api/hosted/${c.id}/${path}`)
      toast.success(path === 'publish' ? 'Published: share the link' : 'Back to a draft')
      await reload()
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not do that')
    } finally {
      setBusy(false)
    }
  }
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${what} copied`)
    } catch {
      toast.info(text)
    }
  }

  return (
    <section aria-label="Share and publish">
      <div className="hc-box">
        <h2>{c.status === 'draft' ? 'Ready to publish?' : 'Published'}</h2>
        {c.status === 'draft' ? (
          missing === null ? (
            <LoadingBlock rows={2} />
          ) : missing.length ? (
            <>
              <p className="hc-note">Still needed before people can join:</p>
              <ul className="hc-todo">
                {missing.map((m) => (
                  <li key={m}>
                    <CircleAlert className="text-state-warning" aria-hidden="true" /> {m}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="hc-note">Everything is in place. Publishing lets people join with the link; the questions stay hidden until it starts.</p>
          )
        ) : (
          <p className="hc-note">People can join with the link{c.settings.access === 'password' ? ' and the password' : ''}. The questions stay hidden until it starts.</p>
        )}
        <div className="hc-actions mt-3">
          {c.status === 'draft' ? (
            <Button onClick={() => void act('publish')} loading={busy} disabled={!!missing?.length}>
              <Check /> Publish
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void act('unpublish')} loading={busy}>
              Back to a draft
            </Button>
          )}
        </div>
      </div>

      <div className="hc-box">
        <h2>The link</h2>
        <div className="hc-link mt-2">
          <code>{url}</code>
          <Button variant="outline" size="sm" onClick={() => void copy(url, 'Link')}>
            <Copy /> Copy link
          </Button>
          <Button variant="outline" size="sm" onClick={() => void copy(c.code, 'Code')}>
            <Copy /> Copy code {c.code}
          </Button>
        </div>
        <p className="hc-note mt-2">People can also type the code under Contests → Join with a code. You can share the link in Messages too.</p>
      </div>

      <div className="hc-box">
        <h2>Delete</h2>
        <p className="hc-note">This removes the contest, everyone's answers and runs, and the marks. It cannot be undone.</p>
        <Button className="mt-3" variant="outline" onClick={() => setConfirm(true)}>
          <Trash2 /> Delete the contest
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await api.delete(`/api/hosted/${c.id}`)
            onDeleted()
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Could not delete it')
          }
        }}
        title="Delete this contest?"
        message={`“${c.title}”, its answers and its marks will be gone for good.`}
        confirmLabel="Delete"
        danger
      />
    </section>
  )
}
