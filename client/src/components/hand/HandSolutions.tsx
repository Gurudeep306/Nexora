import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Modal, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { encodeQr, qrArt } from '@/components/profile/qr'
import { timeAgo } from '@/gate/insights/format'
import { handApi, shrinkPhoto, type HandKind, type HandMode, type HandSolution } from './api'
import './hand-panel.css'

/*
  Handwritten working on a question: the panel under the question card.

  "Add handwritten work" offers three ways in:
    - Write on a tablet  → a QR / link opens the writing pad there (/pad/…),
                           and this page shows a live view while you write;
    - Photo with a phone → a QR / link opens the camera page (/snap/…);
    - Upload             → pick photos or scans on this device.
  Whatever arrives shows here at once. Each solution is private until you
  share it; shared ones from others appear only after you have answered, so
  they never give the answer away, most helpful first.
*/

const SOURCE: Record<HandSolution['source'], string> = { pad: 'Tablet', photo: 'Phone photo', upload: 'Upload' }

export function HandSolutions({ kind, target, revealed, openSignal = 0 }: { kind: HandKind; target: string; revealed: boolean; openSignal?: number }) {
  const toast = useToast()
  const [mine, setMine] = useState<HandSolution[]>([])
  const [community, setCommunity] = useState<HandSolution[]>([])
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<HandSolution | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await handApi.list(kind, target)
      setMine(r.mine)
      setCommunity(r.community)
    } catch {
      /* the panel stays quiet; adding still works */
    } finally {
      setLoaded(true)
    }
  }, [kind, target])
  useEffect(() => {
    void load()
  }, [load])
  // The small "Write by hand" button on the question card opens the same choices.
  useEffect(() => {
    if (openSignal > 0) setAdding(true)
  }, [openSignal])

  const patchMine = (s: HandSolution) => {
    setMine((cur) => cur.map((x) => (x.id === s.id ? { ...x, ...s } : x)))
    setViewing((v) => (v && v.id === s.id ? { ...v, ...s } : v))
  }
  const removeMine = async (s: HandSolution) => {
    if (!confirm('Delete this handwritten solution? This cannot be undone.')) return
    try {
      await handApi.remove(s.id)
      setMine((cur) => cur.filter((x) => x.id !== s.id))
      setViewing(null)
    } catch (e) {
      toast.error('Could not delete it', (e as Error).message)
    }
  }
  const setVisibility = async (s: HandSolution, visibility: 'private' | 'public') => {
    try {
      const r = await handApi.update(s.id, { visibility })
      patchMine(r.solution)
      toast.success(visibility === 'public' ? 'Shared with everyone' : 'Only you can see it now')
    } catch (e) {
      toast.error('Could not change who sees it', (e as Error).message)
    }
  }
  const vote = async (s: HandSolution) => {
    try {
      const r = await handApi.vote(s.id, !s.voted)
      const next = { ...s, votes: r.votes, voted: r.voted }
      setCommunity((cur) => cur.map((x) => (x.id === s.id ? next : x)))
      setViewing((v) => (v && v.id === s.id ? next : v))
    } catch (e) {
      toast.error('Could not save your vote', (e as Error).message)
    }
  }

  const shared = revealed ? community : []
  const hiddenCount = revealed ? 0 : community.length

  return (
    <section className="hs-panel" aria-labelledby={`hs-${target}`}>
      <header className="hs-head">
        <div className="min-w-0">
          <h3 id={`hs-${target}`} className="hs-title">
            Handwritten working
          </h3>
          <p className="hs-sub">Solve it on paper or a tablet and keep your working with the question.</p>
        </div>
        <button type="button" className="hs-add" onClick={() => setAdding(true)}>
          <Icon name="edit" className="size-4" aria-hidden="true" /> Add handwritten work
        </button>
      </header>

      {loaded && mine.length === 0 && shared.length === 0 && (
        <button type="button" className="hs-empty" onClick={() => setAdding(true)}>
          <span className="hs-empty-art" aria-hidden="true">
            <svg viewBox="0 0 64 48">
              <rect x="6" y="4" width="34" height="40" rx="4" />
              <path d="M12 14h22M12 21h22M12 28h14" />
              <path d="m44 36 12-22 4 2-12 22-5 2z" />
            </svg>
          </span>
          <span>
            <strong>Write it by hand.</strong> Use an iPad or drawing tablet, take a photo of your paper with your phone, or upload a scan.
          </span>
        </button>
      )}

      {mine.length > 0 && (
        <>
          <p className="hs-k">Yours</p>
          <ul className="hs-grid">
            {mine.map((s) => (
              <li key={s.id}>
                <Card s={s} onOpen={() => setViewing(s)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {shared.length > 0 && (
        <>
          <p className="hs-k">Shared by others · most helpful first</p>
          <ul className="hs-grid">
            {shared.map((s) => (
              <li key={s.id}>
                <Card s={s} onOpen={() => setViewing(s)} onVote={() => void vote(s)} />
              </li>
            ))}
          </ul>
        </>
      )}
      {hiddenCount > 0 && (
        <p className="hs-later">
          {hiddenCount} {hiddenCount === 1 ? 'member has' : 'members have'} shared their working. It appears here once you have answered, so it can't give the answer away.
        </p>
      )}

      {adding && (
        <AddDialog
          kind={kind}
          target={target}
          onClose={() => setAdding(false)}
          onAdded={() => {
            void load()
            toast.success('Handwritten work added', 'It is private. Open it to share it with everyone.')
          }}
        />
      )}
      {viewing && (
        <Viewer
          s={viewing}
          onClose={() => setViewing(null)}
          onVisibility={(v) => void setVisibility(viewing, v)}
          onCaption={async (note) => {
            try {
              patchMine((await handApi.update(viewing.id, { note })).solution)
            } catch (e) {
              toast.error('Could not save the caption', (e as Error).message)
            }
          }}
          onDelete={() => void removeMine(viewing)}
          onVote={() => void vote(viewing)}
        />
      )}
    </section>
  )
}

function Card({ s, onOpen, onVote }: { s: HandSolution; onOpen: () => void; onVote?: () => void }) {
  const who = s.author ? s.author.displayName || s.author.username : null
  return (
    <article className="hs-card">
      <button type="button" className="hs-thumb" onClick={onOpen} aria-label={`Open ${who ? `${who}'s` : 'your'} handwritten solution, ${s.images.length} ${s.images.length === 1 ? 'page' : 'pages'}`}>
        <img src={s.images[0]} alt="" loading="lazy" />
        {s.images.length > 1 && <span className="hs-pages">{s.images.length} pages</span>}
      </button>
      <div className="hs-meta">
        {s.author ? (
          <span className="hs-who">
            <Avatar seed={s.author.username} avatar={s.author.avatar ?? undefined} src={s.author.avatarUrl ?? undefined} name={who ?? ''} size="xs" ring={false} />
            <span className="truncate">{who}</span>
          </span>
        ) : (
          <span className={cn('hs-vis', s.visibility === 'public' && 'is-public')}>
            <Icon name={s.visibility === 'public' ? 'globe' : 'lock'} className="size-3" aria-hidden="true" />
            {s.visibility === 'public' ? 'Shared' : 'Private'}
          </span>
        )}
        <span className="hs-when">
          {SOURCE[s.source]} · {timeAgo(s.createdAt)}
        </span>
        {onVote ? (
          <button type="button" className={cn('hs-vote', s.voted && 'is-on')} onClick={onVote} aria-pressed={s.voted} aria-label={`Helpful, ${s.votes} ${s.votes === 1 ? 'vote' : 'votes'}`}>
            <Icon name="heart" className="size-3.5" aria-hidden="true" /> {s.votes}
          </button>
        ) : (
          s.visibility === 'public' && s.votes > 0 && (
            <span className="hs-vote is-static">
              <Icon name="heart" className="size-3.5" aria-hidden="true" /> {s.votes}
            </span>
          )
        )}
      </div>
      {s.note && <p className="hs-note">{s.note}</p>}
    </article>
  )
}

/* ── Adding: tablet, phone or upload ─────────────────────────────────────── */

type Step = { mode: HandMode; url: string; token: string; expiresAt: number } | null

function AddDialog({ kind, target, onClose, onAdded }: { kind: HandKind; target: string; onClose: () => void; onAdded: () => void }) {
  const toast = useToast()
  const [step, setStep] = useState<Step>(null)
  const [busy, setBusy] = useState<HandMode | 'upload' | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const open = async (mode: HandMode) => {
    setBusy(mode)
    try {
      const r = await handApi.link(kind, target, mode)
      setStep({ mode, token: r.token, url: `${window.location.origin}${r.path}`, expiresAt: r.expiresAt })
    } catch (e) {
      toast.error('Could not make a link', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('upload')
    try {
      const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 8)
      if (!list.length) throw new Error('Choose photos or scans (JPG, PNG or WebP).')
      const images = []
      for (const f of list) images.push(await shrinkPhoto(f))
      await handApi.upload(kind, target, images)
      onAdded()
      onClose()
    } catch (e) {
      toast.error('Could not upload', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal open onClose={onClose} size={step ? 'lg' : 'md'} title={step ? (step.mode === 'pad' ? 'Write on your tablet' : 'Take a photo with your phone') : 'Add handwritten work'}>
      {!step ? (
        <div className="hs-ways">
          <button type="button" className="hs-way" onClick={() => void open('pad')} disabled={!!busy}>
            <WayArt kind="pad" />
            <span className="min-w-0">
              <strong>Write on a tablet</strong>
              <span>iPad, Android tablet or drawing pad. Pens, colours, paper and pages, with the question beside you.</span>
            </span>
            <Icon name="external" className="hs-way-go size-4" aria-hidden="true" />
          </button>
          <button type="button" className="hs-way" onClick={() => void open('photo')} disabled={!!busy}>
            <WayArt kind="photo" />
            <span className="min-w-0">
              <strong>Photo with your phone</strong>
              <span>Solved on paper? Scan the code and take a photo of each page.</span>
            </span>
            <Icon name="external" className="hs-way-go size-4" aria-hidden="true" />
          </button>
          <button type="button" className="hs-way" onClick={() => file.current?.click()} disabled={!!busy}>
            <WayArt kind="upload" />
            <span className="min-w-0">
              <strong>{busy === 'upload' ? 'Uploading…' : 'Upload from this device'}</strong>
              <span>Photos or scans you already have, up to 8 pages.</span>
            </span>
            <Icon name="upload" className="hs-way-go size-4" aria-hidden="true" />
          </button>
          <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => (void upload(e.target.files), (e.target.value = ''))} />
          <p className="hs-fine">Everything you add is private until you choose to share it.</p>
        </div>
      ) : (
        <LinkStep step={step} onBack={() => setStep(null)} onSent={() => (onAdded(), onClose())} />
      )}
    </Modal>
  )
}

function LinkStep({ step, onBack, onSent }: { step: NonNullable<Step>; onBack: () => void; onSent: () => void }) {
  const toast = useToast()
  const [state, setState] = useState<'waiting' | 'opened' | 'sent' | 'expired'>('waiting')
  const [preview, setPreview] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const lastPreview = useRef(0)
  const qr = useMemo(() => {
    const { svg, size } = qrArt(encodeQr(step.url, 'M'), { quiet: 2 })
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR code for the link">${svg}</svg>`
  }, [step.url])

  useEffect(() => {
    let live = true
    const tick = async () => {
      setNow(Date.now())
      try {
        const r = await handApi.watch(step.token)
        if (!live) return
        setState(r.state)
        if (r.previewAt && r.previewAt !== lastPreview.current) {
          lastPreview.current = r.previewAt
          const p = await handApi.preview(step.token)
          if (live && p.image) setPreview(p.image)
        }
        if (r.state === 'sent') onSent()
      } catch {
        /* a missed beat; the next one tries again */
      }
    }
    void tick()
    const id = window.setInterval(tick, 2000)
    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [step.token, onSent])

  const until = new Date(step.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const sameDay = new Date(step.expiresAt).toDateString() === new Date(now).toDateString()
  const device = step.mode === 'pad' ? 'tablet' : 'phone'
  const status =
    state === 'expired'
      ? 'This link has expired. Go back and make a new one.'
      : state === 'opened'
        ? step.mode === 'pad'
          ? 'Your tablet is connected. Write, then tap Submit on it.'
          : 'Your phone is connected. Take the photos, then tap Send.'
        : `Waiting for your ${device}…`

  return (
    <div className="hs-link">
      <div className="hs-link-main">
        <div className="hs-qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <ol className="hs-steps">
          <li>Open the camera on your {device} and point it at this code.</li>
          <li>{step.mode === 'pad' ? 'Write your solution on the pad. The question is there too.' : 'Take a photo of each page of your working.'}</li>
          <li>Tap {step.mode === 'pad' ? 'Submit' : 'Send'}. It appears here straight away.</li>
        </ol>
      </div>
      <div className="hs-url">
        <input readOnly value={step.url} aria-label="The link" onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className="hs-copy"
          onClick={() => void navigator.clipboard?.writeText(step.url).then(() => toast.success('Link copied', `Open it on your ${device}.`))}
        >
          Copy link
        </button>
      </div>
      <p className={cn('hs-status', state === 'opened' && 'is-live', state === 'expired' && 'is-bad')} role="status" aria-live="polite">
        <span className="hs-dot" aria-hidden="true" />
        {status}
        {state !== 'expired' && <span className="hs-mins">Link works until {until}{sameDay ? '' : ' tomorrow'}</span>}
      </p>
      {step.mode === 'pad' && preview && state === 'opened' && (
        <figure className="hs-live">
          <img src={preview} alt="Live view of the page you are writing on the tablet" />
          <figcaption>Live view from your tablet</figcaption>
        </figure>
      )}
      <button type="button" className="hs-back" onClick={onBack}>
        ← Other ways
      </button>
    </div>
  )
}

function WayArt({ kind }: { kind: 'pad' | 'photo' | 'upload' }) {
  return (
    <span className="hs-way-art" aria-hidden="true">
      <svg viewBox="0 0 40 40">
        {kind === 'pad' && (
          <>
            <rect x="6" y="5" width="24" height="30" rx="3" />
            <path d="M11 13h14M11 18h14M11 23h8" />
            <path d="m27 30 7-13 2.5 1.3-7 13-3 1.2z" />
          </>
        )}
        {kind === 'photo' && (
          <>
            <rect x="11" y="4" width="18" height="32" rx="3.5" />
            <circle cx="20" cy="17" r="5" />
            <path d="M17 31h6" />
          </>
        )}
        {kind === 'upload' && (
          <>
            <path d="M8 26v6h24v-6" />
            <path d="M20 26V8M13 15l7-7 7 7" />
          </>
        )}
      </svg>
    </span>
  )
}

/* ── Viewing one solution: full screen ─────────────────────────────────── */

type Pan = { s: number; x: number; y: number }
const FIT: Pan = { s: 1, x: 0, y: 0 }

function Viewer({
  s,
  onClose,
  onVisibility,
  onCaption,
  onDelete,
  onVote,
}: {
  s: HandSolution
  onClose: () => void
  onVisibility: (v: 'private' | 'public') => void
  onCaption: (note: string) => Promise<void>
  onDelete: () => void
  onVote: () => void
}) {
  const [page, setPage] = useState(0)
  const [note, setNote] = useState(s.note)
  const [pan, setPan] = useState<Pan>(FIT)
  // On a phone the page gets the whole screen; the details open from the ⓘ button.
  const [panel, setPanel] = useState(() => typeof window === 'undefined' || window.innerWidth > 760)
  const stage = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ pan: Pan; dist: number; mid: { x: number; y: number }; at: number; x: number } | null>(null)
  const lastTap = useRef(0)
  const who = s.author ? s.author.displayName || s.author.username : null
  const n = s.images.length
  const src = s.images[Math.min(page, n - 1)]

  const go = useCallback(
    (i: number) => {
      setPage(Math.max(0, Math.min(n - 1, i)))
      setPan(FIT)
    },
    [n],
  )

  useEffect(() => {
    closeBtn.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(page + 1)
      else if (e.key === 'ArrowLeft') go(page - 1)
      else if (e.key === '+' || e.key === '=') setPan((p) => ({ ...p, s: Math.min(5, p.s * 1.25) }))
      else if (e.key === '-') setPan((p) => (p.s / 1.25 <= 1 ? FIT : { ...p, s: p.s / 1.25 }))
      else if (e.key === '0') setPan(FIT)
    }
    window.addEventListener('keydown', key)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', key)
    }
  }, [go, page, onClose])

  // Wheel zooms around the pointer (the page under it stays put).
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left - r.width / 2
      const my = e.clientY - r.top - r.height / 2
      setPan((p) => {
        if (!(e.ctrlKey || e.metaKey) && p.s > 1) return { ...p, x: p.x - e.deltaX, y: p.y - e.deltaY }
        const s = Math.min(5, Math.max(1, p.s * Math.exp(-e.deltaY * 0.01)))
        if (s === 1) return FIT
        const k = s / p.s
        return { s, x: mx - (mx - p.x) * k, y: my - (my - p.y) * k }
      })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const begin = () => {
    const pts = [...pointers.current.values()]
    const r = stage.current!.getBoundingClientRect()
    const mid = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length - r.left - r.width / 2, y: pts.reduce((a, p) => a + p.y, 0) / pts.length - r.top - r.height / 2 }
    const dist = pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0
    start.current = { pan, dist, mid, at: Date.now(), x: pts[0].x }
  }
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    begin()
  }
  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !start.current) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const st = start.current
    const pts = [...pointers.current.values()]
    const r = stage.current!.getBoundingClientRect()
    const mid = { x: pts.reduce((a, p) => a + p.x, 0) / pts.length - r.left - r.width / 2, y: pts.reduce((a, p) => a + p.y, 0) / pts.length - r.top - r.height / 2 }
    if (pts.length > 1 && st.dist) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      const sc = Math.min(5, Math.max(1, (st.pan.s * dist) / st.dist))
      const k = sc / st.pan.s
      setPan({ s: sc, x: mid.x - (st.mid.x - st.pan.x) * k, y: mid.y - (st.mid.y - st.pan.y) * k })
    } else if (st.pan.s > 1) {
      setPan({ ...st.pan, x: st.pan.x + (mid.x - st.mid.x), y: st.pan.y + (mid.y - st.mid.y) })
    }
  }
  const up = (e: React.PointerEvent) => {
    const st = start.current
    pointers.current.delete(e.pointerId)
    if (pointers.current.size) return begin()
    start.current = null
    if (!st) return
    const dx = e.clientX - st.x
    // A swipe turns the page when not zoomed in; a double tap zooms.
    if (st.pan.s === 1 && Math.abs(dx) > 60 && Date.now() - st.at < 600) return go(page + (dx < 0 ? 1 : -1))
    if (Math.abs(dx) < 6 && Date.now() - st.at < 250) {
      if (Date.now() - lastTap.current < 320) {
        const r = stage.current!.getBoundingClientRect()
        const mx = e.clientX - r.left - r.width / 2
        const my = e.clientY - r.top - r.height / 2
        setPan((p) => (p.s > 1 ? FIT : { s: 2.5, x: -mx * 1.5, y: -my * 1.5 }))
        lastTap.current = 0
      } else lastTap.current = Date.now()
    }
  }

  return createPortal(
    <div className="hs-full" role="dialog" aria-modal="true" aria-label={who ? `${who}'s handwritten working` : 'Your handwritten working'}>
      <header className="hs-full-bar">
        <div className="min-w-0">
          <p className="hs-full-t">{who ? `${who}'s working` : 'Your working'}</p>
          <p className="hs-full-s">
            {SOURCE[s.source]} · {timeAgo(s.createdAt)}
            {n > 1 ? ` · page ${page + 1} of ${n}` : ''}
          </p>
        </div>
        <span className="hs-full-zoom" role="group" aria-label="Zoom">
          <button type="button" onClick={() => setPan((p) => (p.s / 1.25 <= 1 ? FIT : { ...p, s: p.s / 1.25 }))} aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setPan(FIT)} aria-label={`Zoom ${Math.round(pan.s * 100)}%. Fit to screen`}>
            {Math.round(pan.s * 100)}%
          </button>
          <button type="button" onClick={() => setPan((p) => ({ ...p, s: Math.min(5, p.s * 1.25) }))} aria-label="Zoom in">
            +
          </button>
        </span>
        <a className="hs-full-btn" href={src} download={`solution-page-${page + 1}`} aria-label="Download this page" title="Download this page">
          <Icon name="download" className="size-4" aria-hidden="true" />
        </a>
        <button type="button" className={cn('hs-full-btn', panel && 'is-on')} onClick={() => setPanel((v) => !v)} aria-pressed={panel} aria-label="Details" title="Details">
          <Icon name="info" className="size-4" aria-hidden="true" />
        </button>
        <button ref={closeBtn} type="button" className="hs-full-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">
          <Icon name="x" className="size-5" aria-hidden="true" />
        </button>
      </header>

      <div className="hs-full-main">
        <div ref={stage} className={cn('hs-full-stage', pan.s > 1 && 'is-zoomed')} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <img src={src} alt={`Page ${page + 1} of ${n}`} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${pan.s})` }} />
          {n > 1 && (
            <>
              <button type="button" className="hs-full-nav is-prev" onClick={() => go(page - 1)} disabled={page === 0} aria-label="Previous page">
                ‹
              </button>
              <button type="button" className="hs-full-nav is-next" onClick={() => go(page + 1)} disabled={page === n - 1} aria-label="Next page">
                ›
              </button>
            </>
          )}
        </div>

        {panel && (
          <aside className="hs-full-side" aria-label="Details">
            {s.mine ? (
              <>
                <p className="hs-k">Who can see it</p>
                <div className="hs-seg" role="radiogroup" aria-label="Who can see it">
                  <button type="button" role="radio" aria-checked={s.visibility === 'private'} className={cn(s.visibility === 'private' && 'is-on')} onClick={() => s.visibility !== 'private' && onVisibility('private')}>
                    <Icon name="lock" className="size-3.5" aria-hidden="true" /> Only me
                  </button>
                  <button type="button" role="radio" aria-checked={s.visibility === 'public'} className={cn(s.visibility === 'public' && 'is-on')} onClick={() => s.visibility !== 'public' && onVisibility('public')}>
                    <Icon name="globe" className="size-3.5" aria-hidden="true" /> Everyone
                  </button>
                </div>
                <p className="hs-fine">{s.visibility === 'public' ? `Shared. ${s.votes} found it helpful. Others see it after they answer.` : 'Only you can see it.'}</p>
                <label className="hs-caption">
                  <span className="hs-k">Caption</span>
                  <textarea value={note} maxLength={500} rows={4} placeholder="The trick you used, or what to watch out for…" onChange={(e) => setNote(e.target.value)} onBlur={() => note !== s.note && void onCaption(note)} />
                </label>
                <button type="button" className="hs-tool is-danger" onClick={onDelete}>
                  <Icon name="delete" className="size-4" aria-hidden="true" /> Delete this solution
                </button>
              </>
            ) : (
              <>
                {s.note && <p className="hs-note hs-note-big">{s.note}</p>}
                <button type="button" className={cn('hs-vote hs-vote-big', s.voted && 'is-on')} onClick={onVote} aria-pressed={s.voted}>
                  <Icon name="heart" className="size-4" aria-hidden="true" /> {s.voted ? 'Helpful · thanks' : 'Helpful'} · {s.votes}
                </button>
              </>
            )}
            {n > 1 && (
              <>
                <p className="hs-k">Pages</p>
                <div className="hs-strip" role="tablist" aria-label="Pages">
                  {s.images.map((im, i) => (
                    <button key={im} type="button" role="tab" aria-selected={i === page} className={cn('hs-strip-item', i === page && 'is-on')} onClick={() => go(i)} aria-label={`Page ${i + 1}`}>
                      <img src={im} alt="" />
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="hs-fine hs-full-help">Pinch, scroll or double-tap to zoom. Drag to move. Swipe or use ← → for pages.</p>
          </aside>
        )}
      </div>
    </div>,
    document.body,
  )
}
