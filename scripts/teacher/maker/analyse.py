"""Stage 1 of the Teacher Maker: look at every photo and decide which ones can be used, and how.

  python3 scripts/teacher/maker/analyse.py <photos dir> <models dir> <out analysis.json>

For each photo (any person, any gender, age or skin tone) it measures, with MediaPipe (Apache-2.0):
- the face: 478 points, head turn (yaw, pitch, roll), smile, open mouth, closed eyes, size in pixels;
- quality: sharpness (variance of the Laplacian on the face), brightness and contrast, and whether
  something covers the eyes or mouth (sunglasses, stickers, hands: the segmenter's "accessories"
  class, or eyes it cannot see);
- colours: skin tone (well-lit skin), eye colour (iris ring), brow, lip and hair colour;
- hair: how far below the chin it falls (short / medium / long), and its volume;
- the body (when the photo shows it): 33 pose points, for shoulder, hip and limb proportions.

Each photo gets a quality score and a role: "shape" (good for the face shape), "skin" (good for
painting skin and features: near-frontal, neutral, sharp, even light), or "skip" with plain reasons.
Nothing is uploaded anywhere; photos stay on the machine that runs this.
"""
import glob
import json
import math
import os
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision
from PIL import Image, ImageOps

photos_dir, models, out_path = sys.argv[1:4]
face_lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(models, "face_landmarker.task")), num_faces=4,
    output_face_blendshapes=True, output_facial_transformation_matrixes=True))
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=os.path.join(models, "selfie_multiclass.tflite")), output_confidence_masks=True))
pose_path = os.path.join(models, "pose_landmarker_full.task")
pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=pose_path))) if os.path.exists(pose_path) else None

IRIS_R, IRIS_L = list(range(468, 473)), list(range(473, 478))
LIPS = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
BROWS = [70, 63, 105, 66, 107, 46, 53, 52, 65, 55, 300, 293, 334, 296, 336, 276, 283, 282, 295, 285]
EYES = [33, 133, 159, 145, 263, 362, 386, 374]


def load(path):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    if max(im.size) > 2000:
        im.thumbnail((2000, 2000))
    return np.asarray(im)


def poly_mask(shape, pts):
    m = np.zeros(shape[:2], np.uint8)
    cv2.fillPoly(m, [np.round(pts).astype(np.int32)], 1)
    return m.astype(bool)


def median_colour(img, mask):
    return (np.median(img[mask], 0) / 255).round(3).tolist() if mask.sum() > 20 else None


