"""Chapter-level helpers shared by the Programming & Data Structures checks (a library, not a
check): lesson structure, embedded PYQ solutions, practice files, solution modules and viz files.

Per chapter N the checks are thin wrappers:

    lessons_chN.py   check_lessons(N)      house style of content/gate-notes/_style.md
    pyq_chN.py       check_pyqs(N)         every embedded PYQ has a full teacher-style v2 solution
    viz_chN.py       check_viz(N)          viz files == generator output, animated, captioned, phone layout
    _sol_chN.py      merge_solutions(N) + write (python3 _sol_chN.py writes src/gate/solutions)
    _practice.py     put_practice(path)    one lesson's practice questions into its chapter file

Lesson files are NN-slug.md in the chapter folder; their planning ids are pds-<chapter>-<NN>-<slug>.
Solution modules are _sol_chN_lNN.py, each defining SOLUTIONS; scene modules are _viz_chN_lNN.py,
each registering scenes on vizlib.Registry objects REG[N] (created here).
"""
import collections
import fcntl
import importlib
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
sys.path.insert(0, str(HERE))
import common as C  # noqa: E402
import vizlib as V  # noqa: E402

REG = collections.defaultdict(V.Registry)
OPEN = re.compile(r"^(:{3,})([a-z]+)(\{.*\})?\s*$")
CLOSE = re.compile(r"^(:{3,})\s*$")


def lessons_of(ch):
    d = C.CHAPTERS[ch]
    out = {}
    for f in sorted(d.glob("[0-9][0-9]-*.md")):
        out[f.name] = f"pds-{ch:02d}-{f.name[:2]}-{f.stem[3:]}"
    return out


def practice_of(ch):
    p = C.CHAPTERS[ch] / "practice.json"
    return json.loads(p.read_text()) if p.exists() else []


# ── Lesson structure ─────────────────────────────────────────────────────────

def check_lessons(ch, min_examples=4, min_practice=8):
    """Structural check of every written lesson of chapter `ch` (the house style):

    - every top-level block has a stable #id and an explicit depth;
    - every "Worked examples" section has ≥ `min_examples` step-format examples, each with ≥ 2 steps
      and a final answer, and every step carries a why="…";
    - ≥ 3 :::intuition blocks, every :::theorem has a :::proof;
    - the PYQs embedded are exactly the outline's, each with tests="…" naming blocks that exist;
    - every practice question of the lesson is embedded, ≥ `min_practice` of them, MCQ/MSQ/NAT all
      present; the chapter's MCQ keys are spread over A–D;
    - a quick :::summary, a GATE radar table (#radar) and at least one animated viz;
    - frontmatter id = file slug, published ⇒ needs_review false.
    Prints a size report per lesson and returns it."""
    practice = practice_of(ch)
    report, problems = [], []
    for fname, plan_id in lessons_of(ch).items():
        f = C.CHAPTERS[ch] / fname
        src = f.read_text()
        fm, body = src.split("\n---\n", 1)
        if not re.search(rf"^id: {re.escape(fname[3:-3])}$", fm, re.M):
            problems.append(f"{fname}: frontmatter id must be {fname[3:-3]}")
        lines = body.splitlines()
        stack, examples = [], []
        viz, pyqs, prac, ids = [], [], [], set()
        names = collections.Counter()
        section = None
        in_math = in_code = False
        for n, line in enumerate(lines, 1):
            if line.strip().startswith("```"):
                in_code = not in_code
                continue
            if in_code:
                continue
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
                mid = re.search(r"#([a-z][a-z0-9-]*)", attrs)
                if mid:
                    ids.add(mid.group(1))
                if not stack:
                    names[name] += 1
                    if name in ("pyq", "practice"):
                        if "depth=" not in attrs:
                            problems.append(f"{fname}:{n}: :::{name} has no depth")
                    elif not mid or "depth=" not in attrs:
                        problems.append(f"{fname}:{n}: top-level :::{name} needs #id and depth ({attrs[:50]})")
                    if name == "example":
                        examples.append({"section": section, "steps": 0, "answer": False, "attrs": attrs})
                    if name == "viz":
                        viz.append(re.search(r'spec="([^"]+)"', attrs).group(1) + ("*" if 'mode="animate"' in attrs else ""))
                    if name == "pyq":
                        pyqs.append((re.search(r'id="([^"]+)"', attrs).group(1), re.search(r'tests="([^"]*)"', attrs)))
                    if name == "practice":
                        prac.append(re.search(r'id="([^"]+)"', attrs).group(1))
                elif name == "step":
                    if stack[-1] == "example":
                        examples[-1]["steps"] += 1
                    if 'why="' not in attrs:
                        problems.append(f"{fname}:{n}: a :::step has no why")
                elif name == "answer" and stack[-1] == "example":
                    examples[-1]["answer"] = True
                stack.append(name)
                continue
            if CLOSE.match(line) and stack:
                stack.pop()
        if stack:
            problems.append(f"{fname}: unclosed {stack}")
        by_sec = {}
        for e in examples:
            by_sec.setdefault(e["section"], []).append(e)
            if e["steps"] < 2 or not e["answer"]:
                problems.append(f"{fname}: example {e['attrs'][:50]} needs ≥ 2 steps and an answer")
        for sec, es in by_sec.items():
            if sec and sec.startswith("Worked examples") and len(es) < min_examples:
                problems.append(f"{fname}: section '{sec}' has {len(es)} worked examples (needs ≥ {min_examples})")
        if not any(s and s.startswith("Worked examples") for s in by_sec):
            problems.append(f"{fname}: no 'Worked examples' section")
        if names["theorem"] > names["proof"]:
            problems.append(f"{fname}: {names['theorem']} theorems but only {names['proof']} proofs")
        if names["intuition"] < 3:
            problems.append(f"{fname}: only {names['intuition']} :::intuition blocks")
        if not any(v.endswith("*") for v in viz):
            problems.append(f"{fname}: no animated viz")
        want = C.outline_pyqs(plan_id)
        got = [p for p, _ in pyqs]
        if sorted(want) != sorted(got):
            problems.append(f"{fname}: PYQs embedded differ from the outline: {sorted(set(got) ^ set(want))}")
        for p, t in pyqs:
            if not t or not t.group(1).strip():
                problems.append(f"{fname}: PYQ {p} has no tests")
            else:
                for b in t.group(1).split(","):
                    if b.strip() and b.strip() not in ids:
                        problems.append(f"{fname}: PYQ {p} tests unknown block #{b.strip()}")
        num = fname[:2]
        mine = [q["id"] for q in practice if q["id"].startswith(f"nx-pds-{ch:02d}-{num}-")]
        if sorted(mine) != sorted(prac):
            problems.append(f"{fname}: practice embedded vs practice.json mismatch {sorted(set(mine) ^ set(prac))}")
        if len(mine) < min_practice:
            problems.append(f"{fname}: only {len(mine)} practice questions")
        kinds = {q["type"] for q in practice if q["id"] in mine}
        if not {"MCQ", "MSQ", "NAT"} <= kinds:
            problems.append(f"{fname}: practice needs MCQ, MSQ and NAT (has {sorted(kinds)})")
        keys = [q["answer"] for q in practice if q["id"] in mine and q["type"] == "MCQ"]
        if len(keys) >= 3 and len(set(keys)) < 2:
            problems.append(f"{fname}: every MCQ key is {keys[0]}")
        if ":::summary{" not in body or 'depth="quick"' not in body.split(":::summary{")[1].split("\n")[0]:
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
    mcq = collections.Counter(q["answer"] for q in practice if q["type"] == "MCQ")
    total = sum(mcq.values())
    if total >= 12:
        for l in "ABCD":
            if mcq[l] < 0.15 * total:
                problems.append(f"chapter {ch}: MCQ key {l} is used {mcq[l]} of {total} times (spread keys over A–D)")
    print("\n".join(report))
    print(f"MCQ keys: {dict(sorted(mcq.items()))}")
    assert not problems, "\n" + "\n".join(problems)
    return report


