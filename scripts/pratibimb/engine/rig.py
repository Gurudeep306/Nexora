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
            al = [Rig._to_local(x, ref) for x in L]
            loc = np.array([x[0] for x in al])
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
        shoulders = np.array([[-1.75, 2.15, 0.9], [1.75, 2.15, 0.9]])  # typical adult proportions
        if body is not None:
            poses = [(x[1][0], x[1][1], x[1][2], o, R0, iod) for x in al]
            got = Rig._shoulders_from_body(body, L, loc, poses)
            if got is not None:
                shoulders = got
        rig = Rig(mean, W, np.asarray(face_tri), shell_index, None, cavity, shoulders, list(names))
        rig.tri = rig._triangulate()
        rig.fit_error = float(np.sqrt(((X @ W - loc.reshape(len(L), -1)) ** 2).mean()))
        return rig

    @staticmethod
    def _to_local(xy, ref):
        s, R, t = procrustes(xy[STABLE], ref[STABLE])
        return s * xy @ R.T + t, (s, R, t)

    @staticmethod
    def torso_grid(shoulders_local):
        """A 5 x 7 grid over the upper body from the two shoulder points (head units): from the base of the
        neck down to mid-chest, a little wider than the shoulders, curved back at the sides."""
        lsh, rsh = np.asarray(shoulders_local[0]), np.asarray(shoulders_local[1])
        mid = (lsh + rsh) / 2
        across = rsh - lsh
        width = float(np.linalg.norm(across))
        xdir = across / (width + 1e-9)
        ydir = np.array([0.0, 1.0, 0.0])
        pts = []
        for r, down in enumerate(np.linspace(-0.12, 1.15, 5)):
            for c, u in enumerate(np.linspace(-0.62, 0.62, 7)):
                # the top row narrows into the neck; the sides curve away from the camera
                narrow = 0.55 if r == 0 else 1.0
                p = mid + xdir * u * width * narrow + ydir * down * width * 0.55
                p = p + np.array([0, 0, 0.35 * width * (2 * abs(u)) ** 2])
                pts.append(p)
        return np.array(pts)

    @staticmethod
    def _shoulders_from_body(body, L, loc_frames, poses):
        """The person's shoulders in head units, averaged over frames where both are clearly visible."""
        acc = []
        for b, (s, R, t, o, R0, iod) in zip(body, poses):
            if b is None or b[11][2] < 0.6 or b[12][2] < 0.6:
                continue
            pts = []
            for k in (12, 11):  # the person's right shoulder first (image left)
                p = np.array([b[k][0], b[k][1], 0.0])
                # into the head frame: the frame's similarity onto the reference, then the fixed head axes
                q = s * p @ R.T + t
                q = (q - o) @ R0.T / iod
                pts.append(q)
            acc.append(pts)
        if len(acc) < 3:
            return None
        sh = np.median(np.array(acc), 0)
        sh[:, 2] = 0.9  # behind the face plane (the image gives no depth for the shoulders)
        return sh

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

    def head_vertices(self, blend):
        """Points that move with the head: face, shell, mouth cavity (head frame)."""
        F = self.face(blend)
        return np.vstack([F, self._shell(F), self._cavity(F)])

    def torso_vertices(self):
        return Rig.torso_grid(self.shoulders)

    def vertices(self, blend):
        """All rig points at rest pose (head frame): head points then torso points."""
        return np.vstack([self.head_vertices(blend), self.torso_vertices()])

    def pose(self, blend, head, body, neck_blend=0.5):
        """Rig points in pixels. head / body = (scale, R, t) similarities for the head and the torso. The neck
        ring (the last shell ring) is pulled half way towards where the torso would carry it, so the neck
        bends instead of tearing."""
        Hp = self.head_vertices(blend)
        Tp = self.torso_vertices()
        h = head[0] * Hp @ head[1].T + head[2]
        b = body[0] * Tp @ body[1].T + body[2]
        n_face = 468
        n_shell = len(self._shell(self.face(blend)))
        neck = slice(n_face + n_shell - 8, n_face + n_shell)
        hb = body[0] * Hp[neck] @ body[1].T + body[2]
        h[neck] = (1 - neck_blend) * h[neck] + neck_blend * hb
        return np.vstack([h, b])

    def _triangulate(self):
        F = self.face(np.zeros(len(self.names)))
        V = self.vertices(np.zeros(len(self.names)))
        n_face, n_shell = 468, len(self._shell(F))
        tris = [tuple(t) for t in self.face_tri]
        # Shell: Delaunay on the frontal projection of the oval + shell rings, keeping triangles outside the face.
        n_head = len(self.head_vertices(np.zeros(len(self.names))))
        n_torso = len(self.torso_vertices())
        ids = OVAL + list(range(n_face, n_face + n_shell)) + list(range(n_head, n_head + n_torso))
        d = Delaunay(V[ids, :2])
        oval_set = set(OVAL)
        for s in d.simplices:
            g = [ids[k] for k in s]
            if all(x in oval_set for x in g):
                continue
            P = V[list(g), :2]
            e = max(np.linalg.norm(P[0] - P[1]), np.linalg.norm(P[1] - P[2]), np.linalg.norm(P[2] - P[0]))
            if e > 1.6:  # no long slivers across empty space (e.g. from the hair over a shoulder)
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
