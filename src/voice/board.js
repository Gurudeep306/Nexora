/* ========== The teacher's whiteboard (docs/voice/VIRTUAL_TEACHER.md §3, T3) ==========
   "Explain binary search on the whiteboard": a free model writes a short
   lesson as steps; each step is one or two spoken sentences plus drawing
   instructions in a tiny, safe drawing language the browser draws stroke by
   stroke while the teacher explains and points.

   Enforced here in code:
   - Only free providers (Guru's chain), and only CS / GATE topics.
   - The drawing language is checked strictly: known shapes only, numbers
     kept on the board, text short, at most 8 steps and 14 shapes a step.
   - On an unsolved problem or unanswered question, Guru's Leak Guard runs on
     everything said and written; no whiteboard during a test. */
const { AiError } = require("../ai/groq");
const agent = require("../ai/agent");
const { runAs } = require("../context");
const guru = require("./guru");

/* The board is 100 wide and 60 tall; the browser scales it. */
const W = 100;
const H = 60;
const MAX_STEPS = 8;
const MAX_OPS = 14;

const num = (v, lo, hi, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n * 10) / 10)) : d;
};
const str = (v, max) =>
  // Comparison signs stay ("a[mid] < key"); only things that look like HTML tags go (text is drawn as text, never as markup).
  String(v ?? "")
    .replace(/<\/?[a-z][^<>]*>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
const pt = (p) => (Array.isArray(p) && p.length === 2 ? [num(p[0], 0, W, 0), num(p[1], 0, H, 0)] : null);
const COLORS = new Set(["ink", "accent", "muted", "good", "bad"]);
const color = (c) => (COLORS.has(c) ? c : "ink");

/** One drawing instruction, checked; null if it isn't one we draw. */
function cleanOp(o) {
  if (!o || typeof o !== "object") return null;
  const id = str(o.id, 24) || undefined;
  switch (o.t) {
    case "text": {
      const text = str(o.text, 80);
      return text ? { t: "text", id, x: num(o.x, 0, W, 4), y: num(o.y, 2, H, 6), text, size: num(o.size, 2, 8, 3.2), color: color(o.color) } : null;
    }
    case "box":
      return { t: "box", id, x: num(o.x, 0, W - 2, 10), y: num(o.y, 0, H - 2, 10), w: num(o.w, 2, W, 16), h: num(o.h, 2, H, 8), label: str(o.label, 40), color: color(o.color) };
    case "circle":
      return { t: "circle", id, x: num(o.x, 0, W, 50), y: num(o.y, 0, H, 30), r: num(o.r, 1, 20, 4), label: str(o.label, 24), color: color(o.color) };
    case "arrow":
    case "line": {
      const from = pt(o.from);
      const to = pt(o.to);
      return from && to ? { t: o.t, id, from, to, label: str(o.label, 30), color: color(o.color) } : null;
    }
    case "array": {
      const values = Array.isArray(o.values) ? o.values.slice(0, 12).map((v) => str(v, 6)) : [];
      if (!values.length) return null;
      const highlight = Array.isArray(o.highlight) ? o.highlight.map((i) => Math.trunc(Number(i))).filter((i) => Number.isInteger(i) && i >= 0 && i < values.length).slice(0, 12) : [];
      const pointers = Array.isArray(o.pointers)
        ? o.pointers
            .slice(0, 4)
            .map((p) => ({ i: Math.trunc(Number(p?.i)), label: str(p?.label, 8) }))
            .filter((p) => Number.isInteger(p.i) && p.i >= 0 && p.i < values.length && p.label)
        : [];
      // The whole array stays on the board: narrower cells if needed, then moved left.
      const cell = Math.min(num(o.cell, 4, 10, 7), Math.floor((W - 2) / values.length));
      const x = Math.min(num(o.x, 0, W, 10), W - 1 - cell * values.length);
      return { t: "array", id, x: Math.max(0, x), y: num(o.y, 0, H - 6, 20), cell, values, highlight, pointers, label: str(o.label, 30) };
    }
    case "clear":
      return { t: "clear" };
    default:
      return null;
  }
}

/** The model's lesson, checked. Returns { title, steps } or null if nothing usable came back. */
function cleanBoard(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.steps)) return null;
  const steps = [];
  for (const s of raw.steps.slice(0, MAX_STEPS)) {
    const say = guru.spoken(str(s?.say, 400), 400);
    const draw = (Array.isArray(s?.draw) ? s.draw : []).slice(0, MAX_OPS).map(cleanOp).filter(Boolean);
    if (say || draw.length) steps.push({ say, draw });
  }
  return steps.length ? { title: str(raw.title, 60) || "Whiteboard", steps } : null;
}