# ── Solutions ────────────────────────────────────────────────────────────────

def merge_solutions(ch):
    sols = {}
    for f in sorted(HERE.glob(f"_sol_ch{ch}_l[0-9][0-9].py")):
        part = importlib.import_module(f.stem).SOLUTIONS
        dup = set(part) & set(sols)
        assert not dup, f"{f.stem}: duplicate solutions {sorted(dup)}"
        sols.update(part)
    return sols


def write_solutions(sols):
    """Write solutions into src/gate/solutions/<paper>.json (under a lock, so lessons can run in parallel)."""
    lockf = open(C.ROOT / "src" / "gate" / "solutions" / ".pds-write.lock", "w")
    fcntl.flock(lockf, fcntl.LOCK_EX)
    bank = C.bank()
    by_paper = {}
    for qid, sol in sols.items():
        by_paper.setdefault(bank[qid]["paper"], {})[qid] = sol
    for paper, ss in sorted(by_paper.items()):
        p = C.ROOT / "src" / "gate" / "solutions" / f"{paper}.json"
        d = json.loads(p.read_text())
        for qid, sol in ss.items():
            d["solutions"][qid] = json.loads(json.dumps(sol))
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print(f"{paper}: {', '.join(sorted(ss))}")
    fcntl.flock(lockf, fcntl.LOCK_UN)
    lockf.close()
    (C.ROOT / "src" / "gate" / "solutions" / ".pds-write.lock").unlink(missing_ok=True)


