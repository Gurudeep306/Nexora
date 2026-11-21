/* ========== Guru: the voice tutor (docs/voice/BLUEPRINT.md §4.4) ==========
   A spoken doubt in, a short spoken answer out, grounded in what is on the
   student's screen and in NexoraGuru's verified content.

   Rules that are enforced here in code, not only asked of the model
   (docs/voice/GURU_SPEC.md):
   - Zero spend: only providers on a free preset are ever called; paid ones
     in Admin → AI models are skipped for Guru.
   - Never stuck on a limit: each free provider is tried in turn; when all
     are busy, Guru still answers from verified content without AI.
   - Leak Guard: on an unanswered GATE question or an unsolved problem, a
     reply that states the key or contains solution code is blocked and
     replaced by the next hint.
   - No answers during a live exam, and only CS / GATE topics. */
const { AiError, createGroqClient, models } = require("../ai/groq");
const settings = require("../ai/settings");
const agent = require("../ai/agent");
const { runAs } = require("../context");

/* ── pure parts (tests/voice-guru.test.js) ── */

const FREE_KINDS = new Set(settings.PRESETS.filter((p) => p.free).map((p) => p.kind));
const PAID_HOSTS = /api\.openai\.com|api\.anthropic\.com|api\.together\.xyz|api\.deepseek\.com/i;

/** Free providers only, in the admin's order (tutor choice, main, fast, fallback). */
function freeTargets(config) {
  const order = [config.features?.tutor, config.slots?.main, config.slots?.fast, config.slots?.fallback];
  const out = [];
  for (const a of order) {
    if (!a?.provider || !a?.model) continue;
    const p = (config.providers || []).find((x) => x.id === a.provider);
    if (!p || p.enabled === false || !FREE_KINDS.has(p.kind) || PAID_HOSTS.test(p.baseUrl || "")) continue;
    const id = `${p.id}|${a.model}`;
    if (!out.some((t) => t.id === id)) out.push({ id, providerId: p.id, model: String(a.model) });
  }
  return out;
}

/** Clear non-study topics, answered politely without spending an AI call. */
const OFF_TOPIC = /\b(cricket|ipl|match score|movie|film|song|lyrics|weather|politic|election|girlfriend|boyfriend|crush|recipe|horoscope|stock tip|bitcoin price)\b|\b(india|team|ipl)\b.*\bmatch\b|\bmatch\b.*\b(jeeta|jeeti|won|score)\b/i;
const STUDY_WORDS = /\b(algorithm|array|graph|tree|code|complexity|gate|dsa|sort|search|dbms|os|network|compiler|logic|question|option|answer|step|lesson|notes|proof|recursion|loop|pointer|stack|queue|hash|automata|grammar|cpu|cache|memory)\b/i;
function offTopic(text) {
  return OFF_TOPIC.test(text) && !STUDY_WORDS.test(text);
}

/** Where on the hint ladder (GURU_SPEC §4) the next reply should stand. */
function ladderStep({ attempted, hintsGiven, wantsSolution }) {
  if (attempted && wantsSolution) return 6;
  return Math.max(1, Math.min(5, (Number(hintsGiven) || 0) + 1));
}

const LADDER_TEXT = {
  1: "a NUDGE: point at the right thing to look at, in one or two sentences. No method, no steps.",
  2: "a QUESTION that makes the student think about the key idea. No method, no steps.",
  3: "the IDEA: name the technique or property that cracks it, without applying it.",
  4: "an OUTLINE: the plan in two or three spoken steps, no final values, no code.",
  5: "PSEUDOCODE-LEVEL help: the structure of the solution in words, still without the final answer.",
  6: "the VERIFIED SOLUTION, explained step by step in plain speech, ending with the answer.",
};

const wantsSolutionRe = /\b(solution|answer batao|answer bata|show (me )?the (answer|solution)|solution dikhao|answer kya hai|final answer|explain the solution)\b/i;
const stuckRe = /\b(stuck|hint|help|samajh nahi|nahi samjha|confused|kaise karu|how (do|to) (i )?start|next hint|aur hint)\b/i;

/**
 * Leak Guard: does a reply give away the answer the student hasn't earned?
 * answerKey: the GATE key ("B", "A;C", "3.14", "2.5:2.7") or null.
 * referenceCode: a reference solution, or null.
 */
