"""Build a person's model from their identity pack: rig + appearance + gates + likeness report.

  python3 -m engine.build <pack.pbpack> <out dir> --models <models dir> [--size 128] [--iters 400]
      [--per-tri 4] [--datasets own] [--seconds 240]

Steps (the target on one GPU is 3–4 minutes in total; on a CPU it runs at small sizes to prove the code):
1. Rig: the person's own 3D face, shell and mouth cavity, moved by their own expression model (seconds).
2. Appearance: colour points on the rig, fitted to the training frames. Each frame is drawn from its own 52
   expression values through the rig (never from the frame's own face points); only the frame's head
   position, size and turn are taken from it.
3. Gates, on frames from the END of the capture that were never used (a time split, not random frames):
   - likeness: face recognition (SFace) of the model alone and placed in the frame, against the real frames;
   - face shape: the rig's face against the real face points;
   - lips: how well the model's mouth opening follows the real one (correlation);
   - colour: photo error inside the face.
   On a failed gate the build keeps polishing (if time allows) and says which gate failed.
4. Saves <out>/model.npz (rig + appearance + provenance), <out>/report.json and <out>/check.jpg.

Provenance: --datasets lists what the shared model and this build were trained on. Anything other than "own"
or a commercial-licence dataset marks the model research-only; the site refuses to publish such a model.
"""
import argparse
import io
import json
import os
import time
import zipfile

import cv2
import numpy as np
import torch

from .rig import INNER_LIPS, OVAL, STABLE, Rig, procrustes
from .splats import Splats

COMMERCIAL_OK = {"own"}  # grows as datasets are checked; see docs/pratibimb/ENGINE.md

ap = argparse.ArgumentParser()
ap.add_argument("pack")
ap.add_argument("out")
ap.add_argument("--models", required=True)
ap.add_argument("--size", type=int, default=128)
ap.add_argument("--iters", type=int, default=400)
ap.add_argument("--per-tri", type=int, default=4)
ap.add_argument("--holdout", type=float, default=0.15)
ap.add_argument("--seconds", type=float, default=240, help="time budget for fitting (the owner's 3–4 minutes)")
ap.add_argument("--datasets", default="own", help="comma list of datasets behind this model (provenance)")
ap.add_argument("--likeness-bar", type=float, default=95)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
T0 = time.time()
dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.manual_seed(7)
torch.set_num_threads(max(1, os.cpu_count() or 1))
log = lambda m: print(f"BUILD {time.time() - T0:6.1f}s {m}", flush=True)  # noqa: E731

# --- 1. Pack and rig ---------------------------------------------------------------------------------------
z = zipfile.ZipFile(a.pack)
try:
    mm_per_unit = float(json.loads(z.read("identity.json"))["face"]["scale_mm_per_outer_eye_unit"])
except Exception:
    mm_per_unit = 90.0
fr = np.load(io.BytesIO(z.read("frames.npz")))
names = [str(n) for n in fr["blendshape_names"]]
face_tri = [[int(q.split("/")[0]) - 1 for q in l.split()[1:4]] for l in z.read("face/mesh.obj").decode().splitlines() if l.startswith("f ")]
meta = json.loads(z.read("train/train.json"))
t_all = fr["t"].astype(float)
t_index = {round(float(t), 3): i for i, t in enumerate(t_all)}
frames = []
for m in meta:
    i = t_index.get(round(float(m["t"]), 3))
    if i is None:
        continue
    img = cv2.imdecode(np.frombuffer(z.read(f"train/{m['file']}"), np.uint8), cv2.IMREAD_COLOR)
    lm = fr["landmarks"][i][:468].astype(np.float64)
    xy = np.c_[(lm[:, :2] - np.array(m["offset"])) * m["scale"], lm[:, 2] * m["scale"]]
    parts = None
    if m.get("parts") and f"train/{m['parts']}" in z.namelist():
        parts = cv2.imdecode(np.frombuffer(z.read(f"train/{m['parts']}"), np.uint8), cv2.IMREAD_GRAYSCALE)
    frames.append({"i": i, "t": float(t_all[i]), "img": img, "lm": xy, "parts": parts, "body": m.get("body")})
