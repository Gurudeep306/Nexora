export const meta = {
  name: 'gate-bulk-lean',
  description: 'Lean GATE pass: verify ~22 questions per agent against the paper PDF, fix data, write concise v2 solutions',
  phases: [{ title: 'Author', detail: 'one agent per ~22-question batch, 4 at a time' }],
}

const MAIN = '/Users/gurudeep/Desktop/Projects/nexora'
// The past-paper PDFs live in the private repo nexora-gate-materials, cloned next to this one.
const GATE_PYQ = process.env.GATE_PYQ_DIR || `${MAIN}/../nexora-gate-materials/GATE_PYQ`
const CONCURRENCY = 4

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    branch: { type: 'string' },
    commit: { type: 'string' },
    paper: { type: 'string' },
    batch: { type: 'number' },
    solved: { type: 'number' },
    keyIssues: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, note: { type: 'string' } }, required: ['id', 'note'] },
    },
    doubts: { type: 'string', description: 'at most 3 sentences' },
  },
  required: ['branch', 'commit', 'paper', 'batch', 'solved', 'keyIssues', 'doubts'],
}

const brief = (b) => `GATE question-bank pass. Paper ${b.paper}, batch ${b.n}: ${b.ids.join(', ')}.

Setup (fresh git worktree; use /usr/bin/git):
\`/usr/bin/git fetch -q origin && /usr/bin/git reset -q --hard origin/gate-bulk && /usr/bin/git sparse-checkout set --no-cone '/*' '!/GATE_PYQ/' && ln -s ${MAIN}/node_modules node_modules && ln -s ${MAIN}/client/node_modules client/node_modules\` (no npm ci).

Read ONLY docs/gate/AUTHORING_QUICK.md (short). For a scene primitive you use, grep just its section from docs/gate/SOLUTION_AUTHORING.md. Don't read other solution files.
Tools: \`node scripts/gate/question.mjs ${b.paper} <id> [--json]\`; PDF ${GATE_PYQ}/${b.pdf}: start with \`pdftotext -layout\` (cheap); render pages with the Read tool (pages param) only for figures or unclear maths.

Per question:
1. Match the record to the paper question (number, marks, content; records can be shifted). Fix text/options/type/marks/subject/topic/tags/figures vs the PDF (remove header/footer junk, use KaTeX, markdown tables, fenced code).
2. Figures: redraw faithfully as SVG (viewBox, no width/height, transparent, currentColor strokes/text, font-family "Arial, Helvetica, sans-serif", precise alt). Overwrite the record's existing figures[].svg file, or add public/gate-fig/${b.paper}/<suffix>-<k>.svg + a figures fix.
3. Solve independently, then compare with the stored key. Keys can be fake (cycled letters / rotated options) or stored as {min,max} objects (rewrite as "lo to hi"). For 2014+ an official key exists — fetch it only if your answer disagrees with the stored key (curl + pdftotext; gateoverflow.in as fallback). Never change an official answer without evidence; otherwise needsReview + reviewNote.
4. Write the v2 solution per the quick card: concise for aptitude/formula/fact questions (2–4 steps, no animation); animate only procedural questions with real data.

Fix entries: "before" must be the value in the COMMITTED data — take it from \`/usr/bin/git show HEAD:src/gate/questions.json\` (or node scripts/gate/question.mjs before you edit anything), never from a copy you already changed; a fix whose before equals after is a bug.
Write ONLY: src/gate/solutions/${b.paper}.part-${b.n}.json ({paper, version:2, solutions}), src/gate/fixes/${b.paper}.part-${b.n}.json ({paper, fixes}), and SVGs under public/gate-fig/${b.paper}/.
Validate once at the end: copy your parts over the canonical files (merge with existing content), \`node scripts/gate/apply-fixes.mjs ${b.paper} && node scripts/gate/validate-solutions.mjs ${b.paper}\`, fix errors in YOUR questions, then restore with \`/usr/bin/git checkout -- src/gate\` (your untracked part files stay). Don't run npm test or a browser.
Commit only those paths (explicit git add), message "GATE ${b.paper} batch ${b.n}" + newline + "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Don't push. Correctness first. Return the structured result; keep doubts short.`

async function pool(items, k, fn) {
  const out = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      try {
        out[i] = await fn(items[i])
      } catch (e) {
        out[i] = { error: String(e), paper: items[i].paper, batch: items[i].n }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(k, items.length) }, worker))
  return out
}

phase('Author')
return await pool(args.batches, CONCURRENCY, (b) =>
  agent(brief(b), { label: `${b.paper}#${b.n}`, phase: 'Author', isolation: 'worktree', schema: RESULT_SCHEMA }),
)
