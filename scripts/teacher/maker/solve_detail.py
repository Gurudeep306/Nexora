"""Stage 5b of the Teacher Maker: the face detail the 222 face sliders cannot reach.

  python3 scripts/teacher/maker/solve_detail.py <base.npz> <face.json> <shape.json> <ref_shape.json> \
      <out.target> [--strength 0.8] [--depth 0.3] [--sigma 0.14]

The sliders move whole regions (jaw width, lip fullness, eye shape...). After they are solved, the
person's face points still differ from the model's. This measures that difference at every one of the
478 face points, in the same relative way as the slider solve (the person's photo shape minus the base
model's own rendered shape, read by the same face reader, so the reader's bias cancels), takes away
what the sliders already did, and spreads the rest smoothly over the face surface:

    d(v) = sum_i g(|v - p_i|) r_i / sum_i g(|v - p_i|)  * fade(v),   g = Gaussian of width sigma

(a partition-of-unity blend, so it can never overshoot), fading to nothing away from the face. Sideways
and up/down are trusted fully (`--strength`); depth, which photos measure poorly, only partly
(`--depth`). Points the photos disagree on (large spread) count less. Every vertex near the face moves,
including the eyeball and teeth helpers, so eyes and mouth stay seated.

The result is a MakeHuman target file (one line per moved vertex: index dx dy dz), loaded like any
other face target. It is the person's shape only: no photo pixels.
"""
import argparse
import gzip
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TARGETS = os.environ.get("MPFB_TARGETS", "/root/.config/blender/5.2/extensions/user_default/mpfb/data/targets")
TO_LOCAL = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) * 0.1

ap = argparse.ArgumentParser()
ap.add_argument("base")
ap.add_argument("face")
ap.add_argument("shape")
ap.add_argument("ref_shape")
ap.add_argument("out")
ap.add_argument("--strength", type=float, default=0.8)
ap.add_argument("--depth", type=float, default=0.3)
ap.add_argument("--sigma", type=float, default=0.14, help="blend width, in eye-corner distances")
ap.add_argument("--points3d", help="the person's 3D face points from solve_points3d.py (used instead of the shape files)")
a = ap.parse_args()


def load_target(name):
    if os.path.isabs(name) and os.path.exists(name):
        path = name
    else:
        group = name.split("-")[0] if not name[:2] in ("l-", "r-") else name.split("-")[1]
        path = None
        for g in ("head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin", "ears", "neck", group):
            p = os.path.join(TARGETS, g, name + ".target.gz")
            if os.path.exists(p):
                path = p
                break
        if path is None:
            raise SystemExit(f"DETAIL target not found: {name}")
    opener = gzip.open if path.endswith(".gz") else open
    rows = []
    with opener(path, "rt") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                q = line.split()
                rows.append((int(q[0]), float(q[1]), float(q[2]), float(q[3])))
    return rows


base = np.load(a.base)
co0 = base["co"].astype(np.float64)
co = co0.copy()
import sys  # noqa: E402
sys.path.insert(0, HERE)
import targets as _targets  # noqa: E402
co = _targets.apply(co0, json.load(open(a.face))["targets"])

corr = json.load(open(os.path.join(HERE, "..", "fit", "corr.json")))["points"]
used = [i for i, c in enumerate(corr) if c]


def lmk(c):
    return np.array([sum(c[int(k)] * w for k, w in corr[i].items()) for i in used])


L0, L1 = lmk(co0), lmk(co)
S = json.load(open(a.shape))
her = np.array(S["shape"])[used]
ref = np.array(json.load(open(a.ref_shape))["shape"])[used]
spread = np.array(S.get("spread", [0.0] * 478))[used]
s = np.linalg.norm(L0[used.index(33)] - L0[used.index(263)])


def to_det(d):
    """Model axes (x person's left, -y forward, z up) to the face reader's (x right, y up, z to camera)."""
    return np.c_[d[:, 0], d[:, 2], -d[:, 1]] / s


def to_model(d):
    return np.c_[d[:, 0], -d[:, 2], d[:, 1]] * s


