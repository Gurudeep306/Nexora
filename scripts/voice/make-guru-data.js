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

  Batch mode, for a GPU that can't be reached over the network (a Kaggle run):
    node scripts/voice/make-guru-data.js --export-jobs jobs.jsonl --hint 3419 --review 3419 --concept 1353 --talk 1353
      → one line per conversation to ask for: { i, kind, lang, teacher, item, messages }
    (the GPU answers every line: { i, content }; deploy/guru-training/kaggle/make_data.py)
    TEACHER_MODEL=Qwen/Qwen3-14B-AWQ node scripts/voice/make-guru-data.js --ingest answers.jsonl --jobs jobs.jsonl --out-dir data/guru
      → the same checks as the live mode, the same train / val / test files.

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
    else if (a === "--export-jobs") out.exportJobs = argv[++i];
    else if (a === "--ingest") out.ingest = argv[++i];
    else if (a === "--jobs") out.jobsFile = argv[++i];
    else if (a === "--seeds") out.seeds = String(argv[++i]).split(",").map(Number).filter(Boolean);
  }
  if (!Object.values(out.perKind).some(Boolean)) out.perKind = { hint: 50 };
  return out;
}

/** The conversations written by --export-jobs, in order. */
function readJobs(file) {
  if (!file) throw new Error("--ingest needs --jobs <the file written by --export-jobs>");
  const out = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const j = JSON.parse(line);
    out[j.i] = { kind: j.kind, lang: j.lang, teacher: j.teacher, item: j.item };
  }
  return out;
}

async function chat({ baseUrl, model, apiKey, messages }) {
  let res;
  // Free hosted teachers have per-minute limits: wait as long as they ask, then try again (at most 8 times).
  for (let attempt = 0; attempt < 8; attempt++) {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 900, ...(process.env.TEACHER_EXTRA ? JSON.parse(process.env.TEACHER_EXTRA) : {}) }),
      signal: AbortSignal.timeout(120000),
    });
    if (res.status !== 429 && res.status < 500) break;
    const wait = Number(res.headers.get("retry-after")) || 5 * (attempt + 1);
    await new Promise((r) => setTimeout(r, Math.min(90, wait) * 1000));
  }
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
  if (!a.dry && !a.exportJobs && ((!a.ingest && !baseUrl) || !D.allowedTeacher(model))) {
    console.error(`Teacher not allowed or not set: "${model}". Use an open-licence model (Qwen, DeepSeek, gpt-oss, Apache Mistral, OLMo). See docs/voice/TRAINING.md.`);
    process.exit(2);
  }
  // Several seeds ask about the same items again in another language and as another teacher (more, varied data).
  const inputs = a.ingest ? null : loadInputs(a.subject);
  const jobs = a.ingest ? readJobs(a.jobsFile) : (a.seeds || [a.seed]).flatMap((seed, k) => D.plan({ ...inputs, perKind: k === 0 ? a.perKind : { hint: a.perKind.hint ?? 0 }, seed }));
  if (a.exportJobs) {
    const G = require("../../src/voice/guru");
    const out = fs.createWriteStream(a.exportJobs);
    jobs.forEach((job, i) => {
      const persona = G.personaFor(job.teacher, D.trainingName(job.teacher, job.item.id));
      out.write(JSON.stringify({ i, kind: job.kind, lang: job.lang, teacher: job.teacher, item: job.item, messages: D.teacherMessages(job.kind, job.item, job.lang, persona) }) + "\n");
    });
    await new Promise((r) => out.end(r));
    console.log(`${jobs.length} conversations written to ${a.exportJobs}`);
    return;
  }
  if (a.dry) {
    const by = {};
    for (const j of jobs) by[`${j.kind}/${j.lang}`] = (by[`${j.kind}/${j.lang}`] || 0) + 1;
    console.log(`${jobs.length} conversations would be asked for:`, JSON.stringify(by));
    if (jobs[0]) console.log("First prompt:\n", JSON.stringify(D.teacherMessages(jobs[0].kind, jobs[0].item, jobs[0].lang, null), null, 1).slice(0, 1800));
    return;
  }
  fs.mkdirSync(a.outDir, { recursive: true });
  // Resume: conversations already in the out-dir (from an earlier, stopped run) are not asked for again.
  const done = new Set();
  for (const sp of ["train", "val", "test"]) {
    const f = path.join(a.outDir, `${sp}.jsonl`);
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf8").split("\n")) if (line.trim()) done.add(JSON.parse(line).id.replace(/#\d+$/, ""));
  }
  const jobKey = (j) => `${j.kind}:${j.item.id}:${j.lang}:${j.teacher || "guru"}`;
  if (done.size && !a.ingest) {
    const before = jobs.length;
    jobs.splice(0, jobs.length, ...jobs.filter((j) => !done.has(jobKey(j))));
    console.error(`resuming: ${before - jobs.length} conversations already made, ${jobs.length} to go`);
  }
  const files = Object.fromEntries(["train", "val", "test"].map((s) => [s, fs.createWriteStream(path.join(a.outDir, `${s}.jsonl`), { flags: "a" })]));
  const stats = { asked: 0, kept: 0, unreadable: 0, failed: 0, rejected: {}, examples: { train: 0, val: 0, test: 0 }, byKind: {} };
  const seen = new Set();
  /** One teacher answer: checked, de-duplicated, written as examples (the same in live and batch mode). */
  function keep(job, content) {
    const t = D.parseTeacher(content, D.REPLIES[job.kind]);
    if (!t) {
      stats.unreadable++;
      return;
    }
    const why = t.replies.map((r) => D.rejectReason(job.kind, job.item, job.lang, r)).find(Boolean);
    if (why) {
      stats.rejected[why] = (stats.rejected[why] || 0) + 1;
      return;
    }
    const key = t.replies.join("|").toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) {
      stats.rejected.duplicate = (stats.rejected.duplicate || 0) + 1;
      return;
    }
    seen.add(key);
    for (const ex of D.toExamples(job.kind, job.item, job.lang, job.teacher, t, model)) {
      files[ex.split].write(JSON.stringify(ex) + "\n");
      stats.examples[ex.split]++;
    }
    stats.kept++;
    stats.byKind[job.kind] = (stats.byKind[job.kind] || 0) + 1;
  }
  if (a.ingest) {
    for (const line of fs.readFileSync(a.ingest, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const { i, content } = JSON.parse(line);
      if (!jobs[i]) continue;
      stats.asked++;
      keep(jobs[i], content);
    }
  }
  let next = a.ingest ? jobs.length : 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      stats.asked++;
      try {
        const persona = require("../../src/voice/guru").personaFor(job.teacher, D.trainingName(job.teacher, job.item.id));
        keep(job, await chat({ baseUrl, model, apiKey: process.env.TEACHER_API_KEY, messages: D.teacherMessages(job.kind, job.item, job.lang, persona) }))
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
