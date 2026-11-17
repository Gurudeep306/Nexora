/** Shapes of /api/social/* and /api/profiles/* (src/routes/social.js). */

export interface SocialUser {
  username: string
  display_name?: string | null
  avatar?: string | null
  avatar_url?: string | null
  role?: string
  verified?: boolean
}

export interface PollOption {
  text: string
  votes: number
}

export interface ShareCard {
  type: 'solved' | 'gate_test' | 'streak' | 'lesson' | 'achievement'
  title: string
  subtitle?: string
  stat?: string
  link?: string
  icon?: string
  at?: string | number
}

export interface Post {
  id: number
  author: SocialUser
  body: string
  code: { lang: string; source: string } | null
  images: string[]
  poll: { options: PollOption[]; total: number; my_vote: number | null; closes_at: number | null; closed: boolean } | null
  share: ShareCard | null
  quote: (Post & { unavailable?: undefined }) | { unavailable: true } | null
  created_at: number
  edited_at: number | null
  featured: boolean
  removed: boolean
  counts: { likes: number; comments: number; reposts: number }
  me: { liked: boolean; bookmarked: boolean; reposted: boolean }
}

export interface FeedItem {
  key: string
  cursor: number
  post: Post
  reposted_by?: SocialUser
  reposted_at?: number
}

export interface FeedPage {
  items: FeedItem[]
  next: string | null
  locked?: boolean
}

export interface Comment {
  id: number
  post_id: number
  parent_id: number | null
  author: SocialUser
  body: string
  tombstone: 'deleted' | 'removed' | null
  removed: boolean
  likes: number
  liked: boolean
  created_at: number
  edited_at: number | null
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'follow'
  | 'follow_request'
  | 'follow_accepted'
  | 'repost'
  | 'quote'
  | 'comment_like'

export interface NotificationGroup {
  id: number
  type: NotificationType
  post_id: number | null
  comment_id: number | null
  actors: SocialUser[]
  actor_count: number
  created_at: number
  read: boolean
  snippet: string
}

export interface Relation {
  self: boolean
  following: 'accepted' | 'pending' | null
  followsMe: boolean
  blockedByMe: boolean
  blocksMe: boolean
  muted: boolean
}

export interface ProfileLink {
  label: string
  url: string
}

export interface PublicProfile {
  username: string
  display_name: string | null
  avatar: string | null
  avatar_url: string | null
  bio: string
  status: string
  role: string
  verified: boolean
  /** Staff: their job title on the team (Admin → Staff access). */
  team_title?: string | null
  created_at: string
  last_seen: string | null
  cover: string
  accent: AccentKey
  location: string
  pronouns: string
  website: string
  links: ProfileLink[]
  visibility: 'public' | 'followers'
  counts: { followers: number; following: number; posts: number; friends: number }
}

export interface ProfileResponse {
  profile: PublicProfile
  relation: Relation
  locked: boolean
}

export type AccentKey = 'brand' | 'info' | 'success' | 'warning' | 'danger'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: string
  target: number
  xp_reward: number
  progress: number
  unlocked_at: string | null
}

export interface Showcase {
  locked: boolean
  stats?: {
    xp: number
    solved: number
    attempted: number
    level: { level: number; name: string; xpInLevel: number; xpForNext: number; probsInLevel?: number; probsForNext?: number; probGated?: boolean }
    streak: { current: number; best: number }
    difficulty: { easy: number; medium: number; hard: number; unrated: number }
    gate: { attempted: number; correct: number; accuracy: number | null; tests: number; best_score: number | null; best_percentile: number | null }
    contests: { joined: number; rated: number; rating: number | null }
  }
  heatmap?: { date: string; count: number; solved: number; gate: number; xp: number }[]
  topics?: { topic: string; solved: number }[]
  languages?: { language: string; submissions: number; accepted: number }[]
  achievements?: Achievement[]
  pinned?: ({ type: 'post'; post: Post } | { type: 'achievement'; achievement: Achievement })[]
  timeline?: { kind: string; at: number; title: string; meta?: string; link?: string }[]
  /** Verified judge accounts (Codeforces, AtCoder, LeetCode). */
  linked?: { platform: string; handle: string; rating: number | null; max_rating: number | null; rank: string | null; solved: number | null; last_import: number | null }[]
}

export interface Shareables {
  solved: { id: number; title: string; rating: number; platform: string }[]
  tests: { id: string; title: string; score: number; max: number | null }[]
  lessons: { id: number; title: string; category: string }[]
  achievements: { id: string; title: string; icon: string }[]
  streak: { current: number; best: number }
}

export const profilePath = (username: string) => `/u/${encodeURIComponent(username)}`
export const postPath = (id: number) => `/social/post/${id}`
export const tagPath = (tag: string) => `/social/tag/${encodeURIComponent(tag.toLowerCase())}`
export const displayName = (u: SocialUser | null | undefined) => u?.display_name || u?.username || ''
