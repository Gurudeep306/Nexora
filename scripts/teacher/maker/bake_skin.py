"""Paint a person's face from their photos onto the model's skin texture.

  python3 scripts/teacher/maker/bake_skin.py <base.npz> <face.json> <skin.png> <out.png> \
      <points.json>:<photo name>:<photo path> [...]

For each photo, a camera is solved from the 478 face points: their places on the fitted model (3D)
and in the photo (2D), with a full projective fit (DLT). Every skin texel of the face is then traced to
its point on the model and to that point in each photo, and coloured from the photos that see it most
squarely (blended by how directly they face the camera). Each photo's colour is first matched to the
others, and the painted face is feathered into the skin texture, whose colour is shifted to match the
face so the neck and hands agree. Points the photos cannot see keep the model's own skin.
"""
import gzip
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
TARGETS = os.environ.get("MPFB_TARGETS", "/root/.config/blender/5.2/extensions/user_default/mpfb/data/targets")
TO_LOCAL = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]]) * 0.1
BODY_VERTS = 13380  # MakeHuman's body; helper geometry follows

base_path, face_path, skin_path, out_path = sys.argv[1:5]
views = [a.split(":", 2) for a in sys.argv[5:]]
base = np.load(base_path)
co = base["co"].copy()
face = json.load(open(face_path))["targets"]
sys.path.insert(0, HERE)
import targets as _targets  # noqa: E402
co = _targets.apply(co, face)

corr = json.load(open(os.path.join(HERE, "..", "fit", "corr.json")))["points"]
used = [i for i, c in enumerate(corr) if c]
L3 = np.array([sum(co[int(k)] * w for k, w in corr[i].items()) for i in used])

tris = base["tris"]
uv = base["uv"]
body = (tris < BODY_VERTS).all(1)
tris, uv = tris[body], uv[body]
# Vertex normals of the body.
v0, v1, v2 = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
fn = np.cross(v1 - v0, v2 - v0)
vn = np.zeros_like(co)
for k in range(3):
    np.add.at(vn, tris[:, k], fn)
vn /= np.linalg.norm(vn, axis=1, keepdims=True) + 1e-12
# Normals must point out of the head. The mesh's winding is not guaranteed, so check against the face
# points: from the middle of the head, outward is away from its centre.
_head = co[np.unique(tris[(np.linalg.norm(co[tris].mean(1) - L3.mean(0), axis=1) < np.ptp(L3[:, 0]))].ravel())]
_c = _head.mean(0)
_ids = np.unique(tris[(np.linalg.norm(co[tris].mean(1) - L3.mean(0), axis=1) < np.ptp(L3[:, 0]))].ravel())
if ((co[_ids] - _c) * vn[_ids]).sum(1).mean() < 0:
    vn = -vn
    print("BAKE normals pointed inwards; flipped")

# Face region: vertices near the face points (front of the head), with a soft edge.
face_w = np.ptp(L3[:, 0])
d = np.full(len(co), np.inf)
for s in range(0, len(co), 3000):
    blk = co[s:s + 3000]
    d[s:s + 3000] = np.sqrt(((blk[:, None] - L3[None]) ** 2).sum(2)).min(1)
region = np.clip(1 - (d - 0.02 * face_w) / (0.12 * face_w), 0, 1)


def dlt(X, x):
    """Projective camera from 3D-2D pairs (normalised DLT, Hartley & Zisserman)."""
    mX, sX = X.mean(0), np.sqrt(((X - X.mean(0)) ** 2).sum(1).mean() / 3)
    mx, sx = x.mean(0), np.sqrt(((x - x.mean(0)) ** 2).sum(1).mean() / 2)
    TX = np.diag([1 / sX] * 3 + [1.0])
    TX[:3, 3] = -mX / sX
    Tx = np.diag([1 / sx] * 2 + [1.0])
    Tx[:2, 2] = -mx / sx
    Xn = (np.c_[X, np.ones(len(X))] @ TX.T)[:, :3]
    xn = (np.c_[x, np.ones(len(x))] @ Tx.T)[:, :2]
    A = []
    for (X_, Y_, Z_), (u, v) in zip(Xn, xn):
        A.append([X_, Y_, Z_, 1, 0, 0, 0, 0, -u * X_, -u * Y_, -u * Z_, -u])
        A.append([0, 0, 0, 0, X_, Y_, Z_, 1, -v * X_, -v * Y_, -v * Z_, -v])
    _, _, Vt = np.linalg.svd(np.array(A))
    P = np.linalg.inv(Tx) @ Vt[-1].reshape(3, 4) @ TX
    centre = -np.linalg.solve(P[:, :3], P[:, 3])
    return P, centre


