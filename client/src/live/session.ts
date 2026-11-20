/*
  One Live room session: the socket to the server, the media transport, our
  own mic, camera and screens, and everything the room screen shows. React
  reads it with useLive() (a useSyncExternalStore store); actions are methods.

  Joining:  connect the "/live" socket → "join" → (waiting room?) → the server
            says which transport to use → publish our mic/camera.
  Leaving:  "leave", close the transport, stop our tracks.
  Network:  if the socket drops, the session rejoins by itself when it is back.
*/
import { io, type Socket } from 'socket.io-client'
import { useSyncExternalStore } from 'react'
import { API_BASE } from '@/lib/api'
import type { ChatMsg, JoinOk, JoinReply, Knock, LiveRoom, PeerInfo, ScreenInfo } from './api'
import { MeshTransport } from './mesh'
import { SfuTransport } from './sfu'
import { CfTransport } from './cf'
import { Meter } from './levels'
import type { Quality, Transport } from './transport'
import { cameraTrack, micTrack, loadPrefs, savePrefs, screenTrack, type Prefs } from './devices'

export type Phase = 'idle' | 'joining' | 'waiting' | 'in' | 'reconnecting' | 'ended' | 'removed' | 'denied' | 'error'
export type LocalScreen = ScreenInfo & { track: MediaStreamTrack }
export type Notice = { id: number; text: string; tone?: 'info' | 'warning' | 'error' }
export type Reaction = { key: number; peerId: string; emoji: string; at: number }

export interface LiveState {
  phase: Phase
  message: string | null
  room: LiveRoom | null
  self: PeerInfo | null
  peers: Record<string, PeerInfo>
  /** Remote media: peerId → publication id → track. */
  media: Record<string, Record<string, MediaStreamTrack>>
  mic: boolean
  cam: boolean
  micTrack: MediaStreamTrack | null
  camTrack: MediaStreamTrack | null
  screens: LocalScreen[]
  speaking: Record<string, true>
  quality: Record<string, Quality>
  messages: ChatMsg[]
  unread: number
  waiting: Knock[]
  /** peerId → when the hand went up (for the queue order). */
  hands: Record<string, number>
  reactions: Reaction[]
  recording: Record<string, string>
  transport: 'mesh' | 'sfu' | 'cf' | null
  media_status: 'connecting' | 'connected' | 'reconnecting' | 'failed' | null
  audioBlocked: boolean
  /** Talking while the mic is off. */
  mutedTalking: boolean
  notices: Notice[]
  joinedAt: number | null
}

const initial = (): LiveState => ({
  phase: 'idle',
  message: null,
  room: null,
  self: null,
  peers: {},
  media: {},
  mic: false,
  cam: false,
  micTrack: null,
  camTrack: null,
  screens: [],
  speaking: {},
  quality: {},
  messages: [],
  unread: 0,
  waiting: [],
  hands: {},
  reactions: [],
  recording: {},
  transport: null,
  media_status: null,
  audioBlocked: false,
  mutedTalking: false,
  notices: [],
  joinedAt: null,
})

let noticeId = 0
let reactionKey = 0

export class LiveSession {
  private state: LiveState = initial()
  private listeners = new Set<() => void>()
  private socket: Socket | null = null
  private transport: Transport | null = null
  private meters = new Map<string, Meter>()
  private selfMeter: Meter | null = null
  private tick: number | null = null
  private early: { from: string; data: unknown }[] = []
  private transportReady = false
  private chatOpen = false
  private wanted: { mic: boolean; cam: boolean } = { mic: true, cam: true }
  prefs: Prefs = loadPrefs()

  readonly code: string
  private opts: { device?: string; voice?: boolean }

  constructor(code: string, opts: { device?: string; voice?: boolean } = {}) {
    this.code = code
    this.opts = opts
  }

