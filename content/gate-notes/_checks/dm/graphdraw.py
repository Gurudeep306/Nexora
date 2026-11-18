"""graphdraw.py — layouts, scene builders and drawing checks for DM graph scenes
(dm.md job E3). Pure Python + dmlib + graphlib. Deterministic only: no random,
no force-directed layout at run time. Every layout returns positions for BOTH
canvases: wide (640×360 class) and narrow (360 px wide).

State tones (fixed for the whole subject):
  current = accent, visited/in-tree/in-matching = success, frontier/candidate/
  augmenting = info, conflict/odd-cycle/crossing/bridge = danger,
  about-to-change = warning, done/irrelevant = muted, removed = hidden.
Colour classes (colouring scenes) fill in the order
  accent, info, success, warning, danger; χ ≥ 6 uses numbers only, and every
colour class also writes the colour number in the vertex label ("a·1").
"""
import itertools
import math

import dmlib
from dmlib import arrow, box, el, node, spec, step, table, text
import graphlib
from graphlib import Graph

WIDE = (640, 360)
NARROW_W = 360  # dmlib.check_viz requires the narrow canvas to be 360 wide

TONE = {"current": "accent", "visited": "success", "frontier": "info",
        "conflict": "danger", "warn": "warning", "done": "muted"}
COLOUR_FILLS = ["accent", "info", "success", "warning", "danger"]


def _point_segment_dist(p, a, b):
    ax, ay = a
    bx, by = b
    px, py = p
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    if L2 == 0:
        return math.dist(p, a)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L2))
    return math.dist(p, (ax + t * dx, ay + t * dy))


# ── Layouts (each returns {vertex: (x, y)} for a W×H canvas) ─────
def layout_circle(g, W, H, margin=None):
    m = margin if margin is not None else max(30, min(W, H) * 0.16)
    cx, cy, r = W / 2, H / 2, min(W / 2, H / 2) - m
    vs = sorted(g.vertices, key=str)
    pts = dmlib.circle_layout(len(vs), cx, cy, r)
    return {v: pts[i] for i, v in enumerate(vs)}


def layout_bipartite(g, W, H, margin=None):
    parts, odd = g.bipartition()
    assert parts, "layout_bipartite needs a bipartite graph"
    left, right = parts
    m = margin if margin is not None else max(34, min(W, H) * 0.18)
    out = {}
    for side, xs in ((left, m), (right, W - m)):
        side = sorted(side, key=str)
        n = len(side)
        for i, v in enumerate(side):
            y = m + (H - 2 * m) * (i + 0.5) / n if n else H / 2
            out[v] = (xs, round(y, 1))
    return out


def layout_grid(g, W, H, margin=None):
    vs = sorted(g.vertices, key=str)
    rs = sorted({v[0] for v in g.vertices if isinstance(v, tuple)})
    cs = sorted({v[1] for v in g.vertices if isinstance(v, tuple)})
    assert rs and cs, "layout_grid needs (row, col) vertices"
    m = margin if margin is not None else max(30, min(W, H) * 0.14)
    out = {}
    for v in g.vertices:
        i, j = v
        x = m + (W - 2 * m) * (cs.index(j) + 0.5) / len(cs)
        y = m + (H - 2 * m) * (rs.index(i) + 0.5) / len(rs)
        out[v] = (round(x, 1), round(y, 1))
    return out


def layout_layered(g, root, W, H, margin=None):
    """BFS layers as rows (top = root)."""
    layers = g.bfs_layers(root)
    m = margin if margin is not None else max(34, min(W, H) * 0.16)
    out = {}
    for k, layer in enumerate(layers):
        layer = sorted(layer, key=str)
        y = m + (H - 2 * m) * (k + 0.5) / len(layers)
        for i, v in enumerate(layer):
            x = m + (W - 2 * m) * (i + 0.5) / len(layer)
            out[v] = (round(x, 1), round(y, 1))
    return out


def layout_star(g, W, H, margin=None):
    """Hub in the centre (max degree), others on a circle."""
    hub = max(g.vertices, key=lambda v: g.degree(v))
    m = margin if margin is not None else max(34, min(W, H) * 0.2)
    cx, cy, r = W / 2, H / 2, min(W / 2, H / 2) - m
    others = sorted((v for v in g.vertices if v != hub), key=str)
    pts = dmlib.circle_layout(len(others), cx, cy, r) if others else []
    out = {hub: (round(cx, 1), round(cy, 1))}
    for i, v in enumerate(others):
        out[v] = pts[i]
    return out


