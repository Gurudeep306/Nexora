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
type TabletWay = 'screen' | 'board'
type MirrorFrom = 'ipad' | 'android'

/**
 * Teach from a tablet. Two ways:
 * - Whole screen: everything on the tablet. A laptop, Chromebook or Windows
 *   tablet shares it in one tap from the QR. An iPad or Android tablet can't
 *   from a browser (Apple and Google allow it only in installed apps), so it
 *   mirrors to this computer for free (AirPlay, a cable, or Windows' Wireless
 *   Display) and this computer shares that window, named for the tablet.
 * - Whiteboard or camera: the QR opens a board or the camera on the tablet.
 */
export function TabletPanel({ session, s }: { session: LiveSession; s: LiveState }) {
  const [way, setWay] = useState<TabletWay>('screen')
  const [from, setFrom] = useState<MirrorFrom>('ipad')
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()
  const colors = useMemo(() => themeQrColors(), [])
  const myTablet = Object.values(s.peers).find((p) => p.username === s.self?.username && p.device === 'tablet')
  const mirrored = s.screens.find((x) => x.kind === 'screen' && /screen$/i.test(x.label) && /iPad|tablet/i.test(x.label))

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

  // The whole-screen QR opens straight on "Share this whole screen".
  const url = link ? (way === 'screen' ? `${link.url}?share=screen` : link.url) : null
  const card = useMemo(
    () => (url ? handQrCard(url, { title: way === 'screen' ? 'Scan to share its screen' : 'Scan with your tablet', sub: `Works for 6 hours · ${s.room?.title ?? ''}`.slice(0, 48), colors }) : null),
    [url, way, colors, s.room?.title],
  )

  const qr = (
    <>
      {error ? (
        <p className="lv-status is-bad" role="alert">
          {error}
        </p>
      ) : card ? (
        <div className="lv-qr" dangerouslySetInnerHTML={{ __html: card }} />
      ) : (
        <div className="lv-qr is-waiting" aria-busy="true" />
      )}
      {url && (
        <div className="lv-url">
          <input readOnly value={url} aria-label="Link for the tablet" onFocus={(e) => e.currentTarget.select()} />
          <button type="button" className="lv-chip-btn" onClick={() => void navigator.clipboard?.writeText(url).then(() => toast.success('Link copied', 'Open it on your tablet.'))}>
            <Copy className="size-3.5" aria-hidden="true" /> Copy
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="lv-panel-body lv-tablet">
      <div className="lv-seg lv-tablet-way" role="radiogroup" aria-label="What to show from the tablet">
        {(
          [
            ['screen', 'Whole screen'],
            ['board', 'Whiteboard or camera'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={way === id} className={cn('lv-seg-btn', way === id && 'is-on')} onClick={() => setWay(id)}>
            {label}
          </button>
        ))}
      </div>

      {myTablet && (
        <p className="lv-status is-ok" role="status">
          <span className="lv-dot-live" aria-hidden="true" /> Your tablet is in the room.
        </p>
      )}
      {mirrored && (
        <p className="lv-status is-ok" role="status">
          <span className="lv-dot-live" aria-hidden="true" /> {mirrored.label} is being shared.
        </p>
      )}

      {way === 'board' ? (
        <>
          {qr}
          <ol className="lv-steps">
            <li>Open the camera on your iPad or tablet and point it at the code.</li>
            <li>Choose the whiteboard to teach with a stylus, or the camera to show your paper.</li>
            <li>Everyone sees it here as a shared screen. No sign-in on the tablet.</li>
          </ol>
        </>
      ) : (
        <>
          <section className="lv-tablet-sec" aria-labelledby="lv-ts-mirror">
            <h2 id="lv-ts-mirror" className="lv-tablet-h">iPad or Android tablet</h2>
            <p className="lv-tablet-note">
              Their browsers can’t share the whole screen — Apple and Google allow that only in installed apps. Mirror the tablet to this computer instead (free, nothing to install on the tablet); everything on it then shows here.
            </p>
            <div className="lv-seg" role="radiogroup" aria-label="Which tablet">
              {(
                [
                  ['ipad', 'iPad'],
                  ['android', 'Android'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={from === id} className={cn('lv-seg-btn', from === id && 'is-on')} onClick={() => setFrom(id)}>
                  {label}
                </button>
              ))}
            </div>
            {from === 'ipad' ? (
              <ol className="lv-steps">
                <li>
                  <strong>Mac, wireless:</strong> on the iPad open Control Centre → <em>Screen Mirroring</em> → choose this Mac (both on the same Wi-Fi; macOS 12 or later).
                </li>
                <li>
                  <strong>Mac, with a cable</strong> (smoothest): plug the iPad in, open QuickTime Player → File → <em>New Movie Recording</em> → click the arrow by the record button → choose the iPad.
                </li>
                <li>
                  <strong>Windows:</strong> Windows can’t receive AirPlay by itself; use a Mac, or teach with the whiteboard instead.
                </li>
                <li>Press the button below and pick the mirrored window.</li>
              </ol>
            ) : (
              <ol className="lv-steps">
                <li>
                  <strong>Windows PC:</strong> Settings → System → <em>Projecting to this PC</em> (add the free “Wireless Display” feature once), then open the <em>Connect</em> app.
                </li>
                <li>
                  On the tablet: swipe down → <em>Smart View</em>, <em>Cast</em> or <em>Screen mirroring</em> → choose this PC.
                </li>
                <li>Press the button below and pick the Connect window.</li>
              </ol>
            )}
            <button type="button" className="lv-chip-btn is-primary lv-tablet-go" onClick={() => void session.shareScreen(from === 'ipad' ? 'iPad screen' : 'Tablet screen')}>
              <MonitorUp className="size-4" aria-hidden="true" /> Share the {from === 'ipad' ? 'iPad’s' : 'tablet’s'} window
            </button>
          </section>

          <section className="lv-tablet-sec" aria-labelledby="lv-ts-direct">
            <h2 id="lv-ts-direct" className="lv-tablet-h">Laptop, Chromebook or Windows tablet</h2>
            <p className="lv-tablet-note">Scan or open the link on it, tap once, and its whole screen is shared. No sign-in.</p>
            {qr}
          </section>
        </>
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
