// Codeforces statements and official tests from an open, licensed dataset.
//
// Codeforces' problem pages sit behind a bot check that refuses servers, so a
// statement often can't be read from codeforces.com at all. The open dataset
// open-r1/codeforces (Hugging Face, CC BY 4.0) carries ~10,000 Codeforces
// problems: statement, input/output format, note, examples, limits, tags and
// the official tests. Nexora reads it straight from the published Parquet
// files with HTTP range requests, so only the bytes needed are downloaded:
//   • the id column once, to know which file and row a problem lives in;
//   • one problem's statement columns when it's opened (a few KB);
//   • one problem's official tests in the background, cached afterwards.
// Attribution is shown with every statement that comes from here.
//
// Known gaps, said plainly on the page: the dataset keeps the text and the
// maths ($$$…$$$) but not the pictures, and a few statements lost
// superscripts (10^9 written as 109). Problems that mention a picture link
// back to Codeforces for it.
const { run, get, all, runMany } = require("../db");
const { normalizeTime, normalizeMemory, blank } = require("./common");

const API = "https://huggingface.co/api/datasets/open-r1/codeforces/parquet/default";
const SPLITS = ["train", "test"];
const ATTRIBUTION = { name: "open-r1/codeforces", url: "https://huggingface.co/datasets/open-r1/codeforces", license: "CC BY 4.0" };
const STATEMENT_COLUMNS = ["id", "title", "time_limit", "memory_limit", "description", "input_format", "output_format", "interaction_format", "note", "examples", "input_mode", "generated_checker"];
/** Judge limits for official tests (the judge itself caps 100 tests / 1 MB input). */
const MAX_TESTS = 60;
const MAX_INPUT_BYTES = 768 * 1024;
const MAX_OUTPUT_BYTES = 64 * 1024;

let hp = null; // hyparquet is ESM-only
const parquet = async () => (hp ||= await import("hyparquet"));

let fetchImpl = (...a) => fetch(...a);
function setFetch(fn) {
  fetchImpl = fn || ((...a) => fetch(...a));
  files = null;
  index = null;
}

