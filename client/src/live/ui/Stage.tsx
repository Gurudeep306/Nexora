/*
  The stage: every person and every shared screen as a tile, laid out to use
  the space well.

    gallery   everyone the same size, as large as the window allows
              (pages of 25 on a computer, 6 on a phone)
    present   shared screens big (up to four side by side), people in a strip
    speaker   whoever is talking big, everyone else in a strip

  "Auto" presents when anyone shares, and shows the gallery otherwise. Pinning
  a tile (on this screen only) or the host's spotlight (for everyone) puts one
  tile in front.
*/
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Copy, ChevronLeft, ChevronRight, Hand, Maximize2, MicOff, Monitor, Pin, PinOff, PenLine, Camera, WifiOff, Star } from 'lucide-react'
import { Avatar, useToast } from '@/components/ui'
import { encodeQr, qrArt } from '@/components/profile/qr'
import { markSvg } from '@/components/brand/traversal'
import { themeQrColors } from '@/components/hand/qrCard'
import { cn } from '@/lib/utils'
import type { PeerInfo } from '../api'
import type { LiveSession, LiveState } from '../session'

export type Layout = 'auto' | 'gallery' | 'speaker'

type TileItem = {
  key: string
  peerId: string
  /** The publication shown: "cam", a screen id, or null (no video: avatar). */
  pubId: string | null
  screen: boolean
  label: string
  kind?: 'screen' | 'board' | 'camera'
  person: PeerInfo
  self: boolean
  track: MediaStreamTrack | null
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

/** The largest tile size that fits n tiles of the given aspect in w×h. */
function fit(n: number, w: number, h: number, aspect: number, gap = 10) {
  let best = { cols: 1, tw: 0, th: 0 }
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    let tw = (w - gap * (cols - 1)) / cols
    let th = tw / aspect
    if (th * rows + gap * (rows - 1) > h) {
      th = (h - gap * (rows - 1)) / rows
      tw = th * aspect
    }
    if (tw > best.tw) best = { cols, tw: Math.floor(tw), th: Math.floor(th) }
  }
  return best
}

