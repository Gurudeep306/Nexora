"""Generator for the Viz scenes of Digital Logic Chapter 4 (Combinational circuits).

Every value a scene shows or captions (selected input, residue, lit output, codes, counts, sizes,
test vectors) is computed here with comblib / boollib / minlib and, where cheap, asserted against an
independent expectation, so the scenes cannot drift from the checked maths.

Each scene is written once as a function of the layout ("wide" or "narrow"): the function draws the
whole scene for that canvas, and `merge` turns the two drawings into one spec. Elements whose
content is equal in both layouts become one element with a `narrow` geometry override; elements
whose content or geometry patches differ become a wide-only element and a narrow-only twin
(`<id>-n`). Captions and the intro must be identical in both layouts (they are the text
alternative). `check_layout` then replays every frame of both layouts (as frames.ts does) and
asserts that every visible element lies inside its canvas, that text is large enough (≥ 13 wide,
≥ 12 narrow), that no two labels overlap, that no label is crossed by a wire or covered by a gate,
table or K-map, and that wires do not run through blocks or gates.

Logic levels: success = 1, muted = 0, accent = the selected or active path. MUX, decoder, encoder,
ROM and PLA blocks are `box` elements with `text` pin labels; gates are `gate` elements whose wires
end on the pins from boollib.gate_pins (the mirror of geometry.ts).

    python3 content/gate-notes/_checks/dl/_viz_ch4.py      # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch4.py       # (check) files == generator output
"""
import copy
import re
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import boollib as bl  # noqa: E402
import minlib as ml  # noqa: E402
import comblib as cl  # noqa: E402
from _viz_ch1_fp import VIZ_DIR  # noqa: E402
from _viz_ch3 import KMap, pretty  # noqa: E402

SPECS = {}
# The layout keys of schema.ts, in its order (a list, so the narrow overrides come out in a stable order).
GEOM = ["x", "y", "w", "h", "cx", "cy", "r", "r0", "start", "end", "cell", "cellW", "cellH", "size", "points", "from", "to", "curve", "anchor"]
# Boxes whose id starts with one of these may overlap other boxes and carry wires (K-map loops,
# PLA plane frames, highlight frames around a label).
FREE = ("lp", "pl", "hl")
MIN_TEXT = {"wide": 13, "narrow": 12}


def scene(fn):
    name = fn.__name__.replace("_", "-")

    def build():
        s = merge(fn("wide"), fn("narrow"))
        check_layout(name, s)
        return s

    SPECS[name] = build
    return fn


def tv(v):
    return "success" if v else "muted"


def fillv(v):
    return "success" if v else "none"


def sup(bits):
    return "".join(map(str, bits))


# ── Drawing one layout ──────────────────────────────────────────────────────

class S:
    """One layout's drawing: elements and steps."""

    def __init__(self, L):
        self.L, self.wd = L, L == "wide"
        self.els, self.steps = [], []

    def v(self, a, b):
        return a if self.wd else b

    def add(self, **e):
        e = {k: val for k, val in e.items() if val is not None}
        self.els.append(e)
        return e

    def text(self, id, x, y, t, size=None, **kw):
        return self.add(id=id, type="text", x=x, y=y, text=t, size=size or self.v(14, 13), **kw)

    def box(self, id, x, y, w, h, label=None, size=None, **kw):
        if label is not None:
            kw["label"] = label
            kw["size"] = size or self.v(14, 13)
        return self.add(id=id, type="box", x=x, y=y, w=w, h=h, **kw)

    def node(self, id, cx, cy, r, label=None, size=None, **kw):
        if label is not None:
            kw["label"] = label
            kw["size"] = size or self.v(13, 12)
        return self.add(id=id, type="circle", cx=cx, cy=cy, r=r, **kw)

    def gate(self, id, x, y, w, h, kind, inputs=None, **kw):
        self.add(id=id, type="gate", x=x, y=y, w=w, h=h, kind=kind, inputs=inputs, **kw)
        return bl.gate_pins(kind, x, y, w, h, inputs)

    def line(self, id, pts, **kw):
        return self.add(id=id, type="line", points=[[round(a, 2), round(b, 2)] for a, b in pts], **kw)

    def wire(self, id, a, b, mid=None, **kw):
        return self.line(id, wire_pts(a, b, mid), **kw)

    def table(self, id, x, y, cw, ch, rows, **kw):
        return self.add(id=id, type="table", x=x, y=y, cellW=cw, cellH=ch, rows=rows, header=True, mono=True, **kw)

    def head(self, wide_text, narrow_text, W, NW):
        self.text("head", self.v(W, NW) / 2, 22, self.v(wide_text, narrow_text), self.v(17, 15), anchor="middle", weight="bold")

    def block(self, pid, x, y, w, h, left=(), right=(), bottom=(), top=(), title=None, title_xy=None, size=None, **kw):
        """A MUX / decoder / encoder block: a box with pin labels inside its edges. Returns the pins."""
        sz = size or self.v(13, 12)
        self.box(pid, x, y, w, h, **kw)
        P = {}
        hs = h - (16 if bottom else 0)  # side pins stay clear of the select labels along the bottom
        for k, lab in enumerate(left):
            py = round(y + hs * (k + 0.5) / len(left), 2)
            P[lab] = (x, py)
            self.text(f"{pid}-l{k}", x + 5, py, lab, sz, anchor="start")
        for k, lab in enumerate(right):
            py = round(y + hs * (k + 0.5) / len(right), 2)
            P[lab] = (x + w, py)
            self.text(f"{pid}-r{k}", x + w - 5, py, lab, sz, anchor="end")
        for k, lab in enumerate(bottom):
            px = round(x + w * (k + 0.5) / len(bottom), 2)
            P[lab] = (px, y + h)
            self.text(f"{pid}-b{k}", px, y + h - 10, lab, sz, anchor="middle")
        for k, lab in enumerate(top):
            px = round(x + w * (k + 0.5) / len(top), 2)
            P[lab] = (px, y)
            self.text(f"{pid}-t{k}", px, y + 10, lab, sz, anchor="middle")
        if title:
            tx, ty = title_xy or (x + w / 2, y + h / 2)
            self.text(f"{pid}-n", tx, ty, title, self.v(14, 13), anchor="middle", weight="bold")
        return P

    def step(self, caption, *patches):
        merged = {}
        for pid, st in patches:
            merged.setdefault(pid, {}).update(st)
        self.steps.append({"caption": caption, "patches": [{"id": i, "set": st} for i, st in merged.items()]})

    def done(self, title, wide, narrow, intro):
        return {"title": title, "size": self.v(wide, narrow), "wide": wide, "narrow": narrow, "intro": intro,
                "els": self.els, "steps": self.steps}


def wire_pts(a, b, mid=None):
    ax, ay = a
    bx, by = b
    if abs(ay - by) < 1e-9:
        return [[ax, ay], [bx, by]]
    mx = mid if mid is not None else round((ax + bx) / 2, 2)
    return [[ax, ay], [mx, ay], [mx, by], [bx, by]]


# ── Merging the two layouts into one spec ───────────────────────────────────

def merge(w, n):
    assert w["title"] == n["title"] and w["intro"] == n["intro"], "title and intro must not depend on the layout"
    assert len(w["steps"]) == len(n["steps"]), "both layouts need the same steps"
    for a, b in zip(w["steps"], n["steps"]):
        assert a["caption"] == b["caption"], f"captions differ between layouts: {a['caption']!r}"
    W = {e["id"]: e for e in w["els"]}
    N = {e["id"]: e for e in n["els"]}
    assert len(W) == len(w["els"]) and len(N) == len(n["els"]), "duplicate element id"

    def pmap(steps):
        d = {}
        for k, st in enumerate(steps):
            for p in st["patches"]:
                d.setdefault(p["id"], {})[k] = p["set"]
        return d

    pw, pn = pmap(w["steps"]), pmap(n["steps"])
    for pid in list(pw) + list(pn):
        assert pid in W or pid in N, f"patch to unknown element {pid}"
    twin = set()
    for i in W.keys() & N.keys():
        a, b = W[i], N[i]
        if {k: v for k, v in a.items() if k not in GEOM} != {k: v for k, v in b.items() if k not in GEOM}:
            twin.add(i)
        elif {k for k in a if k in GEOM} - set(b):
            twin.add(i)
        elif pw.get(i, {}) != pn.get(i, {}):
            twin.add(i)
        elif any(set(GEOM) & set(st) for st in pw.get(i, {}).values()) and any(a.get(k) != b.get(k) for k in GEOM):
            twin.add(i)
    out = []
    for e in w["els"]:
        i = e["id"]
        m = copy.deepcopy(e)
        if i in N and i not in twin:
            ov = {k: N[i][k] for k in GEOM if k in N[i] and N[i][k] != e.get(k)}
            if ov:
                m["narrow"] = ov
            out.append(m)
        else:
            m["only"] = "wide"
            out.append(m)
            if i in twin:
                t = copy.deepcopy(N[i])
                t["id"] = i + "-n"
                t["only"] = "narrow"
                out.append(t)
    # Narrow-only elements go after the element that precedes them in the narrow drawing.
    pos = {e["id"]: k for k, e in enumerate(out)}
    prev = None
    for e in n["els"]:
        i = e["id"]
        if i not in W:
            t = copy.deepcopy(e)
            t["only"] = "narrow"
            at = (pos[prev + "-n"] if prev and prev + "-n" in pos else pos[prev]) + 1 if prev else 0
            out.insert(at, t)
            pos = {x["id"]: k for k, x in enumerate(out)}
        prev = i
    ids = [e["id"] for e in out]
    assert len(ids) == len(set(ids)), "ids must be unique after merging"
    steps = []
    for k, (a, b) in enumerate(zip(w["steps"], n["steps"])):
        ps = [{"id": p["id"], "set": p["set"]} for p in a["patches"]]
        for p in b["patches"]:
            if p["id"] in twin:
                ps.append({"id": p["id"] + "-n", "set": p["set"]})
            elif p["id"] not in W:
                ps.append({"id": p["id"], "set": p["set"]})
        steps.append({"caption": a["caption"], "patches": ps})
    spec = {"version": 1, "title": w["title"], "width": w["size"][0], "height": w["size"][1],
            "narrow": {"width": n["size"][0], "height": n["size"][1]}, "intro": w["intro"],
            "elements": out, "steps": steps}
    return spec


# ── Geometry self-check (replays every frame of both layouts) ───────────────

def frames(spec, layout):
    els = [e for e in spec["elements"] if e.get("only") in (None, layout)]
    state = {e["id"]: dict(e) for e in els}
    order = [e["id"] for e in els]

    def placed():
        res = []
        for i in order:
            e = dict(state[i])
            if layout == "narrow" and "narrow" in e:
                e.update(e["narrow"])
            res.append(e)
        return res

    yield placed()
    for st in spec["steps"]:
        for p in st["patches"]:
            if p["id"] in state:
                state[p["id"]].update(p["set"])
        yield placed()


def text_rect(x, y, t, size, anchor="start", mono=False, bold=False):
    w = len(t) * size * (0.62 if mono else 0.56) * (1.06 if bold else 1)
    h = size * 0.9
    x0 = x if anchor == "start" else x - w / 2 if anchor == "middle" else x - w
    return (x0, y - h / 2, x0 + w, y + h / 2)


def bbox(e):
    t = e["type"]
    if t in ("box", "gate"):
        return (e["x"], e["y"], e["x"] + e["w"], e["y"] + e["h"])
    if t in ("circle", "node"):
        return (e["cx"] - e["r"], e["cy"] - e["r"], e["cx"] + e["r"], e["cy"] + e["r"])
    if t == "text":
        return text_rect(e["x"], e["y"], e["text"], e.get("size", 15), e.get("anchor", "start"), e.get("mono", False), e.get("weight") == "bold")
    if t == "line":
        xs = [p[0] for p in e["points"]]
        ys = [p[1] for p in e["points"]]
        return (min(xs), min(ys), max(xs), max(ys))
    if t == "table":
        cols = max(len(r) for r in e["rows"])
        return (e["x"], e["y"], e["x"] + cols * e["cellW"], e["y"] + len(e["rows"]) * e["cellH"])
    if t == "grid":
        return (e["x"], e["y"], e["x"] + e["cols"] * e["cell"], e["y"] + e["rows"] * e["cell"])
    raise ValueError(f"no bbox for {t}")


def shrink(r, d):
    return (r[0] + d, r[1] + d, r[2] - d, r[3] - d)


def area(a, b):
    w = min(a[2], b[2]) - max(a[0], b[0])
    h = min(a[3], b[3]) - max(a[1], b[1])
    return w * h if w > 0 and h > 0 else 0


def inside(a, b, tol=0.5):
    return a[0] >= b[0] - tol and a[1] >= b[1] - tol and a[2] <= b[2] + tol and a[3] <= b[3] + tol


def seg_hits(p, q, r):
    """True when the segment pq passes through the open rectangle r (Liang–Barsky)."""
    x0, y0 = p
    dx, dy = q[0] - p[0], q[1] - p[1]
    t0, t1 = 0.0, 1.0
    for pp, qq in ((-dx, x0 - r[0]), (dx, r[2] - x0), (-dy, y0 - r[1]), (dy, r[3] - y0)):
        if pp == 0:
            if qq <= 0:
                return False
        else:
            t = qq / pp
            if pp < 0:
                t0 = max(t0, t)
            else:
                t1 = min(t1, t)
    return t0 < t1 - 1e-9


def segs(e):
    pts = e["points"]
    return list(zip(pts, pts[1:]))


