"""Fit the face controls to many photos at once (multi-view), from where the face points really are
in each photo, not from one photo's guessed depth.

  python3 scripts/teacher/maker/solve_multiview.py <base.npz> <init face.json> <out.json> \
      <points.json>:<photo name>[:nomouth] ...

For each photo a real camera is solved (OpenCV solvePnP: a phone-like lens, the head's position and
turn) from the model's face points. The face controls are then changed so that, seen through every
photo's camera, the model's points land where the photo's points are (Gauss-Newton on the image
error, each control kept within 0..1). Cameras and controls are refined in turns. Points on the far
side of a turned head count less, and mouth points are left out for photos marked "nomouth"
(smiling or pouting). Side views fix the nose, lips and chin depth that a front photo cannot see.
"""
import gzip
import json
import os
import sys

import cv2
import numpy as np
from scipy.optimize import lsq_linear

HERE = os.path.dirname(os.path.abspath(__file__))
TARGETS = os.environ.get("MPFB_TARGETS", "/root/.config/blender/5.2/extensions/user_default/mpfb/data/targets")
GROUPS = ["head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin"]
TO_LOCAL = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) * 0.1
INNER_LIPS = {13, 14, 78, 80, 81, 82, 87, 88, 95, 178, 191, 308, 310, 311, 312, 317, 318, 324, 402, 415}
MOUTH = {0, 17, 37, 39, 40, 61, 84, 91, 146, 181, 185, 267, 269, 270, 291, 314, 321, 375, 405, 409} | INNER_LIPS

base_path, init_path, out_path = sys.argv[1:4]
views = []
for a in sys.argv[4:]:
    parts = a.split(":")
    views.append((parts[0], parts[1], "nomouth" in parts[2:]))

base = np.load(base_path)
co0 = base["co"]
corr = json.load(open(os.path.join(HERE, "..", "fit", "corr.json")))["points"]
used = [i for i, c in enumerate(corr) if c and i not in INNER_LIPS]
Wc = np.zeros((len(used), len(co0)))
for r, i in enumerate(used):
    for k, w in corr[i].items():
        Wc[r, int(k)] = w
P0 = Wc @ co0


def read_target(path):
    d = np.zeros_like(co0)
    with gzip.open(path, "rt") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                q = line.split()
                d[int(q[0])] = [float(q[1]), float(q[2]), float(q[3])]
    return d @ TO_LOCAL.T


names, cols = [], []
for g in GROUPS:
    for fn in sorted(os.listdir(os.path.join(TARGETS, g))):
        if fn.endswith(".target.gz"):
            d = Wc @ read_target(os.path.join(TARGETS, g, fn))
            if np.abs(d).max() > 1e-6:
                names.append(fn[:-10])
                cols.append(d)
# Head moves and turns are the camera's job, not the face's: leave them out.
keep = [k for k, n in enumerate(names) if not n.startswith(("head-trans", "head-angle"))]
names, cols = [names[k] for k in keep], [cols[k] for k in keep]
# Left and right move together (a face is close to symmetric; photo noise is not).
SYM = os.environ.get("MV_SYM", "1") == "1"
if SYM:
    merged, mcols = [], []
    for n, col in zip(names, cols):
        if n.startswith("r-") and "l-" + n[2:] in names:
            continue
        if n.startswith("l-") and "r-" + n[2:] in names:
            col = col + cols[names.index("r-" + n[2:])]
            n = "lr-" + n[2:]
        merged.append(n)
        mcols.append(col)
    names, cols = merged, mcols
J = np.stack(cols, 2)  # (points, 3, controls)
init = json.load(open(init_path))["targets"]
c = np.array([(init.get("l-" + n[3:], 0.0) + init.get("r-" + n[3:], 0.0)) / 2 if n.startswith("lr-") else init.get(n, 0.0) for n in names])

