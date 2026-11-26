"""The person's own 3D face points from all their photos at once (stage 5b, before solve_detail.py).

  python3 scripts/teacher/maker/solve_points3d.py <base.npz> <face.json> <points.json> <out.json> \
      [--prior 0.5] [--iters 12] [--check]

Starting from the fitted model's face points (sliders applied), it alternates:
  1. a projective camera for every photo (normalised DLT) from the current 3D points;
  2. every 3D point re-solved from all photos where it is seen (linear triangulation), pulled gently
     towards the model's own point so photos that disagree or see it badly cannot drag it far.
The result is the 3D shape that best explains every photo together. Mouth points in smiling or open-
mouth photos count less, and so do points on the side of a face turned away from the camera.

--check leaves each photo out in turn and reports how well the others predict it (the real test:
lower than the model's own points means the shape is closer to the person). Writes
{"points": [[x, y, z] per used face point], "used": [...], "error_before": .., "error_after": ..}.
"""
import argparse
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import targets  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("base")
ap.add_argument("face")
ap.add_argument("points")
ap.add_argument("out")
ap.add_argument("--prior", type=float, default=0.5, help="pull towards the model's point (in face-width units)")
ap.add_argument("--iters", type=int, default=12)
ap.add_argument("--check", action="store_true")
a = ap.parse_args()

corr = json.load(open(os.path.join(HERE, "..", "fit", "corr.json")))["points"]
used = [i for i, c in enumerate(corr) if c]
co = targets.apply(np.load(a.base)["co"], json.load(open(a.face))["targets"])
L1 = np.array([sum(co[int(k)] * w for k, w in corr[i].items()) for i in used])
face_w = float(np.ptp(L1[:, 0]))
MOUTH = {0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 291,
         308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415}
is_mouth = np.array([i in MOUTH for i in used])

views = []
for name, r in json.load(open(a.points)).items():
    x = np.array(r["landmarks"])[used][:, :2] / r["face_px"]  # in face widths, so photos weigh alike
    w = np.ones(len(used))
    if r.get("smile", 0) > 0.25 or r.get("jaw", 0) > 0.15 or r.get("pucker", 0) > 0.4:
        w[is_mouth] = 0.15
    # The side of the face turned away is seen edge-on: its points are less exact.
    yaw = r.get("yaw", 0.0)
    side = np.sign(L1[:, 0]) * np.sign(yaw)  # +1 on the side turned away
    w *= np.where(side > 0, 1 - min(0.7, abs(yaw) / 60), 1.0)
    views.append((name, x, w))


def dlt(X, x, w=None):
    mX, sX = X.mean(0), np.sqrt(((X - X.mean(0)) ** 2).sum(1).mean() / 3)
    mx, sx = x.mean(0), np.sqrt(((x - x.mean(0)) ** 2).sum(1).mean() / 2)
    TX = np.diag([1 / sX] * 3 + [1.0]); TX[:3, 3] = -mX / sX
    Tx = np.diag([1 / sx] * 2 + [1.0]); Tx[:2, 2] = -mx / sx
    Xn = (np.c_[X, np.ones(len(X))] @ TX.T)[:, :3]
    xn = (np.c_[x, np.ones(len(x))] @ Tx.T)[:, :2]
    w = np.ones(len(X)) if w is None else np.sqrt(w)
    A = np.zeros((2 * len(X), 12))
    A[0::2, 0:3], A[0::2, 3] = Xn, 1
    A[0::2, 8:11], A[0::2, 11] = -xn[:, :1] * Xn, -xn[:, 0]
    A[1::2, 4:7], A[1::2, 7] = Xn, 1
    A[1::2, 8:11], A[1::2, 11] = -xn[:, 1:2] * Xn, -xn[:, 1]
    A *= np.repeat(w, 2)[:, None]
    P = np.linalg.inv(Tx) @ np.linalg.svd(A)[2][-1].reshape(3, 4) @ TX
    return P / np.linalg.norm(P[2, :3])


def project(P, X):
    h = np.c_[X, np.ones(len(X))] @ P.T
    return h[:, :2] / h[:, 2:3]


def err(P, X, x):
    return float(np.linalg.norm(project(P, X) - x, axis=1).mean())


def solve(vs, iters):
    X = L1.copy()
    lam = a.prior / face_w  # prior strength per face width of 3D movement
    for _ in range(iters):
        Ps = [dlt(X, x, w) for _, x, w in vs]
        # Linear triangulation with a prior: for each point, rows (P0 - u P2)·[X,1] = 0, (P1 - v P2)·[X,1] = 0.
        Xn = np.empty_like(X)
        for i in range(len(X)):
            rows, rhs = [], []
            for P, (_, x, w) in zip(Ps, vs):
                u, v = x[i]
                depth = P[2, :3] @ X[i] + P[2, 3]  # makes the linear rows measure image distance
                for r, c in ((P[0] - u * P[2], 0), (P[1] - v * P[2], 1)):
                    s = np.sqrt(w[i]) / max(abs(depth), 1e-6)
                    rows.append(r[:3] * s)
                    rhs.append(-r[3] * s)
            rows += list(np.eye(3) * lam)
            rhs += list(L1[i] * lam)
            Xn[i] = np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)[0]
        X = Xn
    return X, [dlt(X, x, w) for _, x, w in vs]


def mean_err(X, vs, Ps=None):
    Ps = Ps or [dlt(X, x, w) for _, x, w in vs]
    return float(np.mean([err(P, X, x) for P, (_, x, w) in zip(Ps, vs)]))


before = mean_err(L1, views)
X, Ps = solve(views, a.iters)
after = mean_err(X, views, Ps)
print(f"POINTS3D fit error (face widths): model {before:.4f} -> person {after:.4f} over {len(views)} photos")
out = {"used": used, "points": X.tolist(), "error_before": before, "error_after": after}
if a.check and len(views) > 2:
    held = []
    for k in range(len(views)):
        rest = views[:k] + views[k + 1:]
        Xk, _ = solve(rest, a.iters)
        _, x, w = views[k]
        held.append((err(dlt(L1, x, w), L1, x), err(dlt(Xk, x, w), Xk, x)))
    hb, ha = np.mean(held, 0)
    print(f"POINTS3D held-out check: model {hb:.4f} -> person {ha:.4f} (each photo predicted by the others)")
    out["held_out"] = [hb, ha]
json.dump(out, open(a.out, "w"))