/* ── tables ─────────────────────────────────────────────────────────────── */
let ready = null;
function init() {
  ready ||= (async () => {
    await run("CREATE TABLE IF NOT EXISTS cf_dataset_index (id TEXT PRIMARY KEY, file TEXT NOT NULL, row INTEGER NOT NULL)");
    await run("CREATE TABLE IF NOT EXISTS cf_dataset_tests (id TEXT PRIMARY KEY, tests TEXT NOT NULL, exact INTEGER NOT NULL, fetched_at INTEGER NOT NULL)");
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

/* ── files and the id → (file, row) index ───────────────────────────────── */
let files = null; // [url]
async function listFiles() {
  if (files) return files;
  const out = [];
  for (const split of SPLITS) {
    const r = await fetchImpl(`${API}/${split}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`The Codeforces dataset answered ${r.status}`);
    out.push(...(await r.json()));
  }
  return (files = out);
}

/** A Parquet file over HTTP range requests (only the bytes asked for are fetched). */
const opened = new Map();
async function openFile(url) {
  if (opened.has(url)) return opened.get(url);
  const p = (async () => {
    const { asyncBufferFromUrl, cachedAsyncBuffer } = await parquet();
    const buf = await asyncBufferFromUrl({ url, fetch: fetchImpl });
    return cachedAsyncBuffer ? cachedAsyncBuffer(buf) : buf;
  })();
  opened.set(url, p);
  p.catch(() => opened.delete(url));
  return p;
}

/** "1850G" → "1850/G" (the dataset's id). */
function datasetId(problemId) {
  const m = String(problemId || "").match(/^(\d+)([A-Z][0-9]?)$/i);
  return m ? `${m[1]}/${m[2].toUpperCase()}` : null;
}

let index = null; // Map id → { file, row }
let building = null;
async function getIndex() {
  if (index) return index;
  await init();
  const rows = await all("SELECT id, file, row FROM cf_dataset_index");
  if (rows.length > 1000) return (index = new Map(rows.map((r) => [r.id, { file: r.file, row: r.row }])));
  building ||= (async () => {
    const { parquetReadObjects } = await parquet();
    const map = new Map();
    for (const url of await listFiles()) {
      const file = await openFile(url);
      const ids = await parquetReadObjects({ file, columns: ["id"] });
      ids.forEach((r, i) => {
        if (r.id && !map.has(r.id)) map.set(r.id, { file: url, row: i });
      });
    }
    await runMany(
      "INSERT OR REPLACE INTO cf_dataset_index(id, file, row) VALUES(?,?,?)",
      [...map].map(([id, v]) => [id, v.file, v.row]),
    ).catch((e) => console.error("[cf-dataset] index save failed:", e.message));
    return (index = map);
  })().finally(() => (building = null));
  return building;
}

async function readRow(problemId, columns) {
  const id = datasetId(problemId);
  if (!id) return null;
  const at = (await getIndex()).get(id);
  if (!at) return null;
  const { parquetReadObjects } = await parquet();
  const file = await openFile(at.file);
  const [row] = await parquetReadObjects({ file, columns, rowStart: at.row, rowEnd: at.row + 1 });
  return row && row.id === id ? row : null;
}

/* ── statement ──────────────────────────────────────────────────────────── */
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** Plain dataset text → paragraphs; $$$…$$$ maths is left for the renderer. */
function toHtml(text) {
  const t = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!t) return "";
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
const PICTURE = /\b(picture|image|figure|diagram|illustrat\w*|drawn|shown (below|above|in the))/i;
/** Problems where any correct answer is accepted can't be judged by exact match. */
const ANY_ANSWER = /\bany (of them|one of|such|valid|correct)|multiple (possible |valid |correct )?(answers|solutions)|several (possible )?(answers|solutions)|print any|output any|if there are (many|multiple|several)/i;

function exactAnswer(row) {
  return !row.generated_checker && !row.interaction_format && (row.input_mode || "stdio") === "stdio" && !ANY_ANSWER.test(row.output_format || "") && !ANY_ANSWER.test(row.description || "");
}

/** The statement in Nexora's shape, or null when the dataset doesn't have it. */
async function statement(problem) {
  const row = await readRow(problem.problem_id, STATEMENT_COLUMNS);
  if (!row || !String(row.description || "").trim()) return null;
  const out = blank();
  out.statement = toHtml(row.description);
  out.inputSpec = toHtml(row.input_format);
  out.outputSpec = toHtml(row.output_format);
  out.note = toHtml(row.note);
  if (row.interaction_format) {
    out.extra.interactive = true;
    out.outputSpec += `<div class="section-title">Interaction</div>${toHtml(row.interaction_format)}`;
  }
  out.timeLimit = row.time_limit ? normalizeTime(`${row.time_limit} s`) : "";
  out.memLimit = row.memory_limit ? normalizeMemory(`${row.memory_limit} MB`) : "";
  out.samples = (row.examples || []).map((e) => ({ input: String(e.input || "").replace(/\r\n/g, "\n"), output: String(e.output || "").replace(/\r\n/g, "\n") }));
  out.extra.source = { ...ATTRIBUTION, note: "The text, maths and examples come from an open copy of Codeforces; pictures aren't included." };
  if (PICTURE.test([row.description, row.input_format, row.output_format, row.note].join(" "))) out.extra.figures = true;
  if ((row.input_mode || "stdio") !== "stdio") out.extra.files = { input: "input.txt", output: "output.txt" };
  out.extra.exactAnswer = exactAnswer(row);
  return out;
}

/* ── official tests ─────────────────────────────────────────────────────── */
/** Cached official tests ([] when not usable), or null when not fetched yet. */
async function cachedTests(problemId) {
  await init();
  const id = datasetId(problemId);
  const r = id && (await get("SELECT tests, exact FROM cf_dataset_tests WHERE id=?", [id]));
  if (!r) return null;
  try {
    return r.exact ? JSON.parse(r.tests) : [];
  } catch {
    return [];
  }
}

const inflight = new Map();
/**
 * Fetch and cache one problem's official tests (exact-answer problems only,
 * within the judge's limits). Safe to call often: one download per problem.
 */
/** Problems whose test download failed lately (it is tried again after a while). */
const failedAt = new Map();
const RETRY_MS = 10 * 60 * 1000;
/** "fetching", "failed" (lately) or null: whether "being fetched now" is true. */
function testsState(problemId) {
  const id = datasetId(problemId);
  if (!id) return null;
  if (inflight.has(id)) return "fetching";
  const at = failedAt.get(id);
  return at && Date.now() - at < RETRY_MS ? "failed" : null;
}

function fetchTests(problemId) {
  const id = datasetId(problemId);
  if (!id) return Promise.resolve(null);
  if (inflight.has(id)) return inflight.get(id);
  if (testsState(problemId) === "failed") return Promise.resolve(null);
  const p = (async () => {
    await init();
    if (await get("SELECT 1 FROM cf_dataset_tests WHERE id=?", [id])) return cachedTests(problemId);
    const head = await readRow(problemId, ["id", "description", "output_format", "interaction_format", "input_mode", "generated_checker"]);
    if (!head) {
      // Not in the dataset: remembered, so it isn't looked up on every submit.
      await run("INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,?,?)", [id, "[]", 0, Date.now()]);
      return [];
    }
    let tests = [];
    const exact = exactAnswer(head);
    if (exact) {
      const row = await readRow(problemId, ["id", "official_tests"]);
      let bytes = 0;
      for (const t of row?.official_tests || []) {
        const input = String(t.input || "").replace(/\r\n/g, "\n");
        const output = String(t.output || "").replace(/\r\n/g, "\n");
        if (!output.trim() || Buffer.byteLength(output) > MAX_OUTPUT_BYTES) continue;
        if (bytes + Buffer.byteLength(input) > MAX_INPUT_BYTES) break;
        bytes += Buffer.byteLength(input);
        tests.push({ input, output });
        if (tests.length >= MAX_TESTS) break;
      }
    }
    await run("INSERT OR REPLACE INTO cf_dataset_tests(id, tests, exact, fetched_at) VALUES(?,?,?,?)", [id, JSON.stringify(tests), exact ? 1 : 0, Date.now()]);
    return exact ? tests : [];
  })()
    .then((r) => {
      failedAt.delete(id);
      return r;
    })
    .catch((e) => {
      console.error(`[cf-dataset] tests for ${id} failed:`, e.message);
      failedAt.set(id, Date.now());
      return null;
    })
    .finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

module.exports = { statement, cachedTests, fetchTests, testsState, datasetId, exactAnswer, toHtml, setFetch, getIndex, ATTRIBUTION, init };
