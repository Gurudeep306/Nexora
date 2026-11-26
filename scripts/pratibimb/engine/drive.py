"""Drive a built model with a performance stream: any 52 expression values + head turn → video frames.

  python3 -m engine.drive <model dir> <stream.json> <out.mp4> [--size 256] [--frames <dir of real frames>]

The stream is stream.py's format (from a real video, from the motion maker, or typed). Head turn and nod come
from the stream's yaw / pitch / roll; the head is placed at a fixed spot of a waist-up frame. With --frames the
real video frames are put on the left for a side-by-side check.
"""
import argparse
import json
import os
import subprocess

import cv2
import numpy as np
import torch

from .rig import Rig, rot_ypr
from .splats import Splats

ap = argparse.ArgumentParser()
ap.add_argument("model")
ap.add_argument("stream")
ap.add_argument("out")
ap.add_argument("--size", type=int, default=256)
ap.add_argument("--frames")
ap.add_argument("--bg", default="243,238,230")
a = ap.parse_args()
dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
z = np.load(os.path.join(a.model, "model.npz"))
rig = Rig.from_npz(z)
sp = Splats(len(rig.tri), int(z["per_tri"]), device=dev)
sp.load_state_dict({k[3:]: torch.tensor(z[k]) for k in z.files if k.startswith("sp_")})
TRI = torch.tensor(rig.tri, device=dev)
S = json.load(open(a.stream))
order = [S["names"].index(n) for n in rig.names]
bg = np.array([int(x) for x in a.bg.split(",")][::-1], np.uint8)
H = W = a.size
scale = W * 0.16  # eye distance in pixels: head and shoulders fill the frame
centre = np.array([W * 0.5, H * 0.36, 0.0])
tmp = a.out + ".frames"
os.makedirs(tmp, exist_ok=True)
with torch.no_grad():
    for k, f in enumerate(S["frames"]):
        blend = np.array(f["b"], np.float64)[order] / 255.0
        yaw, pitch, roll = f["ypr"]
        R = rot_ypr(-yaw, -pitch, roll)
        V = rig.place(rig.vertices(blend), scale, R, centre)
        rgb, acc = sp.render(torch.tensor(V, dtype=torch.float32, device=dev), TRI, (H, W))
        img = (rgb + (1 - acc[..., None]) * torch.tensor(bg[::-1] / 255.0, dtype=torch.float32, device=dev)).clamp(0, 1)
        frame = (img.cpu().numpy()[..., ::-1] * 255).astype(np.uint8)
        if a.frames:
            real = cv2.imread(os.path.join(a.frames, f"f{k:04d}.jpg"))
            if real is not None:
                frame = np.hstack([cv2.resize(real, (W, H)), frame])
        cv2.putText(frame, "AI-generated", (8, frame.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (90, 90, 90), 1, cv2.LINE_AA)
        cv2.imwrite(os.path.join(tmp, f"f{k:04d}.png"), frame)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(S["fps"]), "-i", os.path.join(tmp, "f%04d.png"),
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", a.out], check=True)
for x in os.listdir(tmp):
    os.remove(os.path.join(tmp, x))
os.rmdir(tmp)
print("DRIVE", len(S["frames"]), "frames ->", a.out)
