"""Shared Boolean-algebra helpers for the Digital Logic Chapter 2 checks.

Everything is decided by truth-table enumeration (itertools), so a check never trusts an
algebraic simplification: two expressions are equal exactly when they agree on every row.
sympy is used only as an independent cross-check (`sympy_equivalent`).

Notation understood by `parse` (the notation of the lessons, options and PYQs):
  variables   A, x, x_1, x_{12}, S1           constants   0, 1
  NOT         x'  x′  \\bar{x}  \\bar x  \\overline{…}  \\neg x  ~x  !x
  AND         juxtaposition, \\cdot, \\,.\\, , ·        (binds tighter than XOR)
  XOR / XNOR  \\oplus, ⊕ / \\odot, ⊙                    (bind tighter than OR)
  NAND / NOR  \\uparrow / \\downarrow (as binary operators, same level as XOR)
  OR          +
Truth-table rows are numbered with the first variable as the most significant bit.

Run directly, it self-tests (and run_checks.py runs it as a check).
"""
from itertools import combinations, product
from math import comb
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[4]
CONTENT = ROOT / "content" / "gate-notes" / "dl"
CH2 = CONTENT / "02-boolean-algebra-gates"

# ── Parsing ────────────────────────────────────────────────────────────────

_TOKEN = re.compile(r"""
    (?P<ws>\s+|\\,|\\;|\\!|\\quad|\\big|\\Big|\\left|\\right|\{\}) |
    (?P<over>\\overline|\\bar) |
    (?P<neg>\\neg|~|!|¬) |
    (?P<and>\\cdot|\\wedge|·|\*|\.) |
    (?P<or>\+|\\vee) |
    (?P<xor>\\oplus|⊕) |
    (?P<xnor>\\odot|⊙) |
    (?P<nand>\\uparrow|↑) |
    (?P<nor>\\downarrow|↓) |
    (?P<prime>'|′) |
    (?P<lp>\(|\[) | (?P<rp>\)|\]) |
    (?P<lb>\{) | (?P<rb>\}) |
    (?P<const>[01](?![0-9])) |
    (?P<var>[A-Za-z](?:_(?:\{\d+\}|\d+)|\d+)?)
""", re.X)


def tokens(s):
    out, i = [], 0
    while i < len(s):
        m = _TOKEN.match(s, i)
        if not m:
            raise ValueError(f"cannot read {s[i:i+12]!r} in {s!r}")
        i = m.end()
        kind = m.lastgroup
        if kind == "ws":
            continue
        out.append((kind, m.group()))
    return out


class _Parser:
    def __init__(self, s):
        self.t = tokens(s)
        self.i = 0
        self.src = s

    def peek(self):
        return self.t[self.i][0] if self.i < len(self.t) else None

    def take(self, kind=None):
        k, v = self.t[self.i]
        if kind and k != kind:
            raise ValueError(f"expected {kind} at token {self.i} in {self.src!r}, got {v!r}")
        self.i += 1
        return v

    def parse(self):
        e = self.or_()
        if self.i != len(self.t):
            raise ValueError(f"unexpected {self.t[self.i][1]!r} in {self.src!r}")
        return e

    def or_(self):
        e = self.xor_()
        while self.peek() == "or":
            self.take()
            e = ("or", e, self.xor_())
        return e

    def xor_(self):
        e = self.and_()
        while self.peek() in ("xor", "xnor", "nand", "nor"):
            op = self.take() and self.t[self.i - 1][0]
            e = (op, e, self.and_())
        return e

    def and_(self):
        e = self.unary()
        while True:
            if self.peek() == "and":
                self.take()
                e = ("and", e, self.unary())
            elif self.peek() in ("over", "neg", "lp", "lb", "const", "var"):
                e = ("and", e, self.unary())
            else:
                return e

    def unary(self):
        k = self.peek()
        if k == "neg":
            self.take()
            return self.postfix(("not", self.unary()))
        if k == "over":
            self.take()
            if self.peek() == "lb":
                self.take()
                inner = self.or_()
                self.take("rb")
            else:
                inner = self.atom()
            return self.postfix(("not", inner))
        return self.postfix(self.atom())

    def postfix(self, e):
        while self.peek() == "prime":
            self.take()
            e = ("not", e)
        return e

    def atom(self):
        k = self.peek()
        if k == "lp":
            self.take()
            e = self.or_()
            self.take("rp")
            return e
        if k == "lb":
            self.take()
            e = self.or_()
            self.take("rb")
            return e
        if k == "const":
            return ("const", int(self.take()))
        if k == "var":
            return ("var", re.sub(r"[_{}]", "", self.take()))
        raise ValueError(f"unexpected {self.t[self.i][1] if self.i < len(self.t) else 'end'} in {self.src!r}")


