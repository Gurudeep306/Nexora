/*
  "Video explanations" under a GATE question or a notes lesson: the videos
  members recorded, most helpful first, and a button to record your own. On
  a question, videos wait until you have tried it (like the solution), unless
  you choose to watch anyway.
*/
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Flag, Lock, MoreHorizontal, ThumbsUp, Trash2, Video, X } from 'lucide-react'
import { Avatar, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Modal, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/gate/insights/format'
import { explainApi, fmtTime, mediaUrl, type ExplainKind, type ExplainVideo } from './api'
import { ChapterList, Player, type PlayerHandle } from './Player'
import { Studio } from './Studio'
import './explain.css'

const nameOf = (v: ExplainVideo) => (v.mine ? 'You' : v.author.displayName || v.author.username)
const keptMs = (v: ExplainVideo) => (v.trimEndMs ?? v.durationMs) - v.trimStartMs

export function ExplainVideos({ kind, target, about, revealed = true }: { kind: ExplainKind; target: string; about: string; revealed?: boolean }) {
  const [videos, setVideos] = useState<ExplainVideo[] | null>(null)
  const [recording, setRecording] = useState(false)
  const [open, setOpen] = useState<ExplainVideo | null>(null)
  const [peek, setPeek] = useState(false)
  const [posted, setPosted] = useState<ExplainVideo | null>(null)

  const load = useCallback(() => {
    explainApi
      .list(kind, target)
      .then(setVideos)
      .catch(() => setVideos([]))
  }, [kind, target])
  useEffect(() => {
    load()
  }, [load])

  const patch = (v: ExplainVideo) => {
    setVideos((l) => (l ?? []).map((x) => (x.id === v.id ? { ...x, ...v } : x)))
    setOpen((o) => (o && o.id === v.id ? { ...o, ...v } : o))
  }
  const removed = (id: string) => {
    setVideos((l) => (l ?? []).filter((x) => x.id !== id))
    setOpen(null)
  }

  const list = videos ?? []
  const mine = list.filter((v) => v.mine)
  const shown = revealed || peek ? list : mine
  const waiting = list.length - shown.length

  return (
    <section className="ex-section" aria-labelledby={`ex-${target}`}>
      <header className="ex-head">
        <div className="min-w-0">
          <h3 id={`ex-${target}`} className="ex-title">
            Video explanations{list.length ? <span className="ex-count-n"> · {list.length}</span> : null}
          </h3>
          <p className="ex-sub">Explained by members, in their own words. The most helpful come first.</p>
        </div>
        <button type="button" className="ex-record" onClick={() => setRecording(true)}>
          <Video className="size-4" aria-hidden="true" /> Record one
        </button>
      </header>

      {videos && list.length === 0 && (
        <button type="button" className="ex-empty" onClick={() => setRecording(true)}>
          <span className="ex-empty-mark" aria-hidden="true">
            <Video className="size-5" />
          </span>
          <span>
            <strong>Be the first to explain this.</strong>
            <span>Record your screen, a whiteboard or yourself. Two minutes of clear thinking helps everyone after you.</span>
          </span>
        </button>
      )}

      {posted && (
        <p className="lv-status is-ok mb-3" role="status">
          <span className="lv-dot-live" aria-hidden="true" /> Your explanation is up. {posted.visibility === 'public' ? 'Others can watch it now.' : 'Only you can see it.'}
        </p>
      )}

      {shown.length > 0 && (
        <ul className="ex-grid">
          {shown.map((v) => (
            <li key={v.id}>
              <button type="button" className="ex-card" onClick={() => setOpen(v)}>
                <span className="ex-thumb">
                  {v.poster ? <img src={mediaUrl(v.poster)} alt="" loading="lazy" /> : <Video className="size-6" aria-hidden="true" />}
                  <span className="ex-dur">{fmtTime(keptMs(v))}</span>
                  {v.visibility === 'private' && (
                    <span className="ex-flag">
                      <Lock className="size-3" aria-hidden="true" /> Only you
                    </span>
                  )}
                </span>
                <span className="ex-card-body">
                  <span className="ex-card-title">{v.title}</span>
                  <span className="ex-card-meta">
                    <Avatar src={v.author.avatarUrl} avatar={v.author.avatar} name={nameOf(v)} seed={v.author.username} size="xs" />
                    <span className="truncate">{nameOf(v)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3" aria-hidden="true" /> {v.votes}
                    </span>
                    {v.chapters.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {v.chapters.length} {v.chapters.length === 1 ? 'chapter' : 'chapters'}
                        </span>
                      </>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {waiting > 0 && (
        <p className="ex-wait">
          {waiting} {waiting === 1 ? 'video waits' : 'videos wait'} until you try the question.{' '}
          <button type="button" className="ed-link" onClick={() => setPeek(true)}>
            Watch anyway
          </button>
        </p>
      )}

      {open && <Viewer v={open} onClose={() => setOpen(null)} onChange={patch} onRemoved={removed} />}
      {recording && (
        <Studio
          kind={kind}
          target={target}
          about={about}
          onClose={() => setRecording(false)}
          onDone={(v) => {
            setRecording(false)
            setVideos((l) => [v, ...(l ?? [])])
            setPosted(v)
            window.setTimeout(() => setPosted(null), 6000)
          }}
        />
      )}
    </section>
  )
}

export function Viewer({ v, onClose, onChange, onRemoved }: { v: ExplainVideo; onClose: () => void; onChange: (v: ExplainVideo) => void; onRemoved: (id: string) => void }) {
  const toast = useToast()
  const player = useRef<PlayerHandle>(null)
  const [now, setNow] = useState(v.trimStartMs)
  const [editing, setEditing] = useState(false)
  const [reporting, setReporting] = useState(false)

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && !editing && !reporting && onClose()
    window.addEventListener('keydown', key)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', key)
      document.body.style.overflow = prev
    }
  }, [onClose, editing, reporting])

  const vote = async () => {
    try {
      const r = await explainApi.vote(v.id, !v.voted)
      onChange({ ...v, votes: r.votes, voted: r.voted })
    } catch (e) {
      toast.error('Could not save that', (e as Error).message)
    }
  }
  const remove = async () => {
    if (!window.confirm('Delete this video for good?')) return
    await explainApi.remove(v.id)
    toast.success('Video deleted')
    onRemoved(v.id)
  }

  return createPortal(
    <div className="ex-viewer" role="dialog" aria-modal="true" aria-label={v.title}>
      <div className="ex-viewer-main">
        <Player ref={player} v={v} autoPlay onTime={setNow} />
      </div>
      <aside className="ex-viewer-side">
        <div className="ex-viewer-top">
          <p className="ed-label m-0">Video explanation</p>
          <button type="button" className="lv-round" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <h2 className="ex-viewer-title">{v.title}</h2>
        <div className="ex-viewer-who">
          <Avatar src={v.author.avatarUrl} avatar={v.author.avatar} name={nameOf(v)} seed={v.author.username} size="sm" />
          <span>
            <strong>{nameOf(v)}</strong>
            <span className="lv-hint block">
              {timeAgo(v.createdAt)} · <Eye className="inline size-3 align-[-1px]" aria-hidden="true" /> {v.views} {v.views === 1 ? 'view' : 'views'}
            </span>
          </span>
        </div>
        {v.note && <p className="ex-viewer-note">{v.note}</p>}
        <div className="ex-viewer-actions">
          {!v.mine && (
            <button type="button" className={cn('lv-chip-btn', v.voted && 'is-on')} aria-pressed={v.voted} onClick={() => void vote()}>
              <ThumbsUp className="size-3.5" aria-hidden="true" /> Helpful · {v.votes}
            </button>
          )}
          {v.mine && (
            <span className="lv-hint">
              <ThumbsUp className="inline size-3 align-[-1px]" aria-hidden="true" /> {v.votes} found it helpful
            </span>
          )}
          <Menu>
            <MenuTrigger asChild>
              <button type="button" className="lv-round" aria-label="More">
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </button>
            </MenuTrigger>
            <MenuContent align="end">
              {v.mine ? (
                <>
                  <MenuItem onSelect={() => setEditing(true)}>Edit title and chapters</MenuItem>
                  <MenuItem onSelect={() => void explainApi.update(v.id, { visibility: v.visibility === 'public' ? 'private' : 'public' }).then(onChange)}>
                    {v.visibility === 'public' ? 'Make it private' : 'Share with everyone'}
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem danger icon={<Trash2 />} onSelect={() => void remove()}>
                    Delete
                  </MenuItem>
                </>
              ) : (
                <MenuItem icon={<Flag />} onSelect={() => setReporting(true)}>
                  Report
                </MenuItem>
              )}
            </MenuContent>
          </Menu>
        </div>
        <ChapterList v={v} nowMs={now} onSeek={(ms) => player.current?.seek(ms)} />
        <p className="lv-hint ex-keys">Space plays · J and L skip 10 s · F full screen</p>
      </aside>
      {editing && <EditDialog v={v} onClose={() => setEditing(false)} onSaved={onChange} />}
      {reporting && <ReportDialog v={v} onClose={() => setReporting(false)} />}
    </div>,
    document.body,
  )
}

function EditDialog({ v, onClose, onSaved }: { v: ExplainVideo; onClose: () => void; onSaved: (v: ExplainVideo) => void }) {
  const [title, setTitle] = useState(v.title)
  const [note, setNote] = useState(v.note)
  const [chapters, setChapters] = useState(v.chapters)
  const toast = useToast()
  const save = async () => {
    try {
      onSaved(await explainApi.update(v.id, { title, note, chapters }))
      onClose()
    } catch (e) {
      toast.error('Could not save', (e as Error).message)
    }
  }
  return (
    <Modal open onClose={onClose} title="Edit the video">
      <div className="grid gap-4">
        <label className="lv-field">
          <span className="ed-label">Title</span>
          <input className="lv-input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="lv-field">
          <span className="ed-label">A line about it</span>
          <textarea className="lv-input" rows={2} value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        </label>
        {chapters.length > 0 && (
          <div className="lv-field">
            <span className="ed-label">Chapters</span>
            <ul className="ex-ch-edit">
              {chapters.map((c, i) => (
                <li key={i}>
                  <span className="ex-chapter-at">{fmtTime(c.at - v.trimStartMs)}</span>
                  <input className="lv-input" value={c.title} maxLength={80} aria-label={`Chapter at ${fmtTime(c.at)}`} onChange={(e) => setChapters((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                  <button type="button" className="lv-round" aria-label="Remove chapter" onClick={() => setChapters((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="button" className="lv-join" onClick={() => void save()} disabled={!title.trim()}>
          Save
        </button>
      </div>
    </Modal>
  )
}

const REASONS = ['Wrong or misleading', 'Not about this question', 'Rude or harmful', 'Spam or advertising']
function ReportDialog({ v, onClose }: { v: ExplainVideo; onClose: () => void }) {
  const [reason, setReason] = useState(REASONS[0])
  const toast = useToast()
  return (
    <Modal open onClose={onClose} title="Report this video" description="Three reports hide a video until the NexoraGuru team looks at it.">
      <div className="grid gap-3">
        {REASONS.map((r) => (
          <label key={r} className={cn('lv-choice is-wide', reason === r && 'is-on')}>
            <input type="radio" name="ex-report" className="sr-only" checked={reason === r} onChange={() => setReason(r)} />
            {r}
          </label>
        ))}
        <button
          type="button"
          className="lv-join"
          onClick={() =>
            void explainApi
              .report(v.id, reason)
              .then(() => (toast.success('Thanks for telling us'), onClose()))
              .catch((e: Error) => toast.error('Could not send', e.message))
          }
        >
          Send report
        </button>
      </div>
    </Modal>
  )
}
