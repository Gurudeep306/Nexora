"""The twin performs a line: text → voice → sounds → lips, with blinks, brows, nods and hand gestures.

  python3 -m engine.perform <model dir> "<text>" <out base> [--voice-url http://127.0.0.1:8882]
      [--sex female] [--shoulder 0.32] [--size 360x300] [--fps 25] [--outfit '{"colour":[..],"sleeve":0.8}']

Writes <out base>.webm (the person only, transparent background), <out base>.mp4 (on white, with sound) and
<out base>.json (the performance: every frame's 52 values, head turn and gesture, so any renderer can replay it).

Motion here is rules from the speech (the trained motion maker replaces them later):
- lips: the voice's sound timeline through the language-independent sound-to-mouth layer (phonemes.py);
- blinks at phrase ends and every 2.5–5 s; brows lift and the head nods on loud, stressed words;
- gestures from the words: "namaste" at a greeting, open hands while explaining, pointing at "this", "here",
  "look", "board"; they ease in and out.
"""
import argparse
import base64
import io
import json
import os
import re
import subprocess
import urllib.request
import wave

import cv2
import numpy as np

from .body import blend_poses, gesture
from .phonemes import lip_check, mouth_track
from .twin import Twin

ap = argparse.ArgumentParser()
ap.add_argument("model")
ap.add_argument("text")
ap.add_argument("out")
ap.add_argument("--voice-url", default="http://127.0.0.1:8882")
ap.add_argument("--voice", default="hf_alpha")
ap.add_argument("--language", default="en-us")
ap.add_argument("--sex", default="neutral")
ap.add_argument("--shoulder", type=float)
ap.add_argument("--size", default="360x300")
ap.add_argument("--fps", type=int, default=25)
ap.add_argument("--outfit")
a = ap.parse_args()
H, W = (int(x) for x in a.size.split("x"))

# 1. Voice
req = urllib.request.Request(a.voice_url.rstrip("/") + "/v1/synthesize", method="POST", headers={"Content-Type": "application/json"},
                             data=json.dumps({"input": a.text, "voice": a.voice, "language": a.language, "speed": 1, "audioEncoding": "wav"}).encode())
V = json.loads(urllib.request.urlopen(req, timeout=600).read())
wav_bytes = base64.b64decode(V["audio"])
open(a.out + ".wav", "wb").write(wav_bytes)
with wave.open(io.BytesIO(wav_bytes)) as w_:
    sr = w_.getframerate()
    pcm = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(np.float32) / 32768
dur = len(pcm) / sr
phones = [(p, t / 1000, (t + d) / 1000) for p, t, d in zip(V["phonemes"], V["vtimes"], V["vdurations"])]

# 2. Motion
twin = Twin(a.model, sex=a.sex, shoulder_m=a.shoulder, outfit=json.loads(a.outfit) if a.outfit else None)
names = twin.rig.names
n = int(np.ceil((dur + 0.4) * a.fps))
mouth = mouth_track(phones, names, fps=a.fps)
track = np.zeros((n, len(names)))
track[:min(n, len(mouth))] = mouth[:n]
ok, fails = lip_check(track, phones, names, fps=a.fps)
idx = {k: i for i, k in enumerate(names)}
hop = sr // a.fps
loud = np.array([np.sqrt(np.mean(pcm[i * hop:(i + 1) * hop] ** 2)) if i * hop < len(pcm) else 0 for i in range(n)])
loud = loud / (loud.max() + 1e-9)
words = [(w.strip().lower().strip(".,!?"), t / 1000, (t + d) / 1000) for w, t, d in zip(V["words"], V["wtimes"], V["wdurations"])]
rng = np.random.default_rng(3)
blinks = [e + 0.05 for w, s, e in words if re.search(r"[.?!]$", w)] + list(np.cumsum(rng.uniform(2.5, 5.0, 20)))
gest = []  # (name, start, end)
for w, s, e in words:
    if w in ("namaste", "namaskar", "hello", "hi"):
        gest.append(("namaste", max(0, s - 0.3), e + 0.6))
    elif w in ("this", "here", "look", "board", "see"):
        gest.append(("point", s - 0.2, e + 0.9))
if not any(g[0] == "explain" for g in gest):
    first = max([g[2] for g in gest if g[0] == "namaste"] + [0.0])
    gest.append(("explain", first + 0.2, dur - 0.2))
perf = []
for f in range(n):
    t = f / a.fps
    b = track[f].copy()
    for bt in blinks:
        d = t - bt
        if 0 <= d < 0.18:
            v = np.sin(np.pi * d / 0.18)
            b[idx["eyeBlinkLeft"]] = max(b[idx["eyeBlinkLeft"]], v)
            b[idx["eyeBlinkRight"]] = max(b[idx["eyeBlinkRight"]], v)
    b[idx["browInnerUp"]] = max(b[idx["browInnerUp"]], 0.35 * max(0, loud[f] - 0.55) / 0.45)
    b[idx["mouthSmileLeft"]] = max(b[idx["mouthSmileLeft"]], 0.18)
    b[idx["mouthSmileRight"]] = max(b[idx["mouthSmileRight"]], 0.18)
    nod = 4.0 * max(0, loud[f] - 0.6)
    ypr = (2.5 * np.sin(t * 0.7) + 1.2 * np.sin(t * 1.9), -nod + 1.0 * np.sin(t * 1.3), 1.2 * np.sin(t * 0.9))
    pose, wsum = gesture("rest", twin.P), 0.0
    for g, s, e in gest:
        ramp = min(1.0, max(0.0, (t - s) / 0.35), max(0.0, (e - t) / 0.35))
        if ramp > 0:
            amt = ramp * (1.0 if g != "explain" else 0.75 + 0.25 * np.sin(t * 2.1))
            pose = blend_poses(pose, gesture(g, twin.P, 1.0), amt)
            wsum = max(wsum, ramp)
    perf.append((b, ypr, pose))

# 3. Frames
tmp = a.out + "_frames"
os.makedirs(tmp, exist_ok=True)
for f, (b, ypr, pose) in enumerate(perf):
    img = twin.frame(b, ypr, pose, size=(H, W))
    rgba = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    cv2.imwrite(os.path.join(tmp, f"f{f:04d}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
    if f % 25 == 0:
        print(f"PERFORM frame {f}/{n}", flush=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-framerate", str(a.fps), "-i", os.path.join(tmp, "f%04d.png"), "-i", a.out + ".wav",
                "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "2M", "-c:a", "libopus", "-shortest", a.out + ".webm"], check=True)
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", f"color=c=white:s={W}x{H}:r={a.fps}", "-framerate", str(a.fps),
                "-i", os.path.join(tmp, "f%04d.png"), "-i", a.out + ".wav", "-filter_complex", "[0:v][1:v]overlay=shortest=1[v]",
                "-map", "[v]", "-map", "2:a", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-shortest", a.out + ".mp4"], check=True)
json.dump({"fps": a.fps, "text": a.text, "names": names, "lip_check": {"passed": ok, "failures": fails},
           "frames": [{"b": [round(float(x), 3) for x in b], "ypr": [round(float(x), 2) for x in y]} for b, y, _ in perf]},
          open(a.out + ".json", "w"))
for x in os.listdir(tmp):
    os.remove(os.path.join(tmp, x))
os.rmdir(tmp)
print("PERFORM done", a.out + ".mp4", "lip check", "passed" if ok else fails)