def parse(s):
    s = s.replace("$", "")
    # \bar{x}_1 means the complement of x_1: move the subscript inside the braces.
    s = re.sub(r"\\(bar|overline)\{([A-Za-z])\}_\{?(\d+)\}?", r"\\\1{\2_\3}", s)
    return _Parser(s).parse()


def variables(e):
    if e[0] == "var":
        return {e[1]}
    if e[0] == "const":
        return set()
    return set().union(*(variables(x) for x in e[1:]))


def ev(e, env):
    k = e[0]
    if k == "var":
        return env[e[1]]
    if k == "const":
        return e[1]
    if k == "not":
        return 1 - ev(e[1], env)
    a, b = ev(e[1], env), ev(e[2], env)
    return {"and": a & b, "or": a | b, "xor": a ^ b, "xnor": 1 - (a ^ b), "nand": 1 - (a & b), "nor": 1 - (a | b)}[k]


def rows(vars_):
    """Every assignment, in row order (first variable = most significant bit)."""
    for bits in product((0, 1), repeat=len(vars_)):
        yield dict(zip(vars_, bits))


def tt(expr, vars_):
    """Truth table (tuple of 0/1, one per row) of an expression string, AST or Python callable."""
    if isinstance(expr, str):
        expr = parse(expr)
    if callable(expr):
        return tuple(int(expr(**r)) & 1 for r in rows(vars_))
    extra = variables(expr) - set(vars_)
    assert not extra, f"variables {extra} are not in {vars_}"
    return tuple(ev(expr, r) for r in rows(vars_))


def minterms(expr, vars_):
    return [i for i, v in enumerate(tt(expr, vars_)) if v]


def maxterms(expr, vars_):
    return [i for i, v in enumerate(tt(expr, vars_)) if not v]


def from_minterms(ms, n):
    s = set(ms)
    return tuple(1 if i in s else 0 for i in range(2 ** n))


def equal(a, b, vars_):
    return tt(a, vars_) == tt(b, vars_)


def counterexample(a, b, vars_):
    """The first row where a and b differ, or None."""
    for r, x, y in zip(rows(vars_), tt(a, vars_), tt(b, vars_)):
        if x != y:
            return r
    return None


# ── Duals ──────────────────────────────────────────────────────────────────

_DUAL = {"and": "or", "or": "and", "xor": "xnor", "xnor": "xor", "nand": "nor", "nor": "nand"}


def dual(e):
    """The syntactic dual: swap AND/OR (and XOR/XNOR, NAND/NOR) and the constants 0/1."""
    if isinstance(e, str):
        e = parse(e)
    k = e[0]
    if k == "var":
        return e
    if k == "const":
        return ("const", 1 - e[1])
    if k == "not":
        return ("not", dual(e[1]))
    return (_DUAL[k], dual(e[1]), dual(e[2]))


def dual_tt(t):
    """f^D(x) = f(x′)′ on a truth table."""
    m = len(t) - 1
    return tuple(1 - t[m ^ i] for i in range(len(t)))


def complement_tt(t):
    return tuple(1 - v for v in t)


