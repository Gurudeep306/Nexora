// The free public code runners (Wandbox, Compiler Explorer, the Kotlin
// Playground, Paiza.io): which ones are on, and which compiler version each
// one uses for each language. Admin → Code runners shows and changes this.
//
// Self-updating: every few hours the server reads each service's own list of
// compilers, finds the newest stable version in the same family as the one in
// use (gcc stays gcc, CPython stays CPython), runs the language's self-test
// program on it (src/judge-selftest.js) and only then switches to it. A
// version an admin pinned is never changed. Paiza.io publishes no list, so it
// keeps its own versions.
//
// Stored as one JSON row ('judge_compilers') in site_settings:
//   off:     ['paiza', …]                       services turned off
//   pins:    { 'godbolt:cpp': 'g142', … }       versions kept by an admin
//   picked:  { 'godbolt:cpp': { id, version, at } }  chosen by the updater
//   catalog: { wandbox: { at, ok, error, count }, … }
//   sync:    { at, by, running, results: [{ engine, lang, from, to, ok, detail }] }
const https = require("https");
const { all, run, onWrite } = require("./db");
const remote = require("./remote-exec");
const { PROGRAMS } = require("./judge-selftest");

const KEY = "judge_compilers";
const SELFTEST_INPUT = "3\n4 5 6\n";
const SELFTEST_EXPECTED = "15";
const SYNC_EVERY_MS = 6 * 60 * 60 * 1000;

/** The public services, with what each one's terms say about use like ours. */
const SERVICES = [
  {
    id: "wandbox",
    name: "Wandbox",
    site: "https://wandbox.org",
    note: "Free public API, no key. Its compiler list is read from /api/list.json.",
    lists: true,
  },
  {
    id: "godbolt",
    name: "Compiler Explorer",
    site: "https://godbolt.org",
    note: "Free public API, no key, with gentle use asked for (we send at most 6 at a time). Its list is read from /api/compilers.",
    lists: true,
  },
  {
    id: "kotlin",
    name: "Kotlin Playground",
    site: "https://play.kotlinlang.org",
    note: "JetBrains' free playground API, Kotlin only. Its versions are read from /versions.",
    lists: true,
  },
  {
    id: "paiza",
    name: "Paiza.io",
    site: "https://paiza.io",
    note: "Free public API with the documented \"guest\" key. It publishes no compiler list, so its versions are its own.",
    lists: false,
  },
];
const SERVICE_IDS = new Set(SERVICES.map((s) => s.id));

/* ── settings, cached (the judge reads them on every run) ── */

let state = blank();
let loadedAt = 0;
let generation = 0;
onWrite(/site_settings/i, () => {
  generation++;
  loadedAt = 0;
});

function blank() {
  return { off: [], pins: {}, picked: {}, catalog: {}, sync: null };
}
function normalize(raw) {
  const s = blank();
  if (!raw || typeof raw !== "object") return s;
  if (Array.isArray(raw.off)) s.off = raw.off.filter((x) => SERVICE_IDS.has(x));
  for (const k of ["pins", "picked", "catalog"]) if (raw[k] && typeof raw[k] === "object") s[k] = raw[k];
  if (raw.sync && typeof raw.sync === "object") s.sync = raw.sync;
  return s;
}

async function load(force = false) {
  if (!force && loadedAt && Date.now() - loadedAt < 60_000) return state;
  const gen = generation;
  const rows = await all("SELECT value FROM site_settings WHERE key = ?", [KEY]).catch(() => []);
  let next = blank();
  try {
    if (rows[0]) next = normalize(JSON.parse(rows[0].value));
  } catch {
    /* corrupt: behave as if nothing was chosen */
  }
  if (gen === generation) {
    state = next;
    loadedAt = Date.now();
  }
  return next;
}