results = {}
files = sorted(f for f in glob.glob(os.path.join(photos_dir, "*")) if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")))
for path in files:
    name = os.path.basename(path)
    rec = {"file": name, "reasons": []}
    try:
        img = load(path)
    except Exception as e:
        results[name] = {**rec, "role": "skip", "reasons": [f"cannot open: {e}"]}
        continue
    H, W = img.shape[:2]
    rec["size"] = [W, H]
    r = face_lm.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img)))
    if not r.face_landmarks:
        results[name] = {**rec, "role": "skip", "reasons": ["no face found"]}
        continue
    areas = [np.ptp([p.x for p in l]) * np.ptp([p.y for p in l]) for l in r.face_landmarks]
    k = int(np.argmax(areas))
    if len(areas) > 1 and sorted(areas)[-2] > 0.5 * areas[k]:
        rec["reasons"].append("more than one face of similar size")
    lm = np.array([[p.x * W, p.y * H, p.z * W] for p in r.face_landmarks[k]])
    M = np.array(r.facial_transformation_matrixes[k])
    R = M[:3, :3] / np.linalg.norm(M[:3, 0])
    rec["yaw"] = round(math.degrees(math.atan2(-R[2, 0], math.hypot(R[2, 1], R[2, 2]))), 1)
    rec["pitch"] = round(math.degrees(math.atan2(R[2, 1], R[2, 2])), 1)
    rec["roll"] = round(math.degrees(math.atan2(R[1, 0], R[0, 0])), 1)
    bs = {b.category_name: b.score for b in r.face_blendshapes[k]}
    rec["smile"] = round((bs["mouthSmileLeft"] + bs["mouthSmileRight"]) / 2, 2)
    rec["jaw"] = round(bs["jawOpen"], 2)
    rec["pucker"] = round(bs.get("mouthPucker", 0), 2)
    rec["blink"] = round((bs["eyeBlinkLeft"] + bs["eyeBlinkRight"]) / 2, 2)
    face_px = float(np.ptp(lm[:, 0]))
    rec["face_px"] = round(face_px)
    rec["landmarks"] = lm.round(2).tolist()

    # Quality.
    x0, y0 = np.maximum(lm[:, :2].min(0).astype(int), 0)
    x1, y1 = np.minimum(lm[:, :2].max(0).astype(int), [W - 1, H - 1])
    crop = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_RGB2GRAY)
    if crop.size:
        crop = cv2.resize(crop, (256, int(256 * crop.shape[0] / max(1, crop.shape[1]))))
        rec["sharpness"] = round(float(cv2.Laplacian(crop, cv2.CV_64F).var()), 1)
        rec["brightness"] = round(float(crop.mean()), 1)
        rec["contrast"] = round(float(crop.std()), 1)
    masks = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img))).confidence_masks
    m = [mk.numpy_view().reshape(H, W) for mk in masks]  # 0 bg, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 accessories
    eye_box = poly_mask(img.shape, lm[[70, 300, 346, 117], :2])
    mouth = poly_mask(img.shape, lm[LIPS, :2])
    rec["covered_eyes"] = round(float(m[5][eye_box].mean()), 2) if eye_box.any() else 0
    rec["covered_mouth"] = round(float((m[5][mouth] + m[1][mouth]).mean()), 2) if mouth.any() else 0
    face_region = poly_mask(img.shape, lm[[10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109], :2])
    rec["hair_over_face"] = round(float(m[1][face_region].mean()), 2) if face_region.any() else 0

    # Colours.
    skin = (m[3] > 0.8) & face_region & ~mouth & ~eye_box
    if skin.sum() > 50:
        px = img[skin].astype(float)
        lum = px @ [0.299, 0.587, 0.114]
        lo, hi = np.percentile(lum, [60, 90])
        rec["skin"] = (np.median(px[(lum >= lo) & (lum <= hi)], 0) / 255).round(3).tolist()
    iris = np.zeros(img.shape[:2], bool)
    for ring in (IRIS_R, IRIS_L):
        c = lm[ring[0], :2]
        rad = np.linalg.norm(lm[ring[1:], :2] - c, axis=1).mean()
        yy, xx = np.ogrid[:H, :W]
        d = np.sqrt((xx - c[0]) ** 2 + (yy - c[1]) ** 2)
        iris |= (d < rad * 0.9) & (d > rad * 0.35)
    rec["iris"] = median_colour(img, iris)
    rec["lips"] = median_colour(img, mouth & (m[3] > 0.3))
    rec["brows"] = median_colour(img, poly_mask(img.shape, lm[BROWS[:10], :2]) | poly_mask(img.shape, lm[BROWS[10:], :2]))
    hair = m[1] > 0.6
    rec["hair_colour"] = median_colour(img, hair)
    chin_y = lm[152, 1]
    if hair.any():
        ys = np.nonzero(hair)[0]
        rec["hair_below_chin"] = round(float((np.percentile(ys, 98) - chin_y) / face_px), 2)  # in face widths
        rec["hair_top"] = round(float((lm[10, 1] - ys.min()) / face_px), 2)
        rec["hair_volume"] = round(float(hair.sum() / (face_px ** 2)), 2)
    # Body (only when shoulders and hips are visible).
    if pose:
        pr = pose.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img)))
        if pr.pose_landmarks:
            p = np.array([[q.x * W, q.y * H, q.visibility] for q in pr.pose_landmarks[0]])
            vis = p[:, 2] > 0.6
            body = {}
            if vis[[11, 12]].all():
                body["shoulder_w"] = round(float(np.linalg.norm(p[11, :2] - p[12, :2]) / face_px), 3)
            if vis[[23, 24]].all():
                body["hip_w"] = round(float(np.linalg.norm(p[23, :2] - p[24, :2]) / face_px), 3)
            if vis[[11, 12, 23, 24]].all():
                body["torso"] = round(float(np.linalg.norm((p[11, :2] + p[12, :2]) / 2 - (p[23, :2] + p[24, :2]) / 2) / face_px), 3)
            if vis[[23, 25, 27]].all():
                body["leg"] = round(float((np.linalg.norm(p[23, :2] - p[25, :2]) + np.linalg.norm(p[25, :2] - p[27, :2])) / face_px), 3)
            if vis[[11, 13, 15]].all():
                body["arm"] = round(float((np.linalg.norm(p[11, :2] - p[13, :2]) + np.linalg.norm(p[13, :2] - p[15, :2])) / face_px), 3)
            if body:
                # Body width at the waist from the segmentation (body skin + clothes), in face widths.
                if vis[[23, 24, 11, 12]].all():
                    wy = int(((p[11, 1] + p[12, 1]) / 2 * 0.4 + (p[23, 1] + p[24, 1]) / 2 * 0.6))
                    row = ((m[2] + m[4]) > 0.5)[min(max(wy, 0), H - 1)]
                    if row.any():
                        xs = np.nonzero(row)[0]
                        body["waist_w"] = round(float((xs.max() - xs.min()) / face_px), 3)
                rec["body"] = body

    # Score and role.
    reasons = rec["reasons"]
    if face_px < 120:
        reasons.append(f"face too small ({face_px:.0f}px; 200+ is good)")
    if rec.get("sharpness", 0) < 40:
        reasons.append("blurry")
    if rec.get("brightness", 128) < 50:
        reasons.append("too dark")
    if rec["covered_eyes"] > 0.25:
        reasons.append("eyes covered (sunglasses, sticker or hand)")
    if rec["covered_mouth"] > 0.3:
        reasons.append("mouth covered")
    if rec["blink"] > 0.5:
        reasons.append("eyes closed")
    turn = max(abs(rec["yaw"]), abs(rec["pitch"]) * 0.8)
    usable = face_px >= 120 and rec.get("sharpness", 0) >= 25 and rec["covered_eyes"] <= 0.4
    neutral = rec["smile"] < 0.25 and rec["jaw"] < 0.15 and rec["pucker"] < 0.4
    frontal = abs(rec["yaw"]) < 20 and abs(rec["pitch"]) < 20
    q = (min(1, face_px / 300) * 0.3 + min(1, rec.get("sharpness", 0) / 200) * 0.2 + (1 - min(1, turn / 45)) * 0.25
         + (0.15 if neutral else 0) + (0.1 if rec["hair_over_face"] < 0.1 else 0) - rec["covered_eyes"] * 0.5)
    rec["quality"] = round(float(q), 3)
    rec["role"] = "skip" if not usable else ("skin" if frontal and neutral and not reasons else "shape")
    rec["mouth_ok"] = neutral
    results[name] = rec
    print(f"ANALYSE {name[:28]:28s} {rec['role']:5s} q={rec['quality']:.2f} yaw={rec['yaw']:6.1f} smile={rec['smile']:.2f} {'; '.join(reasons)}")

usable = [r for r in results.values() if r["role"] != "skip"]
summary = {
    "photos": len(results), "usable": len(usable), "skin_photos": sum(r["role"] == "skin" for r in usable),
    "has_left_turn": any(r.get("yaw", 0) > 12 for r in usable), "has_right_turn": any(r.get("yaw", 0) < -12 for r in usable),
    "has_body": any("body" in r for r in usable),
}
advice = []
if summary["usable"] < 3:
    advice.append("Add at least 3 clear photos of the face (front, turned left, turned right).")
if summary["skin_photos"] == 0:
    advice.append("Add one straight-on photo with a relaxed face, no filter, in even daylight.")
if not (summary["has_left_turn"] and summary["has_right_turn"]):
    advice.append("Add photos with the head turned a little to each side.")
if not summary["has_body"]:
    advice.append("Add one full-length photo standing straight, for the body shape.")
summary["advice"] = advice
json.dump({"summary": summary, "photos": results}, open(out_path, "w"))
print("ANALYSE summary", json.dumps(summary))
