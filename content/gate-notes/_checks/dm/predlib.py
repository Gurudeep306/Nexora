"""First-order logic on finite domains for the Discrete Mathematics checks (Chapter 2) and the
Quantifier Lab.

Syntax (Unicode, ASCII or LaTeX, so PYQ options parse verbatim):
    ∀x φ  (\\forall x, forall x, Ax.)      ∃x φ  (\\exists x, exists x, Ex.)      ∃!x φ (unique)
    P(x), R(x, y), Likes(x, y)  predicates (any name starting with a letter, followed by an argument list)
    x = y, x ≠ y                equality on the domain
    ¬ ∧ ∨ → ↔ ⊕ and constants T/F as in logiclib (same precedence; → right-associative).
A quantifier binds as tightly as ¬: it scopes over the next unit (an atom, a bracketed formula, a negation
or another quantifier), so  ∀x P(x) → Q(x)  is  (∀x P(x)) → Q(x) — write brackets for wider scope, as GATE
options do. Optional brackets around the quantifier itself are allowed: (∀x)(P(x) → Q(x)), [∀x] ….

Interpretations: a domain (list of elements) and a dict mapping each predicate name to a set of tuples
(arity 1 predicates use 1-tuples). `valid`, `satisfiable`, `counter_model` search every interpretation of
the formula's predicates over domains of size 1..k (exhaustive, so a "valid" verdict is only up to that
size; the checks use it to *refute* validity, and prove validity separately where needed).
"""
import itertools
import re

TOK = re.compile(r"""\s*(?:
    (?P<lp>[(\[{])|(?P<rp>[)\]}])|(?P<comma>,)|
    (?P<forall>∀|\\forall|\bforall\b)|(?P<exists1>∃!|\\exists\s*!)|(?P<exists>∃|\\exists|\bexists\b)|
    (?P<iff>↔|⇔|<->|<=>|\\leftrightarrow|\\Leftrightarrow|\\iff|≡|\\equiv)|
    (?P<imp>→|⇒|->|=>|\\rightarrow|\\Rightarrow|\\implies|\\to(?![a-zA-Z]))|
    (?P<xor>⊕|\\oplus)|
    (?P<or>∨|\\vee|\\lor|\||\bor\b)|
    (?P<and>∧|\\wedge|\\land|&|\band\b)|
    (?P<neq>≠|\\neq|!=)|(?P<eq>=)|
    (?P<not>¬|~|!|\\neg|\\lnot|\\sim|\bnot\b)|
    (?P<const>\bT\b|\bF\b|\btrue\b|\bfalse\b)|
    (?P<name>[A-Za-z][A-Za-z0-9_]*)
    )""", re.X)
PREC = {"iff": 1, "imp": 2, "xor": 3, "or": 4, "and": 5}


def tokens(s):
    s = re.sub(r"\\(left|right|big|Big|bigl|bigr|mathit|mathrm|text|operatorname)(?![a-zA-Z])", "", s.replace("$", ""))
    s = s.replace("\\,", " ").replace("\\;", " ").replace("\\ ", " ").replace("\\quad", " ")
    out, i = [], 0
    while i < len(s):
        if s[i].isspace() or s[i] == ".":
            i += 1
            continue
        m = TOK.match(s, i)
        if not m or m.end() == i:
            raise ValueError(f"cannot parse at {s[i:i + 12]!r} in {s!r}")
        out.append((m.lastgroup, m.group(m.lastgroup)))
        i = m.end()
    return out


def parse(s):
    toks = tokens(s)
    pos = 0

    def peek(k=0):
        return toks[pos + k] if pos + k < len(toks) else (None, None)

    def quantifier():
        """Return (kind, var) if a quantifier starts here (bare or bracketed), else None."""
        nonlocal pos
        k, _ = peek()
        if k in ("forall", "exists", "exists1") and peek(1)[0] == "name":
            pos += 2
            return k, toks[pos - 1][1]
        if k == "lp" and peek(1)[0] in ("forall", "exists", "exists1") and peek(2)[0] == "name" and peek(3)[0] == "rp":
            pos += 4
            return toks[pos - 3][0], toks[pos - 2][1]
        return None

    def term():
        nonlocal pos
        k, v = peek()
        assert k == "name", f"expected a variable in {s!r}"
        pos += 1
        return v

    def atom():
        nonlocal pos
        q = quantifier()
        if q:
            return (q[0], q[1], atom())
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
            return ("const", v in ("T", "true"))
        if k == "name":
            pos += 1
            if peek()[0] == "lp":
                pos += 1
                args = [term()]
                while peek()[0] == "comma":
                    pos += 1
                    args.append(term())
                assert peek()[0] == "rp", f"missing ) after arguments in {s!r}"
                pos += 1
                return ("pred", v, tuple(args))
            if peek()[0] in ("eq", "neq"):
                op = peek()[0]
                pos += 1
                w = term()
                e = ("eq", v, w)
                return e if op == "eq" else ("not", e)
            return ("pred", v, ())
        raise ValueError(f"unexpected {v!r} in {s!r}")

    def expr(minp):
        nonlocal pos
        left = atom()
        while True:
            k, _ = peek()
            if k not in PREC or PREC[k] < minp:
                break
            pos += 1
            right = expr(PREC[k] if k == "imp" else PREC[k] + 1)
            left = (k, left, right)
        return left

    e = expr(0)
    assert pos == len(toks), f"trailing tokens in {s!r}: {toks[pos:]}"
    return e


