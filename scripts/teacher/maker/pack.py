"""Pratibimb identity pack: everything extracted about one person, in one documented file.

  python3 scripts/teacher/maker/pack.py <capture dir> <models dir> <out.pbpack> [--consent consent.json]

Input: the output of capture.py (frames.jsonl, views/, profile.json, capture.json, voice.wav).
Output: <out.pbpack>, a zip (format in docs/pratibimb/PACK_FORMAT.md) holding:

  manifest.json        schema, version, provenance, every file with its SHA-256, quality and coverage
  identity.json        the person, measured: 3D face scale, ~40 face measurements in millimetres,
                       face-shape ratios and asymmetry, colours (skin on the Monk Skin Tone scale,
                       undertone, eyes, lips, brows, hair, clothes), hair shape, body proportions,
                       expression ranges, motion habits, voice statistics, identity embedding
  frames.npz           every frame of the person: 478 face points, 52 expression values, head turn,
                       33 body points (image and 3D), 21 points per hand, quality, time
  face/mesh.obj        the person's 3D face (MediaPipe topology, 468 points, millimetres, with UVs)
  face/points3d.npy    the same 478 points (with irises) as an array
  face/texture.png     the face's colours in MediaPipe's canonical UV layout, merged from every view
  face/coverage.png    how well each texel was seen (0..255)
  views/*.jpg, *_parts.png   the best frame per pose and per expression, with region masks
  voice/voice.wav      the voice track (16 kHz mono) when the source had sound

Everything is measured; nothing is generated. All of it runs on a CPU.
"""
import argparse
import datetime
import hashlib
import io
import json
import math
import os
import sys
import zipfile

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA = "nexoraguru.pratibimb.pack"
VERSION = "1.0.0"
IRIS_MM = 11.7  # adult horizontal visible iris diameter, near-constant across people (≈ 11.7 ± 0.5 mm)

ap = argparse.ArgumentParser()
ap.add_argument("capture")
ap.add_argument("models")
ap.add_argument("out")
ap.add_argument("--consent", help="JSON with the consent record (who, when, sentence) to keep with the pack")
ap.add_argument("--texture", type=int, default=1024)
a = ap.parse_args()
C = a.capture

# --- Inputs -------------------------------------------------------------------------------------------
frames = [json.loads(l) for l in open(os.path.join(C, "frames.jsonl"))]
person = [f for f in frames if f.get("person")]
if not person:
    raise SystemExit("PACK no frames of the person")
cap = json.load(open(os.path.join(C, "capture.json")))
profile = json.load(open(os.path.join(C, "profile.json"))) if os.path.exists(os.path.join(C, "profile.json")) else {}
print(f"PACK {len(person)} frames of the person, {len(cap.get('views', []))} views", flush=True)

# MediaPipe's canonical face model (Apache-2.0): 468 points, UVs, triangles.
OBJ = os.path.join(a.models, "mp", "canonical_face_model.obj")
cv_, cvt, cf = [], [], []
for line in open(OBJ):
    p = line.split()
    if not p:
        continue
    if p[0] == "v":
        cv_.append([float(x) for x in p[1:4]])
    elif p[0] == "vt":
        cvt.append([float(x) for x in p[1:3]])
    elif p[0] == "f":
        cf.append([[int(i) - 1 for i in q.split("/")[:2]] for q in p[1:4]])
CANON = np.array(cv_)
UV = np.array(cvt)
TRI = np.array([[q[0] for q in f] for f in cf])
TRI_UV = np.array([[q[1] for q in f] for f in cf])

BLEND = ["_neutral", "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "cheekPuff",
         "cheekSquintLeft", "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight",
         "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight",
         "eyeSquintLeft", "eyeSquintRight", "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawOpen", "jawRight",
         "mouthClose", "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel",
         "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight", "mouthPucker",
         "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper", "mouthSmileLeft",
         "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight", "mouthUpperUpLeft", "mouthUpperUpRight",
         "noseSneerLeft", "noseSneerRight"]


