"""Structural check for the Chapter 1 lessons (the house style in content/gate-notes/_style.md):

- every top-level block has a stable #id and an explicit depth (quick | standard | deep);
- every "Worked examples" section has at least 4 step-format examples, each with a final answer;
- every PYQ the outline assigns to a lesson is embedded with tests="…", and nothing else is;
- every practice question of a lesson is embedded in it, and each lesson has at least 8;
- every lesson has at least one quick summary and a GATE radar table.

Prints a size report (words, worked examples, viz scenes, PYQs) per lesson.
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import numlib as nl  # noqa: E402

OUTLINE = (nl.CONTENT / "_outline.md").read_text()
LESSONS = {
    "01-place-value.md": "dl-01-01-place-value",
    "02-power-of-two-bases.md": "dl-01-02-power-of-two-bases",
    "03-fractions-fixed-point.md": "dl-01-03-fractions-fixed-point",
    "04-signed-numbers.md": "dl-01-04-signed-numbers",
    "05-floating-point-basics.md": "dl-01-05-floating-point-basics",
    "06-ieee-754.md": "dl-01-06-ieee-754",
    "07-floating-point-arithmetic.md": "dl-01-07-floating-point-arithmetic",
    "08-codes.md": "dl-01-08-codes",
}
OPEN = re.compile(r"^(:{3,})([a-z]+)(\{.*\})?\s*$")
CLOSE = re.compile(r"^(:{3,})\s*$")


def outline_pyqs(plan_id):
    sec = OUTLINE.split(f"### {plan_id} ")[1].split("\n### ")[0].split("\n## ")[0]
    line = next(l for l in sec.splitlines() if l.startswith("- PYQs"))
    return re.findall(r"`([a-z0-9-]+)`", line)


practice = json.loads((nl.CH1 / "practice.json").read_text())
report, problems = [], []
for fname, plan_id in LESSONS.items():
    f = nl.CH1 / fname
    if not f.exists():
        continue
    src = f.read_text()
    fm, body = src.split("\n---\n", 1)
    lines = body.splitlines()
    stack, examples, sections = [], [], []
    viz, pyqs, prac = [], [], []
    section = None
    in_math = False
    for n, line in enumerate(lines, 1):
        if line.strip().startswith("$$"):
            if not (line.strip() != "$$" and line.strip().endswith("$$") and len(line.strip()) > 4):
                in_math = not in_math
            continue
        if in_math:
            continue
        if line.startswith("## ") or line.startswith("### "):
            section = line.strip("# ").strip()
            continue
        m = OPEN.match(line)
        if m:
            name, attrs = m.group(2), m.group(3) or ""
            if not stack:
                if name in ("pyq", "practice"):
                    if "depth=" not in attrs:
                        problems.append(f"{fname}: :::{name} {attrs} has no depth")
                elif "#" not in attrs or "depth=" not in attrs:
                    problems.append(f"{fname}:{n}: top-level :::{name} needs #id and depth ({attrs})")
                if name == "example":
                    examples.append({"section": section, "steps": 0, "answer": False, "attrs": attrs})
                if name == "viz":
                    viz.append(re.search(r'spec="([^"]+)"', attrs).group(1) + ("*" if 'mode="animate"' in attrs else ""))
                if name == "pyq":
                    pyqs.append((re.search(r'id="([^"]+)"', attrs).group(1), re.search(r'tests="([^"]*)"', attrs)))
                if name == "practice":
                    prac.append(re.search(r'id="([^"]+)"', attrs).group(1))
            elif name == "step":
                examples[-1]["steps"] += 1
            elif name == "answer" and stack[-1] == "example":
                examples[-1]["answer"] = True
            stack.append(name)
            continue
        if CLOSE.match(line) and stack:
            stack.pop()
    assert not stack, f"{fname}: unclosed {stack}"

    # Worked-example sections: ≥ 4 step examples each.
    by_sec = {}
    for e in examples:
        by_sec.setdefault(e["section"], []).append(e)
        if e["steps"] < 2 or not e["answer"]:
            problems.append(f"{fname}: example {e['attrs'][:40]} needs ≥ 2 steps and an answer")
    for sec, es in by_sec.items():
        if sec and sec.startswith("Worked examples") and len(es) < 4:
            problems.append(f"{fname}: section '{sec}' has {len(es)} worked examples (needs ≥ 4)")

    # PYQs: exactly the outline's, each with tests.
    want = outline_pyqs(plan_id)
    got = [p for p, _ in pyqs]
    if sorted(want) != sorted(got):
        problems.append(f"{fname}: PYQs embedded {sorted(set(got) ^ set(want))} differ from the outline")
    for p, t in pyqs:
        if not t or not t.group(1).strip():
            problems.append(f"{fname}: PYQ {p} has no tests")

    # Practice: all of this lesson's questions, ≥ 8.
    num = fname[:2]
    mine = [q["id"] for q in practice if q["id"].startswith(f"nx-dl-01-{num}-")]
    if sorted(mine) != sorted(prac):
        problems.append(f"{fname}: practice embedded {sorted(set(mine) ^ set(prac))} mismatch")
    if len(mine) < 8:
        problems.append(f"{fname}: only {len(mine)} practice questions")
    kinds = {q["type"] for q in practice if q["id"] in mine}
    if not {"MCQ", "NAT"} <= kinds:
        problems.append(f"{fname}: practice needs a mix of MCQ, MSQ and NAT (has {sorted(kinds)})")

    if ':::summary{' not in body or 'depth="quick"' not in body.split(":::summary{")[1].split("\n")[0]:
        problems.append(f"{fname}: needs a quick :::summary")
    if "#radar" not in body:
        problems.append(f"{fname}: needs the GATE radar table (#radar)")

    words = len(re.findall(r"[A-Za-z][A-Za-z'’-]*", re.sub(r"\$[^$]*\$", " ", body)))
    status = re.search(r"^status: (\w+)", fm, re.M).group(1)
    review = re.search(r"^needs_review: (\w+)", fm, re.M).group(1)
    if status == "published" and review != "false":
        problems.append(f"{fname}: published with needs_review")
    report.append(f"{fname}: {words} words, {len(examples)} worked examples, {len(viz)} viz "
                  f"({sum(v.endswith('*') for v in viz)} animated), {len(pyqs)} PYQs, {len(prac)} practice, status {status}")

print("\n".join(report))
assert not problems, "\n" + "\n".join(problems)
print("lessons_ch1: structure OK")
