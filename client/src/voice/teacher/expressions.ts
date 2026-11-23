/*
  The teacher's face and hands follow what is being said, like a person's:
  a smile for greetings and praise, a thumbs up for "well done", namaste for
  "namaste", a shrug for "I won't guess", and calm attention when the student
  sounds worried. Rules on the words only, no AI (tests/voice-teacher.test.js).

  Dependency-free and type-strippable.
*/

export type Mood = 'neutral' | 'happy'
export type Gesture = 'thumbup' | 'namaste' | 'shrug' | 'index' | null

const PRAISE = /\b(well done|great( job| work)?|excellent|perfect|correct|right answer|nailed it|awesome|brilliant|shabaash|shabash|bahut (badhiya|accha|achha)|bilkul sahi|sahi jawab|very good|good job)\b|शाबाश|बहुत बढ़िया|बिल्कुल सही/i
const GREETING = /\b(namaste|namaskar|hello|hi|hey|good (morning|afternoon|evening)|welcome|bye|see you|phir milte)\b|नमस्ते|नमस्कार|फिर मिलते/i
const NAMASTE = /\b(namaste|namaskar)\b|नमस्ते|नमस्कार/i
const UNSURE = /\b(won'?t guess|not sure|don'?t know|can'?t (say|tell)|nahi pata|guess nahi)\b|पता नहीं|अंदाज़ा नहीं/i
const POINT = /\b(look at|dekho|notice|see here|focus on|yahan dekho)\b|देखो|ध्यान दो/i

/** The teacher's mood while saying this sentence. */
export function moodFor(text: string): Mood {
  return PRAISE.test(text) || GREETING.test(text) ? 'happy' : 'neutral'
}

/** A hand gesture that fits the sentence, or null (most sentences need none). */
export function gestureFor(text: string): Gesture {
  if (PRAISE.test(text)) return 'thumbup'
  if (NAMASTE.test(text)) return 'namaste'
  if (UNSURE.test(text)) return 'shrug'
  if (POINT.test(text)) return 'index'
  return null
}

const WORRIED = /\b(hard|difficult|confus\w*|stuck|stress\w*|tension|scared|afraid|worried|tired|fail\w*|don'?t understand|samajh nahi|nahi samjh\w*|darr?|mushkil|pareshan)\b|मुश्किल|समझ नहीं|डर|परेशान|टेंशन/i

/** Does the student sound worried or stuck? The teacher then listens calmly instead of smiling. */
export function soundsWorried(text: string): boolean {
  return WORRIED.test(text)
}
