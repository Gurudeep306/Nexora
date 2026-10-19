"""Shared drawing helpers for the Viz scenes of Digital Logic Chapter 6 (Sequential circuits).

The two-layout drawing class, merging and the geometry self-check come from Chapter 5
(`_viz_ch5.S`, `merge`, `check_layout`): each scene is drawn once per layout ("wide", 640–720 units,
and "narrow", 360 units); captions and the intro are identical in both (they are the text
alternative); `check_layout` replays every frame of both layouts and asserts that everything stays
inside its canvas, text is large enough, no labels overlap and no wire crosses a label or runs
through a block or gate.

This module adds what sequential scenes need:

- `waveform`: a digital waveform on a tick grid, drawn as `line` elements, one per reveal group (so a
  step can uncover the next clock period); unknown ('X') ticks become soft danger bands (`hl…` boxes,
  which may overlap other shapes);
- `graph`: a state graph of `circle` nodes and `arrow` arcs with separate `text` labels (so the
  layout check sees them), including self-loops drawn as an open `line` loop plus a short arrow;
- `ff_block`: a flip-flop or latch as a `box` with pin labels (D, J, K, S, R, T, Q, Q̄, clock wedge).

Logic levels: success = 1, muted = 0, danger = unknown / forbidden / violation, accent = the active
edge, state, arc or path. Per-lesson scene modules (`_viz_ch6_l01.py` …) register scenes with
`@scene`; `_viz_ch6.py` imports them all and writes the JSON.
"""
import math
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import seqlib as sq  # noqa: E402,F401
from _viz_ch1_fp import VIZ_DIR  # noqa: E402,F401
from _viz_ch5 import S, check_layout, merge, tv, wire_pts  # noqa: E402,F401

SPECS = {}


def scene(fn):
    name = fn.__name__.replace("_", "-")

    def build():
        s = merge(fn("wide"), fn("narrow"))
        if not os.environ.get("VIZ_PREVIEW"):  # previews may skip the layout check; the real build never does
            check_layout(name, s)
        return s

    assert name not in SPECS, name
    SPECS[name] = build
    return fn


def lv(v):
    """Tone of a logic value: 1 success, 0 muted, unknown danger."""
    return "danger" if v in ("X", "F", None, "osc") else "success" if v else "muted"


def vtext(v):
    return "X" if v in ("X", None) else "osc" if v == "osc" else str(v)


# ── Waveforms ──────────────────────────────────────────────────────────────

def waveform(s, pid, x, y, h, dx, vals, groups=None, tone=None, hidden=True):
    """Draw `vals` (0, 1 or 'X' per tick) as a waveform whose tick t spans [x + t·dx, x + (t+1)·dx],
    high level y, low level y + h. `groups` is a list of (start, end) tick ranges, one line element per
    group (default: one group for everything). Returns the list of element ids per group (the line and
    any X bands), all hidden unless hidden=False, so steps can reveal them group by group."""
    groups = groups or [(0, len(vals))]
    out = []
    for gi, (a, b) in enumerate(groups):
        ids = []
        pts = []
        prev = vals[a - 1] if a > 0 else None
        for t in range(a, b):
            v = vals[t]
            x0, x1 = x + t * dx, x + (t + 1) * dx
            if v in ("X", "F", None):
                if pts:
                    s.line(f"{pid}g{gi}s{len(ids)}", pts, tone=tone or "ink", hidden=hidden)
                    ids.append(f"{pid}g{gi}s{len(ids)}")
                    pts = []
                bid = f"hl{pid}x{t}"
                s.box(bid, x0, y, dx, h, fill="danger", tone="danger", hidden=hidden, opacity=0.9)
                ids.append(bid)
                prev = v
                continue
            yy = y if v else y + h
            if not pts:
                if prev in (0, 1) and prev != v:
                    pts.append([x0, y + h if v else y])
                pts.append([x0, yy])
            elif pts[-1][1] != yy:
                pts.append([x0, pts[-1][1]])
                pts.append([x0, yy])
            pts.append([x1, yy])
            prev = v
        if pts:
            s.line(f"{pid}g{gi}s{len(ids)}", _compact(pts), tone=tone or "ink", hidden=hidden)
            ids.append(f"{pid}g{gi}s{len(ids)}")
        out.append(ids)
    return out


