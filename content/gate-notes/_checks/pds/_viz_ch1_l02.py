"""Viz scenes for PDS Chapter 1, Lesson 2 (control flow and loop tracing). Every value is computed here
and the C behaviour is confirmed by compiling the program with cc."""
import common as C
from chapterlib import REG
from vizlib import S

scene = REG[1].scene


@scene
def switch_fallthrough(L):
    s = S(L)
    W, H = s.v((700, 420), (360, 620))
    src = C.code_block(C.bank()["cse-2015-3-cs-48"])
    out = C.c_out(src)
    assert len([x for x in out.split("\n") if x != ""]) == 10
    # j = 2*3/4 + 2.0/5 + 8/5 = 1 + 0.4 + 1 = 2.4 -> 2; k -= --j: j = 1, k = -1.
    k = -1
    labels = [1, 2, 3]
    rows, total = [], 0
    for i in range(5):
        v = i + k
        if v in (1, 2):
            n = 3
        elif v == 3:
            n = 2
        else:
            n = 1
        total += n
        rows.append((i, v, n, total))
    assert total == 10
    s.head("GATE 2015: count the printf calls of a switch without break", "switch without break (GATE 2015)", W, 360)
    lines = ["switch (i + k) {", "case 1:", "case 2: printf(...);", "case 3: printf(...);", "default: printf(...);", "}"]
    cx, cy = s.v(30, 24), s.v(80, 76)
    hl = s.code("c", cx, cy, lines, size=s.v(15, 13))
    s.text("kk", s.v(30, 24), s.v(270, 256), "k = −1 (j = 2.4 → 2, then k −= −−j)", s.v(14, 13), tone="muted")
    head = s.v(["i", "i + k", "enters at", "calls", "total"], ["i", "i+k", "entry", "calls", "total"])
    cw = s.v(88, 66)
    tx, ty = s.v(250, 15), s.v(64, 300)
    s.table("tb", tx, ty, cw, s.v(32, 30), [head] + [[""] * 5 for _ in rows])
    s.text("res", s.v(250, 15), s.v(390, 586), "", s.v(15, 14), weight="bold", hidden=True)
    shown = [[""] * 5 for _ in rows]
    for idx, (i, v, n, tot) in enumerate(rows):
        entry = {1: "case 1", 2: "case 2", 3: "case 3"}.get(v, "default")
        line = {1: 2, 2: 3, 3: 4}.get(v, 5)
        shown[idx] = [str(i), str(v).replace("-", "−"), entry, str(n), str(tot)]
        cap = (f"i = {i}: i + k = {v}, no case matches, so control enters at default: 1 call."
               if v not in labels else f"i = {i}: enters at case {v} and falls through every printf below it: {n} calls.")
        s.step(cap, ("hlc", hl(line)), ("tb", {"rows": [head] + [r[:] for r in shown], "highlight": [[idx + 1, c] for c in range(5)]}))
    s.step("Total: 1 + 1 + 3 + 3 + 2 = 10 printf calls (the GATE key).", ("hlc", {"hidden": True}), ("tb", {"highlight": []}),
           ("res", {"hidden": False, "text": "1 + 1 + 3 + 3 + 2 = 10"}))
    return s.done("switch fall-through, counted", (W, H), (360, 620),
                  "With no break statements, control enters at the matching label and runs every statement below it.")


