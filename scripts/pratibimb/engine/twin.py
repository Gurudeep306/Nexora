"""The twin, drawn: our generated body and clothes plus the person's learned head, in a clean studio light,
the person only (transparent background).

Everything is drawn by our own splat renderer (splats.py): body and clothes surfaces become one flat soft point
per small triangle, shaded by a three-light studio setup (key, fill, rim) from the surface normal; the head
is the learned colour points on the person's rig.
"""
import numpy as np
import torch

from .splats import _render_torch

STUDIO = [  # (direction towards the light, colour, strength)
    (np.array([-0.45, 0.55, 0.70]), np.array([1.0, 0.96, 0.92]), 0.85),  # key, upper left in front
    (np.array([0.60, 0.15, 0.78]), np.array([0.85, 0.9, 1.0]), 0.35),    # fill, right
    (np.array([0.10, 0.50, -0.86]), np.array([1.0, 1.0, 1.0]), 0.35),    # rim, from behind
]
AMBIENT = 0.28


def shade(normals, albedo):
    """Studio light on surfaces (two-sided, soft wrap so skin never goes black)."""
    lit = np.full((len(normals), 3), AMBIENT)
    for d, c, k in STUDIO:
        d = d / np.linalg.norm(d)
        ndl = np.abs(normals @ d)
        wrap = (ndl + 0.25) / 1.25
        lit += k * np.clip(wrap, 0, 1)[:, None] * c[None]
    return np.clip(albedo * lit, 0, 1)


def mesh_splats(V, F, colour, cam):
    """One soft flat point per triangle, in pixels: (mu, u, v, su, sv, rgb)."""
    A, B, C = cam(V[F[:, 0]]), cam(V[F[:, 1]]), cam(V[F[:, 2]])
    Aw, Bw, Cw = V[F[:, 0]], V[F[:, 1]], V[F[:, 2]]
    n = np.cross(Bw - Aw, Cw - Aw)
    n = n / (np.linalg.norm(n, axis=1, keepdims=True) + 1e-12)
    mu = (A + B + C) / 3
    e1 = B - A
    e1 = e1 / (np.linalg.norm(e1, axis=1, keepdims=True) + 1e-9)
    nn = np.cross(B - A, C - A)
    area = np.linalg.norm(nn, axis=1) / 2
    nn = nn / (np.linalg.norm(nn, axis=1, keepdims=True) + 1e-9)
    e2 = np.cross(nn, e1)
    # Sized to the triangle: half its base along e1, a third of its height across (no spikes from slivers).
    base = np.linalg.norm(B - A, axis=1)
    height = 2 * area / (base + 1e-9)
    su = np.clip(0.62 * base, 0.4, None)
    sv = np.clip(0.6 * height, 0.4, None)
    col = shade(n, np.broadcast_to(np.asarray(colour, np.float64), (len(F), 3)))
    return mu, e1, e2, su, sv, col


def render_layers(layers, hw, chunk=4096):
    """layers: list of (mu, u, v, su, sv, rgb[, opacity]) in pixels, all drawn together (depth sorted)."""
    t = lambda x: torch.tensor(np.asarray(x), dtype=torch.float32)  # noqa: E731
    mu = torch.cat([t(L[0]) for L in layers])
    u = torch.cat([t(L[1]) for L in layers])
    v = torch.cat([t(L[2]) for L in layers])
    su = torch.cat([t(np.asarray(L[3]).reshape(-1, 1)) for L in layers])
    sv = torch.cat([t(np.asarray(L[4]).reshape(-1, 1)) for L in layers])
    col = torch.cat([t(L[5]) for L in layers])
    op = torch.cat([t(L[6] if len(L) > 6 else np.full((len(L[0]), 1), 0.97)).reshape(-1, 1) for L in layers])
    with torch.no_grad():
        return _render_torch(mu, u, v, su, sv, col, op, hw, chunk)


