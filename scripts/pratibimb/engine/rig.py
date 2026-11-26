"""The person's own rig: their 3D face, head shell (hair, ears, neck) and shoulders, moved by their own way of
moving. Built in seconds from the identity pack's frames; no generic body model (SMPL-X / FLAME / MANO are
non-commercial and are never used).

Geometry
- Face: the 468 MediaPipe face points (Apache-2.0 topology) of every captured frame. Each frame's head pose
  (rotation, scale, position) is taken out by a Procrustes fit on the stable points (forehead, nose bridge,
  temples, eye corners), leaving the face in the head's own frame.
- Expression model: the person's own linear map from the 52 expression values to their face shape, fitted on
  all their frames (ridge regression). It is their mouth, their smile, not a generic one.
- Head shell: rings outside the face oval (hair, ears, back of the head) and a neck ring, attached to the head.
- Shoulders: from the captured body points, in the camera frame; the neck blends between head and shoulders.
- Mouth cavity: a fan of triangles from the inner lip ring to points behind the lips, moving with the jaw, so
  teeth and tongue get their own learned layer.

Units: "head units", where 1 = distance between the outer eye corners (about 9 cm on adults).
"""
import json
import math

import numpy as np
from scipy.spatial import Delaunay

OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
        136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
INNER_LIPS = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95]
STABLE = [10, 151, 9, 8, 168, 6, 197, 33, 133, 263, 362, 127, 356, 234, 454, 109, 338, 67, 297, 1, 4]


def procrustes(src, dst):
    """Similarity (s, R, t) with dst ≈ s * src @ R.T + t."""
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    U, S, Vt = np.linalg.svd(b.T @ a)
    D = np.eye(3)
    D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt
    s = float((S * np.diag(D)).sum() / (a ** 2).sum())
    return s, R, md - s * ms @ R.T


