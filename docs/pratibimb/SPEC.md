# Pratibimb (प्रतिबिम्ब) — the black box

Pratibimb turns a consenting adult's photos (and, if they can, a short video) and voice into a
**presenter model made for the NexoraGuru website**: a waist-up teacher who looks like them, talks in
their voice with exact lip sync, shows emotions, gestures with her hands and reacts to the student.
It is one fixed pipeline: every person goes through the same stages, checks and fallbacks.

This file is the owner's brief, written once so nobody has to ask again. Decisions are the owner's
(2026-11-26) unless marked.

## 0. Direction (owner, 2026-11-26, supersedes the rig and portrait outputs below)

One output: a **generative digital human**. Every frame is drawn fresh from the person's consented photo and
video (who), their own cloned voice (what they say) and an instruction (what they do), so any gesture or
expression is possible and the lips come from the audio. It has its own brain (persona, memory, lesson
content; Guru's rules for exams) and converses: it listens, reacts, then answers. No game-style 3D with fixed
animations, no talking photo. Our own engine design (owner, 2026-11-26: build it ourselves from research, not existing pipelines): `docs/pratibimb/ENGINE.md`. Open models for comparison and the first GPU test: `deploy/digital-human/README.md`.
The capture, identity pack and bench below stay as the inputs and the checks.

## 1. What the owner wants (fixed)

| Topic | Decision |
|---|---|
| Kind of model | Made for the website only: a **waist-up presenter** in a panel, facing the student. Not a game character: no legs, no walking, no back of the head, no free camera. |
| Look | **Real, lightly painted**: the person's real face, proportions and colours with a soft digital-painting finish. Never cartoon, never a photo pasted on a stock face. |
| Likeness | **90% or more** (owner, 2026-11-26; was 80%), judged twice: a face-recognition score on photos the model never learned from, and the owner's eye on side-by-side pictures. |
| Actions | Talk with exact lip sync and emotions (smile, surprise, thinking, nods, blinks, eye contact); natural hand gestures while explaining; reacting to the student (listening, thinking, pleased). The whiteboard opens beside her; she does not write on it or walk. |
| Clothes | A switchable wardrobe (Indian and Western), chosen in the Studio. |
| Delivery | **Hybrid**: lesson explanations made ahead in top quality; live answers (Guru) drawn live in the browser. |
| Runs on | **Any ordinary computer**. A graphics card (or a rented one, owner-approved: Vast.ai / RunPod) only makes it faster; nothing requires one. |
| Capture | The site asks for photos, checks each one **as it is taken**, and tells the person exactly how to take the next one. Three ways: the computer's camera, a phone (QR code, no sign-in), or upload. **Video is optional**: many people cannot film themselves; when given, it makes the model better. |
| Owner's time | The owner should not have to explain again. Questions only when a decision is truly theirs; otherwise follow this file. |

## 2. Rules that never change

- Consent first: adults only, their own face and voice; spoken consent on camera; one-tap delete of
  everything. Photos, video and voice are never used for anything else and never committed.
- Free, commercially licensed parts only; licences recorded in `docs/voice/licences/`. Never:
  GaussianAvatars / original 3DGS code, FLAME 2020, MICA, DECA, EMOCA, SMPL-X, insightface,
  nvdiffrast, F5-TTS, MMS aligners (all non-commercial).
- Every output labelled "AI-generated" (IT Rules 2026); cloned audio watermarked.
- Nothing ships without the owner approving a video with sound.

## 3. The stages

| # | Stage | What it does | Runs | Check → fallback |
|---|---|---|---|---|
| C1 | **Guided capture** (browser) | Shot list with pictures; live coach on the camera (face size, angle, light, sharpness, expression, eyes open, one person) and hands-free auto-shutter; same coach on a phone by QR; uploads are checked and sorted into the shot list; optional guided video. | Any device (MediaPipe web, on the device) | A coverage meter ("Good / Great / Best") and the exact next shot to take |
| C3 | **Identity pack** (`pack.py`) | One `.pbpack` file: 3D face in mm, measurements, colours, hair, body, expressions, motion, voice, identity vector, face texture, best views; signed; downloadable and importable on any account (`docs/pratibimb/PACK_FORMAT.md`) | CPU | Missing parts named in its quality block |
| C2 | **Capture** (`capture.py`) | Main person found by face identity (others ignored); per frame: 478 face points, 52 expression values, head turn, 33 body points, 21 points per hand, hair/skin/clothes regions, quality; best frame per angle and per expression; the person's **motion profile** (blinks, head movement, mouth range when speaking, smiles, brows, hand habits); colours corrected by the eye whites; the voice track with speaking times. | CPU | Missing angles are named → back to C1 |
| 1 | **Rig** (`pipeline.py`) | Upright photos, analysis, body build, face sliders + the person's 3D face points (`solve_points3d.py`, held-out checked) + safe face detail (`solve_detail.py`); VRM with skeleton, fingers, 52 ARKit + 15 viseme shapes. | CPU | Single-photo path; detail refused if it would tear |
| 2 | **Learned appearance** | The person's look (skin, brows, eyes, lips, real hair) learned onto the rig's head and neck from every capture frame, as small 3D colour splats bound to the face mesh so they follow every expression (gsplat, Apache-2.0; our own trainer). Clothes and hands stay meshes (switchable wardrobe). | CPU (slower) or GPU | Likeness on held-out frames; v1 painted skin as fallback |
| 3 | **Look** | Studio light matched to the site theme; the light painted finish as a render filter, identical live and pre-made. | — | — |
| 4 | **Voice** | Clone from the consented sample (Chatterbox Multilingual + Hindi, MIT, watermarked). | CPU / GPU | Default Indian voice |
| 5 | **Lip sync and motion** | wav2arkit curves scaled to the person's own mouth range (from C2's motion profile); p/b/m closure, f/v contact; blinks, head and hand habits from the motion profile. | CPU | Rule-based visemes |
| 6 | **Likeness check** | SFace on photos/frames never learned from + side-by-side sheet for the owner. | CPU | Retry with other settings (lighter painted finish first), then ask for the missing angles; never marked ready below 90% |
| 7 | **Delivery** | Pre-made lesson clips rendered on the build machine; the live player (three-vrm + skinned splats) in the panel. | Server / browser | — |

