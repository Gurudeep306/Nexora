/*
  Saying an answer aloud with the browser's own voices (free, on the device).
  Used for Scene Voice answers ("i changed from 3 to 4…") and predict
  feedback. Later phases add natural Indian voices and pre-voiced lessons.
*/
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text: string, lang: string) {
  if (!canSpeak() || !text) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[`*_]/g, ''))
  u.lang = lang
  const voices = synth.getVoices()
  u.voice = voices.find((v) => v.lang === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2))) ?? null
  u.rate = 1.02
  synth.speak(u)
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
