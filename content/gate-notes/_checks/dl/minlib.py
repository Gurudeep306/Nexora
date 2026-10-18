"""Shared minimisation helpers for the Digital Logic Chapter 3 checks (K-maps, prime implicants,
Quine–McCluskey, Petrick's method, POS, costs, hazards, gate counts).

Everything is decided by enumeration, never by trusting a hand simplification:

- a **cube** is a string over {0, 1, -} of length n (first variable = most significant bit), so
  "1-0" over (A, B, C) is the product AC' (B is free);
- prime implicants come from two independent routes, the Quine–McCluskey tabulation (`qm`) and a
  brute-force scan of all 3ⁿ cubes (`primes_brute`), and the two must agree;
- minimal covers come from Petrick's method (`petrick`) and are cross-checked against an exhaustive
  search over subsets of prime implicants (`min_covers_brute`);
- K-map geometry (Gray order, cell positions, loop rectangles with wrap-around) mirrors what the
  lessons draw and what the Live Lab (client/src/gate/notes/labs/kmapLogic.ts) computes.

Run directly, it self-tests (run_checks.py runs it as a check).
"""
from itertools import combinations, product
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402

ROOT = bl.ROOT
CH3 = bl.CONTENT / "03-minimisation"

# ── Cubes ──────────────────────────────────────────────────────────────────


def cube_of(m, n):
    return format(m, f"0{n}b")


def cells(cube):
    """Minterms covered by a cube (sorted)."""
    free = [i for i, c in enumerate(cube) if c == "-"]
    out = []
    for bits in product("01", repeat=len(free)):
        s = list(cube)
        for i, b in zip(free, bits):
            s[i] = b
        out.append(int("".join(s), 2))
    return sorted(out)


def literals(cube):
    return sum(1 for c in cube if c != "-")


def contains(big, small):
    """Does cube `big` contain cube `small`?"""
    return all(b == "-" or b == s for b, s in zip(big, small))


def term(cube, vars_, style="prime"):
    """Product term text: style 'prime' (A'B), 'tex' (\\overline{A}B), 'ascii' same as prime."""
    out = []
    for v, c in zip(vars_, cube):
        if c == "1":
            out.append(v)
        elif c == "0":
            out.append(f"\\overline{{{v}}}" if style == "tex" else f"{v}'")
    return "".join(out) if out else "1"


def sum_term(cube, vars_, style="prime"):
    """The sum term (maxterm group) of a cube of 0-cells: a 0 bit gives the plain variable."""
    out = []
    for v, c in zip(vars_, cube):
        if c == "0":
            out.append(v)
        elif c == "1":
            out.append(f"\\overline{{{v}}}" if style == "tex" else f"{v}'")
    return "(" + " + ".join(out) + ")" if out else "0"


def sop(cubes, vars_, style="prime"):
    return " + ".join(term(c, vars_, style) for c in cubes) if cubes else "0"


def pos(cubes, vars_, style="prime"):
    return "".join(sum_term(c, vars_, style) for c in cubes) if cubes else "1"


def parse_term(t, vars_):
    """'AB'C' or "A'B" → cube over vars_ (variables are single letters or names in vars_)."""
    cube = ["-"] * len(vars_)
    toks = re.findall(r"([A-Za-z]\w*?)(\'*)(?=[A-Za-z]|$)", t.replace(" ", ""))
    for v, p in toks:
        cube[vars_.index(v)] = "0" if len(p) % 2 else "1"
    return "".join(cube)


# ── Prime implicants: Quine–McCluskey and brute force ──────────────────────


def _combine(a, b):
    diff = [i for i, (x, y) in enumerate(zip(a, b)) if x != y]
    if len(diff) == 1 and "-" not in (a[diff[0]], b[diff[0]]):
        i = diff[0]
        return a[:i] + "-" + a[i + 1:]
    return None


def qm(ones, dcs, n):
    """Quine–McCluskey tabulation.

    Returns (rounds, primes): rounds[k] is a list of (cube, checked) for the cubes of size 2ᵏ,
    grouped in order of weight (number of 1s); primes are the cubes never combined, sorted."""
    current = sorted({cube_of(m, n) for m in set(ones) | set(dcs)}, key=lambda c: (c.count("1"), c))
    rounds, primes = [], set()
    while current:
        used, nxt = set(), set()
        by_w = {}
        for c in current:
            by_w.setdefault(c.count("1"), []).append(c)
        for w in sorted(by_w):
            for a in by_w[w]:
                for b in by_w.get(w + 1, []):
                    c = _combine(a, b)
                    if c:
                        used.update((a, b))
                        nxt.add(c)
        rounds.append([(c, c in used) for c in current])
        primes.update(c for c in current if c not in used)
        current = sorted(nxt, key=lambda c: (c.count("1"), c.replace("-", "2")))
    return rounds, sorted(primes, key=cube_key)