# --- 1. Frames as arrays ------------------------------------------------------------------------------
F = len(person)
nan = np.float32(np.nan)
L = np.array([f["landmarks"] for f in person], np.float32)  # (F, 478, 3) image px (+ relative depth)
Bl = np.array([[f["blend"].get(k, 0.0) for k in BLEND] for f in person], np.float32)
YPR = np.array([[f["yaw"], f["pitch"], f["roll"]] for f in person], np.float32)
body = np.full((F, 33, 3), nan, np.float32)
body3d = np.full((F, 33, 3), nan, np.float32)
hands = np.full((F, 2, 21, 3), nan, np.float32)
for i, f in enumerate(person):
    if "body" in f:
        body[i] = np.array(f["body"], np.float32)
    if "body3d" in f:
        body3d[i] = np.array(f["body3d"], np.float32)
    for h in f.get("hands", []):
        k = 0 if h["side"].lower().startswith("l") else 1
        hands[i, k] = np.array(h["points"], np.float32)
arrays = {
    "t": np.array([f["t"] for f in person], np.float32),
    "landmarks": L,
    "blendshapes": Bl,
    "blendshape_names": np.array(BLEND),
    "head_ypr_deg": YPR,
    "body2d": body,
    "body3d_m": body3d,
    "hands2d": hands,
    "face_px": np.array([f["face_px"] for f in person], np.float32),
    "sharpness": np.array([f["sharp"] for f in person], np.float32),
    "brightness": np.array([f["bright"] for f in person], np.float32),
    "identity_match": np.array([f["id"] for f in person], np.float32),
    "frame_size": np.array([f["size"] for f in person], np.int32),
}

# --- 2. One 3D face from every view, in millimetres -----------------------------------------------------
OUTER = (33, 263)
MOUTH = sorted({0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 185, 191, 267, 269,
                270, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 409, 415})


def norm(P):
    P = P - P.mean(0)
    return P / np.linalg.norm(P[OUTER[0]] - P[OUTER[1]])


def umeyama(src, dst, w):
    w = w / w.sum()
    ms, md = (w[:, None] * src).sum(0), (w[:, None] * dst).sum(0)
    A, B_ = src - ms, dst - md
    U, S, Vt = np.linalg.svd((w[:, None] * B_).T @ A)
    D = np.eye(3)
    D[2, 2] = np.sign(np.linalg.det(U @ Vt))
    R = U @ D @ Vt
    s = (S * np.diag(D)).sum() / (w[:, None] * A ** 2).sum()
    return s, R, md - s * R @ ms


# Calm, sharp frames, image y down → y up, z towards the camera.
calm = [i for i, f in enumerate(person) if f["blend"].get("jawOpen", 0) < 0.15 and f["blend"].get("mouthSmileLeft", 0) < 0.35
        and f["sharp"] > 25 and f["face_px"] > 90]
use = calm or list(range(F))
views3d = []
for i in use:
    P = L[i].astype(np.float64).copy()
    P[:, 1] *= -1
    P[:, 2] *= -1
    views3d.append(norm(P))
ref = views3d[int(np.argmin([abs(person[i]["yaw"]) for i in use]))].copy()
for _ in range(4):
    al = []
    for i, V in zip(use, views3d):
        w = np.ones(478)
        # Points on the side turned away are seen edge-on: less weight.
        side = np.sign(V[:, 0]) * np.sign(person[i]["yaw"])
        w *= np.where(side > 0, 1 - min(0.7, abs(person[i]["yaw"]) / 60), 1.0)
        s, R, t = umeyama(V, ref, w)
        al.append((s * (R @ V.T)).T + t)
    ref = norm(np.median(np.array(al), 0))
spread = np.median(np.abs(np.array(al) - ref), 0).mean(1)
# Metric scale from the irises: in each frame, iris diameter / outer-eye-corner distance.
ratios = []
for i in use:
    P = L[i]
    eye = np.linalg.norm(P[33, :2] - P[263, :2])
    for c, ring in ((468, (469, 471)), (473, (474, 476))):
        d = np.linalg.norm(P[ring[0], :2] - P[ring[1], :2])
        if eye > 0:
            ratios.append(d / eye)
