"""Recurrences and generating functions for the Discrete Mathematics checks (Chapter 7) and the
Recurrence Lab. Exact arithmetic (Fractions / sympy), so closed forms are verified term by term."""
from fractions import Fraction as Fr

import sympy as sp

n_ = sp.Symbol("n", integer=True, nonnegative=True)
x_ = sp.Symbol("x")


def iterate(coeffs, init, count, f=None):
    """a_n = c1 a_{n-1} + … + ck a_{n-k} + f(n), with a_0 … a_{k-1} = init (exact)."""
    a = [Fr(v) for v in init]
    k = len(coeffs)
    for n in range(k, count):
        v = sum(Fr(c) * a[n - 1 - i] for i, c in enumerate(coeffs))
        if f:
            v += Fr(f(n))
        a.append(v)
    return a[:count]


def char_poly(coeffs):
    r = sp.Symbol("r")
    k = len(coeffs)
    return sp.Poly(r ** k - sum(sp.Integer(c) * r ** (k - 1 - i) for i, c in enumerate(coeffs)), r)


def roots(coeffs):
    """{root: multiplicity} of the characteristic polynomial (exact)."""
    return sp.roots(char_poly(coeffs))


def closed_form(coeffs, init, f=None, start=0):
    """Closed form a(n) by sympy.rsolve, checked against iteration for 30 terms."""
    a = sp.Function("a")
    k = len(coeffs)
    rhs = sum(sp.Integer(c) * a(n_ - 1 - i) for i, c in enumerate(coeffs)) + (f(n_) if f else 0)
    sol = sp.rsolve(a(n_) - rhs, a(n_), {a(start + i): init[i] for i in range(k)})
    sol = sp.simplify(sol)
    vals = iterate(coeffs, init, 30, f)
    for m in range(30):
        assert sp.nsimplify(sp.simplify(sol.subs(n_, m + start))) == vals[m], (sol, m)
    return sol


def homogeneous_constants(coeffs, init):
    """Constants of a_n = Σ_j Σ_t c_{j,t} n^t r_j^n for the distinct roots r_j (exact, via sympy linsolve)."""
    rs = roots(coeffs)
    basis = []
    for r, m in sorted(rs.items(), key=lambda kv: (sp.re(kv[0]), sp.im(kv[0]))):
        for t in range(m):
            basis.append((r, t))
    cs = sp.symbols(f"c0:{len(basis)}")
    eqs = [sum(c * (sp.Integer(j) ** t) * r ** j for c, (r, t) in zip(cs, basis)) - init[j] for j in range(len(coeffs))]
    sol = sp.solve(eqs, cs, dict=True)[0]
    return [(r, t, sp.nsimplify(sol[c])) for c, (r, t) in zip(cs, basis)]


def series(num, den, count):
    """Coefficients of num(x)/den(x) (coefficient lists, constant first; den[0] != 0) by long division."""
    num = [Fr(v) for v in num] + [Fr(0)] * count
    den = [Fr(v) for v in den]
    out = []
    for k in range(count):
        c = (num[k] - sum(den[i] * out[k - i] for i in range(1, min(k, len(den) - 1) + 1))) / den[0]
        out.append(c)
    sym = sp.series(sum(sp.Integer(int(v)) * x_ ** i for i, v in enumerate(num[:len(num) - count])) /
                    sum(sp.Integer(int(v)) * x_ ** i for i, v in enumerate(den)), x_, 0, count).removeO()
    assert [sp.Rational(str(sym.coeff(x_, i))) for i in range(count)] == [sp.Rational(c.numerator, c.denominator) for c in out]
    return out


def binom_power(sign, k):
    """Coefficients of (1 + sign·x)^k."""
    from math import comb
    return [comb(k, i) * sign ** i for i in range(k + 1)]


def strings_no_two_consecutive(n, bad="00"):
    import itertools
    return sum(1 for s in itertools.product("01", repeat=n) if bad not in "".join(s))


def strings_containing(n, pat):
    import itertools
    return sum(1 for s in itertools.product("01", repeat=n) if pat in "".join(s))


def compositions_12(n):
    """Sequences of 1s and 2s summing to n (pennants)."""
    if n < 0:
        return 0
    if n == 0:
        return 1
    return compositions_12(n - 1) + compositions_12(n - 2)
