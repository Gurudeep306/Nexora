"""Shared helpers for the Discrete Mathematics checks (content/gate-notes/_checks/dm).

- paths, the question bank, chapter practice files and lesson texts;
- MCQ / MSQ / NAT key assertions for practice questions;
- `check_lessons(chapter)`: the house structure (content/gate-notes/_style.md) for every lesson of a
  chapter: #id and depth on every top-level block, >= 4 step examples per "Worked examples" section,
  why on every step, the outline's PYQs embedded with tests, >= 8 practice questions embedded with a
  mix of types and MCQ keys spread over A-D, a quick summary and a GATE radar;
- `check_pyqs(chapter)`: every embedded PYQ has a full teacher-style v2 solution;
- `write_solutions(dict)`: write v2 solutions into src/gate/solutions/<paper>.json;
- the Viz scene builders (spec, step, el, text, node, edge, ...) and `check_viz(specs)`: files equal
  the generator output, captions on every step, a phone canvas, nothing leaves either canvas.
"""
import collections
import fcntl
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[4]
CONTENT = ROOT / "content" / "gate-notes" / "dm"
VIZ_DIR = CONTENT / "viz"
CHECKS = pathlib.Path(__file__).resolve().parent
OUTLINE = CONTENT / "_outline.md"
SOL_DIR = ROOT / "src" / "gate" / "solutions"


def chapter_dir(ch):
    return next((p for p in CONTENT.iterdir() if p.is_dir() and p.name.startswith(f"{ch:02d}-")), None)


_BANK = None


def bank():
    global _BANK
    if _BANK is None:
        _BANK = {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}
    return _BANK


def practice(ch):
    if chapter_dir(ch) is None:
        return {}
    p = chapter_dir(ch) / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


def lesson_text(ch, prefix):
    return next(chapter_dir(ch).glob(f"{prefix}-*.md")).read_text()


def must_contain(text, *snippets, where="lesson"):
    missing = [s for s in snippets if s not in text]
    assert not missing, f"{where} is missing: {missing}"


def opts(q):
    return {o["l"]: o["t"] for o in q.get("options", [])}


def assert_mcq(q, correct_letter):
    assert q["type"] == "MCQ", q["id"]
    assert q["answer"] == correct_letter, f"{q['id']}: key {q['answer']} but computed {correct_letter}"
    for w in q["common_wrong"]:
        assert w["answer"] != correct_letter, f"{q['id']}: a common wrong answer is the key"


def assert_msq(q, correct_letters):
    assert q["type"] == "MSQ", q["id"]
    assert sorted(q["answer"]) == sorted(correct_letters), f"{q['id']}: key {q['answer']} but computed {sorted(correct_letters)}"
    for w in q["common_wrong"]:
        assert sorted([w["answer"]] if isinstance(w["answer"], str) else w["answer"]) != sorted(correct_letters)


def assert_nat(q, computed):
    assert q["type"] == "NAT", q["id"]
    a = q["answer"]
    if isinstance(a, list):
        assert a[0] <= computed <= a[1], f"{q['id']}: key {a} but computed {computed}"
    else:
        assert abs(a - computed) < 1e-9, f"{q['id']}: key {a} but computed {computed}"
    for w in q["common_wrong"]:
        assert w["answer"] != computed, f"{q['id']}: a common wrong answer equals the key"


def key_letters(answer):
    if isinstance(answer, list):
        return sorted(answer)
    return sorted(x for x in re.split(r"[\s,;]+", str(answer)) if x)


def which(q, pred):
    """Option letters of a bank or practice question whose text satisfies pred."""
    return sorted(l for l, t in opts(q).items() if pred(t))


def assert_key(qid, letters_or_value):
    """A PYQ's bank key equals what the script computed (letters for MCQ/MSQ, a number for NAT)."""
    q = bank()[qid]
    if q["type"] in ("MCQ", "MSQ"):
        got = sorted(letters_or_value) if isinstance(letters_or_value, (list, tuple, set)) else [letters_or_value]
        assert key_letters(q["answer"]) == got, f"{qid}: bank key {q['answer']} but computed {got}"
    elif q["type"] == "NAT":
        a = q["answer"]
        lo, hi = (a if isinstance(a, list) else (re.split(r"\s*(?:to|-|–)\s*", str(a)) + [None])[:2]) if not isinstance(a, (int, float)) else (a, a)
        lo = float(lo)
        hi = float(hi) if hi not in (None, "") else lo
        v = float(letters_or_value)
        assert lo - 1e-9 <= v <= hi + 1e-9, f"{qid}: bank key {a} but computed {v}"
    else:
        raise AssertionError(f"{qid}: use a DESC/FILL check for type {q['type']}")


