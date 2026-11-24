/*
  Guru training data, v2 (docs/voice/TRAINING.md). Pure parts, tested in
  tests/voice-guru-data.test.js; scripts/voice/make-guru-data.js runs them
  against an open-licence teacher.

  What it makes — only tutoring, nothing else (Guru is built for one job):
  - hint:    an UNSOLVED GATE question → three hints climbing the ladder,
             never the answer (Leak Guard on every hint);
  - review:  an ANSWERED question → why the official key is right, spoken;
  - concept: a CS / GATE topic → a short spoken explanation;
  - talk:    conversation mode → a warm short reply that comes back to study.
  In English, Hinglish (Roman letters) and Hindi (Devanagari).

  Every example is built with the server's own prompt builder
  (src/voice/guru.js buildMessages), so the model learns exactly the format it
  is given on the site. Inputs are only public exam content (questions,
  options, official keys) and topic names; the teacher's words are the
  outputs. Our AI-drafted solutions and lessons are never used.
*/
const crypto = require("node:crypto");
const G = require("../../src/voice/guru");

/** Model families whose licences allow training on their outputs. */
const TEACHERS = [/^qwen/i, /\/qwen/i, /deepseek/i, /^mistralai\/(mistral-small|mistral-nemo|mixtral|ministral|codestral-mamba|devstral)/i, /gpt-oss/i, /olmo/i];
/** Never: their terms forbid using outputs to train other models. */
const FORBIDDEN = /claude|anthropic|gpt-4|gpt-5|o1|o3|o4|chatgpt|gemini|gemma|sarvam|llama|command-r|grok/i;
function allowedTeacher(model) {
  if (!model || FORBIDDEN.test(model)) return false;
  return TEACHERS.some((re) => re.test(model));
}

const TEACHER_IDS = ["", "priya", "kavya", "neha", "ananya", "arjun", "rohan", "dev"];
const KINDS = ["hint", "review", "concept", "talk"];
/** en = English, hg = Hinglish (Roman), hi = Hindi (Devanagari). */
const LANGS = ["en", "hg", "hi"];

/** A stable number in [0, 1) from a string (same input → same split, same choices). */
function unit(s) {
  return crypto.createHash("sha256").update(String(s)).digest().readUInt32BE(0) / 2 ** 32;
}
/** Train / val / test by the item (question or topic), never by example: the test set holds questions the model never saw. */
function splitOf(itemId) {
  const u = unit(`split:${itemId}`);
  return u < 0.9 ? "train" : u < 0.95 ? "val" : "test";
}
function pickLang(itemId, k = 0) {
  const u = unit(`lang:${itemId}:${k}`);
  return u < 0.45 ? "en" : u < 0.8 ? "hg" : "hi";
}
const siteLang = (lang) => (lang === "hi" ? "hi-IN" : "en-IN");
const optionsText = (q) => (q.options || []).map((o) => `(${o.l}) ${o.t}`).join("\n");
const keyText = (q) => (Array.isArray(q.answer) ? q.answer.join(",") : String(q.answer));
const LANG_RULE = {
  en: "The student writes in English.",
  hg: "The student writes in Hinglish (Hindi in Roman letters mixed with English), casually.",
  hi: "The student writes in Hindi (Devanagari). Guru answers in simple Hindi in Devanagari, technical terms in English.",
};

/* ── what the teacher model is asked ── */

const STYLE =
  "Spoken style: short sentences, no markdown, no lists, no code blocks, symbols said in words. Warm and plain, like a good teacher sitting next to the student.";

/** What a student's own line looks like, per language (so the teacher model writes one, never the instruction). */
const STUDENT_EXAMPLE = {
  en: "I'm stuck on this one, where do I even start?",
  hg: "sir ye question samajh nahi aa raha, kahan se start karun?",
  hi: "ये सवाल समझ नहीं आ रहा, कहाँ से शुरू करूँ?",
};

