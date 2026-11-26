"""Build a lip-sync training set from consented videos of people talking (Hindi, Hinglish, English).

  python3 scripts/teacher/maker/training/lipsync/make_dataset.py <videos dir> <models dir> <out dir>

For each video: the audio is saved as 16 kHz mono WAV, and every frame's 52 face values (ARKit
blendshapes) are read with MediaPipe Face Landmarker (Apache-2.0), resampled to exactly 30 per second.
Output per clip: <name>.wav and <name>.npy (float32[frames, 51]: MediaPipe gives the ARKit set without
"tongueOut"; the names are in summary.json, map them to wav2arkit's config.json order when training). These pairs fine-tune wav2arkit (or train our own model) so lips follow Hindi speech.

Only use videos of people who agreed in writing that their recordings train NexoraGuru's models.
Frames where no face is found are filled from their neighbours; clips with more than 10% missing are
skipped. A summary (clips, minutes, skipped and why) is written to <out>/summary.json.
"""
import glob
import json
import os
import subprocess
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

videos, models, out = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(models, "face_landmarker.task")),
    running_mode=vision.RunningMode.VIDEO, output_face_blendshapes=True, num_faces=1))
ARKIT = None
summary = {"clips": 0, "minutes": 0.0, "skipped": {}}
clock_ms = 0  # the face reader needs one time line that only goes forward, across all videos
for path in sorted(glob.glob(os.path.join(videos, "*"))):
    if not path.lower().endswith((".mp4", ".mov", ".mkv", ".webm")):
        continue
    name = os.path.splitext(os.path.basename(path))[0]
    has_audio = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", path],
                               capture_output=True, text=True).stdout.strip()
    if not has_audio:
        summary["skipped"][name] = "no sound track"
        continue
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    rows, times, missing, k = [], [], 0, 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        t_ms = clock_ms + int(k * 1000 / fps)
        r = lm.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), t_ms)
        if r.face_blendshapes:
            cats = r.face_blendshapes[0]
            if ARKIT is None:
                ARKIT = [c.category_name for c in cats if c.category_name != "_neutral"]
            d = {c.category_name: c.score for c in cats}
            rows.append([d[n] for n in ARKIT])
        else:
            rows.append(None)
            missing += 1
        times.append(k / fps)
        k += 1
    clock_ms += int(k * 1000 / fps) + 1000
    if not rows or missing > 0.1 * len(rows):
        summary["skipped"][name] = f"face missing in {missing} of {len(rows)} frames"
        continue
    arr = np.array([r if r is not None else [np.nan] * len(ARKIT) for r in rows], np.float32)
    for j in range(arr.shape[1]):  # fill gaps from neighbours
        col = arr[:, j]
        bad = np.isnan(col)
        if bad.any():
            col[bad] = np.interp(np.nonzero(bad)[0], np.nonzero(~bad)[0], col[~bad])
    dur = len(rows) / fps
    t30 = np.arange(0, dur, 1 / 30)
    res = np.stack([np.interp(t30, times, arr[:, j]) for j in range(arr.shape[1])], 1).astype(np.float32)
    np.save(os.path.join(out, name + ".npy"), res)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", os.path.join(out, name + ".wav")], check=True)
    summary["clips"] += 1
    summary["minutes"] += dur / 60
lm.close()
json.dump({**summary, "arkit_names": ARKIT}, open(os.path.join(out, "summary.json"), "w"), indent=1)
print("LIPSYNC dataset", json.dumps({k: v for k, v in summary.items() if k != "skipped"}), "skipped", len(summary["skipped"]))
