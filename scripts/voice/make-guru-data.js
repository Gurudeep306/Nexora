#!/usr/bin/env node
/*
  Guru training data, Phase 4 (docs/voice/TRAINING.md).

  Builds hint-ladder conversations for GATE questions with an OPEN-LICENCE
  teacher model, keeps only the ones our Leak Guard passes, and writes JSONL
  for LoRA fine-tuning on Kaggle.

  What goes in, and why:
  - The official GATE question, its options and the answer key (public exam
    content) — so the teacher knows what not to reveal.
  - NOT our written solutions or lessons: most were drafted with AI agents
    whose terms forbid training other models on their output. They stay as
    lookup material at answer time only.
  - The teacher must be a model whose licence allows training on its output
    (TEACHERS below). Anything else is refused.

  Usage (any OpenAI-compatible endpoint serving an allowed model, e.g. vLLM
  on Kaggle, or a free host that serves Qwen / DeepSeek / gpt-oss):

    TEACHER_BASE_URL=http://localhost:8000/v1 TEACHER_MODEL=Qwen/Qwen3-32B \
      node scripts/voice/make-guru-data.js --limit 200 --out data/guru/hints.jsonl

  TEACHER_API_KEY is read from the environment if the endpoint needs one.
*/
const fs = require("node:fs");
const path = require("node:path");
const { leaks } = require("../../src/voice/guru");

/** Model families whose licences allow training on their outputs. */
const TEACHERS = [
  /^qwen/i, /\/qwen/i, // Apache-2.0 (Qwen2.5 / Qwen3 open weights)
  /deepseek/i, // MIT (DeepSeek-V3 / R1 open weights)
  /^mistralai\/(mistral-small|mistral-nemo|mixtral|ministral|codestral-mamba|devstral)/i, // Apache-2.0 releases
  /gpt-oss/i, // Apache-2.0
  /olmo/i, // Apache-2.0
];
/** Never: their terms forbid using outputs to train other models. */
const FORBIDDEN = /claude|anthropic|gpt-4|gpt-5|o1|o3|o4|chatgpt|gemini|gemma|sarvam|llama|command-r|grok/i;

function allowedTeacher(model) {
  if (!model || FORBIDDEN.test(model)) return false;
  return TEACHERS.some((re) => re.test(model));
}

function args(argv) {
  const out = { limit: 50, out: "data/guru/hints.jsonl", subject: "", seed: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") out.limit = Math.max(1, Number(argv[++i]) || 50);
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--subject") out.subject = argv[++i];
    else if (a === "--seed") out.seed = Number(argv[++i]) || 1;
    else if (a === "--dry") out.dry = true;
  }
  return out;
}

const SPEC = fs.readFileSync(path.join(__dirname, "../../docs/voice/GURU_SPEC.md"), "utf8");

/** The teacher writes three escalating hints, as JSON, for one question. */
function teacherMessages(q) {
  const opts = (q.options || []).map((o) => `(${o.l}) ${o.t}`).join("\n");
  return [
    {
      role: "system",
      content:
        "You write training examples for Guru, a voice tutor. Follow this spec exactly:\n\n" +
        SPEC.slice(0, 12000) +
        "\n\nReturn ONLY JSON: {\"student\": \"...\", \"hints\": [\"hint 1\", \"hint 2\", \"hint 3\"]}. " +
        "student: how an Indian student would ask for help on this question (English, Hindi or Hinglish in Roman letters, casual). " +
        "hints: three spoken hints climbing the ladder (1: a question that points at the key idea; 2: the idea named; 3: the first step worked). " +
        "Each under 60 words, spoken style, no markdown. NEVER reveal the option letter, the final number or the final answer.",
    },
    {
      role: "user",
      content: `Question (${q.type}, ${q.subject || "cs"}):\n${String(q.text || "").slice(0, 2500)}\n${opts}\nAnswer key (do not reveal): ${JSON.stringify(q.answer)}`,
    },
  ];
}

