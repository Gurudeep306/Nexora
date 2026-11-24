# Prompt for the next session (virtual teacher rebuild)

Copy everything below the line into a new Claude Code session on the
`Gurudeep306/Nexora` repository.

---

You are continuing the NexoraGuru virtual-teacher rebuild. Before doing
anything, read these files completely, in this order:

1. `AGENTS.md` and `CLAUDE.md` (project rules: never commit to main, PRs,
   tests, design tokens, no model names in commits, free-only, honesty).
2. `docs/voice/TEACHER_HANDOFF.md`: everything decided so far, what the owner
   wants, what was tried and rejected, the licence table, the demos and
   their code, and other open threads.
3. `docs/voice/research/reports/Free talking teacher maker.md`: the final deep
   research report with the chosen option per component and the phased
   build plan. Its source notes are in
   `docs/voice/research/research_notes/Free talking teacher maker/` (A–F).
4. `docs/voice/teacher-lab/`: the demo code (anime VRM scene the owner liked:
   `vrm-scene.html` + `vrm-scene-video.cjs`; MetaHuman demo; wav2arkit runner).
5. `docs/voice/VIRTUAL_TEACHER.md`: the history of the current (rejected)
   TalkingHead teacher in `client/src/voice/teacher/`.

The owner (the founder) works from a MacBook Air M3 with 8 GB RAM. He cannot
pay for anything, and he demands perfection in looks, lip sync and voice. He
wants an honest, plain explanation for a phone reader, and **a video with
sound before anything ships**. Automated tests alone are not acceptable: he
could not even hear the old teacher.

## Your task

Build **Phase 1 of the Teacher Maker: one perfect talking teacher**, replacing
the old TalkingHead/Rocketbox teacher. Do not start the parts library or photo
matching yet.

1. **Phase 0 checks first.** Re-verify any licence the report marks
   unverified that Phase 1 depends on: the MakeHuman/MPFB CC0 FAQ, the
   ffunch/vrm-avatar-maker LICENSE and ASSETS.md, the three-vrm MIT licence,
   HeadTTS, the Quaternius CC0 animations, and the VRoid 7-motion terms if
   used. If a host is blocked, read the environment documentation
   (`read_documentation`, topic `environment.network`) and ask the owner to
   allow it. Never guess a licence.
2. **Base character:** a CC0 MakeHuman-based VRM (study
   `github.com/ffunch/vrm-avatar-maker`: MIT code, CC0 assets) carrying
   **ARKit-52 + Oculus-15 visemes + the VRM five vowels**, so p/b/m close the
   lips fully. Style it toward the soft-3D animated-film look the owner chose
   (he liked the anime sample and asked for "a bit more 3D"). Keep it light:
   about 30–70k triangles, 8 materials or fewer, KTX2 1024 px textures.
3. **Look:** WebGLRenderer, our own soft "PBR toon" material (wrap/half-Lambert
   diffuse plus a soft rim; MToon ignores `scene.environment`), Neutral tone
   mapping, a warm key, a hemisphere fill and a cool rim, a baked contact
   shadow, and no post-processing on phones.
4. **Lip sync:** HeadTTS word and viseme timings (the site's voice server
   already runs Kokoro + HeadTTS) mapped to ARKit shapes. Use co-articulation:
   shapes 30–60 ms early, lip rounding one phoneme early, a full closure on
   p/b/m, jaw driven by smoothed loudness, minimum holds to stop chatter. Add
   wav2arkit_cpu (Apache-2.0, 402 MB, measured at 29× real time on 4 CPU
   threads) on the voice server for audio without timings (cloned voice), and
   HeadAudio (MIT) as the instant fallback. Hindi needs our own phoneme →
   viseme table.
5. **Body:** procedural breathing, gaze, blinks and saccades; listening (lean
   in, tilt, nods at pauses), thinking (eyes up and aside), speaking (beat
   gestures timed to words); gestures (wave, namaste, point with IK, thumbs
   up, nod, shrug), porting TalkingHead's MIT gesture templates to VRM bones;
   CC0 Quaternius clips as .vrma where needed. **No Mixamo files.** Respect
   `prefers-reduced-motion`.
6. **Integrate** into `client/src/voice/teacher/` (replace TalkingHead), keeping
   what works from the current UI: word-lit captions, typing to her, the
   listening meter, the Teacher studio `/teacher`, the More menu, and the
   speed/framing/behaviour settings. Re-check every one of them.
7. **Evidence before shipping:** render a 30–40 s video **with sound**
   (deterministic `renderAt(ms)` frames + ffmpeg, like `vrm-scene-video.cjs`)
   showing greeting, explaining, listening, thinking and answering, in
   English and in Hindi. Check the frames yourself (close-ups of the mouth on
   p/b/m, o/u and a/e) and fix anything wrong **before** sending the video to
   the owner. Also run a blind side-by-side against the old teacher.
8. Then follow the repo's shipping rules: branch, `npm test`, `tsc -b`,
   `oxlint`, `vite build`, the voice sweeps in `scripts/voice/sweep/`, axe 0 in
   light, dark and at 360 px, a PR, squash-merge on green CI, and confirm that
   the "Deploy site" workflow ran. Do this **only after the owner approves the
   video**.

## Other open threads (do not lose them)

- Ears training (Whisper turbo on Indian voices) and Guru tutoring data are on
  branch `claude/guru-train` (scripts, a resumable full fine-tune and 2,808
  tutoring examples in `data/guru-groq/`). The owner decides when to train.
  See `docs/voice/TEACHER_HANDOFF.md` §7.
- Keep `docs/voice/TEACHER_HANDOFF.md` updated as you work: what is done, what
  is next, and any decision the owner makes.
