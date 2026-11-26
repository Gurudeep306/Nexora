"""Pratibimb Living Portrait: the person's own pixels, re-animated. No 3D repainting, no training run.

  python3 scripts/teacher/maker/portrait.py <pack.pbpack> <out dir> --models <dir> [--size 512]
      [--judge <held-out video>]

The presenter faces the viewer, so it does not need a free 3D head. It needs the person's real face, sharp,
moving the way they move. Built from the identity pack in four steps, on any computer's CPU:

1. Fuse. Every training frame is laid onto one face layout by its face points (piecewise warp over a
   triangulation that covers the face, hair, ears, neck and shoulders, not just the face oval), its light
   matched, and the frames merged pixel by pixel with a median. Like a phone's night mode, noise and blur from
   a weak camera average out, and the many slightly shifted frames add detail no single frame has.
2. Motion. A per-person linear model, fitted on every captured frame: 52 expression values + head turn →
   where this person's 468 face points go. It is their own way of moving, not a generic one.
3. Banks. The mouth and the eyes of every training frame are kept with their expression values. To show an
   expression, the nearest real mouths and eyes are warped onto the target layout and blended in.
4. Draw. Target layout from the motion model; base warped to it; mouth and eyes laid over with soft edges.
   The same steps run in a browser (two textures and a triangle mesh).

--judge drives the portrait with ONLY the expression values and head turn read from frames of a held-out
video (the frames' own face shape is never used, only their position and size), and compares the result
with those real frames by face recognition (SFace), against the frames' own similarity to each other.
Writes <out>/portrait.npz (the model), <out>/base.png, <out>/report.json and <out>/judge.jpg.
"""
import argparse
import io
import json
import math
import os
import time
import zipfile

import cv2
import numpy as np
from scipy.spatial import Delaunay

ap = argparse.ArgumentParser()
ap.add_argument("pack")
ap.add_argument("out")
ap.add_argument("--models", required=True)
ap.add_argument("--size", type=int, default=512)
ap.add_argument("--judge", help="a held-out video of the same person")
ap.add_argument("--judge-frames", type=int, default=16)
ap.add_argument("--k", type=int, default=3, help="real mouths / eyes blended per region")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
t0 = time.time()
S = a.size

OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
        136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]
EYE_L = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 70, 63, 105, 66, 107]
EYE_R = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 300, 293, 334, 296, 336]
MOUTH_KEYS = ["jawOpen", "mouthClose", "mouthSmileLeft", "mouthSmileRight", "mouthPucker", "mouthFunnel", "mouthLowerDownLeft",
              "mouthLowerDownRight", "mouthUpperUpLeft", "mouthUpperUpRight", "mouthStretchLeft", "mouthStretchRight",
              "mouthRollLower", "mouthRollUpper", "mouthFrownLeft", "mouthFrownRight", "mouthPressLeft", "mouthPressRight"]
EYE_KEYS = ["eyeBlinkLeft", "eyeBlinkRight", "eyeWideLeft", "eyeWideRight", "eyeSquintLeft", "eyeSquintRight", "browInnerUp",
            "browOuterUpLeft", "browOuterUpRight", "browDownLeft", "browDownRight", "eyeLookUpLeft", "eyeLookUpRight",
            "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight"]

# --- The pack ------------------------------------------------------------------------------------------
z = zipfile.ZipFile(a.pack)
fr = np.load(io.BytesIO(z.read("frames.npz")))
NAMES = [str(n) for n in fr["blendshape_names"]]
BL, YPR, LM = fr["blendshapes"].astype(np.float64), fr["head_ypr_deg"].astype(np.float64), fr["landmarks"][:, :468, :2].astype(np.float64)
meta = json.loads(z.read("train/train.json"))
t_index = {round(float(t), 3): i for i, t in enumerate(fr["t"])}
train = []
for m in meta:
    i = t_index.get(round(float(m["t"]), 3))
    if i is None:
        continue
    img = cv2.imdecode(np.frombuffer(z.read(f"train/{m['file']}"), np.uint8), cv2.IMREAD_COLOR)
    train.append({"img": img, "xy": (LM[i] - np.array(m["offset"])) * m["scale"], "i": i})
if len(train) < 8:
    raise SystemExit(f"PORTRAIT only {len(train)} training frames in the pack; at least 8 are needed")
print(f"PORTRAIT {len(train)} training frames, {len(LM)} frames for the motion model", flush=True)