iris_ratio = float(np.median(ratios)) if ratios else 0.133
# Two independent ways to reach millimetres: the iris (≈ 11.7 mm in adults) and the average adult
# distance between the pupils (≈ 63 mm). The face reader tends to draw the iris a little large, so
# the pack keeps both and uses their geometric mean; how far they disagree is the scale's uncertainty.
mm_iris = IRIS_MM / iris_ratio
ipd_units = float(np.linalg.norm(ref[468] - ref[473]))
mm_ipd = 63.0 / max(1e-6, ipd_units)
mm = math.sqrt(mm_iris * mm_ipd)  # millimetres per eye-corner unit
scale_note = {"iris_mm_per_unit": round(mm_iris, 2), "pupil_prior_mm_per_unit": round(mm_ipd, 2), "used": round(mm, 2),
              "uncertainty_pct": round(abs(mm_iris - mm_ipd) / mm * 50, 1),
              "note": "Absolute sizes are estimates (± the uncertainty); every ratio and the shape itself are exact to the photos."}
P3 = ref * mm  # (478, 3) mm, x to the person's left, y up, z forward
print(f"PACK 3D face from {len(use)} views, scale {mm:.1f} mm per outer-eye distance (iris ratio {iris_ratio:.3f})", flush=True)

# --- 3. Face measurements -------------------------------------------------------------------------------
def d(i, j):
    return float(np.linalg.norm(P3[i] - P3[j]))


def dx(i, j):
    return float(abs(P3[i, 0] - P3[j, 0]))


def dy(i, j):
    return float(abs(P3[i, 1] - P3[j, 1]))


M = {
    "interpupillary": d(468, 473),
    "outer_canthal_width": d(33, 263),
    "inner_canthal_width": d(133, 362),
    "eye_width_right": d(33, 133),
    "eye_width_left": d(263, 362),
    "eye_opening_right": d(159, 145),
    "eye_opening_left": d(386, 374),
    "iris_diameter": round(iris_ratio * mm, 2),
    "brow_length_right": d(70, 107),
    "brow_length_left": d(300, 336),
    "brow_arch_height_right": float(P3[105, 1] - (P3[70, 1] + P3[107, 1]) / 2),
    "brow_arch_height_left": float(P3[334, 1] - (P3[300, 1] + P3[336, 1]) / 2),
    "brow_to_eye_right": dy(105, 159),
    "brow_to_eye_left": dy(334, 386),
    "inter_brow_gap": d(107, 336),
    "nose_length": d(168, 2),
    "nose_bridge_length": d(168, 4),
    "nose_width_alar": d(98, 327),
    "nose_tip_protrusion": float(P3[4, 2] - (P3[98, 2] + P3[327, 2]) / 2),
    "philtrum_length": d(2, 0),
    "mouth_width": d(61, 291),
    "upper_lip_height": d(0, 13),
    "lower_lip_height": d(14, 17),
    "cupid_bow_depth": float((P3[37, 1] + P3[267, 1]) / 2 - P3[0, 1]),
    "lip_to_chin": d(17, 152),
    "face_width_bizygomatic": d(234, 454),
    "jaw_width_gonial": d(172, 397),
    "face_height_brow_to_chin": d(9, 152),
    "face_height_hairline_to_chin": d(10, 152),
    "forehead_height": d(10, 9),
    "midface_height": d(9, 2),
    "lower_face_height": d(2, 152),
    "chin_width": d(176, 400),
    "cheekbone_prominence": float(((P3[234, 2] + P3[454, 2]) / 2) - ((P3[172, 2] + P3[397, 2]) / 2)),
    "face_depth_nose_to_ear_plane": float(P3[4, 2] - (P3[234, 2] + P3[454, 2]) / 2),
    "eye_spacing_ratio": d(133, 362) / max(1e-6, (d(33, 133) + d(263, 362)) / 2),
}
M = {k: round(v, 2) for k, v in M.items()}
ratios_ = {
    "face_height_to_width": round(M["face_height_hairline_to_chin"] / M["face_width_bizygomatic"], 3),
    "jaw_to_cheek_width": round(M["jaw_width_gonial"] / M["face_width_bizygomatic"], 3),
    "forehead_to_face_height": round(M["forehead_height"] / M["face_height_hairline_to_chin"], 3),
    "thirds_upper_mid_lower": [round(M["forehead_height"], 1), round(M["midface_height"], 1), round(M["lower_face_height"], 1)],
    "mouth_to_nose_width": round(M["mouth_width"] / M["nose_width_alar"], 3),
    "lip_ratio_upper_to_lower": round(M["upper_lip_height"] / max(0.1, M["lower_lip_height"]), 3),
}
hw, jc = ratios_["face_height_to_width"], ratios_["jaw_to_cheek_width"]
shape = ("long" if hw > 1.55 else "round" if hw < 1.25 and jc > 0.85 else "square" if jc > 0.88 else
         "heart" if jc < 0.74 else "oval")
