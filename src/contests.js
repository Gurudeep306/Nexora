/*
 * Hosted contests: made on NexoraGuru, from anywhere on the site.
 *
 * A contest (custom_contests, extended here) holds an ordered list of items:
 *   problem   a catalog problem (problems.id): judged by /api/judge
 *   workshop  a Workshop problem (custom_problems.id), public or written
 *             only for contests (contest_only = 1, hidden everywhere else)
 *   gate      a GATE past-paper question (bank id)
 *   question  a question written for this contest (contest_questions):
 *             MCQ, MSQ or NAT with its own marks, negative marks, figures
 *             and solution
 *
 * Coding items are solved on the Solve page; every judged run inside the
 * person's time is counted (contest_runs). GATE-style items are answered
 * once, in the exam console, and graded here (contest_responses).
 *
 * Timing: "fixed" (everyone from the start time for the duration) or
 * "window" (open from the start time to an end time; each person gets the
 * duration from the moment they press Start).
 *
 * Pure rules (phase, scoring, analysis, CSV) take plain objects so the tests
 * can check them without a database.
 */
const crypto = require("crypto");
const { run, get, all } = require("./db");
const { gradeQuestion, isAnswered } = require("./gate/grade");

const MAX_ITEMS = 60;
const MAX_QUESTIONS = 100;
const MAX_DRAFTS = 50;
const MAX_FIGURES = 6;
const MAX_DURATION = 7 * 24 * 60; // minutes
const LETTERS = "ABCDEFGH";
const KINDS = ["problem", "workshop", "gate", "question"];
const CODING = new Set(["problem", "workshop"]);
const PAPER = new Set(["gate", "question"]);

const fail = (status, message) => Object.assign(new Error(message), { status });
const parse = (s, d) => {
  try {
    return s == null || s === "" ? d : JSON.parse(s);
  } catch {
    return d;
  }
};
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const round2 = (x) => Math.round(x * 100) / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/* ── tables ── */

