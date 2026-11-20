/*
  Live rooms (server: src/routes/live-rooms.js and src/live/*). A room is a
  study room or a call: video or voice, several screens at once, a whiteboard
  or camera from a tablet joined by QR, chat, raised hands and reactions.
*/
import { api } from '@/lib/api'

export type LiveMode = 'video' | 'voice'
export type Visibility = 'public' | 'link' | 'invite'
export type Face = { username: string; name: string; avatar: string | null; avatarUrl: string | null }

export interface LiveRoom {
  code: string
  title: string
  host: string
  mode: LiveMode
  visibility: Visibility
  locked: boolean
  isCall: boolean
  about: { kind: 'gate'; target: string; title: string } | null
  createdAt: number
  endedAt: number | null
  people?: number
  faces?: Face[]
  hostInfo?: Face
  isHost?: boolean
  mineHost?: boolean
  /** Before joining: walk in, knock (waiting room) or ended. */
  enter?: 'free' | 'knock' | 'ended'
  spotlight?: string | null
  cohosts?: string[]
}

export type ScreenInfo = { id: string; label: string; kind: 'screen' | 'board' | 'camera' }

export interface PeerInfo {
  peerId: string
  username: string
  name: string
  avatar: string | null
  avatarUrl: string | null
  device: 'main' | 'tablet'
  role: 'host' | 'cohost' | 'member'
  mic: boolean
  cam: boolean
  screens: ScreenInfo[]
  hand: boolean
  joinedAt: number
  /** Cloudflare: the device's session, and the publications it sends. */
  cf?: string | null
  pubs?: string[]
}

export interface ChatMsg {
  id: number
  username: string
  name: string
  body: string
  kind: 'text' | 'code'
  at: number
  peerId?: string
}

export interface Knock {
  id: string
  username: string
  name: string
  avatar: string | null
  avatarUrl: string | null
  at: number
}

export type TransportInfo = { kind: 'sfu'; url: string; token: string } | { kind: 'mesh' | 'cf'; iceServers: RTCIceServer[]; simulcast?: boolean }

export interface JoinOk {
  ok: true
  room: LiveRoom
  self: PeerInfo
  peers: PeerInfo[]
  transport: TransportInfo
  messages: ChatMsg[]
  waiting: Knock[]
}
export type JoinReply = JoinOk | { ok: false; waiting?: boolean; error?: string; room?: LiveRoom }

const enc = encodeURIComponent

export const liveApi = {
  config: () => api.get<{ ok: true; transport: 'sfu' | 'mesh' | 'cf'; maxDevices: number; recording: boolean; calls: boolean; tablets: boolean }>('/api/live/config'),
  list: () => api.get<{ ok: true; live: LiveRoom[]; invited: LiveRoom[]; mine: LiveRoom[] }>('/api/live/rooms'),
  create: (b: { title?: string; mode: LiveMode; visibility: Visibility; about?: { kind: 'gate'; target: string } }) => api.post<{ ok: true; room: LiveRoom }>('/api/live/rooms', b).then((r) => r.room),
  room: (code: string) => api.get<{ ok: true; room: LiveRoom }>(`/api/live/rooms/${enc(code)}`).then((r) => r.room),
  end: (code: string) => api.post<{ ok: true }>(`/api/live/rooms/${enc(code)}/end`),
  device: (code: string) => api.post<{ ok: true; token: string; path: string; expiresAt: number }>(`/api/live/rooms/${enc(code)}/device`),
  deviceInfo: (token: string) => api.get<{ ok: true; code: string; title: string; mode: LiveMode; name: string; expiresAt: number }>(`/api/live/device/${enc(token)}`),
  call: (to: string[], mode: LiveMode) => api.post<{ ok: true; room: LiveRoom }>('/api/live/call', { to, mode }).then((r) => r.room),
  decline: (code: string) => api.post<{ ok: true }>(`/api/live/rooms/${enc(code)}/decline`),
  cancel: (code: string) => api.post<{ ok: true }>(`/api/live/rooms/${enc(code)}/cancel`),
}

export const REACTIONS = ['👍', '👏', '😂', '🎉', '🤔', '❤️', '✅', '❓'] as const

/** "abc-defg-hij" from a pasted link or a typed code, or null. */
export function codeFrom(input: string): string | null {
  const m = input.trim().toLowerCase().match(/([a-z]{3})-?([a-z]{4})-?([a-z]{3})\s*$/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}
