"""Measure how much a model looks like the person, with a face-recognition model.

  python3 scripts/teacher/maker/likeness.py <models dir> --photos a.jpg b.jpg ... --renders r1.png r2.png ...

Faces are found with YuNet (MIT) and turned into identity vectors with SFace (Apache-2.0), both
from OpenCV's model zoo. Two numbers matter:

- photo vs photo: how alike the person's own photos are to each other (different days, light and
  filters). This is the ceiling: a perfect model can't beat the person's own photos.
- render vs photo: how alike the model's renders are to the photos.

Likeness % = render-vs-photo similarity / photo-vs-photo similarity. 100% means the model is as
recognisable as another photo of the same person. SFace's own "same person" line is a cosine of
0.363, printed for reference.
"""
import argparse
import itertools
import os

import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("models")
ap.add_argument("--photos", nargs="+", required=True)
ap.add_argument("--renders", nargs="+", required=True)
args = ap.parse_args()

det = cv2.FaceDetectorYN.create(os.path.join(args.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
rec = cv2.FaceRecognizerSF.create(os.path.join(args.models, "face_recognition_sface_2021dec.onnx"), "")


def embed(path):
    img = cv2.imread(path)
    if img is None:
        return None
    h, w = img.shape[:2]
    s = 960 / max(h, w)
    if s < 1:
        img = cv2.resize(img, (int(w * s), int(h * s)))
        h, w = img.shape[:2]
    det.setInputSize((w, h))
    _, faces = det.detect(img)
    if faces is None or not len(faces):
        return None
    face = max(faces, key=lambda f: f[2] * f[3])
    return rec.feature(rec.alignCrop(img, face)).ravel()


def cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


P = {p: embed(p) for p in args.photos}
P = {k: v for k, v in P.items() if v is not None}
R = {r: embed(r) for r in args.renders}
pp = [cos(P[a], P[b]) for a, b in itertools.combinations(P, 2)]
ceiling = float(np.mean(pp))
print(f"LIKENESS photos used {len(P)}; photo vs photo mean {ceiling:.3f} (same-person line 0.363)")
for r, e in R.items():
    if e is None:
        print(f"LIKENESS {os.path.basename(r)}: no face found")
        continue
    s = float(np.mean([cos(e, v) for v in P.values()]))
    print(f"LIKENESS {os.path.basename(r)}: render vs photos {s:.3f} -> {100 * s / ceiling:.0f}%")
