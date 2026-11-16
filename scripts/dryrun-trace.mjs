// Trace a program locally and print what the dry run would draw — the tool
// used to build every language's tracer (docs/HANDOFF.md, "Visual dry run").
//
//   node scripts/dryrun-trace.mjs <file> <lang> [input]       lang: python cpp c java javascript typescript go rust
//   node scripts/dryrun-trace.mjs --corpus <lang>             every Learn solution in that language:
//                                                             traced output must equal the expected output
// Env: AT=<n> N=<k>  print frames n … n+k (what each step draws)
//      EV=<k>        print the first k raw events
//      CXX / CC      compiler for cpp / c (default g++ / cc)
// Needs the compilers locally (g++/clang++, cc, javac+java, node; TypeScript
// runs with node --experimental-strip-types).
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(ROOT, 'package.json'))
const { parseTrace, TRACERS } = require('./src/dryrun')
const D = path.join(ROOT, 'client/src/components/solve/dryrun/')
const { replay, setLanguage } = await import(path.join(D, 'replay.ts'))
const { toFrames } = await import(path.join(D, 'toFrames.ts'))

/** Instrument, build and run `code`; returns { stdout, stderr, status, error }. */
async function runTraced(code, lang, input) {
  const t = TRACERS[lang]
  if (!t) throw new Error(`no tracer for ${lang}`)
  const src = await t.wrap(code)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nx-trace-'))
  const sh = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', input, timeout: 60000, maxBuffer: 64 << 20, ...opts })
  try {
    if (lang === 'cpp' || lang === 'c') {
      const f = path.join(dir, lang === 'cpp' ? 'm.cpp' : 'm.c')
      fs.writeFileSync(f, src)
      const c = lang === 'cpp' ? sh(process.env.CXX || 'g++', ['-std=c++20', '-O1', '-w', '-o', path.join(dir, 'm'), f]) : sh(process.env.CC || 'cc', ['-std=c17', '-O1', '-w', '-o', path.join(dir, 'm'), f, '-lm'])
      if (c.status) return { error: c.stderr }
      return sh(path.join(dir, 'm'), [])
    }
    if (lang === 'java') {
      const cls = (code.match(/public\s+class\s+(\w+)/) || code.match(/\bclass\s+(\w+)/) || [0, 'Main'])[1]
      const f = path.join(dir, `${cls}.java`)
      fs.writeFileSync(f, src)
      const c = sh('javac', ['-nowarn', f])
      if (c.status) return { error: c.stderr }
      return sh('java', ['-Xss64m', '-cp', dir, cls])
    }
    if (lang === 'go') {
      const f = path.join(dir, 'main.go')
      fs.writeFileSync(f, src)
      const c = sh('go', ['build', '-o', path.join(dir, 'm'), f], { env: { ...process.env, GOFLAGS: '-mod=mod', GO111MODULE: 'off' } })
      if (c.status) return { error: c.stderr }
      return sh(path.join(dir, 'm'), [])
    }
    if (lang === 'rust') {
      const f = path.join(dir, 'main.rs')
      fs.writeFileSync(f, src)
      const c = sh('rustc', ['--edition', '2021', '-O', '-A', 'warnings', '-o', path.join(dir, 'm'), f])
      if (c.status) return { error: c.stderr }
      return sh(path.join(dir, 'm'), [])
    }
    if (lang === 'python') {
      const f = path.join(dir, 'm.py')
      fs.writeFileSync(f, src)
      return sh('python3', [f])
    }
    const f = path.join(dir, lang === 'typescript' ? 'm.ts' : 'm.js')
    fs.writeFileSync(f, src)
    return sh('node', lang === 'typescript' ? ['--experimental-strip-types', '--no-warnings', f] : [f])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
}

const norm = (x) => String(x ?? '').replace(/\s+$/gm, '').trim()

if (process.argv[2] === '--corpus') {
  const lang = process.argv[3]
  const key = { javascript: 'js', typescript: 'js' }[lang] || lang
  const jobs = []
  for (const f of fs.readdirSync(path.join(ROOT, 'src/learn/problems'))) for (const p of JSON.parse(fs.readFileSync(path.join(ROOT, 'src/learn/problems', f))).problems) if (p.solutions?.[key]) jobs.push(p)
  let ok = 0
  const bad = []
  for (const p of jobs) {
    const s = p.samples?.[0]
    const r = await runTraced(p.solutions[key], lang, s?.input ?? '')
    const events = r.error ? 0 : parseTrace(r.stderr).events.length
    if (r.error) bad.push([p.slug, 'does not build', r.error.split('\n').find((l) => /error/i.test(l)) ?? ''])
    else if (r.status !== 0) bad.push([p.slug, 'exit ' + r.status, String(r.stderr).slice(-200)])
    else if (s && norm(r.stdout) !== norm(s.output)) bad.push([p.slug, 'wrong output'])
    else if (!events) bad.push([p.slug, 'no steps'])
    else ok++
  }
  console.log(`${lang}: ${ok} of ${jobs.length} traced correctly`)
  for (const b of bad) console.log(' ', JSON.stringify(b))
  process.exit(bad.length ? 1 : 0)
}

const [file, lang, input = '5\n5 1 4 2 8\n'] = process.argv.slice(2)
if (!file || !lang) {
  console.error('usage: node scripts/dryrun-trace.mjs <file> <lang> [input] | --corpus <lang>')
  process.exit(2)
}
const code = fs.readFileSync(file, 'utf8')
const r = await runTraced(code, lang, input.replace(/\\n/g, '\n'))
if (r.error) {
  console.log('does not build:\n' + r.error.split('\n').slice(0, 25).join('\n'))
  process.exit(1)
}
const { events, errors, capped } = parseTrace(r.stderr)
console.log('stdout:', JSON.stringify(String(r.stdout).slice(0, 200)), '| exit', r.status, '| events', events.length, capped ? '(capped)' : '', errors ? `| stderr: ${errors.slice(0, 300)}` : '')
if (process.env.EV) for (const e of events.slice(0, +process.env.EV)) console.log(JSON.stringify(e).slice(0, 240))
setLanguage(lang)
const frames = toFrames(replay(events), code, r.stdout)
if (process.env.AT)
  for (const f of frames.slice(+process.env.AT, +process.env.AT + (+process.env.N || 3)))
    console.log(f.line, f.note, JSON.stringify(f.structures.map((s) => ({ k: s.kind, l: s.label, v: s.cells?.map((x) => x.v) ?? s.items?.map((x) => x.v) ?? s.vars ?? s.rows ?? s.nodes?.map((n) => n.v), r: s.roles, p: s.pointers }))).slice(0, 1200))
console.log('frames', frames.length)