function teacherMessages(kind, item, lang, persona) {
  const who = persona ? `${persona.name} (${persona.male ? "male" : "female"} teacher)` : "Guru";
  const base = `You write training examples for ${who}, NexoraGuru's voice tutor for GATE CSE and DSA in India. ${STYLE} ${LANG_RULE[lang]} The "student" field is ONE short line in the student's own words, in that language (like "${STUDENT_EXAMPLE[lang]}"), never these instructions and never the question text. Every reply is complete: no "…", no placeholders. Reply with JSON only.`;
  if (kind === "hint") {
    return [
      { role: "system", content: `${base} Return {"student": "...", "replies": ["hint 1", "hint 2", "hint 3"]}. student: how the student asks for help on this question. Hints climb a ladder: 1 a question pointing at the key idea; 2 the idea named; 3 the first step worked. Each under 60 words. NEVER reveal the option letter, the final number or the final answer, not even in words.` },
      { role: "user", content: `Question (${item.type}, ${item.subject || "cs"}):\n${String(item.text).slice(0, 2500)}\n${optionsText(item)}\nAnswer key (never reveal): ${keyText(item)}` },
    ];
  }
  if (kind === "review") {
    return [
      { role: "system", content: `${base} Return {"student": "...", "replies": ["..."]}. The student has already answered and seen the official key; they ask why it is right. replies[0]: the explanation of why the key is correct (and, for MCQ, why the tempting wrong option is wrong), under 110 words, consistent with the key.` },
      { role: "user", content: `Question (${item.type}, ${item.subject || "cs"}):\n${String(item.text).slice(0, 2500)}\n${optionsText(item)}\nOfficial answer key: ${keyText(item)}` },
    ];
  }
  if (kind === "concept") {
    return [
      { role: "system", content: `${base} Return {"student": "...", "replies": ["..."]}. student: a real doubt about this topic. replies[0]: a clear spoken explanation with one tiny example, under 110 words. Only facts you are sure of.` },
      { role: "user", content: `Topic: ${item.name} (subject: ${item.subject})` },
    ];
  }
  return [
    { role: "system", content: `${base} Return {"student": "...", "replies": ["..."]}. This is conversation mode: student says something casual (tired, nervous about GATE, happy about a result, asks how the teacher is). replies[0]: a warm reply in one or two short sentences that gently comes back to studying ${item.name}. Never personal data, never off-topic advice.` },
    { role: "user", content: `Today's topic: ${item.name}` },
  ];
}

/** A "student" line that is really the prompt echoed back (seen from real teacher models): unusable. */
function badStudent(text) {
  const t = String(text).trim();
  return t.length > 300 || /how the student|^student\b|^question\s*\(|today'?s topic|^topic\s*:|answer key|\boptions?\s*:/i.test(t);
}

function parseTeacher(content, n) {
  const m = String(content || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    const replies = Array.isArray(j.replies) ? j.replies.map((r) => String(r).trim()).filter(Boolean) : [];
    if (typeof j.student !== "string" || !j.student.trim() || replies.length < n) return null;
    // The student's line must be what a student says, not the instruction or the question pasted back.
    if (badStudent(j.student)) return null;
    return { student: j.student.trim().slice(0, 400), replies: replies.slice(0, n).map((r) => r.slice(0, 900)) };
  } catch {
    return null;
  }
}

/* ── the checks every reply must pass ── */

const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const devanagariShare = (s) => {
  const letters = String(s).match(/\p{L}/gu) || [];
  return letters.length ? letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length : 0;
};

/** Why a reply can't be used, or "" if it can. */
function rejectReason(kind, item, lang, reply) {
  if (/```|^\s*[-*#>]|\*\*|^\s*\d+\.\s/m.test(reply)) return "not spoken style";
  // Maths written as code ("P(\bar T)", "0.3*0.4", "$x^2$") can't be read aloud: Guru says it in words.
  if (/\\[a-zA-Z]+|\$|\^|\d\s*\*\s*\d/.test(reply)) return "not spoken style";
  if (words(reply) > (kind === "hint" ? 70 : kind === "talk" ? 45 : 120)) return "too long";
  if (words(reply) < 3) return "too short";
  // Unfinished or placeholder text ("s→?", "…", "[step]"): a teacher model that gave up mid-way.
  if (/…|\.\.\.|→\s*\?|\?\s*;|\[[^\]]{0,20}\]|\bTODO\b|<[^>]+>/.test(reply)) return "unfinished";
  const dev = devanagariShare(reply);
  if (lang === "hi" && dev < 0.5) return "not Hindi";
  if (lang !== "hi" && dev > 0.1) return "not Roman script";
  if (kind === "hint" && G.leaks({ reply, answerKey: keyText(item), options: item.options || [] }).leak) return "leaks the answer";
  if (kind === "review") {
    // The explanation must name the official key (a letter or the value), as heard.
    const said = G.answerForm(reply);
    const key = keyText(item);
    const letters = key.split(/[;,]/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-D]$/.test(x));
    const ok = letters.length ? letters.some((l) => said.includes(`‹${l}›`)) : key.split(/\s*(?::|to)\s*/).some((n) => n && said.includes(String(Number(n))));
    if (!ok) return "doesn't state the key";
  }
  return "";
}

/* ── the training examples, in the site's own prompt format ── */

function screenOf(kind, item) {
  if (kind === "hint" || kind === "review") {
    const shown = kind === "review" ? `\nAnswer shown on screen: ${JSON.stringify(item.answer)}` : "";
    return `Page: /gate/practice (gate)\n\nGATE question on screen: ${item.id}\n${kind === "review" ? "The student has answered/checked this question (review mode)." : "The student has NOT answered this question yet."}\n\nQuestion text:\n${String(item.text).slice(0, 2500)}\n${optionsText(item)}${shown}`;
  }
  return item.page ? `Page: ${item.page}` : "";
}

/* Students name their teachers, so examples use many names (and sometimes none): the model learns to answer to whatever name it is given. */
const TRAIN_NAMES = ["Priya", "Kavya", "Neha", "Ananya", "Arjun", "Rohan", "Dev", "Meera", "Sana", "Vikram", "Asha", "Kabir", "Tara", "Ravi", ""];
const FIRST = { priya: "Priya", kavya: "Kavya", neha: "Neha", ananya: "Ananya", arjun: "Arjun", rohan: "Rohan", dev: "Dev" };
/** The name a teacher has in one example: the look's old name for half the items, else one from the pool (deterministic by item). */
function trainingName(teacherId, itemId) {
  if (!teacherId) return "";
  let h = 0;
  for (const c of String(itemId)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? FIRST[teacherId] || "" : TRAIN_NAMES[h % TRAIN_NAMES.length];
}

/** Chat-format examples ({ id, split, messages, meta }), one per assistant turn, built with buildMessages. */
function toExamples(kind, item, lang, teacherId, t, teacherModel) {
  const persona = G.personaFor(teacherId, trainingName(teacherId, item.id));
  const itemId = item.id;
  const split = splitOf(itemId);
  const pageText = screenOf(kind, item);
  const out = [];
  const history = [];
  const followUps = { en: ["another hint please", "still stuck"], hg: ["aur hint do", "abhi bhi samajh nahi aaya"], hi: ["एक और हिंट दो", "अभी भी समझ नहीं आया"] }[lang];
  t.replies.forEach((reply, i) => {
    const text = i === 0 ? t.student : followUps[(i - 1) % followUps.length];
    const step = kind === "hint" ? i + 1 : kind === "review" ? 6 : 0;
    const messages = G.buildMessages({ pageText, verified: null, step, examActive: false, lang: siteLang(lang), text, unsolved: kind === "hint", persona, talk: kind === "talk", history: [...history] });
    out.push({ id: `${kind}:${itemId}:${lang}:${teacherId || "guru"}#${i + 1}`, split, messages: [...messages, { role: "assistant", content: reply }], meta: { kind, item: itemId, lang, teacher: teacherId || "guru", step, teacherModel, ...(kind === "hint" || kind === "review" ? { key: keyText(item), options: item.options || [] } : {}) } });
    history.push({ role: "user", content: text }, { role: "assistant", content: reply });
  });
  return out;
}

