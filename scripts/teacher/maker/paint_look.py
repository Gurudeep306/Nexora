"""The "painted" look: between a digital painting and a photo.

  python3 scripts/teacher/maker/paint_look.py <photo_skin.png> <features.png> <out.png> [--paint 0.6] [--lines 0.35]

- photo_skin.png: the person's real skin painted from their photos with the room's light taken out
  (bake_skin.py).
- features.png: the same skin with the person's features drawn as clean lines and shapes
  (paint_features.py, drawn on the photo skin).
- The photo skin is given a painterly finish with OpenCV's edge-preserving stylisation (smooth brushed
  tones, edges kept), blended back with the real skin by `--paint`, so pores and noise go but the
  face's own tones stay. The drawn features are laid over lightly (`--lines`), so brows, lids and lips
  read clearly without looking like a cartoon.
"""
import argparse

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("photo_skin")
ap.add_argument("features")
ap.add_argument("out")
ap.add_argument("--paint", type=float, default=0.6)
ap.add_argument("--lines", type=float, default=0.35)
a = ap.parse_args()
skin = cv2.imread(a.photo_skin)
feat = cv2.imread(a.features)
styl = cv2.stylization(skin, sigma_s=12, sigma_r=0.18)
smooth = cv2.edgePreservingFilter(skin, flags=cv2.RECURS_FILTER, sigma_s=18, sigma_r=0.25)
painted = cv2.addWeighted(styl, 0.5, smooth, 0.5, 0)
base = cv2.addWeighted(painted, a.paint, skin, 1 - a.paint, 0)
# Features stay crisp: where the skin has strong detail (brows, lash line, lip edge), the painted finish
# gives way to the sharp photo skin, lightly sharpened.
gray = cv2.cvtColor(skin, cv2.COLOR_BGR2GRAY).astype(np.float32)
edge = np.abs(gray - cv2.GaussianBlur(gray, (0, 0), 6))
crisp = np.clip((edge - 6) / 14, 0, 1)
crisp = cv2.GaussianBlur(crisp, (0, 0), 2)[..., None]
sharp = cv2.addWeighted(skin, 1.5, cv2.GaussianBlur(skin, (0, 0), 1.5), -0.5, 0)
base = (base * (1 - crisp) + sharp * crisp).astype(np.float32)
# Lines: only where the feature layer differs from its own base (what was drawn), laid over lightly.
diff = np.abs(feat.astype(np.int16) - skin.astype(np.int16)).sum(2)
mask = np.clip(diff / 60.0, 0, 1)[..., None] * a.lines
out = base * (1 - mask) + feat * mask
cv2.imwrite(a.out, np.clip(out, 0, 255).astype(np.uint8))
print("LOOK wrote", a.out)
