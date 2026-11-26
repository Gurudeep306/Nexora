"""Pratibimb stream: any video of a person → the compact performance stream that drives a character.

  python3 scripts/teacher/maker/stream.py <video> <models dir> <out.json> [--fps 15] [--start 0] [--seconds 10]
      [--frames <dir>]

Per frame: the 52 ARKit expression values (MediaPipe Face Landmarker, Apache-2.0, on the device), head turn /
nod / tilt in degrees, and gaze. Values are stored as bytes (0–255), so a second of performance is about
1–2 KB: small enough to store per lesson, send live, or keep as a library of the person's own mannerisms.
No picture of the person is kept in the stream; --frames also saves the matching video frames (for checks).

{"fps": 15, "names": [52 names], "frames": [{"b": [52 bytes], "ypr": [yaw, pitch, roll]}, ...]}
"""
import argparse
import json
import math
import os

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("models")
ap.add_argument("out")
ap.add_argument("--fps", type=float, default=15)
ap.add_argument("--start", type=float, default=0)
ap.add_argument("--seconds", type=float, default=10)
ap.add_argument("--frames", help="also save the video frames here (face crops, for side-by-side checks)")
a = ap.parse_args()

det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
lmk = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(a.models, "face_landmarker.task")), num_faces=1,
    output_face_blendshapes=True, output_facial_transformation_matrixes=True))


def read(img):
    """Expression values and head pose of the largest face (found by YuNet, read on an enlarged crop)."""
    det.setInputSize((img.shape[1], img.shape[0]))
    _, f = det.detect(img)
    if f is None or not len(f):
        return None
    x, y, w, h = max(f, key=lambda r: r[2] * r[3])[:4]
    x0, y0 = int(max(0, x - w)), int(max(0, y - h))
    x1, y1 = int(min(img.shape[1], x + 2 * w)), int(min(img.shape[0], y + 2 * h))
    crop = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2RGB)
    up = cv2.resize(crop, (512, int(512 * crop.shape[0] / crop.shape[1])), interpolation=cv2.INTER_CUBIC)
    r = lmk.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(up)))
    if not r.face_landmarks:
        return None
    names = [b.category_name for b in r.face_blendshapes[0]]
    vals = [b.score for b in r.face_blendshapes[0]]
    Mx = np.array(r.facial_transformation_matrixes[0])
    R = Mx[:3, :3] / np.linalg.norm(Mx[:3, 0])
    yaw = math.degrees(math.atan2(-R[2, 0], math.hypot(R[2, 1], R[2, 2])))
    pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
    roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    box = (int(x + w / 2), int(y + h / 2), int(max(w, h)))
    return names, vals, (yaw, pitch, roll), box


cap = cv2.VideoCapture(a.video)
src_fps = cap.get(cv2.CAP_PROP_FPS) or 25
cap.set(cv2.CAP_PROP_POS_MSEC, a.start * 1000)
step = src_fps / a.fps
out, names, k, nxt, last = [], None, 0, 0.0, None
if a.frames:
    os.makedirs(a.frames, exist_ok=True)
while len(out) < a.seconds * a.fps:
    ok, img = cap.read()
    if not ok:
        break
    k += 1
    if k < nxt:
        continue
    nxt += step
    got = read(img)
    if got is None:
        if last is None:
            continue
        got = last  # hold the last good reading through a missed frame
    last = got
    names, vals, ypr, (cx, cy, sz) = got
    out.append({"b": [int(round(255 * min(1.0, max(0.0, v)))) for v in vals], "ypr": [round(v, 1) for v in ypr]})
    if a.frames:
        half = int(sz * 1.6)
        M = np.float32([[384 / (2 * half), 0, -(cx - half) * 384 / (2 * half)], [0, 384 / (2 * half), -(cy - half * 0.9) * 384 / (2 * half)]])
        cv2.imwrite(os.path.join(a.frames, f"f{len(out) - 1:04d}.jpg"), cv2.warpAffine(img, M, (384, 384), borderValue=(128, 128, 128)))
cap.release()
json.dump({"fps": a.fps, "names": names, "frames": out}, open(a.out, "w"), separators=(",", ":"))
size = os.path.getsize(a.out)
print(f"STREAM {len(out)} frames ({len(out) / a.fps:.1f} s), {size} bytes as JSON ≈ {len(out) * 55 / max(1, len(out) / a.fps) / 1000:.1f} KB/s packed")