frames.sort(key=lambda f: f["t"])
if len(frames) < 10:
    raise SystemExit(f"BUILD only {len(frames)} training frames in the pack; at least 10 are needed")
n_hold = max(3, int(round(len(frames) * a.holdout)))
train, hold = frames[:-n_hold], frames[-n_hold:]
cut_t = hold[0]["t"]
rig_ids = [i for i in range(len(t_all)) if t_all[i] < cut_t]
body_all = [[list(map(float, q)) for q in b] for b in fr["body2d"]] if "body2d" in fr.files else None
rig = Rig.build(fr["landmarks"][rig_ids], fr["blendshapes"][rig_ids], names, face_tri,
                body=[body_all[i] for i in rig_ids] if body_all else None)
TRI = torch.tensor(rig.tri, device=dev)
log(f"rig from {len(rig_ids)} frames, expression fit error {rig.fit_error:.4f} eye-distances; "
    f"{len(train)} training frames, {len(hold)} held out (the end of the capture)")


def prep(f, size):
    """The frame scaled to `size`, the rig placed on it (rigid pose from the frame), and the region mask."""
    H, W = f["img"].shape[:2]
    s = size / max(H, W)
    w, h = max(8, int(round(W * s))), max(8, int(round(H * s)))
    img = cv2.resize(f["img"], (w, h), interpolation=cv2.INTER_AREA)
    lm = f["lm"] * s
    blend = fr["blendshapes"][f["i"]]
    F = rig.face(blend)
    sc, R, t = procrustes(F[STABLE], lm[STABLE])
    body_pose = (sc, R, t)
    b = f.get("body")
    if b and b[11][2] > 0.5 and b[12][2] > 0.5:
        # The torso from the frame's own shoulders (image plane), depth from the head.
        src = rig.shoulders[:, :2]
        dst = np.array([[b[12][0] * s, b[12][1] * s], [b[11][0] * s, b[11][1] * s]])
        body_pose = sim2(src, dst, t[2], sc)
    V = rig.pose(blend, (sc, R, t), body_pose)
    if f.get("parts") is not None:
        mask = (cv2.resize(f["parts"], (w, h), interpolation=cv2.INTER_NEAREST) > 0).astype(np.uint8)  # the person only
    else:
        mask = np.zeros((h, w), np.uint8)
        cv2.fillConvexPoly(mask, cv2.convexHull(np.round(V[:, :2]).astype(np.int32)), 1)
    face_mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(face_mask, [np.round(lm[OVAL, :2]).astype(np.int32)], 1)
    return {"img": torch.tensor(cv2.cvtColor(img, cv2.COLOR_BGR2RGB) / 255.0, dtype=torch.float32, device=dev),
            "v": torch.tensor(V, dtype=torch.float32, device=dev), "mask": torch.tensor(mask, dtype=torch.float32, device=dev),
            "face": torch.tensor(face_mask, dtype=torch.float32, device=dev), "hw": (h, w), "raw": img, "lm": lm, "F": F,
            "pose": (sc, R, t), "blend": blend}


def sim2(src, dst, z, scale_hint):
    """Similarity in the image plane from two points (the shoulders), as (scale, R, t) acting on 3D points."""
    a, b = src[1] - src[0], dst[1] - dst[0]
    sc = float(np.linalg.norm(b) / (np.linalg.norm(a) + 1e-9))
    if not 0.5 * scale_hint < sc < 2.0 * scale_hint:
        sc = scale_hint  # a bad shoulder reading: keep the head's scale
    ang = np.arctan2(b[1], b[0]) - np.arctan2(a[1], a[0])
    R = np.array([[np.cos(ang), -np.sin(ang), 0], [np.sin(ang), np.cos(ang), 0], [0, 0, 1.0]])
    c_src, c_dst = src.mean(0), dst.mean(0)
    t = np.array([c_dst[0], c_dst[1], z]) - sc * (np.array([c_src[0], c_src[1], 0.0]) @ R.T)
    return sc, R, t


