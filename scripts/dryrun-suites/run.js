// Runs every program in scripts/dryrun-suites/<lang> plain and traced on the
// public runners and checks both print exactly the same. See README.md.
const fs = require('fs');
const path = require('path');
const R = require('../../src/remote-exec');
const { TRACERS, parseTrace, forRunner } = require('../../src/dryrun');

(async () => {
  const [lang, engine] = process.argv.slice(2);
  if (!TRACERS[lang]) throw new Error(`usage: run.js <${Object.keys(TRACERS).join('|')}> [engine]`);
  const dir = path.join(__dirname, lang);
  const chain = engine ? [engine] : R.engineChain(lang);
  for (const name of fs.readdirSync(dir).filter((n) => !n.endsWith('.in')).sort()) {
    const code = fs.readFileSync(path.join(dir, name), 'utf8');
    const inFile = path.join(dir, name.replace(/\.[^.]+$/, '.in'));
    const input = fs.existsSync(inFile) ? fs.readFileSync(inFile, 'utf8') : '';
    const plain = await R.runChain(code, input, lang, chain);
    const r = await R.runChain(forRunner(lang, await TRACERS[lang].wrap(code)), input, lang, chain);
    const t = parseTrace(r.stderr);
    const ok = plain.stdout === r.stdout && t.events.length > 0;
    console.log(`${ok ? 'OK ' : 'BAD'} ${name.padEnd(22)} ${r.engine} ${r.verdict || 'OK'} steps ${t.events.length}${ok ? '' : `\n    plain:  ${JSON.stringify(plain.stdout).slice(0, 120)}\n    traced: ${JSON.stringify(r.stdout).slice(0, 120)}\n    ${String(r.stderr).slice(0, 400)}`}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
