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
        cx0, cw, gap, ch, y0, pitch = 250, 120, 40, 40, 84, 62
        dx, dw = 110, 90
    else:
        cx0, cw, gap, ch, y0, pitch = 112, 100, 24, 36, 84, 70
        dx, dw = 40, 56
    xs = [cx0, cx0 + cw + gap]
    centres = [y0 + ch / 2 + r * pitch for r in range(4)]
    tops = [c - ch / 2 for c in centres]
    bx = cx0 + cw + gap / 2                       # the shared address bus runs down the gap between the columns
    # column headers: chip 0 of a row (left) holds the low byte D7–D0, chip 1 (right) the high byte D15–D8
    s.text("hd0", xs[0] + cw / 2, y0 - 20, "D7–D0", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    s.text("hd1", xs[1] + cw / 2, y0 - 20, "D15–D8", s.v(13, 12), anchor="middle", mono=True, tone="muted", hidden=True)
    chips = {}
    for r in range(4):
        for c in range(2):
            cid = f"c{r}{c}"
            s.box(cid, xs[c], tops[r], cw, ch, label="16K × 8", size=s.v(14, 12), mono=True,
                  hidden=not (r == 0 and c == 0))
            chips[(r, c)] = cid
    # row ranges
    rng = []
    for r, (_, lo, hi) in enumerate(amap):
        t = f"{bz.hx(lo)}–{bz.hx(hi)}"
        if s.wd:
            s.text(f"rg{r}", xs[1] + cw + 14, centres[r], t, 13, anchor="start", mono=True, tone="muted", hidden=True)
        else:
            s.text(f"rg{r}", xs[0], centres[r] + ch / 2 + 11, t, 12, anchor="start", mono=True, tone="muted", hidden=True)
        rng.append(f"rg{r}")
    # decoder
    dy, dh = centres[0] - pitch / 2, 4 * pitch
    P = s.block("dec", dx, dy, dw, dh, left=["A15", "A14"], right=["0", "1", "2", "3"], title="2:4", hidden=True)
    for e in s.els:
        if e["id"].startswith("dec-"):
            e["hidden"] = True
    xin = dx - s.v(36, 18)
    # address bus A13–A0: in from the left under the decoder, up the gap, a tap into every chip
    by = dy + dh + 10
    s.line("bus", [[xin, by], [bx, by], [bx, tops[0] + 6]], tone="muted", hidden=True)
    s.text("busl", xin, by + 13, "A13–A0", s.v(13, 12), anchor="start", mono=True, tone="muted", hidden=True)
    s.line("stub", [[bx, tops[0] + 6], [bx, tops[0] + ch + 14]], tone="muted")          # rows 1–3 not built yet
    s.text("stubl", bx, tops[0] + ch + 27, "A13–A0", s.v(13, 12), anchor="middle", mono=True, tone="muted")
    for r in range(4):
        s.line(f"la{r}", [[bx, centres[r]], [xs[0] + cw, centres[r]]], tone="muted", hidden=r > 0)
        s.line(f"lb{r}", [[bx, centres[r]], [xs[1], centres[r]]], tone="muted", hidden=True)
        s.node(f"jd{r}", bx, centres[r], 2.5, fill="muted", tone="muted", hidden=True)
    # chip select: one decoder output per row, branching (a T over the row) to both chips of the row
    xt = xs[0] - s.v(10, 8)
    for r in range(4):
        yt = tops[r] - 7
        s.line(f"cs{r}", [[dx + dw, centres[r]], [xt, centres[r]], [xt, yt], [xs[1] + cw / 2, yt], [xs[1] + cw / 2, tops[r]]],
               tone="muted", hidden=True)
        s.line(f"ct{r}", [[xs[0] + cw / 2, yt], [xs[0] + cw / 2, tops[r]]], tone="muted", hidden=True)
    for k, nm in enumerate(("A15", "A14")):
        y = P[nm][1]
        s.line(f"in{k}", [[xin, y], [dx, y]], hidden=True)
        s.text(f"iv{k}", xin - 5, y, "", s.v(14, 12), anchor="end", mono=True, weight="bold")
    yb = by + s.v(40, 40)
    s.text("low", s.v(W / 2, NW / 2), yb, "", s.v(14, 12), anchor="middle")
    s.text("st", s.v(W / 2, NW / 2), yb + s.v(24, 22), "", s.v(15, 13), anchor="middle", weight="bold")

    show = lambda *ids: [(i, {"hidden": False}) for i in ids]  # noqa: E731
    dec_ids = ["dec", "dec-l0", "dec-l1", "dec-r0", "dec-r1", "dec-r2", "dec-r3", "dec-n"]
    s.step(f"One 16K × 8 chip: {bz.addr_lines(w_)} address lines (16K = 2^14 words) and {b_} data lines. "
           "We need 64K words of 16 bits.",
           ("low", {"text": f"chip: A13–A0 in, {b_} bits out"}))
    s.step("Width first: a second chip side by side on the same address bus gives 16-bit words; chip 0 the low byte, chip 1 the high.",
           *show(chips[(0, 1)], "hd1", "lb0", "jd0"), ("low", {"text": "both chips see the same A13–A0"}))
    s.step(f"Capacity: 64K / 16K = {plan['rows']} rows of 2 chips, {plan['chips']} chips in all. Each row owns a block of 16K consecutive addresses.",
           *show(*[chips[(r, c)] for r in range(1, 4) for c in range(2)], *[f"{p}{r}" for r in range(1, 4) for p in ("la", "lb", "jd")], *rng,
                "bus", "busl"), ("stub", {"hidden": True}), ("stubl", {"hidden": True}),
           ("low", {"text": "A13–A0 → all 8 chips (offset inside a chip)"}))
    s.step(f"{plan['addr_bits']} address lines: the low {plan['low_bits']} go to every chip; A15 A14 drive a 2:4 decoder, "
           "output r selecting both chips of row r.",
           *show(*dec_ids, *[f"{p}{r}" for r in range(4) for p in ("cs", "ct")], "in0", "in1"))
    for a in probes:
        q, off = routes[a]
        bits = format(a, "016b")
        a15, a14 = bits[0], bits[1]
        pats = [("iv0", {"text": a15, "tone": "success" if a15 == "1" else "muted"}),
                ("iv1", {"text": a14, "tone": "success" if a14 == "1" else "muted"})]
        for r in range(4):
            on = r == q
            pats += [(f"cs{r}", {"tone": "accent" if on else "muted"}), (f"ct{r}", {"tone": "accent" if on else "muted"}),
                     (f"rg{r}", {"tone": "accent" if on else "muted"}), (f"dec-r{r}", {"tone": "accent" if on else "ink"})]
            for c in range(2):
                pats.append((chips[(r, c)], {"tone": "accent" if on else "ink", "fill": "accent" if on else "none"}))
        pats.append(("st", {"text": f"{bz.hx(a)} → row {q}, offset {bz.hx(off)}", "tone": "accent"}))
        s.step(f"Address {bz.hx(a)}: A15 A14 = {a15}{a14}, so decoder output {q} enables row {q} "
               f"({bz.hx(amap[q][1])}–{bz.hx(amap[q][2])}); both its chips read word {bz.hx(off)}.", *pats)
    s.step(f"Result: {plan['chips']} chips, a 2:4 decoder on A15 A14, A13–A0 shared. Chips = (64K/16K)·(16/8) = {plan['chips']}.",
           ("st", {"text": f"{plan['chips']} chips · 2:4 decoder · 14 shared lines", "tone": "success"}),
           *[(chips[(r, c)], {"tone": "ink", "fill": "none"}) for r in range(4) for c in range(2)],
           *[(f"{p}{r}", {"tone": "muted"}) for r in range(4) for p in ("cs", "ct", "rg")],
           *[(f"dec-r{r}", {"tone": "ink"}) for r in range(4)], ("iv0", {"text": ""}), ("iv1", {"text": ""}))
    H = int(yb + s.v(24, 22) + 20)
    return s.done("Building a 64K × 16 memory from 16K × 8 chips", (W, H), (NW, H),
                  "Eight 16K × 8 chips in four rows of two: the left chip of a row gives the low byte, the right one the high byte. "
                  "A 2:4 decoder on A15 A14 selects both chips of one row; the bus A13–A0 goes to every chip.")
