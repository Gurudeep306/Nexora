"""Stage 0 of the Teacher Maker: put every photo upright.

Phones often send pictures with their turn tag stripped, so a portrait photo arrives sideways or upside
down and the face reader finds nothing (or a head tilted 70 degrees). This tries the four quarter turns,
keeps the one where the face is found and most level, and writes upright copies (EXIF applied, no tags).

  python3 upright.py <photos dir> <models dir> <out dir>
Prints one line per photo and "UPRIGHT done <n turned>/<n photos>".
"""
import glob
import os
import sys

import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from PIL import Image, ImageOps

src, models, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(models, "face_landmarker.task")), num_faces=2))


def roll_of(img):
    """Face found? Then its size and how far from level the eyes are (degrees)."""
    small = img.copy()
    small.thumbnail((900, 900))
    a = np.ascontiguousarray(np.asarray(small))
    r = lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=a))
    if not r.face_landmarks:
        return None
    best = max(r.face_landmarks, key=lambda l: np.ptp([p.x for p in l]) * np.ptp([p.y for p in l]))
    h, w = a.shape[:2]
    re, le = best[33], best[263]  # outer eye corners
    ang = np.degrees(np.arctan2((le.y - re.y) * h, (le.x - re.x) * w))
    # Chin below the eyes when upright.
    chin_below = best[152].y > (re.y + le.y) / 2
    return abs(ang) + (0 if chin_below else 180)


turned = 0
files = sorted(f for f in glob.glob(os.path.join(src, "*")) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
for path in files:
    name = os.path.basename(path)
    try:
        img = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    except Exception as e:
        print(f"UPRIGHT {name}: cannot open ({e})")
        continue
    tries = []
    for k in (0, 90, 180, 270):
        im = img.rotate(k, expand=True) if k else img
        r = roll_of(im)
        if r is not None:
            tries.append((r + (0 if k == 0 else 2), k, im))  # small preference for "as sent"
        if k == 0 and r is not None and r < 30:
            break
    if tries:
        r, k, im = min(tries, key=lambda t: t[0])
    else:
        k, im = 0, img
    if k:
        turned += 1
    base = os.path.splitext(name)[0] + ".jpg"
    im.save(os.path.join(out, base), quality=95)
    print(f"UPRIGHT {name}: {'turned ' + str(k) if k else 'as sent'}{'' if tries else ' (no face in any turn)'}")
print(f"UPRIGHT done {turned}/{len(files)}")
