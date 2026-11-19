/**
 * Words for maths, so a lesson read aloud says "p implies q" rather than
 * spelling symbols or skipping them. Works on the plain text that
 * texToPlain makes from a formula's TeX.
 */
import { texToPlain } from '../../gate/texPlain.ts'

const WORDS: [RegExp, string][] = [
  [/↔|⇔/g, ' if and only if '],
  [/→|⇒/g, ' implies '],
  [/←|⇐/g, ' is implied by '],
  [/¬/g, ' not '],
  [/∧/g, ' and '],
  [/∨/g, ' or '],
  [/⊕/g, ' x-or '],
  [/≡/g, ' is equivalent to '],
  [/≠/g, ' is not equal to '],
  [/≥/g, ' is at least '],
  [/≤/g, ' is at most '],
  [/≈/g, ' is about '],
  [/</g, ' is less than '],
  [/>/g, ' is greater than '],
  [/=/g, ' equals '],
  [/×/g, ' times '],
  [/·/g, ' times '],
  [/÷/g, ' divided by '],
  [/±/g, ' plus or minus '],
  [/∀/g, ' for all '],
  [/∃/g, ' there exists '],
  [/∉/g, ' is not in '],
  [/∈/g, ' in '],
  [/⊆/g, ' is a subset of '],
  [/⊂/g, ' is a proper subset of '],
  [/∪/g, ' union '],
  [/∩/g, ' intersect '],
  [/∅/g, ' the empty set '],
  [/∞/g, ' infinity '],
  [/√\(([^)]*)\)/g, ' the square root of $1 '],
  [/⌊([^⌋]*)⌋/g, ' floor of $1 '],
  [/⌈([^⌉]*)⌉/g, ' ceiling of $1 '],
  [/\^2\b/g, ' squared '],
  [/\^3\b/g, ' cubed '],
  [/\^(\w+)/g, ' to the power $1 '],
  [/_(\w+)/g, ' sub $1 '],
  [/(\w)\/(\w)/g, '$1 over $2'],
  [/…|⋯/g, ' and so on '],
  [/⊤/g, ' true '],
  [/⊥/g, ' false '],
  [/Σ/g, ' the sum of '],
  [/Θ/g, ' theta '],
  [/Ω/g, ' omega '],
]

/** A formula's TeX as words a speech voice can say. */
export function texToSpeech(tex: string): string {
  let s = texToPlain(tex)
  for (const [re, w] of WORDS) s = s.replace(re, w)
  return s.replace(/[{}()[\]|]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Plain text already on the page may hold the same symbols (⊕ in a title). */
export function symbolsToSpeech(text: string): string {
  let s = text
  for (const [re, w] of WORDS.slice(0, 31)) s = s.replace(re, w)
  return s.replace(/\s+/g, ' ').trim()
}
