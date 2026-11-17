import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react'
import { Button, Field, Input, Select, Textarea, useToast } from '@/components/ui'
import { Markdown } from '@/learn/md'
import { api, ApiError } from '@/lib/api'
import { TYPE_LABEL, type OwnQuestion, type QType } from './api'

const LETTERS = 'ABCDEFGH'

/*
  One question written for a contest: MCQ (one answer), MSQ (one or more)
  or NAT (a number, or a range), with its own marks and negative marks,
  figures, and a worked solution. Text is Markdown with $maths$. It saves
  itself a moment after you stop typing.
*/
export function QuestionEditor({
  contestId,
  qid,
  initial,
  disabled,
  onSaved,
}: {
  contestId: number
  qid: string
  initial: OwnQuestion
  disabled?: boolean
  onSaved: (q: OwnQuestion, problems: string[]) => void
}) {
  const toast = useToast()
  const [q, setQ] = useState<OwnQuestion>(initial)
  const [state, setState] = useState<'saved' | 'saving' | 'unsaved' | 'failed'>('saved')
  const [uploading, setUploading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(q)
  const file = useRef<HTMLInputElement>(null)
  const id = `q${qid}`

  const save = async () => {
    setState('saving')
    try {
      const r = await api.put<{ question: OwnQuestion; problems: string[] }>(`/api/hosted/${contestId}/questions/${qid}`, { data: latest.current })
      setState('saved')
      onSaved(r.question, r.problems)
    } catch (e) {
      setState('failed')
      toast.error(e instanceof ApiError ? e.message : 'Could not save the question')
    }
  }
  const change = (patch: Partial<OwnQuestion>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setQ(next)
    setState('unsaved')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(), 800)
  }
  // Save what is left when the editor closes.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current)
        void api.put(`/api/hosted/${contestId}/questions/${qid}`, { data: latest.current }).catch(() => {})
      }
    },
    [contestId, qid],
  )

  const setType = (type: QType) => {
    if (type === q.type) return
    change({
      type,
      answer: type === 'NAT' ? { min: 0, max: 0 } : type === 'MSQ' ? [] : null,
      options: type === 'NAT' ? [] : q.options.length >= 2 ? q.options : ['', '', '', ''],
      negative: type === 'MCQ' ? Math.round((q.marks / 3) * 100) / 100 : 0,
    })
  }
  const nat = q.type === 'NAT' && q.answer && typeof q.answer === 'object' && !Array.isArray(q.answer) ? q.answer : { min: 0, max: 0 }
  const picked = (l: string) => (q.type === 'MSQ' ? Array.isArray(q.answer) && q.answer.includes(l) : q.answer === l)
  const pick = (l: string) => {
    if (q.type === 'MSQ') {
      const cur = Array.isArray(q.answer) ? q.answer : []
      change({ answer: cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l].sort() })
    } else change({ answer: l })
  }

  const upload = async (f: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const r = await api.post<{ url: string }>(`/api/hosted/${contestId}/image`, fd, { timeoutMs: 60000 })
      change({ figures: [...q.figures, { url: r.url, alt: f.name.replace(/\.[a-z]+$/i, '') }] })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not upload the picture')
    } finally {
      setUploading(false)
      if (file.current) file.current.value = ''
    }
  }

  return (
    <fieldset className="hc-q" disabled={disabled}>
      <legend className="sr-only">Edit the question</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem]">
          <Field label="Kind of answer">
            <Select value={q.type} onValueChange={(v) => setType(v as QType)} aria-label="Kind of answer">
              {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
                <option key={t} value={t}>
                  {t} · {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-28">
          <Field label="Marks">
            <Input type="number" min={0.25} max={100} step={0.25} value={q.marks} onChange={(e) => change({ marks: Number(e.target.value) || 1 })} />
          </Field>
        </div>
        <div className="w-36">
          <Field label="Wrong answer loses">
            <Input type="number" min={0} max={q.marks} step={0.01} value={q.negative} onChange={(e) => change({ negative: Math.max(0, Number(e.target.value) || 0) })} />
          </Field>
        </div>
        <span role="status" aria-live="polite" className="hc-note ml-auto">
          {state === 'saving' ? 'Saving…' : state === 'unsaved' ? 'Not saved yet' : state === 'failed' ? 'Not saved' : 'Saved'}
        </span>
      </div>

      <div className="hc-grid2">
        <Field label="Question" hint="Markdown, with $maths$ like $x^2$ or $$\\sum_i i$$">
          <Textarea id={`${id}-text`} rows={6} value={q.text} onChange={(e) => change({ text: e.target.value })} placeholder="Write the question" />
        </Field>
        <div>
          <span className="mb-1 block text-sm font-medium text-text-primary">Preview</span>
          <div className="hc-preview">{q.text.trim() ? <Markdown md={q.text} /> : <p className="hc-note">The question shows here as people will see it.</p>}</div>
        </div>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-text-primary">Figures</span>
        <div className="hc-figs">
          {q.figures.map((f, i) => (
            <figure key={f.url} className="hc-fig m-0">
              <img src={f.url} alt={f.alt || `Figure ${i + 1}`} />
              <button type="button" className="hc-icon-btn" aria-label={`Remove figure ${i + 1}`} onClick={() => change({ figures: q.figures.filter((_, j) => j !== i) })}>
                <X />
              </button>
            </figure>
          ))}
          {q.figures.length < 6 && (
            <>
              <input ref={file} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
              <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Add a figure
              </Button>
            </>
          )}
        </div>
        <p className="hc-note mt-1">PNG, JPEG, GIF or WebP, up to 2 MB. Shown under the question.</p>
      </div>

      {q.type === 'NAT' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <Field label="Correct answer">
              <Input type="number" step="any" value={nat.min} onChange={(e) => change({ answer: { min: Number(e.target.value), max: Math.max(Number(e.target.value), nat.max) } })} />
            </Field>
          </div>
          <div className="w-36">
            <Field label="Up to (for a range)">
              <Input type="number" step="any" value={nat.max} onChange={(e) => change({ answer: { min: nat.min, max: Number(e.target.value) } })} />
            </Field>
          </div>
          <p className="hc-note pb-2">Any answer from the first number to the second is right.</p>
        </div>
      ) : (
        <fieldset className="hc-choice">
          <legend>Options · tick the {q.type === 'MSQ' ? 'right ones' : 'right one'}</legend>
          {q.options.map((o, i) => {
            const l = LETTERS[i]
            return (
              <div key={i} className="hc-opt">
                <input
                  type={q.type === 'MSQ' ? 'checkbox' : 'radio'}
                  name={`${id}-right`}
                  checked={picked(l)}
                  onChange={() => pick(l)}
                  aria-label={`Option ${l} is right`}
                  className="accent-[var(--color-text-primary)]"
                />
                <span className="hc-opt-l" aria-hidden="true">
                  {l}
                </span>
                <Input value={o} onChange={(e) => change({ options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Option ${l}`} placeholder={`Option ${l}`} />
                <button
                  type="button"
                  className="hc-icon-btn"
                  aria-label={`Remove option ${l}`}
                  disabled={q.options.length <= 2}
                  onClick={() => {
                    const options = q.options.filter((_, j) => j !== i)
                    // Answers after the removed option move up one letter.
                    const shift = (x: string) => (LETTERS.indexOf(x) > i ? LETTERS[LETTERS.indexOf(x) - 1] : x)
                    const answer = Array.isArray(q.answer) ? q.answer.filter((x) => x !== l).map(shift) : q.answer === l ? null : typeof q.answer === 'string' ? shift(q.answer) : q.answer
                    change({ options, answer })
                  }}
                >
                  <Trash2 />
                </button>
              </div>
            )
          })}
          {q.options.length < LETTERS.length && (
            <Button type="button" variant="ghost" size="sm" className="justify-self-start" onClick={() => change({ options: [...q.options, ''] })}>
              <Plus /> Add an option
            </Button>
          )}
        </fieldset>
      )}

      <Field label="Solution" hint="Shown with the answer when people may review (after they finish, or after the contest ends).">
        <Textarea rows={4} value={q.solution} onChange={(e) => change({ solution: e.target.value })} placeholder="Explain the steps" />
      </Field>
    </fieldset>
  )
}