if a.points3d:
    # The 3D points that explain all the photos together: move the model's points onto them.
    X = np.array(json.load(open(a.points3d))["points"])
    r_model = (X - L1) * a.strength
    r_model[:, 1] *= a.depth / a.strength if a.strength else 0  # depth (front-back) is the least certain
    trust = np.ones(len(used))
    # The inner lip line moves with every expression (pout, smile, open mouth): not shape. The lips' shape
    # comes from their outer line; the inner points just follow it.
    INNER_LIPS = {78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95}
    inner = np.array([i in INNER_LIPS for i in used])
    trust[inner] = 0.0
    r_model[inner] = 0.0
    # No single point may move more than a quarter of an eye width (a misread point, not a face).
    n = np.linalg.norm(r_model, axis=1, keepdims=True)
    r_model *= np.minimum(1, 0.25 * s / (n + 1e-12))
    want = to_det(X - L0)
    got = to_det(L1 - L0)
else:
    want = her - ref
    got = to_det(L1 - L0)
    res = want - got
    res[:, :2] *= a.strength
    res[:, 2] *= a.depth
    # Trust: points whose position varies a lot between photos count less.
    spread_n = np.linalg.norm(spread, axis=1) if spread.ndim == 2 else np.abs(spread)
    trust = 1 / (1 + (spread_n / (np.median(spread_n) + 1e-9)) ** 2)
    r_model = to_model(res)

# Spread over the surface with a partition-of-unity blend (a weighted average of nearby points' moves):
# it can never move any vertex further than the points around it move, so the mouth's inside, teeth and
# eyeballs follow the face calmly. (An exact interpolation fits the points perfectly but can swing wildly
# between them and tear the mouth; it was tried and refused by the check below.) Two passes: the second
# adds back what the averaging smoothed away at the points.
sig = a.sigma * s
P = L1


def field(points, disp, verts):
    out = np.zeros_like(verts)
    for start in range(0, len(verts), 4000):
        blk = verts[start:start + 4000]
        d2 = ((blk[:, None] - points[None]) ** 2).sum(2)
        g = np.exp(-d2 / (2 * sig ** 2)) * np.maximum(trust, 0.02)[None]
        dn = np.sqrt(d2.min(1))
        fade = np.exp(-np.maximum(dn - 0.5 * sig, 0) ** 2 / (2 * (1.2 * sig) ** 2))
        out[start:start + 4000] = (g @ disp) / (g.sum(1, keepdims=True) + 1e-12) * fade[:, None]
    return out


moved = field(P, r_model, co)
got_now = lmk(co + moved) - L1
moved += 0.7 * field(P, r_model - got_now, co)
# Safety: no vertex may move more than the largest point move (plus a little). Anything else is a bug.
limit = np.linalg.norm(r_model, axis=1).max() + 1e-9
nm = np.linalg.norm(moved, axis=1, keepdims=True)
moved *= np.minimum(1, limit / (nm + 1e-12))  # the second pass may not push past the largest point move
worst = np.linalg.norm(moved, axis=1).max()
if worst > 0.35 * s:
    raise SystemExit(f"DETAIL refused: a vertex would move {worst / s:.3f} eye widths (limit {min(limit, 0.35 * s) / s:.3f})")
mask = np.linalg.norm(moved, axis=1) > 1e-6 * s
# MakeHuman target units: local = t @ TO_LOCAL.T, so t = local @ inv(TO_LOCAL).T
inv = np.linalg.inv(TO_LOCAL)
t = moved[mask] @ inv.T
with open(a.out, "w") as f:
    f.write("# Pratibimb face detail (solve_detail.py): the person's own face shape beyond the sliders\n")
    for i, (x, y, z) in zip(np.nonzero(mask)[0], t):
        f.write(f"{i} {x:.5f} {y:.5f} {z:.5f}\n")
after = to_det(lmk(co + moved) - L0)
print("DETAIL residual before", np.abs(want - got)[:, :2].mean().round(4), "after", np.abs(want - after)[:, :2].mean().round(4),
      "(eye widths, sideways+up/down); moved", int(mask.sum()), "vertices; wrote", a.out)
