"""Drawing helpers, two-layout merge and the geometry self-check for the Programming & Data
Structures Viz scenes (a library, not a check).

Every scene is written once as a function of the layout ("wide": a 640–720 unit canvas; "narrow":
360 units for phones) and registered with `@scene` in a per-chapter registry (see `Registry`);
`merge` turns the two drawings into one spec with `narrow` overrides and `only` twins, exactly as
the Digital Logic scenes do. Captions and the intro must be identical in both layouts: they are the
text alternative of the figure. `check_layout` replays every frame of both layouts (as the reader's
frames.ts does) and asserts that every visible element stays on its canvas, that text is large
enough (≥ 13 wide, ≥ 12 narrow), that no two labels overlap, that no label is crossed by a line or
covered by a table or circle, that text inside a box stays inside it, and that boxes do not overlap
(boxes whose id starts with "hl", "fr" or "bg" are free: highlight frames, stack-frame outlines and
backgrounds may contain other shapes).

PDS-specific helpers draw what this subject needs: memory cells with addresses (`cells`), pointer
arrows, C code listings with a moving current-line highlight (`code`), activation-record frames
(`frame`), linked-list nodes (`lnode`) and binary trees laid out by in-order position (`tree_xy`).
Tones: accent = the thing acting now, success = done/correct/true, danger = error/undefined, muted
= inactive, info = a pointer or an address, warning = a changed value.
"""
import copy
import json
import os

GEOM = ["x", "y", "w", "h", "cx", "cy", "r", "r0", "start", "end", "cell", "cellW", "cellH", "size", "points", "from", "to", "curve", "anchor"]
FREE = ("hl", "fr", "bg")
MIN_TEXT = {"wide": 13, "narrow": 12}
CAP_MAX = 140


class Registry:
    """A chapter's scenes: `reg.scene` registers a layout function; `reg.build_all()` merges and checks."""

    def __init__(self):
        self.specs = {}

    def scene(self, fn):
        name = fn.__name__.replace("_", "-")
        assert name not in self.specs, name

        def build():
            s = merge(fn("wide"), fn("narrow"))
            if not os.environ.get("VIZ_PREVIEW"):
                check_layout(name, s)
            return s

        self.specs[name] = build
        return fn


