const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');

/* Prepend user-local runtime paths so Go, Lua, Rust etc. are found */
const HOME = os.homedir();
const extraPaths = [
  path.join(HOME, 'local', 'bin'),
  path.join(HOME, 'local', 'go', 'bin'),
  path.join(HOME, '.cargo', 'bin'),
].filter(p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } });
if (extraPaths.length) {
  process.env.PATH = extraPaths.join(':') + ':' + (process.env.PATH || '');
}

const TMP = os.tmpdir();
const TIME_LIMIT = 5000; // 5 seconds default

/* Per-language time limits (ms) — compiled langs and heavy runtimes get more */
const LANG_TIME_LIMIT = {
  cpp: 5000, c: 5000, python: 10000, java: 10000, javascript: 5000,
  typescript: 5000, csharp: 10000, go: 10000, rust: 10000, kotlin: 15000,
  ruby: 10000, php: 10000, perl: 5000, lua: 5000, shell: 5000,
  r: 10000, scala: 15000, swift: 10000, dart: 10000, julia: 15000,
  pascal: 5000, elixir: 10000, haskell: 10000, ocaml: 10000, d: 10000,
  nim: 10000, zig: 10000, crystal: 10000, groovy: 15000, commonlisp: 10000,
  fsharp: 15000, objectivec: 5000,
};
function getTimeLimit(lang) { return LANG_TIME_LIMIT[lang] || TIME_LIMIT; }

/* ========== Remote execution sandboxes ========== */
/* Wandbox / Compiler Explorer / Kotlin Playground, with caching, retries and
   in-flight de-duplication, all live in ./remote-exec. */
const {
  remoteRun, hasRemote, engineFor, clearCache: clearRemoteCache,
} = require('./remote-exec');

/* Check if a command is available locally (cached, auto-refreshes on miss) */
const _runtimeCache = {};
function hasRuntime(cmd) {
  if (_runtimeCache[cmd] === undefined) {
    try { execSync(`command -v ${cmd}`, { stdio: 'pipe' }); _runtimeCache[cmd] = true; }
    catch { _runtimeCache[cmd] = false; }
  }
  return _runtimeCache[cmd];
}
function clearRuntimeCache() { Object.keys(_runtimeCache).forEach(k => delete _runtimeCache[k]); }

/* Run promises with limited concurrency */
async function promisePool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const idx = next++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
  return results;
}


/* ========== Language Configs ========== */
const LANG_CONFIG = {
  cpp:        { ext: 'cpp',   compiled: true,  label: 'C++20' },
  c:          { ext: 'c',     compiled: true,  label: 'C' },
  python:     { ext: 'py',    compiled: false, label: 'Python 3' },
  java:       { ext: 'java',  compiled: true,  label: 'Java' },
  javascript: { ext: 'js',    compiled: false, label: 'JavaScript' },
  typescript: { ext: 'ts',    compiled: false, label: 'TypeScript' },
  csharp:     { ext: 'cs',    compiled: true,  label: 'C#' },
  go:         { ext: 'go',    compiled: true,  label: 'Go' },
  rust:       { ext: 'rs',    compiled: true,  label: 'Rust' },
  kotlin:     { ext: 'kt',    compiled: true,  label: 'Kotlin' },
  ruby:       { ext: 'rb',    compiled: false, label: 'Ruby' },
  php:        { ext: 'php',   compiled: false, label: 'PHP' },
  perl:       { ext: 'pl',    compiled: false, label: 'Perl' },
  lua:        { ext: 'lua',   compiled: false, label: 'Lua' },
  shell:      { ext: 'sh',    compiled: false, label: 'Bash' },
  r:          { ext: 'r',     compiled: false, label: 'R' },
  scala:      { ext: 'scala', compiled: true,  label: 'Scala' },
  swift:      { ext: 'swift', compiled: true,  label: 'Swift' },
  dart:       { ext: 'dart',  compiled: false, label: 'Dart' },
  powershell: { ext: 'ps1',   compiled: false, label: 'PowerShell' },
  julia:      { ext: 'jl',    compiled: false, label: 'Julia' },
  fsharp:     { ext: 'fsx',   compiled: false, label: 'F#' },
  clojure:    { ext: 'clj',   compiled: false, label: 'Clojure' },
  scheme:     { ext: 'scm',   compiled: false, label: 'Scheme' },
  objectivec: { ext: 'm',     compiled: true,  label: 'Objective-C' },
  pascal:     { ext: 'pas',   compiled: true,  label: 'Pascal' },
  elixir:     { ext: 'exs',   compiled: false, label: 'Elixir' },
  tcl:        { ext: 'tcl',   compiled: false, label: 'Tcl' },
  haskell:    { ext: 'hs',    compiled: true,  label: 'Haskell' },
  ocaml:      { ext: 'ml',    compiled: true,  label: 'OCaml' },
  d:          { ext: 'd',     compiled: true,  label: 'D' },
  nim:        { ext: 'nim',   compiled: true,  label: 'Nim' },
  zig:        { ext: 'zig',   compiled: true,  label: 'Zig' },
  crystal:    { ext: 'cr',    compiled: true,  label: 'Crystal' },
  groovy:     { ext: 'groovy', compiled: false, label: 'Groovy' },
  commonlisp: { ext: 'lisp',  compiled: false, label: 'Common Lisp' },
};

