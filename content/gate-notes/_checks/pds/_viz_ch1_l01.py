"""Viz scenes for PDS Chapter 1, Lesson 1 (types, operators and expressions).

Every number a scene shows is computed here (and the C ones by running the code with cc), so the
pictures cannot drift from the checked facts."""
import math

import common as C
from chapterlib import REG
from vizlib import S, draw_tree

scene = REG[1].scene


def tv(on):
    return "accent" if on else "ink"


@scene
def unsigned_wheel(L):
    s = S(L)
    W, H = s.v((680, 380), (360, 560))
    n = 3
    pats = [format(k, f"0{n}b") for k in range(2 ** n)]
    signed = [k - 2 ** n if k >= 2 ** (n - 1) else k for k in range(2 ** n)]
    assert signed == [0, 1, 2, 3, -4, -3, -2, -1]
    # The wrap that GATE 2017 relies on, on 3 bits: 3 - 5 = 6 (unsigned) = -2 (signed).
    assert (3 - 5) % 2 ** n == 6 and signed[6] == -2
    assert C.c_out(C.main_wrap('unsigned u = 3; u = u - 5; printf("%u %d", u, (int)u);')) == "4294967294 -2"
    s.head("One circle of bit patterns, two ways to read it", "3-bit patterns on a circle", W, s.v(360, 360))
    cx, cy, R, r = s.v(200, 180), s.v(205, 240), s.v(120, 112), s.v(22, 21)
    pos = []
    for k in range(8):
        a = math.radians(k * 45)
        x, y = cx + R * math.sin(a), cy - R * math.cos(a)
        pos.append((x, y))
        s.node(f"p{k}", x, y, r, label=pats[k], mono=True, size=s.v(13, 12))
        ux, uy = cx + (R + 42) * math.sin(a), cy - (R + 42) * math.cos(a)
        s.text(f"u{k}", ux, uy, str(k), s.v(14, 13), anchor="middle", tone="info", hidden=True, weight="bold")
        sx, sy = cx + (R - 50) * math.sin(a), cy - (R - 50) * math.cos(a)
        s.text(f"s{k}", sx, sy, str(signed[k]).replace("-", "−"), s.v(14, 13), anchor="middle", tone="warning", hidden=True, weight="bold")
    tx, ty = s.v(400, 20), s.v(90, 432)
    lines = ["blue outside: unsigned value", "orange inside: signed value", "", "", ""]
    for k, t in enumerate(lines):
        s.text(f"t{k}", tx, ty + k * 30, t, s.v(14, 13), hidden=k < 5, tone="muted" if k < 2 else "ink")
    s.step("Show the unsigned reading: the patterns 000 … 111 are 0 … 7, going clockwise.",
           *[(f"u{k}", {"hidden": False}) for k in range(8)], ("t0", {"hidden": False}))
    s.step("Show the two's-complement reading: the top bit weighs −4, so 100 … 111 are −4 … −1.",
           *[(f"s{k}", {"hidden": False}) for k in range(8)], ("t1", {"hidden": False}))
    s.step("111 is 7 unsigned and −1 signed: the same bits. Converting −1 to unsigned changes nothing in the bits.",
           ("p7", {"tone": "accent", "fill": "accent"}), ("t2", {"hidden": False, "text": "111: unsigned 7, signed −1"}))
    s.step("Now compute 3 − 5 by walking: start at 011 (3).",
           ("p7", {"tone": "ink", "fill": "none"}), ("p3", {"tone": "accent", "fill": "accent"}), ("t3", {"hidden": False, "text": "start at 3"}))
    walk = [3]
    for k in range(5):
        cur = (walk[-1] - 1) % 8
        walk.append(cur)
        s.step(f"Subtract 1 (step {k + 1} of 5): {pats[walk[-2]]} → {pats[cur]}." + (" Going below 000 wraps round to 111." if cur == 7 else ""),
               (f"p{walk[-2]}", {"tone": "muted", "fill": "muted"}), (f"p{cur}", {"tone": "accent", "fill": "accent"}),
               ("t3", {"text": f"after {k + 1}: {pats[cur]}"}))
    assert walk[-1] == 6
    s.step("3 − 5 lands on 110: unsigned 6 = 2³ − 2, signed −2. A size_t difference 3 − 5 is likewise 2⁶⁴ − 2, never negative.",
           ("p6", {"tone": "success", "fill": "success"}), ("t4", {"hidden": False, "text": "3 − 5 → 110 = 6 or −2"}))
    return s.done("Unsigned and signed readings of 3-bit patterns", (W, H), (360, 560),
                  "Eight 3-bit patterns around a circle. Adding 1 moves one step clockwise; the circle has no end, which is why unsigned arithmetic wraps.")