def project(P, X):
    h = np.c_[X, np.ones(len(X))] @ P.T
    return h[:, :2] / h[:, 2:3]


class Warp:
    """Small 2D correction in the photo so every face point samples exactly where the face reader found it
    (lips on the model's lips, brows on its brows), even where the model's shape is a little off.
    A damped Gaussian interpolation of the points' leftover offsets; zero far from the face."""

    def __init__(self, at, offset, face_px):
        self.at = at
        self.sig = max(4.0, face_px * float(os.environ.get("BAKE_WARP_SIGMA", "0.06")))
        G = np.exp(-((at[:, None] - at[None]) ** 2).sum(2) / (2 * self.sig ** 2))
        self.c = np.linalg.solve(G + 0.05 * np.eye(len(at)), offset)

    def __call__(self, xy):
        out = np.empty_like(xy)
        for s_ in range(0, len(xy), 20000):
            g = np.exp(-((xy[s_:s_ + 20000, None] - self.at[None]) ** 2).sum(2) / (2 * self.sig ** 2))
            out[s_:s_ + 20000] = xy[s_:s_ + 20000] + g @ self.c
        return out


skin = np.asarray(Image.open(skin_path).convert("RGB"), dtype=np.float32) / 255
T = skin.shape[0]
acc = np.zeros((T, T, 3), np.float32)
wsum = np.zeros((T, T), np.float32)
photos = []
for pts_path, name, img_path in views:
    rec = json.load(open(pts_path))[name]
    img = np.asarray(ImageOps.exif_transpose(Image.open(img_path)).convert("RGB"), dtype=np.float32) / 255
    x2 = np.array(rec["landmarks"])[used][:, :2]
    P, centre = dlt(L3, x2)
    # A face is shallow, so a camera in front and its mirror image behind the head fit the points almost
    # equally well (the depth reversal of near-flat scenes). Only the camera's side matters for which
    # surfaces it sees; put it in front of the face (the nose points forward).
    front = L3[used.index(1)] - L3.mean(0)
    front /= np.linalg.norm(front) + 1e-12
    off = centre - L3.mean(0)
    if off @ front < 0:
        centre = L3.mean(0) + off - 2 * (off @ front) * front
        print("BAKE camera for", name[:12], "was behind the head; moved to the front")
    err = np.linalg.norm(project(P, L3) - x2, axis=1).mean() / rec["face_px"]
    warp = Warp(project(P, L3), x2 - project(P, L3), rec["face_px"]) if os.environ.get("BAKE_WARP", "1") == "1" else None
    photos.append((name, img, P, centre, rec, warp))
    print("BAKE camera for", name[:12], "error", round(float(err), 4), "face widths")

# Clean each photo before painting:
# - Hair over the face is left out: MediaPipe's multiclass selfie segmenter (Apache-2.0) marks hair,
#   and those pixels get no weight.
# - Light is taken out: the photo's broad shading (sun stripes, shadows) is the blurred image; dividing
#   by it keeps only the fine detail (brows, eyes, lips, pores), which is then put on the person's own
#   average skin colour. So the model is lit by the site, not by the room the photo was taken in.
import mediapipe as mp  # noqa: E402
from mediapipe.tasks.python import BaseOptions, vision  # noqa: E402

SEG = os.environ.get("SELFIE_SEGMENTER", os.path.join(os.path.dirname(skin_path), "selfie_multiclass.tflite"))
segmenter = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=SEG), output_confidence_masks=True))


