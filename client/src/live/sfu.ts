/*
  Media through a LiveKit server ("SFU"), for rooms of any size. Each device
  uploads its camera, mic and screens once; the server forwards them. LiveKit's
  simulcast sends small and large copies of each camera, and "adaptive stream"
  only receives video for tiles that are on screen, at the size they are shown,
  so a class of 50 stays light on every phone.

  The library is loaded only when a room uses it (it is large).
*/
import type { Room, RemoteTrack, RemoteTrackPublication, RemoteParticipant, LocalTrack } from 'livekit-client'
import { hintTrack, sourceOf, type Quality, type Transport, type TransportEvents } from './transport'

export class SfuTransport implements Transport {
  readonly kind = 'sfu' as const
  private room: Room | null = null
  private lk: typeof import('livekit-client') | null = null
  private local = new Map<string, LocalTrack>()
  private remote = new Map<string, RemoteTrack>()

  private url: string
  private token: string
  private on: TransportEvents

  constructor(url: string, token: string, on: TransportEvents) {
    this.url = url
    this.token = token
    this.on = on
  }

  async connect() {
    const lk = await import('livekit-client')
    this.lk = lk
    const { Room, RoomEvent, ConnectionQuality, VideoPresets } = lk
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      disconnectOnPageLeave: true,
      publishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
        screenShareEncoding: { maxBitrate: 2_500_000, maxFramerate: 15 },
        dtx: true,
        red: true,
      },
    })
    this.room = room
    const key = (p: RemoteParticipant, pub: RemoteTrackPublication) => `${p.identity}/${pub.trackName}`
    room
      .on(RoomEvent.TrackSubscribed, (track, pub, p) => {
        this.remote.set(key(p, pub), track)
        this.on.track(p.identity, pub.trackName, track.mediaStreamTrack)
      })
      .on(RoomEvent.TrackUnsubscribed, (_t, pub, p) => {
        this.remote.delete(key(p, pub))
        this.on.untrack(p.identity, pub.trackName)
      })
      .on(RoomEvent.ActiveSpeakersChanged, (list) => this.on.speakers?.(list.map((s) => (s === room.localParticipant ? '__self' : s.identity))))
      .on(RoomEvent.ConnectionQualityChanged, (q, p) => {
        const map: Record<string, Quality> = { [ConnectionQuality.Excellent]: 'good', [ConnectionQuality.Good]: 'good', [ConnectionQuality.Poor]: 'poor', [ConnectionQuality.Lost]: 'lost' }
        this.on.quality(p === room.localParticipant ? '__self' : p.identity, map[q] ?? 'unknown')
      })
      .on(RoomEvent.Reconnecting, () => this.on.status('reconnecting'))
      .on(RoomEvent.Reconnected, () => this.on.status('connected'))
      .on(RoomEvent.Disconnected, () => this.on.status('failed'))
      .on(RoomEvent.AudioPlaybackStatusChanged, () => this.on.audioBlocked(!room.canPlaybackAudio))
    this.on.status('connecting')
    await room.connect(this.url, this.token, { autoSubscribe: true })
    this.on.status('connected')
    this.on.audioBlocked(!room.canPlaybackAudio)
  }

  async publish(pubId: string, track: MediaStreamTrack) {
    const lk = this.lk
    const room = this.room
    if (!lk || !room) return
    hintTrack(pubId, track)
    const old = this.local.get(pubId)
    if (old) {
      await old.replaceTrack(track, { userProvidedTrack: true })
      return
    }
    const src = sourceOf(pubId)
    const source = src === 'mic' ? lk.Track.Source.Microphone : src === 'cam' ? lk.Track.Source.Camera : src === 'camera' ? lk.Track.Source.Unknown : lk.Track.Source.ScreenShare
    const pub = await room.localParticipant.publishTrack(track, { name: pubId, source, simulcast: src === 'cam' || src === 'camera' })
    if (pub.track) this.local.set(pubId, pub.track)
  }

  async unpublish(pubId: string) {
    const t = this.local.get(pubId)
    if (!t || !this.room) return
    this.local.delete(pubId)
    await this.room.localParticipant.unpublishTrack(t, false).catch(() => {})
  }

  setMuted(pubId: string, muted: boolean) {
    const t = this.local.get(pubId)
    if (!t) return
    // Our own mic track stays alive (the level meter reads it); only sending stops.
    void (muted ? t.mute() : t.unmute()).catch(() => {})
  }

  peerJoined() {}
  peerLeft() {}
  signal() {}

  attach(peerId: string, pubId: string, el: HTMLMediaElement) {
    this.remote.get(`${peerId}/${pubId}`)?.attach(el)
  }

  detach(peerId: string, pubId: string, el: HTMLMediaElement) {
    this.remote.get(`${peerId}/${pubId}`)?.detach(el)
  }

  async startAudio() {
    await this.room?.startAudio().catch(() => {})
    this.on.audioBlocked(!(this.room?.canPlaybackAudio ?? true))
  }

  close() {
    void this.room?.disconnect(false)
    this.room = null
    this.local.clear()
    this.remote.clear()
  }
}