def ortho_camera(width_px, height_px, metres_wide, centre_m):
    """World metres (y up, z to camera) → pixels (y down; z = distance from the camera, smaller is nearer)."""
    s = width_px / metres_wide
    cx, cy = width_px / 2, height_px / 2

    def cam(P):
        P = np.asarray(P, np.float64)
        return np.stack([cx + (P[:, 0] - centre_m[0]) * s, cy - (P[:, 1] - centre_m[1]) * s, -(P[:, 2] - centre_m[2]) * s], 1)
    cam.scale = s
    return cam


# --- The twin: the person's learned head on our generated body, in the studio light -------------------------
KEEP_LABELS = (1, 2, 3)  # hair, body skin, face skin; the capture's background and clothes are never used


class Twin:
    def __init__(self, model_dir, sex="neutral", shoulder_m=None, outfit=None):
        import os
        from .body import build_skeleton, proportions
        from .rig import Rig
        from .splats import Splats
        z = np.load(os.path.join(model_dir, "model.npz"))
        self.rig = Rig.from_npz(z)
        self.sp = Splats(len(self.rig.tri), int(z["per_tri"]))
        self.sp.load_state_dict({k[3:]: torch.tensor(z[k]) for k in z.files if k.startswith("sp_")})
        self.tri = torch.tensor(self.rig.tri)
        self.unit_m = float(z["mm_per_unit"]) / 1000 if "mm_per_unit" in z.files else 0.09
        lab = z["point_label"] if "point_label" in z.files else np.full(self.sp.rgb.shape[0], 3)
        self.keep = torch.tensor(np.isin(lab, KEEP_LABELS))
        with torch.no_grad():
            alb = torch.sigmoid(self.sp.rgb).numpy()
        skin_pts = alb[(lab == 3)] if (lab == 3).any() else alb
        self.skin = np.clip(np.median(skin_pts, 0) * 1.08, 0, 1)  # the person's own skin colour, for the body
        self.P = proportions(shoulder_m, sex, head_iod_m=self.unit_m)
        self.S = build_skeleton(self.P)
        self.outfit = outfit if outfit is not None else {"colour": [0.16, 0.27, 0.42], "sleeve": 0.8}

    def head_points(self, blend, Rw, Pw, head_turn=np.eye(3)):
        """The learned head in world metres: rig units → metres, axes (rig: y down, z away) → (y up, z towards
        the camera), turned by the head joint and the requested head turn, eyes ~0.13 m above the head joint."""
        V = self.rig.head_vertices(blend) * self.unit_m * np.array([1, -1, -1])
        hi = self.S.idx("head")
        R = Rw[hi] @ head_turn
        eye_from_joint = np.array([0, 0.115, 0.035])
        # turn about the top of the neck
        return (V + eye_from_joint) @ R.T + Pw[hi]

    def frame(self, blend, head_ypr=(0, 0, 0), pose=None, size=(360, 300), view_m=0.80, centre_y=0.50):
        """One RGBA frame (0..1): the person only, studio light, transparent background."""
        from .body import body_mesh
        from .rig import rot_ypr
        H, W = size
        parts, _, Rw, Pw = body_mesh(self.P, self.outfit, pose or {}, self.S)
        cam = ortho_camera(W, H, view_m, [0, centre_y, 0])
        layers = [mesh_splats(V, F, col if col is not None else self.skin, cam) for _, _, col, V, F in parts if len(F)]
        yaw, pitch, roll = head_ypr
        Hw = self.head_points(blend, Rw, Pw, rot_ypr(yaw, pitch, roll))
        Hp = torch.tensor(cam(Hw), dtype=torch.float32)
        with torch.no_grad():
            mu, u, vv, su, sv, n, k = self.sp.place(Hp, self.tri)
            keep = self.keep
            nw = n.numpy() * np.array([1, -1, -1])  # pixel axes → world axes for the studio light
            col = shade(nw, torch.sigmoid(self.sp.rgb).numpy())
            op = torch.sigmoid(self.sp.op).numpy()
            layers.append((mu[keep].numpy(), u[keep].numpy(), vv[keep].numpy(), su[keep].numpy(), sv[keep].numpy(), col[keep.numpy()],
                           op[keep.numpy()]))
        rgb, acc = render_layers(layers, (H, W))
        return np.dstack([rgb.numpy(), acc.numpy()])