# ── Outline ────────────────────────────────────────────────────────────────

def outline_lessons():
    """[(plan_id, title, [pyq ids])] in outline order."""
    out, cur = [], None
    for line in OUTLINE.read_text().splitlines():
        m = re.match(r"^### (dm-\d\d-\d\d-[a-z0-9-]+) · (.*)$", line)
        if m:
            cur = [m.group(1), m.group(2), []]
            out.append(cur)
        elif line.startswith("- PYQs (") and cur:
            cur[2] = re.findall(r"`([a-z0-9-]+)`", line)
    return out


def outline_pyqs(plan_id):
    return next(p for i, _, p in outline_lessons() if i == plan_id)


# ── Lesson structure ───────────────────────────────────────────────────────

OPEN = re.compile(r"^(:{3,})([a-z]+)(\{.*\})?\s*$")
CLOSE = re.compile(r"^(:{3,})\s*$")


def check_lessons(ch, min_words=0):
    folder = chapter_dir(ch)
    prac = practice(ch)
    plans = {i: p for i, _, p in outline_lessons() if i.startswith(f"dm-{ch:02d}-")}
    report, problems = [], []
    for f in sorted(folder.glob("[0-9][0-9]-*.md")):
        fname = f.name
        plan_id = f"dm-{ch:02d}-{fname[:2]}-{fname[3:-3]}"
        if plan_id not in plans:
            problems.append(f"{fname}: no outline lesson {plan_id}")
            continue
        src = f.read_text()
        fm, body = src.split("\n---\n", 1)
        stack, examples, viz, pyqs, labs, prac_ids = [], [], [], [], [], []
        section, in_math = None, False
        for n, line in enumerate(body.splitlines(), 1):
            s = line.strip()
            if s.startswith("$$"):
                if not (s != "$$" and s.endswith("$$") and len(s) > 4):
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
                            problems.append(f"{fname}:{n}: :::{name} has no depth")
                    elif "#" not in attrs or "depth=" not in attrs:
                        problems.append(f"{fname}:{n}: top-level :::{name} needs #id and depth")
                    if name == "example":
                        examples.append({"section": section, "steps": 0, "answer": False, "attrs": attrs})
                    if name == "viz":
                        viz.append(re.search(r'spec="([^"]+)"', attrs).group(1) + ("*" if 'mode="animate"' in attrs else ""))
                    if name == "lab":
                        labs.append(attrs)
                    if name == "pyq":
                        pyqs.append((re.search(r'id="([^"]+)"', attrs).group(1), re.search(r'tests="([^"]*)"', attrs)))
                    if name == "practice":
                        prac_ids.append(re.search(r'id="([^"]+)"', attrs).group(1))
                elif name == "step":
                    if examples:
                        examples[-1]["steps"] += 1
                    if 'why="' not in attrs:
                        problems.append(f"{fname}:{n}: a :::step has no why")
                elif name == "answer" and stack[-1] == "example" and examples:
                    examples[-1]["answer"] = True
                stack.append(name)
                continue
            if CLOSE.match(line) and stack:
                stack.pop()
        if stack:
            problems.append(f"{fname}: unclosed {stack}")
        by_sec = collections.defaultdict(list)
        for e in examples:
            by_sec[e["section"]].append(e)
            if e["steps"] < 2 or not e["answer"]:
                problems.append(f"{fname}: example {e['attrs'][:50]} needs >= 2 steps and an answer")
        for sec, es in by_sec.items():
            if sec and sec.startswith("Worked examples") and len(es) < 4:
                problems.append(f"{fname}: section '{sec}' has {len(es)} worked examples (needs >= 4)")
        if not any(s and s.startswith("Worked examples") for s in by_sec):
            problems.append(f"{fname}: no 'Worked examples' section")
        want = plans[plan_id]
        got = [p for p, _ in pyqs]
        if sorted(want) != sorted(got):
            problems.append(f"{fname}: PYQs embedded differ from the outline: {sorted(set(got) ^ set(want))}")
        for p, t in pyqs:
            if not t or not t.group(1).strip():
                problems.append(f"{fname}: PYQ {p} has no tests")
        mine = [q for q in prac if q.startswith(f"nx-dm-{ch:02d}-{fname[:2]}-")]
        if sorted(mine) != sorted(prac_ids):
            problems.append(f"{fname}: practice embedded vs practice.json mismatch {sorted(set(mine) ^ set(prac_ids))}")
        if len(mine) < 8:
            problems.append(f"{fname}: only {len(mine)} practice questions (needs >= 8)")
        kinds = collections.Counter(prac[q]["type"] for q in mine)
        if not {"MCQ", "NAT"} <= set(kinds) and not {"MCQ", "MSQ"} <= set(kinds):
            problems.append(f"{fname}: practice needs a mix of types (has {dict(kinds)})")
        keys = collections.Counter(prac[q]["answer"] for q in mine if prac[q]["type"] == "MCQ")
        if sum(keys.values()) >= 4 and len(keys) < 3:
            problems.append(f"{fname}: MCQ keys not spread across A-D ({dict(keys)})")
        if sum(keys.values()) >= 4 and max(keys.values()) > (sum(keys.values()) + 1) // 2:
            problems.append(f"{fname}: one MCQ key letter dominates ({dict(keys)})")
        if ":::summary{" not in body or 'depth="quick"' not in body.split(":::summary{")[1].split("\n")[0]:
            problems.append(f"{fname}: needs a quick :::summary")
        if "{#radar" not in body:
            problems.append(f"{fname}: needs the GATE radar table (#radar)")
        if not viz:
            problems.append(f"{fname}: no diagrams")
        if not any(v.endswith("*") for v in viz):
            problems.append(f"{fname}: no animated diagram")
        intuitions = body.count(":::intuition{")
        if intuitions < 3:
            problems.append(f"{fname}: only {intuitions} intuition blocks")
        words = len(re.findall(r"[A-Za-z][A-Za-z'’-]*", re.sub(r"\$[^$]*\$", " ", body)))
        if words < min_words:
            problems.append(f"{fname}: {words} words (< {min_words})")
        status = re.search(r"^status: (\w+)", fm, re.M).group(1)
        review = re.search(r"^needs_review: (\w+)", fm, re.M).group(1)
        if status == "published" and review != "false":
            problems.append(f"{fname}: published with needs_review")
        report.append(f"{fname}: {words} words, {len(examples)} worked examples, {len(viz)} viz "
                      f"({sum(v.endswith('*') for v in viz)} animated), {len(labs)} lab, {len(pyqs)} PYQs, {len(mine)} practice, status {status}")
    return report, problems