function parseTeacher(content) {
  const m = String(content || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (typeof j.student !== "string" || !Array.isArray(j.hints) || j.hints.length < 3) return null;
    return { student: j.student.trim().slice(0, 400), hints: j.hints.slice(0, 3).map((h) => String(h).trim().slice(0, 600)) };
  } catch {
    return null;
  }
}

/** One training conversation per hint level, in the chat format TRL/Unsloth read. */
function toExamples(q, t) {
  const sys = "You are Guru, NexoraGuru's voice tutor. Follow the Guru Spec. The student has NOT solved this question: give the next hint on the ladder, never the answer.";
  const ctx = `Question: ${String(q.text || "").slice(0, 1500)}\n${(q.options || []).map((o) => `(${o.l}) ${o.t}`).join("\n")}`;
  const out = [];
  const history = [];
  t.hints.forEach((h, i) => {
    const user = i === 0 ? t.student : i === 1 ? "aur hint do" : "still stuck, next hint please";
    out.push({ id: `${q.id}#h${i + 1}`, messages: [{ role: "system", content: sys }, { role: "user", content: ctx }, ...history, { role: "user", content: user }, { role: "assistant", content: h }], meta: { question: q.id, step: i + 1, subject: q.subject || "" } });
    history.push({ role: "user", content: user }, { role: "assistant", content: h });
  });
  return out;
}

async function chat({ baseUrl, model, apiKey, messages }) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 700 }),
  });
  if (!res.ok) throw new Error(`teacher answered ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

async function main() {
  const a = args(process.argv.slice(2));
  const baseUrl = process.env.TEACHER_BASE_URL || "";
  const model = process.env.TEACHER_MODEL || "";
  if (!a.dry && (!baseUrl || !allowedTeacher(model))) {
    console.error(`Teacher not allowed or not set: "${model}". Use an open-licence model (Qwen, DeepSeek, gpt-oss, Apache Mistral, OLMo). See docs/voice/TRAINING.md.`);
    process.exit(2);
  }
  const { loadGateBank } = require("../../src/routes/gate");
  const bank = loadGateBank();
  let qs = bank.questions.filter((q) => (q.type === "MCQ" || q.type === "MSQ" || q.type === "NAT") && q.answer != null && !q.hasFigure);
  if (a.subject) qs = qs.filter((q) => q.subject === a.subject);
  // A fixed shuffle, so reruns with the same seed take the same questions.
  let s = a.seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  qs = qs.map((q) => [rnd(), q]).sort((x, y) => x[0] - y[0]).map((x) => x[1]).slice(0, a.limit);
  if (a.dry) {
    console.log(`${qs.length} questions would be sent. First prompt:\n`, JSON.stringify(teacherMessages(qs[0]), null, 1).slice(0, 1500));
    return;
  }
  fs.mkdirSync(path.dirname(a.out), { recursive: true });
  const outFile = fs.createWriteStream(a.out, { flags: "a" });
  const stats = { asked: 0, kept: 0, leaked: 0, unreadable: 0, failed: 0 };
  for (const q of qs) {
    stats.asked++;
    try {
      const t = parseTeacher(await chat({ baseUrl, model, apiKey: process.env.TEACHER_API_KEY, messages: teacherMessages(q) }));
      if (!t) {
        stats.unreadable++;
        continue;
      }
      const answerKey = Array.isArray(q.answer) ? q.answer.join(",") : String(q.answer);
      if (t.hints.some((h) => leaks({ reply: h, answerKey, options: q.options || [] }).leak)) {
        stats.leaked++;
        continue;
      }
      for (const ex of toExamples(q, t)) outFile.write(JSON.stringify({ ...ex, meta: { ...ex.meta, teacher: model } }) + "\n");
      stats.kept++;
    } catch (e) {
      stats.failed++;
      if (stats.failed <= 3) console.error(`${q.id}: ${e.message}`);
    }
  }
  outFile.end();
  console.log(JSON.stringify(stats));
}

if (require.main === module) main();
module.exports = { allowedTeacher, parseTeacher, toExamples, teacherMessages };
