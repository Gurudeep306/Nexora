"""Pratibimb stage C (capture): everything the later stages need, from a video or a folder of photos.

  python3 scripts/teacher/maker/capture.py <video file | photo folder> <models dir> <out dir> \
      [--add <another video or photo folder>]... [--fps 15] [--max-seconds 600] [--keep 40]

Several sources (photos and videos together) are read as one capture: the views come from all of them,
the motion profile and the voice from the videos.

Runs on CPU with MediaPipe (Apache-2.0) and OpenCV's YuNet + SFace (MIT / Apache-2.0).

What it finds
- The main person. Interviews and crowd shots have other people in them, so every face is turned into
  an identity vector (SFace) and the person who appears most often is followed; frames where that person
  is not visible are left out. Cuts between camera shots are detected.
- For every sampled frame of that person: the 478 face points and 52 expression scores, the head turn
  (yaw, pitch, roll), 33 body points, 21 points per visible hand, hair / skin / clothes regions, and
  how usable the frame is (face size, sharpness, light, motion blur).
- Views: the sharpest calm frame for each head angle (left, three-quarter, front, right; up, level,
  down), and the clearest frame for each expression (smile, open mouth, raised brows, pout, blink...).
  Coverage says which angles are still missing, in plain words.
- How the person moves (a motion profile): blinks per minute and how long they last, how much and how
  fast the head moves, how wide each mouth shape opens while speaking (this tunes the lip sync to the
  person, instead of one setting for everyone), how often they smile and raise their brows, and how
  much and where their hands move when they talk.
- Appearance: skin, eye, lip, brow, hair and clothes colours, with the room's colour cast taken out
  using the whites of the eyes; hair length.
- Voice: the sound track (16 kHz mono WAV) with the stretches where the person is speaking.

Writes <out>/frames.jsonl, <out>/views/*.jpg (+ masks), <out>/profile.json, <out>/capture.json and
<out>/voice.wav. Nothing leaves the machine.
"""
import argparse
import glob
import json
import math
import os
import subprocess
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

ap = argparse.ArgumentParser()
ap.add_argument("source")
ap.add_argument("models")
ap.add_argument("out")
ap.add_argument("--fps", type=float, default=15.0)
ap.add_argument("--max-seconds", type=float, default=600.0)
ap.add_argument("--keep", type=int, default=40, help="most view / expression frames to save")
ap.add_argument("--per-view", type=int, default=4, help="frames kept per head angle (at least 3 s apart), so a video of\n"
                "someone who faces the camera still gives the model several photos")
ap.add_argument("--add", action="append", default=[], help="another video or photo folder, read with the first")
ap.add_argument("--train", type=int, default=64, help="most training frames to save for the appearance learner")
a = ap.parse_args()
os.makedirs(os.path.join(a.out, "views"), exist_ok=True)
M = lambda n: os.path.join(a.models, n)  # noqa: E731

face_det = cv2.FaceDetectorYN.create(M("face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
face_id = cv2.FaceRecognizerSF.create(M("face_recognition_sface_2021dec.onnx"), "")
landmarker = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=M("face_landmarker.task")), num_faces=1,
    output_face_blendshapes=True, output_facial_transformation_matrixes=True))
pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=M("pose_landmarker_full.task")), num_poses=3))
hands = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=M("hand_landmarker.task")), num_hands=2))
segmenter = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=M("selfie_multiclass.tflite")), output_confidence_masks=True))

IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")
SCLERA = ([33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
          [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249])
LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
BROWS = ([70, 63, 105, 66, 107, 55, 65, 52, 53, 46], [300, 293, 334, 296, 336, 285, 295, 282, 283, 276])
OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176,
        149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]


# --- Frames -----------------------------------------------------------------------------------------
SOURCES = [a.source] + a.add
VIDEOS = [x for x in SOURCES if not os.path.isdir(x)]


