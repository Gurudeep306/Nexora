/*
  Build mode by voice (docs/voice/BLUEPRINT.md §3 row 1): two kinds of
  request, told apart here without AI.

  - "translate to python", "isko java mein likho" → translate. Allowed any
    time: the code stays the student's own, line for line.
  - "make it iterative", "add memoization", "build mode: use a hash map" →
    change. The server allows it only after Accepted.

  A question ("how do I make it faster?") is not a request: it goes to Guru.
  Pure and type-strippable (tests/voice-build.test.js).
*/
import { clean } from './parse.ts'

export type BuildCommand = { verb: 'translate'; to: string } | { verb: 'change'; instruction: string }

/** Spoken names of the judge's languages, longest first so "c plus plus" beats "c". */
const LANGS: [string, string][] = [
  ['c plus plus', 'cpp'],
  ['see plus plus', 'cpp'],
  ['c \\+\\+', 'cpp'],
  ['see \\+\\+', 'cpp'],
  ['c\\+\\+', 'cpp'],
  ['cpp', 'cpp'],
  ['c sharp', 'csharp'],
  ['c#', 'csharp'],
  ['javascript', 'javascript'],
  ['java script', 'javascript'],
  ['js', 'javascript'],
  ['typescript', 'typescript'],
  ['type script', 'typescript'],
  ['python', 'python'],
  ['pyhton', 'python'],
  ['java', 'java'],
  ['kotlin', 'kotlin'],
  ['golang', 'go'],
  ['go', 'go'],
  ['rust', 'rust'],
  ['swift', 'swift'],
  ['ruby', 'ruby'],
  ['c language', 'c'],
  ['c', 'c'],
]

/** The judge language a phrase names, if any ("python", "c plus plus"). */
export function languageIn(s: string): string | null {
  for (const [spoken, id] of LANGS) {
    // "c" and "go" are ordinary words: only as the language after in/to/mein.
    const short = id === 'c' || id === 'go'
    const re = short ? new RegExp(`\\b(?:to|in|into|mein|me|main)\\s+${spoken}\\b(?!\\s*(?:to|se)\\b)`) : new RegExp(`(?:^|\\s)${spoken}(?=\\s|$)`)
    if (re.test(s)) return id
  }
  return null
}

const QUESTION = /^(how|why|what|which|when|should|can i|could|is it|kya|kaise|kyun|kyu|kaun)\b|\?\s*$/

const TRANSLATE = /\b(translate|convert|rewrite|port|likho|likh do|likhdo|badlo|badal do|bana do|banao|in|mein|me)\b/
const CHANGE = [
  /^build mode\b[:,]?\s*(.+)$/,
  /^(?:please\s+)?(make (?:it|the code|my code|this)\s+.+)$/,
  /^(?:please\s+)?((?:rewrite|refactor|change|convert) (?:it|the code|my code|this)(?: to| into| so| using| with)?\s+.+)$/,
  /^(?:please\s+)?((?:optimi[sz]e|speed up|simplify|clean up)\b.*)$/,
  /^(?:please\s+)?(add (?:memo\w*|memoization|caching|a cache|comments|fast io|fast input)\b.*)$/,
  /^(?:please\s+)?(use (?:a |an )?(?:hash ?map|hash ?set|map|set|vector|deque|heap|priority queue|stack|queue|recursion|iteration|two pointers|binary search|dp|dynamic programming|bfs|dfs)\b.*)$/,
  /^((?:isko|ise|code ko|isse|is code ko)\s+.+\s+(?:banao|bana do|karo|kar do))$/,
]

/** A Build mode request, or null. */
export function parseBuild(utterance: string): BuildCommand | null {
  const raw = String(utterance || '').trim()
  const s = clean(raw)
  if (!s || QUESTION.test(raw.toLowerCase()) || QUESTION.test(s)) return null
  const lang = languageIn(s)
  // "translate to python", "python mein likho", "convert my code to java".
  if (lang && TRANSLATE.test(s) && !/\b(iterative|recursive|memo|faster|optimi)/.test(s)) {
    const asks = /\b(translate|convert|rewrite|port)\b/.test(s) || /\b(mein|me|main)\s+(?:\S+\s+)?(likho|likh do|likhdo|badlo|badal do|bana do|banao|karo|kar do)\b/.test(s) || /\b(likho|badlo|banao)\b.*\b(mein|me)\b/.test(s)
    if (asks) return { verb: 'translate', to: lang }
  }
  for (const re of CHANGE) {
    const m = s.match(re)
    if (m) {
      const instruction = m[1].trim()
      if (instruction.split(' ').length >= 2) return { verb: 'change', instruction }
    }
  }
  return null
}

/* ── Which page answers Build mode (the Solve page registers itself) ── */

export type Builder = (cmd: BuildCommand) => void
let builder: Builder | null = null

export function registerBuilder(b: Builder): () => void {
  builder = b
  return () => {
    if (builder === b) builder = null
  }
}

export const activeBuilder = (): Builder | null => builder
