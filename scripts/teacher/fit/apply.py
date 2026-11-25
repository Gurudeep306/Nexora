"""Bend the MakeHuman face to a person's face shape (shape.py), inside Blender.

The 478 face points sit on the base mesh (corr.json). The person's shape is lined up on those points
(similarity: the head keeps MakeHuman's size and place), and the difference at each point is spread
smoothly over the face with radial basis functions. It fades out towards the ears, scalp and neck, so
the head stays whole and hair and clothes still fit. Depth from photos is less sure than width and
height, so depth changes are damped (`depth`).
"""
import json

import numpy as np


INNER_LIPS = {13, 14, 78, 80, 81, 82, 87, 88, 95, 178, 191, 308, 310, 311, 312, 317, 318, 324, 402, 415}


def _align(src, dst):
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    U, S, Vt = np.linalg.svd(b.T @ a)
    d = np.sign(np.linalg.det(U @ Vt))
    D = np.diag([1, 1, d])
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / (a ** 2).sum()
    return s * a @ R.T + md


def fit_face(basemesh, shape_path, corr_path, amount=1.0, depth=0.6, log=print):
    mesh = basemesh.data
    n = len(mesh.vertices)
    co = np.empty(n * 3)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    corr = json.load(open(corr_path))["points"]
    shape = np.array(json.load(open(shape_path))["shape"])
    used = [i for i, c in enumerate(corr) if c]
    P = np.array([sum(co[int(k)] * w for k, w in corr[i].items()) for i in used])
    # The inner lip line: where it lands on a closed MakeHuman mouth is not reliable, so it is left out.
    used = [i for i in used if i not in INNER_LIPS]
    P = np.array([sum(co[int(k)] * w for k, w in corr[i].items()) for i in used])
    # Same handedness as MakeHuman's mesh (measured: this mapping lines up best).
    H = _align(shape[used], P)
    face_w = np.ptp(P[:, 0])
    resid = np.linalg.norm(H - P, axis=1)
    keep = resid < max(3 * np.median(resid), 0.08 * face_w)
    log("fit points", int(keep.sum()), "of", len(used), "; median difference", round(float(np.median(resid) / face_w), 3), "face widths")
    P, H = P[keep], _align(shape[np.array(used)[keep]], P[keep])
    D = (H - P) * amount
    # Depth here is local z (out of the face).
    D[:, 2] *= depth
    sigma = face_w / 7.0

    def kernel(r):
        return np.exp(-(r / sigma) ** 2)

    K = kernel(np.linalg.norm(P[:, None] - P[None], axis=2))
    coef = np.linalg.solve(K + np.eye(len(P)) * 0.05, D)
    # Only vertices near the face move; the weight fades from the face points out to 0.35 face widths.
    dist = np.full(n, np.inf)
    for start in range(0, n, 2000):
        block = co[start:start + 2000]
        dist[start:start + 2000] = np.sqrt(((block[:, None] - P[None]) ** 2).sum(2)).min(1)
    fade = np.clip(1 - (dist - 0.05 * face_w) / (0.35 * face_w), 0, 1)
    fade = fade * fade * (3 - 2 * fade)
    idx = np.nonzero(fade > 0)[0]
    disp = kernel(np.linalg.norm(co[idx][:, None] - P[None], axis=2)) @ coef
    co[idx] += disp * fade[idx, None]
    mesh.vertices.foreach_set("co", co.ravel())
    mesh.update()
    log("fit moved", len(idx), "vertices; largest change", round(float(np.abs(D).max() / face_w), 3), "face widths")