def frames():
    """(time in s, BGR image, name) for every source: videos at --fps, photos one by one. Each source has
    its own time range (videos from 0, 10000, 20000 s…; photos from 1000000) so times never collide."""
    for k, src in enumerate(SOURCES):
        if os.path.isdir(src):
            from PIL import Image, ImageOps
            for i, p in enumerate(sorted(f for f in glob.glob(os.path.join(src, "*")) if f.lower().endswith(IMG_EXT))):
                im = np.asarray(ImageOps.exif_transpose(Image.open(p)).convert("RGB"))[:, :, ::-1]
                yield 1_000_000.0 + k * 1000 + i, np.ascontiguousarray(im), os.path.basename(p)
            continue
        off = VIDEOS.index(src) * 10_000.0
        cap = cv2.VideoCapture(src)
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        step = max(1, round(src_fps / a.fps))
        i = 0
        while True:
            ok, im = cap.read()
            if not ok or i / src_fps > a.max_seconds:
                break
            if i % step == 0:
                yield off + i / src_fps, im, f"v{VIDEOS.index(src)}t{i / src_fps:08.3f}"
            i += 1
        cap.release()


def detect_faces(bgr):
    h, w = bgr.shape[:2]
    s = min(1.0, 1280 / max(h, w))
    small = cv2.resize(bgr, (int(w * s), int(h * s))) if s < 1 else bgr
    face_det.setInputSize((small.shape[1], small.shape[0]))
    _, f = face_det.detect(small)
    if f is None:
        return []
    out = []
    for row in f:
        row = row.copy()
        row[:14] /= s
        out.append(row)
    return out


def embed(bgr, row):
    aligned = face_id.alignCrop(bgr, row)
    e = face_id.feature(aligned).ravel()
    return e / (np.linalg.norm(e) + 1e-9)


# --- Pass 1: who is the main person? -------------------------------------------------------------------
print("CAPTURE pass 1: finding the main person", flush=True)
seen = []  # embeddings of every face seen (sampled at ~2 per second)
prev_hist, cuts, t_last = None, [], -1e9
for t, bgr, name in frames():
    if t - t_last < 0.5:
        continue
    t_last = t
    for row in detect_faces(bgr):
        if row[2] * row[3] > 40 * 40:
            seen.append(embed(bgr, row))
if not seen:
    raise SystemExit("CAPTURE no face found anywhere in the source")
E = np.array(seen)
sim = E @ E.T
votes = (sim > 0.45).sum(1)
centre = E[sim[np.argmax(votes)] > 0.45].mean(0)
centre /= np.linalg.norm(centre)
print(f"CAPTURE main person in {int(votes.max())} of {len(E)} faces seen", flush=True)


# --- Pass 2: everything about that person ------------------------------------------------------------
def zoom_landmarks(rgb, box):
    """Face points on a zoomed crop around the person's face, mapped back to the full frame."""
    H, W = rgb.shape[:2]
    x, y, w, h = box
    side = max(w, h) * 2.4
    cx, cy = x + w / 2, y + h / 2
    x0, y0 = int(max(0, cx - side / 2)), int(max(0, cy - side / 2))
    x1, y1 = int(min(W, cx + side / 2)), int(min(H, cy + side / 2))
    crop = rgb[y0:y1, x0:x1]
    if crop.size == 0:
        return None
    sz = 512
    up = cv2.resize(crop, (sz, int(sz * crop.shape[0] / crop.shape[1])), interpolation=cv2.INTER_CUBIC)
    r = landmarker.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(up)))
    if not r.face_landmarks:
        return None
    cw, ch = x1 - x0, y1 - y0
    lm = np.array([[x0 + p.x * cw, y0 + p.y * ch, p.z * cw] for p in r.face_landmarks[0]])
    bs = {b.category_name: round(b.score, 4) for b in r.face_blendshapes[0]}
    Mx = np.array(r.facial_transformation_matrixes[0])
    R = Mx[:3, :3] / np.linalg.norm(Mx[:3, 0])
    yaw = math.degrees(math.atan2(-R[2, 0], math.hypot(R[2, 1], R[2, 2])))
    pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
    roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    return lm, bs, (yaw, pitch, roll)


def sharpness(gray, box):
    x, y, w, h = [int(v) for v in box]
    c = gray[max(0, y):y + h, max(0, x):x + w]
    if c.size < 100:
        return 0.0
    c = cv2.resize(c, (160, int(160 * c.shape[0] / max(1, c.shape[1]))))
    return float(cv2.Laplacian(c, cv2.CV_64F).var())


