/*
  Media through Cloudflare Realtime ("SFU"). Each device has one connection to
  Cloudflare's nearest server (one session). It pushes its mic, camera and
  screens there once; to see someone, it pulls their tracks by name from
  their session. Our server passes these requests on with the app secret
  (socket events "cf:*", src/live/signal.js), so the secret never reaches a
  browser.

  - Cameras are sent in two sizes (simulcast: "h" 720p and "l" 180p); a small
    tile asks for the small one, a big tile for the big one.
  - Every change to the connection goes through one queue, in order.
  - Bytes received are reported now and then, for Admin → Live's usage.
*/
import type { Socket } from 'socket.io-client'
import { hintTrack, sourceOf, type Quality, type Transport, type TransportEvents } from './transport'

type CfReply = {
  errorCode?: string
  errorDescription?: string
  sessionId?: string
  sessionDescription?: RTCSessionDescriptionInit
  requiresImmediateRenegotiation?: boolean
  tracks?: { mid?: string; trackName?: string; sessionId?: string; errorCode?: string; errorDescription?: string }[]
}

type Remote = { peerId: string; pubId: string; sessionId: string; mid: string; track: MediaStreamTrack; rid: 'h' | 'l' | null }

export class CfTransport implements Transport {
  readonly kind = 'cf' as const
  private socket: Socket
  private on: TransportEvents
  private ice: RTCIceServer[]
  private pc: RTCPeerConnection | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private local = new Map<string, RTCRtpTransceiver>()
  private remote = new Map<string, Remote>() // key peerId/pubId
  private wanted = new Map<string, { sessionId: string; pubs: string[] }>()
  private sizes = new Map<string, Set<HTMLMediaElement>>()
  private usageTimer: number | null = null
  private lastBytes = 0
  private lastAt = 0
  private closed = false

  constructor(socket: Socket, ice: RTCIceServer[], on: TransportEvents) {
    this.socket = socket
    this.ice = ice
    this.on = on
  }

