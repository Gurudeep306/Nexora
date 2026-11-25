"""Draw a person's facial features onto the model's skin, traced from their photo, in a clean
illustrated (light anime) style.

  python3 scripts/teacher/maker/paint_features.py <base.npz> <face.json> <skin.png> <out.png> \
      <points.json>:<photo name>:<photo path> [--debug <photo_overlay.png>]

Instead of copying the photo's pixels (which carry its lighting, filters and blur), the features are
drawn as clean shapes from the person's own 478 face points, in colours measured from the photo:

- Eyebrows: the exact outline of each brow (upper and lower edge points), filled with the brow
  colour, soft at the inner end and crisp at the tail, as illustrators draw them.
- Eyes: an upper-lid line that follows the real lid curve and thickens towards the outer corner, a
  small lash flick, a faint lower-lid line and the crease above the lid.
- Lips: the real lip outline filled with the measured lip colour, the upper lip a little darker, a
  dark line where the lips meet, and a soft highlight on the lower lip.
- Nose: nostril shapes and a soft shadow under the tip, from the real nose points.
- Cheeks: a light blush where the cheeks are.

The drawing is made in the photo's own space (where the points are) and carried onto the model
with the same per-photo camera as bake_skin.py, so every feature lands on the right part of the
face mesh and moves with it (brows lift, lids blink, lips talk).
"""
import gzip
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
TARGETS = os.environ.get("MPFB_TARGETS", "/root/.config/blender/5.2/extensions/user_default/mpfb/data/targets")
TO_LOCAL = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) * 0.1
BODY_VERTS = 13380

args = sys.argv[1:]
debug = None
if "--debug" in args:
    i = args.index("--debug")
    debug = args[i + 1]
    args = args[:i] + args[i + 2:]
base_path, face_path, skin_path, out_path, view = args[:5]
pts_path, name, img_path = view.split(":", 2)

# --- The fitted model ------------------------------------------------------------------------------
base = np.load(base_path)
co = base["co"].copy()
for tname, w in json.load(open(face_path))["targets"].items():
    for g in ("head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin"):
        p = os.path.join(TARGETS, g, tname + ".target.gz")
        if os.path.exists(p):
            with gzip.open(p, "rt") as f:
                for line in f:
                    if line.strip() and not line.startswith("#"):
                        q = line.split()
                        co[int(q[0])] += w * (np.array([float(q[1]), float(q[2]), float(q[3])]) @ TO_LOCAL.T)
            break
corr = json.load(open(os.path.join(HERE, "..", "fit", "corr.json")))["points"]
used = [i for i, c in enumerate(corr) if c]
L3 = np.array([sum(co[int(k)] * w for k, w in corr[i].items()) for i in used])

# --- The photo and its points ----------------------------------------------------------------------
rec = json.load(open(pts_path))[name]
photo = ImageOps.exif_transpose(Image.open(img_path)).convert("RGB")
img = np.asarray(photo, np.float32) / 255
P2 = np.array(rec["landmarks"])[:, :2]
H, W = img.shape[:2]
face_px = rec["face_px"]


def pts(idx):
    return [tuple(P2[i]) for i in idx]


def sample(idx, shrink=0.0):
    """Median colour inside a polygon of points (optionally shrunk towards its centre)."""
    poly = np.array(pts(idx))
    c = poly.mean(0)
    poly = c + (poly - c) * (1 - shrink)
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).polygon([tuple(p) for p in poly], fill=255)
    sel = np.asarray(m) > 0
    return np.median(img[sel], 0) if sel.sum() > 10 else np.array([0.3, 0.2, 0.2])


# MediaPipe Face Mesh contours (canonical indices).
BROW_R_UP, BROW_R_LO = [70, 63, 105, 66, 107], [46, 53, 52, 65, 55]
BROW_L_UP, BROW_L_LO = [300, 293, 334, 296, 336], [276, 283, 282, 295, 285]
LID_R_UP = [33, 246, 161, 160, 159, 158, 157, 173, 133]
LID_R_LO = [33, 7, 163, 144, 145, 153, 154, 155, 133]
LID_L_UP = [263, 466, 388, 387, 386, 385, 384, 398, 362]
LID_L_LO = [263, 249, 390, 373, 374, 380, 381, 382, 362]
CREASE_R = [226, 247, 30, 29, 27, 28, 56, 190]
CREASE_L = [446, 467, 260, 259, 257, 258, 286, 414]
LIPS_OUT = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
LIP_UP_IN = [61, 191, 80, 81, 82, 13, 312, 311, 310, 415, 291]
LIP_LO_IN = [61, 95, 88, 178, 87, 14, 317, 402, 318, 324, 291]
UPPER_LIP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 415, 310, 311, 312, 13, 82, 81, 80, 191]
NOSTRIL_R, NOSTRIL_L = [98, 240, 64, 48, 115, 220, 45, 4], [327, 460, 294, 278, 344, 440, 275, 4]
CHEEK_R, CHEEK_L = 205, 425