def _pentagon(cx, cy, r, start=-90, step=72):
    return [(round(cx + r * math.cos(math.radians(start + step * k)), 1),
             round(cy + r * math.sin(math.radians(start + step * k)), 1)) for k in range(5)]


def petersen_pos(W, H):
    m = max(40, min(W, H) * 0.18)
    cx, cy = W / 2, H / 2
    R = min(W, H) / 2 - m
    outer = _pentagon(cx, cy, R)
    inner = _pentagon(cx, cy, R * 0.42, start=-90 + 36)
    # graph: outer 0-4 cycle, inner 5-9 star (i to i+2), spokes i-(5+i)
    return {i: outer[i] for i in range(5)} | {5 + i: inner[i] for i in range(5)}


def _gray(k):
    return k ^ (k >> 1)


def q3_pos(W, H):
    """Q3 as the classic cube drawing: outer square plus a smaller square offset
    up-right, corners joined. Corner index uses a Gray code so single-bit flips
    (the edges within a square) are square sides."""
    m = max(44, min(W, H) * 0.2)
    s = min(W / 2 - m, H / 2 - m)
    cx, cy = W / 2, H / 2
    sq1 = [(cx - s, cy - s), (cx + s, cy - s), (cx + s, cy + s), (cx - s, cy + s)]
    sq2 = [(cx + (x - cx) * 0.5 + 0.25 * s, cy + (y - cy) * 0.5 - 0.25 * s) for x, y in sq1]
    pos = {}
    for i in range(8):
        b = format(i, "03b")
        sq = sq1 if b[0] == "0" else sq2
        pos[b] = tuple(round(v, 1) for v in sq[_gray(int(b[1:], 2))])
    return pos


def k5_pos(W, H):
    m = max(40, min(W, H) * 0.2)
    pts = _pentagon(W / 2, H / 2, min(W, H) / 2 - m)
    return {i: pts[i] for i in range(5)}


def k33_pos(W, H):
    m = max(40, min(W, H) * 0.2)
    left = [(m, round(m + (H - 2 * m) * (i + 0.5) / 3, 1)) for i in range(3)]
    right = [(W - m, round(m + (H - 2 * m) * (i + 0.5) / 3, 1)) for i in range(3)]
    return {(0, i): left[i] for i in range(3)} | {(1, j): right[j] for j in range(3)}


def crown_pos(W, H):
    return k33_pos(W, H)  # same shape class; relabel by the caller if needed


# Dodecahedron Schlegel diagram (baked, crossing-free in both canvases; verified
# by graph_toolkit against crossings_of).
_DODEC_WIDE = {3: [186.6, 52.0], 4: [321.2, 149.8], 17: [269.8, 308.0], 18: [103.4, 308.0], 19: [52.0, 149.8],
               0: [118.8, 171.5], 1: [160.3, 157.4], 2: [186.6, 122.2], 5: [254.4, 171.5], 6: [212.9, 157.4],
               7: [197.6, 178.3], 8: [175.6, 178.3], 9: [168.7, 199.3], 10: [144.1, 207.3], 11: [144.7, 251.2],
               12: [186.6, 238.2], 13: [186.6, 212.3], 14: [204.4, 199.3], 15: [229.1, 207.3], 16: [228.5, 251.2]}
_DODEC_NARROW = {3: [180.0, 46.0], 4: [314.0, 143.4], 17: [262.8, 300.9], 18: [97.2, 300.9], 19: [46.0, 143.4],
                 0: [112.5, 165.0], 1: [153.8, 150.9], 2: [180.0, 115.9], 5: [247.5, 165.0], 6: [206.2, 150.9],
                 7: [191.0, 171.8], 8: [169.0, 171.8], 9: [162.2, 192.7], 10: [137.7, 200.6], 11: [138.3, 244.3],
                 12: [180.0, 231.4], 13: [180.0, 205.6], 14: [197.8, 192.7], 15: [222.3, 200.6], 16: [221.7, 244.3]}


def dodecahedron_pos(W, H):
    base = _DODEC_WIDE if W > 400 else _DODEC_NARROW
    return {v: tuple(p) for v, p in base.items()}