export function Stage({ session, s, layout, pinned, onPin }: { session: LiveSession; s: LiveState; layout: Layout; pinned: string | null; onPin: (key: string | null) => void }) {
  const [ref, size] = useSize<HTMLDivElement>()
  const [page, setPage] = useState(0)
  const [lastSpeaker, setLastSpeaker] = useState<string | null>(null)

  const self = s.self
  const tiles = useMemo(() => {
    const people: TileItem[] = []
    const screens: TileItem[] = []
    const add = (p: PeerInfo, isSelf: boolean, media: Record<string, MediaStreamTrack> | undefined) => {
      if (p.device === 'main') {
        const camTrack = isSelf ? (s.cam ? s.camTrack : null) : p.cam ? media?.cam ?? null : null
        people.push({ key: `${p.peerId}:p`, peerId: p.peerId, pubId: camTrack ? 'cam' : null, screen: false, label: p.name, person: p, self: isSelf, track: camTrack })
      }
      const list = isSelf ? s.screens.map(({ id, label, kind }) => ({ id, label, kind })) : p.screens
      for (const sc of list) {
        const track = isSelf ? s.screens.find((x) => x.id === sc.id)?.track ?? null : media?.[sc.id] ?? null
        screens.push({ key: `${p.peerId}:${sc.id}`, peerId: p.peerId, pubId: sc.id, screen: true, label: sc.label, kind: sc.kind, person: p, self: isSelf, track })
      }
    }
    if (self) add({ ...self, mic: s.mic, cam: s.cam }, true, undefined)
    for (const p of Object.values(s.peers).sort((a, b) => a.joinedAt - b.joinedAt)) add(p, false, s.media[p.peerId])
    return { people, screens }
  }, [s.peers, s.media, s.screens, s.cam, s.camTrack, s.mic, self])

  // The active speaker sticks until someone else talks.
  const talker = Object.keys(s.speaking).find((id) => id !== self?.peerId) ?? null
  if (talker && talker !== lastSpeaker) setLastSpeaker(talker)

  // Your own shared screen is not shown big to you (you are looking at it).
  const shown = tiles.screens.filter((t) => !(t.self && t.kind === 'screen'))
  const mine = tiles.screens.filter((t) => t.self && t.kind === 'screen')
  const all = [...shown, ...tiles.people, ...mine]
  const spotKey = s.room?.spotlight ? all.find((t) => t.peerId === s.room?.spotlight && (t.screen || !tiles.screens.some((x) => x.peerId === t.peerId)))?.key : null
  const focusKey = pinned && all.some((t) => t.key === pinned) ? pinned : spotKey ?? null
  const mode = focusKey ? 'focus' : layout === 'speaker' ? 'speaker' : layout === 'gallery' ? 'gallery' : shown.length ? 'present' : 'gallery'

  const phone = size.w < 640
  let main: TileItem[] = []
  let strip: TileItem[] = []
  if (mode === 'focus') {
    main = all.filter((t) => t.key === focusKey)
    strip = all.filter((t) => t.key !== focusKey)
  } else if (mode === 'present') {
    main = shown.slice(0, 4)
    strip = [...shown.slice(4), ...tiles.people, ...mine]
  } else if (mode === 'speaker') {
    const key = tiles.people.find((t) => t.peerId === lastSpeaker)?.key ?? tiles.people.find((t) => !t.self)?.key ?? tiles.people[0]?.key
    main = all.filter((t) => t.key === key)
    strip = all.filter((t) => t.key !== key)
  } else {
    main = all
  }
  // Alone in the room: an invitation sits beside you.
  const alone = mode === 'gallery' && Object.keys(s.peers).length === 0

  const perPage = phone ? 6 : 25
  const pages = mode === 'gallery' ? Math.max(1, Math.ceil(main.length / perPage)) : 1
  const pg = Math.min(page, pages - 1)
  if (mode === 'gallery') main = main.slice(pg * perPage, pg * perPage + perPage)

  const side = !phone && strip.length > 0 && size.w > 900
  const stripW = side ? Math.min(240, Math.max(180, size.w * 0.18)) : 0
  const stripH = !side && strip.length ? (phone ? 92 : 120) : 0
  const areaW = Math.max(0, size.w - stripW - (side ? 12 : 0))
  const areaH = Math.max(0, size.h - stripH - (stripH ? 10 : 0))
  const aspect = mode === 'gallery' ? (phone && main.length <= 2 ? 4 / 5 : 16 / 9) : main.some((t) => t.screen) ? 16 / 10 : 16 / 9
  const box = fit(Math.max(1, main.length + (alone ? 1 : 0)), areaW, areaH, aspect)

  return (
    <div ref={ref} className={cn('lv-stage', side ? 'is-side' : 'is-bottom')} data-mode={mode}>
      <div className="lv-main" style={{ width: areaW, height: areaH }}>
        <div className="lv-grid" style={{ gridTemplateColumns: `repeat(${box.cols}, ${box.tw}px)`, gridAutoRows: `${box.th}px` }}>
          {main.map((t) => (
            <Tile key={t.key} t={t} s={s} session={session} pinned={pinned === t.key} onPin={onPin} big />
          ))}
          {alone && <Invite code={session.code} compact={box.th < 300} />}
        </div>
        {pages > 1 && (
          <div className="lv-pager">
            <button type="button" className="lv-round" onClick={() => setPage(Math.max(0, pg - 1))} disabled={pg === 0} aria-label="Previous page of people">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="lv-pager-n">
              {pg + 1} / {pages}
            </span>
            <button type="button" className="lv-round" onClick={() => setPage(Math.min(pages - 1, pg + 1))} disabled={pg >= pages - 1} aria-label="Next page of people">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {strip.length > 0 && (
        <div className="lv-strip" style={side ? { width: stripW } : { height: stripH }} aria-label="Others in the room">
          {strip.map((t) => (
            <div key={t.key} className="lv-strip-item" style={side ? { height: Math.round(stripW * (9 / 16)) } : { width: Math.round(stripH * (16 / 9)) }}>
              <Tile t={t} s={s} session={session} pinned={pinned === t.key} onPin={onPin} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Video({ t, session, mirror }: { t: TileItem; session: LiveSession; mirror: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !t.track || !t.pubId) return
    if (t.self) {
      el.srcObject = new MediaStream([t.track])
      void el.play().catch(() => {})
      return () => {
        el.srcObject = null
      }
    }
    session.attach(t.peerId, t.pubId, el)
    const pid = t.peerId
    const pub = t.pubId
    return () => session.detach(pid, pub, el)
  }, [t.track, t.pubId, t.peerId, t.self, session])
  return <video ref={ref} className={cn('lv-video', t.screen ? 'is-screen' : 'is-cam', mirror && 'is-mirror')} autoPlay playsInline muted />
}

function Tile({ t, s, session, pinned, onPin, big = false }: { t: TileItem; s: LiveState; session: LiveSession; pinned: boolean; onPin: (k: string | null) => void; big?: boolean }) {
  const p = t.person
  const speaking = !t.screen && !!s.speaking[t.peerId]
  const hand = !t.screen && s.hands[p.peerId] !== undefined
  const handN = hand ? Object.entries(s.hands).sort((a, b) => a[1] - b[1]).findIndex(([id]) => id === p.peerId) + 1 : 0
  const q = s.quality[t.peerId]
  const spot = s.room?.spotlight === t.peerId
  const ref = useRef<HTMLDivElement>(null)
  const who = t.self ? 'You' : p.name
  const label = t.screen ? `${who} · ${t.kind === 'board' ? 'Whiteboard' : t.kind === 'camera' ? 'Camera' : t.label}` : t.self ? `${p.name} (you)` : p.name
  const KindIcon = t.kind === 'board' ? PenLine : t.kind === 'camera' ? Camera : Monitor
  const selfScreen = t.self && t.screen && t.kind === 'screen'

  return (
    <div ref={ref} className={cn('lv-tile', t.screen && 'is-screen', speaking && 'is-speaking', !t.track && 'is-empty')} data-big={big || undefined} aria-label={label}>
      {t.track && !selfScreen ? (
        <Video t={t} session={session} mirror={t.self && !t.screen && session.prefs.mirror} />
      ) : selfScreen ? (
        <div className="lv-self-screen">
          <Monitor className="size-6" aria-hidden="true" />
          <p>You are sharing your {t.label.toLowerCase()}.</p>
          <button type="button" className="lv-chip-btn" onClick={() => void session.stopScreen(t.pubId!)}>
            Stop sharing
          </button>
        </div>
      ) : t.screen ? (
        <div className="lv-self-screen">
          <KindIcon className="size-6" aria-hidden="true" />
          <p>Connecting…</p>
        </div>
      ) : (
        <div className="lv-avatar-wrap lv-ruled">
          <span className={cn('lv-avatar-ring', speaking && 'is-on')}>
            <Avatar src={p.avatarUrl} avatar={p.avatar} name={p.name} seed={p.username} size={big ? '3xl' : 'lg'} className="lv-avatar" />
          </span>
        </div>
      )}

      <div className="lv-tile-foot">
        <span className="lv-name">
          {t.screen && <KindIcon className="size-3.5 shrink-0" aria-hidden="true" />}
          {!t.screen && !p.mic && <MicOff className="size-3.5 shrink-0 text-state-error" aria-label="Mic off" />}
          {!t.screen && p.mic && (
            <span role="img" className={cn('lv-voice', speaking && 'is-on')} aria-label={speaking ? 'Speaking' : 'Mic on'}>
              <i />
              <i />
              <i />
            </span>
          )}
          {spot && <Star className="size-3.5 shrink-0" aria-label="In the spotlight" />}
          <span className="truncate">{label}</span>
          {!t.screen && p.role !== 'member' && <span className="lv-role">{p.role === 'host' ? 'Host' : 'Co-host'}</span>}
        </span>
      </div>
      {hand && (
        <span className="lv-hand" aria-label={`Hand raised, ${handN} in line`}>
          <Hand className="size-3.5" aria-hidden="true" /> {handN}
        </span>
      )}
      {(q === 'poor' || q === 'lost') && !t.self && (
        <span className="lv-weak" title="Weak connection">
          <WifiOff className="size-3.5" aria-label="Weak connection" />
        </span>
      )}
      <div className="lv-tile-tools">
        <button type="button" className="lv-mini" onClick={() => onPin(pinned ? null : t.key)} aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`} title={pinned ? 'Unpin' : 'Pin for me'}>
          {pinned ? <PinOff className="size-3.5" aria-hidden="true" /> : <Pin className="size-3.5" aria-hidden="true" />}
        </button>
        {t.screen && t.track && (
          <button type="button" className="lv-mini" onClick={() => void ref.current?.requestFullscreen?.().catch(() => {})} aria-label={`Full screen: ${label}`} title="Full screen">
            <Maximize2 className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

/** When you are alone: the code, the link, and a QR to join from a phone. */
function Invite({ code, compact }: { code: string; compact: boolean }) {
  const toast = useToast()
  const url = `${window.location.origin}/live/${code}`
  const qr = useMemo(() => {
    const c = themeQrColors()
    const m = encodeQr(url, 'Q')
    return qrArt(m, { quiet: 2, ink: c.ink, paper: c.paper, eye: c.accent, centre: m.length >= 33 ? 7 : 5, mark: markSvg({ id: 'lvinvite', ink: c.ink, clay: c.accent }) })
  }, [url])
  return (
    <div className="lv-invite">
      <div className="lv-invite-text">
        <p className="ed-label m-0">Waiting for others</p>
        <p className="lv-invite-title">Invite your study group</p>
        <p className="lv-invite-code" aria-label={`Room code ${code.split('').join(' ')}`}>
          {code}
        </p>
        <button type="button" className="lv-chip-btn" onClick={() => void navigator.clipboard?.writeText(url).then(() => toast.success('Link copied', 'Send it to your group.'))}>
          <Copy className="size-3.5" aria-hidden="true" /> Copy the link
        </button>
      </div>
      {!compact && (
        <figure className="lv-invite-qr" aria-label="QR code to join from a phone">
          <svg viewBox={`0 0 ${qr.size} ${qr.size}`} dangerouslySetInnerHTML={{ __html: qr.svg }} />
          <figcaption>Scan to join from a phone</figcaption>
        </figure>
      )}
    </div>
  )
}