  /* ── store ── */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  get = () => this.state
  private set(patch: Partial<LiveState> | ((s: LiveState) => Partial<LiveState>)) {
    const p = typeof patch === 'function' ? patch(this.state) : patch
    this.state = { ...this.state, ...p }
    for (const fn of this.listeners) fn()
  }
  notice(text: string, tone: Notice['tone'] = 'info') {
    const n = { id: ++noticeId, text, tone }
    this.set((s) => ({ notices: [...s.notices.slice(-3), n] }))
    window.setTimeout(() => this.set((s) => ({ notices: s.notices.filter((x) => x.id !== n.id) })), 5000)
  }

  /* ── joining ── */
  /** Join with the tracks made on the pre-join screen (they are handed over). */
  async join({ mic, cam, micTrack: m, camTrack: c }: { mic: boolean; cam: boolean; micTrack?: MediaStreamTrack | null; camTrack?: MediaStreamTrack | null }) {
    this.wanted = { mic, cam }
    this.set({ phase: 'joining', message: null, micTrack: m ?? null, camTrack: c ?? null })
    const opts = { transports: ['websocket', 'polling'], withCredentials: true, auth: this.opts.device ? { device: this.opts.device } : {}, reconnectionDelayMax: 4000 }
    const socket = API_BASE ? io(`${API_BASE}/live`, opts) : io('/live', opts)
    this.socket = socket
    this.wire(socket)
    let first = true
    socket.on('connect', () => {
      if (first) {
        first = false
        void this.enter()
      } else if (this.state.phase === 'reconnecting' || this.state.phase === 'in') {
        void this.enter(true)
      }
    })
    socket.on('connect_error', (e) => {
      if (this.state.phase === 'joining') this.set({ phase: 'error', message: e.message || 'Could not connect.' })
    })
    socket.on('disconnect', (reason) => {
      if (this.state.phase === 'in') this.set({ phase: 'reconnecting', message: null })
      if (reason === 'io server disconnect' && this.state.phase === 'reconnecting') socket.connect()
    })
  }

  private async enter(again = false) {
    const reply = await new Promise<JoinReply>((resolve) => this.socket!.emit('join', { code: this.code }, resolve))
    if (reply.ok) return this.onJoined(reply, again)
    if (reply.waiting) return this.set({ phase: 'waiting', room: reply.room ?? null })
    this.set({ phase: 'error', message: reply.error || 'Could not join.' })
  }

  private async onJoined(r: JoinOk, again: boolean) {
    this.transport?.close()
    this.transport = null
    this.transportReady = false
    this.set((s) => ({
      phase: 'in',
      room: r.room,
      self: r.self,
      peers: Object.fromEntries(r.peers.map((p) => [p.peerId, p])),
      media: {},
      messages: again ? s.messages : r.messages,
      waiting: r.waiting,
      hands: Object.fromEntries(r.peers.filter((p) => p.hand).map((p) => [p.peerId, p.joinedAt])),
      transport: r.transport.kind,
      joinedAt: s.joinedAt ?? Date.now(),
    }))
    const events = {
      track: (peerId: string, pubId: string, track: MediaStreamTrack) => {
        this.set((s) => ({ media: { ...s.media, [peerId]: { ...s.media[peerId], [pubId]: track } } }))
        if (track.kind === 'audio' && this.transport?.kind !== 'sfu') {
          this.meters.get(peerId)?.stop()
          this.meters.set(peerId, new Meter(track))
        }
      },
      untrack: (peerId: string, pubId: string) => {
        this.set((s) => {
          const m = { ...s.media[peerId] }
          delete m[pubId]
          return { media: { ...s.media, [peerId]: m } }
        })
        if (pubId === 'mic') {
          this.meters.get(peerId)?.stop()
          this.meters.delete(peerId)
        }
      },
      speakers: (ids: string[]) => {
        const self = this.state.self?.peerId
        this.set({ speaking: Object.fromEntries(ids.map((id) => [id === '__self' && self ? self : id, true as const])) })
      },
      quality: (peerId: string, q: Quality) => this.set((s) => ({ quality: { ...s.quality, [peerId === '__self' ? s.self?.peerId || peerId : peerId]: q } })),
      status: (st: LiveState['media_status']) => this.set({ media_status: st }),
      audioBlocked: (b: boolean) => this.set({ audioBlocked: b }),
    }
    const t: Transport =
      r.transport.kind === 'sfu'
        ? new SfuTransport(r.transport.url, r.transport.token, events)
        : r.transport.kind === 'cf'
          ? new CfTransport(this.socket!, r.transport.iceServers, events)
          : new MeshTransport(r.self.peerId, r.transport.iceServers, (to, data) => this.socket?.emit('signal', { to, data }), events)
    this.transport = t
    try {
      await t.connect()
    } catch (e) {
      this.set({ phase: 'error', message: `Could not reach the video server. ${(e as Error).message || ''}`.trim() })
      return
    }
    for (const p of r.peers) t.peerJoined(p.peerId, true)
    for (const p of r.peers) t.remotePubs?.(p.peerId, p.cf ?? null, p.pubs ?? [])
    this.transportReady = true
    for (const m of this.early.splice(0)) t.signal(m.from, m.data)
    // Our media: first join uses the pre-join choice; a rejoin restores what was on.
    const want = again ? { mic: this.state.mic, cam: this.state.cam } : this.wanted
    await this.publishMic(want.mic)
    if (want.cam && !this.opts.voice) await this.setCam(true)
    for (const sc of this.state.screens) await t.publish(sc.id, sc.track)
    this.pushState()
    this.startTick()
  }

