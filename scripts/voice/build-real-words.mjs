#!/usr/bin/env node
/*
  Real words that are one or two letters away from a command word but mean
  something else ("contents" ≠ contests, "analysis" ≠ analytics, "parse" ≠
  pause). The command matcher forgives small speech-recognition slips; it
  must never "forgive" a real word into a command. Writes
  client/src/voice/actions/realWords.ts.

  Words come from the site's own study material: GATE questions, GATE notes,
  DSA lessons and problem statements. Command words come from every `say:`
  list in the client. Run again when commands or material change;
  tests/voice-commands-corpus.test.js fails if the list is out of date.

    node scripts/voice/build-real-words.mjs [--check]
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'client', 'src', 'voice', 'actions', 'realWords.ts')

function walk(dir, exts, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, exts, out)
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p)
  }
  return out
}

/** The study material, as plain text. */
export function corpusText() {
  const parts = []
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'gate', 'questions.json'), 'utf8'))
  for (const q of Array.isArray(raw) ? raw : raw.questions) parts.push(q.text || '', ...(q.options || []).map((o) => (typeof o === 'string' ? o : o?.text || '')))
  for (const f of walk(path.join(ROOT, 'content', 'gate-notes'), ['.md'])) parts.push(fs.readFileSync(f, 'utf8'))
  for (const f of walk(path.join(ROOT, 'client', 'src', 'learn', 'content'), ['.ts'])) parts.push(fs.readFileSync(f, 'utf8'))
  for (const f of walk(path.join(ROOT, 'src', 'learn', 'problems'), ['.json'])) parts.push(fs.readFileSync(f, 'utf8'))
  return parts.join('\n')
}

/** Every word a command can be said with (from every `say:` list in the client). */
export async function commandWords() {
  const words = new Set()
  const add = (s) => {
    for (const w of s.toLowerCase().replace(/\{\w+\}/g, ' ').split(/[^a-z]+/)) if (w) words.add(w)
  }
  for (const f of walk(path.join(ROOT, 'client', 'src'), ['.ts', '.tsx'])) {
    const src = fs.readFileSync(f, 'utf8')
    for (const m of src.matchAll(/\b(?:en|hi):\s*\[([^\]]*)\]/g)) for (const s of m[1].matchAll(/'([^']*)'/g)) add(s[1])
  }
  // Slot values (page names and their aliases).
  const G = await import(pathToFileURL(path.join(ROOT, 'client', 'src', 'voice', 'actions', 'globalSpecs.ts')).href)
  for (const p of G.EXTRA_PLACES) add(p.label.replace(/\|/g, ' '))
  for (const list of Object.values(G.PAGE_ALIASES)) for (const a of list) add(a)
  for (const l of ['Home', 'Problems', 'Contests', 'Workshop', 'Nexus', 'Analytics', 'Achievements', 'Learn', 'Social', 'Submissions', 'Bookmarks', 'Profile', 'Appearance', 'Settings']) add(l)
  return words
}

/** A plural or simple inflection of the same word ("test"/"tests") is the same word, not a different one. */
const sameStem = (a, b) => a + 's' === b || b + 's' === a || a + 'es' === b || b + 'es' === a

export async function build() {
  const { sameWord } = await import(pathToFileURL(path.join(ROOT, 'client', 'src', 'voice', 'actions', 'match.ts')).href)
  const cmd = await commandWords()
  const counts = new Map()
  for (const w of corpusText().toLowerCase().split(/[^a-z]+/)) if (w.length >= 4) counts.set(w, (counts.get(w) || 0) + 1)
  const real = new Set()
  for (const [w, n] of counts) {
    if (n < 2 || cmd.has(w)) continue // a word seen once may be a typo in the material
    for (const t of cmd) if (sameWord(w, t, true) && !sameStem(w, t)) real.add(w)
  }
  return [...real].sort()
}

function render(words) {
  const lines = []
  let line = ' '
  for (const w of words) {
    const item = ` '${w}',`
    if (line.length + item.length > 110) {
      lines.push(line)
      line = ' '
    }
    line += item
  }
  if (line.trim()) lines.push(line)
  return `/*
  Real words one or two letters from a command word but meaning something
  else ("contents" ≠ contests, "analysis" ≠ analytics, "parse" ≠ pause): the
  matcher never takes one of these as a speech-recognition slip.
  Made by scripts/voice/build-real-words.mjs from the site's study material;
  do not edit by hand. ${words.length} words.
*/
export const REAL_WORDS: ReadonlySet<string> = new Set([
${lines.join('\n')}
])
`
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const text = render(await build())
  if (process.argv.includes('--check')) {
    const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : ''
    if (now !== text) {
      console.error('realWords.ts is out of date: run node scripts/voice/build-real-words.mjs')
      process.exit(1)
    }
    console.log('realWords.ts is up to date')
  } else {
    fs.writeFileSync(OUT, text)
    console.log(`wrote ${path.relative(ROOT, OUT)}`)
  }
}
