/*
  Conversation mode ("talk to me like a person"): once on, the mic opens by
  itself after the teacher finishes speaking, every reply remembers the last
  few turns, and the teacher shows listening, thinking and speaking. Shared by
  the mic (VoiceButton), the teacher (TeacherLayer) and its Talk button.

  It ends when the student says bye (or presses End), or after two turns in a
  row where nothing was heard, so the mic is never left open.
*/
import { useSyncExternalStore } from 'react'

export type TalkStatus = 'idle' | 'listening' | 'thinking' | 'speaking'
export interface Turn {
  role: 'user' | 'assistant'
  content: string
}
export interface TalkState {
  on: boolean
  status: TalkStatus
  /** What is being heard right now (live caption). */
  hearing: string
  history: Turn[]
}

let state: TalkState = { on: false, status: 'idle', hearing: '', history: [] }
const listeners = new Set<() => void>()
const startListeners = new Set<() => void>()

function set(patch: Partial<TalkState>) {
  state = { ...state, ...patch }
  for (const l of listeners) l()
}

export function getTalk(): TalkState {
  return state
}

export function useTalk(): TalkState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => state,
    () => state,
  )
}

/** Start a conversation: the mic is asked to open (it checks consent first). */
export function startTalk() {
  set({ on: true, status: 'idle', hearing: '', history: [] })
  for (const l of startListeners) l()
}
/** The mic listens for this. */
export function onStartTalk(fn: () => void): () => void {
  startListeners.add(fn)
  return () => startListeners.delete(fn)
}

export function endTalk() {
  if (state.on || state.status !== 'idle') set({ on: false, status: 'idle', hearing: '' })
}

export function setTalkStatus(status: TalkStatus, hearing = '') {
  if (state.status !== status || state.hearing !== hearing) set({ status, hearing })
}

/** Remember one exchange (the last 8 turns are kept). */
export function remember(user: string, assistant: string) {
  set({ history: [...state.history, { role: 'user' as const, content: user }, { role: 'assistant' as const, content: assistant }].slice(-8) })
}

/** "bye", "stop talking", "bas", "that's all" — the student is done talking. */
export function saysGoodbye(text: string): boolean {
  return /^\s*(ok(ay)?\s+)?(bye|bye bye|goodbye|good night|see you|stop talking|end( the)? (talk|conversation)|that'?s all|bas|bas karo|chalo bye|alvida|ab bas|baad mein baat karte hain|बाय|बस|अलविदा)\b/i.test(text.trim())
}