  private wire(socket: Socket) {
    socket.on('peer-joined', (p: PeerInfo) => {
      // The newcomer starts the connection; we answer when their offer comes.
      this.set((s) => ({ peers: { ...s.peers, [p.peerId]: p } }))
      this.transport?.remotePubs?.(p.peerId, p.cf ?? null, p.pubs ?? [])
    })
    socket.on('peer-left', ({ peerId }: { peerId: string }) => {
      this.transport?.peerLeft(peerId)
      this.meters.get(peerId)?.stop()
      this.meters.delete(peerId)
      this.set((s) => {
        const peers = { ...s.peers }
        const media = { ...s.media }
        const hands = { ...s.hands }
        const recording = { ...s.recording }
        delete peers[peerId]
        delete media[peerId]
        delete hands[peerId]
        delete recording[peerId]
        return { peers, media, hands, recording }
      })
    })
    socket.on('peer-state', (p: Pick<PeerInfo, 'peerId' | 'mic' | 'cam' | 'screens' | 'cf' | 'pubs'>) => {
      if (p.peerId !== this.state.self?.peerId) this.transport?.remotePubs?.(p.peerId, p.cf ?? null, p.pubs ?? [])
      this.set((s) => {
        if (p.peerId === s.self?.peerId) return { self: { ...s.self, ...p } }
        const cur = s.peers[p.peerId]
        return cur ? { peers: { ...s.peers, [p.peerId]: { ...cur, ...p } } } : {}
      })
    })
    socket.on('peer-role', ({ peerId, role }: { peerId: string; role: PeerInfo['role'] }) => {
      this.set((s) => {
        if (peerId === s.self?.peerId) return { self: { ...s.self, role } }
        const cur = s.peers[peerId]
        return cur ? { peers: { ...s.peers, [peerId]: { ...cur, role } } } : {}
      })
      if (peerId === this.state.self?.peerId) this.notice(role === 'cohost' ? 'You are now a co-host.' : 'You are no longer a co-host.')
    })
    // Offers can arrive a moment before our transport exists; they wait for it.
    socket.on('signal', ({ from, data }: { from: string; data: unknown }) => {
      if (this.transport && this.transportReady) this.transport.signal(from, data)
      else this.early.push({ from, data })
    })
    socket.on('chat', (m: ChatMsg) => {
      this.set((s) => ({ messages: [...s.messages.slice(-499), m], unread: this.chatOpen || m.peerId === s.self?.peerId ? 0 : s.unread + 1 }))
    })
    socket.on('hand', ({ peerId, up, at }: { peerId: string; up: boolean; at: number }) => {
      this.set((s) => {
        const hands = { ...s.hands }
        if (up) hands[peerId] = at
        else delete hands[peerId]
        return { hands }
      })
      const s = this.state
      if (up && peerId !== s.self?.peerId && this.isHost()) this.notice(`${s.peers[peerId]?.name ?? 'Someone'} raised a hand`)
    })
    socket.on('react', ({ peerId, emoji, at }: { peerId: string; emoji: string; at: number }) => {
      const r = { key: ++reactionKey, peerId, emoji, at }
      this.set((s) => ({ reactions: [...s.reactions.slice(-19), r] }))
      window.setTimeout(() => this.set((s) => ({ reactions: s.reactions.filter((x) => x.key !== r.key) })), 4200)
    })
    socket.on('recording', ({ peerId, on, name }: { peerId: string; on: boolean; name: string }) => {
      this.set((s) => {
        const recording = { ...s.recording }
        if (on) recording[peerId] = name
        else delete recording[peerId]
        return { recording }
      })
      if (peerId !== this.state.self?.peerId) this.notice(on ? `${name} started recording this room` : `${name} stopped recording`, on ? 'warning' : 'info')
    })
    socket.on('knock', (k: Knock) => {
      this.set((s) => ({ waiting: [...s.waiting.filter((w) => w.id !== k.id), k] }))
      this.notice(`${k.name} is waiting to join`)
    })
    socket.on('waiting-list', (list: Knock[]) => this.set({ waiting: list }))
    socket.on('knock-gone', ({ id }: { id: string }) => this.set((s) => ({ waiting: s.waiting.filter((w) => w.id !== id) })))
    socket.on('admitted', (r: JoinOk) => void this.onJoined(r, false))
    socket.on('denied', ({ reason }: { reason: string }) => {
      this.set({ phase: 'denied', message: reason })
      this.teardown()
    })
    socket.on('room', (patch: Partial<LiveRoom>) => {
      this.set((s) => ({ room: s.room ? { ...s.room, ...patch } : s.room }))
      if (patch.locked !== undefined) this.notice(patch.locked ? 'The room is locked. New people wait to be let in.' : 'The room is open again.')
    })
    socket.on('muted-by-host', ({ by, what }: { by: string; what: 'mic' | 'cam' }) => {
      if (what === 'cam') void this.setCam(false)
      else this.setMic(false)
      this.notice(`${by} turned off your ${what === 'cam' ? 'camera' : 'mic'}`, 'warning')
    })
    socket.on('removed', ({ reason }: { reason: string }) => {
      this.set({ phase: 'removed', message: reason })
      this.teardown()
    })
    socket.on('ended', ({ reason }: { reason: string }) => {
      this.set({ phase: 'ended', message: reason })
      this.teardown()
    })
  }