def blur(img, sigma):
    return np.asarray(Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(sigma)), np.float32) / 255


FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
             176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]


def oval_mask(shape, lm):
    from PIL import ImageDraw
    m = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon([tuple(map(float, lm[i][:2])) for i in FACE_OVAL], fill=255)
    return np.asarray(m.filter(ImageFilter.GaussianBlur(3)), np.float32) / 255


def norm_blur(img, mask, sigma):
    """Blur that only averages the masked pixels (normalised convolution)."""
    num = blur(img * mask[..., None], sigma)
    den = blur(np.repeat(mask[..., None], 3, 2), sigma)[..., :1]
    return num / (den + 1e-3)


tones = []
cleaned = []
FEATURES = [
    [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],  # right brow
    [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],  # left brow
    [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],  # right eye
    [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],  # left eye
    [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],  # lips
    [98, 97, 2, 326, 327, 294, 278, 344, 440, 275, 4, 45, 220, 115, 48, 64],  # nose base and nostrils
]
SCLERA_R = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
SCLERA_L = [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249]


def white_balance(img, lm):
    """The whites of the eyes are close to neutral, so their tint is the room's light. Returns per-channel
    gains (clamped) that make them neutral; (1, 1, 1) when they cannot be measured."""
    from PIL import ImageDraw
    H_, W_ = img.shape[:2]
    m = Image.new("L", (W_, H_), 0)
    dr = ImageDraw.Draw(m)
    for ring in (SCLERA_R, SCLERA_L):
        dr.polygon([tuple(map(float, lm[i][:2])) for i in ring], fill=255)
    for c, ring in ((468, range(469, 473)), (473, range(474, 478))):
        cx, cy = lm[c][:2]
        rr = np.mean([np.hypot(lm[k][0] - cx, lm[k][1] - cy) for k in ring]) * 1.15
        dr.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=0)
    mask = np.asarray(m) > 0
    px = img[mask]
    if len(px) < 30:
        return np.ones(3, np.float32)
    lum = px @ np.array([0.299, 0.587, 0.114])
    px = px[lum >= np.percentile(lum, 60)]  # the brightest part: eye white, not lashes or shadow
    c = np.median(px, 0)
    g = c.mean() / np.maximum(c, 1e-3)
    # Eye whites are a little warm themselves, so only most of the tint is taken out.
    return (np.clip(g, 0.8, 1.25) ** 0.6).astype(np.float32)