def to_str(e):
    k = e[0]
    if k == "var":
        return e[1]
    if k == "const":
        return str(e[1])
    if k == "not":
        inner = to_str(e[1])
        return inner + "'" if e[1][0] in ("var", "const") else f"({inner})'"
    sym = {"and": "", "or": " + ", "xor": " ⊕ ", "xnor": " ⊙ ", "nand": " ↑ ", "nor": " ↓ "}[k]

    def wrap(x):
        s = to_str(x)
        if k == "and" and x[0] in ("or", "xor", "xnor", "nand", "nor"):
            return f"({s})"
        if k in ("xor", "xnor", "nand", "nor") and x[0] == "or":
            return f"({s})"
        return s

    return wrap(e[1]) + sym + wrap(e[2])


# ── Function classes and counts ────────────────────────────────────────────

def n_of(t):
    n = (len(t) - 1).bit_length()
    assert 2 ** n == len(t)
    return n


def is_self_dual(t):
    return dual_tt(t) == tuple(t)


def is_neutral(t):
    return sum(t) * 2 == len(t)


def preserves0(t):
    return t[0] == 0


def preserves1(t):
    return t[-1] == 1


def is_monotone(t):
    return all(t[i] <= t[j] for i in range(len(t)) for j in range(len(t)) if i & ~j == 0)


def anf(t):
    """Algebraic normal form coefficients (Möbius transform): f = XOR of a_S · ∏_{i∈S} x_i."""
    a = list(t)
    n = n_of(t)
    for k in range(n):
        bit = 1 << k
        for i in range(len(a)):
            if i & bit:
                a[i] ^= a[i ^ bit]
    return a


def is_affine(t):
    return all(c == 0 or bin(i).count("1") <= 1 for i, c in enumerate(anf(t)))


POST = ("0-preserving", "1-preserving", "self-dual", "monotone", "affine")


def post_classes(t):
    """Which of Post's five closed classes contain f."""
    return {"0-preserving": preserves0(t), "1-preserving": preserves1(t), "self-dual": is_self_dual(t),
            "monotone": is_monotone(t), "affine": is_affine(t)}


def complete(functions, constants=()):
    """Post's criterion: complete iff, for every class, some member (or a free constant) lies outside it."""
    fs = list(functions) + [(c,) for c in constants]  # a constant is a 0-ary function
    def outside(cls, t):
        if len(t) == 1:  # constants: 0 is not 1-preserving/self-dual; 1 is not 0-preserving/self-dual
            c = t[0]
            return {"0-preserving": c == 1, "1-preserving": c == 0, "self-dual": True, "monotone": False, "affine": False}[cls]
        return not post_classes(t)[cls]
    return all(any(outside(cls, t) for t in fs) for cls in POST)


def all_functions(n):
    return product((0, 1), repeat=2 ** n)


def depends_on(t, k):
    """Does f depend on variable k (0 = first, most significant)?"""
    n = n_of(t)
    bit = 1 << (n - 1 - k)
    return any(t[i] != t[i ^ bit] for i in range(len(t)))


def is_symmetric(t):
    n = n_of(t)
    by_weight = {}
    for i, v in enumerate(t):
        w = bin(i).count("1")
        if by_weight.setdefault(w, v) != v:
            return False
    return True


# ── Minimum gate counts by exhaustive search ───────────────────────────────

GATE2 = {"NAND": lambda a, b: 1 - (a & b), "NOR": lambda a, b: 1 - (a | b), "AND": lambda a, b: a & b,
         "OR": lambda a, b: a | b, "XOR": lambda a, b: a ^ b, "XNOR": lambda a, b: 1 - (a ^ b),
         "IMP": lambda a, b: (1 - a) | b}


def _mask_op(op, a, b, rows_):
    out = 0
    for r in range(rows_):
        if op((a >> r) & 1, (b >> r) & 1):
            out |= 1 << r
    return out


