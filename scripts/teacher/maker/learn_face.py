"""Pratibimb stage 2 (first part): learn the person's face appearance from their identity pack.

  python3 scripts/teacher/maker/learn_face.py <pack.pbpack> <out dir> [--models <dir>] [--size 64]
      [--per-tri 4] [--iters 600] [--holdout 0.15]

Small soft colour patches (3D Gaussians) are attached to the triangles of the person's own face mesh
(MediaPipe topology, 898 triangles). Each frame of the pack has its own face points, so the patches move
with that frame's expression and head turn; training makes the patches reproduce every training frame.
Because they are bound to the mesh, the learned face can later be driven by the 52 expression values
(lip sync, emotions) like any rig.

Each frame also gets a small colour correction (gain and offset), which absorbs the room's light and the
camera's white balance, so the learned colours are the person's own and stay consistent.

Checked on frames it never trained on (--holdout): the learned face is drawn from those frames' own face
points and compared with the real frames (photo error, and face recognition with SFace: the learned face
put into the frame, and the learned face alone).

The renderer is written in plain PyTorch, so it runs on any computer's CPU (small sizes) — and on a
GPU, the same code runs at full size. Writes <out>/face_splats.pt, <out>/report.json and preview images.
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
import torch

ap = argparse.ArgumentParser()
ap.add_argument("pack")
ap.add_argument("out")
ap.add_argument("--models", default=os.environ.get("TEACHER_MODELS", ""))
ap.add_argument("--size", type=int, default=64, help="training image size (longest side)")
ap.add_argument("--eval-size", type=int, default=128)
ap.add_argument("--per-tri", type=int, default=4)
ap.add_argument("--iters", type=int, default=600)
ap.add_argument("--holdout", type=float, default=0.15)
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
torch.manual_seed(a.seed)
np.random.seed(a.seed)
dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.set_num_threads(max(1, os.cpu_count() or 1))

OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150,
        136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]

# --- The pack ------------------------------------------------------------------------------------------
z = zipfile.ZipFile(a.pack)
fr = np.load(io.BytesIO(z.read("frames.npz")))
tri = []
for line in z.read("face/mesh.obj").decode().splitlines():
    if line.startswith("f "):
        tri.append([int(q.split("/")[0]) - 1 for q in line.split()[1:4]])
TRI = torch.tensor(tri, dtype=torch.long, device=dev)
meta = json.loads(z.read("train/train.json"))
t_index = {round(float(t), 3): i for i, t in enumerate(fr["t"])}
frames = []
for m in meta:
    i = t_index.get(round(float(m["t"]), 3))
    if i is None:
        continue
    img = cv2.imdecode(np.frombuffer(z.read(f"train/{m['file']}"), np.uint8), cv2.IMREAD_COLOR)
    lm = fr["landmarks"][i][:468].astype(np.float64)
    xy = (lm[:, :2] - np.array(m["offset"])) * m["scale"]
    zz = lm[:, 2] * m["scale"]
    frames.append({"img": img, "xy": xy, "z": zz, "yaw": m["yaw"], "file": m["file"]})
if len(frames) < 6:
    raise SystemExit(f"LEARN only {len(frames)} training frames in the pack; at least 6 are needed")
order = np.random.permutation(len(frames))
n_hold = max(2, int(round(len(frames) * a.holdout)))
hold = sorted(order[:n_hold].tolist())
train = sorted(order[n_hold:].tolist())
print(f"LEARN {len(train)} training frames, {len(hold)} held out, on {dev}", flush=True)


def prep(f, size):
    """Image and points at a given size (longest side), plus the face mask."""
    H, W = f["img"].shape[:2]
    s = size / max(H, W)
    w, h = max(8, int(round(W * s))), max(8, int(round(H * s)))
    img = cv2.resize(f["img"], (w, h), interpolation=cv2.INTER_AREA)
    xy = f["xy"] * s
    mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(mask, [np.round(xy[OVAL]).astype(np.int32)], 1)
    return {
        "img": torch.tensor(cv2.cvtColor(img, cv2.COLOR_BGR2RGB) / 255.0, dtype=torch.float32, device=dev),
        "v": torch.tensor(np.c_[xy, f["z"] * s], dtype=torch.float32, device=dev),
        "mask": torch.tensor(mask, dtype=torch.float32, device=dev),
        "hw": (h, w),
        "raw": img,
    }


# --- The patches ----------------------------------------------------------------------------------------
T = TRI.shape[0]
K = a.per_tri
N = T * K
tri_of = torch.arange(T, device=dev).repeat_interleave(K)
P = {
    "bary": torch.randn(N, 3, device=dev) * 0.5,          # softmax → where on the triangle
    "off": torch.zeros(N, 1, device=dev),                  # out of the surface, in triangle sizes
    "theta": torch.rand(N, 1, device=dev) * math.pi,       # in-plane turn
    "ls": torch.full((N, 2), math.log(0.45), device=dev),  # in-plane sizes, in triangle sizes
    "rgb": torch.zeros(N, 3, device=dev),                  # sigmoid → colour
    "op": torch.full((N, 1), 2.0, device=dev),             # sigmoid → opacity
}
# Start every patch with the colour under it in the first training frame (much faster to learn).
f0 = prep(frames[train[0]], a.size)
with torch.no_grad():
    v = f0["v"]
    w = torch.softmax(P["bary"], 1)
    pos = (w[:, :, None] * v[TRI[tri_of]]).sum(1)
    h, wd = f0["hw"]
    xi = pos[:, 0].round().long().clamp(0, wd - 1)
    yi = pos[:, 1].round().long().clamp(0, h - 1)
    c = f0["img"][yi, xi].clamp(0.02, 0.98)
    P["rgb"] = torch.log(c / (1 - c))
for k in P:
    P[k].requires_grad_(True)
gain = torch.ones(len(frames), 3, device=dev, requires_grad=True)
bias = torch.zeros(len(frames), 3, device=dev, requires_grad=True)


try:  # On a GPU, gsplat (Apache-2.0) draws the same patches at full size. Not used on a CPU.
    import gsplat  # noqa: F401
    HAVE_GSPLAT = dev.type == "cuda"
except ImportError:
    HAVE_GSPLAT = False


def render_gsplat(mu, S3, col, op, hw):
    """The same picture through gsplat's orthographic camera: the points are already image pixels.
    Not yet run on a GPU: check it against render() on the first GPU run before trusting it."""
    from gsplat import rasterization
    h, w = hw
    means = mu.clone()
    means[:, 2] = means[:, 2] + 10_000.0  # in front of the camera; order is unchanged
    viewmat = torch.eye(4, device=mu.device)[None]
    K = torch.tensor([[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]], device=mu.device)[None]
    rgb, alpha, _ = rasterization(means, None, None, op[:, 0], col, viewmat, K, w, h, covars=S3, camera_model="ortho",
                                  packed=False, eps2d=0.25)
    return rgb[0], alpha[0, ..., 0]


def render(v, hw, params=P, chunk=4096):
    """Draw the patches over the frame's face points (orthographic: the points are in image pixels)."""
    h, w = hw
    A, B, C = v[TRI[tri_of, 0]], v[TRI[tri_of, 1]], v[TRI[tri_of, 2]]
    e1 = B - A
    n = torch.cross(e1, C - A, dim=1)
    area = n.norm(dim=1, keepdim=True) / 2 + 1e-6
    k = area.sqrt()
    e1 = e1 / (e1.norm(dim=1, keepdim=True) + 1e-9)
    n = n / (n.norm(dim=1, keepdim=True) + 1e-9)
    e2 = torch.cross(n, e1, dim=1)
    wts = torch.softmax(params["bary"], 1)
    mu = wts[:, 0:1] * A + wts[:, 1:2] * B + wts[:, 2:3] * C + n * params["off"] * k
    ct, st = torch.cos(params["theta"]), torch.sin(params["theta"])
    u = ct * e1 + st * e2
    vv = -st * e1 + ct * e2
    su, sv = torch.exp(params["ls"][:, :1]) * k, torch.exp(params["ls"][:, 1:2]) * k
    if HAVE_GSPLAT:
        sn = 0.05 * k
        S3 = (su[:, :, None] ** 2 * u[:, :, None] * u[:, None, :] + sv[:, :, None] ** 2 * vv[:, :, None] * vv[:, None, :]
              + sn[:, :, None] ** 2 * n[:, :, None] * n[:, None, :])
        return render_gsplat(mu, S3, torch.sigmoid(params["rgb"]), torch.sigmoid(params["op"]), hw)
    # 2D covariance: the in-plane axes as seen from the camera (x, y), plus a pixel of blur.
    U, V = u[:, :2], vv[:, :2]
    S = su[:, :, None] ** 2 * U[:, :, None] * U[:, None, :] + sv[:, :, None] ** 2 * V[:, :, None] * V[:, None, :]
    S = S + 0.25 * torch.eye(2, device=v.device)
    det = S[:, 0, 0] * S[:, 1, 1] - S[:, 0, 1] ** 2
    inv = torch.stack([S[:, 1, 1], -S[:, 0, 1], S[:, 0, 0]], 1) / det[:, None]
    # Front to back (smaller z is nearer in MediaPipe's depth).
    idx = torch.argsort(mu[:, 2])
    mu2, inv, col, op = mu[idx, :2], inv[idx], torch.sigmoid(params["rgb"][idx]), torch.sigmoid(params["op"][idx])
    ys, xs = torch.meshgrid(torch.arange(h, device=v.device, dtype=torch.float32) + 0.5, torch.arange(w, device=v.device, dtype=torch.float32) + 0.5, indexing="ij")
    pix = torch.stack([xs.reshape(-1), ys.reshape(-1)], 1)
    out_c, out_a = [], []
    for s0 in range(0, pix.shape[0], chunk):
        d = pix[s0:s0 + chunk, None, :] - mu2[None]
        m = inv[None, :, 0] * d[..., 0] ** 2 + 2 * inv[None, :, 1] * d[..., 0] * d[..., 1] + inv[None, :, 2] * d[..., 1] ** 2
        al = (op[None, :, 0] * torch.exp(-0.5 * m)).clamp(max=0.99)
        Tr = torch.cumprod(torch.cat([torch.ones_like(al[:, :1]), 1 - al[:, :-1]], 1), 1)
        wgt = al * Tr
        out_c.append(wgt @ col)
        out_a.append(wgt.sum(1))
    return torch.cat(out_c).reshape(h, w, 3), torch.cat(out_a).reshape(h, w)