## 4. Lip sync, measured ("95% real")

Against the person's own video: audio never more than 50 ms ahead of the lips; mouth movement within
±15% of the person's own range; every p/b/m closed, f/v teeth on lip; blind A/B with the real video.

## 5. Status (keep current)

- Done: v1 rig pipeline (stage 1); Studio page with the journey; guided scan (one recording, every
  photo picked by measurement, recording kept as the video), phone by QR, uploads of photos and videos
  (same picking rules); consent for yourself or someone you know (their own sentence on camera);
  capture.py over photos and videos together; **the identity pack** (`docs/pratibimb/PACK_FORMAT.md`),
  signed, downloadable and importable on any account; the build worker (`worker.py`).
- **Living Portrait** (`portrait.py`, 2026-11-26): the person's own pixels re-animated instead of a repainted
  3D head. Frames fused onto one face layout (noise and blur from weak cameras average out), the person's own
  motion model (52 expression values + head turn → their face points), real mouth and eye banks. Builds in
  seconds on a CPU. Bench, driven only by expression values from a held-out clip and judged by SFace: 97%
  (woman, trained on cheap 480p webcam video), 100% (man, studio video); controls (wrong person) 22–24%.
  Held-out clips were from the same session (other moments); a different day is the next, harder test.
- Next: Living Portrait player in the browser (WebGL, driven by lip sync), person cut out from the background,
  wardrobe (one short recording per outfit), the rest of the bench; stage 2 trainer (learned appearance), sticker check in the browser picker, face match between
  the consent clip and the photos, look filter, voice cloning, motion profile in the player.