# --- 2. Appearance ------------------------------------------------------------------------------------------
data = [prep(f, a.size) for f in train]
sp = Splats(len(rig.tri), a.per_tri, device=dev)
sp.init_colours(data[0]["v"], TRI, data[0]["img"])
# Each frame's light (order-1 spherical harmonics), so the points learn the person's own colours (albedo),
# free of the room's light; the twin is then lit by our studio light.
sh0 = torch.zeros(len(data), 4, 3, device=dev)
sh0[:, 0, :] = 1.0
shs = sh0.clone().requires_grad_(True)
opt = torch.optim.Adam([
    {"params": [sp.rgb, sp.op], "lr": 0.03},
    {"params": [sp.bary, sp.theta, sp.ls], "lr": 0.01},
    {"params": [sp.off], "lr": 0.003},
    {"params": [shs], "lr": 0.01},
])
fit_budget = a.seconds - (time.time() - T0) - 25  # keep time for the gates
it = 0
while it < a.iters and (time.time() - T0) < a.seconds - 25:
    k = it % len(data)
    d = data[k]
    pred, acc = sp.render(d["v"], TRI, d["hw"], sh=shs[k])
    m = d["mask"][..., None]
    fw = 1 + 2 * d["face"][..., None]  # the face counts three times
    l1 = ((pred - d["img"]).abs() * m * fw).sum() / ((m * fw).sum() * 3 + 1)
    la = ((acc - d["mask"]) ** 2).mean()
    # light stays mostly ambient (otherwise colour could leak into the light), albedo stays near the mean skin
    reg = (sp.ls.clamp(min=0) ** 2).mean() * 0.01 + (sp.off ** 2).mean() * 0.01 + (shs[:, 1:] ** 2).mean() * 0.02 + ((shs[:, 0] - 1) ** 2).mean() * 0.01
    loss = l1 + 0.2 * la + reg
    opt.zero_grad()
    loss.backward()
    opt.step()
    if it % 50 == 0:
        log(f"fit step {it}: photo error {l1.item():.4f}")
    it += 1
log(f"fitted in {it} steps")

# --- 2b. What each point is: face skin, body skin, hair, clothes or background (majority over the frames) ---
labels = np.zeros((sp.rgb.shape[0], 6))
with torch.no_grad():
    for f, d in zip(train, data):
        if f.get("parts") is None:
            continue
        mu = sp.place(d["v"], TRI)[0].cpu().numpy()
        h, w = d["hw"]
        pm = cv2.resize(f["parts"], (w, h), interpolation=cv2.INTER_NEAREST)
        xi = np.clip(mu[:, 0].round().astype(int), 0, w - 1)
        yi = np.clip(mu[:, 1].round().astype(int), 0, h - 1)
        labels[np.arange(len(mu)), np.clip(pm[yi, xi], 0, 5)] += 1
point_label = labels.argmax(1) if labels.sum() else np.full(sp.rgb.shape[0], 3)
LABEL_NAMES = ["background", "hair", "body skin", "face skin", "clothes", "other"]
log("points: " + ", ".join(f"{LABEL_NAMES[k]} {int((point_label == k).sum())}" for k in range(6)))

# --- 3. Gates on held-out frames ------------------------------------------------------------------------------
det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.5)
rec = cv2.FaceRecognizerSF.create(os.path.join(a.models, "face_recognition_sface_2021dec.onnx"), "")


def emb(img):
    big = cv2.resize(img, (img.shape[1] * 3, img.shape[0] * 3), interpolation=cv2.INTER_CUBIC)
    det.setInputSize((big.shape[1], big.shape[0]))
    _, f = det.detect(big)
    if f is None or not len(f):
        return None
    e = rec.feature(rec.alignCrop(big, max(f, key=lambda r: r[2] * r[3]))).ravel()
    return e / (np.linalg.norm(e) + 1e-9)


def mouth_open(P):
    return float(np.linalg.norm(P[13, :2] - P[14, :2]) / (np.linalg.norm(P[33, :2] - P[263, :2]) + 1e-9))