def dump(spec):
    return json.dumps(spec, ensure_ascii=False, indent=1) + "\n"


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
        return self.add(id=id, type="text", x=round(x, 2), y=round(y, 2), text=t, size=size or self.v(14, 13), **kw)

    def box(self, id, x, y, w, h, label=None, size=None, **kw):
        if label is not None:
            kw["label"] = label
            kw["size"] = size or self.v(14, 13)
        return self.add(id=id, type="box", x=round(x, 2), y=round(y, 2), w=round(w, 2), h=round(h, 2), **kw)

    def node(self, id, cx, cy, r, label=None, size=None, **kw):
        if label is not None:
            kw["label"] = label
            kw["size"] = size or self.v(14, 13)
        return self.add(id=id, type="circle", cx=round(cx, 2), cy=round(cy, 2), r=r, **kw)

    def line(self, id, pts, **kw):
        return self.add(id=id, type="line", points=[[round(a, 2), round(b, 2)] for a, b in pts], **kw)

    def arrow(self, id, a, b, **kw):
        a = a if isinstance(a, str) else [round(a[0], 2), round(a[1], 2)]
        b = b if isinstance(b, str) else [round(b[0], 2), round(b[1], 2)]
        return self.add(id=id, type="arrow", **{"from": a, "to": b}, **kw)

    def table(self, id, x, y, cw, ch, rows, header=True, **kw):
        return self.add(id=id, type="table", x=x, y=y, cellW=cw, cellH=ch, rows=rows, header=header, mono=True, **kw)

    def head(self, wide_text, narrow_text, W, NW):
        self.text("head", self.v(W, NW) / 2, 22, self.v(wide_text, narrow_text), self.v(17, 15), anchor="middle", weight="bold")

    def step(self, caption, *patches):
        merged = {}
        for pid, st in patches:
            merged.setdefault(pid, {}).update(st)
        self.steps.append({"caption": caption, "patches": [{"id": i, "set": st} for i, st in merged.items()]})

    def done(self, title, wide, narrow, intro):
        return {"title": title, "size": self.v(wide, narrow), "wide": wide, "narrow": narrow, "intro": intro,
                "els": self.els, "steps": self.steps}

    # ── PDS helpers ──────────────────────────────────────────────────────

    def cells(self, pid, x, y, w, h, values, above=None, below=None, size=None, mono=True, **kw):
        """A row of memory cells (boxes) with optional labels above (names) and below (addresses).
        Element ids: <pid>c<k> (cells), <pid>a<k> (above), <pid>b<k> (below). Returns cell centres."""
        sz = size or self.v(14, 13)
        out = []
        for k, val in enumerate(values):
            cx = x + k * w
            self.box(f"{pid}c{k}", cx, y, w, h, label=str(val), size=sz, mono=mono, **kw)
            if above and above[k]:
                self.text(f"{pid}a{k}", cx + w / 2, y - 11, above[k], self.v(13, 12), anchor="middle", tone="muted")
            if below and below[k]:
                self.text(f"{pid}b{k}", cx + w / 2, y + h + 11, below[k], self.v(13, 12), anchor="middle", tone="muted", mono=True)
            out.append((cx + w / 2, y + h / 2))
        return out

    def code(self, pid, x, y, lines, size=None, gap=None, width=None):
        """A C listing: one mono text per non-blank line (<pid>l<k>, 1-based k) and a hidden
        highlight bar hl<pid> behind line 1. Returns a function line -> {"y": …} patch that moves
        the bar to that line (use it with hidden False to show the current line)."""
        sz = size or self.v(14, 13)
        g = gap or round(sz * 1.45, 2)
        wmax = width or max(len(t) for t in lines) * sz * 0.62 + 12
        self.box(f"hl{pid}", x - 6, y - g / 2, wmax, g, fill="accent", tone="accent", emphasis="soft", hidden=True)
        for k, t in enumerate(lines, 1):
            if t.strip():
                self.text(f"{pid}l{k}", x, y + (k - 1) * g, t.replace(" ", "\u00a0"), sz, mono=True)
        return lambda k: {"y": round(y + (k - 1) * g - g / 2, 2), "hidden": False}

    def frame(self, pid, x, y, w, rows, title, row_h=None, size=None, tone="ink"):
        """An activation record: a free outline box fr<pid> titled `title`, with one 'name  value'
        row per entry of `rows` (list of (name, value)). Value texts are <pid>v<k> (patch their text).
        Returns the total height."""
        rh = row_h or self.v(24, 22)
        sz = size or self.v(14, 13)
        h = rh * (len(rows) + 1) + 6
        self.box(f"fr{pid}", x, y, w, h, tone=tone)
        self.text(f"{pid}t", x + 8, y + rh / 2 + 3, title, sz, weight="bold", tone=tone, mono=True)
        for k, (name, val) in enumerate(rows):
            yy = y + rh * (k + 1.5) + 3
            self.text(f"{pid}n{k}", x + 12, yy, name, sz, mono=True, tone="muted")
            self.text(f"{pid}v{k}", x + w - 10, yy, str(val), sz, mono=True, anchor="end")
        return h

    def lnode(self, pid, x, y, val, w=None, h=None, size=None, **kw):
        """A singly-linked-list node: data box <pid>d and next box <pid>n (the pointer field).
        Returns (left-centre, centre of the next field, right edge point)."""
        bw = w or self.v(46, 40)
        bh = h or self.v(32, 30)
        self.box(f"{pid}d", x, y, bw, bh, label=str(val), size=size, mono=True, **kw)
        self.box(f"{pid}n", x + bw, y, bh * 0.8, bh, **kw)
        return (x, y + bh / 2), (x + bw + bh * 0.4, y + bh / 2), (x + bw + bh * 0.8, y + bh / 2)


def tree_xy(root, x0, x1, y0, dy):
    """Positions for a binary tree given as nested tuples (label, left, right) or None.
    x by in-order rank spread over [x0, x1], y by depth. Returns {path: (x, y, label)}, where a path
    is a string of 'L'/'R' from the root ('' = root)."""
    order = []

    def walk(t, p, d):
        if t is None:
            return
        walk(t[1], p + "L", d + 1)
        order.append((p, d, t[0]))
        walk(t[2], p + "R", d + 1)

    walk(root, "", 0)
    n = len(order)
    step = (x1 - x0) / max(n - 1, 1)
    return {p: (round(x0 + k * step, 2) if n > 1 else (x0 + x1) / 2, y0 + d * dy, lab) for k, (p, d, lab) in enumerate(order)}