for name, img, P, centre, rec, warp in photos:
    gain = white_balance(img, rec["landmarks"]) if os.environ.get("BAKE_WB", "1") == "1" else np.ones(3, np.float32)
    img = np.clip(img * gain, 0, 1)
    print("BAKE white balance for", name[:12], gain.round(3).tolist())
    u8 = (img * 255).astype(np.uint8)
    masks = segmenter.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(u8))).confidence_masks
    hair = masks[1].numpy_view().astype(np.float32).reshape(img.shape[:2])
    face_skin = masks[3].numpy_view().astype(np.float32).reshape(img.shape[:2])
    # The segmenter calls eyebrows (and lashes) "hair". Inside the face outline they are the person's own
    # brows, so hair only removes pixels outside it (fringes and strands over the cheeks' edge).
    oval = oval_mask(img.shape, rec["landmarks"])
    # A little wider than the face points' outline, so brow tails and the hairline's edge are kept.
    wide = np.asarray(Image.fromarray((oval * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(int(max(5, rec["face_px"] / 12)) | 1)), np.float32) / 255
    hair_out = hair * (1 - wide)
    # Room light: measured from clean skin only, so lips, brows and eyes keep their own colour.
    # Dividing by the light's brightness (not its colour) keeps the true colours of the features.
    skin_m = ((face_skin > 0.6) & (hair < 0.3)).astype(np.float32)
    sigma = max(6, rec["face_px"] / 6)
    shade = norm_blur(img, skin_m, sigma)
    shade_l = np.clip(shade @ np.array([0.299, 0.587, 0.114], np.float32), 0.05, 1)[..., None]
    skin_px = img[skin_m > 0]
    if len(skin_px) > 50:
        lum = skin_px @ np.array([0.299, 0.587, 0.114])
        lo, hi = np.percentile(lum, [65, 90])
        t = np.median(skin_px[(lum >= lo) & (lum <= hi)], 0)
        tones.append(t)
    else:
        t = np.array([0.75, 0.6, 0.5], np.float32)
    # img / shade_l is the colour under even light, relative to the skin's own brightness.
    # On skin this is t / lum(t); dividing by that leaves 1 on skin and each feature's colour relative to
    # the skin (lips / skin, brows / skin), so every photo meets on one tone below.
    detail = np.clip(img / shade_l, 0, 3) / np.clip(t / float(t @ np.array([0.299, 0.587, 0.114])), 0.3, 3)
    detail = np.clip(detail, 0, 2.5)
    # Only paint from the person's face and neck: background, hair outside the face, and clothes get no
    # weight, and the weight fades out over a few pixels at the face's edge so nothing smears in.
    bg = masks[0].numpy_view().astype(np.float32).reshape(img.shape[:2])
    clothes = masks[4].numpy_view().astype(np.float32).reshape(img.shape[:2])
    keep = np.clip(1 - hair_out * 3, 0, 1) * np.clip(1 - bg * 2, 0, 1) * np.clip(1 - clothes * 2, 0, 1)
    keep = np.minimum(keep, np.clip(oval * 1.2 + face_skin * 0.6, 0, 1))
    # Outside the features themselves, pixels much darker than the skin are shadow or stray hair (the
    # shadow under the jaw, hair at the cheek's edge): they get no weight, so they cannot smear in.
    from PIL import ImageDraw
    feat = Image.new("L", (img.shape[1], img.shape[0]), 0)
    fd = ImageDraw.Draw(feat)
    lmk = rec["landmarks"]
    for ring in FEATURES:
        fd.polygon([tuple(map(float, lmk[i][:2])) for i in ring], fill=255)
    feat = np.asarray(feat.filter(ImageFilter.MaxFilter(int(max(5, rec["face_px"] / 14)) | 1)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255
    lum_ratio = (detail @ np.array([0.299, 0.587, 0.114], np.float32))
    not_shadow = np.clip((lum_ratio - 0.62) / 0.18, 0, 1)
    keep = keep * np.maximum(feat, not_shadow)
    # Never paint skin from inside the eye opening (the eyeball is its own mesh; its white and iris
    # would land on the lids as grey "bags" wherever the fit is a pixel off).
    eyes = Image.new("L", (img.shape[1], img.shape[0]), 0)
    ed = ImageDraw.Draw(eyes)
    for ring in (SCLERA_R, SCLERA_L):
        ed.polygon([tuple(map(float, lmk[i][:2])) for i in ring], fill=255)
    eyes = np.asarray(eyes.filter(ImageFilter.MaxFilter(int(max(3, rec["face_px"] / 60)) | 1)), np.float32) / 255
    keep = keep * (1 - eyes)
    keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(2)), np.float32) / 255
    cleaned.append((name, detail, P, centre, rec, keep, warp))
tone = np.median(np.array(tones), 0)
print("BAKE skin tone", (tone * 255).round().astype(int).tolist())
photos = [(n, np.clip(d * tone, 0, 1), P, c, r, m, wp) for n, d, P, c, r, m, wp in cleaned]

MIRROR_W = float(os.environ.get("BAKE_MIRROR", "0.08"))
# Surfaces seen nearly edge-on smear the photo; only paint from views that face them.
FACING0 = float(os.environ.get("BAKE_FACING", "0.5"))
# Rasterise face triangles in texture space.
for t in range(len(tris)):
    vids = tris[t]
    if region[vids].max() <= 0:
        continue
    uvp = uv[t] * (T - 1)
    uvp[:, 1] = (T - 1) - uvp[:, 1]
    x0, y0 = np.floor(uvp.min(0)).astype(int)
    x1, y1 = np.ceil(uvp.max(0)).astype(int)
    if x1 - x0 > 200 or y1 - y0 > 200:
        continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
    p = np.c_[gx.ravel(), gy.ravel()].astype(np.float64)
    a, b, c = uvp
    M = np.array([[b[0] - a[0], c[0] - a[0]], [b[1] - a[1], c[1] - a[1]]])
    if abs(np.linalg.det(M)) < 1e-9:
        continue
    l12 = np.linalg.solve(M, (p - a).T).T
    bary = np.c_[1 - l12.sum(1), l12]
    inside = (bary > -0.01).all(1)
    if not inside.any():
        continue
    bary, p = bary[inside], p[inside].astype(int)
    X = bary @ co[vids]
    N = bary @ vn[vids]
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    reg = bary @ region[vids]
    for name, img, P, centre, rec, keep, warp in photos:
        view = centre[None] - X
        view /= np.linalg.norm(view, axis=1, keepdims=True)
        facing = (N * view).sum(1)
        w = np.clip((facing - FACING0) / (1 - FACING0), 0, 1) ** 2 * reg
        if not (w > 0).any():
            continue
        xy = project(P, X)
        if warp is not None:
            xy = warp(xy)
        ok = (xy[:, 0] >= 0) & (xy[:, 1] >= 0) & (xy[:, 0] < img.shape[1] - 1) & (xy[:, 1] < img.shape[0] - 1) & (w > 0)
        if not ok.any():
            continue
        yi, xi = xy[ok, 1].astype(int), xy[ok, 0].astype(int)
        col = img[yi, xi]
        wk = w[ok] * keep[yi, xi]
        np.add.at(acc, (p[ok, 1], p[ok, 0]), col * wk[:, None])
        np.add.at(wsum, (p[ok, 1], p[ok, 0]), wk)
    # The side of the face the photos see poorly is filled from its mirror image (the face is close to
    # symmetric about x = 0), with a small weight so any real view of that side wins.
    flip = np.array([-1.0, 1.0, 1.0])
    Xm, Nm = X * flip, N * flip
    for name, img, P, centre, rec, keep, warp in photos:
        view = centre[None] - Xm
        view /= np.linalg.norm(view, axis=1, keepdims=True)
        w = np.clip(((Nm * view).sum(1) - FACING0) / (1 - FACING0), 0, 1) ** 2 * reg * MIRROR_W
        xy = project(P, Xm)
        if warp is not None:
            xy = warp(xy)
        ok = (xy[:, 0] >= 0) & (xy[:, 1] >= 0) & (xy[:, 0] < img.shape[1] - 1) & (xy[:, 1] < img.shape[0] - 1) & (w > 0)
        if not ok.any():
            continue
        yi, xi = xy[ok, 1].astype(int), xy[ok, 0].astype(int)
        wk = w[ok] * keep[yi, xi]
        np.add.at(acc, (p[ok, 1], p[ok, 0]), img[yi, xi] * wk[:, None])
        np.add.at(wsum, (p[ok, 1], p[ok, 0]), wk)

painted = wsum > 1e-4
face_col = np.zeros_like(acc)
face_col[painted] = acc[painted] / wsum[painted, None]
# Shift the whole skin's colour towards the painted face's average, so neck, ears and hands match.
# The whole skin takes the person's tone (keeping the base texture's own fine detail).
skin_detail = np.clip(skin / (blur(skin, 24) + 0.03), 0, 2.5)
skin2 = np.clip(skin_detail * tone, 0, 1)
alpha = np.clip(wsum / (np.percentile(wsum[painted], 60) + 1e-6), 0, 1)
# Trim the painted area's rim (the last few texels are the photo's edge-on, stretched pixels).
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(7)), np.float32) / 255
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
out = skin2 * (1 - alpha[..., None]) + face_col * alpha[..., None]
out[~painted] = skin2[~painted]
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(out_path)
if os.environ.get("BAKE_DEBUG"):
    Image.fromarray((np.clip(face_col, 0, 1) * 255).astype(np.uint8)).save(out_path + ".face.png")
    Image.fromarray((alpha * 255).astype(np.uint8)).save(out_path + ".alpha.png")
print("BAKE painted", int(painted.sum()), "texels; wrote", out_path)