/* Normalize bits/stdc++.h for macOS clang */
function normalizeCpp(code) {
  if (code.includes('#include <bits/stdc++.h>') || code.includes('#include<bits/stdc++.h>')) {
    code = code.replace(/#include\s*<bits\/stdc\+\+\.h>/g, '');
    const headers = `#include <iostream>
#include <algorithm>
#include <vector>
#include <string>
#include <map>
#include <set>
#include <queue>
#include <stack>
#include <cmath>
#include <cstring>
#include <numeric>
#include <functional>
#include <climits>
#include <cassert>
#include <sstream>
#include <bitset>
#include <unordered_map>
#include <unordered_set>
#include <deque>
#include <array>
#include <tuple>
#include <iomanip>
#include <list>
#include <complex>
#include <cstdio>
#include <cstdlib>`;
    code = headers + '\n#line 1 "solution.cpp"\n' + code;
  }
  return code;
}

/* Compile C++ source to binary, return binary path or throw */
function compileCpp(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.cpp`);
    const bin = path.join(TMP, `arena_${id}`);
    code = normalizeCpp(code);
    fs.writeFileSync(src, code);

    const compiler = spawn('clang++', [
      '-std=c++20', '-O2', '-o', bin, src,
      '-DONLINE_JUDGE',
    ]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) {
        reject({ verdict: 'CE', message: stderr.trim() });
      } else {
        resolve(bin);
      }
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'Compiler not found' }));
  });
}

/* Compile Java source, return { classDir, className } or throw */
function compileJava(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    // javac requires the file name to match the public class; when there is no
    // public class, fall back to whichever class the source actually declares.
    const classMatch = code.match(/public\s+class\s+(\w+)/) || code.match(/\bclass\s+(\w+)/);
    const className = classMatch ? classMatch[1] : 'Main';
    const dir = path.join(TMP, `arena_java_${id}`);
    fs.mkdirSync(dir, { recursive: true });
    const src = path.join(dir, `${className}.java`);
    fs.writeFileSync(src, code);

    const compiler = spawn('javac', [src]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      if (exitCode !== 0) {
        try { fs.rmSync(dir, { recursive: true }); } catch {}
        reject({ verdict: 'CE', message: stderr.trim() });
      } else {
        resolve({ classDir: dir, className });
      }
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'Java compiler not found (javac)' }));
  });
}

/* Prepare script-based language, return scriptPath */
function prepareScript(code, lang) {
  const id = crypto.randomBytes(8).toString('hex');
  const ext = (LANG_CONFIG[lang] || { ext: 'txt' }).ext;
  const scriptPath = path.join(TMP, `arena_${id}.${ext}`);
  fs.writeFileSync(scriptPath, code);
  return scriptPath;
}

/* Compile C source to binary */
function compileC(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.c`);
    const bin = path.join(TMP, `arena_${id}`);
    fs.writeFileSync(src, code);
    const compiler = spawn('cc', ['-std=c17', '-O2', '-o', bin, src, '-lm']);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(bin);
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'C compiler not found' }));
  });
}