@scene
def loop_shapes(L):
    s = S(L)
    W, H = s.v((700, 380), (360, 640))
    # The three loops with a condition that is false from the start (n = 0), and with n = 2.
    prog = 'int n = %d, w = 0, d = 0, f = 0, i; i = n; while (i > 0) { w++; i--; } i = n; do { d++; i--; } while (i > 0); for (i = n; i > 0; i--) f++; printf("%%d %%d %%d", w, d, f);'
    assert C.c_out(C.main_wrap(prog % 0)) == "0 1 0"
    assert C.c_out(C.main_wrap(prog % 2)) == "2 2 2"
    s.head("while, do-while and for with n = 0: where the test sits", "Where the test sits (n = 0)", W, 360)
    cols = s.v([30, 260, 490], [20, 20, 20])
    tops = s.v([70, 70, 70], [60, 250, 440])
    names = ["while (i > 0) …", "do … while (i > 0);", "for (i = n; i > 0; i--)"]
    shapes = [["test i > 0?", "body"], ["body", "test i > 0?"], ["i = n", "test i > 0?", "body; i--"]]
    bw, bh, gap = s.v(180, 200), s.v(38, 34), s.v(22, 14)
    for c, (x, y0, name, boxes) in enumerate(zip(cols, tops, names, shapes)):
        s.text(f"n{c}", x, y0 - 14, name, s.v(13, 13), mono=True, weight="bold")
        for b, lab in enumerate(boxes):
            y = y0 + 10 + b * (bh + gap)
            s.box(f"b{c}{b}", x, y, bw, bh, label=lab, size=s.v(14, 13), mono=True)
            if b:
                s.arrow(f"a{c}{b}", [x + bw / 2, y - gap], [x + bw / 2, y])
        s.text(f"r{c}", x, y0 + 10 + len(boxes) * (bh + gap) + 6, "", s.v(14, 13), hidden=True, weight="bold")
    s.step("while: the test comes first. With n = 0 it is false at once.", ("b00", {"tone": "accent", "fill": "accent"}))
    s.step("So a while loop with a false condition runs its body 0 times.", ("b00", {"tone": "danger", "fill": "none"}), ("b01", {"tone": "muted", "dashed": True}),
           ("r0", {"hidden": False, "text": "body runs 0 times"}))
    s.step("do-while: the body comes first, before any test.", ("b10", {"tone": "accent", "fill": "accent"}))
    s.step("The test after it is false, so the loop stops, but the body has already run once.", ("b10", {"tone": "success", "fill": "success"}), ("b11", {"tone": "danger"}),
           ("r1", {"hidden": False, "text": "body runs 1 time"}))
    s.step("for: the initialisation runs once, then the test, exactly as in while.", ("b20", {"tone": "accent", "fill": "accent"}), ("b21", {"tone": "accent"}))
    s.step("The test is false, so the body and the increment never run: a for loop is a while loop with its parts gathered.",
           ("b20", {"tone": "success", "fill": "none"}), ("b21", {"tone": "danger"}), ("b22", {"tone": "muted", "dashed": True}), ("r2", {"hidden": False, "text": "body runs 0 times"}))
    s.step("With n = 2 all three run the body twice; only a condition false at the start tells them apart.",
           ("r0", {"text": "n = 0: 0, n = 2: 2"}), ("r1", {"text": "n = 0: 1, n = 2: 2"}), ("r2", {"text": "n = 0: 0, n = 2: 2"}))
    return s.done("Where each loop tests its condition", (W, H), (360, 640),
                  "Three loops with the same condition i > 0 and n = 0. The only difference is where the test sits.")