def check_pyqs(ch):
    """Every PYQ embedded in a chapter-`ch` lesson has a full teacher-style v2 solution:
    approach opens with "Concept tested", ≥ 2 steps, pitfalls, a verification or shortcut, an
    optionAnalysis entry for every option (MCQ/MSQ) marking exactly the key, answer.choice = key,
    NAT number inside the key range, matchesKey true; and src/gate/solutions equals the solution
    modules (so the reviewed source is the one in the repo)."""
    bank = C.bank()
    sols = merge_solutions(ch)
    problems, n = [], 0
    embedded = []
    for f in sorted(C.CHAPTERS[ch].glob("[0-9][0-9]-*.md")):
        embedded += re.findall(r':::pyq\{id="([^"]+)"', f.read_text())
    for qid in embedded:
        q = bank[qid]
        sol = json.loads((C.ROOT / "src" / "gate" / "solutions" / f"{q['paper']}.json").read_text())["solutions"].get(qid)
        n += 1
        if not sol:
            problems.append(f"{qid}: no v2 solution")
            continue
        if qid not in sols or json.dumps(sols[qid], sort_keys=True) != json.dumps(sol, sort_keys=True):
            problems.append(f"{qid}: src/gate/solutions differs from _sol_ch{ch}_lNN.py (run python3 content/gate-notes/_checks/pds/_sol.py {ch})")
        if not sol["approach"].startswith("Concept tested"):
            problems.append(f"{qid}: approach must open with 'Concept tested: …'")
        if len(sol["steps"]) < 2:
            problems.append(f"{qid}: fewer than 2 steps")
        if not sol.get("pitfalls"):
            problems.append(f"{qid}: no pitfalls")
        if not (sol.get("verification") or sol.get("shortcut")):
            problems.append(f"{qid}: needs a verification or a shortcut")
        if not sol["answer"].get("matchesKey"):
            problems.append(f"{qid}: solution does not match the key")
        if q.get("options") and q["type"] in ("MCQ", "MSQ"):
            got = [o["option"] for o in sol.get("optionAnalysis", [])]
            want = [o["l"] for o in q["options"]]
            if got != want:
                problems.append(f"{qid}: optionAnalysis covers {got}, options are {want}")
            key = C.key_letters(q["answer"])
            marked = sorted(o["option"] for o in sol.get("optionAnalysis", []) if o["correct"])
            if marked != key:
                problems.append(f"{qid}: optionAnalysis marks {marked} correct, the key is {key}")
            if sorted(sol["answer"].get("choice", [])) != key:
                problems.append(f"{qid}: answer.choice {sol['answer'].get('choice')} is not the key {key}")
        elif q["type"] == "NAT":
            a = re.split(r"\s+to\s+|\s*-\s*(?=\d)", str(q["answer"]).strip())
            try:
                lo, hi = float(a[0]), float(a[-1])
                if not (lo <= sol["answer"].get("number", float("nan")) <= hi):
                    problems.append(f"{qid}: answer.number {sol['answer'].get('number')} is not the key {q['answer']}")
            except ValueError:
                problems.append(f"{qid}: cannot read the NAT key {q['answer']!r}")
    extra = sorted(set(sols) - set(embedded))
    if extra:
        problems.append(f"chapter {ch} solution modules cover PYQs no lesson embeds: {extra}")
    assert not problems, "\n" + "\n".join(problems)
    print(f"pyq_ch{ch}: {n} embedded PYQs have full teacher-style solutions matching the bank keys")


# ── Practice ─────────────────────────────────────────────────────────────────

def put_practice(new):
    """Replace one lesson's questions in its chapter's practice.json (sorted, under a file lock)."""
    prefixes = {re.match(r"^(nx-pds-(\d\d)-\d\d-)q\d\d$", q["id"]).group(1) for q in new}
    assert len(prefixes) == 1, f"one lesson at a time (got {sorted(prefixes)})"
    prefix = prefixes.pop()
    ch = int(prefix.split("-")[2])
    path = C.CHAPTERS[ch] / "practice.json"
    with open(path.with_suffix(".lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        cur = json.loads(path.read_text()) if path.exists() else []
        out = sorted([q for q in cur if not q["id"].startswith(prefix)] + new, key=lambda q: q["id"])
        path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    path.with_suffix(".lock").unlink(missing_ok=True)
    print(f"{path.name}: {len(new)} questions for {prefix}*, {len(out)} in chapter {ch}")


# ── Viz ──────────────────────────────────────────────────────────────────────

def load_scenes(ch):
    for f in sorted(HERE.glob(f"_viz_ch{ch}_l[0-9][0-9].py")):
        importlib.import_module(f.stem)
    return REG[ch]


def write_viz(ch, only=()):
    reg = load_scenes(ch)
    C.VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, build in reg.specs.items():
        if only and name not in only:
            continue
        (C.VIZ_DIR / f"{name}.json").write_text(V.dump(build()))
        print(f"viz/{name}.json")


def check_viz(ch):
    reg = load_scenes(ch)
    for name, build in reg.specs.items():
        s = build()
        f = C.VIZ_DIR / f"{name}.json"
        assert f.exists(), f"missing viz/{name}.json: run python3 content/gate-notes/_checks/pds/_viz.py {ch}"
        assert f.read_text() == V.dump(s), f"viz/{name}.json is stale: run python3 content/gate-notes/_checks/pds/_viz.py {ch}"
        assert s["steps"] and all(st["caption"].strip() for st in s["steps"]), name
        assert s.get("narrow"), f"{name}: needs a narrow (phone) canvas"
    print(f"viz_ch{ch}: {len(reg.specs)} scenes match the generator, all animated with captions and a phone layout")
