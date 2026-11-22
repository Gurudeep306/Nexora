/*
  The quick chat (QuickChat.tsx): a small chat panel from the top bar that
  stays open while you move around the site, so you can reply without
  leaving the problem or lesson you're on. Wide screens only: on a phone,
  Messages opens in Community, full screen like a chat app.
*/
import { useSyncExternalStore } from 'react'
import type { NavigateFunction } from 'react-router-dom'

export interface QuickState {
  open: boolean
  /** The open conversation, the person to message, or the invite to join. */
  c: number | null
  peer: string | null
  join: string | null
}

const KEY = 'ng.quickchat'
const read = (): QuickState => {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (v && typeof v === 'object') return { open: !!v.open, c: Number(v.c) || null, peer: null, join: null }
  } catch {
    /* private mode */
  }
  return { open: false, c: null, peer: null, join: null }
}

let state: QuickState = read()
const subs = new Set<() => void>()
function set(next: Partial<QuickState>) {
  state = { ...state, ...next }
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ open: state.open, c: state.c }))
  } catch {
    /* private mode */
  }
  subs.forEach((f) => f())
}

export const useQuickChat = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => state,
    () => state,
  )

export const quickChat = {
  open: (c: number | null = state.c) => set({ open: true, c, peer: null, join: null }),
  openPeer: (peer: string) => set({ open: true, peer, c: null }),
  close: () => set({ open: false, peer: null, join: null }),
  toggle: () => (state.open ? set({ open: false }) : set({ open: true })),
  set,
  get: () => state,
}

/** Wide enough for a panel beside the page. */
export const quickChatFits = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches

/** The Messages screen in Community (with a conversation open). */
export const messagesHref = (c?: number | null) => `/social?tab=messages${c ? `&c=${c}` : ''}`

/** Open a conversation: in the quick chat beside the page, or (phone) in Community. */
export function openChat(navigate: NavigateFunction, c?: number | null) {
  if (quickChatFits() && !onMessagesScreen()) quickChat.open(c ?? null)
  else navigate(messagesHref(c))
}

export function onMessagesScreen(loc: { pathname: string; search: string } = window.location) {
  return loc.pathname === '/social' && new URLSearchParams(loc.search).get('tab') === 'messages'
}