def rot_ypr(yaw, pitch, roll):
    """Rotation from yaw / pitch / roll in degrees (MediaPipe's convention: +yaw = towards the person's left)."""
    y, p, r = (math.radians(v) for v in (yaw, pitch, roll))
    Ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    Rx = np.array([[1, 0, 0], [0, math.cos(p), -math.sin(p)], [0, math.sin(p), math.cos(p)]])
    Rz = np.array([[math.cos(r), -math.sin(r), 0], [math.sin(r), math.cos(r), 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


class Rig:
    def __init__(self, mean, W, face_tri, shell_index, tri, cavity, shoulders, names):
        self.mean, self.W = mean, W                # local face (468x3) and expression map (53 x 1404)
        self.face_tri, self.tri = face_tri, tri    # MediaPipe triangles; all triangles (face + shell + cavity)
        self.shell_index = shell_index             # how the shell points are made from the face (see _shell)
        self.cavity = cavity                       # (inner lip ids, depth)
        self.shoulders = shoulders                 # local shoulder points (head units, relative to the chin)
        self.names = names

    # --- building ---------------------------------------------------------------------------------------
    @staticmethod
    def build(landmarks, blend, names, face_tri, body=None, ridge=0.05):
        """landmarks: (n, >=468, 3) per frame in pixels; blend: (n, 52); body: (n, 33, 3) normalised or None."""
        L = np.asarray(landmarks, np.float64)[:, :468]
        ref = L[0].copy()
        for _ in range(3):  # align everything to an evolving mean shape
            loc = np.array([Rig._to_local(x, ref)[0] for x in L])
            ref = loc.mean(0)
        # A fixed frame for the head: origin between the eyes, x towards the person's left eye (image right),
        # y down towards the chin, z away from the camera; 1 unit = outer eye-corner distance.
        x = ref[263] - ref[33]
        iod = float(np.linalg.norm(x))
        x = x / iod
        y = ref[152] - ref[10]
        y = y - x * (y @ x)
        y = y / np.linalg.norm(y)
        R0 = np.stack([x, y, np.cross(x, y)])
        o = ref[168]
        loc = (loc - o) @ R0.T / iod
        ref = (ref - o) @ R0.T / iod
        X = np.c_[np.asarray(blend, np.float64), np.ones(len(L))]
        lam = ridge * len(L) * np.eye(X.shape[1])
        lam[-1, -1] = 0
        W = np.linalg.solve(X.T @ X + lam, X.T @ loc.reshape(len(L), -1))
        mean = W[-1].reshape(468, 3)  # the face with every expression value at 0
        shell_index = Rig._shell_plan()
        cavity = (INNER_LIPS, 0.35)
        shoulders = np.array([[-1.9, 1.9, 0.6], [1.9, 1.9, 0.6], [-2.6, 3.0, 0.9], [2.6, 3.0, 0.9]])
        if body is not None:
            shoulders = Rig._shoulders_from_body(body, L, loc, iod) or shoulders
        rig = Rig(mean, W, np.asarray(face_tri), shell_index, None, cavity, shoulders, list(names))
        rig.tri = rig._triangulate()
        rig.fit_error = float(np.sqrt(((X @ W - loc.reshape(len(L), -1)) ** 2).mean()))
        return rig

    @staticmethod
    def _to_local(xy, ref):
        s, R, t = procrustes(xy[STABLE], ref[STABLE])
        return s * xy @ R.T + t, (s, R, t)

    @staticmethod
    def _shoulders_from_body(body, L, loc, iod):
        return None  # v1: a fixed, proportion-based torso; the measured one comes with the body stage

    @staticmethod
    def _shell_plan():
        return {"rings": [(1.35, -0.10, 0.10), (1.75, -0.22, 0.35), (2.05, -0.30, 0.75)], "neck": [(0.55, 0.9), (0.7, 1.5)]}

    # --- geometry ----------------------------------------------------------------------------------------
    def face(self, blend):
        """Local face (468x3, head units) for a set of 52 expression values."""
        return (np.r_[np.asarray(blend, np.float64), 1.0] @ self.W).reshape(468, 3)

    def _shell(self, F):
        """Points outside the face, attached to the head (and a neck that drops towards the shoulders)."""
        ctr = F[OVAL].mean(0)
        o = F[OVAL] - ctr
        pts = []
        for grow, up, back in self.shell_index["rings"]:
            ring = ctr + o * grow + np.array([0, up, 0])
            ring[:, 2] = ring[:, 2] + back
            pts.append(ring)
        chin = F[152]
        for width, down in self.shell_index["neck"]:
            pts.append(np.array([[chin[0] + width * k, chin[1] + down, chin[2] + 0.3] for k in (-1, -0.5, 0.5, 1)]))
        return np.vstack(pts)

    def _cavity(self, F):
        ids, depth = self.cavity
        ring = F[ids]
        c = ring.mean(0) + np.array([0, 0, depth])
        return np.vstack([ring.mean(0) + (ring - ring.mean(0)) * 0.6 + np.array([0, 0, depth * 0.5]), c[None]])

    def vertices(self, blend):
        """All rig points in the head's local frame: face, shell, cavity (shoulders are placed separately)."""
        F = self.face(blend)
        return np.vstack([F, self._shell(F), self._cavity(F)])

    def _triangulate(self):
        F = self.face(np.zeros(len(self.names)))
        V = self.vertices(np.zeros(len(self.names)))
        n_face, n_shell = 468, len(self._shell(F))
        tris = [tuple(t) for t in self.face_tri]
        # Shell: Delaunay on the frontal projection of the oval + shell rings, keeping triangles outside the face.
        ids = OVAL + list(range(n_face, n_face + n_shell))
        d = Delaunay(V[ids, :2])
        oval_set = set(OVAL)
        for s in d.simplices:
            g = [ids[k] for k in s]
            if all(x in oval_set for x in g):
                continue
            tris.append(tuple(g))
        # Mouth cavity: inner lip ring → inner ring → back point.
        ids_l = INNER_LIPS
        base = n_face + n_shell
        m = len(ids_l)
        for k in range(m):
            a, b = ids_l[k], ids_l[(k + 1) % m]
            ia, ib = base + k, base + (k + 1) % m
            tris += [(a, b, ib), (a, ib, ia), (ia, ib, base + m)]
        return np.array(tris, np.int64)

    def place(self, V, scale, R, t):
        """Local points → image pixels (orthographic: x right, y down, z away)."""
        return scale * V @ R.T + t

    # --- saving ------------------------------------------------------------------------------------------
    def to_npz(self):
        return {"rig_mean": self.mean, "rig_W": self.W, "rig_face_tri": self.face_tri, "rig_tri": self.tri,
                "rig_shoulders": self.shoulders, "rig_names": np.array(self.names), "rig_meta": json.dumps(
                    {"shell": self.shell_index, "cavity": [self.cavity[0], self.cavity[1]]})}

    @staticmethod
    def from_npz(z):
        meta = json.loads(str(z["rig_meta"]))
        shell = {k: [tuple(x) for x in v] for k, v in meta["shell"].items()}
        r = Rig(z["rig_mean"], z["rig_W"], z["rig_face_tri"], shell, z["rig_tri"], (meta["cavity"][0], meta["cavity"][1]),
                z["rig_shoulders"], [str(n) for n in z["rig_names"]])
        return r