def cube_key(c):
    return (literals(c), cells(c))


def primes_brute(ones, dcs, n):
    """All maximal cubes inside ones ∪ dcs that contain at least one 1 (scan of all 3ⁿ cubes)."""
    allowed = set(ones) | set(dcs)
    inside = [("".join(c)) for c in product("01-", repeat=n) if set(cells("".join(c))) <= allowed]
    maximal = [c for c in inside if not any(d != c and contains(d, c) for d in inside)]
    return sorted([c for c in maximal if set(cells(c)) & set(ones)], key=cube_key)


def primes(ones, dcs=(), n=4):
    """Prime implicants that cover at least one 1 (the ones a cover can use)."""
    _, ps = qm(ones, dcs, n)
    ps = [p for p in ps if set(cells(p)) & set(ones)]
    assert ps == primes_brute(ones, dcs, n), "Quine–McCluskey and brute force disagree"
    return ps


def implicants(ones, dcs=(), n=4, need_one=True):
    """Every cube inside ones ∪ dcs (covering at least one 1 when need_one)."""
    allowed = set(ones) | set(dcs)
    out = []
    for c in product("01-", repeat=n):
        c = "".join(c)
        cs = set(cells(c))
        if cs <= allowed and (not need_one or cs & set(ones)):
            out.append(c)
    return sorted(out, key=cube_key)


def chart(ones, ps):
    """PI chart: minterm → list of PIs covering it (care minterms only)."""
    return {m: [p for p in ps if m in cells(p)] for m in sorted(ones)}


def essential(ones, dcs=(), n=4, ps=None):
    ps = ps if ps is not None else primes(ones, dcs, n)
    ch = chart(ones, ps)
    return sorted({cov[0] for cov in ch.values() if len(cov) == 1}, key=cube_key)


def classify(ones, dcs=(), n=4):
    """(PIs, EPIs, redundant PIs, selective PIs). Redundant: every 1 it covers is covered by EPIs."""
    ps = primes(ones, dcs, n)
    es = essential(ones, dcs, n, ps)
    by_e = set().union(*(set(cells(e)) for e in es)) if es else set()
    red = [p for p in ps if p not in es and (set(cells(p)) & set(ones)) <= by_e]
    sel = [p for p in ps if p not in es and p not in red]
    return ps, es, red, sel


# ── Covers: Petrick's method and brute force ───────────────────────────────


def cost(cover, kind="literals"):
    """(terms, literals) or literals only; a 1-term cover of a single literal counts 1 literal."""
    lit = sum(literals(c) for c in cover)
    return (len(cover), lit) if kind == "terms" else (lit, len(cover))


def petrick(ones, ps):
    """Every irredundant cover (as sorted tuples of PIs), by Petrick's product-of-sums expansion."""
    sums = [frozenset(p for p in ps if m in cells(p)) for m in sorted(ones)]
    prods = {frozenset()}
    for s in sums:
        new = set()
        for p in prods:
            if p & s:
                new.add(p)
            else:
                for x in s:
                    new.add(p | {x})
        # absorption: drop any product that contains another
        prods = {p for p in new if not any(q < p for q in new)}
    return sorted((tuple(sorted(p, key=cube_key)) for p in prods), key=lambda c: (cost(c), c))


def min_covers(ones, dcs=(), n=4, kind="literals"):
    """All minimal SOP covers (by literals then terms, or terms then literals)."""
    if not ones:
        return [()]
    ps = primes(ones, dcs, n)
    allc = petrick(ones, ps)
    best = min(cost(c, kind) for c in allc)
    return [c for c in allc if cost(c, kind) == best]


def min_covers_brute(ones, dcs=(), n=4, kind="literals"):
    ps = primes(ones, dcs, n)
    best, out = None, []
    for k in range(1, len(ps) + 1):
        for comb in combinations(ps, k):
            cov = set().union(*(set(cells(c)) for c in comb))
            if set(ones) <= cov:
                cst = cost(comb, kind)
                if best is None or cst < best:
                    best, out = cst, [tuple(sorted(comb, key=cube_key))]
                elif cst == best:
                    out.append(tuple(sorted(comb, key=cube_key)))
    return sorted(out, key=lambda c: (cost(c), c))


