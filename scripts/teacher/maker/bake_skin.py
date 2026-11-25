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
for name, w in face.items():
    group = name.split("-")[0] if not name[:2] in ("l-", "r-") else name.split("-")[1]
    path = None
    for g in ("head", "forehead", "eyebrows", "eyes", "nose", "mouth", "cheek", "chin", group):
        p = os.path.join(TARGETS, g, name + ".target.gz")
        if os.path.exists(p):
            path = p
            break
    with gzip.open(path, "rt") as f:
        for line in f:
            if line.strip() and not line.startswith("#"):
                q = line.split()
                co[int(q[0])] += w * (np.array([float(q[1]), float(q[2]), float(q[3])]) @ TO_LOCAL.T)

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
    err = np.linalg.norm(project(P, L3) - x2, axis=1).mean() / rec["face_px"]
    photos.append((name, img, P, centre, rec))
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


tones = []
cleaned = []
for name, img, P, centre, rec in photos:
    u8 = (img * 255).astype(np.uint8)
    masks = segmenter.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(u8))).confidence_masks
    hair = masks[1].numpy_view().astype(np.float32).reshape(img.shape[:2])
    face_skin = masks[3].numpy_view().astype(np.float32).reshape(img.shape[:2])
    sigma = max(4, rec["face_px"] / 14)
    low = blur(img, sigma)
    detail = np.clip(img / (low + 0.03), 0, 2.5)
    skin_px = img[(face_skin > 0.8) & (hair < 0.2)]
    if len(skin_px) > 50:
        # The skin's own colour is best seen where it is well lit but not shiny: the 65–90% brightest part.
        lum = skin_px @ np.array([0.299, 0.587, 0.114])
        lo, hi = np.percentile(lum, [65, 90])
        tones.append(np.median(skin_px[(lum >= lo) & (lum <= hi)], 0))
    cleaned.append((name, detail, P, centre, rec, np.clip(1 - hair * 1.5, 0, 1)))
tone = np.median(np.array(tones), 0)
print("BAKE skin tone", (tone * 255).round().astype(int).tolist())
photos = [(n, np.clip(d * tone, 0, 1), P, c, r, m) for n, d, P, c, r, m in cleaned]

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
    for name, img, P, centre, rec, keep in photos:
        view = centre[None] - X
        view /= np.linalg.norm(view, axis=1, keepdims=True)
        facing = (N * view).sum(1)
        w = np.clip((facing - 0.35) / 0.65, 0, 1) ** 2 * reg
        if not (w > 0).any():
            continue
        xy = project(P, X)
        ok = (xy[:, 0] >= 0) & (xy[:, 1] >= 0) & (xy[:, 0] < img.shape[1] - 1) & (xy[:, 1] < img.shape[0] - 1) & (w > 0)
        if not ok.any():
            continue
        yi, xi = xy[ok, 1].astype(int), xy[ok, 0].astype(int)
        col = img[yi, xi]
        wk = w[ok] * keep[yi, xi]
        np.add.at(acc, (p[ok, 1], p[ok, 0]), col * wk[:, None])
        np.add.at(wsum, (p[ok, 1], p[ok, 0]), wk)

painted = wsum > 1e-4
face_col = np.zeros_like(acc)
face_col[painted] = acc[painted] / wsum[painted, None]
# Shift the whole skin's colour towards the painted face's average, so neck, ears and hands match.
# The whole skin takes the person's tone (keeping the base texture's own fine detail).
skin_detail = np.clip(skin / (blur(skin, 24) + 0.03), 0, 2.5)
skin2 = np.clip(skin_detail * tone, 0, 1)
alpha = np.clip(wsum / (np.percentile(wsum[painted], 60) + 1e-6), 0, 1)
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), np.float32) / 255
out = skin2 * (1 - alpha[..., None]) + face_col * alpha[..., None]
out[~painted] = skin2[~painted]
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(out_path)
print("BAKE painted", int(painted.sum()), "texels; wrote", out_path)