@scene
def expr_tree_eval(L):
    s = S(L)
    W, H = s.v((700, 380), (360, 420))
    src = "char c = 'A'; int x = 30, d = 0;"
    expr = "c + 1 < x * 2 && !d"
    got = C.c_out(C.main_wrap(f'{src} int r = {expr}; printf("%d %d %d", c + 1, x * 2, r);'))
    assert got == "66 60 0"
    tree = ("&&", ("<", ("+", ("c", None, None), ("1", None, None)), ("*", ("x", None, None), ("2", None, None))), ("!", None, ("d", None, None)))
    s.head(f"{expr}   (c = 'A', x = 30, d = 0)", expr, W, 360)
    if not s.wd:
        s.text("sub", 180, 46, "c = 'A', x = 30, d = 0", 13, anchor="middle", tone="muted")
    pos = draw_tree(s, "n", tree, s.v(60, 26), s.v(640, 334), s.v(80, 92), s.v(80, 88), r=s.v(18, 15), size=s.v(14, 12))
    nid = lambda p: f"n{p or 'r'}"
    order_build = ["LLL", "LLR", "LRL", "LRR", "RR", "LL", "LR", "L", "R", ""]
    for p in pos:
        s.els[[e["id"] for e in s.els].index(nid(p))]["hidden"] = True
        if p:
            s.els[[e["id"] for e in s.els].index(f"ne{p}")]["hidden"] = True
    vals = {"LLL": "65", "LLR": "1", "LL": "66", "LRL": "30", "LRR": "2", "LR": "60", "L": "0", "": "0"}
    for p, (x, y, lab) in pos.items():
        s.text(f"v{p or 'r'}", x, y + s.v(18, 15) + 12, vals.get(p, ""), s.v(14, 12), anchor="middle", tone="success", weight="bold", hidden=True)
    leaves = [p for p in order_build[:5]]
    s.step("Precedence first: the operands are the leaves c, 1, x, 2, d.", *[(nid(p), {"hidden": False}) for p in leaves])
    s.step("+ and * bind tightest, so they grab c, 1 and x, 2; ! is unary and grabs d.",
           *[(nid(p), {"hidden": False}) for p in ("LL", "LR", "R")], *[(f"ne{p}", {"hidden": False}) for p in ("LLL", "LLR", "LRL", "LRR", "RR")])
    s.step("< is looser than + and *, so it compares the two sums; && is loosest and joins < and !.",
           *[(nid(p), {"hidden": False}) for p in ("L", "")], *[(f"ne{p}", {"hidden": False}) for p in ("LL", "LR", "L", "R")])
    s.step("Evaluate from the left: c is the char 'A' = 65, promoted to int before the addition.",
           ("nLLL", {"tone": "accent"}), ("vLLL", {"hidden": False}), ("vLLR", {"hidden": False}))
    s.step("c + 1 = 66 (int). Then x * 2 = 60.",
           ("nLL", {"tone": "accent"}), ("vLL", {"hidden": False}), ("nLR", {"tone": "accent"}), ("vLRL", {"hidden": False}), ("vLRR", {"hidden": False}), ("vLR", {"hidden": False}))
    s.step("66 < 60 is false: the comparison yields the int 0.", ("nL", {"tone": "accent"}), ("vL", {"hidden": False}))
    s.step("&& sees a left operand of 0: the result is 0 and !d is never evaluated (short circuit).",
           ("nR", {"tone": "muted", "dashed": True}), ("nRR", {"tone": "muted", "dashed": True}), ("neRR", {"dashed": True}), ("neR", {"dashed": True}))
    s.step("The whole expression is the int 0. Precedence fixed the shape; && fixed what ran.", ("nr", {"tone": "success", "fill": "success"}), ("vr", {"hidden": False}))
    return s.done("The tree of an expression, built by precedence", (W, H), (360, 420),
                  "The expression c + 1 < x * 2 && !d with c = 'A', x = 30 and d = 0. The invisible brackets become a tree.")