def white_gain(rgb, lm):
    m = np.zeros(rgb.shape[:2], np.uint8)
    for ring in SCLERA:
        cv2.fillPoly(m, [lm[ring, :2].astype(np.int32)], 1)
    for c, ring in ((468, range(469, 473)), (473, range(474, 478))):
        rr = np.mean([np.hypot(*(lm[k, :2] - lm[c, :2])) for k in ring]) * 1.15
        cv2.circle(m, tuple(lm[c, :2].astype(int)), int(rr), 0, -1)
    px = rgb[m > 0].astype(np.float32)
    if len(px) < 30:
        return None
    lum = px @ [0.299, 0.587, 0.114]
    c = np.median(px[lum >= np.percentile(lum, 60)], 0)
    return np.clip(c.mean() / np.maximum(c, 1), 0.8, 1.25) ** 0.6


print("CAPTURE pass 2: reading every frame of the main person", flush=True)
records = []
colours = {"skin": [], "iris": [], "lips": [], "brows": [], "hair": [], "clothes": []}
hair_len = []
f_out = open(os.path.join(a.out, "frames.jsonl"), "w")
prev_small = None
for t, bgr, name in frames():
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    H, W = rgb.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, (64, 36))
    cut = prev_small is not None and float(np.abs(small.astype(int) - prev_small.astype(int)).mean()) > 40
    prev_small = small
    best, best_sim = None, 0.35
    for row in detect_faces(bgr):
        s_ = float(embed(bgr, row) @ centre)
        if s_ > best_sim:
            best, best_sim = row, s_
    rec = {"t": round(t, 3), "name": name, "cut": bool(cut), "size": [W, H]}
    if best is None:
        rec["person"] = False
        f_out.write(json.dumps(rec) + "\n")
        continue
    z = zoom_landmarks(rgb, best[:4])
    if z is None:
        rec["person"] = False
        f_out.write(json.dumps(rec) + "\n")
        continue
    lm, bs, (yaw, pitch, roll) = z
    face_px = float(np.ptp(lm[:, 0]))
    rec.update(person=True, id=round(best_sim, 3), face_px=round(face_px, 1),
               yaw=round(yaw, 1), pitch=round(pitch, 1), roll=round(roll, 1), blend=bs,
               sharp=round(sharpness(gray, best[:4]), 1),
               bright=round(float(gray[int(best[1]):int(best[1] + best[3]), int(best[0]):int(best[0] + best[2])].mean()), 1),
               landmarks=lm.round(2).tolist())
    # Body: the pose nearest the face.
    pr = pose.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    if pr.pose_landmarks:
        fc = lm[1, :2]
        k = int(np.argmin([np.hypot(p[0].x * W - fc[0], p[0].y * H - fc[1]) for p in pr.pose_landmarks]))
        rec["body"] = [[round(q.x * W, 1), round(q.y * H, 1), round(q.visibility, 2)] for q in pr.pose_landmarks[k]]
        if pr.pose_world_landmarks:
            rec["body3d"] = [[round(q.x, 3), round(q.y, 3), round(q.z, 3)] for q in pr.pose_world_landmarks[k]]
    hr = hands.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
    if hr.hand_landmarks:
        rec["hands"] = [{"side": hd[0].category_name, "score": round(hd[0].score, 2),
                         "points": [[round(q.x * W, 1), round(q.y * H, 1), round(q.z, 3)] for q in hl]}
                        for hl, hd in zip(hr.hand_landmarks, hr.handedness)]
    # Appearance, from calm, sharp, well-lit frames.
    calm = abs(yaw) < 25 and abs(pitch) < 25 and bs.get("mouthSmileLeft", 0) < 0.4 and bs.get("jawOpen", 0) < 0.2
    if calm and face_px > 120 and rec["sharp"] > 40:
        g = white_gain(rgb, lm)
        if g is not None:
            seg = segmenter.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)).confidence_masks
            masks = [m_.numpy_view().reshape(H, W) for m_ in seg]
            wb = np.clip(rgb.astype(np.float32) * g, 0, 255)
            oval = np.zeros((H, W), np.uint8)
            cv2.fillPoly(oval, [lm[OVAL, :2].astype(np.int32)], 1)
            lips = np.zeros((H, W), np.uint8)
            cv2.fillPoly(lips, [lm[LIPS, :2].astype(np.int32)], 1)
            brow = np.zeros((H, W), np.uint8)
            for ring in BROWS:
                cv2.fillPoly(brow, [lm[ring, :2].astype(np.int32)], 1)
            skin = (masks[3] > 0.8) & (oval > 0) & (lips == 0) & (brow == 0)
            if skin.sum() > 200:
                px = wb[skin]
                lum = px @ [0.299, 0.587, 0.114]
                lo, hi = np.percentile(lum, [60, 90])
                colours["skin"].append(np.median(px[(lum >= lo) & (lum <= hi)], 0))
            if (lips > 0).sum() > 30:
                colours["lips"].append(np.median(wb[(lips > 0) & (masks[3] > 0.2)], 0) if ((lips > 0) & (masks[3] > 0.2)).sum() > 20 else np.median(wb[lips > 0], 0))
            if (brow > 0).sum() > 20:
                bp = wb[brow > 0]
                colours["brows"].append(np.median(bp[(bp @ [0.299, 0.587, 0.114]) <= np.percentile(bp @ [0.299, 0.587, 0.114], 40)], 0))
            ir = []
            for c_, ring in ((468, range(469, 473)), (473, range(474, 478))):
                rr = np.mean([np.hypot(*(lm[k, :2] - lm[c_, :2])) for k in ring])
                yy, xx = np.ogrid[:H, :W]
                d = np.sqrt((xx - lm[c_, 0]) ** 2 + (yy - lm[c_, 1]) ** 2)
                ir.append((d < rr * 0.9) & (d > rr * 0.4))
            irm = ir[0] | ir[1]
            if irm.sum() > 10:
                colours["iris"].append(np.median(wb[irm], 0))
            hair = masks[1] > 0.6
            if hair.sum() > 200:
                colours["hair"].append(np.median(wb[hair], 0))
                ys = np.nonzero(hair)[0]
                hair_len.append(float((np.percentile(ys, 98) - lm[152, 1]) / face_px))
            cl = masks[4] > 0.7
            if cl.sum() > 500:
                colours["clothes"].append(np.median(wb[cl], 0))
            rec["appearance_frame"] = True
    records.append((rec, True))
    f_out.write(json.dumps(rec) + "\n")
    if len(records) % 50 == 0:
        print(f"CAPTURE {len(records)} frames of the person (t={t:.1f}s)", flush=True)