# --- Training --------------------------------------------------------------------------------------------
data = {i: prep(frames[i], a.size) for i in train + hold}
opt = torch.optim.Adam([
    {"params": [P["rgb"]], "lr": 0.03},
    {"params": [P["op"]], "lr": 0.03},
    {"params": [P["bary"], P["theta"], P["ls"]], "lr": 0.01},
    {"params": [P["off"]], "lr": 0.003},
    {"params": [gain, bias], "lr": 0.01},
])
t0 = time.time()
for it in range(a.iters):
    i = train[it % len(train)]
    d = data[i]
    rgb, acc = render(d["v"], d["hw"])
    pred = rgb * gain[i] + bias[i] * acc[..., None]
    m = d["mask"][..., None]
    l1 = ((pred - d["img"]).abs() * m).sum() / (m.sum() * 3 + 1)
    la = ((acc - d["mask"]) ** 2).mean()
    reg = (P["ls"].clamp(min=0) ** 2).mean() * 0.01 + (P["off"] ** 2).mean() * 0.01 + ((gain - 1) ** 2).mean() * 0.01
    loss = l1 + 0.2 * la + reg
    opt.zero_grad()
    loss.backward()
    opt.step()
    if it % 50 == 0 or it == a.iters - 1:
        print(f"LEARN it {it} loss {l1.item():.4f} alpha {la.item():.4f} ({time.time() - t0:.0f}s)", flush=True)

