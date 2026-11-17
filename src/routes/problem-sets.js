// Problem sets (Problems → Sets): lists of problems people work through.
//
//   mine     your own sets, private until you make them public
//   public   sets people shared, ranked by likes
//   series   famous series. The CSES Problem Set is built live from the CSES
//            problems in our catalog (its own sections, in its own order).
//            Staff add others (e.g. a well-known sheet) as a link to the
//            original plus the matching problems we have; we never copy a
//            paid or private list.
//            The built-in library (src/problem-set-library.js) adds many more:
//            NeetCode, LeetCode's free study plans, AtCoder's sets, Euler.
//   company  one set per company, titled with just its name. Built in: the
//            problems from contests the company ran or sponsored (library).
//            Also staff sets that cite a public source
//            (a link is required), and community reports on a problem
//            ("I was asked this at X"), shown with how many people said so.
//            Nothing is invented and no premium/leaked data is used.
//
// Tables: problem_sets, problem_set_items, problem_set_likes, problem_asked.
const express = require("express");
const { all, get, run } = require("../db");
const { getOpenCatalog, byId } = require("../problem-catalog");
const library = require("../problem-set-library");

const KINDS = ["mine", "series", "company"];
const MAX_ITEMS = 300;
const MAX_SETS = 50; // own sets per person
const COMPANY_RE = /^[\p{L}\p{N} .&'()+-]{2,40}$/u;
const MIN_REPORTS = 2; // a company shows a problem once at least two people reported it

let ready = null;
function init() {
  ready ||= (async () => {
    await run(`CREATE TABLE IF NOT EXISTS problem_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL DEFAULT 'mine',
      visibility TEXT NOT NULL DEFAULT 'private',
      company TEXT,
      source_url TEXT,
      likes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_problem_sets_list ON problem_sets(visibility, kind, likes)");
    await run("CREATE INDEX IF NOT EXISTS idx_problem_sets_owner ON problem_sets(owner)");
    await run(`CREATE TABLE IF NOT EXISTS problem_set_items (
      set_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      problem_rowid INTEGER,
      title TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      section TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (set_id, position)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS problem_set_likes (
      set_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (set_id, username)
    )`);
    await run(`CREATE TABLE IF NOT EXISTS problem_asked (
      problem_rowid INTEGER NOT NULL,
      username TEXT NOT NULL,
      company TEXT NOT NULL,
      year INTEGER,
      created_at TEXT NOT NULL,
      PRIMARY KEY (problem_rowid, username, company)
    )`);
    await run("CREATE INDEX IF NOT EXISTS idx_problem_asked_company ON problem_asked(company)");
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

class SetError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new SetError(status, message);
};
const text = (v, max) => String(v ?? "").trim().slice(0, max);
const now = () => new Date().toISOString();
/** A company name as people write it, tidied: "google" → "Google". */
const companyName = (v) => {
  const s = text(v, 40).replace(/\s+/g, " ");
  if (!COMPANY_RE.test(s)) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const httpUrl = (v) => {
  const s = text(v, 400);
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
};

function createProblemSetsRouter({ me, can }) {
  const router = express.Router();
  const h = (fn) => async (req, res) => {
    try {
      await init();
      await fn(req, res);
    } catch (e) {
      res.status(e.status || 500).json({ ok: false, error: e.status ? e.message : "Something went wrong" });
      if (!e.status) console.error("[problem-sets]", e.message);
    }
  };
  const staff = (req) => can(req, "problems.manage");
  const mustLogin = () => me() || fail(401, "Sign in to keep problem sets");

  /** Your status on catalog problems (solved, examples, attempted). */
  async function statuses(ids) {
    const u = me();
    if (!u || !ids.length) return new Map();
    const rows = await all(`SELECT problem_rowid, status FROM progress WHERE username=? AND problem_rowid IN (${ids.map(() => "?").join(",")})`, [u, ...ids]);
    return new Map(rows.map((r) => [r.problem_rowid, r.status]));
  }

  /** A stored set as a card (counts, your progress, liked). */
  async function cards(rows) {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const ph = ids.map(() => "?").join(",");
    const items = await all(`SELECT set_id, problem_rowid FROM problem_set_items WHERE set_id IN (${ph})`, ids);
    const catalog = await getOpenCatalog();
    const st = await statuses([...new Set(items.map((i) => i.problem_rowid).filter(Boolean))]);
    const u = me();
    const liked = u ? new Set((await all(`SELECT set_id FROM problem_set_likes WHERE username=? AND set_id IN (${ph})`, [u, ...ids])).map((r) => r.set_id)) : new Set();
    return rows.map((r) => {
      const mine = items.filter((i) => i.set_id === r.id && (!i.problem_rowid || byId(catalog, i.problem_rowid)));
      return {
        id: String(r.id),
        title: r.title,
        description: r.description,
        kind: r.kind,
        visibility: r.visibility,
        owner: r.owner,
        company: r.company || null,
        sourceUrl: r.source_url || null,
        likes: r.likes,
        liked: liked.has(r.id),
        count: mine.length,
        solved: mine.filter((i) => st.get(i.problem_rowid) === "solved").length,
        updatedAt: r.updated_at,
      };
    });
  }

  /** The CSES Problem Set, live from our catalog: its sections, in its order. */
  async function csesSeries() {
    const catalog = await getOpenCatalog();
    const rows = catalog.rows.filter((r) => r.platform === "cses");
    if (!rows.length) return null;
    return { rows };
  }
  async function csesCard() {
    const s = await csesSeries();
    if (!s) return null;
    const st = await statuses(s.rows.map((r) => r.id));
    return {
      id: "cses",
      title: "CSES Problem Set",
      description: "The CSES Problem Set from cses.fi, section by section, in its own order.",
      kind: "series",
      visibility: "public",
      owner: null,
      company: null,
      sourceUrl: "https://cses.fi/problemset/",
      likes: null,
      liked: false,
      count: s.rows.length,
      solved: s.rows.filter((r) => st.get(r.id) === "solved").length,
      builtIn: true,
    };
  }

  /** Problems you solved (ids), for counting progress on the built-in library. */
  async function solvedSet() {
    const u = me();
    if (!u) return new Set();
    return new Set((await all("SELECT problem_rowid FROM progress WHERE username=? AND status='solved'", [u])).map((r) => r.problem_rowid));
  }
  /** A library set as a card. Company sets open at company:<name>. */
  function libCard(set, kind, catalog, solved) {
    const items = library.resolve(set, catalog);
    return {
      id: kind === "company" ? `company:${set.company}` : set.id,
      title: set.title,
      description: set.description || "",
      kind,
      visibility: "public",
      owner: null,
      company: set.company || null,
      sourceUrl: set.sourceUrl || null,
      likes: null,
      liked: false,
      count: items.length,
      solved: items.filter((i) => i.row && solved.has(i.row.id)).length,
      builtIn: true,
    };
  }
  /** Library items in the shape the set page reads. */
  function libItems(set, catalog, st, from = 0) {
    return library.resolve(set, catalog).map((i, k) =>
      i.row
        ? { position: from + k, section: i.section, note: "", problem: { id: i.row.id, title: i.row.title, platform: i.row.platform, rating: i.row.rating, topics: safeList(i.row.topics) }, status: st.get(i.row.id) || "unsolved" }
        : { position: from + k, section: i.section, note: "", link: i.link },
    );
  }

  /** Companies from community reports: those with problems at least MIN_REPORTS people named. */
  async function companies() {
    const rows = await all(
      `SELECT company, problem_rowid, COUNT(*) AS n FROM problem_asked GROUP BY company, problem_rowid HAVING COUNT(*) >= ?`,
      [MIN_REPORTS],
    );
    const catalog = await getOpenCatalog();
    const by = new Map();
    for (const r of rows) {
      if (!byId(catalog, r.problem_rowid)) continue;
      by.set(r.company, (by.get(r.company) || 0) + 1);
    }
    return [...by].map(([company, count]) => ({ company, count })).sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
  }

  /* ── lists ── */

  router.get("/api/problem-sets", h(async (req, res) => {
    const tab = ["mine", "public", "series", "company"].includes(req.query.tab) ? req.query.tab : "public";
    const q = text(req.query.q, 80).toLowerCase();
    const sort = req.query.sort === "new" ? "updated_at DESC" : "likes DESC, updated_at DESC";
    let rows = [];
    if (tab === "mine") {
      const u = mustLogin();
      rows = await all("SELECT * FROM problem_sets WHERE owner=? ORDER BY updated_at DESC", [u]);
    } else if (tab === "public") {
      rows = await all(`SELECT * FROM problem_sets WHERE visibility='public' AND kind='mine' ORDER BY ${sort} LIMIT 200`);
    } else {
      rows = await all(`SELECT * FROM problem_sets WHERE visibility='public' AND kind=? ORDER BY ${sort} LIMIT 200`, [tab]);
    }
    if (q) rows = rows.filter((r) => `${r.title} ${r.description} ${r.company || ""}`.toLowerCase().includes(q));
    let sets = await cards(rows);
    const matches = (s) => !q || `${s.title} ${s.description} ${s.company || ""}`.toLowerCase().includes(q);
    if (tab === "series" || tab === "company") {
      const catalog = await getOpenCatalog();
      const solved = await solvedSet();
      const lib = tab === "series" ? library.library().series : library.library().companies;
      const built = lib.filter(matches).map((s) => libCard(s, tab, catalog, solved)).filter((c) => c.count > 0);
      // A stored set with a built-in set's title (e.g. an older seed of "Blind 75") would show twice.
      const titles = new Set(lib.map((s) => s.title.toLowerCase()));
      sets = sets.filter((s) => !titles.has(s.title.toLowerCase()));
      const cses = tab === "series" ? await csesCard() : null;
      sets = [...(cses && matches(cses) ? [cses] : []), ...built, ...sets];
    }
    const out = { ok: true, tab, sets };
    if (tab === "company") {
      // Companies people reported that have no built-in set yet (those with one show the reports on it).
      out.reported = (await companies()).filter((c) => !library.findCompany(c.company) && (!q || c.company.toLowerCase().includes(q)));
    }
    res.json(out);
  }));

  /* ── one set ── */

  async function loadSet(id) {
    const row = await get("SELECT * FROM problem_sets WHERE id=?", [Number(id) || 0]);
    const u = me();
    if (!row) fail(404, "That set doesn't exist");
    const owner = !!u && row.owner === u;
    if (row.visibility !== "public" && !owner) fail(404, "That set doesn't exist");
    return { row, owner };
  }

  /** Items with the catalog's details and your status; problems from switched-off sources drop out. */
  async function itemsOf(setId) {
    const items = await all("SELECT * FROM problem_set_items WHERE set_id=? ORDER BY position", [setId]);
    const catalog = await getOpenCatalog();
    const st = await statuses(items.map((i) => i.problem_rowid).filter(Boolean));
    const out = [];
    for (const i of items) {
      if (i.problem_rowid) {
        const p = byId(catalog, i.problem_rowid);
        if (!p) continue;
        out.push({ position: i.position, section: i.section, note: i.note, problem: { id: p.id, title: p.title, platform: p.platform, rating: p.rating, topics: safeList(p.topics) }, status: st.get(p.id) || "unsolved" });
      } else {
        out.push({ position: i.position, section: i.section, note: i.note, link: { title: i.title, url: i.url } });
      }
    }
    return out;
  }
  const safeList = (raw) => {
    try {
      const a = JSON.parse(raw || "[]");
      return Array.isArray(a) ? a : [];
    } catch {
      return [];
    }
  };

  router.get("/api/problem-sets/company/:name", h(async (req, res) => {
    const raw = decodeURIComponent(req.params.name);
    const built = library.findCompany(raw);
    const company = built ? built.company : companyName(raw);
    if (!company) fail(404, "Unknown company");
    const rows = await all(
      `SELECT problem_rowid, COUNT(*) AS n, MAX(year) AS year FROM problem_asked WHERE company=? GROUP BY problem_rowid HAVING COUNT(*) >= ? ORDER BY n DESC`,
      [company, MIN_REPORTS],
    );
    const catalog = await getOpenCatalog();
    const libRows = built ? library.resolve(built, catalog).filter((i) => i.row).map((i) => i.row.id) : [];
    const st = await statuses([...new Set([...rows.map((r) => r.problem_rowid), ...libRows])]);
    const fromLib = built ? libItems(built, catalog, st) : [];
    const reportedSection = built ? "Reported by people here" : "";
    const items = rows
      .map((r, i) => {
        const p = byId(catalog, r.problem_rowid);
        return p && { position: fromLib.length + i, section: reportedSection, note: `Reported by ${r.n} people${r.year ? ` · latest ${r.year}` : ""}`, reports: r.n, problem: { id: p.id, title: p.title, platform: p.platform, rating: p.rating, topics: safeList(p.topics) }, status: st.get(p.id) || "unsolved" };
      })
      .filter(Boolean);
    const all_ = [...fromLib, ...items];
    const reportsNote = `Problems people here reported being asked at ${company} (each by at least ${MIN_REPORTS} people). Reports are from our users, not from ${company}.`;
    res.json({
      ok: true,
      set: {
        id: `company:${company}`,
        title: company,
        description: built ? `${built.description}${items.length ? ` ${reportsNote}` : ""}` : reportsNote,
        kind: "company",
        visibility: "public",
        owner: null,
        company,
        sourceUrl: built?.sourceUrl || null,
        likes: null,
        liked: false,
        builtIn: true,
        count: all_.length,
        solved: all_.filter((i) => i.status === "solved").length,
      },
      items: all_,
      canEdit: false,
    });
  }));

  router.get("/api/problem-sets/:id", h(async (req, res) => {
    if (req.params.id === "cses") {
      const s = await csesSeries();
      if (!s) fail(404, "The CSES problems aren't in the catalog right now");
      const st = await statuses(s.rows.map((r) => r.id));
      const items = s.rows.map((p, i) => ({ position: i, section: p.category || "", note: "", problem: { id: p.id, title: p.title, platform: p.platform, rating: p.rating, topics: safeList(p.topics) }, status: st.get(p.id) || "unsolved" }));
      return res.json({ ok: true, set: await csesCard(), items, canEdit: false });
    }
    const series = library.findSeries(req.params.id);
    if (series) {
      const catalog = await getOpenCatalog();
      const ids = library.resolve(series, catalog).filter((i) => i.row).map((i) => i.row.id);
      const st = await statuses(ids);
      const solved = new Set(ids.filter((id) => st.get(id) === "solved"));
      return res.json({ ok: true, set: libCard(series, "series", catalog, solved), items: libItems(series, catalog, st), canEdit: false });
    }
    const { row, owner } = await loadSet(req.params.id);
    const [card] = await cards([row]);
    res.json({ ok: true, set: card, items: await itemsOf(row.id), canEdit: owner || (staff(req) && row.kind !== "mine") });
  }));

  /* ── make and change ── */

  router.post("/api/problem-sets", h(async (req, res) => {
    const u = mustLogin();
    const b = req.body || {};
    const kind = KINDS.includes(b.kind) ? b.kind : "mine";
    if (kind !== "mine" && !staff(req)) fail(403, "Only staff can add famous series and company sets");
    const title = text(b.title, 100);
    if (title.length < 2) fail(400, "Give the set a name");
    const n = await get("SELECT COUNT(*) AS n FROM problem_sets WHERE owner=? AND kind='mine'", [u]);
    if (kind === "mine" && Number(n?.n) >= MAX_SETS) fail(400, `You can keep up to ${MAX_SETS} sets`);
    let company = null;
    let source = b.sourceUrl ? httpUrl(b.sourceUrl) : null;
    if (b.sourceUrl && !source) fail(400, "The source must be a web link (https://…)");
    if (kind === "company") {
      company = companyName(b.company);
      if (!company) fail(400, "Name the company");
      if (!source) fail(400, "A company set needs a public source link, so anyone can check where the list comes from");
    }
    if (kind === "series" && !source) fail(400, "A famous series needs a link to the original");
    const visibility = kind === "mine" ? (b.visibility === "public" ? "public" : "private") : "public";
    const t = now();
    const r = await run(
      "INSERT INTO problem_sets(owner, title, description, kind, visibility, company, source_url, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
      [u, title, text(b.description, 500), kind, visibility, company, source, t, t],
    );
    const ids = Array.isArray(b.problemIds) ? b.problemIds : [];
    if (ids.length) await addProblems(r.lastID, ids, b.section);
    res.json({ ok: true, id: String(r.lastID) });
  }));

  async function editable(req, id) {
    const u = mustLogin();
    const row = await get("SELECT * FROM problem_sets WHERE id=?", [Number(id) || 0]);
    if (!row) fail(404, "That set doesn't exist");
    if (row.owner !== u && !(row.kind !== "mine" && staff(req))) fail(row.visibility === "public" ? 403 : 404, row.visibility === "public" ? "Only its owner can change this set" : "That set doesn't exist");
    return row;
  }

  router.put("/api/problem-sets/:id", h(async (req, res) => {
    const row = await editable(req, req.params.id);
    const b = req.body || {};
    const title = b.title != null ? text(b.title, 100) : row.title;
    if (title.length < 2) fail(400, "Give the set a name");
    const visibility = row.kind === "mine" && (b.visibility === "public" || b.visibility === "private") ? b.visibility : row.visibility;
    const description = b.description != null ? text(b.description, 500) : row.description;
    await run("UPDATE problem_sets SET title=?, description=?, visibility=?, updated_at=? WHERE id=?", [title, description, visibility, now(), row.id]);
    res.json({ ok: true });
  }));

  router.delete("/api/problem-sets/:id", h(async (req, res) => {
    const row = await editable(req, req.params.id);
    for (const t of ["problem_set_items", "problem_set_likes"]) await run(`DELETE FROM ${t} WHERE set_id=?`, [row.id]);
    await run("DELETE FROM problem_sets WHERE id=?", [row.id]);
    res.json({ ok: true });
  }));

  async function addProblems(setId, ids, section) {
    const catalog = await getOpenCatalog();
    const have = new Set((await all("SELECT problem_rowid FROM problem_set_items WHERE set_id=?", [setId])).map((r) => r.problem_rowid));
    const last = await get("SELECT MAX(position) AS p FROM problem_set_items WHERE set_id=?", [setId]);
    let pos = last?.p == null ? 0 : Number(last.p) + 1;
    let added = 0;
    for (const raw of ids.slice(0, MAX_ITEMS)) {
      const id = Number(raw) || 0;
      if (!byId(catalog, id) || have.has(id)) continue;
      if (pos >= MAX_ITEMS) fail(400, `A set can hold up to ${MAX_ITEMS} problems`);
      await run("INSERT INTO problem_set_items(set_id, position, problem_rowid, section) VALUES(?,?,?,?)", [setId, pos++, id, text(section, 60)]);
      have.add(id);
      added++;
    }
    await run("UPDATE problem_sets SET updated_at=? WHERE id=?", [now(), setId]);
    return added;
  }

  router.post("/api/problem-sets/:id/items", h(async (req, res) => {
    const row = await editable(req, req.params.id);
    const b = req.body || {};
    if (b.url) {
      // A link to a problem we don't have (series only): the original, never a copy.
      if (row.kind !== "series") fail(400, "Only a famous series can list problems from elsewhere");
      const url = httpUrl(b.url);
      const title = text(b.title, 120);
      if (!url || !title) fail(400, "Give the problem's name and a link to it");
      const last = await get("SELECT MAX(position) AS p FROM problem_set_items WHERE set_id=?", [row.id]);
      await run("INSERT INTO problem_set_items(set_id, position, title, url, section, note) VALUES(?,?,?,?,?,?)", [row.id, last?.p == null ? 0 : Number(last.p) + 1, title, url, text(b.section, 60), text(b.note, 200)]);
      return res.json({ ok: true, added: 1 });
    }
    const ids = Array.isArray(b.problemIds) ? b.problemIds : b.problemId != null ? [b.problemId] : [];
    if (!ids.length) fail(400, "Choose a problem to add");
    const added = await addProblems(row.id, ids, b.section);
    res.json({ ok: true, added, ...(added ? {} : { reason: "It is already in this set" }) });
  }));

  router.delete("/api/problem-sets/:id/items/:position", h(async (req, res) => {
    const row = await editable(req, req.params.id);
    await run("DELETE FROM problem_set_items WHERE set_id=? AND position=?", [row.id, Number(req.params.position)]);
    // Close the gap so positions stay 0..n-1.
    const rest = await all("SELECT position FROM problem_set_items WHERE set_id=? ORDER BY position", [row.id]);
    for (let i = 0; i < rest.length; i++) if (rest[i].position !== i) await run("UPDATE problem_set_items SET position=? WHERE set_id=? AND position=?", [i, row.id, rest[i].position]);
    await run("UPDATE problem_sets SET updated_at=? WHERE id=?", [now(), row.id]);
    res.json({ ok: true });
  }));

  /** Reorder: the full list of current positions in their new order. */
  router.put("/api/problem-sets/:id/order", h(async (req, res) => {
    const row = await editable(req, req.params.id);
    const order = Array.isArray(req.body?.order) ? req.body.order.map(Number) : [];
    const cur = (await all("SELECT position FROM problem_set_items WHERE set_id=? ORDER BY position", [row.id])).map((r) => r.position);
    if (order.length !== cur.length || [...order].sort((a, b) => a - b).some((v, i) => v !== cur[i])) fail(400, "Send every position once");
    // Two passes through negative numbers, so no position clashes mid-way.
    for (let i = 0; i < order.length; i++) await run("UPDATE problem_set_items SET position=? WHERE set_id=? AND position=?", [-1 - i, row.id, order[i]]);
    for (let i = 0; i < order.length; i++) await run("UPDATE problem_set_items SET position=? WHERE set_id=? AND position=?", [i, row.id, -1 - i]);
    res.json({ ok: true });
  }));

  /* ── likes ── */

  async function likeable(id) {
    const u = mustLogin();
    const row = await get("SELECT id, owner, visibility FROM problem_sets WHERE id=?", [Number(id) || 0]);
    if (!row || row.visibility !== "public") fail(404, "That set doesn't exist");
    return { u, row };
  }
  router.put("/api/problem-sets/:id/like", h(async (req, res) => {
    const { u, row } = await likeable(req.params.id);
    const r = await run("INSERT OR IGNORE INTO problem_set_likes(set_id, username, created_at) VALUES(?,?,?)", [row.id, u, now()]);
    if (r.changes) await run("UPDATE problem_sets SET likes = likes + 1 WHERE id=?", [row.id]);
    res.json({ ok: true, liked: true, likes: (await get("SELECT likes FROM problem_sets WHERE id=?", [row.id])).likes });
  }));
  router.delete("/api/problem-sets/:id/like", h(async (req, res) => {
    const { u, row } = await likeable(req.params.id);
    const r = await run("DELETE FROM problem_set_likes WHERE set_id=? AND username=?", [row.id, u]);
    if (r.changes) await run("UPDATE problem_sets SET likes = MAX(0, likes - 1) WHERE id=?", [row.id]);
    res.json({ ok: true, liked: false, likes: (await get("SELECT likes FROM problem_sets WHERE id=?", [row.id])).likes });
  }));

  /* ── "asked at": community reports on one problem ── */

  router.get("/api/problems/:id/asked", h(async (req, res) => {
    const pid = Number(req.params.id) || 0;
    const rows = await all("SELECT company, COUNT(*) AS n, MAX(year) AS year FROM problem_asked WHERE problem_rowid=? GROUP BY company ORDER BY n DESC", [pid]);
    const u = me();
    const mine = u ? (await all("SELECT company, year FROM problem_asked WHERE problem_rowid=? AND username=?", [pid, u])) : [];
    // A company named by only one person is counted, never named: one report is not yet a fact.
    const shown = rows.filter((r) => r.n >= MIN_REPORTS);
    res.json({ ok: true, companies: shown.map((r) => ({ company: r.company, reports: r.n, year: r.year || null, shown: true })), waiting: rows.length - shown.length, mine, minReports: MIN_REPORTS });
  }));

  router.post("/api/problems/:id/asked", h(async (req, res) => {
    const u = mustLogin();
    const pid = Number(req.params.id) || 0;
    const p = await get("SELECT id, category FROM problems WHERE id=?", [pid]);
    if (!p || p.category === "__hidden") fail(404, "That problem isn't available");
    const company = companyName(req.body?.company);
    if (!company) fail(400, "Name the company (letters, numbers and simple punctuation)");
    const year = Number(req.body?.year) || null;
    const thisYear = new Date().getUTCFullYear();
    if (year != null && (year < 2000 || year > thisYear)) fail(400, `Give a year from 2000 to ${thisYear}`);
    const count = await get("SELECT COUNT(*) AS n FROM problem_asked WHERE username=? AND created_at >= ?", [u, new Date(Date.now() - 86400000).toISOString()]);
    if (Number(count?.n) >= 30) fail(429, "That's a lot of reports today. Try again tomorrow.");
    // Reporting again updates your report; a year you gave before is kept if you leave it out.
    await run(
      `INSERT INTO problem_asked(problem_rowid, username, company, year, created_at) VALUES(?,?,?,?,?)
       ON CONFLICT(problem_rowid, username, company) DO UPDATE SET year = COALESCE(excluded.year, problem_asked.year), created_at = excluded.created_at`,
      [pid, u, company, year, now()],
    );
    res.json({ ok: true, company });
  }));

  router.delete("/api/problems/:id/asked/:company", h(async (req, res) => {
    const u = mustLogin();
    await run("DELETE FROM problem_asked WHERE problem_rowid=? AND username=? AND company=?", [Number(req.params.id) || 0, u, companyName(decodeURIComponent(req.params.company)) || ""]);
    res.json({ ok: true });
  }));

  /** Your own sets, for "Add to a set" (with whether this problem is in each). */
  router.get("/api/problem-sets-for/:problemId", h(async (req, res) => {
    const u = mustLogin();
    const pid = Number(req.params.problemId) || 0;
    const rows = await all(
      `SELECT s.id, s.title, s.visibility, EXISTS(SELECT 1 FROM problem_set_items i WHERE i.set_id = s.id AND i.problem_rowid = ?) AS has
       FROM problem_sets s WHERE s.owner=? AND s.kind='mine' ORDER BY s.updated_at DESC`,
      [pid, u],
    );
    res.json({ ok: true, sets: rows.map((r) => ({ id: String(r.id), title: r.title, visibility: r.visibility, has: !!r.has })) });
  }));

  return router;
}

module.exports = { createProblemSetsRouter, init, MIN_REPORTS };
