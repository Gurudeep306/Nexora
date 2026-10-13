#!/usr/bin/env python3
"""Print the next wave of not-yet-done batches as workflow args JSON.

    python3 scripts/gate/bulk/next-wave.py [count]   (default 30)

A batch is done when every one of its ids has a solution in the paper's
canonical src/gate/solutions/<paper>.json.
"""
import json, os, sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', '..')
batches = json.load(open(os.path.join(ROOT, 'scripts/gate/bulk/batches.json')))
sol_dir = os.path.join(ROOT, 'src/gate/solutions')
solved = {}
for f in os.listdir(sol_dir):
    if f.endswith('.json') and '.part-' not in f:
        solved[f[:-5]] = set(json.load(open(os.path.join(sol_dir, f)))['solutions'])
todo = [b for b in batches if not set(b['ids']) <= solved.get(b['paper'], set())]
count = int(sys.argv[1]) if len(sys.argv) > 1 else 30
print(json.dumps({'batches': todo[:count]}))
print(f'{len(todo)} batches remaining', file=sys.stderr)
