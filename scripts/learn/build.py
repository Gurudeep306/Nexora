"""
Builds src/learn/problems/<topic>.json from problems/<topic>.py and the
written solutions in solutions/<topic>/.

    python3 scripts/learn/build.py                 # every topic
    python3 scripts/learn/build.py linked-lists    # one topic
    python3 scripts/learn/build.py --strict graphs # fail if any editorial/solution is missing
"""
import importlib.util
import json
import os
import random
import sys
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib  # noqa: E402

OUT_DIR = os.path.join(HERE, '..', '..', 'src', 'learn', 'problems')


def build(topic, strict=False):
    path = os.path.join(HERE, 'problems', f'{topic}.py')
    lib.problems.clear()
    lib._slugs.clear()
    random.seed(zlib.crc32(topic.encode()))
    spec = importlib.util.spec_from_file_location(f'problems_{topic.replace("-", "_")}', path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    probs = list(lib.problems)
    bad = [p['slug'] for p in probs if p['topic'] != topic]
    assert not bad, f'{topic}: problems with a different topic field: {bad}'
    missing = []
    for p in probs:
        need = [k for k in lib.LANG_FILES if k not in p['solutions']] + ([] if p['editorial'] else ['editorial'])
        if need:
            missing.append(f"{p['slug']} ({', '.join(need)})")
    if missing:
        msg = f'{topic}: {len(missing)} problem(s) missing written solutions: ' + '; '.join(missing[:8]) + (' …' if len(missing) > 8 else '')
        if strict:
            raise SystemExit(msg)
        print('  ! ' + msg)
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f'{topic}.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'version': 2, 'topic': topic, 'problems': probs}, f, separators=(',', ':'), ensure_ascii=False)
    print(f"{topic}: {len(probs)} problems, {sum(len(p['tests']) for p in probs)} tests, {os.path.getsize(out) // 1024} KB")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    strict = '--strict' in sys.argv
    topics = args or sorted(f[:-3] for f in os.listdir(os.path.join(HERE, 'problems')) if f.endswith('.py') and not f.startswith('_'))
    for t in topics:
        build(t, strict)


if __name__ == '__main__':
    main()