# Baked planar layouts for the planar PYQ graphs (straight-line planar drawings,
# crossing-free in both canvases; verified by graph_toolkit via check_drawing).
_PYQ_CSE_1999_A_15_WIDE = {'1': [46.0, 46.0], '2': [594.0, 46.0], '3': [429.6, 100.8], '4': [484.4, 155.6], '5': [155.6, 155.6], '6': [265.2, 265.2], '7': [265.2, 210.4]}
_PYQ_CSE_1999_A_15_NARROW = {'1': [32.0, 32.0], '2': [328.0, 32.0], '3': [239.2, 61.6], '4': [268.8, 91.2], '5': [91.2, 91.2], '6': [150.4, 150.4], '7': [150.4, 120.8]}

_PYQ_CSE_1999_B_53_WIDE = {'A': [46.0, 46.0], 'B': [247.0, 247.0], 'C': [314.0, 314.0], 'D': [247.0, 180.0], 'E': [247.0, 113.0], 'F': [582.0, 46.0]}
_PYQ_CSE_1999_B_53_NARROW = {'A': [32.0, 32.0], 'B': [143.0, 143.0], 'C': [180.0, 180.0], 'D': [143.0, 106.0], 'E': [143.0, 69.0], 'F': [328.0, 32.0]}

_PYQ_CSE_2012_CS_26_WIDE = {'c': [46.0, 46.0], 'pend': [582.0, 46.0], 'p': [314.0, 314.0], 'q': [358.7, 269.3], 'r': [403.3, 224.7], 's': [448.0, 180.0], 't': [537.3, 90.7], 'u': [492.7, 135.3]}
_PYQ_CSE_2012_CS_26_NARROW = {'c': [32.0, 32.0], 'pend': [328.0, 32.0], 'p': [180.0, 180.0], 'q': [204.7, 155.3], 'r': [229.3, 130.7], 's': [254.0, 106.0], 't': [303.3, 56.7], 'u': [278.7, 81.3]}

_PYQ_CSE_2018_CS_18_WIDE = {'a': [46.0, 46.0], 'b': [180.0, 180.0], 'c': [448.0, 113.0], 'd': [314.0, 247.0], 'e': [582.0, 46.0], 'f': [314.0, 314.0]}
_PYQ_CSE_2018_CS_18_NARROW = {'a': [32.0, 32.0], 'b': [106.0, 106.0], 'c': [254.0, 69.0], 'd': [180.0, 143.0], 'e': [328.0, 32.0], 'f': [180.0, 180.0]}

# PYQ graph layouts (re-laid-out by us; see graphlib builders for the edges).
def pyq_pos(name, W, H):
    """Positions for a PYQ graph in a W×H canvas. Baked planar layouts for the
    planar PYQ graphs; circle/stacked layouts for the rest."""
    m = max(36, min(W, H) * 0.17)
    cx, cy = W / 2, H / 2
    baked = {
        "cse-1999-a-15": (_PYQ_CSE_1999_A_15_WIDE, _PYQ_CSE_1999_A_15_NARROW),
        "cse-1999-b-53": (_PYQ_CSE_1999_B_53_WIDE, _PYQ_CSE_1999_B_53_NARROW),
        "cse-2012-cs-26": (_PYQ_CSE_2012_CS_26_WIDE, _PYQ_CSE_2012_CS_26_NARROW),
        "cse-2018-cs-18": (_PYQ_CSE_2018_CS_18_WIDE, _PYQ_CSE_2018_CS_18_NARROW),
    }
    if name in baked:
        wide, narrow = baked[name]
        base = wide if W > 400 else narrow
        def _key(v):
            return int(v) if isinstance(v, str) and v.lstrip("-").isdigit() else v
        return {_key(v): tuple(p) for v, p in base.items()}
    if name == "cse-1998-b-62-b":  # two directed cycles, stacked vertically
        r = min(W, H) * 0.17
        c1 = dmlib.circle_layout(3, cx, H * 0.30, r)
        c2 = dmlib.circle_layout(5, cx, H * 0.74, r)
        pos = {v: c1[i] for i, v in enumerate("abc")} | {v: c2[i] for i, v in enumerate("defgh")}
        return {v: (min(max(x, 20), W - 20), min(max(y, 20), H - 20)) for v, (x, y) in pos.items()}
    if name == "cse-2004-cs-77":
        inner = dmlib.circle_layout(4, cx, cy, min(W, H) * 0.17)
        pos = {"L": (m, cy), "R": (W - m, cy), "T": (cx, m), "B": (cx, H - m)}
        pos.update({f"i{k+1}": inner[k] for k in range(4)})
        return pos
    if name == "it-2008-it-3":
        g0 = graphlib.grid(3, 3)
        p0 = layout_grid(g0, W, H, margin=m)
        return {f"{i}{j}": p0[(i, j)] for i in range(3) for j in range(3)}
    if name == "cse-2022-cs-40-optC":
        ring = dmlib.circle_layout(9, cx, cy, min(W, H) / 2 - m)
        pos = {f"v{i}": ring[i] for i in range(9)}
        pos["c"] = (round(cx, 1), round(cy, 1))
        return pos
    if name == "cse-2024-2-cs-50":
        ring = dmlib.circle_layout(8, cx, cy, min(W, H) / 2 - m, start=-90 + 22.5)
        return {f"v{i}": ring[i] for i in range(8)}
    if name == "cse-2005-cs-47":
        return None  # per-graph layouts G1..G4 handled by the caller
    raise KeyError(name)