let ready = null;
function init() {
  ready ||= (async () => {
    const add = async (table, col) => {
      try {
        await run(`ALTER TABLE ${table} ADD COLUMN ${col}`);
      } catch {
        /* already there */
      }
    };
    // Older contests stay published and keep working.
    await add("custom_contests", "status TEXT DEFAULT 'published'");
    await add("custom_contests", "settings TEXT DEFAULT '{}'");
    await add("custom_contests", "updated_at TEXT");
    await add("contest_participants", "started_at INTEGER");
    await add("contest_participants", "ends_at INTEGER");
    await add("contest_participants", "finished_at INTEGER");
    await add("contest_participants", "paper_at INTEGER");
    await add("custom_problems", "editorial TEXT DEFAULT ''");
    await add("custom_problems", "contest_only INTEGER DEFAULT 0");
    await run(`CREATE TABLE IF NOT EXISTS contest_items (
      contest_id INTEGER NOT NULL,
      idx INTEGER NOT NULL,
      kind TEXT NOT NULL,
      ref TEXT NOT NULL,
      marks REAL NOT NULL,
      PRIMARY KEY (contest_id, idx)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS contest_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contest_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_cq_contest ON contest_questions(contest_id)");
    await run(`CREATE TABLE IF NOT EXISTS contest_responses (
      contest_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      item_idx INTEGER NOT NULL,
      response TEXT,
      attempted INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      marks REAL NOT NULL DEFAULT 0,
      time_ms INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (contest_id, username, item_idx)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS contest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contest_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      item_idx INTEGER NOT NULL,
      verdict TEXT NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      language TEXT,
      at INTEGER NOT NULL
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_cruns_contest ON contest_runs(contest_id, username)");
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/* ── settings and timing ── */

const SETTINGS_DEFAULT = {
  mode: "fixed", // fixed | window
  endTime: null, // window mode: ISO time the window closes
  access: "link", // link | password
  standings: "live", // live | after | hidden (only the host sees the marks list)
  review: "after_end", // after_finish | after_end: when answers and solutions show
  penaltyMins: 20, // per wrong coding try before Accepted
  negativeMarking: true, // GATE rule for past-paper MCQs
};

function normalizeSettings(input = {}, prev = SETTINGS_DEFAULT) {
  const s = { ...SETTINGS_DEFAULT, ...prev };
  const i = input && typeof input === "object" ? input : {};
  if (["fixed", "window"].includes(i.mode)) s.mode = i.mode;
  if ("endTime" in i) s.endTime = i.endTime && !Number.isNaN(Date.parse(i.endTime)) ? new Date(i.endTime).toISOString() : null;
  if (["link", "password"].includes(i.access)) s.access = i.access;
  if (["live", "after", "hidden"].includes(i.standings)) s.standings = i.standings;
  if (["after_finish", "after_end"].includes(i.review)) s.review = i.review;
  if ("penaltyMins" in i) s.penaltyMins = clamp(Math.round(num(i.penaltyMins, 20)), 0, 120);
  if ("negativeMarking" in i) s.negativeMarking = !!i.negativeMarking;
  return s;
}

const startMs = (c) => Date.parse(c.start_time);
const durMs = (c) => clamp(num(c.duration_mins, 60), 1, MAX_DURATION) * 60000;

/** When the contest closes for everyone. */
function closesAt(c) {
  const s = c.settings || SETTINGS_DEFAULT;
  if (s.mode === "window" && s.endTime) return Date.parse(s.endTime);
  return startMs(c) + durMs(c);
}

/** draft | upcoming | live | ended */
function phase(c, now = Date.now()) {
  if (c.status === "draft") return "draft";
  if (now < startMs(c)) return "upcoming";
  if (now < closesAt(c)) return "live";
  return "ended";
}

/** One person's time: [from, to], and whether it is running now. */
function personWindow(c, entry, now = Date.now()) {
  const s = c.settings || SETTINGS_DEFAULT;
  if (s.mode === "window") {
    if (!entry?.started_at) return { from: null, to: null, state: phase(c, now) === "ended" ? "missed" : "not_started" };
    const to = Math.min(Number(entry.ends_at) || entry.started_at + durMs(c), closesAt(c), entry.finished_at || Infinity);
    return { from: Number(entry.started_at), to, state: now < to ? "running" : "finished" };
  }
  const from = startMs(c);
  const to = Math.min(closesAt(c), entry?.finished_at || Infinity);
  if (now < from) return { from, to, state: "not_started" };
  return { from, to, state: now < to ? "running" : "finished" };
}

/** May this person see answers and solutions now? */
function canReview(c, entry, now = Date.now()) {
  if (phase(c, now) === "ended") return true;
  if ((c.settings || SETTINGS_DEFAULT).review === "after_finish") return personWindow(c, entry, now).state === "finished";
  return false;
}

/* ── custom questions ── */

function cleanQuestion(input = {}) {
  const d = input && typeof input === "object" ? input : {};
  const type = ["MCQ", "MSQ", "NAT"].includes(d.type) ? d.type : "MCQ";
  const text = String(d.text ?? "").slice(0, 20000);
  const options =
    type === "NAT"
      ? []
      : (Array.isArray(d.options) ? d.options : []).slice(0, LETTERS.length).map((o) => String(typeof o === "object" && o ? o.t ?? "" : o ?? "").slice(0, 2000));
  let answer = null;
  if (type === "MCQ") answer = typeof d.answer === "string" && /^[A-H]$/.test(d.answer) ? d.answer : null;
  else if (type === "MSQ") answer = Array.isArray(d.answer) ? [...new Set(d.answer.filter((x) => typeof x === "string" && /^[A-H]$/.test(x)))].sort() : [];
  else {
    const a = d.answer && typeof d.answer === "object" ? d.answer : {};
    const min = Number(a.min);
    const max = a.max === "" || a.max == null ? min : Number(a.max);
    answer = Number.isFinite(min) && Number.isFinite(max) ? { min: Math.min(min, max), max: Math.max(min, max) } : null;
  }
  const marks = clamp(round2(num(d.marks, 1)), 0.25, 100);
  const negative = clamp(round2(num(d.negative, type === "MCQ" ? round2(marks / 3) : 0)), 0, marks);
  const figures = (Array.isArray(d.figures) ? d.figures : [])
    .filter((f) => f && typeof f.url === "string" && /^\/uploads\/contests\/[\w.-]+$/.test(f.url))
    .slice(0, MAX_FIGURES)
    .map((f) => ({ url: f.url, alt: String(f.alt ?? "").slice(0, 300) }));
  const solution = String(d.solution ?? "").slice(0, 20000);
  return { type, text, options, answer, marks, negative, figures, solution };
}

/** What is still missing before the question can be used. */
function questionProblems(q) {
  const out = [];
  if (!q.text.trim()) out.push("the question text");
  if (q.type !== "NAT") {
    if (q.options.length < 2) out.push("at least two options");
    if (q.options.some((o) => !o.trim())) out.push("text for every option");
    if (q.type === "MCQ" && (!q.answer || LETTERS.indexOf(q.answer) >= q.options.length)) out.push("the correct option");
    if (q.type === "MSQ" && (!q.answer.length || q.answer.some((a) => LETTERS.indexOf(a) >= q.options.length))) out.push("the correct options");
  } else if (!q.answer) out.push("the correct answer (a number or a range)");
  return out;
}

/** Grade one response to a contest question (its own marks and negative marks). */
function gradeOwn(q, resp) {
  const max = q.marks;
  if (!isAnswered(resp)) return { attempted: false, correct: false, marks: 0, max };
  let correct = false;
  if (q.type === "MCQ") correct = String(resp).trim().toUpperCase() === q.answer;
  else if (q.type === "MSQ") {
    const got = [...new Set((Array.isArray(resp) ? resp : [resp]).map((x) => String(x).trim().toUpperCase()))].sort();
    correct = got.length === q.answer.length && got.every((v, i) => v === q.answer[i]);
  } else {
    const n = Number(resp);
    correct = Number.isFinite(n) && n >= q.answer.min - 1e-9 && n <= q.answer.max + 1e-9;
  }
  return { attempted: true, correct, marks: correct ? max : -q.negative, max };
}

/** Grade a past-paper question with the contest's marks (GATE's −1/3 rule scaled to them). */
function gradeBank(q, resp, marks, negativeMarking) {
  const g = gradeQuestion(q, resp);
  if (!g.attempted) return { ...g, marks: 0, max: marks };
  const scale = g.max ? marks / g.max : 1;
  let m = g.marks * scale;
  if (!negativeMarking && m < 0) m = 0;
  return { attempted: true, correct: g.correct, marks: m, max: marks };
}

/** A contest question in the exam console's shape (no answer unless asked). */
function asGateQuestion(id, q, { withAnswer = false } = {}) {
  return {
    id,
    paper: "contest",
    exam: "CSE",
    year: 0,
    set: null,
    section: "contest",
    number: "",
    marks: q.marks,
    negative: q.negative,
    type: q.type,
    text: q.text,
    options: q.options.map((t, i) => ({ l: LETTERS[i], t })),
    figures: q.figures.map((f) => ({ f: f.url, alt: f.alt || "Figure" })),
    group: null,
    subject: "contest",
    topic: "",
    tags: [],
    answer: withAnswer ? (q.type === "NAT" ? (q.answer.min === q.answer.max ? String(q.answer.min) : `${q.answer.min}:${q.answer.max}`) : q.type === "MSQ" ? q.answer.join(";") : q.answer) : undefined,
    answerSource: withAnswer ? "official" : null,
    confidence: null,
    textSource: "web",
    sourceUrl: null,
    needsReview: false,
    reviewNote: null,
    custom: true,
  };
}

/* ── scoring ── */

/**
 * One person's coding result for one item from their runs (time order):
 * solved at the first Accepted inside their time; wrong tries before it count
 * as penalty (compile errors do not, as in ICPC).
 */
function codingResult(runs, from) {
  let wrong = 0;
  for (const r of runs) {
    if (r.verdict === "AC") return { solved: true, tries: wrong + 1, wrong, minutes: Math.max(0, Math.floor((r.at - from) / 60000)), at: r.at };
    if (r.verdict !== "CE") wrong++;
  }
  return { solved: false, tries: runs.length, wrong, minutes: null, at: null };
}

/**
 * The standings: marks (coding marks for each solve + paper marks), then the
 * smaller penalty (minutes to each solve + penaltyMins per wrong try before it).
 */
function standings(contest, items, entries, runs, responses) {
  const pen = (contest.settings || SETTINGS_DEFAULT).penaltyMins;
  const byUser = new Map(entries.map((e) => [e.username, { entry: e, runs: new Map(), resp: new Map() }]));
  for (const r of runs) byUser.get(r.username)?.runs.set(r.item_idx, [...(byUser.get(r.username).runs.get(r.item_idx) || []), r]);
  for (const r of responses) byUser.get(r.username)?.resp.set(r.item_idx, r);
  const rows = [];
  for (const [username, u] of byUser) {
    const w = personWindow(contest, u.entry);
    const cells = [];
    let marks = 0;
    let penalty = 0;
    let solved = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    for (const it of items) {
      if (CODING.has(it.kind)) {
        const res = codingResult((u.runs.get(it.idx) || []).sort((a, b) => a.at - b.at), w.from ?? startMs(contest));
        if (res.solved) {
          marks += it.marks;
          penalty += res.minutes + pen * res.wrong;
          solved++;
        }
        cells.push({ idx: it.idx, kind: it.kind, marks: res.solved ? it.marks : 0, solved: res.solved, tries: res.tries, minutes: res.minutes });
      } else {
        const r = u.resp.get(it.idx);
        const m = r ? Number(r.marks) : 0;
        marks += m;
        if (!r || !r.attempted) skipped++;
        else if (r.correct) correct++;
        else wrong++;
        cells.push({ idx: it.idx, kind: it.kind, marks: round2(m), attempted: !!r?.attempted, correct: !!r?.correct, timeMs: r ? Number(r.time_ms) : 0 });
      }
    }
    const used = w.from ? Math.max(0, Math.min(Date.now(), w.to) - w.from) : 0;
    rows.push({
      username,
      marks: round2(marks),
      penalty,
      solved,
      correct,
      wrong,
      skipped,
      cells,
      startedAt: w.from,
      finishedAt: u.entry.finished_at ? Number(u.entry.finished_at) : w.state === "finished" ? w.to : null,
      timeUsedMs: used,
      paperAt: u.entry.paper_at ? Number(u.entry.paper_at) : null,
      state: w.state,
    });
  }
  rows.sort((a, b) => b.marks - a.marks || a.penalty - b.penalty || a.timeUsedMs - b.timeUsedMs || a.username.localeCompare(b.username));
  let rank = 0;
  rows.forEach((r, i) => {
    if (i === 0 || r.marks !== rows[i - 1].marks || r.penalty !== rows[i - 1].penalty) rank = i + 1;
    r.rank = rank;
  });
  return rows;
}

/**
 * The host's analysis: per question (how many tried, got it right, average
 * marks and time, the options people picked, and how well it separates the
 * top quarter from the bottom quarter), and answers over time.
 */
function analysis(contest, items, rows, responses, runs) {
  const n = rows.length;
  const k = Math.max(1, Math.round(n * 0.27));
  const top = new Set(rows.slice(0, k).map((r) => r.username));
  const bottom = new Set(rows.slice(-k).map((r) => r.username));
  const perItem = items.map((it) => {
    const cells = rows.map((r) => ({ u: r.username, c: r.cells.find((c) => c.idx === it.idx) })).filter((x) => x.c);
    const coding = CODING.has(it.kind);
    const tried = cells.filter((x) => (coding ? x.c.tries > 0 : x.c.attempted));
    const right = cells.filter((x) => (coding ? x.c.solved : x.c.correct));
    const rate = (set) => {
      const xs = cells.filter((x) => set.has(x.u));
      return xs.length ? xs.filter((x) => (coding ? x.c.solved : x.c.correct)).length / xs.length : 0;
    };
    const picks = {};
    if (!coding) {
      for (const r of responses) {
        if (r.item_idx !== it.idx || !r.attempted) continue;
        const v = parse(r.response, null);
        for (const p of Array.isArray(v) ? v : [v]) picks[String(p)] = (picks[String(p)] || 0) + 1;
      }
    }
    const times = coding ? right.map((x) => x.c.minutes * 60000) : tried.map((x) => x.c.timeMs).filter((t) => t > 0);
    return {
      idx: it.idx,
      kind: it.kind,
      marks: it.marks,
      people: n,
      tried: tried.length,
      right: right.length,
      averageMarks: n ? round2(cells.reduce((a, x) => a + x.c.marks, 0) / n) : 0,
      averageTimeMs: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
      discrimination: n >= 4 ? round2(rate(top) - rate(bottom)) : null,
      picks,
    };
  });
  // Answers and runs over the contest, in up to 12 equal bins.
  const from = startMs(contest);
  const to = Math.max(from + 60000, Math.min(Date.now(), closesAt(contest)));
  const binMs = Math.max(60000, Math.ceil((to - from) / 12 / 60000) * 60000);
  const bins = [];
  for (let t = from; t < to; t += binMs) bins.push({ from: t, right: 0, wrong: 0 });
  const put = (at, ok) => {
    const b = bins[Math.floor((at - from) / binMs)];
    if (b) b[ok ? "right" : "wrong"]++;
  };
  for (const r of runs) if (r.verdict !== "CE") put(r.at, r.verdict === "AC");
  const paperAt = new Map(rows.map((r) => [r.username, r]));
  for (const r of responses) {
    if (!r.attempted) continue;
    const row = paperAt.get(r.username);
    if (row?.paperAt) put(row.paperAt, !!r.correct);
  }
  const finished = rows.filter((r) => r.finishedAt && r.startedAt).map((r) => r.finishedAt - r.startedAt);
  return { perItem, overTime: { binMs, bins }, finishTimesMs: finished };
}

/* ── CSV ── */

/** One CSV cell: quoted, and safe to open in a spreadsheet (no formulas). */
function csvCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(items, rows, names, titles) {
  const head = ["Rank", "Username", "Name", "Marks", "Max marks", ...items.map((it, i) => `Q${i + 1} ${titles[i] || ""}`.trim()), "Correct", "Wrong", "Skipped", "Coding solved", "Penalty (min)", "Started", "Finished", "Time used (min)"];
  const max = round2(items.reduce((a, it) => a + it.marks, 0));
  const iso = (t) => (t ? new Date(t).toISOString() : "");
  const lines = [head.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.rank,
        r.username,
        names[r.username] || "",
        r.marks,
        max,
        ...items.map((it) => r.cells.find((c) => c.idx === it.idx)?.marks ?? 0),
        r.correct,
        r.wrong,
        r.skipped,
        r.solved,
        r.penalty,
        iso(r.startedAt),
        iso(r.finishedAt),
        r.timeUsedMs ? Math.round(r.timeUsedMs / 60000) : "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/* ── database access ── */

function shape(row) {
  if (!row) return null;
  const { password_hash, ...c } = row;
  c.settings = normalizeSettings(parse(row.settings, {}), SETTINGS_DEFAULT);
  c.status = row.status || "published";
  c.hasPassword = !!password_hash;
  return c;
}

async function load(id) {
  const row = await get("SELECT * FROM custom_contests WHERE id=?", [Number(id) || 0]);
  return row ? { contest: shape(row), passwordHash: row.password_hash } : null;
}

async function byCode(code) {
  const row = await get("SELECT * FROM custom_contests WHERE contest_code=?", [String(code || "").toUpperCase()]);
  return row ? { contest: shape(row), passwordHash: row.password_hash } : null;
}

async function itemsOf(contestId) {
  const rows = await all("SELECT idx, kind, ref, marks FROM contest_items WHERE contest_id=? ORDER BY idx", [contestId]);
  return rows.map((r) => ({ idx: Number(r.idx), kind: r.kind, ref: String(r.ref), marks: Number(r.marks) }));
}

async function questionsOf(contestId) {
  const rows = await all("SELECT id, data FROM contest_questions WHERE contest_id=? ORDER BY id", [contestId]);
  return new Map(rows.map((r) => [String(r.id), cleanQuestion(parse(r.data, {}))]));
}

async function entry(contestId, username) {
  return username ? get("SELECT * FROM contest_participants WHERE contest_id=? AND username=?", [contestId, username]) : null;
}

/** Old contests kept their Workshop problems in a JSON list: turn them into items once. */
async function migrateLegacyItems(c) {
  const have = await get("SELECT 1 AS x FROM contest_items WHERE contest_id=? LIMIT 1", [c.id]);
  if (have) return;
  const ids = (parse(c.problems, []) || []).map((p) => (typeof p === "object" && p ? p.id : p)).filter((x) => Number.isFinite(Number(x)));
  for (const [i, id] of ids.slice(0, MAX_ITEMS).entries()) {
    await run("INSERT OR IGNORE INTO contest_items(contest_id, idx, kind, ref, marks) VALUES(?,?,?,?,?)", [c.id, i, "workshop", String(Number(id)), 100]);
  }
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "NX-";
  for (let i = 0; i < 6; i++) code += chars[crypto.randomInt(chars.length)];
  return code;
}

module.exports = {
  MAX_ITEMS,
  MAX_QUESTIONS,
  MAX_DRAFTS,
  MAX_DURATION,
  KINDS,
  CODING,
  PAPER,
  LETTERS,
  SETTINGS_DEFAULT,
  init,
  normalizeSettings,
  phase,
  personWindow,
  closesAt,
  canReview,
  cleanQuestion,
  questionProblems,
  gradeOwn,
  gradeBank,
  asGateQuestion,
  codingResult,
  standings,
  analysis,
  csvCell,
  toCsv,
  shape,
  load,
  byCode,
  itemsOf,
  questionsOf,
  entry,
  migrateLegacyItems,
  genCode,
  parse,
  fail,
  round2,
};