def draw_tree(s, pid, root, x0, x1, y0, dy, r=None, size=None, tone="ink"):
    """Draw a binary tree: circles <pid><path or 'r'> and edges <pid>e<path> (lines, centre to
    centre trimmed to the circles). Returns the position map."""
    import math
    rr = r or s.v(17, 15)
    pos = tree_xy(root, x0, x1, y0, dy)
    nid = lambda p: f"{pid}{p or 'r'}"
    for p, (x, y, lab) in pos.items():
        if p:
            px, py, _ = pos[p[:-1]]
            d = math.hypot(x - px, y - py)
            ux, uy = (x - px) / d, (y - py) / d
            s.line(f"{pid}e{p}", [(px + ux * rr, py + uy * rr), (x - ux * rr, y - uy * rr)], tone="muted")
    for p, (x, y, lab) in pos.items():
        s.node(nid(p), x, y, rr, label=str(lab), size=size, tone=tone)
    return pos


# ── Merging the two layouts into one spec (as the Digital Logic scenes) ───────

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
    # Arrows that snap to an element id must point at the right twin in each layout.
    for e in out:
        if e["type"] == "arrow":
            for end in ("from", "to"):
                ref = e[end]
                if isinstance(ref, str) and ref in twin:
                    e[end] = ref if e.get("only") != "narrow" else ref + "-n"
    steps = []
    for k, (a, b) in enumerate(zip(w["steps"], n["steps"])):
        ps = [{"id": p["id"], "set": p["set"]} for p in a["patches"]]
        for p in b["patches"]:
            if p["id"] in twin:
                ps.append({"id": p["id"] + "-n", "set": p["set"]})
            elif p["id"] not in W:
                ps.append({"id": p["id"], "set": p["set"]})
        steps.append({"caption": a["caption"], "patches": ps})
    return {"version": 1, "title": w["title"], "width": w["size"][0], "height": w["size"][1],
            "narrow": {"width": n["size"][0], "height": n["size"][1]}, "intro": w["intro"],
            "elements": out, "steps": steps}


# ── Geometry self-check ──────────────────────────────────────────────────────

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
    if t == "box":
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


def check_layout(name, spec):
    assert 4 <= len(spec["steps"]) <= 60, f"{name}: needs 4–60 steps"
    assert spec["intro"].strip() and len(spec["intro"]) <= 400, f"{name}: intro"
    for st in spec["steps"]:
        assert st["caption"].strip() and len(st["caption"]) <= CAP_MAX, f"{name}: caption too long ({len(st['caption'])}): {st['caption']}"
    assert 640 <= spec["width"] <= 720 and spec["narrow"]["width"] == 360, f"{name}: canvas widths"
    ids = {e["id"] for e in spec["elements"]}
    for e in spec["elements"]:
        if e["type"] == "arrow":
            for end in (e["from"], e["to"]):
                assert not isinstance(end, str) or end in ids, f"{name}: arrow {e['id']} snaps to unknown {end}"
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
                if e["type"] == "table":
                    for row in e["rows"]:
                        for c in row:
                            assert len(c) * 14 * 0.62 <= e["cellW"] - 2, f"{where}: table {e['id']} cell {c!r} too wide"
            texts = [(e, shrink(bbox(e), 0.5)) for e in vis if e["type"] == "text" and e["text"]]
            lines = [e for e in vis if e["type"] == "line"]
            solids = [(e, bbox(e)) for e in vis if e["type"] in ("table", "grid", "circle")]
            boxes = [(e, bbox(e)) for e in vis if e["type"] == "box"]
            for k, (a, ra) in enumerate(texts):
                for b, rb in texts[k + 1:]:
                    assert area(ra, rb) <= 1, f"{where}: texts {a['id']} and {b['id']} overlap"
                for g, rg in solids:
                    assert area(ra, rg) == 0, f"{where}: text {a['id']} overlaps {g['id']}"
                for bx, rb in boxes:
                    if area(ra, rb) > 0 and not bx["id"].startswith(FREE):
                        assert inside(ra, rb), f"{where}: text {a['id']} sticks out of box {bx['id']}"
                for ln in lines:
                    pts = ln["points"]
                    for p, q in zip(pts, pts[1:]):
                        assert not seg_hits(p, q, ra), f"{where}: line {ln['id']} crosses text {a['id']}"
            hard = [(e, r) for e, r in boxes if not e["id"].startswith(FREE)]
            for k, (a, ra) in enumerate(hard):
                for b, rb in hard[k + 1:]:
                    assert area(ra, rb) == 0, f"{where}: {a['id']} and {b['id']} overlap"
