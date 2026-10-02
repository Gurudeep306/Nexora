"""
Compiles every written solution (C++, Java, Python, JavaScript, C) of a
topic's problems and runs each against all samples and hidden tests, with
the same output normalisation as the judge. Run build.py first.

    python3 scripts/learn/verify.py linked-lists
    python3 scripts/learn/verify.py graphs --slug gr-c-bfs --lang cpp,java
    python3 scripts/learn/verify.py arrays -j 4

Exit code 1 if anything is missing, fails to compile, crashes, times out or
prints a wrong answer.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, '..', '..', 'src', 'learn', 'problems')
LANGS = ['cpp', 'java', 'python', 'js', 'c']
FILES = {'cpp': 'main.cpp', 'java': 'Main.java', 'python': 'main.py', 'js': 'main.js', 'c': 'main.c'}
REQUIRED_SECTIONS = ['## Intuition', '## Approach', '## Complexity']


def norm(s):
    s = (s or '').replace('\r\n', '\n').replace('\r', '\n')
    return re.sub(r'\n+$', '', '\n'.join(l.rstrip(' \t') for l in s.split('\n')))


def compile_sol(lang, code, d):
    path = os.path.join(d, FILES[lang])
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    if lang == 'cpp':
        r = subprocess.run(['g++', '-O2', '-std=c++17', '-o', os.path.join(d, 'a.out'), path], capture_output=True, text=True)
        return r.returncode == 0, r.stderr, [os.path.join(d, 'a.out')]
    if lang == 'c':
        r = subprocess.run(['gcc', '-O2', '-std=c11', '-o', os.path.join(d, 'c.out'), path, '-lm'], capture_output=True, text=True)
        return r.returncode == 0, r.stderr, [os.path.join(d, 'c.out')]
    if lang == 'java':
        r = subprocess.run(['javac', '-encoding', 'UTF-8', '-d', d, path], capture_output=True, text=True)
        err = '\n'.join(l for l in r.stderr.split('\n') if 'JAVA_TOOL_OPTIONS' not in l)
        return r.returncode == 0, err, ['java', '-Xss256m', '-cp', d, 'Main']
    if lang == 'python':
        r = subprocess.run([sys.executable, '-m', 'py_compile', path], capture_output=True, text=True)
        return r.returncode == 0, r.stderr, [sys.executable, path]
    if lang == 'js':
        r = subprocess.run(['node', '--check', path], capture_output=True, text=True)
        return r.returncode == 0, r.stderr, ['node', '--stack-size=65500', path]
    raise ValueError(lang)


def check(p, lang, timeout):
    code = (p.get('solutions') or {}).get(lang)
    if not code:
        return (p['slug'], lang, 'MISSING', '')
    d = tempfile.mkdtemp(prefix='learnv-')
    try:
        ok, err, cmd = compile_sol(lang, code, d)
        if not ok:
            return (p['slug'], lang, 'CE', err[:600])
        cases = [('sample', t) for t in p['samples']] + [('test', t) for t in p['tests']]
        worst = 0.0
        for k, (kind, t) in enumerate(cases):
            t0 = time.time()
            try:
                r = subprocess.run(cmd, input=t['input'], capture_output=True, text=True, timeout=timeout)
            except subprocess.TimeoutExpired:
                return (p['slug'], lang, 'TLE', f'{kind} #{k} exceeded {timeout}s')
            worst = max(worst, time.time() - t0)
            if r.returncode != 0:
                return (p['slug'], lang, 'RE', f'{kind} #{k}: exit {r.returncode}\n{r.stderr[-500:]}')
            if norm(r.stdout) != norm(t['output']):
                exp = norm(t['output'])
                got = norm(r.stdout)
                return (p['slug'], lang, 'WA', f'{kind} #{k}\n  input:    {t["input"][:200]!r}\n  expected: {exp[:200]!r}\n  got:      {got[:200]!r}')
        return (p['slug'], lang, 'OK', f'{worst:.2f}s')
    finally:
        shutil.rmtree(d, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('topics', nargs='+')
    ap.add_argument('--slug', action='append')
    ap.add_argument('--lang', default=','.join(LANGS))
    ap.add_argument('-j', type=int, default=3)
    ap.add_argument('--timeout', type=float, default=10.0)
    a = ap.parse_args()
    langs = a.lang.split(',')
    jobs, problems = [], []
    for topic in a.topics:
        with open(os.path.join(OUT_DIR, f'{topic}.json'), encoding='utf-8') as f:
            for p in json.load(f)['problems']:
                if a.slug and p['slug'] not in a.slug:
                    continue
                problems.append(p)
                jobs += [(p, l) for l in langs]
    problems_bad = []
    for p in problems:
        ed = p.get('editorial') or ''
        missing = [s for s in REQUIRED_SECTIONS if s not in ed]
        if missing:
            problems_bad.append(f"{p['slug']}: editorial missing {', '.join(missing)}" if ed else f"{p['slug']}: no editorial.md")
    with ThreadPoolExecutor(a.j) as ex:
        results = list(ex.map(lambda j: check(j[0], j[1], a.timeout), jobs))
    fails = [r for r in results if r[2] != 'OK']
    for slug, lang, st, msg in fails:
        print(f'✗ {slug} [{lang}] {st}' + (f'\n  {msg}' if msg else ''))
    for m in problems_bad:
        print(f'✗ {m}')
    ok = len(results) - len(fails)
    print(f'\n{len(problems)} problems · {ok}/{len(results)} solution runs passed · {len(problems_bad)} editorial issues')
    sys.exit(1 if fails or problems_bad else 0)


if __name__ == '__main__':
    main()
