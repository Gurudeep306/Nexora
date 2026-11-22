#!/usr/bin/env node
/*
  S9 — measure the ears before turning anything on
  (docs/voice/STEP1_EARS_DESIGN.md §S9).

  Runs every recorded test clip (<lang>/<id>.wav in ASR_CLIPS_DIR, by default
  docs/voice/tests/asr/, where git ignores them; listed
  in docs/voice/tests/asr/clips.json) through each speech service set up in
  Admin → Voice recognition, one service at a time, with the same free caps,
  usage counting and normaliser as the live chain (so it can never overspend),
  and reports per service and language:

    - word error rate (WER),
    - code-word error rate (only code and CS words),
    - command accuracy (the right action after the normaliser and matcher),
    - code accuracy (the right code on code pages),
    - p50 and p95 time,
    - pass or fail against the design's gates
      (commands ≥ 95%, code words ≤ 5%, Hinglish WER ≤ 15%, p95 < 1.5 s).

  Run it where the site's database and SESSION_SECRET are set (the keys are
  sealed in the database):

    node scripts/voice/asr-eval.js                 # every service, every clip
    node scripts/voice/asr-eval.js --only groq     # one service
    node scripts/voice/asr-eval.js --lang hinglish # one language
    node scripts/voice/asr-eval.js --limit 20      # the first 20 clips per language

  Results are printed and saved to docs/voice/tests/asr/results/<date>.json.
  Clips that aren't recorded yet are skipped and listed.
*/
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const m = require("./asr-metrics");

const ROOT = path.join(__dirname, "..", "..");
const DIR = path.join(ROOT, "docs", "voice", "tests", "asr");
// Recordings are someone's voice: keep them out of the public repo (they are gitignored here).
// Point ASR_CLIPS_DIR at a private folder that holds <lang>/<id>.wav.
const CLIPS = process.env.ASR_CLIPS_DIR ? path.resolve(process.env.ASR_CLIPS_DIR) : DIR;

// The places the shell offers (as in tests/voice-actions.test.js), for command clips.
const NAV = [
  ["/hub", "Home"], ["/problems", "Problems"], ["/contests", "Contests"], ["/workshop", "Workshop"], ["/nexus", "Nexus"],
  ["/analytics", "Analytics"], ["/achievements", "Achievements"], ["/learn", "Learn"], ["/social", "Social"],
  ["/submissions", "Submissions"], ["/bookmarks", "Bookmarks"], ["/profile", "Profile"], ["/theme", "Appearance"], ["/settings", "Settings"],
].map(([to, label]) => ({ to, label }));

const actions = (f) => import(pathToFileURL(path.join(ROOT, "client", "src", "voice", "actions", f)).href);

/** The site-wide spoken commands (the same list the top-bar mic uses). */
async function commandSpecs() {
  const G = await actions("globalSpecs.ts");
  return [G.placeSpec([...NAV, ...G.EXTRA_PLACES]), ...G.GLOBAL_SPECS];
}

function args(argv) {
  const get = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return { only: get("only"), lang: get("lang"), limit: Number(get("limit")) || Infinity };
}