/** The first JSON object in a model's reply (it may wrap it in a code fence or words). */
function firstJson(text) {
  const s = String(text || "");
  const start = s.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try {
        return JSON.parse(s.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const FORMAT = `Reply with JSON only, no other text:
{"title": "short title",
 "steps": [ { "say": "one or two short spoken sentences", "draw": [ ...shapes added in this step... ] } ]}
The board is 100 wide and 60 tall (x right, y down). Shapes:
- {"t":"text","id":"t1","x":5,"y":8,"text":"Binary search","size":4}
- {"t":"array","id":"a","x":10,"y":20,"values":[1,3,5,7,9,11],"highlight":[2],"pointers":[{"i":0,"label":"low"},{"i":5,"label":"high"}],"label":"sorted array"}
- {"t":"box","id":"b1","x":10,"y":30,"w":20,"h":8,"label":"Stack"}
- {"t":"circle","id":"c1","x":50,"y":20,"r":4,"label":"A"}
- {"t":"arrow","from":[30,34],"to":[45,34],"label":"push"}  ("line" is the same without a head)
- {"t":"clear"} wipes the board for a new picture.
Colours (optional "color"): "ink", "accent" (the thing to look at now), "muted", "good", "bad".
Rules: 3 to 6 steps. Each step adds a little to the picture, so it builds up like a teacher drawing. Keep text short, keep shapes inside the board, don't overlap them. Arrays: a new array shape with the same id replaces the old one (move pointers that way).`;

/** Messages for one whiteboard lesson. Pure. */
function buildBoardMessages({ topic, lang, persona, pageText, unsolved }) {
  const who = persona ? `${persona.name}, a teacher on NexoraGuru` : "Guru, NexoraGuru's teacher";
  return [
    {
      role: "system",
      content: `You are ${who}, explaining at a whiteboard to a student preparing for GATE CSE or learning DSA. Explain like a good teacher in person: simple words, one idea per step, a small worked example drawn on the board.
- Only CS, GATE CSE and maths for CS. For anything else, return {"title":"Only CS","steps":[{"say":"I can only teach CS and GATE topics on the board.","draw":[]}]}.
- Speak, don't write: "say" is spoken aloud, no markdown, symbols in words.
- ${lang === "hi-IN" ? "Say it in simple Hindi (Devanagari); keep technical terms and board text in English." : "Say it in English, or Hinglish if the topic was asked in Hinglish."}
- Never invent facts or numbers you aren't sure of.${unsolved ? "\n- The student is working on an unsolved question or problem: teach the idea with a DIFFERENT example; never its answer, its option, its final value or its code." : ""}
${FORMAT}`,
    },
    ...(pageText ? [{ role: "system", content: `On the student's screen (for context):\n${String(pageText).slice(0, 6000)}` }] : []),
    { role: "user", content: `Explain on the whiteboard: ${topic}` },
  ];
}

/** Does any spoken or written part give the answer away? (Guru's Leak Guard on every part.) */
function boardLeaks(board, guard) {
  for (const s of board.steps) {
    const written = s.draw.map((o) => [o.text, o.label, ...(o.values || [])].filter(Boolean).join(" ")).join("\n");
    if (guru.leaks({ ...guard, reply: `${s.say}\n${written}` }).leak) return true;
  }
  return false;
}

/** Make a whiteboard lesson. Returns { title, steps, source } or throws AiError. */
async function makeBoard({ user, topic, page = {}, lang = "en-IN", teacher = "" }) {
  const username = user?.username || "";
  const t = String(topic || "").trim().slice(0, 200);
  if (!t) throw new AiError("Say what to explain on the board", 400, "bad_request");
  if (guru.offTopic(t)) throw new AiError("I can only teach CS and GATE topics on the board.", 400, "off_topic");
  const ctx = await runAs(username, () => agent.pageContext(page));
  const p = ctx.page;
  if (p.examActive) throw new AiError("A test is running — the whiteboard opens after it.", 409, "exam");
  let guard = { answerKey: null, options: [] };
  if (p.gateQuestionId) {
    // eslint-disable-next-line global-require
    const q = require("../routes/gate").findGateQuestion(p.gateQuestionId);
    if (q) guard = { answerKey: q.answer ?? null, options: q.options || [] };
  }
  const unsolved = !!(p.gateQuestionId || p.problemId) && !(p.gateAnswered || ctx.solved);
  const messages = buildBoardMessages({ topic: t, lang, persona: guru.personaFor(teacher), pageText: ctx.text, unsolved });
  let lastErr = null;
  for (const c of guru.chain()) {
    try {
      const out = await c.client.chat({ model: c.model, messages, maxTokens: 1800, temperature: 0.3, timeoutMs: 40000 });
      if (out.usage) agent.addUsage(username, out.usage).catch(() => {});
      const board = cleanBoard(firstJson(out.content));
      if (!board) {
        lastErr = new Error("no usable board");
        continue;
      }
      if (unsolved && boardLeaks(board, guard)) {
        lastErr = new Error("board leaked the answer");
        continue;
      }
      return { ...board, source: c.label };
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) console.warn("[board] no free provider made a board:", lastErr.message);
  throw new AiError("The whiteboard can't be drawn right now — my free AI is busy. Try again in a minute.", 503, "busy");
}

module.exports = { makeBoard, cleanBoard, cleanOp, firstJson, buildBoardMessages, boardLeaks, W, H, MAX_STEPS, MAX_OPS };
