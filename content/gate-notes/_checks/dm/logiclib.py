"""Propositional logic for the Discrete Mathematics checks (Chapter 1) and the Truth Table Lab.

Formulas are parsed from text with the usual precedence (highest first):
    ¬ (also ~ ! not)   ∧ (& and /\\)   ∨ (| or \\/)   ⊕ (xor)   → (-> => implies)   ↔ (<-> <=> iff ≡)
→ is right-associative (p → q → r = p → (q → r)); ∧ ∨ ⊕ ↔ are left-associative. Constants T/F, 1/0,
true/false. Variables are letters (optionally followed by digits). LaTeX spellings (\\neg, \\wedge,
\\vee, \\rightarrow, \\Rightarrow, \\leftrightarrow, \\Leftrightarrow, \\oplus, \\lnot, \\land, \\lor, \\to,
\\iff, \\sim) are accepted, so PYQ options can be parsed directly.

A formula is a tuple tree: ('var', name) | ('const', bool) | ('not', a) | (op, a, b) with op in
and/or/xor/imp/iff, or ('op', table, a, b) for an operator given by its 4-row truth table
(TT, TF, FT, FF order).
"""
import itertools
import re

_TOKEN = re.compile(r"""
    \s*(?:
      (?P<lp>[(\[{])|(?P<rp>[)\]}])|
      (?P<iff>↔|⟷|⇔|<->|<=>|\\leftrightarrow|\\Leftrightarrow|\\iff|\\equiv|≡|\biff\b)|
      (?P<imp>→|⇒|->|=>|\\rightarrow|\\Rightarrow|\\to(?![a-zA-Z])|\\implies|\bimplies\b)|
      (?P<xor>⊕|\\oplus|\bxor\b)|
      (?P<or>∨|\\vee|\\lor|\|\||\||\bor\b|\\/)|
      (?P<and>∧|\\wedge|\\land|&&|&|\band\b|/\\)|
      (?P<not>¬|~|!|\\neg|\\lnot|\\sim|\bnot\b)|
      (?P<const>\bT\b|\bF\b|\btrue\b|\bfalse\b|\bTrue\b|\bFalse\b|\b[01]\b)|
      (?P<var>[A-Za-z][A-Za-z0-9_]*)
    )""", re.X)

PREC = {"iff": 1, "imp": 2, "xor": 3, "or": 4, "and": 5}
RIGHT = {"imp"}


def tokens(s):
    s = re.sub(r"\\(left|right|big|Big|bigl|bigr)(?![a-zA-Z])", "", s.replace("$", "")).replace("\\,", " ").replace("\\;", " ").replace("\\ ", " ")
    s = s.replace("\\text{", "{").replace("\\mathrm{", "{")
    out, i = [], 0
    while i < len(s):
        if s[i].isspace():
            i += 1
            continue
        m = _TOKEN.match(s, i)
        if not m or m.end() == i:
            raise ValueError(f"cannot parse at {s[i:i + 12]!r} in {s!r}")
        kind = m.lastgroup
        val = m.group(kind)
        out.append((kind, val))
        i = m.end()
    return out


def parse(s, ops=None):
    """Parse text into a formula. ops maps extra infix symbols (e.g. '⊙', '□') to 4-row tables."""
    ops = ops or {}
    if ops:
        for sym in ops:
            s = s.replace(sym, f" @{list(ops).index(sym)} ")
    toks = []
    for part in re.split(r"(@\d+)", s):
        if re.fullmatch(r"@\d+", part):
            toks.append(("custom", int(part[1:])))
        elif part.strip():
            toks += tokens(part)
    tables = list(ops.values())
    pos = 0

    def peek():
        return toks[pos] if pos < len(toks) else (None, None)

    def atom():
        nonlocal pos
        k, v = peek()
        if k == "not":
            pos += 1
            return ("not", atom())
        if k == "lp":
            pos += 1
            e = expr(0)
            assert peek()[0] == "rp", f"missing ) in {s!r}"
            pos += 1
            return e
        if k == "const":
            pos += 1
            return ("const", v in ("T", "true", "True", "1"))
        if k == "var":
            pos += 1
            return ("var", v)
        raise ValueError(f"unexpected {v!r} in {s!r}")

    def expr(minp):
        nonlocal pos
        left = atom()
        while True:
            k, v = peek()
            if k == "custom":
                p = 3
                if p < minp:
                    break
                pos += 1
                right = expr(p + 1)
                left = ("op", tables[v], left, right)
                continue
            if k not in PREC or PREC[k] < minp:
                break
            pos += 1
            right = expr(PREC[k] if k in RIGHT else PREC[k] + 1)
            left = (k, left, right)
        return left

    e = expr(0)
    assert pos == len(toks), f"trailing tokens in {s!r}: {toks[pos:]}"
    return e