# --- Layouts: face points with the head's position, size and roll taken out -----------------------------------
def frame_of(xy):
    """(centre, unit scale, roll) of a face from its eye corners: the similarity the layout removes."""
    le, re = xy[[33, 133]].mean(0), xy[[263, 362]].mean(0)
    c = (le + re) / 2
    d = re - le
    return c, float(np.hypot(*d)), math.atan2(d[1], d[0])


def to_layout(xy):
    c, s, r = frame_of(xy)
    R = np.array([[math.cos(-r), -math.sin(-r)], [math.sin(-r), math.cos(-r)]])
    return (xy - c) @ R.T / s


def from_layout(L, c, s, r):
    R = np.array([[math.cos(r), -math.sin(r)], [math.sin(r), math.cos(r)]])
    return (L * s) @ R.T + c


def extended(L):
    """468 face points + two rings outside the face (hair, ears, neck) + the canvas border, in layout units."""
    ctr = L[OVAL].mean(0)
    o = L[OVAL] - ctr
    ring1 = ctr + o * 1.45 + np.array([0, -0.15])
    ring2 = ctr + o * 2.1 + np.array([0, -0.25])
    bx = np.array([[x, y] for x in (-3.2, 0, 3.2) for y in (-3.6, 0.5, 4.6) if not (x == 0 and y == 0.5)])
    return np.vstack([L, ring1, ring2, bx])


# Canvas: layout units → pixels (eyes 0.2 S apart, between-eyes point at (0.5 S, 0.42 S)).
UNIT, CX, CY = 0.2 * S, 0.5 * S, 0.42 * S
to_px = lambda P: P * UNIT + np.array([CX, CY])  # noqa: E731

# --- 2. The person's own motion model -----------------------------------------------------------------------
X = np.c_[BL, YPR[:, :2] / 30.0, np.ones(len(BL))]
Y = np.array([to_layout(xy).ravel() for xy in LM])
lam = 0.05 * np.eye(X.shape[1])
lam[-1, -1] = 0
W = np.linalg.solve(X.T @ X + lam * len(X), X.T @ Y)


def predict(bl, yaw, pitch):
    return (np.r_[bl, yaw / 30.0, pitch / 30.0, 1.0] @ W).reshape(468, 2)


fit_err = float(np.sqrt(((X @ W - Y) ** 2).mean()))
neutral_L = predict(np.zeros(52), 0, 0)
mean_L = Y.mean(0).reshape(468, 2)
TRI = Delaunay(extended(mean_L)).simplices


# --- Piecewise warp ---------------------------------------------------------------------------------------
def warp(img, src_pts, dst_pts, shape):
    """Move img so that src_pts land on dst_pts (same triangulation TRI); output of the given (h, w)."""
    h, w = shape
    tid = np.full((h, w), -1, np.int32)
    for k, t in enumerate(TRI):
        cv2.fillConvexPoly(tid, np.round(dst_pts[t]).astype(np.int32), int(k))
    A = np.zeros((len(TRI), 2, 3), np.float32)
    for k, t in enumerate(TRI):
        A[k] = cv2.getAffineTransform(dst_pts[t].astype(np.float32), src_pts[t].astype(np.float32))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    Ak = A[np.maximum(tid, 0)]
    mx = Ak[..., 0, 0] * xx + Ak[..., 0, 1] * yy + Ak[..., 0, 2]
    my = Ak[..., 1, 0] * xx + Ak[..., 1, 1] * yy + Ak[..., 1, 2]
    mx[tid < 0] = -1
    my[tid < 0] = -1
    return cv2.remap(img, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE), (tid >= 0)


def frame_points(xy):
    """A frame's own extended points, in its own pixels."""
    c, s, r = frame_of(xy)
    return from_layout(extended(to_layout(xy)), c, s, r)


# --- 1. Fuse ------------------------------------------------------------------------------------------------
canon = to_px(extended(neutral_L))
face_mask = np.zeros((S, S), np.uint8)
cv2.fillPoly(face_mask, [np.round(to_px(neutral_L)[OVAL]).astype(np.int32)], 1)
aligned, own_layouts = [], []
for f in train:
    L = to_layout(f["xy"])
    own = to_px(extended(L))
    # rigid only (the frame's own expression kept): for the banks
    c, s, r = frame_of(f["xy"])
    rigid, _ = warp(f["img"], frame_points(f["xy"]), own, (S, S))
    f["rigid"], f["own"] = rigid.astype(np.float32), own
    # onto the neutral layout: for the base
    f["neutral"], _ = warp(f["img"], frame_points(f["xy"]), canon, (S, S))
