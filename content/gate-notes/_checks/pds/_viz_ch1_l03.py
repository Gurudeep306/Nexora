"""Viz scenes for PDS Chapter 1, Lesson 3 (loop algorithms and invariants). Every state is computed here
and checked against the compiled C loop."""
import math

import common as C
from chapterlib import REG
from vizlib import S

scene = REG[1].scene


@scene
def gcd_staircase(L):
    s = S(L)
    W, H = s.v((700, 420), (360, 560))
    x, y = 126, 105
    states = [(x, y)]
    while x != y:
        if x > y:
            x -= y
        else:
            y -= x
        states.append((x, y))
    assert states == [(126, 105), (21, 105), (21, 84), (21, 63), (21, 42), (21, 21)]
    assert all(math.gcd(a, b) == 21 for a, b in states)
    assert C.c_out(C.main_wrap("int x = 126, y = 105; while (x != y) { if (x > y) x = x - y; else y = y - x; } printf(\"%d\", x);")) == "21"
    s.head("gcd(126, 105) by subtraction: cut off squares, keep the gcd", "gcd by subtraction", W, 360)
    sc = s.v(2.2, 1.9)
    ox, oy = s.v(30, 30), s.v(60, 70)
    s.box("bgr", ox, oy, 126 * sc, 105 * sc, tone="muted", dashed=True)
    s.box("rect", ox, oy, 126 * sc, 105 * sc, tone="accent", fill="accent", emphasis="soft")
    s.text("dim", ox + 63 * sc, oy + 105 * sc + 18, "126 × 105", s.v(15, 14), anchor="middle", weight="bold")
    tx, ty = s.v(340, 30), s.v(60, 330)
    rows = [["x", "y", "gcd(x, y)"]] + [[str(a), str(b), "21"] for a, b in states]
    s.table("tb", tx, ty, s.v(100, 96), s.v(30, 30), [rows[0]] + [["", "", ""] for _ in states])
    shown = [["", "", ""] for _ in states]
    shown[0] = rows[1]
    s.step("Start: x = 126, y = 105. gcd(126, 105) = 21.", ("tb", {"rows": [rows[0]] + [r[:] for r in shown], "highlight": [[1, 0], [1, 1], [1, 2]]}))
    for k in range(1, len(states)):
        a, b = states[k]
        pa, pb = states[k - 1]
        what = f"x > y: x = {pa} − {pb} = {a}" if pa > pb else f"y > x: y = {pb} − {pa} = {b}"
        shown[k] = rows[k + 1]
        s.step(f"Pass {k}: {what}. A common divisor of x and y also divides their difference, so gcd stays 21.",
               ("rect", {"w": round(a * sc, 2), "h": round(b * sc, 2)}), ("dim", {"text": f"{a} × {b}", "x": round(ox + a * sc / 2, 2), "y": round(oy + b * sc + 18, 2)}),
               ("tb", {"rows": [rows[0]] + [r[:] for r in shown], "highlight": [[k + 1, 0], [k + 1, 1], [k + 1, 2]]}))
    s.step("x = y = 21: the loop stops, and gcd(21, 21) = 21 is the answer. Five passes.",
           ("rect", {"tone": "success", "fill": "success"}), ("tb", {"highlight": []}))
    return s.done("GCD by repeated subtraction", (W, H), (360, 560),
                  "A 126 × 105 rectangle. Each pass of the loop cuts the shorter side off the longer one; the gcd of the sides never changes.")


@scene
def fast_power_trace(L):
    s = S(L)
    W, H = s.v((660, 380), (360, 440))
    X, Y = 3, 11
    res, a, b = 1, X, Y
    trace = [(res, a, b, "start")]
    while b != 0:
        if b % 2 == 0:
            a, b = a * a, b // 2
            trace.append((res, a, b, "b even: a = a², b = b/2"))
        else:
            res, b = res * a, b - 1
            trace.append((res, a, b, "b odd: res = res·a, b = b − 1"))
        assert res * a ** b == X ** Y  # the invariant
    assert res == 177147 and len(trace) - 1 == math.floor(math.log2(Y)) + bin(Y).count("1") == 6
    fn = "int power(int X, int Y) { int res = 1, a = X, b = Y; while (b != 0) { if (b % 2 == 0) { a = a * a; b = b / 2; } else { res = res * a; b = b - 1; } } return res; }"
    assert C.c_out(C.main_wrap('printf("%d", power(3, 11));', before=fn)) == "177147"
    s.head("Square-and-multiply for 3¹¹: res · aᵇ stays 177147", "3¹¹: res·aᵇ = 177147", W, 360)
    head = ["res", "a", "b", "res·aᵇ"]
    cw = s.v(120, 82)
    tx = (s.v(660, 360) - 4 * cw) / 2
    s.table("tb", tx, 56, cw, s.v(32, 30), [head] + [["", "", "", ""] for _ in trace])
    s.text("cap", s.v(330, 180), s.v(350, 410), "", s.v(15, 13), anchor="middle", hidden=True)
    shown = [["", "", "", ""] for _ in trace]
    for k, (r, aa, bb, why) in enumerate(trace):
        shown[k] = [str(r), str(aa), str(bb), "177147"]
        cap = "Start: res = 1, a = 3, b = 11; the invariant res·aᵇ = 3¹¹ holds." if k == 0 else f"Pass {k}, {why}: res = {r}, a = {aa}, b = {bb}."
        s.step(cap, ("tb", {"rows": [head] + [x[:] for x in shown], "highlight": [[k + 1, c] for c in range(4)]}))
    s.step("b = 0 ends the loop; then res·a⁰ = res, so res = 3¹¹ = 177147 after 6 passes.",
           ("tb", {"highlight": [[len(trace), 0]]}), ("cap", {"hidden": False, "text": "6 passes = ⌊log₂ 11⌋ + popcount(11)"}))
    return s.done("Square-and-multiply with its invariant", (W, H), (360, 440),
                  "The loop of GATE 2016 for X = 3, Y = 11. Every row keeps res · aᵇ equal to 3¹¹ = 177147.")