def variables(e, acc=None):
    acc = [] if acc is None else acc
    if e[0] == "var":
        if e[1] not in acc:
            acc.append(e[1])
    elif e[0] == "const":
        pass
    elif e[0] == "not":
        variables(e[1], acc)
    elif e[0] == "op":
        variables(e[2], acc)
        variables(e[3], acc)
    else:
        variables(e[1], acc)
        variables(e[2], acc)
    return acc


def ev(e, env):
    k = e[0]
    if k == "var":
        return env[e[1]]
    if k == "const":
        return e[1]
    if k == "not":
        return not ev(e[1], env)
    if k == "op":
        a, b = ev(e[2], env), ev(e[3], env)
        return e[1][(0 if a else 2) + (0 if b else 1)]
    a, b = ev(e[1], env), ev(e[2], env)
    return {"and": a and b, "or": a or b, "xor": a != b, "imp": (not a) or b, "iff": a == b}[k]


def F(x, ops=None):
    return parse(x, ops) if isinstance(x, str) else x


def rows(vars_):
    """Assignments in truth-table order: first row all T (the usual logic-book order)."""
    for bits in itertools.product([True, False], repeat=len(vars_)):
        yield dict(zip(vars_, bits))


def table(x, vars_=None, ops=None):
    e = F(x, ops)
    vars_ = vars_ or sorted(variables(e))
    return [ev(e, r) for r in rows(vars_)]


def classify(x, vars_=None, ops=None):
    t = table(x, vars_, ops)
    return "tautology" if all(t) else "contradiction" if not any(t) else "contingency"


def is_taut(x, ops=None):
    return classify(x, ops=ops) == "tautology"


def is_sat(x, ops=None):
    return classify(x, ops=ops) != "contradiction"


def equivalent(a, b, ops=None):
    ea, eb = F(a, ops), F(b, ops)
    vs = sorted(set(variables(ea)) | set(variables(eb)))
    return all(ev(ea, r) == ev(eb, r) for r in rows(vs))


def implies(a, b, ops=None):
    ea, eb = F(a, ops), F(b, ops)
    vs = sorted(set(variables(ea)) | set(variables(eb)))
    return all((not ev(ea, r)) or ev(eb, r) for r in rows(vs))


def counterexample(a, b, ops=None):
    """A row where a and b differ (None when equivalent)."""
    ea, eb = F(a, ops), F(b, ops)
    vs = sorted(set(variables(ea)) | set(variables(eb)))
    return next((r for r in rows(vs) if ev(ea, r) != ev(eb, r)), None)


def valid_argument(premises, conclusion, ops=None):
    """Valid iff every row making all premises true makes the conclusion true."""
    ps = [F(p, ops) for p in premises]
    c = F(conclusion, ops)
    vs = sorted(set().union(*[set(variables(p)) for p in ps], set(variables(c))))
    bad = [r for r in rows(vs) if all(ev(p, r) for p in ps) and not ev(c, r)]
    return not bad, bad


def consistent(formulas, ops=None):
    fs = [F(f, ops) for f in formulas]
    vs = sorted(set().union(*[set(variables(f)) for f in fs]))
    return any(all(ev(f, r) for f in fs) for r in rows(vs))


# Minterm / maxterm numbering: variables in the given order, the FIRST variable is the most significant
# bit, and a variable's bit is 1 when the variable is true (the textbook / digital-logic convention).

def index_of(env, vars_):
    return int("".join("1" if env[v] else "0" for v in vars_) or "0", 2)


def minterms(x, vars_, ops=None):
    e = F(x, ops)
    return sorted(index_of(r, vars_) for r in rows(vars_) if ev(e, r))


def maxterms(x, vars_, ops=None):
    e = F(x, ops)
    return sorted(index_of(r, vars_) for r in rows(vars_) if not ev(e, r))


def clause_index(clause, vars_):
    """Index of a full clause (disjunction of one literal per variable) = the row that makes it false."""
    lits = parse_clause(clause)
    assert sorted(lits) == sorted(vars_), f"{clause} is not a maxterm over {vars_}"
    return int("".join("0" if lits[v] else "1" for v in vars_), 2)


