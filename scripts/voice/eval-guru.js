#!/usr/bin/env node
/*
  Quality gates for a trained Guru (docs/voice/TRAINING.md, BLUEPRINT §5):
  asks the model every held-out test conversation (data/guru/test.jsonl —
  questions it never saw in training) and checks each reply with the same
  rules the training data had to pass. A model goes on the site only when
  every gate passes.

    GURU_BASE_URL=http://localhost:8000/v1 GURU_MODEL=nexora/guru-s \
      node scripts/voice/eval-guru.js --test data/guru/test.jsonl [--limit 500]

  Or score answers a GPU run already wrote ({ id, reply } per test example):
    node scripts/voice/eval-guru.js --test data/guru/test.jsonl --answers test_answers.jsonl

  Gates: leaks ≤ 2% of hints; reviews name the key ≥ 95%; spoken style,
  length and script ≥ 95% overall. Exit code 1 if a gate fails.
*/
const fs = require("node:fs");
const D = require("./guru-data");

const GATES = { leakMax: 0.02, reviewKeyMin: 0.95, cleanMin: 0.95 };

/** Score replies: [{ meta, reply }] → { n, leaks, hints, reviewOk, reviews, clean, reasons, pass }. */
function score(rows) {
  const r = { n: rows.length, hints: 0, leaks: 0, reviews: 0, reviewOk: 0, clean: 0, reasons: {} };
  for (const { meta, reply } of rows) {
    const item = { answer: meta.key, options: meta.options || [] };
    const why = D.rejectReason(meta.kind, item, meta.lang, reply);
    if (meta.kind === "hint") {
      r.hints++;
      if (why === "leaks the answer") r.leaks++;
    }
    if (meta.kind === "review") {
      r.reviews++;
      if (why !== "doesn't state the key") r.reviewOk++;
    }
    if (!why) r.clean++;
    else r.reasons[why] = (r.reasons[why] || 0) + 1;
  }
  const leakRate = r.hints ? r.leaks / r.hints : 0;
  const reviewRate = r.reviews ? r.reviewOk / r.reviews : 1;
  const cleanRate = r.n ? r.clean / r.n : 0;
  return { ...r, leakRate, reviewRate, cleanRate, pass: leakRate <= GATES.leakMax && reviewRate >= GATES.reviewKeyMin && cleanRate >= GATES.cleanMin };
}

async function main() {
  const argv = process.argv.slice(2);
  const at = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const file = at("--test", "data/guru/test.jsonl");
  const limit = Number(at("--limit", 0)) || Infinity;
  const answers = at("--answers", "");
  if (answers) {
    const rows = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, limit);
    const byId = new Map(fs.readFileSync(answers, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((a) => [a.id, a.reply]));
    const out = rows.filter((ex) => byId.has(ex.id)).map((ex) => ({ meta: ex.meta, reply: String(byId.get(ex.id) || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim() }));
    const s = score(out);
    console.log(JSON.stringify({ ...s, missing: rows.length - out.length, gates: GATES }, null, 1));
    process.exit(s.pass && out.length === rows.length ? 0 : 1);
  }
  const base = process.env.GURU_BASE_URL;
  const model = process.env.GURU_MODEL;
  if (!base || !model) {
    console.error("Set GURU_BASE_URL and GURU_MODEL (the trained model, served OpenAI-style, e.g. by vLLM on Kaggle).");
    process.exit(2);
  }
  const rows = fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)).slice(0, limit);
  const out = [];
  for (const ex of rows) {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(process.env.GURU_API_KEY ? { authorization: `Bearer ${process.env.GURU_API_KEY}` } : {}) },
      body: JSON.stringify({ model, messages: ex.messages.slice(0, -1), temperature: 0.2, max_tokens: 260 }),
    });
    const j = await res.json().catch(() => ({}));
    out.push({ meta: ex.meta, reply: String(j.choices?.[0]?.message?.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim() });
  }
  const s = score(out);
  console.log(JSON.stringify({ ...s, gates: GATES }, null, 1));
  process.exit(s.pass ? 0 : 1);
}

if (require.main === module) main();
module.exports = { score, GATES };