/* Compile C# source using dotnet-script or mcs */
function compileCSharp(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.cs`);
    const bin = path.join(TMP, `arena_${id}.exe`);
    fs.writeFileSync(src, code);
    // Try mcs (mono) first
    const compiler = spawn('mcs', ['-out:' + bin, src]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve({ bin, runtime: 'mono' });
    });
    compiler.on('error', () => {
      try { fs.unlinkSync(src); } catch {}
      reject({ verdict: 'CE', message: 'C# compiler not found (mcs). Install Mono.' });
    });
  });
}

/* Compile Go source */
function compileGo(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.go`);
    const bin = path.join(TMP, `arena_${id}_go`);
    fs.writeFileSync(src, code);
    const compiler = spawn('go', ['build', '-o', bin, src]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(bin);
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'Go compiler not found' }));
  });
}

/* Compile Rust source */
function compileRust(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.rs`);
    const bin = path.join(TMP, `arena_${id}_rs`);
    fs.writeFileSync(src, code);
    const compiler = spawn('rustc', ['-O', '-o', bin, src]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(bin);
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'Rust compiler not found (rustc)' }));
  });
}

/* Compile Kotlin to jar */
function compileKotlin(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.kt`);
    const jar = path.join(TMP, `arena_${id}.jar`);
    fs.writeFileSync(src, code);
    const compiler = spawn('kotlinc', [src, '-include-runtime', '-d', jar]);
    let stderr = '';
    // kotlinc -include-runtime is slow (30-90s cold); don't hang forever.
    const compileTimeout = setTimeout(() => {
      compiler.kill('SIGKILL');
      try { fs.unlinkSync(src); } catch {}
      reject({ verdict: 'CE', message: 'Kotlin compile timed out' });
    }, 120000);
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      clearTimeout(compileTimeout);
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(jar);
    });
    compiler.on('error', () => { clearTimeout(compileTimeout); reject({ verdict: 'CE', message: 'Kotlin compiler not found (kotlinc)' }); });
  });
}

/* Compile Swift source (longer timeout for first-time module cache) */
function compileSwift(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.swift`);
    const bin = path.join(TMP, `arena_${id}_swift`);
    fs.writeFileSync(src, code);
    const compiler = spawn('swiftc', ['-O', '-o', bin, src]);
    let stderr = '';
    const compileTimeout = setTimeout(() => {
      compiler.kill('SIGKILL');
      try { fs.unlinkSync(src); } catch {}
      reject({ verdict: 'CE', message: 'Swift compiler not found or timed out' });
    }, 30000); // 30s for Swift compile
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      clearTimeout(compileTimeout);
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(bin);
    });
    compiler.on('error', () => { clearTimeout(compileTimeout); reject({ verdict: 'CE', message: 'Swift compiler not found (swiftc)' }); });
  });
}

function compileObjectiveC(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.m`);
    const bin = path.join(TMP, `arena_${id}_objc`);
    fs.writeFileSync(src, code);
    const compiler = spawn('clang', ['-framework', 'Foundation', '-o', bin, src]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(bin);
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'Clang not found for Objective-C' }));
  });
}

