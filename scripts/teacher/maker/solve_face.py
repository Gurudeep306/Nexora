"""Solve MakeHuman's face controls so the model's face matches a person's photos.

  python3 scripts/teacher/maker/solve_face.py <base.npz> <shape.json> <out.json> [--strength 1.0]

Inputs: the base body exported by export_base.py, and the person's 3D face points from
scripts/teacher/fit/shape.py (MediaPipe's 478 points, lined up over all photos).

Every face control is a MakeHuman target (CC0): a set of vertex moves such as "nose wider" or
"chin forward". The 478 points sit on the mesh (scripts/teacher/fit/corr.json), so each control moves
each point by a known amount, and the face points are a linear function of the control values. We
solve for the values (each 0..1) that bring the model's points closest to the person's points, after
lining the two up (position, turn, size). Depth from photos is less sure than width and height, so it
counts half. A small penalty keeps controls at zero unless the photos need them, which keeps faces
natural. The result is a list of controls with values: the person's face "features".
"""
import argparse
import gzip
import json
import os

import numpy as np
from scipy.optimize import lsq_linear

HERE = os.path.dirname(os.path.abspath(__file__))
TARGETS = os.environ.get("MPFB_TARGETS", "/root/.config/blender/5.2/extensions/user_default/mpfb/data/targets")
GROUPS = ["head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin"]
INNER_LIPS = {13, 14, 78, 80, 81, 82, 87, 88, 95, 178, 191, 308, 310, 311, 312, 317, 318, 324, 402, 415}
# MakeHuman's files are y-up, z-forward, in decimetres; the Blender body is z-up, -y forward, metres.
TO_LOCAL = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) * 0.1

ap = argparse.ArgumentParser()
ap.add_argument("base")
ap.add_argument("shape")
ap.add_argument("out")
ap.add_argument("--strength", type=float, default=1.0, help="0..1: how far to move from the average face")
ap.add_argument("--ridge", type=float, default=0.02)
ap.add_argument("--depth", type=float, default=0.5)
ap.add_argument("--reference", help="the base model's own points, read by the same photo reader from renders (fit/corr.py): fit the difference, so the reader's own bias cancels")
args = ap.parse_args()

base = np.load(args.base)
co = base["co"]
corr = json.load(open(os.path.join(HERE, "..", "fit", "corr.json")))["points"]
shape = np.array(json.load(open(args.shape))["shape"])
used = [i for i, c in enumerate(corr) if c and i not in INNER_LIPS]
Wc = np.zeros((len(used), len(co)))
for r, i in enumerate(used):
    for k, w in corr[i].items():
        Wc[r, int(k)] = w
P0 = Wc @ co


def read_target(path):
    delta = np.zeros_like(co)
    with gzip.open(path, "rt") as f:
        for line in f:
            if not line.strip() or line.startswith("#"):
                continue
            p = line.split()
            delta[int(p[0])] = [float(p[1]), float(p[2]), float(p[3])]
    return delta @ TO_LOCAL.T


names, cols = [], []
for g in GROUPS:
    for fn in sorted(os.listdir(os.path.join(TARGETS, g))):
        if fn.endswith(".target.gz"):
            d = Wc @ read_target(os.path.join(TARGETS, g, fn))
            if np.abs(d).max() > 1e-6:
                names.append(fn[: -len(".target.gz")])
                cols.append(d.ravel())
J = np.array(cols).T  # (points*3, controls)
print("SOLVE", len(names), "face controls over", len(used), "points")


def align(src, dst):
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    U, S, Vt = np.linalg.svd(b.T @ a)
    d = np.sign(np.linalg.det(U @ Vt))
    D = np.diag([1, 1, d])
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / (a ** 2).sum()
    return s * a @ R.T + md


face_w = np.ptp(P0[:, 0])
if args.reference:
    # Person minus base model, both as the photo reader sees them, carried onto the mesh.
    ref = np.array(json.load(open(args.reference))["shape"])
    her_on_ref = align(shape[used], ref[used])
    ref_on_mesh = align(ref[used], P0)
    s_ = np.linalg.norm(ref_on_mesh - ref_on_mesh.mean(0)) / np.linalg.norm(ref[used] - ref[used].mean(0))
    a, b = ref[used] - ref[used].mean(0), ref_on_mesh - ref_on_mesh.mean(0)
    U, S, Vt = np.linalg.svd(b.T @ a)
    R = U @ np.diag([1, 1, np.sign(np.linalg.det(U @ Vt))]) @ Vt
    wanted = P0 + s_ * (her_on_ref - ref[used]) @ R.T
    print("SOLVE relative fit: person vs base differ by", round(float(np.linalg.norm(wanted - P0, axis=1).mean() / face_w), 4), "face widths")
else:
    wanted = None
w = np.ones((len(used), 3))
w[:, 1] = args.depth  # local y is depth (out of the face)
c = np.zeros(len(names))
for it in range(6):
    P = P0 + (J @ c).reshape(-1, 3)
    H = wanted if wanted is not None else align(shape[used], P)  # the person's points, placed on the model
    target = (H - P0) / face_w
    A = (J / face_w) * w.ravel()[:, None]
    bvec = target.ravel() * w.ravel()
    # Ridge: append sqrt(lambda) * I rows.
    A2 = np.vstack([A, np.sqrt(args.ridge) * np.eye(len(names))])
    b2 = np.concatenate([bvec, np.zeros(len(names))])
    c = lsq_linear(A2, b2, bounds=(0, 1), lsmr_tol="auto").x
    err = np.linalg.norm((P0 + (J @ c).reshape(-1, 3) - H) / face_w, axis=1)
    print(f"SOLVE pass {it + 1}: mean point error {err.mean():.4f} face widths (start {np.linalg.norm((P0 - H) / face_w, axis=1).mean():.4f})")

c *= args.strength
features = {n: round(float(v), 3) for n, v in sorted(zip(names, c), key=lambda x: -x[1]) if v > 0.02}
json.dump({"targets": features, "error": round(float(err.mean()), 4)}, open(args.out, "w"), indent=1)
print("SOLVE", len(features), "controls used; strongest:", list(features.items())[:12])