f_out.close()
people = [r for r, _ in records]
print(f"CAPTURE {len(people)} frames of the main person", flush=True)
if not people:
    raise SystemExit("CAPTURE the main person was never seen clearly")


# --- Views and expressions ------------------------------------------------------------------------------
def quality(r):
    return min(1, r["face_px"] / 350) * 0.4 + min(1, r["sharp"] / 250) * 0.4 + (0.2 if 60 < r["bright"] < 220 else 0)


def neutral(r):
    b = r["blend"]
    return b.get("jawOpen", 0) < 0.15 and b.get("mouthSmileLeft", 0) < 0.3 and b.get("eyeBlinkLeft", 0) < 0.4


YAW_BINS = [(-60, -35, "far left"), (-35, -15, "three-quarter left"), (-15, 15, "front"), (15, 35, "three-quarter right"), (35, 60, "far right")]
PITCH_BINS = [(-30, -8, "looking down"), (-8, 8, "level"), (8, 30, "looking up")]
views, missing = [], []
for y0, y1, yn in YAW_BINS:
    for p0, p1, pn in PITCH_BINS:
        cand = [(quality(r), i) for i, (r, b) in enumerate(records) if b is not None and neutral(r)
                and y0 <= r["yaw"] < y1 and p0 <= r["pitch"] < p1 and r["face_px"] > 90]
        took = []
        for _, i in sorted(cand, reverse=True):
            if len(took) >= a.per_view:
                break
            if all(abs(records[i][0]["t"] - records[j][0]["t"]) >= 3 for j in took):
                took.append(i)
        for k, i in enumerate(took):
            views.append((f"{yn}, {pn}" + (f" {k + 1}" if k else ""), i))
        if not took and pn == "level":
            missing.append(yn)
