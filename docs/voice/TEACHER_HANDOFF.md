# Virtual teacher: handoff (2026-11-25)

> To continue in a new session, paste `docs/voice/NEXT_SESSION_PROMPT.md`.

Everything a new session needs to continue the virtual-teacher work: what the
owner wants, what is live, what was tried and rejected, the decision taken,
the research in progress, and the exact next steps. Read this first, then
`docs/voice/VIRTUAL_TEACHER.md` for the history of the current (old) teacher.

## 1. What the owner wants (in their words, condensed)

- **Perfection, no faults**, especially in **looks, lip sync and voice**.
  "I'm a perfection guy." Do deep research before adding anything; think like
  an inventor (combine free parts into our own system), not only a researcher.
- **Free only.** The owner cannot pay for services (said "can't spend money",
  "can't afford $30+"). No paid APIs, no monthly plans.
- **Honest**: say plainly when something can't be done, costs money, or breaks
  a licence. Send **videos with sound** for the owner to judge before anything
  ships; automated tests are not enough (they use fake voices, and he could
  not even hear the old teacher).
- Owner's hardware: **MacBook Air M3, 8 GB RAM, ~88 GB free**, no Windows PC,
  no NVIDIA GPU. DGX access is a student account limited to one
  `a100_1g.5gb` slice, `shortq` (10 min jobs), 4 CPU, 16 GB: useless for
  training or rendering. No college lab PC available.
- Explain simply; the owner reads on a phone. Show stills/videos.

## 2. The decision (2026-11-25)

1. **The current 3D teacher (TalkingHead + Microsoft Rocketbox models) is
   rejected** by the owner ("I disapprove all": lips don't sync, can't hear
   her, actions poor, UI clumsy). It is still on the live site (off by
   default, opt-in in Settings / `/teacher`). The owner said earlier he does
   not want it on the site; **removing or hiding it is still pending** (ask
   once or do it as step 1 of the rebuild).
2. **Realistic 3D (MetaHuman) was tried and dropped.** Reasons: needs Unreal
   on a Windows PC with 32 GB RAM to make characters; sample GLBs are 40–80 MB
   and would be laggy on phones; lip sync looked unsynced to the owner. Kept
   only as a reference (demo code in `docs/voice/teacher-lab/metahuman-demo.html`).
3. **Chosen direction: stylised soft-3D (anime / animated-film) VRM
   characters** rendered with three.js + `@pixiv/three-vrm` (MIT). The owner
   liked the anime sample video and asked to make it "a bit more 3D" (softer,
   deeper shading: not yet done).
4. **The "Teacher Maker" black box (our own invention):** a browser character
   creator built from free parts that already have talking face shapes, with
   **photo matching** (1–3 photos → face shape, skin tone, eye/hair colour,
   nearest hairstyle, glasses), plus the **owner's/teacher's own cloned voice**
   (with consent), driving a new talking engine (lip sync, expressions,
   listening/thinking, gestures). Everything free and allowed commercially.
   Students could later make their own teacher.

## 3. Licence facts already checked

| Thing | Licence / rule | Use? |
|---|---|---|
| three-vrm (`@pixiv/three-vrm` 3.6.0) | MIT | Yes |
| pixiv sample `VRM1_Constraint_Twist_Sample.vrm` | VRM Public License 1.0, commercialUsage `corporation`, redistribution allowed, modification allowed | Yes (test character) |
| VirtualCast `Seed-san.vrm` | VRM PL 1.0, commercial OK, **credit required**; has a robotic back-arm prop (not a teacher look) | Not as teacher |
| VRoid Studio (free, macOS) | Models you make may be used commercially; VRoid sample/preset models usable for profit without credit. **Rule: you may not build an app that generates avatars from VRoid parts** | Hand-made teachers only; not for the Teacher Maker |
| MakeHuman / MPFB core assets | CC0 (base mesh, targets, skins); MPFB has 54 ARKit face units + viseme sets; FAQ allows building your own character generator | Yes (candidate parts) |
| MediaPipe Face Landmarker | Apache-2.0 (to re-confirm in research) | Yes |
| face-to-blendshape-3d | MIT | Reference |
| CharacterStudio (M3-org) | Code MIT; **default asset packs' licences unknown** (loot-assets, character-assets) | Check |
| StdGEN (image → 3D anime character) | Code Apache-2.0, weights tagged Apache but README says "checkpoints for research purposes only"; trained on anime images, not real photos; output unrigged, no face shapes | No (risk) |
| UniRig / Make-It-Animatable | MIT code; body skeleton only, no face shapes; 8 GB GPU | Maybe later |
| TRELLIS / TripoSG | MIT; makes unrigged "statues" | No for now |
| MetaPerson / Avaturn (photo → 3D) | Free tiers non-commercial; Pro ~$800/month | No |
| MetaHuman | Free under $1M revenue, may be used outside Unreal (licence page not readable from the container) | Dropped |
| wav2arkit_cpu (audio → 52 ARKit, myned-ai) | Apache-2.0 (base LAM_audio2exp Apache-2.0). Real weights 402 MB (`.onnx.data`), not 1.8 MB. **29× real time on 4 CPU threads, 9× on 1** (measured) | Server-side option |
| NVIDIA Audio2Face-3D | SDK MIT; weights under NVIDIA Open Model License (not yet read) | Check |
| Kokoro-82M via HeadTTS 1.3.0 | Apache-2.0 / MIT; gives exact word and viseme timings | Yes (current voice server) |
| **Phase 1 checks (2026-11-25)** | Full table, with saved copies of each licence: `docs/voice/licences/2026-11-25/README.md` | — |
| MPFB2 assets (base mesh, ARKit face units, visemes, skins, eyebrows) | CC0 1.0; MPFB code GPLv3 runs only offline in Blender; §D no claim over exported or script-made output | **Yes** (base teacher) |
| ffunch/vrm-avatar-maker | Code MIT, assets CC0 (two unknown-author items avoided) | Yes (reference and pipeline) |
| HeadAudio, TalkingHead gestures | MIT | Yes |
| Quaternius Universal Animation Library | CC0 | Yes (body clips as .vrma) |
| VRoid "VRM Animation 7-set" | Forbids redistributing the motions in an extractable form without permission | **No** (a website always sends them to the browser) |
| Mixamo | Raw files may not be distributed | No |