  /** Who is speaking, the muted hint (direct rooms read levels themselves). */
  private startTick() {
    if (this.tick) return
    this.tick = window.setInterval(() => {
      const s = this.state
      if (s.phase !== 'in') return
      const self = s.self?.peerId
      const talking = (this.selfMeter?.level() ?? 0) > 0.09
      const patch: Partial<LiveState> = {}
      if (s.transport !== 'sfu') {
        const speaking: Record<string, true> = {}
        for (const [id, m] of this.meters) if (s.peers[id]?.mic && m.level() > 0.06) speaking[id] = true
        if (self && s.mic && talking) speaking[self] = true
        const a = Object.keys(speaking).sort().join()
        if (a !== Object.keys(s.speaking).sort().join()) patch.speaking = speaking
      }
      const hint = !s.mic && talking
      if (hint !== s.mutedTalking) patch.mutedTalking = hint
      if (Object.keys(patch).length) this.set(patch)
    }, 160)
  }

  private pushState() {
    const s = this.state
    // What this device sends (Cloudflare rooms pull these by name).
    const pubs = [...(s.micTrack && !this.opts.device ? ['mic'] : []), ...(s.cam ? ['cam'] : []), ...s.screens.map((x) => x.id)]
    this.socket?.emit('state', { mic: s.mic, cam: s.cam, screens: s.screens.map(({ id, label, kind }) => ({ id, label, kind })), pubs })
    this.set((st) => (st.self ? { self: { ...st.self, mic: s.mic, cam: s.cam, screens: s.screens.map(({ id, label, kind }) => ({ id, label, kind })) } } : {}))
  }