  private call(event: string, body: object = {}): Promise<CfReply> {
    return new Promise((resolve) => this.socket.timeout(15_000).emit(event, body, (err: Error | null, r: CfReply) => resolve(err ? { errorCode: 'timeout', errorDescription: 'No answer from the server.' } : r)))
  }
  private run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn)
    this.queue = next.catch(() => {})
    return next
  }
  private async stable() {
    const pc = this.pc!
    if (pc.signalingState === 'stable') return
    await new Promise<void>((res) => {
      const t = window.setTimeout(res, 5000)
      const f = () => {
        if (pc.signalingState === 'stable') {
          window.clearTimeout(t)
          pc.removeEventListener('signalingstatechange', f)
          res()
        }
      }
      pc.addEventListener('signalingstatechange', f)
    })
  }

  async connect() {
    this.on.status('connecting')
    const r = await this.call('cf:session')
    if (!r.sessionId) throw new Error(r.errorDescription || 'Could not open a session on the video server.')
    const pc = new RTCPeerConnection({ iceServers: this.ice, bundlePolicy: 'max-bundle' })
    this.pc = pc
    pc.addEventListener('connectionstatechange', () => {
      const s = pc.connectionState
      if (s === 'connected') this.on.status('connected')
      if (s === 'disconnected') this.on.status('reconnecting')
      if (s === 'failed') this.on.status('failed')
      const q: Quality = s === 'connected' ? 'good' : s === 'disconnected' ? 'poor' : s === 'failed' ? 'lost' : 'unknown'
      this.on.quality('__self', q)
    })
    this.on.status('connected')
    // Usage: what this device received, every 30 seconds.
    this.usageTimer = window.setInterval(() => void this.reportUsage(), 30_000)
  }

  private async reportUsage() {
    if (!this.pc) return
    let bytes = 0
    const stats = await this.pc.getStats().catch(() => null)
    stats?.forEach((s) => {
      if (s.type === 'transport' && typeof s.bytesReceived === 'number') bytes += s.bytesReceived
    })
    const now = Date.now()
    if (this.lastAt && bytes >= this.lastBytes) this.socket.emit('usage', { bytes: bytes - this.lastBytes, ms: now - this.lastAt })
    this.lastBytes = bytes
    this.lastAt = now
  }

  /* ── sending ── */
  publish(pubId: string, track: MediaStreamTrack) {
    return this.run(async () => {
      if (!this.pc) return
      hintTrack(pubId, track)
      const have = this.local.get(pubId)
      if (have) {
        await have.sender.replaceTrack(track)
        return
      }
      const src = sourceOf(pubId)
      const video = track.kind === 'video'
      const tr = this.pc.addTransceiver(track, {
        direction: 'sendonly',
        // Two sizes of each camera; screens one sharp copy.
        sendEncodings: !video
          ? undefined
          : src === 'cam' || src === 'camera'
            ? [
                { rid: 'h', maxBitrate: 1_000_000, maxFramerate: 24 },
                { rid: 'l', maxBitrate: 160_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
              ]
            : [{ maxBitrate: 2_000_000, maxFramerate: 15 }],
      })
      this.local.set(pubId, tr)
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      const r = await this.call('cf:push', { sdp: offer.sdp, tracks: [{ mid: tr.mid, trackName: pubId }] })
      if (r.errorCode || !r.sessionDescription) throw new Error(r.errorDescription || 'The video server did not take this track.')
      await this.pc.setRemoteDescription(r.sessionDescription)
      await this.stable()
    })
  }

  unpublish(pubId: string) {
    const tr = this.local.get(pubId)
    if (!tr) return Promise.resolve()
    this.local.delete(pubId)
    return this.closeMids([tr])
  }

  private closeMids(trs: RTCRtpTransceiver[]) {
    return this.run(async () => {
      if (!this.pc || this.pc.connectionState === 'closed') return
      const mids = trs.map((t) => t.mid).filter(Boolean) as string[]
      for (const t of trs) t.stop()
      if (!mids.length) return
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      const r = await this.call('cf:close', { sdp: offer.sdp, mids })
      if (r.sessionDescription) await this.pc.setRemoteDescription(r.sessionDescription)
      await this.stable()
    })
  }

  setMuted(pubId: string, muted: boolean) {
    const t = this.local.get(pubId)?.sender.track
    if (t) t.enabled = !muted
  }

  /* ── receiving: what each peer publishes, kept in step ── */
  peerJoined() {}
  signal() {}
  peerLeft(peerId: string) {
    this.wanted.delete(peerId)
    const gone = [...this.remote.values()].filter((r) => r.peerId === peerId)
    for (const r of gone) {
      this.remote.delete(`${r.peerId}/${r.pubId}`)
      this.on.untrack(r.peerId, r.pubId)
    }
    const trs = gone.map((r) => this.pc?.getTransceivers().find((t) => t.mid === r.mid)).filter(Boolean) as RTCRtpTransceiver[]
    if (trs.length) void this.closeMids(trs).catch(() => {})
  }

  /** A peer's session and the publications it sends now. */
  remotePubs(peerId: string, sessionId: string | null, pubs: string[]) {
    if (!sessionId) return
    this.wanted.set(peerId, { sessionId, pubs })
    const have = [...this.remote.values()].filter((r) => r.peerId === peerId)
    const add = pubs.filter((p) => !have.some((r) => r.pubId === p))
    const drop = have.filter((r) => !pubs.includes(r.pubId) || r.sessionId !== sessionId)
    for (const r of drop) {
      this.remote.delete(`${r.peerId}/${r.pubId}`)
      this.on.untrack(r.peerId, r.pubId)
    }
    const trs = drop.map((r) => this.pc?.getTransceivers().find((t) => t.mid === r.mid)).filter(Boolean) as RTCRtpTransceiver[]
    if (trs.length) void this.closeMids(trs).catch(() => {})
    if (add.length) void this.pull(peerId, sessionId, add).catch(() => {})
  }

  private pull(peerId: string, sessionId: string, pubs: string[], tries = 0): Promise<void> {
    return this.run(async () => {
      if (!this.pc) return
      // Still wanted? (The peer may have stopped sharing while we waited.)
      const w = this.wanted.get(peerId)
      const list = pubs.filter((p) => w?.sessionId === sessionId && w.pubs.includes(p) && !this.remote.has(`${peerId}/${p}`))
      if (!list.length) return
      const r = await this.call('cf:pull', {
        tracks: list.map((p) => ({ sessionId, trackName: p, rid: sourceOf(p) === 'cam' || sourceOf(p) === 'camera' ? 'h' : undefined })),
      })
      if (r.errorCode) {
        // A track that was not ready yet: try again, waiting a little longer each time.
        if (tries < 4) window.setTimeout(() => void this.pull(peerId, sessionId, list, tries + 1).catch(() => {}), 800 * 2 ** tries)
        return
      }
      if (r.requiresImmediateRenegotiation && r.sessionDescription) {
        await this.pc.setRemoteDescription(r.sessionDescription)
        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)
        const a = await this.call('cf:answer', { sdp: answer.sdp })
        if (a.errorCode) throw new Error(a.errorDescription || 'Renegotiation failed.')
        await this.stable()
      }
      for (const t of r.tracks ?? []) {
        if (!t.mid || t.errorCode || !t.trackName) continue
        const tr = this.pc.getTransceivers().find((x) => x.mid === t.mid)
        if (!tr) continue
        const cam = sourceOf(t.trackName) === 'cam' || sourceOf(t.trackName) === 'camera'
        const rem: Remote = { peerId, pubId: t.trackName, sessionId, mid: t.mid, track: tr.receiver.track, rid: cam ? 'h' : null }
        this.remote.set(`${peerId}/${t.trackName}`, rem)
        this.on.track(peerId, t.trackName, tr.receiver.track)
      }
    })
  }

  /** Big tiles get the big copy of a camera, small tiles the small one. */
  private tune(key: string) {
    const r = this.remote.get(key)
    if (!r || !r.rid) return
    const els = [...(this.sizes.get(key) ?? [])]
    const widest = Math.max(0, ...els.map((e) => e.clientWidth))
    const rid: 'h' | 'l' = widest > 360 ? 'h' : 'l'
    if (rid === r.rid || !els.length) return
    r.rid = rid
    void this.call('cf:quality', { sessionId: r.sessionId, trackName: r.pubId, mid: r.mid, rid })
  }

  attach(peerId: string, pubId: string, el: HTMLMediaElement) {
    const key = `${peerId}/${pubId}`
    const r = this.remote.get(key)
    if (!r) return
    const cur = el.srcObject as MediaStream | null
    if (!cur || cur.getTracks()[0] !== r.track) el.srcObject = new MediaStream([r.track])
    void el.play().catch(() => r.track.kind === 'audio' && this.on.audioBlocked(true))
    if (!this.sizes.has(key)) this.sizes.set(key, new Set())
    this.sizes.get(key)!.add(el)
    window.setTimeout(() => this.tune(key), 300)
  }

  detach(peerId: string, pubId: string, el: HTMLMediaElement) {
    const key = `${peerId}/${pubId}`
    this.sizes.get(key)?.delete(el)
    el.srcObject = null
    this.tune(key)
  }

  async startAudio() {
    let ok = true
    for (const set of this.sizes.values()) for (const el of set) if (el instanceof HTMLAudioElement) await el.play().catch(() => (ok = false))
    this.on.audioBlocked(!ok)
  }

  close() {
    if (this.closed) return
    this.closed = true
    void this.reportUsage()
    if (this.usageTimer) window.clearInterval(this.usageTimer)
    this.pc?.close()
    this.pc = null
    this.local.clear()
    this.remote.clear()
  }
}