def parse_clause(s):
    """'P ∨ ¬Q ∨ R' -> {'P': True, 'Q': False, 'R': True} (True = positive literal)."""
    e = F(s)
    out = {}

    def walk(x):
        if x[0] == "or":
            walk(x[1])
            walk(x[2])
        elif x[0] == "var":
            out[x[1]] = True
        elif x[0] == "not" and x[1][0] == "var":
            out[x[1][1]] = False
        else:
            raise ValueError(f"not a clause: {s}")
    walk(e)
    return out


def dnf(ms, vars_):
    terms = []
    for m in ms:
        bits = format(m, f"0{len(vars_)}b")
        terms.append("(" + " ∧ ".join(v if b == "1" else "¬" + v for v, b in zip(vars_, bits)) + ")")
    if terms and not vars_:
        return "T"  # a constants-only formula that is true
    return " ∨ ".join(terms) if terms else "F"


def cnf(Ms, vars_):
    cl = []
    for m in Ms:
        bits = format(m, f"0{len(vars_)}b")
        cl.append("(" + " ∨ ".join("¬" + v if b == "1" else v for v, b in zip(vars_, bits)) + ")")
    if cl and not vars_:
        return "F"  # a constants-only formula that is false
    return " ∧ ".join(cl) if cl else "T"


def to_str(e):
    k = e[0]
    if k == "var":
        return e[1]
    if k == "const":
        return "T" if e[1] else "F"
    if k == "not":
        return "¬" + to_str(e[1])  # a binary operand is already bracketed
    sym = {"and": "∧", "or": "∨", "xor": "⊕", "imp": "→", "iff": "↔"}
    if k == "op":
        return f"({to_str(e[2])} ⊙ {to_str(e[3])})"
    return f"({to_str(e[1])} {sym[k]} {to_str(e[2])})"


# ── Functional completeness (Post's five classes) ─────────────────────────

def all_tables(n):
    return list(itertools.product([True, False], repeat=2 ** n))


def _t(fn, n):
    return tuple(fn(*r) for r in itertools.product([True, False], repeat=n))


def post_classes(t):
    """t is a truth table in rows() order (first row all-True). Returns the Post classes it lies in."""
    n = (len(t)).bit_length() - 1
    rs = list(itertools.product([True, False], repeat=n))
    v = dict(zip(rs, t))
    out = set()
    if v[tuple([False] * n)] is False:
        out.add("T0")
    if v[tuple([True] * n)] is True:
        out.add("T1")
    if all(v[r] != v[tuple(not x for x in r)] for r in rs):
        out.add("self-dual")
    if all(not (all(a <= b for a, b in zip(r, s)) and v[r] > v[s]) for r in rs for s in rs):
        out.add("monotone")
    # affine: f = c0 xor c1 x1 xor ... ; test all 2^(n+1) affine functions
    for cs in itertools.product([False, True], repeat=n + 1):
        if all(v[r] == (cs[0] ^ any_xor(c and x for c, x in zip(cs[1:], r))) for r in rs):
            out.add("affine")
            break
    return out


def any_xor(it):
    r = False
    for x in it:
        r ^= bool(x)
    return r


CLASSES = ("T0", "T1", "self-dual", "monotone", "affine")


def complete(tables):
    """Post: a set of connectives is complete iff for each class some member lies outside it."""
    return all(any(c not in post_classes(t) for t in tables) for c in CLASSES)


CONNECTIVES = {
    "not": _t(lambda a: not a, 1),
    "and": _t(lambda a, b: a and b, 2),
    "or": _t(lambda a, b: a or b, 2),
    "imp": _t(lambda a, b: (not a) or b, 2),
    "iff": _t(lambda a, b: a == b, 2),
    "xor": _t(lambda a, b: a != b, 2),
    "nand": _t(lambda a, b: not (a and b), 2),
    "nor": _t(lambda a, b: not (a or b), 2),
    "T": (True,),
    "F": (False,),
}


def complete_set(names):
    return complete([CONNECTIVES[n] for n in names])


# ── Resolution ─────────────────────────────────────────────────────────────

def resolve(c1, c2):
    """All resolvents of two clauses given as frozensets of literals ('P', '¬P')."""
    out = []
    for l in c1:
        neg = l[1:] if l.startswith("¬") else "¬" + l
        if neg in c2:
            out.append(frozenset((c1 - {l}) | (c2 - {neg})))
    return out


def refutable(clauses):
    """Resolution saturation: True when the empty clause is derived (clause set unsatisfiable)."""
    S = {frozenset(c) for c in clauses}
    while True:
        new = set()
        for a, b in itertools.combinations(S, 2):
            for r in resolve(a, b):
                if not r:
                    return True
                new.add(r)
        if new <= S:
            return False
        S |= new
