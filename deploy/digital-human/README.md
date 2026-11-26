# Pratibimb digital human: the GPU test kit

The presenter is a **generative digital human**: every frame is drawn fresh from the person's photo (who),
their own cloned voice (what they say) and an instruction (what they do). Nothing is a fixed animation, so
any gesture works; lips come from the audio itself. Chosen 2026-11-26 (owner): no game-style 3D, no
talking photo. Model choice and licences: see "Parts" below.

Nothing here has been run yet (no GPU was rented). The first run is the test the owner judges.

## The test (one rented GPU, 80 GB: A100 80 GB, H100 or H800)

Rough cost: 2–4 hours on one 80 GB card, about $5–15 at November 2026 rental prices (check before renting).

1. Rent the machine (RunPod or Vast.ai), Ubuntu with CUDA 12.4, at least 300 GB disk.
2. Copy this folder and the test inputs to it:
   - `in/person.jpg`: one clear waist-up photo of a consenting person (from their identity pack).
   - `in/voice_ref.wav`: 10–15 s of their own clean speech (for the voice clone).
   - `in/pose.mp4` (optional): anyone doing the gesture (e.g. namaste); only the movement is used.
3. `bash setup.sh` (installs everything, downloads about 150 GB of weights; 30–60 min).
4. `bash run_test.sh "Namaste! Aaj hum binary search seekhenge." hi "A friendly Indian teacher does namaste, then explains with both hands, smiling, looking at the camera."`
5. Download `out/` and **shut the machine down**.

Outputs: `out/voice.wav` (her own voice saying the line), `out/longcat.mp4` (LongCat-Video-Avatar 1.6,
the instruction as text), `out/wan_s2v.mp4` (Wan2.2-S2V; follows `pose.mp4` exactly when given), and
`out/compare.mp4` (both side by side), plus `out/times.txt` (seconds each took, for the cost per minute).

## Parts (all free for commercial use; licences read from each repository, 2026-11-26)

| Job | Model | Licence |
|---|---|---|
| Lessons, top quality, actions from text | LongCat-Video-Avatar 1.6 (meituan-longcat/LongCat-Video) | MIT (code and weights) |
| Exact gestures from a movement guide | Wan2.2-S2V-14B (Wan-Video/Wan2.2) | Apache-2.0 |
| Live talking (face, lips, head) | SoulX-FlashHead Lite (later step) | Apache-2.0 code; some parts OpenRAIL-M (use rules) |
| Voice, English + Hindi | Chatterbox Multilingual (resemble-ai/chatterbox) | MIT; every output carries the Perth watermark |

Never use: InsightFace models (non-commercial; used by LivePortrait, Ditto, Hallo3), Sonic (non-commercial),
HunyuanVideo-Avatar (excludes EU/UK; extra terms). Every output is labelled "AI-generated" (IT Rules 2026).
Only a consenting adult's own data, and never commit their photos, voice or videos.

## Honest limits

- No open model follows an instruction like "namaste, then explain with both hands" exactly every time;
  text steers loosely. A short movement guide (`pose.mp4`) makes a gesture exact.
- Live conversation with the full upper body needs 5–8 data-centre GPUs. The affordable live mode moves
  face, lips and head live (FlashHead) with pre-made gesture clips of the same person.
