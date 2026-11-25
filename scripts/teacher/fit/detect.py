"""Face points (MediaPipe Face Landmarker, Apache-2.0) for each photo: 478 points, head turn, expression."""
import glob, json, math, sys
import numpy as np
from PIL import Image, ImageOps
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions

src, model, out = sys.argv[1], sys.argv[2], sys.argv[3]
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=model), num_faces=3,
    output_face_blendshapes=True, output_facial_transformation_matrixes=True))
res = {}
for f in sorted(x for x in glob.glob(src + '/*') if x.lower().endswith(('.jpg', '.jpeg', '.png'))):
    im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
    arr = np.asarray(im)
    r = det.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=arr))
    name = f.split('/')[-1]
    if not r.face_landmarks:
        res[name] = {'found': False}; continue
    # The biggest face in the picture.
    sizes = [ (max(p.x for p in l)-min(p.x for p in l))*im.width for l in r.face_landmarks]
    k = int(np.argmax(sizes))
    lm = np.array([[p.x * im.width, p.y * im.height, p.z * im.width] for p in r.face_landmarks[k]])
    M = np.array(r.facial_transformation_matrixes[k])
    R = M[:3, :3] / np.linalg.norm(M[:3, 0])
    yaw = math.degrees(math.atan2(-R[2, 0], math.hypot(R[2, 1], R[2, 2])))
    pitch = math.degrees(math.atan2(R[2, 1], R[2, 2]))
    roll = math.degrees(math.atan2(R[1, 0], R[0, 0]))
    bs = {b.category_name: b.score for b in r.face_blendshapes[k]}
    res[name] = {'found': True, 'faces': len(r.face_landmarks), 'size': im.size, 'face_px': round(sizes[k]),
                 'yaw': round(yaw, 1), 'pitch': round(pitch, 1), 'roll': round(roll, 1),
                 'smile': round((bs['mouthSmileLeft'] + bs['mouthSmileRight']) / 2, 2),
                 'blink': round((bs['eyeBlinkLeft'] + bs['eyeBlinkRight']) / 2, 2),
                 'jaw': round(bs['jawOpen'], 2), 'landmarks': lm.round(2).tolist(), 'matrix': M.tolist()}
json.dump(res, open(out, 'w'))
for n, v in res.items():
    print(n[:8], {k: v[k] for k in v if k not in ('landmarks', 'matrix', 'size')})