def min_sop(ones, dcs=(), n=4, vars_=None, kind="literals"):
    covs = min_covers(ones, dcs, n, kind)
    return [sop(c, vars_) for c in covs] if vars_ else covs


def zeros_of(ones, dcs, n):
    return sorted(set(range(2 ** n)) - set(ones) - set(dcs))


def min_pos_covers(ones, dcs=(), n=4, kind="literals"):
    """Minimal POS: minimal covers of the 0-cells (each cube is read as a sum term)."""
    return min_covers(zeros_of(ones, dcs, n), dcs, n, kind)


def min_literals_sop(ones, dcs=(), n=4):
    return cost(min_covers(ones, dcs, n)[0])[0]


def min_literals_pos(ones, dcs=(), n=4):
    return cost(min_pos_covers(ones, dcs, n)[0])[0]


def cover_fn(cover, n):
    """Truth table (as set of minterms) of an SOP cover."""
    return sorted(set().union(*(set(cells(c)) for c in cover))) if cover else []


def pos_fn(cover, n):
    """Minterms where a POS (cubes of 0-cells) is 1."""
    zs = set().union(*(set(cells(c)) for c in cover)) if cover else set()
    return sorted(set(range(2 ** n)) - zs)


def agrees(fn_ones, ones, dcs, n):
    """Does a completely specified function (its minterm list) agree with (ones, dcs) on care cells?"""
    s = set(fn_ones)
    return all((m in s) == (m in set(ones)) for m in range(2 ** n) if m not in set(dcs))


def expr_ones(expr, vars_):
    return bl.minterms(expr, vars_)


def is_cyclic(ones, dcs=(), n=4):
    return not essential(ones, dcs, n)


# ── K-map geometry ─────────────────────────────────────────────────────────


def gray(k):
    return [i ^ (i >> 1) for i in range(2 ** k)]


def layout(n):
    """(row_bits, col_bits) for an n-variable map: rows take the first variables."""
    return {1: (0, 1), 2: (1, 1), 3: (1, 2), 4: (2, 2)}[n]


def cell_rc(m, n):
    """Row and column of minterm m on the standard map (rows = first variables, Gray order)."""
    rb, cb = layout(n)
    r, c = m >> cb, m & ((1 << cb) - 1)
    return gray(rb).index(r), gray(cb).index(c)


def rc_minterm(r, c, n):
    rb, cb = layout(n)
    return (gray(rb)[r] << cb) | gray(cb)[c]


def map_grid(ones, dcs, n):
    """The map as rows of '1' / '0' / 'X'."""
    rb, cb = layout(n)
    R, C = 2 ** rb, 2 ** cb
    g = [["0"] * C for _ in range(R)]
    for m in range(2 ** n):
        r, c = cell_rc(m, n)
        g[r][c] = "1" if m in ones else "X" if m in dcs else "0"
    return g


def _runs(idx, size):
    """Split a set of positions on a cyclic axis of `size` into contiguous runs (start, length)."""
    idx = sorted(set(idx))
    if len(idx) == size:
        return [(0, size)]
    # rotate so that a gap comes first
    runs, start, prev = [], None, None
    for i in idx:
        if start is None:
            start = prev = i
        elif i == prev + 1:
            prev = i
        else:
            runs.append((start, prev - start + 1))
            start = prev = i
    runs.append((start, prev - start + 1))
    if len(runs) > 1 and runs[0][0] == 0 and runs[-1][0] + runs[-1][1] == size:
        # wrap-around: the last run continues into the first; keep them as two drawn pieces
        pass
    return runs


def loop_rects(cube, n):
    """Rectangles (row, col, rows, cols) that draw a cube on the standard map; a wrap-around
    group is drawn as 2 or 4 pieces that touch the map edges."""
    cs = cells(cube)
    pos = [cell_rc(m, n) for m in cs]
    rb, cb = layout(n)
    rr = _runs([p[0] for p in pos], 2 ** rb)
    cc = _runs([p[1] for p in pos], 2 ** cb)
    return [(r0, c0, rl, cl) for r0, rl in rr for c0, cl in cc]


def adjacent(a, b):
    x = a ^ b
    return x and not (x & (x - 1))


def map_neighbours(m, n):
    return sorted(m ^ (1 << k) for k in range(n))


G2 = ["00", "01", "11", "10"]