async function save(next, by = null) {
  const value = normalize(next);
  await run(
    `INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [KEY, JSON.stringify(value), by, Date.now()],
  );
  state = value;
  loadedAt = Date.now();
  return state;
}

/** What the judge asks on every run (synchronous: the cached settings). */
const key = (engine, lang) => `${engine}:${lang}`;
function chosen(engine, lang) {
  const k = key(engine, lang);
  return state.pins[k] || state.picked[k]?.id || null;
}
remote.useCompilerChoices({ off: (engine) => state.off.includes(engine), pick: chosen });

/* ── reading each service's list ── */

/** Compare version strings: 1.10 > 1.9, 22+36 > 22. */
function compareVersions(a, b) {
  const x = String(a).split(/[^0-9]+/).filter(Boolean).map(Number);
  const y = String(b).split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Languages whose big releases break existing programs: the updater only moves
 * within the same major version (Zig: the same 0.x). A bigger jump waits for
 * an admin, who sees it as "newer version available".
 */
const CAREFUL = { scala: 1, ruby: 1, zig: 2, nim: 1, julia: 1, crystal: 1, php: 1, perl: 1, python: 1, d: 1, haskell: 2 };
function sameSeries(lang, a, b) {
  const n = CAREFUL[lang];
  if (!n || !a || !b) return true;
  const parts = (v) => String(v).split(/[^0-9]+/).filter(Boolean).slice(0, n).join(".");
  return parts(a) === parts(b);
}

const UNSTABLE = /head|trunk|nightly|snapshot|beta|alpha|preview|\brc\b|-rc|dev|assert|experimental/i;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The family of a compiler name: the same name with its version left open.
 * 'gcc-13.2.0-c' → /^gcc-(\d+(?:\.\d+)*)-c$/, 'g142' → /^g(\d+)$/,
 * 'julia_1_11_2' → /^julia_(\d+)_(\d+)_(\d+)$/.
 */
function family(name) {
  const m = /\d+(?:[.+]\d+)*/.exec(name);
  if (!m) return null;
  const rest = name.slice(m.index + m[0].length);
  const restPattern = esc(rest).replace(/\d+/g, "(\\d+)");
  return new RegExp(`^${esc(name.slice(0, m.index))}(\\d+(?:[.+]\\d+)*)${restPattern}$`);
}

/** The version of a compiler, for ordering: its semver, else the numbers in its name. */
function versionOf(c) {
  if (c.semver && /\d/.test(c.semver)) return c.semver;
  const fromName = /\d+(?:\.\d+)+/.exec(c.name || "");
  if (fromName) return fromName[0];
  return (String(c.id).match(/\d+/g) || []).join(".");
}

/** A plain GET of a service's list (no body: some services refuse a GET that has one). */
function getJson(hostname, path, timeout = 30_000) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "GET", timeout, headers: { Accept: "application/json", "User-Agent": "Nexora-Judge/2" } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        if ((res.statusCode || 0) >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch {
          reject(new Error("The list could not be read"));
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** Newest stable compiler per language, in the family of the one in use. Returns { lang: { id, version } }. */
async function newestOn(engine) {
  const out = {};
  if (engine === "wandbox") {
    const list = await getJson("wandbox.org", "/api/list.json");
    for (const [lang, cfg] of Object.entries(remote.WANDBOX_MAP)) {
      const current = remote.compilerFor("wandbox", lang);
      const fam = family(cfg.compiler);
      if (!fam || !current) continue;
      const best = list
        .filter((c) => fam.test(c.name) && !UNSTABLE.test(c.name))
        .sort((a, b) => compareVersions(b.version || b.name, a.version || a.name))[0];
      const now = list.find((c) => c.name === current);
      if (best) out[lang] = { id: best.name, version: best.version || versionOf({ name: best.name }), currentVersion: now ? now.version || versionOf({ name: now.name }) : null };
    }
    return { out, count: list.length };
  }
  if (engine === "godbolt") {
    const list = await getJson("godbolt.org", "/api/compilers?fields=id,name,lang,semver,supportsExecute");
    for (const [lang, cfg] of Object.entries(remote.GODBOLT_MAP)) {
      const fam = family(cfg.id);
      if (!fam) continue;
      const current = remote.compilerFor("godbolt", lang);
      const now = list.find((c) => c.id === current);
      const best = list
        .filter((c) => c.lang === cfg.lang && c.supportsExecute && fam.test(c.id) && !UNSTABLE.test(`${c.name} ${c.id}`))
        .sort((a, b) => compareVersions(versionOf(b), versionOf(a)))[0];
      if (best) out[lang] = { id: best.id, version: versionOf(best), name: best.name, currentVersion: now ? versionOf(now) : null };
    }
    return { out, count: list.length };
  }
  if (engine === "kotlin") {
    const list = await getJson("api.kotlinlang.org", "/versions");
    const best = list.find((v) => v.latestStable) || list.filter((v) => !UNSTABLE.test(v.version)).sort((a, b) => compareVersions(b.version, a.version))[0];
    if (best) out.kotlin = { id: best.version, version: best.version, currentVersion: remote.compilerFor("kotlin", "kotlin") };
    return { out, count: list.length };
  }
  return { out, count: 0 };
}

/** The built-in version for a service and language (shown next to the one in use). */
function builtIn(engine, lang) {
  if (engine === "wandbox") return remote.WANDBOX_MAP[lang]?.compiler ?? null;
  if (engine === "godbolt") return remote.GODBOLT_MAP[lang]?.id ?? null;
  if (engine === "kotlin") return lang === "kotlin" ? remote.KOTLIN_VERSION : null;
  return null;
}

/** Does a compiler pass the language's self-test? */
async function selfTest(engine, lang, compiler, runOn = remote.runOn) {
  const code = PROGRAMS[lang];
  if (!code) return { ok: false, detail: "No self-test program for this language" };
  const r = await runOn(code, SELFTEST_INPUT, lang, engine, compiler);
  const out = String(r.stdout || "").trim();
  if (out === SELFTEST_EXPECTED) return { ok: true, detail: `${r.timeMs || 0} ms` };
  const why = r.verdict ? `${r.verdict}: ${String(r.stderr || "").split("\n")[0].slice(0, 160)}` : `printed ${JSON.stringify(out.slice(0, 40))}`;
  return { ok: false, detail: why };
}

/**
 * Look for newer compilers on every service that lists them, test each one,
 * and use the ones that pass. Pinned versions and turned-off services are
 * left alone. `deps` replaces the network in tests.
 */
let running = null;
async function sync({ by = "schedule", deps = {} } = {}) {
  if (running) return running;
  const find = deps.newestOn || newestOn;
  const test = deps.selfTest || selfTest;
  running = (async () => {
    const s = await load(true);
    await save({ ...s, sync: { ...(s.sync || {}), running: true, startedAt: Date.now(), by } }, by);
    const results = [];
    const catalog = { ...s.catalog };
    const picked = { ...s.picked };
    for (const svc of SERVICES.filter((x) => x.lists && !s.off.includes(x.id))) {
      let found;
      try {
        found = await find(svc.id);
        catalog[svc.id] = { at: Date.now(), ok: true, error: null, count: found.count };
      } catch (e) {
        catalog[svc.id] = { at: Date.now(), ok: false, error: String(e.message || e).slice(0, 200), count: 0 };
        continue;
      }
      for (const [lang, best] of Object.entries(found.out)) {
        const k = key(svc.id, lang);
        if (s.pins[k]) continue;
        const current = remote.compilerFor(svc.id, lang);
        // The version in use, as the service's own list names it (an id like
        // g142 does not spell its version); unknown means it was withdrawn.
        const currentVersion = best.currentVersion || picked[k]?.version || null;
        if (!best.id || best.id === current) continue;
        if (currentVersion && compareVersions(best.version, currentVersion) <= 0) continue;
        if (!sameSeries(lang, best.version, currentVersion)) {
          results.push({ engine: svc.id, lang, from: current, to: best.id, ok: false, held: true, detail: `A big version change (${currentVersion} → ${best.version}): check by hand, then keep it` });
          continue;
        }
        const t = await test(svc.id, lang, best.id);
        results.push({ engine: svc.id, lang, from: current, to: best.id, ok: t.ok, detail: t.detail });
        if (t.ok) picked[k] = { id: best.id, version: best.version, at: Date.now() };
      }
    }
    const latest = await load(true);
    return save({ ...latest, catalog, picked, sync: { at: Date.now(), by, running: false, results } }, by);
  })();
  try {
    return await running;
  } finally {
    running = null;
  }
}

function isSyncing() {
  return !!running;
}

/** Start the schedule (the first check a few minutes after start-up). */
let timer = null;
function startSchedule() {
  if (timer || process.env.NODE_ENV === "test" || process.env.COMPILER_SYNC === "off") return;
  // Pick up changes made on another server process.
  setInterval(() => load(true).catch(() => {}), 60_000).unref?.();
  const tick = () => sync().catch(() => {});
  timer = setTimeout(function again() {
    tick();
    timer = setTimeout(again, SYNC_EVERY_MS);
    timer.unref?.();
  }, 3 * 60 * 1000);
  timer.unref?.();
}

/* ── admin changes ── */

async function setService(id, on, by) {
  if (!SERVICE_IDS.has(id)) throw new Error("No such service");
  const s = await load(true);
  const off = new Set(s.off);
  if (on) off.delete(id);
  else off.add(id);
  return save({ ...s, off: [...off] }, by);
}

/** Keep a version (pin), or let the updater choose again (id null). */
async function setPin(engine, lang, id, by) {
  if (!SERVICE_IDS.has(engine)) throw new Error("No such service");
  const s = await load(true);
  const pins = { ...s.pins };
  if (id) pins[key(engine, lang)] = String(id).slice(0, 80);
  else delete pins[key(engine, lang)];
  return save({ ...s, pins }, by);
}

/** Go back to the built-in version (forget what the updater picked, and any pin). */
async function reset(engine, lang, by) {
  const s = await load(true);
  const pins = { ...s.pins };
  const picked = { ...s.picked };
  delete pins[key(engine, lang)];
  delete picked[key(engine, lang)];
  return save({ ...s, pins, picked }, by);
}

/** Everything the admin page shows. */
async function view() {
  const s = await load();
  const health = remote.sandboxHealth();
  const langs = new Set([...Object.keys(remote.WANDBOX_MAP), ...Object.keys(remote.GODBOLT_MAP), ...Object.keys(remote.PAIZA_MAP), "kotlin"]);
  const languages = [...langs].sort().map((lang) => ({
    lang,
    chain: remote.engineChain(lang),
    compilers: SERVICES.filter((x) => x.id !== "paiza" || remote.PAIZA_MAP[lang])
      .map((x) => {
        const builtin = builtIn(x.id, lang);
        if (x.id === "paiza") return remote.PAIZA_MAP[lang] ? { engine: "paiza", current: remote.PAIZA_MAP[lang], builtin: null, pinned: false, picked: null } : null;
        if (!builtin) return null;
        const k = key(x.id, lang);
        return { engine: x.id, current: remote.compilerFor(x.id, lang), builtin, pinned: !!s.pins[k], picked: s.picked[k] || null };
      })
      .filter(Boolean),
  }));
  return {
    services: SERVICES.map((x) => ({
      ...x,
      on: !s.off.includes(x.id),
      restingFor: health[x.id]?.restingFor || 0,
      catalog: s.catalog[x.id] || null,
    })),
    languages,
    sync: { ...(s.sync || {}), running: isSyncing() || false },
    everyHours: SYNC_EVERY_MS / 3_600_000,
  };
}

module.exports = {
  SERVICES,
  load,
  view,
  sync,
  isSyncing,
  startSchedule,
  setService,
  setPin,
  reset,
  family,
  sameSeries,
  compareVersions,
  versionOf,
  newestOn,
  selfTest,
  _state: () => state,
};
