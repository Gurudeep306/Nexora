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

    python3 content/gate-notes/_checks/dl/_viz_ch5.py      # write the JSON files
    python3 content/gate-notes/_checks/dl/viz_ch5.py       # (check) files == generator output
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
CAP_MAX = 140  # a caption must fit a 375 px phone (the captions are the text alternative)


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
    if t == "arrow":
        # Arrows snap to elements by id; only point ends can be measured (used by Chapter 6 state graphs).
        pts = [p for p in (e["from"], e["to"]) if not isinstance(p, str)]
        if not pts:
            return (0, 0, 0, 0)
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return (min(xs), min(ys), max(xs), max(ys))
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
        assert st["caption"].strip() and len(st["caption"]) <= CAP_MAX, f"{name}: caption too long ({len(st['caption'])}): {st['caption']}"
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


def kmap_els(s, pid, x, y, cell, ones, dcs, vars_=V4):
    km = KMap(pid, 4, vars_, x, y, cell, x, y, cell, ones=ones, dcs=dcs, idx=False)
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

    s.step("Stage 1, the truth table: F = 1 for digits 5–9, F = 0 for 0–4; the codes 1010–1111 never occur in BCD, so their F is a don't-care X.",
           ("tt0", {"rows": filled[0]}), ("tt1", {"rows": filled[1]}))
    s.step("Stage 2, the K-map: the five 1s (cells 5–9) and the six Xs (cells 10–15) are copied into a 4-variable map in Gray order.",
           ("kmg", {"values": km.values()}))
    s.step("Stage 3, grouping: the Xs let the 1s at 8 and 9 join cells 10–15 in an octet, the whole A = 1 half of the map, which reads A.",
           *[(i, {"hidden": False}) for i in loop_ids[0]])
    s.step(f"Two quads finish the cover: BC (cells 6, 7, 14, 15) and BD (cells 5, 7, 13, 15). Minimal SOP: F = {expr} = A + B(C + D).",
           *[(i, {"hidden": False}) for ids in loop_ids[1:] for i in ids], ("ex1", {"hidden": False}), ("ex2", {"hidden": False}))
    s.step("Stage 4: three gates, OR(C, D), AND with B, OR with A. No AND/OR/NOT circuit with fewer gates exists.",
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
    outs = "wxyz"  # element ids; shown as E3 E2 E1 E0 over the inputs B3 B2 B1 B0 (the lesson's names)
    VB = ["B3", "B2", "B1", "B0"]
    oname = {"w": "E3", "x": "E2", "y": "E1", "z": "E0"}
    ones = {o: [d for d in range(10) if ((d + 3) >> (3 - j)) & 1] for j, o in enumerate(outs)}
    known = {"w": "A + BC + BD", "x": "B'C + B'D + BC'D'", "y": "CD + C'D'", "z": "D'"}
    exprs, cubes = {}, {}
    care = [m for m in range(16) if m not in dcs]
    for o in outs:
        cov = ml.min_covers(ones[o], dcs, 4)
        assert len(cov) == 1, o
        _, cubes[o] = sop_str(cov[0], V4)
        exprs[o] = " + ".join(pretty(c, VB) for c in cubes[o])
        t = bl.tt(known[o], V4)
        assert [m for m in care if t[m]] == ones[o] and len(cubes[o]) == known[o].count("+") + 1
    assert exprs == {"w": "B3 + B2B1 + B2B0", "x": "B2′B1 + B2′B0 + B2B1′B0′", "y": "B1′B0′ + B1B0", "z": "B0′"}, exprs
    s.head("BCD → excess-3: four K-maps with don't-cares", "BCD → excess-3 K-maps", W, NW)
    kc = s.v(30, 28)
    maps, loops = {}, {}
    tones = ["accent", "success", "info"]
    two_line = {}
    for j, o in enumerate(outs):
        qx = s.v(340 * (j % 2), 180 * (j % 2))
        qy = s.v(36 + 232 * (j // 2), 36 + 232 * (j // 2))
        mx = qx + s.v(120, 56)
        my = qy + 74
        s.text(f"nm{o}", mx + 2 * kc, qy + 12, f"output {oname[o]}" + (" (MSB)" if o == "w" else " (LSB)" if o == "z" else ""), s.v(14, 13), anchor="middle", weight="bold")
        maps[o] = kmap_els(s, f"k{o}", mx, my, kc, ones[o], dcs, VB)
        loops[o] = [loop_els(s, maps[o], f"lp{o}{k}", c, k, tones[k]) for k, c in enumerate(cubes[o])]
        full = f"{oname[o]} = {exprs[o]}"
        ex, ey = s.v(mx + 2 * kc, qx + 92), my + 4 * kc + 20
        if not s.wd and len(full) > 22:
            head, tail = full.rsplit(" + ", 1)
            s.text(f"e{o}", ex, ey, head, 12, anchor="middle", hidden=True)
            s.text(f"e{o}b", ex, ey + 16, "+ " + tail, 12, anchor="middle", hidden=True)
            two_line[o] = True
        else:
            s.text(f"e{o}", ex, ey, full, s.v(14, 12), anchor="middle", hidden=True)

    def show(o, st):
        return [(f"e{o}", st)] + ([(f"e{o}b", st)] if o in two_line else [])

    s.step("Rows 10–15 are not BCD digits, so every output has an X there: six don't-cares per map that a loop may use or ignore.",
           *[(f"k{o}g", {"highlight": [list(ml.cell_rc(m, 4)) for m in dcs]}) for o in outs])
    for o in outs:
        n = len(cubes[o])
        what = {"w": "The MSB E3 is 1 for digits 5–9. The octet B3 uses the Xs; quads B2B1 and B2B0 take the other 1s",
                "x": "E2 is 1 for digits 1–4 and 9: quads B2′B1 and B2′B0 use Xs, pair B2B1′B0′ (cells 4, 12) takes 4",
                "y": "E1 = 1 when B1 = B0: the left column quad B1′B0′ and the third column quad B1B0",
                "z": "The LSB E0 is 1 for the even digits: the octet B0′ (two outer columns) covers them all"}[o]
        s.step(f"{what}. {oname[o]} = {exprs[o]} ({n} term{'s' if n > 1 else ''}).",
               *[(f"k{x}g", {"highlight": []}) for x in outs],
               *[(i, {"hidden": False}) for ids in loops[o] for i in ids], *show(o, {"hidden": False, "tone": "accent"}),
               *[p for x in outs if x != o and outs.index(x) < outs.index(o) for p in show(x, {"tone": "ink"})])
    lits = sum(ml.literals(c) for o in outs for c in cubes[o])
    assert lits == 17
    s.step(f"All four maps are done: {lits} literals in all. Without the don't-cares every map would need more or larger terms.",
           *[p for x in outs for p in show(x, {"tone": "ink"})])
    return s.done("BCD to excess-3 converter: four K-maps with don't-cares", (W, 500), (NW, 500),
                  "Four K-maps over the BCD digit B3 B2 B1 B0, one per excess-3 output bit E3 E2 E1 E0 (the digit plus 3). Cells 0–9 hold the outputs; cells 10–15 are don't-cares X.")


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

    s.step(f"The binary input b3 b2 b1 b0 = {sup(B)} enters. Each Gray bit XORs two neighbouring binary bits; the three XORs work at once.",
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
                  "First: a binary → Gray converter (three independent XORs). Second: a Gray → binary converter (a ripple of XORs). The input is 1011.")


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
    s.step(f"Over the four selects Y reads {' '.join(map(str, ys))}: the data inputs are the truth table, so Y = S1 ⊕ S0.",
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
    s.step("Row x′ holds minterms 0–3 (x = 0), row x holds 4–7; each column is one value of yz. Ring row x′'s 1s: 0, 1, 3.",
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
    s.step(f"Wire the residues: I0 = {names[0]}, I1 = {names[1]}, I2 = {names[2]}, I3 = {names[3]}, y on S1, z on S0. One 4:1 MUX plus an inverter realises f.",
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
    s.step("2:1 MUXes with 0 and 1 make NOT and AND, so they are complete. Read any constant cascade from its truth table: it may be NAND, not OR.",
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
    s.step("The OR collects minterms 1, 2, 4, 7: S = A ⊕ B ⊕ C, the full-adder sum. Any n-variable function is an n:2ⁿ decoder plus an OR.",
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
        s.step(f"Address A5…A0 = {sup(ab[:3])} {sup(ab[3:])}: the top decoder enables leaf {k} only; that leaf decodes {sup(ab[3:])} = {lo} and raises its output {lo}, D{out}.",
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
    P = s.block("pe", x, y, w, h, left=["D3", "D2", "D1", "D0"], right=["X1", "X0", "V"], title="4:2", title_xy=(x + w / 2 + 4, y + h / 2))
    for j in range(4):
        i = 3 - j
        py = P[f"D{i}"][1]
        s.box(f"hl{i}", x - s.v(116, 92), py - 15, s.v(78, 64), 30, tone="accent", fill="accent", hidden=True)
        s.text(f"d{i}", x - s.v(46, 34), py, f"D{i} = ?", anchor="end", mono=True)
        s.line(f"wd{i}", [[x - s.v(38, 28), py], [x, py]])
    for nm in ["X1", "X0", "V"]:
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
        load += [(f"v{nm}", {"text": f"{nm} = ?", "tone": "ink"}) for nm in ["X1", "X0", "V"]]
        load += [(f"w{nm}", {"tone": "ink"}) for nm in ["X1", "X0", "V"]]
        first = True
        for i in range(3, -1, -1):
            pre = f"Input D3 D2 D1 D0 = {sup(pat)}. " if first else ""
            pats = (load + [("st", {"text": f"input D3 D2 D1 D0 = {sup(pat)}", "tone": "ink"})]) if first else []
            pats += [(f"hl{j}", {"hidden": j != i}) for j in range(4)]
            first = False
            if d[i]:
                lower = [j for j in range(i - 1, -1, -1)]
                pats += [(f"d{j}", {"opacity": 0.4}) for j in lower] + [(f"wd{j}", {"opacity": 0.4}) for j in lower]
                pats += [(f"wd{i}", {"tone": "accent"})]
                pats += [("vX1", {"text": f"X1 = {code[0]}", "tone": tv(code[0])}), ("vX0", {"text": f"X0 = {code[1]}", "tone": tv(code[1])}),
                         ("vV", {"text": "V = 1", "tone": "success"}), ("wX1", {"tone": tv(code[0])}), ("wX0", {"tone": tv(code[1])}), ("wV", {"tone": "success"}),
                         ("st", {"text": f"{sup(pat)}: D{i} wins → code {sup(code)}, V = 1", "tone": "accent"})]
                ign = f"; {', '.join(f'D{j}' for j in lower if d[j])} ignored" if any(d[j] for j in lower) else ""
                s.step(f"{pre}D{i} = 1 is the highest active input, so it wins: X1X0 = {sup(code)} ({i} in binary), V = 1{ign}.", *pats)
                break
            if i > 0:
                s.step(f"{pre}D{i} = 0, so look at the next lower input.", *pats)
            else:
                pats += [("vX1", {"text": "X1 = 0", "tone": "muted"}), ("vX0", {"text": "X0 = 0", "tone": "muted"}),
                         ("vV", {"text": "V = 0", "tone": "danger"}), ("wV", {"tone": "muted"}),
                         ("st", {"text": "no input active → V = 0", "tone": "danger"})]
                assert code == [0, 0] and valid == 0
                s.step(f"{pre}D0 = 0 too: no input is active, so V = 0. The code 00 is then meaningless; V tells it apart from D0 = 1.", *pats)
    s.step("The rule: scan from D3 down and output the index of the first 1; V = 1 when any input is 1. Lower inputs then never matter.",
           *[(f"hl{j}", {"hidden": True}) for j in range(4)], ("st", {"text": "first 1 from the top wins", "tone": "accent"}))
    return s.done("A 4-to-2 priority encoder scanning its inputs", (W, 300), (NW, 300),
                  "A 4:2 priority encoder with inputs D3 (highest priority) to D0, code outputs X1 X0 and a valid flag V. Several input patterns follow.")


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
    s.step("G = A3B3′ + x3A2B2′ + x3x2A1B1′ + x3x2x1A0B0′ (xᵢ = Aᵢ ⊙ Bᵢ); L swaps A and B; E = x3x2x1x0. The MSB decides unless it ties.",
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
    s.step(f"The root now gives {r3}. One more XOR with the received P: F = {r3} ⊕ {P} = {E}. The 9 bits hold {sum(recv) + P} ones, odd, so the error flag F rises.",
           ("v3", {"text": f"p′ = {r3}", "tone": tv(r3)}), ("fin", {"hidden": False, "tone": "danger"}), ("wt", {"hidden": False, "tone": tv(r3)}),
           ("wE", {"hidden": False, "tone": "danger"}), ("vE", {"text": f"F = {E}", "tone": "danger"}))
    s.step("One flipped bit changes the count of 1s by one and is caught; two flips cancel. Parity detects every odd number of errors, no even one.",
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
    s.step(f"Size: 2³ × 6 = {cl.rom_size(3, 6)[2]} bits. Q1 is always 0 and Q0 = A0, so only 4 columns (32 bits) need storing (proved in Sizing below).",
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
    allrows = list(cl.rows(V3))
    # Rows 000–101 (A or B is 0) all fail the same way, so they share one step.
    for grp in ([0, 1, 2, 3, 4, 5], [6], [7]):
        for m in grp:
            env = allrows[m]
            g = cl.evaluate(net, env)
            b = cl.evaluate(net, env, {"p": 1})
            differ = g["f"] != b["f"]
            assert differ == (m in tests)
            if differ:
                diffs.append(m)
            cur[m + 1] = [sup([env[v] for v in V3]), str(g["f"]), str(b["f"])]
            if len(grp) > 1:
                assert g["p"] == 1 and not differ  # not activated
        m = grp[-1]  # the circuits show the last row of the group
        env = allrows[m]
        g = cl.evaluate(net, env)
        b = cl.evaluate(net, env, {"p": 1})
        differ = g["f"] != b["f"]
        abc = sup([env[v] for v in V3])
        if len(grp) > 1:
            cap = (f"Rows {format(grp[0], '03b')}–{format(grp[-1], '03b')} (A or B is 0): good p = (AB)′ = 1, the stuck value, "
                   f"so the fault is not activated; all {len(grp)} rows agree.")
        elif differ:
            cap = f"A B C = {' '.join(abc)}: good p = 0, f = (0·1)′ = 1; faulty p = 1, f = (1·1)′ = 0. The outputs differ: a test."
        else:
            assert g["p"] == 0
            cap = f"A B C = {' '.join(abc)}: good p = 0 differs from the stuck 1, but C = 0 forces f = 1 in both circuits, so nothing propagates."
        pats = []
        for tag, val in (("G", g), ("F", b)):
            pats += [(f"{tag}i{v}", {"text": f"{v}={env[v]}", "tone": tv(env[v])}) for v in V3]
            pats += [(f"{tag}w{v}", {"tone": tv(env[v])}) for v in V3]
            pats += [(f"{tag}wp", {"tone": "danger" if tag == "F" else tv(val["p"])}), (f"{tag}vp", {"text": f"p={val['p']}", "tone": "danger" if tag == "F" else tv(val["p"])})]
            pats += [(f"{tag}wf", {"tone": tv(val["f"])}), (f"{tag}vf", {"text": f"f={val['f']}", "tone": ("danger" if differ else tv(val["f"])) if tag == "F" else tv(val["f"])})]
        hl = [[r + 1, c] for r in grp for c in range(3)] if differ else [[r + 1, 0] for r in grp]
        pats += [("tt", {"rows": [r[:] for r in cur], "highlight": hl})]
        pats += [("st", {"text": "outputs differ: fault detected" if differ else "outputs agree", "tone": "danger" if differ else "muted"})]
        s.step(cap, *pats)
    assert diffs == [7]
    s.step(f"Only {format(diffs[0], '03b')} differs: A = B = 1 activates (good p = 0), C = 1 propagates. That one vector is the test.",
           ("tt", {"highlight": [[diffs[0] + 1, 0], [diffs[0] + 1, 1], [diffs[0] + 1, 2]]}), ("st", {"text": "test vector: A = B = C = 1", "tone": "accent"}))
    return s.done("Injecting a stuck-at-1 fault and finding the test vector", (W, 360), (NW, 580),
                  "Two copies of the circuit p = (AB)′, f = (p·C)′. The lower copy has line p stuck at 1. Every input row is applied to both copies.")


# ── Scenes added after the review ───────────────────────────────────────────

def lv(g, f):
    """A line's value in the good and the faulty circuit, written good/faulty."""
    return f"{g}/{f}"


def gf_tone(g, f):
    return "danger" if g != f else tv(g)


@scene
def mux_enable_expand(L):
    s = S(L)
    W, NW = 680, 360
    data = [0, 1, 1, 0, 1, 0, 0, 1]  # I0 … I7
    ins = [f"I{k}" for k in range(8)]
    net = [("ya", "MUX", {"d": ins[:4], "s": ["S1", "S0"], "en": "~S2"}),
           ("yb", "MUX", {"d": ins[4:], "s": ["S1", "S0"], "en": "S2"}),
           ("Y", "OR", ["ya", "yb"])]
    for sel in range(8):
        for hot in range(8):
            env = {f"I{i}": int(i == hot) for i in range(8)}
            env.update(dict(zip(["S2", "S1", "S0"], cl.bits_of(sel, 3))))
            v = cl.evaluate(net, env)
            assert v["Y"] == int(hot == sel) and (v["ya"] if sel >= 4 else v["yb"]) == 0
    s.head("An 8:1 MUX from two 4:1 MUXes with enables", "8:1 from two 4:1 MUXes", W, NW)
    x, w, h = s.v(250, 120), s.v(110, 92), 140
    ys = {"a": s.v(86, 86), "b": s.v(276, 286)}
    pins = {}
    for t, lo, en in (("a", 0, "S2′"), ("b", 4, "S2")):
        y = ys[t]
        P = s.block(f"m{t}", x, y, w, h, left=[f"I{k}" for k in range(4)], right=["Y"], top=["EN"], bottom=["S1 S0"],
                    title=f"MUX {t.upper()}", title_xy=(x + w / 2 + 4, y + h / 2 - 4))
        pins[t] = P
        for k in range(4):
            i = lo + k
            py = P[f"I{k}"][1]
            s.text(f"d{i}", x - s.v(36, 26), py, f"I{i} = {data[i]}", s.v(13, 12), anchor="end", mono=True, tone=tv(data[i]))
            s.line(f"wd{i}", [[x - s.v(32, 22), py], [x, py]], tone=tv(data[i]))
        ex = P["EN"][0]
        s.line(f"wen{t}", [[ex, y - 16], [ex, y]])
        s.text(f"en{t}", ex, y - 26, f"EN = {en}", s.v(13, 12), anchor="middle", mono=True)
    gx, gw, gh = s.v(470, 250), s.v(56, 46), 70
    ya, yb = pins["a"]["Y"], pins["b"]["Y"]
    gy = round((ya[1] + yb[1]) / 2 - gh / 2, 2)
    gp, go = s.gate("or", gx, gy, gw, gh, "or")
    s.wire("wya", ya, gp[0], s.v(420, 230))
    s.wire("wyb", yb, gp[1], s.v(430, 238))
    s.text("vya", ya[0] + s.v(30, 14), ya[1] - 12, "", s.v(13, 12), anchor="start", mono=True)
    s.text("vyb", yb[0] + s.v(30, 14), yb[1] + 12, "", s.v(13, 12), anchor="start", mono=True)
    s.line("wy", [go, [go[0] + s.v(24, 18), go[1]]])
    s.text("vy", s.v(go[0] + 30, go[0] - 20), s.v(go[1], go[1] + 52), "Y", s.v(15, 13), anchor=s.v("start", "middle"), mono=True, weight="bold")
    s.text("sel", s.v(W / 2, NW / 2), s.v(472, 482), "S1 S0 go to both MUXes", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.step("Two 4:1 MUXes share S1 S0. MUX A takes I0–I3 and is enabled by S2′; MUX B takes I4–I7 and is enabled by S2.",
           ("ena", {"tone": "accent"}), ("enb", {"tone": "accent"}))
    for sel in (0b010, 0b110, 0b101, 0b011):
        sb = cl.bits_of(sel, 3)
        env = {f"I{i}": data[i] for i in range(8)}
        env.update(dict(zip(["S2", "S1", "S0"], sb)))
        v = cl.evaluate(net, env)
        on, off = ("a", "b") if sb[0] == 0 else ("b", "a")
        assert v["Y"] == data[sel] and v["y" + off] == 0 and v["y" + on] == data[sel]
        lo = 0 if on == "a" else 4
        pats = [(f"wd{i}", {"tone": "accent" if i == sel else tv(data[i]), "opacity": 1 if lo <= i < lo + 4 else 0.35}) for i in range(8)]
        pats += [(f"d{i}", {"opacity": 1 if lo <= i < lo + 4 else 0.35, "tone": "accent" if i == sel else tv(data[i])}) for i in range(8)]
        pats += [(f"m{on}", {"tone": "accent"}), (f"m{off}", {"tone": "muted"})]
        pats += [("ena", {"text": f"EN = S2′ = {1 - sb[0]}", "tone": tv(1 - sb[0])}), ("enb", {"text": f"EN = S2 = {sb[0]}", "tone": tv(sb[0])}),
                 ("wena", {"tone": tv(1 - sb[0])}), ("wenb", {"tone": tv(sb[0])})]
        pats += [("wya", {"tone": tv(v["ya"])}), ("wyb", {"tone": tv(v["yb"])}),
                 ("vya", {"text": f"{v['ya']}", "tone": tv(v["ya"])}), ("vyb", {"text": f"{v['yb']}", "tone": tv(v["yb"])}),
                 ("wy", {"tone": tv(v["Y"])}), ("vy", {"text": f"Y={v['Y']}", "tone": tv(v["Y"])}),
                 ("sel", {"text": f"S2 S1 S0 = {sup(sb)} → I{sel}"})]
        k = sel - lo
        cap = (f"S2 S1 S0 = {sup(sb)}: S2 = {sb[0]} enables MUX {on.upper()}, which passes its input {k} (I{sel} = {data[sel]}); "
               f"MUX {off.upper()} outputs 0. Y = {data[sel]}.")
        s.step(cap, *pats)
    s.step("Y = S2′·MUX A + S2·MUX B: a disabled MUX outputs 0, so the OR passes the enabled one. Two 4:1 MUXes and an OR make an 8:1.",
           *[(f"wd{i}", {"tone": tv(data[i]), "opacity": 1}) for i in range(8)], *[(f"d{i}", {"opacity": 1, "tone": tv(data[i])}) for i in range(8)],
           ("ma", {"tone": "ink"}), ("mb", {"tone": "ink"}), ("sel", {"text": "8:1 = two 4:1 + OR"}))
    return s.done("An 8-to-1 multiplexer from two enabled 4-to-1 multiplexers", (W, 500), (NW, 510),
                  "Two 4:1 MUXes with enable inputs: MUX A holds I0–I3, MUX B holds I4–I7. S2 picks the MUX through the enables; an OR joins the outputs.")


@scene
def address_decoding(L):
    s = S(L)
    W, NW = 700, 360
    KB = 1024
    s.head("Address decoding: a 2:4 decoder picks one of four 1 KB chips", "Address decoding, 4 × 1 KB", W, NW)
    pitch, ch, cy0 = 76, 56, 76
    rows_c = [cy0 + pitch * k + ch / 2 for k in range(4)]
    dx, dw = s.v(150, 74), s.v(90, 62)
    dy = rows_c[0] - pitch / 2
    P = s.block("dec", dx, dy, dw, pitch * 4, left=["A11", "A10"], right=[f"Y{k}" for k in range(4)], title="2:4", title_xy=(dx + dw / 2, dy + 2 * pitch + 30))
    for k in range(4):
        assert abs(P[f"Y{k}"][1] - rows_c[k]) < 0.01
    for j, nm in enumerate(["A11", "A10"]):
        py = P[nm][1]
        s.text(f"a{j}", dx - s.v(30, 8), py, f"{nm} = ?", s.v(13, 12), anchor="end", mono=True)
        s.line(f"wa{j}", [[dx - s.v(26, 6), py], [dx, py]])
    cx, cw = s.v(380, 170), s.v(170, 156)
    bus = cx + cw + s.v(30, 18) if s.wd else None
    for k in range(4):
        y = cy0 + pitch * k
        lo, hi = k * KB, k * KB + KB - 1
        s.box(f"c{k}", cx, y, cw, ch)
        s.text(f"cn{k}", cx + 8, y + 17, f"chip {k} (1 KB)", s.v(14, 13), anchor="start", weight="bold")
        s.text(f"cr{k}", cx + 8, y + 39, f"0x{lo:03X}–0x{hi:03X}", s.v(13, 12), anchor="start", mono=True)
        s.line(f"cs{k}", [[dx + dw, rows_c[k]], [cx, rows_c[k]]], tone="muted")
        if s.wd:
            s.line(f"ab{k}", [[bus, rows_c[k]], [cx + cw, rows_c[k]]], tone="info")
    s.text("csl", (dx + dw + cx) / 2, cy0 - 16, "chip selects", s.v(13, 12), anchor="middle", tone="muted")
    if s.wd:
        s.line("bus", [[bus, cy0 - 20], [bus, rows_c[3]]], tone="info")
        s.text("busl", bus, cy0 - 30, "A9…A0", 13, anchor="middle", mono=True, tone="info")
    else:
        s.text("busl", cx + cw / 2, cy0 - 32, "A9…A0 to every chip", 12, anchor="middle", mono=True, tone="info")
    s.text("st", s.v(W / 2, NW / 2), 384, "", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.text("st2", s.v(W / 2, NW / 2), 408, "", s.v(14, 13), anchor="middle")
    s.step("Each 1 KB chip needs 10 address lines (2¹⁰ = 1024): A9…A0 go to every chip. A11 A10 drive a 2:4 decoder whose outputs are chip selects.",
           ("dec", {"tone": "accent"}), ("busl", {"tone": "accent"}))
    for addr in (0x000, 0x5A3, 0x800, 0xFFF):
        hi2 = cl.bits_of(addr >> 10, 2)
        sel = cl.decoder(hi2)
        k = sel.index(1)
        off = addr & (KB - 1)
        assert k * KB + off == addr and sum(sel) == 1
        lo, hi = k * KB, k * KB + KB - 1
        assert lo <= addr <= hi
        b = format(addr, "012b")
        pats = [("dec", {"tone": "ink"}), ("busl", {"tone": "info"})]
        pats += [(f"a{j}", {"text": f"{['A11', 'A10'][j]} = {hi2[j]}", "tone": tv(hi2[j])}) for j in range(2)]
        pats += [(f"wa{j}", {"tone": tv(hi2[j])}) for j in range(2)]
        pats += [(f"cs{j}", {"tone": "accent" if sel[j] else "muted"}) for j in range(4)]
        pats += [(f"c{j}", {"tone": "accent" if sel[j] else "ink", "fill": "accent" if sel[j] else "none"}) for j in range(4)]
        pats += [("st", {"text": f"0x{addr:03X} = {b[:2]} {b[2:]}"}), ("st2", {"text": f"chip {k}, byte 0x{off:03X}", "tone": "accent"})]
        s.step(f"0x{addr:03X}: A11 A10 = {sup(hi2)} raises Y{k}, selecting chip {k} (0x{lo:03X}–0x{hi:03X}); A9…A0 = 0x{off:03X} picks the byte in it.", *pats)
    s.step("Chip k holds addresses k·0x400 to k·0x400 + 0x3FF: the top two bits pick the chip, the low ten the byte. 4 × 1 KB = 4 KB.",
           *[(f"c{j}", {"tone": "ink", "fill": "none"}) for j in range(4)], *[(f"cs{j}", {"tone": "muted"}) for j in range(4)],
           ("st2", {"text": "4 chips × 1 KB = 4 KB (12 address bits)", "tone": "ink"}))
    return s.done("A 2-to-4 decoder selecting one of four 1 KB memory chips", (W, 424), (NW, 424),
                  "A 4 KB memory from four 1 KB chips. The 12-bit address A11…A0 splits: A11 A10 go to a 2:4 decoder that enables one chip; A9…A0 go to all chips.")


@scene
def priority_mux(L):
    s = S(L)
    W, NW = 680, 360
    V = ["A", "B", "C"]
    dx1, dx0 = ["0", "1", "1", "1"], ["C", "0", "1", "1"]
    net = [("X1", "MUX", {"d": dx1, "s": ["A", "B"]}), ("X0", "MUX", {"d": dx0, "s": ["A", "B"]})]
    for env in cl.rows(V):
        code, valid = cl.priority_encoder([0, env["C"], env["B"], env["A"]])  # A → 11, B → 10, C → 01
        v = cl.evaluate(net, env)
        assert [v["X1"], v["X0"]] == code
    assert cl.truth(net, V, "X1") == bl.tt("A + B", V) and cl.truth(net, V, "X0") == bl.tt("A + B'C", V)
    s.head("A priority encoder on two 4:1 MUXes (GATE 1992)", "Priority encoder on MUXes (1992)", W, NW)
    w, h = s.v(100, 96), 150
    pos = {"X1": (s.v(150, 130), 76), "X0": (s.v(440, 130), s.v(76, 316))}
    for nm, d in (("X1", dx1), ("X0", dx0)):
        x, y = pos[nm]
        P = s.block(f"m{nm}", x, y, w, h, left=[f"I{k}" for k in range(4)], right=["Y"], bottom=["S1", "S0"], title=f"MUX {nm}", title_xy=(x + w / 2 + 6, y + 56))
        for k in range(4):
            py = P[f"I{k}"][1]
            s.text(f"d{nm}{k}", x - 30, py, d[k], s.v(14, 13), anchor="end", mono=True, weight="bold")
            s.line(f"wd{nm}{k}", [[x - 24, py], [x, py]])
        for j, sv in enumerate(["A", "B"]):
            px = P[["S1", "S0"][j]][0]
            s.line(f"ws{nm}{j}", [[px, y + h], [px, y + h + 18]])
            s.text(f"s{nm}{j}", px, y + h + 32, sv, s.v(14, 13), anchor="middle", mono=True)
        oy = P["Y"][1]
        s.line(f"wo{nm}", [[x + w, oy], [x + w + 24, oy]])
        s.text(f"v{nm}", x + w + 30, oy, nm, s.v(15, 13), anchor="start", mono=True, weight="bold")
    s.text("st", s.v(W / 2, NW / 2), s.v(300, 540), "", s.v(15, 14), anchor="middle", mono=True, weight="bold")
    s.text("st2", s.v(W / 2, NW / 2), s.v(326, 564), "", s.v(14, 13), anchor="middle")
    s.step("A has the top priority, then B, then C: A → 11, B → 10, C → 01, none → 00. A and B drive the selects of both MUXes; C is a data input.",
           *[(f"s{nm}{j}", {"tone": "accent"}) for nm in ("X1", "X0") for j in range(2)])
    names = {3: "A", 2: "B", 1: "C"}
    for abc in (0b000, 0b001, 0b011, 0b010, 0b101):
        env = dict(zip(V, cl.bits_of(abc, 3)))
        v = cl.evaluate(net, env)
        sel = env["A"] * 2 + env["B"]
        code, valid = cl.priority_encoder([0, env["C"], env["B"], env["A"]])
        win = names.get(cl.num(code)) if valid else None
        val = {"X1": v["X1"], "X0": v["X0"]}
        pats = [(f"s{nm}{j}", {"text": f"{V[j]}={env[V[j]]}", "tone": tv(env[V[j]])}) for nm in ("X1", "X0") for j in range(2)]
        pats += [(f"ws{nm}{j}", {"tone": tv(env[V[j]])}) for nm in ("X1", "X0") for j in range(2)]
        for nm, d in (("X1", dx1), ("X0", dx0)):
            pats += [(f"wd{nm}{k}", {"tone": "accent" if k == sel else "ink"}) for k in range(4)]
            pats += [(f"d{nm}{k}", {"text": (f"C={env['C']}" if d[k] == "C" else d[k]), "tone": "accent" if k == sel else "ink"}) for k in range(4)]
            pats += [(f"wo{nm}", {"tone": tv(val[nm])}), (f"v{nm}", {"text": f"{nm}={val[nm]}", "tone": tv(val[nm])})]
        pats += [("st", {"text": f"A B C = {sup(cl.bits_of(abc, 3))} → X1 X0 = {sup(code)}"}),
                 ("st2", {"text": f"{win} wins" if win else "no input active", "tone": "accent" if win else "muted"})]
        how = {None: "no input is active, so the code is 00", "A": "A wins (B and C are ignored)", "B": "B wins" + (", C is ignored" if env["C"] else ""), "C": "only C is active"}[win]
        xs = f"I{sel} = {dx0[sel]}" + (f" = {env['C']}" if dx0[sel] == "C" else "")
        s.step(f"A B C = {' '.join(map(str, cl.bits_of(abc, 3)))}: the selects read AB = {sup(cl.bits_of(sel, 2))}; X1 takes I{sel} = {dx1[sel]}, X0 takes {xs}: {how}.", *pats)
    s.step("X1 = A + B (data 0 1 1 1) and X0 = A + B′C (data C 0 1 1): two 4:1 MUXes, A and B on the selects, C as a data input.",
           *[(f"wd{nm}{k}", {"tone": "ink"}) for nm in ("X1", "X0") for k in range(4)],
           *[(f"d{nm}{k}", {"text": d[k], "tone": "ink"}) for nm, d in (("X1", dx1), ("X0", dx0)) for k in range(4)],
           ("st", {"text": "X1 = A + B,  X0 = A + B′C"}), ("st2", {"text": "", "tone": "ink"}))
    return s.done("A 3-input priority encoder built from two 4-to-1 multiplexers", (W, 344), (NW, 580),
                  "Inputs A > B > C (A highest), outputs X1 X0. Each output is one 4:1 MUX with A on S1 and B on S0; the data inputs come from the truth table.")


def cmp_chip(a, b, cin):
    """One 4-bit comparator chip with cascade inputs (G, E, L): its own nibbles decide unless they tie."""
    if a > b:
        return (1, 0, 0)
    if a < b:
        return (0, 0, 1)
    return cin


@scene
def comparator_chain(L):
    s = S(L)
    W, NW = 700, 360
    for a in range(256):
        for b in range(256):
            lo = cmp_chip(a & 15, b & 15, (0, 1, 0))
            assert cmp_chip(a >> 4, b >> 4, lo) == cl.compare(a, b)
    s.head("Two 4-bit comparators cascaded into an 8-bit comparator", "8-bit comparator from two chips", W, NW)
    cw, chh, y = s.v(180, 110), 132, 116
    xs = {"lo": s.v(110, 40), "hi": s.v(420, 200)}
    pins = {}
    for t in ("lo", "hi"):
        x = xs[t]
        pins[t] = s.block(f"c{t}", x, y, cw, chh, left=["G in", "E in", "L in"], right=["G", "E", "L"], top=["A", "B"],
                          title=s.v("low chip" if t == "lo" else "high chip", "low" if t == "lo" else "high"), title_xy=(x + cw / 2 + s.v(0, 4), y + chh / 2 + 22))
        for j, nm in enumerate(["A", "B"]):
            px = pins[t][nm][0]
            ty = s.v(y - 30, y - 30 - 20 * (1 - j))
            s.line(f"w{t}{nm}", [[px, ty + 8], [px, y]])
            s.text(f"v{t}{nm}", px, ty, "", s.v(13, 12), anchor="middle", mono=True)
        s.text(f"n{t}", x + cw / 2, y + chh + 18, s.v("bits 3–0" if t == "lo" else "bits 7–4", "bits 3–0" if t == "lo" else "bits 7–4"), s.v(13, 12), anchor="middle", tone="muted")
    for j, (nm, c) in enumerate(zip(["G in", "E in", "L in"], (0, 1, 0))):
        py = pins["lo"][nm][1]
        s.text(f"k{j}", xs["lo"] - 14, py, str(c), s.v(13, 12), anchor="end", mono=True, tone=tv(c))
        s.line(f"wk{j}", [[xs["lo"] - 10, py], [xs["lo"], py]], tone=tv(c))
    mid = (xs["lo"] + cw + xs["hi"]) / 2
    for j, nm in enumerate(["G", "E", "L"]):
        a, b = pins["lo"][nm], pins["hi"][nm + " in"]
        assert abs(a[1] - b[1]) < 0.01
        s.line(f"m{j}", [a, b])
        s.text(f"vm{j}", mid, a[1] - 10, "", s.v(13, 12), anchor="middle", mono=True)
        o = pins["hi"][nm]
        s.line(f"o{j}", [o, [o[0] + s.v(24, 14), o[1]]])
        s.text(f"vo{j}", o[0] + s.v(30, 18), o[1], nm, s.v(14, 12), anchor="start", mono=True, weight="bold")
    s.text("st", s.v(W / 2, NW / 2), s.v(300, 300), "", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.text("st2", s.v(W / 2, NW / 2), s.v(324, 324), "", s.v(14, 13), anchor="middle")
    s.step("The low chip compares bits 3–0 with cascade inputs G, E, L = 0, 1, 0; its G, E, L feed the high chip's cascade inputs.",
           ("clo", {"tone": "accent"}), *[(f"wk{j}", {"tone": "accent"}) for j in range(3)])
    for a, b in ((0x5A, 0x3F), (0x5A, 0x5C), (0x5A, 0x5A)):
        al, bl_, ah, bh = a & 15, b & 15, a >> 4, b >> 4
        lo = cmp_chip(al, bl_, (0, 1, 0))
        hi = cmp_chip(ah, bh, lo)
        assert hi == cl.compare(a, b)
        word = {(1, 0, 0): "G", (0, 1, 0): "E", (0, 0, 1): "L"}
        rel = {"G": ">", "E": "=", "L": "<"}
        pats = [("clo", {"tone": "accent"}), ("chi", {"tone": "ink"})]
        pats += [("vloA", {"text": f"A={format(al, '04b')}"}), ("vloB", {"text": f"B={format(bl_, '04b')}"}),
                 ("vhiA", {"text": f"A={format(ah, '04b')}"}), ("vhiB", {"text": f"B={format(bh, '04b')}"})]
        pats += [(f"m{j}", {"tone": tv(lo[j])}) for j in range(3)] + [(f"vm{j}", {"text": str(lo[j]), "tone": tv(lo[j])}) for j in range(3)]
        pats += [(f"o{j}", {"tone": "ink"}) for j in range(3)] + [(f"vo{j}", {"text": ["G", "E", "L"][j], "tone": "ink"}) for j in range(3)]
        pats += [("st", {"text": f"A = {a >> 4:04b} {a & 15:04b}, B = {b >> 4:04b} {b & 15:04b}"}), ("st2", {"text": "", "tone": "ink"})]
        lw = word[lo]
        s.step(f"A = 0x{a:02X}, B = 0x{b:02X}. Low chip: {al:04b} {rel[lw]} {bl_:04b}, so it sends {lw} = 1 to the high chip's cascade inputs.", *pats)
        hw = word[hi]
        pats = [("clo", {"tone": "ink"}), ("chi", {"tone": "accent"})]
        pats += [(f"o{j}", {"tone": tv(hi[j])}) for j in range(3)] + [(f"vo{j}", {"text": f"{['G', 'E', 'L'][j]}={hi[j]}", "tone": tv(hi[j])}) for j in range(3)]
        pats += [("st2", {"text": f"0x{a:02X} {rel[hw]} 0x{b:02X}  ({a} {rel[hw]} {b})", "tone": "accent"})]
        if ah != bh:
            cap = f"High chip: {ah:04b} {rel[hw]} {bh:04b}, the nibbles differ, so it outputs {hw} = 1 and ignores its cascade inputs: {a} {rel[hw]} {b}."
        else:
            cap = f"High chip: {ah:04b} = {bh:04b}, a tie, so it passes its cascade inputs: {hw} = 1, the low chip's verdict. {a} {rel[hw]} {b}."
        s.step(cap, *pats)
    s.step("The high chip decides unless its nibbles tie; then it copies the low chip's G, E, L. The lowest chip's cascade inputs are tied to 0, 1, 0.",
           ("clo", {"tone": "ink"}), ("chi", {"tone": "ink"}), ("st2", {"text": "more chips: chain them the same way", "tone": "ink"}))
    return s.done("Two 4-bit magnitude comparators cascaded into an 8-bit comparator", (W, 340), (NW, 340),
                  "An 8-bit comparator from two 4-bit chips. Each chip has outputs G, E, L and cascade inputs; the low chip's outputs drive the high chip's cascade inputs.")


@scene
def equality_xnor(L):
    s = S(L)
    W, NW = 640, 360
    vs = [f"A{i}" for i in range(3, -1, -1)] + [f"B{i}" for i in range(3, -1, -1)]
    net = [(f"x{i}", "XNOR", [f"A{i}", f"B{i}"]) for i in range(4)] + [("E", "AND", [f"x{i}" for i in range(3, -1, -1)])]
    for m in range(256):
        env = dict(zip(vs, cl.bits_of(m, 8)))
        assert cl.evaluate(net, env)["E"] == cl.compare(m >> 4, m & 15)[1]
    s.head("4-bit equality: four XNORs and an AND", "Equality: XNORs + AND", W, NW)
    pitch, gh = 74, 50
    xg, gw = s.v(200, 96), s.v(54, 46)
    xa, aw, ah = s.v(420, 230), s.v(60, 50), 170
    centers = {i: 84 + pitch * (3 - i) for i in range(4)}
    ay = round((centers[3] + centers[0]) / 2 - ah / 2, 2)
    ap, ao = s.gate("and", xa, ay, aw, ah, "and", inputs=4)
    mids = {3: s.v(300, 180), 2: s.v(330, 200), 1: s.v(330, 200), 0: s.v(300, 180)}
    for k, i in enumerate((3, 2, 1, 0)):
        c = centers[i]
        gp, go = s.gate(f"g{i}", xg, c - gh / 2, gw, gh, "xnor")
        for j, nm in enumerate((f"A{i}", f"B{i}")):
            s.text(f"t{nm}", xg - s.v(34, 26), gp[j][1], f"{nm}=?", s.v(13, 12), anchor="end", mono=True)
            s.line(f"w{nm}", [[xg - s.v(30, 22), gp[j][1]], gp[j]])
        s.wire(f"wx{i}", go, ap[k], mids[i])
        s.text(f"vx{i}", go[0] + s.v(22, 14), c - 12, "", s.v(13, 12), anchor="middle", mono=True)
    s.line("wE", [ao, [ao[0] + s.v(24, 16), ao[1]]])
    s.text("vE", s.v(ao[0] + 30, ao[0] - 10), s.v(ao[1], ay + ah + 20), "E", s.v(15, 13), anchor=s.v("start", "middle"), mono=True, weight="bold")
    s.text("st", s.v(W / 2, NW / 2), s.v(390, 410), "", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.step("Each XNOR gives xᵢ = Aᵢ ⊙ Bᵢ, which is 1 exactly when the two bits are equal. The AND gives E = x3x2x1x0.",
           *[(f"g{i}", {"tone": "accent"}) for i in range(4)])
    for a, b in ((0b1011, 0b1011), (0b1011, 0b1001), (0b0110, 0b1001)):
        A, B = cl.bits_of(a, 4), cl.bits_of(b, 4)
        env = dict(zip(vs, A + B))
        v = cl.evaluate(net, env)
        assert v["E"] == int(a == b)
        pats = [(f"g{i}", {"tone": tv(v[f"x{i}"]), "fill": fillv(v[f"x{i}"])}) for i in range(4)]
        for i in range(4):
            for nm in (f"A{i}", f"B{i}"):
                pats += [(f"t{nm}", {"text": f"{nm}={env[nm]}", "tone": tv(env[nm])}), (f"w{nm}", {"tone": tv(env[nm])})]
            pats += [(f"wx{i}", {"tone": tv(v[f"x{i}"])}), (f"vx{i}", {"text": f"x{i}={v[f'x{i}']}", "tone": tv(v[f"x{i}"])})]
        pats += [("wE", {"tone": tv(v["E"])}), ("vE", {"text": f"E={v['E']}", "tone": tv(v["E"])}),
                 ("st", {"text": f"A = {sup(A)}, B = {sup(B)} → E = {v['E']}"})]
        xs = "".join(str(v[f"x{i}"]) for i in range(3, -1, -1))
        bad = [i for i in range(3, -1, -1) if not v[f"x{i}"]]
        if not bad:
            cap = f"A = {sup(A)}, B = {sup(B)}: every pair is equal, so x3x2x1x0 = {xs} and the AND gives E = 1."
        elif len(bad) == 1:
            cap = f"A = {sup(A)}, B = {sup(B)}: only bit {bad[0]} differs, so x{bad[0]} = 0 and E = 0. One unequal pair is enough."
        else:
            cap = f"A = {sup(A)}, B = {sup(B)}: every pair differs, x3x2x1x0 = {xs}, so E = 0."
        s.step(cap, *pats)
    s.step("E = (A3 ⊙ B3)(A2 ⊙ B2)(A1 ⊙ B1)(A0 ⊙ B0): n XNORs and one n-input AND test n-bit equality.",
           ("st", {"text": "E = x3 x2 x1 x0"}))
    return s.done("A 4-bit equality comparator from XNOR gates and an AND gate", (W, 410), (NW, 430),
                  "Two 4-bit numbers A and B. Each bit pair goes to an XNOR gate; the four XNOR outputs go to a 4-input AND, whose output E is 1 when A = B.")


@scene
def rom_expansion(L):
    s = S(L)
    W, NW = 680, 360
    KB = 1024
    rows_n, cols_n = 4 * KB // KB, 16 // 4
    assert (rows_n, cols_n, rows_n * cols_n) == (4, 4, 16)
    s.head("4K × 16 from sixteen 1K × 4 chips", "4K × 16 from 1K × 4 chips", W, NW)
    pitch, ch = s.v(70, 64), s.v(46, 42)
    gx, cw, cp = s.v(200, 116), s.v(96, 52), s.v(112, 60)
    y0 = 70
    rc = [y0 + pitch * r + ch / 2 for r in range(4)]
    dx, dw = s.v(60, 36), s.v(84, 60)
    dy = rc[0] - pitch / 2
    P = s.block("dec", dx, dy, dw, pitch * 4, left=["A11", "A10"], right=[f"Y{k}" for k in range(4)], title="2:4", title_xy=(dx + dw / 2 - s.v(0, 4), dy + 2 * pitch + 30))
    for j, nm in enumerate(["A11", "A10"]):
        py = P[nm][1]
        if s.wd:
            s.text(f"a{j}", dx - 6, py, "", 13, anchor="end", mono=True)
    for r in range(4):
        assert abs(P[f"Y{r}"][1] - rc[r]) < 0.01
        s.line(f"rw{r}0", [[dx + dw, rc[r]], [gx, rc[r]]], tone="muted")
        for c in range(4):
            x = gx + cp * c
            s.box(f"k{r}{c}", x, y0 + pitch * r, cw, ch, s.v("1K × 4", "1K×4"), s.v(13, 12))
            if c:
                s.line(f"rw{r}{c}", [[x - cp + cw, rc[r]], [x, rc[r]]], tone="muted")
    names = [f"D{15 - 4 * c}–{12 - 4 * c}" for c in range(4)]
    ybot = y0 + pitch * 3 + ch
    for c in range(4):
        cx = gx + cp * c + cw / 2
        for r in range(3):
            s.line(f"cl{r}{c}", [[cx, y0 + pitch * r + ch], [cx, y0 + pitch * (r + 1)]], tone="muted")
        s.line(f"co{c}", [[cx, ybot], [cx, ybot + 16]], tone="muted")
        s.text(f"cn{c}", cx, ybot + 28, names[c], s.v(13, 12), anchor="middle", mono=True, weight="bold")
    s.text("bus", gx + (cp * 3 + cw) / 2, y0 - 22, "A9…A0 go to all 16 chips", s.v(13, 12), anchor="middle", tone="info")
    s.text("st", s.v(W / 2, NW / 2), s.v(392, 392), "", s.v(14, 13), anchor="middle", mono=True, weight="bold")
    s.text("st2", s.v(W / 2, NW / 2), s.v(416, 416), "", s.v(14, 13), anchor="middle")
    allk = [f"k{r}{c}" for r in range(4) for c in range(4)]
    s.step("4K words need 4K / 1K = 4 rows of chips; 16-bit words need 16 / 4 = 4 columns. 4 × 4 = 16 chips of 1K × 4.",
           *[(k, {"tone": "accent"}) for k in allk], ("st", {"text": "4 rows × 4 columns = 16 chips"}))
    s.step("Each row holds 1K words. A11 A10 drive a 2:4 decoder whose output Yr enables the four chips of row r; A9…A0 reach every chip.",
           *[(k, {"tone": "ink"}) for k in allk], ("dec", {"tone": "accent"}), ("st", {"text": "rows: words, columns: bits"}))
    for addr in (0x000, 0x5A3, 0xBFF, 0xC00):
        hi2 = cl.bits_of(addr >> 10, 2)
        sel = cl.decoder(hi2)
        r = sel.index(1)
        off = addr & (KB - 1)
        assert r * KB + off == addr
        pats = [("dec", {"tone": "ink"})]
        pats += [(f"k{rr}{c}", {"tone": "accent" if sel[rr] else "muted", "fill": "accent" if sel[rr] else "none"}) for rr in range(4) for c in range(4)]
        pats += [(f"rw{rr}{c}", {"tone": "accent" if sel[rr] else "muted"}) for rr in range(4) for c in range(4)]
        pats += [(f"co{c}", {"tone": "accent"}) for c in range(4)]
        if s.wd:
            pats += [(f"a{j}", {"text": f"{['A11', 'A10'][j]}={hi2[j]}", "tone": tv(hi2[j])}) for j in range(2)]
        pats += [("st", {"text": f"0x{addr:03X}: A11 A10 = {sup(hi2)}, A9…A0 = 0x{off:03X}"}), ("st2", {"text": f"row {r} drives D15…D0", "tone": "accent"})]
        s.step(f"0x{addr:03X}: A11 A10 = {sup(hi2)} enables row {r} (0x{r * KB:03X}–0x{r * KB + KB - 1:03X}); its four chips give 4 bits each of the 16-bit word.", *pats)
    s.step("Capacity: 4K × 16 = 64K bits = 16 chips × 4K bits. Rows multiply the words (decoder on the top bits), columns the width.",
           *[(k, {"tone": "ink", "fill": "none"}) for k in allk], *[(f"rw{rr}{c}", {"tone": "muted"}) for rr in range(4) for c in range(4)],
           *[(f"co{c}", {"tone": "muted"}) for c in range(4)], ("st", {"text": "4K × 16 = 65 536 bits"}), ("st2", {"text": "16 × (1K × 4)", "tone": "ink"}))
    assert 4 * KB * 16 == 16 * (KB * 4) == 65536
    return s.done("A 4K × 16 memory from a 4 × 4 array of 1K × 4 chips", (W, 432), (NW, 432),
                  "Sixteen 1K × 4 chips in 4 rows and 4 columns. A 2:4 decoder on A11 A10 enables one row; the four columns supply output bits D15–12, D11–8, D7–4, D3–0.")


@scene
def fault_reconvergent(L):
    s = S(L)
    W, NW = 640, 360
    V = ["A", "B", "C"]
    net = [("n", "NOT", ["A"]), ("g1", "AND", ["A", "B"]), ("g2", "AND", ["n", "C"]), ("f", "OR", ["g1", "g2"])]
    assert cl.truth(net, V, "f") == bl.tt("AB + A'C", V)
    stem = cl.tests_for(net, V, "f", "A", 0)
    assert stem == [0b101, 0b110]
    bd = [m for m, env in enumerate(cl.rows(V)) if env["B"] != env["C"]]
    assert sorted(set(cl.boolean_difference(net, V, "f", "A"))) == bd
    net_b = [("a1", "BUF", ["A"]), ("n", "NOT", ["A"]), ("g1", "AND", ["a1", "B"]), ("g2", "AND", ["n", "C"]), ("f", "OR", ["g1", "g2"])]
    branch = cl.tests_for(net_b, V, "f", "a1", 0)
    assert branch == [0b110, 0b111]
    s.head("A stem fault on two reconvergent paths (A s-a-0)", "Reconvergent fan-out: A s-a-0", W, NW)
    yB, yA, yC = 80, 110, 230
    xin, xj = s.v(70, 40), s.v(130, 70)
    xi, iw = s.v(190, 100), s.v(40, 34)
    xg, gw = s.v(300, 160), s.v(54, 46)
    xo, ow = s.v(440, 260), s.v(56, 46)
    g1p, g1o = s.gate("g1", xg, 50, gw, 90, "and")
    assert abs(g1p[0][1] - yB) < 0.01 and abs(g1p[1][1] - yA) < 0.01
    g2p, g2o = s.gate("g2", xg, 170, gw, 90, "and")
    assert abs(g2p[1][1] - yC) < 0.01
    yn = g2p[0][1]
    ip, io = s.gate("inv", xi, yn - 15, iw, 30, "not")
    op, oo = s.gate("or", xo, 125, ow, 80, "or")
    for nm, y in (("B", yB), ("A", yA), ("C", yC)):
        s.text(f"i{nm}", xin - 4, y, nm, s.v(14, 13), anchor="end", mono=True, weight="bold")
    s.line("wB", [[xin, yB], g1p[0]])
    s.line("wA", [[xin, yA], g1p[1]])
    s.line("wAb", [[xj, yA], [xj, yn], ip[0]])
    s.node("jA", xj, yA, 3.5, fill="ink")
    s.line("wn", [io, g2p[0]])
    s.line("wC", [[xin, yC], g2p[1]])
    s.wire("wg1", g1o, op[0], s.v(395, 220))
    s.wire("wg2", g2o, op[1], s.v(410, 234))
    s.line("wf", [oo, [oo[0] + s.v(24, 16), oo[1]]])
    s.text("vA", (xj + xg) / 2 + s.v(20, 10), yA - 13, "", s.v(13, 12), anchor="middle", mono=True)
    s.text("vn", (io[0] + xg) / 2, yn - 13, "", s.v(13, 12), anchor="middle", mono=True)
    s.text("vg1", g1o[0] + s.v(22, 16), g1o[1] - 13, "", s.v(13, 12), anchor="middle", mono=True)
    s.text("vg2", g2o[0] + s.v(22, 16), g2o[1] + 13, "", s.v(13, 12), anchor="middle", mono=True)
    s.text("vf", s.v(oo[0] + 30, oo[0] - 10), s.v(oo[1], 222), "f", s.v(14, 13), anchor=s.v("start", "middle"), mono=True, weight="bold")
    s.text("lg", s.v(W / 2, NW / 2), 292, "line values: good/faulty", s.v(13, 12), anchor="middle", tone="muted")
    s.text("st", s.v(W / 2, NW / 2), 318, "", s.v(14, 13), anchor="middle", weight="bold")
    s.step("f = AB + A′C. The stem A feeds g1 directly and g2 through an inverter. The fault: the stem A stuck-at-0, so both branches see 0.",
           ("jA", {"fill": "danger", "tone": "danger"}), ("wA", {"tone": "danger"}), ("wAb", {"tone": "danger"}))

    def frame(m):
        env = dict(zip(V, cl.bits_of(m, 3)))
        g = cl.evaluate(net, env)
        b = cl.evaluate(net, env, {"A": 0})
        pats = [(f"i{v}", {"text": f"{v}={env[v]}", "tone": tv(env[v])}) for v in V]
        pats += [("wB", {"tone": tv(env["B"])}), ("wC", {"tone": tv(env["C"])})]
        pats += [("wA", {"tone": gf_tone(g["A"], b["A"])}), ("wAb", {"tone": gf_tone(g["A"], b["A"])}), ("vA", {"text": lv(g["A"], b["A"]), "tone": gf_tone(g["A"], b["A"])})]
        for ln, w_ in (("n", "wn"), ("g1", "wg1"), ("g2", "wg2"), ("f", "wf")):
            pats += [(w_, {"tone": gf_tone(g[ln], b[ln])})]
            pats += [(f"v{ln}", {"text": (f"f = {lv(g[ln], b[ln])}" if ln == "f" else lv(g[ln], b[ln])), "tone": gf_tone(g[ln], b[ln])})]
        return g, b, pats

    g, b, pats = frame(0b111)
    assert (g["g1"], b["g1"], g["g2"], b["g2"], g["f"], b["f"]) == (1, 0, 0, 1, 1, 1)
    s.step("The obvious test, A B C = 1 1 1: activate A (good 1) and open g1 (B = 1). But C = 1 also opens g2 to the faulty A′ = 1.",
           *[p for p in pats if p[0] in ("iA", "iB", "iC", "wA", "wAb", "vA", "wB", "wC", "wn", "vn")])
    s.step("g1 = 1/0 and g2 = 0/1: the error and its complement reach the OR together, so f = 1/1. The two paths cancel; 111 is not a test.",
           *pats, ("st", {"text": "111: outputs agree, paths cancel", "tone": "muted"}))
    for m in (0b110, 0b101):
        g, b, pats = frame(m)
        assert g["f"] != b["f"]
        path = "g1 (C = 0 closes g2)" if m == 0b110 else "g2 (B = 0 closes g1)"
        s.step(f"A B C = {' '.join(format(m, '03b'))}: only one path is open, through {path}. f = {lv(g['f'], b['f'])}: the outputs differ, a test.",
               *pats, ("st", {"text": f"{format(m, '03b')}: outputs differ, detected", "tone": "danger"}))
    s.step("∂f/∂A = B ⊕ C, so the stem tests are A = 1, B ≠ C: 101 and 110 only. The branch into g1 alone has tests 110 and 111.",
           ("st", {"text": "stem A s-a-0: tests 101, 110", "tone": "accent"}))
    return s.done("A stem fault whose effects reconverge and cancel", (W, 334), (NW, 334),
                  "f = AB + A′C as g1 = AND(A, B), g2 = AND(A′, C), f = OR(g1, g2). Line A is stuck at 0. Each line shows good/faulty values.")


@scene
def fault_blocked(L):
    s = S(L)
    W, NW = 660, 360
    X = ["X1", "X2", "X3", "X4"]
    net = [("n1", "NAND", ["X1", "X2", "X3"]), ("o", "OR", ["n1", "X4"]), ("T", "AND", ["X3", "X4"]), ("out", "NOR", ["o", "T"])]
    assert cl.tests_for(net, X, "out", "T", 0) == []
    assert cl.truth(net, X, "out") == cl.truth(net, X, "out", {"T": 0})  # T is redundant
    act = [m for m, env in enumerate(cl.rows(X)) if cl.evaluate(net, env)["T"] == 1]
    assert act == [0b0011, 0b0111, 0b1011, 0b1111]
    assert all(cl.evaluate(net, env)["o"] == 1 for env in cl.rows(X) if env["X4"] == 1)
    s.head("T stuck-at-0 (IT 2007): activation blocks propagation", "T s-a-0 (IT 2007)", W, NW)
    xin = s.v(70, 40)
    j3, j4 = s.v(120, 64), s.v(95, 50)
    xg, gw = s.v(190, 96), s.v(54, 46)
    xo, ow = s.v(320, 190), s.v(54, 44)
    xn, nw = s.v(450, 270), s.v(60, 48)
    np_, no = s.gate("nand", xg, 50, gw, 90, "nand", inputs=3)
    yX = {"X1": np_[0][1], "X2": np_[1][1], "X3": np_[2][1], "X4": 270}
    tp, to = s.gate("and", xg, 205, gw, 50, "and")
    op, oo = s.gate("or", xo, round(no[1] - 70 / 3, 2), ow, 70, "or")
    rp, ro = s.gate("nor", xn, 125, nw, 80, "nor")
    for nm in X:
        s.text(f"i{nm}", xin - 4, yX[nm], f"{nm}=?", s.v(13, 12), anchor="end", mono=True)
    s.line("w1", [[xin, yX["X1"]], np_[0]])
    s.line("w2", [[xin, yX["X2"]], np_[1]])
    s.line("w3", [[xin, yX["X3"]], np_[2]])
    s.node("j3", j3, yX["X3"], 3.5, fill="ink")
    s.line("w3b", [[j3, yX["X3"]], [j3, tp[0][1]], tp[0]])
    s.line("w4", [[xin, yX["X4"]], [j4, yX["X4"]], [j4, tp[1][1]], tp[1]])
    s.node("j4", j4, tp[1][1], 3.5, fill="ink")
    yr = 172
    s.line("w4b", [[j4, tp[1][1]], [j4, yr], [xo - s.v(20, 12), yr], [xo - s.v(20, 12), op[1][1]], op[1]])
    s.wire("wn1", no, op[0], s.v(285, 168))
    s.wire("wo", oo, rp[0], s.v(410, 246))
    s.wire("wT", to, rp[1], s.v(425, 256))
    s.line("wout", [ro, [ro[0] + s.v(24, 14), ro[1]]])
    s.text("vn1", no[0] + s.v(22, 16), no[1] - 13, "", s.v(13, 12), anchor="middle", mono=True)
    s.text("vo", oo[0] + 4, oo[1] - 13, "", s.v(13, 12), anchor="start", mono=True)
    s.text("vT", to[0] + 6, to[1] + 14, "T", s.v(13, 12), anchor="start", mono=True, weight="bold")
    s.text("vout", s.v(ro[0] + 30, ro[0] - 14), s.v(ro[1], 222), "out", s.v(14, 13), anchor=s.v("start", "middle"), mono=True, weight="bold")
    s.text("lg", s.v(W / 2, NW / 2), 304, "line values: good/faulty", s.v(13, 12), anchor="middle", tone="muted")
    s.text("st", s.v(W / 2, NW / 2), 330, "", s.v(14, 13), anchor="middle", weight="bold")
    s.step("T = X3·X4 feeds the NOR. The fault: T stuck-at-0 (tied to ground). To activate it, the good T must be 1, so X3 = X4 = 1.",
           ("wT", {"tone": "danger"}), ("vT", {"text": "T s-a-0", "tone": "danger"}))
    s.step("But X4 = 1 also enters the OR, and 1 is the OR's controlling value: o = 1 whatever the NAND gives, so the NOR output is 0.",
           ("w4", {"tone": "success"}), ("w4b", {"tone": "accent"}), ("wo", {"tone": "success"}), ("vo", {"text": "o = 1", "tone": "success"}))

    def frame(m):
        env = dict(zip(X, cl.bits_of(m, 4)))
        g = cl.evaluate(net, env)
        b = cl.evaluate(net, env, {"T": 0})
        pats = [(f"i{nm}", {"text": f"{nm}={env[nm]}", "tone": tv(env[nm])}) for nm in X]
        pats += [("w1", {"tone": tv(env["X1"])}), ("w2", {"tone": tv(env["X2"])}), ("w3", {"tone": tv(env["X3"])}), ("w3b", {"tone": tv(env["X3"])}),
                 ("w4", {"tone": tv(env["X4"])}), ("w4b", {"tone": tv(env["X4"])})]
        for ln, w_, lab in (("n1", "wn1", ""), ("o", "wo", "o = "), ("T", "wT", "T = "), ("out", "wout", "out = ")):
            pats += [(w_, {"tone": gf_tone(g[ln], b[ln])}), (f"v{ln}", {"text": lab + lv(g[ln], b[ln]), "tone": gf_tone(g[ln], b[ln])})]
        return env, g, b, pats

    for m in (0b0111, 0b1111, 0b0000):
        env, g, b, pats = frame(m)
        assert g["out"] == b["out"]
        bits_ = " ".join(format(m, "04b"))
        if g["T"] == 1:
            cap = f"X = {bits_}: T = {lv(g['T'], b['T'])} is activated, but X4 = 1 makes o = 1, so out = {lv(g['out'], b['out'])} in both circuits."
        else:
            cap = f"X = {bits_}: X3 = X4 = 0, so the good T is 0, the stuck value: not activated; out = {lv(g['out'], b['out'])}. No test."
        s.step(cap, *pats, ("st", {"text": f"{format(m, '04b')}: outputs agree", "tone": "muted"}))
    s.step("No input detects T s-a-0: activation (X4 = 1) blocks propagation. The answer is D, none of the above; T is redundant.",
           ("st", {"text": "undetectable: T can be tied to 0", "tone": "accent"}))
    return s.done("A stuck-at fault whose activation blocks its own propagation", (W, 346), (NW, 346),
                  "X1 X2 X3 feed a 3-input NAND; its output and X4 feed an OR. T = AND(X3, X4). The OR output and T feed a NOR, the circuit output.")


# ── Build ───────────────────────────────────────────────────────────────────

ORDER = ["design-pipeline", "converter-kmaps", "gray-converter", "mux-routing", "mux-implement", "mux-cascade", "mux-tree",
         "mux-enable-expand", "mux-as-gates", "decoder-lighting", "decoder-function", "decoder-tree", "address-decoding",
         "demux-routing", "priority-scan", "priority-mux", "comparator-cascade", "comparator-chain", "equality-xnor",
         "parity-tree", "rom-grid", "rom-expansion", "pla-planes", "fault-injection", "fault-reconvergent", "fault-blocked"]


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