def check_layout(name, spec):
    assert len(spec["steps"]) >= 4 and len(spec["steps"]) <= 60, f"{name}: needs 4–60 steps"
    assert spec["intro"].strip() and len(spec["intro"]) <= 400, f"{name}: intro"
    for st in spec["steps"]:
        assert st["caption"].strip() and len(st["caption"]) <= 400, f"{name}: caption too long ({len(st['caption'])}): {st['caption']}"
    assert 640 <= spec["width"] <= 720 and spec["narrow"]["width"] == 360, f"{name}: canvas widths"
    for layout in ("wide", "narrow"):
        W, H = (spec["width"], spec["height"]) if layout == "wide" else (spec["narrow"]["width"], spec["narrow"]["height"])
        lo = MIN_TEXT[layout]
        for fi, els in enumerate(frames(spec, layout)):
            where = f"{name} [{layout} frame {fi}]"
            vis = [e for e in els if not e.get("hidden") and e.get("opacity", 1) > 0]
            for e in vis:
                b = bbox(e)
                assert b[0] >= -0.5 and b[1] >= -0.5 and b[2] <= W + 0.5 and b[3] <= H + 0.5, f"{where}: {e['id']} {tuple(round(v) for v in b)} leaves the {W}×{H} canvas"
                if e["type"] == "text":
                    assert e.get("size", 15) >= lo, f"{where}: text {e['id']} smaller than {lo}"
                if e["type"] in ("box", "circle") and e.get("label"):
                    sz = e.get("size", 15)
                    assert sz >= lo, f"{where}: label of {e['id']} smaller than {lo}"
                    lr = text_rect((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, e["label"], sz, "middle", e.get("mono", False))
                    assert lr[2] - lr[0] <= b[2] - b[0] + 2, f"{where}: label of {e['id']} is wider than its shape"
                if e["type"] == "grid":
                    assert min(16, e["cell"] * 0.45) >= lo, f"{where}: grid {e['id']} font too small"
                if e["type"] == "table":
                    for row in e["rows"]:
                        for c in row:
                            assert len(c) * 14 * 0.62 <= e["cellW"] - 2, f"{where}: table {e['id']} cell {c!r} too wide"
            texts = [(e, shrink(bbox(e), 0.5)) for e in vis if e["type"] == "text" and e["text"]]
            lines = [e for e in vis if e["type"] == "line"]
            gates = [(e, (e["x"] + 0.15 * e["w"], e["y"] + 1, e["x"] + e["w"] - 1, e["y"] + e["h"] - 1)) for e in vis if e["type"] == "gate"]
            solids = [(e, bbox(e)) for e in vis if e["type"] in ("table", "grid", "circle")]
            boxes = [(e, bbox(e)) for e in vis if e["type"] == "box"]
            for k, (a, ra) in enumerate(texts):
                for b, rb in texts[k + 1:]:
                    assert area(ra, rb) <= 1, f"{where}: texts {a['id']} and {b['id']} overlap"
                for g, rg in gates + solids:
                    assert area(ra, rg) == 0, f"{where}: text {a['id']} overlaps {g['id']}"
                for bx, rb in boxes:
                    if area(ra, rb) > 0:
                        assert inside(ra, rb), f"{where}: text {a['id']} sticks out of box {bx['id']}"
                for ln in lines:
                    for p, q in segs(ln):
                        assert not seg_hits(p, q, ra), f"{where}: wire {ln['id']} crosses text {a['id']}"
            hard = [(e, r) for e, r in boxes if not e["id"].startswith(FREE)]
            for ln in lines:
                lb = bbox(ln)
                for bx, rb in hard:
                    if inside(lb, rb):
                        continue
                    for p, q in segs(ln):
                        assert not seg_hits(p, q, shrink(rb, 1)), f"{where}: wire {ln['id']} runs through box {bx['id']}"
                for g, rg in gates:
                    for p, q in segs(ln):
                        assert not seg_hits(p, q, rg), f"{where}: wire {ln['id']} runs through gate {g['id']}"
            shapes = hard + [(g, bbox(g)) for g, _ in gates]
            for k, (a, ra) in enumerate(shapes):
                for b, rb in shapes[k + 1:]:
                    assert area(ra, rb) == 0, f"{where}: {a['id']} and {b['id']} overlap"


# ── Lesson 1: design procedure and code converters ──────────────────────────

V4, V3 = list("ABCD"), list("ABC")


def sop_str(cover, vars_):
    cs = sorted(cover, key=lambda c: (ml.literals(c), c.replace("-", "2")))
    return " + ".join(pretty(c, vars_) for c in cs), cs


def kmap_els(s, pid, x, y, cell, ones, dcs):
    km = KMap(pid, 4, V4, x, y, cell, x, y, cell, ones=ones, dcs=dcs, idx=False)
    for e in km.elements():
        e.pop("narrow", None)
        if e["id"] in (f"{pid}cv", f"{pid}rv") or re.fullmatch(f"{pid}c[0-9]", e["id"]):
            e["y"] -= 6  # clear of loops that wrap through the top edge
        if e["id"] == f"{pid}rv" or re.fullmatch(f"{pid}r[0-9]", e["id"]):
            e["x"] -= 6  # clear of loops that wrap through the left edge
        s.els.append(e)
    return km


def loop_els(s, km, lid, cube, k, tone):
    for e in km.loops(lid, cube, k % 2, tone=tone):
        e.pop("narrow", None)
        s.els.append(e)
    return km.loop_ids(lid, cube)


@scene
def design_pipeline(L):
    s = S(L)
    W, NW = 720, 360
    ones = [d for d in range(10) if d >= 5]
    dcs = list(range(10, 16))
    covers = ml.min_covers(ones, dcs, 4)
    assert len(covers) == 1
    expr, cubes = sop_str(covers[0], V4)
    assert expr == "A + BC + BD"
    care = [m for m in range(16) if m not in dcs]
    fact = bl.tt("A + B(C + D)", V4)
    assert [m for m in care if fact[m]] == ones
    net = [("n1", "OR", ["C", "D"]), ("n2", "AND", ["B", "n1"]), ("F", "OR", ["A", "n2"])]
    assert [m for m in care if cl.evaluate(net, dict(zip(V4, cl.bits_of(m, 4))))["F"]] == ones
    assert cl.min_gates_aon(ones, 4, dcs) == 3

    s.head("Design procedure: “BCD digit ≥ 5” from words to gates", "BCD digit ≥ 5: words to gates", W, NW)
    # Stage 1: truth table as two halves.
    tx, ty = s.v(16, 88), s.v(78, 64)
    s.text("st1", tx + 92, ty - 16, "1. truth table", s.v(13, 12), anchor="middle", tone="muted")
    halves = [list(range(0, 8)), list(range(8, 16))]
    for h, ms in enumerate(halves):
        s.table(f"tt{h}", tx + h * 96, ty, 44, 20, [["ABCD", "F"]] + [[format(m, "04b"), ""] for m in ms])
    filled = []
    for h, ms in enumerate(halves):
        filled.append([["ABCD", "F"]] + [[format(m, "04b"), "1" if m in ones else "X" if m in dcs else "0"] for m in ms])
    # Stage 2: K-map.
    kx, ky, kc = s.v(250, 140), s.v(104, 320), s.v(32, 30)
    s.text("st2", kx + 2 * kc, ky - s.v(58, 58), "2. K-map", s.v(13, 12), anchor="middle", tone="muted")
    km = kmap_els(s, "km", kx, ky, kc, ones, dcs)
    for e in s.els:
        if e["id"] == "kmg":
            e["values"] = km.values(ones=[], dcs=[])
    tones = ["accent", "success", "info"]
    loop_ids = [loop_els(s, km, f"lp{k}", c, k, tones[k]) for k, c in enumerate(cubes)]
    ex, ey = kx + 2 * kc, ky + 4 * kc + 22
    s.text("ex1", ex, ey, f"3. F = {expr}", s.v(14, 13), anchor="middle", hidden=True)
    s.text("ex2", ex, ey + 22, "= A + B(C + D)", s.v(14, 13), anchor="middle", hidden=True, weight="bold")
    # Stage 4: circuit.
    cx, cy = s.v(404, 20), s.v(98, 548)
    s.text("st4", cx + 150, cy - s.v(42, 30), "4. circuit (3 gates)", s.v(13, 12), anchor="middle", tone="muted")
    rows = {"A": cy, "B": cy + 40, "C": cy + 80, "D": cy + 120}
    circ = []
    for v, y in rows.items():
        s.text(f"in{v}", cx, y, v, anchor="start", weight="bold", hidden=True)
        circ.append(f"in{v}")
    p1, o1 = s.gate("g1", cx + 70, cy + 81, 40, 42, "or", hidden=True)
    p2, o2 = s.gate("g2", cx + 135, cy + 54, 40, 42, "and", hidden=True)
    p3, o3 = s.gate("g3", cx + 200, cy + 6, 40, 42, "or", hidden=True)
    s.wire("wC", (cx + 30, rows["C"]), p1[0], cx + 44, hidden=True)
    s.wire("wD", (cx + 30, rows["D"]), p1[1], cx + 56, hidden=True)
    s.wire("wB", (cx + 30, rows["B"]), p2[0], cx + 118, hidden=True)
    s.wire("n1", o1, p2[1], cx + 126, hidden=True)
    s.wire("wA", (cx + 30, rows["A"]), p3[0], cx + 184, hidden=True)
    s.wire("n2", o2, p3[1], cx + 190, hidden=True)
    s.wire("wF", o3, (o3[0] + 16, o3[1]), hidden=True)
    s.text("vF", o3[0] + 22, o3[1], "F", anchor="start", weight="bold", mono=True, hidden=True)
    circ += ["g1", "g2", "g3", "wC", "wD", "wB", "n1", "wA", "n2", "wF", "vF"]

    s.step("Stage 1, the truth table: F = 1 for digits 5–9 (0101 to 1001), F = 0 for 0–4, and the codes 1010–1111 never occur in BCD, so their F is a don't-care X.",
           ("tt0", {"rows": filled[0]}), ("tt1", {"rows": filled[1]}))
    s.step("Stage 2, the K-map: the five 1s (cells 5–9) and the six Xs (cells 10–15) are copied into a 4-variable map in Gray order.",
           ("kmg", {"values": km.values()}))
    s.step("Stage 3, grouping: the Xs let the 1s at 8 and 9 join cells 10–15 in an octet, the whole A = 1 half of the map, which reads A.",
           *[(i, {"hidden": False}) for i in loop_ids[0]])
    s.step(f"Two quads finish the cover: BC (cells 6, 7, 14, 15) and BD (cells 5, 7, 13, 15). The minimal SOP is F = {expr}, which factors to A + B(C + D).",
           *[(i, {"hidden": False}) for ids in loop_ids[1:] for i in ids], ("ex1", {"hidden": False}), ("ex2", {"hidden": False}))
    s.step("Stage 4, the circuit: the factored form needs only three 2-input gates, an OR for C + D, an AND with B, and an OR with A. No AND/OR/NOT circuit with fewer gates exists.",
           *[(i, {"hidden": False}) for i in circ])
    for m in (6, 3):
        env = dict(zip(V4, cl.bits_of(m, 4)))
        val = cl.evaluate(net, env)
        assert val["F"] == (m in ones)
        pats = [(f"w{v}", {"tone": tv(env[v])}) for v in V4] + [(f"in{v}", {"text": f"{v}={env[v]}"}) for v in V4]
        pats += [("n1", {"tone": tv(val["n1"])}), ("n2", {"tone": tv(val["n2"])}), ("wF", {"tone": tv(val["F"])}),
                 ("vF", {"text": f"F = {val['F']}", "tone": tv(val["F"])})]
        if m == 6:
            cap = (f"Test digit 6 = 0110: C + D = {val['n1']}, B(C + D) = {val['n2']}, so F = {val['F']}, as the table says (6 ≥ 5).")
        else:
            cap = (f"Test digit 3 = 0011: C + D = {val['n1']} but B = 0, so B(C + D) = {val['n2']} and A = 0, so F = {val['F']} (3 < 5).")
        s.step(cap, *pats)
    return s.done("Design procedure: a word specification becomes a 3-gate circuit", (W, 300), (NW, 700),
                  "The specification: a 4-bit BCD digit ABCD enters, and F must be 1 when the digit is 5 or more. Four stages follow: truth table, K-map, expression, circuit.")


@scene
def converter_kmaps(L):
    s = S(L)
    W, NW = 680, 360
    dcs = list(range(10, 16))
    outs = "wxyz"
    ones = {o: [d for d in range(10) if ((d + 3) >> (3 - j)) & 1] for j, o in enumerate(outs)}
    known = {"w": "A + BC + BD", "x": "B'C + B'D + BC'D'", "y": "CD + C'D'", "z": "D'"}
    exprs, cubes = {}, {}
    care = [m for m in range(16) if m not in dcs]
    for o in outs:
        cov = ml.min_covers(ones[o], dcs, 4)
        assert len(cov) == 1, o
        exprs[o], cubes[o] = sop_str(cov[0], V4)
        t = bl.tt(known[o], V4)
        assert [m for m in care if t[m]] == ones[o] and len(cubes[o]) == known[o].count("+") + 1
    s.head("BCD → excess-3: four K-maps with don't-cares", "BCD → excess-3 K-maps", W, NW)
    kc = s.v(30, 28)
    maps, loops = {}, {}
    tones = ["accent", "success", "info"]
    for j, o in enumerate(outs):
        qx = s.v(340 * (j % 2), 180 * (j % 2))
        qy = s.v(36 + 232 * (j // 2), 36 + 232 * (j // 2))
        mx = qx + s.v(120, 56)
        my = qy + 74
        s.text(f"nm{o}", mx + 2 * kc, qy + 12, f"output {o}" + (" (MSB)" if o == "w" else " (LSB)" if o == "z" else ""), s.v(14, 13), anchor="middle", weight="bold")
        maps[o] = kmap_els(s, f"k{o}", mx, my, kc, ones[o], dcs)
        loops[o] = [loop_els(s, maps[o], f"lp{o}{k}", c, k, tones[k]) for k, c in enumerate(cubes[o])]
        s.text(f"e{o}", s.v(mx + 2 * kc, qx + 92), my + 4 * kc + 20, f"{o} = {exprs[o]}".replace("'", "′"), s.v(14, 12), anchor="middle", hidden=True)
    s.step("Rows 10–15 are not BCD digits, so every output has an X there: six don't-cares per map that a loop may use or ignore.",
           *[(f"k{o}g", {"highlight": [list(ml.cell_rc(m, 4)) for m in dcs]}) for o in outs])
    for o in outs:
        n = len(cubes[o])
        what = {"w": "The MSB w is 1 for digits 5–9. The octet A uses the Xs; quads BC and BD take the remaining 1s",
                "x": "x is 1 for digits 1–4 and 9. The quads B′C and B′D use Xs; the pair BC′D′ (cells 4, 12) takes digit 4",
                "y": "y is 1 when C and D are equal: the quad CD and the quad C′D′, which wraps around the left and right edges",
                "z": "The LSB z is 1 for the even digits: the octet D′ (two outer columns) covers every one of them"}[o]
        s.step(f"{what}. {o} = {exprs[o].replace(chr(39), '′')} ({n} term{'s' if n > 1 else ''}).",
               *[(f"k{x}g", {"highlight": []}) for x in outs],
               *[(i, {"hidden": False}) for ids in loops[o] for i in ids], (f"e{o}", {"hidden": False, "tone": "accent"}),
               *[(f"e{x}", {"tone": "ink"}) for x in outs if x != o and outs.index(x) < outs.index(o)])
    lits = sum(ml.literals(c) for o in outs for c in cubes[o])
    s.step(f"All four outputs: w = A + BC + BD, x = B′C + B′D + BC′D′, y = CD + C′D′ (an XNOR), z = D′. Without the don't-cares every map would need more or larger terms ({lits} literals in all here).",
           *[(f"e{x}", {"tone": "ink"}) for x in outs])
    return s.done("BCD to excess-3 converter: four K-maps with don't-cares", (W, 500), (NW, 500),
                  "Four K-maps over the BCD digit ABCD, one per excess-3 output bit w x y z (the digit plus 3). Cells 0–9 hold the outputs; cells 10–15 are don't-cares X.")


@scene
def gray_converter(L):
    s = S(L)
    W, NW = 700, 360
    n = 0b1011
    B = cl.bits_of(n, 4)  # b3 … b0
    enc = [("g2", "XOR", ["b3", "b2"]), ("g1", "XOR", ["b2", "b1"]), ("g0", "XOR", ["b1", "b0"])]
    dec = [("r2", "XOR", ["G3", "G2"]), ("r1", "XOR", ["r2", "G1"]), ("r0", "XOR", ["r1", "G0"])]
    for m in range(16):
        e = cl.evaluate(enc, dict(zip(["b3", "b2", "b1", "b0"], cl.bits_of(m, 4))))
        g = [cl.bits_of(m, 4)[0], e["g2"], e["g1"], e["g0"]]
        assert cl.num(g) == m ^ (m >> 1)
        d = cl.evaluate(dec, dict(zip(["G3", "G2", "G1", "G0"], g)))
        assert cl.num([g[0], d["r2"], d["r1"], d["r0"]]) == m
    ev = cl.evaluate(enc, dict(zip(["b3", "b2", "b1", "b0"], B)))
    G = [B[0], ev["g2"], ev["g1"], ev["g0"]]
    assert sup(G) == "1110"
    dv = cl.evaluate(dec, dict(zip(["G3", "G2", "G1", "G0"], G)))
    R = [G[0], dv["r2"], dv["r1"], dv["r0"]]
    assert R == B
    s.head("Binary → Gray and back, bit by bit (input 1011)", "Binary ↔ Gray (1011)", W, NW)
    p1x, p1y = 10, 40
    p2x, p2y = s.v(360, 10), s.v(40, 290)

    def row(py, i):
        return py + 40 + (3 - i) * 52

    # Panel 1: binary → Gray (gates in one column).
    s.text("t1", p1x + 160, p1y + 6, "binary → Gray: gᵢ = bᵢ₊₁ ⊕ bᵢ", s.v(14, 13), anchor="middle", weight="bold")
    for i in range(3, -1, -1):
        y = row(p1y, i)
        s.text(f"nb{i}", p1x + 22, y, f"b{i}", anchor="end", weight="bold")
        s.box(f"b{i}", p1x + 28, y - 13, 30, 26, "?", mono=True)
        s.box(f"g{i}", p1x + 280, y - 13, 30, 26, "", mono=True)
        s.text(f"ng{i}", p1x + 316, y, f"g{i}", anchor="start", weight="bold")
    for i in (2, 1, 0):
        y = row(p1y, i)
        pins, out = s.gate(f"xg{i}", p1x + 150, y - 28, 40, 42, "xor")
        s.line(f"bus{i}", [[p1x + 58, y], pins[1]])
        s.line(f"tap{i}", [[p1x + 100, row(p1y, i + 1)], [p1x + 100, pins[0][1]], pins[0]])
        s.node(f"jt{i}", p1x + 100, row(p1y, i + 1), 3, fill="ink")
        s.line(f"og{i}", [out, [p1x + 266, out[1]], [p1x + 266, y], [p1x + 280, y]])
    s.line("bus3", [[p1x + 58, row(p1y, 3)], [p1x + 280, row(p1y, 3)]])
    # Panel 2: Gray → binary ripple (gates staggered).
    s.text("t2", p2x + 160, p2y + 6, "Gray → binary: bᵢ = bᵢ₊₁ ⊕ gᵢ", s.v(14, 13), anchor="middle", weight="bold")
    for i in range(3, -1, -1):
        y = row(p2y, i)
        s.text(f"nG{i}", p2x + 22, y, f"g{i}", anchor="end", weight="bold")
        s.box(f"G{i}", p2x + 28, y - 13, 30, 26, "", mono=True)
        s.box(f"R{i}", p2x + 280, y - 13, 30, 26, "", mono=True)
        s.text(f"nR{i}", p2x + 316, y, f"b{i}", anchor="start", weight="bold")
    outs = {}
    for k, i in enumerate((2, 1, 0)):
        y = row(p2y, i)
        gx = p2x + 96 + 60 * k
        pins, out = s.gate(f"xr{i}", gx, y - 28, 40, 42, "xor")
        outs[i] = out
        s.line(f"Gbus{i}", [[p2x + 58, y], pins[1]])
        if i == 2:
            s.line("rtap2", [[p2x + 80, row(p2y, 3)], [p2x + 80, pins[0][1]], pins[0]])
            s.node("jr2", p2x + 80, row(p2y, 3), 3, fill="ink")
        else:
            o = outs[i + 1]
            s.line(f"rtap{i}", [[o[0] + 10, o[1]], [o[0] + 10, pins[0][1]], pins[0]])
            s.node(f"jr{i}", o[0] + 10, o[1], 3, fill="ink")
        s.line(f"or{i}", [out, [p2x + 266, out[1]], [p2x + 266, y], [p2x + 280, y]])
    s.line("Gbus3", [[p2x + 58, row(p2y, 3)], [p2x + 280, row(p2y, 3)]])
    s.text("res", s.v(W / 2, NW / 2), s.v(280, 528), "", s.v(14, 13), anchor="middle", weight="bold")

    def bitset(i, v, pre):
        return (f"{pre}{i}", {"label": str(v), "tone": tv(v), "fill": fillv(v)})

    s.step(f"The binary input b3 b2 b1 b0 = {sup(B)} enters. Each Gray bit compares two neighbouring binary bits.",
           *[bitset(i, B[3 - i], "b") for i in range(4)], *[(f"bus{i}", {"tone": tv(B[3 - i])}) for i in range(4)],
           *[(f"tap{i}", {"tone": tv(B[2 - i])}) for i in range(3)])
    s.step(f"g3 = b3 = {G[0]}: the MSB is copied unchanged.", bitset(3, G[0], "g"))
    for i in (2, 1, 0):
        bi1, bi = B[3 - (i + 1)], B[3 - i]
        s.step(f"g{i} = b{i + 1} ⊕ b{i} = {bi1} ⊕ {bi} = {G[3 - i]}" + (": the bits differ, so the Gray bit is 1." if G[3 - i] else ": the bits are equal, so the Gray bit is 0."),
               bitset(i, G[3 - i], "g"), (f"og{i}", {"tone": tv(G[3 - i])}), (f"xg{i}", {"tone": "accent"}))
    s.step(f"The Gray code of {sup(B)} is {sup(G)}. To convert back, the Gray bits g3 g2 g1 g0 = {sup(G)} enter the second circuit.",
           *[bitset(i, G[3 - i], "G") for i in range(4)], *[(f"Gbus{i}", {"tone": tv(G[3 - i])}) for i in range(4)],
           ("rtap2", {"tone": tv(G[0])}))
    s.step(f"b3 = g3 = {R[0]}: the MSB is copied again.", bitset(3, R[0], "R"))
    for i in (2, 1, 0):
        prev, gi = R[3 - (i + 1)], G[3 - i]
        pats = [bitset(i, R[3 - i], "R"), (f"or{i}", {"tone": tv(R[3 - i])}), (f"xr{i}", {"tone": "accent"})]
        if i > 0:
            pats.append((f"rtap{i - 1}", {"tone": tv(R[3 - i])}))
        s.step(f"b{i} = b{i + 1} ⊕ g{i} = {prev} ⊕ {gi} = {R[3 - i]}: each binary bit needs the binary bit just found, so the decode ripples from the MSB down.", *pats)
    s.step(f"The ripple returns {sup(R)}, the original input. Binary → Gray needs no chain (each XOR is independent); Gray → binary is a chain of 3 XORs.",
           ("res", {"text": f"{sup(B)} → Gray {sup(G)} → binary {sup(R)}", "tone": "success"}))
    return s.done("Binary to Gray and Gray to binary converters", (W, 300), (NW, 548),
                  "Left: a binary to Gray converter (three XORs side by side). Right: a Gray to binary converter (a ripple of three XORs). The input is 1011.")


# ── Lesson 2: multiplexers ──────────────────────────────────────────────────

@scene
def mux_routing(L):
    s = S(L)
    W, NW = 640, 360
    data = [0, 1, 1, 0]
    ys = [cl.mux(data, cl.bits_of(k, 2)) for k in range(4)]
    assert ys == list(bl.tt("A \\oplus B", ["A", "B"]))
    s.head("A 4:1 MUX routes one data input to Y", "4:1 MUX routing", W, NW)
    x, y, w, h = s.v(260, 110), 64, s.v(120, 100), 180
    P = s.block("mux", x, y, w, h, left=["I0", "I1", "I2", "I3"], right=["Y"], bottom=["S1", "S0"], title="4:1 MUX", title_xy=(x + w / 2, y - 14))
    for k in range(4):
        py = P[f"I{k}"][1]
        s.text(f"d{k}", x - s.v(44, 34), py, f"I{k} = {data[k]}", anchor="end", mono=True, tone=tv(data[k]))
        s.line(f"wd{k}", [[x - s.v(40, 30), py], [x, py]], tone=tv(data[k]))
        s.line(f"path{k}", [[x + 28, py], [x + w - 26, P["Y"][1]]], tone="accent", hidden=True)
    for j, nm in enumerate(["S1", "S0"]):
        px = P[nm][0]
        s.line(f"ws{j}", [[px, y + h], [px, y + h + 22]])
        s.text(f"s{j}", px, y + h + 36, f"{nm} = ?", anchor="middle", mono=True)
    oy = P["Y"][1]
    s.line("wy", [[x + w, oy], [x + w + s.v(50, 34), oy]])
    s.text("vy", x + w + s.v(56, 40), oy, "Y", anchor="start", mono=True, weight="bold")
    for k in range(4):
        sb = cl.bits_of(k, 2)
        v = ys[k]
        assert v == data[k]
        s.step(f"Select S1S0 = {sup(sb)}: input I{k} (value {data[k]}) is routed to Y, so Y = {v}.",
               *[(f"path{j}", {"hidden": j != k}) for j in range(4)],
               *[(f"wd{j}", {"tone": "accent" if j == k else tv(data[j])}) for j in range(4)],
               ("s0", {"text": f"S1 = {sb[0]}"}), ("s1", {"text": f"S0 = {sb[1]}"}),
               ("ws0", {"tone": tv(sb[0])}), ("ws1", {"tone": tv(sb[1])}),
               ("wy", {"tone": tv(v)}), ("vy", {"text": f"Y = {v}", "tone": tv(v)}))
    s.step(f"Over the four selects Y reads {' '.join(map(str, ys))}: the data inputs are the truth table, and with data 0 1 1 0 the MUX computes Y = S1′S0 + S1S0′ = S1 ⊕ S0.",
           *[(f"path{j}", {"hidden": True}) for j in range(4)], *[(f"wd{j}", {"tone": tv(data[j])}) for j in range(4)],
           ("vy", {"text": "Y = S1 ⊕ S0", "tone": "accent"}))
    return s.done("A 4:1 multiplexer routing the selected input to its output", (W, 310), (NW, 310),
                  "A 4:1 MUX with data inputs I0 I1 I2 I3 = 0 1 1 0. The select lines S1 S0 choose which input reaches Y.")


@scene
def mux_implement(L):
    s = S(L)
    W, NW = 640, 360
    V = ["x", "y", "z"]
    ones = [0, 1, 3, 4, 5, 6]
    names, rv = cl.impl_table(ones, 3, [1, 2], V)
    assert names == ["1", "1", "x", "x′"] and rv == ["x"]
    assert cl.mux_realises(ones, 3, [1, 2], ["1", "1", "x", "x'"], V)
    s.head("Implementing Σ(0, 1, 3, 4, 5, 6) on a 4:1 MUX (selects y, z)", "Σ(0,1,3,4,5,6) on a 4:1 MUX", W, NW)
    tx, ty, cw, ch = s.v(24, 50), s.v(84, 60), s.v(56, 52), 32
    rows0 = [["yz", "00", "01", "10", "11"], ["x′", "0", "1", "2", "3"], ["x", "4", "5", "6", "7"], ["data", "", "", "", ""]]
    s.table("it", tx, ty, cw, ch, rows0)
    s.text("ith", tx + 2.5 * cw, ty - 18, "implementation table: column = data input", s.v(13, 12), anchor="middle", tone="muted")
    x, y, w, h = s.v(410, 140), s.v(70, 250), s.v(110, 100), 150
    P = s.block("mux", x, y, w, h, left=["I0", "I1", "I2", "I3"], right=["f"], bottom=["y", "z"], title="4:1", title_xy=(x + w / 2 + 6, y + 30))
    for k in range(4):
        py = P[f"I{k}"][1]
        s.text(f"d{k}", x - 32, py, "?", anchor="end", mono=True, weight="bold")
        s.line(f"wd{k}", [[x - 26, py], [x, py]])
    for j, nm in enumerate(["y", "z"]):
        px = P[nm][0]
        s.line(f"ws{j}", [[px, y + h], [px, y + h + 18]])
        s.text(f"s{j}", px, y + h + 32, nm, anchor="middle", mono=True, weight="bold")
    oy = P["f"][1]
    s.line("wf", [[x + w, oy], [x + w + s.v(40, 30), oy]])
    s.text("vf", x + w + s.v(46, 36), oy, "f", anchor="start", mono=True, weight="bold")
    s.text("chk", s.v(W / 2, NW / 2), s.v(290, 470), "", s.v(14, 13), anchor="middle")
    hl0 = [[1, c + 1] for c in range(4) if c in ones]
    hl1 = hl0 + [[2, c + 1] for c in range(4) if c + 4 in ones]
    s.step("Row x′ lists the minterms with x = 0 (0–3), row x those with x = 1 (4–7); each column is one value of the selects yz. Ring the 1s of row x′: 0, 1 and 3.",
           ("it", {"highlight": hl0}))
    s.step("Ring the 1s of row x: 4, 5 and 6. Now read each column: which rows are ringed decides that data input.",
           ("it", {"highlight": hl1}))
    cur = [r[:] for r in rows0]
    for c in range(4):
        top, bot = c in ones, c + 4 in ones
        cur[3][c + 1] = names[c]
        why = ("both minterms are 1, so the input is 1 whatever x is" if top and bot else
               "neither minterm is 1, so the input is 0" if not top and not bot else
               "only the x row is ringed, so the input equals x" if bot else "only the x′ row is ringed, so the input equals x′")
        s.step(f"Column yz = {format(c, '02b')} (minterms {c} and {c + 4}): {why}. I{c} = {names[c]}.",
               ("it", {"rows": [r[:] for r in cur], "highlight": hl1 + [[3, c + 1]]}))
    s.step(f"Wire the residues to the MUX: I0 = {names[0]}, I1 = {names[1]}, I2 = {names[2]}, I3 = {names[3]}, with y on S1 and z on S0. One 4:1 MUX (and an inverter for x′) realises the 3-variable function.",
           ("it", {"highlight": []}), *[(f"d{k}", {"text": names[k], "tone": "accent"}) for k in range(4)])
    for m in (6, 7):
        env = dict(zip(V, cl.bits_of(m, 3)))
        sel = env["y"] * 2 + env["z"]
        val = int(names[sel]) if names[sel] in "01" else env["x"] if names[sel] == "x" else 1 - env["x"]
        assert val == (m in ones)
        s.step(f"Check minterm {m} (x y z = {env['x']} {env['y']} {env['z']}): the selects pick I{sel} = {names[sel]} = {val}, so f = {val}; {m} is {'in' if val else 'not in'} the list.",
               *[(f"wd{k}", {"tone": "accent" if k == sel else "ink"}) for k in range(4)],
               ("wf", {"tone": tv(val)}), ("vf", {"text": f"f = {val}", "tone": tv(val)}),
               ("chk", {"text": f"x y z = {env['x']}{env['y']}{env['z']} → I{sel} = {names[sel]} → f = {val}", "tone": tv(val)}),
               ("it", {"highlight": [[1 + env["x"], sel + 1]]}))
    return s.done("Implementing a function on a 4:1 MUX with an implementation table", (W, 310), (NW, 490),
                  "f(x, y, z) = Σ(0, 1, 3, 4, 5, 6) goes on a 4:1 MUX with y and z on the selects. The implementation table finds what each data input must be.")


@scene
def mux_cascade(L):
    s = S(L)
    W, NW = 700, 360
    V = ["P", "Q", "R"]
    net = [("M1", "MUX", {"d": ["0", "R"], "s": ["P"]}), ("X", "MUX", {"d": ["~R", "M1"], "s": ["Q"]})]
    X = cl.truth(net, V, "X")
    assert X == bl.tt("Q'R' + PQR", V)
    cov = ml.min_covers(cl.ones_of(X), [], 3)
    assert len(cov) == 1 and set(cov[0]) == {"-00", "111"}
    assert cl.truth(net, V, "M1") == bl.tt("PR", V)
    s.head("Two cascaded 2:1 MUXes (GATE 2016), row by row", "Cascaded 2:1 MUXes (2016)", W, NW)
    mw, mh = s.v(70, 64), 100
    x1, x2, y = s.v(120, 72), s.v(310, 220), 70
    A = s.block("m1", x1, y, mw, mh, left=["0", "1"], right=["Y"], bottom=["s"], title="MUX1", title_xy=(x1 + mw / 2, y - 12))
    B = s.block("m2", x2, y, mw, mh, left=["0", "1"], right=["Y"], bottom=["s"], title="MUX2", title_xy=(x2 + mw / 2, y - 12))
    srcx1 = x1 - s.v(26, 22)
    s.text("a0", srcx1 - 4, A["0"][1], "0", anchor="end", mono=True)
    s.line("wa0", [[srcx1, A["0"][1]], A["0"]])
    s.text("a1", srcx1 - 4, A["1"][1], "R", anchor="end", mono=True)
    s.line("wa1", [[srcx1, A["1"][1]], A["1"]])
    s.text("b0", x2 - 26, B["0"][1], "R′", anchor="end", mono=True)
    s.line("wb0", [[x2 - 22, B["0"][1]], B["0"]])
    s.line("wm", [A["Y"], [A["Y"][0] + s.v(40, 26), A["Y"][1]], [A["Y"][0] + s.v(40, 26), B["1"][1]], B["1"]])
    s.text("lm", A["Y"][0] + s.v(40, 26), B["1"][1] + 16, "M1", s.v(13, 12), anchor="middle", tone="muted")
    for pid, Pp, nm in (("sp", A, "P"), ("sq", B, "Q")):
        px = Pp["s"][0]
        s.line(f"w{pid}", [[px, y + mh], [px, y + mh + 20]])
        s.text(pid, px, y + mh + 34, nm, anchor="middle", mono=True)
    for pid, Pp, xx in (("p1", A, x1), ("p2", B, x2)):
        for k in range(2):
            s.line(f"{pid}{k}", [[xx + 18, Pp[str(k)][1]], [xx + mw - 18, Pp["Y"][1]]], tone="accent", hidden=True)
    s.line("wx", [B["Y"], [B["Y"][0] + s.v(36, 26), B["Y"][1]]])
    s.text("vx", B["Y"][0] + s.v(42, 30), B["Y"][1], "X", anchor="start", mono=True, weight="bold")
    tx, ty = s.v(490, 90), s.v(50, 250)
    rows0 = [["P", "Q", "R", "M1", "X"]] + [[" "] * 5 for _ in range(8)]
    s.table("tt", tx, ty, 38, 22, rows0)
    s.text("sum", s.v(255, NW / 2), s.v(270, 470), "", s.v(15, 14), anchor="middle", weight="bold")
    cur = [r[:] for r in rows0]
    for m, env in enumerate(cl.rows(V)):
        val = cl.evaluate(net, env)
        p, q, r = env["P"], env["Q"], env["R"]
        cur[m + 1] = [str(p), str(q), str(r), str(val["M1"]), str(val["X"])]
        m1src = "0" if p == 0 else f"R = {r}"
        xsrc = f"R′ = {1 - r}" if q == 0 else f"M1 = {val['M1']}"
        s.step(f"P Q R = {p} {q} {r}: MUX1 selects input {p} and passes {m1src}, so M1 = {val['M1']}; MUX2 selects input {q} and passes {xsrc}, so X = {val['X']}.",
               ("p10", {"hidden": p != 0}), ("p11", {"hidden": p != 1}), ("p20", {"hidden": q != 0}), ("p21", {"hidden": q != 1}),
               ("wa0", {"tone": "accent" if p == 0 else "muted"}), ("wa1", {"tone": "accent" if p == 1 else tv(r)}),
               ("a1", {"text": f"R={r}"}), ("b0", {"text": f"R′={1 - r}"}),
               ("wb0", {"tone": "accent" if q == 0 else tv(1 - r)}), ("wm", {"tone": "accent" if q == 1 else tv(val["M1"])}),
               ("sp", {"text": f"P={p}"}), ("sq", {"text": f"Q={q}"}), ("wsp", {"tone": tv(p)}), ("wsq", {"tone": tv(q)}),
               ("wx", {"tone": tv(val["X"])}), ("vx", {"text": f"X={val['X']}", "tone": tv(val["X"])}),
               ("tt", {"rows": [rr[:] for rr in cur], "highlight": [[m + 1, 4]]}))
    on = cl.ones_of(X)
    s.step(f"X = 1 only on rows {', '.join(format(m, '03b') for m in on)} (minterms {', '.join(map(str, on))}). MUX1 gives M1 = PR, so X = Q′R′ + Q·PR: the minimal SOP is Q′R′ + PQR.",
           ("tt", {"highlight": [[m + 1, 4] for m in on]}), ("sum", {"text": "X = Q′R′ + PQR", "tone": "success"}),
           *[(f"p{a}{b}", {"hidden": True}) for a in (1, 2) for b in (0, 1)])
    return s.done("Two cascaded 2:1 multiplexers evaluated row by row", (W, 290), (NW, 490),
                  "MUX1 has inputs 0 and R with select P; its output M1 feeds input 1 of MUX2, whose input 0 is R′ and whose select is Q. The output is X.")


@scene
def mux_tree(L):
    s = S(L)
    W, NW = 640, 360
    levels, total, nlev = cl.mux_tree(16, 4)
    assert (levels, total, nlev) == ([4, 1], 5, 2) and (16 - 1) // (4 - 1) == total
    net = [(f"m{k}", "MUX", {"d": [f"d{4 * k + j}" for j in range(4)], "s": ["S1", "S0"]}) for k in range(4)]
    net.append(("Y", "MUX", {"d": ["m0", "m1", "m2", "m3"], "s": ["S3", "S2"]}))
    ins = [f"d{i}" for i in range(16)] + ["S3", "S2", "S1", "S0"]
    for sel in range(16):
        for hot in range(16):
            env = {f"d{i}": int(i == hot) for i in range(16)}
            env.update(dict(zip(["S3", "S2", "S1", "S0"], cl.bits_of(sel, 4))))
            assert cl.evaluate(net, env)["Y"] == int(hot == sel)
    assert len(ins) == 20
    s.head("A 16:1 MUX from 4:1 MUXes, level by level", "16:1 from 4:1 MUXes", W, NW)
    bx, bw, bh = s.v(150, 70), s.v(80, 76), 84
    x2, w2, y2, h2 = s.v(380, 210), s.v(90, 80), 148, 200
    outs = []
    lev1 = []
    for k in range(4):
        y = 50 + 104 * k
        s.box(f"b{k}", bx, y, bw, bh, hidden=True)
        s.text(f"bt{k}", bx + bw / 2, y + 30, "4:1", anchor="middle", weight="bold", hidden=True)
        s.text(f"bs{k}", bx + bw / 2, y + 62, "S1 S0", s.v(13, 12), anchor="middle", hidden=True)
        lev1 += [f"b{k}", f"bt{k}", f"bs{k}"]
        for j in range(4):
            py = round(y + bh * (j + 0.5) / 4, 2)
            i = 4 * k + j
            s.text(f"i{i}", bx - s.v(40, 24), py, f"I{i}", s.v(13, 12), anchor="end", mono=True)
            s.line(f"wi{i}", [[bx - s.v(36, 20), py], [bx, py]])
        outs.append((bx + bw, y + bh / 2))
    s.box("top", x2, y2, w2, h2, hidden=True)
    s.text("tt", x2 + w2 / 2, y2 + 80, "4:1", anchor="middle", weight="bold", hidden=True)
    s.text("ts", x2 + w2 / 2, y2 + h2 - 16, "S3 S2", s.v(13, 12), anchor="middle", hidden=True)
    lev2 = ["top", "tt", "ts"]
    mid = s.v(305, 178)
    for k in range(4):
        py = y2 + h2 * (k + 0.5) / 4
        s.text(f"tl{k}", x2 + 5, py, f"I{k}", s.v(13, 12), anchor="start", hidden=True)
        s.line(f"wo{k}", wire_pts(outs[k], (x2, py), mid), hidden=True)
        lev2 += [f"tl{k}", f"wo{k}"]
    oy = y2 + h2 / 2
    s.line("wy", [[x2 + w2, oy], [x2 + w2 + s.v(40, 40), oy]], hidden=True)
    s.text("vy", s.v(x2 + w2 + 46, x2 + w2 + 30), s.v(oy, oy - 20), "Y", anchor=s.v("start", "middle"), mono=True, weight="bold", hidden=True)
    lev2 += ["wy", "vy"]
    s.step(f"Level 1: ⌈16 / 4⌉ = {levels[0]} blocks of 4:1, each taking four of the sixteen data inputs (I0–I3, I4–I7, I8–I11, I12–I15).",
           *[(i, {"hidden": False}) for i in lev1])
    s.step("The low select bits S1 S0 go to every first-level block, so all four pick the input in the same position.",
           *[(f"bs{k}", {"tone": "accent"}) for k in range(4)])
    s.step(f"Level 2: ⌈{levels[0]} / 4⌉ = {levels[1]} block takes the four first-level outputs; the high select bits S3 S2 choose which block's output reaches Y.",
           *[(i, {"hidden": False}) for i in lev2], *[(f"bs{k}", {"tone": "ink"}) for k in range(4)], ("ts", {"tone": "accent"}))
    for sel in (0b1001, 0b0110):
        sb = cl.bits_of(sel, 4)
        lo, hi = cl.num(sb[2:]), cl.num(sb[:2])
        picked = [4 * k + lo for k in range(4)]
        assert 4 * hi + lo == sel
        s.step(f"Select S3S2S1S0 = {sup(sb)}: S1S0 = {sup(sb[2:])} makes each first-level block pass its input {lo} ({', '.join(f'I{i}' for i in picked)}); S3S2 = {sup(sb[:2])} passes block {hi}, so Y = I{sel}.",
               *[(f"wi{i}", {"tone": "accent" if i == sel else "success" if i in picked else "ink"}) for i in range(16)],
               *[(f"i{i}", {"tone": "accent" if i == sel else "ink"}) for i in range(16)],
               *[(f"wo{k}", {"tone": "accent" if k == hi else "ink"}) for k in range(4)],
               ("wy", {"tone": "accent"}), ("vy", {"text": f"Y = I{sel}"}))
    s.step(f"Total: {levels[0]} + {levels[1]} = {total} MUXes in {nlev} levels. Each level divides the count by 4 and rounds up; for a full tree the total is (16 − 1)/(4 − 1) = {total}.",
           *[(f"wi{i}", {"tone": "ink"}) for i in range(16)], *[(f"i{i}", {"tone": "ink"}) for i in range(16)],
           *[(f"wo{k}", {"tone": "ink"}) for k in range(4)], ("wy", {"tone": "ink"}), ("vy", {"text": "Y"}), ("ts", {"tone": "ink"}))
    return s.done("A 16:1 multiplexer built as a tree of 4:1 multiplexers", (W, 470), (NW, 470),
                  "Sixteen data inputs I0–I15 must reach one output Y using only 4:1 multiplexers. The tree is built level by level.")


@scene
def mux_as_gates(L):
    s = S(L)
    W, NW = 680, 360
    cfgs = [
        ("NOT", ["1", "0"], None, "x′", [("Y", "MUX", {"d": ["1", "0"], "s": ["x"]})], ["x"]),
        ("AND", ["0", "y"], None, "xy", [("Y", "MUX", {"d": ["0", "y"], "s": ["x"]})], ["x", "y"]),
        ("OR", ["y", "1"], None, "x + y", [("Y", "MUX", {"d": ["y", "1"], "s": ["x"]})], ["x", "y"]),
        ("NOR", [None, "0"], ["1", "0"], "x′y′", [("m", "MUX", {"d": ["1", "0"], "s": ["y"]}), ("Y", "MUX", {"d": ["m", "0"], "s": ["x"]})], ["x", "y"]),
    ]
    want = {"NOT": "x'", "AND": "xy", "OR": "x + y", "NOR": "(x + y)'"}
    for nm, _, _, _, net, V in cfgs:
        assert cl.truth(net, V, "Y") == bl.tt(want[nm], V), nm
    s.head("A 2:1 MUX wired as NOT, AND, OR and NOR", "2:1 MUX as gates", W, NW)
    s.text("name", s.v(W / 2, NW / 2), 52, "Y = S′·I0 + S·I1", s.v(15, 14), anchor="middle", weight="bold", tone="accent")
    xa, xm, y, mw, mh = s.v(150, 46), s.v(330, 196), 90, s.v(70, 64), 90
    Pa = s.block("ma", xa, y, mw, mh, left=["0", "1"], right=["Y"], bottom=["S"], title="MUX a", title_xy=(xa + mw / 2, y - 12), hidden=True)
    P = s.block("mm", xm, y, mw, mh, left=["0", "1"], right=["Y"], bottom=["S"], title="2:1", title_xy=(xm + mw / 2, y - 12))
    blk_a = ["ma", "ma-l0", "ma-l1", "ma-r0", "ma-b0", "ma-n"]
    for e in s.els:
        if e["id"] in blk_a:
            e["hidden"] = True
    for k in range(2):
        s.text(f"ad{k}", xa - 26, Pa[str(k)][1], "", anchor="end", mono=True, hidden=True)
        s.line(f"wa{k}", [[xa - 22, Pa[str(k)][1]], Pa[str(k)]], hidden=True)
        s.text(f"d{k}", xm - 26, P[str(k)][1], "", anchor="end", mono=True)
        s.line(f"wd{k}", [[xm - 22, P[str(k)][1]], P[str(k)]])
    s.line("wsa", [[Pa["S"][0], y + mh], [Pa["S"][0], y + mh + 18]], hidden=True)
    s.text("sa", Pa["S"][0], y + mh + 32, "y", anchor="middle", mono=True, hidden=True)
    s.line("wam", wire_pts(Pa["Y"], (xm - 22, P["0"][1])), hidden=True)
    s.line("wsm", [[P["S"][0], y + mh], [P["S"][0], y + mh + 18]])
    s.text("sm", P["S"][0], y + mh + 32, "x", anchor="middle", mono=True)
    s.line("wy", [[xm + mw, P["Y"][1]], [xm + mw + 24, P["Y"][1]]])
    s.text("vy", xm + mw + 30, P["Y"][1], "Y", anchor="start", mono=True, weight="bold")
    tx, ty = s.v(530, 120), s.v(70, 250)
    s.table("tt", tx, ty, 44, 26, [["x", "Y"]])
    a_ids = blk_a + ["ad0", "ad1", "wa0", "wa1", "wsa", "sa", "wam"]
    for nm, d, da, expr, net, V in cfgs:
        t = cl.truth(net, V, "Y")
        rows = [V + ["Y"]] + [[str(b) for b in cl.bits_of(m, len(V))] + [str(t[m])] for m in range(2 ** len(V))]
        two = da is not None
        pats = [("name", {"text": f"{nm}: Y = {expr}"}), ("tt", {"rows": rows})]
        pats += [(i, {"hidden": not two}) for i in a_ids]
        pats += [("d0", {"text": d[0] or ""}), ("d1", {"text": d[1]})]
        if two:
            pats += [("ad0", {"text": da[0]}), ("ad1", {"text": da[1]})]
        cap = {"NOT": "NOT: put x on the select, 1 on I0 and 0 on I1. When x = 0 the MUX passes 1, when x = 1 it passes 0, so Y = x′.",
               "AND": "AND: x on the select, 0 on I0, y on I1. When x = 0 the output is 0; when x = 1 it is y. So Y = x′·0 + x·y = xy.",
               "OR": "OR: x on the select, y on I0, 1 on I1. When x = 0 the output is y; when x = 1 it is 1. So Y = x′y + x = x + y.",
               "NOR": "NOR needs two MUXes: MUX a (select y, inputs 1 and 0) makes y′; the second MUX (select x, inputs y′ and 0) gives Y = x′y′ = (x + y)′."}[nm]
        s.step(cap, *pats)
    s.step("With constants and one variable on the select, a 2:1 MUX makes NOT and AND (and OR), so 2:1 MUXes alone are functionally complete. Read every cascade from its truth table: a different wiring of constants can give NAND instead of OR.",
           ("name", {"text": "2:1 MUX: functionally complete"}))
    return s.done("A 2:1 multiplexer wired as NOT, AND, OR and NOR", (W, 260), (NW, 400),
                  "A 2:1 MUX outputs I0 when its select S is 0 and I1 when S is 1. Tying its inputs to constants and variables turns it into gates.")


# ── Lesson 3: decoders, demultiplexers, encoders ────────────────────────────

def decoder_block(s, pid, x, y, w, h, ins, title="3:8"):
    outs = [f"D{k}" for k in range(8)]
    return s.block(pid, x, y, w, h, left=ins, right=outs, title=title)


@scene
def decoder_lighting(L):
    s = S(L)
    W, NW = 640, 360
    s.head("A 3:8 decoder: one output per address", "3:8 decoder", W, NW)
    x, y, w, h = s.v(260, 120), 50, s.v(110, 100), 240
    P = s.block("dec", x, y, w, h, left=["A2", "A1", "A0"], right=[f"D{k}" for k in range(8)], bottom=["EN"], title="3:8")
    for j, nm in enumerate(["A2", "A1", "A0"]):
        py = P[nm][1]
        s.text(f"a{j}", x - s.v(64, 44), py, f"{nm} = ?", anchor="end", mono=True)
        s.line(f"wa{j}", [[x - s.v(60, 40), py], [x, py]])
    ex = P["EN"][0]
    s.line("wen", [[ex, y + h], [ex, y + h + 22]])
    s.text("en", ex, y + h + 36, "EN = 1", anchor="middle", mono=True)
    for k in range(8):
        py = P[f"D{k}"][1]
        s.line(f"wo{k}", [[x + w, py], [x + w + s.v(40, 30), py]])
        s.node(f"o{k}", x + w + s.v(52, 42), py, 11, "0", mono=True, tone="muted")
    s.text("st", s.v(530, NW / 2), s.v(170, 362), "", anchor="middle", weight="bold")

    def frame(addr, en):
        ab = cl.bits_of(addr, 3)
        out = cl.decoder(ab, en)
        assert sum(out) == (1 if en else 0) and (not en or out[addr] == 1)
        pats = [(f"a{j}", {"text": f"{['A2', 'A1', 'A0'][j]} = {ab[j]}", "tone": tv(ab[j])}) for j in range(3)]
        pats += [(f"wa{j}", {"tone": tv(ab[j])}) for j in range(3)]
        pats += [(f"o{k}", {"label": str(out[k]), "tone": tv(out[k]), "fill": fillv(out[k])}) for k in range(8)]
        pats += [(f"wo{k}", {"tone": "accent" if out[k] else "muted"}) for k in range(8)]
        pats += [("en", {"text": f"EN = {en}", "tone": tv(en)}), ("wen", {"tone": tv(en)})]
        pats += [("st", {"text": f"only D{addr} = 1" if en else "all outputs 0", "tone": "accent" if en else "muted"})]
        return ab, out, pats

    for addr in range(8):
        ab, out, pats = frame(addr, 1)
        s.step(f"Address A2A1A0 = {sup(ab)} (= {addr}) with EN = 1: exactly one output, D{addr}, is 1; the other seven are 0.", *pats)
    ab, out, pats = frame(5, 0)
    s.step(f"Enable low: the address is {sup(ab)} again, but EN = 0, so every output is 0. The enable gates all eight outputs.", *pats)
    ab, out, pats = frame(5, 1)
    s.step("EN back to 1: D5 lights again. Each output Dk is the minterm m_k of A2A1A0 ANDed with EN, so a decoder is a minterm generator.", *pats)
    return s.done("A 3-to-8 decoder lighting one output per address", (W, 340), (NW, 380),
                  "A 3:8 decoder with address inputs A2 A1 A0, an enable EN, and outputs D0–D7 (active high). The address will step from 000 to 111.")


@scene
def decoder_function(L):
    s = S(L)
    W, NW = 640, 360
    V = ["A", "B", "C"]
    used = [1, 2, 4, 7]
    net = [("Q", "DEC", {"a": V}), ("S", "OR", [f"Q.{k}" for k in used])]
    S_ = cl.truth(net, V, "S")
    assert S_ == bl.tt("A \\oplus B \\oplus C", V) and cl.ones_of(S_) == used
    s.head("Decoder + OR gate: the full-adder sum Σ(1, 2, 4, 7)", "Decoder + OR: S = Σ(1,2,4,7)", W, NW)
    x, y, w, h = s.v(200, 70), 50, s.v(110, 96), 240
    P = s.block("dec", x, y, w, h, left=V, right=[f"D{k}" for k in range(8)], title="3:8")
    for j, nm in enumerate(V):
        py = P[nm][1]
        s.text(f"a{j}", x - s.v(60, 24), py, f"{nm}=?", anchor="end", mono=True)
        s.line(f"wa{j}", [[x - s.v(56, 20), py], [x, py]])
    gx, gw, gh = s.v(430, 256), s.v(60, 50), 110
    gy = round(P["D4"][1] - gh * 3 / 5, 2)
    pins, out = s.gate("or", gx, gy, gw, gh, "or", inputs=4)
    mids = {1: s.v(400, 236), 2: s.v(380, 222), 4: None, 7: s.v(380, 222)}
    for k in range(8):
        py = P[f"D{k}"][1]
        if k in used:
            s.wire(f"wo{k}", (x + w, py), pins[used.index(k)], mids[k])
        else:
            s.line(f"wo{k}", [[x + w, py], [x + w + 14, py]])
    s.line("ws", [out, [out[0] + s.v(30, 22), out[1]]])
    s.text("vs", s.v(out[0] + 36, out[0] + 4), s.v(out[1], out[1] + 36), "S", anchor=s.v("start", "start"), mono=True, weight="bold")
    s.text("col", s.v(W / 2, NW / 2), s.v(318, 318), "S column: ", anchor="middle", mono=True)
    col = []
    for m, env in enumerate(cl.rows(V)):
        val = cl.evaluate(net, env)
        bits_ = [env[v] for v in V]
        col.append(str(val["S"]))
        hit = m in used
        s.step(f"A B C = {sup(bits_)}: the decoder raises D{m}. " + (f"D{m} is wired to the OR, so S = 1." if hit else f"D{m} is not wired to the OR, so S = 0."),
               *[(f"a{j}", {"text": f"{V[j]}={bits_[j]}", "tone": tv(bits_[j])}) for j in range(3)],
               *[(f"wa{j}", {"tone": tv(bits_[j])}) for j in range(3)],
               *[(f"wo{k}", {"tone": ("accent" if k == m else "muted")}) for k in range(8)],
               ("or", {"fill": fillv(val["S"]), "tone": tv(val["S"]) if val["S"] else "ink"}), ("ws", {"tone": tv(val["S"])}),
               ("vs", {"text": f"S={val['S']}", "tone": tv(val["S"])}), ("col", {"text": "S column: " + " ".join(col)}))
    s.step("The OR collects minterms 1, 2, 4 and 7, so S = Σ(1, 2, 4, 7) = A ⊕ B ⊕ C, the full-adder sum. Any n-variable function is one n:2ⁿ decoder plus an OR of its minterms.",
           *[(f"wo{k}", {"tone": "success" if k in used else "muted"}) for k in range(8)], ("vs", {"text": "S", "tone": "ink"}),
           ("or", {"fill": "none", "tone": "ink"}), ("ws", {"tone": "ink"}))
    return s.done("A decoder and an OR gate implementing the full-adder sum", (W, 340), (NW, 340),
                  "A 3:8 decoder with inputs A, B, C. Its outputs D1, D2, D4 and D7 feed a 4-input OR gate whose output is S.")


@scene
def decoder_tree(L):
    s = S(L)
    W, NW = 680, 360
    levels, total = cl.decoder_tree(6, 3)
    assert (levels, total) == ([8, 1], 9)
    s.head("A 6:64 decoder from 3:8 decoders (9 blocks)", "6:64 from 3:8 decoders", W, NW)
    tx, tw, ty, th = s.v(120, 20), s.v(90, 74), 70, 352
    s.text("lv1", tx + tw / 2, 52, "level 1", s.v(13, 12), anchor="middle", tone="muted")
    P = s.block("top", tx, ty, tw, th, left=["A5", "A4", "A3"], right=[str(k) for k in range(8)], title="3:8", title_xy=(tx + tw / 2, ty + th / 2 - 44))
    if s.wd:
        for j, nm in enumerate(["A5", "A4", "A3"]):
            s.text(f"a{j}", tx - 50, P[nm][1], "", anchor="end", mono=True)
            s.line(f"wa{j}", [[tx - 46, P[nm][1]], P[nm]])
    lx, lw = s.v(330, 150), s.v(170, 140)
    s.text("lv2", lx + lw / 2, 52, "level 2: 8 leaves", s.v(13, 12), anchor="middle", tone="muted", hidden=True)
    leaf_ids = ["lv2"]
    for k in range(8):
        py = P[str(k)][1]
        s.line(f"we{k}", [[tx + tw, py], [lx, py]], hidden=True)
        s.box(f"lf{k}", lx, py - 15, lw, 30, hidden=True)
        s.text(f"le{k}", lx + 5, py, "EN", s.v(13, 12), anchor="start", hidden=True)
        s.text(f"ll{k}", lx + lw / 2 + 12, py, f"D{8 * k}–D{8 * k + 7}", s.v(13, 12), anchor="middle", mono=True, hidden=True)
        s.text(f"lo{k}", lx + lw + 8, py, "", anchor="start", mono=True, weight="bold")
        leaf_ids += [f"we{k}", f"lf{k}", f"le{k}", f"ll{k}"]
    s.text("low", s.v(lx + lw / 2, NW / 2), s.v(450, 450), "A2 A1 A0 go to every leaf", s.v(14, 13), anchor="middle", hidden=True)
    s.text("adr", s.v(tx + tw / 2, NW / 2), s.v(450, 478), "", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    leaf_ids.append("low")
    s.step("Level 1: one 3:8 decoder takes the high address bits A5 A4 A3. Its eight outputs will not drive loads directly; they choose a leaf.",
           ("top", {"tone": "accent"}))
    s.step(f"Level 2: 64 outputs need 64 / 8 = {levels[0]} leaf decoders. Each top output drives one leaf's enable, and the low bits A2 A1 A0 go to every leaf.",
           ("top", {"tone": "ink"}), *[(i, {"hidden": False}) for i in leaf_ids])
    s.step(f"Count: {levels[0]} leaves + {levels[1]} top decoder = {total} decoders, and no other gates, because a 3:8 decoder has an enable input.",
           *[(f"lf{k}", {"tone": "info"}) for k in range(8)], ("top", {"tone": "info"}))
    for addr in (0b101110, 0b000011):
        ab = cl.bits_of(addr, 6)
        hi, lo = cl.decoder(ab[:3]), cl.num(ab[3:])
        k = hi.index(1)
        leaf = cl.decoder(ab[3:], en=1)
        out = 8 * k + leaf.index(1)
        assert out == addr
        others = [cl.decoder(ab[3:], en=0) for _ in range(7)]
        assert all(sum(o) == 0 for o in others)
        s.step(f"Address A5…A0 = {sup(ab[:3])} {sup(ab[3:])}: the top decoder raises output {k}, enabling leaf {k} only; that leaf decodes {sup(ab[3:])} = {lo} and raises its output {lo}, which is D{out}.",
               ("top", {"tone": "ink"}), *[(f"lf{j}", {"tone": "accent" if j == k else "muted", "fill": "accent" if j == k else "none"}) for j in range(8)],
               *[(f"we{j}", {"tone": "accent" if j == k else "muted"}) for j in range(8)],
               *[(f"lo{j}", {"text": f"D{out}" if j == k else "", "tone": "success"}) for j in range(8)],
               *([(f"a{j}", {"text": f"A{5 - j} = {ab[j]}"}) for j in range(3)] if s.wd else []),
               ("adr", {"text": f"{sup(ab)} = {addr} → D{out}"}))
    s.step("In general an n:2ⁿ decoder from k:2ᵏ decoders needs 2ⁿ / 2ᵏ leaves plus the tree above them; for 6:64 from 3:8 that is 8 + 1 = 9.",
           *[(f"lf{j}", {"tone": "ink", "fill": "none"}) for j in range(8)], *[(f"we{j}", {"tone": "ink"}) for j in range(8)],
           *[(f"lo{j}", {"text": ""}) for j in range(8)], ("adr", {"text": "8 leaves + 1 = 9 decoders"}))
    return s.done("A 6-to-64 decoder built from 3-to-8 decoders", (W, 470), (NW, 494),
                  "A 6:64 decoder must be built from 3:8 decoders that have an enable input. The address is A5…A0.")


@scene
def demux_routing(L):
    s = S(L)
    W, NW = 640, 360
    s.head("A 1:4 DEMUX sends D to the selected output", "1:4 DEMUX routing", W, NW)
    x, y, w, h = s.v(260, 120), 60, s.v(110, 100), 170
    P = s.block("dm", x, y, w, h, left=["D"], right=["Y0", "Y1", "Y2", "Y3"], bottom=["S1", "S0"], title="1:4 DEMUX", title_xy=(x + w / 2, y - 14))
    dy = P["D"][1]
    s.text("d", x - s.v(48, 34), dy, "D = ?", anchor="end", mono=True)
    s.line("wd", [[x - s.v(44, 30), dy], [x, dy]])
    for k in range(4):
        py = P[f"Y{k}"][1]
        s.line(f"path{k}", [[x + 22, dy], [x + w - 30, py]], tone="accent", hidden=True)
        s.line(f"wo{k}", [[x + w, py], [x + w + 30, py]])
        s.node(f"o{k}", x + w + 42, py, 11, "0", mono=True, tone="muted")
    for j, nm in enumerate(["S1", "S0"]):
        px = P[nm][0]
        s.line(f"ws{j}", [[px, y + h], [px, y + h + 20]])
        s.text(f"s{j}", px, y + h + 34, f"{nm}=?", anchor="middle", mono=True)
    for d, sel in [(1, 0), (1, 1), (1, 2), (1, 3), (0, 2)]:
        sb = cl.bits_of(sel, 2)
        out = cl.demux(d, sb)
        assert out == [d if k == sel else 0 for k in range(4)]
        cap = (f"S1S0 = {sup(sb)}, D = 1: the data bit travels to Y{sel}, so Y{sel} = 1 and the other outputs are 0."
               if d else f"S1S0 = {sup(sb)}, D = 0: the path still leads to Y{sel}, but it carries 0, so every output is 0.")
        s.step(cap, *[(f"path{k}", {"hidden": k != sel}) for k in range(4)],
               ("d", {"text": f"D = {d}", "tone": tv(d)}), ("wd", {"tone": tv(d)}),
               *[(f"s{j}", {"text": f"{['S1', 'S0'][j]}={sb[j]}", "tone": tv(sb[j])}) for j in range(2)],
               *[(f"ws{j}", {"tone": tv(sb[j])}) for j in range(2)],
               *[(f"wo{k}", {"tone": "accent" if (k == sel and d) else "muted"}) for k in range(4)],
               *[(f"o{k}", {"label": str(out[k]), "tone": tv(out[k]), "fill": fillv(out[k])}) for k in range(4)])
    s.step("Each output is Yk = D · m_k(S1, S0). That is a 2:4 decoder whose enable is the data line: the same chip serves as decoder or DEMUX.",
           *[(f"path{k}", {"hidden": True}) for k in range(4)])
    return s.done("A 1-to-4 demultiplexer routing the data bit", (W, 300), (NW, 300),
                  "A 1:4 DEMUX: one data input D, select lines S1 S0, and outputs Y0–Y3. The selects choose which output receives D.")


@scene
def priority_scan(L):
    s = S(L)
    W, NW = 640, 360
    s.head("A 4:2 priority encoder scans from D3 down", "4:2 priority encoder", W, NW)
    x, y, w, h = s.v(260, 120), 60, s.v(120, 110), 180
    P = s.block("pe", x, y, w, h, left=["D3", "D2", "D1", "D0"], right=["A1", "A0", "V"], title="4:2", title_xy=(x + w / 2 + 4, y + h / 2))
    for j in range(4):
        i = 3 - j
        py = P[f"D{i}"][1]
        s.box(f"hl{i}", x - s.v(116, 92), py - 15, s.v(78, 64), 30, tone="accent", fill="accent", hidden=True)
        s.text(f"d{i}", x - s.v(46, 34), py, f"D{i} = ?", anchor="end", mono=True)
        s.line(f"wd{i}", [[x - s.v(38, 28), py], [x, py]])
    for nm in ["A1", "A0", "V"]:
        py = P[nm][1]
        s.line(f"w{nm}", [[x + w, py], [x + w + s.v(30, 22), py]])
        s.text(f"v{nm}", x + w + s.v(36, 28), py, f"{nm} = ?", anchor="start", mono=True)
    s.text("st", s.v(W / 2, NW / 2), s.v(274, 274), "", anchor="middle", weight="bold")
    patterns = [[0, 1, 1, 0], [1, 0, 1, 1], [0, 0, 1, 1], [0, 0, 0, 1], [0, 0, 0, 0]]  # D3 D2 D1 D0
    for pat in patterns:
        d = pat[::-1]  # d[i] = Di
        code, valid = cl.priority_encoder(d)
        win = max((i for i in range(4) if d[i]), default=None)
        assert valid == (win is not None) and (not valid or cl.num(code) == win)
        load = [(f"d{i}", {"text": f"D{i} = {d[i]}", "tone": tv(d[i]), "opacity": 1}) for i in range(4)]
        load += [(f"wd{i}", {"tone": tv(d[i]), "opacity": 1}) for i in range(4)]
        load += [(f"v{nm}", {"text": f"{nm} = ?", "tone": "ink"}) for nm in ["A1", "A0", "V"]]
        load += [(f"w{nm}", {"tone": "ink"}) for nm in ["A1", "A0", "V"]]
        first = True
        for i in range(3, -1, -1):
            pats = (load + [("st", {"text": f"input D3 D2 D1 D0 = {sup(pat)}", "tone": "ink"})]) if first else []
            pats += [(f"hl{j}", {"hidden": j != i}) for j in range(4)]
            first = False
            if d[i]:
                lower = [j for j in range(i - 1, -1, -1)]
                pats += [(f"d{j}", {"opacity": 0.4}) for j in lower] + [(f"wd{j}", {"opacity": 0.4}) for j in lower]
                pats += [(f"wd{i}", {"tone": "accent"})]
                pats += [("vA1", {"text": f"A1 = {code[0]}", "tone": tv(code[0])}), ("vA0", {"text": f"A0 = {code[1]}", "tone": tv(code[1])}),
                         ("vV", {"text": "V = 1", "tone": "success"}), ("wA1", {"tone": tv(code[0])}), ("wA0", {"tone": tv(code[1])}), ("wV", {"tone": "success"}),
                         ("st", {"text": f"{sup(pat)}: D{i} wins → code {sup(code)}, V = 1", "tone": "accent"})]
                ign = f"; {', '.join(f'D{j}' for j in lower)} {'is' if len(lower) == 1 else 'are'} ignored" if lower and any(d[j] for j in lower) else ""
                s.step(f"D{i} = 1 is the highest active input, so it wins: the code is A1A0 = {sup(code)} ({i} in binary) and V = 1{ign}.", *pats)
                break
            if i > 0:
                s.step(f"Input D3 D2 D1 D0 = {sup(pat)}. D{i} = 0, so look at the next lower input." if pats and pats[0][0] == "d0" else
                       f"D{i} = 0, so look at the next lower input.", *pats)
            else:
                pats += [("vA1", {"text": "A1 = 0", "tone": "muted"}), ("vA0", {"text": "A0 = 0", "tone": "muted"}),
                         ("vV", {"text": "V = 0", "tone": "danger"}), ("wV", {"tone": "muted"}),
                         ("st", {"text": "no input active → V = 0", "tone": "danger"})]
                assert code == [0, 0] and valid == 0
                s.step("D0 = 0 too: no input is active, so V = 0. The code 00 is then meaningless; V is what tells it apart from D0 = 1.", *pats)
    s.step("The rule: scan from D3 down and output the index of the first 1; V = 1 when any input is 1. Lower inputs never matter once a higher one is active.",
           *[(f"hl{j}", {"hidden": True}) for j in range(4)], ("st", {"text": "first 1 from the top wins", "tone": "accent"}))
    return s.done("A 4-to-2 priority encoder scanning its inputs", (W, 300), (NW, 300),
                  "A 4:2 priority encoder with inputs D3 (highest priority) to D0, code outputs A1 A0 and a valid flag V. Several input patterns follow.")


# ── Lesson 4: comparators and parity ────────────────────────────────────────

@scene
def comparator_cascade(L):
    s = S(L)
    W, NW = 680, 360
    vs = [f"A{i}" for i in range(3, -1, -1)] + [f"B{i}" for i in range(3, -1, -1)]
    gt = bl.tt(cl.comparator_gt_expr(4), vs)
    assert all(gt[m] == cl.compare(m >> 4, m & 15)[0] for m in range(256))
    s.head("Comparing two 4-bit numbers from the MSB down", "4-bit comparison, MSB first", W, NW)
    cells = {}
    for k, i in enumerate((3, 2, 1, 0)):
        if s.wd:
            cx0, cy0 = 50 + 160 * k, 96
        else:
            cx0, cy0 = 40 + 180 * (k % 2), 96 + 116 * (k // 2)
        cells[i] = (cx0, cy0)
        s.text(f"bl{i}", cx0 + 50, cy0 - 20, f"bit {i}", s.v(13, 12), anchor="middle", tone="muted")
        s.text(f"na{i}", cx0 - 6, cy0 + 13, f"A{i}", s.v(13, 12), anchor="end", weight="bold")
        s.text(f"nb{i}", cx0 - 6, cy0 + 57, f"B{i}", s.v(13, 12), anchor="end", weight="bold")
        s.box(f"a{i}", cx0, cy0, 30, 26, "", mono=True)
        s.box(f"b{i}", cx0, cy0 + 44, 30, 26, "", mono=True)
        pins, out = s.gate(f"x{i}", cx0 + 60, cy0 + 15, 44, 40, "xnor")
        s.wire(f"wa{i}", (cx0 + 30, cy0 + 13), pins[0], cx0 + 45)
        s.wire(f"wb{i}", (cx0 + 30, cy0 + 57), pins[1], cx0 + 45)
        s.line(f"wx{i}", [out, [out[0] + 12, out[1]]])
        s.text(f"vx{i}", cx0 + 82, cy0 + 70, "", s.v(13, 12), anchor="middle", mono=True)
    gy = s.v(196, 330)
    for j, (nm, word) in enumerate([("G", "A > B"), ("E", "A = B"), ("L", "A < B")]):
        bx = s.v(110 + 170 * j, 12 + 116 * j)
        s.box(f"o{nm}", bx, gy, s.v(130, 104), 36, f"{nm}: {word}", s.v(14, 13), mono=True)
    s.text("dec", s.v(W / 2, NW / 2), s.v(262, 394), "", s.v(14, 13), anchor="middle", weight="bold")
    s.text("pair", s.v(W / 2, NW / 2), 52, "", s.v(15, 13), anchor="middle", mono=True, weight="bold")

    def load(a, b):
        A, B = cl.bits_of(a, 4), cl.bits_of(b, 4)
        pats = [("pair", {"text": f"A = {sup(A)} ({a}), B = {sup(B)} ({b})"})]
        for k, i in enumerate((3, 2, 1, 0)):
            pats += [(f"a{i}", {"label": str(A[k]), "tone": tv(A[k]), "fill": fillv(A[k]), "opacity": 1}),
                     (f"b{i}", {"label": str(B[k]), "tone": tv(B[k]), "fill": fillv(B[k]), "opacity": 1}),
                     (f"x{i}", {"tone": "ink", "fill": "none", "opacity": 1}), (f"vx{i}", {"text": "", "opacity": 1}),
                     (f"wx{i}", {"tone": "ink", "opacity": 1}), (f"wa{i}", {"opacity": 1}), (f"wb{i}", {"opacity": 1})]
        pats += [(f"o{nm}", {"tone": "ink", "fill": "none", "label": f"{nm}: {wd}"}) for nm, wd in [("G", "A > B"), ("E", "A = B"), ("L", "A < B")]]
        pats += [("dec", {"text": ""})]
        return A, B, pats

    def bit(i, A, B):
        k = 3 - i
        x = int(A[k] == B[k])
        return x, [(f"x{i}", {"tone": tv(x), "fill": fillv(x)}), (f"wx{i}", {"tone": tv(x)}), (f"vx{i}", {"text": f"x{i} = {x}", "tone": tv(x)})]

    def result(a, b, A, B, i_dec):
        g, e, l_ = cl.compare(a, b)
        assert g == gt[(a << 4) | b]
        pats = [(f"o{nm}", {"tone": tv(v), "fill": fillv(v), "label": f"{nm} = {v}"}) for nm, v in (("G", g), ("E", e), ("L", l_))]
        if i_dec is not None:
            for j in range(i_dec - 1, -1, -1):
                pats += [(f"{p}{j}", {"opacity": 0.35}) for p in ("a", "b", "x", "wa", "wb", "wx", "vx")]
        return (g, e, l_), pats

    for a, b in [(0b1011, 0b1001), (0b0110, 0b0110), (0b0101, 0b0111)]:
        A, B, pats = load(a, b)
        diff = next((i for i in (3, 2, 1, 0) if A[3 - i] != B[3 - i]), None)
        if diff is None:
            more = []
            for i in (3, 2, 1, 0):
                more += bit(i, A, B)[1]
            s.step(f"A = {sup(A)} and B = {sup(B)}: every bit pair is equal, so all four XNORs output 1.", *pats, *more)
            (g, e, l_), rp = result(a, b, A, B, None)
            assert e == 1
            s.step("x3·x2·x1·x0 = 1, so E = 1 and neither G nor L fires: A = B.", *rp, ("dec", {"text": "all bits equal → E = 1"}))
            continue
        first = True
        for i in (3, 2, 1, 0):
            x, bp = bit(i, A, B)
            if first:
                bp = pats + bp
            if x:
                s.step((f"A = {sup(A)} ({a}), B = {sup(B)} ({b}). " if first else "") + f"Bit {i}: A{i} = B{i} = {A[3 - i]}, so x{i} = 1 and the decision passes to the next lower bit.", *bp)
                first = False
                continue
            (g, e, l_), rp = result(a, b, A, B, i)
            winner = "G" if g else "L"
            term = " ".join([f"x{j}" for j in range(3, i, -1)] + ([f"A{i}B{i}′"] if g else [f"A{i}′B{i}"]))
            later = f" Bits below {i} are ignored." if i > 0 else ""
            s.step(f"Bit {i}: A{i} = {A[3 - i]}, B{i} = {B[3 - i]}, the first unequal bit. The term {term} = 1 fires, so {winner} = 1: A {'>' if g else '<'} B ({a} {'>' if g else '<'} {b}).{later}",
                   *bp, *rp, ("dec", {"text": f"first difference at bit {i} → {winner} = 1"}))
            break
    s.step("G = A3B3′ + x3A2B2′ + x3x2A1B1′ + x3x2x1A0B0′ (xᵢ = Aᵢ ⊙ Bᵢ); L is the same with A and B swapped; E = x3x2x1x0. The MSB decides unless it ties.",
           ("dec", {"text": "G, L: first unequal bit from the top"}))
    return s.done("A 4-bit magnitude comparator deciding from the most significant bit", (W, 280), (NW, 410),
                  "Two 4-bit numbers A and B are compared bit by bit. Each XNOR gives xᵢ = 1 when Aᵢ = Bᵢ. Outputs: G (A > B), E (A = B), L (A < B).")


@scene
def parity_tree(L):
    s = S(L)
    W, NW = 660, 360
    byte = [1, 0, 1, 1, 0, 0, 1, 1]  # b7 … b0
    P = cl.parity(byte)
    assert P == 1 and (sum(byte) + P) % 2 == 0 and cl.xor_tree(8) == (7, 3)
    flip = 5  # b5
    recv = byte[:]
    recv[7 - flip] ^= 1
    s.head("An 8-input XOR tree: even parity generator and checker", "XOR tree: parity", W, NW)
    sp = s.v(34, 34)
    rows = [64 + sp * j for j in range(9)]
    gw = s.v(50, 40)
    X1, X2, X3 = s.v(140, 76), s.v(240, 150), s.v(340, 224)
    J1, J2, J3 = s.v(118, 60), s.v(218, 134), s.v(318, 206)
    for j in range(8):
        s.text(f"in{j}", s.v(60, 46), rows[j], f"b{7 - j}={byte[j]}", s.v(14, 12), anchor="end", mono=True, tone=tv(byte[j]))
    o1 = []
    for k in range(4):
        c = (rows[2 * k] + rows[2 * k + 1]) / 2
        pins, out = s.gate(f"l1g{k}", X1, c - 20, gw, 40, "xor")
        for t in range(2):
            j = 2 * k + t
            s.wire(f"w{j}", (s.v(64, 50), rows[j]), pins[t], J1, tone=tv(byte[j]))
        o1.append(out)
        s.text(f"v1{k}", out[0] + 8, out[1] - 12, "", s.v(13, 12), anchor="middle", mono=True, weight="bold")
    o2 = []
    for k in range(2):
        c = (o1[2 * k][1] + o1[2 * k + 1][1]) / 2
        pins, out = s.gate(f"l2g{k}", X2, c - 22, gw, 44, "xor")
        for t in range(2):
            s.wire(f"u{2 * k + t}", o1[2 * k + t], pins[t], J2)
        o2.append(out)
        s.text(f"v2{k}", out[0] + 8, out[1] - 12, "", s.v(13, 12), anchor="middle", mono=True, weight="bold")
    c = (o2[0][1] + o2[1][1]) / 2
    pins, o3 = s.gate("l3g", X3, c - 24, gw, 48, "xor")
    for t in range(2):
        s.wire(f"t{t}", o2[t], pins[t], J3)
    s.text("v3", s.v(o3[0] + 30, o3[0] + 28), o3[1] - 16, "", s.v(14, 12), anchor="middle", mono=True, weight="bold")
    FX, FY = s.v(480, 284), s.v(o3[1] - 8, o3[1] + 40)
    fp, fo = s.gate("fin", FX, FY, s.v(50, 40), 44, "xor", hidden=True)
    s.line("wt", wire_pts(o3, fp[0], s.v(455, 270)), hidden=True)
    s.text("inP", s.v(60, 46), rows[8], f"P={P}", s.v(14, 12), anchor="end", mono=True, hidden=True)
    s.line("wP", [[s.v(64, 50), rows[8]], [s.v(465, 278), rows[8]], [s.v(465, 278), fp[1][1]], fp[1]], hidden=True)
    s.line("wE", [fo, [fo[0] + s.v(30, 20), fo[1]]], hidden=True)
    s.text("vE", s.v(fo[0] + 36, fo[0] - 20), s.v(fo[1], fo[1] + 42), "", s.v(15, 13), anchor=s.v("start", "middle"), mono=True, weight="bold")
    s.text("st", s.v(W / 2, NW / 2), s.v(390, 390), "", s.v(14, 13), anchor="middle", weight="bold")

    def levels(bits_):
        l1 = [bits_[2 * k] ^ bits_[2 * k + 1] for k in range(4)]
        l2 = [l1[0] ^ l1[1], l1[2] ^ l1[3]]
        return l1, l2, l2[0] ^ l2[1]

    l1, l2, l3 = levels(byte)
    assert l3 == P
    s.step(f"Level 1: four XORs pair up the bits: {', '.join(map(str, l1))}. Each output is the parity of its two inputs.",
           *[(f"v1{k}", {"text": str(l1[k]), "tone": tv(l1[k])}) for k in range(4)], *[(f"u{k}", {"tone": tv(l1[k])}) for k in range(4)])
    s.step(f"Level 2: two XORs combine the pairs: {l2[0]}, {l2[1]} (parity of each nibble).",
           *[(f"v2{k}", {"text": str(l2[k]), "tone": tv(l2[k])}) for k in range(2)], *[(f"t{k}", {"tone": tv(l2[k])}) for k in range(2)])
    s.step(f"Level 3: the root gives {l3}. The byte {sup(byte)} has {sum(byte)} ones, an odd count, so the even-parity bit is P = {P}. Seven XORs in three levels.",
           ("v3", {"text": f"P = {l3}", "tone": tv(l3)}))
    s.step(f"P = {P} is sent with the byte: {sum(byte) + P} ones in 9 bits, an even count.",
           ("inP", {"hidden": False, "tone": tv(P)}), ("wP", {"hidden": False, "tone": tv(P)}))
    r1, r2, r3 = levels(recv)
    pats = [(f"in{j}", {"text": f"b{7 - j}={recv[j]}", "tone": "danger" if j == 7 - flip else tv(recv[j])}) for j in range(8)]
    pats += [(f"w{j}", {"tone": "danger" if j == 7 - flip else tv(recv[j])}) for j in range(8)]
    pats += [(f"v1{k}", {"text": ""}) for k in range(4)] + [(f"v2{k}", {"text": ""}) for k in range(2)] + [("v3", {"text": ""})]
    pats += [(f"u{k}", {"tone": "ink"}) for k in range(4)] + [(f"t{k}", {"tone": "ink"}) for k in range(2)]
    s.step(f"Checker: bit b{flip} flips in transit, so the received byte is {sup(recv)}. The same tree recomputes the parity.", *pats)
    s.step(f"Levels 1 and 2 on the received byte: {', '.join(map(str, r1))}, then {r2[0]}, {r2[1]}.",
           *[(f"v1{k}", {"text": str(r1[k]), "tone": tv(r1[k])}) for k in range(4)], *[(f"u{k}", {"tone": tv(r1[k])}) for k in range(4)],
           *[(f"v2{k}", {"text": str(r2[k]), "tone": tv(r2[k])}) for k in range(2)], *[(f"t{k}", {"tone": tv(r2[k])}) for k in range(2)])
    E = r3 ^ P
    assert E == 1 and (sum(recv) + P) % 2 == 1
    s.step(f"The root now gives {r3}. One more XOR with the received P: E = {r3} ⊕ {P} = {E}. The 9 received bits hold {sum(recv) + P} ones, an odd count, so the error flag rises.",
           ("v3", {"text": f"p′ = {r3}", "tone": tv(r3)}), ("fin", {"hidden": False, "tone": "danger"}), ("wt", {"hidden": False, "tone": tv(r3)}),
           ("wE", {"hidden": False, "tone": "danger"}), ("vE", {"text": f"E = {E}", "tone": "danger"}))
    s.step("Any single flipped bit changes the count of 1s by one and is caught. Two flips cancel (the count stays even), so parity detects every odd number of errors and no even number.",
           ("st", {"text": "parity: detects 1, 3, 5 … errors", "tone": "accent"}))
    return s.done("An XOR tree generating and checking an even parity bit", (W, 410), (NW, 410),
                  "Eight data bits b7…b0 = 1011 0011 feed a balanced tree of 2-input XOR gates. Its output is the even parity bit P.")


# ── Lesson 5: ROM and PLA ───────────────────────────────────────────────────

@scene
def rom_grid(L):
    s = S(L)
    W, NW = 640, 360
    words = [cl.bits_of(x * x, 6) for x in range(8)]
    assert cl.rom_size(3, 6) == (8, 6, 48) and max(x * x for x in range(8)).bit_length() == 6
    q1 = [w[4] for w in words]
    q0 = [w[5] for w in words]
    assert q1 == [0] * 8 and q0 == [x & 1 for x in range(8)]
    s.head("A ROM storing x² for x = 0 … 7 (8 words × 6 bits)", "ROM: x² (8 × 6 bits)", W, NW)
    dx, dw, dy, dh = s.v(110, 10), s.v(90, 76), 72, 240
    P = s.block("dec", dx, dy, dw, dh, left=["A2", "A1", "A0"], right=[str(k) for k in range(8)], title="3:8", title_xy=(dx + dw / 2 + 2, dy + dh / 2 - 44))
    if s.wd:
        for j, nm in enumerate(["A2", "A1", "A0"]):
            s.text(f"a{j}", dx - 40, P[nm][1], "", anchor="end", mono=True)
            s.line(f"wa{j}", [[dx - 36, P[nm][1]], P[nm]])
    gx, cell = s.v(260, 140), 30
    s.add(id="grid", type="grid", x=gx, y=dy, rows=8, cols=6, cell=cell, values=[[str(b) for b in w] for w in words], mono=True)
    for c in range(6):
        s.text(f"q{c}", gx + c * cell + cell / 2, dy - 14, f"Q{5 - c}", s.v(13, 12), anchor="middle", weight="bold")
        s.line(f"wq{c}", [[gx + c * cell + cell / 2, dy + 8 * cell], [gx + c * cell + cell / 2, dy + 8 * cell + 18]])
        s.text(f"vq{c}", gx + c * cell + cell / 2, dy + 8 * cell + 32, "", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    for k in range(8):
        py = P[str(k)][1]
        s.line(f"wl{k}", [[dx + dw, py], [gx, py]])
    s.text("st", s.v(530, NW / 2), s.v(170, 380), "", anchor="middle", weight="bold")
    s.text("st2", s.v(530, NW / 2), s.v(196, 402), "", s.v(14, 13), anchor="middle", mono=True)
    if not s.wd:
        s.text("adr", 10, 48, "", 13, anchor="start", mono=True)
    for x in range(8):
        ab = cl.bits_of(x, 3)
        lines_ = cl.decoder(ab)
        w = words[x]
        assert cl.num(w) == x * x and lines_.index(1) == x
        pats = [(f"wl{k}", {"tone": "accent" if lines_[k] else "muted"}) for k in range(8)]
        pats += [("grid", {"highlight": [[x, c] for c in range(6)]})]
        pats += [(f"vq{c}", {"text": str(w[c]), "tone": tv(w[c])}) for c in range(6)] + [(f"wq{c}", {"tone": tv(w[c])}) for c in range(6)]
        pats += [(f"a{j}", {"text": f"A{2 - j}={ab[j]}"}) for j in range(3)] if s.wd else [("adr", {"text": f"A2A1A0 = {sup(ab)}"})]
        pats += [("st", {"text": f"word {x}"}), ("st2", {"text": f"{sup(w)} = {x * x}"})]
        s.step(f"Address {sup(ab)}: the decoder raises word line {x} only, and that row of stored bits, {sup(w)} = {x * x} = {x}², appears on Q5…Q0.", *pats)
    s.step(f"Size: 2³ = 8 words × 6 bits = {cl.rom_size(3, 6)[2]} bits. Column Q1 is 0 in every word and Q0 always equals A0, so a careful design stores only 4 columns (32 bits).",
           *[(f"wl{k}", {"tone": "ink"}) for k in range(8)], ("grid", {"highlight": [[r, 4] for r in range(8)] + [[r, 5] for r in range(8)]}),
           ("st", {"text": "8 × 6 = 48 bits"}), ("st2", {"text": "Q1 = 0, Q0 = A0"}))
    return s.done("A ROM as a decoder and a grid of stored bits", (W, 370), (NW, 420),
                  "A read-only memory: a 3:8 decoder turns the address A2A1A0 into one of 8 word lines; each word holds 6 stored bits, here the square of the address.")


@scene
def pla_planes(L):
    s = S(L)
    W, NW = 640, 360
    f1, f2 = bl.minterms("AB + AC", V3), bl.minterms("AB + BC", V3)
    funcs = [(f1, []), (f2, [])]
    k, terms = cl.pla_min_terms(funcs, 3)
    pal = cl.pal_terms(funcs, 3)
    assert k == 3 and pal == 4
    terms = sorted(terms, key=lambda c: (-sum(set(ml.cells(c)) <= set(f) for f, _ in funcs), pretty(c, V3)))
    use = [[set(ml.cells(t)) <= set(f) for f, _ in funcs] for t in terms]
    shared = [i for i, u in enumerate(use) if all(u)]
    assert len(shared) == 1 and pretty(terms[shared[0]], V3) == "AB"
    for o, (f, _) in enumerate(funcs):
        cov = set()
        for t, u in zip(terms, use):
            if u[o]:
                cov |= set(ml.cells(t))
        assert cov == set(f)
    tn = [pretty(t, V3) for t in terms]
    s.head("A PLA: programmable AND plane and OR plane", "PLA: AND and OR planes", W, NW)
    lit_x = s.v([150, 180, 230, 260, 310, 340], [70, 100, 140, 170, 210, 240])
    out_x = s.v([410, 456], [286, 330])
    lits = ["A", "A′", "B", "B′", "C", "C′"]
    top, bot = 84, 270
    term_y = [126, 176, 226]
    s.box("pland", lit_x[0] - 22, top + 10, lit_x[-1] - lit_x[0] + 44, bot - top - 20, dashed=True, tone="muted")
    s.box("plor", out_x[0] - 22, top + 10, out_x[-1] - out_x[0] + 44, bot - top - 20, dashed=True, tone="muted")
    s.text("nand", (lit_x[0] + lit_x[-1]) / 2, bot + 10, "AND plane", s.v(13, 12), anchor="middle", tone="muted")
    s.text("nor", (out_x[0] + out_x[1]) / 2, bot + 10, "OR plane", s.v(13, 12), anchor="middle", tone="muted")
    for c, (lx, nm) in enumerate(zip(lit_x, lits)):
        s.text(f"lh{c}", lx, top - 12, nm, s.v(14, 13), anchor="middle", weight="bold")
        s.line(f"lc{c}", [[lx, top], [lx, bot - 4]])
    for o, ox in enumerate(out_x):
        s.text(f"oh{o}", ox, top - 12, f"f{o + 1}", s.v(14, 13), anchor="middle", weight="bold")
        s.line(f"oc{o}", [[ox, top], [ox, bot - 4]])
    for r, ty in enumerate(term_y):
        s.line(f"tl{r}", [[lit_x[0] - 14, ty], [out_x[-1] + 14, ty]], tone="muted")
        s.text(f"tn{r}", lit_x[0] - 26, ty, "", s.v(14, 13), anchor="end", mono=True, weight="bold")
        for c, ch in enumerate(terms[r]):
            if ch != "-":
                col = 2 * c + (0 if ch == "1" else 1)
                s.node(f"x{r}{col}", lit_x[col], ty, 5, fill="ink", tone="ink", hidden=True)
        for o in range(2):
            if use[r][o]:
                s.node(f"y{r}{o}", out_x[o], ty, 5, fill="ink", tone="ink", hidden=True)
    px, py = s.v(490, 20), s.v(126, 316)
    s.text("e1", px, py, "", s.v(14, 13), anchor="start", mono=True)
    s.text("e2", px, py + 26, "", s.v(14, 13), anchor="start", mono=True)
    s.text("ev", px, py + 60, "", s.v(14, 13), anchor="start", mono=True, weight="bold")
    s.text("cnt", px, py + 86, "", s.v(14, 13), anchor="start")
    for r in range(3):
        cols = [2 * c + (0 if ch == "1" else 1) for c, ch in enumerate(terms[r]) if ch != "-"]
        s.step(f"AND plane, term {r + 1}: connect {' and '.join(lits[c] for c in cols)} to row {r + 1}, which now computes the product {tn[r]}.",
               *[(f"x{r}{c}", {"hidden": False}) for c in cols], ("tn" + str(r), {"text": tn[r]}), (f"tl{r}", {"tone": "ink"}))
    expr = [" + ".join(tn[r] for r in range(3) if use[r][o]) for o in range(2)]
    assert expr == ["AB + AC", "AB + BC"]
    for o in range(2):
        s.step(f"OR plane, output f{o + 1}: connect the rows {', '.join(tn[r] for r in range(3) if use[r][o])}, so f{o + 1} = {expr[o]}."
               + (f" Row {tn[shared[0]]} is used again: a PLA shares a product term between outputs." if o == 1 else ""),
               *[(f"y{r}{o}", {"hidden": False}) for r in range(3) if use[r][o]], (f"e{o + 1}", {"text": f"f{o + 1} = {expr[o]}"}),
               *([(f"tl{shared[0]}", {"tone": "accent"}), (f"y{shared[0]}0", {"fill": "accent", "tone": "accent"}), (f"y{shared[0]}1", {"fill": "accent", "tone": "accent"})] if o == 1 else []))
    for abc in ([1, 1, 0], [1, 0, 1]):
        env = dict(zip(V3, abc))
        litv = [env["A"], 1 - env["A"], env["B"], 1 - env["B"], env["C"], 1 - env["C"]]
        tv_ = [int(all(litv[2 * c + (0 if ch == "1" else 1)] for c, ch in enumerate(terms[r]) if ch != "-")) for r in range(3)]
        ov = [int(any(tv_[r] for r in range(3) if use[r][o])) for o in range(2)]
        assert ov == [int(cl.num(abc) in f1), int(cl.num(abc) in f2)]
        on = [tn[r] for r in range(3) if tv_[r]]
        s.step(f"Input A B C = {sup(abc)}: only the term {on[0]} is 1, so f1 = {ov[0]} and f2 = {ov[1]}.",
               *[(f"lc{c}", {"tone": tv(litv[c])}) for c in range(6)], *[(f"tl{r}", {"tone": "accent" if tv_[r] else "muted"}) for r in range(3)],
               *[(f"oc{o}", {"tone": tv(ov[o])}) for o in range(2)], ("ev", {"text": f"f1 = {ov[0]}, f2 = {ov[1]}"}))
    s.step(f"This PLA needs {k} product terms for both outputs. A PAL, whose OR plane is fixed and cannot share, needs {pal} (AB twice).",
           *[(f"lc{c}", {"tone": "ink"}) for c in range(6)], *[(f"oc{o}", {"tone": "ink"}) for o in range(2)],
           ("cnt", {"text": f"PLA {k} terms, PAL {pal}", "tone": "accent"}), ("ev", {"text": ""}))
    return s.done("A PLA programmed term by term in its AND and OR planes", (W, 300), (NW, 420),
                  "A 3-input, 2-output PLA. Vertical lines carry A, A′, B, B′, C, C′; each horizontal row is one product term; the OR plane joins rows into f1 = AB + AC and f2 = AB + BC.")


# ── Lesson 6: faults ────────────────────────────────────────────────────────

@scene
def fault_injection(L):
    s = S(L)
    W, NW = 660, 360
    net = [("p", "NAND", ["A", "B"]), ("f", "NAND", ["p", "C"])]
    tests = cl.tests_for(net, V3, "f", "p", 1)
    assert tests == [7]
    s.head("Stuck-at-1 on line p (GATE 1994): which input detects it?", "p stuck-at-1 (1994)", W, NW)

    def circuit(tag, px, py, title):
        s.text(f"{tag}t", px + 150, py + 4, title, s.v(14, 13), anchor="middle", weight="bold", tone="danger" if tag == "F" else "ink")
        rows = {"A": py + 34, "B": py + 62, "C": py + 104}
        for v, y in rows.items():
            s.text(f"{tag}i{v}", px + 46, y, f"{v}=?", s.v(13, 12), anchor="end", mono=True)
        p1, o1 = s.gate(f"{tag}g1", px + 100, py + 28, 50, 40, "nand")
        s.wire(f"{tag}wA", (px + 50, rows["A"]), p1[0], px + 76)
        s.wire(f"{tag}wB", (px + 50, rows["B"]), p1[1], px + 84)
        p2, o2 = s.gate(f"{tag}g2", px + 200, py + 52, 50, 44, "nand")
        s.wire(f"{tag}wp", o1, p2[0], px + 172)
        s.wire(f"{tag}wC", (px + 50, rows["C"]), p2[1], px + 184)
        s.text(f"{tag}vp", px + 170, py + 32, "p", s.v(13, 12), anchor="middle", mono=True)
        s.line(f"{tag}wf", [o2, [o2[0] + 16, o2[1]]])
        s.text(f"{tag}vf", o2[0] + 22, o2[1], "f", s.v(14, 13), anchor="start", mono=True, weight="bold")

    circuit("G", 10, 50, "good circuit")
    circuit("F", 10, s.v(196, 190), "faulty: p stuck-at-1")
    tx, ty = s.v(420, 75), s.v(60, 340)
    rows0 = [["ABC", "good", "faulty"]] + [[" ", " ", " "] for _ in range(8)]
    s.table("tt", tx, ty, 70, 22, rows0)
    s.text("st", s.v(W / 2, NW / 2), s.v(344, 560), "", s.v(14, 13), anchor="middle", weight="bold")
    cur = [r[:] for r in rows0]
    diffs = []
    for m, env in enumerate(cl.rows(V3)):
        g = cl.evaluate(net, env)
        b = cl.evaluate(net, env, {"p": 1})
        differ = g["f"] != b["f"]
        assert differ == (m in tests)
        if differ:
            diffs.append(m)
        abc = sup([env[v] for v in V3])
        cur[m + 1] = [abc, str(g["f"]), str(b["f"])]
        if differ:
            why = f"good p = (AB)′ = 0 so f = (0·C)′ = 1, but the faulty p is 1 and C = 1, so f = (1·1)′ = 0. The outputs differ: this row detects the fault."
        elif g["p"] == 1:
            why = f"good p = (AB)′ = 1 already, the same as the stuck value, so the fault is not activated; both outputs are {g['f']}."
        else:
            why = f"good p = 0 differs from the stuck 1, but C = 0 forces f = 1 in both circuits, so the difference cannot propagate."
        pats = []
        for tag, val in (("G", g), ("F", b)):
            pats += [(f"{tag}i{v}", {"text": f"{v}={env[v]}", "tone": tv(env[v])}) for v in V3]
            pats += [(f"{tag}w{v}", {"tone": tv(env[v])}) for v in V3]
            pats += [(f"{tag}wp", {"tone": "danger" if tag == "F" else tv(val["p"])}), (f"{tag}vp", {"text": f"p={val['p']}", "tone": "danger" if tag == "F" else tv(val["p"])})]
            pats += [(f"{tag}wf", {"tone": tv(val["f"])}), (f"{tag}vf", {"text": f"f={val['f']}", "tone": ("danger" if differ else tv(val["f"])) if tag == "F" else tv(val["f"])})]
        pats += [("tt", {"rows": [r[:] for r in cur], "highlight": [[m + 1, 0], [m + 1, 1], [m + 1, 2]] if differ else [[m + 1, 0]]})]
        pats += [("st", {"text": "outputs differ: fault detected" if differ else "outputs agree", "tone": "danger" if differ else "muted"})]
        s.step(f"A B C = {' '.join(abc)}: {why}", *pats)
    s.step(f"Only A = B = C = 1 (row {diffs[0]}) makes the outputs differ: A = B = 1 activates the fault (good p = 0) and C = 1 propagates it through the second NAND. That one vector is the test.",
           ("tt", {"highlight": [[diffs[0] + 1, 0], [diffs[0] + 1, 1], [diffs[0] + 1, 2]]}), ("st", {"text": "test vector: A = B = C = 1", "tone": "accent"}))
    return s.done("Injecting a stuck-at-1 fault and finding the test vector", (W, 360), (NW, 580),
                  "Two copies of the circuit p = (AB)′, f = (p·C)′. The lower copy has line p stuck at 1. Every input row is applied to both copies.")


# ── Build ───────────────────────────────────────────────────────────────────

ORDER = ["design-pipeline", "converter-kmaps", "gray-converter", "mux-routing", "mux-implement", "mux-cascade", "mux-tree",
         "mux-as-gates", "decoder-lighting", "decoder-function", "decoder-tree", "demux-routing", "priority-scan",
         "comparator-cascade", "parity-tree", "rom-grid", "pla-planes", "fault-injection"]


def build_all():
    assert sorted(SPECS) == sorted(ORDER), sorted(set(SPECS) ^ set(ORDER))
    return {name: SPECS[name]() for name in ORDER}


def dump(s):
    return json.dumps(s, ensure_ascii=False, indent=1) + "\n"


if __name__ == "__main__":
    VIZ_DIR.mkdir(parents=True, exist_ok=True)
    for name, s in build_all().items():
        (VIZ_DIR / f"{name}.json").write_text(dump(s))
        print(f"wrote viz/{name}.json ({len(s['steps'])} steps)")
