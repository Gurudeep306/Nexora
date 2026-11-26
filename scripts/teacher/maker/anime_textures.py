"""Textures for the light-anime look, made from the person's own colours.

  python3 scripts/teacher/maker/anime_textures.py <skin.png> <eye.png> <tone r,g,b> <iris r,g,b> <out_dir>

- Skin: the base skin's fine detail mostly smoothed away and put on the person's skin tone, so the
  toon shading reads as clean, soft skin.
- Eyes: anime irises drawn where the base eye texture has its irises: a deep gradient iris in the
  person's eye colour, a dark rim, a large pupil and two catch-lights.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

skin_path, eye_path, tone_s, iris_s, out = sys.argv[1:6]
tone = np.array([float(v) for v in tone_s.split(",")]) / 255
iris = np.array([float(v) for v in iris_s.split(",")]) / 255
os.makedirs(out, exist_ok=True)

skin = np.asarray(Image.open(skin_path).convert("RGB"), np.float32) / 255
low = np.asarray(Image.fromarray((skin * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(24)), np.float32) / 255
detail = np.clip(skin / (low + 0.03), 0, 2)
soft = 1 + (detail - 1) * 0.35  # keep a third of the detail: lips, nails and creases stay
Image.fromarray((np.clip(soft * tone, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, "anime_skin.png"))

eye = Image.open(eye_path).convert("RGBA")
W = eye.size[0]
a = np.asarray(eye.convert("L"), np.float32)
# The two pupils are the darkest blobs away from the corner marker.
dark = a < 40
ys, xs = np.nonzero(dark)
keep = (xs < W * 0.85) | (ys < W * 0.85)
xs, ys = xs[keep], ys[keep]
centres = []
for _ in range(2):
    if not len(xs):
        break
    cx, cy = np.median(xs), np.median(ys)
    if centres:
        far = (xs - centres[0][0]) ** 2 + (ys - centres[0][1]) ** 2 > (W * 0.2) ** 2
        cx, cy = np.median(xs[far]), np.median(ys[far])
    else:
        # split into the two clusters along the diagonal
        side = xs - ys > 0
        cx, cy = np.median(xs[side]), np.median(ys[side])
    centres.append((cx, cy))
STYLE = os.environ.get("EYE_STYLE", "real")
r_iris = W * (0.118 if STYLE == "real" else 0.112)
img = eye.copy()
if STYLE == "real":
    # A real iris, painted: the person's eye colour (kept warm and deep, as photos make irises look grey
    # from glare), fine radial fibres, a darker ring at the edge, a soft pupil and one small catch-light.
    # The white of the eye is lifted a little so the eye does not read grey.
    import colorsys
    h, s_, v = colorsys.rgb_to_hsv(*np.clip(iris, 0, 1))
    if s_ < 0.12 or v < 0.4:
        h = 0.075  # dark eyes are brown; the photo's tint (skin light, glare) is not the iris's hue
    base = np.array(colorsys.hsv_to_rgb(h, max(0.5, min(0.7, s_ + 0.2)), min(0.4, max(0.24, v))))
    arr = np.asarray(img, np.float32) / 255
    yy, xx = np.mgrid[0:W, 0:W].astype(np.float32)
    rng = np.random.default_rng(7)
    fib_a = rng.uniform(0, 2 * np.pi, 260)
    fib_w = rng.uniform(0.5, 1.6, 260)
    for cx, cy in centres:
        dx, dy = xx - cx, yy - cy
        r = np.sqrt(dx * dx + dy * dy) / r_iris
        ang = np.arctan2(dy, dx)
        near = r < 2.2
        # Lift the white of the eye around the iris.
        white = near & (r >= 1.0)
        lift = np.clip((2.2 - r) / 1.2, 0, 1)[..., None] * 0.35
        arr[..., :3] = np.where(white[..., None], arr[..., :3] * (1 - lift) + np.array([0.95, 0.93, 0.9]) * lift, arr[..., :3])
        inside = r < 1.0
        fib = np.zeros_like(r)
        for a0, w0 in zip(fib_a, fib_w):
            fib += np.exp(-((np.angle(np.exp(1j * (ang - a0)))) ** 2) / (2 * (0.012 * w0) ** 2)) * 0.18
        fib = np.clip(fib, 0, 1)
        shade = 0.55 + 0.75 * np.clip((r - 0.3) / 0.7, 0, 1) * (1 - np.clip((r - 0.85) / 0.15, 0, 1))
        col = base[None, None] * (shade[..., None] * (0.8 + 0.5 * fib[..., None]))
        col = np.where((r > 0.86)[..., None], base * 0.35, col)  # limbal ring
        col = np.where((r < 0.36)[..., None], np.array([0.03, 0.02, 0.02]), col)  # pupil
        soft = np.clip((1.0 - r) / 0.04, 0, 1)[..., None]
        arr[..., :3] = np.where(inside[..., None], arr[..., :3] * (1 - soft) + col * soft, arr[..., :3])
        hl = np.exp(-(((xx - (cx - 0.32 * r_iris)) ** 2 + (yy - (cy - 0.34 * r_iris)) ** 2) / (2 * (0.07 * r_iris) ** 2)))
        arr[..., :3] = np.clip(arr[..., :3] + hl[..., None] * 0.85, 0, 1)
    img = Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")
    img.save(os.path.join(out, "anime_eye.png"))
    print("ANIME real eyes at", [(round(x), round(y)) for x, y in centres], "iris", (base * 255).round().tolist())
    raise SystemExit(0)
d = ImageDraw.Draw(img)
for cx, cy in centres:
    for k in range(60, 0, -1):
        t = k / 60
        r = r_iris * t
        top, bottom = iris * 0.45, np.minimum(iris * 1.35, 1)
        c = top * (1 - t) * 0.3 + (bottom * (1 - t) + iris * t) * 0.7 if t > 0.25 else iris * 0.35
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(int(v * 255) for v in c) + (255,))
    d.ellipse((cx - r_iris, cy - r_iris, cx + r_iris, cy + r_iris), outline=(25, 12, 8, 255), width=int(W * 0.012))
    rp = r_iris * 0.42
    d.ellipse((cx - rp, cy - rp, cx + rp, cy + rp), fill=(12, 6, 4, 255))
    for ox, oy, rr in ((-0.38, -0.38, 0.22), (0.35, 0.33, 0.09)):
        hx, hy = cx + ox * r_iris, cy + oy * r_iris
        d.ellipse((hx - rr * r_iris, hy - rr * r_iris, hx + rr * r_iris, hy + rr * r_iris), fill=(255, 255, 255, 255))
img.save(os.path.join(out, "anime_eye.png"))
print("ANIME eyes at", [(round(x), round(y)) for x, y in centres], "skin tone", (tone * 255).round().tolist())
