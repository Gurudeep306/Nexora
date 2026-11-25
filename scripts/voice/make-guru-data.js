#!/usr/bin/env node
/*
  Guru training data (docs/voice/TRAINING.md): asks an OPEN-LICENCE teacher
  model for tutoring conversations, keeps only replies that pass every check,
  and writes chat-format JSONL split into train / val / test by question or
  topic (the test set holds questions the model never sees in training).
  The pure parts and the checks are in ./guru-data.js.

    TEACHER_BASE_URL=http://localhost:8000/v1 TEACHER_MODEL=Qwen/Qwen3-32B \
      node scripts/voice/make-guru-data.js --hint 1500 --review 800 --concept 1200 --talk 300 --out-dir data/guru

    node scripts/voice/make-guru-data.js --dry --hint 3      # show the plan and one prompt, send nothing

  TEACHER_API_KEY is read from the environment if the endpoint needs one.
  The teacher must be an open-licence model (Qwen, DeepSeek, gpt-oss, Apache
  Mistral, OLMo); anything else is refused before a single question is sent.
*/
const fs = require("node:fs");
const path = require("node:path");
const D = require("./guru-data");

function args(argv) {
  const out = { perKind: {}, outDir: "data/guru", subject: "", seed: 1, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (["--hint", "--review", "--concept", "--talk"].includes(a)) out.perKind[a.slice(2)] = Math.max(0, Number(argv[++i]) || 0);
    else if (a === "--limit") out.perKind.hint = Math.max(1, Number(argv[++i]) || 50); // the v1 flag: hints only
    else if (a === "--out-dir") out.outDir = argv[++i];
    else if (a === "--subject") out.subject = argv[++i];
    else if (a === "--seed") out.seed = Number(argv[++i]) || 1;
    else if (a === "--concurrency") out.concurrency = Math.max(1, Math.min(32, Number(argv[++i]) || 4));
    else if (a === "--dry") out.dry = true;
  }
  if (!Object.values(out.perKind).some(Boolean)) out.perKind = { hint: 50 };
  return out;
}

async function chat({ baseUrl, model, apiKey, messages }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 900 }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`teacher answered ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

function loadInputs(subject) {
  const { loadGateBank } = require("../../src/routes/gate");
  let questions = D.gateItems(loadGateBank());
  if (subject) questions = questions.filter((q) => q.subject === subject);
  const dir = path.join(__dirname, "../../content/nexus");
  const subjects = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")))
    .filter((s) => Array.isArray(s.nodes) && (!subject || s.id === subject));
  return { questions, topics: D.topicItems(subjects) };
}

async function main() {
  const a = args(process.argv.slice(2));
  const baseUrl = process.env.TEACHER_BASE_URL || "";
  const model = process.env.TEACHER_MODEL || "";
  if (!a.dry && (!baseUrl || !D.allowedTeacher(model))) {
    console.error(`Teacher not allowed or not set: "${model}". Use an open-licence model (Qwen, DeepSeek, gpt-oss, Apache Mistral, OLMo). See docs/voice/TRAINING.md.`);
    process.exit(2);
  }
  const jobs = D.plan({ ...loadInputs(a.subject), perKind: a.perKind, seed: a.seed });
  if (a.dry) {
    const by = {};
    for (const j of jobs) by[`${j.kind}/${j.lang}`] = (by[`${j.kind}/${j.lang}`] || 0) + 1;
    console.log(`${jobs.length} conversations would be asked for:`, JSON.stringify(by));
    if (jobs[0]) console.log("First prompt:\n", JSON.stringify(D.teacherMessages(jobs[0].kind, jobs[0].item, jobs[0].lang, null), null, 1).slice(0, 1800));
    return;
  }
  fs.mkdirSync(a.outDir, { recursive: true });
  const files = Object.fromEntries(["train", "val", "test"].map((s) => [s, fs.createWriteStream(path.join(a.outDir, `${s}.jsonl`), { flags: "a" })]));
  const stats = { asked: 0, kept: 0, unreadable: 0, failed: 0, rejected: {}, examples: { train: 0, val: 0, test: 0 }, byKind: {} };
  const seen = new Set();
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      stats.asked++;
      try {
        const persona = require("../../src/voice/guru").personaFor(job.teacher, D.trainingName(job.teacher, job.item.id));
        const t = D.parseTeacher(await chat({ baseUrl, model, apiKey: process.env.TEACHER_API_KEY, messages: D.teacherMessages(job.kind, job.item, job.lang, persona) }), D.REPLIES[job.kind]);
        if (!t) {
          stats.unreadable++;
          continue;
        }
        const why = t.replies.map((r) => D.rejectReason(job.kind, job.item, job.lang, r)).find(Boolean);
        if (why) {
          stats.rejected[why] = (stats.rejected[why] || 0) + 1;
          continue;
        }
        const key = t.replies.join("|").toLowerCase().replace(/\s+/g, " ");
        if (seen.has(key)) {
          stats.rejected.duplicate = (stats.rejected.duplicate || 0) + 1;
          continue;
        }
        seen.add(key);
        for (const ex of D.toExamples(job.kind, job.item, job.lang, job.teacher, t, model)) {
          files[ex.split].write(JSON.stringify(ex) + "\n");
          stats.examples[ex.split]++;
        }
        stats.kept++;
        stats.byKind[job.kind] = (stats.byKind[job.kind] || 0) + 1;
      } catch (e) {
        stats.failed++;
        if (stats.failed <= 3) console.error(`${job.kind} ${job.item.id}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: a.concurrency }, worker));
  await Promise.all(Object.values(files).map((f) => new Promise((r) => f.end(r))));
  fs.writeFileSync(path.join(a.outDir, "stats.json"), JSON.stringify({ ...stats, teacher: model, seed: a.seed, at: new Date().toISOString() }, null, 1));
  console.log(JSON.stringify(stats));
}

if (require.main === module) main();
module.exports = { allowedTeacher: D.allowedTeacher };
