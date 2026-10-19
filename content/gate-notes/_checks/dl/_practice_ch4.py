"""Put one lesson's practice questions into Chapter 4's practice.json (the only source of truth).

    python3 content/gate-notes/_checks/dl/_practice_ch4.py <questions.json>

<questions.json> is a JSON list of questions whose ids all start with the same nx-dl-04-NN- prefix.
Every question of that lesson already in practice.json is replaced by the new list; other lessons'
questions are kept. The file is rewritten sorted by id under an exclusive lock, so lessons can be
written in parallel.
"""
import fcntl
import json
import pathlib
import re
import sys

PRACTICE = pathlib.Path(__file__).resolve().parents[2] / "dl" / "04-arithmetic-circuits" / "practice.json"


def put(new):
    prefixes = {re.match(r"^(nx-dl-04-\d\d-)q\d\d$", q["id"]).group(1) for q in new}
    assert len(prefixes) == 1, f"one lesson at a time (got {sorted(prefixes)})"
    prefix = prefixes.pop()
    with open(PRACTICE.with_suffix(".lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        cur = json.loads(PRACTICE.read_text()) if PRACTICE.exists() else []
        keep = [q for q in cur if not q["id"].startswith(prefix)]
        out = sorted(keep + new, key=lambda q: q["id"])
        PRACTICE.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    PRACTICE.with_suffix(".lock").unlink(missing_ok=True)
    print(f"practice.json: {len(new)} questions for {prefix}*, {len(out)} in the chapter")


if __name__ == "__main__":
    put(json.loads(pathlib.Path(sys.argv[1]).read_text()))