# Asymmetry: each point against the mirror of its partner (after mirroring x), in mm.
mir = P3 * np.array([-1, 1, 1])
pairs = [(33, 263), (133, 362), (159, 386), (145, 374), (70, 300), (105, 334), (61, 291), (234, 454), (172, 397), (98, 327)]
asym = {f"{i}-{j}": round(float(np.linalg.norm(P3[i] - mir[j])), 2) for i, j in pairs}

# --- 4. Face texture in the canonical UV layout, merged from every view --------------------------------
T = a.texture
acc = np.zeros((T, T, 3), np.float64)
wsum = np.zeros((T, T), np.float64)
views = cap.get("views", [])
by_name = {}
for f in person:
    by_name.setdefault(round(f["t"], 3), f)
used_views = []
for v in views:
    img = cv2.imread(os.path.join(C, "views", v["file"]))
    f = by_name.get(round(v["t"], 3))
    if img is None or f is None or "expression" in v["label"]:
        continue
    P = np.array(f["landmarks"], np.float64)[:468]
    H, W = img.shape[:2]
    # Facing per triangle from this frame's own 3D points (z towards the camera is -z in MediaPipe).
    a3, b3, c3 = P[TRI[:, 0]], P[TRI[:, 1]], P[TRI[:, 2]]
    n = np.cross(b3 - a3, c3 - a3)
    n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-9
    facing = -n[:, 2]
    if np.median(facing) < 0:
        facing = -facing
    sharp_w = min(1.0, v["sharp"] / 150)
    for k in range(len(TRI)):
        fw = facing[k]
        if fw < 0.35:
            continue
        src = P[TRI[k], :2].astype(np.float32)
        dst = (UV[TRI_UV[k]] * np.array([1, -1]) + np.array([0, 1])) * (T - 1)
        dst = dst.astype(np.float32)
        x0, y0 = np.floor(dst.min(0)).astype(int)
        x1, y1 = np.ceil(dst.max(0)).astype(int) + 1
        if x1 - x0 < 1 or y1 - y0 < 1:
            continue
        # Map texture → image: for every texel in the box, its image position.
        inv = cv2.getAffineTransform((dst - [x0, y0]).astype(np.float32), src)
        mx, my = np.meshgrid(np.arange(x1 - x0, dtype=np.float32), np.arange(y1 - y0, dtype=np.float32))
        sx = inv[0, 0] * mx + inv[0, 1] * my + inv[0, 2]
        sy = inv[1, 0] * mx + inv[1, 1] * my + inv[1, 2]
        patch = cv2.remap(img, sx.astype(np.float32), sy.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        tri_mask = np.zeros((y1 - y0, x1 - x0), np.uint8)
        cv2.fillConvexPoly(tri_mask, np.round(dst - [x0, y0]).astype(np.int32), 1)
        inside = (tri_mask > 0) & (sx >= 0) & (sy >= 0) & (sx < W) & (sy < H)
        wgt = (((fw - 0.35) / 0.65) ** 2) * sharp_w
        ys, xs = np.nonzero(inside)
        acc[y0 + ys, x0 + xs] += patch[ys, xs] * wgt
        wsum[y0 + ys, x0 + xs] += wgt
    used_views.append(v["file"])
tex = np.zeros((T, T, 3), np.uint8)
seen = wsum > 1e-6
tex[seen] = np.clip(acc[seen] / wsum[seen, None], 0, 255).astype(np.uint8)
cover = np.clip(wsum / (np.percentile(wsum[seen], 90) if seen.any() else 1) * 255, 0, 255).astype(np.uint8)
print(f"PACK face texture from {len(used_views)} views, {seen.mean() * 100:.0f}% of the layout seen", flush=True)

# --- 5. Colours -----------------------------------------------------------------------------------------
MONK = ["#f6ede4", "#f3e7db", "#f7ead0", "#eadaba", "#d7bd96", "#a07e56", "#825c43", "#604134", "#3a312a", "#292420"]
app = cap.get("appearance", {})


def lab(rgb01):
    px = np.uint8([[np.clip(np.array(rgb01) * 255, 0, 255)]])
    L_, A_, B__ = cv2.cvtColor(px, cv2.COLOR_RGB2LAB)[0, 0].astype(float)
    return [round(L_ * 100 / 255, 1), round(A_ - 128, 1), round(B__ - 128, 1)]


colours = {}
for k in ("skin", "iris", "lips", "brows", "hair", "clothes"):
    if app.get(k):
        colours[k] = {"rgb": [round(x, 3) for x in app[k]], "hex": "#" + "".join(f"{int(round(x * 255)):02x}" for x in app[k]), "lab": lab(app[k])}
if "skin" in colours:
    Ls, As, Bs = colours["skin"]["lab"]
    ita = math.degrees(math.atan2(Ls - 50, Bs if Bs else 1e-6))
    monk = [np.linalg.norm(np.array(lab([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])) - np.array([Ls, As, Bs])) for h in MONK]
    colours["skin"].update({
        "ita_deg": round(ita, 1),
        "ita_class": "very light" if ita > 55 else "light" if ita > 41 else "intermediate" if ita > 28 else "tan" if ita > 10 else "brown" if ita > -30 else "dark",
        "monk_scale": int(np.argmin(monk)) + 1,
        "undertone": "warm" if Bs > As * 1.4 else "cool" if Bs < As * 0.9 else "neutral",
    })

# --- 6. Hair, from the front view's region map ------------------------------------------------------------
hair = {"length_below_chin_face_widths": app.get("hair_below_chin_face_widths")}
front = next((v for v in views if v["label"].startswith("front")), views[0] if views else None)
if front:
    parts = cv2.imread(os.path.join(C, "views", front["file"][:-4] + "_parts.png"), cv2.IMREAD_GRAYSCALE)
    f = by_name.get(round(front["t"], 3))
    if parts is not None and f is not None:
        lm = np.array(f["landmarks"])
        fw = float(np.ptp(lm[:, 0]))
        hm = (parts // 40) == 1
        if hm.any():
            ys, xs = np.nonzero(hm)
            top = lm[10, 1]
            hair.update({
                "volume_face_areas": round(float(hm.sum()) / (fw * fw), 2),
                "height_above_forehead_face_widths": round(float(top - ys.min()) / fw, 2),
                "width_face_widths": round(float(np.ptp(xs)) / fw, 2),
                "parting_offset": round(float((xs[ys < top + 0.05 * fw].mean() - lm[168, 0]) / fw), 2) if (ys < top + 0.05 * fw).any() else None,
            })

# --- 7. Body proportions (metres, from MediaPipe's 3D body points) -----------------------------------------
def med_len(i, j):
    v = np.linalg.norm(body3d[:, i] - body3d[:, j], axis=1)
    vis = (body[:, i, 2] > 0.6) & (body[:, j, 2] > 0.6)
    v = v[vis & np.isfinite(v)]
    return round(float(np.median(v)), 3) if len(v) >= 3 else None


bodym = {
    "shoulder_width_m": med_len(11, 12), "hip_width_m": med_len(23, 24),
    "upper_arm_m": med_len(11, 13), "forearm_m": med_len(13, 15),
    "torso_m": None, "thigh_m": med_len(23, 25), "shin_m": med_len(25, 27),
}
sh = (body3d[:, 11] + body3d[:, 12]) / 2
hp = (body3d[:, 23] + body3d[:, 24]) / 2
tv = np.linalg.norm(sh - hp, axis=1)
tv = tv[np.isfinite(tv) & (body[:, 11, 2] > 0.6) & (body[:, 23, 2] > 0.6)]
bodym["torso_m"] = round(float(np.median(tv)), 3) if len(tv) >= 3 else None

# --- 8. Expressions: this person's own range of each of the 52 values ----------------------------------------
expr = {k: {"p5": round(float(np.percentile(Bl[:, i], 5)), 3), "p50": round(float(np.percentile(Bl[:, i], 50)), 3),
            "p95": round(float(np.percentile(Bl[:, i], 95)), 3), "max": round(float(Bl[:, i].max()), 3)} for i, k in enumerate(BLEND) if k != "_neutral"}

# --- 9. Identity embedding (SFace, Apache-2.0) from the views ----------------------------------------------
det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
rec = cv2.FaceRecognizerSF.create(os.path.join(a.models, "face_recognition_sface_2021dec.onnx"), "")
embs = []
for v in views:
    img = cv2.imread(os.path.join(C, "views", v["file"]))
    if img is None:
        continue
    det.setInputSize((img.shape[1], img.shape[0]))
    _, faces = det.detect(img)
    if faces is None or not len(faces):
        continue
    e = rec.feature(rec.alignCrop(img, max(faces, key=lambda r: r[2] * r[3]))).ravel()
    embs.append(e / (np.linalg.norm(e) + 1e-9))
identity = None
if embs:
    E = np.array(embs)
    c = E.mean(0)
    c /= np.linalg.norm(c)
    identity = {"model": "SFace 2021dec (OpenCV Zoo, Apache-2.0)", "dim": int(len(c)), "vector": [round(float(x), 5) for x in c],
                "views": len(embs), "self_similarity": round(float((E @ c).mean()), 3), "same_person_threshold": 0.363}

# --- 10. Voice statistics ---------------------------------------------------------------------------------------
voice = None
wav = os.path.join(C, "voice.wav")
if os.path.exists(wav) and os.path.getsize(wav) > 32000:
    try:
        import librosa
        y, sr = librosa.load(wav, sr=16000, mono=True)
        spans = profile.get("voice_spans") or []
        if spans:
            y = np.concatenate([y[int(s * sr):int(e * sr)] for s, e in spans if e > s]) if spans else y
        f0, vflag, _ = librosa.pyin(y[: sr * 120], fmin=60, fmax=500, sr=sr, frame_length=1024)
        f0 = f0[vflag & np.isfinite(f0)]
        rms = librosa.feature.rms(y=y)[0]
        onsets = librosa.onset.onset_detect(y=y, sr=sr, units="time")
        dur = len(y) / sr
        voice = {
            "speaking_seconds": round(dur, 1),
            "pitch_hz": {"p10": round(float(np.percentile(f0, 10)), 1), "median": round(float(np.median(f0)), 1), "p90": round(float(np.percentile(f0, 90)), 1)} if len(f0) else None,
            "pitch_range_semitones": round(float(12 * np.log2(np.percentile(f0, 90) / np.percentile(f0, 10))), 2) if len(f0) > 10 else None,
            "loudness_db": round(float(20 * np.log10(np.median(rms) + 1e-9)), 1),
            "onsets_per_second": round(len(onsets) / max(1e-6, dur), 2),
        }
    except Exception as e:  # voice stats are a bonus; never block the pack
        voice = {"error": str(e)[:200]}

# --- 11. Write the pack -------------------------------------------------------------------------------------------
def png(arr):
    ok, b = cv2.imencode(".png", arr)
    return b.tobytes()


def obj_text():
    lines = ["# Pratibimb face (MediaPipe topology), millimetres; x = person's left, y = up, z = forward"]
    lines += [f"v {x:.3f} {y:.3f} {z:.3f}" for x, y, z in P3[:468]]
    lines += [f"vt {u:.6f} {v:.6f}" for u, v in UV]
    lines += [f"f {t[0] + 1}/{u[0] + 1} {t[1] + 1}/{u[1] + 1} {t[2] + 1}/{u[2] + 1}" for t, u in zip(TRI, TRI_UV)]
    return "\n".join(lines) + "\n"


npz = io.BytesIO()
np.savez_compressed(npz, **arrays)
p3 = io.BytesIO()
np.save(p3, P3.astype(np.float32))
files = {
    "frames.npz": npz.getvalue(),
    "face/mesh.obj": obj_text().encode(),
    "face/points3d.npy": p3.getvalue(),
    "face/texture.png": png(tex),
    "face/coverage.png": png(cover),
}
for v in views:
    for name in (v["file"], v["file"][:-4] + "_parts.png"):
        p = os.path.join(C, "views", name)
        if os.path.exists(p):
            files[f"views/{name}"] = open(p, "rb").read()
if os.path.exists(wav):
    files["voice/voice.wav"] = open(wav, "rb").read()
# Training frames for the appearance learner: face crops, each with its offset and scale into the
# original frame (so the frame's landmarks in frames.npz apply: crop = (frame - offset) * scale).
tdir = os.path.join(C, "train")
if os.path.exists(os.path.join(tdir, "train.json")):
    files["train/train.json"] = open(os.path.join(tdir, "train.json"), "rb").read()
    for m in json.load(open(os.path.join(tdir, "train.json"))):
        files[f"train/{m['file']}"] = open(os.path.join(tdir, m["file"]), "rb").read()
        if m.get("parts") and os.path.exists(os.path.join(tdir, m["parts"])):
            files[f"train/{m['parts']}"] = open(os.path.join(tdir, m["parts"]), "rb").read()

identity_doc = {
    "face": {
        "scale_mm_per_outer_eye_unit": round(mm, 2),
        "scale": scale_note,
        "iris_to_eye_ratio": round(iris_ratio, 4),
        "points3d_spread": round(float(spread.mean()), 4),
        "measurements_mm": M,
        "ratios": ratios_,
        "shape": shape,
        "asymmetry_mm": asym,
    },
    "colours": colours,
    "hair": hair,
    "body": bodym,
    "expressions": expr,
    "motion": {k: v for k, v in profile.items() if k != "voice_spans"},
    "voice": voice,
    "identity": identity,
}
quality = {
    "frames": F,
    "views": len(views),
    "texture_views": len(used_views),
    "texture_seen_share": round(float(seen.mean()), 3),
    "turn_range_deg": cap.get("turn_range_deg"),
    "missing_views": cap.get("missing_views", []),
    "advice": cap.get("advice", []),
    "median_face_px": round(float(np.median(arrays["face_px"])), 1),
    "median_sharpness": round(float(np.median(arrays["sharpness"])), 1),
}
consent = json.load(open(a.consent)) if a.consent else None
manifest = {
    "schema": SCHEMA,
    "version": VERSION,
    "created": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
    "source": {"kind": cap.get("kind"), "name": cap.get("source")},
    "consent": consent,
    "coordinates": {
        "image": "pixels, origin top-left, x right, y down; landmark z is MediaPipe's relative depth (same scale as x)",
        "face3d": "millimetres, origin at the face centre; x = the person's left, y = up, z = towards the viewer",
        "body3d": "metres, MediaPipe world coordinates (origin between the hips)",
        "uv": "MediaPipe canonical face model UVs (v up); texture row 0 = v 1",
    },
    "provenance": {
        "tools": {"mediapipe": __import__("mediapipe").__version__, "opencv": cv2.__version__, "numpy": np.__version__},
        "models": {
            "face_landmarker": "MediaPipe Face Landmarker (Apache-2.0)",
            "pose_landmarker": "MediaPipe Pose Landmarker full (Apache-2.0)",
            "hand_landmarker": "MediaPipe Hand Landmarker (Apache-2.0)",
            "segmenter": "MediaPipe selfie multiclass 256 (Apache-2.0)",
            "face_detector": "YuNet 2023mar (MIT)",
            "face_recognizer": "SFace 2021dec (Apache-2.0)",
            "canonical_face": "MediaPipe canonical_face_model.obj (Apache-2.0)",
            "skin_scale": "Monk Skin Tone scale (Google, CC-BY 4.0)",
        },
        "generated_content": False,
    },
    "quality": quality,
    "files": {},
}
out_files = {"identity.json": json.dumps(identity_doc, indent=1).encode(), **files}
manifest["files"] = {k: {"bytes": len(v), "sha256": hashlib.sha256(v).hexdigest()} for k, v in sorted(out_files.items())}
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
manifest_bytes = json.dumps(manifest, indent=1).encode()
# Signed by the build machine (HMAC-SHA256 of manifest.json with PRATIBIMB_PACK_KEY): the site can tell
# a pack it made from one that was edited. The manifest lists every file's SHA-256, so the signature
# covers every file.
key = os.environ.get("PRATIBIMB_PACK_KEY", "")
signature = None
if key:
    import hmac
    signature = {"alg": "HMAC-SHA256", "of": "manifest.json", "value": hmac.new(key.encode(), manifest_bytes, hashlib.sha256).hexdigest()}
with zipfile.ZipFile(a.out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("manifest.json", manifest_bytes)
    if signature:
        z.writestr("signature.json", json.dumps(signature))
    for k, v in sorted(out_files.items()):
        z.writestr(k, v, compress_type=zipfile.ZIP_STORED if k.endswith((".png", ".jpg", ".npz")) else zipfile.ZIP_DEFLATED)
print(f"PACK wrote {a.out}: {len(out_files) + 1} files, {os.path.getsize(a.out) / 1e6:.1f} MB; face shape {shape}, "
      f"IPD {M['interpupillary']} mm, skin Monk {colours.get('skin', {}).get('monk_scale')}")
