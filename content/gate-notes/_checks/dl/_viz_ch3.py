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


def build_all():
    return {name: fn() for name, fn in SPECS.items()}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
