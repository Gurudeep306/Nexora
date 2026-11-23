/*
  Is a sentence asking something ("what is a left shift", "turn around time
  kya hai", "page table samjhao")? A question only matches a command that is
  itself a question ("what is on your left", "who are you"); otherwise it goes
  to Guru. Without this, "left shift kya hai" walked the teacher left.
  Dependency-free and type-strippable (tests/voice-commands-corpus.test.js).
*/
const ASK =
  /(^|[^\p{L}])(what|whats|what's|which|why|how|who|whom|explain|define|definition|meaning|difference|example|examples|complexity|derive|prove|kya|kyaa|kyun|kyon|kyu|kaise|kaisa|kaisi|kaun|kitna|kitne|samjhao|samjha|samjhaiye|samjhna|batao|bataiye|bataye|matlab|matalab|क्या|क्यों|कैसे|कैसा|कौन|कितना|कितने|समझाओ|समझा|समझाइए|समझ|बताओ|बताइए|मतलब)(?=$|[^\p{L}])/iu

/** True when the sentence asks a question rather than gives an order. */
export function isQuestion(text: string): boolean {
  return ASK.test(String(text || '').normalize('NFC'))
}