def from_map(rows, row_vars, col_vars, vars_, row_labels=G2, col_labels=G2):
    """(ones, dcs) over vars_ of a printed map given as strings of '1' / '0' / 'X', one per row."""
    ones, dcs = [], []
    for r, rl in enumerate(row_labels):
        for c, cl in enumerate(col_labels):
            env = dict(zip(row_vars, rl))
            env.update(zip(col_vars, cl))
            m = int("".join(env[x] for x in vars_), 2)
            v = rows[r][c]
            if v == "1":
                ones.append(m)
            elif v in "Xx×":
                dcs.append(m)
    return sorted(ones), sorted(dcs)


def relabel(ms, from_vars, to_vars):
    """The same cells numbered under another variable order."""
    n = len(from_vars)
    out = []
    for m in ms:
        bits = dict(zip(from_vars, format(m, f"0{n}b")))
        out.append(int("".join(bits[v] for v in to_vars), 2))
    return sorted(out)


# ── Dependence, hazards, multi-output ──────────────────────────────────────


def depends(ones, n):
    t = bl.from_minterms(ones, n)
    return [k for k in range(n) if bl.depends_on(t, k)]


def static1_hazards(cover, ones):
    """Pairs of adjacent 1-cells that no single term of the SOP cover contains (static-1 hazards)."""
    s = sorted(ones)
    out = []
    for a, b in combinations(s, 2):
        if adjacent(a, b) and not any(a in cells(c) and b in cells(c) for c in cover):
            out.append((a, b))
    return out


def multi_output_cost(funcs, n, shared=True):
    """Cheapest two-level AND–OR cost for several outputs, by exhaustive search over product terms.

    funcs: list of (ones, dcs). Cost = (number of distinct AND gates with ≥ 2 literals,
    total gate inputs) where a single-literal term needs no AND gate. With shared=False each
    output's minimal cover is costed separately (no sharing). Returns (cost, choice)."""
    if not shared:
        tot_and, tot_in, choice = 0, 0, []
        for ones, dcs in funcs:
            cov = min_covers(ones, dcs, n, "terms")[0]
            choice.append(cov)
            tot_and += sum(1 for c in cov if literals(c) >= 2)
            tot_in += sum(literals(c) for c in cov if literals(c) >= 2) + (len(cov) if len(cov) > 1 else 0)
        return (tot_and, tot_in), choice
    # candidate terms: every implicant of at least one output
    cands = sorted({c for ones, dcs in funcs for c in implicants(ones, dcs, n)}, key=cube_key)
    best = None
    for k in range(1, 7):
        for comb in combinations(cands, k):
            choice = []
            ok = True
            for ones, dcs in funcs:
                allowed = set(ones) | set(dcs)
                usable = [c for c in comb if set(cells(c)) <= allowed]
                cov = set().union(*(set(cells(c)) for c in usable)) if usable else set()
                if not set(ones) <= cov:
                    ok = False
                    break
                # smallest sub-cover of usable for this output
                sub = None
                for j in range(1, len(usable) + 1):
                    for s in combinations(usable, j):
                        if set(ones) <= set().union(*(set(cells(c)) for c in s)):
                            sub = s
                            break
                    if sub:
                        break
                choice.append(sub)
            if not ok:
                continue
            used = {c for s in choice for c in s}
            if any(c not in used for c in comb):
                continue
            ands = [c for c in used if literals(c) >= 2]
            ins = sum(literals(c) for c in ands) + sum(len(s) for s in choice if len(s) > 1)
            cst = (len(ands), ins)
            if best is None or cst < best[0]:
                best = (cst, choice)
        if best:
            return best
    return best


def min_gates_lits(ones, n, gate="NOR", dcs=(), max_k=5):
    """Fewest 2-input `gate`s computing f (agreeing on care rows) when every input and its
    complement is available. Exhaustive iterative deepening; returns 0 when f is a literal or a constant."""
    R = 2 ** n
    full = (1 << R) - 1
    care = full & ~sum(1 << m for m in dcs)
    goal = sum(1 << m for m in ones)
    ins = bl.input_masks(n)
    start = ins + [full ^ x for x in ins]
    op = bl.GATE2[gate]

    def hit(s):
        return (s & care) == (goal & care)

    if any(hit(s) for s in start) or hit(0) or hit(full):
        return 0
    cache = {}

    def apply(a, b):
        if (a, b) not in cache:
            cache[(a, b)] = bl._mask_op(op, a, b, R)
        return cache[(a, b)]

    def dfs(sig, k):
        m = len(sig)
        for i in range(m):
            for j in range(i, m):
                s = apply(sig[i], sig[j])
                if hit(s):
                    return True
                if k > 1 and s not in sig and dfs(sig + [s], k - 1):
                    return True
        return False

    for k in range(1, max_k + 1):
        if dfs(start, k):
            return k
    return None