EXPRESSIONS = {
    "smile": lambda b: (b.get("mouthSmileLeft", 0) + b.get("mouthSmileRight", 0)) / 2,
    "open mouth": lambda b: b.get("jawOpen", 0),
    "raised brows": lambda b: b.get("browInnerUp", 0),
    "pout": lambda b: b.get("mouthPucker", 0),
    "frown": lambda b: (b.get("browDownLeft", 0) + b.get("browDownRight", 0)) / 2,
    "eyes closed": lambda b: (b.get("eyeBlinkLeft", 0) + b.get("eyeBlinkRight", 0)) / 2,
    "wide eyes": lambda b: (b.get("eyeWideLeft", 0) + b.get("eyeWideRight", 0)) / 2,
}
for ename, fn in EXPRESSIONS.items():
    cand = [(fn(r["blend"]) * (0.5 + quality(r)), i) for i, (r, b) in enumerate(records)
            if b is not None and abs(r["yaw"]) < 25 and r["face_px"] > 90]
    if cand and max(cand)[0] > 0.35:
        views.append((f"expression: {ename}", max(cand)[1]))
views = views[: a.keep]

# Training frames for the appearance learner (stage 2): up to --train frames, spread over head angles
# and expressions, sharp ones first. Saved as face crops (head and shoulders) with their offset, so the
# frame's own face points still apply.
# A still picture inside a video (a photo shown on screen, a title card, a frozen stream) is not the person:
# a real face always moves, blinks or talks. A frame whose face shape does not change at all within ±2 s is
# left out of training.
def _layout(lm):
    xy = np.asarray(lm)[:468, :2]
    le, re = xy[[33, 133]].mean(0), xy[[263, 362]].mean(0)
    d = re - le
    ang = math.atan2(d[1], d[0])
    R = np.array([[math.cos(-ang), -math.sin(-ang)], [math.sin(-ang), math.cos(-ang)]])
    return (xy - (le + re) / 2) @ R.T / max(1e-6, float(np.hypot(*d)))


still = set()
if VIDEOS:
    lay_t = np.array([r["t"] for r, _ in records])
    lays = np.array([_layout(r["landmarks"]) for r, _ in records])
    for i in range(len(records)):
        near = np.abs(lay_t - lay_t[i]) <= 2.0
        if near.sum() >= 4 and np.abs(lays[near] - lays[i]).mean(axis=(1, 2)).max() < 0.006:
            still.add(i)
    if len(still) > 10:
        print(f"CAPTURE {len(still)} frames of a still picture in the video left out (a real face always moves)", flush=True)
cands = [i for i, (r, _) in enumerate(records) if r["face_px"] > 90 and r["sharp"] > 25 and i not in still]
low_detail = len(cands) < 24
if low_detail:
    # A weak camera (small or soft face in every frame): use the best this recording has, and say so.
    ok_ = [i for i, (r, _) in enumerate(records) if r["face_px"] > 48 and i not in still]
    cut = np.percentile([records[i][0]["sharp"] for i in ok_], 30) if ok_ else 0
    cands = [i for i in ok_ if records[i][0]["sharp"] >= cut]
    print(f"CAPTURE low detail: faces about {int(np.median([records[i][0]['face_px'] for i in ok_] or [0]))} px wide; "
          f"using the {len(cands)} best frames. Closer to the camera, or a phone camera, gives a better model.", flush=True)
