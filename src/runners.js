// Our own code runners, added in Admin → Code runners: Piston servers, and
// Judge0 (self-hosted, or a Judge0 Cloud / RapidAPI key; see src/judge0.js).
//
// Stored as one JSON row ('judge_runners') in site_settings:
//   runners: [{ id, kind, name, host, url, token (sealed), last4, enabled, test }]
//   kind:    'piston' (default) | 'judge0'
//   test:    { ok, at, ms, error, languages[], runtimes, map? }  (map: Judge0's language ids)
//
// Enabled runners go first in every language's chain, after any set with
// PISTON_URL in the environment, and each one backs up the others; the free
// public sandboxes stay behind them all (src/remote-exec.js). A runner whose
// last test listed its languages only gets the languages it really has.
// Passwords are sealed with AES-256-GCM (src/hive/vault.js) and never leave
// the server: the API returns only the last four characters.
const crypto = require("crypto");
const { all, run, onWrite } = require("./db");
const { seal, open, last4 } = require("./hive/vault");
const judge0 = require("./judge0");

const KINDS = ["piston", "judge0"];

/**
 * Code-running services that want a key, and whether their terms allow a
 * site like ours to send students' code to them (read 2026-11-16; never
 * guessed). Shown on Admin → Code runners.
 */
const KEYED_SERVICES = [
  {
    id: "judge0",
    name: "Judge0",
    allowed: true,
    how: "Add it in \u201cOur runners\u201d above as a Judge0 runner: your own Judge0 server, or a Judge0 Cloud / RapidAPI key.",
    why: "Judge0 is open-source (GPL-3.0), so running it on our own server is allowed. Its cloud API is sold for competitive programming and e-learning platforms — use it within the plan you buy.",
    terms: "https://judge0.com",
  },
  {
    id: "jdoodle",
    name: "JDoodle Compiler API",
    allowed: false,
    why: "Its terms give a licence only \"for your own use or for your internal business purposes\"; any other use needs JDoodle's written consent (hello@jdoodle.com). Running our students' code is neither.",
    terms: "https://www.jdoodle.com/terms",
  },
  {
    id: "glot",
    name: "glot.io",
    allowed: false,
    why: "glot.io publishes no terms of service for its hosted API, so there is no permission to build on it. Its runner code is open-source (MIT) and could be self-hosted — our Piston runners already do that job.",
    terms: "https://glot.io",
  },
  {
    id: "coliru",
    name: "Coliru",
    allowed: false,
    why: "Coliru publishes no terms and no API; it is one person's free server run on donations. Not without its owner's permission.",
    terms: "https://coliru.stacked-crooked.com",
  },
];

/** Where a runner lives — only a label for the admin list. */
const HOSTS = [
  { id: "oracle", name: "Oracle Cloud (Always Free)" },
  { id: "hetzner", name: "Hetzner" },
  { id: "aws", name: "AWS" },
  { id: "judge0cloud", name: "Judge0 Cloud (key)" },
  { id: "other", name: "Other server" },
];
const HOST_IDS = new Set(HOSTS.map((h) => h.id));
const MAX_RUNNERS = 30;

const KEY = "judge_runners";
const TTL_MS = 60_000;
let cache = null; // { at, list }
let generation = 0;
onWrite(/site_settings/i, () => {
  generation++;
  cache = null;
});

function normalize(raw) {
  const list = raw && Array.isArray(raw.runners) ? raw.runners : [];
  return list.filter((r) => r && typeof r.id === "string" && typeof r.url === "string").slice(0, MAX_RUNNERS);
}

async function loadRunners() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.list;
  const gen = generation;
  const rows = await all("SELECT value FROM site_settings WHERE key = ?", [KEY]).catch(() => []);
  let list = [];
  try {
    if (rows[0]) list = normalize(JSON.parse(rows[0].value));
  } catch {
    /* corrupt: behave as if none were added */
  }
  if (gen === generation) cache = { at: Date.now(), list };
  return list;
}

/** The last loaded list, synchronously (never touches the database). */
function peekRunners() {
  return cache?.list || [];
}

async function saveRunners(list, by) {
  const value = JSON.stringify({ runners: normalize({ runners: list }) });
  await run(
    `INSERT INTO site_settings(key, value, updated_by, updated_at) VALUES(?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`,
    [KEY, value, by || null, Date.now()],
  );
  cache = { at: Date.now(), list: normalize(JSON.parse(value)) };
  return cache.list;
}

function cleanUrl(u) {
  return String(u || "").trim().replace(/\/+$/, "").replace(/\/api\/v2$/, "");
}

/** Only https (or this machine, for local testing). */
function urlOk(u) {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || (x.protocol === "http:" && /^(localhost|127\.0\.0\.1)$/.test(x.hostname));
  } catch {
    return false;
  }
}

