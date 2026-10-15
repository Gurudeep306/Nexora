/**
 * The NexoraGuru avatar set: 16 hand-drawn "Clay" characters, shipped as
 * static SVGs in client/public/avatars/<id>.svg (source and build script:
 * docs/brand/avatars/src/). A choice is stored in `users.avatar` as
 * "set:<id>". Anything else (old "gen:<style>:<n>" values, legacy preset
 * keys, empty) resolves to a deterministic default picked from the username,
 * so every user always has a picture and it is the same on every device.
 *
 * Keep AVATAR_SET in sync with src/avatar-set.js (the server's copy used for
 * validation and the lazy migration); tests/avatar-set.test.js checks both
 * against the SVG files.
 */

export const AVATAR_SET = [
  { id: 'mira', name: 'Mira' },
  { id: 'kai', name: 'Kai' },
  { id: 'noor', name: 'Noor' },
  { id: 'arjun', name: 'Arjun' },
  { id: 'zara', name: 'Zara' },
  { id: 'leo', name: 'Leo' },
  { id: 'sana', name: 'Sana' },
  { id: 'dev', name: 'Dev' },
  { id: 'ivy', name: 'Ivy' },
  { id: 'omar', name: 'Omar' },
  { id: 'hana', name: 'Hana' },
  { id: 'ravi', name: 'Ravi' },
  { id: 'ama', name: 'Ama' },
  { id: 'theo', name: 'Theo' },
  { id: 'lina', name: 'Lina' },
  { id: 'jay', name: 'Jay' },
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

/** The avatar a user gets until they pick one. */
export function defaultAvatarId(seed: string | null | undefined): AvatarId {
  return AVATAR_SET[hash(String(seed ?? '').toLowerCase()) % AVATAR_SET.length].id
}

/** The set id a stored `users.avatar` value points at, or the user's default. */
export function resolveAvatarId(value: string | null | undefined, seed: string | null | undefined): AvatarId {
  const m = /^set:([a-z]+)$/.exec(value ?? '')
  return m && isAvatarId(m[1]) ? m[1] : defaultAvatarId(seed)
}

export const formatAvatar = (id: AvatarId) => `set:${id}`

export const avatarName = (id: AvatarId) => AVATAR_SET.find((a) => a.id === id)?.name ?? id

export const avatarSetUrl = (id: AvatarId) => `${import.meta.env.BASE_URL}avatars/${id}.svg`

/** True for values that are an image location (an uploaded photo), not a set id. */
export const isImageUrl = (v: string | null | undefined): v is string => !!v && /^(https?:|data:|\/)/.test(v)