bins = {}
for i in cands:
    r = records[i][0]
    b = r["blend"]
    key = (int((r["yaw"] + 90) // 12), int((r["pitch"] + 90) // 12),
           int(b.get("jawOpen", 0) > 0.25), int((b.get("mouthSmileLeft", 0) + b.get("mouthSmileRight", 0)) > 0.7), int(b.get("browInnerUp", 0) > 0.35))
    bins.setdefault(key, []).append(i)
train_ids = []
for key in sorted(bins, key=lambda k: -len(bins[k])):
    best = max(bins[key], key=lambda i: records[i][0]["sharp"])
    train_ids.append(best)
# Fill up with the sharpest remaining frames, evenly spaced in time.
rest = sorted(set(cands) - set(train_ids), key=lambda i: -records[i][0]["sharp"])
train_ids = (train_ids + rest)[: a.train]
want_train = {records[i][0]["name"]: i for i in train_ids}


def covered(bgr, lm, face_px):
    """Something on the face (sticker, emoji, drawn filter, hand): dark, hard-edged blobs on the cheeks
    and forehead, away from the features. The same rule as analyse.py and the browser coach."""
    H_, W_ = bgr.shape[:2]
    face = np.zeros((H_, W_), np.uint8)
    cv2.fillPoly(face, [lm[OVAL, :2].astype(np.int32)], 1)
    feats = np.zeros((H_, W_), np.uint8)
    for ring in (*SCLERA, *BROWS, LIPS, [98, 97, 2, 326, 327, 294, 278, 344, 440, 275, 4, 45, 220, 115, 48, 64]):
        cv2.fillPoly(feats, [lm[ring, :2].astype(np.int32)], 1)
    k_ = int(face_px / 10) | 1
    inner = (face > 0) & (cv2.dilate(feats, np.ones((k_, k_), np.uint8)) == 0)
    if inner.sum() < 400:
        return False
    L_ = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)[..., 0].astype(np.float32)
    dark = (L_ < np.median(L_[inner]) * 0.35) & inner
    _, _, st, _ = cv2.connectedComponentsWithStats(dark.astype(np.uint8))
    blobs = sum(int(x) for x in st[1:, 4] if x > (face_px / 30) ** 2) / inner.sum()
    edges = ((np.abs(cv2.Laplacian(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY), cv2.CV_64F)) > 40) & inner).sum() / inner.sum()
    return blobs if edges > 0.005 else 0.0
# Read the chosen frames again (frames are not kept in memory while scanning).
want = {records[i][0]["name"]: [] for _, i in views}
for label, i in views:
    want[records[i][0]["name"]].append((label, i))
picked = {}
os.makedirs(os.path.join(a.out, "train"), exist_ok=True)
train_meta = []
for t, bgr, name in frames():
    if name in want:
        picked[name] = bgr
    if name in want_train:
        r = records[want_train[name]][0]
        lm = np.array(r["landmarks"])
        cover = covered(bgr, lm, r["face_px"])
        fw = float(np.ptp(lm[:, 0]))
        cx, cy = lm[:, 0].mean(), lm[:, 1].mean()
        # Head, shoulders and upper chest: the presenter is shown waist up, so the body must be learned too.
        half = fw * 2.0
        H_, W_ = bgr.shape[:2]
        x0, y0 = int(max(0, cx - half)), int(max(0, cy - half * 0.95))
        x1, y1 = int(min(W_, cx + half)), int(min(H_, cy + half * 1.55))
        crop = bgr[y0:y1, x0:x1]
        scale = min(1.0, 768 / max(1, max(crop.shape[:2])))
        if scale < 1:
            crop = cv2.resize(crop, (int(crop.shape[1] * scale), int(crop.shape[0] * scale)), interpolation=cv2.INTER_AREA)
        # Which pixels are the person (hair, skin, clothes) and which are background: the model is the person only.
        seg = segmenter.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)))).confidence_masks
        parts = np.argmax(np.stack([m_.numpy_view().reshape(crop.shape[:2]) for m_ in seg]), 0).astype(np.uint8)
        fn = f"{len(train_meta):03d}.jpg"
        cv2.imwrite(os.path.join(a.out, "train", fn), crop, [cv2.IMWRITE_JPEG_QUALITY, 93])
        cv2.imwrite(os.path.join(a.out, "train", fn[:-4] + "_parts.png"), parts)  # 0 bg, 1 hair, 2 body skin, 3 face, 4 clothes, 5 other
        body = r.get("body")
        train_meta.append({"file": fn, "parts": fn[:-4] + "_parts.png", "body": [[(q[0] - x0) * scale, (q[1] - y0) * scale, q[2]] for q in body] if body else None,
                           "t": r["t"], "offset": [x0, y0], "scale": scale, "yaw": r["yaw"], "pitch": r["pitch"], "cover": round(cover, 4)})