def tt_to_mask(t):
    return sum(1 << r for r, v in enumerate(t) if v)


def input_masks(n):
    """Bitmask of each input over rows 0 … 2ⁿ − 1 (bit r = row r)."""
    return [tt_to_mask(tuple((r >> (n - 1 - k)) & 1 for r in range(2 ** n))) for k in range(n)]


def min_gates(target, gate="NAND", max_k=6, constants=False):
    """Fewest 2-input `gate`s computing truth table `target` from the n inputs (fan-out free to use).

    Exhaustive iterative deepening over straight-line circuits; a new gate whose output equals an
    existing signal is never useful and is skipped. Returns None if more than max_k are needed."""
    n = n_of(target)
    R = 2 ** n
    op = GATE2[gate]
    goal = tt_to_mask(target)
    start = input_masks(n) + ([0, (1 << R) - 1] if constants else [])
    if goal in start:
        return 0
    cache = {}

    def apply(a, b):
        key = (a, b)
        if key not in cache:
            cache[key] = _mask_op(op, a, b, R)
        return cache[key]

    def dfs(sig, k):
        if k == 0:
            return False
        m = len(sig)
        for i in range(m):
            for j in range(i, m):
                s = apply(sig[i], sig[j])
                if s == goal:
                    return True
                if k > 1 and s not in sig and dfs(sig + [s], k - 1):
                    return True
        return False

    for k in range(1, max_k + 1):
        if dfs(start, k):
            return k
    return None


# ── Viz geometry mirror (client/src/viz/geometry.ts → gateShape) ───────────

def _r2(x):
    return round(x * 100) / 100 + 0.0


def gate_bubble_r(h):
    return _r2(max(3, min(7, h * 0.12)))


def gate_pins(kind, x, y, w, h, inputs=None, bubbles=()):
    """Input pin points and the output point of a Viz `gate`, exactly as the reader draws them."""
    single = kind in ("not", "buf")
    n = 1 if single else (inputs or 2)
    r = gate_bubble_r(h)
    inv = kind in ("nand", "nor", "xnor", "not")
    wb = max(4, w - (2 * r if inv else 0))
    xor = kind in ("xor", "xnor")
    gap = _r2(min(8, 0.14 * wb)) if xor else 0
    bx, bw = x + gap, wb - gap
    pins = []
    for k in range(n):
        py = y + h * (k + 1) / (n + 1)
        t = (py - y) / h
        px = ((x if xor else bx) + 0.5 * bw * t * (1 - t)) if kind in ("or", "nor", "xor", "xnor") else x
        if k in bubbles:
            px -= 2 * r
        pins.append([_r2(px), _r2(py)])
    return pins, [_r2(x + w), _r2(y + h / 2)]


# ── Practice and lesson helpers ────────────────────────────────────────────

def lesson_text(name):
    return (CH2 / name).read_text()


def practice():
    p = CH2 / "practice.json"
    return {q["id"]: q for q in json.loads(p.read_text())} if p.exists() else {}


def must_contain(text, *snippets, where="lesson"):
    missing = [s for s in snippets if s not in text]
    assert not missing, f"{where} is missing: {missing}"


def option_values(q):
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
        assert a == computed, f"{q['id']}: key {a} but computed {computed}"
    for w in q["common_wrong"]:
        assert w["answer"] != computed, f"{q['id']}: a common wrong answer equals the key"


def which(options, pred):
    """Letters of the options (dict letter → text) for which pred(text) is true."""
    return sorted(k for k, t in options.items() if pred(t))


def bank():
    return {q["id"]: q for q in json.loads((ROOT / "src" / "gate" / "questions.json").read_text())["questions"]}


def key_letters(answer):
    if isinstance(answer, list):
        return sorted(answer)
    return sorted(x for x in re.split(r"[\s,;]+", str(answer)) if x)