function compilePascal(code) {
  return new Promise((resolve, reject) => {
    const id = crypto.randomBytes(8).toString('hex');
    const src = path.join(TMP, `arena_${id}.pas`);
    const bin = path.join(TMP, `arena_${id}_pas`);
    fs.writeFileSync(src, code);
    const compiler = spawn('fpc', ['-o' + bin, src]);
    let stderr = '';
    compiler.stderr.on('data', d => { stderr += d; });
    compiler.stdout.on('data', d => { stderr += d; });
    compiler.on('close', exitCode => {
      try { fs.unlinkSync(src); } catch {}
      try { fs.unlinkSync(src.replace('.pas', '.o')); } catch {}
      if (exitCode !== 0) reject({ verdict: 'CE', message: stderr.trim() });
      else resolve(bin);
    });
    compiler.on('error', () => reject({ verdict: 'CE', message: 'Free Pascal compiler not found (fpc)' }));
  });
}

/* Run a process (binary or interpreter) with stdin and optional custom time limit */
const MAX_CAPTURE = 2 * 1024 * 1024; // runaway output must not eat the server's RAM
const HARD_OUTPUT_KILL = 8 * 1024 * 1024; // past this the process is a runaway — kill it
function runProcess(cmd, args, input, timeLimitMs) {
  const limit = timeLimitMs || TIME_LIMIT;
  return new Promise(resolve => {
    const start = Date.now();
    // detached:true puts the child in its own process group so a timeout can
    // SIGKILL the whole tree (a fork bomb or spawned subprocess can't survive).
    const proc = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: process.platform !== 'win32',
    });
    let stdout = '', stderr = '';
    let killed = false;
    let rawBytes = 0;

    const killTree = () => {
      killed = true;
      try {
        if (process.platform !== 'win32') process.kill(-proc.pid, 'SIGKILL');
        else proc.kill('SIGKILL');
      } catch { try { proc.kill('SIGKILL'); } catch {} }
    };

    const timer = setTimeout(killTree, limit);

    proc.stdout.on('data', d => {
      rawBytes += d.length;
      if (stdout.length < MAX_CAPTURE) stdout += d;
      if (rawBytes > HARD_OUTPUT_KILL) { clearTimeout(timer); killTree(); }
    });
    proc.stderr.on('data', d => {
      rawBytes += d.length;
      if (stderr.length < MAX_CAPTURE) stderr += d;
      if (rawBytes > HARD_OUTPUT_KILL) { clearTimeout(timer); killTree(); }
    });
    // Process can exit before we finish writing stdin (bad read pattern,
    // early crash) — an unhandled EPIPE here would take the server down.
    proc.stdin.on('error', () => {});
    proc.on('close', exitCode => {
      clearTimeout(timer);
      const timeMs = Date.now() - start;
      if (killed) {
        resolve({ stdout, stderr, exitCode: -1, timeMs, verdict: 'TLE' });
      } else if (exitCode !== 0) {
        resolve({ stdout, stderr, exitCode, timeMs, verdict: 'RE' });
      } else {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode, timeMs, verdict: null });
      }
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      const notFound = err.code === 'ENOENT';
      resolve({ stdout: '', stderr: notFound ? `RUNTIME_NOT_FOUND:${cmd}` : 'Execution error', exitCode: -1, timeMs: Date.now() - start, verdict: notFound ? 'RUNTIME_NOT_FOUND' : 'RE' });
    });

    try {
      proc.stdin.write(input || '');
      proc.stdin.end();
    } catch {}
  });
}

/* Legacy alias */
function runBinary(binPath, input) {
  return runProcess(binPath, [], input);
}

