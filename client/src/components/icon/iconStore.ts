/*
  Icon system state, outside React:

  - the user's choice, read from <html data-icon-set / data-icon-style>
    (written by the theme layer) through one MutationObserver;
  - the icon packs: Lucide ships in the main bundle as the instant fallback,
    every other set is a lazily loaded chunk, fetched once and cached.

  Components subscribe with useSyncExternalStore, so no context provider is
  needed and the very first paint already follows the stored choice.
*/
import { useSyncExternalStore } from 'react'
import { findIconSet, resolveIconStyle, type IconSetId } from '@/theme/iconCatalog'
import lucide from './packs/lucide'
import type { IconName } from './names'
import { phosphorPack } from './packs/phosphor/pack'
import type { IconPack } from './packs/types'

/* ── choice ──────────────────────────────────────────────────────────── */

export interface IconChoice {
  set: IconSetId
  style: string
}

function readChoice(): IconChoice {
  const root = typeof document === 'undefined' ? null : document.documentElement
  const info = findIconSet(root?.getAttribute('data-icon-set'))
  return { set: info.id, style: resolveIconStyle(info, root?.getAttribute('data-icon-style')) }
}

let choice = readChoice()
const choiceListeners = new Set<() => void>()

if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  new MutationObserver(() => {
    const next = readChoice()
    if (next.set === choice.set && next.style === choice.style) return
    choice = next
    void loadIconPack(packKey(next.set, next.style))
    for (const l of choiceListeners) l()
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-icon-set', 'data-icon-style'] })
}

function subscribeChoice(cb: () => void) {
  choiceListeners.add(cb)
  return () => {
    choiceListeners.delete(cb)
  }
}

const getChoice = () => choice

/** The user's icon set + style (from the <html> attributes). */
export function useIconChoice(): IconChoice {
  return useSyncExternalStore(subscribeChoice, getChoice, getChoice)
}

/* ── packs ───────────────────────────────────────────────────────────── */

/*
  Packs are cached by key: the set id, except Phosphor, which is split per
  weight (`phosphor:duotone` …) so users only download the weight they use.
*/
export function packKey(set: IconSetId, style: string): string {
  return set === 'phosphor' ? `phosphor:${style}` : set
}

const phosphor = (load: () => Promise<{ default: Record<IconName, string> }>, weight: string) => () =>
  load().then((m) => ({ default: phosphorPack(weight, m.default) }))

/* One dynamic import per key → one chunk per set (per weight for Phosphor). */
const LOADERS: Record<string, () => Promise<{ default: IconPack }>> = {
  'phosphor:thin': phosphor(() => import('./packs/phosphor/thin'), 'thin'),
  'phosphor:light': phosphor(() => import('./packs/phosphor/light'), 'light'),
  'phosphor:regular': phosphor(() => import('./packs/phosphor/regular'), 'regular'),
  'phosphor:bold': phosphor(() => import('./packs/phosphor/bold'), 'bold'),
  'phosphor:fill': phosphor(() => import('./packs/phosphor/fill'), 'fill'),
  'phosphor:duotone': phosphor(() => import('./packs/phosphor/duotone'), 'duotone'),
  tabler: () => import('./packs/tabler'),
  remix: () => import('./packs/remix'),
  heroicons: () => import('./packs/heroicons'),
  iconoir: () => import('./packs/iconoir'),
}

const packs = new Map<string, IconPack>([['lucide', lucide]])
const pending = new Map<string, Promise<IconPack | undefined>>()
const packListeners = new Set<() => void>()

export const LUCIDE_PACK = lucide

/** Fetch a pack by key (no-op when cached or in flight). */
export function loadIconPack(key: string): Promise<IconPack | undefined> {
  const have = packs.get(key)
  if (have) return Promise.resolve(have)
  const inflight = pending.get(key)
  if (inflight) return inflight
  const loader = LOADERS[key]
  if (!loader) return Promise.resolve(undefined)
  const p = loader()
    .then((m) => {
      packs.set(key, m.default)
      for (const l of packListeners) l()
      return m.default
    })
    .catch((err: unknown) => {
      // Keep showing the Lucide fallback; a later render may retry.
      pending.delete(key)
      console.warn(`[icons] could not load the ${key} icons`, err)
      return undefined
    })
  pending.set(key, p)
  return p
}

function subscribePacks(cb: () => void) {
  packListeners.add(cb)
  return () => {
    packListeners.delete(cb)
  }
}

/** The pack for a key once it has loaded (undefined while loading). */
export function useIconPack(key: string): IconPack | undefined {
  const get = () => packs.get(key)
  return useSyncExternalStore(subscribePacks, get, get)
}

/* Prefetch the user's set/weight at startup so it is usually ready before first use. */
void loadIconPack(packKey(choice.set, choice.style))
