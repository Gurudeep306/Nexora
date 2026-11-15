/**
 * The NexoraGuru avatar set: 16 "Portraits" (flat editorial drawings in the
 * Field Journal palette, the default for new accounts) and 16 "Clay"
 * characters, shipped as static SVGs in client/public/avatars/<id>.svg
 * (source and build script: docs/brand/avatars/src/). A choice is stored in `users.avatar` as
 * "set:<id>". Anything else (old "gen:<style>:<n>" values, legacy preset
 * keys, empty) resolves to a deterministic default picked from the username,
 * so every user always has a picture and it is the same on every device.
 *
 * Keep AVATAR_SET in sync with src/avatar-set.js (the server's copy used for
 * validation and the lazy migration); tests/avatar-set.test.js checks both
 * against the SVG files.
 */

export const AVATAR_SET = [
  { id: 'asha', group: 'portraits' },
  { id: 'vikram', group: 'portraits' },
  { id: 'meera', group: 'portraits' },
  { id: 'rohan', group: 'portraits' },
  { id: 'fatima', group: 'portraits' },
  { id: 'kabir', group: 'portraits' },
  { id: 'priya', group: 'portraits' },
  { id: 'harpreet', group: 'portraits' },
  { id: 'tara', group: 'portraits' },
  { id: 'nikhil', group: 'portraits' },
  { id: 'ishita', group: 'portraits' },
  { id: 'yusuf', group: 'portraits' },
  { id: 'ananya', group: 'portraits' },
  { id: 'sameer', group: 'portraits' },
  { id: 'divya', group: 'portraits' },
  { id: 'raghav', group: 'portraits' },
  { id: 'mira', group: 'clay' },
  { id: 'kai', group: 'clay' },
  { id: 'noor', group: 'clay' },
  { id: 'arjun', group: 'clay' },
  { id: 'zara', group: 'clay' },
  { id: 'leo', group: 'clay' },
  { id: 'sana', group: 'clay' },
  { id: 'dev', group: 'clay' },
  { id: 'ivy', group: 'clay' },
  { id: 'omar', group: 'clay' },
  { id: 'hana', group: 'clay' },
  { id: 'ravi', group: 'clay' },
  { id: 'ama', group: 'clay' },
  { id: 'theo', group: 'clay' },
  { id: 'lina', group: 'clay' },
  { id: 'jay', group: 'clay' },
] as const

export type AvatarId = (typeof AVATAR_SET)[number]['id']

const IDS = new Set<string>(AVATAR_SET.map((a) => a.id))
const isAvatarId = (v: string): v is AvatarId => IDS.has(v)

/** FNV-1a over the lower-cased username. Must match src/avatar-set.js. */
function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export const AVATAR_GROUPS = [
  { id: 'portraits', name: 'Portraits' },
  { id: 'clay', name: 'Clay' },
] as const

/** New accounts get a portrait (the first group), picked from the username. */
const DEFAULT_POOL = AVATAR_SET.filter((a) => a.group === 'portraits')

/** The avatar a user gets until they pick one. */
export function defaultAvatarId(seed: string | null | undefined): AvatarId {
  return DEFAULT_POOL[hash(String(seed ?? '').toLowerCase()) % DEFAULT_POOL.length].id
}

/** The set id a stored `users.avatar` value points at, or the user's default. */
export function resolveAvatarId(value: string | null | undefined, seed: string | null | undefined): AvatarId {
  const m = /^set:([a-z]+)$/.exec(value ?? '')
  return m && isAvatarId(m[1]) ? m[1] : defaultAvatarId(seed)
}

export const formatAvatar = (id: AvatarId) => `set:${id}`

/** A neutral label for screen readers (avatars have no names): "Avatar 7". */
export const avatarName = (id: AvatarId) => `Avatar ${AVATAR_SET.findIndex((a) => a.id === id) + 1}`

export const avatarSetUrl = (id: AvatarId) => `${import.meta.env.BASE_URL}avatars/${id}.svg`

/** True for values that are an image location (an uploaded photo), not a set id. */
export const isImageUrl = (v: string | null | undefined): v is string => !!v && /^(https?:|data:|\/)/.test(v)
