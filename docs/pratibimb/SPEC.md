# Pratibimb (प्रतिबिम्ब) — specification

Pratibimb is NexoraGuru's pipeline that turns a consenting adult's photos and voice into a painted,
near-3D talking model that looks like them, moves like a person and teaches on the site. It is one
fixed pipeline: every person goes through the same stages with the same checks. It is a module, not a
teaching feature: photos + voice in, a model + a talking player out, reusable for the teacher, the
Guru tutor, presenters or support.

Research behind every choice: `docs/voice/research/reports/Pratibimb painted avatar pipeline.md`
(ranked choice per stage, licences, gates). Code: `scripts/teacher/maker/` (offline stages) and the
player in `scripts/teacher/maker/player/` (to move into `client/src/pratibimb/`).

## 1. Rules that never change

- Consent first: adults only, their own face and voice; spoken consent on camera; one-tap delete of
  photos, voice, model and every render. Photos and voice are never used for anything else.
- Free and commercially licensed parts only; each part's licence is recorded in
  `docs/voice/licences/`. Non-commercial models (MICA, DECA, EMOCA, SMPL-X, insightface, F5-TTS,
  MMS aligners, nvdiffrast, …) are never used, not even as a dependency.
- Every output is labelled "AI-generated" (IT Rules 2026); exported files carry Content Credentials;
  cloned audio carries a watermark.
- The look is painted and real-toned, never cartoon: features come from measured positions and
  colours, not photo cut-outs.
- Nothing ships without the owner approving a video with sound.

## 2. Stages (fixed order; each has a check, a fallback and a log entry)

| # | Stage | What it does | Check | If it fails |
|---|---|---|---|---|
| 0 | Consent | Notice (English/Hindi), random sentence read on camera, liveness (blink + head turn), face match to the photos | Face match ≥ threshold, liveness passed | Stop; explain why |
| 1 | Photo check (`analyse.py`) | 478 face points, turn, expression, sharpness, light evenness, covers (glasses, stickers, hands), colours, hair, body points | ≥ 3 usable photos incl. one straight, even-lit, neutral | Tell the person exactly which photo to add |
| 2 | Face shape | FLAME 2023 Open fitted to all photos (points + face outline), carried onto the body's head; fallback: 222-control MakeHuman solve (`solve_face.py`) | Point error < 1.5% face width; outline overlap | Fallback solver |
| 3 | Skin & features | Skin tone and texture from the best even-lit photo with lighting removed; brows, lids, lips, nose drawn from measured positions and colours; holes filled (LaMa) | No stripes/blotches (variance check), features inside their regions | Use the next-best photo; then plain measured tone |
| 4 | Body | Height + front/side outline → MakeHuman macros and measurement targets | Silhouette overlap | Sliders with sensible defaults |
| 5 | Hair & clothes | Hair style matched from the hair mask (length, volume, parting, curl), recoloured; outfits from the CC0 library + our own Indian wear | Colour distance to photo | Nearest style |
| 6 | Build | VRM 1.0: rig, fingers, 52 ARKit + 15 viseme shapes, spring bones for hair/dupatta | Budget: ≤ 70k tris, ≤ 8 materials, ≤ 8 MB | Lighter assets |
| 7 | Voice | Clone from the consented sample (Chatterbox Multilingual + Hindi, MIT, watermarked); default voices otherwise | Speaker similarity, intelligibility (ASR round-trip) | Default voice |
| 8 | Lip sync | wav2arkit (Apache-2.0) curves, calibrated to the person's own mouth range from the consent video; phoneme timings (HeadTTS English, Hindi aligner) enforce lip closure on p/b/m and f/v contact | The 5 gates in §5 | Rule-based visemes |
| 9 | Likeness check | Renders matched to each photo's pose and expression; two face-recognition judges (SFace + AuraFace), landmark error, outline overlap; only photos not used for painting judge | Above the same-person line on ≥ 90% of renders | Next variant; keep the best |

`pipeline.py` runs stages 1–9 and writes `report.json` (every number above) and a preview.

## 3. On the site

- **Where the teacher stands:** a corner panel beside the lesson (right on desktop, never over the
  content), minimise to a face bubble, drag aside with one tap; on phones a small face bubble above the
  lesson, tap for full size. Light and dark themes; 360 px with no sideways scroll; respects reduced
  motion (gestures fade, no sway).
- **Teaching:** she talks with captions lit word by word. When the lesson needs a picture, the
  whiteboard panel opens beside her with the lesson's own animation (the site's animation player); she
  turns, points and looks at it, then back at the student. No walking across the room, no pretend
  handwriting.
- **Listening:** while the student speaks she listens (nods at pauses, the listening meter), then
  thinks (eyes up briefly), then answers.

## 4. Pratibimb Studio (`/pratibimb`)

1. **Start:** what it does, how long it takes, that only they can make a model of themselves, and that
   they can delete it any time.
2. **Consent:** read a random sentence to the camera (records the reference video used for lip-sync
   calibration and liveness).
3. **Photos:** camera or upload; each photo gets a live tick or a plain reason ("turn a little left",
   "too dark", "remove sunglasses"); a guide shows the 5 photos it wants (front, left, right, smile,
   full-length).
4. **Height and build:** height, and confirm or adjust the measured build.
5. **Voice:** read 3 short sentences; live loudness meter, noise check, re-record any one.
6. **Build:** a progress page naming each stage; about 10–20 minutes on the server; can leave and come
   back.
7. **Preview and customise:** the model talks in their voice; sliders for every face feature, hair,
   outfits (several, incl. Indian wear), colours; every joint can be posed in a "pose test".
8. **Use it:** choose as my teacher, keep private, or delete.

## 5. "95% real" lip sync, measured

Against the person's own video of the same sentences (the consent video and a short reading):
1. SyncNet confidence no worse than the real video's; audio never more than 50 ms ahead of the lips.
2. Mouth movement size within ±15% of the person's own.
3. Mouth opening follows loudness at least as well as the real video.
4. Every p/b/m fully closed; f/v teeth on lip.
5. Blind A/B (≥ 20 raters, ≥ 30 clips): the model chosen ≥ 45% of the time.

## 6. Models we can train ourselves (owner has offered to train)

| Model | Data (all ours or CC0) | Why |
|---|---|---|
| Photo → face controls (the core innovation) | Thousands of synthetic faces rendered from random CC0 MakeHuman/FLAME settings: the answers are known | A fast network that reads a face's features in one step, runs in the browser, no licence risk |
| Hindi lip sync (fine-tune wav2arkit) | The owner and consenting staff reading Hindi/Hinglish on camera; MediaPipe gives the 52 face values as targets | wav2arkit's audio encoder is English-only |
| Hinglish voice (LoRA on Chatterbox Hindi) | 30–60 min of consented recordings | Natural code-mixed speech |
| Painted finish | Paintings we make or own (never scraped art) | Our own style, consistent |
| Gesture timing | Owner/staff teaching videos (consented), MediaPipe pose | Gestures that fit Indian teaching style |

## 7. Build order (each phase ends with a video for the owner)

0. Licence reads still open in the report; test bench (licensed internet photos, men/women, ages,
   skin tones, glasses, beards); the owner's reference video.
1. Lips and look: wav2arkit + calibration + closure rules; painted shader; no outlines on the face.
2. FLAME fit + lighting removal; likeness judges.
3. Body, hair, clothes (incl. Indian wear).
4. Voice cloning.
5. Joints, gestures, whiteboard panel, listening.
6. Studio page, consent at scale, the human tests; then the site placement.