def positions(g, layout, W, H):
    """Dispatch: layout is a callable (g, W, H) -> pos, or a preset name."""
    if callable(layout):
        return layout(g, W, H)
    presets = {"petersen": lambda gg, w, h: petersen_pos(w, h),
               "Q3": lambda gg, w, h: q3_pos(w, h),
               "K5": lambda gg, w, h: k5_pos(w, h),
               "K3,3": lambda gg, w, h: k33_pos(w, h),
               "dodecahedron": lambda gg, w, h: dodecahedron_pos(w, h)}
    if layout in presets:
        return presets[layout](g, W, H)
    if layout == "circle":
        return layout_circle(g, W, H)
    if layout == "bipartite":
        return layout_bipartite(g, W, H)
    if layout == "grid":
        return layout_grid(g, W, H)
    if layout == "star":
        return layout_star(g, W, H)
    if layout.startswith("layered:"):
        return layout_layered(g, layout.split(":", 1)[1], W, H)
    raise KeyError(layout)


# ── Element builders on dmlib ────────────────────────────────────
def short_label(name):
    """Compact display label: tuples like (0, 2) become '02'."""
    if isinstance(name, tuple):
        return "".join(str(p) for p in name)
    return str(name)


def vertex(name, x, y, nx, ny, r=16, label=None, tone=None, fill=None, size=None):
    """A graph vertex: node element id v_<name>, narrow override (nx, ny).
    Label size defaults to one that fits the node radius."""
    if size is None:
        size = max(11, min(15, int(r * 0.8)))
    n = {"cx": nx, "cy": ny, "r": r, "size": size}
    kw = {}
    if tone:
        kw["tone"] = tone
    if fill:
        kw["fill"] = fill
    return node(f"v_{name}", x, y, r, label if label is not None else short_label(name), n, size=size, **kw)


def edge(a, b, curve=0.0, label=None, directed=False, tone=None, hidden=False, parallel=0):
    """An edge: arrow id e_<a>_<b> (sorted for undirected), ends snapped to the
    vertex ids so edges follow moving vertices (E1). `parallel` picks a curve
    when there are parallel edges."""
    ea, eb = (str(a), str(b)) if directed else tuple(sorted((str(a), str(b)), key=str))
    eid = f"e_{ea}_{eb}" + (f"_{parallel}" if parallel else "")
    kw = {"head": "end" if directed else "none", "curve": curve}
    if label is not None:
        kw["label"] = str(label)
    if tone:
        kw["tone"] = tone
    if hidden:
        kw["hidden"] = True
    return arrow(eid, f"v_{a}", f"v_{b}", None, **kw)


def loop(v, angle=0, size=None, label=None, head="none", tone=None):
    """Self-loop on vertex v (viz element `loop`, job E2)."""
    kw = {"on": f"v_{v}", "angle": angle, "size": size if size is not None else 14, "head": head}
    if label is not None:
        kw["label"] = str(label)
    if tone:
        kw["tone"] = tone
    return el(f"l_{v}", "loop", None, **kw)