@scene
def shift_halving(L):
    s = S(L)
    W, H = s.v((660, 300), (360, 360))
    n0 = 435
    assert C.c_out(C.main_wrap('int num = 435, count = 0; while (num) { count++; num >>= 1; } printf("%d", count);')) == "9"
    width = 9
    s.head("func(435): every num >>= 1 drops the last bit", "435 >>= 1, again and again", W, 360)
    cw = s.v(52, 34)
    x0 = (s.v(660, 360) - width * cw) / 2
    y0 = s.v(96, 98)
    bits = format(n0, f"0{width}b")
    s.cells("b", x0, y0, cw, s.v(46, 38), list(bits), below=[str(2 ** (width - 1 - k)) for k in range(width)], size=s.v(18, 15))
    s.text("num", s.v(330, 180), s.v(196, 196), f"num = {n0}", s.v(17, 15), anchor="middle", weight="bold")
    s.text("cnt", s.v(330, 180), s.v(232, 236), "count = 0", s.v(16, 14), anchor="middle", tone="info")
    s.text("ex", s.v(330, 180), s.v(266, 276), "", s.v(14, 13), anchor="middle", tone="muted", hidden=True)
    num, count = n0, 0
    while num:
        count += 1
        num >>= 1
        b = format(num, f"0{width}b")
        lead = len(b) - len(b.lstrip("0")) if num else width
        pat = [(f"bc{k}", {"label": b[k], "tone": "muted" if k < lead else "ink", "fill": "none" if k < lead else "accent", "emphasis": "soft"}) for k in range(width)]
        s.step(f"Shift {count}: num becomes {num}" + (" (the last 1 is gone, so the loop stops)." if num == 0 else f" = ⌊{num * 2 + (1 if (n0 >> (count - 1)) & 1 else 0)}/2⌋."),
               *pat, ("num", {"text": f"num = {num}"}), ("cnt", {"text": f"count = {count}"}))
    assert count == 9 == math.floor(math.log2(n0)) + 1
    s.step("The loop ran once per binary digit: 9 = ⌊log₂ 435⌋ + 1, because 256 ≤ 435 < 512.",
           ("ex", {"hidden": False, "text": "256 ≤ 435 < 512, so 9 bits"}), ("cnt", {"tone": "success"}))
    return s.done("Counting bits by shifting right", (W, H), (360, 360),
                  "435 = 110110011 in nine bits, with the place values underneath. Each right shift halves the number and drops one bit.")


@scene
def short_circuit_loop(L):
    s = S(L)
    W, H = s.v((680, 330), (360, 360))
    # The loop of GATE 2021, traced in Python and checked against the compiled program.
    rows, i, count = [], 0, 0
    for j in range(-3, 4):
        if j >= 0:
            old = i
            i += 1
            ok = old != 0
            if ok:
                count += j
            rows.append([str(j), "yes", "yes", str(old), str(i), str(count)])
        else:
            rows.append([str(j), "no", "no", "-", str(i), str(count)])
    final = count + i
    assert final == 10
    assert C.c_out(C.code_block(C.bank()["cse-2021-1-cs-37"])) == "10"
    head = s.v(["j", "j >= 0", "i++ runs?", "old i", "i", "count"], ["j", "j≥0", "i++?", "old", "i", "cnt"])
    cw, ch = s.v(104, 56), s.v(30, 30)
    x0 = (s.v(680, 360) - 6 * cw) / 2
    s.head("if ((j >= 0) && (i++)) count += j;", "(j >= 0) && (i++)", W, 360)
    blank = [[""] * 6 for _ in rows]
    s.table("tb", x0, 50, cw, ch, [head] + blank)
    s.text("fin", s.v(340, 180), s.v(312, 342), "", s.v(15, 14), anchor="middle", weight="bold", hidden=True)
    shown = [[""] * 6 for _ in rows]
    for k, row in enumerate(rows):
        shown[k] = row
        j = int(row[0])
        if j < 0:
            cap = f"j = {j}: j >= 0 is false, so && stops and i++ is skipped; i stays {row[4]}."
        elif row[3] == "0":
            cap = "j = 0: the right side runs; i++ yields the old value 0 (false), then i becomes 1."
        else:
            cap = f"j = {j}: i++ yields {row[3]} (true), i becomes {row[4]}, count += {j} gives {row[5]}."
        s.step(cap, ("tb", {"rows": [head] + [r[:] for r in shown], "highlight": [[k + 1, c] for c in range(6)]}))
    s.step(f"After the loop: count = {count} + i = {i}, so the program prints {final}.",
           ("tb", {"highlight": []}), ("fin", {"hidden": False, "text": f"count = {count} + {i} = {final}"}))
    return s.done("Short circuit inside a loop (GATE 2021)", (W, H), (360, 360),
                  "The loop runs for j = −3 … 3. The right operand i++ runs only when j >= 0 is true.")
