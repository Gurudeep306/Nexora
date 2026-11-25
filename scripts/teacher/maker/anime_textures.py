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
r_iris = W * 0.112
img = eye.copy()
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
