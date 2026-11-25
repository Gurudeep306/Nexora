"""One 3D face shape from several photos' MediaPipe points (detect.py output).

  python3 scripts/teacher/fit/shape.py <out.json> <points.json>:<photo name> ...

Each view's 478 points (x right, y up, z towards the camera) are lined up on a common shape with a
similarity transform (Procrustes), so head turns cancel. Points on the side of the face turned away
from the camera, and mouth points in smiling views, count less. The result is centred and scaled so
the distance between the eye corners is 1. Only the shape is kept, never the photo.
"""
import json
import sys

import numpy as np

out = sys.argv[1]
views = []
for arg in sys.argv[2:]:
    path, name = arg.split(":", 1)
    rec = json.load(open(path))[name]
    L = np.array(rec["landmarks"], dtype=float)
    L[:, 1] *= -1  # y up
    L[:, 2] *= -1  # z towards the camera
    views.append((name, L, rec))

MOUTH = sorted({0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269, 270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415})
EYE_OUTER = (33, 263)


def normalise(L):
    c = L.mean(0)
    s = np.linalg.norm(L[EYE_OUTER[0]] - L[EYE_OUTER[1]])
    return (L - c) / s


def align(src, dst, w):
    """Similarity transform taking src onto dst (weighted Umeyama)."""
    w = w / w.sum()
    ms, md = (w[:, None] * src).sum(0), (w[:, None] * dst).sum(0)
    a, b = src - ms, dst - md
    cov = (w[:, None] * b).T @ a
    U, S, Vt = np.linalg.svd(cov)
    d = np.sign(np.linalg.det(U @ Vt))
    D = np.diag([1, 1, d])
    R = U @ D @ Vt
    scale = (S * np.diag(D)).sum() / (w * (a ** 2).sum(1)).sum()
    return scale * a @ R.T + md


ref = normalise(next(L for n, L, r in views if abs(r["yaw"]) == min(abs(v[2]["yaw"]) for v in views)))
weights = []
for name, L, rec in views:
    w = np.ones(478)
    yaw = rec["yaw"]
    side = np.sign(ref[:, 0])  # +1 = the person's left in the picture's right
    # MediaPipe yaw > 0: the face turns to its own left, so the picture-right half turns away.
    away = (side * np.sign(yaw)) > 0
    w[away] = max(0.15, 1 - abs(yaw) / 40)
    if rec["smile"] > 0.2 or rec["jaw"] > 0.15:
        w[MOUTH] = 0.05
    weights.append(w)
weights = np.array(weights)

shape = ref.copy()
for _ in range(6):
    aligned = np.array([align(normalise(L), shape, weights[k]) for k, (_, L, _) in enumerate(views)])
    shape = (aligned * weights[:, :, None]).sum(0) / weights.sum(0)[:, None]
    shape = normalise(shape)
spread = np.sqrt((((aligned - shape) ** 2).sum(2) * weights).sum(0) / weights.sum(0))
json.dump({"shape": shape.round(5).tolist(), "views": [v[0] for v in views], "spread": spread.round(4).tolist()}, open(out, "w"))
print("SHAPE views", len(views), "mean spread", round(float(spread.mean()), 4), "worst", round(float(spread.max()), 4))