# ── PYQ solutions ──────────────────────────────────────────────────────────

def solution(qid):
    q = bank()[qid]
    return json.loads((SOL_DIR / f"{q['paper']}.json").read_text())["solutions"].get(qid)


def check_pyqs(ch):
    problems, n = [], 0
    if chapter_dir(ch) is None:
        return 0, []
    for f in sorted(chapter_dir(ch).glob("[0-9][0-9]-*.md")):
        for qid in re.findall(r':::pyq\{id="([^"]+)"', f.read_text()):
            q, sol = bank()[qid], solution(qid)
            n += 1
            if not sol:
                problems.append(f"{qid}: no v2 solution")
                continue
            if not sol["approach"].startswith("Concept tested"):
                problems.append(f"{qid}: approach must open with 'Concept tested: ...'")
            if len(sol["steps"]) < 2:
                problems.append(f"{qid}: fewer than 2 steps")
            if not sol.get("pitfalls"):
                problems.append(f"{qid}: no pitfalls")
            if not (sol.get("verification") or sol.get("shortcut")):
                problems.append(f"{qid}: needs a verification or a shortcut")
            if q.get("options") and q["type"] in ("MCQ", "MSQ"):
                got = [o["option"] for o in sol.get("optionAnalysis", [])]
                want = [o["l"] for o in q["options"]]
                if got != want:
                    problems.append(f"{qid}: optionAnalysis covers {got}, options are {want}")
                if q["type"] in ("MCQ", "MSQ"):
                    right = sorted(o["option"] for o in sol.get("optionAnalysis", []) if o["correct"])
                    if right != key_letters(q["answer"]):
                        problems.append(f"{qid}: optionAnalysis marks {right} correct, key is {q['answer']}")
                    ch_ = sol["answer"].get("choice")
                    if ch_ is not None and sorted(ch_) != key_letters(q["answer"]):
                        problems.append(f"{qid}: answer.choice {ch_} but key {q['answer']}")
            if not sol["answer"].get("matchesKey"):
                problems.append(f"{qid}: solution does not match the key")
    return n, problems


def opt(letter, correct, reason):
    return {"option": letter, "correct": correct, "reason": reason}


