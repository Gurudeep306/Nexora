/**
 * "How your code runs": the real translation of a student's program — the
 * CPU instructions (assembly) or the bytecode the compiler makes — from
 * Compiler Explorer, each instruction tied to the source line it came from.
 * The client animates it (client/src/components/solve/journey/).
 *
 * Nothing is invented: when Compiler Explorer cannot translate a language,
 * the answer says so and the client shows the stages without a listing.
 */
const crypto = require('crypto');
const remote = require('./remote-exec');

/**
 * What each language turns into, and what runs it. `kind`:
 *   machine  — compiled ahead of time to CPU instructions
 *   jit      — bytecode, turned into CPU instructions while it runs (the
 *              listing is what the JIT made)
 *   bytecode — compiled to bytecode that a virtual machine runs
 * `opt` languages can show the listing with and without optimisation.
 */
const TRANSLATE = {
  c: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU', opt: { on: '-O2 -std=c17', off: '-O0 -std=c17' } },
  cpp: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU', opt: { on: '-O2 -std=c++20', off: '-O0 -std=c++20' } },
  objectivec: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  // Compiler Explorer builds Rust as a library by default, where main is unused.
  rust: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU', opt: { on: '-O --crate-type=bin', off: '-C opt-level=0 --crate-type=bin' } },
  go: { kind: 'machine', target: 'Go assembly', runner: 'the CPU' },
  swift: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  zig: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  d: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU', opt: { on: '-O', off: '' } },
  haskell: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU', opt: { on: '-O2', off: '-O0' } },
  ocaml: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  crystal: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  pascal: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  dart: { kind: 'machine', target: 'x86-64 assembly', runner: 'the CPU' },
  csharp: { kind: 'jit', target: 'x86-64 assembly made by the .NET JIT', runner: 'the .NET runtime, then the CPU' },
  java: { kind: 'bytecode', target: 'Java bytecode', runner: 'the Java Virtual Machine (JVM)' },
  kotlin: { kind: 'bytecode', target: 'Java bytecode', runner: 'the Java Virtual Machine (JVM)' },
  python: { kind: 'bytecode', target: 'Python bytecode', runner: 'the Python virtual machine' },
  ruby: { kind: 'bytecode', target: 'Ruby bytecode (YARV)', runner: 'the Ruby virtual machine' },
  lua: { kind: 'bytecode', target: 'Lua bytecode', runner: 'the Lua virtual machine' },
  perl: { kind: 'bytecode', target: 'Perl opcodes', runner: 'the Perl interpreter' },
};

/** How every language runs, for the stages (including those with no listing). */
const RUNS_ON = {
  javascript: { kind: 'jit', runner: 'Node.js (the V8 engine): it reads the code, makes bytecode, and compiles busy parts to CPU instructions' },
  typescript: { kind: 'jit', runner: 'TypeScript is checked and turned into JavaScript, which V8 runs' },
  php: { kind: 'bytecode', runner: 'PHP turns the code into opcodes and its engine runs them' },
  shell: { kind: 'interpreted', runner: 'the shell reads and runs one command at a time' },
  r: { kind: 'interpreted', runner: 'the R interpreter' },
  scala: { kind: 'bytecode', runner: 'Scala compiles to Java bytecode for the JVM' },
  groovy: { kind: 'bytecode', runner: 'Groovy compiles to Java bytecode for the JVM' },
  clojure: { kind: 'bytecode', runner: 'Clojure compiles to Java bytecode for the JVM' },
  fsharp: { kind: 'jit', runner: 'F# compiles to .NET bytecode (IL); the .NET JIT turns it into CPU instructions' },
  julia: { kind: 'jit', runner: 'Julia compiles each function to CPU instructions the first time it runs' },
  elixir: { kind: 'bytecode', runner: 'Elixir compiles to bytecode for the BEAM virtual machine' },
  scheme: { kind: 'interpreted', runner: 'the Scheme interpreter' },
  commonlisp: { kind: 'machine', runner: 'SBCL compiles each form to CPU instructions' },
  powershell: { kind: 'jit', runner: 'PowerShell runs on .NET' },
  tcl: { kind: 'bytecode', runner: 'Tcl compiles each procedure to bytecode' },
  nim: { kind: 'machine', runner: 'Nim translates to C, and a C compiler makes CPU instructions' },
};

function plan(lang) {
  const t = TRANSLATE[lang];
  if (t) return { kind: t.kind, target: t.target, runner: t.runner, listing: true, canToggleOpt: !!t.opt };
  const r = RUNS_ON[lang];
  return { kind: r ? r.kind : 'interpreted', target: null, runner: r ? r.runner : 'its interpreter', listing: false, canToggleOpt: false };
}