def F(x):
    return parse(x) if isinstance(x, str) else x


def predicates(e, acc=None):
    """{name: arity} of the predicates used."""
    acc = {} if acc is None else acc
    k = e[0]
    if k == "pred":
        acc[e[1]] = len(e[2])
    elif k in ("forall", "exists", "exists1"):
        predicates(e[2], acc)
    elif k == "not":
        predicates(e[1], acc)
    elif k in PREC:
        predicates(e[1], acc)
        predicates(e[2], acc)
    return acc


def free_vars(e, bound=frozenset()):
    k = e[0]
    if k == "pred":
        return {a for a in e[2] if a not in bound}
    if k == "eq":
        return {a for a in e[1:] if a not in bound}
    if k in ("forall", "exists", "exists1"):
        return free_vars(e[2], bound | {e[1]})
    if k == "not":
        return free_vars(e[1], bound)
    if k in PREC:
        return free_vars(e[1], bound) | free_vars(e[2], bound)
    return set()


def ev(e, dom, interp, env=None):
    env = env or {}
    k = e[0]
    if k == "const":
        return e[1]
    if k == "pred":
        return tuple(env[a] if a in env else a for a in e[2]) in interp[e[1]]
    if k == "eq":
        return env.get(e[1], e[1]) == env.get(e[2], e[2])
    if k == "not":
        return not ev(e[1], dom, interp, env)
    if k == "forall":
        return all(ev(e[2], dom, interp, {**env, e[1]: d}) for d in dom)
    if k == "exists":
        return any(ev(e[2], dom, interp, {**env, e[1]: d}) for d in dom)
    if k == "exists1":
        return sum(ev(e[2], dom, interp, {**env, e[1]: d}) for d in dom) == 1
    a, b = ev(e[1], dom, interp, env), ev(e[2], dom, interp, env)
    return {"and": a and b, "or": a or b, "xor": a != b, "imp": (not a) or b, "iff": a == b}[k]


def interpretations(preds, dom):
    """Every assignment of extensions to the predicates over dom."""
    names = sorted(preds)
    spaces = [list(itertools.product(dom, repeat=preds[n])) for n in names]
    for choice in itertools.product(*[range(2 ** len(sp)) for sp in spaces]):
        yield {n: {t for j, t in enumerate(sp) if mask >> j & 1} for n, sp, mask in zip(names, spaces, choice)}


def counter_model(x, max_size=3, free_env=None):
    """A (domain, interpretation, env) making x false, searching domains of size 1..max_size; None if none.
    Free variables are tried with every value."""
    e = F(x)
    preds = predicates(e)
    fv = sorted(free_vars(e))
    for n in range(1, max_size + 1):
        dom = list(range(n))
        for I in interpretations(preds, dom):
            for vals in itertools.product(dom, repeat=len(fv)):
                env = dict(zip(fv, vals))
                if not ev(e, dom, I, env):
                    return dom, I, env
    return None


def valid(x, max_size=3):
    return counter_model(x, max_size) is None


def model(x, max_size=3):
    """A (domain, interpretation, env) making x true, or None."""
    e = F(x)
    return counter_model(("not", e), max_size)


def satisfiable(x, max_size=3):
    return model(x, max_size) is not None


def equivalent(a, b, max_size=3):
    return valid(("iff", F(a), F(b)), max_size)


def holds(x, dom, interp, env=None):
    return ev(F(x), dom, interp, env or {})


def to_str(e):
    k = e[0]
    if k == "const":
        return "T" if e[1] else "F"
    if k == "pred":
        return f"{e[1]}({', '.join(e[2])})" if e[2] else e[1]
    if k == "eq":
        return f"{e[1]} = {e[2]}"
    if k == "not":
        return "¬" + to_str(e[1])
    if k in ("forall", "exists", "exists1"):
        q = {"forall": "∀", "exists": "∃", "exists1": "∃!"}[k]
        return f"{q}{e[1]} {to_str(e[2])}"
    sym = {"and": "∧", "or": "∨", "xor": "⊕", "imp": "→", "iff": "↔"}
    return f"({to_str(e[1])} {sym[k]} {to_str(e[2])})"


def push_not(e):
    """Negation normal form: ¬ only on atoms (used to check negation-push PYQs)."""
    k = e[0]
    if k == "not":
        a = e[1]
        if a[0] == "not":
            return push_not(a[1])
        if a[0] == "and":
            return ("or", push_not(("not", a[1])), push_not(("not", a[2])))
        if a[0] == "or":
            return ("and", push_not(("not", a[1])), push_not(("not", a[2])))
        if a[0] == "imp":
            return ("and", push_not(a[1]), push_not(("not", a[2])))
        if a[0] == "forall":
            return ("exists", a[1], push_not(("not", a[2])))
        if a[0] == "exists":
            return ("forall", a[1], push_not(("not", a[2])))
        return e
    if k in ("forall", "exists", "exists1"):
        return (k, e[1], push_not(e[2]))
    if k in PREC:
        return (k, push_not(e[1]), push_not(e[2]))
    return e
