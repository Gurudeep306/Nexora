"""Chapter 7, Lesson 1 scene (semiconductor memory organisation). Every number comes from beyondlib:
the chip plan of 64K x 16 from 16K x 8, the address map, and the row each address selects in a
bit-true MemorySystem simulation."""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import beyondlib as bz  # noqa: E402
from _viz_ch7_base import S, scene  # noqa: E402

W_, B_, w_, b_ = 64 * bz.K, 16, 16 * bz.K, 8


@scene
def chip_array_expansion(L):
    """64K x 16 from 16K x 8 chips: one chip, width (side by side), capacity (rows), the 2:4 decoder,
    then two addresses routed to their rows."""
    s = S(L)
    W, NW = 680, 360
    plan = bz.chip_plan(W_, B_, w_, b_)
    assert (plan["rows"], plan["cols"], plan["chips"], plan["low_bits"], plan["high_bits"], plan["decoder"]) == (4, 2, 8, 14, 2, (2, 4))
    amap = bz.address_map(W_, w_)
    mem = bz.MemorySystem(W_, B_, w_, b_)
    probes = [0x9A3C, 0x2F00]
    routes = {}
    for a in probes:
        mem.write(a, a & 0xFFFF)
        val, rows = mem.read(a)
        assert val == a & 0xFFFF and len(rows) == 1
        q, off = bz.which_chip(a, w_)
        assert rows == [q]
        routes[a] = (q, off)
    assert routes == {0x9A3C: (2, 0x1A3C), 0x2F00: (0, 0x2F00)}

    s.head("64K × 16 from 16K × 8 chips: width, then capacity", "64K × 16 from 16K × 8 chips", W, NW)
    # geometry
    if s.wd:
        cx0, cw, gap, ch, y0, pitch = 250, 120, 20, 40, 84, 62
        dx, dw = 110, 90
    else:
        cx0, cw, gap, ch, y0, pitch = 112, 100, 14, 36, 84, 70
        dx, dw = 40, 56
    xs = [cx0, cx0 + cw + gap]
    centres = [y0 + ch / 2 + r * pitch for r in range(4)]
    # column headers: the left chip of a row holds the high byte D15–D8, the right chip the low byte D7–D0
    s.text("hd1", xs[0] + cw / 2, y0 - 16, "D15–D8", s.v(13, 12), anchor="middle", mono=True, tone="muted", hidden=True)
    s.text("hd0", xs[1] + cw / 2, y0 - 16, "D7–D0", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    chips = {}
    for r in range(4):
        for c in range(2):
            cid = f"c{r}{c}"
            s.box(cid, xs[c], centres[r] - ch / 2, cw, ch, label="16K × 8", size=s.v(14, 12), mono=True,
                  hidden=not (r == 0 and c == 1))
            chips[(r, c)] = cid
    # row ranges
    rng = []
    for r, (_, lo, hi) in enumerate(amap):
        t = f"{bz.hx(lo)}–{bz.hx(hi)}"
        if s.wd:
            s.text(f"rg{r}", xs[1] + cw + 14, centres[r], t, 13, anchor="start", mono=True, tone="muted", hidden=True)
        else:
            s.text(f"rg{r}", (xs[0] + xs[1] + cw) / 2, centres[r] + ch / 2 + 11, t, 12, anchor="middle", mono=True, tone="muted", hidden=True)
        rng.append(f"rg{r}")
    # links between the two chips of a row (shared chip select)
    for r in range(4):
        s.line(f"lk{r}", [[xs[0] + cw, centres[r]], [xs[1], centres[r]]], tone="muted", hidden=True)
    # decoder
    dy, dh = centres[0] - pitch / 2, 4 * pitch
    P = s.block("dec", dx, dy, dw, dh, left=["A15", "A14"], right=["0", "1", "2", "3"], title="2:4", hidden=True)
    for e in s.els:
        if e["id"].startswith("dec-"):
            e["hidden"] = True
    for r in range(4):
        s.line(f"cs{r}", [[dx + dw, centres[r]], [xs[0], centres[r]]], tone="muted", hidden=True)
    xin = dx - s.v(36, 18)
    for k, nm in enumerate(("A15", "A14")):
        y = P[nm][1]
        s.line(f"in{k}", [[xin, y], [dx, y]], hidden=True)
        s.text(f"iv{k}", xin - 5, y, "", s.v(14, 12), anchor="end", mono=True, weight="bold")
    yb = centres[3] + ch / 2 + s.v(28, 34)
    s.text("low", s.v(W / 2, NW / 2), yb, "", s.v(14, 12), anchor="middle")
    s.text("st", s.v(W / 2, NW / 2), yb + s.v(24, 22), "", s.v(15, 13), anchor="middle", weight="bold")

    show = lambda *ids: [(i, {"hidden": False}) for i in ids]  # noqa: E731
    dec_ids = ["dec", "dec-l0", "dec-l1", "dec-r0", "dec-r1", "dec-r2", "dec-r3", "dec-n"]
    s.step(f"One 16K × 8 chip: {bz.addr_lines(w_)} address lines (16K = 2^14 words) and {b_} data lines. "
           "We need 64K words of 16 bits.",
           ("low", {"text": f"chip: A13–A0 in, {b_} bits out"}))
    s.step(f"Width first: a second chip side by side, same address lines, gives 16-bit words. {plan['cols']} chips per row, no decoder.",
           *show(chips[(0, 0)], "hd1", "lk0"), ("low", {"text": "both chips see the same A13–A0"}))
    s.step(f"Capacity: 64K / 16K = {plan['rows']} rows of 2 chips, {plan['chips']} chips in all. Each row owns a block of 16K consecutive addresses.",
           *show(*[chips[(r, c)] for r in range(1, 4) for c in range(2)], "lk1", "lk2", "lk3", *rng))
    s.step(f"64K words need {plan['addr_bits']} address lines. The low {plan['low_bits']} go to every chip; the top {plan['high_bits']}, "
           "A15 A14, drive a 2:4 decoder, one output per row.",
           *show(*dec_ids, "cs0", "cs1", "cs2", "cs3", "in0", "in1"),
           ("low", {"text": "A13–A0 → all 8 chips (offset inside a chip)"}))
    for a in probes:
        q, off = routes[a]
        bits = format(a, "016b")
        a15, a14 = bits[0], bits[1]
        pats = [("iv0", {"text": a15, "tone": "success" if a15 == "1" else "muted"}),
                ("iv1", {"text": a14, "tone": "success" if a14 == "1" else "muted"})]
        for r in range(4):
            on = r == q
            pats += [(f"cs{r}", {"tone": "accent" if on else "muted"}), (f"lk{r}", {"tone": "accent" if on else "muted"}),
                     (f"rg{r}", {"tone": "accent" if on else "muted"}), (f"dec-r{r}", {"tone": "accent" if on else "ink"})]
            for c in range(2):
                pats.append((chips[(r, c)], {"tone": "accent" if on else "ink", "fill": "accent" if on else "none"}))
        pats.append(("st", {"text": f"{bz.hx(a)} → row {q}, offset {bz.hx(off)}", "tone": "accent"}))
        s.step(f"Address {bz.hx(a)}: A15 A14 = {a15}{a14}, so decoder output {q} enables row {q} "
               f"({bz.hx(amap[q][1])}–{bz.hx(amap[q][2])}); both its chips read word {bz.hx(off)}.", *pats)
    s.step(f"Result: {plan['chips']} chips, a 2:4 decoder on A15 A14, A13–A0 shared. Chips = (64K/16K)·(16/8) = {plan['chips']}.",
           ("st", {"text": f"{plan['chips']} chips · 2:4 decoder · 14 shared lines", "tone": "success"}),
           *[(chips[(r, c)], {"tone": "ink", "fill": "none"}) for r in range(4) for c in range(2)],
           *[(f"{p}{r}", {"tone": "muted"}) for r in range(4) for p in ("cs", "lk", "rg")],
           *[(f"dec-r{r}", {"tone": "ink"}) for r in range(4)], ("iv0", {"text": ""}), ("iv1", {"text": ""}))
    H = int(yb + s.v(24, 22) + 20)
    return s.done("Building a 64K × 16 memory from 16K × 8 chips", (W, H), (NW, H),
                  "Eight 16K × 8 chips in four rows of two. The two chips of a row give the high and low byte; a 2:4 decoder on "
                  "the top address bits A15 A14 enables one row, and A13–A0 go to every chip.")
