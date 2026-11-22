/*
  The room's side panels: Chat, People (with the waiting room, raised hands
  and the host's controls), Tablet (join a tablet by QR) and Settings.
*/
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Code2, Copy, Crown, MonitorUp, Hand, Mic, MicOff, MoreHorizontal, Send, Star, UserMinus, Video, VideoOff, X } from 'lucide-react'
import { Avatar, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, useToast } from '@/components/ui'
import { cn } from '@/lib/utils'
import { handQrCard, themeQrColors } from '@/components/hand/qrCard'
import { liveApi, type ChatMsg, type PeerInfo } from '../api'
import type { LiveSession, LiveState } from '../session'
import { canPickSpeaker, listDevices } from '../devices'

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/* ── Chat ── */
function Body({ m }: { m: ChatMsg }) {
  if (m.kind === 'code') return <pre className="lv-code">{m.body}</pre>
  // Links become links; everything else stays text.
  const parts = m.body.split(/(https?:\/\/[^\s]+)/g)
  return (
    <p className="lv-msg-body">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="ed-link">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  )
}

export function ChatPanel({ session, s }: { session: LiveSession; s: LiveState }) {
  const [text, setText] = useState('')
  const [code, setCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const list = useRef<HTMLDivElement>(null)
  const atEnd = useRef(true)
  useEffect(() => {
    session.setChatOpen(true)
    return () => session.setChatOpen(false)
  }, [session])
  useEffect(() => {
    const el = list.current
    if (el && atEnd.current) el.scrollTop = el.scrollHeight
  }, [s.messages.length])

  const send = async () => {
    const body = text.trim()
    if (!body) return
    setText('')
    const r = await session.chat(body, code ? 'code' : 'text')
    if (!r?.ok) {
      setText(body)
      setError(r?.error || 'Not sent. Try again.')
    } else setError(null)
  }

  return (
    <div className="lv-panel-body lv-chat">
      <div
        ref={list}
        className="lv-msgs"
        role="log"
        aria-live="polite"
        aria-label="Messages"
        onScroll={(e) => {
          const el = e.currentTarget
          atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
      >
        {s.messages.length === 0 && <p className="lv-empty">Messages stay with the room. Share a hint, a link or some code.</p>}
        {s.messages.map((m, i) => {
          const prev = s.messages[i - 1]
          const grouped = prev && prev.username === m.username && m.at - prev.at < 3 * 60 * 1000
          const mine = m.username === s.self?.username
          return (
            <div key={m.id} className={cn('lv-msg', mine && 'is-mine', grouped && 'is-grouped')}>
              {!grouped && (
                <p className="lv-msg-head">
                  <span className="lv-msg-name">{mine ? 'You' : m.name}</span>
                  <span className="lv-msg-time">{time(m.at)}</span>
                </p>
              )}
              <Body m={m} />
            </div>
          )
        })}
      </div>
      <form
        className="lv-compose"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        {error && (
          <p className="lv-compose-error" role="alert">
            {error}
          </p>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !code) {
              e.preventDefault()
              void send()
            }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void send()
            }
          }}
          rows={code ? 5 : 2}
          maxLength={2000}
          placeholder={code ? 'Paste code. Ctrl+Enter sends.' : 'Message everyone'}
          aria-label={code ? 'Code to send' : 'Message to everyone'}
          className={cn('lv-input', code && 'is-code')}
        />
        <div className="lv-compose-row">
          <button type="button" className={cn('lv-chip-btn', code && 'is-on')} aria-pressed={code} onClick={() => setCode(!code)} title="Send as a code block">
            <Code2 className="size-3.5" aria-hidden="true" /> Code
          </button>
          <button type="submit" className="lv-send" disabled={!text.trim()} aria-label="Send">
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── People ── */
export function PeoplePanel({ session, s }: { session: LiveSession; s: LiveState }) {
  const host = session.isHost()
  const isOwner = s.self?.role === 'host'
  const people = useMemo(() => {
    const list = [...(s.self ? [{ ...s.self, mic: s.mic, cam: s.cam }] : []), ...Object.values(s.peers)]
    // Teachers first, then speakers; in a lecture the audience comes last, raised hands at its top.
    const rank = (p: (typeof list)[number]) => (p.role === 'host' ? 0 : p.role === 'cohost' ? 1 : p.role === 'member' ? 2 : p.hand ? 3 : 4)
    return list.sort((a, b) => rank(a) - rank(b) || a.joinedAt - b.joinedAt)
  }, [s.self, s.peers, s.mic, s.cam])
  const hands = Object.entries(s.hands)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => people.find((p) => p.peerId === id))
    .filter(Boolean) as PeerInfo[]

  return (
    <div className="lv-panel-body lv-people">
      {host && s.waiting.length > 0 && (
        <section className="lv-section" aria-label="Waiting to join">
          <div className="lv-section-head">
            <p className="ed-label m-0">Waiting · {s.waiting.length}</p>
            {s.waiting.length > 1 && (
              <button type="button" className="lv-chip-btn" onClick={() => session.admit('*', true)}>
                Let everyone in
              </button>
            )}
          </div>
          <ul className="lv-rows">
            {s.waiting.map((w) => (
              <li key={w.id} className="lv-row">
                <Avatar src={w.avatarUrl} avatar={w.avatar} name={w.name} seed={w.username} size="sm" />
                <span className="lv-row-name">{w.name}</span>
                <button type="button" className="lv-round is-ok" onClick={() => session.admit(w.id, true)} aria-label={`Let ${w.name} in`} title="Let in">
                  <Check className="size-4" aria-hidden="true" />
                </button>
                <button type="button" className="lv-round" onClick={() => session.admit(w.id, false)} aria-label={`Don't let ${w.name} in`} title="Deny">
                  <X className="size-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {hands.length > 0 && (
        <section className="lv-section" aria-label="Raised hands">
          <div className="lv-section-head">
            <p className="ed-label m-0">Hands raised · {hands.length}</p>
            {host && (
              <button type="button" className="lv-chip-btn" onClick={() => session.lowerHands()}>
                Lower all
              </button>
            )}
          </div>
          <ol className="lv-rows">
            {hands.map((p, i) => (
              <li key={p.peerId} className="lv-row">
                <span className="lv-hand-n">{i + 1}</span>
                <span className="lv-row-name">{p.peerId === s.self?.peerId ? 'You' : p.name}</span>
                <Hand className="size-4 text-state-warning" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="lv-section" aria-label="In the room">
        <div className="lv-section-head">
          <p className="ed-label m-0">In the room · {new Set(people.map((p) => p.username)).size}</p>
          {host && people.length > 1 && (
            <button type="button" className="lv-chip-btn" onClick={() => session.muteOther('*')}>
              Mute everyone
            </button>
          )}
        </div>
        <ul className="lv-rows">
          {people.map((p) => {
            const me = p.peerId === s.self?.peerId
            return (
              <li key={p.peerId} className="lv-row">
                <Avatar src={p.avatarUrl} avatar={p.avatar} name={p.name} seed={p.username} size="sm" />
                <span className="lv-row-name">
                  <span className="truncate">{me ? `${p.name} (you)` : p.name}</span>
                  {(p.role === 'host' || p.role === 'cohost') && <span className="lv-role">{p.role === 'host' ? 'Host' : 'Co-host'}</span>}
                  {p.role === 'viewer' && p.hand && <span className="lv-role">Hand up</span>}
                  {s.room?.spotlight === p.peerId && <Star className="size-3.5" aria-label="In the spotlight" />}
                </span>
                {/* Lecture: the teacher lets a viewer speak, or sends a speaker back to watching. */}
                {host && !me && s.room?.kind === 'lecture' && p.device === 'main' && (p.role === 'viewer' || p.role === 'member') && (
                  <button type="button" className={cn('lv-chip-btn', p.role === 'viewer' && p.hand && 'is-primary')} onClick={() => session.speaker(p.username, p.role === 'viewer')}>
                    {p.role === 'viewer' ? 'Let speak' : 'Stop'}
                  </button>
                )}
                {p.device === 'main' && p.role !== 'viewer' && (p.cam ? <Video className="size-4 text-text-muted" aria-label="Camera on" /> : <VideoOff className="size-4 text-text-muted" aria-label="Camera off" />)}
                {p.device === 'main' && p.role !== 'viewer' && (p.mic ? <Mic className="size-4 text-text-muted" aria-label="Mic on" /> : <MicOff className="size-4 text-state-error" aria-label="Mic off" />)}
                {host && !me && (
                  <Menu>
                    <MenuTrigger asChild>
                      <button type="button" className="lv-round" aria-label={`Actions for ${p.name}`}>
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </button>
                    </MenuTrigger>
                    <MenuContent align="end">
                      {p.mic && <MenuItem onSelect={() => session.muteOther(p.peerId)}>Mute</MenuItem>}
                      {p.cam && <MenuItem onSelect={() => session.muteOther(p.peerId, 'cam')}>Turn camera off</MenuItem>}
                      <MenuItem onSelect={() => session.spotlight(s.room?.spotlight === p.peerId ? null : p.peerId)}>{s.room?.spotlight === p.peerId ? 'Remove spotlight' : 'Spotlight for everyone'}</MenuItem>
                      {isOwner && p.device === 'main' && p.role !== 'host' && (
                        <MenuItem onSelect={() => session.cohost(p.username, p.role !== 'cohost')}>
                          <Crown className="size-4" aria-hidden="true" /> {p.role === 'cohost' ? 'Remove co-host' : 'Make co-host'}
                        </MenuItem>
                      )}
                      {p.role !== 'host' && (
                        <>
                          <MenuSeparator />
                          <MenuItem danger onSelect={() => session.remove(p.peerId)}>
                            <UserMinus className="size-4" aria-hidden="true" /> Remove from room
                          </MenuItem>
                        </>
                      )}
                    </MenuContent>
                  </Menu>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

/* ── Tablet (QR) ── */
/**
 * Teach from a tablet. The QR opens a teaching board on the iPad (or any
 * tablet): open PDF notes or slides, write with the Pencil, and everyone sees
 * it live. It needs no app, no cable and no mirroring, so it always works.
 *
 * Other ways, folded away: a laptop or Windows tablet can share its whole
 * screen from the same kind of QR; an iPad can be mirrored to a Mac, but
 * recent macOS shows a mirrored iPad as black while anything shares the
 * screen, so that is offered with a plain warning (blank.ts also spots it).
 */
export function TabletPanel({ session, s }: { session: LiveSession; s: LiveState }) {
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [other, setOther] = useState(false)
  const toast = useToast()
  const colors = useMemo(() => themeQrColors(), [])
  const myTablet = Object.values(s.peers).find((p) => p.username === s.self?.username && p.device === 'tablet')
  const tabletScreen = myTablet?.screens[0]

  useEffect(() => {
    let live = true
    liveApi
      .device(session.code)
      .then((r) => live && setLink({ url: `${window.location.origin}${r.path}`, expiresAt: r.expiresAt }))
      .catch((e: Error) => live && setError(e.message))
    return () => {
      live = false
    }
  }, [session.code])

  const card = useMemo(() => (link ? handQrCard(link.url, { title: 'Scan with your iPad', sub: `Works for 6 hours · ${s.room?.title ?? ''}`.slice(0, 48), colors }) : null), [link, colors, s.room?.title])
  const screenUrl = link ? `${link.url}?share=screen` : null
  const copy = (u: string) => void navigator.clipboard?.writeText(u).then(() => toast.success('Link copied', 'Open it on your tablet.'))

  return (
    <div className="lv-panel-body lv-tablet">
      {myTablet ? (
        <p className="lv-status is-ok" role="status">
          <span className="lv-dot-live" aria-hidden="true" /> Your tablet is live{tabletScreen ? ` — everyone sees its ${tabletScreen.kind === 'camera' ? 'camera' : 'board'}` : ''}.
        </p>
      ) : (
        <p className="lv-tablet-lead">Teach from your iPad: it opens a board where you write with Apple Pencil, and open your PDF notes or slides to write on. Everyone sees it live.</p>
      )}

      {error ? (
        <p className="lv-status is-bad" role="alert">
          {error}
        </p>
      ) : card ? (
        <div className="lv-qr" dangerouslySetInnerHTML={{ __html: card }} />
      ) : (
        <div className="lv-qr is-waiting" aria-busy="true" />
      )}

      <ol className="lv-tablet-steps">
        <li>
          <span className="lv-tablet-n">1</span>
          <span>
            Open the <strong>Camera</strong> on the iPad and point it at the code. Tap the yellow link.
          </span>
        </li>
        <li>
          <span className="lv-tablet-n">2</span>
          <span>The board opens by itself — nothing to sign in or install. Write with the Pencil; your palm is ignored.</span>
        </li>
        <li>
          <span className="lv-tablet-n">3</span>
          <span>
            <strong>Open PDF or photo</strong> brings your notes or slides in as pages. Arrows turn pages; the pointer tool is a laser.
          </span>
        </li>
      </ol>
      {link && (
        <div className="lv-url">
          <input readOnly value={link.url} aria-label="Link for the tablet" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="lv-chip-btn" onClick={() => copy(link.url)}>
            <Copy className="size-3.5" aria-hidden="true" /> Copy
          </button>
        </div>
      )}
      <p className="lv-tablet-note">Keep your mic and camera on this computer; the iPad only sends the board, so there is no echo.</p>

      <button type="button" className="lv-tablet-more" aria-expanded={other} onClick={() => setOther(!other)}>
        Other ways: a laptop’s whole screen, or mirroring an iPad to a Mac
      </button>
      {other && (
        <div className="lv-tablet-other">
          <section className="lv-tablet-sec" aria-labelledby="lv-ts-direct">
            <h2 id="lv-ts-direct" className="lv-tablet-h">A laptop, Chromebook or Windows tablet</h2>
            <p className="lv-tablet-note">Open this link on it and tap once: its whole screen is shared.</p>
            {screenUrl && (
              <div className="lv-url">
                <input readOnly value={screenUrl} aria-label="Whole-screen link" onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className="lv-chip-btn" onClick={() => copy(screenUrl)}>
                  <Copy className="size-3.5" aria-hidden="true" /> Copy
                </button>
              </div>
            )}
          </section>
          <section className="lv-tablet-sec" aria-labelledby="lv-ts-mirror">
            <h2 id="lv-ts-mirror" className="lv-tablet-h">Mirror an iPad app to this Mac</h2>
            <p className="lv-tablet-warn">
              Recent macOS shows a mirrored iPad as <strong>black</strong> to everyone while it is being shared — Apple blocks it. Use the board above unless you must show another iPad app. The room tells you at once if the picture is black.
            </p>
            <ol className="lv-steps">
              <li>Connect the iPad to the Mac with a cable, then open QuickTime Player → File → New Movie Recording → click the arrow by the record button → choose the iPad.</li>
              <li>Or wirelessly: on the iPad, Control Centre → Screen Mirroring → this Mac (Mac: System Settings → General → AirDrop &amp; Handoff → AirPlay Receiver on).</li>
              <li>Allow your browser to record the screen once: System Settings → Privacy &amp; Security → Screen &amp; System Audio Recording → turn it on, then reopen the browser.</li>
            </ol>
            <button type="button" className="lv-chip-btn lv-tablet-go" onClick={() => void session.shareScreen('iPad screen')}>
              <MonitorUp className="size-4" aria-hidden="true" /> Share the iPad’s window
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

/* ── Settings ── */
export function SettingsPanel({ session, s }: { session: LiveSession; s: LiveState }) {
  const [devices, setDevices] = useState<Awaited<ReturnType<typeof listDevices>> | null>(null)
  const [, force] = useState(0)
  useEffect(() => {
    void listDevices().then(setDevices)
  }, [s.micTrack, s.camTrack])
  const p = session.prefs
  const pick = (kind: 'mic' | 'cam' | 'speaker', id: string) => void session.setDevice(kind, id).then(() => force((n) => n + 1))
  return (
    <div className="lv-panel-body lv-settings">
      <label className="lv-field">
        <span className="ed-label">Microphone</span>
        <select className="lv-select" value={p.mic} onChange={(e) => pick('mic', e.target.value)}>
          <option value="">System default</option>
          {devices?.mics.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || 'Microphone'}
            </option>
          ))}
        </select>
      </label>
      <label className="lv-field">
        <span className="ed-label">Camera</span>
        <select className="lv-select" value={p.cam} onChange={(e) => pick('cam', e.target.value)}>
          <option value="">System default</option>
          {devices?.cams.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || 'Camera'}
            </option>
          ))}
        </select>
      </label>
      {canPickSpeaker() && (
        <label className="lv-field">
          <span className="ed-label">Speaker</span>
          <select className="lv-select" value={p.speaker} onChange={(e) => pick('speaker', e.target.value)}>
            <option value="">System default</option>
            {devices?.speakers.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Speaker'}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="lv-check">
        <input
          type="checkbox"
          checked={p.noise}
          onChange={(e) => {
            void session.setNoise(e.target.checked)
            force((n) => n + 1)
          }}
        />
        <span>
          <strong>Reduce background noise</strong>
          <span className="lv-hint">Fans, traffic and typing are softened. Turn off for music.</span>
        </span>
      </label>
      <label className="lv-check">
        <input
          type="checkbox"
          checked={p.mirror}
          onChange={(e) => {
            session.setMirror(e.target.checked)
            force((n) => n + 1)
          }}
        />
        <span>
          <strong>Mirror my video</strong>
          <span className="lv-hint">Only on your screen. Others always see you the right way round.</span>
        </span>
      </label>
      <p className="lv-hint">
        {s.transport === 'sfu' || s.transport === 'cf' ? 'Media goes through the video server, so big classes stay smooth.' : 'Devices connect to each other directly. Small rooms only.'}
      </p>
    </div>
  )
}
