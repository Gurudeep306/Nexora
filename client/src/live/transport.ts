/*
  How media travels in a Live room. Two transports with one shape:
    - mesh.ts: browsers connect to each other directly (small rooms);
    - sfu.ts:  a LiveKit server forwards everyone's media (whole classes).
  The session (session.ts) only talks to this interface.

  Each thing a device sends is a "publication" with an id that also names its
  source: "mic", "cam", "board", "camera", or "screen-<n>" (several screens
  can be shared at once).
*/
export type Source = 'mic' | 'cam' | 'screen' | 'board' | 'camera'

export const sourceOf = (pubId: string): Source => {
  const s = pubId.split('-')[0]
  return (['mic', 'cam', 'screen', 'board', 'camera'] as const).includes(s as Source) ? (s as Source) : 'screen'
}

export type Quality = 'good' | 'poor' | 'lost' | 'unknown'

export interface TransportEvents {
  /** A remote device started sending something. */
  track: (peerId: string, pubId: string, track: MediaStreamTrack) => void
  /** It stopped. */
  untrack: (peerId: string, pubId: string) => void
  /** Who is speaking now (peer ids; the transport may include our own). */
  speakers?: (ids: string[]) => void
  quality: (peerId: string, q: Quality) => void
  /** The media connection as a whole (SFU) — reconnecting, back, or gone. */
  status: (s: 'connecting' | 'connected' | 'reconnecting' | 'failed') => void
  /** Sound is blocked until the person clicks (browser autoplay rules). */
  audioBlocked: (blocked: boolean) => void
}

export interface Transport {
  readonly kind: 'mesh' | 'sfu' | 'cf'
  connect(): Promise<void>
  publish(pubId: string, track: MediaStreamTrack): Promise<void>
  unpublish(pubId: string): Promise<void>
  /** Mic mute: stop sending sound without tearing anything down. */
  setMuted(pubId: string, muted: boolean): void
  /** Mesh only: a peer joined or left, and signalling messages from a peer. */
  /** `initiate`: we just joined, so we start the connection to this peer. */
  peerJoined(peerId: string, initiate?: boolean): void
  peerLeft(peerId: string): void
  /** Cloudflare: a peer's session and what it publishes now (pulled by name). */
  remotePubs?(peerId: string, sessionId: string | null, pubs: string[]): void
  signal(from: string, data: unknown): void
  /** Show a remote video in an element (the SFU only sends video to visible elements). */
  attach(peerId: string, pubId: string, el: HTMLMediaElement): void
  detach(peerId: string, pubId: string, el: HTMLMediaElement): void
  /** Try to start sound after a click. */
  startAudio(): Promise<void>
  close(): void
}

/** Encoding hints: text on screens stays crisp, faces stay smooth. */
export function hintTrack(pubId: string, track: MediaStreamTrack) {
  if (track.kind !== 'video') return
  const src = sourceOf(pubId)
  try {
    track.contentHint = src === 'cam' || src === 'camera' ? 'motion' : 'detail'
  } catch {
    /* older browsers */
  }
}
