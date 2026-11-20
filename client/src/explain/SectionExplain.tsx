/*
  "Explain" beside every subtopic (h2) of a lesson: a small mark with the
  number of explanations for that part. It opens a side sheet (a bottom sheet
  on a phone) with that part's videos and a way to add one: record here,
  upload a video, or explain on an iPad by QR.

  The marks are placed into the lesson's headings after it renders (so the
  same code serves the GATE notes, whose headings we draw, and the DSA
  lessons, whose headings come from Markdown). Their label is drawn by CSS,
  so the heading's text — what the outline, read-aloud and highlights see —
  stays the heading alone.
*/
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Video, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { explainApi, type ExplainKind } from './api'
import './explain.css'

const ExplainVideos = lazy(() => import('./ExplainVideos').then((m) => ({ default: m.ExplainVideos })))

export type ExplainSection = { /** the heading's DOM id */ dom: string; /** its id in the target ("<lesson>#<key>") */ key: string; text: string }

export function SectionExplain({ root, kind, base, about, sections }: { root: RefObject<HTMLElement | null>; kind: ExplainKind; base: string; about: string; sections: ExplainSection[] }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [slots, setSlots] = useState<[ExplainSection, HTMLElement][]>([])
  const [open, setOpen] = useState<ExplainSection | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const sig = `${base}|${sections.map((s) => s.dom).join('|')}`

  const load = useCallback(() => {
    explainApi
      .counts(kind, base)
      .then(setCounts)
      .catch(() => setCounts({}))
  }, [kind, base])
  useEffect(load, [load])

  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const made: [ExplainSection, HTMLElement][] = []
    for (const s of sections) {
      const h = el.querySelector<HTMLElement>(`#${CSS.escape(s.dom)}`)
      if (!h || h.querySelector(':scope > .ex-sec-slot')) continue
      const slot = document.createElement('span')
      slot.className = 'ex-sec-slot'
      h.appendChild(slot)
      made.push([s, slot])
    }
    setSlots(made)
    return () => made.forEach(([, slot]) => slot.remove())
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => {
    setOpen(null)
    load()
    window.setTimeout(() => opener.current?.focus(), 0)
  }

  return (
    <>
      {slots.map(([s, slot]) => {
        const n = counts[s.key] ?? 0
        return createPortal(
          <button
            type="button"
            className={cn('ex-sec', n > 0 && 'has-videos')}
            data-label={n > 0 ? String(n) : 'Explain'}
            aria-label={n > 0 ? `${n === 1 ? '1 explanation' : `${n} explanations`} of “${s.text}”` : `Explain “${s.text}”: record or watch explanations`}
            title={n > 0 ? 'Watch or add an explanation of this part' : 'Explain this part: record, upload or use your iPad'}
            onClick={(e) => {
              opener.current = e.currentTarget
              setOpen(s)
            }}
          >
            <Video className="size-3.5" aria-hidden="true" />
          </button>,
          slot,
          s.key,
        )
      })}
      {open && <Sheet kind={kind} target={`${base}#${open.key}`} about={`${about} · ${open.text}`} title={open.text} onClose={close} />}
    </>
  )
}

function Sheet({ kind, target, about, title, onClose }: { kind: ExplainKind; target: string; about: string; title: string; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    closeBtn.current?.focus()
    const key = (e: KeyboardEvent) => {
      // The studio (opened from here) handles its own keys.
      if (document.querySelector('.ex-studio, .ex-viewer')) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && panel.current) {
        const f = [...panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((x) => !x.hasAttribute('disabled'))
        if (!f.length) return
        const first = f[0]
        const last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return createPortal(
    <>
      <div className="ex-sheet-back" onClick={onClose} aria-hidden="true" />
      <div ref={panel} className="ex-sheet" role="dialog" aria-modal="true" aria-labelledby="ex-sheet-title">
        <div className="ex-sheet-head">
          <div className="min-w-0">
            <p className="ed-label m-0">Explanations of this part</p>
            <h2 id="ex-sheet-title" className="ex-sheet-title">
              {title}
            </h2>
          </div>
          <button ref={closeBtn} type="button" className="nr-icon" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="ex-sheet-body">
          <Suspense fallback={<p className="lv-hint">Loading…</p>}>
            <ExplainVideos kind={kind} target={target} about={about} />
          </Suspense>
        </div>
      </div>
    </>,
    document.body,
  )
}
