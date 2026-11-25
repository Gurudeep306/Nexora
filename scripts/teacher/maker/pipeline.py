"""NexoraGuru Teacher Maker: photos in, a talking teacher model out. One command, fixed steps, the
same for every person.

  python3 scripts/teacher/maker/pipeline.py --photos <dir> --work <dir> [--gender female|male|neutral]
      [--age 0..1] [--style painted|anime|real] [--models <dir>] [--blender <path>]

Stages (each writes into --work, each checked before the next runs):
  1. analyse      every photo: face points, turn, expression, sharpness, light, what covers the face,
                  skin / eye / lip / brow / hair colours, hair length, body proportions. Bad photos are
                  set aside with a plain reason; if too few are left, it stops and says which photos to add.
  2. body         body settings from the person's choices and measured proportions.
  3. reference    the base model's own face, read by the same photo reader (cancels the reader's bias).
  4. shape        one 3D face shape from all usable photos (mouth ignored where they smile or pout).
  5. face         222 face controls solved to match it.
  6. skin         the person's real skin from their best photos, the room's light taken out.
  7. features     brows, lids, lips, nose traced from the best photo, drawn cleanly.
  8. look         the chosen style (painted by default: real tones with a painted finish).
  9. build        the VRM model (body, face shapes for speech and expressions, hair, clothes).
 10. check        renders the model and scores its likeness against the photos (face recognition);
                  tries the next variant if a stage's result is weak, and keeps the best.
Writes <work>/teacher.vrm, <work>/report.json and <work>/preview.jpg.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MPFB_DATA = "/root/.config/blender/5.2/extensions/.user/user_default/mpfb/data"

ap = argparse.ArgumentParser()
ap.add_argument("--photos", required=True)
ap.add_argument("--work", required=True)
ap.add_argument("--gender", default="neutral", choices=["female", "male", "neutral"])
ap.add_argument("--age", type=float, default=0.5, help="MakeHuman age: 0.5 is about 25 years")
ap.add_argument("--style", default="painted", choices=["painted", "anime", "real"])
ap.add_argument("--models", default=os.environ.get("TEACHER_MODELS", ""))
ap.add_argument("--blender", default=os.environ.get("BLENDER", "blender"))
ap.add_argument("--lab", default=os.environ.get("TEACHER_LAB", ""), help="folder served on :8765 with the renderer (render.html)")
ap.add_argument("--variants", type=int, default=3)
args = ap.parse_args()
W = os.path.abspath(args.work)
os.makedirs(W, exist_ok=True)
report = {"started": time.strftime("%Y-%m-%d %H:%M:%S"), "stages": {}, "options": vars(args)}


def log(stage, msg, **data):
    print(f"[{stage}] {msg}", flush=True)
    report["stages"].setdefault(stage, {}).update(data, note=msg)
    json.dump(report, open(os.path.join(W, "report.json"), "w"), indent=1)


def run(stage, cmd, ok_word=None, **kw):
    t0 = time.time()
    p = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, **kw)
    out = p.stdout + p.stderr
    if p.returncode != 0 or (ok_word and ok_word not in out):
        tail = "\n".join(l for l in out.splitlines() if "Error" in l or "Traceback" in l or "error" in l)[-1500:]
        log(stage, "FAILED", error=tail or out[-1500:], seconds=round(time.time() - t0, 1))
        raise SystemExit(f"Stage {stage} failed: see {W}/report.json")
    report["stages"].setdefault(stage, {})["seconds"] = round(time.time() - t0, 1)
    return out


def py(script, *a, **kw):
    return [sys.executable, "-I", os.path.join(HERE, script), *map(str, a)]


def blender(script, *a):
    return [args.blender, "-b", "--python", os.path.join(ROOT, "scripts", "teacher", script), "--", *map(str, a)]


# 1. analyse ---------------------------------------------------------------------------------------
run("analyse", py("analyse.py", args.photos, args.models, f"{W}/analysis.json"), "ANALYSE summary")
A = json.load(open(f"{W}/analysis.json"))
S, P = A["summary"], A["photos"]
usable = {k: v for k, v in P.items() if v["role"] != "skip"}
log("analyse", f"{S['usable']} of {S['photos']} photos usable", summary=S, skipped={k: v["reasons"] for k, v in P.items() if v["role"] == "skip"})
if S["usable"] < 2:
    log("analyse", "not enough usable photos", advice=S["advice"])
    raise SystemExit("Not enough usable photos: " + " ".join(S["advice"]))
json.dump(usable, open(f"{W}/points.json", "w"))
ranked = sorted(usable.values(), key=lambda r: -r["quality"])
skin_photos = [r for r in ranked if r["role"] == "skin"] or sorted([r for r in ranked if r["mouth_ok"]] or ranked, key=lambda r: r.get("light_unevenness", 1))
best = skin_photos[0]


def median_of(key):
    vals = [r[key] for r in ranked[:6] if r.get(key)]
    return np.median(np.array(vals), 0).tolist() if vals else None


skin_c, iris_c, hair_c, brow_c = median_of("skin"), median_of("iris"), median_of("hair_colour"), median_of("brows")
hair_len = float(np.median([r["hair_below_chin"] for r in ranked if "hair_below_chin" in r] or [0.0]))

# 2. body ------------------------------------------------------------------------------------------
gender = {"female": 0.0, "male": 1.0, "neutral": 0.5}[args.gender]
bodies = [r["body"] for r in ranked if r.get("body")]
weight, muscle = 0.5, 0.5
if bodies:
    sw = np.median([b["shoulder_w"] for b in bodies if "shoulder_w" in b] or [0])
    ww = np.median([b["waist_w"] for b in bodies if "waist_w" in b] or [0])
    if sw and ww:
        # Wider waist relative to the shoulders reads as a heavier build (clamped to a natural range).
        weight = float(np.clip(0.5 + (ww / sw - 1.0) * 1.2, 0.25, 0.85))
lum = np.dot(skin_c or [0.7, 0.55, 0.45], [0.299, 0.587, 0.114])
race = {"african": float(np.clip((0.55 - lum) * 2.5, 0, 0.8)), "asian": 0.3}
race["caucasian"] = max(0.05, 1 - race["african"] - race["asian"])
body = {"gender": gender, "age": args.age, "muscle": muscle, "weight": weight, "height": 0.5, "race": race}
log("body", f"gender {gender}, weight {weight:.2f}", body=body, measured=bodies[:3])

# 3. reference -------------------------------------------------------------------------------------
recipe0 = {"body": body}
json.dump(recipe0, open(f"{W}/body.json", "w"))
run("reference", blender("maker/export_base.py", f"{W}/body.json", f"{W}/base.npz"), "EXPORT")
run("reference", blender("fit/corr.py", "render", f"{W}/ref", f"{W}/body.json"), "CORR rendered")
run("reference", py("analyse.py", f"{W}/ref", args.models, f"{W}/ref_analysis.json"), "ANALYSE summary")
refA = json.load(open(f"{W}/ref_analysis.json"))["photos"]
json.dump(refA, open(f"{W}/ref_points.json", "w"))
ref_views = [f"{W}/ref_points.json:{n}" for n, r in refA.items() if "landmarks" in r]
run("reference", py("../fit/shape.py", f"{W}/ref_shape.json", *ref_views), "SHAPE")

# 4. shape -----------------------------------------------------------------------------------------
views = [f"{W}/points.json:{n}" for n in usable]
run("shape", py("../fit/shape.py", f"{W}/shape.json", *views), "SHAPE")
log("shape", f"face shape from {len(views)} photos")


def build_variant(tag, strength, skin_set):
    """Stages 5-9 for one variant; returns the VRM path."""
    run("face", py("solve_face.py", f"{W}/base.npz", f"{W}/shape.json", f"{W}/face_{tag}.json",
                   "--reference", f"{W}/ref_shape.json", "--strength", strength), "SOLVE")
    skin_base = f"{MPFB_DATA}/skins/young_asian_female/young_lightskinned_female_diffuse3.png"
    seg = os.path.join(args.models, "selfie_multiclass.tflite")
    run("skin", py("bake_skin.py", f"{W}/base.npz", f"{W}/face_{tag}.json", skin_base, f"{W}/skin_{tag}.png",
                   *[f"{W}/points.json:{r['file']}:{os.path.join(args.photos, r['file'])}" for r in skin_set]),
        "BAKE painted", env={**os.environ, "SELFIE_SEGMENTER": seg})
    run("features", py("paint_features.py", f"{W}/base.npz", f"{W}/face_{tag}.json", f"{W}/skin_{tag}.png", f"{W}/features_{tag}.png",
                       f"{W}/points.json:{best['file']}:{os.path.join(args.photos, best['file'])}"), "PAINT wrote")
    paint, lines = {"painted": (0.6, 0.35), "anime": (0.8, 0.8), "real": (0.0, 0.15)}[args.style]
    run("look", py("paint_look.py", f"{W}/skin_{tag}.png", f"{W}/features_{tag}.png", f"{W}/look_{tag}.png", "--paint", paint, "--lines", lines), "LOOK wrote")
    iris = ",".join(str(int(v * 255)) for v in (iris_c or [0.35, 0.22, 0.14]))
    tone = ",".join(str(int(v * 255)) for v in (skin_c or [0.8, 0.62, 0.52]))
    run("look", py("anime_textures.py", skin_base, f"{MPFB_DATA}/eyes/materials/brown_eye.png", tone, iris, W), "ANIME")
    # Hair by length; clothes by gender (what is installed).
    female = gender < 0.5
    if hair_len > 0.6:
        hair = "long01" if female else "short02"
    elif hair_len > -0.1:
        hair = "bob02" if female else "short02"
    else:
        hair = "short01" if female else "short04"
    clothes = ["clothes/toigo_female_suit_2/toigo_female_suit_2.mhclo"] if female else ["clothes/male_elegantsuit01/male_elegantsuit01.mhclo"]
    clothes = [c for c in clothes if os.path.exists(os.path.join(MPFB_DATA, c))] or (
        ["clothes/female_casualsuit01/female_casualsuit01.mhclo"] if female else ["clothes/male_casualsuit01/male_casualsuit01.mhclo"])
    clothes += ["clothes/shoes04/shoes04.mhclo" if female else "clothes/shoes02/shoes02.mhclo"]
    import colorsys
    hc = hair_c or [0.1, 0.07, 0.05]
    h, s_, v = colorsys.rgb_to_hsv(*hc)
    recipe = {
        "name": "NexoraGuru teacher", "body": body, "targets": json.load(open(f"{W}/face_{tag}.json"))["targets"],
        "skin": "skins/young_asian_female/young_asian_female.mhmat", "eyes": "eyes/low-poly/low-poly.mhclo",
        "eyebrows": "eyebrows/eyebrow009/eyebrow009.mhclo", "eyelashes": "eyelashes/eyelashes02/eyelashes02.mhclo",
        "hair": f"hair/{hair}/{hair}.mhclo", "clothes": clothes,
        "skin_image": f"look_{tag}.png", "skin_match": "lightskinned",
        "replace_images": {"brown_eye": "anime_eye.png"},
        "recolour": {hair: [h, min(0.6, s_ + 0.05), max(0.08, v), 0.0], "eyebrow009": [h, 0.4, max(0.06, v * 0.8), 0.0]},
        "decimate": {"teeth": 0.15},
    }
    json.dump(recipe, open(f"{W}/recipe_{tag}.json", "w"), indent=1)
    run("build", blender("build-vrm-teacher.py", f"{W}/recipe_{tag}.json", f"{W}/teacher_{tag}.vrm"), "BUILD export")
    return f"{W}/teacher_{tag}.vrm", hair


def score(vrm, tag, painted=()):
    """Render front and three-quarter views and measure likeness (needs the lab renderer)."""
    if not args.lab:
        return None
    lab = os.path.abspath(args.lab)
    os.makedirs(f"{lab}/out", exist_ok=True)
    shutil.copy(vrm, f"{lab}/out/pipe_{tag}.vrm")
    shots = [[f"look.html?m=out/pipe_{tag}.vrm&v=face", f"{W}/render_{tag}_f.png"], [f"look.html?m=out/pipe_{tag}.vrm&v=side", f"{W}/render_{tag}_s.png"]]
    subprocess.run(["node", f"{lab}/shot.cjs", json.dumps(shots)], cwd=lab, capture_output=True)
    out = subprocess.run([sys.executable, "-I", os.path.join(HERE, "likeness.py"), args.models, "--photos",
                          # Only photos not painted onto the model judge it (otherwise it recognises its own copy).
                          *([os.path.join(args.photos, n) for n in usable if n not in painted] or [os.path.join(args.photos, n) for n in usable]),
                          "--renders", f"{W}/render_{tag}_f.png"],
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if "render vs photos" in line:
            return float(line.rsplit("->", 1)[1].strip().rstrip("%"))
    return None


variants = [("a", 1.0, skin_photos[:3]), ("b", 0.75, skin_photos[:3]), ("c", 1.0, skin_photos[:1])][: args.variants]
results = []
for tag, strength, skin_set in variants:
    vrm, hair = build_variant(tag, strength, skin_set)
    s = score(vrm, tag, painted={r["file"] for r in skin_set})
    results.append((s if s is not None else -1, tag, vrm))
    log("check", f"variant {tag}: likeness {s}%", **{f"variant_{tag}": {"strength": strength, "skin_photos": [r['file'] for r in skin_set], "likeness": s, "hair": hair}})
best_s, best_tag, best_vrm = max(results)
shutil.copy(best_vrm, f"{W}/teacher.vrm")
log("done", f"best variant {best_tag} (likeness {best_s}%)", best=best_tag, likeness=best_s, output=f"{W}/teacher.vrm")