## 4. Demos made in this session (code saved in `docs/voice/teacher-lab/`)

Binary assets (models, wavs, videos) were in the session scratchpad and are
**not** in the repo; re-download them as below.

1. **MetaHuman "Bo"** (`metahuman-demo.html`, `frames-to-video.cjs`): sample
   GLB from `github.com/creategamecharacters/metahuman-to-glb`
   (`docs/5.7/characters/bo/bo.glb` + `textures/` + `mh_materials.json`), our
   own rewrite of its hair/brow/lash material fixes (their viewer.js was not
   run: third-party code), exact viseme lip sync from HeadTTS, then AI lips
   from wav2arkit (`?curves=line.arkit.json`). Findings: brows broke when the
   head turned → fixed with polygon offset −12/−120 for facial cards (found by
   isolating head motion vs morphs); teeth bared with mouthLowerDown/UpperUp
   gains > 1 → reduced. Dropped (see §2).
2. **Anime sample, single shot** (`vrm-single.html`): pixiv sample girl.
   Lessons: VRM1 normalized arms: left `z = −1.2`, right `z = +1.2` lowers
   them; the AI-curve → 5-vowel mapping gave a tiny mouth (the model's `aa` at
   1.0 opens fully, so drive vowels at full strength from exact timings
   instead).
3. **Anime teacher scene** (`vrm-scene.html`, `vrm-scene-video.cjs`): the one
   the owner liked. 24 s: wave + greet ("Hi! I'm your teacher…"), explain
   binary search (HeadTTS vowel visemes at full strength, co-articulation,
   word-lit caption), listening (question types on screen, lean in, two nods),
   thinking (eyes up-right), answer ("Great question!…", happy). Overlays:
   state pill + caption. Video at 25 fps from deterministic `renderAt(ms)`
   frames + `ffmpeg adelay` audio mix. Voice: HeadTTS `hf_alpha` (Indian
   female). Credit line on screen.
   - Assets: `sample.vrm` from
     `https://cdn.jsdelivr.net/gh/pixiv/three-vrm@v3.6.0/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm`;
     `npm i @pixiv/three-vrm@3`; `three` = `client/node_modules/three`
     (0.187).
   - Its "wide sleeves" are the sample's outfit design (aim constraints work).
4. **wav2arkit timing** (`wav2arkit-run.mjs`): downloads from
   `huggingface.co/myned-ai/wav2arkit_cpu` (`config.json`,
   `wav2arkit_cpu.onnx`, `wav2arkit_cpu.onnx.data`); runs with
   onnxruntime-node; writes 30 fps ARKit curves.

How to make the voice lines: run HeadTTS 1.3.0 locally (`npm i
@met4citizen/headtts@1.3.0 --onnxruntime-node-install-cuda=skip`, voices
from `huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/<id>.bin`,
config like `deploy/voice-server/setup.sh`, start with
`NODE_USE_ENV_PROXY=1 node modules/headtts-node.mjs --config cfg.json`), POST
`/v1/synthesize` → audio + `words/wtimes/wdurations/visemes/vtimes/vdurations`.
Headless render: Chromium with `--use-gl=angle --use-angle=swiftshader
--enable-unsafe-swiftshader`.

## 5. Deep research (Teacher Maker): DONE

**Final report: `docs/voice/research/reports/Free talking teacher maker.md`** (read it first). Picks: MakeHuman/MPFB2 CC0 base with ARKit-52 + Oculus-15 + VRM-5 shapes (vrm-avatar-maker, MIT/CC0, as reference); own soft PBR-toon material on WebGLRenderer; HeadTTS timings for live English + own Hindi viseme table + wav2arkit on the server for cloned/pre-rendered audio + HeadAudio fallback; Kokoro live, Indic Parler-TTS and Chatterbox Multilingual for pre-rendered narration/cloning on a free GPU; procedural body + TalkingHead gesture ports + Quaternius CC0/CMU clips (VRoid 7-set rejected on 2026-11-25, see §3) as .vrma (no Mixamo files); MediaPipe photo matching on device. Phase 1 = one perfect teacher that must beat the old one in a blind test. Original research brief:

