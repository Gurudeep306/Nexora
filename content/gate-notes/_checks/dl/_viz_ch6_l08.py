"""Chapter 6, Lesson 8 scenes (state minimisation). Every partition, refinement label, implied pair,
crossing pass and merged class is a seqlib.FSM computation (partitions, implication, reachable,
minimal_states, equivalent), so no block, pass number or caption number can drift from the checked
maths."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402
from _viz_ch6_base import S, scene  # noqa: E402

F = sq.FSM.from_table
M2025 = F({"A": ("F", "B", 0, 0), "B": ("D", "C", 0, 0), "C": ("F", "E", 0, 0), "D": ("G", "A", 1, 0), "E": ("D", "C", 0, 0),
           "F": ("F", "B", 1, 1), "G": ("G", "H", 0, 1), "H": ("G", "A", 1, 0)})
M1996 = F({"A": ("D", "B", 0, 1), "B": ("A", "C", 0, 1), "C": ("A", "B", 0, 1), "D": ("A", "C", 1, 1)})


def bstr(block):
    return "{" + ",".join(block) + "}"


def pstr(part):
    return " ".join(bstr(b) for b in part)


def cap(t):
    assert len(t) <= 140, (len(t), t)
    return t


# ── partition-refinement: GATE 2025 ──────────────────────────────────────

@scene
def partition_refinement(L):
    """The 2025 table: P0 by output rows, each state's label in round 1, the split, round 2 confirms."""
    s = S(L)
    W, NW = 680, 360
    m = M2025
    st = m.states
    assert len(m.reachable()) == 8
    parts = m.partitions()
    assert [len(p) for p in parts] == [4, 5] and m.minimal_states() == 5
    P0, P1 = parts
    num0 = {x: i + 1 for i, b in enumerate(P0) for x in b}
    num1 = {x: i + 1 for i, b in enumerate(P1) for x in b}
    s.head("Partition refinement on the GATE 2025 table", "Refining the GATE 2025 table", W, NW)
    cw, ch = s.v(68, 56), s.v(26, 23)
    tx, ty = s.v(16, 12), s.v(52, 46)
    hdr = ["PS", "next", "f", "P0", "label", "P1"]
    rows = [hdr] + [[x, f"{m.delta[(x, 0)]} {m.delta[(x, 1)]}", f"{m.out[(x, 0)]}{m.out[(x, 1)]}", "", "", ""] for x in st]
    s.table("tt", tx, ty, cw, ch, rows)
    px = s.v(tx + 6 * cw + 26, NW / 2)
    py = s.v(ty + 22, ty + 9 * ch + 26)
    dy = s.v(32, 26)
    anc = s.v("start", "middle")
    sz = s.v(14, 12)
    lines = ["p0h", "p0", "p1h", "p1", "p2h", "res"]
    for k, i in enumerate(lines):
        s.text(i, px, py + k * dy, "", sz, anchor=anc, mono=(i in ("p0", "p1")), weight="bold" if i.endswith("h") or i == "res" else None)
    cur = [list(r) for r in rows]

    def tbl(hl):
        return ("tt", {"rows": [list(r) for r in cur], "highlight": hl})

    s.step(cap("The 2025 Mealy table: next states for X = 0 and 1 and the output row f. All 8 states are reachable from A."))
    for k, x in enumerate(st):
        cur[k + 1][3] = str(num0[x])
    groups = {}
    for x in st:
        groups.setdefault(f"{m.out[(x, 0)]}{m.out[(x, 1)]}", []).append(x)
    assert list(groups) == ["00", "10", "11", "01"] and [groups[g] for g in groups] == P0
    s.step(cap("P0 groups the states by their whole output row: 00 → block 1, 10 → block 2, 11 → block 3, 01 → block 4."),
           tbl([[k + 1, c] for k in range(8) for c in (2, 3)]), ("p0h", {"text": f"P0: {len(P0)} blocks"}), ("p0", {"text": pstr(P0)}))
    # round 1: labels for every state, shown block by block
    lab = {x: tuple(num0[m.delta[(x, a)]] for a in (0, 1)) for x in st}
    for blk in P0:
        if len(blk) == 1:
            continue
        if len(blk) == 4:
            for x in blk:
                cur[st.index(x) + 1][4] = f"({lab[x][0]},{lab[x][1]})"
                n0, n1 = m.delta[(x, 0)], m.delta[(x, 1)]
                c = cap(f"Round 1, {x} → {n0}, {n1}: {n0} is in block {num0[n0]}, {n1} in block {num0[n1]}, so {x}'s label is "
                        f"({lab[x][0]},{lab[x][1]}).")
                s.step(c, tbl([[st.index(x) + 1, c2] for c2 in (1, 4)]))
        else:
            for x in blk:
                cur[st.index(x) + 1][4] = f"({lab[x][0]},{lab[x][1]})"
            labs = {lab[x] for x in blk}
            assert len(labs) == 1
            s.step(cap(f"Block {num0[blk[0]]} = {bstr(blk)}: both go to ({', '.join(m.delta[(blk[0], a)] for a in (0, 1))}), "
                       f"label {next(iter(labs))}. Blocks 3 and 4 are single states and cannot split."),
                   tbl([[st.index(x) + 1, c2] for x in blk for c2 in (1, 4)]))
    for k, x in enumerate(st):
        cur[k + 1][5] = str(num1[x])
    big = P0[0]
    split = {}
    for x in big:
        split.setdefault(lab[x], []).append(x)
    assert sorted(split.values()) == [["A", "C"], ["B", "E"]]
    s.step(cap(f"Block 1 splits by label: {' and '.join(f'{v} gives {bstr(split[v])}' for v in split)}. P1 has {len(P1)} blocks."),
           tbl([[st.index(x) + 1, c2] for x in big for c2 in (4, 5)]), ("p1h", {"text": f"P1: {len(P1)} blocks", "tone": "accent"}),
           ("p1", {"text": pstr(P1), "tone": "accent"}))
    # round 2: labels with P1's numbers; nothing splits
    lab2 = {x: tuple(num1[m.delta[(x, a)]] for a in (0, 1)) for x in st}
    for x in st:
        cur[st.index(x) + 1][4] = f"({lab2[x][0]},{lab2[x][1]})"
    for b in P1:
        assert len({lab2[x] for x in b}) == 1
    s.step(cap("Round 2 relabels with P1's blocks: A and C get the same label, so do B and E, and D and H. Nothing splits."),
           tbl([[k + 1, 4] for k in range(8)]), ("p1h", {"tone": "ink"}), ("p1", {"tone": "ink"}),
           ("p2h", {"text": "P2 = P1: stop", "tone": "accent"}))
    assert sq.ff_count(8) == sq.ff_count(len(P1)) == 3
    s.step(cap(f"{len(P1)} classes, so {len(P1)} states (GATE 2025): {pstr(P1)}. Still 3 flip-flops, as for 8 states."),
           tbl([[k + 1, 5] for k in range(8)]), ("res", {"text": f"minimal: {len(P1)} states", "tone": "success"}))
    h = s.v(ty + 9 * ch + 24, py + 5 * dy + 22)
    return s.done("Partition refinement of the GATE 2025 table", (W, h), (NW, h),
                  "Eight states with input X and output f. P0 groups the states by their output rows; each round labels every "
                  "state by the blocks its next states fall in and splits blocks whose members disagree.")


