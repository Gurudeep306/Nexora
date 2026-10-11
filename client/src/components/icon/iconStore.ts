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
    void loadIconPack(next.set)
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

type LazySetId = Exclude<IconSetId, 'lucide'>

/* One dynamic import per set → one chunk per set. */
const LOADERS: Record<LazySetId, () => Promise<{ default: IconPack }>> = {
  phosphor: () => import('./packs/phosphor'),
  tabler: () => import('./packs/tabler'),
  remix: () => import('./packs/remix'),
  heroicons: () => import('./packs/heroicons'),
  iconoir: () => import('./packs/iconoir'),
}

const packs = new Map<IconSetId, IconPack>([['lucide', lucide]])
const pending = new Map<IconSetId, Promise<IconPack | undefined>>()
const packListeners = new Set<() => void>()

export const LUCIDE_PACK = lucide

/** Fetch a set's pack (no-op when cached or in flight). */
export function loadIconPack(id: IconSetId): Promise<IconPack | undefined> {
  const have = packs.get(id)
  if (have) return Promise.resolve(have)
  const inflight = pending.get(id)
  if (inflight) return inflight
  const loader = LOADERS[id as LazySetId]
  if (!loader) return Promise.resolve(undefined)
  const p = loader()
    .then((m) => {
      packs.set(id, m.default)
      for (const l of packListeners) l()
      return m.default
    })
    .catch((err: unknown) => {
      // Keep showing the Lucide fallback; a later render may retry.
      pending.delete(id)
      console.warn(`[icons] could not load the ${id} icon set`, err)
      return undefined
    })
  pending.set(id, p)
  return p
}

function subscribePacks(cb: () => void) {
  packListeners.add(cb)
  return () => {
    packListeners.delete(cb)
  }
}

/** The pack for a set once it has loaded (undefined while loading). */
export function useIconPack(id: IconSetId): IconPack | undefined {
  const get = () => packs.get(id)
  return useSyncExternalStore(subscribePacks, get, get)
}

/* Prefetch the user's set at startup so it is usually ready before first use. */
void loadIconPack(choice.set)