def _compact(pts):
    """Drop collinear middle points of an axis-aligned polyline."""
    res = [pts[0]]
    for p in pts[1:]:
        if p == res[-1]:
            continue
        if len(res) >= 2 and ((res[-2][0] == res[-1][0] == p[0]) or (res[-2][1] == res[-1][1] == p[1])):
            res[-1] = p
        else:
            res.append(p)
    return res


def clock_vals(periods, high=2, low=2, lead=1):
    """A clock as ticks: `lead` low ticks, then `periods` × (high 1s, low 0s)."""
    return [0] * lead + ([1] * high + [0] * low) * periods


def reveal(ids_groups, k, on=True):
    """Patches that show (or hide) every element of group k."""
    return [(i, {"hidden": not on}) for i in ids_groups[k]]


# ── State graphs ───────────────────────────────────────────────────────────

def graph(s, pid, nodes, r, edges, size=None, node_tone="ink"):
    """Draw a state graph. nodes: {name: (cx, cy, label)}; edges: list of dicts
    {a, b, label, curve (arrows), lx, ly (label position), side (self-loop: 'top', 'bottom', 'left',
    'right')}. Returns {"nodes": {name: id}, "edges": [ [ids…] per edge ], "labels": [id per edge]}."""
    sz = size or s.v(14, 12)
    ids = {"nodes": {}, "edges": [], "labels": []}
    for name, (cx, cy, lab) in nodes.items():
        nid = f"{pid}n{name}"
        s.node(nid, cx, cy, r, label=lab, size=sz, mono=True, tone=node_tone)
        ids["nodes"][name] = nid
    for k, e in enumerate(edges):
        a, b = e["a"], e["b"]
        eid = f"{pid}e{k}"
        ax, ay, _ = nodes[a]
        if a == b:
            side = e.get("side", "top")
            el = self_loop(s, eid, ax, ay, r, side, ids["nodes"][a])
            ids["edges"].append(el)
        else:
            s.add(id=eid, type="arrow", **{"from": ids["nodes"][a]}, to=ids["nodes"][b], curve=e.get("curve", 0), tone="muted")
            ids["edges"].append([eid])
        if e.get("label") is not None:
            tid = f"{pid}t{k}"
            s.text(tid, e["lx"], e["ly"], e["label"], sz, anchor="middle", mono=True, tone="muted")
            ids["labels"].append(tid)
        else:
            ids["labels"].append(None)
    return ids


def self_loop(s, eid, cx, cy, r, side, node_id):
    """An open loop beside a node (a `line`) ending in a short arrow back into the node."""
    ang = {"top": 0, "right": 90, "bottom": 180, "left": 270}[side]
    lr = r * 0.62
    # loop centre outside the node
    ccx = cx + (r + lr * 0.55) * math.sin(math.radians(ang))
    ccy = cy - (r + lr * 0.55) * math.cos(math.radians(ang))
    pts = []
    for k in range(0, 15):
        a = math.radians(ang + 140 + k * 280 / 14 - 180)
        pts.append([round(ccx + lr * math.sin(a), 2), round(ccy - lr * math.cos(a), 2)])
    s.line(eid, pts, tone="muted")
    tip_from = pts[-1]
    s.add(id=eid + "h", type="arrow", **{"from": tip_from}, to=node_id, tone="muted")
    return [eid, eid + "h"]


def light_edge(ids, k, tone="accent"):
    return [(i, {"tone": tone}) for i in ids["edges"][k]] + ([(ids["labels"][k], {"tone": tone})] if ids["labels"][k] else [])


# ── Flip-flop blocks ───────────────────────────────────────────────────────

def ff_block(s, pid, x, y, w, h, left, right=("Q", "Q̄"), clock=True, title=None, size=None, edge="pos"):
    """A flip-flop / latch box with input pins on the left (the clock pin last, drawn with a wedge
    label '>' for edge-triggered or 'C' for a level latch) and outputs on the right. Returns the pins."""
    sz = size or s.v(13, 12)
    labels = list(left)
    if clock:
        labels.append(">" if edge in ("pos", "neg") else "C")
    P = s.block(pid, x, y, w, h, left=labels, right=list(right), size=sz)
    if title:
        s.text(f"{pid}-ttl", x + w / 2, y - 10, title, sz, anchor="middle", weight="bold")
    return P