# ── implication-table: GATE 1996 ─────────────────────────────────────────

@scene
def implication_table(L):
    """The 1996 table as a staircase of pairs: output mismatches crossed, then implied pairs, leaving B ≡ C."""
    s = S(L)
    W, NW = 680, 360
    m = M1996
    st = m.states
    mark = m.implication()
    assert {"".join(sorted(p)): v for p, v in mark.items()} == {"AD": 0, "BD": 0, "CD": 0, "AB": 1, "AC": 1}
    assert m.minimal_states() == 3
    s.head("The implication table of the GATE 1996 machine", "Implication table, GATE 1996", W, NW)
    cw, ch = s.v(64, 56), s.v(26, 23)
    tx, ty = s.v(20, (NW - 3 * 56) / 2), s.v(64, 50)
    rows = [["PS", "x = 0", "x = 1"]] + [[x, f"{m.delta[(x, 0)]}, {m.out[(x, 0)]}", f"{m.delta[(x, 1)]}, {m.out[(x, 1)]}"] for x in st]
    s.table("tt", tx, ty, cw, ch, rows)
    # staircase: rows B, C, D; columns A, B, C
    bw, bh, gap = s.v(98, 86), s.v(52, 44), 6
    gx = s.v(300, (NW - 3 * 86 - 2 * 6) / 2 + 12)
    gy = s.v(70, ty + 5 * ch + 34)
    lsz = s.v(14, 12)
    cell = {}
    for r, a in enumerate(st[1:]):
        s.text(f"rl{a}", gx - 12, gy + r * (bh + gap) + bh / 2, a, lsz, anchor="end", mono=True, weight="bold")
        for c, b in enumerate(st[:r + 1]):
            cid = f"c{b}{a}"
            s.box(cid, gx + c * (bw + gap), gy + r * (bh + gap), bw, bh, label="", size=s.v(14, 12), mono=True)
            cell[frozenset((a, b))] = cid
    for c, b in enumerate(st[:-1]):
        s.text(f"cl{b}", gx + c * (bw + gap) + bw / 2, gy + 3 * (bh + gap) + 8, b, lsz, anchor="middle", mono=True, weight="bold")
    ry = gy + 3 * (bh + gap) + s.v(40, 34)
    s.text("res", s.v(gx, NW / 2), ry, "", lsz, anchor=s.v("start", "middle"), weight="bold")

    def imp(a, b):
        out = []
        for x in (0, 1):
            q = sorted({m.delta[(a, x)], m.delta[(b, x)]})
            if len(q) == 2:
                out.append("".join(q))
        return out

    pairs = [frozenset(p) for p in [("A", "B"), ("A", "C"), ("A", "D"), ("B", "C"), ("B", "D"), ("C", "D")]]
    assert len(cell) == 6 == len(pairs)
    s.step(cap("One cell per pair of states: 4 states give 6 cells. A pair stays uncrossed until something proves it different."))
    p0 = [p for p in pairs if mark.get(p) == 0]
    assert sorted("".join(sorted(p)) for p in p0) == ["AD", "BD", "CD"]
    s.step(cap("Pass 0: D's output row is 11, the others' is 01, so the three cells of row D are crossed at once."),
           *[(cell[p], {"label": "✗ out", "tone": "danger"}) for p in p0], ("tt", {"highlight": [[4, 1], [4, 2]]}))
    left = [p for p in pairs if p not in p0]
    texts = {p: " ".join(imp(*sorted(p))) for p in left}
    assert texts == {frozenset("AB"): "AD BC", frozenset("AC"): "AD", frozenset("BC"): "BC"}
    s.step(cap("Fill the other cells with implied pairs: A–B needs AD and BC, A–C needs AD, B–C needs only BC, itself."),
           *[(cell[p], {"label": texts[p], "tone": "accent"}) for p in left], ("tt", {"highlight": []}))
    p1 = [p for p in pairs if mark.get(p) == 1]
    for p in p1:
        a, b = sorted(p)
        s.step(cap(f"Pass 1: {a}–{b} lists AD, which is crossed, so {a}–{b} is crossed: if {a} ≡ {b} then A ≡ D, which is false."),
               (cell[p], {"label": "✗ " + texts[p], "tone": "danger"}),
               ("tt", {"highlight": [[st.index(a) + 1, 1], [st.index(b) + 1, 1]]}))
    bc = frozenset("BC")
    assert bc not in mark
    s.step(cap("B–C lists only itself, which is not crossed. Pass 2 crosses nothing more, so the table is finished."),
           (cell[bc], {"tone": "success"}), ("tt", {"highlight": [[2, 1], [2, 2], [3, 1], [3, 2]]}))
    s.step(cap("Survivor B–C: B ≡ C. Classes {A} {B,C} {D}: 3 states (GATE 1996), as partition refinement found."),
           ("res", {"text": "B ≡ C: 3 states", "tone": "success"}), ("tt", {"highlight": []}))
    h = ry + s.v(26, 22)
    return s.done("The implication table of the GATE 1996 machine", (W, h), (NW, h),
                  "A four-state Mealy machine. Each cell of the staircase is a pair of states; cells with different output rows "
                  "are crossed first, then every cell that implies a crossed cell, until a pass crosses nothing.")