# --- Check on held-out frames ----------------------------------------------------------------------------------
res = {"train_frames": len(train), "holdout_frames": len(hold), "patches": N, "size": a.size, "iters": a.iters, "device": str(dev)}
sheets = []
errs = []
with torch.no_grad():
    for i in hold:
        d = prep(frames[i], a.eval_size)
        rgb, acc = render(d["v"], d["hw"])
        # The held-out frame's own light is not known, so use the average correction.
        pred = (rgb * gain.mean(0) + bias.mean(0) * acc[..., None]).clamp(0, 1)
        m = d["mask"][..., None]
        errs.append(float(((pred - d["img"]).abs() * m).sum() / (m.sum() * 3 + 1)))
        comp = d["img"] * (1 - acc[..., None]) + pred
        sheets.append((d["raw"], (comp.cpu().numpy()[..., ::-1] * 255).astype(np.uint8), (pred.cpu().numpy()[..., ::-1] * 255).astype(np.uint8)))
res["holdout_photo_error"] = round(float(np.mean(errs)), 4)

# Face recognition on held-out frames: real vs learned (in the frame, and alone on grey).
if a.models and os.path.exists(os.path.join(a.models, "face_recognition_sface_2021dec.onnx")):
    det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.5)
    rec = cv2.FaceRecognizerSF.create(os.path.join(a.models, "face_recognition_sface_2021dec.onnx"), "")

    def emb(img, box_from=None):
        im = cv2.resize(img, (img.shape[1] * 3, img.shape[0] * 3), interpolation=cv2.INTER_CUBIC)
        src = box_from if box_from is not None else im
        det.setInputSize((src.shape[1], src.shape[0]))
        _, f = det.detect(src)
        if f is None or not len(f):
            return None
        e = rec.feature(rec.alignCrop(im, max(f, key=lambda r: r[2] * r[3]))).ravel()
        return e / (np.linalg.norm(e) + 1e-9)

    real, comp_, alone = [], [], []
    for raw, comp, pred in sheets:
        big = cv2.resize(raw, (raw.shape[1] * 3, raw.shape[0] * 3), interpolation=cv2.INTER_CUBIC)
        er = emb(raw)
        ec = emb(comp, big)
        grey = np.where(pred.sum(2, keepdims=True) > 0, pred, 128).astype(np.uint8)
        ea = emb(grey, big)
        if er is not None:
            real.append(er)
            comp_.append(ec)
            alone.append(ea)
    if len(real) >= 2:
        R = np.array(real)
        rr = [float(R[i] @ R[j]) for i in range(len(R)) for j in range(len(R)) if i != j]
        base = float(np.mean(rr))
        def vs(es):
            vals = [float(e @ R[j]) for i, e in enumerate(es) if e is not None for j in range(len(R)) if j != i]
            return float(np.mean(vals)) if vals else None
        c, al_ = vs(comp_), vs(alone)
        res["sface"] = {"photo_vs_photo": round(base, 3), "learned_in_frame_vs_photos": round(c, 3) if c is not None else None,
                        "learned_alone_vs_photos": round(al_, 3) if al_ is not None else None}
        res["likeness_in_frame_pct"] = round(100 * c / base) if c is not None and base > 0 else None
        res["likeness_alone_pct"] = round(100 * al_ / base) if al_ is not None and base > 0 else None