def draw_graph(g, pos_w, pos_n, r=16, directed=None, node_tone=None, edge_tone=None, curved=()):
    """Vertex + edge elements for graph g at both canvases. `curved` is a set of
    frozenset({u, v}) edges drawn with a curve (they may legitimately pass near
    other vertices); check_drawing skips straight-line clearance for them."""
    directed = g.directed if directed is None else directed
    curved = {frozenset((str(u), str(v))) for u, v in curved}
    els = []
    for v in g.vertices:
        x, y = pos_w[v]
        nx, ny = pos_n[v]
        tone = node_tone.get(v) if node_tone else None
        els.append(vertex(v, x, y, nx, ny, r=r, tone=tone))
    seen = {}
    for eid, u, v in g.edges:
        if u == v:
            els.append(loop(u, angle=seen.get(("loop", u), 0), tone=edge_tone))
            seen[("loop", u)] = seen.get(("loop", u), 0) + 120
            continue
        key = (str(u), str(v)) if directed else tuple(sorted((str(u), str(v))))
        par = seen.get(key, 0)
        seen[key] = par + 1
        curve = 0.0 if par == 0 else (0.18 if par % 2 == 1 else -0.18)
        if frozenset((str(u), str(v))) in curved:
            curve = 0.32
        els.append(edge(u, v, curve=curve, directed=directed, tone=edge_tone, parallel=par if par else 0))
    return els


def queue_panel(x, y, w, items, nx, ny, title="Queue", tone="info"):
    """A side panel listing the queue/frontier items."""
    h = 34 + 22 * max(1, len(items))
    els = [box("panel", x, y, w, h, title, {"x": nx, "y": ny, "w": min(w, 320), "h": h}, tone="muted")]
    for i, it in enumerate(items):
        els.append(text(f"q{i}", x + 12, y + 26 + 22 * i, str(it),
                        {"x": nx + 12, "y": ny + 26 + 22 * i, "size": 13}, size=14, mono=True, tone=tone))
    return els


def stack_panel(x, y, w, items, nx, ny, title="Stack"):
    h = 34 + 22 * max(1, len(items))
    els = [box("panel", x, y, w, h, title, {"x": nx, "y": ny, "w": min(w, 320), "h": h}, tone="muted")]
    for i, it in enumerate(items):
        els.append(text(f"s{i}", x + 12, y + 26 + 22 * i, str(it),
                        {"x": nx + 12, "y": ny + 26 + 22 * i, "size": 13}, size=14, mono=True, tone="info"))
    return els


def degree_table(g, x, y, cw=64, ch=26, nx=None, ny=None):
    rows = [["vertex", "deg"]] + [[str(v), str(g.degree(v))] for v in sorted(g.vertices, key=str)]
    n = {"x": nx if nx is not None else x, "y": ny if ny is not None else y, "cellW": cw, "cellH": ch}
    return table("degtab", x, y, cw, ch, rows, n, header=True, mono=True)


def matrix_grid(g, x, y, cell=26, nx=None, ny=None):
    vs = sorted(g.vertices, key=str)
    A = g.adjacency_matrix()
    idx = {v: i for i, v in enumerate(g.vertices)}
    order = sorted(g.vertices, key=str)
    rows = [[""] + [str(v) for v in order]] + [[str(v)] + [str(A[idx[v]][idx[w]]) for w in order] for v in order]
    n = {"x": nx if nx is not None else x, "y": ny if ny is not None else y, "cellW": cell, "cellH": cell}
    return table("adjmat", x, y, cell, cell, rows, n, header=True, mono=True)


# ── Trace → steps ────────────────────────────────────────────────
def steps_from_trace(trace, templates):
    """Turn algorithm events into dmlib steps. templates: kind -> fn(*args)
    -> (caption, [(id, patch_dict), ...])."""
    steps = []
    for ev in trace:
        fn = templates.get(ev[0])
        if not fn:
            continue
        caption, patches = fn(*ev[1:])
        steps.append(step(caption, *patches))
    return steps


def scene_graph(title, intro, g, pos_w, pos_n, steps, W=640, H=360, NW=NARROW_W, NH=360, extra=None, r=16):
    """Assemble a full scene spec for a graph with per-canvas positions."""
    els = draw_graph(g, pos_w, pos_n, r=r) + (extra or [])
    return spec(title, (W, H), (NW, NH), intro, els, steps)


# ── Drawing checks ───────────────────────────────────────────────
def _layout_elements(scene, layout):
    els = {}
    for e in scene["elements"]:
        if e.get("only") in (None, layout):
            els[e["id"]] = dict(e)
    if layout == "narrow":
        for e in els.values():
            if isinstance(e.get("narrow"), dict):
                e.update(e["narrow"])
    return els


