const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const TMP = os.tmpdir();
const TIME_LIMIT = 5000; // 5 seconds

/* ========== Language Configs ========== */
const LANG_CONFIG = {
  cpp: { ext: 'cpp', compiled: true, label: 'C++20' },
  python: { ext: 'py', compiled: false, label: 'Python 3' },
  java: { ext: 'java', compiled: true, label: 'Java' },
  javascript: { ext: 'js', compiled: false, label: 'JavaScript' },
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
    code = headers + '\n' + code;
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
    // Extract public class name or use Main
    const classMatch = code.match(/public\s+class\s+(\w+)/);
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

/* Prepare script-based language (Python/JS), return { scriptPath } */
function prepareScript(code, lang) {
  const id = crypto.randomBytes(8).toString('hex');
  const ext = LANG_CONFIG[lang].ext;
  const scriptPath = path.join(TMP, `arena_${id}.${ext}`);
  fs.writeFileSync(scriptPath, code);
  return scriptPath;
}

/* Run a process (binary or interpreter) with stdin */
function runProcess(cmd, args, input) {
  return new Promise(resolve => {
    const start = Date.now();
    const proc = spawn(cmd, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, TIME_LIMIT);

    proc.stdout.on('data', d => { stdout += d; });
    proc.stderr.on('data', d => { stderr += d; });
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
    proc.on('error', () => {
      clearTimeout(timer);
      resolve({ stdout: '', stderr: 'Execution error', exitCode: -1, timeMs: Date.now() - start, verdict: 'RE' });
    });

    proc.stdin.write(input || '');
    proc.stdin.end();
  });
}

/* Legacy alias */
function runBinary(binPath, input) {
  return runProcess(binPath, [], input);
}

/* Run code in any supported language */
async function runLang(code, input, lang = 'cpp') {
  switch (lang) {
    case 'cpp': {
      const bin = await compileCpp(code);
      const result = await runProcess(bin, [], input);
      try { fs.unlinkSync(bin); } catch {}
      return result;
    }
    case 'python': {
      const script = prepareScript(code, 'python');
      const result = await runProcess('python3', [script], input);
      try { fs.unlinkSync(script); } catch {}
      return result;
    }
    case 'java': {
      const { classDir, className } = await compileJava(code);
      const result = await runProcess('java', ['-cp', classDir, className], input);
      try { fs.rmSync(classDir, { recursive: true }); } catch {}
      return result;
    }
    case 'javascript': {
      const script = prepareScript(code, 'javascript');
      const result = await runProcess('node', [script], input);
      try { fs.unlinkSync(script); } catch {}
      return result;
    }
    default:
      throw { verdict: 'CE', message: `Unsupported language: ${lang}` };
  }
}

/* Compare expected vs actual output */
function compareOutput(expected, actual) {
  const normalize = s => s.split('\n').map(l => l.trimEnd()).join('\n').trim();
  return normalize(expected) === normalize(actual);
}

/* Judge: compile/run against all test cases (multi-language) */
async function judge(code, testcases, lang = 'cpp') {
  // For compiled languages, compile once then run binary multiple times
  if (lang === 'cpp' || lang === 'java') {
    let binInfo;
    try {
      if (lang === 'cpp') {
        binInfo = { type: 'cpp', bin: await compileCpp(code) };
      } else {
        binInfo = { type: 'java', ...(await compileJava(code)) };
      }
    } catch (e) {
      return { verdict: 'CE', compileError: e.message, results: [] };
    }

    const results = [];
    let allPassed = true;
    for (let i = 0; i < testcases.length; i++) {
      const tc = testcases[i];
      const run = binInfo.type === 'cpp'
        ? await runProcess(binInfo.bin, [], tc.input)
        : await runProcess('java', ['-cp', binInfo.classDir, binInfo.className], tc.input);
      const passed = run.verdict ? false : compareOutput(tc.expected_output, run.stdout);
      if (!passed) allPassed = false;
      results.push({
        id: tc.id,
        label: tc.label || `Test ${i + 1}`,
        input: tc.input,
        expected: tc.expected_output,
        actual: run.stdout,
        stderr: run.stderr,
        timeMs: run.timeMs,
        verdict: run.verdict || (passed ? 'AC' : 'WA'),
        passed,
      });
    }
    // Cleanup
    if (binInfo.type === 'cpp') { try { fs.unlinkSync(binInfo.bin); } catch {} }
    else { try { fs.rmSync(binInfo.classDir, { recursive: true }); } catch {} }

    return {
      verdict: allPassed ? 'AC' : results.find(r => r.verdict === 'TLE') ? 'TLE'
        : results.find(r => r.verdict === 'RE') ? 'RE' : 'WA',
      compileError: null,
      results,
    };
  }

  // For interpreted languages (Python, JavaScript) - prepare script once
  const script = prepareScript(code, lang);
  const interpreter = lang === 'python' ? 'python3' : 'node';
  const results = [];
  let allPassed = true;
  for (let i = 0; i < testcases.length; i++) {
    const tc = testcases[i];
    const run = await runProcess(interpreter, [script], tc.input);
    const passed = run.verdict ? false : compareOutput(tc.expected_output, run.stdout);
    if (!passed) allPassed = false;
    results.push({
      id: tc.id,
      label: tc.label || `Test ${i + 1}`,
      input: tc.input,
      expected: tc.expected_output,
      actual: run.stdout,
      stderr: run.stderr,
      timeMs: run.timeMs,
      verdict: run.verdict || (passed ? 'AC' : 'WA'),
      passed,
    });
  }
  try { fs.unlinkSync(script); } catch {}

  return {
    verdict: allPassed ? 'AC' : results.find(r => r.verdict === 'TLE') ? 'TLE'
      : results.find(r => r.verdict === 'RE') ? 'RE' : 'WA',
    compileError: null,
    results,
  };
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
    };
  } catch (e) {
    return { ok: false, verdict: 'CE', error: e.message, output: '', stderr: '' };
  }
}

module.exports = { judge, quickRun, compileCpp, runBinary, runProcess, runLang, normalizeCpp, LANG_CONFIG };
