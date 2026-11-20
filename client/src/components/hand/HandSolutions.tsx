import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Modal, useToast } from '@/components/ui'
import { Icon } from '@/components/icon/Icon'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/gate/insights/format'
import { handApi, shrinkPhoto, type HandKind, type HandMode, type HandSolution } from './api'
import { handQrCard } from './qrCard'
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

/**
 * Inside the worked solution: the handwritten solutions members have shared,
 * as a strip of pages (most helpful first), each opening full screen. The
 * worked solution is already showing, so nothing is given away.
 */
export function MembersHandwriting({ kind, target, onAddMine }: { kind: HandKind; target: string; onAddMine?: () => void }) {
  const toast = useToast()
  const [list, setList] = useState<HandSolution[] | null>(null)
  const [viewing, setViewing] = useState<HandSolution | null>(null)
  useEffect(() => {
    let live = true
    handApi
      .list(kind, target)
      .then((r) => live && setList(r.community))
      .catch(() => live && setList([]))
    return () => {
      live = false
    }
  }, [kind, target])
  const vote = async (s: HandSolution) => {
    try {
      const r = await handApi.vote(s.id, !s.voted)
      const next = { ...s, votes: r.votes, voted: r.voted }
      setList((cur) => (cur ?? []).map((x) => (x.id === s.id ? next : x)))
      setViewing((v) => (v && v.id === s.id ? next : v))
    } catch (e) {
      toast.error('Could not save your vote', (e as Error).message)
    }
  }
  if (!list) return null
  return (
    <section className="hs-members" aria-label="Handwritten solutions by members">
      <div className="hs-members-head">
        <p className="ed-label ed-muted m-0">Handwritten by members{list.length ? ` · ${list.length}` : ''}</p>
        {onAddMine && (
          <button type="button" className="qc-text-action" onClick={onAddMine}>
            Add yours
          </button>
        )}
      </div>
      {list.length ? (
        <ul className="hs-members-row">
          {list.map((s) => {
            const who = s.author?.displayName || s.author?.username || ''
            return (
              <li key={s.id}>
                <button type="button" className="hs-member" onClick={() => setViewing(s)} aria-label={`Open ${who}'s handwritten solution, ${s.images.length} ${s.images.length === 1 ? 'page' : 'pages'}, ${s.votes} helpful`}>
                  <span className="hs-member-img">
                    <img src={s.images[0]} alt="" loading="lazy" />
                    {s.images.length > 1 && <span className="hs-pages">{s.images.length} pages</span>}
                  </span>
                  <span className="hs-member-meta">
                    <Avatar seed={s.author?.username ?? 'x'} avatar={s.author?.avatar ?? undefined} src={s.author?.avatarUrl ?? undefined} name={who} size="xs" ring={false} />
                    <span className="truncate">{who}</span>
                    <span className={cn('hs-member-votes', s.voted && 'is-on')}>
                      <Icon name="heart" className="size-3" aria-hidden="true" /> {s.votes}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="hs-fine m-0">No one has shared handwritten working for this question yet. Yours could be the first.</p>
      )}
      {viewing && <Viewer s={viewing} onClose={() => setViewing(null)} onVisibility={() => {}} onCaption={async () => {}} onDelete={() => {}} onVote={() => void vote(viewing)} />}
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

type Way = HandMode | 'upload'
type Link = { token: string; url: string; expiresAt: number }

const WAYS: { id: Way; label: string; short: string }[] = [
  { id: 'pad', label: 'Write on a tablet', short: 'Tablet' },
  { id: 'photo', label: 'Photo with your phone', short: 'Phone photo' },
  { id: 'upload', label: 'Upload from this device', short: 'Upload' },
]

function AddDialog({ kind, target, onClose, onAdded }: { kind: HandKind; target: string; onClose: () => void; onAdded: () => void }) {
  // Phones and tablets start on the camera; computers on the tablet pad.
  const [way, setWay] = useState<Way>(() => (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches ? 'photo' : 'pad'))
  const [links, setLinks] = useState<Partial<Record<HandMode, Link>>>({})
  const [error, setError] = useState<string | null>(null)

  // The code is made as soon as its tab opens: no extra click.
  useEffect(() => {
    if (way === 'upload' || links[way]) return
    let live = true
    setError(null)
    handApi
      .link(kind, target, way)
      .then((r) => live && setLinks((l) => ({ ...l, [way]: { token: r.token, url: `${window.location.origin}${r.path}`, expiresAt: r.expiresAt } })))
      .catch((e: Error) => live && setError(e.message || 'Could not make a link. Try again.'))
    return () => {
      live = false
    }
  }, [way, links, kind, target])

  const sent = useCallback(() => {
    onAdded()
    onClose()
  }, [onAdded, onClose])

  return (
    <Modal open onClose={onClose} size="lg" title="Write it by hand" description="Your working is saved with this question. It stays private until you share it.">
      <div className="hs-tabs" role="tablist" aria-label="How to add it">
        {WAYS.map((w) => (
          <button key={w.id} type="button" role="tab" aria-selected={way === w.id} className={cn('hs-tab', way === w.id && 'is-on')} onClick={() => setWay(w.id)}>
            <WayArt kind={w.id} />
            <span>{w.short}</span>
          </button>
        ))}
      </div>
      <div className="hs-tabpanel" role="tabpanel" aria-label={WAYS.find((w) => w.id === way)!.label}>
        {way === 'upload' ? (
          <UploadStep kind={kind} target={target} onDone={sent} />
        ) : error ? (
          <p className="hs-status is-bad" role="alert">
            <span className="hs-dot" aria-hidden="true" />
            {error}
          </p>
        ) : links[way] ? (
          <LinkStep key={way} mode={way} link={links[way]!} onSent={sent} onRenew={() => setLinks((l) => ({ ...l, [way]: undefined }))} />
        ) : (
          <div className="hs-link-wait" aria-busy="true">
            Making your code…
          </div>
        )}
      </div>
    </Modal>
  )
}

function LinkStep({ mode, link, onSent, onRenew }: { mode: HandMode; link: Link; onSent: () => void; onRenew: () => void }) {
  const toast = useToast()
  const [state, setState] = useState<'waiting' | 'opened' | 'sent' | 'expired'>('waiting')
  const [preview, setPreview] = useState<string | null>(null)
  const lastPreview = useRef(0)
  const device = mode === 'pad' ? 'tablet' : 'phone'
  const until = new Date(link.expiresAt)
  const [madeAt] = useState(() => Date.now())
  const untilText = `${until.toDateString() === new Date(madeAt).toDateString() ? 'today' : 'tomorrow'} at ${until.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  const card = useMemo(
    () => handQrCard(link.url, { title: mode === 'pad' ? 'Scan with your tablet' : 'Scan with your phone', sub: `Works until ${untilText}` }),
    [link.url, mode, untilText],
  )

  useEffect(() => {
    let live = true
    const tick = async () => {
      try {
        const r = await handApi.watch(link.token)
        if (!live) return
        setState(r.state)
        if (r.previewAt && r.previewAt !== lastPreview.current) {
          lastPreview.current = r.previewAt
          const p = await handApi.preview(link.token)
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
  }, [link.token, onSent])

  const steps =
    mode === 'pad'
      ? ['Open the camera on your iPad or tablet and point it at the code.', 'The question is printed at the top of the page. Write your answer below it.', 'Tap Submit. It appears here straight away.']
      : ['Open the camera on your phone and point it at the code.', 'Take a photo of each page of your working.', 'Tap Send. It appears here straight away.']

  return (
    <div className="hs-link">
      <div className="hs-link-main">
        <div className="hs-qrcard" dangerouslySetInnerHTML={{ __html: card }} />
        <div className="hs-link-side">
          <ol className="hs-steps">
            {steps.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
          <div className={cn('hs-live-status', `is-${state}`)} role="status" aria-live="polite">
            <span className="hs-dot" aria-hidden="true" />
            <span>
              {state === 'expired'
                ? 'This code has expired.'
                : state === 'opened'
                  ? mode === 'pad'
                    ? 'Tablet connected. Writing…'
                    : 'Phone connected. Taking photos…'
                  : `Waiting for your ${device}…`}
            </span>
            {state === 'expired' && (
              <button type="button" className="hs-back" onClick={onRenew}>
                Make a new code
              </button>
            )}
          </div>
          <div className="hs-url">
            <input readOnly value={link.url} aria-label="The link, to open on another device" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="hs-copy" onClick={() => void navigator.clipboard?.writeText(link.url).then(() => toast.success('Link copied', `Open it on your ${device}.`))}>
              Copy
            </button>
          </div>
          <p className="hs-fine">No sign-in needed on the {device}. The code only adds work to this question, for you.</p>
        </div>
      </div>
      {mode === 'pad' && state === 'opened' && (
        <figure className="hs-live">
          {preview ? <img src={preview} alt="Live view of the page you are writing on the tablet" /> : <div className="hs-live-wait">Your page appears here as you write.</div>}
          <figcaption>Live view from your tablet</figcaption>
        </figure>
      )}
    </div>
  )
}

function UploadStep({ kind, target, onDone }: { kind: HandKind; target: string; onDone: () => void }) {
  const toast = useToast()
  const [files, setFiles] = useState<{ id: number; file: File; url: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const seq = useRef(0)
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), []) // eslint-disable-line react-hooks/exhaustive-deps

  const add = (list: FileList | null) => {
    if (!list) return
    const next = [...list].filter((f) => f.type.startsWith('image/')).slice(0, 12 - files.length)
    setFiles((cur) => [...cur, ...next.map((file) => ({ id: ++seq.current, file, url: URL.createObjectURL(file) }))])
  }
  const send = async () => {
    setBusy(true)
    try {
      const images = []
      for (const f of files) images.push(await shrinkPhoto(f.file))
      await handApi.upload(kind, target, images)
      onDone()
    } catch (e) {
      toast.error('Could not upload', (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hs-upload">
      <button
        type="button"
        className={cn('hs-drop', over && 'is-over')}
        onClick={() => input.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
      >
        <WayArt kind="upload" />
        <strong>Drop photos or scans here</strong>
        <span>or click to choose. JPG, PNG or WebP, up to 12 pages, in page order.</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />
      {files.length > 0 && (
        <>
          <ol className="hs-up-list">
            {files.map((f, i) => (
              <li key={f.id}>
                <img src={f.url} alt={`Page ${i + 1}`} />
                <span>Page {i + 1}</span>
                <button
                  type="button"
                  aria-label={`Remove page ${i + 1}`}
                  onClick={() => {
                    URL.revokeObjectURL(f.url)
                    setFiles((cur) => cur.filter((x) => x.id !== f.id))
                  }}
                >
                  <Icon name="x" className="size-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
          <button type="button" className="hs-add hs-up-send" onClick={() => void send()} disabled={busy}>
            {busy ? 'Uploading…' : `Upload ${files.length} ${files.length === 1 ? 'page' : 'pages'}`}
          </button>
        </>
      )}
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

export function Viewer({
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