# ── Variable-entered maps ──────────────────────────────────────────────────


def vem_expand(entries, map_vars, entered):
    """A VEM over map_vars with cell entries ('0', '1', 'X', 'v', "v'") → (ones, dcs) over
    map_vars + [entered] (the entered variable becomes the least significant bit)."""
    k = len(map_vars)
    ones, dcs = [], []
    for idx, e in enumerate(entries):
        for v in (0, 1):
            m = (idx << 1) | v
            val = {"0": 0, "1": 1, "X": None, entered: v, entered + "'": 1 - v}[e]
            if val is None:
                dcs.append(m)
            elif val:
                ones.append(m)
    return ones, dcs


# ── Lesson and practice helpers ────────────────────────────────────────────


def lesson_text(name):
    return (CH3 / name).read_text()


def practice():
    p = CH3 / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


def sop_ones(expr, vars_):
    """Minterms of an SOP written in the lessons' notation (via boollib's parser)."""
    return bl.minterms(expr, vars_)


# ── Self-test ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    assert cells("1-0") == [4, 6] and literals("1-0") == 2 and term("1-0", list("ABC")) == "AC'"
    assert sum_term("0-1", list("ABC")) == "(A + C')"
    assert parse_term("AB'", list("ABC")) == "10-" and parse_term("A'C", list("ABC")) == "0-1"
    assert gray(2) == [0, 1, 3, 2] and gray(3) == [0, 1, 3, 2, 6, 7, 5, 4]
    assert cell_rc(2, 4) == (0, 3) and cell_rc(8, 4) == (3, 0) and cell_rc(13, 4) == (2, 1) and rc_minterm(2, 1, 4) == 13
    # Corner quad of a 4-variable map: B'D' = 0, 2, 8, 10 drawn as four corner pieces.
    assert cells("-0-0") == [0, 2, 8, 10] and len(loop_rects("-0-0", 4)) == 4
    assert loop_rects("--01", 4) == [(0, 1, 4, 1)] and len(loop_rects("0--0", 4)) == 2
    # Q–M equals brute force on every 3-variable function and on random 4-variable ones with don't cares.
    for t in bl.all_functions(3):
        ones = [i for i, v in enumerate(t) if v]
        if ones:
            assert [p for p in qm(ones, [], 3)[1] if set(cells(p)) & set(ones)] == primes_brute(ones, [], 3)
            assert min_covers(ones, [], 3) == min_covers_brute(ones, [], 3)
    import random
    rnd = random.Random(7)
    for _ in range(300):
        vals = [rnd.choice("01X") for _ in range(16)]
        ones = [i for i, v in enumerate(vals) if v == "1"]
        dcs = [i for i, v in enumerate(vals) if v == "X"]
        if not ones:
            continue
        ps = primes(ones, dcs, 4)
        for kind in ("literals", "terms"):
            assert min_covers(ones, dcs, 4, kind) == min_covers_brute(ones, dcs, 4, kind)
        for cov in min_covers(ones, dcs, 4):
            assert agrees(cover_fn(cov, 4), ones, dcs, 4)
        for cov in min_pos_covers(ones, dcs, 4):
            assert agrees(pos_fn(cov, 4), ones, dcs, 4)
    # Classic results.
    assert len(primes([0, 1, 5, 8, 12, 13], [], 4)) == 6 and not essential([0, 1, 5, 8, 12, 13], [], 4)
    assert len(implicants([0, 1, 5, 8, 12, 13], [], 4)) == 12
    two = [set(s.split(" + ")) for s in min_sop([1, 2, 3, 4, 5, 6], [], 3, list("abc"))]
    assert sorted(map(sorted, two)) == [["a'b", "ac'", "b'c"], ["a'c", "ab'", "bc'"]]
    assert min_gates_lits(bl.minterms("x \\oplus y", ["x", "y"]), 2, "NAND") == 3
    ones, dcs = vem_expand(["1", "0", "A'", "A"], ["B", "C"], "A")
    assert ones == [0, 1, 4, 7] and dcs == []
    print("minlib: cubes, Q–M = brute force, Petrick = exhaustive covers, POS, K-map geometry, gate search self-test OK")
