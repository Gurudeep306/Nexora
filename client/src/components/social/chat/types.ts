/* Shapes of the Messages API (src/chat.js, src/routes/chat.js). */

export type Role = 'owner' | 'admin' | 'member'

export interface Person {
  username: string
  display_name?: string | null
  avatar?: string | null
  avatar_url?: string | null
  status?: string | null
  last_seen?: string | null
}

export interface Member {
  username: string
  role: Role
  lastReadId: number
  invited?: boolean
  joinedAt?: string
}

export interface Preview {
  id: number
  username: string
  kind: 'text' | 'system' | 'poll'
  body: string
  deleted: boolean
  attachment: 'image' | 'audio' | 'file' | null
  share: ShareType | null
  poll?: string | null
  createdAt: string
}

export interface Conversation {
  id: number
  kind: 'dm' | 'group'
  title: string | null
  description: string
  role: Role
  lastReadId: number
  muted: boolean
  request: boolean
  inviteToken?: string | null
  lastMessageAt?: string
  members: Member[]
  last?: Preview | null
  unread?: number
}

export interface Attachment {
  url: string
  kind: 'image' | 'audio' | 'file'
  name: string
  size: number
  type: string
  durationSec?: number
  width?: number
  height?: number
}

export type ShareType = 'problem' | 'submission' | 'contest' | 'gate' | 'room'
export interface ShareCard {
  type: ShareType
  id: number | string
  title: string
  link: string
  platform?: string
  rating?: number | null
  language?: string
  verdict?: string
  timeMs?: number
  code?: string
  at?: string
  start?: string
  durationMins?: number
  problems?: number
  exam?: string
  year?: number
  marks?: number
  subject?: string
  questionType?: string
  problem?: string | null
}

export interface Poll {
  question: string
  multi: boolean
  closed: boolean
  options: { id: number; text: string; voters: string[] }[]
}

export interface Message {
  id: number
  conversationId: number
  username: string
  kind: 'text' | 'system' | 'poll'
  body: string
  attachment: Attachment | null
  share: ShareCard | null
  replyTo: (Preview & { deleted?: boolean }) | null
  reactions: Record<string, string[]>
  editedAt: string | null
  deleted: boolean
  forwarded: boolean
  poll: Poll | null
  pinnedAt: string | null
  pinnedBy: string | null
  mentions: string[]
  createdAt: string
  /* only on this device, while sending */
  tempId?: string
  pending?: boolean
  failed?: string
  draft?: { body: string; attachment: Attachment | null; share: { type: ShareType; id: number | string } | null; replyTo: number | null }
}

export type People = Record<string, Person>

export const nameOf = (people: People, u: string) => people[u]?.display_name || u

/** What a conversation is called for me: the group's name, or the other person. */
export function titleOf(c: Conversation, me: string, people: People): string {
  if (c.kind === 'group') return c.title || 'Group'
  const other = c.members.find((m) => m.username !== me)?.username ?? me
  return nameOf(people, other)
}
export const otherOf = (c: Conversation, me: string) => (c.kind === 'dm' ? (c.members.find((m) => m.username !== me)?.username ?? null) : null)

/** A message as one short line: code blocks become "[code]", spaces fold. */
export function quoteText(body: string | null | undefined): string {
  return (body || '').replace(/```[\s\S]*?(```|$)/g, '[code]').replace(/\s+/g, ' ').trim()
}

export function previewText(p: Preview | null | undefined, me: string, people: People, group: boolean): string {
  if (!p) return 'No messages yet'
  const who = p.username === me ? 'You' : nameOf(people, p.username)
  if (p.kind === 'system') return `${who} ${p.body}`
  if (p.deleted) return `${who === 'You' ? 'You' : who} deleted a message`
  const what = p.poll
    ? `Poll: ${p.poll}`
    : p.body.trim()
      ? quoteText(p.body)
      : p.attachment === 'image'
        ? 'Photo'
        : p.attachment === 'audio'
          ? 'Voice note'
          : p.attachment === 'file'
            ? 'File'
            : p.share
              ? `Shared ${SHARE_LABEL[p.share].toLowerCase()}`
              : ''
  return p.username === me || group ? `${who}: ${what}` : what
}

export const SHARE_LABEL: Record<ShareType, string> = {
  problem: 'A problem',
  submission: 'A solution',
  contest: 'A contest',
  gate: 'A GATE question',
  room: 'A solve room',
}

export function fileSize(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
export function dayLabel(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date()
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}
export function listTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return clock(iso)
  if (now.getTime() - d.getTime() < 6 * 86400000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}