/* ── what to ask about ── */

/** GATE questions a text model can do (no figures), with a usable key. */
function gateItems(bank) {
  return bank.questions.filter((q) => ["MCQ", "MSQ", "NAT"].includes(q.type) && q.answer != null && !q.hasFigure && String(q.text || "").trim().length > 20);
}

/** Every Nexus skill name, by subject (topic names only — facts, not our prose). */
function topicItems(subjects) {
  const out = [];
  for (const s of subjects) for (const n of s.nodes || []) if (n.id && n.name) out.push({ id: `${s.id}/${n.id}`, name: n.name, subject: s.name || s.id, page: `/learn/${s.id}/${n.id}` });
  return out;
}

/** The plan: which (kind, item, language, teacher) to ask for, deterministic for a seed. */
function plan({ questions, topics, perKind = {}, seed = 1 }) {
  const jobs = [];
  const take = (list, n, kind) => {
    const sorted = [...list].sort((a, b) => unit(`${seed}:${kind}:${a.id}`) - unit(`${seed}:${kind}:${b.id}`));
    for (const item of sorted.slice(0, n)) {
      const lang = pickLang(`${seed}:${kind}:${item.id}`);
      const teacher = TEACHER_IDS[Math.floor(unit(`${seed}:who:${kind}:${item.id}`) * TEACHER_IDS.length)];
      jobs.push({ kind, item, lang, teacher });
    }
  };
  take(questions, perKind.hint ?? 0, "hint");
  take(questions, perKind.review ?? 0, "review");
  take(topics, perKind.concept ?? 0, "concept");
  take(topics, perKind.talk ?? 0, "talk");
  return jobs;
}

const REPLIES = { hint: 3, review: 1, concept: 1, talk: 1 };

module.exports = {
  trainingName, allowedTeacher, TEACHERS, FORBIDDEN, KINDS, LANGS, TEACHER_IDS, REPLIES, teacherMessages, parseTeacher, rejectReason, toExamples, splitOf, pickLang, gateItems, topicItems, plan, devanagariShare, unit };