  isHost() {
    const r = this.state.self?.role
    return r === 'host' || r === 'cohost'
  }

  /* ── our media ── */
  /** Send a track; if the media server refuses, say so instead of failing silently. */
  private async send(pubId: string, track: MediaStreamTrack) {
    try {
      await this.transport?.publish(pubId, track)
    } catch (e) {
      const what = pubId === 'mic' ? 'your microphone' : pubId === 'cam' ? 'your camera' : 'your screen'
      this.notice(`Could not send ${what}: ${(e as Error).message || 'the connection had a problem'}. Try turning it off and on.`, 'error')
    }
  }

  private async publishMic(on: boolean) {
    if (this.opts.device) return // a tablet never sends sound (no echo)
    let t = this.state.micTrack
    if (!t || t.readyState === 'ended') {
      try {
        t = await micTrack(this.prefs)
      } catch (e) {
        this.notice((e as Error).message, 'error')
        this.set({ mic: false })
        return
      }
      this.set({ micTrack: t })
    }
    this.selfMeter?.stop()
    this.selfMeter = new Meter(t)
    await this.send('mic', t)
    this.transport?.setMuted('mic', !on)
    this.set({ mic: on })
  }

  setMic(on: boolean) {
    if (this.opts.device) return
    if (!this.state.micTrack) {
      void this.publishMic(on).then(() => this.pushState())
      return
    }
    this.transport?.setMuted('mic', !on)
    this.set({ mic: on, mutedTalking: false })
    this.pushState()
  }

  async setCam(on: boolean) {
    if (on) {
      let t = this.state.camTrack
      if (!t || t.readyState === 'ended') {
        try {
          t = await cameraTrack(this.prefs)
        } catch (e) {
          this.notice((e as Error).message, 'error')
          return
        }
      }
      this.set({ camTrack: t, cam: true })
      await this.send('cam', t)
    } else {
      // The light goes off: the track is stopped, not just hidden.
      await this.transport?.unpublish('cam')
      this.state.camTrack?.stop()
      this.set({ camTrack: null, cam: false })
    }
    this.pushState()
  }

  /** Share a screen, a window or a tab. Several can be shared at once. */
  async shareScreen() {
    if (this.state.screens.filter((x) => x.kind === 'screen').length >= 3) {
      this.notice('You can share up to three screens at once.', 'warning')
      return
    }
    let got: { track: MediaStreamTrack; label: string }
    try {
      got = await screenTrack()
    } catch (e) {
      const msg = (e as Error).message
      if (msg) this.notice(msg, 'warning')
      return
    }
    const id = `screen-${Math.random().toString(36).slice(2, 8)}`
    got.track.addEventListener('ended', () => void this.stopScreen(id))
    await this.addScreen({ id, label: got.label, kind: 'screen', track: got.track })
  }

  /** A whiteboard or a camera pointed at paper (a canvas or camera track). */
  async addScreen(sc: LocalScreen) {
    this.set((s) => ({ screens: [...s.screens.filter((x) => x.id !== sc.id), sc] }))
    await this.send(sc.id, sc.track)
    this.pushState()
  }

  async stopScreen(id: string) {
    const sc = this.state.screens.find((x) => x.id === id)
    if (!sc) return
    this.set((s) => ({ screens: s.screens.filter((x) => x.id !== id) }))
    await this.transport?.unpublish(id)
    if (sc.kind !== 'board') sc.track.stop()
    this.pushState()
  }