brow_col = np.minimum(sample(BROW_R_UP + BROW_R_LO[::-1], 0.3), sample(BROW_L_UP + BROW_L_LO[::-1], 0.3))
lip_col = sample(LIPS_OUT, 0.25)
skin_col = sample([50, 101, 36, 205, 187, 123], 0.2)
# Make the drawn colours clean: brows near-black brown, lips a touch more saturated than measured.
brow_col = np.clip(brow_col * 0.55, 0, 1)
lip_hsv = np.array(Image.fromarray((np.tile(lip_col, (1, 1, 1)) * 255).astype(np.uint8)).convert("HSV")).astype(float)[0, 0] / 255
lip_hsv[1] = min(1, lip_hsv[1] * 0.95)
lip_col = np.array(Image.fromarray((lip_hsv[None, None] * 255).astype(np.uint8), "HSV").convert("RGB"))[0, 0] / 255
print("PAINT colours brow", (brow_col * 255).round().tolist(), "lips", (lip_col * 255).round().tolist(), "skin", (skin_col * 255).round().tolist())

# --- Draw the features in photo space (RGBA layer, 2x supersampled) --------------------------------
S = 2
layer = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
u = face_px / 100.0 * S  # drawing unit: 1% of the face width


def col(c, a):
    return tuple(int(v * 255) for v in c) + (int(a * 255),)


def P(idx):
    return [(x * S, y * S) for x, y in pts(idx)]


def taper_line(points, w0, w1, colour):
    for k in range(len(points) - 1):
        t = k / max(1, len(points) - 2)
        w = w0 + (w1 - w0) * t
        d.line([points[k], points[k + 1]], fill=colour, width=max(1, int(w)))
        r = w / 2
        x, y = points[k + 1]
        d.ellipse((x - r, y - r, x + r, y + r), fill=colour)


# Cheek blush and nose shadow first (underneath).
blush = Image.new("RGBA", layer.size, (0, 0, 0, 0))
bd = ImageDraw.Draw(blush)
for c in (CHEEK_R, CHEEK_L):
    x, y = P2[c] * S
    r = 5.5 * u
    bd.ellipse((x - r * 1.3, y - r * 0.8, x + r * 1.3, y + r * 0.8), fill=col(np.array([0.93, 0.5, 0.45]), 0.1))
tip = P2[2] * S
bd.ellipse((tip[0] - 4 * u, tip[1] - 1.2 * u, tip[0] + 4 * u, tip[1] + 1.6 * u), fill=col(skin_col * 0.6, 0.35))
blush = blush.filter(ImageFilter.GaussianBlur(3 * u))
layer = Image.alpha_composite(layer, blush)
d = ImageDraw.Draw(layer)

# Nostrils.
for idx in (NOSTRIL_R, NOSTRIL_L):
    poly = np.array(P(idx))
    c = poly.mean(0)
    poly = c + (poly - c) * 0.45
    d.polygon([tuple(p) for p in poly], fill=col(skin_col * 0.45, 0.55))

# Brows: the real outline, filled; then darker hair-like strokes along the brow.
for up, lo in ((BROW_R_UP, BROW_R_LO), (BROW_L_UP, BROW_L_LO)):
    d.polygon(P(up) + P(lo)[::-1], fill=col(brow_col, 0.92))
    a, b = np.array(P(up)), np.array(P(lo))
    for k in range(9):
        t = k / 8
        i0 = t * (len(a) - 1)
        i, f = int(i0), i0 - int(i0)
        j = min(i + 1, len(a) - 1)
        top = a[i] * (1 - f) + a[j] * f
        bot = b[i] * (1 - f) + b[j] * f
        d.line([tuple(bot), tuple(top * 0.85 + bot * 0.15)], fill=col(brow_col * 0.7, 0.6), width=max(1, int(0.5 * u)))

# Eyes: crease, upper lid (thicker to the outer corner), flick, faint lower lid.
for upper, lower, crease, outer_first in ((LID_R_UP, LID_R_LO, CREASE_R, True), (LID_L_UP, LID_L_LO, CREASE_L, True)):
    cr = P(crease)
    taper_line(cr, 0.35 * u, 0.6 * u, col(skin_col * 0.55, 0.55))
    up = P(upper)[::-1]  # inner corner -> outer corner
    taper_line(up, 0.6 * u, 1.7 * u, col(np.array([0.08, 0.05, 0.05]), 0.95))
    o = np.array(up[-1])
    prev = np.array(up[-3])
    dirv = (o - prev) / (np.linalg.norm(o - prev) + 1e-6)
    flick = o + dirv * 2.2 * u + np.array([0, -1.0 * u])
    d.polygon([tuple(o + np.array([0, 0.6 * u])), tuple(o - np.array([0, 0.9 * u])), tuple(flick)], fill=col(np.array([0.08, 0.05, 0.05]), 0.9))
    lo = P(lower)[::-1]
    taper_line(lo[2:], 0.3 * u, 0.5 * u, col(np.array([0.25, 0.15, 0.13]), 0.45))

