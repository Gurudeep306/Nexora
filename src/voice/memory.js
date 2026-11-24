/* ========== The teacher remembers the student (docs/voice/VIRTUAL_TEACHER.md) ==========
   Like a real teacher, she remembers who she is teaching between sessions:
   their goal, what they studied recently and what they found hard, and their
   name if they told her. Learned by rules from what the student says and the
   page they are on — no AI.

   Privacy (AGENTS.md: never send users' personal data to outside services):
   - the name never goes into a prompt for an AI provider; it is used only in
     greetings built here and spoken by our own voice;
   - the AI is given study facts only (goal, topics, what was hard);
   - the student can see everything she remembers and erase it (Settings →
     Virtual teacher → What she remembers). */
const { run, get } = require("../db");

let ready = null;
function init() {
  ready ||= run("CREATE TABLE IF NOT EXISTS teacher_memory (username TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL)").catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const EMPTY = { name: "", goal: "", topics: [], hard: [], turns: 0, lastSeen: 0 };
const MAX_TOPICS = 6;
const MAX_HARD = 4;

/** Words that follow "I am" but are not names. */
const NOT_NAMES = new Set(["tired", "stuck", "fine", "good", "ok", "okay", "confused", "ready", "back", "here", "sure", "not", "very", "so", "a", "an", "the", "preparing", "studying", "student", "doing", "trying", "learning", "bored", "sleepy", "happy", "sad", "scared", "worried", "new", "going"]);

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** A name the student gave for themselves, or "". Only clear statements ("my name is", "mera naam … hai", "call me"). */
function nameFrom(text) {
  const t = String(text || "");
  const m =
    t.match(/\b(?:my name is|my name's|call me|i am called|this is)\s+([A-Za-z]{2,20})\b/i) ||
    t.match(/\bmera naam\s+([A-Za-z]{2,20})\s+(?:hai|he)\b/i) ||
    t.match(/\b[Ii](?:'m| am)\s+([A-Z][a-z]{2,20})\b/);
  if (!m) return "";
  const w = m[1];
  return NOT_NAMES.has(w.toLowerCase()) ? "" : cap(w);
}

/** A study goal said aloud: "GATE 2027", "placements". */
function goalFrom(text) {
  const t = String(text || "").toLowerCase();
  const y = t.match(/\bgate\s*(?:exam\s*)?(20[2-4]\d)\b/);
  if (y) return `GATE ${y[1]}`;
  if (/\bgate\b/.test(t) && /\b(prepar|preparing|taiyari|crack|clear)\w*/.test(t)) return "GATE";
  if (/\b(placement|placements|interview|interviews|job)\b/.test(t)) return "placements and interviews";
  return "";
}

const HARD = /\b(hard|difficult|confus\w*|stuck|don'?t understand|samajh nahi|nahi samjh\w*|mushkil|tough)\b|मुश्किल|समझ नहीं/i;

/** The topic of the page the student is on (a lesson, a subject, a problem), never anything personal. */
function topicOf(page) {
  const p = page && typeof page === "object" ? page : {};
  const t = String(p.learnTopic || p.title || "").trim();
  if (t && t.length <= 80 && !/@/.test(t)) return t;
  return "";
}

/** Pure: what she knows after this turn. */
function learn(mem, { heard = "", page = {} } = {}) {
  const m = { ...EMPTY, ...(mem || {}) };
  m.topics = [...(m.topics || [])];
  m.hard = [...(m.hard || [])];
  const name = nameFrom(heard);
  if (name) m.name = name;
  const goal = goalFrom(heard);
  if (goal) m.goal = goal;
  const topic = topicOf(page);
  if (topic) {
    m.topics = [topic, ...m.topics.filter((x) => x !== topic)].slice(0, MAX_TOPICS);
    if (HARD.test(String(heard))) m.hard = [topic, ...m.hard.filter((x) => x !== topic)].slice(0, MAX_HARD);
  }
  m.turns = (m.turns || 0) + 1;
  m.lastSeen = Date.now();
  return m;
}

/** Pure: the study facts for the AI's prompt — never the name. "" when there is nothing yet. */
function promptFacts(mem) {
  if (!mem) return "";
  const parts = [];
  if (mem.goal) parts.push(`preparing for ${mem.goal}`);
  if (mem.topics?.length) parts.push(`studied recently: ${mem.topics.slice(0, 4).join(", ")}`);
  if (mem.hard?.length) parts.push(`found hard: ${mem.hard.slice(0, 3).join(", ")}`);
  if (!parts.length) return "";
  return `What you remember about this student from earlier sessions: ${parts.join("; ")}. Use it naturally when it helps (like a teacher who knows them); never read it back as a list.`;
}

/** Pure: a welcome that shows she remembers (built here, never by an AI). */
function greeting(mem, lang = "en-IN") {
  const hi = lang === "hi-IN";
  const name = mem?.name || "";
  const last = mem?.topics?.[0] || "";
  const back = mem?.turns > 0;
  if (hi) {
    if (back && last) return `${name ? `${name}, ` : ""}फिर से स्वागत है! पिछली बार हम ${last} पर थे। वहीं से आगे चलें, या कुछ नया?`;
    return name ? `नमस्ते ${name}! आज क्या पढ़ना है?` : "हाँ, बोलो! आज क्या पढ़ना है?";
  }
  if (back && last) return `${name ? `Welcome back, ${name}! ` : "Welcome back! "}Last time we were on ${last}. Shall we carry on from there, or something new?`;
  return name ? `Hi ${name}! What shall we study today?` : "Hi! What shall we study today?";
}

async function recall(username) {
  if (!username) return { ...EMPTY };
  await init();
  const row = await get("SELECT data FROM teacher_memory WHERE username=?", [username]);
  try {
    return { ...EMPTY, ...JSON.parse(row?.data || "{}") };
  } catch {
    return { ...EMPTY };
  }
}

async function remember(username, turn) {
  if (!username) return;
  await init();
  const next = learn(await recall(username), turn);
  await run("INSERT INTO teacher_memory (username, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(username) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at", [username, JSON.stringify(next), Date.now()]);
  return next;
}

async function forget(username) {
  await init();
  await run("DELETE FROM teacher_memory WHERE username=?", [username]);
}

module.exports = { learn, promptFacts, greeting, nameFrom, goalFrom, recall, remember, forget, EMPTY };
