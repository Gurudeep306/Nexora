"""Pratibimb build worker: takes queued models from the site and builds them, on any ordinary computer.

  PRATIBIMB_WORKER_KEY=… PRATIBIMB_PACK_KEY=… python3 scripts/teacher/maker/worker.py \
      --site https://nexoraguru.in --models <models dir> --blender <blender> [--lab <lab dir>] \
      [--work <dir>] [--once]

For each job (POST /api/pratibimb/worker/next):
  1. download its files (photos, videos, consent clip; or the identity pack it was imported from);
  2. capture.py over every photo and video together, then pack.py: the signed identity pack, uploaded
     as pack.pbpack (an imported pack is used as it is);
  3. pipeline.py on the photos (plus the best frames picked from the videos): the model, uploaded as
     model.vrm with report.json;
  4. status: each stage as it starts, then done (with the likeness) or failed (with a plain reason).
Only the standard library talks to the site. The worker's files are deleted after each job.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("--site", default=os.environ.get("PRATIBIMB_SITE", "http://localhost:3000"))
ap.add_argument("--models", required=True)
ap.add_argument("--blender", default=os.environ.get("BLENDER", "blender"))
ap.add_argument("--lab", default=os.environ.get("TEACHER_LAB", ""))
ap.add_argument("--work", default=os.path.join(os.path.expanduser("~"), ".pratibimb-work"))
ap.add_argument("--once", action="store_true", help="build at most one job, then stop")
ap.add_argument("--poll", type=int, default=30)
a = ap.parse_args()
KEY = os.environ.get("PRATIBIMB_WORKER_KEY", "")
if not KEY:
    raise SystemExit("Set PRATIBIMB_WORKER_KEY (the same value as on the site).")


def api(method, path, body=None, raw=None, ctype="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    req = urllib.request.Request(a.site.rstrip("/") + path, data=data, method=method,
                                 headers={"Authorization": f"Bearer {KEY}", **({"Content-Type": ctype} if data is not None else {})})
    with urllib.request.urlopen(req, timeout=600) as r:
        out = r.read()
        return json.loads(out) if r.headers.get("content-type", "").startswith("application/json") else out


def status(job, st, stage=None, note=None, likeness=None):
    try:
        api("POST", f"/api/pratibimb/worker/{job}/status", {"status": st, "stage": stage, "note": note, "likeness": likeness})
    except Exception as e:  # a status that does not reach the site must not stop the build
        print("WORKER status not sent:", e, flush=True)


def py(script, *args, env=None):
    p = subprocess.run([sys.executable, os.path.join(HERE, script), *map(str, args)], capture_output=True, text=True, cwd=ROOT,
                       env={**os.environ, **(env or {})})
    if p.returncode != 0:
        tail = "\n".join(l for l in (p.stdout + p.stderr).splitlines() if not l.startswith(("W0000", "I0000", "INFO")))[-600:]
        raise RuntimeError(f"{script} stopped: {tail}")
    return p.stdout


def consent_matches(clip, pack_path):
    """The face in the consent clip must be the face the model is made of (SFace, same-person line 0.363).
    Returns (ok, similarity, reason)."""
    import cv2
    import numpy as np
    ident = json.loads(zipfile.ZipFile(pack_path).read("identity.json")).get("identity")
    if not ident:
        return False, None, "No face could be read from the photos."
    ref = np.array(ident["vector"], np.float32)
    det = cv2.FaceDetectorYN.create(os.path.join(a.models, "face_detection_yunet_2023mar.onnx"), "", (320, 320), 0.6)
    rec = cv2.FaceRecognizerSF.create(os.path.join(a.models, "face_recognition_sface_2021dec.onnx"), "")
    cap = cv2.VideoCapture(clip)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    sims = []
    for k in range(12):
        if n > 0:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(n * (k + 0.5) / 12))
        ok, img = cap.read()
        if not ok:
            if n <= 0:
                break
            continue
        det.setInputSize((img.shape[1], img.shape[0]))
        _, faces = det.detect(img)
        if faces is None or not len(faces):
            continue
        e = rec.feature(rec.alignCrop(img, max(faces, key=lambda r: r[2] * r[3]))).ravel()
        sims.append(float(e @ ref / (np.linalg.norm(e) + 1e-9)))
    cap.release()
    if not sims:
        return False, None, "No face was found in the consent video."
    best = float(np.median(sorted(sims)[-5:]))
    if best < 0.363:
        return False, round(best, 3), "The face in the consent video is not the face in the photos. Record the consent sentence again, by the person in the photos."
    return True, round(best, 3), ""


def build(job):
    jid = job["id"]
    W = os.path.join(a.work, jid)
    shutil.rmtree(W, ignore_errors=True)
    inp, photos = os.path.join(W, "in"), os.path.join(W, "photos")
    os.makedirs(inp)
    os.makedirs(photos)
    status(jid, "building", "download")
    for name in job["files"]:
        open(os.path.join(inp, name), "wb").write(api("GET", f"/api/pratibimb/worker/{jid}/files/{name}"))
    videos = sorted(os.path.join(inp, f) for f in os.listdir(inp) if f.startswith("video-"))
    for f in os.listdir(inp):
        if f.startswith("photo-"):
            shutil.copy(os.path.join(inp, f), photos)
    pack = os.path.join(W, "pack.pbpack")
    if "pack.pbpack" in job["files"]:
        # An imported pack: its views are the photos; the pack itself is kept as it is.
        shutil.copy(os.path.join(inp, "pack.pbpack"), pack)
        with zipfile.ZipFile(pack) as z:
            for n in z.namelist():
                if n.startswith("views/") and n.endswith(".jpg"):
                    open(os.path.join(photos, os.path.basename(n)), "wb").write(z.read(n))
    else:
        status(jid, "building", "capture")
        cap = os.path.join(W, "capture")
        sources = ([photos] if os.listdir(photos) else []) + videos
        if not sources:
            raise RuntimeError("No photos or video to build from.")
        py("capture.py", sources[0], a.models, cap, *sum((["--add", s] for s in sources[1:]), []), "--fps", "8")
        # The best frames picked from the videos join the photos for the model.
        for f in os.listdir(os.path.join(cap, "views")):
            if f.endswith(".jpg") and not f.endswith("_parts.jpg") and "expression" not in f:
                shutil.copy(os.path.join(cap, "views", f), os.path.join(photos, f"view-{f}"))
        status(jid, "building", "pack")
        consent = os.path.join(W, "consent.json")
        json.dump(job.get("consent"), open(consent, "w"))
        py("pack.py", cap, a.models, pack, "--consent", consent)
        clips = [os.path.join(inp, f) for f in os.listdir(inp) if f.startswith("consent-")]
        if clips:
            status(jid, "building", "consent")
            ok, sim, why = consent_matches(clips[0], pack)
            print("WORKER consent face match", sim, flush=True)
            if not ok:
                raise RuntimeError(why)
        api("PUT", f"/api/pratibimb/worker/{jid}/result/pack.pbpack", raw=open(pack, "rb").read(), ctype="application/zip")
    status(jid, "building", "model")
    o = job.get("options") or {}
    gender = o.get("body") if o.get("body") in ("female", "male", "neutral") else "neutral"
    style = o.get("style") if o.get("style") in ("painted", "real", "anime") else "painted"
    work = os.path.join(W, "model")
    py("pipeline.py", "--photos", photos, "--work", work, "--gender", gender, "--style", style, "--models", a.models,
       "--blender", a.blender, *(["--lab", a.lab] if a.lab else []))
    api("PUT", f"/api/pratibimb/worker/{jid}/result/model.vrm", raw=open(os.path.join(work, "teacher.vrm"), "rb").read(), ctype="model/gltf-binary")
    report = json.load(open(os.path.join(work, "report.json")))
    api("PUT", f"/api/pratibimb/worker/{jid}/result/report.json", raw=json.dumps(report).encode(), ctype="application/octet-stream")
    done = report.get("stages", {}).get("done") or {}
    likeness = done.get("likeness")
    note = None if done.get("ready") else (f"Likeness {likeness}% is below the {done.get('bar', 90)}% bar: not ready to teach yet. "
                                           "More angles or a short video help most.")
    status(jid, "done", "done", note=note, likeness=likeness)
    shutil.rmtree(W, ignore_errors=True)


def main():
    os.makedirs(a.work, exist_ok=True)
    while True:
        try:
            job = api("POST", "/api/pratibimb/worker/next").get("job")
        except (urllib.error.URLError, TimeoutError) as e:
            print("WORKER site not reachable:", e, flush=True)
            job = None
        if job:
            print("WORKER building", job["id"], flush=True)
            try:
                build(job)
                print("WORKER done", job["id"], flush=True)
            except Exception as e:
                print("WORKER failed", job["id"], e, flush=True)
                status(job["id"], "failed", "failed", note=str(e)[:400])
        if a.once and job:
            return
        if not job:
            if a.once:
                return
            time.sleep(a.poll)


if __name__ == "__main__":
    main()
