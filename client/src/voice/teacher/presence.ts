/*
  How the teacher holds herself in a conversation, like a person across the
  table (docs/voice/VIRTUAL_TEACHER.md §3.2.9):

  - Listening: leans in a little, head tilted, eyebrows lifted, a slight
    smile. When the student's voice rises after a pause, a small nod.
  - Thinking: lips pressed, brows drawn a touch, head tilted the other way
    (her eyes go up and aside in TeacherLayer).
  - Speaking and idle: nothing held; TalkingHead's own speaking and idle
    movements take over.

  Values are TalkingHead face shapes and its body/head turns (small radians).
  Dependency-free and type-strippable (tests/voice-teacher.test.js).
*/

export type Presence = 'idle' | 'listening' | 'thinking' | 'speaking'

/** The face and posture held in each state. `side` = the screen side she stands on (she tilts towards the page). */
export function presenceFor(p: Presence, side: 'left' | 'right' | 'centre' = 'right'): Record<string, number> {
  const toPage = side === 'left' ? -1 : 1
  if (p === 'listening') return { bodyRotateX: 0.06, headRotateZ: 0.07 * toPage, browInnerUp: 0.22, mouthSmile: 0.1 }
  if (p === 'thinking') return { headRotateZ: -0.05 * toPage, mouthPressLeft: 0.28, mouthPressRight: 0.28, browDownLeft: 0.14, browDownRight: 0.14 }
  return {}
}

/** Every shape any state holds: let go of these when the state ends. */
export const PRESENCE_SHAPES = [...new Set(['listening', 'thinking'].flatMap((p) => Object.keys(presenceFor(p as Presence))))]

/**
 * Listening nods follow the student's voice: a nod when they start speaking
 * again after a pause (the start of a phrase), never more than one every 1.6 s.
 * Feed it the mic level (0–1) as it comes; it says when to nod.
 */
export function nodder(minGapMs = 1600) {
  let quietSince = 0
  let lastNod = -Infinity
  let speaking = false
  return (level: number, now: number): boolean => {
    if (level < 0.12) {
      if (speaking) quietSince = now
      speaking = false
      return false
    }
    const phraseStart = !speaking && now - quietSince > 350
    speaking = true
    if (phraseStart && now - lastNod >= minGapMs) {
      lastNod = now
      return true
    }
    return false
  }
}