@scene
def horner_chain(L):
    s = S(L)
    W, H = s.v((660, 320), (360, 380))
    Y, x = [4, 7, 2, 9], 10
    totals = [Y[0]]
    for k in range(1, len(Y)):
        totals.append(x * totals[-1] + Y[k])
    assert totals == [4, 47, 472, 4729]
    fn = "int SimpleFunction(int Y[], int n, int x) { int total = Y[0], loopIndex; for (loopIndex = 1; loopIndex <= n - 1; loopIndex++) total = x * total + Y[loopIndex]; return total; }"
    assert C.c_out(C.main_wrap('int Y[4] = {4, 7, 2, 9}; int Z[10] = {1,1,1,1,1,1,1,1,1,1}; printf("%d %d", SimpleFunction(Y, 4, 10), SimpleFunction(Z, 10, 2));', before=fn)) == "4729 1023"
    s.head("Horner: total = x · total + Y[k], with x = 10", "Horner with x = 10", W, 360)
    cw = s.v(70, 60)
    x0 = s.v(80, 60)
    s.cells("y", x0, 70, cw, s.v(44, 40), [str(v) for v in Y], above=[f"Y[{k}]" for k in range(4)], size=s.v(18, 16))
    s.text("tot", s.v(330, 180), s.v(190, 190), f"total = {Y[0]}", s.v(20, 17), anchor="middle", weight="bold")
    s.text("why", s.v(330, 180), s.v(236, 236), "", s.v(14, 13), anchor="middle", tone="muted", hidden=True)
    s.text("inv", s.v(330, 180), s.v(280, 300), "", s.v(14, 13), anchor="middle", tone="info", hidden=True)
    s.step("Start: total = Y[0] = 4, the polynomial of the first coefficient alone.", ("yc0", {"tone": "accent", "fill": "accent"}))
    for k in range(1, 4):
        s.step(f"k = {k}: total = 10 · {totals[k - 1]} + {Y[k]} = {totals[k]}. Multiplying by x shifts every earlier coefficient up one power.",
               (f"yc{k}", {"tone": "accent", "fill": "accent"}), ("tot", {"text": f"total = {totals[k]}"}),
               ("why", {"hidden": False, "text": f"10 × {totals[k - 1]} + {Y[k]}"}),
               ("inv", {"hidden": False, "text": "invariant: total = Y[0]x^(k) + … + Y[k]"}))
    s.step("4729 = 4·10³ + 7·10² + 2·10 + 9: 3 multiplications for a degree-3 polynomial.", ("tot", {"tone": "success"}),
           ("why", {"text": "3 multiplications, 3 additions"}))
    return s.done("Horner's rule as a chain", (W, H), (360, 380),
                  "The coefficients 4, 7, 2, 9 and x = 10. Horner's loop rebuilds the number 4729 one digit at a time.")


@scene
def digit_conveyor(L):
    s = S(L)
    W, H = s.v((660, 320), (360, 380))
    n, rev = 4729, 0
    states = [(n, rev)]
    while n > 0:
        rev = rev * 10 + n % 10
        n //= 10
        states.append((n, rev))
    assert states[-1] == (0, 9274) and len(states) == 5
    assert C.c_out(C.main_wrap("int n = 4729, rev = 0; while (n > 0) { rev = rev * 10 + n % 10; n = n / 10; } printf(\"%d\", rev);")) == "9274"
    s.head("Reversing digits: n % 10 moves the last digit onto rev", "Reversing the digits of 4729", W, 360)
    cw = s.v(56, 40)
    s.text("ln", s.v(40, 16), 100, "n", s.v(16, 14), weight="bold")
    s.text("lr", s.v(40, 16), 190, "rev", s.v(16, 14), weight="bold")
    s.cells("n", s.v(100, 60), 78, cw, s.v(44, 40), list("4729"), size=s.v(18, 16))
    s.cells("r", s.v(100, 60), 168, cw, s.v(44, 40), ["", "", "", ""], size=s.v(18, 16))
    s.text("st", s.v(330, 180), s.v(270, 290), "n = 4729, rev = 0", s.v(15, 14), anchor="middle")
    for k in range(1, 5):
        nn, rr = states[k]
        d = states[k - 1][0] % 10
        digs = str(nn) if nn else ""
        pat = [(f"nc{i}", {"label": digs[i] if i < len(digs) else "", "tone": "ink" if i < len(digs) else "muted"}) for i in range(4)]
        rd = str(rr)
        pat += [(f"rc{i}", {"label": rd[i] if i < len(rd) else "", "fill": "accent" if i == len(rd) - 1 else "none"}) for i in range(4)]
        s.step(f"Pass {k}: d = n % 10 = {d}; rev = rev·10 + {d} = {rr}; n = n / 10 = {nn}.", *pat, ("st", {"text": f"n = {nn}, rev = {rr}"}))
    s.step("n = 0 stops the loop: rev = 9274, the digits of 4729 in reverse order.", ("st", {"tone": "success"}))
    return s.done("Reversing digits with % and /", (W, H), (360, 380),
                  "n = 4729 above, rev = 0 below. Each pass moves the last digit of n onto the end of rev.")