ref = np.median(np.array([np.median(f["neutral"][face_mask > 0], 0) for f in train]), 0)
for f in train:
    g = ref / np.maximum(1, np.median(f["neutral"][face_mask > 0], 0))
    f["gain"] = g
    f["neutral"] = np.clip(f["neutral"] * g, 0, 255)
    f["rigid"] = np.clip(f["rigid"] * g, 0, 255)
# Frames that would mislead the fusion: exact repeats (a frozen picture or a still shown on screen must not
# outvote real video) and frames whose light falls differently from the person's usual light in this recording.
def light_map(f):
    small = cv2.resize(f["neutral"], (24, 24), interpolation=cv2.INTER_AREA).astype(np.float32)
    m = cv2.resize(face_mask, (24, 24), interpolation=cv2.INTER_NEAREST) > 0
    g = small.mean(2)[m]
    return g / max(1e-3, g.mean())


uniq = []
for f in train:
    if all(np.abs(f["neutral"] - u["neutral"]).mean() > 1.5 for u in uniq):
        uniq.append(f)
maps = np.array([light_map(f) for f in uniq])
usual = np.median(maps, 0)
dist = np.abs(maps - usual).mean(1)
keep = dist <= max(np.median(dist) * 2.0, 0.03)
dropped = {"repeats": len(train) - len(uniq), "odd_light": int((~keep).sum())}
train = [f for f, k_ in zip(uniq, keep) if k_]
print(f"PORTRAIT left out {dropped['repeats']} repeated frames and {dropped['odd_light']} with unusual light; {len(train)} used", flush=True)
mi = {n: k for k, n in enumerate(NAMES)}
calm = [f for f in train if BL[f["i"], mi["jawOpen"]] < 0.12 and BL[f["i"], mi["eyeBlinkLeft"]] < 0.35
        and (BL[f["i"], mi["mouthSmileLeft"]] + BL[f["i"], mi["mouthSmileRight"]]) < 0.6]
