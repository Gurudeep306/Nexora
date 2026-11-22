/*
  Direct connections between browsers ("mesh"), for small rooms when no LiveKit
  server is set up. Every pair of devices has one RTCPeerConnection, set up with
  the "perfect negotiation" pattern so both sides can add or remove media at
  any time without clashing. Which remote stream is which (mic, camera, which
  screen) travels alongside as a small "pubs" map: stream id → publication id.
*/
import { hintTrack, sourceOf, type Quality, type Transport, type TransportEvents } from './transport'

type Signal = {
  description?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit | null
  pubs?: Record<string, string>
  /** A stuck link is rebuilt: "please" asks the side that started it; "now" says it is being rebuilt. */
  reset?: 'please' | 'now'
}

class Link {
  pc: RTCPeerConnection
  makingOffer = false
  /** Our tracks are on this link (the answering side adds them after the first offer). */
  started = false
  ignoreOffer = false
  settingAnswer = false
  senders = new Map<string, RTCRtpSender>()
  /** Remote stream id → publication id. */
  remoteNames = new Map<string, string>()
  /** Remote tracks waiting for their name. */
  unnamed = new Map<string, MediaStreamTrack[]>()
  /** Publication ids seen from this peer, with their track. */
  remote = new Map<string, MediaStreamTrack>()

  /** A description failed to apply: this link may be stuck. */
  failed = false

  readonly peerId: string
  readonly polite: boolean
  /** We started this link (we were the newcomer, or rebuilt it). */
  readonly initiator: boolean

  constructor(peerId: string, polite: boolean, ice: RTCIceServer[], initiator: boolean) {
    this.peerId = peerId
    this.polite = polite
    this.initiator = initiator
    this.pc = new RTCPeerConnection({ iceServers: ice, bundlePolicy: 'max-bundle' })
  }
}

export class MeshTransport implements Transport {
  readonly kind = 'mesh' as const
  private links = new Map<string, Link>()
  /** Our publications: id → track and the stream that names it. */
  private pubs = new Map<string, { track: MediaStreamTrack; stream: MediaStream }>()
  private elements = new Map<string, Set<HTMLMediaElement>>()
  private closed = false

  private selfId: string
  private ice: RTCIceServer[]
  private send: (to: string, data: Signal) => void
  private on: TransportEvents

  constructor(selfId: string, ice: RTCIceServer[], send: (to: string, data: Signal) => void, on: TransportEvents) {
    this.selfId = selfId
    this.ice = ice
    this.send = send
    this.on = on
  }

  async connect() {
    this.on.status('connected')
  }

