"""
Warm and deepen the skin in a Rocketbox avatar's colour textures, so a
teacher reads as Indian (wheatish to brown skin) without touching eyes, teeth,
hair or most clothes. docs/voice/VIRTUAL_TEACHER.md §3.

    python3 scripts/teacher/tint-skin.py <Textures dir> <out dir> [--depth 0.8] [--warm 1.15]

Copies every texture to <out dir>; in *_head_color and *_body_color only the
skin-coloured pixels change (hue 0–50°, some saturation, not too dark), with
a soft mask edge so there is no seam:
  --depth  brightness multiplier for skin (0.8 = 20% deeper)
  --warm   saturation multiplier for skin (1.15 = a little warmer)
  --eyes   also make the iris dark brown (head texture; same place in every Rocketbox avatar)
Then run convert-rocketbox.py with <out dir> as the Textures dir.
"""
import sys, os, shutil
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
src, dst = args[0], args[1]
depth = float(args[args.index("--depth") + 1]) if "--depth" in args else 0.8
warm = float(args[args.index("--warm") + 1]) if "--warm" in args else 1.15
eyes = "--eyes" in args
os.makedirs(dst, exist_ok=True)

for name in os.listdir(src):
    a, b = os.path.join(src, name), os.path.join(dst, name)
    low = name.lower()
    if not (low.endswith("_head_color.tga") or low.endswith("_body_color.tga")):
        shutil.copyfile(a, b)
        continue
    im = Image.open(a)
    alpha = im.getchannel("A") if im.mode == "RGBA" else None
    hsv = np.asarray(im.convert("RGB").convert("HSV"), dtype=np.float32)
    h, s, v = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    skin = (h <= 50) & (s >= 0.12) & (s <= 0.8) & (v >= 0.22)
    mask = Image.fromarray((skin * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    m = np.asarray(mask, dtype=np.float32) / 255
    v2 = v * (1 - m + m * depth)
    s2 = np.clip(s * (1 - m + m * warm), 0, 1)
    h2 = h * (1 - m) + m * (h * 0.6 + 22 * 0.4)  # nudge the hue towards a warm brown
    H, W = v.shape
    if low.endswith("_head_color.tga"):
        # The eyeball sits in the same corner of every Rocketbox head texture:
        # keep it out of the skin tint so the white of the eye stays white.
        y0, y1, x0, x1 = int(H * 0.85), H, int(W * 0.16), int(W * 0.36)
        h2[y0:y1, x0:x1], s2[y0:y1, x0:x1], v2[y0:y1, x0:x1] = h[y0:y1, x0:x1], s[y0:y1, x0:x1], v[y0:y1, x0:x1]
        if eyes:
            # The iris: a disc around (26.3%, 93.25%) of the texture; dark brown,
            # keeping the pupil and the light's sparkle.
            yy, xx = np.mgrid[0:H, 0:W]
            r = np.hypot(xx - W * 0.2633, yy - H * 0.9325) / (W * 0.0185)
            iris = (r <= 1) & (v > 0.16) & (v < 0.86)
            e = np.clip((1.15 - r) / 0.25, 0, 1) * iris
            h2 = h2 * (1 - e) + e * 24
            s2 = s2 * (1 - e) + e * 0.62
            v2 = v2 * (1 - e) + e * (v * 0.5)
            print(f"{name}: iris made dark brown")
    out = np.stack([h2 * 255 / 360, s2 * 255, v2 * 255], axis=-1).clip(0, 255).astype(np.uint8)
    res = Image.fromarray(out, "HSV").convert("RGB")
    if alpha is not None:
        res.putalpha(alpha)
    res.save(b)
    print(f"{name}: {skin.mean() * 100:.0f}% skin pixels tinted")
