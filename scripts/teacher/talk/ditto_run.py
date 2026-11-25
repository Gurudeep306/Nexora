"""Make a talking video from one photo and one voice clip with Ditto (Ant Group, Apache-2.0), our way.

  python3 -I scripts/teacher/talk/ditto_run.py --ditto <ditto checkout> --photo face.jpg --audio line.wav --out out.mp4

What this wrapper changes, without editing Ditto's files:
- No InsightFace. Ditto finds the first face with InsightFace's detector and 106 points, whose model
  files are for non-commercial research only. Here MediaPipe Face Landmarker (Apache-2.0) finds the
  face and gives the five points Ditto's crop needs (eyes, nose tip, mouth corners).
- Safe loading. Ditto's settings file is a Python pickle; it is read with a loader that accepts only
  the three numpy pieces the file uses, so a changed file cannot run code. PyTorch weights load in
  weights-only mode.
- Runs on the CPU when there is no NVIDIA card.
"""
import argparse
import math
import os
import pickle
import sys

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--ditto", required=True)
ap.add_argument("--photo", required=True)
ap.add_argument("--audio", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--face-model", default=None, help="MediaPipe face_landmarker.task (defaults to Ditto's copy)")
ap.add_argument("--device", default=None)
ap.add_argument("--max-size", type=int, default=1280)
args = ap.parse_args()

ROOT = os.path.abspath(args.ditto)
DATA = os.path.join(ROOT, "checkpoints", "ditto_pytorch")
CFG = os.path.join(ROOT, "checkpoints", "ditto_cfg", "v0.4_hubert_cfg_pytorch.pkl")
sys.path.insert(0, ROOT)
os.chdir(ROOT)  # Ditto compiles a small Cython blend module next to its sources

import torch  # noqa: E402

DEVICE = args.device or ("cuda" if torch.cuda.is_available() else "cpu")
torch.set_num_threads(os.cpu_count() or 4)

# --- Safe settings loader -------------------------------------------------------------------------
ALLOWED = {("numpy._core.multiarray", "_reconstruct"), ("numpy.core.multiarray", "_reconstruct"), ("numpy", "ndarray"), ("numpy", "dtype")}


class SafeUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if (module, name) not in ALLOWED:
            raise pickle.UnpicklingError(f"Refused {module}.{name} in Ditto's settings file")
        return super().find_class(module, name)


def safe_load_pkl(path):
    with open(path, "rb") as f:
        data = SafeUnpickler(f).load()

    def fix(x):
        if isinstance(x, dict):
            return {k: fix(v) for k, v in x.items()}
        if isinstance(x, list):
            return [fix(v) for v in x]
        return DEVICE if isinstance(x, str) and x == "cuda" else x

    return fix(data)


import core.atomic_components.cfg as cfg_mod  # noqa: E402

cfg_mod.load_pkl = safe_load_pkl

_torch_load = torch.load


def weights_only_load(*a, **k):
    k["weights_only"] = True
    return _torch_load(*a, **k)


torch.load = weights_only_load

# --- MediaPipe instead of InsightFace -------------------------------------------------------------
import mediapipe as mp  # noqa: E402
from mediapipe.tasks.python import BaseOptions, vision  # noqa: E402

FACE_TASK = args.face_model or os.path.join(DATA, "aux_models", "face_landmarker.task")
_landmarker = vision.FaceLandmarker.create_from_options(
    vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path=FACE_TASK), num_faces=4))
_cache = {}


def _points(img):
    key = (img.shape, int(img[::37, ::41].sum()))
    if key not in _cache:
        res = _landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img)))
        faces = []
        for lm in res.face_landmarks:
            p = np.array([[q.x * img.shape[1], q.y * img.shape[0]] for q in lm], dtype=np.float32)
            faces.append(p)
        faces.sort(key=lambda p: -np.ptp(p[:, 0]) * np.ptp(p[:, 1]))  # biggest face first
        _cache.clear()
        _cache[key] = faces
    return _cache[key]


class MediaPipeDet:
    """Stands in for InsightFace's detector: boxes (x1, y1, x2, y2, score), biggest first."""

    def __init__(self, *a, **k):
        pass

    def __call__(self, img, *a, **k):
        faces = _points(img)
        boxes = np.array([[p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max(), 1.0] for p in faces], dtype=np.float32).reshape(-1, 5)
        return boxes, None


class MediaPipeFive:
    """Stands in for InsightFace's 106 points: the five points Ditto's crop reads (eyes, nose, mouth corners)."""

    def __init__(self, *a, **k):
        pass

    def __call__(self, img, box, *a, **k):
        faces = _points(img)
        if not faces:
            raise RuntimeError("No face found in the photo")
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        p = min(faces, key=lambda f: (f[:, 0].mean() - cx) ** 2 + (f[:, 1].mean() - cy) ** 2)
        eye_a = p[[33, 133]].mean(0)   # the eye on the picture's left
        eye_b = p[[362, 263]].mean(0)  # the eye on the picture's right
        return np.stack([eye_a, eye_b, p[1], p[61], p[291]]).astype(np.float32)


# Ditto's diffusion model takes its device from a default ("cuda"), not from the settings.
import importlib  # noqa: E402

lmdm_mod = importlib.import_module("core.models.modules.LMDM")

_lmdm_init = lmdm_mod.LMDM.__init__


def _lmdm_init_on_device(self, *a, **k):
    k["device"] = DEVICE
    _lmdm_init(self, *a, **k)


lmdm_mod.LMDM.__init__ = _lmdm_init_on_device

import core.atomic_components.source2info as s2i  # noqa: E402

s2i.InsightFaceDet = MediaPipeDet
s2i.Landmark106 = MediaPipeFive

# --- Run --------------------------------------------------------------------------------------------
import librosa  # noqa: E402

from stream_pipeline_offline import StreamSDK  # noqa: E402

sdk = StreamSDK(CFG, DATA)
sdk.setup(args.photo, args.out, max_size=args.max_size)
audio, _ = librosa.core.load(args.audio, sr=16000)
frames = math.ceil(len(audio) / 16000 * 25)
sdk.setup_Nd(N_d=frames)
sdk.audio2motion_queue.put(sdk.wav2feat.wav2feat(audio))
sdk.close()
os.system(f'ffmpeg -loglevel error -y -i "{sdk.tmp_output_path}" -i "{args.audio}" -map 0:v -map 1:a -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac "{args.out}"')
print("TALK wrote", args.out, frames, "frames")