  async setDevice(kind: 'mic' | 'cam' | 'speaker', id: string) {
    this.prefs = { ...this.prefs, [kind]: id }
    savePrefs(this.prefs)
    if (kind === 'mic' && this.state.micTrack) {
      const t = await micTrack(this.prefs).catch(() => null)
      if (!t) return
      this.state.micTrack.stop()
      this.set({ micTrack: t })
      this.selfMeter?.stop()
      this.selfMeter = new Meter(t)
      await this.send('mic', t)
      this.transport?.setMuted('mic', !this.state.mic)
    }
    if (kind === 'cam' && this.state.cam) {
      const t = await cameraTrack(this.prefs).catch(() => null)
      if (!t) return
      const old = this.state.camTrack
      this.set({ camTrack: t })
      await this.send('cam', t)
      old?.stop()
    }
    if (kind === 'speaker') this.set({}) // audio elements read prefs.speaker
  }

  setMirror(on: boolean) {
    this.prefs = { ...this.prefs, mirror: on }
    savePrefs(this.prefs)
    this.set({})
  }

  async setNoise(on: boolean) {
    this.prefs = { ...this.prefs, noise: on }
    savePrefs(this.prefs)
    await this.state.micTrack?.applyConstraints({ noiseSuppression: on, echoCancellation: true, autoGainControl: on }).catch(() => {})
    this.set({})
  }

  /* ── the room ── */
  hand(up: boolean) {
    this.socket?.emit('hand', { up })
  }
  react(emoji: string) {
    this.socket?.emit('react', { emoji })
  }
  setRecording(on: boolean) {
    this.socket?.emit('recording', { on })
  }
  chat(body: string, kind: 'text' | 'code' = 'text') {
    return new Promise<{ ok: boolean; error?: string }>((resolve) => this.socket?.emit('chat', { body, kind }, resolve))
  }
  setChatOpen(open: boolean) {
    this.chatOpen = open
    if (open && this.state.unread) this.set({ unread: 0 })
  }
  attach(peerId: string, pubId: string, el: HTMLMediaElement) {
    this.transport?.attach(peerId, pubId, el)
  }
  detach(peerId: string, pubId: string, el: HTMLMediaElement) {
    this.transport?.detach(peerId, pubId, el)
  }
  startAudio() {
    void this.transport?.startAudio()
  }

  /* ── host ── */
  admit(id: string, allow: boolean) {
    this.socket?.emit('admit', { id, allow })
  }
  muteOther(peerId: string, what: 'mic' | 'cam' = 'mic') {
    this.socket?.emit('mute', { peerId, what })
  }
  remove(peerId: string) {
    this.socket?.emit('remove', { peerId })
  }
  lock(locked: boolean) {
    this.socket?.emit('lock', { locked })
  }
  spotlight(peerId: string | null) {
    this.socket?.emit('spotlight', { peerId })
  }
  lowerHands() {
    this.socket?.emit('lower-hands')
  }
  cohost(username: string, on: boolean) {
    this.socket?.emit('cohost', { username, on })
  }
  endForAll() {
    this.socket?.emit('end')
  }

  leave() {
    this.socket?.emit('leave')
    this.set({ phase: 'ended', message: null })
    this.teardown()
  }

  private teardown() {
    if (this.tick) window.clearInterval(this.tick)
    this.tick = null
    this.transport?.close()
    this.transport = null
    this.transportReady = false
    this.early = []
    for (const m of this.meters.values()) m.stop()
    this.meters.clear()
    this.selfMeter?.stop()
    this.selfMeter = null
    const s = this.state
    s.micTrack?.stop()
    s.camTrack?.stop()
    for (const sc of s.screens) sc.track.stop()
    this.set({ micTrack: null, camTrack: null, screens: [], mic: false, cam: false, media: {} })
    this.socket?.disconnect()
    this.socket = null
  }

  /** Called when the page closes or the component unmounts. */
  dispose() {
    if (this.socket) {
      this.socket.emit('leave')
      this.teardown()
    }
  }
}

export function useLive(session: LiveSession): LiveState {
  return useSyncExternalStore(session.subscribe, session.get, session.get)
}
