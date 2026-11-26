# Pratibimb identity pack (`.pbpack`) — format 1.x

One file per person: everything Pratibimb measured from their photos and video, ready for any model
that builds a 3D presenter. It can be downloaded from the Studio, kept, and imported on any
NexoraGuru account to build the model again without capturing again. Made by
`scripts/teacher/maker/pack.py` (from `capture.py`'s output); read and checked by
`src/pratibimb/pack.js`.

Everything is **measured, not generated**: frames are the person's own camera frames; numbers come from
face, body and hand points, colours from pixels, the voice from the recording.

## Container

A standard ZIP. Text files are deflated; images, video and arrays are stored. Paths are relative,
forward slashes, no `..`.

| Path | What it is |
|---|---|
| `manifest.json` | Schema, version, provenance, consent, quality, and every other file with its size and SHA-256 |
| `signature.json` | Present when the site's build machine made the pack: `{"alg":"HMAC-SHA256","of":"manifest.json","value":hex}` with `PRATIBIMB_PACK_KEY`. Covers every file through the manifest's hashes |
| `identity.json` | The person, measured (below) |
| `frames.npz` | Per-frame arrays (below) |
| `face/mesh.obj` | The person's 3D face: 468 points in millimetres, MediaPipe topology (898 triangles) with UVs |
| `face/points3d.npy` | float32 (478, 3): the same points plus the 10 iris points, millimetres |
| `face/texture.png` | The face's colours in MediaPipe's canonical UV layout (default 1024²), merged from every view, weighted by how squarely and sharply each view saw each triangle |
| `face/coverage.png` | 8-bit: how well each texel was seen (0 = never) |
| `views/NN_<label>.jpg` | The best frame for each head angle and each expression |
| `views/NN_<label>_parts.png` | Region map of that frame: value/40 = 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 other |
| `voice/voice.wav` | 16 kHz mono, when the source had sound |

A reader **must** check: `schema == "nexoraguru.pratibimb.pack"`, major version `1`, every file in
`manifest.files` present with the same SHA-256. A pack without `consent` is never built from.

## Coordinates

- **Image:** pixels, origin top-left, x right, y down. Landmark z is MediaPipe's relative depth in
  the same units as x.
- **face3d:** millimetres, origin at the face's centre; x = the person's left, y = up, z = towards
  the viewer.
- **body3d:** metres, MediaPipe world coordinates (origin between the hips).
- **UV:** MediaPipe canonical face model UVs (v up); texture row 0 is v = 1.

## `manifest.json`

```json
{
  "schema": "nexoraguru.pratibimb.pack", "version": "1.0.0", "created": "ISO time",
  "source": {"kind": "photos | video | video+photos", "name": ["…"]},
  "consent": {"subject": "self | other | pack", "at": 0, "sentence": "…", "from_pack": null},
  "coordinates": {"…": "as above"},
  "provenance": {"tools": {"mediapipe": "…", "opencv": "…", "numpy": "…"}, "models": {"…": "name (licence)"}, "generated_content": false},
  "quality": {"frames": 0, "views": 0, "texture_views": 0, "texture_seen_share": 0.0, "turn_range_deg": [0, 0],
              "missing_views": [], "advice": [], "median_face_px": 0, "median_sharpness": 0},
  "files": {"path": {"bytes": 0, "sha256": "hex"}}
}
```

## `identity.json`

| Key | Contents |
|---|---|
| `face.scale` | `iris_mm_per_unit` (from the iris, ≈ 11.7 mm), `pupil_prior_mm_per_unit` (from the adult average pupil distance, 63 mm), `used` (their geometric mean), `uncertainty_pct`. Absolute sizes are estimates within that uncertainty; every ratio and the shape are exact to the photos |
| `face.measurements_mm` | 35+ named measurements: pupils, eye corners, eye widths and openings, iris, brow lengths, arch heights, brow-to-eye, inter-brow gap, nose length, bridge, alar width, tip protrusion, philtrum, mouth width, upper and lower lip heights, Cupid's bow depth, lip to chin, face width (bizygomatic), jaw width (gonial), face heights, forehead, mid and lower face, chin width, cheekbone prominence, face depth, eye spacing ratio |
| `face.ratios` | Face height/width, jaw/cheek width, forehead share, facial thirds, mouth/nose width, upper/lower lip |
| `face.shape` | `oval | round | square | heart | long` (from the ratios) |
| `face.asymmetry_mm` | Distance between each left point and its mirrored right partner |
| `colours` | `skin`, `iris`, `lips`, `brows`, `hair`, `clothes`: `rgb` (0–1), `hex`, `lab` (CIELAB). Skin also has `ita_deg` and `ita_class` (Individual Typology Angle), `monk_scale` (1–10, Monk Skin Tone scale) and `undertone`. Colours are corrected for the room's tint using the whites of the eyes |
| `hair` | Length below the chin, height above the forehead, width (face widths), volume (face areas), parting offset |
| `body` | Shoulder and hip width, upper arm, forearm, torso, thigh, shin (metres, medians over frames where the joints are clearly seen) |
| `expressions` | For each of the 52 ARKit expression values: this person's p5, p50, p95 and max |
| `motion` | Blinks per minute and length, head turn spread and speed (yaw, pitch, roll), mouth range per mouth shape while speaking, smile and brow-raise share, hand habits (from video only) |
| `voice` | Speaking seconds, pitch (p10, median, p90 Hz), pitch range (semitones), loudness, onsets per second |
| `identity` | SFace identity vector (128 numbers, unit length), how many views it averages, self-similarity, and SFace's same-person threshold (0.363) |

## `frames.npz`

| Array | Shape | Meaning |
|---|---|---|
| `t` | (F,) | time in seconds (videos from 0, 10000, …; photos from 1000000) |
| `landmarks` | (F, 478, 3) | face points, image coordinates |
| `blendshapes` | (F, 52) | expression values, names in `blendshape_names` (ARKit order) |
| `head_ypr_deg` | (F, 3) | yaw, pitch, roll |
| `body2d` | (F, 33, 3) | body points: x, y, visibility (NaN when not seen) |
| `body3d_m` | (F, 33, 3) | body points, metres |
| `hands2d` | (F, 2, 21, 3) | left, right hand points: x, y, depth (NaN when not seen) |
| `face_px`, `sharpness`, `brightness`, `identity_match` | (F,) | per-frame quality |
| `frame_size` | (F, 2) | width, height |

## Versions

Readers accept any `1.x`. New keys may be added in minor versions; nothing is removed or renamed
without a new major version.