Notes are being written to
`docs/voice/research/research_notes/Free talking teacher maker/` (A_avatar_parts,
B_rendering_look, C_lip_sync, D_voice_tts, E_body_animation, F_photo_matching),
and the final report to `docs/voice/research/reports/Free talking teacher maker.md`.
If the session ended before the report: read whatever notes exist, finish
the missing topics, and write the report. Questions per topic:
A parts/bases with talking face shapes and licences; B a premium soft-3D
look in three.js that is fast on phones; C best free lip sync (exact TTS
visemes vs audio-driven) incl. for cloned voices; D best free commercially
licensed Indian English/Hindi/Hinglish TTS and cloning on CPU/browser; E free
commercial body animation for VRM (VRMA, Mixamo terms, CC0 mocap,
procedural); F photo → avatar parameters with MediaPipe.

## 6. Next steps (in order)

1. Finish the research report; choose one option per component with evidence.
   Show the owner a short summary.
2. **Hide/remove the old teacher** from the site: **DONE (2026-11-25).**
   `TEACHER_LIVE = false` in `client/src/voice/teacher/teachers.ts`
   (`available.ts` re-exports it): no Settings card, `/teacher` redirects to
   Settings, no palette entry, not in Explore, and `teacherById` returns null
   so no layer loads even for people who had it on. The code stays until the
   new engine replaces it; flip the switch only after the owner approves the
   new teacher's video.
3. Build the **new talking engine** (replaces TalkingHead in
   `client/src/voice/teacher/`): VRM loader, exact-timing vowel lip sync with
   co-articulation (HeadTTS visemes; wav2arkit on the voice server for audio
   without timings, e.g. cloned voice), expressions, blinks, look-at, spring
   hair, listening/thinking presence, gestures (wave, namaste, point, thumbs,
   nod), the soft-3D look the owner asked for. Keep the existing UI pieces that
   work (word-lit captions, typing, listening meter, Teacher studio page, More
   menu) but re-check every one in a real browser **with sound recordings**.
4. **Send the owner a video with sound** of the engine with a sample character;
   ship nothing until the owner approves.
5. Teacher Maker: parts library (CC0 / permissive), sliders, then MediaPipe
   photo matching, then per-teacher cloned voice. Videos at each stage.
6. Replace the sample characters with the owner's own (VRoid Studio-made
   teachers are fine for hand-made ones; the Teacher Maker itself must use
   non-VRoid parts).

## 7. Other open threads (not the teacher)

- **Ears training (Whisper turbo, Indian voices):** the Colab LoRA run died at
  step 1153/2296 (Colab stopped; no checkpoints) and was lost. New scripts on
  branch `claude/guru-train` (pushed, `dcf161fb`):
  `deploy/guru-training/kaggle/fine_tune_ears.py` (LoRA, now saves to the
  owner's Hugging Face every 100 steps and resumes) and
  `fine_tune_ears_full.py` (**full fine-tune of every weight**, fp32 weights +
  fp16 maths, 8-bit AdamW, lr 1e-5, one pass, saves to `nexora-ears-full-progress`
  every 80 steps and resumes). Colab notebook `deploy/guru-training/colab/ears.ipynb`
  (cell 1 downloads IndicVoices/Kathbath/Lahaja from HF with the owner's
  token; cell 2 = the script). Baselines on 120 Lahaja clips: Groq
  whisper-large-v3 WER 0.251; open whisper-turbo WER 0.3815. Owner will
  decide "tomorrow"; estimates: full fine-tune ~40 T4-hours for Hindi+Indian
  English on free Colab (~1 week of sessions), ~6 h on one A100.
- **Guru tutor data (Groq, free tier):** 2,808 examples (train/val/test JSONL),
  **saved on branch `claude/guru-train` in `data/guru-groq/`** (commit `52629ed4`),
  were generated with `scripts/voice/make-guru-data.js` (branch
  `claude/guru-train`) using open models gpt-oss-120b, qwen3.8-27b,
  gpt-oss-20b (1000 requests/day each). They lived in the session scratchpad
  (`guru-groq/`), which is temporary: if lost, re-run with resume (the script
  appends). PR for `claude/guru-train` not opened yet.
- **Shipped and live this session:** #266 (lips follow the sound, word-lit
  captions, listening/thinking presence, typing, drag), #267 (Teacher studio
  `/teacher`, More menu, speed/framing/behaviour settings). Both belong to the
  old teacher and will be reworked for the new engine.
- Pushes from this cloud session are only allowed to the session branch
  `claude/blissful-hawking-9djkzg` (plus the existing `claude/guru-train`);
  the session branch holds already-merged history, so merge it with
  `git merge -s ours` before pushing (no force-push).