/* Run code in any supported language (local) */
async function _runLangLocal(code, input, lang = 'cpp') {
  const cleanup = (p) => { try { fs.unlinkSync(p); } catch {} };
  const cleanupDir = (p) => { try { fs.rmSync(p, { recursive: true }); } catch {} };
  const tl = getTimeLimit(lang);

  switch (lang) {
    case 'cpp': {
      const bin = await compileCpp(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'c': {
      const bin = await compileC(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'python': {
      const script = prepareScript(code, 'python');
      const result = await runProcess('python3', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'java': {
      const { classDir, className } = await compileJava(code);
      const result = await runProcess('java', ['-cp', classDir, className], input, tl);
      cleanupDir(classDir);
      return result;
    }
    case 'javascript': {
      const script = prepareScript(code, 'javascript');
      const result = await runProcess('node', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'typescript': {
      // tsx is globally installed — fast ~100ms execution
      const script = prepareScript(code, 'typescript');
      const result = await runProcess('tsx', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'csharp': {
      const { bin, runtime } = await compileCSharp(code);
      const result = runtime === 'mono'
        ? await runProcess('mono', [bin], input, tl)
        : await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'go': {
      const bin = await compileGo(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'rust': {
      const bin = await compileRust(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'kotlin': {
      // No local kotlinc? Use Kotlin Playground API
      if (!hasRuntime('kotlinc')) {
        return await remoteRun(code, input, "kotlin");
      }
      const jar = await compileKotlin(code);
      const result = await runProcess('java', ['-jar', jar], input, tl);
      cleanup(jar);
      return result;
    }
    case 'ruby': {
      const script = prepareScript(code, 'ruby');
      const result = await runProcess('ruby', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'php': {
      const script = prepareScript(code, 'php');
      const result = await runProcess('php', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'perl': {
      const script = prepareScript(code, 'perl');
      const result = await runProcess('perl', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'lua': {
      const script = prepareScript(code, 'lua');
      const result = await runProcess('lua', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'shell': {
      const script = prepareScript(code, 'shell');
      const result = await runProcess('bash', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'r': {
      const script = prepareScript(code, 'r');
      const result = await runProcess('Rscript', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'scala': {
      const script = prepareScript(code, 'scala');
      const result = await runProcess('scala', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'swift': {
      const bin = await compileSwift(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'dart': {
      const script = prepareScript(code, 'dart');
      const result = await runProcess('dart', ['run', script], input, tl);
      cleanup(script);
      return result;
    }
    case 'powershell': {
      const script = prepareScript(code, 'powershell');
      const result = await runProcess('pwsh', ['-NoProfile', '-File', script], input, tl);
      cleanup(script);
      return result;
    }
    case 'julia': {
      const script = prepareScript(code, 'julia');
      const result = await runProcess('julia', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'fsharp': {
      const script = prepareScript(code, 'fsharp');
      const result = await runProcess('dotnet', ['fsi', script], input, tl);
      cleanup(script);
      return result;
    }
    case 'clojure': {
      const script = prepareScript(code, 'clojure');
      const result = await runProcess('clojure', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'scheme': {
      const script = prepareScript(code, 'scheme');
      const result = await runProcess('guile', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'objectivec': {
      const bin = await compileObjectiveC(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'pascal': {
      const bin = await compilePascal(code);
      const result = await runProcess(bin, [], input, tl);
      cleanup(bin);
      return result;
    }
    case 'elixir': {
      const script = prepareScript(code, 'elixir');
      const result = await runProcess('elixir', [script], input, tl);
      cleanup(script);
      return result;
    }
    case 'tcl': {
      const script = prepareScript(code, 'tcl');
      const result = await runProcess('tclsh', [script], input, tl);
      cleanup(script);
      return result;
    }
    default: {
      // For any unsupported / extra languages, try running as a script with common interpreters
      throw { verdict: 'CE', message: `Unsupported language: ${lang}. Available: ${Object.keys(LANG_CONFIG).join(', ')}` };
    }
  }
}

/* On a public server, never execute user code on the host itself: set
   JUDGE_MODE=remote and every run goes to Wandbox / Kotlin Playground.
   In production we default to remote-only unless an operator explicitly opts
   into local execution (JUDGE_MODE=local) — host RCE is not a safe default. */
const IS_PROD = process.env.NODE_ENV === 'production';
const REMOTE_ONLY = process.env.JUDGE_MODE
  ? process.env.JUDGE_MODE === 'remote'
  : IS_PROD;
const remoteUnavailable = (lang) => ({
  verdict: 'CE',
  message: `${lang} is not available on the hosted server yet — pick another language.`,
});

/* Smart run: try local first, fallback to Wandbox/Kotlin Playground if runtime not found */
async function runLang(code, input, lang = 'cpp') {
  if (REMOTE_ONLY) {
    if (hasRemote(lang)) return await remoteRun(code, input, lang);
    throw remoteUnavailable(lang);
  }
  try {
    const result = await _runLangLocal(code, input, lang);
    // If local runtime was not found, try remote
    if (result.verdict === 'RUNTIME_NOT_FOUND' && hasRemote(lang)) {
      return await remoteRun(code, input, lang);
    }
    return result;
  } catch (e) {
    // Compile error with "not found" or "unable to locate" → try remote
    if (e.verdict === 'CE' && e.message && (/not found|unable to locate|no such file|timed out|Unsupported language/i.test(e.message)) && hasRemote(lang)) {
      return await remoteRun(code, input, lang);
    }
    throw e;
  }
}

/* ========== Output comparison ========== */
/* Judges normalise before comparing: CRLF, trailing blanks on each line and a
   trailing newline are never the difference between AC and WA. */
function normalizeOut(s) {
  return String(s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n+$/, '');
}
function compareOutput(expected, actual) {
  return normalizeOut(expected) === normalizeOut(actual);
}

/* Roll per-testcase verdicts up into one overall verdict. */
function overallVerdict(results) {
  if (results.every(r => r.passed)) return 'AC';
  for (const v of ['CE', 'TLE', 'RE']) {
    if (results.some(r => r.verdict === v)) return v;
  }
  return 'WA';
}

/* Shape one remote/local run into the result object the client renders. */
function toResult(tc, run, i) {
  const passed = run.verdict ? false : compareOutput(tc.expected_output, run.stdout);
  return {
    id: tc.id,
    label: tc.label || `Test ${i + 1}`,
    input: tc.input,
    expected: tc.expected_output,
    actual: run.stdout,
    stderr: run.stderr,
    timeMs: run.timeMs,
    engine: run.engine || 'local',
    cached: run.cached === true,
    verdict: run.verdict || (passed ? 'AC' : 'WA'),
    passed,
  };
}

/* How many remote runs may be in flight at once. Every testcase is a full
   remote *compile*, so the only way to keep a 10-case submission quick is to
   overlap them; the sandboxes tolerate this comfortably and 429s are retried. */
const REMOTE_CONCURRENCY = Number(process.env.JUDGE_CONCURRENCY) || 6;

/**
 * Judge every testcase on a remote sandbox.
 *
 * Three things keep this quick:
 *
 *   • Identical inputs are executed once and the result shared, so duplicated
 *     samples and repeated edge cases cost nothing.
 *   • Every remaining input is fired in one wave (capped by REMOTE_CONCURRENCY)
 *     rather than a probe followed by the rest. Each testcase is a full remote
 *     *compile* — 44s for Rust, 43s for Haskell on a cold sandbox — so making
 *     the first one finish before starting the others would literally double
 *     the wait for every correct submission.
 *   • The first input still doubles as a compile probe: the moment it comes
 *     back with a compile error we answer, without waiting on the rest. Those
 *     requests are already in flight and simply get discarded, which trades a
 *     few wasted compiles on a broken build for halving the latency of every
 *     working one.
 */
async function _judgeRemote(code, testcases, lang) {
  if (!hasRemote(lang)) {
    return {
      verdict: 'CE',
      compileError: `Language "${lang}" has no local runtime and no remote sandbox.`,
      results: [],
    };
  }
  if (!testcases.length) return { verdict: 'AC', compileError: null, results: [] };

  // Unique inputs, in first-seen order.
  const order = [];
  const seen = new Set();
  testcases.forEach((tc) => {
    const key = tc.input ?? '';
    if (!seen.has(key)) { seen.add(key); order.push(key); }
  });

  const runs = new Array(order.length);
  let announceProbe;
  const probeReady = new Promise((resolve) => { announceProbe = resolve; });

  const all = promisePool(
    order.map((input, i) => async () => {
      const r = await remoteRun(code, input, lang);
      runs[i] = r;
      if (i === 0) announceProbe(r);
      return r;
    }),
    REMOTE_CONCURRENCY,
  );

  // The first task starts in the first batch, so this settles after roughly one
  // compile. Racing against `all` means a pool that finished some other way can
  // never leave us waiting forever.
  const probe = await Promise.race([probeReady, all.then(() => runs[0])]);
  if (probe && probe.verdict === 'CE') {
    all.catch(() => {}); // the in-flight runs are no longer interesting
    return { verdict: 'CE', compileError: probe.stderr, results: [], engine: probe.engine };
  }

  await all;

  const byInput = new Map(order.map((input, i) => [input, runs[i]]));
  // A compile error can still surface on a later case (a flaky first run served
  // from cache, say) — treat it the same way.
  const ce = runs.find((r) => r && r.verdict === 'CE');
  if (ce) return { verdict: 'CE', compileError: ce.stderr, results: [], engine: ce.engine };

  const results = testcases.map((tc, i) => toResult(tc, byInput.get(tc.input ?? ''), i));
  return {
    verdict: overallVerdict(results),
    compileError: null,
    engine: (probe && probe.engine) || engineFor(lang),
    results,
  };
}

async function judge(code, testcases, lang = 'cpp') {
  const cfg = LANG_CONFIG[lang];
  if (!cfg) return { verdict: 'CE', compileError: `Unsupported language: ${lang}`, results: [] };

  if (REMOTE_ONLY) {
    if (hasRemote(lang)) return await _judgeRemote(code, testcases, lang);
    return { verdict: 'CE', compileError: remoteUnavailable(lang).message, results: [] };
  }
  // No local toolchain wired up for this language — go straight to a sandbox.
  const LOCAL_SUPPORTED = ['cpp','c','java','csharp','go','rust','kotlin','swift','objectivec','pascal','scala',
    'python','javascript','typescript','ruby','php','perl','lua','shell','r','dart','powershell','julia','fsharp','clojure','scheme','elixir','tcl'];
  if (!LOCAL_SUPPORTED.includes(lang)) {
    return hasRemote(lang) ? await _judgeRemote(code, testcases, lang) : { verdict: 'CE', compileError: `No runner for ${lang}`, results: [] };
  }

  // === Compiled languages: compile once, run binary per testcase ===
  if (cfg.compiled) {
    let binInfo;
    try {
      switch (lang) {
        case 'cpp':    binInfo = { type: 'bin', path: await compileCpp(code) }; break;
        case 'c':      binInfo = { type: 'bin', path: await compileC(code) }; break;
        case 'java':   binInfo = { type: 'java', ...(await compileJava(code)) }; break;
        case 'csharp': binInfo = { type: 'mono', ...(await compileCSharp(code)) }; break;
        case 'go':     binInfo = { type: 'bin', path: await compileGo(code) }; break;
        case 'rust':   binInfo = { type: 'bin', path: await compileRust(code) }; break;
        case 'kotlin': binInfo = { type: 'jar', path: await compileKotlin(code) }; break;
        case 'swift':      binInfo = { type: 'bin', path: await compileSwift(code) }; break;
        case 'objectivec': binInfo = { type: 'bin', path: await compileObjectiveC(code) }; break;
        case 'pascal':     binInfo = { type: 'bin', path: await compilePascal(code) }; break;
        case 'scala':  binInfo = { type: 'script', path: prepareScript(code, lang), cmd: 'scala' }; break;
        default: return hasRemote(lang) ? await _judgeRemote(code, testcases, lang) : { verdict: 'CE', compileError: `No compiler for ${lang}`, results: [] };
      }
    } catch (e) {
      // If compiler not found, fallback to remote
      if (e.message && /not found|unable to locate|no such file|timed out/i.test(e.message) && hasRemote(lang)) {
        return await _judgeRemote(code, testcases, lang);
      }
      return { verdict: 'CE', compileError: e.message, results: [] };
    }

    const results = [];
    const tl = getTimeLimit(lang);
    for (let i = 0; i < testcases.length; i++) {
      const tc = testcases[i];
      let run;
      switch (binInfo.type) {
        case 'bin':    run = await runProcess(binInfo.path, [], tc.input, tl); break;
        case 'java':   run = await runProcess('java', ['-cp', binInfo.classDir, binInfo.className], tc.input, tl); break;
        case 'mono':   run = await runProcess('mono', [binInfo.bin], tc.input, tl); break;
        case 'jar':    run = await runProcess('java', ['-jar', binInfo.path], tc.input, tl); break;
        case 'script': run = await runProcess(binInfo.cmd, [binInfo.path], tc.input, tl); break;
      }
      results.push(toResult(tc, run, i));
    }
    // Cleanup
    try {
      if (binInfo.type === 'java') fs.rmSync(binInfo.classDir, { recursive: true });
      else if (binInfo.path) fs.unlinkSync(binInfo.path);
      if (binInfo.bin) fs.unlinkSync(binInfo.bin);
    } catch {}

    return { verdict: overallVerdict(results), compileError: null, engine: 'local', results };
  }

  // === Interpreted languages: prepare script once, run per testcase ===
  const interpreterMap = {
    python: 'python3', javascript: 'node', typescript: 'tsx',
    ruby: 'ruby', php: 'php', perl: 'perl', lua: 'lua',
    shell: 'bash', r: 'Rscript', dart: ['dart', 'run'],
    powershell: ['pwsh', '-NoProfile', '-File'],
    julia: 'julia', fsharp: ['dotnet', 'fsi'],
    clojure: 'clojure', scheme: 'guile',
    elixir: 'elixir', tcl: 'tclsh',
  };

  // Check if interpreter is available locally; if not, use remote
  const interp = interpreterMap[lang];
  const primaryCmd = Array.isArray(interp) ? interp[0] : (interp || 'node');
  if (!hasRuntime(primaryCmd) && hasRemote(lang)) {
    return await _judgeRemote(code, testcases, lang);
  }

  const script = prepareScript(code, lang);
  let cmd, cmdArgs;
  if (Array.isArray(interp)) { cmd = interp[0]; cmdArgs = [...interp.slice(1), script]; }
  else { cmd = interp || 'node'; cmdArgs = [script]; }

  const results = [];
  const tl = getTimeLimit(lang);
  for (let i = 0; i < testcases.length; i++) {
    const tc = testcases[i];
    const run = await runProcess(cmd, cmdArgs, tc.input, tl);

    // If runtime not found on first test, switch to remote
    if (run.verdict === 'RUNTIME_NOT_FOUND' && i === 0 && hasRemote(lang)) {
      try { fs.unlinkSync(script); } catch {}
      return await _judgeRemote(code, testcases, lang);
    }

    results.push(toResult(tc, run, i));
  }
  try { fs.unlinkSync(script); } catch {}

  return { verdict: overallVerdict(results), compileError: null, engine: 'local', results };
}

/* Quick run: compile and run with custom input (multi-language) */
async function quickRun(code, input, lang = 'cpp') {
  try {
    const run = await runLang(code, input, lang);
    return {
      ok: !run.verdict,
      verdict: run.verdict || 'OK',
      output: run.stdout,
      stderr: run.stderr,
      timeMs: run.timeMs,
      engine: run.engine || 'local',
      cached: run.cached === true,
    };
  } catch (e) {
    return { ok: false, verdict: 'CE', error: e.message, output: '', stderr: '' };
  }
}

module.exports = {
  judge, quickRun, compileCpp, runBinary, runProcess, runLang, normalizeCpp,
  LANG_CONFIG, LANG_TIME_LIMIT, hasRemote, engineFor, REMOTE_ONLY,
  compareOutput, normalizeOut, overallVerdict, clearRemoteCache, clearRuntimeCache,
};