if len(calm) < 5:
    calm = sorted(train, key=lambda f: BL[f["i"], mi["jawOpen"]])[: max(5, len(train) // 3)]
base = np.median(np.array([f["neutral"] for f in calm]), 0).astype(np.float32)
# Detail from the shifts between frames: unsharp the fused base by the fusion's own noise level.
blur = cv2.GaussianBlur(base, (0, 0), 1.2)
base = np.clip(base + 0.6 * (base - blur), 0, 255)
cv2.imwrite(os.path.join(a.out, "base.png"), base.astype(np.uint8))
print(f"PORTRAIT fused {len(calm)} calm frames into the base ({time.time() - t0:.0f}s)", flush=True)

MK = [mi[k] for k in MOUTH_KEYS if k in mi]
EK = [mi[k] for k in EYE_KEYS if k in mi]


def region_mask(L_px, idx, grow):
    m = np.zeros((S, S), np.float32)
    hull = cv2.convexHull(np.round(L_px[idx]).astype(np.int32))
    cv2.fillConvexPoly(m, hull, 1.0)
    k = int(grow * UNIT) | 1
    m = cv2.dilate(m, np.ones((k, k), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 0.18 * UNIT)


def render(bl, yaw, pitch):
    """The portrait for one set of expression values and head turn, on the canvas."""
    L = predict(bl, yaw, pitch)
    tgt = to_px(extended(L))
    out, _ = warp(base, canon, tgt, (S, S))
    Lp = tgt[:468]
    for keys, idx, grow in ((MK, LIPS + [152, 148, 377, 2], 0.35), (EK, EYE_L, 0.25), (EK, EYE_R, 0.25)):
        d = np.array([np.linalg.norm(BL[f["i"], keys] - bl[keys]) for f in train])
        near = np.argsort(d)[: a.k]
        wts = 1.0 / (d[near] + 0.05)
        acc = np.zeros_like(out)
        for j, wt in zip(near, wts):
            f = train[j]
            pw, _ = warp(f["rigid"], f["own"], tgt, (S, S))
            acc += wt * pw
        patch = acc / wts.sum()
        m = region_mask(Lp, idx, grow)[..., None]
        out = out * (1 - m) + patch * m
    return out, tgt


model = {"W": W, "tri": TRI, "base": base.astype(np.uint8), "size": S}
np.savez_compressed(os.path.join(a.out, "portrait.npz"), **model)
rep = {"train_frames": len(train), "left_out": dropped, "motion_frames": len(LM), "motion_fit_error_iod": round(fit_err, 4), "calm_frames": len(calm),
       "size": S, "build_seconds": round(time.time() - t0)}

# --- Judge on a held-out video ---------------------------------------------------------------------------------
if a.judge:
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions, vision
    det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
    rec = cv2.FaceRecognizerSF.create(os.path.join(a.models, "face_recognition_sface_2021dec.onnx"), "")
    lmk = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(a.models, "face_landmarker.task")), num_faces=1,
        output_face_blendshapes=True, output_facial_transformation_matrixes=True))

    def emb(img):
        if max(img.shape[:2]) < 400:
            img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        det.setInputSize((img.shape[1], img.shape[0]))
        _, f = det.detect(img)
        if f is None or not len(f):
            return None
        e = rec.feature(rec.alignCrop(img, max(f, key=lambda r: r[2] * r[3]))).ravel()
        return e / np.linalg.norm(e)

    def read(img):
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
        xy = np.array([[x0 + p.x * (x1 - x0), y0 + p.y * (y1 - y0)] for p in r.face_landmarks[0][:468]])
        bs = {b.category_name: b.score for b in r.face_blendshapes[0]}
        Mx = np.array(r.facial_transformation_matrixes[0])
        R = Mx[:3, :3] / np.linalg.norm(Mx[:3, 0])
        yaw = math.degrees(math.atan2(-R[2, 0], math.hypot(R[2, 1], R[2, 2])))
        pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
        return xy, np.array([bs.get(n, 0.0) for n in NAMES]), yaw, pitch

    cap = cv2.VideoCapture(a.judge)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    real_e, port_e, rows = [], [], []
    for k in range(a.judge_frames):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(n * (k + 0.5) / a.judge_frames))
        ok, img = cap.read()
        if not ok or (got := read(img)) is None:
            continue
        xy, bl, yaw, pitch = got
        canvas, tgt = render(bl, yaw, pitch)
        # Put the portrait where the real head is: position, size and roll only.
        c, s, r = frame_of(xy)
        src = to_px(np.array([[-0.5, 0.0], [0.5, 0.0], [0.0, 1.0]]))
        Rm = np.array([[math.cos(r), -math.sin(r)], [math.sin(r), math.cos(r)]])
        dst = (np.array([[-0.5, 0.0], [0.5, 0.0], [0.0, 1.0]]) * s) @ Rm.T + c
        Mt = cv2.getAffineTransform(src.astype(np.float32), dst.astype(np.float32))
        placed = cv2.warpAffine(canvas.astype(np.uint8), Mt, (img.shape[1], img.shape[0]), flags=cv2.INTER_CUBIC, borderValue=(128, 128, 128))
        er, ep = emb(img), emb(placed)
        if er is None or ep is None:
            continue
        real_e.append(er)
        port_e.append(ep)
        x0, y0 = np.maximum(0, (c - 2.4 * s).astype(int))
        x1, y1 = (c + 2.4 * s).astype(int)
        crop = lambda im: cv2.resize(im[y0:y1, x0:x1], (240, 240))  # noqa: E731
        rows.append(np.hstack([crop(img), crop(placed)]))
    cap.release()
    if len(real_e) >= 3:
        Rr, P = np.array(real_e), np.array(port_e)
        ceil = float(np.mean([Rr[i] @ Rr[j] for i in range(len(Rr)) for j in range(len(Rr)) if i != j]))
        same = float(np.mean([P[i] @ Rr[j] for i in range(len(P)) for j in range(len(Rr)) if i != j]))
        own = float(np.mean([P[i] @ Rr[i] for i in range(len(P))]))
        rep["judge"] = {"frames": len(Rr), "real_vs_real": round(ceil, 3), "portrait_vs_other_real_frames": round(same, 3),
                        "portrait_vs_its_own_frame": round(own, 3), "likeness_pct": round(100 * same / ceil),
                        "same_person_line": 0.363}
        sheet = [np.hstack(rows[i:i + 2]) for i in range(0, min(len(rows), 8) - 1, 2)]
        cv2.imwrite(os.path.join(a.out, "judge.jpg"), np.vstack(sheet))
rep["seconds"] = round(time.time() - t0)
json.dump(rep, open(os.path.join(a.out, "report.json"), "w"), indent=1)
print("PORTRAIT done", json.dumps(rep), flush=True)
