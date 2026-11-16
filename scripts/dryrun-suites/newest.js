// Does the dry run still work on the newest compiler versions the updater
// (src/compilers.js) would choose? For every traced language and every public
// runner that lists versions, take the version the updater would pick, then
// run programs on exactly that version, plain and traced: both must print the
// same, and the traced run must record steps.
//
//   NODE_OPTIONS="-r <proxy preload>" node scripts/dryrun-suites/newest.js [lang…]
//
// Programs: scripts/dryrun-suites/<lang>/ when it exists, else a spread of
// Learn solutions (src/learn/problems/*.json, every 16th, with sample 1).
const fs = require('fs');
const path = require('path');
const R = require('../../src/remote-exec');
const C = require('../../src/compilers');
const { TRACERS, parseTrace, forRunner } = require('../../src/dryrun');

const ROOT = path.join(__dirname, '..', '..');
const LEARN_KEY = { javascript: 'js', typescript: 'js' };

function programs(lang) {
  const dir = path.join(__dirname, lang);
  if (fs.existsSync(dir)) {
    return fs
      .readdirSync(dir)
      .filter((n) => !n.endsWith('.in'))
      .sort()
      .map((name) => {
        const inFile = path.join(dir, name.replace(/\.[^.]+$/, '.in'));
        return { name, code: fs.readFileSync(path.join(dir, name), 'utf8'), input: fs.existsSync(inFile) ? fs.readFileSync(inFile, 'utf8') : '' };
      });
  }
  const key = LEARN_KEY[lang] || lang;
  const all = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'src/learn/problems')).sort())
    for (const p of JSON.parse(fs.readFileSync(path.join(ROOT, 'src/learn/problems', f))).problems)
      if (p.solutions?.[key]) all.push({ name: p.slug, code: p.solutions[key], input: p.samples?.[0]?.input ?? '' });
  return all.filter((_, i) => i % 16 === 0);
}

(async () => {
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(TRACERS);
  // What each service would be updated to (the same rules as sync()).
  const newest = {};
  for (const svc of C.SERVICES.filter((s) => s.lists)) {
    try {
      newest[svc.id] = (await C.newestOn(svc.id)).out;
    } catch (e) {
      console.log(`(could not read ${svc.id}'s list: ${e.message})`);
      newest[svc.id] = {};
    }
  }
  let bad = 0;
  for (const lang of langs) {
    const engines = R.engineChain(lang).filter((e) => newest[e]?.[lang]);
    if (!engines.length) {
      console.log(`${lang}: no listed runner has a newer version to check`);
      continue;
    }
    for (const engine of engines) {
      const best = newest[engine][lang];
      const current = R.compilerFor(engine, lang);
      if (best.id === current) {
        console.log(`${lang} on ${engine}: already newest (${current})`);
        continue;
      }
      if (best.currentVersion && C.compareVersions(best.version, best.currentVersion) <= 0) continue;
      if (!C.sameSeries(lang, best.version, best.currentVersion)) {
        console.log(`${lang} on ${engine}: ${best.id} is a big change — the updater holds it for an admin; not checked`);
        continue;
      }
      let ok = 0;
      const fails = [];
      const list = programs(lang);
      for (const p of list) {
        const plain = await R.runOn(p.code, p.input, lang, engine, best.id);
        if (plain.verdict && plain.verdict !== 'OK') {
          fails.push(`${p.name}: the plain program fails on this version (${plain.verdict}: ${String(plain.stderr || '').split('\n')[0].slice(0, 120)})`);
          continue;
        }
        const t = await R.runOn(forRunner(lang, await TRACERS[lang].wrap(p.code))(engine), p.input, lang, engine, best.id);
        const steps = parseTrace(t.stderr).events.length;
        if (t.stdout === plain.stdout && steps > 0) ok++;
        else fails.push(`${p.name}: traced ${t.verdict || 'OK'}, steps ${steps}, same output ${t.stdout === plain.stdout} — ${String(t.stderr || '').replace(/\u001eNXT[^\n]*\n?/g, '').split('\n').filter(Boolean)[0]?.slice(0, 200) ?? ''}`);
      }
      bad += fails.length;
      console.log(`${fails.length ? 'BAD' : 'OK '} ${lang} on ${engine}: ${best.id} (was ${current}) — ${ok} of ${list.length}`);
      for (const f of fails) console.log(`     ${f}`);
    }
  }
  process.exit(bad ? 1 : 0);
})().catch((e) => {
  console.error(e.message);
  process.exit(2);
});