async function main() {
  const opt = args(process.argv.slice(2));
  const stt = require("../../src/voice/stt");
  const { normalise } = require("../../src/voice/normalise");
  const { matchCommand, expand } = await actions("match.ts");
  const specs = await commandSpecs();
  const expanded = new Map(specs.map((s) => [s.id, expand(s)]));

  const list = JSON.parse(fs.readFileSync(path.join(DIR, "clips.json"), "utf8")).clips;
  const byLang = {};
  const missing = [];
  for (const c of list) {
    if (opt.lang && c.lang !== opt.lang) continue;
    const file = path.join(CLIPS, c.lang, `${c.id}.wav`);
    if (!fs.existsSync(file)) {
      missing.push(c.id);
      continue;
    }
    (byLang[c.lang] ||= []).push({ ...c, file });
  }
  for (const l of Object.keys(byLang)) byLang[l] = byLang[l].slice(0, opt.limit);

  const cfg = await stt.loadConfig();
  const services = cfg.providers.filter((p) => p.enabled && (!opt.only || p.id === opt.only));
  if (!services.length) {
    console.log("No services are on in Admin → Voice recognition (or --only names none).");
    process.exit(1);
  }

  const report = { at: new Date().toISOString(), missing, services: {} };
  for (const p of services) {
    report.services[p.id] = {};
    for (const [lang, clips] of Object.entries(byLang)) {
      const w = [];
      const cw = [];
      const times = [];
      let cmdOk = 0;
      let cmdN = 0;
      let codeOk = 0;
      let codeN = 0;
      const fails = [];
      for (const c of clips) {
        const audio = fs.readFileSync(c.file);
        const mode = c.kind === "command" ? "command" : c.kind === "code" ? "code" : "text";
        const r = await stt.transcribeWith(p.id, { audio, lang: lang === "hi" ? "hi-IN" : "en-IN", hints: c.hints || [], mode });
        if (!r.ok) {
          fails.push(`${c.id}: ${r.why}`);
          if (/limit|credit|minute|hour|day|month/i.test(r.why)) break; // never push a service past its free cap
          continue;
        }
        times.push(r.ms);
        w.push(m.wer(c.text, r.raw));
        cw.push(m.codeWer(c.text, r.raw));
        if (c.kind === "command") {
          cmdN++;
          const { best } = matchCommand(r.text, specs, expanded);
          if (best?.id === c.command && (!c.args || JSON.stringify(best.args) === JSON.stringify(c.args))) cmdOk++;
          else fails.push(`${c.id}: heard "${r.text}" → ${best?.id ?? "nothing"}`);
        }
        if (c.kind === "code") {
          codeN++;
          if (r.code === c.code) codeOk++;
          else fails.push(`${c.id}: heard "${r.raw}" → ${r.code}`);
        }
      }
      const row = {
        clips: times.length,
        wer: m.rate(w),
        codeWer: m.rate(cw),
        commands: cmdN ? cmdOk / cmdN : null,
        code: codeN ? codeOk / codeN : null,
        p50: m.percentile(times, 50),
        p95: m.percentile(times, 95),
        fails,
      };
      row.gates = {
        commands: row.commands === null ? null : row.commands >= m.GATES.commands,
        codeWer: row.codeWer === null ? null : row.codeWer <= m.GATES.codeWer,
        wer: lang === "hinglish" && row.wer !== null ? row.wer <= m.GATES.hinglishWer : null,
        p95: row.p95 === null ? null : row.p95 < m.GATES.p95Ms,
      };
      report.services[p.id][lang] = row;
    }
  }

  // Print a short table.
  const pct = (x) => (x === null || x === undefined ? "–" : `${(x * 100).toFixed(1)}%`);
  const mark = (g) => (g === null ? " " : g ? "✓" : "✗");
  console.log("\nservice      lang       clips  WER      code-WER  commands  code     p50   p95");
  for (const [id, langs] of Object.entries(report.services)) {
    for (const [lang, r] of Object.entries(langs)) {
      console.log(
        `${id.padEnd(12)} ${lang.padEnd(10)} ${String(r.clips).padStart(5)}  ${pct(r.wer).padEnd(8)} ${mark(r.gates.codeWer)}${pct(r.codeWer).padEnd(8)} ${mark(r.gates.commands)}${pct(r.commands).padEnd(8)} ${pct(r.code).padEnd(8)} ${String(r.p50 ?? "–").padStart(5)} ${mark(r.gates.p95)}${String(r.p95 ?? "–").padStart(5)}`,
      );
    }
  }
  if (missing.length) console.log(`\nNot recorded yet (${missing.length}): ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? " …" : ""}`);
  const outDir = path.join(DIR, "results");
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, `${report.at.slice(0, 10)}.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 1));
  console.log(`\nSaved ${path.relative(ROOT, out)}`);
}

module.exports = { commandSpecs };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
