/*
  The teacher reacts to the student's real results, as a teacher sitting
  beside them would: a thumbs up and a smile for Accepted, calm encouragement
  for a wrong answer, and an offer of a hint after a few misses in a row.

  - Only what the judge or the GATE grader decided (never a guess).
  - The lines are general: they never mention the answer, a test case or a
    fix, so nothing leaks (tests/voice-teacher.test.js checks every line).
  - Never during a timed test (the callers don't send those).

  Dependency-free and type-strippable.
*/

export type Result =
  /** Judge: every test passed. */
  | 'solved'
  /** Judge: only the examples ran, and they passed. */
  | 'examples'
  | 'wrong'
  | 'slow'
  | 'crash'
  | 'compile'
  | 'memory'
  /** GATE practice. */
  | 'correct'
  | 'incorrect'
  | 'partial'

export type ReactionGesture = 'thumbup' | 'ok' | 'index' | null
export interface Reaction {
  mood: 'happy' | 'neutral'
  gesture: ReactionGesture
  /** A small nod, as a listener does. */
  nod: boolean
  say: string
}

const GOOD = new Set<Result>(['solved', 'examples', 'correct'])

/** A judge verdict code → a result, or null for codes that need no reaction. */
export function resultFromVerdict(verdict: string, examplesOnly = false): Result | null {
  const v = verdict.toUpperCase()
  if (v === 'AC') return examplesOnly ? 'examples' : 'solved'
  return ({ WA: 'wrong', TLE: 'slow', RE: 'crash', CE: 'compile', MLE: 'memory' } as Record<string, Result>)[v] ?? null
}

type Lines = { en: string[]; hi: string[] }
const LINES: Record<Result, Lines> = {
  solved: {
    en: ['Yes! Solved. Well done.', 'Accepted! That was neat work.', 'There it is, all tests passed. Shabaash!', 'Solved it. Nicely done.'],
    hi: ['हाँ! सॉल्व हो गया। शाबाश!', 'Accepted! बहुत बढ़िया काम।', 'सारे टेस्ट पास। बहुत अच्छे!'],
  },
  examples: {
    en: ['The examples pass. Good start! Submit to run the full tests.', 'Examples are fine. Now let the full tests decide.'],
    hi: ['उदाहरण पास हो गए। अच्छी शुरुआत! अब पूरे टेस्ट चलाओ।'],
  },
  wrong: {
    en: ['Not yet. Try the smallest inputs by hand first.', 'Close, but not there. Check the edge cases, calmly.', 'Wrong answer this time. That’s normal, let’s look again.'],
    hi: ['अभी नहीं। पहले छोटे इनपुट हाथ से चलाकर देखो।', 'थोड़ा बाकी है। किनारे वाले केस देखो, आराम से।'],
  },
  slow: {
    en: ['Right idea maybe, but too slow. Think about a faster way.', 'Time limit. Let’s count how many steps it takes.'],
    hi: ['तरीका धीमा है। कोई तेज़ तरीका सोचो।', 'टाइम लिमिट। गिनो कितने स्टेप लग रहे हैं।'],
  },
  crash: {
    en: ['It crashed. Check the array bounds first.', 'A runtime error. Look at indexes and division, one by one.'],
    hi: ['प्रोग्राम क्रैश हुआ। पहले ऐरे की सीमा देखो।'],
  },
  compile: {
    en: ['It didn’t compile. The message tells us the line.', 'A compile error, that’s the easy kind. Read the first message.'],
    hi: ['कंपाइल नहीं हुआ। मैसेज में लाइन लिखी है।'],
  },
  memory: {
    en: ['Too much memory. Can we store less?'],
    hi: ['मेमोरी ज़्यादा लग रही है। कम चीज़ें रख सकते हैं?'],
  },
  correct: {
    en: ['Correct! Well done.', 'Yes, that’s right. Nice.', 'Right answer. Shabaash!', 'Correct. You’re getting good at these.'],
    hi: ['बिल्कुल सही! शाबाश।', 'सही जवाब। बहुत बढ़िया!', 'हाँ, सही है। अच्छे!'],
  },
  incorrect: {
    en: ['Not this time. Read the solution, it’ll make sense.', 'That one’s tricky. Let’s see where it turns.', 'Not quite. Mistakes here are how we learn the trap.'],
    hi: ['इस बार नहीं। हल पढ़ो, समझ आ जाएगा।', 'यह सवाल ट्रिकी है। देखते हैं कहाँ मुड़ता है।'],
  },
  partial: {
    en: ['Part of it is right. Check which part.', 'Some of it, not all. Almost there.'],
    hi: ['कुछ हिस्सा सही है। देखो कौन सा।'],
  },
}

const OFFER = {
  en: ['That’s a few in a row. Want a hint? Just ask me.', 'Don’t worry. Ask me for a hint whenever you like.'],
  hi: ['लगातार कुछ बार हुआ है। हिंट चाहिए? बस पूछो।', 'चिंता मत करो। जब चाहो हिंट माँग लेना।'],
}

/**
 * How the teacher reacts. `misses`: wrong results in a row before this one
 * (on the third miss in a row she offers a hint). `seed` picks among the lines (varied, not
 * random in tests).
 */
export function reactionFor(result: Result, { misses = 0, lang = 'en-IN', seed = 0 }: { misses?: number; lang?: string; seed?: number } = {}): Reaction {
  const hi = lang === 'hi-IN'
  const good = GOOD.has(result)
  const pool = (good || misses < 2 ? LINES[result] : OFFER)[hi ? 'hi' : 'en']
  const say = pool[Math.abs(Math.floor(seed)) % pool.length]
  if (good) return { mood: 'happy', gesture: result === 'examples' ? 'ok' : result === 'solved' ? 'thumbup' : 'ok', nod: false, say }
  return { mood: 'neutral', gesture: null, nod: true, say }
}

/** Every line she can say (for the tests). */
export function allLines(): string[] {
  return [...Object.values(LINES).flatMap((l) => [...l.en, ...l.hi]), ...OFFER.en, ...OFFER.hi]
}

/* Misses in a row, this page session. */
let misses = 0
/** Count this result; returns the misses before it. */
export function countResult(result: Result): number {
  const before = misses
  misses = GOOD.has(result) ? 0 : misses + 1
  return before
}
