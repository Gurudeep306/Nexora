"""Pratibimb test bench: the same pipeline, run on many different people, with one results table.

  python3 scripts/teacher/maker/bench.py <bench.json> <out dir> --models <models dir> --blender <blender>
      [--fps 4] [--variants 3] [--learn-iters 300] [--only name,name]

bench.json lists the people (their media stay outside the repository; never commit them):

  [{"name": "a", "body": "female", "train": ["a1.mp4", "a2.mp4"], "holdout": ["a3.mp4"]}, ...]

For every person, exactly what the worker does on the site, with nothing tuned per person:
  1. capture.py over the training clips (photos or videos), then pack.py: the identity pack;
  2. pipeline.py on the pack's views: the model (its own likeness check is against training views);
  3. the honest check: frames from the held-out clip, recorded at another time and never seen by any
     stage, are compared with the model's renders by face recognition (SFace). The held-out face is the
     one that matches the pack's identity, so other people in the clip are never used;
  4. learn_face.py (stage 2, learned appearance), whose number is "appearance only": it is drawn with
     each held-out frame's own face points, so it is an upper bound, not the model's likeness;
  5. a control: every model against every other person's held-out frames. A real likeness score is high
     only on the diagonal.

Likeness % = model-vs-held-out similarity / held-out-vs-held-out similarity (the person's own frames:
the ceiling). Writes <out>/results.json, <out>/results.md and <out>/sheet.jpg. Stages already done are
skipped, so a stopped run can be started again.
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import time
import zipfile

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("bench")
ap.add_argument("out")
ap.add_argument("--models", required=True)
ap.add_argument("--blender", default=os.environ.get("BLENDER", "blender"))
ap.add_argument("--fps", type=float, default=4.0)
ap.add_argument("--variants", type=int, default=3)
ap.add_argument("--learn-iters", type=int, default=300, help="0 skips stage 2")
ap.add_argument("--holdout-frames", type=int, default=16)
ap.add_argument("--only", default="")
a = ap.parse_args()
SAME = 0.363  # SFace's own same-person line

people = json.load(open(a.bench))
if a.only:
    keep = set(a.only.split(","))
    people = [p for p in people if p["name"] in keep]
os.makedirs(a.out, exist_ok=True)
det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
rec = cv2.FaceRecognizerSF.create(os.path.join(a.models, "face_recognition_sface_2021dec.onnx"), "")


def log(name, msg):
    print(f"BENCH {time.strftime('%H:%M:%S')} {name}: {msg}", flush=True)


def py(script, *args):
    t = time.time()
    p = subprocess.run([sys.executable, os.path.join(HERE, script), *map(str, args)], capture_output=True, text=True, cwd=ROOT)
    if p.returncode != 0:
        tail = "\n".join(l for l in (p.stdout + p.stderr).splitlines() if not l.startswith(("W0000", "I0000", "INFO")))[-800:]
        raise RuntimeError(f"{script} stopped: {tail}")
    return p.stdout, round(time.time() - t)


def faces(img):
    """Every face in an image as (box, unit identity vector); small faces are found on a zoomed copy."""
    h, w = img.shape[:2]
    s = 960 / max(h, w)
    im = cv2.resize(img, (int(w * s), int(h * s))) if s < 1 else img
    det.setInputSize((im.shape[1], im.shape[0]))
    _, f = det.detect(im)
    out = []
    for r in (f if f is not None else []):
        e = rec.feature(rec.alignCrop(im, r)).ravel()
        out.append((r, e / (np.linalg.norm(e) + 1e-9)))
    return out


def mean_pairs(A):
    return float(np.mean([A[i] @ A[j] for i in range(len(A)) for j in range(len(A)) if i != j])) if len(A) > 1 else None


def holdout_frames(person, ref, dst):
    """Frames spread over the held-out clips, keeping only the face that is this person."""
    os.makedirs(dst, exist_ok=True)
    embs = []
    srcs = person["holdout"]
    per = max(1, a.holdout_frames // len(srcs))
    for src in srcs:
        cap = cv2.VideoCapture(src)
        n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        for k in range(per):
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(n * (k + 0.5) / per))
            ok, img = cap.read()
            if not ok:
                continue
            fs = faces(img)
            if not fs:
                continue
            box, e = max(fs, key=lambda t: float(t[1] @ ref))
            if float(e @ ref) < SAME:
                continue
            embs.append(e)
            x, y, w, h = [int(v) for v in box[:4]]
            sc = img.shape[1] / min(960, max(img.shape[:2])) if max(img.shape[:2]) > 960 else 1
            x, y, w, h = [int(v * sc) for v in (x, y, w, h)]
            pad = int(0.6 * max(w, h))
            crop = img[max(0, y - pad):y + h + pad, max(0, x - pad):x + w + pad]
            cv2.imwrite(os.path.join(dst, f"h{len(embs):02d}.jpg"), crop)
        cap.release()
    return embs


def emb_file(path):
    img = cv2.imread(path)
    if img is None:
        return None
    fs = faces(img)
    return max(fs, key=lambda t: t[0][2] * t[0][3])[1] if fs else None


results = []
for p in people:
    name = p["name"]
    D = os.path.join(a.out, name)
    os.makedirs(D, exist_ok=True)
    row = {"name": name, "seconds": {}}
    try:
        cap, pack, photos, model = (os.path.join(D, x) for x in ("capture", "pack.pbpack", "photos", "model"))
        if not os.path.exists(os.path.join(cap, "capture.json")):
            log(name, "capture")
            _, row["seconds"]["capture"] = py("capture.py", p["train"][0], a.models, cap, *sum((["--add", s] for s in p["train"][1:]), []),
                                              "--fps", a.fps)
        if not os.path.exists(pack):
            log(name, "pack")
            _, row["seconds"]["pack"] = py("pack.py", cap, a.models, pack)
        with zipfile.ZipFile(pack) as z:
            ident = json.loads(z.read("identity.json"))
            man = json.loads(z.read("manifest.json")) if "manifest.json" in z.namelist() else {}
        row["pack_frames"] = (ident.get("frames") or {}).get("count") if isinstance(ident.get("frames"), dict) else None
        row["pack_files"] = len(man.get("files", {})) if isinstance(man.get("files"), dict) else None
        ref = np.array(ident["identity"]["vector"], np.float32)
        ref /= np.linalg.norm(ref) + 1e-9
        if not os.path.isdir(photos):
            os.makedirs(photos)
            for f in os.listdir(os.path.join(cap, "views")):
                if f.endswith(".jpg") and not f.endswith("_parts.jpg") and "expression" not in f:
                    shutil.copy(os.path.join(cap, "views", f), os.path.join(photos, f"view-{f}"))
        row["views"] = len(os.listdir(photos))
        if not os.path.exists(os.path.join(model, "report.json")):
            log(name, f"model from {row['views']} views")
            _, row["seconds"]["model"] = py("pipeline.py", "--photos", photos, "--work", model, "--gender", p.get("body", "neutral"),
                                            "--models", a.models, "--blender", a.blender, "--variants", a.variants)
            for f in glob.glob(os.path.join(model, "teacher_*.vrm")) + glob.glob(os.path.join(model, "lab", "out", "*.vrm")):
                os.remove(f)  # keep teacher.vrm (the chosen one) only
        rep = json.load(open(os.path.join(model, "report.json")))
        done = rep.get("stages", {}).get("done") or {}
        best = done.get("best")
        row["pipeline_likeness_vs_training_views"] = done.get("likeness")
        renders = [os.path.join(model, f"render_{best}_{v}.png") for v in ("f", "s")]
        row["renders"] = [r for r in renders if os.path.exists(r)]

        log(name, "held-out check")
        H = holdout_frames(p, ref, os.path.join(D, "holdout"))
        row["holdout_frames"] = len(H)
        R = [e for e in (emb_file(r) for r in row["renders"]) if e is not None]
        ceiling = mean_pairs(H)
        row["holdout_ceiling"] = round(ceiling, 3) if ceiling else None
        row["train_identity_vs_holdout"] = round(float(np.mean([e @ ref for e in H])), 3) if H else None
        if R and H and ceiling:
            front = float(np.mean([R[0] @ h for h in H]))
            row["model_vs_holdout"] = round(front, 3)
            row["likeness_pct"] = round(100 * front / ceiling)
            row["same_person"] = front >= SAME
        else:
            row["likeness_pct"] = None
            row["note"] = "the model's render showed no face" if not R else "no held-out frames of this person"
        np.save(os.path.join(D, "holdout_emb.npy"), np.array(H) if H else np.zeros((0, 128), np.float32))
        if R:
            np.save(os.path.join(D, "render_emb.npy"), np.array(R))

        if a.learn_iters > 0:
            learn = os.path.join(D, "learn")
            if not os.path.exists(os.path.join(learn, "report.json")):
                log(name, f"stage 2 learner, {a.learn_iters} steps")
                _, row["seconds"]["learn"] = py("learn_face.py", pack, learn, "--models", a.models, "--iters", a.learn_iters)
            lr = json.load(open(os.path.join(learn, "report.json")))
            row["learned_appearance_pct"] = lr.get("likeness_alone_pct")
            row["learned_in_frame_pct"] = lr.get("likeness_in_frame_pct")
        log(name, f"likeness {row.get('likeness_pct')}% (held-out), pipeline's own {row['pipeline_likeness_vs_training_views']}%")
    except Exception as e:  # one person failing must not stop the bench: it is a result too
        row["error"] = str(e)[:600]
        log(name, f"FAILED {row['error'][:200]}")
    results.append(row)
    json.dump(results, open(os.path.join(a.out, "results.json"), "w"), indent=1)

# The control: every model against every person's held-out frames.
names = [r["name"] for r in results]
M = {}
for i in names:
    rf = os.path.join(a.out, i, "render_emb.npy")
    if not os.path.exists(rf):
        continue
    r0 = np.load(rf)[0]
    M[i] = {}
    for j in names:
        hf = os.path.join(a.out, j, "holdout_emb.npy")
        H = np.load(hf) if os.path.exists(hf) else np.zeros((0,))
        M[i][j] = round(float(np.mean(H @ r0)), 3) if len(H) else None
out = {"people": results, "control": M, "same_person_line": SAME}
json.dump(out, open(os.path.join(a.out, "results.json"), "w"), indent=1)

lines = ["| Person | Views | Held-out frames | Likeness (held-out) | Same person? | Pipeline's own check | Learned face (appearance only) |",
         "|---|---|---|---|---|---|---|"]
for r in results:
    if "error" in r:
        lines.append(f"| {r['name']} | — | — | failed: {r['error'][:80]} | — | — | — |")
        continue
    lines.append(f"| {r['name']} | {r.get('views')} | {r.get('holdout_frames')} | {r.get('likeness_pct')}% | "
                 f"{'yes' if r.get('same_person') else 'no'} | {r.get('pipeline_likeness_vs_training_views')}% | "
                 f"{r.get('learned_appearance_pct', '—')}% |")
if M:
    cols = list(M)
    lines += ["", "Control (model × held-out person, SFace cosine; same person ≥ 0.363):", "",
              "| Model ↓ / Person → | " + " | ".join(cols) + " |", "|---" * (len(cols) + 1) + "|"]
    for i in cols:
        lines.append(f"| {i} | " + " | ".join(f"**{M[i][j]}**" if i == j else str(M[i][j]) for j in cols) + " |")
open(os.path.join(a.out, "results.md"), "w").write("\n".join(lines) + "\n")

# One sheet: a held-out frame | the model, front | the model, side | the learned face on a held-out frame.
rows = []
for r in results:
    D = os.path.join(a.out, r["name"])
    tiles = []
    for f in sorted(glob.glob(os.path.join(D, "holdout", "*.jpg")))[:1] + r.get("renders", []):
        im = cv2.imread(f)
        if im is not None:
            tiles.append(cv2.resize(im, (int(im.shape[1] * 220 / im.shape[0]), 220)))
    lh = os.path.join(D, "learn", "holdout.jpg")
    if os.path.exists(lh):
        im = cv2.imread(lh)[:192]
        tiles.append(cv2.resize(im, (int(im.shape[1] * 220 / im.shape[0]), 220)))
    if tiles:
        row = np.hstack(tiles)
        cv2.putText(row, f"{r['name']}  {r.get('likeness_pct')}%", (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        rows.append(row)
if rows:
    w = max(x.shape[1] for x in rows)
    cv2.imwrite(os.path.join(a.out, "sheet.jpg"), np.vstack([np.pad(x, ((0, 0), (0, w - x.shape[1]), (0, 0))) for x in rows]))
print(open(os.path.join(a.out, "results.md")).read())
