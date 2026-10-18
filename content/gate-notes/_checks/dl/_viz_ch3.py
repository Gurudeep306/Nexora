"""Generator for the Viz scenes of Digital Logic Chapter 3 (Minimisation).

Every cell value, loop and caption term is computed here with minlib, so the scenes cannot drift
from the checked maths. A K-map is a Viz `grid` (values '1', 'X' or blank) with Gray-order axis
labels and small minterm numbers; a loop is a `box` revealed by a step; a wrap-around group is
drawn as the 2 or 4 pieces minlib.loop_rects returns, each pushed a little past the map edge it
wraps through. Each scene has a wide canvas and a narrow (phone) canvas.

    python3 content/gate-notes/_checks/dl/_viz_ch3.py      # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch3.py       # (check) files == generator output
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import minlib as ml  # noqa: E402
import boollib as bl  # noqa: E402
from _viz_ch1_fp import spec, step, el, text, box, line, heads, VIZ_DIR  # noqa: E402,F401

SPECS = {}
LOOP_TONES = ["accent", "success", "info", "warning", "danger", "subject"]


def scene(fn):
    SPECS[fn.__name__.replace("_", "-")] = fn
    return fn


def pretty(cube, vars_):
    """Product term with typographic primes (A′B)."""
    return ml.term(cube, vars_).replace("'", "′")


def pretty_sum(cube, vars_):
    return ml.sum_term(cube, vars_).replace("'", "′")


class KMap:
    """A K-map drawn twice: at (x, y, cell) on the wide canvas and (nx, ny, ncell) on the narrow one."""

    def __init__(self, pid, n, vars_, x, y, cell, nx, ny, ncell, ones=(), dcs=(), show_zeros=False, idx=True):
        self.pid, self.n, self.vars = pid, n, vars_
        self.g = {"wide": (x, y, cell), "narrow": (nx, ny, ncell)}
        self.rb, self.cb = ml.layout(n)
        self.R, self.C = 2 ** self.rb, 2 ** self.cb
        self.ones, self.dcs, self.show_zeros, self.idx = set(ones), set(dcs), show_zeros, idx

    def values(self, ones=None, dcs=None, zeros=None):
        ones = self.ones if ones is None else set(ones)
        dcs = self.dcs if dcs is None else set(dcs)
        zeros = self.show_zeros if zeros is None else zeros
        out = [["" for _ in range(self.C)] for _ in range(self.R)]
        for m in range(2 ** self.n):
            r, c = ml.cell_rc(m, self.n)
            out[r][c] = "1" if m in ones else "X" if m in dcs else ("0" if zeros else "")
        return out

    def xy(self, r, c, layout="wide"):
        x, y, s = self.g[layout]
        return x + c * s, y + r * s

    def elements(self, size=None):
        x, y, s = self.g["wide"]
        nx, ny, ns = self.g["narrow"]
        p = self.pid
        els = [el(f"{p}g", "grid", {"x": nx, "y": ny, "cell": ns}, x=x, y=y, rows=self.R, cols=self.C, cell=s,
                  values=self.values(), mono=True)]
        rl = [format(g, f"0{self.rb}b") for g in ml.gray(self.rb)] if self.rb else [""]
        cl = [format(g, f"0{self.cb}b") for g in ml.gray(self.cb)]
        for c, lab in enumerate(cl):
            els.append(text(f"{p}c{c}", x + c * s + s / 2, y - 12, lab, {"x": nx + c * ns + ns / 2, "y": ny - 11}, anchor="middle",
                            size=13, mono=True, tone="subject", weight="bold"))
        for r, lab in enumerate(rl):
            els.append(text(f"{p}r{r}", x - 10, y + r * s + s / 2, lab, {"x": nx - 8, "y": ny + r * ns + ns / 2}, anchor="end",
                            size=13, mono=True, tone="subject", weight="bold"))
        rv, cv = "".join(self.vars[:self.rb]), "".join(self.vars[self.rb:])
        els.append(text(f"{p}cv", x + self.C * s / 2, y - 32, f"{cv}", {"x": nx + self.C * ns / 2, "y": ny - 29}, anchor="middle",
                        size=13, weight="bold", tone="muted"))
        if rv:
            els.append(text(f"{p}rv", x - 10, y - 12, rv, {"x": nx - 8, "y": ny - 11}, anchor="end", size=13, weight="bold", tone="muted"))
        if self.idx:
            for m in range(2 ** self.n):
                r, c = ml.cell_rc(m, self.n)
                els.append(text(f"{p}i{m}", x + c * s + s - 4, y + r * s + s - 8, str(m),
                                {"x": nx + c * ns + ns - 3, "y": ny + r * ns + ns - 7, "size": 9}, anchor="end", size=10, tone="muted", mono=True))
        return els

    def loop_geom(self, cube, k, layout):
        """Box geometry for each drawn piece of a cube (inset by loop index k)."""
        x, y, s = self.g[layout]
        rects = ml.loop_rects(cube, self.n)
        inset = 5 + (k % 3) * 4
        wrap_r = len({r for r, _, _, _ in rects}) > 1
        wrap_c = len({c for _, c, _, _ in rects}) > 1
        out = []
        for r0, c0, rl, cl in rects:
            bx, by = x + c0 * s + inset, y + r0 * s + inset
            bw, bh = cl * s - 2 * inset, rl * s - 2 * inset
            ext = s * 0.32
            if wrap_c and c0 == 0:
                bx -= ext + inset
                bw += ext + inset
            if wrap_c and c0 + cl == self.C:
                bw += ext + inset
            if wrap_r and r0 == 0:
                by -= ext + inset
                bh += ext + inset
            if wrap_r and r0 + rl == self.R:
                bh += ext + inset
            out.append({"x": round(bx, 2), "y": round(by, 2), "w": round(bw, 2), "h": round(bh, 2)})
        return out

    def loops(self, lid, cube, k, tone=None, hidden=True, dashed=False):
        tone = tone or LOOP_TONES[k % len(LOOP_TONES)]
        wide, narrow = self.loop_geom(cube, k, "wide"), self.loop_geom(cube, k, "narrow")
        els = []
        for j, (w, nw) in enumerate(zip(wide, narrow)):
            els.append(box(f"{lid}{j}", w["x"], w["y"], w["w"], w["h"], None, nw, tone=tone, fill=tone, hidden=hidden, dashed=dashed))
        return els

    def loop_ids(self, lid, cube):
        return [f"{lid}{j}" for j in range(len(ml.loop_rects(cube, self.n)))]


def show(ids, **kw):
    return [(i, {"hidden": False, **kw}) for i in ids]


def hide(ids):
    return [(i, {"hidden": True}) for i in ids]


def note(id, x, y, nx, ny, t="", **kw):
    return text(id, x, y, t, {"x": nx, "y": ny, "size": kw.pop("nsize", 13)}, anchor=kw.pop("anchor", "start"), size=kw.pop("size", 15), **kw)


V4, V3 = list("ABCD"), list("ABC")


# ── Lesson 1: Karnaugh maps ─────────────────────────────────────────────────

@scene
def kmap_gray_layout():
    """The 16 minterms dropped into a 4×4 map in Gray order, row by row."""
    W, NW = 660, 360
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, idx=False)
    els = [*heads("Placing minterms on a 4-variable K-map", "Placing minterms on a K-map", W)]
    base = km.elements()
    grid = base[0]
    grid["values"] = [["" for _ in range(4)] for _ in range(4)]
    els += base
    els += [note("n1", 380, 110, 30, 340), note("n2", 380, 140, 30, 366), note("n3", 380, 170, 30, 392),
            note("n4", 380, 230, 30, 430, size=14, nsize=12, tone="muted")]
    vals = [["" for _ in range(4)] for _ in range(4)]
    steps = [step("Columns are labelled by C D and rows by A B, each in Gray order 00, 01, 11, 10: the third label is 11, not 10, so that every step along an axis flips exactly one bit.",
                  ("n1", {"text": "Gray order: 00 → 01 → 11 → 10", "tone": "accent"}),
                  ("n2", {"text": "one bit changes per step", "tone": "ink"}),
                  ("n3", {"text": "and 10 → 00 wraps round", "tone": "ink"}))]
    order = ml.gray(2)
    for r, ab in enumerate(order):
        ms = [ab * 4 + cd for cd in order]
        for c, m in enumerate(ms):
            vals[r][c] = str(m)
        bits = format(ab, "02b")
        steps.append(step(f"Row A B = {bits}: minterm number = 4·(A B) + (C D), so the row reads {', '.join(map(str, ms))}. The last two are swapped compared with counting order, because the columns are in Gray order.",
                          ("kg", {"values": [row[:] for row in vals], "highlight": [[r, c] for c in range(4)]}),
                          ("n1", {"text": f"row AB = {bits}: {' '.join(map(str, ms))}", "tone": "accent"}),
                          ("n2", {"text": f"binary order would give {' '.join(str(ab * 4 + x) for x in range(4))}", "tone": "muted"}),
                          ("n3", {"text": "", "tone": "ink"})))
    assert [int(v) for row in vals for v in row] == [0, 1, 3, 2, 4, 5, 7, 6, 12, 13, 15, 14, 8, 9, 11, 10]
    steps.append(step("The finished map, cell numbers 0 1 3 2 / 4 5 7 6 / 12 13 15 14 / 8 9 11 10. Any two cells side by side (or at opposite ends of a row or column) differ in exactly one variable.",
                      ("kg", {"highlight": []}),
                      ("n1", {"text": "0 1 3 2 / 4 5 7 6", "tone": "success"}),
                      ("n2", {"text": "12 13 15 14 / 8 9 11 10", "tone": "success"}),
                      ("n3", {"text": "rows 3 and 4 are AB = 11, then 10", "tone": "ink"}),
                      ("n4", {"text": "Memorise the pattern: swap the last two of every row, then the last two rows."})))
    return spec("Placing minterms on a 4-variable K-map in Gray order", (W, 330), (NW, 460),
                "An empty 4-variable map. Rows will be labelled by A B and columns by C D. Minterm m has A as its most significant bit.",
                els, steps)


@scene
def kmap_adjacency():
    W, NW = 660, 360
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56)
    els = [*heads("Neighbours on a K-map, edges included", "Neighbours on a K-map", W)]
    els += km.elements()
    els += [note("n1", 380, 110, 30, 340), note("n2", 380, 140, 30, 366), note("n3", 380, 170, 30, 392), note("n4", 380, 200, 30, 418)]

    def nb_patch(m):
        r, c = ml.cell_rc(m, 4)
        return [[*ml.cell_rc(x, 4)] for x in ml.map_neighbours(m, 4)] + [[r, c]]

    def b(m):
        return format(m, "04b")

    s5, s8, s2 = ml.map_neighbours(5, 4), ml.map_neighbours(8, 4), ml.map_neighbours(2, 4)
    assert s5 == [1, 4, 7, 13] and s8 == [0, 9, 10, 12]
    steps = [
        step(f"m5 = {b(5)}. Its four neighbours are the cells above, below, left and right: m{s5[0]}, m{s5[1]}, m{s5[2]}, m{s5[3]}. Each differs from 0101 in exactly one bit.",
             ("kg", {"highlight": nb_patch(5)}),
             ("n1", {"text": f"m5 = {b(5)}", "tone": "accent"}),
             ("n2", {"text": " ".join(f"m{x}={b(x)}" for x in s5[:2])}),
             ("n3", {"text": " ".join(f"m{x}={b(x)}" for x in s5[2:])}),
             ("n4", {"text": "4 variables → 4 neighbours", "tone": "muted"})),
        step(f"m8 = {b(8)} sits on the bottom-left corner. Its neighbours are m{s8[2]} (right edge, through the wrap), m{s8[0]} (top row, through the wrap), m9 and m12: still exactly one bit different each.",
             ("kg", {"highlight": nb_patch(8)}),
             ("n1", {"text": f"m8 = {b(8)}", "tone": "accent"}),
             ("n2", {"text": f"m0={b(0)}  m10={b(10)}"}),
             ("n3", {"text": f"m9={b(9)}  m12={b(12)}"}),
             ("n4", {"text": "the edges wrap round", "tone": "muted"})),
        step(f"m2 = {b(2)} is in the top row, last column. Its neighbours: m{s2[0]} (left end of the same row, through the wrap), m3, m6 and m10 (bottom row, through the wrap).",
             ("kg", {"highlight": nb_patch(2)}),
             ("n1", {"text": f"m2 = {b(2)}", "tone": "accent"}),
             ("n2", {"text": f"m0={b(0)}  m3={b(3)}"}),
             ("n3", {"text": f"m6={b(6)}  m10={b(10)}"}),
             ("n4", {"text": "roll the map: left meets right", "tone": "muted"})),
        step("Picture the map rolled into a tube (left edge glued to right) and the tube bent into a ring (top glued to bottom): a torus. On that surface every cell has exactly four neighbours, and they are exactly the minterms one bit away.",
             ("kg", {"highlight": []}),
             ("n1", {"text": "map = torus", "tone": "success"}),
             ("n2", {"text": "left edge ↔ right edge"}),
             ("n3", {"text": "top edge ↔ bottom edge"}),
             ("n4", {"text": "neighbours = one-bit changes", "tone": "muted"})),
    ]
    return spec("Neighbours of a cell on a 4-variable K-map, through the edges too", (W, 330), (NW, 450),
                "A 4-variable map with every cell numbered (rows A B, columns C D).", els, steps)


@scene
def kmap_corner_quad():
    W, NW = 660, 340
    ones = [0, 2, 8, 10]
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, ones=ones)
    cube = "-0-0"
    assert ml.cells(cube) == ones and len(ml.loop_rects(cube, 4)) == 4
    els = [*heads("The four corners form one group", "The four corners are one group", W)]
    els += km.elements() + km.loops("q", cube, 0, tone="accent")
    els += [note("n1", 380, 110, 30, 340), note("n2", 380, 140, 30, 366), note("n3", 380, 170, 30, 392)]
    ids = km.loop_ids("q", cube)
    steps = [
        step("The 1s are the four corners: m0 = 0000, m2 = 0010, m8 = 1000, m10 = 1010. They look as far apart as cells can be.",
             ("n1", {"text": "1s at m0, m2, m8, m10"})),
        step("Across the left/right edge: m0 and m2 differ only in C (0000, 0010), and so do m8 and m10. Across the top/bottom edge: m0 and m8 differ only in A, m2 and m10 too.",
             ("n2", {"text": "0 ~ 2 and 8 ~ 10 (C changes)"}), ("n3", {"text": "0 ~ 8 and 2 ~ 10 (A changes)"})),
        step("So the four corners are a 2 × 2 block on the torus: one group of 4, drawn as four corner pieces that reach outward through the edges.",
             *show(ids)),
        step(f"Inside the group A and C both change; B = 0 and D = 0 never change. A group of 4 = 2² cells keeps 4 − 2 = 2 literals: {pretty(cube, V4)}.",
             ("n1", {"text": f"f = {pretty(cube, V4)}", "tone": "success"}), ("n2", {"text": "B = 0 and D = 0 throughout"}), ("n3", {"text": "A and C change: they drop"})),
    ]
    return spec("The corner quad B′D′ on a 4-variable K-map", (W, 330), (NW, 420),
                "A 4-variable map (rows A B, columns C D) with 1s in the four corner cells.", els, steps)


@scene
def kmap_grouping():
    """Loops drawn one at a time: an octet and two wrap-around quads."""
    W, NW = 660, 360
    ones = [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14]
    covers = ml.min_covers(ones, [], 4)
    assert len(covers) == 1
    cover = sorted(covers[0], key=ml.cube_key)
    assert [ml.term(c, V4) for c in cover] == ["C'", "A'D'", "BD'"]
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, ones=ones)
    els = [*heads("Grouping the 1s: biggest legal loops, fewest of them", "Grouping the 1s, loop by loop", W)]
    els += km.elements()
    for k, c in enumerate(cover):
        els += km.loops(f"L{k}", c, k)
    els += [note("n1", 380, 110, 30, 340), note("n2", 380, 140, 30, 366), note("n3", 380, 170, 30, 392),
            note("ex", 380, 220, 30, 430, size=17, nsize=15, weight="bold", tone="success")]
    terms = [pretty(c, V4) for c in cover]
    steps = [
        step("Eleven 1s to cover. Look for the largest possible groups first, but make sure every loop is a rectangle of 1, 2, 4, 8 or 16 cells (wrap-around allowed).",
             ("n1", {"text": "11 ones, 5 zeros"})),
        step(f"The first two columns (C D = 00 and 01) are all 1s: an octet. C is 0 in both columns; A, B and D all change. 8 = 2³ cells keep 4 − 3 = 1 literal: {terms[0]}.",
             *show(km.loop_ids("L0", cover[0])), ("n1", {"text": f"octet: {terms[0]}  (m0 1 4 5 12 13 8 9)", "tone": "accent"}), ("ex", {"text": f"f = {terms[0]}"})),
        step(f"Still uncovered: m2 and m6 (column C D = 10). They join m0 and m4 in the first column through the left/right wrap: a quad in rows A B = 00, 01. A = 0 and D = 0 stay fixed: {terms[1]}.",
             *show(km.loop_ids("L1", cover[1])), ("n2", {"text": f"wrap quad: {terms[1]}  (m0 2 4 6)", "tone": "success"}), ("ex", {"text": f"f = {terms[0]} + {terms[1]}"})),
        step(f"Still uncovered: m14. Its biggest loop also wraps: m12, m14 with m4, m6 in rows A B = 01, 11. B = 1 and D = 0 stay fixed: {terms[2]}.",
             *show(km.loop_ids("L2", cover[2])), ("n3", {"text": f"wrap quad: {terms[2]}  (m4 6 12 14)", "tone": "info"}), ("ex", {"text": f"f = {' + '.join(terms)}"})),
        step(f"Every 1 is now inside a loop, and no loop can be bigger or dropped. Minimal SOP: f = {' + '.join(terms)}, with {sum(ml.literals(c) for c in cover)} literals.",
             ("ex", {"text": f"f = {' + '.join(terms)}"})),
    ]
    return spec("Grouping a 4-variable K-map: an octet and two wrap-around quads", (W, 330), (NW, 460),
                "Σm(0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14) on a 4-variable map (rows A B, columns C D).", els, steps)


@scene
def kmap_pos_zeros():
    W, NW = 660, 360
    P4 = list("PQRS")
    ones = [5, 6, 7, 12, 13, 14, 15]
    zeros = ml.zeros_of(ones, [], 4)
    covers = ml.min_pos_covers(ones, [], 4)
    assert len(covers) == 1
    cover = sorted(covers[0], key=ml.cube_key)
    assert [ml.sum_term(c, P4) for c in cover] == ["(Q)", "(P + R + S)"]
    sop_cov = ml.min_covers(ones, [], 4)[0]
    km = KMap("k", 4, P4, 120, 92, 56, 92, 92, 56, ones=ones, show_zeros=True)
    els = [*heads("POS: loop the 0s, read sum terms", "POS: loop the 0s", W)]
    els += km.elements()
    for k, c in enumerate(cover):
        els += km.loops(f"L{k}", c, k, tone=["danger", "warning"][k], dashed=True)
    els += [note("n1", 380, 110, 30, 340), note("n2", 380, 140, 30, 366), note("n3", 380, 170, 30, 392),
            note("ex", 380, 220, 30, 430, size=16, nsize=14, weight="bold", tone="success")]
    s1, s2 = pretty_sum(cover[0], P4), pretty_sum(cover[1], P4)
    sop = " + ".join(pretty(c, P4) for c in sorted(sop_cov, key=lambda c: c))
    steps = [
        step(f"F = PQ + P′QR + P′QR′S has {len(zeros)} zeros: m{', m'.join(map(str, zeros))}. For a product of sums, loop the 0s exactly as you would loop 1s.",
             ("n1", {"text": f"{len(zeros)} zeros to cover"})),
        step(f"Rows P Q = 00 and 10 are all 0s: an octet of 0s. Q = 0 throughout. A group of 0s is read as a sum term with each fixed variable written so that it is 0 on the group: Q = 0 gives the factor {s1}.",
             *show(km.loop_ids("L0", cover[0])), ("n1", {"text": f"octet of 0s: {s1}", "tone": "danger"}), ("ex", {"text": f"F = {s1}"})),
        step(f"Left: m4 = 0100. Pair it with m0 (column R S = 00, rows 00 and 01): P = 0, R = 0, S = 0 are fixed, so the factor is {s2} (a 0 bit gives the plain letter).",
             *show(km.loop_ids("L1", cover[1])), ("n2", {"text": f"pair of 0s: {s2}", "tone": "warning"}), ("ex", {"text": f"F = {s1}{s2}"})),
        step(f"Minimal POS: F = {s1}{s2}, 4 literals. The minimal SOP, {sop}, needs 6. Here the POS is cheaper.",
             ("n3", {"text": f"SOP: {sop} (6)", "tone": "muted"})),
    ]
    return spec("Minimal POS by grouping the 0s of a K-map", (W, 330), (NW, 460),
                "F(P, Q, R, S) = PQ + P′QR + P′QR′S on a map with rows P Q and columns R S; the 0s are shown.", els, steps)


@scene
def kmap_trap_labels():
    """The 1998 map: columns printed in binary order; re-drawn in Gray order."""
    W, NW = 660, 360
    printed = ["00", "01", "10", "11"]
    rowvals = ["1001", "1001"]
    # True function: 1 where BC is 00 or 11.
    ones = [a * 4 + int(bc, 2) for a in (0, 1) for bc, v in zip(printed, rowvals[a]) if v == "1"]
    assert ones == [0, 3, 4, 7] and ml.min_sop(ones, [], 3, V3) == ["B'C' + BC"]
    x0, y0, s = 150, 100, 56
    nx0, ny0, ns = 92, 100, 56
    els = [*heads("Trap: a map printed in binary order", "Trap: binary-order labels", W)]
    els.append(el("pg", "grid", {"x": nx0, "y": ny0, "cell": ns}, x=x0, y=y0, rows=2, cols=4, cell=s, values=[list(r) for r in rowvals], mono=True))
    for c, lab in enumerate(printed):
        els.append(text(f"pc{c}", x0 + c * s + s / 2, y0 - 12, lab, {"x": nx0 + c * ns + ns / 2, "y": ny0 - 11}, anchor="middle", size=13, mono=True, tone="danger", weight="bold"))
    for r in (0, 1):
        els.append(text(f"pr{r}", x0 - 10, y0 + r * s + s / 2, str(r), {"x": nx0 - 8, "y": ny0 + r * ns + ns / 2}, anchor="end", size=13, mono=True, tone="subject", weight="bold"))
    els.append(text("pcv", x0 + 2 * s, y0 - 32, "BC (as printed)", {"x": nx0 + 2 * ns, "y": ny0 - 29}, anchor="middle", size=13, weight="bold", tone="muted"))
    els.append(text("prv", x0 - 10, y0 - 12, "A", {"x": nx0 - 8, "y": ny0 - 11}, anchor="end", size=13, weight="bold", tone="muted"))
    # The tempting wrong loop: columns 1 and 4 as a wrap-around quad.
    wrong = [box("w0", x0 - 18, y0 + 5, s + 13, 2 * s - 10, None, {"x": nx0 - 18, "y": ny0 + 5, "w": ns + 13, "h": 2 * ns - 10}, tone="danger", fill="danger", hidden=True, dashed=True),
             box("w1", x0 + 3 * s + 5, y0 + 5, s + 13, 2 * s - 10, None, {"x": nx0 + 3 * ns + 5, "y": ny0 + 5, "w": ns + 13, "h": 2 * ns - 10}, tone="danger", fill="danger", hidden=True, dashed=True)]
    els += wrong
    els += [note("n1", 420, 110, 30, 260), note("n2", 420, 140, 30, 286), note("n3", 420, 170, 30, 312),
            note("ex", 420, 215, 30, 345, size=16, nsize=14, weight="bold")]
    gray_vals = [[rowvals[a][printed.index(lab)] for lab in ["00", "01", "11", "10"]] for a in (0, 1)]
    good = ["-00", "-11"]
    goodbox = []
    for k, cube in enumerate(good):
        cs = ml.cells(cube)
        cols = sorted({ml.cell_rc(m, 3)[1] for m in cs})
        c0 = cols[0]
        goodbox.append(box(f"g{k}", x0 + c0 * s + 5, y0 + 5, s - 10, 2 * s - 10, None, {"x": nx0 + c0 * ns + 5, "y": ny0 + 5, "w": ns - 10, "h": 2 * ns - 10},
                           tone=["accent", "success"][k], fill=["accent", "success"][k], hidden=True))
    els += goodbox
    steps = [
        step("The columns are labelled 00, 01, 10, 11: plain counting order, not Gray order. Between the 2nd and 3rd columns two bits change (01 → 10), and the two end columns (00 and 11) are not neighbours either.",
             ("n1", {"text": "labels: 00 01 10 11 (binary!)", "tone": "danger"})),
        step("The tempting mistake: treat the end columns as a wrap-around group of four 1s and write C′ (or B′). On this map the ends differ in two bits, so that loop is illegal.",
             *show(["w0", "w1"]), ("n2", {"text": "wrap loop of the ends: illegal", "tone": "danger"}), ("ex", {"text": "not C′", "tone": "danger"})),
        step("Re-draw the columns in Gray order 00, 01, 11, 10: the column of 1s labelled 11 moves to the third place. Now the 1s are in columns 00 and 11, which are not adjacent.",
             *hide(["w0", "w1"]), ("pg", {"values": [list(r) for r in gray_vals]}),
             *[(f"pc{c}", {"text": lab, "tone": "subject"}) for c, lab in enumerate(["00", "01", "11", "10"])],
             ("pcv", {"text": "BC (Gray order)"}), ("n2", {"text": "re-drawn: 00 01 11 10", "tone": "accent"}), ("ex", {"text": ""})),
        step("Two vertical pairs: B = C = 0 gives B′C′, B = C = 1 gives BC (A changes in both, so it drops). f = B′C′ + BC = (B ⊕ C)′, the XNOR of B and C.",
             *show(["g0", "g1"]), ("n3", {"text": "pairs: B′C′ and BC", "tone": "success"}), ("ex", {"text": "f = B′C′ + BC = (B ⊕ C)′", "tone": "success"})),
    ]
    return spec("A K-map printed with binary-order labels, re-drawn in Gray order", (W, 290), (NW, 380),
                "A 3-variable map with rows A = 0, 1 and columns labelled B C = 00, 01, 10, 11 as printed in a GATE paper. Each row reads 1 0 0 1.",
                els, steps)


@scene
def kmap_checkerboard():
    W, NW = 660, 360
    ones = [m for m in range(16) if bin(m).count("1") % 2]
    ps = ml.primes(ones, [], 4)
    assert len(ps) == 8 and all(ml.literals(p) == 4 for p in ps)
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, ones=ones)
    xnor = [m for m in range(16) if ((m >> 2) & 1) == (m & 1)]
    assert ml.min_sop(xnor, [], 4, V4) == ["B'D' + BD"]
    els = [*heads("The checkerboard: parity cannot be grouped", "The checkerboard (parity)", W)]
    els += km.elements()
    els += [note("n1", 380, 110, 30, 340), note("n2", 380, 140, 30, 366), note("n3", 380, 170, 30, 392),
            note("ex", 380, 220, 30, 430, size=16, nsize=14, weight="bold")]
    r1 = [[*ml.cell_rc(m, 4)] for m in [1] + ml.map_neighbours(1, 4)]
    steps = [
        step("The 1s are the minterms with an odd number of 1 bits: 1, 2, 4, 7, 8, 11, 13, 14. They form a checkerboard.",
             ("n1", {"text": "odd number of 1 bits → 1"})),
        step("Every neighbour of a 1 is a 0: moving to a neighbour flips one bit, which changes the parity. Here m1 = 0001 and its neighbours m0, m3, m5, m9 all have an even number of 1s.",
             ("kg", {"highlight": r1}), ("n2", {"text": "each neighbour flips one bit → parity flips"})),
        step("So no two 1s are adjacent: every prime implicant is a single minterm, and the minimal SOP has all 8 minterms (32 literals). The compact form is the XOR A ⊕ B ⊕ C ⊕ D.",
             ("kg", {"highlight": []}), ("n3", {"text": "8 PIs, each one cell"}), ("ex", {"text": "f = A ⊕ B ⊕ C ⊕ D", "tone": "success"})),
        step("A partial checkerboard, where only some variables alternate, does group: 1s where B = D form the two quads B′D′ (corners) and BD (centre), so f = B′D′ + BD = (B ⊕ D)′.",
             ("kg", {"values": km.values(ones=xnor)}), ("n1", {"text": "1 where B = D"}), ("n2", {"text": "corners B′D′ + centre BD"}),
             ("n3", {"text": "A and C are free"}), ("ex", {"text": "f = B′D′ + BD", "tone": "success"})),
    ]
    return spec("The checkerboard K-map of 4-variable parity", (W, 330), (NW, 460),
                "A 4-variable map (rows A B, columns C D) with 1s on the odd-parity minterms.", els, steps)


# ── Lesson 2: prime implicants and don't-cares ──────────────────────────────

def side_notes(ids_y, x=380, nx=30, ny0=340, dy=26):
    return [note(i, x, y, nx, ny0 + k * dy) for k, (i, y) in enumerate(ids_y)]


@scene
def pi_enumeration():
    """Every prime implicant drawn one at a time, then the redundant one identified."""
    W_, NW = 660, 360
    ones = [0, 1, 2, 3, 5, 7, 8, 10, 14]
    ps, es, red, sel = ml.classify(ones, [], 4)
    order = [ml.parse_term(t, V4) for t in ("A'B'", "A'D", "B'D'", "ACD'")]
    assert sorted(order, key=ml.cube_key) == ps and red == [order[0]] and sorted(es, key=ml.cube_key) == sorted(order[1:], key=ml.cube_key)
    assert [c for c in ml.min_covers(ones, [], 4)] == [tuple(sorted(order[1:], key=ml.cube_key))]
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, ones=ones)
    els = [*heads("Listing every prime implicant", "Listing every prime implicant", W_)]
    els += km.elements()
    for k, c in enumerate(order):
        els += km.loops(f"P{k}", c, k)
    els += side_notes([("n0", 110), ("n1", 136), ("n2", 162), ("n3", 188), ("ex", 230)])
    t = [pretty(c, V4) for c in order]
    steps = [
        step("f = Σm(0, 1, 2, 3, 5, 7, 8, 10, 14). A prime implicant is a loop that cannot be made any bigger. Grow a loop from every 1 in every direction it can go.",
             ("n0", {"text": "9 ones; find every maximal loop", "tone": "muted"})),
        step(f"Starting from m0: the whole top row is 1s, a quad {t[0]}. It cannot grow (row A B = 01 is not all 1s).",
             *show(km.loop_ids("P0", order[0])), ("n0", {"text": f"PI 1: {t[0]} (m0 1 2 3)", "tone": "accent"})),
        step(f"Starting from m5: m1, m3, m5, m7 form a quad {t[1]} (rows 00 and 01, columns 01 and 11).",
             *show(km.loop_ids("P1", order[1])), ("n1", {"text": f"PI 2: {t[1]} (m1 3 5 7)", "tone": "success"})),
        step(f"Starting from m8: m0, m2, m8, m10 are the four corners, a quad {t[2]}.",
             *show(km.loop_ids("P2", order[2])), ("n2", {"text": f"PI 3: {t[2]} (m0 2 8 10)", "tone": "info"})),
        step(f"Starting from m14: its only neighbouring 1 is m10, so the largest loop is the pair {t[3]}. No 1 is left outside a loop: there are exactly 4 prime implicants.",
             *show(km.loop_ids("P3", order[3])), ("n3", {"text": f"PI 4: {t[3]} (m10 14)", "tone": "warning"})),
        step(f"The biggest loop is not always needed: {t[0]}'s cells 0, 2 are inside {t[2]} and 1, 3 inside {t[1]}. It is a prime implicant but a redundant one. Minimal SOP: f = {t[1]} + {t[2]} + {t[3]}.",
             *hide(km.loop_ids("P0", order[0])), ("n0", {"text": f"PI 1: {t[0]} is redundant", "tone": "danger"}),
             ("ex", {"text": f"f = {t[1]} + {t[2]} + {t[3]}", "tone": "success"})),
    ]
    return spec("Listing every prime implicant of a 4-variable function", (W_, 330), (NW, 480),
                "Σm(0, 1, 2, 3, 5, 7, 8, 10, 14) on a 4-variable map (rows A B, columns C D).", els, steps)


@scene
def epi_highlight():
    W_, NW = 660, 360
    ones = [1, 3, 6, 7, 10, 12, 13, 14]
    ps, es, red, sel = ml.classify(ones, [], 4)
    covs = ml.min_covers(ones, [], 4)
    assert len(ps) == 7 and len(es) == 3 and len(red) == 1 and len(covs) == 1
    ch = ml.chart(ones, ps)
    dist = [m for m, cov in ch.items() if len(cov) == 1]
    assert dist == [1, 10, 13]
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, ones=ones)
    els = [*heads("Essential prime implicants: 1s with only one way out", "Essential prime implicants", W_)]
    els += km.elements()
    ess = sorted(es, key=ml.cube_key)
    for k, c in enumerate(ess):
        els += km.loops(f"E{k}", c, k, tone="success")
    rest = sorted(sel, key=ml.cube_key)
    fin = [c for c in covs[0] if c not in es][0]
    els += km.loops("S", fin, 3, tone="accent")
    els += side_notes([("n0", 110), ("n1", 136), ("n2", 162), ("n3", 188), ("ex", 230)])
    hl = [[*ml.cell_rc(m, 4)] for m in dist]
    steps = [
        step(f"f = Σm({', '.join(map(str, ones))}) has {len(ps)} prime implicants. Count, for every 1-cell, how many of them contain it.",
             ("n0", {"text": f"{len(ps)} prime implicants", "tone": "muted"})),
        step(f"Three 1s lie in exactly one prime implicant: m{dist[0]}, m{dist[1]} and m{dist[2]} (shaded). Any cover must use that implicant, so it is essential.",
             ("kg", {"highlight": hl}), ("n0", {"text": "1s covered once: m1, m10, m13", "tone": "warning"})),
        step(f"The essential prime implicants: {', '.join(pretty(c, V4) for c in ess)}. Draw them first.",
             *show([i for k, c in enumerate(ess) for i in km.loop_ids(f"E{k}", c)]),
             ("n1", {"text": "EPIs: " + ", ".join(pretty(c, V4) for c in ess), "tone": "success"})),
        step(f"Still uncovered: m6 and m7. Of the remaining prime implicants, {pretty(fin, V4)} covers both; A′CD or BCD′ would cover only one each and need a second term. So {pretty(fin, V4)} is the cheapest way to finish.",
             ("kg", {"highlight": [[*ml.cell_rc(6, 4)], [*ml.cell_rc(7, 4)]]}), *show(km.loop_ids("S", fin)),
             ("n2", {"text": f"m6, m7: choose {pretty(fin, V4)}", "tone": "accent"})),
        step(f"Minimal SOP: f = {' + '.join(pretty(c, V4) for c in sorted(covs[0], key=ml.cube_key))}. {pretty(red[0], V4)} is redundant: its 1s are all inside the essential ones.",
             ("kg", {"highlight": []}), ("n3", {"text": f"redundant: {pretty(red[0], V4)}", "tone": "danger"}),
             ("ex", {"text": "f = " + " + ".join(pretty(c, V4) for c in sorted(covs[0], key=ml.cube_key)), "tone": "success"})),
    ]
    return spec("Essential prime implicants from the 1s covered only once", (W_, 330), (NW, 480),
                f"Σm({', '.join(map(str, ones))}) on a 4-variable map (rows A B, columns C D).", els, steps)


@scene
def cyclic_map():
    W_, NW = 660, 360
    ones = [1, 2, 3, 4, 5, 6]
    ps = ml.primes(ones, [], 3)
    covs = ml.min_covers(ones, [], 3)
    assert len(ps) == 6 and not ml.essential(ones, [], 3) and len(covs) == 2
    km = KMap("k", 3, V3, 140, 110, 64, 92, 110, 64, ones=ones)
    els = [*heads("A cyclic function: no essential prime implicant", "A cyclic function", W_)]
    els += km.elements()
    c1, c2 = (sorted(c, key=ml.cube_key) for c in covs)
    for k, c in enumerate(c1):
        els += km.loops(f"A{k}", c, k, tone="accent")
    for k, c in enumerate(c2):
        els += km.loops(f"B{k}", c, k + 1, tone="success", dashed=True)
    els += side_notes([("n0", 120), ("n1", 146), ("n2", 172), ("ex", 214)], x=420, ny0=270)
    s1 = " + ".join(pretty(c, V3) for c in c1)
    s2 = " + ".join(pretty(c, V3) for c in c2)
    steps = [
        step("Σm(1, 2, 3, 4, 5, 6): every 1 except the corners of the cube 000 and 111. Each 1 has exactly two neighbouring 1s, so it can be looped in two different pairs.",
             ("n0", {"text": "6 ones, each with 2 neighbouring 1s"})),
        step("The six pairs form a ring: 1–3, 3–2, 2–6, 6–4, 4–5, 5–1. All six are prime implicants and every 1 is in two of them, so no prime implicant is essential.",
             ("n1", {"text": "6 PIs, 0 EPIs: cyclic", "tone": "warning"})),
        step(f"Pick every other pair around the ring: {s1}. Three pairs, 6 literals, every 1 covered once.",
             *show([i for k, c in enumerate(c1) for i in km.loop_ids(f"A{k}", c)]), ("ex", {"text": "f = " + s1, "tone": "accent"})),
        step(f"Or start one step further round: {s2}. Also three pairs and 6 literals. Two different minimal SOPs: the minimal form is not unique.",
             *hide([i for k, c in enumerate(c1) for i in km.loop_ids(f"A{k}", c)]),
             *show([i for k, c in enumerate(c2) for i in km.loop_ids(f"B{k}", c)]),
             ("n2", {"text": "2 minimal covers, equal cost", "tone": "success"}), ("ex", {"text": "f = " + s2, "tone": "success"})),
    ]
    return spec("The cyclic function Σm(1, 2, 3, 4, 5, 6) and its two minimal covers", (W_, 290), (NW, 400),
                "Σm(1, 2, 3, 4, 5, 6) on a 3-variable map (rows A, columns B C).", els, steps)


@scene
def dont_care_toggle():
    W_, NW = 660, 360
    ones, dcs = [1, 3, 7, 11, 15], [0, 5]
    assert ml.min_sop(ones, dcs, 4, V4) == ["A'D + CD"] and ml.min_sop(ones, [], 4, V4) == ["CD + A'B'D"]
    km = KMap("k", 4, V4, 120, 92, 56, 92, 92, 56, ones=ones, dcs=dcs)
    els = [*heads("Don't-cares: use an X only if it makes a loop bigger", "Use an X only if it helps", W_)]
    els += km.elements()
    els += km.loops("C", "--11", 0, tone="accent")
    els += km.loops("P", "00-1", 1, tone="warning", dashed=True)
    els += km.loops("Q", "0--1", 2, tone="success")
    els += side_notes([("n0", 110), ("n1", 136), ("n2", 162), ("n3", 188), ("ex", 230)])
    steps = [
        step("f = Σm(1, 3, 7, 11, 15) + d(0, 5). The X cells may be treated as 1 or as 0, whichever gives the cheaper expression; they never need to be covered.",
             ("n0", {"text": "X = don't-care (0 or 1, your choice)", "tone": "muted"})),
        step("Column C D = 11 (m3, m7, m15, m11) is a quad of 1s: CD.", *show(km.loop_ids("C", "--11")), ("n1", {"text": "CD (m3 7 15 11)", "tone": "accent"})),
        step("m1 is left. Without don't-cares its best loop is the pair m1, m3: A′B′D, 3 literals.",
             *show(km.loop_ids("P", "00-1")), ("n2", {"text": "without X: A′B′D", "tone": "warning"}), ("ex", {"text": "f = CD + A′B′D (5 literals)"})),
        step("Treat X at m5 as 1: m1, m3, m5, m7 become a quad, A′D, with only 2 literals. The X at m0 would not enlarge any loop, so it stays 0 and is left out.",
             *hide(km.loop_ids("P", "00-1")), *show(km.loop_ids("Q", "0--1")),
             ("n2", {"text": "X at m5 used: A′D", "tone": "success"}), ("n3", {"text": "X at m0 not used", "tone": "muted"}),
             ("ex", {"text": "f = CD + A′D (4 literals)", "tone": "success"})),
    ]
    return spec("Using don't-cares only where they enlarge a loop", (W_, 330), (NW, 480),
                "Σm(1, 3, 7, 11, 15) + d(0, 5) on a 4-variable map (rows A B, columns C D); X marks a don't-care.", els, steps)


# ── Lesson 3: Quine–McCluskey, PI charts, larger maps, VEMs ─────────────────

def table(id, x, y, cw, ch, rows, n=None, **kw):
    return el(id, "table", n, x=x, y=y, cellW=cw, cellH=ch, rows=rows, **kw)


@scene
def qm_tabulation():
    """The Quine–McCluskey table for Σ(0, 2, 4, 5, 6, 10), filled round by round."""
    W_, NW = 660, 360
    ones = [0, 2, 4, 5, 6, 10]
    rounds, ps = ml.qm(ones, [], 4)
    assert [len(r) for r in rounds] == [6, 6, 1] and sorted(ml.term(p, V4) for p in ps) == sorted(["A'D'", "A'BC'", "B'CD'"])
    hdr = ["cells", "cube", "✓"]

    def rows_of(rnd, show_ticks, upto=None):
        out = [hdr]
        for i, (c, used) in enumerate(rnd):
            if upto is not None and i >= upto:
                out.append(["", "", ""])
                continue
            out.append([",".join(map(str, ml.cells(c))), c, ("✓" if used else "PI") if show_ticks else ""])
        return out

    cw, ch = 62, 24
    xs = [16, 232, 448]
    nys = [70, 280, 490]
    els = [*heads("Quine–McCluskey: combine neighbours in the table", "Quine–McCluskey, round by round", W_)]
    labels = ["Round 0: minterms", "Round 1: pairs", "Round 2: quads"]
    for k, rnd in enumerate(rounds):
        els.append(text(f"t{k}", xs[k] + 93, 62, labels[k], {"x": 180, "y": nys[k] - 10, "size": 13}, anchor="middle", size=14, weight="bold", tone="muted", hidden=k > 0))
        els.append(table(f"r{k}", xs[k], 76, cw, ch, rows_of(rnd, False, 0 if k else None), {"x": 87, "y": nys[k]}, header=True, mono=True, hidden=k > 0))
    els.append(note("n0", 16, 270, 16, 560, size=14, nsize=12))
    els.append(note("n1", 16, 296, 16, 582, size=14, nsize=12, tone="success"))
    w = [c.count("1") for c, _ in rounds[0]]
    assert w == [0, 1, 1, 2, 2, 2]
    r1 = rounds[1]
    steps = [
        step("List the minterms in binary, sorted by their number of 1s: group 0 = {0}, group 1 = {2, 4}, group 2 = {5, 6, 10}. Only neighbouring groups can combine, because a combinable pair differs in exactly one bit.",
             ("n0", {"text": "groups by weight: {0} | {2, 4} | {5, 6, 10}"})),
        step("Compare group 0 with group 1: 0000 with 0010 gives 00-0, with 0100 gives 0-00. Compare group 1 with group 2: 0010 with 0110 → 0-10, with 1010 → -010; 0100 with 0101 → 010-, with 0110 → 01-0. Every minterm was used, so all get a tick.",
             ("r0", {"rows": rows_of(rounds[0], True)}), ("t1", {"hidden": False}), ("r1", {"hidden": False, "rows": rows_of(r1, False)}),
             ("n0", {"text": "6 pairs; every minterm ticked"})),
        step("Round 1 (pairs), grouped by their 1s: {00-0, 0-00} then {010-, 01-0, 0-10, -010}. Two pairs combine only if their dashes are in the same place and they differ in one other bit: 00-0 + 01-0 = 0--0, and 0-00 + 0-10 = 0--0 again (record it once).",
             ("t2", {"hidden": False}), ("r2", {"hidden": False, "rows": rows_of(rounds[2], False)}),
             ("n0", {"text": "0--0 appears twice: keep one copy"})),
        step("Tick the pairs that combined (00-0, 0-00, 01-0, 0-10). 010- and -010 found no partner with matching dashes: they are prime implicants. Round 2 has a single cube, 0--0, which cannot combine further: also prime.",
             ("r1", {"rows": rows_of(r1, True)}), ("r2", {"rows": rows_of(rounds[2], True)}),
             ("n0", {"text": "unticked = prime implicants"})),
        step(f"Prime implicants: 0--0 = A′D′, 010- = A′BC′, -010 = B′CD′. That is 3 PIs, the same answer the map gives (GATE 2015).",
             ("n1", {"text": "PIs: A′D′, A′BC′, B′CD′"})),
    ]
    return spec("Quine–McCluskey tabulation of Σm(0, 2, 4, 5, 6, 10)", (W_, 320), (NW, 610),
                "The tabular method needs no picture: list the minterms in binary and merge cubes that differ in one bit, round by round.",
                els, steps)


@scene
def pi_chart_dominance():
    W_, NW = 660, 360
    ones = [0, 1, 2, 5, 6, 7, 8, 9, 10, 14]
    ps = ml.primes(ones, [], 4)
    ch = ml.chart(ones, ps)
    es = ml.essential(ones, [], 4)
    cov = ml.min_covers(ones, [], 4)
    order = [ml.parse_term(t, V4) for t in ("B'C'", "B'D'", "CD'", "A'C'D", "A'BD", "A'BC")]
    assert sorted(order) == sorted(ps) and sorted(es) == sorted([order[0], order[2]])
    assert cov == [tuple(sorted([order[0], order[2], order[4]], key=ml.cube_key))]
    cols = sorted(ones)
    marks = [["×" if m in ml.cells(p) else "" for m in cols] for p in order]
    cw, chh = 40, 26
    x0, y0 = 150, 70
    ncw, nx0, ny0 = 25, 82, 70
    els = [*heads("The prime-implicant chart: essential rows, then dominance", "PI chart and dominance", W_)]
    els.append(table("hd", x0, y0, cw, chh, [[str(m) for m in cols]], {"x": nx0, "y": ny0, "cellW": ncw}, header=True, mono=True))
    els.append(table("mk", x0, y0 + chh, cw, chh, [r[:] for r in marks], {"x": nx0, "y": ny0 + chh, "cellW": ncw}, mono=True))
    for i, p in enumerate(order):
        els.append(text(f"l{i}", x0 - 10, y0 + chh * (i + 1.5), pretty(p, V4), {"x": nx0 - 6, "y": ny0 + chh * (i + 1.5), "size": 12}, anchor="end", size=14, mono=True))
    els += [note("n0", 40, 270, 16, 290, size=14, nsize=12), note("n1", 40, 296, 16, 314, size=14, nsize=12),
            note("ex", 40, 330, 16, 346, size=16, nsize=13, weight="bold", tone="success")]
    single = [j for j, m in enumerate(cols) if len(ch[m]) == 1]
    assert [cols[j] for j in single] == [9, 14]
    covered = set().union(*(set(ml.cells(order[i])) for i in (0, 2)))
    left = [j for j, m in enumerate(cols) if m not in covered]
    assert [cols[j] for j in left] == [5, 7]
    steps = [
        step("Rows are the six prime implicants, columns the ten 1-cells; × means the PI covers that cell. A minimal SOP must pick rows so that every column has a × in a picked row.",
             ("n0", {"text": "rows = PIs, columns = 1-cells"})),
        step("Columns 9 and 14 contain a single ×: only B′C′ covers m9 and only CD′ covers m14. Both rows are essential.",
             ("hd", {"highlight": [[0, j] for j in single]}), ("mk", {"highlight": [[0, single[0]], [2, single[1]]]}),
             ("l0", {"tone": "success", "weight": "bold"}), ("l2", {"tone": "success", "weight": "bold"}),
             ("n0", {"text": "single-× columns 9, 14 → EPIs B′C′, CD′", "tone": "success"})),
        step(f"Delete every column the essential rows cover (0, 1, 2, 6, 8, 9, 10, 14). Only columns 5 and 7 remain.",
             ("hd", {"highlight": [[0, j] for j in left]}), ("mk", {"highlight": [], "rows": [[mk if j in left else "·" for j, mk in enumerate(r)] for r in marks]}),
             ("n1", {"text": "left to cover: m5, m7"})),
        step("Row dominance: on the remaining columns A′BD covers {5, 7}, A′C′D only {5}, A′BC only {7}. A′BD dominates both (and costs no more), so the dominated rows are crossed out.",
             ("l3", {"tone": "muted"}), ("l5", {"tone": "muted"}), ("l4", {"tone": "accent", "weight": "bold"}),
             ("mk", {"highlight": [[4, left[0]], [4, left[1]]]}),
             ("n1", {"text": "A′BD dominates A′C′D and A′BC", "tone": "accent"})),
        step("Minimal SOP: the two essential rows plus A′BD. (Column dominance gives the same result from the other side: column 9's only row, B′C′, also covers 0, 1 and 8, so those columns could have been dropped at once.)",
             ("ex", {"text": "f = B′C′ + CD′ + A′BD"})),
    ]
    return spec("A prime-implicant chart reduced by essential rows and row dominance", (W_, 350), (NW, 360),
                "f = Σm(0, 1, 2, 5, 6, 7, 8, 9, 10, 14): its six prime implicants (rows) against its ten 1-cells (columns).", els, steps)


@scene
def five_var_map():
    W_, NW = 660, 360
    V5 = list("ABCDE")
    f5 = bl.minterms("C'E' + BD + A'CDE", V5)
    assert ml.min_sop(f5, [], 5, V5) == ["C'E' + BD + A'CDE"]
    sub = [[m & 15 for m in f5 if (m >> 4) == a] for a in (0, 1)]
    k0 = KMap("a", 4, list("BCDE"), 70, 100, 46, 92, 92, 44, ones=sub[0])
    k1 = KMap("b", 4, list("BCDE"), 390, 100, 46, 92, 352, 44, ones=sub[1])
    els = [*heads("Five variables: two 4-variable maps, A = 0 and A = 1", "Five variables: two maps", W_)]
    els.append(text("ta", 70 + 92, 50, "A = 0", {"x": 92 + 88, "y": 50}, anchor="middle", size=15, weight="bold", tone="accent"))
    els.append(text("tb", 390 + 92, 50, "A = 1", {"x": 92 + 88, "y": 310}, anchor="middle", size=15, weight="bold", tone="accent"))
    els += k0.elements() + k1.elements()
    cubes = [ml.parse_term(t, V5) for t in ("C'E'", "BD", "A'CDE")]
    for k, c in enumerate(cubes):
        for a, km in ((0, k0), (1, k1)):
            if c[0] in ("-", str(a)):
                els += km.loops(f"L{k}{a}", c[1:], k)
    els += [note("n0", 70, 318, 20, 560, size=14, nsize=12), note("ex", 70, 344, 20, 584, size=15, nsize=13, weight="bold", tone="success")]
    ids = lambda k: [i for a, km in ((0, k0), (1, k1)) if cubes[k][0] in ("-", str(a)) for i in km.loop_ids(f"L{k}{a}", cubes[k][1:])]
    steps = [
        step("A 5-variable map is two 4-variable maps (rows B C, columns D E), one for A = 0 and one for A = 1. Inside each map the usual neighbours apply; in addition every cell is adjacent to the cell in the same position of the other map (they differ only in A).",
             ("n0", {"text": "same position in the other map = neighbour"})),
        step("The four corner cells of each map (C = 0, E = 0) are 1s in both maps. In each map they form a corner quad, and the two quads face each other: one group of 8 = 2³ cells, so 5 − 3 = 2 literals: C′E′.",
             *show(ids(0)), ("ex", {"text": "f = C′E′"})),
        step("Rows B C = 11 and 10, columns D E = 11 and 10 (B = 1, D = 1) are 1s in both maps: another octet across the maps, BD.",
             *show(ids(1)), ("ex", {"text": "f = C′E′ + BD"})),
        step("Left: m7 (00111) in the A = 0 map only. Its mirror m23 is 0, so the loop cannot cross to A = 1; inside its own map it pairs with m15: A′CDE (4 literals).",
             *show(ids(2)), ("n0", {"text": "mirror cell is 0: the pair stays in one map"}), ("ex", {"text": "f = C′E′ + BD + A′CDE"})),
    ]
    return spec("A five-variable K-map as two four-variable maps", (W_, 360), (NW, 600),
                "f(A, B, C, D, E) = Σm(" + ", ".join(map(str, f5)) + "), drawn as an A = 0 map and an A = 1 map (rows B C, columns D E).", els, steps)


@scene
def vem_unfold():
    W_, NW = 660, 360
    entries = {(0, 0): "C", (0, 1): "1", (1, 0): "0", (1, 1): "C'"}
    # f(A, B, C) with the VEM over map variables A (rows), B (columns) and C entered.
    ones = [m for m in range(8) if {"0": 0, "1": 1, "C": m & 1, "C'": 1 - (m & 1)}[entries[(m >> 2, (m >> 1) & 1)]]]
    assert ones == [1, 2, 3, 6] and ml.min_sop(ones, [], 3, V3) == ["A'C + BC'"]
    x0, y0, s = 60, 110, 64
    nx0, ny0, ns = 110, 90, 60
    els = [*heads("A variable-entered map and its unfolded K-map", "Variable-entered map, unfolded", W_)]
    els.append(el("vg", "grid", {"x": nx0, "y": ny0, "cell": ns}, x=x0, y=y0, rows=2, cols=2, cell=s,
                  values=[[entries[(0, 0)].replace("'", "′"), entries[(0, 1)]], [entries[(1, 0)], entries[(1, 1)].replace("'", "′")]], mono=True))
    for c in (0, 1):
        els.append(text(f"vc{c}", x0 + c * s + s / 2, y0 - 12, str(c), {"x": nx0 + c * ns + ns / 2, "y": ny0 - 11}, anchor="middle", size=13, mono=True, tone="subject", weight="bold"))
        els.append(text(f"vr{c}", x0 - 10, y0 + c * s + s / 2, str(c), {"x": nx0 - 8, "y": ny0 + c * ns + ns / 2}, anchor="end", size=13, mono=True, tone="subject", weight="bold"))
    els.append(text("vcv", x0 + s, y0 - 32, "B", {"x": nx0 + ns, "y": ny0 - 29}, anchor="middle", size=13, weight="bold", tone="muted"))
    els.append(text("vrv", x0 - 10, y0 - 12, "A", {"x": nx0 - 8, "y": ny0 - 11}, anchor="end", size=13, weight="bold", tone="muted"))
    km = KMap("k", 3, V3, 330, 110, 60, 92, 300, 56, idx=True)
    base = km.elements()
    base[0]["values"] = [["" for _ in range(4)] for _ in range(2)]
    base[0]["hidden"] = True
    for e in base[1:]:
        e["hidden"] = True
    els += base
    els += km.loops("L0", ml.parse_term("A'C", V3), 0, tone="accent")
    els += km.loops("L1", ml.parse_term("BC'", V3), 1, tone="success")
    els += [note("n0", 330, 270, 20, 470, size=14, nsize=12), note("n1", 330, 296, 20, 494, size=14, nsize=12),
            note("ex", 330, 330, 20, 524, size=16, nsize=14, weight="bold", tone="success")]
    full = km.values(ones=ones, dcs=[])
    steps = [
        step("A variable-entered map for f(A, B, C) uses only A and B as map variables. Each cell holds what f is as a function of the entered variable C for that A, B: 0, 1, C or C′.",
             ("n0", {"text": "cell = f(A, B, C) as a function of C"})),
        step("Unfold it: each VEM cell becomes two cells of the full map, C = 0 and C = 1. Cell A = 0, B = 0 holds C, so f(0, 0, 0) = 0 and f(0, 0, 1) = 1; cell A = 0, B = 1 holds 1, so both are 1; cell A = 1, B = 0 holds 0; cell A = 1, B = 1 holds C′, so only C = 0 gives 1.",
             ("kg", {"hidden": False, "values": full}), *[(e["id"], {"hidden": False}) for e in base[1:]],
             ("n0", {"text": "1s: m1, m2, m3, m6"})),
        step("Group the full map: m1, m3 (A = 0, C = 1) give A′C; m2, m6 (B = 1, C = 0) give BC′.",
             *show(km.loop_ids("L0", ml.parse_term("A'C", V3))), *show(km.loop_ids("L1", ml.parse_term("BC'", V3))),
             ("ex", {"text": "f = A′C + BC′"})),
        step("Read directly from the VEM: the 1 at A = 0, B = 1 is a don't-care for the C-group and for the C′-group. C at (0, 0) with that 1 gives A′·C; C′ at (1, 1) with that 1 gives B·C′. Same answer, without unfolding.",
             ("n1", {"text": "C-loop: A′ → A′C;  C′-loop: B → BC′", "tone": "accent"})),
    ]
    return spec("Unfolding a variable-entered map into a K-map", (W_, 350), (NW, 545),
                "A 2 × 2 variable-entered map for f(A, B, C): rows A, columns B, entered variable C. Entries: C, 1 (top row); 0, C′ (bottom row).",
                els, steps)


def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