def sympy_equivalent(a, b, vars_):
    """Independent cross-check with sympy: a ⇔ b is a tautology."""
    import sympy
    syms = {v: sympy.Symbol(v) for v in vars_}

    def conv(e):
        k = e[0]
        if k == "var":
            return syms[e[1]]
        if k == "const":
            return sympy.true if e[1] else sympy.false
        if k == "not":
            return sympy.Not(conv(e[1]))
        x, y = conv(e[1]), conv(e[2])
        return {"and": lambda: sympy.And(x, y), "or": lambda: sympy.Or(x, y), "xor": lambda: sympy.Xor(x, y),
                "xnor": lambda: sympy.Not(sympy.Xor(x, y)), "nand": lambda: sympy.Nand(x, y), "nor": lambda: sympy.Nor(x, y)}[k]()

    ea = conv(parse(a) if isinstance(a, str) else a)
    eb = conv(parse(b) if isinstance(b, str) else b)
    return sympy.satisfiable(sympy.Xor(ea, eb)) is False


# ── Self-test ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    V = ["x", "y", "z"]
    assert tt("x'", ["x"]) == (1, 0) and tt("\\overline{x}", ["x"]) == (1, 0) and tt("\\bar x", ["x"]) == (1, 0)
    assert tt("xy + x'y'", ["x", "y"]) == (1, 0, 0, 1) and tt("x \\oplus y", ["x", "y"]) == (0, 1, 1, 0)
    assert tt("\\overline{x + y}", ["x", "y"]) == tt("x'y'", ["x", "y"])
    assert equal("x + x'y", "x + y", V) and equal("xy + x'z + yz", "xy + x'z", V)
    assert not equal("(x + y) \\oplus z", "x \\oplus (y + z)", V)
    assert counterexample("(x + y) \\oplus z", "x \\oplus (y + z)", V) is not None
    assert tt("x_1 x_2", ["x1", "x2"]) == (0, 0, 0, 1) and tt("S1\\,\\overline{S2}", ["S1", "S2"]) == (0, 0, 1, 0)
    assert tt("P.\\overline{Q}", ["P", "Q"]) == (0, 0, 1, 0) and tt("a \\uparrow b", ["a", "b"]) == (1, 1, 1, 0)
    assert minterms("PQ + Q\\overline{R} + P\\overline{R}", ["P", "Q", "R"]) == [2, 4, 6, 7]
    assert tt(dual("xy + z"), V) == tt("(x + y)z", V) and dual_tt(tt("xy + z", V)) == tt("(x + y)z", V)
    maj = tt("xy + yz + zx", V)
    assert is_self_dual(maj) and is_monotone(maj) and not is_affine(maj) and is_symmetric(maj)
    assert is_affine(tt("x \\oplus y \\oplus 1", V)) and not is_monotone(tt("x'", ["x"]))
    nand = tt("(xy)'", ["x", "y"])
    assert complete([nand]) and not complete([tt("x \\oplus y", ["x", "y"])]) and complete([tt("x'+y", ["x", "y"])], constants=(0,))
    assert sum(1 for t in all_functions(2) if complete([t])) == 2
    assert sum(1 for t in all_functions(3) if is_self_dual(t)) == 16 == 2 ** 2 ** 2
    assert min_gates(tt("x \\oplus y", ["x", "y"]), "NAND") == 4 and min_gates(tt("x \\oplus y", ["x", "y"]), "NOR") == 5
    assert min_gates(tt("xy + z", V), "NOR") == 3
    assert gate_pins("nor", 100, 50, 60, 40, 2, (0,)) == ([[96.0, 63.33], [105.6, 76.67]], [160.0, 70.0])
    assert gate_pins("and", 0, 0, 60, 40) == ([[0, 13.33], [0, 26.67]], [60.0, 20.0])
    assert sympy_equivalent("x'y' + xy + x'y", "x' + y", ["x", "y"])
    print("boollib: parser, truth tables, duals, Post classes, gate search and geometry mirror self-test OK")
