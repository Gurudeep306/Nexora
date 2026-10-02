"""
Shared helpers for the Learn track's judged coding problems.

Every topic lives in problems/<topic>.py and calls add() once per problem.
Tests are never hand-typed: each problem has a Python reference `solve`
that produces the expected output for every input, so the data is always
right. Inputs are edge cases listed by hand plus random ones from a fixed
seed, so the files are reproducible.

The written solution for a problem lives next to it on disk:

    scripts/learn/solutions/<topic>/<slug>/
        editorial.md   intuition → approach → proof → complexity → pitfalls
        main.cpp  Main.java  main.py  main.js  main.c

build.py embeds them in the JSON; verify.py compiles and runs all five
against every test. See client/src/learn/AUTHORING.md.
"""
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
SOL_DIR = os.path.join(HERE, 'solutions')
LANG_FILES = {'cpp': 'main.cpp', 'java': 'Main.java', 'python': 'main.py', 'js': 'main.js', 'c': 'main.c'}

# Random tests stay small so the judge is quick; problems where a slow
# answer should fail also get one large test.
SIZE = 1200
LARGE = 20000

# Per-problem limits: the tests are sent to the browser and run on a free
# remote sandbox, so keep them lean.
MAX_TESTS = 25
MAX_BYTES = 800 * 1024  # aim for ≤ 200 KB; only a performance test needs more

problems = []
_slugs = set()


def fmt(xs):
    return ' '.join(map(str, xs))


def ints(s):
    return list(map(int, s.split()))


def lines_of(s):
    return [l for l in s.strip().split('\n')]


def arr_input(a, extra_before='', extra_after=''):
    head = f"{len(a)}" + (f" {extra_before}" if extra_before else '')
    s = head + "\n" + fmt(a) + "\n"
    if extra_after:
        s += extra_after + "\n"
    return s


def gen_queries(vals):
    return f"{len(vals)}\n" + '\n'.join(map(str, vals)) + '\n'


N_SPEC = '<p>The first line contains <code>n</code> (1 ≤ n ≤ 2·10<sup>5</sup>). The second line contains n integers.</p>'


def _read(path):
    try:
        with open(path, encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return None


def add(slug, title, topic, page, rating, tags, statement, inp, outp, solve, samples, edge, rand, n_rand=7, large=None):
    """
    slug       unique id, '<topic-prefix>-c-<name>' (e.g. 'll-c-reverse')
    page       id of the lesson page this problem practises
    rating     Codeforces-style difficulty 800..3000
    statement  HTML (may use <code>, <sup>, <b>, $…$ is NOT rendered — use HTML)
    solve      fn(input_str) -> output_str (the reference solution)
    samples    inputs shown in the statement
    edge       hand-written edge-case inputs (hidden tests)
    rand       fn() -> input_str, called n_rand times
    large      optional fn() -> one big input (performance test)
    """
    assert slug not in _slugs, f'duplicate slug {slug}'
    _slugs.add(slug)
    assert samples, f'{slug}: needs at least one sample'
    tests = []
    for s in edge + [rand() for _ in range(n_rand)] + ([large()] if large else []):
        tests.append({'input': s, 'output': solve(s)})
    assert len(tests) <= MAX_TESTS, f'{slug}: {len(tests)} tests (max {MAX_TESTS})'
    size = sum(len(t['input']) + len(t['output']) for t in tests)
    assert size <= MAX_BYTES, f'{slug}: tests are {size // 1024} KB (max {MAX_BYTES // 1024} KB) — shrink the random/large inputs'
    folder = os.path.join(SOL_DIR, topic, slug)
    solutions = {}
    for lang, name in LANG_FILES.items():
        code = _read(os.path.join(folder, name))
        if code is not None:
            solutions[lang] = code
    problems.append({
        'slug': slug, 'title': title, 'topic': topic, 'page': page, 'difficulty': rating, 'tags': tags,
        'statement': statement, 'input_spec': inp, 'output_spec': outp,
        'samples': [{'input': s, 'output': solve(s)} for s in samples],
        'tests': tests, 'time_limit': '2 seconds', 'memory_limit': '256 MB',
        'editorial': _read(os.path.join(folder, 'editorial.md')),
        'solutions': solutions,
    })