# Normals at the face points, for visibility (from the base mesh).
tris = base["tris"]
v0, v1, v2 = co0[tris[:, 0]], co0[tris[:, 1]], co0[tris[:, 2]]
fn_ = np.cross(v1 - v0, v2 - v0)
vn = np.zeros_like(co0)
for k in range(3):
    np.add.at(vn, tris[:, k], fn_)
vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
N = Wc @ vn
N /= np.linalg.norm(N, axis=1, keepdims=True)

obs = []
for pts_path, name, nomouth in views:
    rec = json.load(open(pts_path))[name]
    x = np.array(rec["landmarks"])[used][:, :2]
    W, H = rec["size"]
    f = 1.0 * max(W, H)  # phone cameras: a field of view of roughly 50-60 degrees
    K = np.array([[f, 0, W / 2], [0, f, H / 2], [0, 0, 1]], float)
    w = np.ones(len(used))
    if nomouth:
        w[[k for k, i in enumerate(used) if i in MOUTH]] = 0
    obs.append(dict(name=name, x=x, K=K, w=w, scale=rec["face_px"]))


def project(X, K, rvec, tvec):
    p, _ = cv2.projectPoints(np.ascontiguousarray(X, np.float64), rvec, tvec, K, None)
    return p.reshape(-1, 2)


ridge = float(os.environ.get("MV_RIDGE", "0.05"))
c_init = c.copy()
for it in range(5):
    X = P0 + np.einsum("pdk,k->pd", J, c)
    rows, rhs = [], []
    total_err = 0.0
    for o in obs:
        ok, rvec, tvec = cv2.solvePnP(np.ascontiguousarray(X, np.float64), np.ascontiguousarray(o["x"], np.float64), o["K"], None, flags=cv2.SOLVEPNP_ITERATIVE)
        R, _ = cv2.Rodrigues(rvec)
        Xc = X @ R.T + tvec.ravel()
        # Visibility: normals facing the camera.
        view = -Xc / np.linalg.norm(Xc, axis=1, keepdims=True)
        facing = ((N @ R.T) * view).sum(1)
        vis = np.clip((facing - 0.05) / 0.4, 0, 1) * o["w"]
        u = project(X, o["K"], rvec, tvec)
        r = (o["x"] - u) / o["scale"]
        total_err += float((np.linalg.norm(r, axis=1) * vis).sum() / max(1, vis.sum()))
        fx, fy = o["K"][0, 0], o["K"][1, 1]
        z = Xc[:, 2]
        # d(u)/d(Xc) for a pinhole camera, then chain through R and the control Jacobian.
        du = np.zeros((len(X), 2, 3))
        du[:, 0, 0] = fx / z
        du[:, 0, 2] = -fx * Xc[:, 0] / z ** 2
        du[:, 1, 1] = fy / z
        du[:, 1, 2] = -fy * Xc[:, 1] / z ** 2
        Jp = np.einsum("pij,jk,pkc->pic", du, R, J) / o["scale"]  # (points, 2, controls)
        sw = np.sqrt(vis)[:, None]
        rows.append((Jp * sw[:, :, None]).reshape(-1, len(names)))
        rhs.append((r * sw).ravel())
    # Stay near the starting face unless the photos clearly agree on a change.
    A = np.vstack(rows + [np.sqrt(ridge) * np.eye(len(names))])
    b = np.concatenate(rhs + [np.sqrt(ridge) * (c_init - c)])
    step = lsq_linear(A, b, bounds=(-c, 1 - c), lsmr_tol="auto").x
    c = c + step
    print(f"MULTIVIEW pass {it + 1}: mean image error {total_err / len(obs):.4f} face widths over {len(obs)} photos")

features = {}
for n, v in sorted(zip(names, c), key=lambda x: -x[1]):
    if v <= 0.02:
        continue
    for m in (["l-" + n[3:], "r-" + n[3:]] if n.startswith("lr-") else [n]):
        features[m] = round(float(v), 3)
json.dump({"targets": features, "photos": [o["name"] for o in obs]}, open(out_path, "w"), indent=1)
print("MULTIVIEW", len(features), "controls used; strongest:", list(features.items())[:10])