# A covered face (sticker, emoji, hand) would teach the learner the cover. Judged against the person's own usual
# face, so a beard, stubble, moles or glasses that are there in every frame are never taken for a cover.
if train_meta:
    usual = float(np.median([m["cover"] for m in train_meta]))
    kept = []
    for m in train_meta:
        if m["cover"] > 0.05 and m["cover"] > usual + 0.08:
            os.remove(os.path.join(a.out, "train", m["file"]))
        else:
            kept.append(m)
    if len(kept) < len(train_meta):
        print(f"CAPTURE {len(train_meta) - len(kept)} training frames left out: something covers the face", flush=True)
    train_meta = kept
json.dump(train_meta, open(os.path.join(a.out, "train", "train.json"), "w"))
saved = []
for label, i in views:
    r = records[i][0]
    b = picked.get(r["name"])
    if b is None:
        continue
    fn = f"{len(saved):02d}_{label.replace(':', '').replace(',', '').replace(' ', '_')}.jpg"
    cv2.imwrite(os.path.join(a.out, "views", fn), b, [cv2.IMWRITE_JPEG_QUALITY, 95])
    rgb = cv2.cvtColor(b, cv2.COLOR_BGR2RGB)
    seg = segmenter.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))).confidence_masks
    lab = np.argmax(np.stack([m_.numpy_view().reshape(rgb.shape[:2]) for m_ in seg]), 0).astype(np.uint8)
    cv2.imwrite(os.path.join(a.out, "views", fn[:-4] + "_parts.png"), lab * 40)  # 0 bg, 1 hair, 2 body, 3 face, 4 clothes, 5 other
    saved.append({"file": fn, "label": label, "t": r["t"], "yaw": r["yaw"], "pitch": r["pitch"], "face_px": r["face_px"], "sharp": r["sharp"]})

# --- How the person moves ------------------------------------------------------------------------------------
is_video = bool(VIDEOS)
voice = None
if is_video:
    wav = os.path.join(a.out, "voice.wav")
    p = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", VIDEOS[0] if VIDEOS else a.source, "-t", str(a.max_seconds), "-ac", "1", "-ar", "16000", wav])
    if p.returncode == 0 and os.path.exists(wav):
        import wave
        with wave.open(wav) as w_:
            s16 = np.frombuffer(w_.readframes(w_.getnframes()), np.int16).astype(np.float32) / 32768
        hop = 160  # 10 ms
        rms = np.sqrt(np.convolve(s16 ** 2, np.ones(400) / 400, "same")[::hop] + 1e-12)
        thr = max(np.percentile(rms, 30) * 2.5, 0.01)
        voice = rms > thr
        voice = np.convolve(voice.astype(float), np.ones(25) / 25, "same") > 0.3  # fill short gaps (250 ms)
        spans, on = [], None
        for k, v in enumerate(voice):
            if v and on is None:
                on = k
            if not v and on is not None:
                spans.append([round(on / 100, 2), round(k / 100, 2)])
                on = None
        if on is not None:
            spans.append([round(on / 100, 2), round(len(voice) / 100, 2)])
        voice_spans = spans
    else:
        voice_spans = []

