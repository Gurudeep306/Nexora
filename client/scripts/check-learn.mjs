/**
 * Integrity check for the DSA course content. Loads each topic through Vite
 * (so TypeScript and the @/ alias just work) and verifies:
 *
 *   • meta.ts agrees with the topic (ready ⇔ pages exist, page count matches)
 *   • page ids, question ids and animation ids are unique and well-formed
 *   • every check/practice block points at real questions, every viz block at
 *     a real animation, every code question at a built judged problem
 *   • every question is well-formed (answer index in range, order/match sizes…)
 *   • every animation runs on its default input (and 5 random inputs) without
 *     throwing, produces frames, and every step it lights up exists in its code
 *
 *   node scripts/check-learn.mjs              # all topics
 *   node scripts/check-learn.mjs graph-basics # one topic
 */
import { createServer } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROBLEMS_DIR = path.resolve(root, '..', 'src', 'learn', 'problems')
const only = process.argv.slice(2)

const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' })
let errors = 0
let warnings = 0
const err = (topic, msg) => {
  errors++
  console.log(`  ✗ [${topic}] ${msg}`)
}
const warn = (topic, msg) => {
  warnings++
  console.log(`  ! [${topic}] ${msg}`)
}

try {
  const { DSA_TOPICS } = await server.ssrLoadModule('/src/learn/content/dsa/syllabus.ts')
  const reg = await server.ssrLoadModule('/src/learn/engine/registry.ts')
  await server.ssrLoadModule('/src/learn/algorithms/index.ts')
  const { parsed } = await server.ssrLoadModule('/src/learn/engine/code.ts')
  const globalAlgos = new Set(reg.allAlgorithms().map((a) => a.id))
  const seenAlgo = new Map()
  const seenQ = new Map()
  const totals = { pages: 0, questions: 0, code: 0, algos: 0 }

  for (const entry of DSA_TOPICS) {
    if (only.length && !only.includes(entry.id)) continue
    const T = entry.id
    const meta = (await server.ssrLoadModule(`/src/learn/content/dsa/${T}/meta.ts`)).default
    const topic = (await server.ssrLoadModule(`/src/learn/content/dsa/${T}/index.ts`)).default
    if (topic.id !== T) err(T, `topic.id is "${topic.id}"`)
    if (meta.ready && !topic.pages.length) err(T, 'meta.ready is true but there are no pages')
    if (!meta.ready && topic.pages.length) warn(T, `${topic.pages.length} pages written but meta.ready is false (the topic is hidden)`)
    if (meta.ready && meta.pages !== topic.pages.length) err(T, `meta.pages = ${meta.pages} but the topic has ${topic.pages.length} pages`)
    if (!topic.pages.length) {
      console.log(`· ${T}: not written yet`)
      continue
    }

    // animations
    const algos = new Map()
    for (const a of topic.algorithms ?? []) {
      if (algos.has(a.id) || seenAlgo.has(a.id) || globalAlgos.has(a.id)) {
        if (!globalAlgos.has(a.id) || seenAlgo.has(a.id)) err(T, `duplicate animation id ${a.id}`)
      }
      algos.set(a.id, a)
      seenAlgo.set(a.id, T)
    }
    reg.registerAlgorithms(topic.algorithms ?? [])
    for (const a of algos.values()) {
      if (!a.code?.pseudo) warn(T, `animation ${a.id} has no pseudocode`)
      const langs = Object.keys(a.code ?? {})
      const stepsByLang = Object.fromEntries(langs.map((l) => [l, new Set(parsed(a.code[l]).steps.keys())]))
      const runs = [Object.fromEntries(a.inputs.map((f) => [f.name, f.default]))]
      if (a.random) for (let k = 0; k < 5; k++) runs.push({ ...runs[0], ...a.random() })
      for (const [ri, raw] of runs.entries()) {
        const inp = {}
        for (const f of a.inputs) {
          const text = String(raw[f.name] ?? f.default).trim()
          inp[f.name] = f.type === 'array' ? text.split(/[\s,]+/).filter(Boolean).map(Number) : f.type === 'number' ? Number(text) : text
        }
        let frames
        try {
          frames = a.run(inp)
        } catch (e) {
          err(T, `animation ${a.id} threw on ${ri === 0 ? 'its default input' : `random input ${JSON.stringify(raw)}`}: ${e.message}`)
          continue
        }
        if (!frames?.length) {
          err(T, `animation ${a.id} produced no frames`)
          continue
        }
        if (ri === 0 && frames.length < 4) warn(T, `animation ${a.id} has only ${frames.length} frames on its default input`)
        if (ri === 0 && frames.length > 400) warn(T, `animation ${a.id} has ${frames.length} frames on its default input — too long to watch; use a smaller default`)
        for (const fr of frames) {
          if (!fr.note) {
            err(T, `animation ${a.id} has a frame with no note`)
            break
          }
          if (fr.step) for (const [l, set] of Object.entries(stepsByLang)) if (!set.has(fr.step)) {
            err(T, `animation ${a.id}: step "@${fr.step}" is not tagged in its ${l} code`)
            stepsByLang[l] = new Set([...set, fr.step]) // report once
          }
        }
      }
    }

    // questions
    const bank = new Map()
    for (const q of topic.questions) {
      totals.questions++
      if (q.kind === 'code') totals.code++
      if (bank.has(q.id)) err(T, `duplicate question id ${q.id}`)
      if (seenQ.has(q.id) && seenQ.get(q.id) !== T) err(T, `question id ${q.id} also used in ${seenQ.get(q.id)}`)
      bank.set(q.id, q)
      seenQ.set(q.id, T)
      if (q.topic !== T) err(T, `question ${q.id} has topic "${q.topic}"`)
      if (!topic.pages.some((p) => p.id === q.page)) err(T, `question ${q.id} points at unknown page "${q.page}"`)
      if (!q.prompt?.trim()) err(T, `question ${q.id} has an empty prompt`)
      if (q.kind !== 'code' && !q.explain?.trim()) err(T, `question ${q.id} has no explanation`)
      switch (q.kind) {
        case 'mcq':
          if (!(q.answer >= 0 && q.answer < q.options.length)) err(T, `mcq ${q.id}: answer ${q.answer} out of range`)
          if (new Set(q.options).size !== q.options.length) err(T, `mcq ${q.id}: duplicate options`)
          break
        case 'multi':
          if (!q.answers.length || q.answers.some((x) => !(x >= 0 && x < q.options.length))) err(T, `multi ${q.id}: bad answers`)
          break
        case 'numeric':
          if (typeof q.answer !== 'number' || !Number.isFinite(q.answer)) err(T, `numeric ${q.id}: answer is not a number`)
          break
        case 'text':
          if (!q.accept?.length) err(T, `text ${q.id}: no accepted answers`)
          break
        case 'order':
          if ((q.items?.length ?? 0) < 3) err(T, `order ${q.id}: needs at least 3 items`)
          if (new Set(q.items).size !== q.items.length) err(T, `order ${q.id}: duplicate items`)
          break
        case 'array':
          if (!q.answer?.length) err(T, `array ${q.id}: empty answer`)
          break
        case 'fill': {
          const blanks = [...q.code.matchAll(/\[\[(\d+)\]\]/g)].map((m) => Number(m[1]))
          if (blanks.length !== q.blanks.length || blanks.some((b, i) => b !== i)) err(T, `fill ${q.id}: blanks [[0]]..[[${q.blanks.length - 1}]] must each appear once, in order`)
          if (q.blanks.some((b) => !b.length)) err(T, `fill ${q.id}: a blank has no accepted answers`)
          break
        }
        case 'match':
          if (q.left.length !== q.right.length || q.left.length < 3) err(T, `match ${q.id}: needs ≥ 3 pairs of equal length`)
          if (new Set(q.right).size !== q.right.length) err(T, `match ${q.id}: duplicate right items`)
          break
        case 'code':
          if (q.slug !== q.id) err(T, `code question ${q.id}: slug must equal id`)
          break
        default:
          err(T, `question ${q.id}: unknown kind ${q.kind}`)
      }
    }

    // judged problems
    let built = new Map()
    const file = path.join(PROBLEMS_DIR, `${T}.json`)
    if (fs.existsSync(file)) built = new Map(JSON.parse(fs.readFileSync(file, 'utf8')).problems.map((p) => [p.slug, p]))
    for (const q of topic.questions.filter((q) => q.kind === 'code')) {
      const p = built.get(q.slug)
      if (!p) err(T, `code question ${q.id}: no judged problem with that slug in src/learn/problems/${T}.json (run scripts/learn/build.py ${T})`)
      else if (p.page !== q.page) err(T, `code question ${q.id}: page "${q.page}" but the problem says "${p.page}"`)
    }
    for (const slug of built.keys()) if (!bank.has(slug)) err(T, `judged problem ${slug} has no code question in the topic (add it to codeQuestions)`)

    // pages
    const pageIds = new Set()
    for (const p of topic.pages) {
      totals.pages++
      if (pageIds.has(p.id)) err(T, `duplicate page id ${p.id}`)
      pageIds.add(p.id)
      if (!/^[a-z0-9-]+$/.test(p.id)) err(T, `page id "${p.id}" must be lowercase-kebab`)
      if (!p.blocks.length) err(T, `page ${p.id} is empty`)
      for (const b of p.blocks) {
        if (b.t === 'viz' && !reg.getAlgorithm(b.algo)) err(T, `page ${p.id}: viz block uses unknown animation "${b.algo}"`)
        if (b.t === 'viz' && b.initial) {
          const a = reg.getAlgorithm(b.algo)
          for (const k of Object.keys(b.initial)) if (a && !a.inputs.some((f) => f.name === k)) err(T, `page ${p.id}: viz ${b.algo} has no input named "${k}"`)
        }
        if (b.t === 'check' || b.t === 'practice') for (const id of b.ids) if (!bank.has(id)) err(T, `page ${p.id}: ${b.t} block lists unknown question "${id}"`)
        if (b.t === 'code' && !Object.keys(b.code).length) err(T, `page ${p.id}: empty code block`)
      }
    }
    const unused = [...algos.keys()].filter((id) => !topic.pages.some((p) => p.blocks.some((b) => b.t === 'viz' && b.algo === id)))
    if (unused.length) warn(T, `animations not used on any page: ${unused.join(', ')}`)
    const nCode = topic.questions.filter((q) => q.kind === 'code').length
    totals.algos += algos.size
    console.log(`✓ ${T}: ${topic.pages.length} pages · ${topic.questions.length - nCode} quiz questions · ${nCode} coding problems · ${algos.size} topic animations`)
  }
  console.log(`\n${totals.pages} pages · ${totals.questions} questions (${totals.code} coding) · ${totals.algos} topic animations · ${errors} errors · ${warnings} warnings`)
} finally {
  await server.close()
}
process.exit(errors ? 1 : 0)