# The learned face alone, one file per held-out frame, so other tools (bench.py) can judge it against any photos.
for k, (_, _, pred) in enumerate(sheets):
    cv2.imwrite(os.path.join(a.out, f"alone_{k:02d}.png"), np.where(pred.sum(2, keepdims=True) > 0, pred, 128).astype(np.uint8))

# A sheet: real | learned in the frame | learned alone, one row per held-out frame.
rows = []
for raw, comp, pred in sheets[:6]:
    h = 192
    rs = lambda x: cv2.resize(x, (int(x.shape[1] * h / x.shape[0]), h))  # noqa: E731
    rows.append(np.hstack([rs(raw), rs(comp), rs(np.where(pred.sum(2, keepdims=True) > 0, pred, 128).astype(np.uint8))]))
if rows:
    wmax = max(r.shape[1] for r in rows)
    cv2.imwrite(os.path.join(a.out, "holdout.jpg"), np.vstack([np.pad(r, ((0, 0), (0, wmax - r.shape[1]), (0, 0))) for r in rows]))
torch.save({k: v.detach().cpu() for k, v in P.items()} | {"tri": TRI.cpu(), "per_tri": K}, os.path.join(a.out, "face_splats.pt"))
json.dump(res, open(os.path.join(a.out, "report.json"), "w"), indent=1)
print("LEARN done", json.dumps(res), flush=True)