# The motion profile is about how the person moves, so it reads the first video only.
all_people = people
people = [r for r in all_people if r["t"] < 10_000.0] if is_video else all_people
profile = {"frames": len(people), "seconds": round(people[-1]["t"] - people[0]["t"], 1) if is_video and people else None}
if is_video and len(people) > 30:
    T = np.array([r["t"] for r in people])
    B = lambda k: np.array([r["blend"].get(k, 0) for r in people])  # noqa: E731
    blink = (B("eyeBlinkLeft") + B("eyeBlinkRight")) / 2 > 0.5
    starts = np.nonzero(blink[1:] & ~blink[:-1])[0]
    dur = []
    for s0 in starts:
        e = s0 + 1
        while e < len(blink) and blink[e]:
            e += 1
        dur.append(T[min(e, len(T) - 1)] - T[s0 + 1])
    span = max(1e-6, T[-1] - T[0])
    yaw, pitch, roll = (np.array([r[k] for r in people]) for k in ("yaw", "pitch", "roll"))
    dt = np.diff(T)
    ok = (dt > 0) & (dt < 0.3)
    speaking = None
    if voice is not None:
        idx = np.clip((T * 100).astype(int), 0, len(voice) - 1)
        speaking = voice[idx]
    MOUTH = ["jawOpen", "mouthClose", "mouthFunnel", "mouthPucker", "mouthStretchLeft", "mouthStretchRight", "mouthSmileLeft",
             "mouthSmileRight", "mouthUpperUpLeft", "mouthUpperUpRight", "mouthLowerDownLeft", "mouthLowerDownRight",
             "mouthPressLeft", "mouthPressRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper"]
    sel = speaking if speaking is not None and speaking.sum() > 20 else np.ones(len(people), bool)
    profile.update({
        "blinks_per_minute": round(len(starts) / span * 60, 1),
        "blink_ms": round(float(np.median(dur)) * 1000) if dur else None,
        "head": {k: {"spread_deg": round(float(np.std(v)), 2), "speed_deg_s": round(float(np.median(np.abs(np.diff(v))[ok] / dt[ok])), 2) if ok.any() else None}
                 for k, v in (("yaw", yaw), ("pitch", pitch), ("roll", roll))},
        "speaking_mouth": {k: {"p50": round(float(np.percentile(B(k)[sel], 50)), 3), "p95": round(float(np.percentile(B(k)[sel], 95)), 3)} for k in MOUTH},
        "smile_share": round(float(((B("mouthSmileLeft") + B("mouthSmileRight")) / 2 > 0.35).mean()), 3),
        "brow_raise_share": round(float((B("browInnerUp") > 0.35).mean()), 3),
        "speaking_share": round(float(speaking.mean()), 3) if speaking is not None else None,
    })
    # Hands: how often they are up and moving while speaking, and where (relative to the shoulders).
    hand_up, hand_speed, hand_y = 0, [], []
    for k_, r in enumerate(people):
        if "hands" in r and "body" in r:
            sh = np.array(r["body"])[[11, 12], :2]
            sw = max(1.0, float(np.linalg.norm(sh[0] - sh[1])))
            for h_ in r["hands"]:
                wr = np.array(h_["points"][0][:2])
                hand_up += 1
                hand_y.append(float((wr[1] - sh[:, 1].mean()) / sw))
                if k_ > 0 and "hands" in people[k_ - 1] and 0 < dt[k_ - 1] < 0.3:
                    prev = [np.array(q["points"][0][:2]) for q in people[k_ - 1]["hands"] if q["side"] == h_["side"]]
                    if prev:
                        hand_speed.append(float(np.linalg.norm(wr - prev[0]) / sw / dt[k_ - 1]))
    profile["hands"] = {"visible_share": round(hand_up / len(people) / 2, 3),
                        "speed_shoulders_per_s": round(float(np.median(hand_speed)), 3) if hand_speed else None,
                        "height_below_shoulders": round(float(np.median(hand_y)), 3) if hand_y else None}
    profile["voice_spans"] = voice_spans[:400] if voice is not None else []

med = lambda xs: (np.median(np.array(xs), 0) / 255).round(3).tolist() if xs else None  # noqa: E731
appearance = {k: med(v) for k, v in colours.items()}
appearance["hair_below_chin_face_widths"] = round(float(np.median(hair_len)), 2) if hair_len else None
people = all_people
yaws = np.array([r["yaw"] for r in people])
summary = {
    "source": [os.path.basename(x.rstrip("/")) for x in SOURCES], "kind": ("video+photos" if is_video and len(VIDEOS) < len(SOURCES) else "video") if is_video else "photos",
    "frames_of_person": len(people), "views": saved, "missing_views": missing,
    "turn_range_deg": [round(float(yaws.min()), 1), round(float(yaws.max()), 1)],
    "appearance": appearance,
    "advice": ([f"Add a {', '.join(missing)} view (turn the head slowly to that side)."] if missing else [])
    + (["Faces are small: film closer, head and shoulders filling about a third of the frame."] if np.median([r["face_px"] for r in people]) < 150 else []),
}
json.dump(profile, open(os.path.join(a.out, "profile.json"), "w"), indent=1)
json.dump(summary, open(os.path.join(a.out, "capture.json"), "w"), indent=1)
print("CAPTURE views", len(saved), "missing", missing, "turn range", summary["turn_range_deg"])
print("CAPTURE done", json.dumps({k: profile.get(k) for k in ("blinks_per_minute", "blink_ms", "smile_share", "speaking_share")}))