@scene
def halving_loop_count(L):
    s = S(L)
    W, H = s.v((700, 360), (360, 480))
    src = C.code_block(C.bank()["cse-2018-cs-32"])
    fn = src
    got = C.c_out("#include <stdio.h>\n" + fn + '\nint main(void) { printf("%lu", fun(1UL << 40)); return 0; }\n')
    assert got == "5"
    js, i, j = [], 2 ** 40, 0
    while i > 1:
        i //= 2
        j += 1
    assert j == 40
    seq, jj, total = [], j, 0
    while jj > 1:
        seq.append(jj)
        jj //= 2
        total += 1
    assert total == 5 and seq == [40, 20, 10, 5, 2]
    s.head("GATE 2018: fun(2⁴⁰) is two halving loops in a row", "fun(2⁴⁰): two halving loops", W, 360)
    s.text("l1", s.v(30, 16), s.v(76, 70), "Loop 1: for (i = n; i > 1; i = i/2) j++;", s.v(14, 12), mono=True)
    s.text("v1", s.v(30, 16), s.v(110, 100), "i = 2⁴⁰, j = 0", s.v(16, 14), weight="bold")
    s.text("l2", s.v(30, 16), s.v(170, 160), "Loop 2: for ( ; j > 1; j = j/2) sum++;", s.v(14, 12), mono=True, hidden=True)
    cw = s.v(96, 54)
    x0 = s.v(30, 16)
    s.cells("q", x0, s.v(210, 196), cw, s.v(40, 36), ["", "", "", "", "", ""], above=["j", "", "", "", "", ""], size=s.v(16, 14))
    for k in range(6):
        s.els[[e["id"] for e in s.els].index(f"qc{k}")]["hidden"] = True
    s.text("sum", s.v(30, 16), s.v(290, 280), "", s.v(16, 14), weight="bold", hidden=True, tone="info")
    s.text("fin", s.v(30, 16), s.v(330, 330), "", s.v(15, 13), hidden=True)
    s.step("Loop 1 halves i from 2⁴⁰ down to 1: one pass per halving, so j counts 40 of them.", ("v1", {"text": "i: 2⁴⁰ → 2³⁹ → … → 1"}))
    s.step("After loop 1: i = 1 and j = 40 = log₂ n.", ("v1", {"text": "i = 1, j = 40", "tone": "success"}))
    s.step("Loop 2 halves j while j > 1, counting the passes in sum.", ("l2", {"hidden": False}), ("qc0", {"hidden": False, "label": "40"}), ("sum", {"hidden": False, "text": "sum = 0"}))
    for k, v in enumerate(seq[1:] + [1], 1):
        s.step(f"Pass {k}: j = {seq[k - 1]} becomes {v}, sum = {k}." + (" Now j = 1, so the loop stops." if v == 1 else ""),
               (f"qc{k}", {"hidden": False, "label": str(v)}), ("sum", {"text": f"sum = {k}"}))
    s.step("fun(2⁴⁰) returns 5 = ⌊log₂ 40⌋ = ⌊log₂ log₂ n⌋.", ("sum", {"tone": "success"}), ("fin", {"hidden": False, "text": "returns 5 = ⌊log₂ log₂ 2⁴⁰⌋"}))
    return s.done("Halving loops count binary digits", (W, H), (360, 480),
                  "GATE 2018's function on n = 2⁴⁰: the first loop measures log₂ n, the second measures the log of that.")


@scene
def nested_loop_grid(L):
    s = S(L)
    W, H = s.v((660, 400), (360, 460))
    n = 8
    src = C.code_block(C.bank()["cse-2013-cs-31"])
    assert C.c_out("#include <stdio.h>\n" + src + f'\nint main(void) {{ printf("%d", unknown({n})); return 0; }}\n') == "60"
    iv = list(range(n // 2, n + 1))
    jv = []
    j = 2
    while j <= n:
        jv.append(j)
        j *= 2
    assert iv == [4, 5, 6, 7, 8] and jv == [2, 4, 8]
    s.head("GATE 2013: unknown(8): k += n/2 for every (i, j)", "unknown(8): k += 4 per (i, j)", W, 360)
    cell = s.v(64, 56)
    gx, gy = s.v(150, 90), s.v(90, 90)
    rows = [["i \\ j"] + [str(x) for x in jv]] + [[str(i)] + ["", "", ""] for i in iv]
    s.table("g", gx, gy, cell, s.v(40, 38), rows)
    s.text("k", s.v(330, 180), s.v(350, 360), "k = 0", s.v(17, 15), anchor="middle", weight="bold")
    s.text("f", s.v(330, 180), s.v(380, 400), "", s.v(14, 13), anchor="middle", hidden=True, tone="muted")
    k = 0
    cur = [r[:] for r in rows]
    for a, i in enumerate(iv):
        for b, jj in enumerate(jv):
            k += n // 2
            cur[a + 1][b + 1] = str(k)
        s.step(f"i = {i}: j takes the values 2, 4, 8 (3 passes), each adding n/2 = 4: k = {k}.",
               ("g", {"rows": [r[:] for r in cur], "highlight": [[a + 1, c] for c in range(1, 4)]}), ("k", {"text": f"k = {k}"}))
    assert k == 60
    s.step("5 values of i × 3 values of j × 4 = 60, i.e. (n/2 + 1) · log₂ n · n/2 for n = 8.",
           ("g", {"highlight": []}), ("k", {"tone": "success"}), ("f", {"hidden": False, "text": "(n/2 + 1)(log₂ n)(n/2) = 5 · 3 · 4"}))
    return s.done("Counting the body of a nested loop", (W, H), (360, 460),
                  "One row per value of i (n/2 … n) and one column per value of j (2, 4, 8); each cell is k after that pass.")
