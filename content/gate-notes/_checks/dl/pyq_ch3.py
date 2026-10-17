"""Check: every PYQ embedded in a Chapter 3 lesson has a full teacher-style v2 solution in
src/gate/solutions (the reader shows it under the question):

- the approach names the concept tested ("Concept tested: …");
- at least two worked steps, a pitfalls list, and a verification or a shortcut;
- for MCQ/MSQ, an optionAnalysis entry for every option saying why it is right or wrong;
- the solution's answer agrees with the bank key (matchesKey true);
- every K-map animation plots the function the question defines: its cells, renumbered from the
  frame's variable order to the function's, equal the expected 1s and don't-cares (or the 0s, for a
  frame that draws f′), and every loop in every step is a product term inside them.

The keys themselves are recomputed from scratch in l3_01 … l3_04 (one per lesson).
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402

ABCD, W = list("ABCD"), list("wxyz")
# qid → (function variables, 1s, don't-cares[, "complement" when the frame plots the 0s]).
EXPECTED = {
    "cse-1995-b-63-b": (ABCD, [0, 2, 5, 7, 8, 10, 13, 15], []),
    "cse-1996-a-49": (ABCD, [1, 3, 4, 6, 9, 11, 12, 14], [], "complement"),
    "cse-1997-b-71-a": (W, [0, 1, 2, 3, 7, 11, 15], []),
    "cse-1998-a-42": (list("ABC"), [0, 3, 4, 7], []),
    "cse-2000-a-2-11": (W, [6, 7, 10, 11, 14, 15], [1, 3, 5]),
    "it-2004-it-44": (list("ABC"), [1, 3, 4, 5, 6], []),
    "cse-2005-cs-18": (ABCD, [1, 4, 5, 9, 11, 12], []),
    "cse-2007-cs-32": (W, [0, 4, 5, 7, 8, 9, 13, 15], []),
    "cse-2007-cs-9": (W, [1, 3, 4, 6, 9, 11, 12, 14], []),
    "it-2007-cs-78": (list("abcd"), [0, 1, 4, 5, 8, 10, 12, 13, 14], []),
    "it-2007-cs-79": (list("abcd"), [0, 1, 4, 5, 8, 10, 12, 13, 14], []),
    "it-2008-it-8": (ABCD, [2, 3, 6, 7, 8, 9, 10, 11, 12, 13], []),
    "cse-2011-cs-14": (list("PQR"), [0, 4, 5, 6, 7], []),
    "cse-2014-1-cs-7": (list("PQRS"), [5, 6, 7, 12, 13, 14, 15], []),
    "cse-2021-2-cs-52": (W, [0, 1, 6, 7, 8, 9, 11, 13, 14, 15], [2, 3]),
    "cse-2025-1-cs-32": (["b3", "b2", "b1", "b0"], [0, 2, 4, 8, 10, 11, 12], []),
    "cse-2025-2-cs-33": (W, [0, 2, 5, 7, 8, 10, 13, 15], []),
    "cse-2026-2-cs-30": (ABCD, [0, 1, 2, 3, 8, 9, 10, 11], []),
    # Lesson 2
    "cse-1997-a-36": (list("xyz"), [0, 1, 2, 3, 4, 5, 7], []),
    "cse-2004-cs-59": (list("abc"), [1, 3, 4, 5, 6], []),
    "it-2006-cs-35": (list("PQRS"), [0, 2, 3, 7, 8, 9, 10, 13, 15], []),
    "cse-2015-3-cs-43": (W, [0, 2, 4, 5, 6, 10], []),
    "cse-2018-cs-49": (list("PQRS"), [0, 2, 5, 7, 9, 11], [3, 8, 10, 12, 14]),
    "cse-1991-b-5-b": (ABCD, [0, 2, 8, 10, 15], [3, 11, 12, 14]),
    "cse-1999-a-8": (ABCD, [3, 7, 9, 11, 13, 15], [4, 5, 6]),
    "cse-2001-a-11": (W, [5, 6, 9, 15], [1, 4, 7, 8, 13, 14]),
    "cse-2002-a-12": (W, [4, 6, 9, 11, 12, 14], [1, 3, 10]),
    "cse-2008-cs-5": (list("abcd"), [0, 2, 4, 6, 8], [1, 3, 10]),
    "cse-2012-cs-30": (list("abcd"), [0, 2, 8, 9], [1, 4, 10, 12]),
    "cse-2014-3-cs-7": (list("PQRS"), [0, 5, 10, 15], [2, 7, 8, 13]),
    "cse-2017-2-cs-28": (W, [0, 1, 2, 3, 7, 8, 10], [5, 6, 11, 15], "complement"),
    "cse-2026-1-cs-38": (list("PQRS"), [1, 2, 3, 4, 5, 7, 10, 12, 13, 14], []),
    # Lesson 4
    "cse-2006-cs-38": (W, [5, 7, 11, 12, 13, 15], []),
}


def frames(sol):
    """The base frame and every step's patched frame (shallow patches, as the reader applies them)."""
    base = sol.get("animation")
    if not base:
        return []
    out, cur = [base], dict(base)
    for st in sol["steps"]:
        sc = st.get("scene")
        if sc:
            cur = dict(sc) if "kind" in sc else {**cur, **sc}
            out.append(cur)
    return out


