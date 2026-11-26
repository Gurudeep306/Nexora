# Pratibimb — models we train ourselves

Every AI step in Pratibimb is a **slot** (`scripts/teacher/maker/slots.json`): a fixed input and output,
a default model that runs today, and a place for a model we train. Train a model, export it to ONNX with
the stated inputs and outputs, put its path in the slot's `"trained"` field, and the pipeline and the
player use it instead of the default. Nothing else changes.

Only data we own or that is CC0, and recordings of people who agreed **in writing** that their recordings
train NexoraGuru's models. Never scraped faces, voices or art.

## 1. Photo → face controls (start here: it is the biggest gain)

- **Why:** today a solver fits 222 MakeHuman face controls to the photo reader's points. A network trained
  on synthetic faces reads them in one step, learns how real faces vary, and can run in the browser.
- **Data (free, perfect labels, no privacy issue):**
  `blender -b --python scripts/teacher/maker/training/face_controls/make_dataset.py -- <out> <count> <seed>`
  makes random natural CC0 people (gender, age, ancestry, build, random face controls, random light and
  lens) and renders 5 head turns each, with the exact control values saved in `label.json`.
  About 30 s per person on a 4-core CPU; a GPU (Cycles on CUDA/OptiX) is 10–30× faster.
  Then run the photo reader on each sample folder:
  `python3 -I scripts/teacher/maker/analyse.py <out>/<id> <models> <out>/<id>/points.json`.
- **Size:** 20,000–50,000 people for a good model (start with 5,000 to test the loop).
- **Model:** input = face points from 1–5 views (478 × 3 each, centred and scaled by eye distance, with
  the head turn); output = 222 values in 0..1 (`names.json` order). A small transformer or an MLP over
  per-view features with mean-pooling across views works; loss = L1 on the values + a point loss
  (rebuild the face from the predicted values with the target deltas and compare the 478 points).
- **Check:** on held-out synthetic people, mean point error < 0.5% of face width; on real people, the
  likeness score (`likeness.py`) must beat the solver's.
- **Export:** ONNX, input `points[views,478,3]` + `turn[views,3]`, output `controls[222]`.

## 2. Hindi / Hinglish lip sync (fine-tune wav2arkit)

- **Why:** wav2arkit's audio encoder learned English; Hindi sounds (retroflex, aspirates, nasals) need
  their own examples.
- **Data:** videos of the owner and consenting staff reading lessons in Hindi, Hinglish and English,
  face to camera, good light, 30 fps, no music. 1–3 hours is a strong start.
  `python3 -I scripts/teacher/maker/training/lipsync/make_dataset.py <videos> <models> <out>` writes
  `<clip>.wav` (16 kHz) + `<clip>.npy` (51 face values at 30 fps; MediaPipe has no "tongueOut") and a
  summary (skips clips without sound or with the face missing).
- **Training:** fine-tune wav2arkit's head (or LAM Audio2Expression, Apache-2.0) on these pairs; keep a
  held-out set of sentences.
- **Check (the "95% real" gates, `docs/pratibimb/SPEC.md` §5):** lips never more than 50 ms behind,
  every p/b/m closed, mouth movement within ±15% of the speaker's own, blind A/B ≥ 45%.

## 3. Hinglish voice (LoRA on Chatterbox Multilingual Hindi, MIT)

- **Data:** 30–60 minutes per voice of consented, clean recordings with their text.
- **Training:** a LoRA on Chatterbox-Multilingual-hi; keep its watermark on.
- **Check:** speaker similarity, intelligibility (speech-to-text round trip), and a listening test.

## 4. Painted finish

- **Data:** paintings we make or own (never scraped art), plus our skin textures.
- **Model:** a small image-to-image network that turns a lighting-free photo skin texture into the
  painted finish, keeping lips, eyelids and brows sharp.
- **Check:** likeness must not drop; owner's eye.

## 5. Gesture timing (teaching style)

- **Data:** consented teaching videos; MediaPipe Pose + hands give the motion, the transcript gives the
  words.
- **Model:** predicts which gesture from our library (point, count, beat, open palms, nod) and when, from
  the sentence and its timing.

## Where to train

Your own GPU, or a rented one by the hour (see the cost note in the owner's chat: about ₹15–40 per hour
on RunPod/Vast.ai for a 24 GB card). The data builders above run on a CPU.