function newRunner({ name, host, url, token, kind }) {
  const h = HOST_IDS.has(host) ? host : "other";
  return {
    id: `r_${crypto.randomBytes(6).toString("hex")}`,
    kind: KINDS.includes(kind) ? kind : "piston",
    name: String(name || "").trim().slice(0, 60) || HOSTS.find((x) => x.id === h).name,
    host: h,
    url: cleanUrl(url),
    token: token ? seal(String(token).trim()) : "",
    last4: token ? last4(String(token).trim()) : "",
    enabled: true,
    test: null,
  };
}

function runnerToken(r) {
  try {
    return r?.token ? open(r.token) : "";
  } catch {
    return "";
  }
}

/** A runner as the admin API shows it: never the password. */
function publicRunner(r) {
  return {
    id: r.id,
    kind: r.kind || "piston",
    name: r.name,
    host: r.host,
    url: r.url,
    last4: r.last4 || "",
    hasToken: !!r.token,
    enabled: r.enabled !== false,
    test: r.test || null,
  };
}

/**
 * Check a runner the way the judge will use it: list its languages, then run
 * a one-line program. Resolves to { ok, ms, error, languages }.
 */
async function testRunner(r, { fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  const token = runnerToken(r);
  if (r.kind === "judge0") {
    const t = await judge0.testJudge0(r.url, token, { fetchImpl, timeoutMs });
    return { ...t, runtimes: t.languages.length };
  }
  const headers = { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const started = Date.now();
  const why = (e) => (e?.name === "TimeoutError" ? "Timed out" : "Could not reach the runner");
  let languages = [];
  let runtimes = 0;
  try {
    const res = await fetchImpl(`${r.url}/api/v2/runtimes`, { headers, signal: AbortSignal.timeout(timeoutMs) });
    if (res.status === 401 || res.status === 403) return { ok: false, ms: Date.now() - started, error: "The password was refused", languages };
    if (!res.ok) return { ok: false, ms: Date.now() - started, error: `The runner answered ${res.status}`, languages };
    const list = await res.json().catch(() => null);
    if (!Array.isArray(list)) return { ok: false, ms: Date.now() - started, error: "That address is not a Piston runner", languages };
    languages = [...new Set(list.flatMap((x) => [x.language, ...(x.aliases || [])]).filter(Boolean).map(String))].sort();
    runtimes = new Set(list.map((x) => x.language).filter(Boolean)).size;
  } catch (e) {
    return { ok: false, ms: Date.now() - started, error: why(e), languages };
  }
  if (!languages.length) return { ok: false, ms: Date.now() - started, error: "No languages installed yet", languages };
  // A real run, so a broken sandbox is caught here and not by a student.
  const probe = languages.includes("python")
    ? { language: "python", files: [{ name: "main.py", content: "print(6*7)" }] }
    : languages.includes("bash")
      ? { language: "bash", files: [{ name: "main.sh", content: "echo $((6*7))" }] }
      : null;
  if (probe) {
    try {
      const res = await fetchImpl(`${r.url}/api/v2/execute`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...probe, version: "*", stdin: "" }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || String(j?.run?.stdout || "").trim() !== "42") {
        return { ok: false, ms: Date.now() - started, error: "It answered, but a test program did not run", languages };
      }
    } catch (e) {
      return { ok: false, ms: Date.now() - started, error: why(e), languages };
    }
  }
  return { ok: true, ms: Date.now() - started, error: null, languages, runtimes };
}

/**
 * The servers the judge uses, for src/piston.js: enabled runners with an
 * address, in the admin's order. `languages` is null when unknown.
 */
function judgeServers() {
  return peekRunners()
    .filter((r) => r.enabled !== false && r.url && (r.kind || "piston") === "piston")
    .map((r) => ({
      url: r.url,
      token: runnerToken(r),
      name: r.name,
      languages: r.test && r.test.ok && Array.isArray(r.test.languages) && r.test.languages.length ? r.test.languages : null,
    }));
}

/** The Judge0 runners the judge uses (src/judge0.js): enabled, tested, with their language ids. */
function judge0Servers() {
  return peekRunners()
    .filter((r) => r.enabled !== false && r.url && r.kind === "judge0" && r.test && r.test.ok && r.test.map)
    .map((r) => ({ url: r.url, token: runnerToken(r), name: r.name, map: r.test.map }));
}

function startRefresh() {
  loadRunners().catch(() => {});
  const t = setInterval(() => loadRunners().catch(() => {}), TTL_MS);
  t.unref?.();
}

module.exports = {
  HOSTS,
  KINDS,
  KEYED_SERVICES,
  judge0Servers,
  MAX_RUNNERS,
  loadRunners,
  peekRunners,
  saveRunners,
  newRunner,
  publicRunner,
  testRunner,
  judgeServers,
  urlOk,
  cleanUrl,
  startRefresh,
  _reset: () => {
    cache = null;
  },
};
