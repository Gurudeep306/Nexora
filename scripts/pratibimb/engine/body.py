"""Our own upper body, generated from the person's measurements: skeleton, surface, hands, clothes, poses.

No body model or asset from anyone else. The surface is made of "generalised tubes": rings of points along
each bone chain, with a radius profile from human proportions (anthropometric ratios, scaled to the person's
measured shoulder width and sex). Every ring is skinned to its bones with smooth weights, so elbows, wrists
and fingers bend without tearing. Clothes are new tubes over the body (eased, with collar and sleeve
length), coloured from a wardrobe, never taken from the capture.

Units: metres; x to the person's left (image right), y up, z towards the camera. Rest pose: standing, arms
relaxed at the sides.
"""
import math

import numpy as np

# Hand: MediaPipe's 21-point layout (wrist, then 4 points per finger, thumb first).
FINGERS = {"thumb": (1, 2, 3, 4), "index": (5, 6, 7, 8), "middle": (9, 10, 11, 12), "ring": (13, 14, 15, 16), "pinky": (17, 18, 19, 20)}


def rot(axis, ang):
    axis = np.asarray(axis, np.float64)
    axis = axis / (np.linalg.norm(axis) + 1e-12)
    x, y, z = axis
    c, s = math.cos(ang), math.sin(ang)
    C = 1 - c
    return np.array([[c + x * x * C, x * y * C - z * s, x * z * C + y * s],
                     [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
                     [z * x * C - y * s, z * y * C + x * s, c + z * z * C]])


class Skeleton:
    """Joints with parents and rest positions (metres). Posing = local rotations about each joint."""

    def __init__(self):
        self.names, self.parent, self.rest = [], [], []

    def add(self, name, parent, pos):
        self.names.append(name)
        self.parent.append(self.names.index(parent) if parent else -1)
        self.rest.append(np.asarray(pos, np.float64))
        return len(self.names) - 1

    def idx(self, name):
        return self.names.index(name)

    def world(self, rots=None):
        """World (R, p) of every joint: rots = {joint name: 3x3 rotation in the parent's frame}."""
        rots = rots or {}
        Rw, Pw = [], []
        for i, n in enumerate(self.names):
            R = rots.get(n, np.eye(3))
            if self.parent[i] < 0:
                Rw.append(R)
                Pw.append(self.rest[i].copy())
            else:
                pi = self.parent[i]
                Rw.append(Rw[pi] @ R)
                Pw.append(Pw[pi] + Rw[pi] @ (self.rest[i] - self.rest[pi]))
        return Rw, Pw


def proportions(shoulder_m=None, sex="neutral", head_iod_m=0.09):
    """Body measures in metres. Measured shoulder width when known, else from the head size; the rest from
    adult anthropometric ratios (relative to the shoulder-landmark width)."""
    sw = shoulder_m or head_iod_m * (4.0 if sex == "male" else 3.6)
    f = 1.0 if sex == "male" else 0.96
    return {
        "shoulder": sw, "upper_arm": 0.83 * sw * f, "forearm": 0.72 * sw * f, "palm": 0.27 * sw, "finger": 0.24 * sw,
        "neck": 0.30 * sw, "torso": 1.45 * sw, "chest_w": 0.92 * sw, "chest_d": 0.62 * sw * (0.95 if sex == "female" else 1.0),
        "waist_w": 0.78 * sw * (0.92 if sex == "female" else 1.0), "waist_d": 0.55 * sw, "neck_r": 0.16 * sw,
        "arm_r": 0.13 * sw, "forearm_r": 0.10 * sw, "wrist_r": 0.075 * sw, "sex": sex,
    }


def build_skeleton(P):
    S = Skeleton()
    sw = P["shoulder"]
    S.add("pelvis", None, [0, 0, 0])
    S.add("spine", "pelvis", [0, 0.38 * P["torso"], 0])
    S.add("chest", "spine", [0, 0.72 * P["torso"], 0])
    S.add("neck", "chest", [0, P["torso"], -0.01])
    S.add("head", "neck", [0, P["torso"] + P["neck"], 0.01])
    for side, sx in (("L", 1), ("R", -1)):
        S.add(f"clav{side}", "chest", [sx * 0.06 * sw / 0.36, 0.95 * P["torso"], 0])
        S.add(f"shoulder{side}", f"clav{side}", [sx * sw / 2, 0.93 * P["torso"], -0.01])
        sh = S.rest[-1]
        S.add(f"elbow{side}", f"shoulder{side}", sh + [sx * 0.04, -P["upper_arm"], -0.01])
        el = S.rest[-1]
        S.add(f"wrist{side}", f"elbow{side}", el + [sx * 0.02, -P["forearm"], 0.02])
        wr = S.rest[-1]
        # The hand: palm points down along -y; fingers spread slightly; thumb in front.
        spread = {"thumb": (0.35, 0.45), "index": (0.12, 0.0), "middle": (0.0, 0.0), "ring": (-0.11, 0.0), "pinky": (-0.22, 0.0)}
        lens = {"thumb": (0.32, 0.27, 0.22), "index": (0.42, 0.25, 0.19), "middle": (0.46, 0.28, 0.2), "ring": (0.43, 0.26, 0.19), "pinky": (0.34, 0.2, 0.17)}
        for fname, (a, b, c, d) in FINGERS.items():
            off, fwd = spread[fname]
            base = wr + np.array([sx * off * P["palm"] * 0.9, -P["palm"] * (0.45 if fname == "thumb" else 1.0), fwd * P["palm"]])
            S.add(f"{fname}1{side}", f"wrist{side}", base)
            prev = base
            for k, L in enumerate(lens[fname]):
                step = np.array([sx * off * 0.15 * L, -L, 0.0]) * P["finger"] / 0.42 * (1.0 if fname != "thumb" else 0.9)
                if fname == "thumb":
                    step = np.array([sx * 0.35 * L, -0.75 * L, 0.45 * L]) * P["finger"] / 0.42
                prev = prev + step
                S.add(f"{fname}{k + 2}{side}", f"{fname}{k + 1}{side}" if k else f"{fname}1{side}", prev)
    return S


class Tube:
    """Rings along a chain of joints. Each ring: centre on the chain, an ellipse (rx, rz) in the plane across
    the chain; vertices skinned to the two nearest joints of the chain."""

    def __init__(self, name, chain, radii, rings=8, seg=14, cap_start=False, cap_end=True, layer="skin", colour=None):
        self.name, self.chain, self.radii, self.rings, self.seg = name, chain, radii, rings, seg
        self.cap_start, self.cap_end, self.layer, self.colour = cap_start, cap_end, layer, colour


def tubes_for(P, outfit):
    """The body's tubes, and the outfit's tubes over them."""
    T = []
    sw = P["shoulder"]
    # Torso: pelvis → spine → chest → neck; wide at the chest, narrower at the waist.
    T.append(Tube("torso", ["pelvis", "spine", "chest", "neck"],
                  [(P["waist_w"] / 2, P["waist_d"] / 2), (P["waist_w"] / 2 * 1.02, P["waist_d"] / 2), (P["chest_w"] / 2, P["chest_d"] / 2),
                   (P["neck_r"] * 1.25, P["neck_r"] * 1.15)], rings=14, seg=22, cap_start=True, cap_end=False))
    T.append(Tube("neck", ["neck", "head"], [(P["neck_r"], P["neck_r"] * 0.95), (P["neck_r"] * 0.92, P["neck_r"] * 0.9)],
                  rings=5, seg=16, cap_end=False))
    for s in ("L", "R"):
        T.append(Tube(f"shoulder{s}", [f"clav{s}", f"shoulder{s}"], [(P["arm_r"] * 1.4, P["arm_r"] * 1.15), (P["arm_r"] * 1.15, P["arm_r"])],
                      rings=5, seg=14, cap_end=False, cap_start=False))
        T.append(Tube(f"arm{s}", [f"shoulder{s}", f"elbow{s}", f"wrist{s}"],
                      [(P["arm_r"], P["arm_r"]), (P["forearm_r"] * 1.05, P["forearm_r"]), (P["wrist_r"], P["wrist_r"] * 0.7)],
                      rings=14, seg=14, cap_start=True, cap_end=False))
        T.append(Tube(f"palm{s}", [f"wrist{s}", f"middle1{s}"], [(P["wrist_r"] * 1.05, P["wrist_r"] * 0.55), (P["palm"] * 0.42, P["palm"] * 0.13)],
                      rings=6, seg=14, cap_end=True))
        for fname, ids in FINGERS.items():
            r0 = P["palm"] * (0.085 if fname != "pinky" else 0.07) * (1.15 if fname == "thumb" else 1.0)
            T.append(Tube(f"{fname}{s}", [f"{fname}1{s}", f"{fname}2{s}", f"{fname}3{s}", f"{fname}4{s}"],
                          [(r0, r0 * 0.85), (r0 * 0.9, r0 * 0.78), (r0 * 0.8, r0 * 0.7), (r0 * 0.72, r0 * 0.62)], rings=9, seg=8,
                          cap_start=True, cap_end=True))
    # Clothes: new garments generated over the body.
    if outfit:
        ease = outfit.get("ease", 1.08)
        col = np.array(outfit.get("colour", [0.18, 0.24, 0.36]))
        T.append(Tube("top", ["pelvis", "spine", "chest", "neck"],
                      [(P["waist_w"] / 2 * ease * 1.03, P["waist_d"] / 2 * ease * 1.05), (P["waist_w"] / 2 * ease, P["waist_d"] / 2 * ease),
                       (P["chest_w"] / 2 * ease, P["chest_d"] / 2 * ease), (P["neck_r"] * 1.45, P["neck_r"] * 1.3)],
                      rings=14, seg=24, cap_start=True, cap_end=False, layer="cloth", colour=col))
        sleeve = outfit.get("sleeve", 0.55)  # 0 = sleeveless, 1 = full
        for s in ("L", "R"):
            T.append(Tube(f"topshoulder{s}", [f"clav{s}", f"shoulder{s}"],
                          [(P["arm_r"] * 1.55 * ease, P["arm_r"] * 1.3 * ease), (P["arm_r"] * 1.3 * ease, P["arm_r"] * 1.15 * ease)],
                          rings=5, seg=14, cap_end=False, layer="cloth", colour=col))
            if sleeve > 0:
                chain = [f"shoulder{s}", f"elbow{s}"] + ([f"wrist{s}"] if sleeve > 0.5 else [])
                rr = [(P["arm_r"] * 1.12 * ease, P["arm_r"] * 1.12 * ease), (P["forearm_r"] * 1.25 * ease, P["forearm_r"] * 1.2 * ease)]
                if sleeve > 0.5:
                    rr.append((P["wrist_r"] * 1.6, P["wrist_r"] * 1.3))
                T.append(Tube(f"sleeve{s}", chain, rr, rings=10, seg=14, cap_start=True, cap_end=False, layer="cloth", colour=col,
                              ))
                T[-1].length = sleeve if sleeve <= 0.5 else (sleeve - 0.5) * 2
    return T


def tube_mesh(tube, S, Rw, Pw):
    """Vertices, triangles and per-vertex bone weights of one tube in the current pose."""
    ids = [S.idx(n) for n in tube.chain]
    pts = [Pw[i] for i in ids]
    seglen = [np.linalg.norm(pts[k + 1] - pts[k]) for k in range(len(pts) - 1)]
    total = sum(seglen) + 1e-9
    frac = getattr(tube, "length", 1.0)
    verts, rings = [], []
    up_ref = np.array([0, 0, 1.0])
    for r in range(tube.rings):
        u = r / (tube.rings - 1) * frac
        d = u * total
        k = 0
        while k < len(seglen) - 1 and d > seglen[k]:
            d -= seglen[k]
            k += 1
        t = min(1.0, d / (seglen[k] + 1e-9))
        c = pts[k] * (1 - t) + pts[k + 1] * t
        axis = pts[k + 1] - pts[k]
        axis = axis / (np.linalg.norm(axis) + 1e-12)
        # radius profile along the whole chain (one radius per joint, linear between)
        g = u * (len(tube.radii) - 1)
        i0 = min(int(g), len(tube.radii) - 2)
        w = g - i0
        rx = tube.radii[i0][0] * (1 - w) + tube.radii[i0 + 1][0] * w
        rz = tube.radii[i0][1] * (1 - w) + tube.radii[i0 + 1][1] * w
        # frame across the chain: "side" follows the bone's own rotation so twists carry through
        Rb = Rw[ids[k]]
        side = Rb @ np.array([1.0, 0, 0])
        side = side - axis * (side @ axis)
        if np.linalg.norm(side) < 1e-6:
            side = np.cross(axis, up_ref)
        side = side / (np.linalg.norm(side) + 1e-12)
        fwd = np.cross(axis, side)
        ring = []
        for j in range(tube.seg):
            a = 2 * math.pi * j / tube.seg
            ring.append(len(verts))
            verts.append(c + side * rx * math.cos(a) + fwd * rz * math.sin(a))
        rings.append(ring)
    tris = []
    for r in range(len(rings) - 1):
        for j in range(tube.seg):
            a, b = rings[r][j], rings[r][(j + 1) % tube.seg]
            c2, d2 = rings[r + 1][j], rings[r + 1][(j + 1) % tube.seg]
            tris += [(a, c2, b), (b, c2, d2)]
    V = np.array(verts)
    for end, ring in ((tube.cap_start, rings[0]), (tube.cap_end, rings[-1])):
        if end:
            ci = len(V)
            V = np.vstack([V, V[ring].mean(0)])
            for j in range(tube.seg):
                tris.append((ring[j], ring[(j + 1) % tube.seg], ci))
    return V, np.array(tris, np.int64)


def body_mesh(P, outfit, rots=None, S=None):
    """All tubes in a pose: list of (name, layer, colour, V, F); plus the skeleton world joints."""
    S = S or build_skeleton(P)
    Rw, Pw = S.world(rots)
    out = []
    covered = set()
    if outfit:
        covered = {"torso", "shoulderL", "shoulderR"}  # arms stay: the sleeve is wider and covers the part it reaches
    for t in tubes_for(P, outfit):
        if t.layer == "skin" and t.name in covered:
            continue  # hidden under the garment: not drawn
        V, F = tube_mesh(t, S, Rw, Pw)
        out.append((t.name, t.layer, t.colour, V, F))
    return out, S, Rw, Pw


# --- Poses: gestures as joint rotations (numbers we write), plus two-bone reaching for pointing -----------
def arm_down(side, spread=0.18):
    sx = 1 if side == "L" else -1
    return {f"shoulder{side}": rot([0, 0, 1], sx * spread)}


def gesture(name, P, amount=1.0):
    """A pose for a named gesture. amount 0..1 blends from rest."""
    a = amount
    if name == "namaste":
        r = {}
        for s, sx in (("L", 1), ("R", -1)):
            # upper arm forward and in; forearm bends up and turns in so the palms meet at the chest
            r[f"shoulder{s}"] = rot([0, 0, 1], -sx * 0.18 * a) @ rot([1, 0, 0], -0.45 * a)
            r[f"elbow{s}"] = rot([0, 1, 0], -sx * 0.62 * a) @ rot([1, 0, 0], -2.0 * a)
            r[f"wrist{s}"] = rot([0, 0, 1], sx * 0.35 * a)
        return r
    if name == "explain":  # both forearms up, palms open towards the student
        r = {}
        for s, sx in (("L", 1), ("R", -1)):
            r[f"shoulder{s}"] = rot([1, 0, 0], -0.35 * a) @ rot([0, 0, 1], sx * 0.28 * a)
            r[f"elbow{s}"] = rot([1, 0, 0], -1.45 * a)
            r[f"wrist{s}"] = rot([1, 0, 0], 0.35 * a)
        return r
    if name == "point":  # right hand points up and to the side (towards the board)
        r = arm_down("L")
        r["shoulderR"] = rot([0, 0, 1], -1.05 * a) @ rot([1, 0, 0], -0.5 * a)
        r["elbowR"] = rot([1, 0, 0], -0.35 * a)
        for f in ("middle", "ring", "pinky"):
            for k in (2, 3, 4):
                r[f"{f}{k}R"] = rot([1, 0, 0], -1.1 * a)
        r["thumb2R"] = rot([0, 0, 1], 0.6 * a)
        return r
    if name == "count":  # left hand up, two fingers out
        r = arm_down("R")
        r["shoulderL"] = rot([1, 0, 0], -0.4 * a) @ rot([0, 0, 1], 0.3 * a)
        r["elbowL"] = rot([1, 0, 0], -1.7 * a)
        for f in ("ring", "pinky"):
            for k in (2, 3, 4):
                r[f"{f}{k}L"] = rot([1, 0, 0], -1.2 * a)
        r["thumb2L"] = rot([0, 0, 1], -0.7 * a)
        return r
    return {**arm_down("L"), **arm_down("R")}


def blend_poses(p1, p2, w):
    """Mix two poses (rotation by rotation) with weight w on p2."""
    out = {}
    for k in set(p1) | set(p2):
        A, B = p1.get(k, np.eye(3)), p2.get(k, np.eye(3))
        M = A * (1 - w) + B * w
        U, _, Vt = np.linalg.svd(M)
        out[k] = U @ Vt
    return out