def write_solutions(sols):
    """Write {qid: v2 solution} into src/gate/solutions/<paper>.json (locked, so lessons can run in parallel)."""
    by_paper = collections.defaultdict(dict)
    for qid, sol in sols.items():
        by_paper[bank()[qid]["paper"]][qid] = sol
    with open(SOL_DIR / ".dm.lock", "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for paper, ss in sorted(by_paper.items()):
            p = SOL_DIR / f"{paper}.json"
            d = json.loads(p.read_text())
            for qid, sol in ss.items():
                d["solutions"][qid] = json.loads(json.dumps(sol))
            p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
    (SOL_DIR / ".dm.lock").unlink(missing_ok=True)
    return sorted(by_paper)


def put_practice(ch, new):
    """Replace one lesson's questions in chapter ch's practice.json (sorted, under a lock)."""
    path = chapter_dir(ch) / "practice.json"
    prefixes = {re.match(rf"^(nx-dm-{ch:02d}-\d\d-)q\d\d$", q["id"]).group(1) for q in new}
    assert len(prefixes) == 1, f"one lesson at a time (got {sorted(prefixes)})"
    prefix = prefixes.pop()
    with open(path.with_suffix(".lock"), "w") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        cur = json.loads(path.read_text()) if path.exists() else []
        out = sorted([q for q in cur if not q["id"].startswith(prefix)] + new, key=lambda q: q["id"])
        path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
    path.with_suffix(".lock").unlink(missing_ok=True)
    return len(out)


# ── Viz scenes ─────────────────────────────────────────────────────────────

def spec(title, wide, narrow, intro, elements, steps):
    return {"version": 1, "title": title, "width": wide[0], "height": wide[1],
            "narrow": {"width": narrow[0], "height": narrow[1]}, "intro": intro,
            "elements": elements, "steps": steps}


def step(caption, *patches):
    return {"caption": caption, "patches": [{"id": i, "set": s} for i, s in patches]}


def el(id, type, n=None, **kw):
    """An element; n is its narrow geometry override (dict) or 'wide'/'narrow' for `only`."""
    e = {"id": id, "type": type, **kw}
    if isinstance(n, dict):
        e["narrow"] = n
    elif n in ("wide", "narrow"):
        e["only"] = n
    return e


def text(id, x, y, t, n=None, **kw):
    return el(id, "text", n, x=x, y=y, text=t, **kw)


def box(id, x, y, w, h, label=None, n=None, **kw):
    e = el(id, "box", n, x=x, y=y, w=w, h=h, **kw)
    if label is not None:
        e["label"] = label
    return e


def node(id, cx, cy, r, label=None, n=None, **kw):
    e = el(id, "node", n, cx=cx, cy=cy, r=r, **kw)
    if label is not None:
        e["label"] = label
    return e


def circle(id, cx, cy, r, label=None, n=None, **kw):
    e = el(id, "circle", n, cx=cx, cy=cy, r=r, **kw)
    if label is not None:
        e["label"] = label
    return e


def line(id, pts, n=None, **kw):
    return el(id, "line", n, points=pts, **kw)


def arrow(id, a, b, n=None, **kw):
    return el(id, "arrow", n, **{"from": a, "to": b}, **kw)


def table(id, x, y, cw, ch, rows, n=None, **kw):
    return el(id, "table", n, x=x, y=y, cellW=cw, cellH=ch, rows=rows, **kw)


def heads(wide_text, narrow_text, W, NW=360, size=17, nsize=15, y=24):
    return [text("head", W / 2, y, wide_text, "wide", anchor="middle", size=size, weight="bold"),
            text("headn", NW / 2, y, narrow_text, "narrow", anchor="middle", size=nsize, weight="bold")]


def dump(s):
    return json.dumps(s, indent=1, ensure_ascii=False) + "\n"


def write_viz(specs):
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in specs.items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
    print(f"wrote {len(specs)} scenes")


def _frames(s, layout):
    els = {e["id"]: dict(e) for e in s["elements"] if e.get("only") in (None, layout)}
    for e in els.values():
        if layout == "narrow" and isinstance(e.get("narrow"), dict):
            e.update(e["narrow"])
    out = [list(els.values())]
    for st in s["steps"]:
        for p in st["patches"]:
            if p["id"] in els:
                els[p["id"]].update(p["set"])
                if layout == "narrow":
                    o = next(x for x in s["elements"] if x["id"] == p["id"])
                    if isinstance(o.get("narrow"), dict):
                        els[p["id"]].update(o["narrow"])
        out.append([dict(e) for e in els.values()])
    return out


def _bbox(e):
    t = e["type"]
    if t in ("box",):
        return e["x"], e["y"], e["x"] + e["w"], e["y"] + e["h"]
    if t in ("circle", "node"):
        return e["cx"] - e["r"], e["cy"] - e["r"], e["cx"] + e["r"], e["cy"] + e["r"]
    if t == "table":
        nr, nc = len(e["rows"]), max(len(r) for r in e["rows"])
        return e["x"], e["y"], e["x"] + nc * e["cellW"], e["y"] + nr * e["cellH"]
    if t == "grid":
        return e["x"], e["y"], e["x"] + e["cols"] * e["cell"], e["y"] + e["rows"] * e["cell"]
    if t == "line":
        xs, ys = [p[0] for p in e["points"]], [p[1] for p in e["points"]]
        return min(xs), min(ys), max(xs), max(ys)
    if t == "text":
        sz = e.get("size", 15)
        w = len(e["text"]) * sz * (0.62 if e.get("mono") else 0.55)
        a = e.get("anchor", "start")
        x0 = e["x"] - (w / 2 if a == "middle" else w if a == "end" else 0)
        return x0, e["y"] - sz * 0.8, x0 + w, e["y"] + sz * 0.3
    return None


MIN_TEXT = {"wide": 12, "narrow": 11}


def check_viz(gen_specs, prefix=None):
    """Files equal the generator, every step has a caption, both canvases contain every element."""
    for name, s in gen_specs.items():
        f = VIZ_DIR / f"{name}.json"
        assert f.exists(), f"missing viz/{name}.json: run the generator"
        assert f.read_text() == dump(s), f"viz/{name}.json is stale: run the generator"
        assert s["intro"].strip() and len(s["intro"]) <= 400, f"{name}: intro"
        assert s.get("narrow", {}).get("width") == 360, f"{name}: needs a 360-wide phone canvas"
        for st in s["steps"]:
            assert st["caption"].strip() and len(st["caption"]) <= 400, f"{name}: caption {st['caption'][:40]}"
        for layout in ("wide", "narrow"):
            W, H = (s["width"], s["height"]) if layout == "wide" else (s["narrow"]["width"], s["narrow"]["height"])
            for fi, els in enumerate(_frames(s, layout)):
                for e in els:
                    if e.get("hidden"):
                        continue
                    b = _bbox(e)
                    if b is None:
                        continue
                    assert b[0] >= -1 and b[1] >= -1 and b[2] <= W + 1 and b[3] <= H + 1, \
                        f"{name} [{layout} frame {fi}]: {e['id']} {tuple(round(v) for v in b)} leaves the {W}x{H} canvas"
                    if e["type"] == "text":
                        assert e.get("size", 15) >= MIN_TEXT[layout], f"{name} [{layout}]: text {e['id']} too small"
                    if e["type"] in ("box", "node", "circle") and e.get("label"):
                        sz = e.get("size", 15)
                        lw = len(e["label"]) * sz * (0.6 if e.get("mono") else 0.52)
                        room = e["w"] if e["type"] == "box" else 2 * e["r"]
                        assert lw <= room + 2, f"{name} [{layout} frame {fi}]: label of {e['id']} ({e['label']!r}) is wider than its shape"
                    if e["type"] == "table":
                        sz = 14
                        for row in e["rows"]:
                            for c in row:
                                assert len(str(c)) * sz * 0.58 <= e["cellW"] + 1, f"{name} [{layout}]: table {e['id']} cell {c!r} too wide"
    return len(gen_specs)


def circle_layout(n, cx, cy, r, start=-90):
    import math
    return [(round(cx + r * math.cos(math.radians(start + 360 * k / n)), 1),
             round(cy + r * math.sin(math.radians(start + 360 * k / n)), 1)) for k in range(n)]


# ── Per-lesson modules merged per chapter ──────────────────────────────────

def parts(prefix, attr):
    """Merge dict `attr` from every module CHECKS/<prefix>NN.py (e.g. '_viz_ch1_l', 'SPECS')."""
    import importlib
    import sys
    sys.path.insert(0, str(CHECKS))
    out = {}
    for f in sorted(CHECKS.glob(f"{prefix}[0-9][0-9].py")):
        part = getattr(importlib.import_module(f.stem), attr)
        dup = set(part) & set(out)
        assert not dup, f"{f.name}: duplicate keys {sorted(dup)}"
        out.update(part)
    return out


def check_solutions_written(sols):
    """Every solution a _sol module defines is exactly what src/gate/solutions holds."""
    stale = [qid for qid, s in sols.items() if solution(qid) != json.loads(json.dumps(s))]
    assert not stale, f"src/gate/solutions is stale for {stale}: run the chapter's _sol writer"