def check_drawing(scene, graph, planar=False):
    """A scene draws exactly `graph`, safely, in both canvases:
    vertex/edge sets equal the graph's; no edge within r+4 of a non-endpoint
    vertex; no two vertices closer than 2.4r; no crossings when planar=True;
    every element inside its canvas; text ≥ dmlib.MIN_TEXT."""
    for layout in ("wide", "narrow"):
        els = _layout_elements(scene, layout)
        W = scene["width"] if layout == "wide" else scene["narrow"]["width"]
        H = scene["height"] if layout == "wide" else scene["narrow"]["height"]
        nodes = {e["id"][2:]: e for e in els.values() if e["type"] == "node" and e["id"].startswith("v_")}
        arrows = [e for e in els.values() if e["type"] == "arrow"
                  and isinstance(e.get("from"), str) and isinstance(e.get("to"), str)]
        assert set(nodes) == {str(v) for v in graph.vertices}, \
            f"[{layout}] drawn vertices {sorted(nodes)} != graph vertices {sorted(map(str, graph.vertices))}"
        drawn = set()
        for a in arrows:
            u, v = a["from"][2:], a["to"][2:]
            drawn.add((u, v) if graph.directed else frozenset((u, v)))
        want = {(str(e[1]), str(e[2])) if graph.directed else frozenset((str(e[1]), str(e[2])))
                for e in graph.edges if e[1] != e[2]}
        assert drawn == want, f"[{layout}] drawn edges != graph edges: missing {want - drawn}, extra {drawn - want}"
        pos = {name: (e["cx"], e["cy"]) for name, e in nodes.items()}
        rs = {name: e["r"] for name, e in nodes.items()}
        for u, v in itertools.combinations(pos, 2):
            d = math.dist(pos[u], pos[v])
            assert d >= 2.4 * min(rs[u], rs[v]), f"[{layout}] vertices {u},{v} only {d:.1f} apart (r={rs[u]},{rs[v]})"
        for a in arrows:
            u, v = a["from"][2:], a["to"][2:]
            if u == v or a.get("curve"):
                continue  # curved edges are exempt from the straight-line clearance
            for w in pos:
                if w in (u, v):
                    continue
                d = _point_segment_dist(pos[w], pos[u], pos[v])
                assert d >= rs[w] + 4, f"[{layout}] edge {u}-{v} passes {d:.1f} from vertex {w} (r={rs[w]})"
        if planar:
            straight = Graph([str(v) for v in graph.vertices],
                             [(str(e[1]), str(e[2])) for e in graph.edges
                              if e[1] != e[2] and not any(a.get("curve") and {a["from"][2:], a["to"][2:]} == {str(e[1]), str(e[2])} for a in arrows)])
            pos_g = {str(v): pos[str(v)] for v in graph.vertices}
            cr = straight.crossings_of(pos_g)
            assert cr == 0, f"[{layout}] {cr} crossings in a planar drawing"
        for e in els.values():
            if e.get("hidden"):
                continue
            b = dmlib._bbox(e)
            if b is not None:
                assert b[0] >= -1 and b[1] >= -1 and b[2] <= W + 1 and b[3] <= H + 1, \
                    f"[{layout}] {e['id']} {tuple(round(x) for x in b)} leaves the {W}x{H} canvas"
            if e["type"] == "text":
                assert e.get("size", 15) >= dmlib.MIN_TEXT[layout], f"[{layout}] text {e['id']} too small"
            if e["type"] in ("node", "box", "circle") and e.get("label"):
                sz = e.get("size", 15)
                lw = len(str(e["label"])) * sz * (0.6 if e.get("mono") else 0.52)
                room = e["w"] if e["type"] == "box" else 2 * e["r"]
                assert lw <= room + 2, f"[{layout}] label of {e['id']} too wide for its shape"
    return True


if __name__ == "__main__":
    g = graphlib.petersen()
    pw, pn = petersen_pos(640, 360), petersen_pos(360, 400)
    s = scene_graph("Petersen", "The Petersen graph.", g, pw, pn, [step("Start.", ("v_0", {"tone": "accent"}))])
    assert check_drawing(s, g)  # Petersen is non-planar: its star drawing has 5 crossings
    d = graphlib.dodecahedron()
    dw, dn = dodecahedron_pos(640, 360), dodecahedron_pos(360, 430)
    s2 = scene_graph("Dodecahedron", "The dodecahedron graph (Schlegel).", d, dw, dn, [step("Start.")], r=9)
    assert check_drawing(s2, d, planar=True)
    print("graphdraw self-check ok")
