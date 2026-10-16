#!/usr/bin/env python3
"""Run the GATE Notes verification scripts.

Every content/gate-notes/_checks/<subject>/*.py is run in its own
interpreter (python -B, cwd = the repo root). A check passes by exiting 0; an
AssertionError, any other exception or a non-zero exit fails it. Checks verify
the maths behind lessons and practice answers (sympy is available).

    python3 scripts/gate-notes/run_checks.py            # every subject
    python3 scripts/gate-notes/run_checks.py demo dl    # some subjects

Exit status: 0 when every check passes, 1 otherwise.
"""
import os
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CHECKS = os.path.join(ROOT, "content", "gate-notes", "_checks")


def main(argv):
    only = set(argv)
    if not os.path.isdir(CHECKS):
        print(f"no checks directory at {os.path.relpath(CHECKS, ROOT)}")
        return 1
    scripts = []
    for subject in sorted(os.listdir(CHECKS)):
        d = os.path.join(CHECKS, subject)
        if not os.path.isdir(d) or subject.startswith((".", "_")) or (only and subject not in only):
            continue
        scripts += [os.path.join(d, f) for f in sorted(os.listdir(d)) if f.endswith(".py") and not f.startswith("_")]
    if not scripts:
        print("no checks found")
        return 1

    failed = 0
    for path in scripts:
        name = os.path.relpath(path, ROOT)
        r = subprocess.run([sys.executable, "-B", path], cwd=ROOT, capture_output=True, text=True, timeout=300)
        if r.returncode == 0:
            print(f"  ✓ {name}")
            continue
        failed += 1
        print(f"  ✗ {name}")
        for line in (r.stdout + r.stderr).strip().splitlines()[-15:]:
            print(f"      {line}")
    print(f"\n{len(scripts) - failed}/{len(scripts)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