bank = bl.bank()
problems, n, nk = [], 0, 0
for f in sorted(ml.CH3.glob("[0-9][0-9]-*.md")):
    for qid in re.findall(r':::pyq\{id="([^"]+)"', f.read_text()):
        q = bank[qid]
        sol = json.loads((bl.ROOT / "src" / "gate" / "solutions" / f"{q['paper']}.json").read_text())["solutions"].get(qid)
        n += 1
        if not sol:
            problems.append(f"{qid}: no v2 solution")
            continue
        if not sol["approach"].startswith("Concept tested"):
            problems.append(f"{qid}: approach must open with 'Concept tested: …'")
        if len(sol["steps"]) < 2:
            problems.append(f"{qid}: fewer than 2 steps")
        if not sol.get("pitfalls"):
            problems.append(f"{qid}: no pitfalls")
        if not (sol.get("verification") or sol.get("shortcut")):
            problems.append(f"{qid}: needs a verification or a shortcut")
        if q.get("options"):
            got = [o["option"] for o in sol.get("optionAnalysis", [])]
            want = [o["l"] for o in q["options"]]
            if got != want:
                problems.append(f"{qid}: optionAnalysis covers {got}, options are {want}")
        if not sol["answer"].get("matchesKey"):
            problems.append(f"{qid}: solution does not match the key")
        fr = [x for x in frames(sol) if x.get("kind") == "kmap"]
        if fr:
            if qid not in EXPECTED:
                problems.append(f"{qid}: K-map animation without an EXPECTED entry")
                continue
            nk += 1
            vars_, ones, dcs, *flag = EXPECTED[qid]
            nv = len(vars_)
            if flag:
                ones, dcs = ml.zeros_of(ones, dcs, nv), dcs
            for x in fr:
                fv = x["variables"]
                if sorted(fv) != sorted(vars_):
                    problems.append(f"{qid}: frame variables {fv} are not {vars_}")
                    continue
                if ml.relabel(x["ones"], fv, vars_) != sorted(ones) or ml.relabel(x.get("dcs", []), fv, vars_) != sorted(dcs):
                    problems.append(f"{qid}: the frame plots a different function")
                allowed = set(x["ones"]) | set(x.get("dcs", []))
                cubes = {frozenset(ml.cells("".join(c))) for c in __import__("itertools").product("01-", repeat=nv)}
                for g in x.get("groups", []):
                    if frozenset(g["cells"]) not in cubes or not set(g["cells"]) <= allowed:
                        problems.append(f"{qid}: group {g.get('label')} is not a legal loop on the plotted cells")
assert not problems, "\n" + "\n".join(problems)
print(f"pyq_ch3: {n} embedded PYQs have full teacher-style solutions; {nk} K-map animations re-plotted and checked")