hd = [prep(f, a.size) for f in hold]
real_e, alone_e, inframe_e, shape_err, mo_real, mo_model, photo_err, sheet = [], [], [], [], [], [], [], []
with torch.no_grad():
    sh_mean = shs.mean(0)
    for d in hd:
        pred, acc = sp.render(d["v"], TRI, d["hw"], sh=sh_mean)
        pred = pred.clamp(0, 1)
        fm = d["face"][..., None]
        photo_err.append(float(((pred - d["img"]).abs() * fm).sum() / (fm.sum() * 3 + 1)))
        comp = (d["img"] * (1 - acc[..., None]) + pred).cpu().numpy()
        alone = (pred + 0.5 * (1 - acc[..., None])).cpu().numpy()  # the person alone, on grey
        comp_bgr = (comp[..., ::-1] * 255).astype(np.uint8)
        alone_bgr = (alone[..., ::-1] * 255).astype(np.uint8)
        er = emb(d["raw"])
        if er is not None:
            real_e.append(er)
            alone_e.append(emb(alone_bgr))
            inframe_e.append(emb(comp_bgr))
        P = rig.place(d["F"], *d["pose"])
        shape_err.append(float(np.linalg.norm((P - d["lm"])[:, :2], axis=1).mean() / np.linalg.norm(d["lm"][33, :2] - d["lm"][263, :2])))
        mo_real.append(mouth_open(d["lm"]))
        mo_model.append(mouth_open(P))
        if len(sheet) < 6:
            sheet.append(np.hstack([d["raw"], comp_bgr, alone_bgr]))


def vs(es, R):
    vals = [float(e @ R[j]) for i, e in enumerate(es) if e is not None for j in range(len(R)) if j != i]
    return float(np.mean(vals)) if vals else None


rep = {"engine": "pratibimb-engine 0.1", "device": str(dev), "size": a.size, "steps": it, "points": int(sp.rgb.shape[0]),
       "train_frames": len(train), "holdout_frames": len(hold), "rig_fit_error": round(rig.fit_error, 4)}
gates = {}
if len(real_e) >= 2:
    R = np.array(real_e)
    base = float(np.mean([R[i] @ R[j] for i in range(len(R)) for j in range(len(R)) if i != j]))
    al, inf = vs(alone_e, R), vs(inframe_e, R)
    rep["likeness"] = {"real_vs_real": round(base, 3), "model_alone": round(al, 3) if al is not None else None,
                       "model_in_frame": round(inf, 3) if inf is not None else None,
                       "alone_pct": round(100 * al / base) if al is not None else None,
                       "in_frame_pct": round(100 * inf / base) if inf is not None else None}
    gates["likeness"] = rep["likeness"]["alone_pct"] is not None and rep["likeness"]["alone_pct"] >= a.likeness_bar
rep["face_shape_error"] = round(float(np.mean(shape_err)), 4)
gates["face_shape"] = rep["face_shape_error"] <= 0.03
lip = float(np.corrcoef(mo_real, mo_model)[0, 1]) if np.std(mo_real) > 1e-6 and np.std(mo_model) > 1e-6 else None
rep["lip_follow"] = round(lip, 3) if lip is not None else None
gates["lips"] = lip is not None and lip >= 0.8
rep["photo_error"] = round(float(np.mean(photo_err)), 4)
rep["gates"] = gates
rep["passed"] = all(gates.values())
ds = [x.strip() for x in a.datasets.split(",") if x.strip()]
rep["provenance"] = {"datasets": ds, "research_only": any(x not in COMMERCIAL_OK for x in ds)}
rep["seconds"] = round(time.time() - T0, 1)

np.savez_compressed(os.path.join(a.out, "model.npz"), **rig.to_npz(),
                    **{f"sp_{k}": v.detach().cpu().numpy() for k, v in sp.state_dict().items()},
                    per_tri=a.per_tri, point_label=point_label, mm_per_unit=mm_per_unit, report=json.dumps(rep))
json.dump(rep, open(os.path.join(a.out, "report.json"), "w"), indent=1)
if sheet:
    w = max(s.shape[1] for s in sheet)
    cv2.imwrite(os.path.join(a.out, "check.jpg"), np.vstack([np.pad(s, ((0, 0), (0, w - s.shape[1]), (0, 0))) for s in sheet]))
log("done " + json.dumps(rep))