function leaks({ reply, answerKey, options = [], referenceCode = null, codeAllowed = false }) {
  const text = String(reply || "");
  if (!codeAllowed) {
    if (/```/.test(text)) return { leak: true, why: "code block" };
    const codey = text.split("\n").filter((l) => /[;{}]\s*$|^\s*(for|while|if|def|int|return|public|class|#include)\b.*[(:{]/.test(l)).length;
    if (codey >= 3) return { leak: true, why: "code lines" };
    if (referenceCode) {
      const toks = (s) => new Set(String(s).toLowerCase().match(/[a-z_][a-z0-9_]*|\d+|[^\s\w]/g) || []);
      const ref = toks(referenceCode);
      const got = toks(text);
      let common = 0;
      for (const t of got) if (ref.has(t) && t.length > 2) common++;
      if (ref.size > 20 && common / ref.size > 0.5) return { leak: true, why: "matches the reference code" };
    }
  }
  if (answerKey != null && String(answerKey).trim()) {
    const keys = String(answerKey).split(/\s+or\s+/i).map((k) => k.trim()).filter(Boolean);
    for (const key of keys) {
      // Option letters: "answer is B", "option (B) is correct", "B and D".
      const letters = key.split(/[;,]/).map((x) => x.trim().toUpperCase()).filter((x) => /^[A-D]$/.test(x));
      if (letters.length) {
        const set = letters.join("");
        // "answer is B", "B is correct", "pick B" — but not "look at option B".
        const res = [
          new RegExp(`\\b(answer|correct|sahi|right)\\b[^.\\n]{0,30}\\(?\\b[${set}]\\b\\)?`, "i"),
          new RegExp(`\\(?\\b[${set}]\\b\\)?[^.\\n]{0,25}\\b(is|are|hai)\\s+(the\\s+)?(correct|right|answer|sahi)`, "i"),
          new RegExp(`\\b(choose|pick|mark|select|go with|chuno)\\s+(option\\s+)?\\(?[${set}]\\b`, "i"),
          new RegExp(`\\(?\\b[${set}]\\b\\)?\\s+(option\\s+)?(is\\s+)?(sahi|correct|right)\\b`, "i"),
        ];
        if (res.some((re) => re.test(text))) return { leak: true, why: "states the option" };
        for (const L of letters) {
          const opt = options.find((o) => String(o.l || o.label || "").toUpperCase() === L);
          const optText = String(opt?.t || "").trim();
          if (optText.length >= 6 && text.toLowerCase().includes(optText.toLowerCase()) && /\b(answer|correct|sahi|right)\b/i.test(text)) return { leak: true, why: "quotes the right option" };
        }
        continue;
      }
      // Numerical answers: the value, or a range end, said outright.
      const nums = key.split(/\s*(?:to|:|-)\s*/).map(Number).filter(Number.isFinite);
      // A range key ("2.5:2.7"): any value said inside it next to answer words.
      if (nums.length === 2) {
        const [lo, hi] = nums[0] <= nums[1] ? nums : [nums[1], nums[0]];
        for (const m of text.matchAll(/-?\d+(?:\.\d+)?/g)) {
          const v = Number(m[0]);
          const near = text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40);
          if (v >= lo && v <= hi && /\b(answer|result|value|equals|comes out|sahi|final|is)\b|=/.test(near)) return { leak: true, why: "states a value in the key's range" };
        }
      }
      for (const n of nums) {
        const forms = [...new Set([String(n), n.toFixed(1), n.toFixed(2)].map((x) => x.replace(/\.0+$/, "")))];
        for (const f of forms) {
          const at = new RegExp(`(^|[^\\d.])${f.replace(".", "\\.")}([^\\d]|$)`);
          const m = text.match(at);
          if (!m) continue;
          // Small whole numbers turn up in hints ("2 steps"): only flag them next to answer words.
          const small = Number.isInteger(n) && Math.abs(n) < 10;
          const near = text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40);
          if (!small || /\b(answer|result|value|equals|comes out|sahi|final)\b|=/.test(near)) return { leak: true, why: "states the value" };
        }
      }
    }
  }
  return { leak: false };
}

/** Plain spoken text: no markdown, no code fences, short. */
function spoken(text, max = 900) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " (see the screen) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, max);
}

const SYSTEM = (lang) => `You are Guru, NexoraGuru's voice tutor: the senior who cleared GATE and now sits beside the student. Calm, quick, warm, never showing off.
Rules you never break:
- Speak, don't write: short spoken sentences, at most 70 words, no lists, no markdown, no headings, no code blocks. Say symbols in words ("O of n log n", "i plus plus", "for all x").
- Reply in the student's own mix of languages. ${lang === "hi-IN" ? "They chose Hindi: reply in simple Hindi (Devanagari), technical terms in English." : "If they write Hinglish, reply in Hinglish (Roman script); if English, in English."} Keep technical terms in English.
- Only CS, GATE CSE, maths for CS, GATE aptitude and using NexoraGuru. Anything else: one polite line, then offer to continue studying.
- Never invent facts, numbers, years or marks. Use the page and the verified material given. If something is not there, say you won't guess.
- Never write the student's code for an unsolved problem. Never give the answer to an unanswered question unless the instruction for this turn says to.
- If asked whether you are human, say you are NexoraGuru's AI.
- Encourage after mistakes, briefly. No flattery.`;

/** The messages for one Guru turn. Pure. */
function buildMessages({ pageText, verified, step, examActive, lang, text, unsolved }) {
  const turn = examActive
    ? "A timed exam is running: do not give hints or answers about the exam questions. Say you'll review it together after the test."
    : unsolved
      ? `The student has NOT solved this yet. Give ${LADDER_TEXT[Math.min(step, 5)]}`
      : step >= 6
        ? `The student has attempted it. Give ${LADDER_TEXT[6]}`
        : "Answer the doubt directly and briefly, using the verified material.";
  return [
    { role: "system", content: SYSTEM(lang) },
    ...(pageText ? [{ role: "system", content: `On the student's screen:\n${pageText.slice(0, 12000)}` }] : []),
    ...(verified ? [{ role: "system", content: `Verified material (private reference — use it to be correct; reveal only what this turn allows):\n${verified.slice(0, 8000)}` }] : []),
    { role: "system", content: `This turn: ${turn}` },
    { role: "user", content: text },
  ];
}

/* ── the runner ── */

const clients = new Map();
function clientForTarget(t) {
  const config = settings.peekConfig();
  const p = (config.providers || []).find((x) => x.id === t.providerId);
  if (!p) return null;
  const key = settings.providerKeyFor(p);
  if (!key) return null;
  const id = `${p.baseUrl}|${t.providerId}`;
  if (!clients.has(id)) clients.set(id, createGroqClient({ apiKey: key, baseUrl: p.baseUrl, maxRetries: 1 }));
  return clients.get(id);
}

/** Free clients to try, in order: the admin's free picks, then the free Groq environment key. */
function chain() {
  const out = [];
  for (const t of freeTargets(settings.peekConfig())) {
    const client = clientForTarget(t);
    if (client) out.push({ client, model: t.model, label: t.providerId });
  }
  const envBase = process.env.GROQ_BASE_URL || "";
  if (process.env.GROQ_API_KEY && !PAID_HOSTS.test(envBase)) {
    const m = models();
    out.push({ client: createGroqClient({ maxRetries: 1 }), model: m.main, label: "env" });
    if (m.fast && m.fast !== m.main) out.push({ client: createGroqClient({ maxRetries: 1 }), model: m.fast, label: "env-fast" });
  }
  return out;
}

const NO_AI = {
  en: "I can't reach my thinking engine right now, so I won't guess.",
  hi: "Abhi mera AI busy hai, toh main guess nahi karunga.",
};

function firstSentences(s, n = 3) {
  return String(s || "").split(/(?<=[.!?])\s+/).slice(0, n).join(" ");
}

/**
 * One Guru turn. Returns { say, step, source }.
 * page: the AgentPage the client reports; hintsGiven: hints already given on this item.
 */
async function askGuru({ user, page = {}, text, hintsGiven = 0, lang = "en-IN" }) {
  const username = user?.username || "";
  const question = String(text || "").trim().slice(0, 1200);
  if (!question) throw new AiError("Say something first", 400, "bad_request");
  const hinglish = lang !== "hi-IN";

  if (offTopic(question)) {
    return { say: hinglish ? "Main sirf CS aur GATE mein help karta hoon. Chalo, kahan the hum?" : "मैं सिर्फ़ CS और GATE में मदद करता हूँ। चलो, पढ़ाई जारी रखें?", step: 0, source: "rule" };
  }

  const ctx = await runAs(username, () => agent.pageContext(page));
  const p = ctx.page;
  if (p.examActive) {
    return { say: hinglish ? "Test chal raha hai — abhi hint nahi. Test ke baad saath mein dekhenge." : "टेस्ट चल रहा है — अभी हिंट नहीं। टेस्ट के बाद साथ में देखेंगे।", step: 0, source: "rule" };
  }

  // Verified material: the GATE question's key and solution when one is on screen.
  let answerKey = null;
  let options = [];
  let verified = "";
  if (p.gateQuestionId) {
    // eslint-disable-next-line global-require
    const gate = require("../routes/gate");
    const q = gate.findGateQuestion(p.gateQuestionId);
    if (q) {
      answerKey = q.answer ?? null;
      options = q.options || [];
      verified = [`Question ${q.id}: ${q.text}`, ...(options.length ? options.map((o) => `(${o.l}) ${o.t}`) : []), `Answer key: ${q.answer}`, q.solution ? `Verified solution:\n${q.solution}` : ""].filter(Boolean).join("\n");
    }
  }
  const answered = !!p.gateAnswered || ctx.solved;
  const hasTask = !!(p.gateQuestionId || p.problemId);
  const unsolved = hasTask && !answered;
  const wantsSolution = wantsSolutionRe.test(question);
  const step = unsolved ? ladderStep({ attempted: false, hintsGiven: stuckRe.test(question) || wantsSolution ? hintsGiven : Math.max(0, hintsGiven - 1), wantsSolution }) : wantsSolution ? 6 : 0;

  const messages = buildMessages({ pageText: ctx.text, verified, step, examActive: false, lang, text: question, unsolved });
  const tries = chain();
  let lastErr = null;
  for (const t of tries) {
    try {
      const out = await t.client.chat({ model: t.model, messages, maxTokens: 320, temperature: 0.4, timeoutMs: 20000 });
      if (out.usage) agent.addUsage(username, out.usage).catch(() => {});
      let say = spoken(out.content);
      // An empty answer (all thinking, or cut off): try the next free provider.
      if (!say.trim()) {
        lastErr = new Error("empty reply");
        continue;
      }
      if (unsolved && leaks({ reply: say, answerKey, options }).leak) {
        // One stricter retry, then a safe hint written here.
        const again = await t.client.chat({
          model: t.model,
          messages: [...messages, { role: "assistant", content: out.content }, { role: "system", content: "That reply revealed the answer or code. Replace it with only the next hint — no option letter, no final value, no code." }],
          maxTokens: 220,
          temperature: 0.3,
          timeoutMs: 20000,
        }).catch(() => null);
        say = again ? spoken(again.content) : "";
        if (!say || leaks({ reply: say, answerKey, options }).leak) {
          say = hinglish ? "Answer main abhi nahi bataunga — pehle tum try karo. Question ke key words dobara padho, aur har option ko ek example pe check karo." : "उत्तर अभी नहीं बताऊँगा — पहले तुम कोशिश करो। हर विकल्प को एक उदाहरण पर जाँचो।";
          return { say, step, source: "guard" };
        }
      }
      return { say, step, source: t.label };
    } catch (e) {
      // Busy, limited, misconfigured or down: try the next free provider.
      lastErr = e;
    }
  }
  // Every free provider is busy: answer from verified content, without AI.
  if (verified && !unsolved && step >= 6) return { say: spoken(firstSentences(verified.split("Verified solution:\n")[1] || verified, 4)), step, source: "verified" };
  const base = hinglish ? NO_AI.en : NO_AI.hi;
  if (lastErr) console.warn("[guru] all free providers failed:", lastErr.message);
  return { say: `${base} ${hasTask ? (hinglish ? "Tab tak question ko chhote examples pe try karo." : "तब तक छोटे उदाहरणों पर कोशिश करो।") : ""}`.trim(), step, source: "none" };
}

module.exports = { askGuru, leaks, ladderStep, buildMessages, freeTargets, offTopic, spoken, chain, FREE_KINDS };