/** Go's assembler bookkeeping, not instructions a student needs. */
const NOISE = /^\s*(PCDATA|FUNCDATA|\.loc|\.file|\.cfi_|#\s*-- Begin|#\s*-- End)/;
const MAX_LINES = 700;

/**
 * A heading in a listing: an assembly label ("main:"), a Java method
 * ("static int sq(int);"), Python's "Disassembly of <code object sq …>:",
 * Ruby's "== disasm: …" or Lua's "function <…>". Local jump labels (.L…)
 * are not headings.
 */
function isLabel(text) {
  if (/^\.L/.test(text.trim())) return false;
  return (
    /^[^\s].*:\s*(#.*)?$/.test(text) ||
    /^\s{0,2}[\w$<>[\], ]+\([^)]*\);\s*$/.test(text) ||
    /^== disasm/.test(text) ||
    /^(main|function) </.test(text)
  );
}

/**
 * Keep the student's own code: instructions tied to a line of their file,
 * and the label each block of them sits under. Library code is dropped.
 */
function trimListing(asm, sourceLines) {
  const out = [];
  let pendingLabel = null;
  const own = (a) => a && a.source && Number.isFinite(a.source.line) && !a.source.file && a.source.line >= 1 && a.source.line <= sourceLines;
  const anyOwn = asm.some(own);
  for (const a of asm) {
    const text = String(a.text || '').replace(/\s+$/, '');
    if (!text.trim() || NOISE.test(text)) continue;
    if (!anyOwn) {
      // No line links at all (some compilers): keep the listing as it is.
      out.push(isLabel(text) ? { text: text.trim(), line: null, label: true } : { text, line: null });
    } else if (own(a)) {
      if (pendingLabel) {
        out.push({ text: pendingLabel, line: null, label: true });
        pendingLabel = null;
      }
      out.push({ text, line: a.source.line });
    } else if (isLabel(text)) {
      pendingLabel = text.replace(/\s*#.*$/, '').trim();
    }
    if (out.length >= MAX_LINES) break;
  }
  return { lines: out, truncated: out.length >= MAX_LINES, mapped: anyOwn };
}

const cache = new Map(); // key → { at, value }
const CACHE_MS = 10 * 60_000;

/**
 * The translation of `code`. Resolves to
 *   { ok, plan, compiler, lines[{ text, line, label? }], mapped, truncated, error }
 * Never throws.
 */
async function translate(code, lang, { optimise = true, post = null } = {}) {
  const p = plan(lang);
  const g = remote.GODBOLT_MAP[lang];
  const t = TRANSLATE[lang];
  if (!p.listing || !g || !t) return { ok: false, plan: p, lines: [], error: null };
  const src = String(code || '');
  const sourceLines = src.split('\n').length;
  const args = t.opt ? (optimise ? t.opt.on : t.opt.off) : g.args || '';
  const key = crypto.createHash('sha256').update(`${lang}\0${args}\0${src}`).digest('hex');
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const res = await (post || remote.postJson)({
    hostname: 'godbolt.org',
    path: `/api/compiler/${encodeURIComponent(g.id)}/compile`,
    timeout: 45000,
    payload: JSON.stringify({
      source: lang === 'java' ? remote.preprocess(src, lang) : src,
      lang: g.lang,
      options: {
        userArguments: args,
        compilerOptions: { executorRequest: false },
        filters: { binary: false, execute: false, labels: true, directives: true, commentOnly: true, demangle: true, intel: true, libraryCode: true, trim: false },
        tools: [],
        libraries: [],
      },
      allowStoreCodeDebug: false,
    }),
  });
  if (!res.ok) {
    return { ok: false, plan: p, lines: [], error: 'Compiler Explorer did not answer. Try again in a minute.' };
  }
  const body = res.body || {};
  const asm = Array.isArray(body.asm) ? body.asm : [];
  const errText = [...(body.stderr || []), ...(body.buildResult?.stderr || [])].map((x) => x.text).join('\n').trim();
  const failed = body.code !== 0 && (asm.length <= 1 || /<Compilation failed>/.test(asm[0]?.text || ''));
  let value;
  if (failed) {
    const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');
    value = { ok: false, plan: p, lines: [], compileError: errText.replace(ANSI, '').replace(/\/app\/output\.s/g, '<source>') || 'The program did not compile.', error: null };
  } else {
    const { lines, truncated, mapped } = trimListing(asm, sourceLines);
    value = { ok: lines.length > 0, plan: p, compiler: g.id, args, lines, mapped, truncated, error: lines.length ? null : 'The compiler made no listing for this code.' };
  }
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return value;
}

module.exports = { TRANSLATE, RUNS_ON, plan, trimListing, translate, isLabel };