  peerJoined(peerId: string, initiate = false) {
    if (this.closed || this.links.has(peerId) || peerId === this.selfId) return
    const link = new Link(peerId, this.selfId < peerId, this.ice, initiate)
    this.links.set(peerId, link)
    const pc = link.pc
    pc.onnegotiationneeded = async () => {
      try {
        link.makingOffer = true
        await pc.setLocalDescription()
        if (pc.localDescription) this.send(peerId, { description: pc.localDescription.toJSON() })
      } catch {
        /* a later negotiation retries */
      } finally {
        link.makingOffer = false
      }
    }
    pc.onicecandidate = (e) => this.send(peerId, { candidate: e.candidate ? e.candidate.toJSON() : null })
    pc.ontrack = (e) => {
      const stream = e.streams[0]
      if (!stream) return
      const name = link.remoteNames.get(stream.id)
      if (name) this.addRemote(link, name, e.track)
      else link.unnamed.set(stream.id, [...(link.unnamed.get(stream.id) || []), e.track])
    }
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      const q: Quality = s === 'connected' ? 'good' : s === 'disconnected' ? 'poor' : s === 'failed' ? 'lost' : 'unknown'
      this.on.quality(peerId, q)
      if (s === 'failed') pc.restartIce()
    }
    if (initiate) this.start(link)
    // The newcomer always starts (a small data channel makes sure there is
    // something to offer even with the mic and camera off); the others answer.
    // Both starting at once can leave Chrome's ICE stuck.
    if (initiate) pc.createDataChannel('nx')
    // Not connected after a while (a lost packet, a sleeping laptop): restart ICE.
    const watch = window.setInterval(() => {
      if (this.links.get(peerId) !== link) return window.clearInterval(watch)
      if (pc.connectionState === 'connected') return
      if (link.polite === false || initiate) pc.restartIce()
    }, 10_000)
    // An offer left unanswered (two offers crossed, or one was lost). When
    // both sides add media at the same moment (a tablet opening its board as
    // it joins), Chrome can fail to merge the two offers ("RTP extension ID
    // reassignment") and both wait for ever. Then the link is simply rebuilt
    // by the side that started it: one fresh offer with everything in it.
    let stuck = 0
    let tries = 0
    const unstick = window.setInterval(() => {
      if (this.links.get(peerId) !== link) return window.clearInterval(unstick)
      stuck = pc.signalingState !== 'stable' && !link.makingOffer ? stuck + 1 : 0
      if (stuck < 2) return
      stuck = 0
      tries++
      if (!link.failed && tries === 1) {
        // First, the gentle way: the polite side withdraws, the other resends.
        if (link.polite) {
          void pc
            .setLocalDescription({ type: 'rollback' })
            .then(() => pc.onnegotiationneeded?.(new Event('negotiationneeded')))
            .catch(() => {})
        } else if (pc.localDescription) this.send(peerId, { description: pc.localDescription.toJSON() })
        return
      }
      window.clearInterval(unstick)
      this.rebuild(peerId)
    }, 2000)
    return
  }

  /** Start a link again from nothing (see "unstick" above). */
  private rebuild(peerId: string) {
    const link = this.links.get(peerId)
    if (!link || this.closed) return
    if (!link.initiator) {
      this.send(peerId, { reset: 'please' })
      return
    }
    this.send(peerId, { reset: 'now' })
    this.dropLink(peerId)
    this.peerJoined(peerId, true)
  }

  /** Close a link and forget its media (the peer is still in the room). */
  private dropLink(peerId: string) {
    const link = this.links.get(peerId)
    if (!link) return
    for (const pubId of link.remote.keys()) this.on.untrack(peerId, pubId)
    link.pc.close()
    this.links.delete(peerId)
  }

  /** Put our tracks on a link and tell the peer which stream is which. */
  private start(link: Link) {
    if (link.started) return
    link.started = true
    for (const [pubId, p] of this.pubs) link.senders.set(pubId, link.pc.addTrack(p.track, p.stream))
    this.sendNames(link)
    this.tuneAll()
  }

  peerLeft(peerId: string) {
    const link = this.links.get(peerId)
    if (!link) return
    for (const pubId of link.remote.keys()) this.on.untrack(peerId, pubId)
    link.pc.close()
    this.links.delete(peerId)
    this.queues.delete(peerId)
    this.tuneAll()
  }

  /** Messages from each peer are handled strictly in order: a candidate must
   *  never be added before the description it belongs to has been set. */
  private queues = new Map<string, Promise<void>>()
  signal(from: string, raw: unknown) {
    const next = (this.queues.get(from) ?? Promise.resolve()).then(() => this.handle(from, raw as Signal))
    this.queues.set(from, next.catch(() => {}))
  }

  private async handle(from: string, data: Signal) {
    if (data.reset === 'please') {
      if (this.links.get(from)?.initiator) this.rebuild(from)
      return
    }
    if (data.reset === 'now') {
      // The other side starts again: its next offer makes a fresh link here.
      this.dropLink(from)
      return
    }
    let link = this.links.get(from)
    if (!link) {
      // A newcomer's first message: answer it.
      this.peerJoined(from, false)
      link = this.links.get(from)
      if (!link) return
    }
    const pc = link.pc
    try {
      if (data.pubs) {
        link.remoteNames = new Map(Object.entries(data.pubs))
        for (const [sid, tracks] of link.unnamed) {
          const name = link.remoteNames.get(sid)
          if (!name) continue
          link.unnamed.delete(sid)
          for (const t of tracks) this.addRemote(link, name, t)
        }
        // Publications that are gone.
        const live = new Set(link.remoteNames.values())
        for (const pubId of [...link.remote.keys()]) {
          if (!live.has(pubId)) {
            link.remote.delete(pubId)
            this.on.untrack(from, pubId)
          }
        }
      }
      if (data.description) {
        const d = data.description
        const ready = !link.makingOffer && (pc.signalingState === 'stable' || link.settingAnswer)
        const collision = d.type === 'offer' && !ready
        link.ignoreOffer = !link.polite && collision
        if (link.ignoreOffer) return
        // The polite side steps back from its own offer first (said out loud:
        // not every browser does it by itself, and a silent failure here left
        // both sides waiting for each other for ever).
        if (collision && pc.signalingState === 'have-local-offer') await pc.setLocalDescription({ type: 'rollback' })
        link.settingAnswer = d.type === 'answer'
        await pc.setRemoteDescription(d)
        link.settingAnswer = false
        if (d.type === 'offer') {
          await pc.setLocalDescription()
          if (pc.localDescription) this.send(from, { description: pc.localDescription.toJSON() })
          // Only now add our own tracks: they go in a second offer from us,
          // after this exchange has settled, so the two sides never clash.
          if (!link.started) this.start(link)
        }
      } else if (data.candidate !== undefined) {
        try {
          await pc.addIceCandidate(data.candidate ?? undefined)
        } catch (e) {
          if (!link.ignoreOffer) throw e
        }
      }
    } catch {
      // The next offer, an ICE restart or a rebuild (unstick) recovers.
      if (data.description) link.failed = true
    }
  }

  private addRemote(link: Link, pubId: string, track: MediaStreamTrack) {
    link.remote.set(pubId, track)
    track.addEventListener('ended', () => {
      if (link.remote.get(pubId) === track) {
        link.remote.delete(pubId)
        this.on.untrack(link.peerId, pubId)
      }
    })
    this.on.track(link.peerId, pubId, track)
  }

  private sendNames(link?: Link) {
    const pubs = Object.fromEntries([...this.pubs].map(([pubId, p]) => [p.stream.id, pubId]))
    for (const l of link ? [link] : this.links.values()) if (l.started) this.send(l.peerId, { pubs })
  }

  /** Lower video quality as the room grows: every device uploads to every other. */
  private tuneAll() {
    const n = Math.max(1, this.links.size)
    for (const link of this.links.values()) {
      for (const [pubId, sender] of link.senders) {
        const src = sourceOf(pubId)
        if (!sender.track || sender.track.kind !== 'video') continue
        const max = src === 'cam' ? (n <= 1 ? 1_500_000 : n <= 2 ? 900_000 : 450_000) : n <= 2 ? 2_500_000 : 1_200_000
        const p = sender.getParameters()
        if (!p.encodings?.length) continue
        p.encodings[0].maxBitrate = max
        sender.setParameters(p).catch(() => {})
      }
    }
  }

  async publish(pubId: string, track: MediaStreamTrack) {
    hintTrack(pubId, track)
    const existing = this.pubs.get(pubId)
    if (existing) {
      existing.track = track
      for (const link of this.links.values()) await link.senders.get(pubId)?.replaceTrack(track)
      return
    }
    const stream = new MediaStream([track])
    this.pubs.set(pubId, { track, stream })
    for (const link of this.links.values()) if (link.started) link.senders.set(pubId, link.pc.addTrack(track, stream))
    this.sendNames()
    this.tuneAll()
  }

  async unpublish(pubId: string) {
    if (!this.pubs.delete(pubId)) return
    for (const link of this.links.values()) {
      const s = link.senders.get(pubId)
      link.senders.delete(pubId)
      if (s) {
        try {
          link.pc.removeTrack(s)
        } catch {
          /* already closed */
        }
      }
    }
    this.sendNames()
  }

  setMuted(pubId: string, muted: boolean) {
    const p = this.pubs.get(pubId)
    if (p) p.track.enabled = !muted
  }

  attach(peerId: string, pubId: string, el: HTMLMediaElement) {
    const t = this.links.get(peerId)?.remote.get(pubId)
    if (!t) return
    const key = `${peerId}/${pubId}`
    if (!this.elements.has(key)) this.elements.set(key, new Set())
    this.elements.get(key)!.add(el)
    const cur = el.srcObject as MediaStream | null
    if (!cur || cur.getTracks()[0] !== t) el.srcObject = new MediaStream([t])
    void el.play().catch(() => t.kind === 'audio' && this.on.audioBlocked(true))
  }

  detach(peerId: string, pubId: string, el: HTMLMediaElement) {
    this.elements.get(`${peerId}/${pubId}`)?.delete(el)
    el.srcObject = null
  }

  async startAudio() {
    let ok = true
    for (const set of this.elements.values()) for (const el of set) if (el instanceof HTMLAudioElement) await el.play().catch(() => (ok = false))
    this.on.audioBlocked(!ok)
  }

  close() {
    this.closed = true
    for (const id of [...this.links.keys()]) this.peerLeft(id)
    this.pubs.clear()
  }
}