# Lips: fill, darker upper lip, mouth line, lower-lip highlight.
d.polygon(P(LIPS_OUT), fill=col(lip_col, 0.7))
d.polygon(P(UPPER_LIP), fill=col(lip_col * 0.85, 0.7))
taper_line(P(LIP_UP_IN), 0.9 * u, 0.9 * u, col(lip_col * 0.35, 0.9))
lo_c = np.array(P([14, 17])).mean(0)
hl = Image.new("RGBA", layer.size, (0, 0, 0, 0))
ImageDraw.Draw(hl).ellipse((lo_c[0] - 3 * u, lo_c[1] - 1.0 * u, lo_c[0] + 3 * u, lo_c[1] + 0.8 * u), fill=(255, 255, 255, 70))
layer = Image.alpha_composite(layer, hl.filter(ImageFilter.GaussianBlur(0.8 * u)))
layer = layer.filter(ImageFilter.GaussianBlur(0.35 * u)).resize((W, H), Image.LANCZOS)
lay = np.asarray(layer, np.float32) / 255
if debug:
    over = img * (1 - lay[..., 3:]) + lay[..., :3] * lay[..., 3:]
    Image.fromarray((over * 255).astype(np.uint8)).save(debug)

# --- Carry the drawing onto the texture ------------------------------------------------------------
def dlt(X, x):
    mX, sX = X.mean(0), np.sqrt(((X - X.mean(0)) ** 2).sum(1).mean() / 3)
    mx, sx = x.mean(0), np.sqrt(((x - x.mean(0)) ** 2).sum(1).mean() / 2)
    TX = np.diag([1 / sX] * 3 + [1.0]); TX[:3, 3] = -mX / sX
    Tx = np.diag([1 / sx] * 2 + [1.0]); Tx[:2, 2] = -mx / sx
    Xn = (np.c_[X, np.ones(len(X))] @ TX.T)[:, :3]
    xn = (np.c_[x, np.ones(len(x))] @ Tx.T)[:, :2]
    A = []
    for (a1, a2, a3), (p, q) in zip(Xn, xn):
        A.append([a1, a2, a3, 1, 0, 0, 0, 0, -p * a1, -p * a2, -p * a3, -p])
        A.append([0, 0, 0, 0, a1, a2, a3, 1, -q * a1, -q * a2, -q * a3, -q])
    _, _, Vt = np.linalg.svd(np.array(A))
    return np.linalg.inv(Tx) @ Vt[-1].reshape(3, 4) @ TX


Pcam = dlt(L3, P2[used])


def project(X):
    h = np.c_[X, np.ones(len(X))] @ Pcam.T
    return h[:, :2] / h[:, 2:3]


skin = np.asarray(Image.open(skin_path).convert("RGB"), np.float32) / 255
T = skin.shape[0]
tris, uv = base["tris"], base["uv"]
body = (tris < BODY_VERTS).all(1)
tris, uv = tris[body], uv[body]
near = np.zeros(len(co), bool)
fw = np.ptp(L3[:, 0])
for s in range(0, len(co), 3000):
    blk = co[s:s + 3000]
    near[s:s + 3000] = np.sqrt(((blk[:, None] - L3[None]) ** 2).sum(2)).min(1) < 0.08 * fw
out = skin.copy()
cam_dir = None
for t in range(len(tris)):
    vids = tris[t]
    if not near[vids].all():
        continue
    uvp = uv[t] * (T - 1)
    uvp[:, 1] = (T - 1) - uvp[:, 1]
    x0, y0 = np.floor(uvp.min(0)).astype(int)
    x1, y1 = np.ceil(uvp.max(0)).astype(int)
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
    pp = np.c_[gx.ravel(), gy.ravel()].astype(float)
    a, b, c = uvp
    M = np.array([[b[0] - a[0], c[0] - a[0]], [b[1] - a[1], c[1] - a[1]]])
    if abs(np.linalg.det(M)) < 1e-9:
        continue
    l12 = np.linalg.solve(M, (pp - a).T).T
    bary = np.c_[1 - l12.sum(1), l12]
    inside = (bary > -0.02).all(1)
    if not inside.any():
        continue
    bary, pp = bary[inside], pp[inside].astype(int)
    xy = project(bary @ co[vids])
    ok = (xy[:, 0] >= 0) & (xy[:, 1] >= 0) & (xy[:, 0] < W - 1) & (xy[:, 1] < H - 1)
    if not ok.any():
        continue
    src = lay[xy[ok, 1].astype(int), xy[ok, 0].astype(int)]
    a_ = src[:, 3:4]
    yy, xx = pp[ok, 1], pp[ok, 0]
    out[yy, xx] = skin[yy, xx] * (1 - a_) + src[:, :3] * a_
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(out_path)
print("PAINT wrote", out_path)
